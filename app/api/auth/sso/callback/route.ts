import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { eq } from "drizzle-orm";

import { masterDb } from "@/lib/db";
import { passwordSecurityTable, platformAdminsTable, sessionTable, tenantUsersTable, userTable } from "@/lib/db-schema";
import { normalizeRole, roleLoginMeta, type CanonicalRole } from "@/lib/roles";
import { asString, getPlatformSettings } from "@/lib/platform-settings-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getSsoCredentials(settings: Record<string, unknown>) {
  const issuerUrl = asString(settings.ssoIssuerUrl) || process.env.SSO_ISSUER_URL || "";
  const clientId = asString(settings.ssoClientId) || process.env.SSO_CLIENT_ID || "";
  const clientSecret = asString(settings.ssoClientSecret) && settings.ssoClientSecret !== "********" ? asString(settings.ssoClientSecret) : process.env.SSO_CLIENT_SECRET || "";
  return { issuerUrl, clientId, clientSecret };
}

async function discovery(settings: Record<string, unknown>) {
  const credentials = getSsoCredentials(settings);
  if (!credentials.issuerUrl || !credentials.clientId || !credentials.clientSecret) {
    throw new Error("SSO issuer URL, client ID, and client secret are required.");
  }
  const issuer = credentials.issuerUrl.replace(/\/$/, "");
  const response = await fetch(`${issuer}/.well-known/openid-configuration`, { cache: "no-store" });
  if (!response.ok) throw new Error("Unable to load SSO OIDC discovery document.");
  return { config: (await response.json()) as { token_endpoint: string; userinfo_endpoint?: string }, credentials };
}

function signCookieValue(value: string, secret: string) {
  const signature = crypto.createHmac("sha256", secret).update(value).digest("base64");
  return `${value}.${signature}`;
}

function getTenantSlugFromPath(path: string) {
  const parts = path.split("/").filter(Boolean);
  if (!parts.length || parts[0] === "master" || parts[0] === "api") return null;
  return parts[0];
}

function safeReturnTo(value: string, fallback: string) {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/api/")) return fallback;
  return value;
}

function tenantRedirect(tenantSlug: string | null, role: CanonicalRole, returnTo: string) {
  if (role === "super_admin") return "/master/dashboard";
  if (returnTo && returnTo !== "/" && returnTo !== "/master/dashboard") return returnTo;
  if (!tenantSlug) return roleLoginMeta[role].redirectPath;
  return `/${tenantSlug}${roleLoginMeta[role].redirectPath}`;
}

async function resolveSsoUser(profile: Record<string, unknown>, returnTo: string) {
  const email = asString(profile.email).toLowerCase();
  if (!email) {
    return { error: "The SSO provider did not return an email address." };
  }

  const [platformAdmin] = await masterDb.select().from(platformAdminsTable).where(eq(platformAdminsTable.email, email)).limit(1);
  let [user] = await masterDb.select().from(userTable).where(eq(userTable.email, email)).limit(1);

  if (platformAdmin) {
    if (!user) {
      const [created] = await masterDb
        .insert(userTable)
        .values({
          id: platformAdmin.id || crypto.randomUUID(),
          email,
          name: platformAdmin.name || asString(profile.name, email),
          image: asString(profile.picture) || asString(profile.image) || null,
          role: "super_admin",
          emailVerified: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();
      user = created;
    } else if (user.role !== "super_admin" || !user.emailVerified) {
      const [updated] = await masterDb
        .update(userTable)
        .set({
          role: "super_admin",
          emailVerified: true,
          name: user.name || platformAdmin.name || asString(profile.name, email),
          image: user.image || asString(profile.picture) || asString(profile.image) || null,
          updatedAt: new Date(),
        })
        .where(eq(userTable.id, user.id))
        .returning();
      user = updated;
    }
    return { user, role: "super_admin" as CanonicalRole, tenantSlug: null };
  }

  if (!user) {
    return { error: "No Roxan user exists for this SSO email address. Ask an administrator to create the user first." };
  }

  const [tenantUser] = await masterDb.select().from(tenantUsersTable).where(eq(tenantUsersTable.email, email)).limit(1);
  if (tenantUser && !tenantUser.isActive) {
    return { error: "This tenant user is inactive." };
  }

  if (!user.emailVerified || !user.name || !user.image) {
    const [updated] = await masterDb
      .update(userTable)
      .set({
        emailVerified: true,
        name: user.name || asString(profile.name, email),
        image: user.image || asString(profile.picture) || asString(profile.image) || null,
        updatedAt: new Date(),
      })
      .where(eq(userTable.id, user.id))
      .returning();
    user = updated;
  }

  const [passwordSecurity] = await masterDb
    .select({ tenantSlug: passwordSecurityTable.tenantSlug })
    .from(passwordSecurityTable)
    .where(eq(passwordSecurityTable.userId, user.id))
    .limit(1);
  const role = normalizeRole(user.role);
  const tenantSlug = getTenantSlugFromPath(returnTo) || passwordSecurity?.tenantSlug || null;
  return { user, role, tenantSlug };
}

async function createApplicationSession(userId: string, request: NextRequest) {
  const token = crypto.randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const [session] = await masterDb
    .insert(sessionTable)
    .values({
      id: crypto.randomUUID(),
      token,
      userId,
      expiresAt,
      ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "",
      userAgent: request.headers.get("user-agent") || "",
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();
  return session;
}

export async function GET(request: NextRequest) {
  try {
    const settings = await getPlatformSettings();
    if (asString(settings.ssoProvider, "disabled") === "disabled") {
      return NextResponse.json({ error: "SSO is disabled." }, { status: 400 });
    }

    const expectedState = request.cookies.get("roxan_sso_state")?.value;
    const state = request.nextUrl.searchParams.get("state");
    const code = request.nextUrl.searchParams.get("code");
    if (!code || !state || !expectedState || state !== expectedState) {
      return NextResponse.json({ error: "Invalid SSO callback state." }, { status: 400 });
    }

    const { config, credentials } = await discovery(settings);
    const redirectUri = new URL("/api/auth/sso/callback", request.nextUrl.origin).toString();
    const tokenResponse = await fetch(config.token_endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${credentials.clientId}:${credentials.clientSecret}`).toString("base64")}`,
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      }),
    });
    const tokens = await tokenResponse.json().catch(() => ({}));
    if (!tokenResponse.ok) {
      return NextResponse.json({ error: tokens?.error_description || tokens?.error || "SSO token exchange failed." }, { status: 400 });
    }

    let profile: Record<string, unknown> = {};
    if (config.userinfo_endpoint && tokens.access_token) {
      const userInfoResponse = await fetch(config.userinfo_endpoint, {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });
      profile = await userInfoResponse.json().catch(() => ({}));
    }

    const rawReturnTo = request.cookies.get("roxan_sso_return_to")?.value || "/";
    const returnTo = safeReturnTo(rawReturnTo, "/");
    const resolved = await resolveSsoUser(profile, returnTo);
    if ("error" in resolved) {
      return NextResponse.json({ error: resolved.error }, { status: 403 });
    }

    const session = await createApplicationSession(resolved.user.id, request);
    const redirectPath = tenantRedirect(resolved.tenantSlug, resolved.role, returnTo);
    const response = NextResponse.redirect(new URL(redirectPath, request.nextUrl.origin));
    const signedToken = signCookieValue(session.token, process.env.BETTER_AUTH_SECRET || "");
    response.cookies.set("better-auth.session_token", signedToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
    });
    response.cookies.delete("roxan_sso_state");
    response.cookies.delete("roxan_sso_nonce");
    response.cookies.delete("roxan_sso_return_to");
    response.cookies.delete("roxan_sso_profile");
    return response;
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "SSO callback failed." }, { status: 500 });
  }
}
