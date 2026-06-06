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
const TIMETABLE_KEY = "admin_timetable";
const CURRICULUM_KEY = "admin_curriculum";

function stringValue(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function numberValue(value: unknown) {
  const next = Number(value ?? 0);
  return Number.isFinite(next) ? next : 0;
}

function objectValue(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Row : {};
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
    console.warn("Admin classes query skipped:", error instanceof Error ? error.message : error);
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
  const schoolResult = await masterDb.execute(sql`select id, name, slug, database_url from schools where slug = ${slug} limit 1`);
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
  if (!ALLOWED_ROLES.has(role)) return { response: NextResponse.json({ error: "Only owners and school admins can manage classes" }, { status: 403 }) };
  return { slug, school, tenantDb, actor: { id: stringValue(tenantUser.id, session.user.id), email: stringValue(tenantUser.email, session.user.email), name: stringValue(tenantUser.name, session.user.name || session.user.email), role } };
}

async function audit(ctx: { tenantDb: QueryableDb; actor: { id: string; email: string; name: string; role: string } }, request: NextRequest, action: string, resourceId?: string, changes: Row = {}) {
  await writeTenantAuditLog({ db: ctx.tenantDb, request, actorId: ctx.actor.id, action, resource: "classes", resourceId, changes: { ...changes, actorEmail: ctx.actor.email, actorName: ctx.actor.name, actorRole: ctx.actor.role } }).catch(() => undefined);
}

async function getJsonSetting(db: QueryableDb, key: string) {
  const row = await first(db, sql`select value from system_settings where key = ${key} limit 1`);
  return objectValue(row.value);
}

async function ensureAcademicYear(db: QueryableDb, name: string) {
  const yearName = name || String(new Date().getFullYear());
  const existing = await first(db, sql`select id from academic_years where lower(name) = lower(${yearName}) limit 1`);
  if (existing.id) return stringValue(existing.id);
  const id = `ay_${crypto.randomUUID()}`;
  const year = Number.parseInt(yearName.slice(0, 4), 10) || new Date().getFullYear();
  await db.execute(sql`
    insert into academic_years (id, name, start_date, end_date, is_current, created_at, updated_at)
    values (${id}, ${yearName}, ${new Date(year, 0, 1)}, ${new Date(year, 11, 31)}, false, now(), now())
  `);
  return id;
}

async function classUsage(db: QueryableDb, classId: string) {
  const [students, attendance, exams, assessments, curriculum, timetable] = await Promise.all([
    first(db, sql`select count(*)::int as total from students where class_id = ${classId}`),
    first(db, sql`select count(*)::int as total from attendance where class_id = ${classId}`),
    first(db, sql`select count(*)::int as total from exams where class_id = ${classId}`),
    first(db, sql`select count(*)::int as total from assessments where class_id = ${classId}`),
    getJsonSetting(db, CURRICULUM_KEY),
    getJsonSetting(db, TIMETABLE_KEY),
  ]);
  const curriculumMaps = arrayValue(curriculum.maps).filter((item) => stringValue(item.classId) === classId).length;
  const outcomes = arrayValue(curriculum.outcomes).filter((item) => stringValue(item.classId) === classId).length;
  const timetableEntries = arrayValue(timetable.entries).filter((item) => stringValue(item.classId) === classId).length;
  return {
    students: numberValue(students.total),
    attendance: numberValue(attendance.total),
    exams: numberValue(exams.total),
    assessments: numberValue(assessments.total),
    curriculumMaps,
    outcomes,
    timetableEntries,
    total: numberValue(students.total) + numberValue(attendance.total) + numberValue(exams.total) + numberValue(assessments.total) + curriculumMaps + outcomes + timetableEntries,
  };
}

async function buildPayload(db: QueryableDb, school: Row, filters: { query?: string; yearId?: string } = {}) {
  const query = `%${(filters.query || "").toLowerCase()}%`;
  const yearId = filters.yearId || "";
  const [classRows, yearRows, teacherRows, curriculum, timetable] = await Promise.all([
    rows(db, sql`
      select c.*, ay.name as academic_year, u.name as teacher_name, count(s.id)::int as enrolled
      from classes c
      left join academic_years ay on ay.id = c.academic_year_id
      left join users u on u.id = c.teacher_id
      left join students s on s.class_id = c.id and lower(coalesce(s.status, 'active')) in ('active', 'pending')
      where (${yearId} = '' or c.academic_year_id = ${yearId})
        and (${filters.query || ""} = '' or lower(c.name) like ${query} or lower(coalesce(c.grade, '')) like ${query} or lower(coalesce(c.section, '')) like ${query} or lower(coalesce(u.name, '')) like ${query})
      group by c.id, ay.name, u.name
      order by c.grade asc nulls last, c.name asc, c.section asc
    `),
    rows(db, sql`select * from academic_years order by start_date desc nulls last, name desc`),
    rows(db, sql`
      select st.id as staff_id, st.user_id, st.employee_id, st.position, u.name, u.email
      from staff st
      left join users u on u.id = st.user_id
      where lower(coalesce(st.status, 'active')) = 'active'
      order by u.name asc
    `),
    getJsonSetting(db, CURRICULUM_KEY),
    getJsonSetting(db, TIMETABLE_KEY),
  ]);
  const classes = classRows.map((row) => {
    const id = stringValue(row.id);
    const capacity = numberValue(row.capacity);
    const enrolled = numberValue(row.enrolled);
    const curriculumMaps = arrayValue(curriculum.maps).filter((item) => stringValue(item.classId) === id).length;
    const timetableEntries = arrayValue(timetable.entries).filter((item) => stringValue(item.classId) === id).length;
    return {
      id,
      name: stringValue(row.name),
      grade: stringValue(row.grade),
      section: stringValue(row.section),
      academicYearId: stringValue(row.academic_year_id),
      academicYear: stringValue(row.academic_year),
      teacherId: stringValue(row.teacher_id),
      teacherName: stringValue(row.teacher_name),
      capacity,
      enrolled,
      seatsAvailable: capacity ? Math.max(capacity - enrolled, 0) : null,
      curriculumMaps,
      timetableEntries,
      locked: Boolean(enrolled || curriculumMaps || timetableEntries),
      capacityUsed: capacity ? Math.round((enrolled / capacity) * 1000) / 10 : 0,
    };
  });
  return {
    generatedAt: new Date().toISOString(),
    school: { id: stringValue(school.id), name: stringValue(school.name), slug: stringValue(school.slug) },
    classes,
    teachers: teacherRows.map((row) => ({ id: stringValue(row.user_id), staffId: stringValue(row.staff_id), name: stringValue(row.name), email: stringValue(row.email), employeeId: stringValue(row.employee_id), position: stringValue(row.position) })),
    academicYears: yearRows.map((row) => ({ id: stringValue(row.id), name: stringValue(row.name), isCurrent: Boolean(row.is_current), startDate: row.start_date, endDate: row.end_date })),
    summary: {
      classes: classes.length,
      capacity: classes.reduce((sum, item) => sum + item.capacity, 0),
      enrolled: classes.reduce((sum, item) => sum + item.enrolled, 0),
      available: classes.reduce((sum, item) => sum + (item.seatsAvailable || 0), 0),
      assignedTeachers: classes.filter((item) => item.teacherId).length,
      timetableLinked: classes.filter((item) => item.timetableEntries > 0).length,
      curriculumLinked: classes.filter((item) => item.curriculumMaps > 0).length,
      locked: classes.filter((item) => item.locked).length,
    },
  };
}

function validateClass(body: Row) {
  const errors: string[] = [];
  const name = stringValue(body.name);
  const grade = stringValue(body.grade);
  const capacity = numberValue(body.capacity);
  if (name.length < 2) errors.push("Class name must be at least 2 characters");
  if (!grade) errors.push("Grade/stage is required");
  if (capacity < 0) errors.push("Capacity cannot be negative");
  return errors;
}

export async function GET(request: NextRequest) {
  const context = await resolveContext(request);
  if ("response" in context) return context.response;
  const payload = await buildPayload(context.tenantDb, context.school, { query: request.nextUrl.searchParams.get("query") || undefined, yearId: request.nextUrl.searchParams.get("yearId") || undefined });
  const exportFormat = request.nextUrl.searchParams.get("export");
  if (exportFormat === "json") {
    await audit(context, request, "admin.classes.exported", context.slug, { format: "json", count: payload.classes.length });
    return NextResponse.json(payload, { headers: { "Cache-Control": "no-store, max-age=0", "Content-Disposition": `attachment; filename="${context.slug}-classes.json"` } });
  }
  if (exportFormat === "csv") {
    await audit(context, request, "admin.classes.exported", context.slug, { format: "csv", count: payload.classes.length });
    return new NextResponse(toCsv(payload.classes as unknown as Row[]), { headers: { "Content-Type": "text/csv; charset=utf-8", "Cache-Control": "no-store, max-age=0", "Content-Disposition": `attachment; filename="${context.slug}-classes.csv"` } });
  }
  return NextResponse.json(payload, { headers: { "Cache-Control": "no-store, max-age=0" } });
}

export async function POST(request: NextRequest) {
  const context = await resolveContext(request);
  if ("response" in context) return context.response;
  const body = await request.json().catch(() => ({} as Row));
  if (stringValue(body.action) !== "class.upsert") return NextResponse.json({ error: "Unsupported classes action" }, { status: 400 });
  const errors = validateClass(body);
  if (errors.length) return NextResponse.json({ error: errors.join("; "), errors }, { status: 400 });
  const id = stringValue(body.id) || `class_${crypto.randomUUID()}`;
  const academicYearId = stringValue(body.academicYearId) || await ensureAcademicYear(context.tenantDb, stringValue(body.academicYear));
  const duplicate = await first(context.tenantDb, sql`
    select id from classes
    where lower(name) = lower(${stringValue(body.name)})
      and coalesce(lower(section), '') = coalesce(lower(${stringValue(body.section)}), '')
      and academic_year_id = ${academicYearId}
      and id != ${id}
    limit 1
  `);
  if (duplicate.id) return NextResponse.json({ error: "A class with this name/section already exists for the academic year" }, { status: 409 });
  const enrolled = stringValue(body.id) ? await first(context.tenantDb, sql`select count(*)::int as total from students where class_id = ${id}`) : { total: 0 };
  if (numberValue(body.capacity) && numberValue(body.capacity) < numberValue(enrolled.total)) return NextResponse.json({ error: "Capacity cannot be lower than current enrollment" }, { status: 400 });
  await context.tenantDb.execute(sql`
    insert into classes (id, name, grade, section, academic_year_id, teacher_id, capacity, created_at, updated_at)
    values (${id}, ${stringValue(body.name)}, ${stringValue(body.grade)}, ${stringValue(body.section) || null}, ${academicYearId}, ${stringValue(body.teacherId) || null}, ${numberValue(body.capacity) || null}, now(), now())
    on conflict (id) do update set name = excluded.name, grade = excluded.grade, section = excluded.section, academic_year_id = excluded.academic_year_id, teacher_id = excluded.teacher_id, capacity = excluded.capacity, updated_at = now()
  `);
  await audit(context, request, stringValue(body.id) ? "admin.class.updated" : "admin.class.created", id, { name: body.name, grade: body.grade, section: body.section });
  return NextResponse.json({ success: true, ...(await buildPayload(context.tenantDb, context.school)) });
}

export async function DELETE(request: NextRequest) {
  const context = await resolveContext(request);
  if ("response" in context) return context.response;
  const id = request.nextUrl.searchParams.get("id") || "";
  if (!id) return NextResponse.json({ error: "Class ID is required" }, { status: 400 });
  const existing = await first(context.tenantDb, sql`select id, name from classes where id = ${id} limit 1`);
  if (!existing.id) return NextResponse.json({ error: "Class not found" }, { status: 404 });
  const usage = await classUsage(context.tenantDb, id);
  if (usage.total) return NextResponse.json({ error: "Class is in use and cannot be deleted", usage }, { status: 409 });
  await context.tenantDb.execute(sql`delete from classes where id = ${id}`);
  await audit(context, request, "admin.class.deleted", id, { name: existing.name });
  return NextResponse.json({ success: true, ...(await buildPayload(context.tenantDb, context.school)) });
}
