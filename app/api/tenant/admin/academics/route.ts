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

function boolValue(value: unknown) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value.toLowerCase() === "true";
  return Boolean(value);
}

function objectValue(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Row : {};
}

async function rows(db: QueryableDb, query: ReturnType<typeof sql>, fallback: Row[] = []) {
  try {
    const result = await db.execute(query);
    return (result.rows || []) as Row[];
  } catch (error) {
    console.warn("Academics query skipped:", error instanceof Error ? error.message : error);
    return fallback;
  }
}

async function first(db: QueryableDb, query: ReturnType<typeof sql>, fallback: Row = {}) {
  const result = await rows(db, query, [fallback]);
  return result[0] || fallback;
}

function resolveSlug(request: NextRequest) {
  const explicit = request.nextUrl.searchParams.get("slug")?.trim();
  if (explicit) return explicit;
  return getTenantSubdomain(request.headers.get("host")) || "";
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
  if (!ALLOWED_ROLES.has(role)) return { response: NextResponse.json({ error: "Only owners and school admins can manage academics" }, { status: 403 }) };

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
    resource: "academics",
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
    values (${crypto.randomUUID()}, ${key}, ${JSON.stringify(value)}::jsonb, 'academic', ${description}, now(), now())
    on conflict (key) do update set value = excluded.value, updated_at = now()
  `);
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

async function buildPayload(db: QueryableDb, school: Row) {
  const [classRows, subjectRows, yearRows, termRows, teacherRows, timetableValue, curriculumValue] = await Promise.all([
    rows(db, sql`
      select c.*, ay.name as academic_year, u.name as teacher_name, count(s.id)::int as enrolled
      from classes c
      left join academic_years ay on ay.id = c.academic_year_id
      left join users u on u.id = c.teacher_id
      left join students s on s.class_id = c.id and lower(s.status) in ('active', 'pending')
      group by c.id, ay.name, u.name
      order by c.grade asc, c.name asc, c.section asc
    `),
    rows(db, sql`
      select sub.*, count(distinct gr.id)::int as grade_count, count(distinct asm.id)::int as assessment_count
      from subjects sub
      left join grades gr on gr.subject_id = sub.id
      left join assessments asm on asm.subject_id = sub.id
      group by sub.id
      order by sub.type asc, sub.name asc
    `),
    rows(db, sql`select * from academic_years order by start_date desc`),
    rows(db, sql`select t.*, ay.name as academic_year from terms t left join academic_years ay on ay.id = t.academic_year_id order by t.start_date desc`),
    rows(db, sql`
      select st.id, st.user_id, st.employee_id, st.position, st.status, u.name, u.email
      from staff st
      left join users u on u.id = st.user_id
      where lower(st.status) = 'active'
      order by u.name asc
    `),
    getJsonSetting(db, TIMETABLE_KEY, { entries: [], settings: { periodsPerDay: 8, schoolStart: "08:00", schoolEnd: "16:00" } }),
    getJsonSetting(db, CURRICULUM_KEY, { tracks: [], policies: {}, maps: [] }),
  ]);

  const classes = classRows.map((row) => {
    const capacity = numberValue(row.capacity);
    const enrolled = numberValue(row.enrolled);
    return {
      id: stringValue(row.id),
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
      createdAt: row.created_at,
    };
  });

  const subjects = subjectRows.map((row) => ({
    id: stringValue(row.id),
    name: stringValue(row.name),
    code: stringValue(row.code),
    description: stringValue(row.description),
    type: stringValue(row.type, "core"),
    gradeCount: numberValue(row.grade_count),
    assessmentCount: numberValue(row.assessment_count),
  }));

  return {
    generatedAt: new Date().toISOString(),
    school: { id: stringValue(school.id), name: stringValue(school.name), slug: stringValue(school.slug), type: stringValue(school.type) },
    summary: {
      classes: classes.length,
      subjects: subjects.length,
      teachers: teacherRows.length,
      capacity: classes.reduce((sum, item) => sum + item.capacity, 0),
      enrolled: classes.reduce((sum, item) => sum + item.enrolled, 0),
      timetableEntries: Array.isArray((timetableValue as Row).entries) ? ((timetableValue as Row).entries as unknown[]).length : 0,
    },
    classes,
    subjects,
    academicYears: yearRows.map((row) => ({ id: stringValue(row.id), name: stringValue(row.name), isCurrent: boolValue(row.is_current), startDate: row.start_date, endDate: row.end_date })),
    terms: termRows.map((row) => ({ id: stringValue(row.id), name: stringValue(row.name), academicYearId: stringValue(row.academic_year_id), academicYear: stringValue(row.academic_year), status: stringValue(row.status) })),
    teachers: teacherRows.map((row) => ({ id: stringValue(row.user_id), staffId: stringValue(row.id), name: stringValue(row.name), email: stringValue(row.email), employeeId: stringValue(row.employee_id), position: stringValue(row.position) })),
    timetable: timetableValue,
    curriculum: curriculumValue,
  };
}

export async function GET(request: NextRequest) {
  const context = await resolveContext(request);
  if ("response" in context) return context.response;
  return NextResponse.json(await buildPayload(context.tenantDb, context.school));
}

export async function POST(request: NextRequest) {
  const context = await resolveContext(request);
  if ("response" in context) return context.response;
  const body = await request.json().catch(() => ({} as Row));
  const action = stringValue(body.action);

  if (action === "class.create") {
    const name = stringValue(body.name);
    const grade = stringValue(body.grade);
    if (!name || !grade) return NextResponse.json({ error: "Class name and grade are required" }, { status: 400 });
    const academicYearId = stringValue(body.academicYearId) || await ensureAcademicYear(context.tenantDb, stringValue(body.academicYear));
    const id = `class_${crypto.randomUUID()}`;
    await context.tenantDb.execute(sql`
      insert into classes (id, name, grade, section, academic_year_id, teacher_id, capacity, created_at, updated_at)
      values (${id}, ${name}, ${grade}, ${stringValue(body.section) || null}, ${academicYearId}, ${stringValue(body.teacherId) || null}, ${numberValue(body.capacity) || null}, now(), now())
    `);
    await audit(context, request, "class.create", id, { name, grade });
  }

  if (action === "subject.create") {
    const name = stringValue(body.name);
    const code = stringValue(body.code).toUpperCase();
    if (!name || !code) return NextResponse.json({ error: "Subject name and code are required" }, { status: 400 });
    const exists = await first(context.tenantDb, sql`select id from subjects where lower(code) = lower(${code}) limit 1`);
    if (exists.id) return NextResponse.json({ error: "Subject code already exists" }, { status: 409 });
    const id = `subject_${crypto.randomUUID()}`;
    await context.tenantDb.execute(sql`
      insert into subjects (id, name, code, description, type, created_at, updated_at)
      values (${id}, ${name}, ${code}, ${stringValue(body.description) || null}, ${stringValue(body.type, "core")}, now(), now())
    `);
    await audit(context, request, "subject.create", id, { name, code });
  }

  if (action === "timetable.save") {
    const timetable = objectValue(body.timetable);
    await saveJsonSetting(context.tenantDb, TIMETABLE_KEY, timetable, "School admin timetable configuration");
    await audit(context, request, "timetable.save", TIMETABLE_KEY, { timetable });
  }

  if (action === "curriculum.save") {
    const curriculum = objectValue(body.curriculum);
    await saveJsonSetting(context.tenantDb, CURRICULUM_KEY, curriculum, "School admin curriculum configuration");
    await audit(context, request, "curriculum.save", CURRICULUM_KEY, { curriculum });
  }

  if (!["class.create", "subject.create", "timetable.save", "curriculum.save"].includes(action)) {
    return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
  }

  return NextResponse.json({ success: true, ...(await buildPayload(context.tenantDb, context.school)) });
}

export async function PUT(request: NextRequest) {
  const context = await resolveContext(request);
  if ("response" in context) return context.response;
  const body = await request.json().catch(() => ({} as Row));
  const action = stringValue(body.action);

  if (action === "class.update") {
    const id = stringValue(body.id);
    if (!id) return NextResponse.json({ error: "Class ID is required" }, { status: 400 });
    const academicYearId = stringValue(body.academicYearId) || await ensureAcademicYear(context.tenantDb, stringValue(body.academicYear));
    await context.tenantDb.execute(sql`
      update classes
      set name = ${stringValue(body.name)},
          grade = ${stringValue(body.grade)},
          section = ${stringValue(body.section) || null},
          academic_year_id = ${academicYearId},
          teacher_id = ${stringValue(body.teacherId) || null},
          capacity = ${numberValue(body.capacity) || null},
          updated_at = now()
      where id = ${id}
    `);
    await audit(context, request, "class.update", id, { name: body.name });
  }

  if (action === "subject.update") {
    const id = stringValue(body.id);
    if (!id) return NextResponse.json({ error: "Subject ID is required" }, { status: 400 });
    await context.tenantDb.execute(sql`
      update subjects
      set name = ${stringValue(body.name)},
          code = ${stringValue(body.code).toUpperCase()},
          description = ${stringValue(body.description) || null},
          type = ${stringValue(body.type, "core")},
          updated_at = now()
      where id = ${id}
    `);
    await audit(context, request, "subject.update", id, { name: body.name });
  }

  if (!["class.update", "subject.update"].includes(action)) return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
  return NextResponse.json({ success: true, ...(await buildPayload(context.tenantDb, context.school)) });
}

export async function DELETE(request: NextRequest) {
  const context = await resolveContext(request);
  if ("response" in context) return context.response;
  const type = request.nextUrl.searchParams.get("type") || "";
  const id = request.nextUrl.searchParams.get("id") || "";
  if (!id) return NextResponse.json({ error: "ID is required" }, { status: 400 });

  if (type === "class") {
    const usage = await first(context.tenantDb, sql`select count(*)::int as total from students where class_id = ${id}`);
    if (numberValue(usage.total)) return NextResponse.json({ error: "Class has students assigned. Reassign students before deleting." }, { status: 409 });
    await context.tenantDb.execute(sql`delete from classes where id = ${id}`);
    await audit(context, request, "class.delete", id);
  } else if (type === "subject") {
    const usage = await first(context.tenantDb, sql`select count(*)::int as total from grades where subject_id = ${id}`);
    if (numberValue(usage.total)) return NextResponse.json({ error: "Subject has grades. Archive by changing type/status instead of deleting." }, { status: 409 });
    await context.tenantDb.execute(sql`delete from subjects where id = ${id}`);
    await audit(context, request, "subject.delete", id);
  } else {
    return NextResponse.json({ error: "Unsupported delete type" }, { status: 400 });
  }

  return NextResponse.json({ success: true, ...(await buildPayload(context.tenantDb, context.school)) });
}
