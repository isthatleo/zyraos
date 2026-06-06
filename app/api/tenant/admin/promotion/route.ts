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
const DEFAULT_ATTENDANCE_THRESHOLD = 70;
const DEFAULT_PERFORMANCE_THRESHOLD = 50;

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
    console.warn("Admin promotion query skipped:", error instanceof Error ? error.message : error);
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
  if (!ALLOWED_ROLES.has(role)) return { response: NextResponse.json({ error: "Only owners and school admins can manage promotions" }, { status: 403 }) };
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
    resource: "promotion",
    resourceId,
    changes: { ...changes, actorEmail: ctx.actor.email, actorName: ctx.actor.name, actorRole: ctx.actor.role },
  }).catch(() => undefined);
}

async function getClasses(db: QueryableDb) {
  return rows(db, sql`
    select c.id, c.name, c.grade, c.section, c.capacity, c.academic_year_id, ay.name as academic_year,
      count(s.id)::int as enrolled
    from classes c
    left join academic_years ay on ay.id = c.academic_year_id
    left join students s on s.class_id = c.id and lower(s.status) = 'active'
    group by c.id, ay.name
    order by c.grade asc nulls last, c.name asc, c.section asc
  `);
}

function classPayload(row: Row) {
  const capacity = numberValue(row.capacity);
  const enrolled = numberValue(row.enrolled);
  return {
    id: stringValue(row.id),
    name: stringValue(row.name),
    grade: stringValue(row.grade),
    section: stringValue(row.section),
    academicYearId: stringValue(row.academic_year_id),
    academicYear: stringValue(row.academic_year),
    capacity,
    enrolled,
    seatsAvailable: capacity ? Math.max(capacity - enrolled, 0) : null,
  };
}

async function getStudents(db: QueryableDb, filters: { classId?: string; status?: string; search?: string } = {}) {
  const classId = filters.classId && filters.classId !== "all" ? filters.classId : "";
  const status = filters.status && filters.status !== "all" ? filters.status : "";
  const searchTerm = filters.search || "";
  const search = `%${searchTerm}%`;
  return rows(db, sql`
    select
      s.id,
      s.user_id,
      s.admission_number,
      s.class_id,
      s.status,
      s.graduation_date,
      u.name,
      u.email,
      c.name as class_name,
      c.grade,
      c.section,
      ay.id as academic_year_id,
      ay.name as academic_year,
      g.name as guardian_name,
      g.phone as guardian_phone,
      coalesce(avg(case when gr.max_score > 0 then (gr.score / nullif(gr.max_score, 0)) * 100 else null end), 0) as performance_average,
      count(distinct gr.id)::int as grades_count,
      coalesce(
        (count(distinct case when lower(a.status) = 'present' then a.id end)::float / nullif(count(distinct a.id), 0)) * 100,
        0
      ) as attendance_rate,
      count(distinct a.id)::int as attendance_count
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
    left join grades gr on gr.student_id = s.id
    left join attendance a on a.student_id = s.id
    where (${classId} = '' or s.class_id = ${classId})
      and (${status} = '' or lower(s.status) = lower(${status}))
      and (
        ${searchTerm} = ''
        or u.name ilike ${search}
        or u.email ilike ${search}
        or s.admission_number ilike ${search}
        or c.name ilike ${search}
      )
    group by s.id, u.id, c.id, ay.id, ay.name, g.id, g.name, g.phone
    order by c.grade asc nulls last, c.name asc nulls last, u.name asc nulls last
    limit 2000
  `);
}

function studentPayload(row: Row) {
  const attendanceRate = Math.round(numberValue(row.attendance_rate));
  const performanceAverage = Math.round(numberValue(row.performance_average) * 10) / 10;
  const warnings = [
    attendanceRate < DEFAULT_ATTENDANCE_THRESHOLD ? `Attendance is below ${DEFAULT_ATTENDANCE_THRESHOLD}%` : "",
    performanceAverage < DEFAULT_PERFORMANCE_THRESHOLD ? `Performance is below ${DEFAULT_PERFORMANCE_THRESHOLD}%` : "",
    !stringValue(row.class_id) ? "No current class assigned" : "",
    ["graduated", "withdrawn"].includes(stringValue(row.status).toLowerCase()) ? "Student is not an active promotion candidate" : "",
  ].filter(Boolean);
  return {
    id: stringValue(row.id),
    userId: stringValue(row.user_id),
    name: stringValue(row.name, "Unnamed student"),
    email: stringValue(row.email),
    admissionNumber: stringValue(row.admission_number),
    status: stringValue(row.status, "pending"),
    classId: stringValue(row.class_id),
    className: stringValue(row.class_name),
    grade: stringValue(row.grade),
    section: stringValue(row.section),
    academicYearId: stringValue(row.academic_year_id),
    academicYear: stringValue(row.academic_year),
    graduationDate: row.graduation_date ? new Date(String(row.graduation_date)).toISOString() : null,
    guardian: { name: stringValue(row.guardian_name), phone: stringValue(row.guardian_phone) },
    academics: {
      attendanceRate,
      performanceAverage,
      attendanceCount: numberValue(row.attendance_count),
      gradesCount: numberValue(row.grades_count),
    },
    readiness: {
      eligible: warnings.length === 0,
      warnings,
    },
  };
}

async function buildPayload(db: QueryableDb, school: Row, filters: { classId?: string; status?: string; search?: string } = {}) {
  const [studentRows, classRows, summaryRows] = await Promise.all([
    getStudents(db, filters),
    getClasses(db),
    rows(db, sql`select lower(status) as status, count(*)::int as total from students group by lower(status)`),
  ]);
  const students = studentRows.map(studentPayload);
  const summaryByStatus = Object.fromEntries(summaryRows.map((row) => [stringValue(row.status, "pending"), numberValue(row.total)]));
  const candidates = students.filter((student) => !["graduated", "withdrawn"].includes(student.status.toLowerCase()));
  return {
    generatedAt: new Date().toISOString(),
    school: { id: stringValue(school.id), name: stringValue(school.name), slug: stringValue(school.slug) },
    policy: {
      attendanceThreshold: DEFAULT_ATTENDANCE_THRESHOLD,
      performanceThreshold: DEFAULT_PERFORMANCE_THRESHOLD,
      capacityEnforced: true,
      overrideWarningsAllowed: true,
    },
    summary: {
      total: students.length,
      candidates: candidates.length,
      eligible: candidates.filter((student) => student.readiness.eligible).length,
      review: candidates.filter((student) => !student.readiness.eligible).length,
      active: summaryByStatus.active || 0,
      pending: summaryByStatus.pending || 0,
      suspended: summaryByStatus.suspended || 0,
      graduated: summaryByStatus.graduated || 0,
      withdrawn: summaryByStatus.withdrawn || 0,
    },
    classes: classRows.map(classPayload),
    students,
  };
}

function exportRows(payload: Awaited<ReturnType<typeof buildPayload>>) {
  return payload.students.map((student) => ({
    admissionNumber: student.admissionNumber,
    name: student.name,
    status: student.status,
    currentClass: student.className,
    performanceAverage: student.academics.performanceAverage,
    attendanceRate: student.academics.attendanceRate,
    readiness: student.readiness.eligible ? "eligible" : "review",
    warnings: student.readiness.warnings.join("; "),
  }));
}

export async function GET(request: NextRequest) {
  const context = await resolveContext(request);
  if ("response" in context) return context.response;
  const payload = await buildPayload(context.tenantDb, context.school, {
    classId: request.nextUrl.searchParams.get("classId") || undefined,
    status: request.nextUrl.searchParams.get("status") || undefined,
    search: request.nextUrl.searchParams.get("search") || undefined,
  });
  const exportFormat = request.nextUrl.searchParams.get("export")?.trim().toLowerCase() || "";
  if (exportFormat === "csv") {
    await audit(context, request, "admin.promotion.exported", context.slug, { format: "csv", rowCount: payload.students.length });
    return new NextResponse(toCsv(exportRows(payload)), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Cache-Control": "no-store, max-age=0",
        "Content-Disposition": `attachment; filename="${context.slug}-promotion-candidates.csv"`,
      },
    });
  }
  if (exportFormat === "json") {
    await audit(context, request, "admin.promotion.exported", context.slug, { format: "json", rowCount: payload.students.length });
    return NextResponse.json({ ...payload, exportedAt: new Date().toISOString() }, { headers: { "Cache-Control": "no-store, max-age=0", "Content-Disposition": `attachment; filename="${context.slug}-promotion-candidates.json"` } });
  }
  return NextResponse.json(payload, { headers: { "Cache-Control": "no-store, max-age=0" } });
}

export async function POST(request: NextRequest) {
  const context = await resolveContext(request);
  if ("response" in context) return context.response;

  const body = await request.json().catch(() => ({} as Row));
  const studentIds = Array.isArray(body.studentIds) ? [...new Set((body.studentIds as unknown[]).map((id: unknown) => stringValue(id)).filter(Boolean))] : [];
  const graduate = boolValue(body.graduate);
  const targetClassId = stringValue(body.targetClassId);
  const overrideWarnings = boolValue(body.overrideWarnings);
  const effectiveDate = stringValue(body.effectiveDate);
  const notes = stringValue(body.notes, graduate ? "Graduated through promotion workflow" : "Promoted through promotion workflow");

  if (!studentIds.length) return NextResponse.json({ error: "Select at least one student" }, { status: 400 });
  if (studentIds.length > 500) return NextResponse.json({ error: "Bulk promotion is limited to 500 students at a time" }, { status: 400 });
  if (!graduate && !targetClassId) return NextResponse.json({ error: "Target class is required unless graduating students" }, { status: 400 });

  const selectedRows = await getStudents(context.tenantDb, {});
  const selected = selectedRows.map(studentPayload).filter((student) => studentIds.includes(student.id));
  if (selected.length !== studentIds.length) return NextResponse.json({ error: "One or more selected students were not found in this tenant" }, { status: 404 });

  const blocked = selected.filter((student) => ["graduated", "withdrawn"].includes(student.status.toLowerCase()));
  if (blocked.length) return NextResponse.json({ error: "Graduated or withdrawn students cannot be promoted again", blocked: blocked.map((student) => student.name) }, { status: 409 });

  const warningStudents = selected.filter((student) => !student.readiness.eligible);
  if (warningStudents.length && !overrideWarnings) {
    return NextResponse.json({
      error: "Some students need review before promotion. Enable override warnings to continue.",
      warnings: warningStudents.map((student) => ({ id: student.id, name: student.name, warnings: student.readiness.warnings })),
    }, { status: 409 });
  }

  let targetClass: Row = {};
  if (!graduate) {
    targetClass = await first(context.tenantDb, sql`
      select c.id, c.name, c.capacity, c.academic_year_id, count(s.id)::int as enrolled
      from classes c
      left join students s on s.class_id = c.id and lower(s.status) = 'active'
      where c.id = ${targetClassId}
      group by c.id
      limit 1
    `);
    if (!targetClass.id) return NextResponse.json({ error: "Target class not found" }, { status: 404 });
    const sameClass = selected.filter((student) => student.classId === targetClassId);
    if (sameClass.length) return NextResponse.json({ error: "Target class cannot be the same as the current class", students: sameClass.map((student) => student.name) }, { status: 409 });
    const capacity = numberValue(targetClass.capacity);
    const enrolled = numberValue(targetClass.enrolled);
    if (capacity && enrolled + selected.length > capacity) {
      return NextResponse.json({ error: "Target class capacity would be exceeded", capacity, enrolled, requested: selected.length, available: Math.max(capacity - enrolled, 0) }, { status: 409 });
    }
  }

  const operationId = `promotion_${crypto.randomUUID()}`;
  const completed: Row[] = [];
  for (const student of selected) {
    if (graduate) {
      await context.tenantDb.execute(sql`
        update students
        set status = 'graduated', graduation_date = coalesce(graduation_date, ${effectiveDate ? new Date(effectiveDate) : new Date()}), updated_at = now()
        where id = ${student.id}
      `);
      await context.tenantDb.execute(sql`
        insert into system_settings (id, key, value, category, description, created_at, updated_at)
        values (${crypto.randomUUID()}, ${`student_alumni:${student.id}`}, ${JSON.stringify({ graduationNotes: notes, promotionOperationId: operationId, updatedAt: new Date().toISOString() })}::jsonb, 'students', ${`Student alumni ${student.id}`}, now(), now())
        on conflict (key) do update set value = excluded.value, updated_at = now()
      `).catch(() => undefined);
    } else {
      await context.tenantDb.execute(sql`
        update students
        set class_id = ${targetClassId}, status = 'active', updated_at = now()
        where id = ${student.id}
      `);
      await context.tenantDb.execute(sql`
        insert into enrollments (student_id, class_id, academic_year_id, status, enrolled_at)
        values (${student.id}, ${targetClassId}, ${stringValue(targetClass.academic_year_id) || null}, 'active', ${effectiveDate ? new Date(effectiveDate) : new Date()})
      `).catch(() => undefined);
    }
    await context.tenantDb.execute(sql`
      insert into student_progress (student_id, progress_type, progress_date, progress_value, progress_note, recorded_by, is_positive, category, created_at, updated_at)
      values (${student.id}, 'promotion', ${effectiveDate ? new Date(effectiveDate) : new Date()}, ${graduate ? 100 : 75}, ${notes}, ${context.actor.id}, true, 'academic', now(), now())
    `).catch(() => undefined);
    completed.push({ id: student.id, name: student.name, fromClassId: student.classId, toClassId: graduate ? null : targetClassId, graduate });
  }

  await audit(context, request, graduate ? "admin.promotion.graduated" : "admin.promotion.promoted", operationId, {
    operationId,
    studentIds,
    count: completed.length,
    targetClassId: graduate ? null : targetClassId,
    targetClassName: graduate ? null : stringValue(targetClass.name),
    graduate,
    overrideWarnings,
    notes,
  });

  const payload = await buildPayload(context.tenantDb, context.school);
  return NextResponse.json({ success: true, operationId, completed, ...payload }, { headers: { "Cache-Control": "no-store, max-age=0" } });
}
