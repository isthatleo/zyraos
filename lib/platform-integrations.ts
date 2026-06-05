import crypto from "node:crypto";

import { asBoolean, asNumber, asString, getPlatformSettings } from "@/lib/platform-settings-server";

type IntegrationResult<T = unknown> = {
  ok: boolean;
  provider: string;
  status: "configured" | "disabled" | "missing_credentials" | "healthy" | "failed";
  message: string;
  data?: T;
  checkedAt: string;
};

type EmailPayload = {
  to: string;
  subject: string;
  html?: string;
  text?: string;
};

type SmsPayload = {
  to: string;
  body: string;
};

type WebhookPayload = {
  event: string;
  payload: Record<string, unknown>;
};

const now = () => new Date().toISOString();

function result<T>(input: Omit<IntegrationResult<T>, "checkedAt">): IntegrationResult<T> {
  return { ...input, checkedAt: now() };
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

function configuredEnv(keys: string[]) {
  return keys.every((key) => Boolean(process.env[key]));
}

function secretSetting(settings: Record<string, unknown>, key: string, envKey: string) {
  const value = asString(settings[key]);
  return value && value !== "********" ? value : process.env[envKey] || "";
}

function base64Basic(username: string, password: string) {
  return Buffer.from(`${username}:${password}`).toString("base64");
}

function redact(value?: string | null) {
  if (!value) return null;
  if (value.length <= 8) return "********";
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

export async function getEmailProviderStatus(): Promise<IntegrationResult> {
  const settings = await getPlatformSettings();
  if (!asBoolean(settings.emailNotifications, true)) {
    return result({ ok: true, provider: "email", status: "disabled", message: "Email notifications are disabled." });
  }

  const resendApiKey = secretSetting(settings, "resendApiKey", "RESEND_API_KEY");
  if (resendApiKey) {
    try {
      const response = await fetchWithTimeout("https://api.resend.com/domains?limit=1", {
        headers: { Authorization: `Bearer ${resendApiKey}` },
      });
      const data = await response.json().catch(() => ({}));
      return result({
        ok: response.ok,
        provider: "resend",
        status: response.ok ? "healthy" : "failed",
        message: response.ok ? "Resend API credentials are valid." : data?.message || "Resend API health check failed.",
        data: { from: asString(settings.emailFrom, "noreply@roxan.com"), apiKey: redact(resendApiKey) },
      });
    } catch (error) {
      return result({ ok: false, provider: "resend", status: "failed", message: error instanceof Error ? error.message : "Resend health check failed." });
    }
  }

  const hasSmtp = Boolean(asString(settings.smtpHost) && asString(settings.smtpUsername) && asString(settings.smtpPassword) && settings.smtpPassword !== "********");
  return result({
    ok: hasSmtp,
    provider: "smtp",
    status: hasSmtp ? "configured" : "missing_credentials",
    message: hasSmtp
      ? "SMTP credentials are stored. Install an SMTP transport such as nodemailer to send through SMTP."
      : "No live email provider credentials are configured. Add a Resend API key or complete SMTP credentials.",
  });
}

export async function sendPlatformEmail(payload: EmailPayload): Promise<IntegrationResult<{ id?: string }>> {
  const settings = await getPlatformSettings();
  if (!asBoolean(settings.emailNotifications, true)) {
    return result({ ok: false, provider: "email", status: "disabled", message: "Email notifications are disabled." });
  }
  const resendApiKey = secretSetting(settings, "resendApiKey", "RESEND_API_KEY");
  if (!resendApiKey) {
    return result({ ok: false, provider: "resend", status: "missing_credentials", message: "A Resend API key is required to send live email." });
  }
  if (!payload.to || !payload.subject || (!payload.html && !payload.text)) {
    return result({ ok: false, provider: "resend", status: "failed", message: "Recipient, subject, and email content are required." });
  }

  const response = await fetchWithTimeout("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: `${asString(settings.emailFromName, "Roxan Education System")} <${asString(settings.emailFrom, "noreply@roxan.com")}>`,
      to: [payload.to],
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
    }),
  });
  const data = await response.json().catch(() => ({}));
  return result({
    ok: response.ok,
    provider: "resend",
    status: response.ok ? "healthy" : "failed",
    message: response.ok ? "Email sent." : data?.message || "Email send failed.",
    data: { id: data?.id },
  });
}

export async function getSmsProviderStatus(): Promise<IntegrationResult> {
  const settings = await getPlatformSettings();
  if (!asBoolean(settings.smsAlerts, false)) {
    return result({ ok: true, provider: "sms", status: "disabled", message: "SMS alerts are disabled." });
  }
  const accountSid = secretSetting(settings, "twilioAccountSid", "TWILIO_ACCOUNT_SID");
  const authToken = secretSetting(settings, "twilioAuthToken", "TWILIO_AUTH_TOKEN");
  const fromNumber = asString(settings.twilioFromNumber) || process.env.TWILIO_FROM_NUMBER || "";
  if (!accountSid || !authToken || !fromNumber) {
    return result({
      ok: false,
      provider: "twilio",
      status: "missing_credentials",
      message: "Twilio account SID, auth token, and sender number are required.",
    });
  }

  const response = await fetchWithTimeout(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}.json`, {
    headers: { Authorization: `Basic ${base64Basic(accountSid, authToken)}` },
  });
  const data = await response.json().catch(() => ({}));
  return result({
    ok: response.ok,
    provider: "twilio",
    status: response.ok ? "healthy" : "failed",
    message: response.ok ? "Twilio credentials are valid." : data?.message || "Twilio health check failed.",
    data: { accountSid: redact(accountSid), from: redact(fromNumber) },
  });
}

export async function sendPlatformSms(payload: SmsPayload): Promise<IntegrationResult<{ sid?: string }>> {
  const settings = await getPlatformSettings();
  const accountSid = secretSetting(settings, "twilioAccountSid", "TWILIO_ACCOUNT_SID");
  const authToken = secretSetting(settings, "twilioAuthToken", "TWILIO_AUTH_TOKEN");
  const fromNumber = asString(settings.twilioFromNumber) || process.env.TWILIO_FROM_NUMBER || "";
  if (!accountSid || !authToken || !fromNumber) {
    return result({ ok: false, provider: "twilio", status: "missing_credentials", message: "Twilio credentials are required to send SMS." });
  }
  if (!payload.to || !payload.body) {
    return result({ ok: false, provider: "twilio", status: "failed", message: "Recipient phone number and message body are required." });
  }

  const response = await fetchWithTimeout(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${base64Basic(accountSid, authToken)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      To: payload.to,
      From: fromNumber,
      Body: payload.body,
    }),
  });
  const data = await response.json().catch(() => ({}));
  return result({
    ok: response.ok,
    provider: "twilio",
    status: response.ok ? "healthy" : "failed",
    message: response.ok ? "SMS sent." : data?.message || "SMS send failed.",
    data: { sid: data?.sid },
  });
}

export async function deliverPlatformWebhook(input: WebhookPayload): Promise<IntegrationResult<{ statusCode?: number }>> {
  const settings = await getPlatformSettings();
  const webhookUrl = asString(settings.webhookUrl);
  if (!webhookUrl) {
    return result({ ok: false, provider: "webhook", status: "missing_credentials", message: "No webhook URL is configured." });
  }

  let parsed: URL;
  try {
    parsed = new URL(webhookUrl);
  } catch {
    return result({ ok: false, provider: "webhook", status: "failed", message: "Configured webhook URL is invalid." });
  }

  const allowedDomains = asString(settings.allowedWebhookDomains)
    .split(",")
    .map((domain) => domain.trim().toLowerCase())
    .filter(Boolean);
  if (allowedDomains.length && !allowedDomains.some((domain) => parsed.hostname === domain || parsed.hostname.endsWith(`.${domain}`))) {
    return result({ ok: false, provider: "webhook", status: "failed", message: `Webhook domain ${parsed.hostname} is not allowed.` });
  }

  const body = JSON.stringify({
    id: crypto.randomUUID(),
    event: input.event,
    payload: input.payload,
    sentAt: now(),
  });
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "User-Agent": "Roxan-Platform-Webhook/1.0",
  };
  if (asBoolean(settings.webhookSigningEnabled, true)) {
    const secret = secretSetting(settings, "webhookSigningSecret", "WEBHOOK_SIGNING_SECRET") || process.env.BETTER_AUTH_SECRET;
    if (!secret) {
      return result({ ok: false, provider: "webhook", status: "missing_credentials", message: "WEBHOOK_SIGNING_SECRET or BETTER_AUTH_SECRET is required for signed webhooks." });
    }
    headers["X-Roxan-Signature"] = `sha256=${crypto.createHmac("sha256", secret).update(body).digest("hex")}`;
  }

  const response = await fetchWithTimeout(webhookUrl, { method: "POST", headers, body });
  const text = await response.text().catch(() => "");
  return result({
    ok: response.ok,
    provider: "webhook",
    status: response.ok ? "healthy" : "failed",
    message: response.ok ? "Webhook delivered." : text || `Webhook returned HTTP ${response.status}.`,
    data: { statusCode: response.status },
  });
}

export async function getSsoProviderStatus(): Promise<IntegrationResult> {
  const settings = await getPlatformSettings();
  const provider = asString(settings.ssoProvider, "disabled");
  if (provider === "disabled") {
    return result({ ok: true, provider: "sso", status: "disabled", message: "SSO is disabled." });
  }
  const issuerUrl = asString(settings.ssoIssuerUrl) || process.env.SSO_ISSUER_URL || "";
  const clientId = asString(settings.ssoClientId) || process.env.SSO_CLIENT_ID || "";
  const clientSecret = secretSetting(settings, "ssoClientSecret", "SSO_CLIENT_SECRET");
  if (!issuerUrl || !clientId || !clientSecret) {
    return result({ ok: false, provider, status: "missing_credentials", message: "SSO_ISSUER_URL, SSO_CLIENT_ID, and SSO_CLIENT_SECRET are required." });
  }
  const issuer = issuerUrl.replace(/\/$/, "");
  const response = await fetchWithTimeout(`${issuer}/.well-known/openid-configuration`);
  const data = await response.json().catch(() => ({}));
  return result({
    ok: response.ok && Boolean(data.authorization_endpoint && data.token_endpoint),
    provider,
    status: response.ok ? "healthy" : "failed",
    message: response.ok ? "OIDC discovery loaded." : data?.error_description || data?.error || "SSO discovery failed.",
    data: {
      issuer: data.issuer,
      authorizationEndpoint: data.authorization_endpoint,
      tokenEndpoint: data.token_endpoint ? "configured" : "missing",
      userinfoEndpoint: data.userinfo_endpoint ? "configured" : "missing",
    },
  });
}

export async function getLmsProviderStatus(): Promise<IntegrationResult> {
  const settings = await getPlatformSettings();
  const mode = asString(settings.lmsIntegrationMode, "disabled");
  if (mode === "disabled") {
    return result({ ok: true, provider: "lms", status: "disabled", message: "LMS integration is disabled." });
  }
  const apiUrl = asString(settings.lmsApiUrl) || process.env.LMS_API_URL || "";
  const apiKey = secretSetting(settings, "lmsApiKey", "LMS_API_KEY");
  if (!apiUrl || !apiKey) {
    return result({ ok: false, provider: mode, status: "missing_credentials", message: "LMS_API_URL and LMS_API_KEY are required." });
  }
  const baseUrl = apiUrl.replace(/\/$/, "");
  const response = await fetchWithTimeout(`${baseUrl}/health`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  }).catch(() => null);
  const fallbackResponse =
    response && response.status !== 404
      ? response
      : await fetchWithTimeout(baseUrl, { headers: { Authorization: `Bearer ${apiKey}` } });
  const data = await fallbackResponse.json().catch(() => ({}));
  return result({
    ok: fallbackResponse.ok,
    provider: mode,
    status: fallbackResponse.ok ? "healthy" : "failed",
    message: fallbackResponse.ok ? "LMS endpoint responded successfully." : data?.message || `LMS returned HTTP ${fallbackResponse.status}.`,
    data: { statusCode: fallbackResponse.status },
  });
}

function neonCredentials(settings: Record<string, unknown>) {
  return {
    apiKey: secretSetting(settings, "neonApiKey", "NEON_API_KEY"),
    projectId: asString(settings.neonProjectId) || process.env.NEON_PROJECT_ID || "",
    branchId: asString(settings.neonBranchId) || process.env.NEON_BRANCH_ID || "",
  };
}

async function neonRequest(path: string, apiKey: string, init: RequestInit = {}) {
  return fetchWithTimeout(`https://console.neon.tech/api/v2${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${apiKey}`,
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(init.headers || {}),
    },
  });
}

export async function getNeonBackupStatus(): Promise<IntegrationResult> {
  const settings = await getPlatformSettings();
  const { apiKey, projectId, branchId } = neonCredentials(settings);
  if (!apiKey || !projectId || !branchId) {
    return result({
      ok: false,
      provider: "neon",
      status: "missing_credentials",
      message: "NEON_API_KEY, NEON_PROJECT_ID, and NEON_BRANCH_ID are required for live Neon snapshots.",
    });
  }
  const [snapshotsResponse, scheduleResponse] = await Promise.all([
    neonRequest(`/projects/${projectId}/snapshots`, apiKey),
    neonRequest(`/projects/${projectId}/branches/${branchId}/backup_schedule`, apiKey),
  ]);
  const snapshots = await snapshotsResponse.json().catch(() => ({}));
  const schedule = await scheduleResponse.json().catch(() => ({}));
  return result({
    ok: snapshotsResponse.ok && scheduleResponse.ok,
    provider: "neon",
    status: snapshotsResponse.ok && scheduleResponse.ok ? "healthy" : "failed",
    message: snapshotsResponse.ok && scheduleResponse.ok ? "Neon snapshot API is reachable." : "Neon backup status check failed.",
    data: {
      snapshots: snapshots?.snapshots || [],
      schedule,
    },
  });
}

export async function createNeonSnapshot(name?: string): Promise<IntegrationResult> {
  const settings = await getPlatformSettings();
  const { apiKey, projectId, branchId } = neonCredentials(settings);
  if (!apiKey || !projectId || !branchId) {
    return result({
      ok: false,
      provider: "neon",
      status: "missing_credentials",
      message: "NEON_API_KEY, NEON_PROJECT_ID, and NEON_BRANCH_ID are required for live Neon snapshots.",
    });
  }
  const retentionDays = Math.max(1, asNumber(settings.retentionPeriod, 30));
  const expiresAt = new Date(Date.now() + retentionDays * 86400000).toISOString();
  const params = new URLSearchParams({
    name: name || `roxan-manual-${new Date().toISOString().slice(0, 10)}`,
    expires_at: expiresAt,
  });
  const response = await neonRequest(`/projects/${projectId}/branches/${branchId}/snapshot?${params.toString()}`, apiKey, {
    method: "POST",
  });
  const data = await response.json().catch(() => ({}));
  return result({
    ok: response.ok,
    provider: "neon",
    status: response.ok ? "healthy" : "failed",
    message: response.ok ? "Neon snapshot created." : data?.message || "Neon snapshot creation failed.",
    data,
  });
}

export async function updateNeonBackupSchedule(): Promise<IntegrationResult> {
  const settings = await getPlatformSettings();
  const { apiKey, projectId, branchId } = neonCredentials(settings);
  if (!apiKey || !projectId || !branchId) {
    return result({
      ok: false,
      provider: "neon",
      status: "missing_credentials",
      message: "NEON_API_KEY, NEON_PROJECT_ID, and NEON_BRANCH_ID are required for live Neon backup schedules.",
    });
  }
  const frequency = asString(settings.backupFrequency, "daily");
  const retentionSeconds = Math.max(3600, asNumber(settings.retentionPeriod, 30) * 86400);
  const hour = Number(asString(settings.nightlyJobWindow, "02:00-04:00").split(":")[0]) || 2;
  const response = await neonRequest(`/projects/${projectId}/branches/${branchId}/backup_schedule`, apiKey, {
    method: "PUT",
    body: JSON.stringify({
      schedule: [
        {
          frequency,
          hour,
          retention_seconds: retentionSeconds,
        },
      ],
    }),
  });
  const data = await response.json().catch(() => ({}));
  return result({
    ok: response.ok,
    provider: "neon",
    status: response.ok ? "healthy" : "failed",
    message: response.ok ? "Neon backup schedule updated." : data?.message || "Neon backup schedule update failed.",
    data,
  });
}
