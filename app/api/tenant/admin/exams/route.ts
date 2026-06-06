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
const EXAM_STATUSES = new Set(["scheduled", "in-progress", "completed", "cancelled"]);
const EXAM_TYPES = new Set(["midterm", "final", "mock", "practical", "quiz", "placement"]);

function stringValue(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function numberValue(value: unknown, fallback = 0) {
  const next = Number(value ?? fallback);
  return Number.isFinite(next) ? next : fallback;
}

function objectValue(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Row : {};
}

function isoDate(value: unknown) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function asDateOnly(value: unknown) {
  const date = isoDate(value);
  return date ? date.slice(0, 10) : "";
}

function csvEscape(value: unknown) {
  const text = typeof value === "string" ? value : JSON.stringify(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function toCsv(rows: Row[]) {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  return [headers.join(","), ...rows.map((row) => headers.map((key) => csvEscape(row[key])).join(","))].join("\n");
}

async function rows(db: QueryableDb, query: ReturnType<typeof sql>, fallback: Row[] = []) {
  try {
    const result = await db.execute(query);
    return (result.rows || []) as Row[];
  } catch (error) {
    console.warn("Admin exams query skipped:", error instanceof Error ? error.message : error);
    return fallback;
  }
}

async function first(db: QueryableDb, query: ReturnType<typeof sql>, fallback: Row = {}) {
  const result = await rows(db, query, [fallback]);
  return result[0] || fallback;
}

function resolveSlug(request: NextRequest) {
  return request.nextUrl.searchParams.get("tenant")?.trim() || request.nextUrl.searchParams.get("slug")?.trim() || getTenantSubdomain(request.headers.get("host")) || "";
}

async function resolveContext(request: NextRequest) {
  const slug = resolveSlug(request);
  if (!slug) return { response: NextResponse.json({ error: "Tenant slug is required" }, { status: 400 }) };

  const schoolResult = await masterDb.execute(sql`
    select id, name, slug, database_url
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
  if (!ALLOWED_ROLES.has(role)) return { response: NextResponse.json({ error: "Only owners and school admins can manage exams" }, { status: 403 }) };

  return {
    slug,
    school,
    tenantDb,
    actor: {
      id: stringValue(tenantUser.id, session.user.id),
      email: stringValue(tenantUser.email, session.user.email),
      name: stringValue(tenantUser.name, session.user.name || session.user.email),
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
    resource: "exams",
    resourceId,
    changes: { ...changes, actorEmail: ctx.actor.email, actorName: ctx.actor.name, actorRole: ctx.actor.role },
  }).catch(() => undefined);
}

function examPayload(row: Row, gradeStats = { entries: 0, average: 0, highest: 0, lowest: 0 }) {
  return {
    id: stringValue(row.id),
    name: stringValue(row.name),
    description: stringValue(row.description),
    assessmentId: stringValue(row.assessment_id),
    assessmentName: stringValue(row.assessment_name),
    classId: stringValue(row.class_id),
    className: stringValue(row.class_name),
    academicYearId: stringValue(row.academic_year_id),
    academicYear: stringValue(row.academic_year),
    termId: stringValue(row.term_id),
    termName: stringValue(row.term_name),
    examDate: isoDate(row.exam_date),
    startTime: stringValue(row.start_time),
    endTime: stringValue(row.end_time),
    location: stringValue(row.location),
    invigilator: stringValue(row.invigilator),
    totalMarks: numberValue(row.total_marks, 100),
    passingMarks: numberValue(row.passing_marks, 50),
    duration: numberValue(row.duration),
    examType: stringValue(row.exam_type, "midterm"),
    status: stringValue(row.status, "scheduled"),
    instructions: stringValue(row.instructions),
    rules: objectValue(row.rules),
    createdAt: isoDate(row.created_at),
    updatedAt: isoDate(row.updated_at),
    results: gradeStats,
  };
}

async function getExamRows(db: QueryableDb, filters: { status?: string; classId?: string; termId?: string; query?: string }) {
  const status = filters.status || "";
  const classId = filters.classId || "";
  const termId = filters.termId || "";
  const query = `%${(filters.query || "").toLowerCase()}%`;
  return rows(db, sql`
    select e.*, c.name as class_name, ay.name as academic_year, t.name as term_name, asm.name as assessment_name
    from exams e
    left join classes c on c.id = e.class_id
    left join academic_years ay on ay.id = e.academic_year_id
    left join terms t on t.id = e.term_id
    left join assessments asm on asm.id = e.assessment_id
    where (${status} = '' or e.status = ${status})
      and (${classId} = '' or e.class_id = ${classId})
      and (${termId} = '' or e.term_id = ${termId})
      and (${filters.query || ""} = '' or lower(e.name) like ${query} or lower(coalesce(c.name, '')) like ${query} or lower(coalesce(e.invigilator, '')) like ${query})
    order by e.exam_date desc, e.start_time asc, e.name asc
  `);
}

async function buildPayload(db: QueryableDb, school: Row, filters: { status?: string; classId?: string; termId?: string; query?: string } = {}) {
  const [classRows, yearRows, termRows, teacherRows, assessmentRows, examRows, gradeRows] = await Promise.all([
    rows(db, sql`select c.*, ay.name as academic_year from classes c left join academic_years ay on ay.id = c.academic_year_id order by c.grade asc nulls last, c.name asc, c.section asc`),
    rows(db, sql`select * from academic_years order by start_date desc nulls last, name desc`),
    rows(db, sql`select t.*, ay.name as academic_year from terms t left join academic_years ay on ay.id = t.academic_year_id order by t.start_date desc nulls last, t.name asc`),
    rows(db, sql`select u.id, u.name, u.email from users u left join roles r on r.id = u.role_id where lower(coalesce(r.name, u.role_id)) like '%teacher%' or lower(coalesce(r.name, u.role_id)) like '%admin%' order by u.name asc`),
    rows(db, sql`select id, name, class_id, academic_year_id, term_id, assessment_type, status from assessments order by created_at desc`),
    getExamRows(db, filters),
    rows(db, sql`
      select class_id, academic_year_id, term_id, count(*)::int as entries, avg(percentage)::float as average, max(percentage)::float as highest, min(percentage)::float as lowest
      from grades
      where lower(assessment_type) = 'exam'
      group by class_id, academic_year_id, term_id
    `),
  ]);

  const gradeStats = new Map<string, { entries: number; average: number; highest: number; lowest: number }>();
  for (const grade of gradeRows) {
    gradeStats.set(`${stringValue(grade.class_id)}:${stringValue(grade.academic_year_id)}:${stringValue(grade.term_id)}`, {
      entries: numberValue(grade.entries),
      average: Math.round(numberValue(grade.average) * 10) / 10,
      highest: Math.round(numberValue(grade.highest) * 10) / 10,
      lowest: Math.round(numberValue(grade.lowest) * 10) / 10,
    });
  }

  const exams = examRows.map((row) => examPayload(row, gradeStats.get(`${stringValue(row.class_id)}:${stringValue(row.academic_year_id)}:${stringValue(row.term_id)}`)));
  const now = new Date();
  const upcoming = exams.filter((exam) => exam.examDate && new Date(exam.examDate) >= now && exam.status === "scheduled").length;
  const conflicts = await detectConflicts(db, {});

  return {
    generatedAt: new Date().toISOString(),
    school: { id: stringValue(school.id), name: stringValue(school.name), slug: stringValue(school.slug) },
    classes: classRows.map((row) => ({ id: stringValue(row.id), name: stringValue(row.name), grade: stringValue(row.grade), section: stringValue(row.section), academicYearId: stringValue(row.academic_year_id), academicYear: stringValue(row.academic_year) })),
    academicYears: yearRows.map((row) => ({ id: stringValue(row.id), name: stringValue(row.name), isCurrent: Boolean(row.is_current) })),
    terms: termRows.map((row) => ({ id: stringValue(row.id), name: stringValue(row.name), academicYearId: stringValue(row.academic_year_id), academicYear: stringValue(row.academic_year), status: stringValue(row.status) })),
    teachers: teacherRows.map((row) => ({ id: stringValue(row.id), name: stringValue(row.name), email: stringValue(row.email) })),
    assessments: assessmentRows.map((row) => ({ id: stringValue(row.id), name: stringValue(row.name), classId: stringValue(row.class_id), academicYearId: stringValue(row.academic_year_id), termId: stringValue(row.term_id), type: stringValue(row.assessment_type), status: stringValue(row.status) })),
    exams,
    conflicts,
    summary: {
      exams: exams.length,
      scheduled: exams.filter((item) => item.status === "scheduled").length,
      inProgress: exams.filter((item) => item.status === "in-progress").length,
      completed: exams.filter((item) => item.status === "completed").length,
      cancelled: exams.filter((item) => item.status === "cancelled").length,
      upcoming,
      conflicts: conflicts.length,
    },
  };
}

function validateExam(body: Row) {
  const errors: string[] = [];
  const name = stringValue(body.name);
  const classId = stringValue(body.classId);
  const academicYearId = stringValue(body.academicYearId);
  const termId = stringValue(body.termId);
  const examDate = stringValue(body.examDate);
  const startTime = stringValue(body.startTime);
  const endTime = stringValue(body.endTime);
  const totalMarks = numberValue(body.totalMarks, 100);
  const passingMarks = numberValue(body.passingMarks, 0);
  const duration = numberValue(body.duration, 0);
  const status = stringValue(body.status, "scheduled");
  const examType = stringValue(body.examType, "midterm");

  if (!name || name.length < 3) errors.push("Exam name must be at least 3 characters");
  if (!classId) errors.push("Class is required");
  if (!academicYearId) errors.push("Academic year is required");
  if (!termId) errors.push("Term is required");
  if (!examDate || Number.isNaN(new Date(examDate).getTime())) errors.push("Valid exam date is required");
  if (startTime && endTime && startTime >= endTime) errors.push("End time must be after start time");
  if (totalMarks <= 0) errors.push("Total marks must be greater than zero");
  if (passingMarks < 0 || passingMarks > totalMarks) errors.push("Passing marks must be between 0 and total marks");
  if (duration < 0) errors.push("Duration cannot be negative");
  if (!EXAM_STATUSES.has(status)) errors.push("Invalid exam status");
  if (!EXAM_TYPES.has(examType)) errors.push("Invalid exam type");
  return errors;
}

async function detectConflicts(db: QueryableDb, candidate: { id?: string; classId?: string; examDate?: string; startTime?: string; endTime?: string; invigilator?: string }) {
  const id = candidate.id || "";
  const date = candidate.examDate || "";
  const classId = candidate.classId || "";
  const start = candidate.startTime || "";
  const end = candidate.endTime || "";
  const invigilator = candidate.invigilator || "";

  const all = await rows(db, sql`
    select e.id, e.name, e.class_id, c.name as class_name, e.exam_date, e.start_time, e.end_time, e.invigilator
    from exams e
    left join classes c on c.id = e.class_id
    where e.status != 'cancelled'
      and (${date} = '' or e.exam_date::date = ${date}::date)
      and (${id} = '' or e.id != ${id})
    order by e.exam_date desc
  `);

  const conflicts: Row[] = [];
  for (let i = 0; i < all.length; i += 1) {
    const left = all[i];
    const leftDate = asDateOnly(left.exam_date);
    const leftStart = stringValue(left.start_time);
    const leftEnd = stringValue(left.end_time);
    const compareAgainst = candidate.classId ? [{ class_id: classId, invigilator, exam_date: date, start_time: start, end_time: end, name: "New exam" }] : all.slice(i + 1);
    for (const right of compareAgainst) {
      const rightDate = asDateOnly(right.exam_date);
      const rightStart = stringValue(right.start_time);
      const rightEnd = stringValue(right.end_time);
      if (!leftDate || leftDate !== rightDate || !leftStart || !leftEnd || !rightStart || !rightEnd) continue;
      const overlaps = leftStart < rightEnd && rightStart < leftEnd;
      if (!overlaps) continue;
      const sameClass = stringValue(left.class_id) === stringValue(right.class_id);
      const sameInvigilator = stringValue(left.invigilator).toLowerCase() && stringValue(left.invigilator).toLowerCase() === stringValue(right.invigilator).toLowerCase();
      if (!sameClass && !sameInvigilator) continue;
      conflicts.push({
        type: sameClass ? "class" : "invigilator",
        examId: stringValue(left.id),
        examName: stringValue(left.name),
        className: stringValue(left.class_name),
        date: leftDate,
        time: `${leftStart}-${leftEnd}`,
        invigilator: stringValue(left.invigilator),
      });
    }
  }
  return conflicts;
}

export async function GET(request: NextRequest) {
  const context = await resolveContext(request);
  if ("response" in context) return context.response;

  const filters = {
    status: request.nextUrl.searchParams.get("status") || undefined,
    classId: request.nextUrl.searchParams.get("classId") || undefined,
    termId: request.nextUrl.searchParams.get("termId") || undefined,
    query: request.nextUrl.searchParams.get("query") || undefined,
  };
  const payload = await buildPayload(context.tenantDb, context.school, filters);
  const exportFormat = request.nextUrl.searchParams.get("export");

  if (exportFormat === "json") {
    await audit(context, request, "admin.exams.exported", context.slug, { format: "json", exams: payload.exams.length });
    return NextResponse.json(payload, { headers: { "Cache-Control": "no-store, max-age=0", "Content-Disposition": `attachment; filename="${context.slug}-exams.json"` } });
  }
  if (exportFormat === "csv") {
    await audit(context, request, "admin.exams.exported", context.slug, { format: "csv", exams: payload.exams.length });
    return new NextResponse(toCsv(payload.exams as unknown as Row[]), { headers: { "Content-Type": "text/csv; charset=utf-8", "Cache-Control": "no-store, max-age=0", "Content-Disposition": `attachment; filename="${context.slug}-exams.csv"` } });
  }

  return NextResponse.json(payload, { headers: { "Cache-Control": "no-store, max-age=0" } });
}

export async function POST(request: NextRequest) {
  const context = await resolveContext(request);
  if ("response" in context) return context.response;
  const body = await request.json().catch(() => ({} as Row));
  const action = stringValue(body.action);

  if (action === "exam.upsert") {
    const errors = validateExam(body);
    if (errors.length) return NextResponse.json({ error: errors.join("; "), errors }, { status: 400 });

    const conflicts = await detectConflicts(context.tenantDb, {
      id: stringValue(body.id),
      classId: stringValue(body.classId),
      examDate: stringValue(body.examDate),
      startTime: stringValue(body.startTime),
      endTime: stringValue(body.endTime),
      invigilator: stringValue(body.invigilator),
    });
    if (conflicts.length && !body.allowConflicts) return NextResponse.json({ error: "Exam schedule conflict detected", conflicts }, { status: 409 });

    const id = stringValue(body.id) || `exam_${crypto.randomUUID()}`;
    await context.tenantDb.execute(sql`
      insert into exams (id, name, description, assessment_id, class_id, academic_year_id, term_id, exam_date, start_time, end_time, location, invigilator, total_marks, passing_marks, duration, exam_type, status, instructions, rules, created_at, updated_at)
      values (${id}, ${stringValue(body.name)}, ${stringValue(body.description) || null}, ${stringValue(body.assessmentId) || null}, ${stringValue(body.classId)}, ${stringValue(body.academicYearId)}, ${stringValue(body.termId)}, ${new Date(stringValue(body.examDate))}, ${stringValue(body.startTime) || null}, ${stringValue(body.endTime) || null}, ${stringValue(body.location) || null}, ${stringValue(body.invigilator) || null}, ${numberValue(body.totalMarks, 100)}, ${numberValue(body.passingMarks, 50)}, ${numberValue(body.duration) || null}, ${stringValue(body.examType, "midterm")}, ${stringValue(body.status, "scheduled")}, ${stringValue(body.instructions) || null}, ${JSON.stringify(objectValue(body.rules))}::jsonb, now(), now())
      on conflict (id) do update set
        name = excluded.name,
        description = excluded.description,
        assessment_id = excluded.assessment_id,
        class_id = excluded.class_id,
        academic_year_id = excluded.academic_year_id,
        term_id = excluded.term_id,
        exam_date = excluded.exam_date,
        start_time = excluded.start_time,
        end_time = excluded.end_time,
        location = excluded.location,
        invigilator = excluded.invigilator,
        total_marks = excluded.total_marks,
        passing_marks = excluded.passing_marks,
        duration = excluded.duration,
        exam_type = excluded.exam_type,
        status = excluded.status,
        instructions = excluded.instructions,
        rules = excluded.rules,
        updated_at = now()
    `);
    await audit(context, request, stringValue(body.id) ? "admin.exam.updated" : "admin.exam.created", id, { name: body.name, conflictsOverridden: Boolean(body.allowConflicts) });
  } else if (action === "exam.status") {
    const id = stringValue(body.id);
    const status = stringValue(body.status);
    if (!id || !EXAM_STATUSES.has(status)) return NextResponse.json({ error: "Valid exam ID and status are required" }, { status: 400 });
    const existing = await first(context.tenantDb, sql`select id from exams where id = ${id} limit 1`);
    if (!existing.id) return NextResponse.json({ error: "Exam not found" }, { status: 404 });
    await context.tenantDb.execute(sql`update exams set status = ${status}, updated_at = now() where id = ${id}`);
    await audit(context, request, "admin.exam.status.updated", id, { status });
  } else if (action === "exam.clone") {
    const id = stringValue(body.id);
    const existing = await first(context.tenantDb, sql`select * from exams where id = ${id} limit 1`);
    if (!existing.id) return NextResponse.json({ error: "Exam not found" }, { status: 404 });
    const newId = `exam_${crypto.randomUUID()}`;
    await context.tenantDb.execute(sql`
      insert into exams (id, name, description, assessment_id, class_id, academic_year_id, term_id, exam_date, start_time, end_time, location, invigilator, total_marks, passing_marks, duration, exam_type, status, instructions, rules, created_at, updated_at)
      values (${newId}, ${`${stringValue(existing.name)} Copy`}, ${stringValue(existing.description) || null}, ${stringValue(existing.assessment_id) || null}, ${stringValue(existing.class_id)}, ${stringValue(existing.academic_year_id)}, ${stringValue(existing.term_id)}, ${existing.exam_date as Date}, ${stringValue(existing.start_time) || null}, ${stringValue(existing.end_time) || null}, ${stringValue(existing.location) || null}, ${stringValue(existing.invigilator) || null}, ${numberValue(existing.total_marks, 100)}, ${numberValue(existing.passing_marks, 50)}, ${numberValue(existing.duration) || null}, ${stringValue(existing.exam_type, "midterm")}, 'scheduled', ${stringValue(existing.instructions) || null}, ${JSON.stringify(objectValue(existing.rules))}::jsonb, now(), now())
    `);
    await audit(context, request, "admin.exam.cloned", newId, { sourceExamId: id });
  } else {
    return NextResponse.json({ error: "Unsupported exams action" }, { status: 400 });
  }

  return NextResponse.json({ success: true, ...(await buildPayload(context.tenantDb, context.school)) });
}

export async function DELETE(request: NextRequest) {
  const context = await resolveContext(request);
  if ("response" in context) return context.response;
  const id = request.nextUrl.searchParams.get("id") || "";
  if (!id) return NextResponse.json({ error: "Exam ID is required" }, { status: 400 });
  const existing = await first(context.tenantDb, sql`select id, status from exams where id = ${id} limit 1`);
  if (!existing.id) return NextResponse.json({ error: "Exam not found" }, { status: 404 });
  if (stringValue(existing.status) === "completed") return NextResponse.json({ error: "Completed exams cannot be deleted. Cancel or archive policy should be used instead." }, { status: 400 });
  await context.tenantDb.execute(sql`delete from exams where id = ${id}`);
  await audit(context, request, "admin.exam.deleted", id);
  return NextResponse.json({ success: true, ...(await buildPayload(context.tenantDb, context.school)) });
}
