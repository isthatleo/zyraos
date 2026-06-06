import crypto from "node:crypto";

import { sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { getTenantDb, masterDb } from "@/lib/db";
import { normalizeRole } from "@/lib/roles";
import { writeTenantAuditLog } from "@/lib/tenant-audit";
import { getTenantSubdomain } from "@/lib/tenant-routing";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type QueryableDb = ReturnType<typeof getTenantDb>;
type Row = Record<string, unknown>;

const ALLOWED_ROLES = new Set(["owner", "school_admin"]);
const LIBRARY_KEY = "admin_library";

function stringValue(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function numberValue(value: unknown) {
  const next = Number(value ?? 0);
  return Number.isFinite(next) ? next : 0;
}

function boolValue(value: unknown) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value.toLowerCase() === "true";
  return Boolean(value);
}

function objectValue(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Row : {};
}

function arrayValue(value: unknown) {
  return Array.isArray(value) ? value as Row[] : [];
}

function isoDate(value: unknown) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

async function rows(db: QueryableDb, query: ReturnType<typeof sql>, fallback: Row[] = []) {
  try {
    const result = await db.execute(query);
    return (result.rows || []) as Row[];
  } catch (error) {
    console.warn("Admin operations query skipped:", error instanceof Error ? error.message : error);
    return fallback;
  }
}

async function first(db: QueryableDb, query: ReturnType<typeof sql>, fallback: Row = {}) {
  const result = await rows(db, query, [fallback]);
  return result[0] || fallback;
}

function resolveSlug(request: NextRequest) {
  return request.nextUrl.searchParams.get("slug")?.trim() || getTenantSubdomain(request.headers.get("host")) || "";
}

async function resolveContext(request: NextRequest) {
  const slug = resolveSlug(request);
  if (!slug) return { response: NextResponse.json({ error: "Tenant slug is required" }, { status: 400 }) };

  const schoolResult = await masterDb.execute(sql`
    select id, name, slug, type, status, database_url
    from schools
    where slug = ${slug}
    limit 1
  `);
  const school = schoolResult.rows[0] as Row | undefined;
  if (!school) return { response: NextResponse.json({ error: "School not found" }, { status: 404 }) };

  const session = await auth.api.getSession({ headers: request.headers }).catch(() => null);
  if (!session?.user?.id || !session.user.email) return { response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };

  const tenantDb = getTenantDb(String(school.database_url || ""));
  const [tenantUser] = await rows(tenantDb, sql`
    select u.id, u.email, u.name, u.role_id, u.is_active, r.name as role_name
    from users u
    left join roles r on r.id = u.role_id
    where u.id = ${session.user.id} or lower(u.email) = lower(${session.user.email})
    limit 1
  `);
  if (!tenantUser) return { response: NextResponse.json({ error: "Signed-in account does not belong to this tenant" }, { status: 403 }) };
  if (tenantUser.is_active === false) return { response: NextResponse.json({ error: "This tenant account is inactive" }, { status: 403 }) };

  const role = normalizeRole(stringValue(tenantUser.role_id) || stringValue(tenantUser.role_name));
  if (!ALLOWED_ROLES.has(role)) return { response: NextResponse.json({ error: "Only owners and school admins can manage operations" }, { status: 403 }) };

  return {
    slug,
    school,
    tenantDb,
    actor: {
      id: stringValue(tenantUser.id, session.user.id),
      name: stringValue(tenantUser.name, session.user.name || session.user.email),
      email: stringValue(tenantUser.email, session.user.email),
      role,
    },
  };
}

async function audit(ctx: { tenantDb: QueryableDb; actor: { id: string; email: string; name: string; role: string } }, request: NextRequest, action: string, resourceId?: string, changes: Row = {}) {
  await writeTenantAuditLog({
    db: ctx.tenantDb,
    request,
    actorId: ctx.actor.id,
    action,
    resource: "admin_operations",
    resourceId,
    changes: { ...changes, actorEmail: ctx.actor.email, actorName: ctx.actor.name, actorRole: ctx.actor.role },
  }).catch(() => undefined);
}

async function getJsonSetting(db: QueryableDb, key: string, fallback: unknown) {
  const row = await first(db, sql`select value from system_settings where key = ${key} limit 1`);
  return row.value ?? fallback;
}

async function saveJsonSetting(db: QueryableDb, key: string, value: unknown, description: string) {
  await db.execute(sql`
    insert into system_settings (id, key, value, category, description, created_at, updated_at)
    values (${crypto.randomUUID()}, ${key}, ${JSON.stringify(value)}::jsonb, 'operations', ${description}, now(), now())
    on conflict (key) do update set value = excluded.value, updated_at = now()
  `);
}

async function buildPayload(db: QueryableDb, school: Row, filters: { classId?: string; date?: string } = {}) {
  const date = filters.date || new Date().toISOString().slice(0, 10);
  const [classRows, studentRows, subjectRows, yearRows, termRows, teacherRows, attendanceRows, examRows, libraryValue] = await Promise.all([
    rows(db, sql`select c.*, ay.name as academic_year from classes c left join academic_years ay on ay.id = c.academic_year_id order by c.grade asc, c.name asc`),
    rows(db, sql`
      select s.id, s.admission_number, s.class_id, s.status, u.name, u.email, c.name as class_name
      from students s
      left join users u on u.id = s.user_id
      left join classes c on c.id = s.class_id
      where (${filters.classId || ""} = '' or s.class_id = ${filters.classId || ""})
      order by u.name asc
    `),
    rows(db, sql`select * from subjects order by name asc`),
    rows(db, sql`select * from academic_years order by start_date desc`),
    rows(db, sql`select t.*, ay.name as academic_year from terms t left join academic_years ay on ay.id = t.academic_year_id order by t.start_date desc`),
    rows(db, sql`select u.id, u.name, u.email from users u left join roles r on r.id = u.role_id where lower(coalesce(r.name, u.role_id)) like '%teacher%' or lower(coalesce(r.name, u.role_id)) like '%admin%' order by u.name asc`),
    rows(db, sql`
      select a.*, u.name as student_name, s.admission_number, c.name as class_name
      from attendance a
      left join students s on s.id = a.student_id
      left join users u on u.id = s.user_id
      left join classes c on c.id = a.class_id
      where a.attendance_date::date = ${date}::date
        and (${filters.classId || ""} = '' or a.class_id = ${filters.classId || ""})
      order by u.name asc
    `),
    rows(db, sql`
      select e.*, c.name as class_name, ay.name as academic_year, t.name as term_name, asm.name as assessment_name
      from exams e
      left join classes c on c.id = e.class_id
      left join academic_years ay on ay.id = e.academic_year_id
      left join terms t on t.id = e.term_id
      left join assessments asm on asm.id = e.assessment_id
      order by e.exam_date desc, e.start_time asc
    `),
    getJsonSetting(db, LIBRARY_KEY, { books: [], loans: [], settings: { loanDays: 14, dailyFine: 0, allowReservations: true } }),
  ]);

  const classes = classRows.map((row) => ({ id: stringValue(row.id), name: stringValue(row.name), grade: stringValue(row.grade), section: stringValue(row.section), academicYearId: stringValue(row.academic_year_id), academicYear: stringValue(row.academic_year) }));
  const students = studentRows.map((row) => ({ id: stringValue(row.id), name: stringValue(row.name), email: stringValue(row.email), admissionNumber: stringValue(row.admission_number), classId: stringValue(row.class_id), className: stringValue(row.class_name), status: stringValue(row.status) }));
  const attendance = attendanceRows.map((row) => ({ id: stringValue(row.id), studentId: stringValue(row.student_id), studentName: stringValue(row.student_name), admissionNumber: stringValue(row.admission_number), classId: stringValue(row.class_id), className: stringValue(row.class_name), academicYearId: stringValue(row.academic_year_id), termId: stringValue(row.term_id), date: isoDate(row.attendance_date), status: stringValue(row.status), remarks: stringValue(row.remarks), recordedBy: stringValue(row.recorded_by) }));
  const exams = examRows.map((row) => ({ id: stringValue(row.id), name: stringValue(row.name), description: stringValue(row.description), assessmentId: stringValue(row.assessment_id), assessmentName: stringValue(row.assessment_name), classId: stringValue(row.class_id), className: stringValue(row.class_name), academicYearId: stringValue(row.academic_year_id), academicYear: stringValue(row.academic_year), termId: stringValue(row.term_id), termName: stringValue(row.term_name), examDate: isoDate(row.exam_date), startTime: stringValue(row.start_time), endTime: stringValue(row.end_time), location: stringValue(row.location), invigilator: stringValue(row.invigilator), totalMarks: numberValue(row.total_marks), passingMarks: numberValue(row.passing_marks), duration: numberValue(row.duration), examType: stringValue(row.exam_type), status: stringValue(row.status), instructions: stringValue(row.instructions), rules: objectValue(row.rules) }));
  const library = objectValue(libraryValue);
  const books = arrayValue(library.books);
  const loans = arrayValue(library.loans);

  return {
    generatedAt: new Date().toISOString(),
    school: { id: stringValue(school.id), name: stringValue(school.name), slug: stringValue(school.slug) },
    classes,
    students,
    subjects: subjectRows.map((row) => ({ id: stringValue(row.id), name: stringValue(row.name), code: stringValue(row.code), type: stringValue(row.type) })),
    academicYears: yearRows.map((row) => ({ id: stringValue(row.id), name: stringValue(row.name), isCurrent: boolValue(row.is_current) })),
    terms: termRows.map((row) => ({ id: stringValue(row.id), name: stringValue(row.name), academicYearId: stringValue(row.academic_year_id), academicYear: stringValue(row.academic_year), status: stringValue(row.status) })),
    teachers: teacherRows.map((row) => ({ id: stringValue(row.id), name: stringValue(row.name), email: stringValue(row.email) })),
    attendance,
    exams,
    library: { books, loans, settings: objectValue(library.settings) },
    summary: {
      students: students.length,
      attendancePresent: attendance.filter((item) => item.status === "present").length,
      attendanceAbsent: attendance.filter((item) => item.status === "absent").length,
      attendanceLate: attendance.filter((item) => item.status === "late").length,
      exams: exams.length,
      books: books.length,
      activeLoans: loans.filter((loan) => stringValue(loan.status, "issued") === "issued").length,
    },
  };
}

export async function GET(request: NextRequest) {
  const context = await resolveContext(request);
  if ("response" in context) return context.response;
  return NextResponse.json(await buildPayload(context.tenantDb, context.school, {
    classId: request.nextUrl.searchParams.get("classId") || undefined,
    date: request.nextUrl.searchParams.get("date") || undefined,
  }));
}

export async function POST(request: NextRequest) {
  const context = await resolveContext(request);
  if ("response" in context) return context.response;
  const body = await request.json().catch(() => ({} as Row));
  const action = stringValue(body.action);

  if (action === "attendance.save") {
    const classId = stringValue(body.classId);
    const date = stringValue(body.date);
    const records = arrayValue(body.records);
    if (!classId || !date) return NextResponse.json({ error: "Class and date are required" }, { status: 400 });
    const classRow = await first(context.tenantDb, sql`select academic_year_id from classes where id = ${classId} limit 1`);
    const academicYearId = stringValue(body.academicYearId, stringValue(classRow.academic_year_id));
    await context.tenantDb.execute(sql`delete from attendance where class_id = ${classId} and attendance_date::date = ${date}::date`);
    for (const record of records) {
      const studentId = stringValue(record.studentId);
      const status = stringValue(record.status, "present");
      if (!studentId) continue;
      await context.tenantDb.execute(sql`
        insert into attendance (id, student_id, class_id, academic_year_id, term_id, attendance_date, status, remarks, recorded_by, created_at, updated_at)
        values (${`att_${crypto.randomUUID()}`}, ${studentId}, ${classId}, ${academicYearId}, ${stringValue(body.termId) || null}, ${new Date(date)}, ${status}, ${stringValue(record.remarks) || null}, ${context.actor.id}, now(), now())
      `);
    }
    await audit(context, request, "attendance.save", classId, { date, count: records.length });
  } else if (action === "exam.create") {
    const id = `exam_${crypto.randomUUID()}`;
    await context.tenantDb.execute(sql`
      insert into exams (id, name, description, assessment_id, class_id, academic_year_id, term_id, exam_date, start_time, end_time, location, invigilator, total_marks, passing_marks, duration, exam_type, status, instructions, rules, created_at, updated_at)
      values (${id}, ${stringValue(body.name)}, ${stringValue(body.description) || null}, ${stringValue(body.assessmentId) || null}, ${stringValue(body.classId)}, ${stringValue(body.academicYearId)}, ${stringValue(body.termId)}, ${new Date(stringValue(body.examDate))}, ${stringValue(body.startTime) || null}, ${stringValue(body.endTime) || null}, ${stringValue(body.location) || null}, ${stringValue(body.invigilator) || null}, ${numberValue(body.totalMarks) || 100}, ${numberValue(body.passingMarks) || null}, ${numberValue(body.duration) || null}, ${stringValue(body.examType, "midterm")}, ${stringValue(body.status, "scheduled")}, ${stringValue(body.instructions) || null}, ${JSON.stringify(objectValue(body.rules))}::jsonb, now(), now())
    `);
    await audit(context, request, "exam.create", id, { name: body.name });
  } else if (action === "library.save") {
    const library = objectValue(body.library);
    await saveJsonSetting(context.tenantDb, LIBRARY_KEY, library, "School admin library catalog and circulation");
    await audit(context, request, "library.save", LIBRARY_KEY, { books: arrayValue(library.books).length, loans: arrayValue(library.loans).length });
  } else {
    return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
  }

  return NextResponse.json({ success: true, ...(await buildPayload(context.tenantDb, context.school, { classId: stringValue(body.classId), date: stringValue(body.date) })) });
}

export async function PUT(request: NextRequest) {
  const context = await resolveContext(request);
  if ("response" in context) return context.response;
  const body = await request.json().catch(() => ({} as Row));
  const action = stringValue(body.action);

  if (action === "exam.update") {
    const id = stringValue(body.id);
    if (!id) return NextResponse.json({ error: "Exam ID is required" }, { status: 400 });
    await context.tenantDb.execute(sql`
      update exams
      set name = ${stringValue(body.name)},
          description = ${stringValue(body.description) || null},
          assessment_id = ${stringValue(body.assessmentId) || null},
          class_id = ${stringValue(body.classId)},
          academic_year_id = ${stringValue(body.academicYearId)},
          term_id = ${stringValue(body.termId)},
          exam_date = ${new Date(stringValue(body.examDate))},
          start_time = ${stringValue(body.startTime) || null},
          end_time = ${stringValue(body.endTime) || null},
          location = ${stringValue(body.location) || null},
          invigilator = ${stringValue(body.invigilator) || null},
          total_marks = ${numberValue(body.totalMarks) || 100},
          passing_marks = ${numberValue(body.passingMarks) || null},
          duration = ${numberValue(body.duration) || null},
          exam_type = ${stringValue(body.examType, "midterm")},
          status = ${stringValue(body.status, "scheduled")},
          instructions = ${stringValue(body.instructions) || null},
          rules = ${JSON.stringify(objectValue(body.rules))}::jsonb,
          updated_at = now()
      where id = ${id}
    `);
    await audit(context, request, "exam.update", id, { name: body.name });
  } else {
    return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
  }

  return NextResponse.json({ success: true, ...(await buildPayload(context.tenantDb, context.school)) });
}

export async function DELETE(request: NextRequest) {
  const context = await resolveContext(request);
  if ("response" in context) return context.response;
  const type = request.nextUrl.searchParams.get("type") || "";
  const id = request.nextUrl.searchParams.get("id") || "";
  if (!id) return NextResponse.json({ error: "ID is required" }, { status: 400 });
  if (type !== "exam") return NextResponse.json({ error: "Unsupported delete type" }, { status: 400 });
  await context.tenantDb.execute(sql`delete from exams where id = ${id}`);
  await audit(context, request, "exam.delete", id);
  return NextResponse.json({ success: true, ...(await buildPayload(context.tenantDb, context.school)) });
}
