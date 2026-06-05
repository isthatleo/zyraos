import { NextRequest, NextResponse } from "next/server";
import { eq, ilike, or } from "drizzle-orm";

import { auth } from "@/lib/auth";
import { getTenantDbBySlug, masterDb } from "@/lib/db";
import { rolesTable, schoolsTable, tenantUsersTable, userTable } from "@/lib/db-schema";
import { normalizeRole } from "@/lib/roles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ResolvedTenantUser = {
  id: string;
  email: string;
  isActive: boolean | null;
  roleId: string | null;
  roleName: string | null;
};

function roleNameFromId(roleId: string) {
  return roleId.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function resolveCanonicalTenantRole(input: {
  tenantRoleId?: string | null;
  tenantRoleName?: string | null;
  masterRole?: string | null;
  sessionRole?: string | null;
}) {
  const tenantRole = String(input.tenantRoleId || input.tenantRoleName || "").trim().toLowerCase();
  const masterRole = String(input.masterRole || input.sessionRole || "").trim().toLowerCase();
  const masterCanonical = normalizeRole(masterRole);

  // Better Auth and early tenant bootstrap can leave tenant users as the generic "user".
  // In that case, the auth profile role is the canonical source of truth, like Joan's login flow.
  if ((tenantRole === "user" || !tenantRole) && masterRole && masterCanonical !== "student") {
    return masterCanonical;
  }

  return normalizeRole(input.tenantRoleId || input.tenantRoleName || input.masterRole || input.sessionRole);
}

async function syncTenantRoleIfNeeded(input: {
  tenantSlug: string;
  userId: string;
  currentRoleId?: string | null;
  canonicalRole: string;
}) {
  if (!input.canonicalRole || input.currentRoleId === input.canonicalRole) return;
  const tenantDb = await getTenantDbBySlug(input.tenantSlug);

  await tenantDb
    .insert(rolesTable)
    .values({
      id: input.canonicalRole,
      name: roleNameFromId(input.canonicalRole),
      description: `${roleNameFromId(input.canonicalRole)} system role`,
      isSystem: true,
    })
    .onConflictDoNothing();

  await tenantDb
    .update(tenantUsersTable)
    .set({ roleId: input.canonicalRole, updatedAt: new Date() })
    .where(eq(tenantUsersTable.id, input.userId));
}

async function findTenantUser(input: { tenantSlug: string; email: string; userId: string }) {
  try {
    const tenantDb = await getTenantDbBySlug(input.tenantSlug);
    const [tenantUser] = await tenantDb
      .select({
        id: tenantUsersTable.id,
        email: tenantUsersTable.email,
        isActive: tenantUsersTable.isActive,
        roleId: tenantUsersTable.roleId,
        roleName: rolesTable.name,
      })
      .from(tenantUsersTable)
      .leftJoin(rolesTable, eq(tenantUsersTable.roleId, rolesTable.id))
      .where(or(eq(tenantUsersTable.id, input.userId), ilike(tenantUsersTable.email, input.email)))
      .limit(1);

    if (tenantUser) {
      return { tenantUser: tenantUser as ResolvedTenantUser, source: "tenant" as const };
    }
  } catch (error) {
    console.warn("Tenant DB role lookup failed:", {
      tenantSlug: input.tenantSlug,
      userId: input.userId,
      error: error instanceof Error ? error.message : String(error),
    });
    return {
      tenantUser: null,
      source: "tenant" as const,
      lookupError: error instanceof Error ? error.message : "Tenant database lookup failed",
    };
  }

  return { tenantUser: null, source: "none" as const };
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers }).catch(() => null);
    if (!session?.user?.id || !session.user.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const tenantSlug = String(body.tenantSlug || "").trim().toLowerCase();
    const requestedRole = normalizeRole(String(body.requestedRole || ""));
    const email = String(body.email || session.user.email || "").trim().toLowerCase();

    if (!tenantSlug) {
      return NextResponse.json({ error: "Tenant slug is required" }, { status: 400 });
    }
    if (!email || email !== session.user.email.toLowerCase()) {
      return NextResponse.json({ error: "Signed-in account mismatch" }, { status: 403 });
    }

    const [school] = await masterDb
      .select({ id: schoolsTable.id, slug: schoolsTable.slug, status: schoolsTable.status })
      .from(schoolsTable)
      .where(eq(schoolsTable.slug, tenantSlug))
      .limit(1);

    if (!school) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }
    if (String(school.status || "").toLowerCase() !== "active") {
      return NextResponse.json({ error: "Tenant is not active" }, { status: 403 });
    }

    const [masterUser] = await masterDb
      .select({ id: userTable.id, email: userTable.email, role: userTable.role })
      .from(userTable)
      .where(or(eq(userTable.id, session.user.id), ilike(userTable.email, email)))
      .limit(1);

    const { tenantUser, source, lookupError } = await findTenantUser({
      tenantSlug,
      email,
      userId: session.user.id,
    });

    if (!tenantUser) {
      return NextResponse.json(
        {
          error: lookupError
            ? `Account does not belong to this tenant. Tenant lookup also failed: ${lookupError}`
            : "Account does not belong to this tenant",
        },
        { status: 403 }
      );
    }
    if (!tenantUser.isActive) {
      return NextResponse.json({ error: "This tenant account is inactive" }, { status: 403 });
    }

    const actualRole = resolveCanonicalTenantRole({
      tenantRoleId: tenantUser.roleId,
      tenantRoleName: tenantUser.roleName,
      masterRole: masterUser?.role,
      sessionRole: (session.user as { role?: string }).role,
    });
    await syncTenantRoleIfNeeded({
      tenantSlug,
      userId: tenantUser.id,
      currentRoleId: tenantUser.roleId,
      canonicalRole: actualRole,
    });

    if (requestedRole && actualRole !== requestedRole) {
      return NextResponse.json(
        {
          error: `This account is registered as ${actualRole.replace(/_/g, " ")}, not ${requestedRole.replace(/_/g, " ")}.`,
          role: actualRole,
        },
        { status: 403 }
      );
    }

    await masterDb
      .update(userTable)
      .set({ role: actualRole, updatedAt: new Date() })
      .where(eq(userTable.id, session.user.id));

    return NextResponse.json({
      ok: true,
      tenantSlug,
      role: actualRole,
      userId: session.user.id,
      source,
    });
  } catch (error) {
    console.error("Tenant role verification failed:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to verify tenant role",
      },
      { status: 500 }
    );
  }
}
