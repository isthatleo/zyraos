import crypto from "node:crypto";

import { sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { getTenantDb, masterDb } from "@/lib/db";
import { generateTemporaryPassword, markForcePasswordChange, upsertCredentialAuthUser } from "@/lib/password-access";
import { getTenantRoleDefinitions } from "@/lib/roles";
import { normalizeRole } from "@/lib/roles";
import { getTenantSubdomain } from "@/lib/tenant-routing";
import { writeTenantAuditLog } from "@/lib/tenant-audit";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type QueryableDb = ReturnType<typeof getTenantDb>;
type Row = Record<string, unknown>;

const ADMISSION_STATUSES = new Set(["pending", "active", "waitlisted", "graduated", "suspended"]);
const PIPELINE_STATES = new Set(["applied", "review", "docs_missing", "interview", "tested", "accepted", "payment", "enrolled", "waitlisted", "rejected"]);
const ALLOWED_ROLES = new Set(["owner", "school_admin"]);

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

function resolveSlug(request: NextRequest) {
  const explicit = request.nextUrl.searchParams.get("slug")?.trim();
  if (explicit) return explicit;
  return getTenantSubdomain(request.headers.get("host")) || "";
}

async function rows(db: QueryableDb, query: ReturnType<typeof sql>, fallback: Row[] = []) {
  try {
    const result = await db.execute(query);
    return (result.rows || []) as Row[];
  } catch (error) {
    console.warn("Admissions query skipped:", error instanceof Error ? error.message : error);
    return fallback;
  }
}

async function first(db: QueryableDb, query: ReturnType<typeof sql>, fallback: Row = {}) {
  const result = await rows(db, query, [fallback]);
  return result[0] || fallback;
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
    return { response: NextResponse.json({ error: "Only owners and school admins can manage admissions" }, { status: 403 }) };
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

async function readSettings(db: QueryableDb, slug: string) {
  const [settingsRow] = await rows(db, sql`
    select value
    from system_settings
    where key in (${`tenant_settings:${slug}`}, 'tenant_settings')
    order by case when key = ${`tenant_settings:${slug}`} then 0 else 1 end
    limit 1
  `);
  return settingsRow?.value && typeof settingsRow.value === "object" ? settingsRow.value as Row : {};
}

function applyAdmissionFormat(format: string, input: { schoolCode: string; year: string; sequence: number }) {
  const padded = String(input.sequence).padStart(4, "0");
  return format
    .replaceAll("{SCHOOL_CODE}", input.schoolCode)
    .replaceAll("{YEAR}", input.year)
    .replaceAll("{0000}", padded)
    .replaceAll("{####}", padded)
    .replaceAll("{SEQ}", padded);
}

function generatedPortalEmail(input: { prefix: string; applicationId: string; role: "student" | "parent" }) {
  return `${input.role}.${input.applicationId.toLowerCase().replace(/[^a-z0-9]+/g, ".")}@${input.prefix}.local`;
}

async function ensureStudentParentRoles(db: QueryableDb, schoolType: string) {
  const definitions = getTenantRoleDefinitions(schoolType);
  const studentRole = definitions.find((role) => role.canonicalRole === "student");
  const parentRole = definitions.find((role) => role.canonicalRole === "parent");
  for (const role of definitions.filter((item) => item.canonicalRole === "student" || item.canonicalRole === "parent")) {
    await db.execute(sql`
      insert into roles (id, name, description, is_system, created_at, updated_at)
      values (${role.id}, ${role.name}, ${role.description}, ${role.isSystem}, now(), now())
      on conflict (id) do nothing
    `);
  }
  await db.execute(sql`
    insert into roles (id, name, description, is_system, created_at, updated_at)
    values ('student', 'Student', 'Student portal access', true, now(), now()), ('parent', 'Parent / Guardian', 'Parent and guardian portal access', true, now(), now())
    on conflict (id) do nothing
  `);
  return {
    studentRoleId: studentRole?.id || "student",
    parentRoleId: parentRole?.id || "parent",
  };
}

async function generateAdmissionNumber(db: QueryableDb, slug: string, school: Row) {
  const settings = await readSettings(db, slug);
  const year = String(new Date().getFullYear());
  const schoolCode = stringValue(settings.schoolCode, stringValue(school.slug, slug).toUpperCase().slice(0, 8));
  const numberFormats = settings.numberFormats && typeof settings.numberFormats === "object" ? settings.numberFormats as Row : {};
  const format = stringValue(numberFormats.admissionNumberFormat, "{SCHOOL_CODE}/ADM/{YEAR}/{0000}");

  const countRow = await first(db, sql`select count(*)::int as total from students where created_at >= date_trunc('year', now())`, { total: 0 });
  return applyAdmissionFormat(format, { schoolCode, year, sequence: numberValue(countRow.total) + 1 });
}

async function generateApplicationId(db: QueryableDb) {
  const year = String(new Date().getFullYear());
  const countRow = await first(db, sql`
    select count(*)::int as total
    from system_settings
    where key like ${`admissions_application:${year}:%`}
  `, { total: 0 });
  return `APP-${year}-${String(numberValue(countRow.total) + 1).padStart(3, "0")}`;
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
    order by c.grade asc, c.name asc, c.section asc
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

function studentPayload(row: Row, metadata: Row = {}) {
  const guardian = metadata.guardian && typeof metadata.guardian === "object" ? metadata.guardian as Row : {};
  const documents = metadata.documents && typeof metadata.documents === "object" ? metadata.documents as Row : {};
  const notes = metadata.notes && typeof metadata.notes === "object" ? metadata.notes as Row : {};
  return {
    id: stringValue(row.id),
    applicationId: stringValue(metadata.applicationId),
    pipelineState: stringValue(metadata.pipelineState, "applied"),
    userId: stringValue(row.user_id),
    admissionNumber: stringValue(row.admission_number),
    name: stringValue(row.name),
    otherNames: stringValue(metadata.otherNames),
    nationality: stringValue(metadata.nationality),
    email: stringValue(row.email),
    phone: stringValue(row.phone),
    gender: stringValue(row.gender),
    dateOfBirth: isoDate(row.date_of_birth),
    address: stringValue(row.address),
    emergencyContact: stringValue(row.emergency_contact),
    classId: stringValue(row.class_id),
    className: stringValue(row.class_name),
    grade: stringValue(row.grade),
    section: stringValue(row.section),
    status: stringValue(row.status, "pending"),
    enrollmentDate: isoDate(row.enrollment_date),
    createdAt: isoDate(row.created_at),
    updatedAt: isoDate(row.updated_at),
    previousSchool: stringValue(metadata.previousSchool),
    academicYear: stringValue(metadata.academicYear),
    guardian: {
      name: stringValue(guardian.name),
      relationship: stringValue(guardian.relationship, "guardian"),
      contact: stringValue(guardian.contact),
      email: stringValue(guardian.email),
      occupation: stringValue(guardian.occupation),
      address: stringValue(guardian.address),
    },
    documents: {
      birthCertificate: stringValue(documents.birthCertificate),
      passportPhoto: stringValue(documents.passportPhoto),
      previousResults: stringValue(documents.previousResults),
      medicalRecords: stringValue(documents.medicalRecords),
    },
    notes: {
      entryExamScore: stringValue(notes.entryExamScore),
      adminNotes: stringValue(notes.adminNotes),
    },
  };
}

export async function GET(request: NextRequest) {
  const context = await resolveContext(request);
  if ("response" in context) return context.response;

  const status = request.nextUrl.searchParams.get("status")?.trim().toLowerCase() || "all";
  const classId = request.nextUrl.searchParams.get("classId")?.trim() || "all";
  const search = request.nextUrl.searchParams.get("search")?.trim() || "";

  const students = await rows(context.tenantDb, sql`
    select
      s.id,
      s.user_id,
      s.admission_number,
      s.date_of_birth,
      s.gender,
      s.address,
      s.phone,
      s.emergency_contact,
      s.class_id,
      s.enrollment_date,
      s.status,
      s.created_at,
      s.updated_at,
      u.name,
      u.email,
      c.name as class_name,
      c.grade,
      c.section
    from students s
    left join users u on u.id = s.user_id
    left join classes c on c.id = s.class_id
    where (${status} = 'all' or lower(s.status) = ${status})
      and (${classId} = 'all' or s.class_id = ${classId})
      and (
        ${search} = ''
        or lower(coalesce(u.name, '')) like lower(${`%${search}%`})
        or lower(coalesce(u.email, '')) like lower(${`%${search}%`})
        or lower(coalesce(s.admission_number, '')) like lower(${`%${search}%`})
        or lower(coalesce(s.phone, '')) like lower(${`%${search}%`})
      )
    order by s.created_at desc
    limit 250
  `);

  const metadataRows = await rows(context.tenantDb, sql`
    select key, value
    from system_settings
    where key like 'admissions_application:%'
  `);
  const metadataByStudent = new Map(
    metadataRows
      .map((row) => [stringValue((row.value as Row | undefined)?.studentId), row.value && typeof row.value === "object" ? row.value as Row : {}] as const)
      .filter(([studentId]) => Boolean(studentId))
  );

  const [summary, monthSummary] = await Promise.all([
    first(context.tenantDb, sql`
      select
        count(*)::int as total,
        count(*) filter (where lower(status) = 'active')::int as active,
        count(*) filter (where lower(status) = 'pending')::int as pending,
        count(*) filter (where lower(status) = 'waitlisted')::int as waitlisted,
        count(*) filter (where lower(status) = 'suspended')::int as suspended
      from students
    `),
    first(context.tenantDb, sql`
      select count(*)::int as total
      from students
      where created_at >= date_trunc('month', now())
    `),
  ]);

  const classes = await getClasses(context.tenantDb);
  const settings = await readSettings(context.tenantDb, context.slug);
  const nextAdmissionNumber = await generateAdmissionNumber(context.tenantDb, context.slug, context.school);
  const nextApplicationId = await generateApplicationId(context.tenantDb);

  const payloadStudents = students
    .map((student) => studentPayload(student, metadataByStudent.get(stringValue(student.id))))
    .filter((student) => {
      const applicationId = request.nextUrl.searchParams.get("applicationId")?.trim();
      return !applicationId || student.applicationId === applicationId || student.id === applicationId;
    });

  return NextResponse.json({
    school: {
      id: stringValue(context.school.id),
      name: stringValue(context.school.name),
      slug: context.slug,
      type: stringValue(context.school.type),
      country: stringValue(context.school.country),
      currencyCode: stringValue(context.school.currency_code),
    },
    generatedAt: new Date().toISOString(),
    nextAdmissionNumber,
    nextApplicationId,
    settings: {
      schoolCode: stringValue(settings.schoolCode, stringValue(context.school.slug, context.slug).toUpperCase()),
      admissionNumberFormat: stringValue((settings.numberFormats as Row | undefined)?.admissionNumberFormat, "{SCHOOL_CODE}/ADM/{YEAR}/{0000}"),
    },
    summary: {
      total: numberValue(summary.total),
      active: numberValue(summary.active),
      pending: numberValue(summary.pending),
      waitlisted: numberValue(summary.waitlisted),
      suspended: numberValue(summary.suspended),
      thisMonth: numberValue(monthSummary.total),
    },
    classes: classes.map(classPayload),
    students: payloadStudents,
    application: request.nextUrl.searchParams.get("applicationId") ? payloadStudents[0] || null : undefined,
  });
}

export async function POST(request: NextRequest) {
  const context = await resolveContext(request);
  if ("response" in context) return context.response;

  const body = await request.json().catch(() => ({}));
  const firstName = stringValue(body.firstName);
  const lastName = stringValue(body.lastName);
  const otherNames = stringValue(body.otherNames);
  const nationality = stringValue(body.nationality);
  const email = stringValue(body.email).toLowerCase();
  const phone = stringValue(body.phone);
  const classId = stringValue(body.classId);
  const gender = stringValue(body.gender, "other").toLowerCase();
  const address = stringValue(body.address);
  const emergencyContact = stringValue(body.emergencyContact);
  const status = stringValue(body.status, "pending").toLowerCase();
  const dateOfBirth = stringValue(body.dateOfBirth);

  if (!firstName || !lastName) {
    return NextResponse.json({ error: "First name and last name are required" }, { status: 400 });
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Enter a valid student email address" }, { status: 400 });
  }
  if (classId) {
    const classRow = await first(context.tenantDb, sql`select id, capacity from classes where id = ${classId} limit 1`);
    if (!classRow.id) return NextResponse.json({ error: "Selected class does not exist" }, { status: 400 });
    if (numberValue(classRow.capacity)) {
      const occupancy = await first(context.tenantDb, sql`select count(*)::int as total from students where class_id = ${classId} and lower(status) = 'active'`);
      if (numberValue(occupancy.total) >= numberValue(classRow.capacity)) {
        return NextResponse.json({ error: "Selected class is already at full capacity" }, { status: 409 });
      }
    }
  }
  if (!ADMISSION_STATUSES.has(status)) {
    return NextResponse.json({ error: "Invalid admission status" }, { status: 400 });
  }

  const provisionalStudentUserId = `student_${crypto.randomUUID()}`;
  const studentId = `adm_${crypto.randomUUID()}`;
  const admissionNumber = stringValue(body.admissionNumber) || await generateAdmissionNumber(context.tenantDb, context.slug, context.school);
  const applicationId = stringValue(body.applicationId) || await generateApplicationId(context.tenantDb);
  const emailPrefix = stringValue(context.school.slug, context.slug).toLowerCase().replace(/[^a-z0-9]+/g, "") || "tenant";
  const studentEmail = email || generatedPortalEmail({ prefix: emailPrefix, applicationId, role: "student" });
  const name = `${firstName} ${otherNames ? `${otherNames} ` : ""}${lastName}`.trim();
  const guardianName = stringValue(body.guardianName);
  const guardianRelationship = stringValue(body.guardianRelationship, "guardian");
  const guardianEmail = stringValue(body.guardianEmail).toLowerCase() || generatedPortalEmail({ prefix: emailPrefix, applicationId, role: "parent" });
  const guardianContact = stringValue(body.guardianContact);
  const { studentRoleId, parentRoleId } = await ensureStudentParentRoles(context.tenantDb, stringValue(context.school.type));
  const studentTemporaryPassword = generateTemporaryPassword();
  const parentTemporaryPassword = generateTemporaryPassword();

  const existing = await first(context.tenantDb, sql`
    select s.id
    from students s
    left join users u on u.id = s.user_id
    where lower(s.admission_number) = lower(${admissionNumber}) or lower(u.email) = lower(${studentEmail})
    limit 1
  `);
  if (existing.id) {
    return NextResponse.json({ error: "A student with this admission number or email already exists" }, { status: 409 });
  }

  const studentAuth = await upsertCredentialAuthUser({
    userId: provisionalStudentUserId,
    email: studentEmail,
    name,
    role: "student",
    password: studentTemporaryPassword,
    emailVerified: true,
  });
  const studentUserId = studentAuth.userId;

  await context.tenantDb.execute(sql`
    insert into users (id, email, email_verified, name, role_id, is_active, created_at, updated_at)
    values (${studentUserId}, ${studentEmail}, true, ${name}, ${studentRoleId}, ${status !== "suspended"}, now(), now())
    on conflict (id) do update set email = excluded.email, name = excluded.name, role_id = excluded.role_id, is_active = excluded.is_active, updated_at = now()
  `);
  await context.tenantDb.execute(sql`
    insert into students (
      id, user_id, admission_number, date_of_birth, gender, address, phone,
      emergency_contact, class_id, enrollment_date, status, created_at, updated_at
    )
    values (
      ${studentId},
      ${studentUserId},
      ${admissionNumber},
      ${dateOfBirth ? new Date(dateOfBirth) : null},
      ${gender},
      ${address || null},
      ${phone || null},
      ${emergencyContact || null},
      ${classId || null},
      now(),
      ${status},
      now(),
      now()
    )
  `);

  await markForcePasswordChange({ userId: studentUserId, tenantSlug: context.slug, reason: "student_admission_registration" });

  const existingParent = await first(context.tenantDb, sql`select id from users where lower(email) = lower(${guardianEmail}) limit 1`);
  let parentUserId = stringValue(existingParent.id);
  if (!parentUserId) {
    const parentAuth = await upsertCredentialAuthUser({
      userId: `parent_${crypto.randomUUID()}`,
      email: guardianEmail,
      name: guardianName || `${name} Guardian`,
      role: "parent",
      password: parentTemporaryPassword,
      emailVerified: true,
    });
    parentUserId = parentAuth.userId;
    await context.tenantDb.execute(sql`
      insert into users (id, email, email_verified, name, role_id, is_active, created_at, updated_at)
      values (${parentUserId}, ${guardianEmail}, true, ${guardianName || `${name} Guardian`}, ${parentRoleId}, true, now(), now())
      on conflict (id) do update set email = excluded.email, name = excluded.name, role_id = excluded.role_id, is_active = true, updated_at = now()
    `);
    await markForcePasswordChange({ userId: parentUserId, tenantSlug: context.slug, reason: "parent_admission_registration" });
  }

  if (guardianName || guardianContact || guardianEmail) {
    await context.tenantDb.execute(sql`
      insert into guardians (id, student_id, name, relation, phone, email, address, created_at, updated_at)
      values (${`guardian_${crypto.randomUUID()}`}, ${studentId}, ${guardianName || `${name} Guardian`}, ${guardianRelationship}, ${guardianContact || phone || "Not provided"}, ${guardianEmail}, ${stringValue(body.guardianAddress) || address || null}, now(), now())
    `);
  }

  if (classId && status === "active") {
    const academicYear = await first(context.tenantDb, sql`select academic_year_id from classes where id = ${classId} limit 1`);
    if (academicYear.academic_year_id) {
      await context.tenantDb.execute(sql`
        insert into enrollments (id, student_id, class_id, academic_year_id, status, enrolled_at)
        values (${`enrollment_${crypto.randomUUID()}`}, ${studentId}, ${classId}, ${String(academicYear.academic_year_id)}, 'active', now())
      `);
    }
  }

  const applicationMetadata = {
    applicationId,
    studentId,
    studentUserId,
    parentUserId,
    studentAccessEmail: studentEmail,
    parentAccessEmail: guardianEmail,
    otherNames,
    nationality,
    previousSchool: stringValue(body.previousSchool),
    academicYear: stringValue(body.academicYear),
    pipelineState: status === "active" ? "enrolled" : "applied",
    guardian: {
      name: guardianName,
      relationship: guardianRelationship,
      contact: guardianContact,
      email: guardianEmail,
      occupation: stringValue(body.guardianOccupation),
      address: stringValue(body.guardianAddress),
    },
    documents: {
      birthCertificate: stringValue(body.birthCertificate),
      passportPhoto: stringValue(body.passportPhoto),
      previousResults: stringValue(body.previousResults),
      medicalRecords: stringValue(body.medicalRecords),
    },
    notes: {
      entryExamScore: stringValue(body.entryExamScore),
      adminNotes: stringValue(body.adminNotes),
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await context.tenantDb.execute(sql`
    insert into system_settings (id, key, value, category, description, created_at, updated_at)
    values (${crypto.randomUUID()}, ${`admissions_application:${applicationId}`}, ${JSON.stringify(applicationMetadata)}::jsonb, 'admissions', ${`Admission application ${applicationId}`}, now(), now())
    on conflict (key) do update set value = excluded.value, updated_at = now()
  `);

  await writeTenantAuditLog({
    db: context.tenantDb,
    request,
    actorId: context.actor.id,
    action: "admission.create",
    resource: "students",
    resourceId: studentId,
    changes: { applicationId, admissionNumber, name, status, classId },
  }).catch(() => undefined);

  return NextResponse.json({
    success: true,
    studentId,
    userId: studentUserId,
    parentUserId,
    applicationId,
    admissionNumber,
    message: "Application submitted",
    access: {
      student: {
        email: studentEmail,
        temporaryPassword: studentTemporaryPassword,
        dashboardPath: "/student/dashboard",
      },
      parent: {
        email: guardianEmail,
        temporaryPassword: parentUserId === existingParent.id ? null : parentTemporaryPassword,
        dashboardPath: "/parent/dashboard",
      },
    },
  }, { status: 201 });
}

export async function PUT(request: NextRequest) {
  const context = await resolveContext(request);
  if ("response" in context) return context.response;

  const body = await request.json().catch(() => ({}));
  const studentId = stringValue(body.studentId);
  const applicationId = stringValue(body.applicationId);
  const status = stringValue(body.status).toLowerCase();
  const classId = stringValue(body.classId);
  const pipelineState = stringValue(body.pipelineState).toLowerCase();

  if (!studentId && !applicationId) return NextResponse.json({ error: "Student ID or application ID is required" }, { status: 400 });
  if (status && !ADMISSION_STATUSES.has(status)) return NextResponse.json({ error: "Invalid admission status" }, { status: 400 });
  if (pipelineState && !PIPELINE_STATES.has(pipelineState)) return NextResponse.json({ error: "Invalid pipeline state" }, { status: 400 });

  const metadataLookup = applicationId ? await first(context.tenantDb, sql`select value from system_settings where key = ${`admissions_application:${applicationId}`} limit 1`) : {};
  const metadata = metadataLookup.value && typeof metadataLookup.value === "object" ? metadataLookup.value as Row : {};
  const resolvedStudentId = studentId || stringValue(metadata.studentId);

  const existing = await first(context.tenantDb, sql`select id, user_id, class_id, status from students where id = ${resolvedStudentId} limit 1`);
  if (!existing.id) return NextResponse.json({ error: "Admission record not found" }, { status: 404 });

  if (classId) {
    const classRow = await first(context.tenantDb, sql`select id, capacity, academic_year_id from classes where id = ${classId} limit 1`);
    if (!classRow.id) return NextResponse.json({ error: "Selected class does not exist" }, { status: 400 });
    if (numberValue(classRow.capacity) && classId !== existing.class_id) {
      const occupancy = await first(context.tenantDb, sql`select count(*)::int as total from students where class_id = ${classId} and lower(status) = 'active'`);
      if (numberValue(occupancy.total) >= numberValue(classRow.capacity)) {
        return NextResponse.json({ error: "Selected class is already at full capacity" }, { status: 409 });
      }
    }
  }

  await context.tenantDb.execute(sql`
    update students
    set
      status = case when ${status} = '' then status else ${status} end,
      class_id = case when ${classId} = '' then class_id else ${classId} end,
      updated_at = now()
    where id = ${resolvedStudentId}
  `);

  if (status === "active") {
    await context.tenantDb.execute(sql`update users set is_active = true, updated_at = now() where id = ${String(existing.user_id)}`);
  }
  if (status === "suspended") {
    await context.tenantDb.execute(sql`update users set is_active = false, updated_at = now() where id = ${String(existing.user_id)}`);
  }
  if (classId && status === "active") {
    const classRow = await first(context.tenantDb, sql`select academic_year_id from classes where id = ${classId} limit 1`);
    if (classRow.academic_year_id) {
      await context.tenantDb.execute(sql`
        insert into enrollments (id, student_id, class_id, academic_year_id, status, enrolled_at)
        values (${`enrollment_${crypto.randomUUID()}`}, ${resolvedStudentId}, ${classId}, ${String(classRow.academic_year_id)}, 'active', now())
      `);
    }
  }

  const currentMetadataRows = await rows(context.tenantDb, sql`
    select key, value from system_settings
    where key = ${applicationId ? `admissions_application:${applicationId}` : ""} or (value->>'studentId') = ${resolvedStudentId}
    limit 1
  `);
  const currentMetadataRow = currentMetadataRows[0];
  const currentMetadata = currentMetadataRow?.value && typeof currentMetadataRow.value === "object" ? currentMetadataRow.value as Row : {};
  const nextMetadata = {
    ...currentMetadata,
    studentId: resolvedStudentId,
    applicationId: stringValue(currentMetadata.applicationId, applicationId),
    pipelineState: pipelineState || (status === "active" ? "enrolled" : stringValue(currentMetadata.pipelineState, "applied")),
    previousSchool: body.previousSchool ?? currentMetadata.previousSchool,
    academicYear: body.academicYear ?? currentMetadata.academicYear,
    guardian: body.guardian || currentMetadata.guardian,
    documents: body.documents || currentMetadata.documents,
    notes: body.notes || currentMetadata.notes,
    updatedAt: new Date().toISOString(),
  };
  if (nextMetadata.applicationId) {
    await context.tenantDb.execute(sql`
      insert into system_settings (id, key, value, category, description, created_at, updated_at)
      values (${crypto.randomUUID()}, ${`admissions_application:${nextMetadata.applicationId}`}, ${JSON.stringify(nextMetadata)}::jsonb, 'admissions', ${`Admission application ${nextMetadata.applicationId}`}, now(), now())
      on conflict (key) do update set value = excluded.value, updated_at = now()
    `);
  }

  await writeTenantAuditLog({
    db: context.tenantDb,
    request,
    actorId: context.actor.id,
    action: "admission.update",
    resource: "students",
    resourceId: resolvedStudentId,
    changes: { status, classId, pipelineState },
  }).catch(() => undefined);

  return NextResponse.json({ success: true, message: "Admission record updated" });
}

export async function DELETE(request: NextRequest) {
  const context = await resolveContext(request);
  if ("response" in context) return context.response;

  const body = await request.json().catch(() => ({}));
  const studentId = stringValue(body.studentId);
  if (!studentId) return NextResponse.json({ error: "Student ID is required" }, { status: 400 });

  const existing = await first(context.tenantDb, sql`select id, user_id from students where id = ${studentId} limit 1`);
  if (!existing.id) return NextResponse.json({ error: "Admission record not found" }, { status: 404 });

  await context.tenantDb.execute(sql`update students set status = 'suspended', updated_at = now() where id = ${studentId}`);
  await context.tenantDb.execute(sql`update users set is_active = false, updated_at = now() where id = ${String(existing.user_id)}`);
  await writeTenantAuditLog({
    db: context.tenantDb,
    request,
    actorId: context.actor.id,
    action: "admission.suspend",
    resource: "students",
    resourceId: studentId,
  }).catch(() => undefined);

  return NextResponse.json({ success: true, message: "Admission record suspended" });
}
