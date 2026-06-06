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

function isoDate(value: unknown) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
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
    console.warn("Admin alumni query skipped:", error instanceof Error ? error.message : error);
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
  if (!ALLOWED_ROLES.has(role)) return { response: NextResponse.json({ error: "Only owners and school admins can manage alumni" }, { status: 403 }) };
  return { slug, school, tenantDb, actor: { id: stringValue(tenantUser.id, session.user.id), email: stringValue(tenantUser.email, session.user.email), name: stringValue(tenantUser.name, session.user.name || session.user.email), role } };
}

async function audit(ctx: { tenantDb: QueryableDb; actor: { id: string; email: string; name: string; role: string } }, request: NextRequest, action: string, resourceId?: string, changes: Row = {}) {
  await writeTenantAuditLog({ db: ctx.tenantDb, request, actorId: ctx.actor.id, action, resource: "alumni", resourceId, changes: { ...changes, actorEmail: ctx.actor.email, actorName: ctx.actor.name, actorRole: ctx.actor.role } }).catch(() => undefined);
}

async function getAlumniMetadata(db: QueryableDb) {
  const settingRows = await rows(db, sql`select key, value from system_settings where key like 'student_alumni:%'`);
  const map = new Map<string, Row>();
  for (const row of settingRows) {
    const key = stringValue(row.key);
    if (key.startsWith("student_alumni:")) map.set(key.replace("student_alumni:", ""), objectValue(row.value));
  }
  return map;
}

function alumniPayload(row: Row, metadata: Row = {}) {
  const alumni = objectValue(metadata);
  const employer = stringValue(alumni.employer);
  const occupation = stringValue(alumni.occupation);
  const destination = stringValue(alumni.destination);
  return {
    id: stringValue(row.id),
    userId: stringValue(row.user_id),
    name: stringValue(row.name, "Unnamed alumni"),
    admissionNumber: stringValue(row.admission_number),
    email: stringValue(row.email),
    phone: stringValue(row.phone),
    className: stringValue(row.class_name),
    grade: stringValue(row.grade),
    section: stringValue(row.section),
    academicYear: stringValue(row.academic_year),
    graduationDate: isoDate(row.graduation_date),
    guardian: {
      name: stringValue(row.guardian_name),
      relationship: stringValue(row.guardian_relation),
      phone: stringValue(row.guardian_phone),
      email: stringValue(row.guardian_email),
    },
    alumni: {
      employer,
      occupation,
      destination,
      graduationNotes: stringValue(alumni.graduationNotes),
      linkedinUrl: stringValue(alumni.linkedinUrl),
      currentCity: stringValue(alumni.currentCity),
      consentToContact: boolValue(alumni.consentToContact),
      mentorshipOptIn: boolValue(alumni.mentorshipOptIn),
      lastContactedAt: isoDate(alumni.lastContactedAt),
      updatedAt: isoDate(alumni.updatedAt),
    },
    engagementScore: [employer, occupation, destination, stringValue(alumni.linkedinUrl), stringValue(alumni.currentCity)].filter(Boolean).length,
  };
}

async function buildPayload(db: QueryableDb, school: Row, filters: { search?: string; destination?: string } = {}) {
  const searchTerm = filters.search || "";
  const search = `%${searchTerm}%`;
  const studentRows = await rows(db, sql`
    select
      s.id,
      s.user_id,
      s.admission_number,
      s.phone,
      s.status,
      s.graduation_date,
      u.name,
      u.email,
      c.name as class_name,
      c.grade,
      c.section,
      ay.name as academic_year,
      g.name as guardian_name,
      g.relation as guardian_relation,
      g.phone as guardian_phone,
      g.email as guardian_email
    from students s
    left join users u on u.id = s.user_id
    left join classes c on c.id = s.class_id
    left join academic_years ay on ay.id = c.academic_year_id
    left join lateral (
      select *
      from guardians guardian
      where guardian.student_id = s.id
      order by guardian.created_at desc
      limit 1
    ) g on true
    where lower(s.status) = 'graduated'
      and (
        ${searchTerm} = ''
        or u.name ilike ${search}
        or u.email ilike ${search}
        or s.admission_number ilike ${search}
        or s.phone ilike ${search}
        or c.name ilike ${search}
      )
    order by s.graduation_date desc nulls last, u.name asc
    limit 2000
  `);
  const metadata = await getAlumniMetadata(db);
  let students = studentRows.map((row) => alumniPayload(row, metadata.get(stringValue(row.id))));
  if (filters.destination) {
    const destination = filters.destination.toLowerCase();
    students = students.filter((student) => [student.alumni.destination, student.alumni.currentCity, student.alumni.employer].join(" ").toLowerCase().includes(destination));
  }
  const totalRow = await first(db, sql`select count(*)::int as total from students`, { total: 0 });
  const withDestination = students.filter((student) => student.alumni.destination || student.alumni.employer || student.alumni.currentCity).length;
  const consented = students.filter((student) => student.alumni.consentToContact).length;
  const mentors = students.filter((student) => student.alumni.mentorshipOptIn).length;
  return {
    generatedAt: new Date().toISOString(),
    school: { id: stringValue(school.id), name: stringValue(school.name), slug: stringValue(school.slug) },
    students,
    summary: { graduated: students.length, total: numberValue(totalRow.total), withDestination, consented, mentors, missingProfiles: Math.max(students.length - withDestination, 0) },
  };
}

function validateAlumni(alumni: Row) {
  const errors: string[] = [];
  const linkedinUrl = stringValue(alumni.linkedinUrl);
  if (linkedinUrl && !/^https?:\/\/.+/i.test(linkedinUrl)) errors.push("LinkedIn/profile URL must start with http:// or https://");
  for (const key of ["employer", "occupation", "destination", "currentCity"]) {
    if (stringValue(alumni[key]).length > 120) errors.push(`${key} must be 120 characters or fewer`);
  }
  if (stringValue(alumni.graduationNotes).length > 2000) errors.push("Graduation notes must be 2000 characters or fewer");
  return errors;
}

export async function GET(request: NextRequest) {
  const context = await resolveContext(request);
  if ("response" in context) return context.response;
  const payload = await buildPayload(context.tenantDb, context.school, { search: request.nextUrl.searchParams.get("search") || undefined, destination: request.nextUrl.searchParams.get("destination") || undefined });
  const exportFormat = request.nextUrl.searchParams.get("export");
  if (exportFormat === "json") {
    await audit(context, request, "admin.alumni.exported", context.slug, { format: "json", count: payload.students.length });
    return NextResponse.json(payload, { headers: { "Cache-Control": "no-store, max-age=0", "Content-Disposition": `attachment; filename="${context.slug}-alumni.json"` } });
  }
  if (exportFormat === "csv") {
    await audit(context, request, "admin.alumni.exported", context.slug, { format: "csv", count: payload.students.length });
    return new NextResponse(toCsv(payload.students as unknown as Row[]), { headers: { "Content-Type": "text/csv; charset=utf-8", "Cache-Control": "no-store, max-age=0", "Content-Disposition": `attachment; filename="${context.slug}-alumni.csv"` } });
  }
  return NextResponse.json(payload, { headers: { "Cache-Control": "no-store, max-age=0" } });
}

export async function POST(request: NextRequest) {
  const context = await resolveContext(request);
  if ("response" in context) return context.response;
  const body = await request.json().catch(() => ({} as Row));
  const action = stringValue(body.action);
  const studentId = stringValue(body.studentId);
  if (!studentId) return NextResponse.json({ error: "Student ID is required" }, { status: 400 });
  const student = await first(context.tenantDb, sql`select id, status from students where id = ${studentId} limit 1`);
  if (!student.id) return NextResponse.json({ error: "Student not found" }, { status: 404 });

  if (action === "alumni.save") {
    if (stringValue(student.status).toLowerCase() !== "graduated") return NextResponse.json({ error: "Only graduated students can have alumni records" }, { status: 400 });
    const alumni = objectValue(body.alumni);
    const errors = validateAlumni(alumni);
    if (errors.length) return NextResponse.json({ error: errors.join("; "), errors }, { status: 400 });
    await context.tenantDb.execute(sql`
      insert into system_settings (id, key, value, category, description, created_at, updated_at)
      values (${crypto.randomUUID()}, ${`student_alumni:${studentId}`}, ${JSON.stringify({ ...alumni, updatedAt: new Date().toISOString() })}::jsonb, 'students', ${`Student alumni ${studentId}`}, now(), now())
      on conflict (key) do update set value = excluded.value, updated_at = now()
    `);
    await audit(context, request, "admin.alumni.updated", studentId, { alumni });
  } else if (action === "alumni.reactivate") {
    await context.tenantDb.execute(sql`update students set status = 'active', updated_at = now() where id = ${studentId}`);
    await audit(context, request, "admin.alumni.reactivated", studentId);
  } else if (action === "alumni.touch") {
    const current = await first(context.tenantDb, sql`select value from system_settings where key = ${`student_alumni:${studentId}`} limit 1`);
    const alumni = { ...objectValue(current.value), lastContactedAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    await context.tenantDb.execute(sql`
      insert into system_settings (id, key, value, category, description, created_at, updated_at)
      values (${crypto.randomUUID()}, ${`student_alumni:${studentId}`}, ${JSON.stringify(alumni)}::jsonb, 'students', ${`Student alumni ${studentId}`}, now(), now())
      on conflict (key) do update set value = excluded.value, updated_at = now()
    `);
    await audit(context, request, "admin.alumni.contacted", studentId);
  } else {
    return NextResponse.json({ error: "Unsupported alumni action" }, { status: 400 });
  }
  return NextResponse.json({ success: true, ...(await buildPayload(context.tenantDb, context.school)) });
}
