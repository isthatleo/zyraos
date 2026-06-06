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
const STUDENT_STATUSES = new Set(["active", "suspended", "graduated", "withdrawn", "pending"]);

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

function isoDate(value: unknown) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function metadataObject(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Row : {};
}

async function rows(db: QueryableDb, query: ReturnType<typeof sql>, fallback: Row[] = []) {
  try {
    const result = await db.execute(query);
    return (result.rows || []) as Row[];
  } catch (error) {
    console.warn("Student administration query skipped:", error instanceof Error ? error.message : error);
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
    select id, name, slug, type, status, country, currency_code, currency_name, database_url
    from schools
    where slug = ${slug}
    limit 1
  `);
  const school = schoolResult.rows[0] as Row | undefined;
  if (!school) return { response: NextResponse.json({ error: "School not found" }, { status: 404 }) };

  const session = await auth.api.getSession({ headers: request.headers }).catch(() => null);
  if (!session?.user?.id || !session.user.email) {
    return { response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const tenantDb = getTenantDb(String(school.database_url || ""));
  const [tenantUser] = await rows(tenantDb, sql`
    select u.id, u.email, u.name, u.role_id, u.is_active, r.name as role_name
    from users u
    left join roles r on r.id = u.role_id
    where u.id = ${session.user.id} or lower(u.email) = lower(${session.user.email})
    limit 1
  `);

  if (!tenantUser) {
    return { response: NextResponse.json({ error: "Signed-in account does not belong to this tenant" }, { status: 403 }) };
  }
  if (tenantUser.is_active === false) {
    return { response: NextResponse.json({ error: "This tenant account is inactive" }, { status: 403 }) };
  }

  const role = normalizeRole(stringValue(tenantUser.role_id) || stringValue(tenantUser.role_name));
  if (!ALLOWED_ROLES.has(role)) {
    return { response: NextResponse.json({ error: "Only owners and school admins can manage student records" }, { status: 403 }) };
  }

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

async function getClasses(db: QueryableDb) {
  return rows(db, sql`
    select
      c.id,
      c.name,
      c.grade,
      c.section,
      c.capacity,
      c.academic_year_id,
      ay.name as academic_year,
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

async function getStudentMetadata(db: QueryableDb) {
  const settingRows = await rows(db, sql`
    select key, value
    from system_settings
    where key like 'student_documents:%'
       or key like 'student_alumni:%'
       or key like 'student_profile:%'
       or key like 'admissions_application:%'
  `);

  const documents = new Map<string, Row>();
  const alumni = new Map<string, Row>();
  const profiles = new Map<string, Row>();
  const applications = new Map<string, Row>();

  for (const row of settingRows) {
    const key = stringValue(row.key);
    const value = metadataObject(row.value);
    if (key.startsWith("student_documents:")) documents.set(key.replace("student_documents:", ""), value);
    if (key.startsWith("student_alumni:")) alumni.set(key.replace("student_alumni:", ""), value);
    if (key.startsWith("student_profile:")) profiles.set(key.replace("student_profile:", ""), value);
    if (key.startsWith("admissions_application:")) {
      const studentId = stringValue(value.studentId);
      if (studentId) applications.set(studentId, value);
    }
  }

  return { documents, alumni, profiles, applications };
}

function documentPayload(value: unknown) {
  const doc = metadataObject(value);
  return {
    url: stringValue(doc.url),
    fileName: stringValue(doc.fileName),
    status: stringValue(doc.status, "missing"),
    verified: boolValue(doc.verified),
    uploadedAt: isoDate(doc.uploadedAt),
    notes: stringValue(doc.notes),
  };
}

function studentPayload(row: Row, metadata: { documents?: Row; alumni?: Row; profile?: Row; application?: Row } = {}) {
  const application = metadataObject(metadata.application);
  const applicationGuardian = metadataObject(application.guardian);
  const documents = metadataObject(metadata.documents?.documents || metadata.documents);
  const alumni = metadataObject(metadata.alumni);
  const profileSections = metadataObject(metadata.profile);
  const average = numberValue(row.performance_average);

  return {
    id: stringValue(row.id),
    userId: stringValue(row.user_id),
    applicationId: stringValue(application.applicationId),
    admissionNumber: stringValue(row.admission_number),
    name: stringValue(row.name),
    email: stringValue(row.email),
    avatar: stringValue(row.avatar),
    gender: stringValue(row.gender),
    dateOfBirth: isoDate(row.date_of_birth),
    phone: stringValue(row.phone),
    address: stringValue(row.address),
    emergencyContact: stringValue(row.emergency_contact),
    status: stringValue(row.status, "pending"),
    classId: stringValue(row.class_id),
    className: stringValue(row.class_name),
    grade: stringValue(row.grade),
    section: stringValue(row.section),
    academicYear: stringValue(row.academic_year),
    enrollmentDate: isoDate(row.enrollment_date),
    graduationDate: isoDate(row.graduation_date),
    createdAt: isoDate(row.created_at),
    updatedAt: isoDate(row.updated_at),
    guardian: {
      id: stringValue(row.guardian_id),
      name: stringValue(row.guardian_name, stringValue(applicationGuardian.name)),
      relationship: stringValue(row.guardian_relation, stringValue(applicationGuardian.relationship, "guardian")),
      phone: stringValue(row.guardian_phone, stringValue(applicationGuardian.contact)),
      email: stringValue(row.guardian_email, stringValue(applicationGuardian.email)),
      address: stringValue(row.guardian_address, stringValue(applicationGuardian.address)),
    },
    documents: {
      birthCertificate: documentPayload(documents.birthCertificate),
      passportPhoto: documentPayload(documents.passportPhoto),
      previousResults: documentPayload(documents.previousResults),
      medicalRecords: documentPayload(documents.medicalRecords),
    },
    profileSections: {
      bio: metadataObject(profileSections.bio),
      family: metadataObject(profileSections.family),
      academic: metadataObject(profileSections.academic),
      medical: metadataObject(profileSections.medical),
      logistics: metadataObject(profileSections.logistics),
      finance: metadataObject(profileSections.finance),
      compliance: metadataObject(profileSections.compliance),
      updatedAt: isoDate(profileSections.updatedAt),
    },
    academics: {
      attendanceRate: numberValue(row.attendance_rate),
      performanceAverage: average ? Math.round(average * 10) / 10 : 0,
      gradesCount: numberValue(row.grades_count),
      reportCardsCount: numberValue(row.report_cards_count),
      invoicesCount: numberValue(row.invoices_count),
      paidAmount: numberValue(row.paid_amount),
    },
    alumni: {
      employer: stringValue(alumni.employer),
      occupation: stringValue(alumni.occupation),
      destination: stringValue(alumni.destination),
      graduationNotes: stringValue(alumni.graduationNotes),
      updatedAt: isoDate(alumni.updatedAt),
    },
  };
}

async function getStudentRows(db: QueryableDb, filters: { studentId?: string; status?: string; classId?: string; search?: string }) {
  const search = `%${filters.search || ""}%`;
  const studentId = filters.studentId && filters.studentId !== "all" ? filters.studentId : "";
  const status = filters.status && filters.status !== "all" ? filters.status : "";
  const classId = filters.classId && filters.classId !== "all" ? filters.classId : "";
  const searchTerm = filters.search || "";
  return rows(db, sql`
    select
      s.id,
      s.user_id,
      s.admission_number,
      s.avatar,
      s.date_of_birth,
      s.gender,
      s.address,
      s.phone,
      s.emergency_contact,
      s.class_id,
      s.enrollment_date,
      s.graduation_date,
      s.status,
      s.created_at,
      s.updated_at,
      u.name,
      u.email,
      c.name as class_name,
      c.grade,
      c.section,
      ay.name as academic_year,
      g.id as guardian_id,
      g.name as guardian_name,
      g.relation as guardian_relation,
      g.phone as guardian_phone,
      g.email as guardian_email,
      g.address as guardian_address,
      coalesce(avg(case when gr.max_score > 0 then (gr.score / nullif(gr.max_score, 0)) * 100 else null end), 0) as performance_average,
      count(distinct gr.id)::int as grades_count,
      count(distinct rc.id)::int as report_cards_count,
      count(distinct si.id)::int as invoices_count,
      coalesce(sum(distinct p.amount), 0) as paid_amount,
      coalesce(
        (count(distinct case when lower(a.status) = 'present' then a.id end)::float / nullif(count(distinct a.id), 0)) * 100,
        0
      ) as attendance_rate
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
    left join report_cards rc on rc.student_id = s.id
    left join student_invoices si on si.student_id = s.id
    left join payments p on p.student_id = s.id and lower(p.status) in ('completed', 'paid', 'successful')
    left join attendance a on a.student_id = s.id
    where (${studentId} = '' or s.id = ${studentId})
      and (${status} = '' or lower(s.status) = lower(${status}))
      and (${classId} = '' or s.class_id = ${classId})
      and (
        ${searchTerm} = ''
        or u.name ilike ${search}
        or u.email ilike ${search}
        or s.admission_number ilike ${search}
        or s.phone ilike ${search}
      )
    group by s.id, u.id, c.id, ay.name, g.id, g.name, g.relation, g.phone, g.email, g.address
    order by s.created_at desc
    limit 2000
  `);
}

async function getSummary(db: QueryableDb) {
  const byStatus = await rows(db, sql`
    select lower(status) as status, count(*)::int as total
    from students
    group by lower(status)
  `);
  const totals = Object.fromEntries(byStatus.map((row) => [stringValue(row.status, "pending"), numberValue(row.total)]));
  const totalRow = await first(db, sql`select count(*)::int as total from students`, { total: 0 });
  const newRow = await first(db, sql`select count(*)::int as total from students where created_at >= now() - interval '30 days'`, { total: 0 });
  const docsRow = await first(db, sql`
    select count(*)::int as total
    from system_settings
    where key like 'student_documents:%'
  `, { total: 0 });

  return {
    total: numberValue(totalRow.total),
    active: totals.active || 0,
    pending: totals.pending || 0,
    suspended: totals.suspended || 0,
    graduated: totals.graduated || 0,
    withdrawn: totals.withdrawn || 0,
    newThisMonth: numberValue(newRow.total),
    documented: numberValue(docsRow.total),
  };
}

async function buildPayload(db: QueryableDb, school: Row, filters: { studentId?: string; status?: string; classId?: string; search?: string }) {
  const [studentRows, classRows, summary, metadata] = await Promise.all([
    getStudentRows(db, filters),
    getClasses(db),
    getSummary(db),
    getStudentMetadata(db),
  ]);

  const students = studentRows.map((row) => {
    const id = stringValue(row.id);
    return studentPayload(row, {
      documents: metadata.documents.get(id),
      alumni: metadata.alumni.get(id),
      profile: metadata.profiles.get(id),
      application: metadata.applications.get(id),
    });
  });

  return {
    generatedAt: new Date().toISOString(),
    school: {
      id: stringValue(school.id),
      name: stringValue(school.name),
      slug: stringValue(school.slug),
      type: stringValue(school.type),
      status: stringValue(school.status),
      country: stringValue(school.country),
      currencyCode: stringValue(school.currency_code),
      currencyName: stringValue(school.currency_name),
    },
    summary,
    classes: classRows.map(classPayload),
    students,
    student: students[0] || null,
  };
}

async function assertStudent(db: QueryableDb, studentId: string) {
  if (!studentId) return null;
  const row = await first(db, sql`select id, user_id, status, class_id from students where id = ${studentId} limit 1`);
  return row.id ? row : null;
}

async function audit(
  ctx: {
    tenantDb: QueryableDb;
    actor: { id: string; email: string; name: string; role: string };
  },
  request: NextRequest,
  action: string,
  description: string,
  metadata: Row = {},
) {
  await writeTenantAuditLog({
    db: ctx.tenantDb,
    request,
    actorId: ctx.actor.id,
    action,
    resource: "students",
    changes: { description, ...metadata, actorEmail: ctx.actor.email, actorName: ctx.actor.name, actorRole: ctx.actor.role },
  }).catch(() => undefined);
}

export async function GET(request: NextRequest) {
  const context = await resolveContext(request);
  if ("response" in context) return context.response;

  const status = request.nextUrl.searchParams.get("status")?.trim();
  const classId = request.nextUrl.searchParams.get("classId")?.trim();
  const payload = await buildPayload(context.tenantDb, context.school, {
    studentId: request.nextUrl.searchParams.get("studentId") || undefined,
    status: status && status !== "all" ? status : undefined,
    classId: classId && classId !== "all" ? classId : undefined,
    search: request.nextUrl.searchParams.get("search") || undefined,
  });

  return NextResponse.json(payload);
}

export async function PUT(request: NextRequest) {
  const context = await resolveContext(request);
  if ("response" in context) return context.response;

  const body = await request.json().catch(() => ({} as Row));
  const action = stringValue(body.action, "update");
  const studentId = stringValue(body.studentId);
  const student = await assertStudent(context.tenantDb, studentId);
  if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });

  if (action === "status") {
    const status = stringValue(body.status).toLowerCase();
    if (!STUDENT_STATUSES.has(status)) return NextResponse.json({ error: "Invalid student status" }, { status: 400 });
    await context.tenantDb.execute(sql`
      update students
      set status = ${status},
          graduation_date = case when ${status} = 'graduated' then coalesce(graduation_date, now()) else graduation_date end,
          updated_at = now()
      where id = ${studentId}
    `);
    await context.tenantDb.execute(sql`
      update users
      set is_active = ${status !== "suspended" && status !== "withdrawn"}, updated_at = now()
      where id = ${stringValue(student.user_id)}
    `);
    await audit(context, request, "student.status.updated", `Student status changed to ${status}`, { studentId, status });
  }

  if (action === "update") {
    const name = stringValue(body.name);
    const email = stringValue(body.email);
    const classId = stringValue(body.classId);
    const status = stringValue(body.status).toLowerCase();
    if (status && !STUDENT_STATUSES.has(status)) return NextResponse.json({ error: "Invalid student status" }, { status: 400 });

    await context.tenantDb.execute(sql`
      update users
      set name = coalesce(nullif(${name}, ''), name),
          email = coalesce(nullif(${email}, ''), email),
          updated_at = now()
      where id = ${stringValue(student.user_id)}
    `);
    await context.tenantDb.execute(sql`
      update students
      set avatar = coalesce(nullif(${stringValue(body.avatar)}, ''), avatar),
          phone = ${stringValue(body.phone)},
          address = ${stringValue(body.address)},
          emergency_contact = ${stringValue(body.emergencyContact)},
          class_id = nullif(${classId}, ''),
          status = coalesce(nullif(${status}, ''), status),
          updated_at = now()
      where id = ${studentId}
    `);
    await audit(context, request, "student.updated", "Student profile updated", { studentId });
  }

  if (action === "documents") {
    const documents = metadataObject(body.documents);
    await context.tenantDb.execute(sql`
      insert into system_settings (id, key, value, category, description, created_at, updated_at)
      values (${crypto.randomUUID()}, ${`student_documents:${studentId}`}, ${JSON.stringify({ studentId, documents, updatedAt: new Date().toISOString() })}::jsonb, 'students', ${`Student documentation ${studentId}`}, now(), now())
      on conflict (key) do update set value = excluded.value, updated_at = now()
    `);
    await audit(context, request, "student.documents.updated", "Student documentation updated", { studentId });
  }

  if (action === "profileSections") {
    const profileSections = metadataObject(body.profileSections);
    await context.tenantDb.execute(sql`
      insert into system_settings (id, key, value, category, description, created_at, updated_at)
      values (${crypto.randomUUID()}, ${`student_profile:${studentId}`}, ${JSON.stringify({ ...profileSections, updatedAt: new Date().toISOString() })}::jsonb, 'students', ${`Student profile sections ${studentId}`}, now(), now())
      on conflict (key) do update set value = excluded.value, updated_at = now()
    `);
    await audit(context, request, "student.profile.sections.updated", "Student profile sections updated", { studentId });
  }

  if (action === "promote") {
    const targetClassId = stringValue(body.targetClassId);
    const graduate = boolValue(body.graduate);
    if (!targetClassId && !graduate) {
      return NextResponse.json({ error: "Target class is required unless graduating the student" }, { status: 400 });
    }

    if (graduate) {
      await context.tenantDb.execute(sql`
        update students
        set status = 'graduated', graduation_date = coalesce(graduation_date, now()), updated_at = now()
        where id = ${studentId}
      `);
    } else {
      const target = await first(context.tenantDb, sql`
        select c.id, c.academic_year_id
        from classes c
        where c.id = ${targetClassId}
        limit 1
      `);
      if (!target.id) return NextResponse.json({ error: "Target class not found" }, { status: 404 });
      await context.tenantDb.execute(sql`
        update students
        set class_id = ${targetClassId}, status = 'active', updated_at = now()
        where id = ${studentId}
      `);
      await context.tenantDb.execute(sql`
        insert into enrollments (student_id, class_id, academic_year_id, status, enrolled_at)
        values (${studentId}, ${targetClassId}, ${stringValue(target.academic_year_id) || null}, 'active', now())
      `).catch(() => undefined);
    }

    await context.tenantDb.execute(sql`
      insert into student_progress (student_id, progress_type, progress_date, progress_value, progress_note, recorded_by, is_positive, category, created_at, updated_at)
      values (${studentId}, 'promotion', now(), ${graduate ? 100 : 75}, ${graduate ? "Marked as graduated" : "Promoted to next class"}, ${context.actor.id}, true, 'academic', now(), now())
    `).catch(() => undefined);
    await audit(context, request, "student.promotion.updated", graduate ? "Student graduated" : "Student promoted", { studentId, targetClassId, graduate });
  }

  if (action === "alumni") {
    const alumni = metadataObject(body.alumni);
    await context.tenantDb.execute(sql`
      insert into system_settings (id, key, value, category, description, created_at, updated_at)
      values (${crypto.randomUUID()}, ${`student_alumni:${studentId}`}, ${JSON.stringify({ ...alumni, updatedAt: new Date().toISOString() })}::jsonb, 'students', ${`Student alumni ${studentId}`}, now(), now())
      on conflict (key) do update set value = excluded.value, updated_at = now()
    `);
    await audit(context, request, "student.alumni.updated", "Student alumni record updated", { studentId });
  }

  const payload = await buildPayload(context.tenantDb, context.school, { studentId });
  return NextResponse.json({ success: true, ...payload });
}

export async function DELETE(request: NextRequest) {
  const context = await resolveContext(request);
  if ("response" in context) return context.response;

  const studentId = request.nextUrl.searchParams.get("studentId") || "";
  const student = await assertStudent(context.tenantDb, studentId);
  if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });

  await context.tenantDb.execute(sql`
    update students
    set status = 'withdrawn', updated_at = now()
    where id = ${studentId}
  `);
  await context.tenantDb.execute(sql`
    update users
    set is_active = false, updated_at = now()
    where id = ${stringValue(student.user_id)}
  `);
  await audit(context, request, "student.deleted", "Student was removed from active records", { studentId, mode: "soft_delete" });

  return NextResponse.json({ success: true, message: "Student removed from active records" });
}
