import net from "node:net";
import tls from "node:tls";
import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { sql } from "drizzle-orm";

import { getTenantDbBySlug } from "@/lib/db";
import { isTenantOwnerResponse, requireTenantOwner } from "@/lib/tenant-owner-auth";
import { revealSecret, type TenantSettingsVault } from "@/lib/tenant-settings-hardening";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Row = Record<string, unknown>;

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function asString(value: unknown) {
  return typeof value === "string" ? value : "";
}

async function fetchWithTimeout(url: string, init: RequestInit = {}, timeoutMs = 12000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function tcpCheck(host: string, port: number, secure: boolean) {
  return new Promise<{ ok: boolean; message: string }>((resolve) => {
    const socket = secure ? tls.connect({ host, port, servername: host }) : net.connect({ host, port });
    const timer = setTimeout(() => {
      socket.destroy();
      resolve({ ok: false, message: "Connection timed out." });
    }, 8000);
    socket.once("connect", () => {
      clearTimeout(timer);
      socket.destroy();
      resolve({ ok: true, message: "SMTP socket connected successfully." });
    });
    socket.once("secureConnect", () => {
      clearTimeout(timer);
      socket.destroy();
      resolve({ ok: true, message: "Secure SMTP socket connected successfully." });
    });
    socket.once("error", (error) => {
      clearTimeout(timer);
      resolve({ ok: false, message: error.message });
    });
  });
}

async function readSettingsAndVault(slug: string) {
  const tenantDb = await getTenantDbBySlug(slug);
  const [settingsRow] = (await tenantDb.execute(sql`select value from system_settings where key = ${`tenant_settings:${slug}`} limit 1`)).rows as Row[];
  const [vaultRow] = (await tenantDb.execute(sql`select value from system_settings where key = ${`tenant_settings_vault:${slug}`} limit 1`)).rows as Row[];
  return {
    tenantDb,
    settings: asRecord(settingsRow?.value),
    vault: asRecord(vaultRow?.value) as TenantSettingsVault,
  };
}

function credential(settings: Record<string, unknown>, vault: TenantSettingsVault, path: string) {
  const fromVault = revealSecret(vault, path);
  if (fromVault) return fromVault;
  return path.split(".").reduce<unknown>((current, key) => asRecord(current)[key], settings);
}

function providerCredentials(settings: Record<string, unknown>, vault: TenantSettingsVault, provider: string) {
  const publicKey = String(credential(settings, vault, `financeProviderCredentials.${provider}.publicKey`) || "");
  const secretKey = String(credential(settings, vault, `financeProviderCredentials.${provider}.secretKey`) || "");
  const row = asRecord(asRecord(settings.financeProviderCredentials)[provider]);
  return { publicKey, secretKey, webhookUrl: asString(row.webhookUrl), sandboxMode: Boolean(row.sandboxMode), liveMode: Boolean(row.liveMode) };
}

function flatCredential(settings: Record<string, unknown>, vault: TenantSettingsVault, path: string, envKey?: string) {
  return String(credential(settings, vault, path) || (envKey ? process.env[envKey] : "") || "");
}

async function awsSesRequest(settings: Record<string, unknown>, vault: TenantSettingsVault) {
  const accessKey = flatCredential(settings, vault, "awsSesAccessKeyId", "AWS_ACCESS_KEY_ID");
  const secretKey = flatCredential(settings, vault, "awsSesSecretAccessKey", "AWS_SECRET_ACCESS_KEY");
  const region = asString(settings.awsSesRegion) || process.env.AWS_REGION || "us-east-1";
  if (!accessKey || !secretKey) return { ok: false, provider: "awsSes", status: "missing_credentials", message: "AWS SES access key and secret key are required." };
  const service = "ses";
  const host = `email.${region}.amazonaws.com`;
  const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);
  const body = "Action=GetSendQuota&Version=2010-12-01";
  const canonicalRequest = `POST\n/\n\ncontent-type:application/x-www-form-urlencoded\nhost:${host}\nx-amz-date:${amzDate}\n\ncontent-type;host;x-amz-date\n${crypto.createHash("sha256").update(body).digest("hex")}`;
  const scope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = `AWS4-HMAC-SHA256\n${amzDate}\n${scope}\n${crypto.createHash("sha256").update(canonicalRequest).digest("hex")}`;
  const hmac = (key: Buffer | string, value: string) => crypto.createHmac("sha256", key).update(value).digest();
  const signingKey = hmac(hmac(hmac(hmac(`AWS4${secretKey}`, dateStamp), region), service), "aws4_request");
  const signature = crypto.createHmac("sha256", signingKey).update(stringToSign).digest("hex");
  const response = await fetchWithTimeout(`https://${host}/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "X-Amz-Date": amzDate,
      Authorization: `AWS4-HMAC-SHA256 Credential=${accessKey}/${scope}, SignedHeaders=content-type;host;x-amz-date, Signature=${signature}`,
    },
    body,
  });
  const text = await response.text().catch(() => "");
  return { ok: response.ok, provider: "awsSes", status: response.ok ? "healthy" : "failed", message: response.ok ? "AWS SES credentials are valid." : text || "AWS SES test failed." };
}

async function testProvider(provider: string, settings: Record<string, unknown>, vault: TenantSettingsVault) {
  if (provider === "resend") {
    const apiKey = String(credential(settings, vault, "resendApiKey") || process.env.RESEND_API_KEY || "");
    if (!apiKey) return { ok: false, provider, status: "missing_credentials", message: "Resend API key is required." };
    const response = await fetchWithTimeout("https://api.resend.com/domains?limit=1", { headers: { Authorization: `Bearer ${apiKey}` } });
    const data = await response.json().catch(() => ({}));
    return { ok: response.ok, provider, status: response.ok ? "healthy" : "failed", message: response.ok ? "Resend credentials are valid." : data.message || "Resend test failed." };
  }
  if (provider === "twilio") {
    const sid = asString(settings.twilioAccountSid) || process.env.TWILIO_ACCOUNT_SID || "";
    const token = String(credential(settings, vault, "twilioAuthToken") || process.env.TWILIO_AUTH_TOKEN || "");
    if (!sid || !token) return { ok: false, provider, status: "missing_credentials", message: "Twilio SID and auth token are required." };
    const response = await fetchWithTimeout(`https://api.twilio.com/2010-04-01/Accounts/${sid}.json`, { headers: { Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}` } });
    const data = await response.json().catch(() => ({}));
    return { ok: response.ok, provider, status: response.ok ? "healthy" : "failed", message: response.ok ? "Twilio credentials are valid." : data.message || "Twilio test failed." };
  }
  if (provider === "smtp") {
    const host = asString(settings.smtpHost || process.env.SMTP_HOST);
    const port = Number(settings.smtpPort || process.env.SMTP_PORT || 587);
    if (!host) return { ok: false, provider, status: "missing_credentials", message: "SMTP host is required." };
    const result = await tcpCheck(host, port, port === 465);
    return { ok: result.ok, provider, status: result.ok ? "healthy" : "failed", message: result.message };
  }
  if (provider === "sendgrid") {
    const apiKey = flatCredential(settings, vault, "sendgridApiKey", "SENDGRID_API_KEY");
    if (!apiKey) return { ok: false, provider, status: "missing_credentials", message: "SendGrid API key is required." };
    const response = await fetchWithTimeout("https://api.sendgrid.com/v3/scopes", { headers: { Authorization: `Bearer ${apiKey}` } });
    const data = await response.json().catch(() => ({}));
    return { ok: response.ok, provider, status: response.ok ? "healthy" : "failed", message: response.ok ? "SendGrid credentials are valid." : data.errors?.[0]?.message || "SendGrid test failed." };
  }
  if (provider === "mailgun") {
    const apiKey = flatCredential(settings, vault, "mailgunApiKey", "MAILGUN_API_KEY");
    const domain = asString(settings.mailgunDomain) || process.env.MAILGUN_DOMAIN || "";
    const region = asString(settings.mailgunRegion).toUpperCase() === "EU" ? "api.eu.mailgun.net" : "api.mailgun.net";
    if (!apiKey || !domain) return { ok: false, provider, status: "missing_credentials", message: "Mailgun API key and domain are required." };
    const response = await fetchWithTimeout(`https://${region}/v3/domains/${domain}`, { headers: { Authorization: `Basic ${Buffer.from(`api:${apiKey}`).toString("base64")}` } });
    const data = await response.json().catch(() => ({}));
    return { ok: response.ok, provider, status: response.ok ? "healthy" : "failed", message: response.ok ? "Mailgun credentials are valid." : data.message || "Mailgun test failed." };
  }
  if (provider === "awsSes") return awsSesRequest(settings, vault);
  if (provider === "paystack") {
    const creds = providerCredentials(settings, vault, "paystack");
    const secretKey = creds.secretKey || asString(settings.paystackSecretKey);
    if (!secretKey) return { ok: false, provider, status: "missing_credentials", message: "Paystack secret key is required." };
    const response = await fetchWithTimeout("https://api.paystack.co/bank", { headers: { Authorization: `Bearer ${secretKey}` } });
    const data = await response.json().catch(() => ({}));
    return { ok: response.ok, provider, status: response.ok ? "healthy" : "failed", message: response.ok ? "Paystack credentials are valid." : data.message || "Paystack test failed." };
  }
  if (provider === "flutterwave") {
    const creds = providerCredentials(settings, vault, "flutterwave");
    if (!creds.secretKey) return { ok: false, provider, status: "missing_credentials", message: "Flutterwave secret key is required." };
    const response = await fetchWithTimeout("https://api.flutterwave.com/v3/banks/NG", { headers: { Authorization: `Bearer ${creds.secretKey}` } });
    const data = await response.json().catch(() => ({}));
    return { ok: response.ok, provider, status: response.ok ? "healthy" : "failed", message: response.ok ? "Flutterwave credentials are valid." : data.message || "Flutterwave test failed." };
  }
  if (provider === "stripe") {
    const creds = providerCredentials(settings, vault, "stripe");
    if (!creds.secretKey) return { ok: false, provider, status: "missing_credentials", message: "Stripe secret key is required." };
    const response = await fetchWithTimeout("https://api.stripe.com/v1/balance", { headers: { Authorization: `Bearer ${creds.secretKey}` } });
    const data = await response.json().catch(() => ({}));
    return { ok: response.ok, provider, status: response.ok ? "healthy" : "failed", message: response.ok ? "Stripe credentials are valid." : data.error?.message || "Stripe test failed." };
  }
  if (provider === "mobileMoney") {
    const creds = providerCredentials(settings, vault, "mobileMoney");
    const ok = Boolean(creds.publicKey && creds.secretKey && creds.webhookUrl);
    return { ok, provider, status: ok ? "configured" : "missing_credentials", message: ok ? "Mobile Money credentials are stored and webhook URL is configured." : "Mobile Money public key, secret key, and webhook URL are required." };
  }
  if (provider === "cashBankTransfer") {
    const creds = providerCredentials(settings, vault, "cashBankTransfer");
    return { ok: true, provider, status: "configured", message: creds.webhookUrl ? "Cash/bank transfer instructions and webhook URL are configured." : "Cash/bank transfer is enabled as an offline provider." };
  }
  if (provider === "africasTalking") {
    const username = asString(settings.africasTalkingUsername);
    const apiKey = flatCredential(settings, vault, "africasTalkingApiKey", "AFRICAS_TALKING_API_KEY");
    if (!username || !apiKey) return { ok: false, provider, status: "missing_credentials", message: "Africa's Talking username and API key are required." };
    const response = await fetchWithTimeout("https://api.africastalking.com/version1/user", { headers: { apiKey, Accept: "application/json" } });
    const data = await response.json().catch(() => ({}));
    return { ok: response.ok, provider, status: response.ok ? "healthy" : "failed", message: response.ok ? "Africa's Talking credentials are valid." : data.errorMessage || "Africa's Talking test failed." };
  }
  if (provider === "hubtel") {
    const clientId = asString(settings.hubtelClientId);
    const clientSecret = flatCredential(settings, vault, "hubtelClientSecret", "HUBTEL_CLIENT_SECRET");
    if (!clientId || !clientSecret) return { ok: false, provider, status: "missing_credentials", message: "Hubtel client id and client secret are required." };
    const response = await fetchWithTimeout("https://smsc.hubtel.com/v1/messages/send", { method: "HEAD", headers: { Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}` } });
    return { ok: response.status !== 401 && response.status !== 403, provider, status: response.status !== 401 && response.status !== 403 ? "configured" : "failed", message: response.status !== 401 && response.status !== 403 ? "Hubtel credentials are configured." : "Hubtel rejected the credentials." };
  }
  if (provider === "termii") {
    const apiKey = flatCredential(settings, vault, "termiiApiKey", "TERMII_API_KEY");
    if (!apiKey) return { ok: false, provider, status: "missing_credentials", message: "Termii API key is required." };
    const response = await fetchWithTimeout(`https://api.ng.termii.com/api/get-balance?api_key=${encodeURIComponent(apiKey)}`);
    const data = await response.json().catch(() => ({}));
    return { ok: response.ok && !data.error, provider, status: response.ok && !data.error ? "healthy" : "failed", message: response.ok && !data.error ? "Termii credentials are valid." : data.message || "Termii test failed." };
  }
  if (provider === "customSms") {
    const endpoint = asString(settings.customSmsEndpoint);
    const apiKey = flatCredential(settings, vault, "customSmsApiKey");
    if (!endpoint || !apiKey) return { ok: false, provider, status: "missing_credentials", message: "Custom SMS endpoint and API key are required." };
    const response = await fetchWithTimeout(endpoint, { method: "HEAD", headers: { Authorization: `Bearer ${apiKey}` } });
    return { ok: response.ok || response.status === 405, provider, status: response.ok || response.status === 405 ? "healthy" : "failed", message: response.ok || response.status === 405 ? "Custom SMS endpoint responded." : `Custom SMS endpoint returned HTTP ${response.status}.` };
  }
  if (provider === "sso") {
    const issuer = asString(settings.ssoIssuerUrl).replace(/\/$/, "");
    const clientId = asString(settings.ssoClientId);
    const clientSecret = flatCredential(settings, vault, "ssoClientSecret");
    if (!issuer || !clientId || !clientSecret) return { ok: false, provider, status: "missing_credentials", message: "SSO issuer URL, client ID, and client secret are required." };
    const response = await fetchWithTimeout(`${issuer}/.well-known/openid-configuration`);
    const data = await response.json().catch(() => ({}));
    return { ok: response.ok && Boolean(data.authorization_endpoint), provider, status: response.ok ? "healthy" : "failed", message: response.ok ? "SSO discovery document loaded." : data.error || "SSO discovery failed." };
  }
  if (provider === "googleOAuth") {
    const clientId = asString(settings.googleClientId);
    const clientSecret = flatCredential(settings, vault, "googleClientSecret");
    return { ok: Boolean(clientId && clientSecret), provider, status: clientId && clientSecret ? "configured" : "missing_credentials", message: clientId && clientSecret ? "Google OAuth credentials are stored." : "Google client ID and secret are required." };
  }
  if (provider === "microsoftOAuth") {
    const clientId = asString(settings.microsoftClientId);
    const clientSecret = flatCredential(settings, vault, "microsoftClientSecret");
    const tenantId = asString(settings.microsoftTenantId) || "common";
    if (!clientId || !clientSecret) return { ok: false, provider, status: "missing_credentials", message: "Microsoft client ID and secret are required." };
    const response = await fetchWithTimeout(`https://login.microsoftonline.com/${tenantId}/v2.0/.well-known/openid-configuration`);
    return { ok: response.ok, provider, status: response.ok ? "healthy" : "failed", message: response.ok ? "Microsoft OAuth discovery document loaded." : "Microsoft OAuth discovery failed." };
  }
  if (provider === "lms") {
    const url = asString(settings.lmsUrl).replace(/\/$/, "");
    const apiKey = flatCredential(settings, vault, "lmsApiKey", "LMS_API_KEY");
    if (!url || !apiKey) return { ok: false, provider, status: "missing_credentials", message: "LMS URL and API key are required." };
    const response = await fetchWithTimeout(`${url}/health`, { headers: { Authorization: `Bearer ${apiKey}` } }).catch(() => null);
    const fallback = response && response.status !== 404 ? response : await fetchWithTimeout(url, { headers: { Authorization: `Bearer ${apiKey}` } });
    return { ok: fallback.ok, provider, status: fallback.ok ? "healthy" : "failed", message: fallback.ok ? "LMS endpoint responded." : `LMS returned HTTP ${fallback.status}.` };
  }
  if (provider === "webhook") {
    const url = asString(settings.webhookUrl);
    const secret = flatCredential(settings, vault, "webhookSigningSecret");
    if (!url) return { ok: false, provider, status: "missing_credentials", message: "Webhook URL is required." };
    const body = JSON.stringify({ event: "settings.test", sentAt: new Date().toISOString() });
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (secret) headers["X-Roxan-Signature"] = `sha256=${crypto.createHmac("sha256", secret).update(body).digest("hex")}`;
    const response = await fetchWithTimeout(url, { method: "POST", headers, body });
    return { ok: response.ok, provider, status: response.ok ? "healthy" : "failed", message: response.ok ? "Webhook delivered." : `Webhook returned HTTP ${response.status}.` };
  }
  return { ok: false, provider, status: "failed", message: "Unsupported provider." };
}

export async function POST(request: NextRequest) {
  try {
    const slug = request.nextUrl.searchParams.get("tenant")?.trim().toLowerCase();
    if (!slug) return NextResponse.json({ error: "Tenant slug is required" }, { status: 400 });
    const currentUser = await requireTenantOwner(request, slug);
    if (isTenantOwnerResponse(currentUser)) return currentUser;
    const body = await request.json().catch(() => ({}));
    const provider = String(body.provider || "");
    const { tenantDb, settings, vault } = await readSettingsAndVault(slug);
    const result = await testProvider(provider, settings, vault);
    await tenantDb.execute(sql`
      insert into audit_logs (id, admin_id, action, resource, resource_id, changes, ip_address, user_agent, status, created_at)
      values (${crypto.randomUUID()}, ${currentUser.userId}, 'Settings Provider Test', 'tenant_settings_provider', ${provider}, ${JSON.stringify(result)}::jsonb, ${request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || null}, ${request.headers.get("user-agent")}, ${result.ok ? "success" : "failed"}, now())
    `);
    return NextResponse.json({ ...result, checkedAt: new Date().toISOString() }, { status: result.ok ? 200 : 400 });
  } catch (error) {
    console.error("Tenant settings provider test failed:", error);
    return NextResponse.json({ error: "Failed to test provider" }, { status: 500 });
  }
}
