import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";

import { getTenantDbBySlug, masterDb } from "@/lib/db";
import { departmentsTable, rolesTable, schoolsTable, staffTable, tenantUsersTable, userTable } from "@/lib/db-schema";
import { generateTemporaryPassword, markForcePasswordChange, upsertCredentialAuthUser, validatePasswordPolicy } from "@/lib/password-access";
import { getTenantRoleDefinitionById, getTenantRoleDefinitions, roleLoginMeta } from "@/lib/roles";
import { sendPlatformEmail, sendPlatformSms } from "@/lib/platform-integrations";
import { deleteCachedValue, getCachedValue, setCachedValue } from "@/lib/server-response-cache";
import { writeTenantAuditLog } from "@/lib/tenant-audit";
import { isTenantOwnerResponse, requireTenantOwner } from "@/lib/tenant-owner-auth";
import { getTenantPortalUrl } from "@/lib/tenant-url";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function loginUrl(request: NextRequest, slug: string, portal: string, role: string) {
  return `${getTenantPortalUrl(slug, request)}/${portal}?${new URLSearchParams({ role }).toString()}`;
}

function staffAccessEmail(input: { schoolName: string; name: string; email: string; roleName: string; temporaryPassword: string; loginUrl: string }) {
  const text = [
    `Hello ${input.name},`,
    `Your ${input.roleName} access for ${input.schoolName} is ready.`,
    `Login URL: ${input.loginUrl}`,
    `Email: ${input.email}`,
    `Temporary password: ${input.temporaryPassword}`,
    "You must change this temporary password before entering your dashboard.",
  ].join("\n");
  const html = `
    <div style="font-family:Inter,Arial,sans-serif;background:#f6f7f9;padding:32px;color:#111827">
      <div style="max-width:640px;margin:auto;background:#fff;border:1px solid #e5e7eb;border-radius:24px;padding:32px">
        <p style="margin:0 0 8px;color:#f97316;font-size:12px;font-weight:700;letter-spacing:.16em;text-transform:uppercase">Roxan Education System</p>
        <h1 style="margin:0 0 12px;font-size:26px">Your staff access is ready</h1>
        <p style="margin:0 0 20px;color:#4b5563">Hello ${input.name}, your ${input.roleName} account for ${input.schoolName} has been created.</p>
        <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:18px;padding:18px;margin-bottom:20px">
          <p style="margin:0 0 8px;font-weight:700">Temporary login details</p>
          <p style="margin:0;color:#4b5563">Email: <strong>${input.email}</strong></p>
          <p style="margin:8px 0 0;color:#4b5563">Temporary password: <strong>${input.temporaryPassword}</strong></p>
          <p style="margin:10px 0 0;color:#9a3412;font-size:13px">You must change this password after first login.</p>
        </div>
        <a href="${input.loginUrl}" style="display:inline-block;background:#f97316;color:white;text-decoration:none;padding:12px 18px;border-radius:999px;font-weight:700">Open staff login</a>
      </div>
    </div>
  `;
  return { text, html };
}

async function getSchool(slug: string) {
  const [school] = await masterDb
    .select({ id: schoolsTable.id, name: schoolsTable.name, type: schoolsTable.type, slug: schoolsTable.slug })
    .from(schoolsTable)
    .where(eq(schoolsTable.slug, slug))
    .limit(1);
  return school;
}

async function safeRows<T = Record<string, unknown>>(operation: () => Promise<{ rows?: unknown[] } | T[]>, label: string): Promise<T[]> {
  try {
    const result = await operation();
    if (Array.isArray(result)) return result as T[];
    return ((result.rows || []) as T[]);
  } catch (error) {
    console.warn(`Owner staff ${label} query skipped:`, error instanceof Error ? error.message : error);
    return [];
  }
}

export async function GET(request: NextRequest) {
  try {
    const slug = request.nextUrl.searchParams.get("tenant")?.trim().toLowerCase();
    if (!slug) return NextResponse.json({ error: "Tenant slug is required" }, { status: 400 });

    const school = await getSchool(slug);
    if (!school) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    const owner = await requireTenantOwner(request, slug);
    if (isTenantOwnerResponse(owner)) return owner;
    const cacheKey = `owner-staff:${slug}`;
    const cached = getCachedValue<Record<string, unknown>>(cacheKey);
    if (cached) return NextResponse.json(cached, { headers: { "Cache-Control": "private, max-age=30", "X-Roxan-Cache": "HIT" } });

    const roleDefinitions = getTenantRoleDefinitions(school.type).filter(
      (role) => !["student", "parent", "owner"].includes(role.canonicalRole)
    );
    const tenantDb = await getTenantDbBySlug(slug);
    const staffRows = await safeRows<Record<string, unknown>>(
      () =>
        tenantDb.execute(sql`
          select
            u.id,
            u.name,
            u.email,
            u.role_id,
            u.department_id,
            u.is_active,
            u.created_at,
            r.name as role_name,
            r.description as role_description,
            d.name as department_name,
            s.employee_id,
            s.position,
            s.hire_date,
            s.salary,
            s.status as staff_status
          from users u
          left join roles r on r.id = u.role_id
          left join departments d on d.id = u.department_id
          left join staff s on s.user_id = u.id
          where lower(u.role_id) not like '%student%'
            and lower(u.role_id) not like '%pupil%'
            and lower(u.role_id) not like '%learner%'
            and lower(u.role_id) not like '%parent%'
            and lower(u.role_id) not like '%guardian%'
            and lower(coalesce(u.role_id, '')) not in ('super_admin', 'master', 'platform_admin')
          order by u.created_at desc
        `),
      "directory"
    );
    const departments = await safeRows<typeof departmentsTable.$inferSelect>(
      () => tenantDb.select().from(departmentsTable),
      "departments"
    );

    const staff = staffRows.map((row) => ({
      id: String(row.id),
      name: String(row.name || "User"),
      email: String(row.email || ""),
      image: null,
      roleId: String(row.role_id || ""),
      roleName: String(row.role_name || row.role_id || "Staff"),
      roleDescription: row.role_description ? String(row.role_description) : "",
      departmentId: row.department_id ? String(row.department_id) : null,
      departmentName: row.department_name ? String(row.department_name) : "Unassigned",
      isActive: row.is_active !== false,
      createdAt: row.created_at ? new Date(String(row.created_at)).toISOString() : null,
      employeeId: row.employee_id ? String(row.employee_id) : "",
      position: row.position ? String(row.position) : "",
      hireDate: row.hire_date ? new Date(String(row.hire_date)).toISOString() : null,
      salary: Number(row.salary || 0),
      status: row.staff_status ? String(row.staff_status) : row.is_active === false ? "inactive" : "active",
    }));

    const payload = {
      school,
      staff,
      roles: roleDefinitions,
      departments: departments.map((department) => ({
        id: department.id,
        name: department.name,
        headId: department.headId,
      })),
      summary: {
        total: staff.length,
        active: staff.filter((member) => member.isActive).length,
        inactive: staff.filter((member) => !member.isActive).length,
        unassigned: staff.filter((member) => !member.departmentId).length,
        departments: departments.length,
      },
    };
    setCachedValue(cacheKey, payload, 30_000);
    return NextResponse.json(payload, { headers: { "Cache-Control": "private, max-age=30", "X-Roxan-Cache": "MISS" } });
  } catch (error) {
    console.error("Owner staff GET failed:", error);
    return NextResponse.json({ error: "Failed to load owner staff data" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const slug = request.nextUrl.searchParams.get("tenant")?.trim().toLowerCase();
    if (!slug) return NextResponse.json({ error: "Tenant slug is required" }, { status: 400 });

    const school = await getSchool(slug);
    if (!school) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    const owner = await requireTenantOwner(request, slug);
    if (isTenantOwnerResponse(owner)) return owner;

    const body = await request.json().catch(() => ({}));
    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const phone = String(body.phone || "").trim();
    const roleId = String(body.roleId || "").trim();
    const departmentIdInput = String(body.departmentId || "").trim();
    const position = String(body.position || "").trim();
    const employeeId = String(body.employeeId || "").trim() || `EMP-${Date.now()}`;
    const hireDate = body.hireDate ? new Date(String(body.hireDate)) : new Date();
    const salary = body.salary ? String(body.salary) : null;
    const temporaryPassword = typeof body.temporaryPassword === "string" && body.temporaryPassword ? body.temporaryPassword : generateTemporaryPassword();

    if (!name || !email || !roleId) return NextResponse.json({ error: "Name, email, and role are required" }, { status: 400 });
    const passwordError = validatePasswordPolicy(temporaryPassword);
    if (passwordError) return NextResponse.json({ error: passwordError }, { status: 400 });

    const resolvedRole = getTenantRoleDefinitionById(roleId, school.type);
    if (!resolvedRole || ["student", "parent", "owner"].includes(resolvedRole.canonicalRole)) {
      return NextResponse.json({ error: "Select a valid staff or school admin role" }, { status: 400 });
    }

    const tenantDb = await getTenantDbBySlug(slug);
    const roleDefinitions = getTenantRoleDefinitions(school.type);
    for (const role of roleDefinitions) {
      await tenantDb
        .insert(rolesTable)
        .values({ id: role.id, name: role.name, description: role.description, isSystem: role.isSystem })
        .onConflictDoNothing();
    }

    let departmentId = departmentIdInput;
    if (!departmentId) {
      departmentId = "general_administration";
      await tenantDb
        .insert(departmentsTable)
        .values({ id: departmentId, name: "General Administration" })
        .onConflictDoNothing();
    } else {
      const [department] = await tenantDb
        .select({ id: departmentsTable.id })
        .from(departmentsTable)
        .where(eq(departmentsTable.id, departmentId))
        .limit(1);
      if (!department) return NextResponse.json({ error: "Selected department does not exist" }, { status: 400 });
    }

    const existingTenantUser = await tenantDb
      .select({ id: tenantUsersTable.id })
      .from(tenantUsersTable)
      .where(eq(tenantUsersTable.email, email))
      .limit(1);
    if (existingTenantUser.length) return NextResponse.json({ error: "A user with this email already exists in this tenant" }, { status: 409 });

    const [existingAuthUser] = await masterDb
      .select({ id: userTable.id })
      .from(userTable)
      .where(eq(userTable.email, email))
      .limit(1);
    const userId = existingAuthUser?.id || crypto.randomUUID();

    await upsertCredentialAuthUser({
      userId,
      email,
      name,
      role: resolvedRole.canonicalRole,
      password: temporaryPassword,
      emailVerified: true,
    });

    await tenantDb.insert(tenantUsersTable).values({
      id: userId,
      email,
      name,
      roleId: resolvedRole.id,
      departmentId,
      isActive: true,
    });

    await tenantDb
      .insert(staffTable)
      .values({
        id: crypto.randomUUID(),
        userId,
        employeeId,
        departmentId,
        position: position || resolvedRole.name,
        hireDate,
        salary,
        status: "active",
      })
      .onConflictDoNothing();

    await markForcePasswordChange({ userId, tenantSlug: slug, reason: "owner_staff_creation" });

    const url = loginUrl(request, slug, resolvedRole.portal, resolvedRole.canonicalRole);
    const emailBody = staffAccessEmail({
      schoolName: school.name,
      name,
      email,
      roleName: resolvedRole.name,
      temporaryPassword,
      loginUrl: url,
    });
    const delivery = {
      email: await sendPlatformEmail({
        to: email,
        subject: `Your Roxan ${resolvedRole.name} access is ready`,
        html: emailBody.html,
        text: emailBody.text,
      }).catch((error) => ({
        ok: false,
        provider: "email",
        status: "failed",
        message: error instanceof Error ? error.message : "Email delivery failed.",
      })),
      sms: phone
        ? await sendPlatformSms({
            to: phone,
            body: `Roxan access ready. Login: ${url}. Email: ${email}. Temporary password: ${temporaryPassword}`,
          }).catch((error) => ({
            ok: false,
            provider: "twilio",
            status: "failed",
            message: error instanceof Error ? error.message : "SMS delivery failed.",
          }))
        : null,
    };

    deleteCachedValue(`owner-staff:${slug}`);
    deleteCachedValue(`owner-hr:${slug}`);
    deleteCachedValue(`owner-staff-attendance:${slug}`);
    deleteCachedValue(`owner-payroll:${slug}`);
    await writeTenantAuditLog({
      db: tenantDb,
      request,
      actorId: owner.userId,
      action: "staff.created",
      resource: "staff",
      resourceId: userId,
      changes: {
        email,
        roleId: resolvedRole.id,
        departmentId,
        position: position || resolvedRole.name,
        employeeId,
        delivery: {
          email: delivery.email?.status,
          sms: delivery.sms?.status || null,
        },
      },
    }).catch((error) => console.warn("Owner staff audit log skipped:", error instanceof Error ? error.message : error));
    return NextResponse.json({
      success: true,
      user: {
        id: userId,
        name,
        email,
        roleId: resolvedRole.id,
        role: resolvedRole.canonicalRole,
        departmentId,
        dashboardPath: roleLoginMeta[resolvedRole.canonicalRole]?.redirectPath || resolvedRole.dashboardPath,
      },
      temporaryPassword,
      loginUrl: url,
      delivery,
    });
  } catch (error) {
    console.error("Owner staff POST failed:", error);
    return NextResponse.json({ error: "Failed to create staff account" }, { status: 500 });
  }
}
