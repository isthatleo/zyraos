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
const CURRICULUM_KEY = "admin_curriculum";
const DEFAULT_CURRICULUM = {
  tracks: [],
  maps: [],
  outcomes: [],
  policies: {
    framework: "local_national",
    gradingApproach: "percentage",
    promotionLinked: true,
    transcriptLinked: true,
    reportCardLinked: true,
    lessonPlanRequired: true,
    reviewCycle: "termly",
    notes: "",
  },
};

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
    console.warn("Admin curriculum query skipped:", error instanceof Error ? error.message : error);
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
  if (!ALLOWED_ROLES.has(role)) return { response: NextResponse.json({ error: "Only owners and school admins can manage curriculum" }, { status: 403 }) };
  return { slug, school, tenantDb, actor: { id: stringValue(tenantUser.id, session.user.id), email: stringValue(tenantUser.email, session.user.email), name: stringValue(tenantUser.name, session.user.name || session.user.email), role } };
}

async function audit(ctx: { tenantDb: QueryableDb; actor: { id: string; email: string; name: string; role: string } }, request: NextRequest, action: string, resourceId?: string, changes: Row = {}) {
  await writeTenantAuditLog({ db: ctx.tenantDb, request, actorId: ctx.actor.id, action, resource: "curriculum", resourceId, changes: { ...changes, actorEmail: ctx.actor.email, actorName: ctx.actor.name, actorRole: ctx.actor.role } }).catch(() => undefined);
}

async function getCurriculum(db: QueryableDb) {
  const row = await first(db, sql`select value from system_settings where key = ${CURRICULUM_KEY} limit 1`);
  const value = objectValue(row.value);
  return {
    ...DEFAULT_CURRICULUM,
    ...value,
    policies: { ...DEFAULT_CURRICULUM.policies, ...objectValue(value.policies) },
    tracks: arrayValue(value.tracks),
    maps: arrayValue(value.maps),
    outcomes: arrayValue(value.outcomes),
  };
}

async function saveCurriculum(db: QueryableDb, curriculum: Row) {
  await db.execute(sql`
    insert into system_settings (id, key, value, category, description, created_at, updated_at)
    values (${crypto.randomUUID()}, ${CURRICULUM_KEY}, ${JSON.stringify(curriculum)}::jsonb, 'academic', 'School admin curriculum configuration', now(), now())
    on conflict (key) do update set value = excluded.value, updated_at = now()
  `);
}

async function buildPayload(db: QueryableDb, school: Row) {
  const [classRows, subjectRows, curriculum] = await Promise.all([
    rows(db, sql`
      select c.*, ay.name as academic_year, count(s.id)::int as enrolled
      from classes c
      left join academic_years ay on ay.id = c.academic_year_id
      left join students s on s.class_id = c.id and lower(s.status) in ('active', 'pending')
      group by c.id, ay.name
      order by c.grade asc nulls last, c.name asc, c.section asc
    `),
    rows(db, sql`
      select sub.*, count(distinct gr.id)::int as grade_count, count(distinct asm.id)::int as assessment_count
      from subjects sub
      left join grades gr on gr.subject_id = sub.id
      left join assessments asm on asm.subject_id = sub.id
      group by sub.id
      order by sub.type asc, sub.name asc
    `),
    getCurriculum(db),
  ]);
  const classes = classRows.map((row) => ({ id: stringValue(row.id), name: stringValue(row.name), grade: stringValue(row.grade), section: stringValue(row.section), academicYearId: stringValue(row.academic_year_id), academicYear: stringValue(row.academic_year), enrolled: numberValue(row.enrolled) }));
  const subjects = subjectRows.map((row) => ({ id: stringValue(row.id), name: stringValue(row.name), code: stringValue(row.code), type: stringValue(row.type, "core"), gradeCount: numberValue(row.grade_count), assessmentCount: numberValue(row.assessment_count) }));
  const maps = arrayValue(curriculum.maps);
  const tracks = arrayValue(curriculum.tracks);
  const outcomes = arrayValue(curriculum.outcomes);
  const mandatory = maps.filter((item) => boolValue(item.mandatory)).length;
  const totalHours = maps.reduce((sum, item) => sum + numberValue(item.hoursPerWeek), 0);
  return {
    generatedAt: new Date().toISOString(),
    school: { id: stringValue(school.id), name: stringValue(school.name), slug: stringValue(school.slug) },
    classes,
    subjects,
    curriculum,
    coverage: classes.map((klass) => {
      const classMaps = maps.filter((item) => stringValue(item.classId) === klass.id);
      return { classId: klass.id, className: klass.name, subjects: classMaps.length, hours: classMaps.reduce((sum, item) => sum + numberValue(item.hoursPerWeek), 0), mandatory: classMaps.filter((item) => boolValue(item.mandatory)).length };
    }),
    summary: { tracks: tracks.length, activeTracks: tracks.filter((item) => boolValue(item.active)).length, maps: maps.length, mandatory, optional: Math.max(maps.length - mandatory, 0), outcomes: outcomes.length, totalHours, classes: classes.length, subjects: subjects.length },
  };
}

function normalizeCurriculum(value: Row) {
  const tracks = arrayValue(value.tracks).map((item) => ({ id: stringValue(item.id) || `track_${crypto.randomUUID()}`, name: stringValue(item.name), level: stringValue(item.level, "custom"), description: stringValue(item.description), active: boolValue(item.active, true) }));
  const maps = arrayValue(value.maps).map((item) => ({ id: stringValue(item.id) || `map_${crypto.randomUUID()}`, classId: stringValue(item.classId), subjectId: stringValue(item.subjectId), hoursPerWeek: String(numberValue(item.hoursPerWeek)), mandatory: boolValue(item.mandatory, true) }));
  const outcomes = arrayValue(value.outcomes).map((item) => ({ id: stringValue(item.id) || `outcome_${crypto.randomUUID()}`, title: stringValue(item.title), classId: stringValue(item.classId), subjectId: stringValue(item.subjectId), mastery: stringValue(item.mastery, "developing"), notes: stringValue(item.notes) }));
  return { ...DEFAULT_CURRICULUM, ...value, tracks, maps, outcomes, policies: { ...DEFAULT_CURRICULUM.policies, ...objectValue(value.policies) } };
}

function validateCurriculum(curriculum: Row, validClassIds: Set<string>, validSubjectIds: Set<string>) {
  const errors: string[] = [];
  const seenTracks = new Set<string>();
  const seenMaps = new Set<string>();
  for (const track of arrayValue(curriculum.tracks)) {
    const name = stringValue(track.name).toLowerCase();
    if (!name) errors.push("Track name is required");
    if (seenTracks.has(name)) errors.push(`Duplicate curriculum track: ${track.name}`);
    seenTracks.add(name);
  }
  for (const map of arrayValue(curriculum.maps)) {
    const classId = stringValue(map.classId);
    const subjectId = stringValue(map.subjectId);
    if (!validClassIds.has(classId)) errors.push("Subject map references an unknown class");
    if (!validSubjectIds.has(subjectId)) errors.push("Subject map references an unknown subject");
    if (numberValue(map.hoursPerWeek) <= 0 || numberValue(map.hoursPerWeek) > 40) errors.push("Hours per week must be between 1 and 40");
    const key = `${classId}:${subjectId}`;
    if (seenMaps.has(key)) errors.push("Duplicate class-subject map detected");
    seenMaps.add(key);
  }
  return errors;
}

export async function GET(request: NextRequest) {
  const context = await resolveContext(request);
  if ("response" in context) return context.response;
  const payload = await buildPayload(context.tenantDb, context.school);
  const exportFormat = request.nextUrl.searchParams.get("export");
  if (exportFormat === "json") {
    await audit(context, request, "admin.curriculum.exported", context.slug, { format: "json" });
    return NextResponse.json(payload, { headers: { "Cache-Control": "no-store, max-age=0", "Content-Disposition": `attachment; filename="${context.slug}-curriculum.json"` } });
  }
  if (exportFormat === "csv") {
    await audit(context, request, "admin.curriculum.exported", context.slug, { format: "csv" });
    return new NextResponse(toCsv(payload.coverage as unknown as Row[]), { headers: { "Content-Type": "text/csv; charset=utf-8", "Cache-Control": "no-store, max-age=0", "Content-Disposition": `attachment; filename="${context.slug}-curriculum-coverage.csv"` } });
  }
  return NextResponse.json(payload, { headers: { "Cache-Control": "no-store, max-age=0" } });
}

export async function POST(request: NextRequest) {
  const context = await resolveContext(request);
  if ("response" in context) return context.response;
  const body = await request.json().catch(() => ({} as Row));
  const action = stringValue(body.action);
  if (action !== "curriculum.save") return NextResponse.json({ error: "Unsupported curriculum action" }, { status: 400 });
  const curriculum = normalizeCurriculum(objectValue(body.curriculum));
  const [classes, subjects] = await Promise.all([rows(context.tenantDb, sql`select id from classes`), rows(context.tenantDb, sql`select id from subjects`)]);
  const errors = validateCurriculum(curriculum, new Set(classes.map((item) => stringValue(item.id))), new Set(subjects.map((item) => stringValue(item.id))));
  if (errors.length) return NextResponse.json({ error: errors.join("; "), errors }, { status: 400 });
  await saveCurriculum(context.tenantDb, curriculum);
  await audit(context, request, "admin.curriculum.saved", CURRICULUM_KEY, { tracks: arrayValue(curriculum.tracks).length, maps: arrayValue(curriculum.maps).length, outcomes: arrayValue(curriculum.outcomes).length });
  return NextResponse.json({ success: true, ...(await buildPayload(context.tenantDb, context.school)) });
}
