import crypto from "node:crypto";

import { eq, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

import { getTenantDbBySlug, masterDb } from "@/lib/db";
import { schoolsTable } from "@/lib/db-schema";
import { isTenantAdminResponse, requireTenantAdmin } from "@/lib/tenant-admin-auth";
import { writeTenantAuditLog } from "@/lib/tenant-audit";
import { createNeonSnapshot, getNeonBackupStatus, sendPlatformEmail, sendPlatformSms, updateNeonBackupSchedule } from "@/lib/platform-integrations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Row = Record<string, unknown>;

const DEFAULT_ADMIN_SETTINGS = {
  schoolName: "",
  schoolShortName: "",
  schoolCode: "",
  registrationNumber: "",
  motto: "",
  schoolDescription: "",
  email: "",
  supportEmail: "",
  phone: "",
  alternativePhone: "",
  website: "",
  country: "",
  city: "",
  stateProvince: "",
  district: "",
  address: "",
  postalAddress: "",
  timezone: "Africa/Kampala",
  currency: "UGX",
  academicYear: "2026",
  currentTerm: "Term 1",
  curriculumType: "National Curriculum",
  academicYearFormat: "September - July",
  termSystem: "trimester",
  gradingScale: "percentage",
  passMark: "50",
  attendanceMode: "daily",
  lateThresholdMinutes: "15",
  latePolicy: "Mark as late after threshold; 3 lates = 1 absent",
  minimumAttendanceForPromotion: "75",
  attendanceAlertsEnabled: true,
  autoNotifyParentsOnAttendance: true,
  notifyParentsEmail: true,
  notifyParentsSms: true,
  notifyTeachersEmail: true,
  notifyTeachersSms: false,
  smtpEnabled: false,
  smsTwilioEnabled: false,
  mfaRequiredForAdmins: false,
  sessionTimeoutMinutes: "60",
  auditRetentionDays: "730",
  dataExportEnabled: true,
  backupSchedule: "weekly",
  admissionsOpen: true,
  admissionPrefix: "APP",
  autoGenerateAdmissionNumbers: true,
  requireGuardianForAdmission: true,
  requireBirthCertificate: true,
  requirePreviousResults: false,
  enrollmentApprovalMode: "admin_review",
  admissionCapacityEnforcement: true,
  reportCardFormat: "standard",
  showPositionOnReports: true,
  lockPublishedResults: true,
  requireAdminApprovalForResults: true,
  notifyParentsOnResults: true,
  libraryLoanLimit: "3",
  libraryLoanDays: "14",
  healthAlertEscalation: true,
  visitorLogRequired: true,
  maintenanceWindow: "Sunday 02:00-04:00",
  exportFormat: "xlsx",
  backupProvider: "local",
};
type AdminSettings = typeof DEFAULT_ADMIN_SETTINGS & Record<string, unknown>;

const SECTIONS = [
  { id: "profile", title: "School Profile", description: "Core school identity, contacts, and location." },
  { id: "academic", title: "Academic Defaults", description: "Academic year, curriculum, terms, grading, and pass rules." },
  { id: "attendance", title: "Attendance Policy", description: "Attendance mode, late rules, promotion minimums, and alerts." },
  { id: "admissions", title: "Admissions", description: "Enrollment controls, numbering, documents, and approval workflows." },
  { id: "reports", title: "Reports & Results", description: "Result publication, report cards, and parent notification defaults." },
  { id: "operations", title: "Operations", description: "Library, health, visitors, exports, and maintenance defaults." },
  { id: "communication", title: "Communication", description: "Parent/teacher notification defaults and provider switches." },
  { id: "security", title: "Security & Data", description: "MFA, sessions, audit retention, exports, and backups." },
];

const OWNER_ONLY_FIELDS = new Set([
  "mfaRequiredForAdmins",
  "sessionTimeoutMinutes",
  "auditRetentionDays",
  "dataExportEnabled",
  "backupSchedule",
  "backupProvider",
]);

const OWNER_ONLY_ACTIONS = new Set(["reset", "restore_backup", "execute_backup", "backup_status"]);

function forbidden(message: string) {
  return NextResponse.json({ error: message }, { status: 403 });
}

function asString(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function boolValue(value: unknown, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

async function safeRows<T = Row>(operation: () => Promise<{ rows?: unknown[] } | T[]>, label: string): Promise<T[]> {
  try {
    const result = await operation();
    if (Array.isArray(result)) return result as T[];
    return (result.rows || []) as T[];
  } catch (error) {
    console.warn(`Admin settings ${label} query skipped:`, error instanceof Error ? error.message : error);
    return [];
  }
}

async function getSchool(slug: string) {
  const [school] = await masterDb
    .select({ id: schoolsTable.id, name: schoolsTable.name, slug: schoolsTable.slug, type: schoolsTable.type, status: schoolsTable.status, country: schoolsTable.country, currencyCode: schoolsTable.currencyCode })
    .from(schoolsTable)
    .where(eq(schoolsTable.slug, slug))
    .limit(1);
  return school;
}

function validateSettings(settings: Row) {
  const errors: string[] = [];
  const email = asString(settings.email);
  const supportEmail = asString(settings.supportEmail);
  const schoolName = asString(settings.schoolName);
  const code = asString(settings.schoolCode);
  if (!schoolName) errors.push("School name is required");
  if (!code) errors.push("School code is required");
  if (code && !/^[A-Z0-9][A-Z0-9-]{1,14}$/.test(code)) errors.push("School code must be 2-15 uppercase letters, numbers, or hyphens");
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push("School email is invalid");
  if (supportEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(supportEmail)) errors.push("Support email is invalid");
  const website = asString(settings.website);
  if (website && !/^https?:\/\/[^\s.]+\.[^\s]+$/i.test(website)) errors.push("Website must be a valid http(s) URL");
  const passMark = Number(settings.passMark || 0);
  if (!Number.isFinite(passMark) || passMark < 0 || passMark > 100) errors.push("Pass mark must be between 0 and 100");
  const attendance = Number(settings.minimumAttendanceForPromotion || 0);
  if (!Number.isFinite(attendance) || attendance < 0 || attendance > 100) errors.push("Minimum attendance must be between 0 and 100");
  const lateThreshold = Number(settings.lateThresholdMinutes || 0);
  if (!Number.isFinite(lateThreshold) || lateThreshold < 0 || lateThreshold > 240) errors.push("Late threshold must be between 0 and 240 minutes");
  const session = Number(settings.sessionTimeoutMinutes || 0);
  if (!Number.isFinite(session) || session < 5 || session > 1440) errors.push("Session timeout must be between 5 and 1440 minutes");
  const auditRetention = Number(settings.auditRetentionDays || 0);
  if (!Number.isFinite(auditRetention) || auditRetention < 30 || auditRetention > 3650) errors.push("Audit retention must be between 30 and 3650 days");
  const loanLimit = Number(settings.libraryLoanLimit || 0);
  if (!Number.isFinite(loanLimit) || loanLimit < 0 || loanLimit > 50) errors.push("Library loan limit must be between 0 and 50");
  const loanDays = Number(settings.libraryLoanDays || 0);
  if (!Number.isFinite(loanDays) || loanDays < 1 || loanDays > 365) errors.push("Library loan days must be between 1 and 365");
  const admissionPrefix = asString(settings.admissionPrefix);
  if (admissionPrefix && !/^[A-Z0-9-]{2,12}$/.test(admissionPrefix)) errors.push("Application prefix must be 2-12 uppercase letters, numbers, or hyphens");
  return errors;
}

function hardeningStatus(settings: Row, backupCount: number) {
  const checks = [
    { id: "profile_validation", label: "Required profile fields", ok: Boolean(asString(settings.schoolName) && asString(settings.schoolCode) && asString(settings.email)) },
    { id: "version_history", label: "Version history", ok: backupCount > 0 },
    { id: "communication_test", label: "Communication test available", ok: boolValue(settings.notifyParentsEmail) || boolValue(settings.notifyParentsSms) || boolValue(settings.notifyTeachersEmail) || boolValue(settings.notifyTeachersSms) },
    { id: "owner_security", label: "Owner-controlled security fields", ok: true },
    { id: "backup_provider", label: "Backup provider configured", ok: ["local", "neon"].includes(asString(settings.backupProvider, "local")) },
    { id: "audit_retention", label: "Audit retention policy", ok: Number(settings.auditRetentionDays || 0) >= 30 },
  ];
  return {
    checks,
    passed: checks.filter((check) => check.ok).length,
    total: checks.length,
  };
}

async function readPayload(slug: string) {
  const school = await getSchool(slug);
  if (!school) return null;
  const tenantDb = await getTenantDbBySlug(slug);
  const key = `tenant_settings:${slug}`;
  const [settingsRow] = await safeRows<Row>(() => tenantDb.execute(sql`select value, updated_at from system_settings where key in (${key}, 'tenant_settings') order by case when key = ${key} then 0 else 1 end limit 1`), "settings");
  const settings = { ...DEFAULT_ADMIN_SETTINGS, schoolName: school.name, country: school.country || "", currency: school.currencyCode || "UGX", ...(settingsRow?.value && typeof settingsRow.value === "object" ? settingsRow.value as Row : {}) };
  const versionRows = await safeRows<Row>(() => tenantDb.execute(sql`select key, value, updated_at from system_settings where key like ${`tenant_settings_admin_backup:${slug}:%`} order by updated_at desc limit 8`), "backups");
  return {
    school,
    settings,
    sections: SECTIONS,
    backups: versionRows.map((row) => {
      const value = row.value && typeof row.value === "object" ? row.value as Row : {};
      return {
        id: asString(value.id, asString(row.key)),
        createdAt: row.updated_at ? new Date(String(row.updated_at)).toISOString() : null,
        actorId: asString(value.actorId),
        size: JSON.stringify(value.settings || {}).length,
        checksum: asString(value.checksum),
        providerStatus: value.providerStatus || null,
      };
    }),
    hardening: hardeningStatus(settings, versionRows.length),
    generatedAt: new Date().toISOString(),
  };
}

async function writeSettings(slug: string, actorId: string, request: NextRequest, nextSettings: Row, action = "admin.settings.updated", role: "owner" | "school_admin" = "school_admin") {
  const tenantDb = await getTenantDbBySlug(slug);
  const key = `tenant_settings:${slug}`;
  const currentRows = await safeRows<Row>(() => tenantDb.execute(sql`select value from system_settings where key = ${key} limit 1`), "current settings");
  const current = currentRows[0]?.value && typeof currentRows[0].value === "object" ? currentRows[0].value as Row : {};
  const merged: AdminSettings = { ...DEFAULT_ADMIN_SETTINGS, ...current, ...nextSettings };
  const errors = validateSettings(merged);
  if (errors.length) return { errors };
  const changedKeys = Object.keys(merged).filter((field) => JSON.stringify(current[field]) !== JSON.stringify(merged[field]));
  if (role !== "owner") {
    const restricted = changedKeys.filter((keyName) => OWNER_ONLY_FIELDS.has(keyName));
    if (restricted.length) return { forbidden: `Only the tenant owner can change: ${restricted.join(", ")}` };
  }
  await tenantDb.execute(sql`
    insert into system_settings (id, key, value, category, description, created_at, updated_at)
    values (${crypto.randomUUID()}, ${key}, ${JSON.stringify(merged)}::jsonb, 'school', ${`Admin tenant settings for ${slug}`}, now(), now())
    on conflict (key) do update set value = excluded.value, updated_at = now()
  `);
  await masterDb.execute(sql`
    insert into system_settings (id, key, value, category, description, created_at, updated_at)
    values (${crypto.randomUUID()}, ${`tenant_branding:${slug}`}, ${JSON.stringify({ name: merged.schoolName, logoUrl: String(merged.logoUrl || ""), primaryColor: String(merged.primaryColor || "#f97316") })}::jsonb, 'tenant_branding', ${`Tenant branding for ${slug}`}, now(), now())
    on conflict (key) do update set value = excluded.value, updated_at = now()
  `).catch(() => undefined);
  await writeTenantAuditLog({ db: tenantDb, request, actorId, action, resource: "tenant_settings", resourceId: slug, changes: { changedKeys, count: changedKeys.length } }).catch(() => undefined);
  return { settings: merged, changedKeys };
}

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("tenant")?.trim().toLowerCase() || "";
  if (!slug) return NextResponse.json({ error: "Tenant slug is required" }, { status: 400 });
  const admin = await requireTenantAdmin(request, slug);
  if (isTenantAdminResponse(admin)) return admin;
  const payload = await readPayload(slug);
  if (!payload) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  return NextResponse.json(payload, { headers: { "Cache-Control": "no-store, max-age=0" } });
}

export async function PATCH(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("tenant")?.trim().toLowerCase() || "";
  if (!slug) return NextResponse.json({ error: "Tenant slug is required" }, { status: 400 });
  const admin = await requireTenantAdmin(request, slug);
  if (isTenantAdminResponse(admin)) return admin;
  const body = await request.json().catch(() => ({}));
  const result = await writeSettings(slug, admin.userId, request, body.settings && typeof body.settings === "object" ? body.settings as Row : body, "admin.settings.updated", admin.role);
  if (result.forbidden) return forbidden(result.forbidden);
  if (result.errors) return NextResponse.json({ error: result.errors.join("; "), errors: result.errors }, { status: 400 });
  return NextResponse.json(await readPayload(slug), { headers: { "Cache-Control": "no-store, max-age=0" } });
}

export async function POST(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("tenant")?.trim().toLowerCase() || "";
  if (!slug) return NextResponse.json({ error: "Tenant slug is required" }, { status: 400 });
  const admin = await requireTenantAdmin(request, slug);
  if (isTenantAdminResponse(admin)) return admin;
  const body = await request.json().catch(() => ({}));
  const action = asString(body.action);
  const tenantDb = await getTenantDbBySlug(slug);
  if (OWNER_ONLY_ACTIONS.has(action) && admin.role !== "owner") return forbidden("Only the tenant owner can run this settings action");
  if (action === "backup") {
    const payload = await readPayload(slug);
    if (!payload) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    const id = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
    const settingsJson = JSON.stringify(payload.settings);
    const provider = asString((payload.settings as Row).backupProvider, "local");
    const providerStatus = provider === "neon"
      ? await createNeonSnapshot(`tenant-settings-${slug}-${id}`).catch((error) => ({ ok: false, provider: "neon", status: "failed", message: error instanceof Error ? error.message : "Neon snapshot failed" }))
      : { ok: provider === "local", provider, status: provider === "local" ? "local_version_created" : "not_configured", message: provider === "local" ? "Local settings backup created." : `${provider.toUpperCase()} execution is not configured in this deployment.` };
    await tenantDb.execute(sql`
      insert into system_settings (id, key, value, category, description, created_at, updated_at)
      values (${crypto.randomUUID()}, ${`tenant_settings_admin_backup:${slug}:${id}`}, ${JSON.stringify({ id, actorId: admin.userId, settings: payload.settings, createdAt: new Date().toISOString(), checksum: crypto.createHash("sha256").update(settingsJson).digest("hex"), providerStatus })}::jsonb, 'school_settings_backup', ${`Admin settings backup for ${slug}`}, now(), now())
    `);
    await writeTenantAuditLog({ db: tenantDb, request, actorId: admin.userId, action: "admin.settings.backup.created", resource: "tenant_settings", resourceId: slug, changes: { provider, providerStatus } }).catch(() => undefined);
    return NextResponse.json(await readPayload(slug));
  }
  if (action === "restore_backup") {
    const backupId = asString(body.backupId);
    if (!backupId) return NextResponse.json({ error: "Backup ID is required" }, { status: 400 });
    const [backup] = await safeRows<Row>(() => tenantDb.execute(sql`select value from system_settings where key = ${`tenant_settings_admin_backup:${slug}:${backupId}`} limit 1`), "restore backup");
    const value = backup?.value && typeof backup.value === "object" ? backup.value as Row : {};
    const settings = value.settings && typeof value.settings === "object" ? value.settings as Row : null;
    if (!settings) return NextResponse.json({ error: "Backup could not be found or is invalid" }, { status: 404 });
    const result = await writeSettings(slug, admin.userId, request, settings, "admin.settings.backup.restored", admin.role);
    if (result.forbidden) return forbidden(result.forbidden);
    if (result.errors) return NextResponse.json({ error: result.errors.join("; "), errors: result.errors }, { status: 400 });
    return NextResponse.json(await readPayload(slug), { headers: { "Cache-Control": "no-store, max-age=0" } });
  }
  if (action === "reset") {
    const result = await writeSettings(slug, admin.userId, request, DEFAULT_ADMIN_SETTINGS, "admin.settings.reset", admin.role);
    if (result.forbidden) return forbidden(result.forbidden);
    if (result.errors) return NextResponse.json({ error: result.errors.join("; "), errors: result.errors }, { status: 400 });
    return NextResponse.json(await readPayload(slug));
  }
  if (action === "backup_status") {
    const payload = await readPayload(slug);
    if (!payload) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    const provider = asString((payload.settings as Row).backupProvider, "local");
    const status = provider === "neon"
      ? await getNeonBackupStatus().catch((error) => ({ ok: false, provider: "neon", status: "failed", message: error instanceof Error ? error.message : "Neon backup status failed" }))
      : { ok: provider === "local", provider, status: provider === "local" ? "healthy" : "not_configured", message: provider === "local" ? "Local version backups are enabled." : `${provider.toUpperCase()} backup execution is not configured in this deployment.` };
    await writeTenantAuditLog({ db: tenantDb, request, actorId: admin.userId, action: "admin.settings.backup.status_checked", resource: "tenant_settings", resourceId: slug, changes: status }).catch(() => undefined);
    return NextResponse.json({ success: true, status });
  }
  if (action === "execute_backup") {
    const payload = await readPayload(slug);
    if (!payload) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    const provider = asString((payload.settings as Row).backupProvider, "local");
    const status = provider === "neon"
      ? await updateNeonBackupSchedule().catch((error) => ({ ok: false, provider: "neon", status: "failed", message: error instanceof Error ? error.message : "Neon backup schedule failed" }))
      : { ok: provider === "local", provider, status: provider === "local" ? "healthy" : "not_configured", message: provider === "local" ? "Local backup schedule does not require external execution." : `${provider.toUpperCase()} backup execution is not configured in this deployment.` };
    await writeTenantAuditLog({ db: tenantDb, request, actorId: admin.userId, action: "admin.settings.backup.executed", resource: "tenant_settings", resourceId: slug, changes: status }).catch(() => undefined);
    return NextResponse.json({ success: true, status });
  }
  if (action === "test_communication") {
    const payload = await readPayload(slug);
    if (!payload) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    const settings = payload.settings as Row;
    const targetEmail = asString(settings.supportEmail, asString(settings.email, admin.email));
    const targetPhone = asString(settings.phone);
    const email = await sendPlatformEmail({
      to: targetEmail,
      subject: `${payload.school.name} settings test`,
      html: `<p>This is a school admin settings test notification for <strong>${payload.school.name}</strong>.</p>`,
      text: `This is a school admin settings test notification for ${payload.school.name}.`,
    }).catch((error) => ({ ok: false, provider: "email", status: "failed", message: error instanceof Error ? error.message : "Email test failed" }));
    const sms = targetPhone
      ? await sendPlatformSms({ to: targetPhone, body: `${payload.school.name}: settings SMS test notification.` }).catch((error) => ({ ok: false, provider: "sms", status: "failed", message: error instanceof Error ? error.message : "SMS test failed" }))
      : null;
    await writeTenantAuditLog({ db: tenantDb, request, actorId: admin.userId, action: "admin.settings.communication.test", resource: "tenant_settings", resourceId: slug, changes: { email: email.status, sms: sms?.status || "skipped" } }).catch(() => undefined);
    return NextResponse.json({ success: true, email, sms });
  }
  return NextResponse.json({ error: "Unsupported settings action" }, { status: 400 });
}
