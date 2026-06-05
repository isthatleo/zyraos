import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";

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
  return { config: (await response.json()) as { authorization_endpoint: string }, credentials };
}

export async function GET(request: NextRequest) {
  try {
    const settings = await getPlatformSettings();
    if (asString(settings.ssoProvider, "disabled") === "disabled") {
      return NextResponse.json({ error: "SSO is disabled." }, { status: 400 });
    }

    const { config, credentials } = await discovery(settings);
    const state = crypto.randomUUID();
    const nonce = crypto.randomUUID();
    const returnTo = request.nextUrl.searchParams.get("returnTo") || "/";
    const redirectUri = new URL("/api/auth/sso/callback", request.nextUrl.origin).toString();
    const authUrl = new URL(config.authorization_endpoint);
    authUrl.searchParams.set("client_id", credentials.clientId);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("scope", process.env.SSO_SCOPES || "openid email profile");
    authUrl.searchParams.set("state", state);
    authUrl.searchParams.set("nonce", nonce);

    const response = NextResponse.redirect(authUrl);
    response.cookies.set("roxan_sso_state", state, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 600 });
    response.cookies.set("roxan_sso_nonce", nonce, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 600 });
    response.cookies.set("roxan_sso_return_to", returnTo, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 600 });
    return response;
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "SSO start failed." }, { status: 500 });
  }
}
