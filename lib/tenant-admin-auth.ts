import crypto from "node:crypto";

import { and, eq, gt, ilike, or } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { getTenantDbBySlug, masterDb } from "@/lib/db";
import { rolesTable, sessionTable, tenantUsersTable, userTable } from "@/lib/db-schema";
import { normalizeRole } from "@/lib/roles";
import { getCachedValue, setCachedValue } from "@/lib/server-response-cache";

export type TenantAdminContext = {
  userId: string;
  email: string;
  name: string;
  role: "owner" | "school_admin";
  tenantRoleId: string;
  tenantRoleName: string;
};

const allowedTenantAdminRoles = new Set(["owner", "school_admin"]);

function unsignedSessionToken(value?: string | null) {
  if (!value) return null;
  const decoded = decodeURIComponent(value);
  return decoded.split(".")[0] || null;
}

export async function requireTenantAdmin(request: NextRequest, tenantSlug: string): Promise<TenantAdminContext | NextResponse> {
  const sessionToken = request.cookies.get("better-auth.session_token")?.value;
  const tokenCacheKey = sessionToken ? `tenant-admin-token:${tenantSlug}:${crypto.createHash("sha256").update(sessionToken).digest("hex")}` : null;
  if (tokenCacheKey) {
    const cached = getCachedValue<TenantAdminContext>(tokenCacheKey);
    if (cached) return cached;
  }

  const rawToken = unsignedSessionToken(sessionToken);
  const [directSessionUser] = rawToken
    ? await masterDb
        .select({ id: userTable.id, email: userTable.email, name: userTable.name, role: userTable.role })
        .from(sessionTable)
        .innerJoin(userTable, eq(sessionTable.userId, userTable.id))
        .where(and(eq(sessionTable.token, rawToken), gt(sessionTable.expiresAt, new Date())))
        .limit(1)
    : [];

  const session = directSessionUser ? { user: directSessionUser } : await auth.api.getSession({ headers: request.headers }).catch(() => null);
  if (!session?.user?.id || !session.user.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const email = session.user.email.toLowerCase();
  const cacheKey = `tenant-admin-auth:${tenantSlug}:${session.user.id}:${email}`;
  const cached = getCachedValue<TenantAdminContext>(cacheKey);
  if (cached) return cached;

  const [masterUser] = directSessionUser
    ? [directSessionUser]
    : await masterDb
        .select({ id: userTable.id, email: userTable.email, name: userTable.name, role: userTable.role })
        .from(userTable)
        .where(or(eq(userTable.id, session.user.id), ilike(userTable.email, email)))
        .limit(1);

  const tenantDb = await getTenantDbBySlug(tenantSlug);
  const [tenantUser] = await tenantDb
    .select({
      id: tenantUsersTable.id,
      email: tenantUsersTable.email,
      name: tenantUsersTable.name,
      isActive: tenantUsersTable.isActive,
      roleId: tenantUsersTable.roleId,
      roleName: rolesTable.name,
    })
    .from(tenantUsersTable)
    .leftJoin(rolesTable, eq(tenantUsersTable.roleId, rolesTable.id))
    .where(or(eq(tenantUsersTable.id, session.user.id), ilike(tenantUsersTable.email, email)))
    .limit(1);

  if (!tenantUser) return NextResponse.json({ error: "Signed-in account does not belong to this tenant" }, { status: 403 });
  if (!tenantUser.isActive) return NextResponse.json({ error: "This tenant account is inactive" }, { status: 403 });

  const roleCandidates = [(session.user as { role?: string }).role, masterUser?.role, tenantUser.roleId, tenantUser.roleName];
  const role = roleCandidates.map((item) => normalizeRole(item)).find((item) => allowedTenantAdminRoles.has(item)) as TenantAdminContext["role"] | undefined;
  if (!role) return NextResponse.json({ error: "Only active tenant owners and school admins can access this page" }, { status: 403 });

  const context = {
    userId: tenantUser.id,
    email: tenantUser.email,
    name: tenantUser.name || masterUser?.name || session.user.name || tenantUser.email,
    role,
    tenantRoleId: tenantUser.roleId,
    tenantRoleName: tenantUser.roleName || tenantUser.roleId,
  } satisfies TenantAdminContext;
  setCachedValue(cacheKey, context, 30_000);
  if (tokenCacheKey) setCachedValue(tokenCacheKey, context, 30_000);
  return context;
}

export function isTenantAdminResponse(value: TenantAdminContext | NextResponse): value is NextResponse {
  return value instanceof NextResponse;
}
