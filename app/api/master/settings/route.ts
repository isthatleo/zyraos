import { NextRequest, NextResponse } from "next/server";
import { sql } from "drizzle-orm";

import { masterDb } from "@/lib/db";
import { auditLogsTable, schoolsTable, systemSettingsTable } from "@/lib/db-schema";
import type { PublicPlatformSettings } from "@/lib/platform-settings-sync";
import { getRequestIp, requireMasterAdmin } from "@/lib/master-audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SettingDefinition = {
  key: string;
  category: string;
  description: string;
  defaultValue: string | boolean | number;
  public?: boolean;
  secret?: boolean;
};

const DEFINITIONS: SettingDefinition[] = [
  { key: "platformName", category: "general", description: "Full platform product name.", defaultValue: "Roxan Education Operations System", public: true },
  { key: "platformShortName", category: "general", description: "Short brand name used in compact dashboard surfaces.", defaultValue: "Roxan", public: true },
  { key: "platformSubtitle", category: "general", description: "Default brand subtitle shown across dashboards.", defaultValue: "Education System", public: true },
  { key: "supportEmail", category: "general", description: "Primary platform support email address.", defaultValue: "hello@roxan.com", public: true },
  { key: "supportPhone", category: "general", description: "Primary platform support phone number.", defaultValue: "+27 21 123 4567", public: true },
  { key: "companyAddress", category: "general", description: "Platform operating address.", defaultValue: "Cape Town, South Africa", public: true },
  { key: "timezone", category: "general", description: "Default timezone for new schools and reports.", defaultValue: "Africa/Johannesburg", public: true },
  { key: "currency", category: "general", description: "Default platform currency for new school provisions.", defaultValue: "ZAR", public: true },
  { key: "announcementBanner", category: "general", description: "Optional platform-wide banner message.", defaultValue: "", public: true },
  { key: "tenantBrandingLock", category: "general", description: "Prevent tenants from overriding platform branding.", defaultValue: false, public: true },

  { key: "smtpHost", category: "email", description: "Transactional email SMTP hostname.", defaultValue: "smtp.gmail.com" },
  { key: "smtpPort", category: "email", description: "Transactional email SMTP port.", defaultValue: "587" },
  { key: "smtpUsername", category: "email", description: "Transactional email SMTP username.", defaultValue: "" },
  { key: "smtpPassword", category: "email", description: "Transactional email SMTP password or API secret.", defaultValue: "", secret: true },
  { key: "resendApiKey", category: "email", description: "Resend API key for production transactional email.", defaultValue: "", secret: true },
  { key: "emailFrom", category: "email", description: "Default sender email address.", defaultValue: "noreply@roxan.com" },
  { key: "emailFromName", category: "email", description: "Default sender display name.", defaultValue: "Roxan Education System" },
  { key: "emailNotifications", category: "email", description: "Enable automated transactional email delivery.", defaultValue: true },
  { key: "emailProviderHealth", category: "email", description: "Provider health check mode.", defaultValue: "monitor" },

  { key: "sessionTimeout", category: "security", description: "Default dashboard session lifetime in minutes.", defaultValue: "60", public: true },
  { key: "passwordMinLength", category: "security", description: "Minimum password length.", defaultValue: "8" },
  { key: "passwordRequireSymbols", category: "security", description: "Require symbols in passwords.", defaultValue: true },
  { key: "twoFactorRequired", category: "security", description: "Require MFA for platform admins.", defaultValue: false },
  { key: "ipWhitelist", category: "security", description: "Allowed master dashboard IP ranges.", defaultValue: "" },
  { key: "maintenanceMode", category: "security", description: "Lock tenant dashboards during platform maintenance.", defaultValue: false, public: true },
  { key: "auditRetentionDays", category: "security", description: "Audit log retention window.", defaultValue: "365" },
  { key: "failedLoginLockout", category: "security", description: "Failed login attempts before account lockout.", defaultValue: "5" },

  { key: "backupFrequency", category: "database", description: "Master database backup cadence.", defaultValue: "daily" },
  { key: "retentionPeriod", category: "database", description: "Operational data retention in days.", defaultValue: "30" },
  { key: "autoOptimize", category: "database", description: "Enable automatic database index optimization.", defaultValue: true },
  { key: "tenantBackupPolicy", category: "database", description: "Default tenant database backup policy.", defaultValue: "daily" },
  { key: "exportFormat", category: "database", description: "Default report export format.", defaultValue: "csv" },

  { key: "emailAlerts", category: "notifications", description: "Email platform administrators for critical alerts.", defaultValue: true },
  { key: "smsAlerts", category: "notifications", description: "SMS platform administrators for critical alerts.", defaultValue: false },
  { key: "twilioAccountSid", category: "notifications", description: "Twilio account SID for SMS alerts.", defaultValue: "", secret: true },
  { key: "twilioAuthToken", category: "notifications", description: "Twilio auth token for SMS alerts.", defaultValue: "", secret: true },
  { key: "twilioFromNumber", category: "notifications", description: "Twilio sender phone number.", defaultValue: "" },
  { key: "inAppAlerts", category: "notifications", description: "Create in-app alerts for platform incidents.", defaultValue: true },
  { key: "webhookUrl", category: "notifications", description: "External operational webhook URL.", defaultValue: "" },
  { key: "webhookSigningSecret", category: "notifications", description: "Secret used to sign outbound webhooks.", defaultValue: "", secret: true },
  { key: "incidentDigestFrequency", category: "notifications", description: "Admin incident digest cadence.", defaultValue: "daily" },

  { key: "ownerSeatLimit", category: "tenants", description: "Maximum owner accounts allowed per tenant.", defaultValue: "2", public: true },
  { key: "defaultSchoolStatus", category: "tenants", description: "Default status for newly provisioned schools.", defaultValue: "active" },
  { key: "trialDays", category: "tenants", description: "Default trial days for provisioned schools.", defaultValue: "14", public: true },
  { key: "autoProvisionModules", category: "tenants", description: "Automatically provision default tenant modules.", defaultValue: true },
  { key: "allowTenantSelfService", category: "tenants", description: "Allow school owners to manage selected tenant settings.", defaultValue: true },
  { key: "tenantUrlMode", category: "tenants", description: "Tenant URL mode: auto, path, or subdomain.", defaultValue: "auto" },
  { key: "tenantDatabaseMode", category: "tenants", description: "Tenant database provisioning mode: shared, template, or neon_branch.", defaultValue: "shared" },
  { key: "tenantDatabaseUrlTemplate", category: "tenants", description: "Optional per-tenant database URL template. Use {slug} as the tenant placeholder.", defaultValue: "", secret: true },
  { key: "tenantNeonParentBranchId", category: "tenants", description: "Optional Neon parent branch id for tenant branch provisioning.", defaultValue: "" },
  { key: "tenantNeonDatabaseName", category: "tenants", description: "Neon database name used for tenant connection URI retrieval.", defaultValue: "neondb" },
  { key: "tenantNeonRoleName", category: "tenants", description: "Neon role name used for tenant connection URI retrieval.", defaultValue: "neondb_owner" },
  { key: "tenantNeonPooledConnections", category: "tenants", description: "Use pooled Neon connection URIs for tenant branches.", defaultValue: true },
  { key: "provisioningEmailSupportCopy", category: "tenants", description: "Send a copy of provisioning handoff emails to the platform support email.", defaultValue: false },

  { key: "invoicePrefix", category: "billing", description: "Default platform invoice number prefix.", defaultValue: "ROX" },
  { key: "invoiceDueDays", category: "billing", description: "Default invoice due window in days.", defaultValue: "14" },
  { key: "taxLabel", category: "billing", description: "Default tax label shown on invoices.", defaultValue: "VAT" },
  { key: "taxRate", category: "billing", description: "Default platform tax rate percentage.", defaultValue: "0" },
  { key: "paymentGraceDays", category: "billing", description: "Grace period before overdue action.", defaultValue: "7" },
  { key: "autoSuspendOverdueTenants", category: "billing", description: "Automatically suspend tenants after overdue grace period.", defaultValue: false },

  { key: "subscriptionRenewalNoticeDays", category: "subscriptions", description: "Days before renewal to notify owners.", defaultValue: "14" },
  { key: "allowPlanDowngrades", category: "subscriptions", description: "Allow tenant plan downgrades.", defaultValue: true },
  { key: "proratePlanChanges", category: "subscriptions", description: "Prorate mid-cycle plan changes.", defaultValue: true },
  { key: "enforceModuleEntitlements", category: "subscriptions", description: "Enforce module access based on active plans.", defaultValue: true },

  { key: "dataResidencyRegion", category: "compliance", description: "Default data residency region.", defaultValue: "africa" },
  { key: "privacyContactEmail", category: "compliance", description: "Privacy and data protection contact.", defaultValue: "privacy@roxan.com", public: true },
  { key: "requireDpaAcceptance", category: "compliance", description: "Require data processing agreement acceptance for tenants.", defaultValue: true },
  { key: "studentDataExportApproval", category: "compliance", description: "Require approval before exporting student data.", defaultValue: true },
  { key: "anonymizeDeletedUsers", category: "compliance", description: "Anonymize deleted users instead of hard deletion.", defaultValue: true },

  { key: "apiAccessEnabled", category: "integrations", description: "Enable platform API access for approved integrations.", defaultValue: true },
  { key: "webhookSigningEnabled", category: "integrations", description: "Sign outbound webhook events.", defaultValue: true },
  { key: "allowedWebhookDomains", category: "integrations", description: "Comma-separated allowed webhook destination domains.", defaultValue: "" },
  { key: "ssoProvider", category: "integrations", description: "Default platform SSO provider.", defaultValue: "disabled" },
  { key: "ssoIssuerUrl", category: "integrations", description: "OIDC issuer URL for SSO discovery.", defaultValue: "" },
  { key: "ssoClientId", category: "integrations", description: "OIDC client ID.", defaultValue: "" },
  { key: "ssoClientSecret", category: "integrations", description: "OIDC client secret.", defaultValue: "", secret: true },
  { key: "lmsIntegrationMode", category: "integrations", description: "Default LMS integration mode.", defaultValue: "disabled" },
  { key: "lmsApiUrl", category: "integrations", description: "LMS base API URL.", defaultValue: "" },
  { key: "lmsApiKey", category: "integrations", description: "LMS API key.", defaultValue: "", secret: true },
  { key: "neonApiKey", category: "integrations", description: "Neon API key for snapshot and backup schedule management.", defaultValue: "", secret: true },
  { key: "neonProjectId", category: "integrations", description: "Neon project ID.", defaultValue: "" },
  { key: "neonBranchId", category: "integrations", description: "Neon branch ID.", defaultValue: "" },

  { key: "defaultLanguage", category: "localization", description: "Default platform language.", defaultValue: "en", public: true },
  { key: "dateFormat", category: "localization", description: "Default date format.", defaultValue: "dd MMM yyyy", public: true },
  { key: "timeFormat", category: "localization", description: "Default time format.", defaultValue: "12h", public: true },
  { key: "firstDayOfWeek", category: "localization", description: "Default calendar first day of week.", defaultValue: "monday", public: true },

  { key: "automationEnabled", category: "automation", description: "Enable platform automation jobs.", defaultValue: true },
  { key: "nightlyJobWindow", category: "automation", description: "Preferred nightly automation window.", defaultValue: "02:00-04:00" },
  { key: "autoArchiveGraduatedStudents", category: "automation", description: "Automatically archive graduated student records.", defaultValue: false },
  { key: "autoNotifyInactiveTenants", category: "automation", description: "Notify owners when a tenant becomes inactive.", defaultValue: true },
];

const definitionsByKey = new Map(DEFINITIONS.map((definition) => [definition.key, definition]));

function defaultSettings() {
  return Object.fromEntries(DEFINITIONS.map((definition) => [definition.key, definition.defaultValue]));
}

function sanitizeSetting(key: string, value: unknown) {
  const definition = definitionsByKey.get(key);
  if (typeof definition?.defaultValue === "boolean") return Boolean(value);
  if (typeof definition?.defaultValue === "number") return Number(value || 0);
  return String(value ?? "");
}

function getPublicSettings(settings: Record<string, unknown>) {
  const publicSettings: PublicPlatformSettings = {};
  for (const definition of DEFINITIONS) {
    if (!definition.public) continue;
    (publicSettings as Record<string, unknown>)[definition.key] = settings[definition.key] ?? definition.defaultValue;
  }
  publicSettings.updatedAt = new Date().toISOString();
  return publicSettings;
}

function maskSecrets(settings: Record<string, unknown>) {
  const masked = { ...settings };
  for (const definition of DEFINITIONS) {
    if (definition.secret && masked[definition.key]) masked[definition.key] = "********";
  }
  return masked;
}

async function readSettings() {
  const rows = await masterDb.select().from(systemSettingsTable);
  const settings = defaultSettings();
  const meta: Record<string, { category: string; description: string; updatedAt: string | null; secret: boolean }> = {};
  for (const definition of DEFINITIONS) {
    meta[definition.key] = {
      category: definition.category,
      description: definition.description,
      updatedAt: null,
      secret: Boolean(definition.secret),
    };
  }
  for (const row of rows) {
    settings[row.key] = row.value as string | boolean | number;
    meta[row.key] = {
      category: row.category,
      description: row.description || definitionsByKey.get(row.key)?.description || "",
      updatedAt: row.updatedAt?.toISOString() || null,
      secret: Boolean(definitionsByKey.get(row.key)?.secret),
    };
  }
  return { settings, meta };
}

async function writeSetting(key: string, value: unknown, category?: string, description?: string) {
  const definition = definitionsByKey.get(key);
  if (definition?.secret && (value === "" || value === "********" || value == null)) return;
  const sanitized = sanitizeSetting(key, value);
  await masterDb
    .insert(systemSettingsTable)
    .values({
      id: crypto.randomUUID(),
      key,
      value: sanitized,
      category: category || definition?.category || "general",
      description: description || definition?.description || "",
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: systemSettingsTable.key,
      set: {
        value: sanitized,
        category: category || definition?.category || "general",
        description: description || definition?.description || "",
        updatedAt: new Date(),
      },
    });
}

async function auditSettingsUpdate(request: NextRequest, adminId: string, changedKeys: string[]) {
  await masterDb.insert(auditLogsTable).values({
    id: crypto.randomUUID(),
    adminId,
    action: "Platform Settings Updated",
    resource: "system_settings",
    resourceId: "platform",
    changes: {
      changedKeys,
      count: changedKeys.length,
    },
    ipAddress: getRequestIp(request),
    userAgent: request.headers.get("user-agent"),
    status: "success",
    createdAt: new Date(),
  });
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const scope = searchParams.get("scope");
    const { settings, meta } = await readSettings();

    if (scope === "public") {
      return NextResponse.json(getPublicSettings(settings), {
        headers: { "Cache-Control": "no-store" },
      });
    }

    const [schoolStats] = await masterDb
      .select({
        total: sql<number>`count(*)::int`,
        active: sql<number>`count(*) filter (where ${schoolsTable.status} = 'active')::int`,
      })
      .from(schoolsTable);

    return NextResponse.json(
      {
        settings: maskSecrets(settings),
        meta,
        publicSettings: getPublicSettings(settings),
        categories: DEFINITIONS.reduce((acc, definition) => {
          acc[definition.category] = (acc[definition.category] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        platformHealth: {
          totalSchools: Number(schoolStats?.total || 0),
          activeSchools: Number(schoolStats?.active || 0),
          settingsCount: Object.keys(settings).length,
          publicSettingCount: DEFINITIONS.filter((definition) => definition.public).length,
        },
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Failed to fetch settings:", error);
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { admin, response } = await requireMasterAdmin(request);
    if (response) return response;

    const body = await request.json().catch(() => ({}));
    const incoming = (body.settings || {}) as Record<string, unknown>;
    const changedKeys = Object.keys(incoming).filter((key) => definitionsByKey.has(key));

    if (!changedKeys.length) {
      return NextResponse.json({ error: "No valid settings were provided" }, { status: 400 });
    }

    await Promise.all(changedKeys.map((key) => writeSetting(key, incoming[key])));
    await auditSettingsUpdate(request, admin.adminId, changedKeys);

    const { settings, meta } = await readSettings();
    return NextResponse.json({
      success: true,
      changedKeys,
      settings: maskSecrets(settings),
      meta,
      publicSettings: getPublicSettings(settings),
    });
  } catch (error) {
    console.error("Failed to save settings:", error);
    return NextResponse.json({ error: "Failed to save settings" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { admin, response } = await requireMasterAdmin(request);
    if (response) return response;

    const body = await request.json().catch(() => ({}));
    const { key, value, category, description } = body;
    if (!key || typeof key !== "string") {
      return NextResponse.json({ error: "Key is required" }, { status: 400 });
    }
    await writeSetting(key, value, category, description);
    await auditSettingsUpdate(request, admin.adminId, [key]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to save setting:", error);
    return NextResponse.json({ error: "Failed to save setting" }, { status: 500 });
  }
}
