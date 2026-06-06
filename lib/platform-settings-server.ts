import { eq } from "drizzle-orm";
import crypto from "node:crypto";

import { masterDb } from "@/lib/db";
import { systemSettingsTable } from "@/lib/db-schema";
import type { PublicPlatformSettings } from "@/lib/platform-settings-sync";

export const PLATFORM_SETTING_DEFAULTS = {
  platformName: "Roxan Education Operations System",
  platformShortName: "Roxan",
  platformSubtitle: "Education System",
  supportEmail: "hello@roxan.com",
  supportPhone: "+27 21 123 4567",
  companyAddress: "Cape Town, South Africa",
  timezone: "Africa/Johannesburg",
  currency: "ZAR",
  announcementBanner: "",
  tenantBrandingLock: false,
  sessionTimeout: "60",
  maintenanceMode: false,
  auditRetentionDays: "365",
  backupFrequency: "daily",
  retentionPeriod: "30",
  autoOptimize: true,
  tenantBackupPolicy: "daily",
  exportFormat: "csv",
  emailAlerts: true,
  smsAlerts: false,
  inAppAlerts: true,
  webhookUrl: "",
  incidentDigestFrequency: "daily",
  ownerSeatLimit: "2",
  defaultSchoolStatus: "active",
  trialDays: "14",
  autoProvisionModules: true,
  allowTenantSelfService: true,
  tenantUrlMode: "auto",
  tenantDatabaseMode: "shared",
  tenantDatabaseUrlTemplate: "",
  tenantNeonParentBranchId: "",
  tenantNeonDatabaseName: "neondb",
  tenantNeonRoleName: "neondb_owner",
  tenantNeonPooledConnections: true,
  provisioningEmailSupportCopy: false,
  invoicePrefix: "ROX",
  invoiceDueDays: "14",
  taxLabel: "VAT",
  taxRate: "0",
  paymentGraceDays: "7",
  autoSuspendOverdueTenants: false,
  subscriptionRenewalNoticeDays: "14",
  allowPlanDowngrades: true,
  proratePlanChanges: true,
  enforceModuleEntitlements: true,
  dataResidencyRegion: "africa",
  privacyContactEmail: "privacy@roxan.com",
  requireDpaAcceptance: true,
  studentDataExportApproval: true,
  anonymizeDeletedUsers: true,
  apiAccessEnabled: true,
  webhookSigningEnabled: true,
  allowedWebhookDomains: "",
  resendApiKey: "",
  twilioAccountSid: "",
  twilioAuthToken: "",
  twilioFromNumber: "",
  webhookSigningSecret: "",
  ssoProvider: "disabled",
  ssoIssuerUrl: "",
  ssoClientId: "",
  ssoClientSecret: "",
  lmsIntegrationMode: "disabled",
  lmsApiUrl: "",
  lmsApiKey: "",
  neonApiKey: "",
  neonProjectId: "",
  neonBranchId: "",
  defaultLanguage: "en",
  dateFormat: "dd MMM yyyy",
  timeFormat: "12h",
  firstDayOfWeek: "monday",
  automationEnabled: true,
  nightlyJobWindow: "02:00-04:00",
  autoArchiveGraduatedStudents: false,
  autoNotifyInactiveTenants: true,
} as const;

export type PlatformSettings = typeof PLATFORM_SETTING_DEFAULTS & Record<string, unknown>;

const PUBLIC_SETTING_KEYS = [
  "platformName",
  "platformShortName",
  "platformSubtitle",
  "supportEmail",
  "supportPhone",
  "timezone",
  "currency",
  "announcementBanner",
  "tenantBrandingLock",
  "sessionTimeout",
  "maintenanceMode",
  "ownerSeatLimit",
  "trialDays",
  "privacyContactEmail",
  "defaultLanguage",
  "dateFormat",
  "timeFormat",
  "firstDayOfWeek",
] as const;

export const SECRET_SETTING_KEYS = new Set([
  "smtpPassword",
  "resendApiKey",
  "twilioAccountSid",
  "twilioAuthToken",
  "webhookSigningSecret",
  "ssoClientSecret",
  "lmsApiKey",
  "neonApiKey",
  "tenantDatabaseUrlTemplate",
]);

type EncryptedSecret = {
  __encrypted: "platform-setting:v1";
  iv: string;
  tag: string;
  data: string;
};

function encryptionKey() {
  const source = process.env.PLATFORM_SETTINGS_ENCRYPTION_KEY || process.env.BETTER_AUTH_SECRET || process.env.AUTH_SECRET || "";
  if (!source) return null;
  return crypto.createHash("sha256").update(source).digest();
}

function isEncryptedSecret(value: unknown): value is EncryptedSecret {
  return Boolean(value && typeof value === "object" && (value as Record<string, unknown>).__encrypted === "platform-setting:v1");
}

export function encryptPlatformSecret(value: unknown) {
  const plaintext = asString(value);
  if (!plaintext || plaintext === "********") return value;
  const key = encryptionKey();
  if (!key) return plaintext;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const data = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return {
    __encrypted: "platform-setting:v1",
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
    data: data.toString("base64"),
  } satisfies EncryptedSecret;
}

export function decryptPlatformSecret(value: unknown) {
  if (!isEncryptedSecret(value)) return value;
  const key = encryptionKey();
  if (!key) return "";
  try {
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(value.iv, "base64"));
    decipher.setAuthTag(Buffer.from(value.tag, "base64"));
    return Buffer.concat([decipher.update(Buffer.from(value.data, "base64")), decipher.final()]).toString("utf8");
  } catch {
    return "";
  }
}

export function normalizePlatformSettingValue(key: string, value: unknown) {
  return SECRET_SETTING_KEYS.has(key) ? decryptPlatformSecret(value) : value;
}

export async function getPlatformSettings(): Promise<PlatformSettings> {
  const rows = await masterDb.select().from(systemSettingsTable);
  const settings: Record<string, unknown> = { ...PLATFORM_SETTING_DEFAULTS };
  for (const row of rows) {
    settings[row.key] = normalizePlatformSettingValue(row.key, row.value);
  }
  return settings as PlatformSettings;
}

export async function getPlatformSetting(key: keyof typeof PLATFORM_SETTING_DEFAULTS) {
  const [row] = await masterDb
    .select({ value: systemSettingsTable.value })
    .from(systemSettingsTable)
    .where(eq(systemSettingsTable.key, key))
    .limit(1);
  return row ? normalizePlatformSettingValue(String(key), row.value) : PLATFORM_SETTING_DEFAULTS[key];
}

export function getPublicPlatformSettings(settings: Record<string, unknown>): PublicPlatformSettings {
  const payload: PublicPlatformSettings = {};
  for (const key of PUBLIC_SETTING_KEYS) {
    (payload as Record<string, unknown>)[key] = settings[key] ?? PLATFORM_SETTING_DEFAULTS[key];
  }
  payload.updatedAt = new Date().toISOString();
  return payload;
}

export function maskPlatformSecrets(settings: Record<string, unknown>) {
  const masked = { ...settings };
  for (const key of SECRET_SETTING_KEYS) {
    if (masked[key]) masked[key] = "********";
  }
  return masked;
}

export function asBoolean(value: unknown, fallback = false) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return ["true", "1", "yes", "on"].includes(value.toLowerCase());
  if (typeof value === "number") return value > 0;
  return fallback;
}

export function asNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function asString(value: unknown, fallback = "") {
  const resolved = value == null ? fallback : String(value);
  return resolved.trim();
}

export function getInvoicePolicy(settings: Record<string, unknown>) {
  const prefix = asString(settings.invoicePrefix, PLATFORM_SETTING_DEFAULTS.invoicePrefix).toUpperCase() || "ROX";
  const dueDays = Math.max(1, asNumber(settings.invoiceDueDays, 14));
  const currency = asString(settings.currency, PLATFORM_SETTING_DEFAULTS.currency).toUpperCase() || "ZAR";
  const taxLabel = asString(settings.taxLabel, PLATFORM_SETTING_DEFAULTS.taxLabel);
  const taxRate = Math.max(0, asNumber(settings.taxRate, 0));
  return { prefix, dueDays, currency, taxLabel, taxRate };
}

export function buildInvoiceNumber(prefix: string) {
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const unique = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${prefix}-${stamp}-${Date.now().toString().slice(-6)}-${unique}`;
}

export function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}
