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
const ATTENDANCE_STATUSES = new Set(["present", "absent", "late", "excused"]);

function stringValue(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function numberValue(value: unknown) {
  const next = Number(value ?? 0);
  return Number.isFinite(next) ? next : 0;
}

function isoDate(value: unknown) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function dateOnly(value: unknown) {
  const date = isoDate(value);
  return date ? date.slice(0, 10) : "";
}

function arrayValue(value: unknown) {
  return Array.isArray(value) ? value as Row[] : [];
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
    console.warn("Admin attendance query skipped:", error instanceof Error ? error.message : error);
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
  if (!ALLOWED_ROLES.has(role)) return { response: NextResponse.json({ error: "Only owners and school admins can manage student attendance" }, { status: 403 }) };

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
    resource: "student_attendance",
    resourceId,
    changes: { ...changes, actorEmail: ctx.actor.email, actorName: ctx.actor.name, actorRole: ctx.actor.role },
  }).catch(() => undefined);
}

async function buildPayload(db: QueryableDb, school: Row, filters: { classId?: string; date?: string; query?: string; range?: string } = {}) {
  const date = filters.date || new Date().toISOString().slice(0, 10);
  const classId = filters.classId || "";
  const query = `%${(filters.query || "").toLowerCase()}%`;
  const rangeDays = Math.max(7, Math.min(120, numberValue(filters.range || 30) || 30));

  const [classRows, studentRows, attendanceRows, trendRows, riskRows] = await Promise.all([
    rows(db, sql`
      select c.*, ay.name as academic_year, count(s.id)::int as enrolled
      from classes c
      left join academic_years ay on ay.id = c.academic_year_id
      left join students s on s.class_id = c.id and lower(s.status) in ('active', 'pending')
      group by c.id, ay.name
      order by c.grade asc nulls last, c.name asc, c.section asc
    `),
    rows(db, sql`
      select s.id, s.admission_number, s.class_id, s.status, u.name, u.email, c.name as class_name, c.academic_year_id, ay.name as academic_year
      from students s
      left join users u on u.id = s.user_id
      left join classes c on c.id = s.class_id
      left join academic_years ay on ay.id = c.academic_year_id
      where (${classId} = '' or s.class_id = ${classId})
        and lower(coalesce(s.status, 'active')) in ('active', 'pending')
        and (${filters.query || ""} = '' or lower(coalesce(u.name, '')) like ${query} or lower(coalesce(s.admission_number, '')) like ${query})
      order by u.name asc nulls last, s.admission_number asc
    `),
    rows(db, sql`
      select a.*, u.name as student_name, s.admission_number, c.name as class_name
      from attendance a
      left join students s on s.id = a.student_id
      left join users u on u.id = s.user_id
      left join classes c on c.id = a.class_id
      where a.attendance_date::date = ${date}::date
        and (${classId} = '' or a.class_id = ${classId})
      order by u.name asc nulls last
    `),
    rows(db, sql`
      select attendance_date::date as date,
        count(*)::int as total,
        count(*) filter (where lower(status) = 'present')::int as present,
        count(*) filter (where lower(status) = 'late')::int as late,
        count(*) filter (where lower(status) = 'absent')::int as absent,
        count(*) filter (where lower(status) = 'excused')::int as excused
      from attendance
      where attendance_date >= current_date - (${rangeDays}::int * interval '1 day')
        and (${classId} = '' or class_id = ${classId})
      group by attendance_date::date
      order by attendance_date::date desc
    `),
    rows(db, sql`
      select s.id as student_id, u.name as student_name, s.admission_number, c.name as class_name,
        count(a.id)::int as total,
        count(a.id) filter (where lower(a.status) in ('present', 'late'))::int as attended,
        count(a.id) filter (where lower(a.status) = 'absent')::int as absent,
        count(a.id) filter (where lower(a.status) = 'late')::int as late
      from students s
      left join users u on u.id = s.user_id
      left join classes c on c.id = s.class_id
      left join attendance a on a.student_id = s.id and a.attendance_date >= current_date - (${rangeDays}::int * interval '1 day')
      where (${classId} = '' or s.class_id = ${classId})
        and lower(coalesce(s.status, 'active')) in ('active', 'pending')
      group by s.id, u.name, s.admission_number, c.name
      having count(a.id) > 0
      order by (count(a.id) filter (where lower(a.status) in ('present', 'late'))::float / nullif(count(a.id), 0)) asc, absent desc
      limit 12
    `),
  ]);

  const attendance = attendanceRows.map((row) => ({
    id: stringValue(row.id),
    studentId: stringValue(row.student_id),
    studentName: stringValue(row.student_name),
    admissionNumber: stringValue(row.admission_number),
    classId: stringValue(row.class_id),
    className: stringValue(row.class_name),
    academicYearId: stringValue(row.academic_year_id),
    termId: stringValue(row.term_id),
    date: isoDate(row.attendance_date),
    status: stringValue(row.status),
    remarks: stringValue(row.remarks),
    recordedBy: stringValue(row.recorded_by),
  }));
  const students = studentRows.map((row) => ({
    id: stringValue(row.id),
    name: stringValue(row.name, "Unnamed student"),
    email: stringValue(row.email),
    admissionNumber: stringValue(row.admission_number),
    classId: stringValue(row.class_id),
    className: stringValue(row.class_name),
    academicYearId: stringValue(row.academic_year_id),
    academicYear: stringValue(row.academic_year),
    status: stringValue(row.status, "active"),
  }));
  const present = attendance.filter((item) => item.status === "present").length;
  const late = attendance.filter((item) => item.status === "late").length;
  const absent = attendance.filter((item) => item.status === "absent").length;
  const excused = attendance.filter((item) => item.status === "excused").length;
  const expected = students.length;
  const marked = attendance.length;

  return {
    generatedAt: new Date().toISOString(),
    school: { id: stringValue(school.id), name: stringValue(school.name), slug: stringValue(school.slug) },
    classes: classRows.map((row) => ({ id: stringValue(row.id), name: stringValue(row.name), grade: stringValue(row.grade), section: stringValue(row.section), academicYearId: stringValue(row.academic_year_id), academicYear: stringValue(row.academic_year), enrolled: numberValue(row.enrolled) })),
    students,
    attendance,
    trend: trendRows.map((row) => ({ date: dateOnly(row.date), total: numberValue(row.total), present: numberValue(row.present), late: numberValue(row.late), absent: numberValue(row.absent), excused: numberValue(row.excused) })),
    risk: riskRows.map((row) => {
      const total = numberValue(row.total);
      const attended = numberValue(row.attended);
      return { studentId: stringValue(row.student_id), studentName: stringValue(row.student_name), admissionNumber: stringValue(row.admission_number), className: stringValue(row.class_name), total, attended, absent: numberValue(row.absent), late: numberValue(row.late), rate: total ? Math.round((attended / total) * 1000) / 10 : 0 };
    }),
    summary: {
      students: expected,
      marked,
      unmarked: Math.max(expected - marked, 0),
      present,
      absent,
      late,
      excused,
      attendanceRate: marked ? Math.round(((present + late) / marked) * 1000) / 10 : 0,
      completionRate: expected ? Math.round((marked / expected) * 1000) / 10 : 0,
    },
  };
}

function validateSave(body: Row) {
  const errors: string[] = [];
  const classId = stringValue(body.classId);
  const date = stringValue(body.date);
  const records = arrayValue(body.records);
  if (!classId) errors.push("Class is required");
  if (!date || Number.isNaN(new Date(date).getTime())) errors.push("Valid attendance date is required");
  if (!records.length) errors.push("At least one attendance record is required");
  for (const record of records) {
    if (!stringValue(record.studentId)) errors.push("Every attendance row must include a student");
    if (!ATTENDANCE_STATUSES.has(stringValue(record.status))) errors.push(`Invalid attendance status: ${stringValue(record.status)}`);
  }
  return errors;
}

export async function GET(request: NextRequest) {
  const context = await resolveContext(request);
  if ("response" in context) return context.response;
  const filters = {
    classId: request.nextUrl.searchParams.get("classId") || undefined,
    date: request.nextUrl.searchParams.get("date") || undefined,
    query: request.nextUrl.searchParams.get("query") || undefined,
    range: request.nextUrl.searchParams.get("range") || undefined,
  };
  const payload = await buildPayload(context.tenantDb, context.school, filters);
  const exportFormat = request.nextUrl.searchParams.get("export");

  if (exportFormat === "json") {
    await audit(context, request, "admin.attendance.exported", context.slug, { format: "json", classId: filters.classId, date: filters.date });
    return NextResponse.json(payload, { headers: { "Cache-Control": "no-store, max-age=0", "Content-Disposition": `attachment; filename="${context.slug}-attendance.json"` } });
  }
  if (exportFormat === "csv") {
    await audit(context, request, "admin.attendance.exported", context.slug, { format: "csv", classId: filters.classId, date: filters.date });
    return new NextResponse(toCsv(payload.attendance as unknown as Row[]), { headers: { "Content-Type": "text/csv; charset=utf-8", "Cache-Control": "no-store, max-age=0", "Content-Disposition": `attachment; filename="${context.slug}-attendance.csv"` } });
  }
  return NextResponse.json(payload, { headers: { "Cache-Control": "no-store, max-age=0" } });
}

export async function POST(request: NextRequest) {
  const context = await resolveContext(request);
  if ("response" in context) return context.response;
  const body = await request.json().catch(() => ({} as Row));
  const action = stringValue(body.action);

  if (action !== "attendance.save") return NextResponse.json({ error: "Unsupported attendance action" }, { status: 400 });
  const errors = validateSave(body);
  if (errors.length) return NextResponse.json({ error: errors.join("; "), errors }, { status: 400 });

  const classId = stringValue(body.classId);
  const date = stringValue(body.date);
  const records = arrayValue(body.records);
  const classRow = await first(context.tenantDb, sql`select academic_year_id from classes where id = ${classId} limit 1`);
  if (!classRow.academic_year_id) return NextResponse.json({ error: "Class not found" }, { status: 404 });
  const activeStudents = await rows(context.tenantDb, sql`select id from students where class_id = ${classId} and lower(coalesce(status, 'active')) in ('active', 'pending')`);
  const activeIds = new Set(activeStudents.map((row) => stringValue(row.id)));
  const invalidStudent = records.find((record) => !activeIds.has(stringValue(record.studentId)));
  if (invalidStudent) return NextResponse.json({ error: "Attendance includes a student outside the selected class" }, { status: 400 });

  await context.tenantDb.execute(sql`delete from attendance where class_id = ${classId} and attendance_date::date = ${date}::date`);
  for (const record of records) {
    await context.tenantDb.execute(sql`
      insert into attendance (id, student_id, class_id, academic_year_id, term_id, attendance_date, status, remarks, recorded_by, created_at, updated_at)
      values (${`att_${crypto.randomUUID()}`}, ${stringValue(record.studentId)}, ${classId}, ${stringValue(body.academicYearId, stringValue(classRow.academic_year_id))}, ${stringValue(body.termId) || null}, ${new Date(date)}, ${stringValue(record.status, "present")}, ${stringValue(record.remarks) || null}, ${context.actor.id}, now(), now())
    `);
  }
  await audit(context, request, "admin.attendance.saved", `${classId}:${date}`, { classId, date, count: records.length, statuses: Object.fromEntries([...ATTENDANCE_STATUSES].map((status) => [status, records.filter((record) => stringValue(record.status) === status).length])) });
  return NextResponse.json({ success: true, ...(await buildPayload(context.tenantDb, context.school, { classId, date })) });
}

export async function DELETE(request: NextRequest) {
  const context = await resolveContext(request);
  if ("response" in context) return context.response;
  const classId = request.nextUrl.searchParams.get("classId") || "";
  const date = request.nextUrl.searchParams.get("date") || "";
  if (!classId || !date) return NextResponse.json({ error: "Class and date are required" }, { status: 400 });
  await context.tenantDb.execute(sql`delete from attendance where class_id = ${classId} and attendance_date::date = ${date}::date`);
  await audit(context, request, "admin.attendance.cleared", `${classId}:${date}`, { classId, date });
  return NextResponse.json({ success: true, ...(await buildPayload(context.tenantDb, context.school, { classId, date })) });
}
