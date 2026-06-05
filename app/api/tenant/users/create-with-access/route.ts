import { NextRequest, NextResponse } from "next/server";
import { eq, inArray } from "drizzle-orm";
import crypto from "node:crypto";

import { getTenantDbBySlug, masterDb } from "@/lib/db";
import { departmentsTable, rolesTable, schoolsTable, tenantUsersTable, userTable } from "@/lib/db-schema";
import {
  getTenantRoleDefinitionById,
  getTenantRoleDefinitions,
  roleLoginMeta,
  type CanonicalRole,
} from "@/lib/roles";
import {
  generateTemporaryPassword,
  markForcePasswordChange,
  upsertCredentialAuthUser,
  validatePasswordPolicy,
} from "@/lib/password-access";
import { sendPlatformEmail, sendPlatformSms } from "@/lib/platform-integrations";
import { getTenantPortalUrl } from "@/lib/tenant-url";

export const runtime = "nodejs";

function buildLoginUrl(request: NextRequest, tenantSlug: string, portal: string, role: CanonicalRole) {
  const params = new URLSearchParams({ role });
  return `${getTenantPortalUrl(tenantSlug, request)}/${portal}?${params.toString()}`;
}

function accessEmailHtml(input: { name: string; schoolName?: string; loginUrl: string; email: string; temporaryPassword: string; roleName: string }) {
  return `
    <div style="font-family:Inter,Arial,sans-serif;background:#f6f7f9;padding:32px;color:#111827">
      <div style="max-width:640px;margin:auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:24px;padding:32px">
        <p style="margin:0 0 8px;color:#f97316;font-size:12px;font-weight:700;letter-spacing:.16em;text-transform:uppercase">Roxan Education System</p>
        <h1 style="margin:0 0 12px;font-size:26px">Your dashboard access is ready</h1>
        <p style="margin:0 0 20px;color:#4b5563">Hello ${input.name}, your ${input.roleName} account${input.schoolName ? ` for ${input.schoolName}` : ""} has been created.</p>
        <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:18px;padding:18px;margin-bottom:20px">
          <p style="margin:0 0 8px;font-weight:700">Temporary login details</p>
          <p style="margin:0;color:#4b5563">Email: <strong>${input.email}</strong></p>
          <p style="margin:8px 0 0;color:#4b5563">Temporary password: <strong>${input.temporaryPassword}</strong></p>
          <p style="margin:10px 0 0;color:#9a3412;font-size:13px">You must change this password after first login before entering the dashboard.</p>
        </div>
        <p style="margin:0">
          <a href="${input.loginUrl}" style="display:inline-block;background:#f97316;color:white;text-decoration:none;padding:12px 18px;border-radius:999px;font-weight:700">Open dashboard login</a>
        </p>
        <p style="margin:18px 0 0;color:#6b7280;font-size:13px;word-break:break-all">${input.loginUrl}</p>
      </div>
    </div>
  `;
}

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantSlug = searchParams.get("tenant")?.trim().toLowerCase();
    if (!tenantSlug) {
      return NextResponse.json({ error: "Tenant slug is required" }, { status: 400 });
    }

    const school = await masterDb
      .select({ id: schoolsTable.id, name: schoolsTable.name, type: schoolsTable.type })
      .from(schoolsTable)
      .where(eq(schoolsTable.slug, tenantSlug))
      .limit(1);
    if (!school.length) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const email = String(body.email || "").trim().toLowerCase();
    const name = String(body.name || "").trim();
    const roleId = String(body.roleId || "").trim();
    const departmentId = body.departmentId ? String(body.departmentId) : null;
    const phone = body.phone ? String(body.phone) : "";
    const requestedPassword = typeof body.temporaryPassword === "string" ? body.temporaryPassword : "";
    const temporaryPassword = requestedPassword || generateTemporaryPassword();

    if (!email || !name || !roleId) {
      return NextResponse.json({ error: "Email, name, and role are required" }, { status: 400 });
    }

    const passwordError = validatePasswordPolicy(temporaryPassword);
    if (passwordError) {
      return NextResponse.json({ error: passwordError }, { status: 400 });
    }

    const roleDefinitions = getTenantRoleDefinitions(school[0].type);
    const resolvedRole = getTenantRoleDefinitionById(roleId, school[0].type);
    if (!resolvedRole || !roleDefinitions.some((role) => role.id === resolvedRole.id)) {
      return NextResponse.json({ error: "Invalid role for this school portal" }, { status: 400 });
    }

    const tenantDb = await getTenantDbBySlug(tenantSlug);

    for (const role of roleDefinitions) {
      await tenantDb
        .insert(rolesTable)
        .values({ id: role.id, name: role.name, description: role.description, isSystem: role.isSystem })
        .onConflictDoNothing();
    }

    if (departmentId) {
      const department = await tenantDb
        .select({ id: departmentsTable.id })
        .from(departmentsTable)
        .where(eq(departmentsTable.id, departmentId))
        .limit(1);
      if (!department.length) {
        return NextResponse.json({ error: "Selected department was not found" }, { status: 400 });
      }
    }

    if (resolvedRole.canonicalRole === "owner") {
      const ownerRoleIds = roleDefinitions
        .filter((role) => role.canonicalRole === "owner")
        .map((role) => role.id);
      const owners = await tenantDb
        .select({ id: tenantUsersTable.id })
        .from(tenantUsersTable)
        .where(inArray(tenantUsersTable.roleId, ownerRoleIds));
      if (owners.length >= 2) {
        return NextResponse.json({ error: "A school can have at most 2 owner accounts" }, { status: 409 });
      }
    }

    const existingTenantUser = await tenantDb
      .select({ id: tenantUsersTable.id })
      .from(tenantUsersTable)
      .where(eq(tenantUsersTable.email, email))
      .limit(1);
    if (existingTenantUser.length) {
      return NextResponse.json({ error: "User with this email already exists in this school" }, { status: 409 });
    }

    const existingAuthUser = await masterDb
      .select({ id: userTable.id })
      .from(userTable)
      .where(eq(userTable.email, email))
      .limit(1);
    const userId = existingAuthUser[0]?.id || crypto.randomUUID();

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

    await markForcePasswordChange({
      userId,
      tenantSlug,
      reason: "tenant_user_staff_creation",
    });

    const loginUrl = buildLoginUrl(request, tenantSlug, resolvedRole.portal, resolvedRole.canonicalRole);
    const delivery = {
      email: await sendPlatformEmail({
        to: email,
        subject: `Your Roxan ${resolvedRole.name} access is ready`,
        html: accessEmailHtml({
          name,
          schoolName: school[0].name,
          loginUrl,
          email,
          temporaryPassword,
          roleName: resolvedRole.name,
        }),
        text: [
          `Hello ${name},`,
          `Your ${resolvedRole.name} account for ${school[0].name} has been created.`,
          `Login URL: ${loginUrl}`,
          `Email: ${email}`,
          `Temporary password: ${temporaryPassword}`,
          "You must change this password after first login before entering the dashboard.",
        ].join("\n"),
      }).catch((error) => ({
        ok: false,
        provider: "email",
        status: "failed",
        message: error instanceof Error ? error.message : "Email delivery failed.",
      })),
      sms: phone
        ? await sendPlatformSms({
            to: phone,
            body: `Roxan access ready. Login: ${loginUrl}. Email: ${email}. Temporary password: ${temporaryPassword}`,
          }).catch((error) => ({
            ok: false,
            provider: "twilio",
            status: "failed",
            message: error instanceof Error ? error.message : "SMS delivery failed.",
          }))
        : null,
    };

    return NextResponse.json({
      success: true,
      user: {
        id: userId,
        email,
        name,
        roleId: resolvedRole.id,
        role: resolvedRole.canonicalRole,
        dashboardPath: roleLoginMeta[resolvedRole.canonicalRole]?.redirectPath || resolvedRole.dashboardPath,
      },
      temporaryPassword,
      forcePasswordChange: true,
      loginUrl,
      delivery,
    });
  } catch (error) {
    console.error("Create tenant user with access failed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
