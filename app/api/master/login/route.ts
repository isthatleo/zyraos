import { NextRequest, NextResponse } from "next/server";
import { eq, ilike, or } from "drizzle-orm";

import { masterDb } from "@/lib/db";
import { platformAdminsTable, userTable } from "@/lib/db-schema";
import { getRequestIp, writeMasterAudit } from "@/lib/master-audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type LoginAttemptState = { count: number; firstAttemptAt: number; lockedUntil?: number };

const loginAttempts = new Map<string, LoginAttemptState>();
const RATE_WINDOW_MS = 15 * 60 * 1000;
const LOCKOUT_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 5;

function getClientIp(request: NextRequest, fallback?: string) {
  return fallback || getRequestIp(request) || "unknown";
}

function loginKey(email: string, ipAddress: string) {
  return `${email}:${ipAddress}`;
}

function getAttemptState(key: string) {
  const now = Date.now();
  const current = loginAttempts.get(key);
  if (!current || now - current.firstAttemptAt > RATE_WINDOW_MS) {
    const fresh: LoginAttemptState = { count: 0, firstAttemptAt: now };
    loginAttempts.set(key, fresh);
    return fresh;
  }
  return current;
}

function recordFailedAttempt(key: string) {
  const state = getAttemptState(key);
  state.count += 1;
  if (state.count >= MAX_ATTEMPTS) {
    state.lockedUntil = Date.now() + LOCKOUT_MS;
  }
  loginAttempts.set(key, state);
  return state;
}

function clearAttempts(key: string) {
  loginAttempts.delete(key);
}

async function assertMasterAccount(email: string) {
  const [user] = await masterDb
    .select({ id: userTable.id, email: userTable.email, name: userTable.name, role: userTable.role })
    .from(userTable)
    .where(ilike(userTable.email, email))
    .limit(1);

  if (!user || user.role !== "super_admin") return null;

  const [platformAdmin] = await masterDb
    .select({ id: platformAdminsTable.id, email: platformAdminsTable.email })
    .from(platformAdminsTable)
    .where(or(eq(platformAdminsTable.id, user.id), ilike(platformAdminsTable.email, email)))
    .limit(1);

  if (!platformAdmin) return null;
  return user;
}

async function signInWithBetterAuth(request: NextRequest, email: string, password: string) {
  const authUrl = new URL("/api/auth/sign-in/email", request.nextUrl.origin);
  const origin = request.headers.get("origin") || request.nextUrl.origin;
  return fetch(authUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin,
      referer: request.headers.get("referer") || `${origin}/master/login`,
      cookie: request.headers.get("cookie") || "",
      "user-agent": request.headers.get("user-agent") || "",
      "x-forwarded-for": request.headers.get("x-forwarded-for") || "",
      "x-real-ip": request.headers.get("x-real-ip") || "",
    },
    body: JSON.stringify({ email, password }),
    cache: "no-store",
  });
}

function copySetCookieHeaders(from: Response, to: NextResponse) {
  const headersWithGetSetCookie = from.headers as Headers & { getSetCookie?: () => string[] };
  const cookies = headersWithGetSetCookie.getSetCookie?.() || [];
  if (cookies.length) {
    for (const cookie of cookies) to.headers.append("set-cookie", cookie);
    return;
  }

  const cookie = from.headers.get("set-cookie");
  if (cookie) to.headers.append("set-cookie", cookie);
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  const sessionId = String(body.sessionId || crypto.randomUUID());
  const ipAddress = getClientIp(request, typeof body.ipAddress === "string" ? body.ipAddress : undefined);

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
  }

  const key = loginKey(email, ipAddress);
  const attemptState = getAttemptState(key);
  if (attemptState.lockedUntil && attemptState.lockedUntil > Date.now()) {
    return NextResponse.json(
      {
        error: "Account is temporarily locked. Try again later.",
        lockoutUntil: new Date(attemptState.lockedUntil).toISOString(),
      },
      { status: 429 }
    );
  }

  const masterUser = await assertMasterAccount(email);
  if (!masterUser) {
    const failed = recordFailedAttempt(key);
    await writeMasterAudit(request, {
      action: "master_login_denied",
      resource: "master_auth",
      resourceId: email,
      changes: { reason: "not_super_admin", attempts: failed.count },
      status: "failed",
    }).catch(() => null);
    return NextResponse.json({ error: "Invalid super admin credentials" }, { status: 401 });
  }

  const authResponse = await signInWithBetterAuth(request, email, password);
  if (!authResponse.ok) {
    const failed = recordFailedAttempt(key);
    const payload = await authResponse.json().catch(() => ({}));
    await writeMasterAudit(request, {
      adminId: masterUser.id,
      action: "master_login_failed",
      resource: "master_auth",
      resourceId: masterUser.id,
      changes: { attempts: failed.count, ipAddress },
      status: "failed",
    }).catch(() => null);

    return NextResponse.json(
      { error: payload?.message || payload?.error || "Invalid super admin credentials" },
      { status: authResponse.status === 429 ? 429 : 401 }
    );
  }

  clearAttempts(key);
  await writeMasterAudit(request, {
    adminId: masterUser.id,
    action: "master_login_success",
    resource: "master_auth",
    resourceId: masterUser.id,
    changes: { sessionId, ipAddress },
  }).catch(() => null);

  const response = NextResponse.json({
    success: true,
    message: "Authentication successful",
    sessionId,
    user: {
      id: masterUser.id,
      email: masterUser.email,
      name: masterUser.name,
      role: masterUser.role,
    },
  });
  copySetCookieHeaders(authResponse, response);
  response.headers.set("Cache-Control", "no-store");
  return response;
}
