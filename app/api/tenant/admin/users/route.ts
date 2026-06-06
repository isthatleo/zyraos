import crypto from "node:crypto";

import { eq, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

import { getTenantDbBySlug, masterDb } from "@/lib/db";
import { departmentsTable, rolesTable, schoolsTable, staffTable, tenantUsersTable, userTable } from "@/lib/db-schema";
import { generateTemporaryPassword, markForcePasswordChange, upsertCredentialAuthUser, validatePasswordPolicy } from "@/lib/password-access";
import { getStaffCreationRoleDefinitions, getTenantRoleDefinitionById, getTenantRoleDefinitions, normalizeRole, roleLoginMeta } from "@/lib/roles";
import { STANDARD_SCHOOL_DEPARTMENTS } from "@/lib/school-departments";
import { sendPlatformEmail, sendPlatformSms } from "@/lib/platform-integrations";
import { writeTenantAuditLog } from "@/lib/tenant-audit";
import { getTenantPortalUrl } from "@/lib/tenant-url";
import { isTenantAdminResponse, requireTenantAdmin } from "@/lib/tenant-admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Row = Record<string, unknown>;
const salaryPeriods = new Set(["monthly", "per_term", "per_year"]);

function asString(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function asNumber(value: unknown) {
  const next = Number(value || 0);
  return Number.isFinite(next) ? next : 0;
}

function asDate(value: unknown) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

async function safeRows<T = Row>(operation: () => Promise<{ rows?: unknown[] } | T[]>, label: string): Promise<T[]> {
  try {
    const result = await operation();
    if (Array.isArray(result)) return result as T[];
    return (result.rows || []) as T[];
  } catch (error) {
    console.warn(`Admin users ${label} query skipped:`, error instanceof Error ? error.message : error);
    return [];
  }
}

async function getSchool(slug: string) {
  const [school] = await masterDb
    .select({ id: schoolsTable.id, name: schoolsTable.name, slug: schoolsTable.slug, type: schoolsTable.type, status: schoolsTable.status, currencyCode: schoolsTable.currencyCode })
    .from(schoolsTable)
    .where(eq(schoolsTable.slug, slug))
    .limit(1);
  return school;
}

function loginUrl(request: NextRequest, slug: string, portal: string, role: string) {
  return `${getTenantPortalUrl(slug, request)}/${portal}?${new URLSearchParams({ role }).toString()}`;
}

function employeeIdPrefix(slug: string) {
  return String(slug || "SCH").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6) || "SCH";
}

async function generateEmployeeId(tenantDb: Awaited<ReturnType<typeof getTenantDbBySlug>>, slug: string) {
  const prefix = employeeIdPrefix(slug);
  const year = new Date().getFullYear();
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const candidate = `${prefix}-${year}-${String((Date.now() % 1000000) + attempt).padStart(6, "0")}`;
    const existing = await tenantDb.select({ id: staffTable.id }).from(staffTable).where(eq(staffTable.employeeId, candidate)).limit(1).catch(() => []);
    if (!existing.length) return candidate;
  }
  return `${prefix}-${year}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
}

function portalForRole(roleId: string, schoolType: string) {
  const definition = getTenantRoleDefinitionById(roleId, schoolType);
  if (definition) return definition.portal;
  const canonical = normalizeRole(roleId);
  if (canonical === "owner" || canonical === "school_admin") return "admins";
  if (canonical === "student" || canonical === "parent") return "student-parent";
  if (canonical === "canteen") return "canteen";
  return "staff";
}

function dashboardPathForRole(roleId: string, schoolType: string) {
  const definition = getTenantRoleDefinitionById(roleId, schoolType);
  if (definition) return roleLoginMeta[definition.canonicalRole]?.redirectPath || definition.dashboardPath;
  const canonical = normalizeRole(roleId);
  return roleLoginMeta[canonical]?.redirectPath || `/${canonical}/dashboard`;
}

function staffAccessEmail(input: { schoolName: string; name: string; email: string; roleName: string; temporaryPassword: string; loginUrl: string }) {
  const text = [`Hello ${input.name},`, `Your ${input.roleName} access for ${input.schoolName} is ready.`, `Login URL: ${input.loginUrl}`, `Email: ${input.email}`, `Temporary password: ${input.temporaryPassword}`, "You must change this temporary password before entering your dashboard."].join("\n");
  const html = `<div style="font-family:Inter,Arial,sans-serif;background:#f6f7f9;padding:32px;color:#111827"><div style="max-width:640px;margin:auto;background:#fff;border:1px solid #e5e7eb;border-radius:24px;padding:32px"><p style="margin:0 0 8px;color:#f97316;font-size:12px;font-weight:700;letter-spacing:.16em;text-transform:uppercase">Roxan Education System</p><h1 style="margin:0 0 12px;font-size:26px">Your staff access is ready</h1><p style="margin:0 0 20px;color:#4b5563">Hello ${input.name}, your ${input.roleName} account for ${input.schoolName} has been created.</p><div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:18px;padding:18px;margin-bottom:20px"><p style="margin:0 0 8px;font-weight:700">Temporary login details</p><p style="margin:0;color:#4b5563">Email: <strong>${input.email}</strong></p><p style="margin:8px 0 0;color:#4b5563">Temporary password: <strong>${input.temporaryPassword}</strong></p><p style="margin:10px 0 0;color:#9a3412;font-size:13px">You must change this password after first login.</p></div><a href="${input.loginUrl}" style="display:inline-block;background:#f97316;color:white;text-decoration:none;padding:12px 18px;border-radius:999px;font-weight:700">Open login</a></div></div>`;
  return { text, html };
}

async function ensureCatalog(tenantDb: Awaited<ReturnType<typeof getTenantDbBySlug>>, schoolType: string) {
  for (const department of STANDARD_SCHOOL_DEPARTMENTS) {
    await tenantDb.insert(departmentsTable).values(department).onConflictDoNothing().catch(() => undefined);
  }
  for (const role of getTenantRoleDefinitions(schoolType)) {
    await tenantDb.insert(rolesTable).values({ id: role.id, name: role.name, description: role.description, isSystem: role.isSystem }).onConflictDoNothing().catch(() => undefined);
  }
}

async function buildPayload(slug: string, request: NextRequest) {
  const school = await getSchool(slug);
  if (!school) return null;
  const tenantDb = await getTenantDbBySlug(slug);
  await ensureCatalog(tenantDb, school.type);
  const query = request.nextUrl.searchParams.get("query")?.trim() || "";
  const role = request.nextUrl.searchParams.get("role")?.trim().toLowerCase() || "all";
  const status = request.nextUrl.searchParams.get("status")?.trim().toLowerCase() || "all";
  const staffOnly = request.nextUrl.searchParams.get("staffOnly") === "true";
  const where = [sql`lower(coalesce(u.role_id, '')) not in ('super_admin', 'master', 'platform_admin')`];
  if (staffOnly) where.push(sql`lower(coalesce(u.role_id, '')) not in ('student', 'parent', 'guardian', 'learner', 'pupil')`);
  if (query) {
    const pattern = `%${query}%`;
    where.push(sql`(u.name ilike ${pattern} or u.email ilike ${pattern} or coalesce(st.employee_id, '') ilike ${pattern} or coalesce(d.name, '') ilike ${pattern} or coalesce(r.name, '') ilike ${pattern})`);
  }
  if (role !== "all") where.push(sql`(lower(u.role_id) = ${role} or lower(coalesce(r.name, '')) = ${role})`);
  if (status === "active") where.push(sql`u.is_active is true`);
  if (status === "inactive") where.push(sql`u.is_active is false`);
  const whereSql = sql.join(where, sql` and `);
  const [userRows, roleRows, departmentRows] = await Promise.all([
    safeRows<Row>(() => tenantDb.execute(sql`
      select u.id, u.name, u.email, u.image, u.role_id, u.department_id, u.is_active, u.created_at, u.updated_at,
        r.name as role_name, r.description as role_description, d.name as department_name,
        st.employee_id, st.position, st.hire_date, st.salary, st.salary_period, st.status as staff_status,
        s.admission_number, s.status as student_status
      from users u
      left join roles r on r.id = u.role_id
      left join departments d on d.id = u.department_id
      left join staff st on st.user_id = u.id
      left join students s on s.user_id = u.id
      where ${whereSql}
      order by u.created_at desc
      limit 250
    `), "users"),
    safeRows<typeof rolesTable.$inferSelect>(() => tenantDb.select().from(rolesTable), "roles"),
    safeRows<typeof departmentsTable.$inferSelect>(() => tenantDb.select().from(departmentsTable), "departments"),
  ]);
  const users = userRows.map((row) => {
    const roleId = asString(row.role_id, "student");
    return {
      id: asString(row.id),
      name: asString(row.name, "User"),
      email: asString(row.email),
      image: row.image ? String(row.image) : null,
      roleId,
      roleName: asString(row.role_name, roleId.replace(/_/g, " ")),
      roleDescription: asString(row.role_description),
      canonicalRole: normalizeRole(roleId),
      portal: portalForRole(roleId, school.type),
      dashboardPath: dashboardPathForRole(roleId, school.type),
      departmentId: row.department_id ? String(row.department_id) : null,
      departmentName: asString(row.department_name, "Unassigned"),
      isActive: row.is_active !== false,
      createdAt: asDate(row.created_at),
      updatedAt: asDate(row.updated_at),
      employeeId: asString(row.employee_id),
      position: asString(row.position),
      hireDate: asDate(row.hire_date),
      salary: asNumber(row.salary),
      salaryPeriod: asString(row.salary_period, "monthly"),
      staffStatus: asString(row.staff_status, row.is_active === false ? "inactive" : "active"),
      admissionNumber: asString(row.admission_number),
      studentStatus: asString(row.student_status),
      loginUrl: loginUrl(request, slug, portalForRole(roleId, school.type), normalizeRole(roleId)),
    };
  });
  const staff = users.filter((user) => !["student", "parent", "guardian", "learner", "pupil"].includes(user.canonicalRole));
  return {
    school,
    users,
    staff,
    roles: roleRows.map((item) => ({ id: item.id, name: item.name, description: item.description || "", isSystem: item.isSystem, canonicalRole: normalizeRole(item.id), portal: portalForRole(item.id, school.type), dashboardPath: dashboardPathForRole(item.id, school.type) })),
    staffRoles: getStaffCreationRoleDefinitions(school.type),
    departments: departmentRows.map((item) => ({ id: item.id, name: item.name, headId: item.headId })),
    summary: {
      total: users.length,
      active: users.filter((user) => user.isActive).length,
      inactive: users.filter((user) => !user.isActive).length,
      staff: staff.length,
      learners: users.filter((user) => user.canonicalRole === "student").length,
      guardians: users.filter((user) => user.canonicalRole === "parent").length,
      unassigned: users.filter((user) => !user.departmentId && !["student", "parent"].includes(user.canonicalRole)).length,
    },
    generatedAt: new Date().toISOString(),
  };
}

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("tenant")?.trim().toLowerCase() || "";
  if (!slug) return NextResponse.json({ error: "Tenant slug is required" }, { status: 400 });
  const admin = await requireTenantAdmin(request, slug);
  if (isTenantAdminResponse(admin)) return admin;
  const payload = await buildPayload(slug, request);
  if (!payload) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  return NextResponse.json(payload, { headers: { "Cache-Control": "no-store, max-age=0" } });
}

export async function POST(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("tenant")?.trim().toLowerCase() || "";
  if (!slug) return NextResponse.json({ error: "Tenant slug is required" }, { status: 400 });
  const admin = await requireTenantAdmin(request, slug);
  if (isTenantAdminResponse(admin)) return admin;
  const school = await getSchool(slug);
  if (!school) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  const body = await request.json().catch(() => ({}));
  const name = asString(body.name);
  const email = asString(body.email).toLowerCase();
  const roleId = asString(body.roleId);
  const departmentId = asString(body.departmentId, "administration");
  const phone = asString(body.phone);
  const position = asString(body.position);
  const salary = body.salary ? String(body.salary) : null;
  const salaryPeriod = salaryPeriods.has(asString(body.salaryPeriod)) ? asString(body.salaryPeriod) : "monthly";
  const temporaryPassword = asString(body.temporaryPassword) || generateTemporaryPassword();
  if (!name || !email || !roleId) return NextResponse.json({ error: "Name, email, and role are required" }, { status: 400 });
  const passwordError = validatePasswordPolicy(temporaryPassword);
  if (passwordError) return NextResponse.json({ error: passwordError }, { status: 400 });
  const resolvedRole = getTenantRoleDefinitionById(roleId, school.type);
  const allowed = getStaffCreationRoleDefinitions(school.type).some((role) => role.id === resolvedRole?.id || role.canonicalRole === resolvedRole?.canonicalRole);
  if (!resolvedRole || !allowed || ["student", "parent", "owner"].includes(resolvedRole.canonicalRole)) return NextResponse.json({ error: "Select a valid staff or school admin role" }, { status: 400 });
  const tenantDb = await getTenantDbBySlug(slug);
  await ensureCatalog(tenantDb, school.type);
  const existing = await tenantDb.select({ id: tenantUsersTable.id }).from(tenantUsersTable).where(eq(tenantUsersTable.email, email)).limit(1);
  if (existing.length) return NextResponse.json({ error: "A user with this email already exists in this tenant" }, { status: 409 });
  const [existingAuthUser] = await masterDb.select({ id: userTable.id }).from(userTable).where(eq(userTable.email, email)).limit(1);
  const userId = existingAuthUser?.id || crypto.randomUUID();
  const employeeId = asString(body.employeeId).toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 40) || await generateEmployeeId(tenantDb, slug);
  await upsertCredentialAuthUser({ userId, email, name, role: resolvedRole.canonicalRole, password: temporaryPassword, emailVerified: true });
  await tenantDb.insert(tenantUsersTable).values({ id: userId, email, emailVerified: true, name, roleId: resolvedRole.id, departmentId, isActive: true });
  await tenantDb.insert(staffTable).values({ id: crypto.randomUUID(), userId, employeeId, departmentId, position: position || resolvedRole.name, hireDate: new Date(), salary, salaryPeriod, status: "active" }).onConflictDoNothing();
  await markForcePasswordChange({ userId, tenantSlug: slug, reason: "admin_staff_creation" });
  const url = loginUrl(request, slug, resolvedRole.portal, resolvedRole.canonicalRole);
  const emailBody = staffAccessEmail({ schoolName: school.name, name, email, roleName: resolvedRole.name, temporaryPassword, loginUrl: url });
  const delivery = {
    email: await sendPlatformEmail({ to: email, subject: `Your Roxan ${resolvedRole.name} access is ready`, html: emailBody.html, text: emailBody.text }).catch((error) => ({ ok: false, provider: "email", status: "failed", message: error instanceof Error ? error.message : "Email delivery failed." })),
    sms: phone ? await sendPlatformSms({ to: phone, body: `Roxan access ready. Login: ${url}. Email: ${email}. Temporary password: ${temporaryPassword}` }).catch((error) => ({ ok: false, provider: "twilio", status: "failed", message: error instanceof Error ? error.message : "SMS delivery failed." })) : null,
  };
  await writeTenantAuditLog({ db: tenantDb, request, actorId: admin.userId, action: "admin.staff.created", resource: "staff", resourceId: userId, changes: { email, roleId: resolvedRole.id, departmentId, employeeId, salaryPeriod, delivery } }).catch(() => undefined);
  return NextResponse.json({ success: true, user: { id: userId, name, email, roleId: resolvedRole.id, role: resolvedRole.canonicalRole, dashboardPath: roleLoginMeta[resolvedRole.canonicalRole]?.redirectPath || resolvedRole.dashboardPath }, temporaryPassword, employeeId, loginUrl: url, delivery });
}

export async function PATCH(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("tenant")?.trim().toLowerCase() || "";
  if (!slug) return NextResponse.json({ error: "Tenant slug is required" }, { status: 400 });
  const admin = await requireTenantAdmin(request, slug);
  if (isTenantAdminResponse(admin)) return admin;
  const body = await request.json().catch(() => ({}));
  const userId = asString(body.userId);
  const action = asString(body.action, "update");
  if (!userId) return NextResponse.json({ error: "User id is required" }, { status: 400 });
  const tenantDb = await getTenantDbBySlug(slug);
  if (action === "status") {
    await tenantDb.update(tenantUsersTable).set({ isActive: Boolean(body.isActive), updatedAt: new Date() }).where(eq(tenantUsersTable.id, userId));
    await tenantDb.execute(sql`update staff set status = ${Boolean(body.isActive) ? "active" : "inactive"}, updated_at = now() where user_id = ${userId}`).catch(() => undefined);
  } else {
    const updates: Partial<typeof tenantUsersTable.$inferInsert> = {};
    if (typeof body.name === "string") updates.name = body.name;
    if (typeof body.roleId === "string") updates.roleId = body.roleId;
    if (typeof body.departmentId === "string") updates.departmentId = body.departmentId || null;
    updates.updatedAt = new Date();
    await tenantDb.update(tenantUsersTable).set(updates).where(eq(tenantUsersTable.id, userId));
    await tenantDb.execute(sql`update staff set position = coalesce(${asString(body.position) || null}, position), salary = coalesce(${body.salary ? String(body.salary) : null}, salary), salary_period = coalesce(${asString(body.salaryPeriod) || null}, salary_period), updated_at = now() where user_id = ${userId}`).catch(() => undefined);
  }
  await writeTenantAuditLog({ db: tenantDb, request, actorId: admin.userId, action: `admin.user.${action}`, resource: "users", resourceId: userId, changes: body }).catch(() => undefined);
  return NextResponse.json(await buildPayload(slug, request), { headers: { "Cache-Control": "no-store, max-age=0" } });
}

export async function DELETE(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("tenant")?.trim().toLowerCase() || "";
  const userId = request.nextUrl.searchParams.get("userId") || "";
  if (!slug || !userId) return NextResponse.json({ error: "Tenant slug and user id are required" }, { status: 400 });
  const admin = await requireTenantAdmin(request, slug);
  if (isTenantAdminResponse(admin)) return admin;
  const tenantDb = await getTenantDbBySlug(slug);
  await tenantDb.update(tenantUsersTable).set({ isActive: false, updatedAt: new Date() }).where(eq(tenantUsersTable.id, userId));
  await tenantDb.execute(sql`update staff set status = 'inactive', updated_at = now() where user_id = ${userId}`).catch(() => undefined);
  await writeTenantAuditLog({ db: tenantDb, request, actorId: admin.userId, action: "admin.user.deactivated", resource: "users", resourceId: userId }).catch(() => undefined);
  return NextResponse.json({ success: true });
}
