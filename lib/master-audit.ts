import crypto from "node:crypto";
import { and, eq, gt, or } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { masterDb } from "@/lib/db";
import { auditLogsTable, platformAdminsTable, sessionTable, userTable } from "@/lib/db-schema";
import { getCachedValue, setCachedValue } from "@/lib/server-response-cache";

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

function unsignedSessionToken(value?: string | null) {
  if (!value) return null;
  const decoded = decodeURIComponent(value);
  return decoded.split(".")[0] || null;
}

export async function getCurrentMasterAdmin(request: NextRequest): Promise<MasterAdminContext | null> {
  const sessionToken = request.cookies.get("better-auth.session_token")?.value;
  const tokenCacheKey = sessionToken ? `master-admin-token:${crypto.createHash("sha256").update(sessionToken).digest("hex")}` : null;
  if (tokenCacheKey) {
    const cached = getCachedValue<MasterAdminContext>(tokenCacheKey);
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
  const session = directSessionUser ? { user: directSessionUser } : await auth.api.getSession({ headers: request.headers });
  const sessionUser = session?.user;
  if (!sessionUser?.id) return null;

  const [user] = directSessionUser
    ? [directSessionUser]
    : await masterDb
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

  const context = {
    adminId: platformAdmin?.id || sessionUser.id,
    userId: sessionUser.id,
    email,
    name: platformAdmin?.name || user?.name || sessionUser.name || email || "Super Admin",
    role,
  } satisfies MasterAdminContext;
  if (tokenCacheKey) setCachedValue(tokenCacheKey, context, 30_000);
  return context;
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
