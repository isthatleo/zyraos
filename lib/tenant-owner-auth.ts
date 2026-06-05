import { and, eq, ilike, or } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { getTenantDbBySlug, masterDb } from "@/lib/db";
import { rolesTable, tenantUsersTable, userTable } from "@/lib/db-schema";
import { normalizeRole } from "@/lib/roles";

export type TenantOwnerContext = {
  userId: string;
  email: string;
  name: string;
  role: "owner";
  tenantRoleId: string;
  tenantRoleName: string;
};

export async function requireTenantOwner(request: NextRequest, tenantSlug: string): Promise<TenantOwnerContext | NextResponse> {
  const session = await auth.api.getSession({ headers: request.headers }).catch(() => null);
  if (!session?.user?.id || !session.user.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const email = session.user.email.toLowerCase();
  const [masterUser] = await masterDb
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

  if (!tenantUser) {
    return NextResponse.json({ error: "Signed-in account does not belong to this tenant" }, { status: 403 });
  }
  if (!tenantUser.isActive) {
    return NextResponse.json({ error: "This tenant owner account is inactive" }, { status: 403 });
  }

  const roleCandidates = [
    (session.user as { role?: string }).role,
    masterUser?.role,
    tenantUser.roleId,
    tenantUser.roleName,
  ];
  const isOwner = roleCandidates.some((role) => normalizeRole(role) === "owner");
  if (!isOwner) {
    return NextResponse.json({ error: "Only active tenant owners can access this owner page" }, { status: 403 });
  }

  return {
    userId: tenantUser.id,
    email: tenantUser.email,
    name: tenantUser.name || masterUser?.name || session.user.name || tenantUser.email,
    role: "owner",
    tenantRoleId: tenantUser.roleId,
    tenantRoleName: tenantUser.roleName || tenantUser.roleId,
  };
}

export function isTenantOwnerResponse(value: TenantOwnerContext | NextResponse): value is NextResponse {
  return value instanceof NextResponse;
}
