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
const SUBJECT_TYPES = new Set(["core", "elective", "extra_curricular", "language", "practical", "custom"]);
const CURRICULUM_KEY = "admin_curriculum";
const TIMETABLE_KEY = "admin_timetable";

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
    console.warn("Admin subjects query skipped:", error instanceof Error ? error.message : error);
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
  if (!ALLOWED_ROLES.has(role)) return { response: NextResponse.json({ error: "Only owners and school admins can manage subjects" }, { status: 403 }) };
  return { slug, school, tenantDb, actor: { id: stringValue(tenantUser.id, session.user.id), email: stringValue(tenantUser.email, session.user.email), name: stringValue(tenantUser.name, session.user.name || session.user.email), role } };
}

async function audit(ctx: { tenantDb: QueryableDb; actor: { id: string; email: string; name: string; role: string } }, request: NextRequest, action: string, resourceId?: string, changes: Row = {}) {
  await writeTenantAuditLog({ db: ctx.tenantDb, request, actorId: ctx.actor.id, action, resource: "subjects", resourceId, changes: { ...changes, actorEmail: ctx.actor.email, actorName: ctx.actor.name, actorRole: ctx.actor.role } }).catch(() => undefined);
}

async function getJsonSetting(db: QueryableDb, key: string) {
  const row = await first(db, sql`select value from system_settings where key = ${key} limit 1`);
  return objectValue(row.value);
}

async function subjectUsage(db: QueryableDb, subjectId: string) {
  const [grades, assessments, curriculum, timetable] = await Promise.all([
    first(db, sql`select count(*)::int as total from grades where subject_id = ${subjectId}`),
    first(db, sql`select count(*)::int as total from assessments where subject_id = ${subjectId}`),
    getJsonSetting(db, CURRICULUM_KEY),
    getJsonSetting(db, TIMETABLE_KEY),
  ]);
  const curriculumMaps = arrayValue(curriculum.maps).filter((item) => stringValue(item.subjectId) === subjectId).length;
  const outcomes = arrayValue(curriculum.outcomes).filter((item) => stringValue(item.subjectId) === subjectId).length;
  const timetableEntries = arrayValue(timetable.entries).filter((item) => stringValue(item.subjectId) === subjectId).length;
  return { grades: numberValue(grades.total), assessments: numberValue(assessments.total), curriculumMaps, outcomes, timetableEntries, total: numberValue(grades.total) + numberValue(assessments.total) + curriculumMaps + outcomes + timetableEntries };
}

async function buildPayload(db: QueryableDb, school: Row, filters: { type?: string; query?: string } = {}) {
  const type = filters.type || "";
  const query = `%${(filters.query || "").toLowerCase()}%`;
  const subjectRows = await rows(db, sql`
    select sub.*,
      count(distinct gr.id)::int as grade_count,
      count(distinct asm.id)::int as assessment_count
    from subjects sub
    left join grades gr on gr.subject_id = sub.id
    left join assessments asm on asm.subject_id = sub.id
    where (${type} = '' or sub.type = ${type})
      and (${filters.query || ""} = '' or lower(sub.name) like ${query} or lower(sub.code) like ${query} or lower(coalesce(sub.description, '')) like ${query})
    group by sub.id
    order by sub.type asc, sub.name asc
  `);
  const [curriculum, timetable] = await Promise.all([getJsonSetting(db, CURRICULUM_KEY), getJsonSetting(db, TIMETABLE_KEY)]);
  const subjects = subjectRows.map((row) => {
    const id = stringValue(row.id);
    const curriculumMaps = arrayValue(curriculum.maps).filter((item) => stringValue(item.subjectId) === id).length;
    const outcomes = arrayValue(curriculum.outcomes).filter((item) => stringValue(item.subjectId) === id).length;
    const timetableEntries = arrayValue(timetable.entries).filter((item) => stringValue(item.subjectId) === id).length;
    return {
      id,
      name: stringValue(row.name),
      code: stringValue(row.code),
      description: stringValue(row.description),
      type: stringValue(row.type, "core"),
      gradeCount: numberValue(row.grade_count),
      assessmentCount: numberValue(row.assessment_count),
      curriculumMaps,
      outcomes,
      timetableEntries,
      locked: Boolean(numberValue(row.grade_count) || numberValue(row.assessment_count) || curriculumMaps || outcomes || timetableEntries),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  });
  return {
    generatedAt: new Date().toISOString(),
    school: { id: stringValue(school.id), name: stringValue(school.name), slug: stringValue(school.slug) },
    subjects,
    summary: {
      subjects: subjects.length,
      core: subjects.filter((item) => item.type === "core").length,
      elective: subjects.filter((item) => item.type === "elective").length,
      extraCurricular: subjects.filter((item) => item.type === "extra_curricular").length,
      mapped: subjects.filter((item) => item.curriculumMaps > 0).length,
      inTimetable: subjects.filter((item) => item.timetableEntries > 0).length,
      locked: subjects.filter((item) => item.locked).length,
    },
  };
}

function validateSubject(body: Row) {
  const errors: string[] = [];
  const name = stringValue(body.name);
  const code = stringValue(body.code).toUpperCase();
  const type = stringValue(body.type, "core");
  if (name.length < 2) errors.push("Subject name must be at least 2 characters");
  if (!/^[A-Z0-9_-]{2,16}$/.test(code)) errors.push("Subject code must be 2-16 characters using letters, numbers, dash, or underscore");
  if (!SUBJECT_TYPES.has(type)) errors.push("Invalid subject type");
  return errors;
}

export async function GET(request: NextRequest) {
  const context = await resolveContext(request);
  if ("response" in context) return context.response;
  const filters = { type: request.nextUrl.searchParams.get("type") || undefined, query: request.nextUrl.searchParams.get("query") || undefined };
  const payload = await buildPayload(context.tenantDb, context.school, filters);
  const exportFormat = request.nextUrl.searchParams.get("export");
  if (exportFormat === "json") {
    await audit(context, request, "admin.subjects.exported", context.slug, { format: "json", count: payload.subjects.length });
    return NextResponse.json(payload, { headers: { "Cache-Control": "no-store, max-age=0", "Content-Disposition": `attachment; filename="${context.slug}-subjects.json"` } });
  }
  if (exportFormat === "csv") {
    await audit(context, request, "admin.subjects.exported", context.slug, { format: "csv", count: payload.subjects.length });
    return new NextResponse(toCsv(payload.subjects as unknown as Row[]), { headers: { "Content-Type": "text/csv; charset=utf-8", "Cache-Control": "no-store, max-age=0", "Content-Disposition": `attachment; filename="${context.slug}-subjects.csv"` } });
  }
  return NextResponse.json(payload, { headers: { "Cache-Control": "no-store, max-age=0" } });
}

export async function POST(request: NextRequest) {
  const context = await resolveContext(request);
  if ("response" in context) return context.response;
  const body = await request.json().catch(() => ({} as Row));
  const action = stringValue(body.action);
  if (action !== "subject.upsert") return NextResponse.json({ error: "Unsupported subjects action" }, { status: 400 });
  const errors = validateSubject(body);
  if (errors.length) return NextResponse.json({ error: errors.join("; "), errors }, { status: 400 });
  const id = stringValue(body.id) || `subject_${crypto.randomUUID()}`;
  const code = stringValue(body.code).toUpperCase();
  const duplicate = await first(context.tenantDb, sql`select id from subjects where lower(code) = lower(${code}) and id != ${id} limit 1`);
  if (duplicate.id) return NextResponse.json({ error: "Subject code already exists" }, { status: 409 });
  await context.tenantDb.execute(sql`
    insert into subjects (id, name, code, description, type, created_at, updated_at)
    values (${id}, ${stringValue(body.name)}, ${code}, ${stringValue(body.description) || null}, ${stringValue(body.type, "core")}, now(), now())
    on conflict (id) do update set name = excluded.name, code = excluded.code, description = excluded.description, type = excluded.type, updated_at = now()
  `);
  await audit(context, request, stringValue(body.id) ? "admin.subject.updated" : "admin.subject.created", id, { name: body.name, code, type: body.type });
  return NextResponse.json({ success: true, ...(await buildPayload(context.tenantDb, context.school)) });
}

export async function DELETE(request: NextRequest) {
  const context = await resolveContext(request);
  if ("response" in context) return context.response;
  const id = request.nextUrl.searchParams.get("id") || "";
  if (!id) return NextResponse.json({ error: "Subject ID is required" }, { status: 400 });
  const existing = await first(context.tenantDb, sql`select id, name from subjects where id = ${id} limit 1`);
  if (!existing.id) return NextResponse.json({ error: "Subject not found" }, { status: 404 });
  const usage = await subjectUsage(context.tenantDb, id);
  if (usage.total) return NextResponse.json({ error: "Subject is in use and cannot be deleted", usage }, { status: 409 });
  await context.tenantDb.execute(sql`delete from subjects where id = ${id}`);
  await audit(context, request, "admin.subject.deleted", id, { name: existing.name });
  return NextResponse.json({ success: true, ...(await buildPayload(context.tenantDb, context.school)) });
}
