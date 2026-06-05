import { NextRequest, NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";

import { getTenantDbBySlug, masterDb } from "@/lib/db";
import { rolesTable, schoolsTable, tenantUsersTable } from "@/lib/db-schema";
import { deleteCachedValue } from "@/lib/server-response-cache";
import { writeTenantAuditLog } from "@/lib/tenant-audit";
import { isTenantOwnerResponse, requireTenantOwner } from "@/lib/tenant-owner-auth";
import { extractAndMaskSecrets, hydrateMaskedSecrets, validateTenantSettings, type TenantSettingsVault } from "@/lib/tenant-settings-hardening";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Row = Record<string, unknown>;

const DEFAULT_SETTINGS = {
  schoolName: "",
  registrationNumber: "",
  schoolType: "",
  schoolCategory: "",
  schoolDescription: "",
  dateEstablished: "",
  logoUrl: "",
  faviconUrl: "",
  schoolSealUrl: "",
  reportCardWatermarkUrl: "",
  emailHeaderLogoUrl: "",
  loginScreenLogoUrl: "",
  mobileAppLogoUrl: "",
  motto: "",
  address: "",
  postalAddress: "",
  stateProvince: "",
  district: "",
  gpsCoordinates: "",
  city: "",
  country: "",
  phone: "",
  alternativePhone: "",
  supportEmail: "",
  faxNumber: "",
  email: "",
  website: "",
  primaryColor: "#f97316",
  secondaryColor: "#111827",
  accentColor: "#fb923c",
  successColor: "#16a34a",
  warningColor: "#f59e0b",
  errorColor: "#dc2626",
  typography: "Modern Sans",
  fontFamily: "Geist",
  themeMode: "system",
  portalLayout: "modern",
  sidebarLayout: "expanded",
  topNavigationLayout: "standard",
  compactMode: false,
  fullWidthMode: false,
  roundedCorners: true,
  borderRadius: "16",
  shadowIntensity: "medium",
  academicYear: "2026",
  currentTerm: "Term 1",
  schoolShortName: "",
  schoolCode: "",
  schoolLevels: "",
  curriculumType: "National Curriculum",
  academicYearFormat: "September - July",
  termSystem: "trimester",
  academicCalendarType: "standard",
  gradeComputationMethod: "weighted_average",
  useAssessmentConfigurationSplit: true,
  resultPublicationControl: {
    autoPublish: false,
    adminApprovalRequired: true,
    lockAfterSubmission: true,
    notifyParents: true,
  },
  namingLabels: {
    student: "Student",
    teacher: "Teacher",
    parent: "Parent",
    classroom: "Classroom",
    subject: "Subject",
    term: "Term",
    semester: "Semester",
    academicYear: "Academic Year",
  },
  numberFormats: {
    studentIdFormat: "{SCHOOL_CODE}/STU/{YEAR}/{0000}",
    staffIdFormat: "{SCHOOL_CODE}/STA/{YEAR}/{0000}",
    admissionNumberFormat: "{SCHOOL_CODE}/ADM/{YEAR}/{0000}",
    classNamingFormat: "Stage + Number + Section",
    prefix: "",
    suffix: "",
    runningNumber: 1,
    autoIncrement: true,
  },
  academicHierarchy: [
    { id: "primary", name: "Primary", capacityPerClass: 40, levels: ["Primary 1", "Primary 2"], streams: ["A", "B"] },
  ],
  curriculumTemplate: "custom",
  classNamingFormat: "stage_number_section",
  defaultClassCapacity: "40",
  autoAssignClassTeacher: false,
  subjectCategories: ["Core Subjects", "Elective Subjects", "Extra-Curricular Subjects"],
  subjectPolicy: {
    coreMandatory: true,
    minElectives: 1,
    maxElectives: 4,
    weightingMethod: "equal",
    assignments: [],
  },
  academicPolicy: {
    minimumAverage: 50,
    distinctionThreshold: 80,
    passThreshold: 50,
    meritThreshold: 65,
    maxFailedSubjects: 2,
    carryOverAllowed: false,
    supplementaryExamAllowed: true,
    repeatClass: true,
    promotionLogic: "Promote learners who meet the overall average and failure-rule requirements.",
    repetitionLogic: "Repeat class when failed subjects exceed the allowed threshold.",
    graduationLogic: "Graduate after all required levels, credits, and final-year requirements are complete.",
  },
  timezone: "Africa/Kampala",
  attendanceMode: "daily",
  lateThresholdMinutes: "15",
  latePolicy: "Mark as late after threshold; 3 lates = 1 absent",
  minimumAttendanceForPromotion: "75",
  attendanceAlertsEnabled: true,
  autoNotifyParentsOnAttendance: true,
  attendanceGradingEnabled: false,
  attendanceExcuseWorkflowEnabled: true,
  attendanceGracePeriodMinutes: "5",
  attendanceCaptureWindow: "Full school day",
  gradingScale: "percentage",
  passMark: "50",
  assessmentCategories: [],
  gradingScaleRows: [
    { id: "grade-a", min: 80, max: 100, grade: "A" },
    { id: "grade-b", min: 70, max: 79, grade: "B" },
    { id: "grade-c", min: 60, max: 69, grade: "C" },
    { id: "grade-d", min: 50, max: 59, grade: "D" },
  ],
  rankingPolicy: {
    gpaCalculation: "weighted_average",
    rankingSystem: "class_level",
    reportCardFormat: "standard",
    passMark: 50,
    showPositionOnReportCards: true,
  },
  positionRules: {
    minimumOverallAverage: 50,
    minimumSubjectScore: 40,
    maxFailedSubjectsAllowed: 2,
    requiredMustPassSubjects: ["English", "Mathematics"],
  },
  currency: "UGX",
  invoicePrefix: "INV",
  receiptPrefix: "RCT",
  financeFeeItems: [],
  financeDiscountRules: [],
  financePenaltyEngine: {
    gracePeriodDays: 7,
    penaltyType: "percentage_outstanding",
    penaltyValue: 5,
    capAmount: 0,
    recurringPenalty: false,
    consequence: "No consequences",
  },
  financeInstallmentPlan: {
    allowPartialPayments: true,
    minimumInstallment: 0,
    maxInstallments: 3,
    autoDueDate: true,
  },
  financePaymentInvoice: {
    currency: "UGX",
    invoicePrefix: "INV",
    taxRate: 0,
    providers: { flutterwave: false, paystack: false, stripe: false, mobileMoney: true, cash: true, cardBankTransfer: true },
  },
  financeProviderCredentials: {
    paystack: { publicKey: "", secretKey: "", webhookUrl: "", sandboxMode: true, liveMode: false },
    flutterwave: { publicKey: "", secretKey: "", webhookUrl: "", sandboxMode: true, liveMode: false },
    stripe: { publicKey: "", secretKey: "", webhookUrl: "", sandboxMode: true, liveMode: false },
    mobileMoney: { publicKey: "", secretKey: "", webhookUrl: "", sandboxMode: true, liveMode: false },
    cashBankTransfer: { publicKey: "", secretKey: "", webhookUrl: "", sandboxMode: false, liveMode: true },
  },
  financeExchangeRates: {
    automaticSync: true,
    manualRateOverride: false,
    reportingCurrency: "UGX",
    converterAmount: 1,
    converterFrom: "USD",
    converterTo: "UGX",
    manualRates: {},
  },
  financeCurrencies: {
    baseCurrency: "UGX",
    enabledCurrencies: ["UGX"],
  },
  smsTwilioEnabled: false,
  smsAfricasTalkingEnabled: false,
  smsHubtelEnabled: false,
  smsCustomEnabled: false,
  smtpEnabled: false,
  sendgridEnabled: false,
  mailgunEnabled: false,
  awsSesEnabled: false,
  notifyStudentsEmail: true,
  notifyStudentsSms: false,
  notifyStudentsPush: true,
  notifyStudentsWhatsapp: false,
  notifyParentsEmail: true,
  notifyParentsSms: true,
  notifyParentsPush: true,
  notifyParentsWhatsapp: false,
  notifyTeachersEmail: true,
  notifyTeachersSms: false,
  notifyTeachersPush: true,
  notifyTeachersWhatsapp: false,
  paystackEnabled: false,
  paystackPublicKey: "",
  paystackSecretKey: "",
  momoEnabled: false,
  momoProvider: "",
  emailProvider: "resend",
  resendApiKey: "",
  smtpHost: "",
  smtpPort: "587",
  smtpUsername: "",
  smtpPassword: "",
  smtpFromEmail: "",
  sendgridApiKey: "",
  sendgridFromEmail: "",
  mailgunApiKey: "",
  mailgunDomain: "",
  mailgunRegion: "US",
  awsSesAccessKeyId: "",
  awsSesSecretAccessKey: "",
  awsSesRegion: "us-east-1",
  awsSesFromEmail: "",
  smsProvider: "twilio",
  twilioAccountSid: "",
  twilioAuthToken: "",
  twilioFromNumber: "",
  africasTalkingUsername: "",
  africasTalkingApiKey: "",
  africasTalkingSenderId: "",
  hubtelClientId: "",
  hubtelClientSecret: "",
  hubtelSenderId: "",
  termiiApiKey: "",
  termiiSenderId: "",
  customSmsEndpoint: "",
  customSmsApiKey: "",
  customSmsSenderId: "",
  twoFactorRequired: false,
  ssoEnabled: false,
  ssoProvider: "disabled",
  ssoIssuerUrl: "",
  ssoClientId: "",
  ssoClientSecret: "",
  googleLoginEnabled: false,
  googleClientId: "",
  googleClientSecret: "",
  microsoftLoginEnabled: false,
  microsoftClientId: "",
  microsoftClientSecret: "",
  microsoftTenantId: "",
  deviceTrackingEnabled: true,
  activeSessionLimit: "5",
  loginLogsEnabled: true,
  changeLogsEnabled: true,
  activityLogsEnabled: true,
  dataRetentionYears: "7",
  dataExportEnabled: true,
  dataDeletionRequestsEnabled: true,
  passwordMinLength: "8",
  sessionTimeoutMinutes: "60",
  lmsEnabled: false,
  lmsUrl: "",
  lmsApiKey: "",
  lmsWebhookSecret: "",
  webhookUrl: "",
  webhookSigningSecret: "",
  webhookSigningEnabled: true,
  allowedWebhookDomains: "",
  transportEnabled: false,
  hostelEnabled: false,
  documentRetentionYears: "7",
  complianceOfficer: "",
  admissionLetterTemplateEnabled: true,
  certificateTemplateEnabled: true,
  reportCardTemplateEnabled: true,
  transcriptTemplateEnabled: true,
  feeInvoiceTemplateEnabled: true,
  ministryComplianceEnabled: true,
  accreditationRecordsEnabled: true,
  legalDocumentsEnabled: true,
  automationEnabled: true,
  autoPromotionEnabled: false,
  autoFeeGenerationEnabled: true,
  autoNotificationsEnabled: true,
  autoTimetableGenerationEnabled: false,
  dailyJobsEnabled: true,
  weeklyJobsEnabled: true,
  monthlyJobsEnabled: true,
  triggerStudentAdmissionEnabled: true,
  triggerFeePaymentEnabled: true,
  triggerExamCompletionEnabled: true,
  triggerGraduationEnabled: true,
  backupFrequency: "daily",
  manualBackupEnabled: true,
  scheduledBackupEnabled: true,
  cloudBackupEnabled: false,
  backupProvider: "AWS S3",
  restorePointSelection: "",
  oneClickRestoreEnabled: false,
  rollbackEnabled: false,
  exportCsvEnabled: true,
  exportExcelEnabled: true,
  exportPdfEnabled: true,
  exportJsonEnabled: true,
  ownerName: "",
  ownerEmail: "",
  ownerPhone: "",
  ownerTitle: "School Owner",
};

const SECTIONS = [
  { id: "school_name", title: "School Profile", description: "Identity, contact, location, regional preferences, and owner administrator details.", fields: ["schoolName", "schoolCode", "registrationNumber", "schoolType", "schoolCategory", "academicYear", "motto", "schoolDescription", "dateEstablished", "website", "email", "phone", "alternativePhone", "supportEmail", "faxNumber", "country", "stateProvince", "district", "city", "address", "postalAddress", "gpsCoordinates", "timezone", "currency", "ownerName", "ownerEmail", "ownerPhone", "ownerTitle"] },
  { id: "branding", title: "Branding & Appearance", description: "Tenant logos, favicon, document marks, colors, theme, and portal presentation.", fields: ["logoUrl", "faviconUrl", "schoolSealUrl", "reportCardWatermarkUrl", "emailHeaderLogoUrl", "loginScreenLogoUrl", "mobileAppLogoUrl", "primaryColor", "secondaryColor", "accentColor", "successColor", "warningColor", "errorColor", "typography", "fontFamily", "themeMode", "portalLayout", "sidebarLayout", "topNavigationLayout", "compactMode", "fullWidthMode", "roundedCorners", "borderRadius", "shadowIntensity"] },
  { id: "academic", title: "Academic Settings", description: "Academic identity, structure, subject policy, computation, result publishing, and progression rules.", fields: ["academicYear", "currentTerm", "schoolShortName", "schoolCode", "motto", "schoolLevels", "curriculumType", "academicYearFormat", "termSystem", "gradingScale", "academicCalendarType", "subjectCategories", "subjectPolicy", "academicPolicy", "gradeComputationMethod", "useAssessmentConfigurationSplit", "resultPublicationControl"] },
  { id: "academic_structure", title: "Academic Structure", description: "Curriculum template, stages, levels, streams, generated classes, naming, and capacity rules.", fields: ["curriculumTemplate", "academicHierarchy", "classNamingFormat", "defaultClassCapacity", "autoAssignClassTeacher"] },
  { id: "naming", title: "Naming & Settings", description: "Academic labels, ID formats, admission numbers, class naming, and running-number rules.", fields: ["namingLabels", "numberFormats"] },
  { id: "attendance", title: "Attendance", description: "Attendance capture behavior, late policies, notifications, grading, and promotion rules.", fields: ["attendanceMode", "lateThresholdMinutes", "latePolicy", "minimumAttendanceForPromotion", "attendanceAlertsEnabled", "autoNotifyParentsOnAttendance", "attendanceGradingEnabled", "attendanceExcuseWorkflowEnabled", "attendanceGracePeriodMinutes", "attendanceCaptureWindow"] },
  { id: "examination", title: "Examination & Grading", description: "Assessment categories, grading scales, ranking, report cards, pass marks, and position rules.", fields: ["assessmentCategories", "gradingScaleRows", "rankingPolicy", "positionRules"] },
  { id: "finance", title: "Finance", description: "Fee items, discounts, penalties, installments, invoices, payment providers, and currencies.", fields: ["financeFeeItems", "financeDiscountRules", "financePenaltyEngine", "financeInstallmentPlan", "financePaymentInvoice", "financeProviderCredentials", "financeCurrencies", "financeExchangeRates", "currency", "invoicePrefix", "receiptPrefix"] },
  { id: "payment_gateways", title: "Payment Gateways", description: "Paystack, mobile money, and payment provider credentials.", fields: ["paystackEnabled", "paystackPublicKey", "paystackSecretKey", "momoEnabled", "momoProvider"] },
  { id: "communication", title: "Communication", description: "Email/SMS providers and notification delivery.", fields: ["emailProvider", "resendApiKey", "smtpEnabled", "smtpHost", "smtpPort", "smtpUsername", "smtpPassword", "smtpFromEmail", "sendgridEnabled", "sendgridApiKey", "sendgridFromEmail", "mailgunEnabled", "mailgunApiKey", "mailgunDomain", "mailgunRegion", "awsSesEnabled", "awsSesAccessKeyId", "awsSesSecretAccessKey", "awsSesRegion", "awsSesFromEmail", "smsProvider", "twilioAccountSid", "twilioAuthToken", "twilioFromNumber", "smsTwilioEnabled", "smsAfricasTalkingEnabled", "africasTalkingUsername", "africasTalkingApiKey", "africasTalkingSenderId", "smsHubtelEnabled", "hubtelClientId", "hubtelClientSecret", "hubtelSenderId", "termiiApiKey", "termiiSenderId", "smsCustomEnabled", "customSmsEndpoint", "customSmsApiKey", "customSmsSenderId", "notifyStudentsEmail", "notifyStudentsSms", "notifyStudentsPush", "notifyStudentsWhatsapp", "notifyParentsEmail", "notifyParentsSms", "notifyParentsPush", "notifyParentsWhatsapp", "notifyTeachersEmail", "notifyTeachersSms", "notifyTeachersPush", "notifyTeachersWhatsapp"] },
  { id: "security", title: "Security & Privacy", description: "MFA, SSO, sessions, audit logs, and data privacy.", fields: ["twoFactorRequired", "ssoEnabled", "ssoProvider", "ssoIssuerUrl", "ssoClientId", "ssoClientSecret", "googleLoginEnabled", "googleClientId", "googleClientSecret", "microsoftLoginEnabled", "microsoftClientId", "microsoftClientSecret", "microsoftTenantId", "passwordMinLength", "sessionTimeoutMinutes", "deviceTrackingEnabled", "activeSessionLimit", "loginLogsEnabled", "changeLogsEnabled", "activityLogsEnabled", "dataRetentionYears", "dataExportEnabled", "dataDeletionRequestsEnabled"] },
  { id: "integrations", title: "Integrations", description: "LMS, webhooks, and external service connections.", fields: ["lmsEnabled", "lmsUrl", "lmsApiKey", "lmsWebhookSecret", "webhookUrl", "webhookSigningSecret", "webhookSigningEnabled", "allowedWebhookDomains"] },
  { id: "transport", title: "Transport", description: "Transport module controls.", fields: ["transportEnabled"] },
  { id: "hostel", title: "Hostel", description: "Hostel and boarding module controls.", fields: ["hostelEnabled"] },
  { id: "documents", title: "Document & Compliance", description: "Templates, compliance, accreditation, legal records, and document retention.", fields: ["documentRetentionYears", "complianceOfficer", "admissionLetterTemplateEnabled", "certificateTemplateEnabled", "reportCardTemplateEnabled", "transcriptTemplateEnabled", "feeInvoiceTemplateEnabled", "ministryComplianceEnabled", "accreditationRecordsEnabled", "legalDocumentsEnabled"] },
  { id: "automation", title: "System Automation", description: "Workflow automation, scheduler jobs, and event triggers.", fields: ["automationEnabled", "autoPromotionEnabled", "autoFeeGenerationEnabled", "autoNotificationsEnabled", "autoTimetableGenerationEnabled", "dailyJobsEnabled", "weeklyJobsEnabled", "monthlyJobsEnabled", "triggerStudentAdmissionEnabled", "triggerFeePaymentEnabled", "triggerExamCompletionEnabled", "triggerGraduationEnabled"] },
  { id: "backup", title: "Back-up & Data", description: "Backups, restore management, rollback, and tenant data exports.", fields: ["backupFrequency", "manualBackupEnabled", "scheduledBackupEnabled", "cloudBackupEnabled", "backupProvider", "restorePointSelection", "oneClickRestoreEnabled", "rollbackEnabled", "exportCsvEnabled", "exportExcelEnabled", "exportPdfEnabled", "exportJsonEnabled"] },
];

function asString(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

async function safeRows<T = Row>(operation: () => Promise<{ rows?: unknown[] } | T[]>, label: string): Promise<T[]> {
  try {
    const result = await operation();
    if (Array.isArray(result)) return result as T[];
    return (result.rows || []) as T[];
  } catch (error) {
    console.warn(`Owner settings ${label} query skipped:`, error instanceof Error ? error.message : error);
    return [];
  }
}

async function getSchool(slug: string) {
  const [school] = await masterDb
    .select({
      id: schoolsTable.id,
      name: schoolsTable.name,
      slug: schoolsTable.slug,
      type: schoolsTable.type,
      status: schoolsTable.status,
      country: schoolsTable.country,
      countryCode: schoolsTable.countryCode,
      currencyCode: schoolsTable.currencyCode,
      currencyName: schoolsTable.currencyName,
    })
    .from(schoolsTable)
    .where(eq(schoolsTable.slug, slug))
    .limit(1);
  return school;
}

function sanitizeSettings(input: Row, current: Record<string, unknown>) {
  const next: Record<string, unknown> = { ...DEFAULT_SETTINGS, ...current };
  for (const key of Object.keys(DEFAULT_SETTINGS)) {
    if (!(key in input)) continue;
    const fallback = (DEFAULT_SETTINGS as Record<string, unknown>)[key];
    if (typeof fallback === "boolean") {
      next[key] = Boolean(input[key]);
    } else if (Array.isArray(fallback) || (fallback && typeof fallback === "object")) {
      next[key] = input[key] ?? fallback;
    } else {
      next[key] = String(input[key] ?? "");
    }
  }
  return next;
}

function changedSettings(before: Record<string, unknown>, after: Record<string, unknown>) {
  return Object.keys(DEFAULT_SETTINGS).filter((key) => JSON.stringify(before[key] ?? "") !== JSON.stringify(after[key] ?? ""));
}

async function readSettings(slug: string) {
  const school = await getSchool(slug);
  if (!school) return null;
  const tenantDb = await getTenantDbBySlug(slug);
  const [owner] = await tenantDb
    .select({
      id: tenantUsersTable.id,
      name: tenantUsersTable.name,
      email: tenantUsersTable.email,
      image: tenantUsersTable.image,
      roleName: rolesTable.name,
    })
    .from(tenantUsersTable)
    .leftJoin(rolesTable, eq(tenantUsersTable.roleId, rolesTable.id))
    .where(sql`lower(coalesce(${rolesTable.name}, ${tenantUsersTable.roleId})) = 'owner'`)
    .limit(1);
  const settingsKey = `tenant_settings:${slug}`;
  const vaultKey = `tenant_settings_vault:${slug}`;
  const rows = await safeRows<Row>(
    () => tenantDb.execute(sql`select value from system_settings where key in (${settingsKey}, 'tenant_settings') order by case when key = ${settingsKey} then 0 else 1 end limit 1`),
    "tenant settings"
  );
  const vaultRows = await safeRows<Row>(
    () => tenantDb.execute(sql`select value from system_settings where key = ${vaultKey} limit 1`),
    "tenant settings vault"
  );
  const vault = vaultRows[0]?.value && typeof vaultRows[0].value === "object" ? vaultRows[0].value as TenantSettingsVault : {};
  const settings = { ...DEFAULT_SETTINGS, ...(rows[0]?.value && typeof rows[0].value === "object" ? rows[0].value : {}) };
  settings.schoolName = asString(settings.schoolName, school.name);
  settings.country = asString(settings.country, school.country || "");
  settings.currency = asString(settings.currency, school.currencyCode || "UGX");
  settings.ownerName = asString(settings.ownerName, owner?.name || "");
  settings.ownerEmail = asString(settings.ownerEmail, owner?.email || "");

  const brandingRows = await safeRows<Row>(() => masterDb.execute(sql`select value from system_settings where key = ${`tenant_branding:${slug}`} limit 1`), "branding");
  const branding = brandingRows[0]?.value && typeof brandingRows[0].value === "object" ? brandingRows[0].value as Row : {};
  settings.logoUrl = asString(settings.logoUrl, asString(branding.logoUrl));
  settings.schoolName = asString(branding.name, asString(settings.schoolName));

  const historyRows = await safeRows<Row>(
    () => tenantDb.execute(sql`select key, value, updated_at from system_settings where key like ${`tenant_settings_version:${slug}:%`} order by updated_at desc limit 8`),
    "tenant settings versions"
  );
  const versions = historyRows.map((row) => {
    const value = row.value && typeof row.value === "object" ? row.value as Row : {};
    return {
      id: String(row.key || "").split(":").pop() || String(row.key || ""),
      createdAt: value.createdAt || row.updated_at || null,
      actorId: value.actorId || null,
      changedKeys: Array.isArray(value.changedKeys) ? value.changedKeys : [],
    };
  });
  const backupRows = await safeRows<Row>(
    () => tenantDb.execute(sql`select key, value, updated_at from system_settings where key like ${`tenant_settings_backup:${slug}:%`} order by updated_at desc limit 8`),
    "tenant settings backups"
  );
  const backups = backupRows.map((row) => {
    const value = row.value && typeof row.value === "object" ? row.value as Row : {};
    return {
      id: String(row.key || "").split(":").pop() || String(row.key || ""),
      createdAt: value.createdAt || row.updated_at || null,
      createdBy: value.createdBy || null,
      size: value.size || null,
    };
  });

  return { school, owner: owner ? { id: owner.id, name: owner.name, email: owner.email, image: owner.image } : null, settings: hydrateMaskedSecrets(settings, vault), sections: SECTIONS, versions, backups, generatedAt: new Date().toISOString() };
}

async function writeSettings(slug: string, settings: Record<string, unknown>, actorId: string, request: NextRequest, changedKeys: string[]) {
  const tenantDb = await getTenantDbBySlug(slug);
  const settingsKey = `tenant_settings:${slug}`;
  const vaultKey = `tenant_settings_vault:${slug}`;
  const currentRows = await safeRows<Row>(
    () => tenantDb.execute(sql`select value from system_settings where key = ${settingsKey} limit 1`),
    "current tenant settings before save"
  );
  const currentSettings = currentRows[0]?.value && typeof currentRows[0].value === "object" ? currentRows[0].value as Row : {};
  const vaultRows = await safeRows<Row>(
    () => tenantDb.execute(sql`select value from system_settings where key = ${vaultKey} limit 1`),
    "current tenant settings vault before save"
  );
  const currentVault = vaultRows[0]?.value && typeof vaultRows[0].value === "object" ? vaultRows[0].value as TenantSettingsVault : {};
  if (Object.keys(currentSettings).length) {
    const versionId = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
    await tenantDb.execute(sql`
      insert into system_settings (id, key, value, category, description, created_at, updated_at)
      values (
        ${crypto.randomUUID()},
        ${`tenant_settings_version:${slug}:${versionId}`},
        ${JSON.stringify({ id: versionId, settings: currentSettings, createdAt: new Date().toISOString(), actorId, changedKeys })}::jsonb,
        'school_settings_version',
        ${`Tenant settings version for ${slug}`},
        now(),
        now()
      )
      on conflict (key) do update set value = excluded.value, updated_at = now()
    `);
  }
  const secured = extractAndMaskSecrets(settings, currentVault);
  await tenantDb.execute(sql`
    insert into system_settings (id, key, value, category, description, created_at, updated_at)
    values (${crypto.randomUUID()}, ${settingsKey}, ${JSON.stringify(secured.settings)}::jsonb, 'school', ${`Owner tenant settings for ${slug}`}, now(), now())
    on conflict (key) do update set value = excluded.value, updated_at = now()
  `);
  await tenantDb.execute(sql`
    insert into system_settings (id, key, value, category, description, created_at, updated_at)
    values (${crypto.randomUUID()}, ${vaultKey}, ${JSON.stringify(secured.vault)}::jsonb, 'secret_vault', ${`Encrypted tenant settings vault for ${slug}`}, now(), now())
    on conflict (key) do update set value = excluded.value, updated_at = now()
  `);
  await masterDb.execute(sql`
    insert into system_settings (id, key, value, category, description, created_at, updated_at)
    values (
      ${crypto.randomUUID()},
      ${`tenant_branding:${slug}`},
      ${JSON.stringify({
        name: secured.settings.schoolName,
        logoUrl: secured.settings.logoUrl || null,
        faviconUrl: secured.settings.faviconUrl || null,
        schoolSealUrl: secured.settings.schoolSealUrl || null,
        reportCardWatermarkUrl: secured.settings.reportCardWatermarkUrl || null,
        emailHeaderLogoUrl: secured.settings.emailHeaderLogoUrl || null,
        loginScreenLogoUrl: secured.settings.loginScreenLogoUrl || null,
        mobileAppLogoUrl: secured.settings.mobileAppLogoUrl || null,
        primaryColor: secured.settings.primaryColor || null,
        secondaryColor: secured.settings.secondaryColor || null,
        accentColor: secured.settings.accentColor || null,
        successColor: secured.settings.successColor || null,
        warningColor: secured.settings.warningColor || null,
        errorColor: secured.settings.errorColor || null,
        typography: secured.settings.typography || null,
        fontFamily: secured.settings.fontFamily || null,
        themeMode: secured.settings.themeMode || null,
        portalLayout: secured.settings.portalLayout || null,
        sidebarLayout: secured.settings.sidebarLayout || null,
        topNavigationLayout: secured.settings.topNavigationLayout || null,
        compactMode: secured.settings.compactMode ?? null,
        fullWidthMode: secured.settings.fullWidthMode ?? null,
        roundedCorners: secured.settings.roundedCorners ?? null,
        borderRadius: secured.settings.borderRadius || null,
        shadowIntensity: secured.settings.shadowIntensity || null,
      })}::jsonb,
      'branding',
      ${`Tenant branding for ${slug}`},
      now(),
      now()
    )
    on conflict (key) do update set value = excluded.value, updated_at = now()
  `);
  await masterDb.update(schoolsTable).set({
    name: String(secured.settings.schoolName || ""),
    country: String(secured.settings.country || ""),
    currencyCode: String(secured.settings.currency || ""),
    updatedAt: new Date(),
  }).where(eq(schoolsTable.slug, slug));

  if (typeof secured.settings.ownerName === "string" && secured.settings.ownerName.trim()) {
    await tenantDb
      .update(tenantUsersTable)
      .set({ name: secured.settings.ownerName.trim(), updatedAt: new Date() })
      .where(eq(tenantUsersTable.id, actorId));
  }

  const automationJobs = {
    enabled: Boolean(secured.settings.automationEnabled),
    workflows: {
      autoPromotion: Boolean(secured.settings.autoPromotionEnabled),
      autoFeeGeneration: Boolean(secured.settings.autoFeeGenerationEnabled),
      autoNotifications: Boolean(secured.settings.autoNotificationsEnabled),
      autoTimetableGeneration: Boolean(secured.settings.autoTimetableGenerationEnabled),
    },
    scheduler: {
      daily: Boolean(secured.settings.dailyJobsEnabled),
      weekly: Boolean(secured.settings.weeklyJobsEnabled),
      monthly: Boolean(secured.settings.monthlyJobsEnabled),
    },
    triggers: {
      studentAdmission: Boolean(secured.settings.triggerStudentAdmissionEnabled),
      feePayment: Boolean(secured.settings.triggerFeePaymentEnabled),
      examCompletion: Boolean(secured.settings.triggerExamCompletionEnabled),
      graduation: Boolean(secured.settings.triggerGraduationEnabled),
    },
    updatedAt: new Date().toISOString(),
    updatedBy: actorId,
  };
  await tenantDb.execute(sql`
    insert into system_settings (id, key, value, category, description, created_at, updated_at)
    values (${crypto.randomUUID()}, ${`tenant_automation_jobs:${slug}`}, ${JSON.stringify(automationJobs)}::jsonb, 'automation', ${`Tenant automation job bindings for ${slug}`}, now(), now())
    on conflict (key) do update set value = excluded.value, updated_at = now()
  `);

  await writeTenantAuditLog({
    db: tenantDb,
    request,
    actorId,
    action: "School Settings Updated",
    resource: "tenant_settings",
    resourceId: slug,
    changes: { changedKeys, count: changedKeys.length, secretPathsUpdated: Object.keys(secured.vault).length },
    status: "success",
  });
}

export async function GET(request: NextRequest) {
  try {
    const slug = request.nextUrl.searchParams.get("tenant")?.trim().toLowerCase();
    if (!slug) return NextResponse.json({ error: "Tenant slug is required" }, { status: 400 });
    const currentUser = await requireTenantOwner(request, slug);
    if (isTenantOwnerResponse(currentUser)) return currentUser;
    const payload = await readSettings(slug);
    if (!payload) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    return NextResponse.json(payload, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    console.error("Owner settings GET failed:", error);
    return NextResponse.json({ error: "Failed to load tenant settings" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const slug = request.nextUrl.searchParams.get("tenant")?.trim().toLowerCase();
    if (!slug) return NextResponse.json({ error: "Tenant slug is required" }, { status: 400 });
    const currentUser = await requireTenantOwner(request, slug);
    if (isTenantOwnerResponse(currentUser)) return currentUser;
    const current = await readSettings(slug);
    if (!current) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    const body = (await request.json().catch(() => ({}))) as Row;
    const settings = sanitizeSettings(body.settings && typeof body.settings === "object" ? body.settings as Row : body, current.settings);
    const validationIssues = validateTenantSettings(settings);
    const errors = validationIssues.filter((issue) => issue.severity === "error");
    if (errors.length) {
      return NextResponse.json({ error: "Settings validation failed", issues: validationIssues }, { status: 422 });
    }
    const changedKeys = changedSettings(current.settings, settings);
    if (!changedKeys.length) return NextResponse.json(current, { headers: { "Cache-Control": "no-store, max-age=0" } });
    await writeSettings(slug, settings, currentUser.userId, request, changedKeys);
    deleteCachedValue(`tenant-dashboard:${slug}`);
    deleteCachedValue(`owner-finance:${slug}`);
    const payload = await readSettings(slug);
    return NextResponse.json(payload, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    console.error("Owner settings PATCH failed:", error);
    return NextResponse.json({ error: "Failed to save tenant settings" }, { status: 500 });
  }
}
