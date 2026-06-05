import crypto from "node:crypto";

export type TenantSettingsVault = Record<string, string>;
export type ValidationIssue = { field: string; message: string; severity: "error" | "warning" };

const SECRET_PATHS = [
  "resendApiKey",
  "smtpPassword",
  "sendgridApiKey",
  "mailgunApiKey",
  "awsSesAccessKeyId",
  "awsSesSecretAccessKey",
  "twilioAuthToken",
  "africasTalkingApiKey",
  "hubtelClientSecret",
  "termiiApiKey",
  "customSmsApiKey",
  "ssoClientSecret",
  "googleClientSecret",
  "microsoftClientSecret",
  "lmsApiKey",
  "lmsWebhookSecret",
  "webhookSigningSecret",
  "paystackPublicKey",
  "paystackSecretKey",
  "financeProviderCredentials.paystack.publicKey",
  "financeProviderCredentials.paystack.secretKey",
  "financeProviderCredentials.flutterwave.publicKey",
  "financeProviderCredentials.flutterwave.secretKey",
  "financeProviderCredentials.stripe.publicKey",
  "financeProviderCredentials.stripe.secretKey",
  "financeProviderCredentials.mobileMoney.publicKey",
  "financeProviderCredentials.mobileMoney.secretKey",
  "financeProviderCredentials.cashBankTransfer.publicKey",
  "financeProviderCredentials.cashBankTransfer.secretKey",
];

const MASK = "********";

function keyMaterial() {
  const secret = process.env.TENANT_SETTINGS_SECRET || process.env.BETTER_AUTH_SECRET || process.env.AUTH_SECRET || "roxan-local-development-secret";
  return crypto.createHash("sha256").update(secret).digest();
}

function getPath(input: Record<string, unknown>, path: string) {
  return path.split(".").reduce<unknown>((current, key) => {
    if (!current || typeof current !== "object" || Array.isArray(current)) return undefined;
    return (current as Record<string, unknown>)[key];
  }, input);
}

function setPath(input: Record<string, unknown>, path: string, value: unknown) {
  const parts = path.split(".");
  let current = input;
  parts.slice(0, -1).forEach((part) => {
    const next = current[part];
    if (!next || typeof next !== "object" || Array.isArray(next)) current[part] = {};
    current = current[part] as Record<string, unknown>;
  });
  current[parts[parts.length - 1]] = value;
}

export function encryptSecret(value: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", keyMaterial(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString("base64")}:${tag.toString("base64")}:${encrypted.toString("base64")}`;
}

export function decryptSecret(value?: string) {
  if (!value?.startsWith("v1:")) return "";
  const [, iv, tag, encrypted] = value.split(":");
  const decipher = crypto.createDecipheriv("aes-256-gcm", keyMaterial(), Buffer.from(iv, "base64"));
  decipher.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(encrypted, "base64")), decipher.final()]).toString("utf8");
}

export function extractAndMaskSecrets(settings: Record<string, unknown>, currentVault: TenantSettingsVault = {}) {
  const nextSettings = structuredClone(settings) as Record<string, unknown>;
  const nextVault: TenantSettingsVault = { ...currentVault };
  for (const path of SECRET_PATHS) {
    const value = getPath(nextSettings, path);
    if (typeof value !== "string") continue;
    if (!value || value === MASK || value.includes("...")) {
      if (nextVault[path]) setPath(nextSettings, path, MASK);
      continue;
    }
    nextVault[path] = encryptSecret(value);
    setPath(nextSettings, path, MASK);
  }
  return { settings: nextSettings, vault: nextVault };
}

export function hydrateMaskedSecrets(settings: Record<string, unknown>, vault: TenantSettingsVault = {}) {
  const next = structuredClone(settings) as Record<string, unknown>;
  for (const path of SECRET_PATHS) {
    if (vault[path]) setPath(next, path, MASK);
  }
  return next;
}

export function revealSecret(vault: TenantSettingsVault, path: string) {
  return decryptSecret(vault[path]);
}

export function validateTenantSettings(settings: Record<string, unknown>): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const required = ["schoolName", "schoolCode", "email", "phone", "country", "currency"];
  for (const field of required) {
    if (!String(settings[field] || "").trim()) issues.push({ field, severity: "error", message: `${field} is required.` });
  }
  const emailFields = ["email", "supportEmail", "ownerEmail"];
  for (const field of emailFields) {
    const value = String(settings[field] || "").trim();
    if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) issues.push({ field, severity: "error", message: `${field} must be a valid email address.` });
  }
  for (const field of ["website", "logoUrl", "faviconUrl", "schoolSealUrl", "reportCardWatermarkUrl", "emailHeaderLogoUrl", "loginScreenLogoUrl", "mobileAppLogoUrl", "lmsUrl", "webhookUrl", "customSmsEndpoint"]) {
    const value = String(settings[field] || "").trim();
    if (!value) continue;
    try {
      if (value.startsWith("/")) continue;
      new URL(value);
    } catch {
      issues.push({ field, severity: "error", message: `${field} must be a valid URL or site-relative path.` });
    }
  }
  for (const field of ["primaryColor", "secondaryColor", "accentColor", "successColor", "warningColor", "errorColor"]) {
    const value = String(settings[field] || "").trim();
    if (value && !/^#[0-9a-fA-F]{6}$/.test(value)) issues.push({ field, severity: "error", message: `${field} must be a 6-digit hex color.` });
  }
  const passwordMinLength = Number(settings.passwordMinLength || 0);
  if (passwordMinLength < 8) issues.push({ field: "passwordMinLength", severity: "error", message: "Password minimum length must be at least 8." });
  const timeout = Number(settings.sessionTimeoutMinutes || 0);
  if (timeout < 5) issues.push({ field: "sessionTimeoutMinutes", severity: "error", message: "Session timeout must be at least 5 minutes." });
  const taxRate = Number((settings.financePaymentInvoice as Record<string, unknown> | undefined)?.taxRate ?? 0);
  if (taxRate < 0 || taxRate > 100) issues.push({ field: "financePaymentInvoice.taxRate", severity: "error", message: "Tax rate must be between 0 and 100." });
  if (settings.smtpEnabled && !String(settings.smtpHost || "").trim()) issues.push({ field: "smtpHost", severity: "error", message: "SMTP host is required when SMTP is enabled." });
  if (settings.sendgridEnabled && !String(settings.sendgridApiKey || "").trim()) issues.push({ field: "sendgridApiKey", severity: "error", message: "SendGrid API key is required when SendGrid is enabled." });
  if (settings.mailgunEnabled && (!String(settings.mailgunApiKey || "").trim() || !String(settings.mailgunDomain || "").trim())) issues.push({ field: "mailgunApiKey", severity: "error", message: "Mailgun API key and domain are required when Mailgun is enabled." });
  if (settings.awsSesEnabled && (!String(settings.awsSesAccessKeyId || "").trim() || !String(settings.awsSesSecretAccessKey || "").trim())) issues.push({ field: "awsSesAccessKeyId", severity: "error", message: "AWS SES access key and secret key are required when AWS SES is enabled." });
  if (settings.lmsEnabled && (!String(settings.lmsUrl || "").trim() || !String(settings.lmsApiKey || "").trim())) issues.push({ field: "lmsUrl", severity: "error", message: "LMS URL and API key are required when LMS integration is enabled." });
  if (settings.webhookSigningEnabled && String(settings.webhookUrl || "").trim() && !String(settings.webhookSigningSecret || "").trim()) issues.push({ field: "webhookSigningSecret", severity: "warning", message: "Webhook signing is enabled, but no signing secret is configured." });
  return issues;
}

export const tenantSecretPaths = SECRET_PATHS;
export const maskedSecretValue = MASK;
