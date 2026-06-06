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
const DAYS = new Set(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]);
const DEFAULT_TIMETABLE = { entries: [], settings: { periodsPerDay: 8, schoolStart: "08:00", schoolEnd: "16:00", autoConflictCheck: true, breaks: [] } };

function stringValue(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function numberValue(value: unknown) {
  const next = Number(value ?? 0);
  return Number.isFinite(next) ? next : 0;
}

function boolValue(value: unknown, fallback = false) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value.toLowerCase() === "true";
  return value == null ? fallback : Boolean(value);
}

function objectValue(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Row : {};
}

function arrayValue(value: unknown) {
  return Array.isArray(value) ? value as Row[] : [];
}

function timeToMinutes(value: string) {
  const [hours, minutes] = value.split(":").map((part) => Number(part));
  return (Number.isFinite(hours) ? hours : 0) * 60 + (Number.isFinite(minutes) ? minutes : 0);
}

function overlaps(startA: string, endA: string, startB: string, endB: string) {
  return timeToMinutes(startA) < timeToMinutes(endB) && timeToMinutes(startB) < timeToMinutes(endA);
}

function appliesToDay(breakPeriod: Row, day: string) {
  const breakDay = stringValue(breakPeriod.day, "All days");
  return breakDay === "All days" || breakDay === day;
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
    console.warn("Admin timetable query skipped:", error instanceof Error ? error.message : error);
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
  if (!ALLOWED_ROLES.has(role)) return { response: NextResponse.json({ error: "Only owners and school admins can manage timetable" }, { status: 403 }) };
  return { slug, school, tenantDb, actor: { id: stringValue(tenantUser.id, session.user.id), email: stringValue(tenantUser.email, session.user.email), name: stringValue(tenantUser.name, session.user.name || session.user.email), role } };
}

async function audit(ctx: { tenantDb: QueryableDb; actor: { id: string; email: string; name: string; role: string } }, request: NextRequest, action: string, resourceId?: string, changes: Row = {}) {
  await writeTenantAuditLog({ db: ctx.tenantDb, request, actorId: ctx.actor.id, action, resource: "timetable", resourceId, changes: { ...changes, actorEmail: ctx.actor.email, actorName: ctx.actor.name, actorRole: ctx.actor.role } }).catch(() => undefined);
}

async function getTimetable(db: QueryableDb) {
  const row = await first(db, sql`select value from system_settings where key = ${TIMETABLE_KEY} limit 1`);
  const value = objectValue(row.value);
  const settings = { ...objectValue(DEFAULT_TIMETABLE.settings), ...objectValue(value.settings) };
  return { ...DEFAULT_TIMETABLE, ...value, entries: arrayValue(value.entries), settings: { ...settings, breaks: arrayValue(settings.breaks) } };
}

async function saveTimetable(db: QueryableDb, timetable: Row) {
  await db.execute(sql`
    insert into system_settings (id, key, value, category, description, created_at, updated_at)
    values (${crypto.randomUUID()}, ${TIMETABLE_KEY}, ${JSON.stringify(timetable)}::jsonb, 'academic', 'School admin timetable configuration', now(), now())
    on conflict (key) do update set value = excluded.value, updated_at = now()
  `);
}

function normalizeTimetable(value: Row) {
  const settings = { ...objectValue(DEFAULT_TIMETABLE.settings), ...objectValue(value.settings) };
  const breaks = arrayValue(settings.breaks).map((item) => ({ id: stringValue(item.id) || `break_${crypto.randomUUID()}`, name: stringValue(item.name, "Break"), day: stringValue(item.day, "All days"), startTime: stringValue(item.startTime), endTime: stringValue(item.endTime) }));
  const entries = arrayValue(value.entries).map((item) => ({ id: stringValue(item.id) || `tt_${crypto.randomUUID()}`, day: stringValue(item.day, "Monday"), period: stringValue(item.period, "1"), startTime: stringValue(item.startTime), endTime: stringValue(item.endTime), classId: stringValue(item.classId), subjectId: stringValue(item.subjectId), teacherId: stringValue(item.teacherId), room: stringValue(item.room), published: boolValue(item.published) }));
  return { entries, settings: { periodsPerDay: numberValue(settings.periodsPerDay) || 8, schoolStart: stringValue(settings.schoolStart, "08:00"), schoolEnd: stringValue(settings.schoolEnd, "16:00"), autoConflictCheck: boolValue(settings.autoConflictCheck, true), breaks } };
}

function validateTimetable(timetable: Row, validClassIds: Set<string>, validSubjectIds: Set<string>, validTeacherIds: Set<string>) {
  const errors: string[] = [];
  const conflicts: Row[] = [];
  const entries = arrayValue(timetable.entries);
  const settings = objectValue(timetable.settings);
  const breaks = arrayValue(settings.breaks);
  for (const breakPeriod of breaks) {
    const day = stringValue(breakPeriod.day, "All days");
    const start = stringValue(breakPeriod.startTime);
    const end = stringValue(breakPeriod.endTime);
    if (day !== "All days" && !DAYS.has(day)) errors.push(`Invalid break day: ${day}`);
    if (!start || !end || timeToMinutes(start) >= timeToMinutes(end)) errors.push(`Invalid break time for ${stringValue(breakPeriod.name, "break")}`);
  }
  for (const entry of entries) {
    const day = stringValue(entry.day);
    const start = stringValue(entry.startTime);
    const end = stringValue(entry.endTime);
    if (!DAYS.has(day)) errors.push(`Invalid lesson day: ${day}`);
    if (!validClassIds.has(stringValue(entry.classId))) errors.push("Lesson references an unknown class");
    if (!validSubjectIds.has(stringValue(entry.subjectId))) errors.push("Lesson references an unknown subject");
    if (!validTeacherIds.has(stringValue(entry.teacherId))) errors.push("Lesson references an unknown teacher");
    if (!start || !end || timeToMinutes(start) >= timeToMinutes(end)) errors.push("Lesson end time must be after start time");
    for (const breakPeriod of breaks) {
      if (appliesToDay(breakPeriod, day) && overlaps(start, end, stringValue(breakPeriod.startTime), stringValue(breakPeriod.endTime))) {
        conflicts.push({ type: "break", lessonId: stringValue(entry.id), day, time: `${start}-${end}`, breakName: stringValue(breakPeriod.name) });
      }
    }
  }
  for (let i = 0; i < entries.length; i += 1) {
    for (let j = i + 1; j < entries.length; j += 1) {
      const left = entries[i];
      const right = entries[j];
      if (stringValue(left.day) !== stringValue(right.day)) continue;
      if (!overlaps(stringValue(left.startTime), stringValue(left.endTime), stringValue(right.startTime), stringValue(right.endTime))) continue;
      const sameClass = stringValue(left.classId) === stringValue(right.classId);
      const sameTeacher = stringValue(left.teacherId) === stringValue(right.teacherId);
      if (!sameClass && !sameTeacher) continue;
      conflicts.push({ type: sameClass ? "class" : "teacher", lessonId: stringValue(left.id), otherLessonId: stringValue(right.id), day: stringValue(left.day), time: `${stringValue(left.startTime)}-${stringValue(left.endTime)}` });
    }
  }
  return { errors, conflicts };
}

async function buildPayload(db: QueryableDb, school: Row) {
  const [classRows, subjectRows, teacherRows, timetable] = await Promise.all([
    rows(db, sql`select c.*, ay.name as academic_year from classes c left join academic_years ay on ay.id = c.academic_year_id order by c.grade asc nulls last, c.name asc, c.section asc`),
    rows(db, sql`select id, name, code, type from subjects order by type asc, name asc`),
    rows(db, sql`
      select st.id as staff_id, st.user_id, st.employee_id, st.position, u.name, u.email
      from staff st
      left join users u on u.id = st.user_id
      where lower(coalesce(st.status, 'active')) = 'active'
      order by u.name asc
    `),
    getTimetable(db),
  ]);
  const entries = arrayValue(timetable.entries);
  const settings = objectValue(timetable.settings);
  const breaks = arrayValue(settings.breaks);
  const published = entries.filter((item) => boolValue(item.published)).length;
  const teacherIds = new Set(entries.map((item) => stringValue(item.teacherId)).filter(Boolean));
  const classIds = new Set(entries.map((item) => stringValue(item.classId)).filter(Boolean));
  const validation = validateTimetable(timetable, new Set(classRows.map((item) => stringValue(item.id))), new Set(subjectRows.map((item) => stringValue(item.id))), new Set(teacherRows.map((item) => stringValue(item.user_id))));
  return {
    generatedAt: new Date().toISOString(),
    school: { id: stringValue(school.id), name: stringValue(school.name), slug: stringValue(school.slug) },
    classes: classRows.map((row) => ({ id: stringValue(row.id), name: stringValue(row.name), grade: stringValue(row.grade), section: stringValue(row.section), academicYearId: stringValue(row.academic_year_id), academicYear: stringValue(row.academic_year) })),
    subjects: subjectRows.map((row) => ({ id: stringValue(row.id), name: stringValue(row.name), code: stringValue(row.code), type: stringValue(row.type) })),
    teachers: teacherRows.map((row) => ({ id: stringValue(row.user_id), staffId: stringValue(row.staff_id), name: stringValue(row.name), email: stringValue(row.email), employeeId: stringValue(row.employee_id), position: stringValue(row.position) })),
    timetable,
    conflicts: validation.conflicts,
    summary: { timetableEntries: entries.length, published, draft: Math.max(entries.length - published, 0), breaks: breaks.length, teachersScheduled: teacherIds.size, classesScheduled: classIds.size, conflicts: validation.conflicts.length },
  };
}

export async function GET(request: NextRequest) {
  const context = await resolveContext(request);
  if ("response" in context) return context.response;
  const payload = await buildPayload(context.tenantDb, context.school);
  const exportFormat = request.nextUrl.searchParams.get("export");
  if (exportFormat === "json") {
    await audit(context, request, "admin.timetable.exported", context.slug, { format: "json" });
    return NextResponse.json(payload, { headers: { "Cache-Control": "no-store, max-age=0", "Content-Disposition": `attachment; filename="${context.slug}-timetable.json"` } });
  }
  if (exportFormat === "csv") {
    await audit(context, request, "admin.timetable.exported", context.slug, { format: "csv" });
    return new NextResponse(toCsv(arrayValue(payload.timetable.entries)), { headers: { "Content-Type": "text/csv; charset=utf-8", "Cache-Control": "no-store, max-age=0", "Content-Disposition": `attachment; filename="${context.slug}-timetable.csv"` } });
  }
  return NextResponse.json(payload, { headers: { "Cache-Control": "no-store, max-age=0" } });
}

export async function POST(request: NextRequest) {
  const context = await resolveContext(request);
  if ("response" in context) return context.response;
  const body = await request.json().catch(() => ({} as Row));
  const action = stringValue(body.action);
  if (action !== "timetable.save") return NextResponse.json({ error: "Unsupported timetable action" }, { status: 400 });
  const timetable = normalizeTimetable(objectValue(body.timetable));
  const [classRows, subjectRows, teacherRows] = await Promise.all([
    rows(context.tenantDb, sql`select id from classes`),
    rows(context.tenantDb, sql`select id from subjects`),
    rows(context.tenantDb, sql`select user_id from staff where lower(coalesce(status, 'active')) = 'active'`),
  ]);
  const validation = validateTimetable(timetable, new Set(classRows.map((item) => stringValue(item.id))), new Set(subjectRows.map((item) => stringValue(item.id))), new Set(teacherRows.map((item) => stringValue(item.user_id))));
  if (validation.errors.length) return NextResponse.json({ error: validation.errors.join("; "), errors: validation.errors }, { status: 400 });
  if (validation.conflicts.length) return NextResponse.json({ error: "Timetable conflicts detected", conflicts: validation.conflicts }, { status: 409 });
  await saveTimetable(context.tenantDb, timetable);
  await audit(context, request, "admin.timetable.saved", TIMETABLE_KEY, { entries: arrayValue(timetable.entries).length, breaks: arrayValue(objectValue(timetable.settings).breaks).length });
  return NextResponse.json({ success: true, ...(await buildPayload(context.tenantDb, context.school)) });
}
