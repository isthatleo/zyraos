import crypto from "node:crypto";
import { eq, or } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { masterDb } from "@/lib/db";
import { auditLogsTable, platformAdminsTable, userTable } from "@/lib/db-schema";

export type MasterAdminContext = {
  adminId: string;
  userId: string;
  email: string;
  name: string;
  role: string;
};

export function getRequestIp(request: NextRequest) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    null
  );
}

export function forbiddenMasterResponse(message = "Super admin access is required") {
  return NextResponse.json({ error: message }, { status: 403 });
}

export async function getCurrentMasterAdmin(request: NextRequest): Promise<MasterAdminContext | null> {
  const session = await auth.api.getSession({ headers: request.headers });
  const sessionUser = session?.user;
  if (!sessionUser?.id) return null;

  const [user] = await masterDb
    .select({
      id: userTable.id,
      email: userTable.email,
      name: userTable.name,
      role: userTable.role,
    })
    .from(userTable)
    .where(eq(userTable.id, sessionUser.id))
    .limit(1);

  const email = String(user?.email || sessionUser.email || "").toLowerCase();
  const role = String(user?.role || "");
  if (role !== "super_admin") return null;

  const [platformAdmin] = email
    ? await masterDb
        .select()
        .from(platformAdminsTable)
        .where(or(eq(platformAdminsTable.id, sessionUser.id), eq(platformAdminsTable.email, email)))
        .limit(1)
    : await masterDb.select().from(platformAdminsTable).where(eq(platformAdminsTable.id, sessionUser.id)).limit(1);

  return {
    adminId: platformAdmin?.id || sessionUser.id,
    userId: sessionUser.id,
    email,
    name: platformAdmin?.name || user?.name || sessionUser.name || email || "Super Admin",
    role,
  };
}

export async function requireMasterAdmin(request: NextRequest) {
  const admin = await getCurrentMasterAdmin(request);
  if (!admin) return { admin: null, response: forbiddenMasterResponse() };
  return { admin, response: null };
}

export async function writeMasterAudit(
  request: NextRequest,
  input: {
    adminId?: string;
    action: string;
    resource: string;
    resourceId?: string | null;
    changes?: Record<string, unknown> | unknown[] | null;
    status?: "success" | "warning" | "failed" | "error";
  }
) {
  let adminId = input.adminId;
  if (!adminId) {
    const admin = await getCurrentMasterAdmin(request);
    adminId = admin?.adminId;
  }

  await masterDb.insert(auditLogsTable).values({
    id: crypto.randomUUID(),
    adminId: adminId || "system",
    action: input.action,
    resource: input.resource,
    resourceId: input.resourceId || null,
    changes: input.changes || {},
    ipAddress: getRequestIp(request),
    userAgent: request.headers.get("user-agent"),
    status: input.status || "success",
    createdAt: new Date(),
  });
}
