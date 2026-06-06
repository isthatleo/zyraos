import { NextRequest, NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";

import { getTenantDbBySlug, masterDb } from "@/lib/db";
import { departmentsTable, rolesTable, schoolsTable, tenantUsersTable, userTable } from "@/lib/db-schema";
import { generateTemporaryPassword, markForcePasswordChange, upsertCredentialAuthUser } from "@/lib/password-access";
import { getTenantRoleDefinitionById, getTenantRoleDefinitions, normalizeRole, roleLoginMeta } from "@/lib/roles";
import { sendPlatformEmail } from "@/lib/platform-integrations";
import { deleteCachedValue } from "@/lib/server-response-cache";
import { writeTenantAuditLog } from "@/lib/tenant-audit";
import { isTenantOwnerResponse, requireTenantOwner } from "@/lib/tenant-owner-auth";
import { getTenantPortalUrl } from "@/lib/tenant-url";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Row = Record<string, unknown>;

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

function asPositiveInt(value: string | null, fallback: number, max: number) {
  const next = Number(value || fallback);
  if (!Number.isFinite(next) || next < 1) return fallback;
  return Math.min(Math.floor(next), max);
}

async function safeRows<T = Row>(operation: () => Promise<{ rows?: unknown[] } | T[]>, label: string): Promise<T[]> {
  try {
    const result = await operation();
    if (Array.isArray(result)) return result as T[];
    return (result.rows || []) as T[];
  } catch (error) {
    console.warn(`Owner users ${label} query skipped:`, error instanceof Error ? error.message : error);
    return [];
  }
}

async function getSchool(slug: string) {
  const [school] = await masterDb
    .select({
      id: schoolsTable.id,
      name: schoolsTable.name,
      slug: schoolsTable.slug,
      type: schoolsTable.type,
      status: schoolsTable.status,
    })
    .from(schoolsTable)
    .where(eq(schoolsTable.slug, slug))
    .limit(1);
  return school;
}

function portalForRole(roleId: string, schoolType: string) {
  const role = getTenantRoleDefinitionById(roleId, schoolType);
  if (role) return role.portal;
  const canonical = normalizeRole(roleId);
  if (canonical === "owner" || canonical === "school_admin") return "admins";
  if (canonical === "student" || canonical === "parent") return "student-parent";
  if (canonical === "canteen") return "canteen";
  return "staff";
}

function dashboardPathForRole(roleId: string, schoolType: string) {
  const role = getTenantRoleDefinitionById(roleId, schoolType);
  if (role) return roleLoginMeta[role.canonicalRole]?.redirectPath || role.dashboardPath;
  const canonical = normalizeRole(roleId);
  return roleLoginMeta[canonical]?.redirectPath || `/${canonical}/dashboard`;
}

function loginUrl(request: NextRequest, slug: string, portal: string, role: string) {
  return `${getTenantPortalUrl(slug, request)}/${portal}?${new URLSearchParams({ role }).toString()}`;
}

function accessEmail(input: { schoolName: string; name: string; email: string; temporaryPassword: string; loginUrl: string }) {
  const text = [
    `Hello ${input.name},`,
    `Your Roxan access for ${input.schoolName} has been reset.`,
    `Login URL: ${input.loginUrl}`,
    `Email: ${input.email}`,
    `Temporary password: ${input.temporaryPassword}`,
    "You must change this temporary password before entering your dashboard.",
  ].join("\n");
  const html = `
    <div style="font-family:Inter,Arial,sans-serif;background:#f6f7f9;padding:32px;color:#111827">
      <div style="max-width:640px;margin:auto;background:#fff;border:1px solid #e5e7eb;border-radius:24px;padding:32px">
        <p style="margin:0 0 8px;color:#f97316;font-size:12px;font-weight:700;letter-spacing:.16em;text-transform:uppercase">Roxan Education System</p>
        <h1 style="margin:0 0 12px;font-size:26px">Your access has been reset</h1>
        <p style="margin:0 0 20px;color:#4b5563">Hello ${input.name}, your account access for ${input.schoolName} has been reset by the owner.</p>
        <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:18px;padding:18px;margin-bottom:20px">
          <p style="margin:0 0 8px;font-weight:700">Temporary login details</p>
          <p style="margin:0;color:#4b5563">Email: <strong>${input.email}</strong></p>
          <p style="margin:8px 0 0;color:#4b5563">Temporary password: <strong>${input.temporaryPassword}</strong></p>
          <p style="margin:10px 0 0;color:#9a3412;font-size:13px">You must change this password after first login.</p>
        </div>
        <a href="${input.loginUrl}" style="display:inline-block;background:#f97316;color:white;text-decoration:none;padding:12px 18px;border-radius:999px;font-weight:700">Open login</a>
      </div>
    </div>
  `;
  return { text, html };
}

function deleteTenantUserCaches(slug: string) {
  deleteCachedValue(`owner-staff:${slug}`);
  deleteCachedValue(`owner-hr:${slug}`);
  deleteCachedValue(`owner-staff-attendance:${slug}`);
  deleteCachedValue(`owner-leave:${slug}`);
  deleteCachedValue(`owner-payroll:${slug}`);
}

async function buildPayload(slug: string, options?: { query?: string; role?: string; status?: string; page?: number; pageSize?: number }) {
  const school = await getSchool(slug);
  if (!school) return null;
  const tenantDb = await getTenantDbBySlug(slug);
  const page = options?.page || 1;
  const pageSize = options?.pageSize || 25;
  const offset = (page - 1) * pageSize;
  const query = options?.query?.trim() || "";
  const roleFilter = options?.role?.trim().toLowerCase() || "all";
  const statusFilter = options?.status?.trim().toLowerCase() || "all";
  const whereParts = [sql`lower(coalesce(u.role_id, '')) not in ('super_admin', 'master', 'platform_admin')`];
  if (query) {
    const pattern = `%${query}%`;
    whereParts.push(sql`(
      u.name ilike ${pattern}
      or u.email ilike ${pattern}
      or coalesce(r.name, '') ilike ${pattern}
      or coalesce(d.name, '') ilike ${pattern}
      or coalesce(st.employee_id, '') ilike ${pattern}
      or coalesce(s.admission_number, '') ilike ${pattern}
    )`);
  }
  if (roleFilter !== "all") whereParts.push(sql`(lower(u.role_id) = ${roleFilter} or lower(coalesce(r.name, '')) = ${roleFilter})`);
  if (statusFilter === "active") whereParts.push(sql`u.is_active is true`);
  if (statusFilter === "inactive") whereParts.push(sql`u.is_active is false`);
  const whereSql = sql.join(whereParts, sql` and `);

  const roleDefinitions = getTenantRoleDefinitions(school.type);
  for (const role of roleDefinitions) {
    await tenantDb
      .insert(rolesTable)
      .values({ id: role.id, name: role.name, description: role.description, isSystem: role.isSystem })
      .onConflictDoNothing();
  }

  const [userRows, countRows, summaryRows, roleCountRows, departments, roleRows, passwordRows] = await Promise.all([
    safeRows<Row>(
      () =>
        tenantDb.execute(sql`
          select
            u.id,
            u.name,
            u.email,
            u.image,
            u.role_id,
            u.department_id,
            u.is_active,
            u.created_at,
            u.updated_at,
            r.name as role_name,
            r.description as role_description,
            r.is_system as role_is_system,
            d.name as department_name,
            st.employee_id,
            st.position,
            st.status as staff_status,
            s.admission_number,
            s.status as student_status,
            count(g.id)::int as guardian_links
          from users u
          left join roles r on r.id = u.role_id
          left join departments d on d.id = u.department_id
          left join staff st on st.user_id = u.id
          left join students s on s.user_id = u.id
          left join guardians g on lower(g.email) = lower(u.email)
          where ${whereSql}
          group by u.id, r.id, d.id, st.id, s.id
          order by u.created_at desc
          limit ${pageSize} offset ${offset}
        `),
      "directory"
    ),
    safeRows<Row>(() => tenantDb.execute(sql`
      select count(*)::int total
      from users u
      left join roles r on r.id = u.role_id
      left join departments d on d.id = u.department_id
      left join staff st on st.user_id = u.id
      left join students s on s.user_id = u.id
      where ${whereSql}
    `), "directory count"),
    safeRows<Row>(() => tenantDb.execute(sql`
      select
        count(*)::int total,
        count(*) filter (where u.is_active is true)::int active,
        count(*) filter (where u.is_active is false)::int inactive,
        count(*) filter (where lower(u.role_id) = 'student')::int learners,
        count(*) filter (where lower(u.role_id) = 'parent')::int guardians,
        count(*) filter (where lower(u.role_id) not in ('student', 'parent'))::int staff,
        count(*) filter (where u.department_id is null and lower(u.role_id) not in ('student', 'parent'))::int unassigned
      from users u
      where lower(coalesce(u.role_id, '')) not in ('super_admin', 'master', 'platform_admin')
    `), "summary"),
    safeRows<Row>(() => tenantDb.execute(sql`select role_id, count(*)::int total from users where lower(coalesce(role_id, '')) not in ('super_admin', 'master', 'platform_admin') group by role_id`), "role counts"),
    safeRows<typeof departmentsTable.$inferSelect>(() => tenantDb.select().from(departmentsTable), "departments"),
    safeRows<typeof rolesTable.$inferSelect>(() => tenantDb.select().from(rolesTable), "roles"),
    safeRows<Row>(() => masterDb.execute(sql`select user_id, force_password_change, password_last_changed_at, temporary_password_issued_at from password_security`), "password security"),
  ]);

  const passwordMap = new Map(passwordRows.map((row) => [asString(row.user_id), row]));
  const users = userRows.map((row) => {
    const roleId = asString(row.role_id, "student");
    const canonicalRole = normalizeRole(roleId);
    const password = passwordMap.get(asString(row.id));
    return {
      id: asString(row.id),
      name: asString(row.name, "User"),
      email: asString(row.email),
      image: row.image ? String(row.image) : null,
      roleId,
      roleName: asString(row.role_name, roleId.replace(/_/g, " ")),
      roleDescription: asString(row.role_description),
      canonicalRole,
      portal: portalForRole(roleId, school.type),
      dashboardPath: dashboardPathForRole(roleId, school.type),
      departmentId: row.department_id ? String(row.department_id) : null,
      departmentName: asString(row.department_name, "Unassigned"),
      isActive: row.is_active !== false,
      createdAt: asDate(row.created_at),
      updatedAt: asDate(row.updated_at),
      employeeId: asString(row.employee_id),
      position: asString(row.position),
      staffStatus: asString(row.staff_status),
      admissionNumber: asString(row.admission_number),
      studentStatus: asString(row.student_status),
      guardianLinks: asNumber(row.guardian_links),
      forcePasswordChange: password?.force_password_change === true,
      passwordLastChangedAt: asDate(password?.password_last_changed_at),
      temporaryPasswordIssuedAt: asDate(password?.temporary_password_issued_at),
      loginUrl: "",
    };
  });

  const byCanonicalRole = roleCountRows.reduce<Record<string, number>>((acc, row) => {
    const canonical = normalizeRole(asString(row.role_id));
    acc[canonical] = (acc[canonical] || 0) + asNumber(row.total);
    return acc;
  }, {});
  const total = asNumber(countRows[0]?.total);
  const summary = summaryRows[0] || {};

  return {
    school,
    users,
    departments: departments.map((department) => ({ id: department.id, name: department.name, headId: department.headId })),
    roles: roleRows.map((role) => {
      const definition = getTenantRoleDefinitionById(role.id, school.type);
      return {
        id: role.id,
        name: role.name,
        description: role.description || definition?.description || "",
        isSystem: role.isSystem,
        canonicalRole: definition?.canonicalRole || normalizeRole(role.id),
        portal: definition?.portal || portalForRole(role.id, school.type),
        dashboardPath: definition?.dashboardPath || dashboardPathForRole(role.id, school.type),
      };
    }),
    summary: {
      total: asNumber(summary.total),
      active: asNumber(summary.active),
      inactive: asNumber(summary.inactive),
      staff: asNumber(summary.staff),
      learners: asNumber(summary.learners),
      guardians: asNumber(summary.guardians),
      forcePasswordChange: users.filter((user) => user.forcePasswordChange).length,
      unassigned: asNumber(summary.unassigned),
      byCanonicalRole,
    },
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
      hasNextPage: page * pageSize < total,
      hasPreviousPage: page > 1,
    },
    filters: { query, role: roleFilter, status: statusFilter },
    generatedAt: new Date().toISOString(),
  };
}

function withRequestLoginUrls<T extends Awaited<ReturnType<typeof buildPayload>>>(payload: T, request: NextRequest, slug: string): T {
  if (!payload) return payload;
  return {
    ...payload,
    users: payload.users.map((user) => ({
      ...user,
      loginUrl: loginUrl(request, slug, user.portal, user.canonicalRole),
    })),
  };
}

export async function GET(request: NextRequest) {
  try {
    const slug = request.nextUrl.searchParams.get("tenant")?.trim().toLowerCase();
    if (!slug) return NextResponse.json({ error: "Tenant slug is required" }, { status: 400 });
    const currentUser = await requireTenantOwner(request, slug);
    if (isTenantOwnerResponse(currentUser)) return currentUser;
    const payload = await buildPayload(slug, {
      query: request.nextUrl.searchParams.get("query") || "",
      role: request.nextUrl.searchParams.get("role") || "all",
      status: request.nextUrl.searchParams.get("status") || "all",
      page: asPositiveInt(request.nextUrl.searchParams.get("page"), 1, 10_000),
      pageSize: asPositiveInt(request.nextUrl.searchParams.get("pageSize"), 25, 100),
    });
    if (!payload) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

    return NextResponse.json(withRequestLoginUrls(payload, request, slug), { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    console.error("Owner users GET failed:", error);
    return NextResponse.json({ error: "Failed to load owner users" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const slug = request.nextUrl.searchParams.get("tenant")?.trim().toLowerCase();
    if (!slug) return NextResponse.json({ error: "Tenant slug is required" }, { status: 400 });
    const currentUser = await requireTenantOwner(request, slug);
    if (isTenantOwnerResponse(currentUser)) return currentUser;
    const school = await getSchool(slug);
    if (!school) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

    const body = (await request.json().catch(() => ({}))) as Row;
    const userId = asString(body.userId);
    const action = asString(body.action, "update");
    if (!userId) return NextResponse.json({ error: "User id is required" }, { status: 400 });
    if (userId === currentUser.userId && ["deactivate", "delete"].includes(action)) {
      return NextResponse.json({ error: "You cannot disable your own owner account" }, { status: 400 });
    }

    const tenantDb = await getTenantDbBySlug(slug);
    const [user] = await tenantDb.select().from(tenantUsersTable).where(eq(tenantUsersTable.id, userId)).limit(1);
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    if (action === "activate" || action === "deactivate") {
      await tenantDb.update(tenantUsersTable).set({ isActive: action === "activate", updatedAt: new Date() }).where(eq(tenantUsersTable.id, userId));
      await masterDb.update(userTable).set({ updatedAt: new Date() }).where(eq(userTable.id, userId)).catch(() => undefined);
      await writeTenantAuditLog({
        db: tenantDb,
        request,
        actorId: currentUser.userId,
        action: action === "activate" ? "User Activated" : "User Deactivated",
        resource: "users",
        resourceId: userId,
        changes: { email: user.email, active: action === "activate" },
        status: "success",
      });
      deleteTenantUserCaches(slug);
      return NextResponse.json(withRequestLoginUrls(await buildPayload(slug), request, slug));
    }

    if (action === "reset_access") {
      const temporaryPassword = generateTemporaryPassword();
      const role = normalizeRole(user.roleId);
      await upsertCredentialAuthUser({
        userId,
        email: user.email,
        name: user.name,
        role,
        password: temporaryPassword,
        emailVerified: true,
      });
      await markForcePasswordChange({ userId, tenantSlug: slug, reason: "owner_user_management_reset" });
      const url = loginUrl(request, slug, portalForRole(user.roleId, school.type), role);
      const emailBody = accessEmail({ schoolName: school.name, name: user.name, email: user.email, temporaryPassword, loginUrl: url });
      const delivery = await sendPlatformEmail({
        to: user.email,
        subject: "Your Roxan access has been reset",
        html: emailBody.html,
        text: emailBody.text,
      }).catch((error) => ({
        ok: false,
        provider: "email",
        status: "failed",
        message: error instanceof Error ? error.message : "Email delivery failed.",
      }));
      await writeTenantAuditLog({
        db: tenantDb,
        request,
        actorId: currentUser.userId,
        action: "User Access Reset",
        resource: "users",
        resourceId: userId,
        changes: { email: user.email, deliveryStatus: delivery.status || "unknown" },
        status: "success",
      });
      deleteTenantUserCaches(slug);
      return NextResponse.json({ ...withRequestLoginUrls(await buildPayload(slug), request, slug), temporaryPassword, loginUrl: url, delivery });
    }

    const name = asString(body.name, user.name).slice(0, 160);
    const email = asString(body.email, user.email).toLowerCase().slice(0, 200);
    const roleId = asString(body.roleId, user.roleId);
    const departmentId = asString(body.departmentId) || null;
    const image = asString(body.image) || user.image || null;

    const role = getTenantRoleDefinitionById(roleId, school.type);
    if (!role && !(await tenantDb.select({ id: rolesTable.id }).from(rolesTable).where(eq(rolesTable.id, roleId)).limit(1)).length) {
      return NextResponse.json({ error: "Selected role does not exist" }, { status: 400 });
    }
    if (departmentId && !(await tenantDb.select({ id: departmentsTable.id }).from(departmentsTable).where(eq(departmentsTable.id, departmentId)).limit(1)).length) {
      return NextResponse.json({ error: "Selected department does not exist" }, { status: 400 });
    }

    await tenantDb
      .update(tenantUsersTable)
      .set({ name, email, roleId, departmentId, image, updatedAt: new Date() })
      .where(eq(tenantUsersTable.id, userId));
    await masterDb
      .update(userTable)
      .set({ name, email, image, role: normalizeRole(roleId), updatedAt: new Date() })
      .where(eq(userTable.id, userId))
      .catch(() => undefined);
    await writeTenantAuditLog({
      db: tenantDb,
      request,
      actorId: currentUser.userId,
      action: "User Updated",
      resource: "users",
      resourceId: userId,
      changes: { previousEmail: user.email, email, previousRoleId: user.roleId, roleId, departmentId },
      status: "success",
    });

    deleteTenantUserCaches(slug);
    return NextResponse.json(withRequestLoginUrls(await buildPayload(slug), request, slug));
  } catch (error) {
    console.error("Owner users PATCH failed:", error);
    return NextResponse.json({ error: "Failed to update owner user" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const slug = request.nextUrl.searchParams.get("tenant")?.trim().toLowerCase();
    if (!slug) return NextResponse.json({ error: "Tenant slug is required" }, { status: 400 });
    const currentUser = await requireTenantOwner(request, slug);
    if (isTenantOwnerResponse(currentUser)) return currentUser;
    const body = (await request.json().catch(() => ({}))) as Row;
    const userId = asString(body.userId);
    if (!userId) return NextResponse.json({ error: "User id is required" }, { status: 400 });
    if (userId === currentUser.userId) return NextResponse.json({ error: "You cannot delete your own owner account" }, { status: 400 });

    const tenantDb = await getTenantDbBySlug(slug);
    const [user] = await tenantDb.select({ email: tenantUsersTable.email, roleId: tenantUsersTable.roleId }).from(tenantUsersTable).where(eq(tenantUsersTable.id, userId)).limit(1);
    await tenantDb.delete(tenantUsersTable).where(eq(tenantUsersTable.id, userId));
    await writeTenantAuditLog({
      db: tenantDb,
      request,
      actorId: currentUser.userId,
      action: "User Deleted",
      resource: "users",
      resourceId: userId,
      changes: { email: user?.email || "", roleId: user?.roleId || "" },
      status: "success",
    });
    deleteTenantUserCaches(slug);
    return NextResponse.json(withRequestLoginUrls(await buildPayload(slug), request, slug));
  } catch (error) {
    console.error("Owner users DELETE failed:", error);
    return NextResponse.json({ error: "Failed to delete owner user" }, { status: 500 });
  }
}
