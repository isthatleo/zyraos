"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import {
  AlertCircle,
  Bell,
  Building2,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  Database,
  ExternalLink,
  GraduationCap,
  ImageIcon,
  Palette,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Shield,
  SlidersHorizontal,
  Trash2,
  Upload,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { CURRENCY_OPTIONS, CityInput, CountrySelect, CurrencySelect, PhoneNumberField } from "@/components/shared/localized-fields";
import { cn } from "@/lib/utils";
import { resolveTenantSlug } from "@/lib/tenant-routing";

const settingsSectionTitleClass = "text-2xl font-bold tracking-tight text-foreground";

type SettingsValue = string | boolean | number | string[] | AcademicStage[] | SubjectPolicy | AcademicPolicy | ResultPublicationControl | AssessmentCategory[] | GradingScaleRow[] | RankingPolicy | PositionRules | FinanceFeeItem[] | FinanceDiscountRule[] | FinancePenaltyEngine | FinanceInstallmentPlan | FinancePaymentInvoice | FinanceCurrencies | Record<string, unknown> | unknown[];
type Section = { id: string; title: string; description: string; fields: string[] };
type AcademicStage = { id: string; name: string; capacityPerClass: number; levels: string[]; streams: string[] };
type SubjectPolicy = { coreMandatory: boolean; minElectives: number; maxElectives: number; weightingMethod: string; assignments: Array<{ id: string; subject: string; category: string; target: string }> };
type AcademicPolicy = {
  minimumAverage: number;
  distinctionThreshold: number;
  passThreshold: number;
  meritThreshold: number;
  maxFailedSubjects: number;
  carryOverAllowed: boolean;
  coreSubjectsMustPass: boolean;
  automaticPromotion: boolean;
  manualOverrideAllowed: boolean;
  supplementaryExamAllowed: boolean;
  repeatClass: boolean;
  promotionLogic: string;
  repetitionLogic: string;
  graduationLogic: string;
};
type ResultPublicationControl = { autoPublish: boolean; adminApprovalRequired: boolean; lockAfterSubmission: boolean; notifyParents: boolean };
type AssessmentCategory = { id: string; name: string; weight: number; appliedTo: string[] };
type GradingScaleRow = { id: string; min: number; max: number; grade: string };
type RankingPolicy = { gpaCalculation: string; rankingSystem: string; reportCardFormat: string; passMark: number; showPositionOnReportCards: boolean };
type PositionRules = { minimumOverallAverage: number; minimumSubjectScore: number; maxFailedSubjectsAllowed: number; requiredMustPassSubjects: string[] };
type FinanceFeeItem = { id: string; name: string; type: string; defaultAmount: number; billingCycle: string; mandatory: boolean; appliesTo: string[]; stagePricing: Record<string, number> };
type FinanceDiscountRule = { id: string; name: string; type: string; value: number; appliedTo: string; autoApply: boolean };
type FinancePenaltyEngine = { gracePeriodDays: number; penaltyType: string; penaltyValue: number; capAmount: number; recurringPenalty: boolean; consequence: string };
type FinanceInstallmentPlan = { allowPartialPayments: boolean; minimumInstallment: number; maxInstallments: number; autoDueDate: boolean };
type FinancePaymentInvoice = { currency: string; invoicePrefix: string; taxRate: number; providers: Record<string, boolean> };
type FinanceCurrencies = { baseCurrency: string; enabledCurrencies: string[] };
type Payload = {
  school: { name: string; slug: string; type: string; status: string; country?: string; currencyCode?: string | null };
  owner?: { id: string; name: string; email: string; image?: string | null } | null;
  settings: Record<string, SettingsValue>;
  sections: Section[];
  versions?: Array<{ id: string; createdAt: string | null; actorId: string | null; changedKeys: unknown[] }>;
  backups?: Array<{ id: string; createdAt: string | null; createdBy: string | null; size: number | null }>;
  generatedAt: string;
};

const fallbackSections: Section[] = [
  { id: "school_name", title: "School Profile", description: "Core school identity, contact, location, and administrator details.", fields: [] },
  { id: "branding", title: "Branding & Appearance", description: "Tenant logos, colors, typography, portal layout, and previews.", fields: [] },
  { id: "academic", title: "Academic Settings", description: "Academic identity, policies, grading logic, and publication controls.", fields: [] },
  { id: "academic_structure", title: "Academic Structure", description: "Dynamic stages, levels, streams, and generated classes.", fields: [] },
  { id: "attendance", title: "Attendance", description: "Attendance modes, late policies, notifications, and grading.", fields: [] },
  { id: "examination", title: "Examination & Grading", description: "Assessment categories, grading scales, ranking, and report card rules.", fields: [] },
  { id: "finance", title: "Finance", description: "Fee structures, discounts, penalties, providers, and currencies.", fields: [] },
  { id: "communication", title: "Communication", description: "Email, SMS, push, WhatsApp, and live provider tests.", fields: [] },
  { id: "backup", title: "Back-up & Data", description: "Backup execution, restore management, and data exports.", fields: [] },
];

const sectionIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  school_name: Building2,
  branding: Palette,
  academic: GraduationCap,
  academic_structure: SlidersHorizontal,
  attendance: CheckCircle2,
  examination: GraduationCap,
  finance: CreditCard,
  naming: SlidersHorizontal,
  payment_gateways: CreditCard,
  communication: Bell,
  security: Shield,
  integrations: SlidersHorizontal,
  transport: SlidersHorizontal,
  hostel: Building2,
  documents: Shield,
  automation: SlidersHorizontal,
  backup: Database,
};

const labels: Record<string, string> = {
  schoolName: "School Name",
  registrationNumber: "Registration Number",
  schoolType: "School Type",
  schoolCategory: "School Category",
  schoolDescription: "School Description",
  dateEstablished: "Date Established",
  logoUrl: "Logo URL",
  faviconUrl: "Favicon URL",
  schoolSealUrl: "School Seal URL",
  reportCardWatermarkUrl: "Report Card Watermark URL",
  emailHeaderLogoUrl: "Email Header Logo",
  loginScreenLogoUrl: "Login Screen Logo",
  mobileAppLogoUrl: "Mobile App Logo",
  motto: "Motto",
  address: "Address",
  postalAddress: "Postal Address",
  stateProvince: "State / Province",
  district: "District",
  gpsCoordinates: "GPS Coordinates",
  city: "City / Town",
  country: "Country",
  phone: "Phone",
  alternativePhone: "Alternative Phone",
  supportEmail: "Support Email",
  faxNumber: "Fax Number",
  email: "Email",
  website: "Website",
  primaryColor: "Primary Color",
  secondaryColor: "Secondary Color",
  accentColor: "Accent Color",
  successColor: "Success Color",
  warningColor: "Warning Color",
  errorColor: "Error Color",
  typography: "Typography",
  fontFamily: "Font Family",
  themeMode: "Theme",
  portalLayout: "Portal Layout",
  sidebarLayout: "Sidebar Layout",
  topNavigationLayout: "Top Navigation Layout",
  compactMode: "Compact Mode",
  fullWidthMode: "Full Width Mode",
  roundedCorners: "Rounded Corners",
  borderRadius: "Border Radius",
  shadowIntensity: "Shadow Intensity",
  academicYear: "Academic Year",
  currentTerm: "Current Term",
  schoolShortName: "Short Name / Abbrev.",
  schoolCode: "School Code",
  schoolLevels: "School Levels",
  curriculumType: "Curriculum Type",
  academicYearFormat: "Academic Year Format",
  termSystem: "Term / Semester System",
  academicCalendarType: "Academic Calendar Type",
  gradeComputationMethod: "Computation Mode",
  curriculumTemplate: "Curriculum Template",
  classNamingFormat: "Class Naming Format",
  defaultClassCapacity: "Default Capacity",
  timezone: "Timezone",
  attendanceMode: "Attendance Mode",
  lateThresholdMinutes: "Late Threshold Minutes",
  gradingScale: "Grading Scale",
  passMark: "Pass Mark",
  currency: "Currency",
  invoicePrefix: "Invoice Prefix",
  receiptPrefix: "Receipt Prefix",
  paystackEnabled: "Enable Paystack",
  paystackPublicKey: "Paystack Public Key",
  paystackSecretKey: "Paystack Secret Key",
  momoEnabled: "Enable Mobile Money",
  momoProvider: "Mobile Money Provider",
  emailProvider: "Email Provider",
  resendApiKey: "Resend API Key",
  smtpEnabled: "Enable SMTP",
  smtpHost: "SMTP Host",
  smtpPort: "SMTP Port",
  smtpUsername: "SMTP Username",
  smtpPassword: "SMTP Password",
  smtpFromEmail: "SMTP From Email",
  sendgridEnabled: "Enable SendGrid",
  sendgridApiKey: "SendGrid API Key",
  sendgridFromEmail: "SendGrid From Email",
  mailgunEnabled: "Enable Mailgun",
  mailgunApiKey: "Mailgun API Key",
  mailgunDomain: "Mailgun Domain",
  mailgunRegion: "Mailgun Region",
  awsSesEnabled: "Enable AWS SES",
  awsSesAccessKeyId: "AWS SES Access Key ID",
  awsSesSecretAccessKey: "AWS SES Secret Access Key",
  awsSesRegion: "AWS SES Region",
  awsSesFromEmail: "AWS SES From Email",
  smsProvider: "SMS Provider",
  twilioAccountSid: "Twilio Account SID",
  twilioAuthToken: "Twilio Auth Token",
  twilioFromNumber: "Twilio From Number",
  smsTwilioEnabled: "Enable Twilio",
  smsAfricasTalkingEnabled: "Enable Africa's Talking",
  africasTalkingUsername: "Africa's Talking Username",
  africasTalkingApiKey: "Africa's Talking API Key",
  africasTalkingSenderId: "Africa's Talking Sender ID",
  smsHubtelEnabled: "Enable Hubtel",
  hubtelClientId: "Hubtel Client ID",
  hubtelClientSecret: "Hubtel Client Secret",
  hubtelSenderId: "Hubtel Sender ID",
  termiiApiKey: "Termii API Key",
  termiiSenderId: "Termii Sender ID",
  smsCustomEnabled: "Enable Custom SMS",
  customSmsEndpoint: "Custom SMS Endpoint",
  customSmsApiKey: "Custom SMS API Key",
  customSmsSenderId: "Custom SMS Sender ID",
  twoFactorRequired: "Require Two-Factor Authentication",
  ssoEnabled: "Enable SSO",
  ssoProvider: "SSO Provider",
  ssoIssuerUrl: "SSO Issuer URL",
  ssoClientId: "SSO Client ID",
  ssoClientSecret: "SSO Client Secret",
  googleLoginEnabled: "Google Login",
  googleClientId: "Google Client ID",
  googleClientSecret: "Google Client Secret",
  microsoftLoginEnabled: "Microsoft Login",
  microsoftClientId: "Microsoft Client ID",
  microsoftClientSecret: "Microsoft Client Secret",
  microsoftTenantId: "Microsoft Tenant ID",
  deviceTrackingEnabled: "Device Tracking",
  activeSessionLimit: "Active Session Limit",
  loginLogsEnabled: "Login Logs",
  changeLogsEnabled: "Change Logs",
  activityLogsEnabled: "Activity Logs",
  dataRetentionYears: "Data Retention Years",
  dataExportEnabled: "Data Export",
  dataDeletionRequestsEnabled: "Data Deletion Requests",
  passwordMinLength: "Password Minimum Length",
  sessionTimeoutMinutes: "Session Timeout Minutes",
  lmsEnabled: "Enable LMS Integration",
  lmsUrl: "LMS URL",
  lmsApiKey: "LMS API Key",
  lmsWebhookSecret: "LMS Webhook Secret",
  webhookUrl: "Webhook URL",
  webhookSigningSecret: "Webhook Signing Secret",
  webhookSigningEnabled: "Webhook Signing",
  allowedWebhookDomains: "Allowed Webhook Domains",
  transportEnabled: "Enable Transport",
  hostelEnabled: "Enable Hostel",
  documentRetentionYears: "Document Retention Years",
  complianceOfficer: "Compliance Officer",
  admissionLetterTemplateEnabled: "Admission Letters",
  certificateTemplateEnabled: "Certificates",
  reportCardTemplateEnabled: "Report Cards",
  transcriptTemplateEnabled: "Transcripts",
  feeInvoiceTemplateEnabled: "Fee Invoices",
  ministryComplianceEnabled: "Ministry Compliance",
  accreditationRecordsEnabled: "Accreditation Records",
  legalDocumentsEnabled: "Legal Documents",
  automationEnabled: "Enable Automation",
  autoPromotionEnabled: "Auto Promotion",
  autoFeeGenerationEnabled: "Auto Fee Generation",
  autoNotificationsEnabled: "Auto Notifications",
  autoTimetableGenerationEnabled: "Auto Timetable Generation",
  dailyJobsEnabled: "Daily Jobs",
  weeklyJobsEnabled: "Weekly Jobs",
  monthlyJobsEnabled: "Monthly Jobs",
  triggerStudentAdmissionEnabled: "Student Admission Trigger",
  triggerFeePaymentEnabled: "Fee Payment Trigger",
  triggerExamCompletionEnabled: "Exam Completion Trigger",
  triggerGraduationEnabled: "Graduation Trigger",
  backupFrequency: "Backup Frequency",
  manualBackupEnabled: "Manual Backup",
  scheduledBackupEnabled: "Scheduled Backup",
  cloudBackupEnabled: "Cloud Backup",
  backupProvider: "Backup Provider",
  restorePointSelection: "Restore Point",
  oneClickRestoreEnabled: "One Click Restore",
  rollbackEnabled: "Rollback",
  exportCsvEnabled: "CSV Export",
  exportExcelEnabled: "Excel Export",
  exportPdfEnabled: "PDF Export",
  exportJsonEnabled: "JSON Export",
  ownerName: "Owner Name",
  ownerEmail: "Owner Email",
  ownerPhone: "Owner Phone",
  ownerTitle: "Owner Title",
};

const selectOptions: Record<string, string[]> = {
  city: ["Kampala", "Entebbe", "Jinja", "Mbarara", "Gulu", "Nairobi", "Mombasa", "Dar es Salaam", "Kigali", "Johannesburg", "Cape Town", "Lagos", "Abuja", "Accra", "London", "New York"],
  country: ["Uganda", "Kenya", "Tanzania", "Rwanda", "South Africa", "Nigeria", "Ghana", "United States", "United Kingdom"],
  timezone: ["Africa/Kampala", "Africa/Johannesburg", "Africa/Nairobi", "UTC"],
  themeMode: ["system", "light", "dark"],
  portalLayout: ["modern", "classic", "compact", "showcase"],
  schoolType: ["Primary School", "Secondary School", "High School", "College", "University", "Vocational / Technical", "Hybrid"],
  schoolCategory: ["Private", "Public", "Government Aided", "International", "Faith Based", "Community", "Charter"],
  typography: ["Modern Sans", "Classic Serif", "Editorial", "Rounded", "Compact"],
  fontFamily: ["Geist", "Inter", "Montserrat", "Lora", "Poppins", "Nunito"],
  sidebarLayout: ["expanded", "compact", "icons-only"],
  topNavigationLayout: ["standard", "dense", "centered", "minimal"],
  shadowIntensity: ["none", "soft", "medium", "strong"],
  curriculumType: ["Local / National", "British", "Cambridge (IGCSE)", "International Baccalaureate", "American", "French", "Hybrid / Blended"],
  academicYearFormat: ["September - July", "January - December", "August - June", "Custom"],
  termSystem: ["Trimester (3 terms)", "Semester (2 terms)", "Quarterly (4 terms)"],
  academicCalendarType: ["Standard", "Year-round", "Modular", "Custom"],
  gradeComputationMethod: ["Weighted Average (All Subjects)", "Best N Subjects", "Core Subjects Double Weighted"],
  curriculumTemplate: ["Custom Structure", "Montessori", "American Curriculum", "British Curriculum", "Uganda - UNEB PLE", "Uganda - UNEB UCE", "Uganda - UNEB UACE", "Ghana - GES", "Ghana - SHS", "Kenya - CBC", "South Africa - CAPS", "Nigeria - WAEC/NECO", "Cambridge International", "International Baccalaureate"],
  classNamingFormat: ["Stage + Number + Section (Primary 1A)", "Stage + Level + Stream (SHS 2 Science)", "Level + Section (Year 1 Group A)", "Custom"],
  attendanceMode: ["Manual Entry", "QR Code Scan", "Biometric", "RFID Card"],
  attendanceCaptureWindow: ["Full school day", "Morning only", "Per lesson / period", "Boarding roll call", "Custom"],
  gradingScale: ["percentage", "letter", "points", "competency"],
  gpaCalculation: ["Weighted Average", "Simple Average", "Cumulative Average (CGPA)"],
  rankingSystem: ["Class-level Ranking", "Grade-level Ranking", "No Ranking"],
  reportCardFormat: ["Standard", "Competency Based", "Transcript Style", "Narrative", "Compact"],
  currency: CURRENCY_OPTIONS.map((currency) => currency.code),
  backupProvider: ["AWS S3", "Google Cloud Storage", "Azure Blob Storage", "Local encrypted storage", "Custom S3 compatible"],
  feeItemType: ["Academic", "Residential", "Service", "Administrative", "One Time"],
  billingCycle: ["Per Term", "Per Semester", "Per Year", "Per Month", "One Time"],
  discountType: ["Percentage", "Fixed Amount"],
  penaltyType: ["Percentage of Outstanding Fees", "Fixed Amount"],
  financeConsequence: ["No consequences", "Block report cards", "Block portal access", "Require admin clearance"],
  emailProvider: ["resend", "smtp", "sendgrid", "mailgun", "aws_ses", "disabled"],
  smsProvider: ["twilio", "africas_talking", "hubtel", "termii", "custom", "disabled"],
  mailgunRegion: ["US", "EU"],
  awsSesRegion: ["us-east-1", "us-west-2", "eu-west-1", "eu-central-1", "af-south-1", "ap-south-1"],
  ssoProvider: ["disabled", "oidc", "saml"],
  backupFrequency: ["hourly", "daily", "weekly", "monthly"],
};

function loadingState(section: Section, routeTenantSlug: string) {
  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-border bg-card/95 p-4 shadow-sm ring-1 ring-border/60 backdrop-blur">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <Badge className="rounded-full bg-primary/10 text-primary hover:bg-primary/10">Tenant ecosystem settings</Badge>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight">{section.title}</h1>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{section.description}</p>
          </div>
          <Button className="rounded-2xl" disabled>
            <Save className="mr-2 h-4 w-4 animate-pulse" /> Save Settings
          </Button>
        </div>
      </section>
      <div className="grid gap-6 lg:grid-cols-[19rem_1fr]">
        <Card className="h-96 rounded-3xl border-border bg-card/95">
          <CardHeader>
            <CardTitle>Sections</CardTitle>
            <CardDescription>Each section opens as its own settings page.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1">
            {fallbackSections.map((item) => {
              const Icon = sectionIcons[item.id] || SlidersHorizontal;
              const active = item.id === section.id;
              return (
                <Link
                  key={item.id}
                  href={sectionHref(routeTenantSlug, item.id)}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl px-3 py-2 text-sm font-medium transition-colors",
                    active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.title}</span>
                </Link>
              );
            })}
          </CardContent>
        </Card>
        <Skeleton className="h-[560px] rounded-3xl" />
      </div>
    </div>
  );
}

function sectionHref(routeTenantSlug: string, sectionId: string) {
  return `${routeTenantSlug ? `/${routeTenantSlug}` : ""}/owner/settings/${sectionId}`;
}

function applyTenantFavicon(faviconUrl: string) {
  if (typeof document === "undefined" || !faviconUrl) return;
  const existing = document.querySelector<HTMLLinkElement>("link[rel='icon']");
  const link = existing || document.createElement("link");
  link.rel = "icon";
  link.href = faviconUrl;
  if (!existing) document.head.appendChild(link);
}

export function OwnerSettingsWorkspace({ sectionId }: { sectionId?: string }) {
  const params = useParams<{ tenant?: string }>();
  const pathname = usePathname();
  const paramTenantSlug = params?.tenant || "";
  const routeTenantSlug = paramTenantSlug && pathname?.startsWith(`/${paramTenantSlug}/`) ? paramTenantSlug : "";
  const tenantSlug = routeTenantSlug || (typeof window !== "undefined" ? resolveTenantSlug(pathname, window.location.host) || "" : "");
  const [data, setData] = React.useState<Payload | null>(null);
  const [settings, setSettings] = React.useState<Record<string, SettingsValue>>({});
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [actionLoading, setActionLoading] = React.useState("");
  const [validationIssues, setValidationIssues] = React.useState<Array<{ field: string; message: string; severity: string }>>([]);
  const [error, setError] = React.useState("");
  const [selectedSectionId, setSelectedSectionId] = React.useState(sectionId || "");
  const sectionContentRef = React.useRef<HTMLElement | null>(null);

  const fetchData = React.useCallback(async (silent = false) => {
    if (!tenantSlug) return;
    if (silent) setRefreshing(true);
    else setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/tenant/owner/settings?tenant=${encodeURIComponent(tenantSlug)}`, { credentials: "include", cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || "Failed to load tenant settings");
      setData(payload);
      setSettings(payload.settings || {});
    } catch (fetchError) {
      const message = fetchError instanceof Error ? fetchError.message : "Failed to load tenant settings";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [tenantSlug]);

  React.useEffect(() => {
    void fetchData();
  }, [fetchData]);

  React.useEffect(() => {
    setSelectedSectionId(sectionId || "");
  }, [sectionId]);

  React.useEffect(() => {
    const syncFromHistory = () => {
      const match = window.location.pathname.match(/\/owner\/settings\/([^/]+)/);
      setSelectedSectionId(match?.[1] || "");
    };

    window.addEventListener("popstate", syncFromHistory);
    return () => window.removeEventListener("popstate", syncFromHistory);
  }, []);

  const activeSection = React.useMemo(() => {
    if (!data?.sections.length) return null;
    return data.sections.find((section) => section.id === selectedSectionId) || data.sections[0];
  }, [data?.sections, selectedSectionId]);

  React.useEffect(() => {
    sectionContentRef.current?.scrollTo({ top: 0, behavior: "auto" });
  }, [activeSection?.id]);

  function selectSection(nextSectionId: string) {
    setSelectedSectionId(nextSectionId);
    if (tenantSlug && typeof window !== "undefined") {
      window.history.pushState(null, "", sectionHref(routeTenantSlug, nextSectionId));
    }
  }

  function setField(key: string, value: SettingsValue) {
    setSettings((current) => ({ ...current, [key]: value }));
  }

  function syncBrandingPreview(nextSettings: Record<string, SettingsValue>) {
    const branding = {
      name: String(nextSettings.schoolName || data?.school.name || ""),
      logoUrl: nextSettings.logoUrl ? String(nextSettings.logoUrl) : null,
      faviconUrl: nextSettings.faviconUrl ? String(nextSettings.faviconUrl) : null,
    };
    try {
      const storageKey = `roxan:tenant-branding:${tenantSlug}`;
      const serialized = JSON.stringify(branding);
      sessionStorage.setItem(storageKey, serialized);
      localStorage.setItem(storageKey, serialized);
    } catch {}
    window.dispatchEvent(new CustomEvent("roxan:tenant-branding-updated", { detail: branding }));
    if (branding.faviconUrl) applyTenantFavicon(branding.faviconUrl);
  }

  function setBrandingField(key: string, value: SettingsValue) {
    setSettings((current) => {
      const next = { ...current, [key]: value };
      syncBrandingPreview(next);
      return next;
    });
  }

  async function save() {
    setSaving(true);
    try {
      const response = await fetch(`/api/tenant/owner/settings?tenant=${encodeURIComponent(tenantSlug)}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings }),
      });
      const payload = await response.json();
      if (!response.ok) {
        if (Array.isArray(payload?.issues)) setValidationIssues(payload.issues);
        throw new Error(payload?.error || "Failed to save tenant settings");
      }
      setValidationIssues([]);
      setData(payload);
      setSettings(payload.settings || {});
      const branding = {
        name: String(payload.settings?.schoolName || payload.school?.name || ""),
        logoUrl: payload.settings?.logoUrl ? String(payload.settings.logoUrl) : null,
        faviconUrl: payload.settings?.faviconUrl ? String(payload.settings.faviconUrl) : null,
      };
      try {
        const storageKey = `roxan:tenant-branding:${tenantSlug}`;
        const serialized = JSON.stringify(branding);
        sessionStorage.setItem(storageKey, serialized);
        localStorage.setItem(storageKey, serialized);
      } catch {}
      window.dispatchEvent(new CustomEvent("roxan:tenant-branding-updated", { detail: branding }));
      window.dispatchEvent(new CustomEvent("roxan:tenant-settings-updated", { detail: payload.settings }));
      if (branding.faviconUrl) applyTenantFavicon(branding.faviconUrl);
      toast.success("Tenant settings saved and synced");
    } catch (saveError) {
      toast.error(saveError instanceof Error ? saveError.message : "Failed to save tenant settings");
    } finally {
      setSaving(false);
    }
  }

  async function runSettingsAction(action: string, request: () => Promise<Response>, successMessage: string) {
    setActionLoading(action);
    try {
      const response = await request();
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || payload.message || "Settings action failed");
      toast.success(successMessage);
      await fetchData(true);
      return payload;
    } catch (actionError) {
      toast.error(actionError instanceof Error ? actionError.message : "Settings action failed");
      return null;
    } finally {
      setActionLoading("");
    }
  }

  function testProvider(provider: string) {
    return runSettingsAction(
      `test:${provider}`,
      () => fetch(`/api/tenant/owner/settings/test?tenant=${encodeURIComponent(tenantSlug)}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider }),
      }),
      `${provider} test completed`
    );
  }

  function rollbackVersion(versionId: string) {
    return runSettingsAction(
      `rollback:${versionId}`,
      () => fetch(`/api/tenant/owner/settings/versions?tenant=${encodeURIComponent(tenantSlug)}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ versionId }),
      }),
      "Settings version restored"
    );
  }

  function createBackup() {
    return runSettingsAction(
      "backup:create",
      () => fetch(`/api/tenant/owner/settings/backups?tenant=${encodeURIComponent(tenantSlug)}`, { method: "POST", credentials: "include" }),
      "Settings backup created"
    );
  }

  function restoreBackup(backupId: string) {
    return runSettingsAction(
      `backup:${backupId}`,
      () => fetch(`/api/tenant/owner/settings/backups?tenant=${encodeURIComponent(tenantSlug)}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ backupId }),
      }),
      "Settings backup restored"
    );
  }

  const fallbackSection = fallbackSections.find((section) => section.id === selectedSectionId) || fallbackSections[0];

  if (loading) return loadingState(fallbackSection, routeTenantSlug);

  if (error || !data) {
    return (
      <Alert variant="destructive" className="rounded-3xl">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Tenant settings unavailable</AlertTitle>
        <AlertDescription className="mt-2 flex items-center justify-between gap-4">
          <span>{error || "The owner settings page could not be loaded."}</span>
          <Button variant="outline" onClick={() => fetchData()}>Retry</Button>
        </AlertDescription>
      </Alert>
    );
  }

  const selectedSection = activeSection || data.sections[0];
  const pageTitle = selectedSection.title;
  const pageDescription = selectedSection.description;

  return (
    <div className="flex h-[calc(100svh-7rem)] min-h-0 flex-col gap-4 overflow-hidden">
      <section className="shrink-0 rounded-3xl border border-border bg-card/95 p-4 shadow-sm ring-1 ring-border/60 backdrop-blur">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <Badge className="rounded-full bg-primary/10 text-primary hover:bg-primary/10">Tenant ecosystem settings</Badge>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight">{pageTitle}</h1>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{pageDescription}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="rounded-2xl" disabled={refreshing} onClick={() => fetchData(true)}>
              <RefreshCw className={cn("mr-2 h-4 w-4", refreshing && "animate-spin")} /> Refresh
            </Button>
            <Button className="rounded-2xl" disabled={saving} onClick={save}>
              <Save className={cn("mr-2 h-4 w-4", saving && "animate-pulse")} /> Save Settings
            </Button>
          </div>
        </div>
      </section>

      <div className="grid min-h-0 flex-1 gap-6 overflow-hidden lg:grid-cols-[20rem_1fr]">
        <aside className="min-h-0">
          <Card className="flex h-full min-h-0 flex-col border border-border bg-card/95 shadow-sm ring-1 ring-border/60">
            <CardHeader className="shrink-0">
              <CardTitle>Sections</CardTitle>
              <CardDescription>Each section opens as its own settings page.</CardDescription>
            </CardHeader>
            <CardContent className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              {data.sections.map((section) => {
                const Icon = sectionIcons[section.id] || SlidersHorizontal;
                const active = activeSection?.id === section.id;
                return (
                  <Link
                    key={section.id}
                    href={sectionHref(routeTenantSlug, section.id)}
                    onClick={(event) => {
                      event.preventDefault();
                      selectSection(section.id);
                    }}
                    className={cn("flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors", active ? "bg-primary text-primary-foreground shadow-sm" : "hover:bg-muted/70")}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="block truncate text-sm font-medium">{section.title}</span>
                  </Link>
                );
              })}
            </CardContent>
          </Card>
        </aside>

        <main ref={sectionContentRef} className="min-h-0 space-y-6 overflow-y-auto pr-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {validationIssues.length ? (
            <Alert variant="destructive" className="rounded-3xl">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Settings validation failed</AlertTitle>
              <AlertDescription className="mt-2 space-y-1">
                {validationIssues.slice(0, 6).map((issue) => <p key={`${issue.field}-${issue.message}`}>{issue.field}: {issue.message}</p>)}
              </AlertDescription>
            </Alert>
          ) : null}
          <SettingsKpiCards section={selectedSection} settings={settings} data={data} />
          <SectionPage data={data} section={selectedSection} settings={settings} setField={setField} setBrandingField={setBrandingField} tenantSlug={tenantSlug} onSave={save} saving={saving} actionLoading={actionLoading} onTestProvider={testProvider} onCreateBackup={createBackup} onRestoreBackup={restoreBackup} onRollbackVersion={rollbackVersion} />
          <SettingsHardeningPanel data={data} actionLoading={actionLoading} onCreateBackup={createBackup} onRestoreBackup={restoreBackup} onRollbackVersion={rollbackVersion} />
        </main>
      </div>
    </div>
  );
}

function SettingsKpiCards({ section, data, settings }: { section: Section; data: Payload; settings: Record<string, SettingsValue> }) {
  const enabledCount = Object.values(settings).filter((value) => value === true).length;
  const filledCount = section.fields.filter((field) => {
    const value = settings[field];
    return typeof value === "boolean" || String(value || "").trim().length > 0;
  }).length;
  const Icon = sectionIcons[section.id] || SlidersHorizontal;

  return (
    <div className="grid shrink-0 gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <CompactMetric label="School" value={String(settings.schoolName || data.school.name)} detail={data.school.status} />
      <CompactMetric label="Active Section" value={section.title} detail={`${filledCount}/${section.fields.length} configured`} icon={Icon} />
      <CompactMetric label="Currency" value={String(settings.currency || "UGX")} detail="Tenant billing" />
      <CompactMetric label="Security" value={settings.twoFactorRequired ? "MFA on" : "MFA off"} detail={`${String(settings.passwordMinLength || 8)} char minimum`} />
      <CompactMetric label="Enabled Modules" value={String(enabledCount)} detail="Tenant capabilities" />
    </div>
  );
}

function CompactMetric({ label, value, detail, icon: Icon }: { label: string; value: string; detail: string; icon?: React.ComponentType<{ className?: string }> }) {
  return (
    <Card className="rounded-2xl border border-border bg-card/95 shadow-sm ring-1 ring-border/50">
      <CardContent className="flex items-center gap-3 p-3">
        {Icon ? (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Icon className="h-4 w-4" />
          </div>
        ) : null}
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="truncate text-sm font-semibold">{value}</p>
          <p className="truncate text-[11px] text-muted-foreground">{detail}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function OverviewPage({ tenantSlug, data, settings }: { tenantSlug: string; data: Payload; settings: Record<string, SettingsValue> }) {
  return (
    <>
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="rounded-3xl border-border/70 bg-card/80">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">School</p>
            <p className="mt-2 text-2xl font-semibold">{String(settings.schoolName || data.school.name)}</p>
            <p className="mt-2 text-xs text-muted-foreground">{data.school.type} · {data.school.status}</p>
          </CardContent>
        </Card>
        <Card className="rounded-3xl border-border/70 bg-card/80">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Currency</p>
            <p className="mt-2 text-2xl font-semibold">{String(settings.currency || "UGX")}</p>
            <p className="mt-2 text-xs text-muted-foreground">Used across invoices, receipts, billing, and reports.</p>
          </CardContent>
        </Card>
        <Card className="rounded-3xl border-border/70 bg-card/80">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Security</p>
            <p className="mt-2 text-2xl font-semibold">{settings.twoFactorRequired ? "MFA required" : "Standard"}</p>
            <p className="mt-2 text-xs text-muted-foreground">Password minimum: {String(settings.passwordMinLength || 8)} characters.</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {data.sections.map((section) => {
          const Icon = sectionIcons[section.id] || SlidersHorizontal;
          return (
            <Card key={section.id} className="group rounded-3xl border-border/70 bg-card/80 transition-all hover:border-primary/50 hover:shadow-md">
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="rounded-2xl bg-primary/10 p-3 text-primary"><Icon className="h-5 w-5" /></div>
                  <Badge variant="outline" className="rounded-full">{section.fields.length} controls</Badge>
                </div>
                <CardTitle className={settingsSectionTitleClass}>{section.title}</CardTitle>
                <CardDescription>{section.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild className="w-full rounded-2xl">
                  <Link href={sectionHref(tenantSlug, section.id)}>
                    Open section <ChevronRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </>
  );
}

function SchoolProfileSection({ data, settings, setField, onSave, saving }: { data: Payload; settings: Record<string, SettingsValue>; setField: (key: string, value: SettingsValue) => void; onSave: () => Promise<void>; saving: boolean }) {
  const sectionCardClass = "rounded-3xl border border-border bg-card/95 shadow-sm ring-1 ring-border/60";
  const sectionHeaderClass = "px-6 py-5";
  const sectionContentClass = "grid gap-6 p-6 md:grid-cols-2";

  return (
    <div className="space-y-7 pb-3">
      <Card className={sectionCardClass}>
        <CardHeader className={sectionHeaderClass}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className={settingsSectionTitleClass}>School Information</CardTitle>
              <CardDescription>Primary school identity used in dashboards, reports, invoices, and communications.</CardDescription>
            </div>
            <Badge variant="outline" className="rounded-full">Tenant-wide</Badge>
          </div>
        </CardHeader>
        <CardContent className={sectionContentClass}>
          <ProfileControl field="schoolName" value={settings.schoolName || data.school.name} onChange={setField} />
          <ProfileControl field="schoolCode" value={settings.schoolCode} onChange={setField} />
          <ProfileControl field="registrationNumber" value={settings.registrationNumber} onChange={setField} />
          <ProfileControl field="schoolType" value={settings.schoolType || data.school.type || ""} onChange={setField} />
          <ProfileControl field="schoolCategory" value={settings.schoolCategory} onChange={setField} />
          <ProfileControl field="academicYear" value={settings.academicYear} onChange={setField} />
          <ProfileControl field="motto" value={settings.motto} onChange={setField} />
          <ProfileControl field="dateEstablished" value={settings.dateEstablished} onChange={setField} />
          <ProfileControl field="website" value={settings.website} onChange={setField} />
          <div className="space-y-2 md:col-span-2">
            <Label>School Description</Label>
            <Textarea value={String(settings.schoolDescription || "")} onChange={(event) => setField("schoolDescription", event.target.value)} placeholder="Brief official description used on portals, reports, documents, and public landing pages." className="min-h-28 rounded-2xl" />
          </div>
          <div className="space-y-2">
            <Label>Tenant Slug</Label>
            <Input value={data.school.slug} readOnly className="rounded-2xl bg-muted/60" />
            <p className="text-xs text-muted-foreground">The slug controls tenant routing and cannot be changed here.</p>
          </div>
        </CardContent>
      </Card>

      <Card className={sectionCardClass}>
        <CardHeader className={sectionHeaderClass}>
          <CardTitle className={settingsSectionTitleClass}>Contact Information</CardTitle>
          <CardDescription>Official channels used for support, billing, letters, portals, and automated notifications.</CardDescription>
        </CardHeader>
        <CardContent className={sectionContentClass}>
          <ProfileControl field="email" value={settings.email} onChange={setField} />
          <ProfileControl field="supportEmail" value={settings.supportEmail} onChange={setField} />
          <ProfileControl field="phone" value={settings.phone} onChange={setField} />
          <ProfileControl field="alternativePhone" value={settings.alternativePhone} onChange={setField} />
          <ProfileControl field="faxNumber" value={settings.faxNumber} onChange={setField} />
        </CardContent>
      </Card>

      <Card className={sectionCardClass}>
        <CardHeader className={sectionHeaderClass}>
          <CardTitle className={settingsSectionTitleClass}>Location Information</CardTitle>
          <CardDescription>Physical, postal, district, and GPS data for compliance documents and generated PDFs.</CardDescription>
        </CardHeader>
        <CardContent className={sectionContentClass}>
          <div className="space-y-2 md:col-span-2">
            <Label>Full Address</Label>
            <Textarea
              value={String(settings.address || "")}
              onChange={(event) => setField("address", event.target.value)}
              placeholder="Street, building, postal address, district, and landmarks"
              className="min-h-28 rounded-2xl"
            />
          </div>
          <ProfileControl field="country" value={settings.country || data.school.country || ""} onChange={setField} />
          <ProfileControl field="stateProvince" value={settings.stateProvince} onChange={setField} />
          <ProfileControl field="district" value={settings.district} onChange={setField} />
          <ProfileControl field="city" value={settings.city} onChange={setField} />
          <ProfileControl field="postalAddress" value={settings.postalAddress} onChange={setField} />
          <ProfileControl field="gpsCoordinates" value={settings.gpsCoordinates} onChange={setField} />
        </CardContent>
      </Card>

      <Card className={sectionCardClass}>
        <CardHeader className={sectionHeaderClass}>
          <CardTitle className={settingsSectionTitleClass}>Regional Preferences</CardTitle>
          <CardDescription>Controls localization for dates, billing, reports, finance, and tenant dashboards.</CardDescription>
        </CardHeader>
        <CardContent className={sectionContentClass}>
          <ProfileControl field="timezone" value={settings.timezone} onChange={setField} />
          <ProfileControl field="currency" value={settings.currency || data.school.currencyCode || "UGX"} onChange={setField} />
          <div className="rounded-2xl border border-border/80 bg-background/70 p-5 md:col-span-2">
            <p className="text-sm font-medium">Tenant sync behavior</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Currency changes update finance displays and tenant billing preferences. School name and country changes sync to the master school record and tenant branding after saving.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className={sectionCardClass}>
        <CardHeader className={sectionHeaderClass}>
          <CardTitle className={settingsSectionTitleClass}>Administrator</CardTitle>
          <CardDescription>Owner contact details for platform billing, escalation, and tenant administration.</CardDescription>
        </CardHeader>
        <CardContent className={sectionContentClass}>
          <ProfileControl field="ownerName" value={settings.ownerName || data.owner?.name || ""} onChange={setField} />
          <ProfileControl field="ownerEmail" value={settings.ownerEmail || data.owner?.email || ""} onChange={setField} />
          <ProfileControl field="ownerPhone" value={settings.ownerPhone} onChange={setField} />
          <ProfileControl field="ownerTitle" value={settings.ownerTitle || "School Owner"} onChange={setField} />
          <div className="rounded-2xl border border-border/80 bg-background/70 p-5 md:col-span-2">
            <p className="text-sm font-medium">Login account</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Owner name updates sync to the tenant owner user record on save. Email here is the administrator contact email; authentication email changes will be handled in user management.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className={sectionCardClass}>
        <CardHeader className={sectionHeaderClass}>
          <CardTitle className={settingsSectionTitleClass}>Save Configuration</CardTitle>
          <CardDescription>Changes are tracked, audited, and versioned through tenant settings change logs when saved.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 p-6 md:grid-cols-3">
          <div className="rounded-2xl border border-border/80 bg-background/70 p-4"><p className="font-semibold">Auto-save support</p><p className="mt-1 text-sm text-muted-foreground">Edits are staged immediately in the workspace and saved through the tenant API.</p></div>
          <div className="rounded-2xl border border-border/80 bg-background/70 p-4"><p className="font-semibold">Audit logs</p><p className="mt-1 text-sm text-muted-foreground">Saved changes write a tenant audit log with changed keys, actor, IP, and user agent.</p></div>
          <div className="rounded-2xl border border-border/80 bg-background/70 p-4"><p className="font-semibold">Version history</p><p className="mt-1 text-sm text-muted-foreground">The JSON settings payload remains centralized for future historical snapshots.</p></div>
          <div className="flex justify-end md:col-span-3">
            <Button className="rounded-2xl" disabled={saving} onClick={() => void onSave()}><Save className={cn("mr-2 h-4 w-4", saving && "animate-pulse")} /> Save School Profile</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ProfileControl({ field, value, onChange }: { field: string; value: SettingsValue | undefined; onChange: (key: string, value: SettingsValue) => void }) {
  return <FieldControl field={field} value={value} onChange={(nextValue) => onChange(field, nextValue)} />;
}

function BrandingAppearanceSection({
  data,
  settings,
  setField,
  tenantSlug,
}: {
  data: Payload;
  settings: Record<string, SettingsValue>;
  setField: (key: string, value: SettingsValue) => void;
  tenantSlug: string;
}) {
  const [uploadingField, setUploadingField] = React.useState("");
  const sectionCardClass = "rounded-3xl border border-border bg-card/95 shadow-sm ring-1 ring-border/60";
  const sectionHeaderClass = "px-6 py-5";
  const sectionContentClass = "grid gap-6 p-6 md:grid-cols-2";
  const titleClass = "text-2xl font-bold tracking-tight text-foreground";
  const primaryColor = String(settings.primaryColor || "#f97316");
  const secondaryColor = String(settings.secondaryColor || "#111827");

  async function uploadAsset(field: string, file: File | null) {
    if (!file) return;
    setUploadingField(field);
    try {
      const formData = new FormData();
      formData.set("field", field);
      formData.set("file", file);
      const response = await fetch(`/api/tenant/owner/settings/assets?tenant=${encodeURIComponent(tenantSlug)}`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Failed to upload branding asset");
      setField(field, payload.url);
      toast.success("Branding asset uploaded. Save settings to persist it.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to upload branding asset");
    } finally {
      setUploadingField("");
    }
  }

  function resetAsset(field: string) {
    setField(field, "");
    toast.info("Asset reset. Save settings to persist the default.");
  }

  return (
    <div className="space-y-7 pb-3">
      <Card className={sectionCardClass}>
        <CardHeader className={sectionHeaderClass}>
          <CardTitle className={settingsSectionTitleClass}>Branding Assets</CardTitle>
          <CardDescription>Upload or paste URLs for tenant-wide visual assets used in dashboards, documents, portals, and reports.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 p-6">
          <div className="grid gap-6 xl:grid-cols-2">
            <BrandingAssetControl title="Tenant Logo" description="Shown in tenant sidebars and dashboard shell." field="logoUrl" value={String(settings.logoUrl || "")} uploadingField={uploadingField} onUrlChange={setField} onUpload={uploadAsset} onReset={resetAsset} />
            <BrandingAssetControl title="Favicon" description="Browser tab icon for the tenant experience." field="faviconUrl" value={String(settings.faviconUrl || "")} uploadingField={uploadingField} onUrlChange={setField} onUpload={uploadAsset} onReset={resetAsset} />
            <BrandingAssetControl title="School Seal" description="Used on certificates, official letters, and formal documents." field="schoolSealUrl" value={String(settings.schoolSealUrl || "")} uploadingField={uploadingField} onUrlChange={setField} onUpload={uploadAsset} onReset={resetAsset} />
            <BrandingAssetControl title="Report Card Watermark" description="Subtle watermark for report cards and generated academic PDFs." field="reportCardWatermarkUrl" value={String(settings.reportCardWatermarkUrl || "")} uploadingField={uploadingField} onUrlChange={setField} onUpload={uploadAsset} onReset={resetAsset} />
            <BrandingAssetControl title="Email Header Logo" description="Used in transactional email headers and campaign templates." field="emailHeaderLogoUrl" value={String(settings.emailHeaderLogoUrl || "")} uploadingField={uploadingField} onUrlChange={setField} onUpload={uploadAsset} onReset={resetAsset} />
            <BrandingAssetControl title="Login Screen Logo" description="Displayed on tenant login and role-selection portals." field="loginScreenLogoUrl" value={String(settings.loginScreenLogoUrl || "")} uploadingField={uploadingField} onUrlChange={setField} onUpload={uploadAsset} onReset={resetAsset} />
            <BrandingAssetControl title="Mobile App Logo" description="Reserved for the tenant mobile app and PWA install surfaces." field="mobileAppLogoUrl" value={String(settings.mobileAppLogoUrl || "")} uploadingField={uploadingField} onUrlChange={setField} onUpload={uploadAsset} onReset={resetAsset} />
          </div>
        </CardContent>
      </Card>

      <Card className={sectionCardClass}>
        <CardHeader className={sectionHeaderClass}>
          <CardTitle className={settingsSectionTitleClass}>UI Customisation</CardTitle>
          <CardDescription>Configure the colors, theme preference, and tenant portal layout used across the tenant ecosystem.</CardDescription>
        </CardHeader>
        <CardContent className={sectionContentClass}>
          <ProfileControl field="primaryColor" value={settings.primaryColor || "#f97316"} onChange={setField} />
          <ProfileControl field="secondaryColor" value={settings.secondaryColor || "#111827"} onChange={setField} />
          <ProfileControl field="accentColor" value={settings.accentColor || "#fb923c"} onChange={setField} />
          <ProfileControl field="successColor" value={settings.successColor || "#16a34a"} onChange={setField} />
          <ProfileControl field="warningColor" value={settings.warningColor || "#f59e0b"} onChange={setField} />
          <ProfileControl field="errorColor" value={settings.errorColor || "#dc2626"} onChange={setField} />
          <ProfileControl field="typography" value={settings.typography || "Modern Sans"} onChange={setField} />
          <ProfileControl field="fontFamily" value={settings.fontFamily || "Geist"} onChange={setField} />
          <ProfileControl field="themeMode" value={settings.themeMode || "system"} onChange={setField} />
          <ProfileControl field="portalLayout" value={settings.portalLayout || "modern"} onChange={setField} />
        </CardContent>
      </Card>

      <Card className={sectionCardClass}>
        <CardHeader className={sectionHeaderClass}>
          <CardTitle className={settingsSectionTitleClass}>Portal Layout</CardTitle>
          <CardDescription>Controls shell density, navigation style, card radius, and shadow language across all tenant dashboards.</CardDescription>
        </CardHeader>
        <CardContent className={sectionContentClass}>
          <ProfileControl field="sidebarLayout" value={settings.sidebarLayout || "expanded"} onChange={setField} />
          <ProfileControl field="topNavigationLayout" value={settings.topNavigationLayout || "standard"} onChange={setField} />
          <ProfileControl field="compactMode" value={Boolean(settings.compactMode)} onChange={setField} />
          <ProfileControl field="fullWidthMode" value={Boolean(settings.fullWidthMode)} onChange={setField} />
          <ProfileControl field="roundedCorners" value={settings.roundedCorners ?? true} onChange={setField} />
          <ProfileControl field="borderRadius" value={settings.borderRadius || "16"} onChange={setField} />
          <ProfileControl field="shadowIntensity" value={settings.shadowIntensity || "medium"} onChange={setField} />
        </CardContent>
      </Card>

      <Card className={sectionCardClass}>
        <CardHeader className={sectionHeaderClass}>
          <CardTitle className={settingsSectionTitleClass}>Color Preview</CardTitle>
          <CardDescription>Preview how active tabs, actions, and tenant cards will read before saving.</CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="overflow-hidden rounded-3xl border border-border/80 bg-background/70">
            <div className="p-6" style={{ background: `linear-gradient(135deg, ${primaryColor}22, ${secondaryColor}18)` }}>
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border bg-background shadow-sm">
                    {settings.logoUrl ? <img src={String(settings.logoUrl)} alt="" className="h-full w-full object-cover" /> : <GraduationCap className="h-7 w-7 text-primary" />}
                  </div>
                  <div>
                    <p className="text-lg font-semibold">{String(settings.schoolName || data.school.name)}</p>
                    <p className="text-sm text-muted-foreground">Roxan Education System</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full px-4 py-2 text-sm font-medium text-white shadow-sm" style={{ backgroundColor: primaryColor }}>Active tab</span>
                  <span className="rounded-full px-4 py-2 text-sm font-medium text-white shadow-sm" style={{ backgroundColor: secondaryColor }}>Secondary action</span>
                </div>
              </div>
            </div>
            <div className="grid gap-3 p-6 md:grid-cols-4">
              <div className="rounded-2xl border border-border/80 bg-card p-4">
                <p className="text-sm font-medium">Desktop Preview</p>
                <p className="mt-1 text-sm text-muted-foreground">{String(settings.themeMode || "system")}</p>
              </div>
              <div className="rounded-2xl border border-border/80 bg-card p-4">
                <p className="text-sm font-medium">Tablet Preview</p>
                <p className="mt-1 text-sm text-muted-foreground">{String(settings.portalLayout || "modern")}</p>
              </div>
              <div className="rounded-2xl border border-border/80 bg-card p-4">
                <p className="text-sm font-medium">Mobile Preview</p>
                <p className="mt-1 text-sm text-muted-foreground">Empty logo uses the Graduation Cap icon.</p>
              </div>
              <div className="rounded-2xl border border-border/80 bg-card p-4">
                <p className="text-sm font-medium">Sync Targets</p>
                <p className="mt-1 text-sm text-muted-foreground">Dashboards, portals, reports, invoices, PDFs, emails, certificates.</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function BrandingAssetControl({
  title,
  description,
  field,
  value,
  uploadingField,
  onUrlChange,
  onUpload,
  onReset,
}: {
  title: string;
  description: string;
  field: string;
  value: string;
  uploadingField: string;
  onUrlChange: (key: string, value: SettingsValue) => void;
  onUpload: (field: string, file: File | null) => void;
  onReset: (field: string) => void;
}) {
  const inputId = `asset-${field}`;
  return (
    <div className="rounded-3xl border border-border/80 bg-background/70 p-5">
      <div className="flex items-start gap-4">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-border/80 bg-card">
          {value ? <img src={value} alt="" className="h-full w-full object-cover" /> : <ImageIcon className="h-7 w-7 text-muted-foreground" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{title}</p>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="mt-5 space-y-3">
        <div className="space-y-2">
          <Label>Asset URL</Label>
          <Input value={value} onChange={(event) => onUrlChange(field, event.target.value)} placeholder="https:// or /uploads/..." className="rounded-2xl" />
        </div>
        <div className="flex flex-wrap gap-2">
          <input id={inputId} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml,image/x-icon" className="hidden" onChange={(event) => onUpload(field, event.target.files?.[0] || null)} />
          <Button type="button" variant="outline" className="rounded-2xl" disabled={uploadingField === field} onClick={() => document.getElementById(inputId)?.click()}>
            <Upload className={cn("mr-2 h-4 w-4", uploadingField === field && "animate-pulse")} /> Upload
          </Button>
          <Button type="button" variant="secondary" className="rounded-2xl" onClick={() => onReset(field)}>
            <RotateCcw className="mr-2 h-4 w-4" /> Reset default
          </Button>
        </div>
      </div>
    </div>
  );
}

const DEFAULT_STAGES = ["Nursery", "Kindergarten", "Primary", "JHS", "SHS", "University", "Custom Stage"];
const DEFAULT_STREAMS = ["A", "B", "Science", "Arts", "Commerce"];
const CURRICULUM_TEMPLATE_STAGES: Record<string, Omit<AcademicStage, "id">[]> = {
  "Custom Structure": [{ name: "Primary", capacityPerClass: 40, levels: ["Primary 1"], streams: ["A"] }],
  Montessori: [{ name: "Montessori", capacityPerClass: 24, levels: ["Toddler", "Casa", "Lower Elementary", "Upper Elementary"], streams: ["A"] }],
  "American Curriculum": [{ name: "Elementary", capacityPerClass: 28, levels: ["Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5"], streams: ["A"] }, { name: "High School", capacityPerClass: 30, levels: ["Grade 9", "Grade 10", "Grade 11", "Grade 12"], streams: ["A"] }],
  "British Curriculum": [{ name: "Primary", capacityPerClass: 30, levels: ["Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6"], streams: ["A"] }, { name: "Secondary", capacityPerClass: 30, levels: ["Year 7", "Year 8", "Year 9", "Year 10", "Year 11"], streams: ["A"] }],
  "Uganda - UNEB PLE": [{ name: "Primary", capacityPerClass: 45, levels: ["Primary 1", "Primary 2", "Primary 3", "Primary 4", "Primary 5", "Primary 6", "Primary 7"], streams: ["A", "B"] }],
  "Uganda - UNEB UCE": [{ name: "O-Level", capacityPerClass: 45, levels: ["Senior 1", "Senior 2", "Senior 3", "Senior 4"], streams: ["A", "B"] }],
  "Uganda - UNEB UACE": [{ name: "A-Level", capacityPerClass: 40, levels: ["Senior 5", "Senior 6"], streams: ["Arts", "Sciences"] }],
  "Ghana - GES": [{ name: "Basic", capacityPerClass: 40, levels: ["Basic 1", "Basic 2", "Basic 3", "Basic 4", "Basic 5", "Basic 6", "JHS 1", "JHS 2", "JHS 3"], streams: ["A", "B"] }],
  "Ghana - SHS": [{ name: "SHS", capacityPerClass: 40, levels: ["SHS 1", "SHS 2", "SHS 3"], streams: ["Science", "Arts", "Commerce"] }],
  "Kenya - CBC": [{ name: "CBC", capacityPerClass: 40, levels: ["Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6", "Junior Secondary 1", "Junior Secondary 2", "Junior Secondary 3"], streams: ["A", "B"] }],
  "South Africa - CAPS": [{ name: "Foundation", capacityPerClass: 35, levels: ["Grade R", "Grade 1", "Grade 2", "Grade 3"], streams: ["A"] }, { name: "Senior", capacityPerClass: 35, levels: ["Grade 8", "Grade 9", "Grade 10", "Grade 11", "Grade 12"], streams: ["A"] }],
  "Nigeria - WAEC/NECO": [{ name: "Basic", capacityPerClass: 40, levels: ["Primary 1", "Primary 2", "Primary 3", "Primary 4", "Primary 5", "Primary 6", "JSS 1", "JSS 2", "JSS 3"], streams: ["A", "B"] }, { name: "Senior Secondary", capacityPerClass: 40, levels: ["SSS 1", "SSS 2", "SSS 3"], streams: ["Science", "Arts", "Commercial"] }],
  "Cambridge International": [{ name: "Cambridge", capacityPerClass: 28, levels: ["Primary", "Lower Secondary", "IGCSE Year 1", "IGCSE Year 2", "AS Level", "A Level"], streams: ["A"] }],
  "International Baccalaureate": [{ name: "IB", capacityPerClass: 25, levels: ["PYP", "MYP 1", "MYP 2", "MYP 3", "MYP 4", "MYP 5", "DP 1", "DP 2"], streams: ["A"] }],
};

function asStages(value: SettingsValue | undefined): AcademicStage[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item, index) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return null;
      const stage = item as Partial<AcademicStage>;
      const name = String(stage.name || `Stage ${index + 1}`).trim();
      return {
        id: String(stage.id || `stage-${index}-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`),
        name,
        capacityPerClass: Number(stage.capacityPerClass || 40),
        levels: Array.isArray(stage.levels) ? stage.levels.map((level) => String(level).trim()).filter(Boolean) : [`${name} 1`],
        streams: Array.isArray(stage.streams) ? stage.streams.map((stream) => String(stream).trim()).filter(Boolean) : ["A"],
      };
    })
    .filter((stage): stage is AcademicStage => Boolean(stage));
}

function asStringArray(value: SettingsValue | undefined): string[] {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  if (typeof value === "string") {
    return value.split(/[\n,]/).map((item) => item.trim()).filter(Boolean);
  }
  return [];
}

function asSubjectPolicy(value: SettingsValue | undefined): SubjectPolicy {
  const base = value && typeof value === "object" && !Array.isArray(value) ? value as Partial<SubjectPolicy> : {};
  return {
    coreMandatory: base.coreMandatory ?? true,
    minElectives: Number(base.minElectives ?? 1),
    maxElectives: Number(base.maxElectives ?? 4),
    weightingMethod: String(base.weightingMethod || "equal"),
    assignments: Array.isArray(base.assignments) ? base.assignments : [],
  };
}

function asAcademicPolicy(value: SettingsValue | undefined): AcademicPolicy {
  const base = value && typeof value === "object" && !Array.isArray(value) ? value as Partial<AcademicPolicy> : {};
  return {
    minimumAverage: Number(base.minimumAverage ?? 50),
    distinctionThreshold: Number(base.distinctionThreshold ?? 80),
    passThreshold: Number(base.passThreshold ?? 50),
    meritThreshold: Number(base.meritThreshold ?? 65),
    maxFailedSubjects: Number(base.maxFailedSubjects ?? 2),
    carryOverAllowed: Boolean(base.carryOverAllowed),
    coreSubjectsMustPass: base.coreSubjectsMustPass ?? true,
    automaticPromotion: base.automaticPromotion ?? false,
    manualOverrideAllowed: base.manualOverrideAllowed ?? true,
    supplementaryExamAllowed: base.supplementaryExamAllowed ?? true,
    repeatClass: base.repeatClass ?? true,
    promotionLogic: String(base.promotionLogic || "Promote learners who meet the overall average and failure-rule requirements."),
    repetitionLogic: String(base.repetitionLogic || "Repeat class when failed subjects exceed the allowed threshold."),
    graduationLogic: String(base.graduationLogic || "Graduate after all required levels, credits, and final-year requirements are complete."),
  };
}

function asResultPublicationControl(value: SettingsValue | undefined): ResultPublicationControl {
  const base = value && typeof value === "object" && !Array.isArray(value) ? value as Partial<ResultPublicationControl> : {};
  return {
    autoPublish: base.autoPublish ?? false,
    adminApprovalRequired: base.adminApprovalRequired ?? true,
    lockAfterSubmission: base.lockAfterSubmission ?? true,
    notifyParents: base.notifyParents ?? true,
  };
}

function asAssessmentCategories(value: SettingsValue | undefined): AssessmentCategory[] {
  return Array.isArray(value)
    ? value.map((item, index) => {
      const row = item as Partial<AssessmentCategory>;
      return {
        id: String(row.id || `assessment-${index}`),
        name: String(row.name || ""),
        weight: Number(row.weight || 0),
        appliedTo: Array.isArray(row.appliedTo) ? row.appliedTo.map(String) : [],
      };
    }).filter((row) => row.name)
    : [];
}

function asGradingRows(value: SettingsValue | undefined): GradingScaleRow[] {
  return Array.isArray(value)
    ? value.map((item, index) => {
      const row = item as Partial<GradingScaleRow>;
      return { id: String(row.id || `grade-${index}`), min: Number(row.min || 0), max: Number(row.max || 0), grade: String(row.grade || "") };
    })
    : [];
}

function asRankingPolicy(value: SettingsValue | undefined): RankingPolicy {
  const base = value && typeof value === "object" && !Array.isArray(value) ? value as Partial<RankingPolicy> : {};
  return {
    gpaCalculation: String(base.gpaCalculation || "Weighted Average"),
    rankingSystem: String(base.rankingSystem || "Class-level Ranking"),
    reportCardFormat: String(base.reportCardFormat || "Standard"),
    passMark: Number(base.passMark ?? 50),
    showPositionOnReportCards: base.showPositionOnReportCards ?? true,
  };
}

function asPositionRules(value: SettingsValue | undefined): PositionRules {
  const base = value && typeof value === "object" && !Array.isArray(value) ? value as Partial<PositionRules> : {};
  return {
    minimumOverallAverage: Number(base.minimumOverallAverage ?? 50),
    minimumSubjectScore: Number(base.minimumSubjectScore ?? 40),
    maxFailedSubjectsAllowed: Number(base.maxFailedSubjectsAllowed ?? 2),
    requiredMustPassSubjects: Array.isArray(base.requiredMustPassSubjects) ? base.requiredMustPassSubjects.map(String) : ["English", "Mathematics"],
  };
}

function asFinanceFeeItems(value: SettingsValue | undefined): FinanceFeeItem[] {
  return Array.isArray(value) ? value.map((item, index) => {
    const row = item as Partial<FinanceFeeItem>;
    return {
      id: String(row.id || `fee-${index}`),
      name: String(row.name || `Fee Item ${index + 1}`),
      type: String(row.type || "Academic"),
      defaultAmount: Number(row.defaultAmount || 0),
      billingCycle: String(row.billingCycle || "Per Term"),
      mandatory: Boolean(row.mandatory),
      appliesTo: Array.isArray(row.appliesTo) ? row.appliesTo.map(String) : [],
      stagePricing: row.stagePricing && typeof row.stagePricing === "object" && !Array.isArray(row.stagePricing) ? row.stagePricing as Record<string, number> : {},
    };
  }) : [];
}

function asFinanceDiscountRules(value: SettingsValue | undefined): FinanceDiscountRule[] {
  return Array.isArray(value) ? value.map((item, index) => {
    const row = item as Partial<FinanceDiscountRule>;
    return { id: String(row.id || `discount-${index}`), name: String(row.name || ""), type: String(row.type || "Percentage"), value: Number(row.value || 0), appliedTo: String(row.appliedTo || "All students"), autoApply: Boolean(row.autoApply) };
  }).filter((row) => row.name) : [];
}

function asFinancePenaltyEngine(value: SettingsValue | undefined): FinancePenaltyEngine {
  const base = value && typeof value === "object" && !Array.isArray(value) ? value as Partial<FinancePenaltyEngine> : {};
  return { gracePeriodDays: Number(base.gracePeriodDays ?? 7), penaltyType: String(base.penaltyType || "Percentage of Outstanding Fees"), penaltyValue: Number(base.penaltyValue ?? 5), capAmount: Number(base.capAmount ?? 0), recurringPenalty: Boolean(base.recurringPenalty), consequence: String(base.consequence || "No consequences") };
}

function asFinanceInstallmentPlan(value: SettingsValue | undefined): FinanceInstallmentPlan {
  const base = value && typeof value === "object" && !Array.isArray(value) ? value as Partial<FinanceInstallmentPlan> : {};
  return { allowPartialPayments: base.allowPartialPayments ?? true, minimumInstallment: Number(base.minimumInstallment ?? 0), maxInstallments: Number(base.maxInstallments ?? 3), autoDueDate: base.autoDueDate ?? true };
}

function asFinancePaymentInvoice(value: SettingsValue | undefined, fallbackCurrency: string, fallbackPrefix: string): FinancePaymentInvoice {
  const base = value && typeof value === "object" && !Array.isArray(value) ? value as Partial<FinancePaymentInvoice> : {};
  const providers = base.providers && typeof base.providers === "object" && !Array.isArray(base.providers) ? base.providers : {};
  return { currency: String(base.currency || fallbackCurrency || "UGX"), invoicePrefix: String(base.invoicePrefix || fallbackPrefix || "INV"), taxRate: Number(base.taxRate ?? 0), providers: { flutterwave: Boolean(providers.flutterwave), paystack: Boolean(providers.paystack), stripe: Boolean(providers.stripe), mobileMoney: providers.mobileMoney ?? true, cash: providers.cash ?? true, cardBankTransfer: providers.cardBankTransfer ?? true } };
}

function asFinanceCurrencies(value: SettingsValue | undefined, fallbackCurrency: string): FinanceCurrencies {
  const base = value && typeof value === "object" && !Array.isArray(value) ? value as Partial<FinanceCurrencies> : {};
  const enabled = Array.isArray(base.enabledCurrencies) ? base.enabledCurrencies.map(String) : [fallbackCurrency || "UGX"];
  return { baseCurrency: String(base.baseCurrency || fallbackCurrency || "UGX"), enabledCurrencies: enabled };
}

function asRecord(value: SettingsValue | undefined): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function generatedClasses(stages: AcademicStage[]) {
  return stages.flatMap((stage) =>
    (stage.levels || []).flatMap((level) =>
      ((stage.streams || []).length ? stage.streams : [""]).map((stream) => `${level}${stream ? ` ${stream}` : ""}`.trim())
    )
  );
}

function AcademicSettingsSection({ settings, setField, onSave, saving }: { settings: Record<string, SettingsValue>; setField: (key: string, value: SettingsValue) => void; onSave: () => Promise<void>; saving: boolean }) {
  const sectionCardClass = "rounded-3xl border border-border bg-card/95 shadow-sm ring-1 ring-border/60";
  const sectionHeaderClass = "px-6 py-5";
  const sectionContentClass = "grid gap-6 p-6 md:grid-cols-2";
  const titleClass = "text-2xl font-bold tracking-tight text-foreground";
  const subjectCategories = asStringArray(settings.subjectCategories);
  const subjectPolicy = asSubjectPolicy(settings.subjectPolicy);
  const academicPolicy = asAcademicPolicy(settings.academicPolicy);
  const resultPublication = asResultPublicationControl(settings.resultPublicationControl);
  const schoolLevels = asStringArray(settings.schoolLevels);
  const schoolLevelOptions = ["Nursery / Preschool", "Primary", "Junior High (JHS)", "Secondary School", "High School", "College", "University"];

  function toggleSchoolLevel(level: string, enabled: boolean) {
    setField("schoolLevels", enabled ? [...schoolLevels, level] : schoolLevels.filter((item) => item !== level));
  }

  function addSubjectCategory(value: string) {
    const next = value.trim();
    if (!next) return;
    if (subjectCategories.some((item) => item.toLowerCase() === next.toLowerCase())) {
      toast.error("Subject category already exists");
      return;
    }
    setField("subjectCategories", [...subjectCategories, next]);
  }

  function updateSubjectPolicy(patch: Partial<SubjectPolicy>) {
    setField("subjectPolicy", { ...subjectPolicy, ...patch });
  }

  function updateAcademicPolicy(patch: Partial<AcademicPolicy>) {
    setField("academicPolicy", { ...academicPolicy, ...patch });
  }

  function updateResultPublication(patch: Partial<ResultPublicationControl>) {
    setField("resultPublicationControl", { ...resultPublication, ...patch });
  }

  return (
    <div className="space-y-7 pb-3">
      <Card className={sectionCardClass}>
        <CardHeader className={sectionHeaderClass}>
          <CardTitle className={titleClass}>School Identity</CardTitle>
          <CardDescription>Academic identity fields used by report cards, transcripts, class setup, and official documents.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 p-6">
          <div className="grid gap-6 md:grid-cols-2">
          <ProfileControl field="schoolShortName" value={settings.schoolShortName} onChange={setField} />
          <ProfileControl field="schoolCode" value={settings.schoolCode} onChange={setField} />
          <ProfileControl field="motto" value={settings.motto} onChange={setField} />
            <ProfileControl field="curriculumType" value={settings.curriculumType || "Local / National"} onChange={setField} />
          </div>
          <div className="rounded-3xl border border-border/80 bg-background/70 p-5">
            <p className="font-semibold">School Levels</p>
            <p className="mt-1 text-sm text-muted-foreground">Toggle the levels this school operates.</p>
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {schoolLevelOptions.map((level) => (
                <div key={level} className="flex items-center justify-between rounded-2xl border border-border/80 bg-card p-4">
                  <Label>{level}</Label>
                  <Switch checked={schoolLevels.includes(level)} onCheckedChange={(checked) => toggleSchoolLevel(level, checked)} />
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className={sectionCardClass}>
        <CardHeader className={sectionHeaderClass}>
          <CardTitle className={titleClass}>Academic Structure</CardTitle>
          <CardDescription>Configure year format, term system, grading system, and calendar structure.</CardDescription>
        </CardHeader>
        <CardContent className={sectionContentClass}>
          <ProfileControl field="academicYearFormat" value={settings.academicYearFormat || "September - July"} onChange={setField} />
          <ProfileControl field="termSystem" value={settings.termSystem || "Trimester (3 terms)"} onChange={setField} />
          <ProfileControl field="gradingScale" value={settings.gradingScale || "percentage"} onChange={setField} />
          <ProfileControl field="academicCalendarType" value={settings.academicCalendarType || "Standard"} onChange={setField} />
        </CardContent>
      </Card>

      <Card className={sectionCardClass}>
        <CardHeader className={sectionHeaderClass}>
          <CardTitle className={titleClass}>Subject Policy</CardTitle>
          <CardDescription>Controls subject category behavior, mandatory core subjects, electives, and weighting.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 p-6">
          <div className="rounded-3xl border border-border/80 bg-background/70 p-5">
            <SubjectCategoryInput onAdd={addSubjectCategory} />
            <div className="mt-4 flex flex-wrap gap-2">
              {subjectCategories.map((category) => (
                <Badge key={category} variant="outline" className="rounded-full px-3 py-1">
                  {category}
                  <button type="button" className="ml-2 text-muted-foreground hover:text-foreground" onClick={() => setField("subjectCategories", subjectCategories.filter((item) => item !== category))}>x</button>
                </Badge>
              ))}
              {!subjectCategories.length ? <span className="text-sm text-muted-foreground">No subject categories added yet.</span> : null}
            </div>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
                <div className="flex items-center justify-between rounded-2xl border border-border/80 bg-card p-4"><Label>Core Subjects Mandatory</Label><Switch checked={subjectPolicy.coreMandatory} onCheckedChange={(value) => updateSubjectPolicy({ coreMandatory: value })} /></div>
                <ProfileNumber label="Minimum Electives Required" value={subjectPolicy.minElectives} onChange={(value) => updateSubjectPolicy({ minElectives: value })} />
                <div className="space-y-2"><Label>Subject Weighting Method</Label><Select value={subjectPolicy.weightingMethod} onValueChange={(value) => updateSubjectPolicy({ weightingMethod: value })}><SelectTrigger className="rounded-2xl"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="equal">Equal Weighting</SelectItem><SelectItem value="custom">Custom Weighting</SelectItem><SelectItem value="credit">Credit Based Weighting</SelectItem></SelectContent></Select></div>
          </div>
        </CardContent>
      </Card>

      <Card className={sectionCardClass}>
        <CardHeader className={sectionHeaderClass}>
          <CardTitle className={titleClass}>Academic Policy Engine</CardTitle>
          <CardDescription>Promotion, failure, repetition, and graduation rules used by progression workflows.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 p-6">
          <div className="grid gap-6 md:grid-cols-2">
                <ProfileNumber label="Minimum Overall Average (%)" value={academicPolicy.minimumAverage} onChange={(value) => updateAcademicPolicy({ minimumAverage: value })} />
                <ProfileNumber label="Maximum Failed Subjects Allowed" value={academicPolicy.maxFailedSubjects} onChange={(value) => updateAcademicPolicy({ maxFailedSubjects: value })} />
                <ProfileNumber label="Distinction Threshold (%)" value={academicPolicy.distinctionThreshold} onChange={(value) => updateAcademicPolicy({ distinctionThreshold: value })} />
                <div className="flex items-center justify-between rounded-2xl border border-border/80 bg-card p-4"><Label>Core Subjects Must Pass</Label><Switch checked={academicPolicy.coreSubjectsMustPass} onCheckedChange={(value) => updateAcademicPolicy({ coreSubjectsMustPass: value })} /></div>
                <div className="flex items-center justify-between rounded-2xl border border-border/80 bg-card p-4"><Label>Carry Over Allowed</Label><Switch checked={academicPolicy.carryOverAllowed} onCheckedChange={(value) => updateAcademicPolicy({ carryOverAllowed: value })} /></div>
                <div className="flex items-center justify-between rounded-2xl border border-border/80 bg-card p-4"><Label>Automatic Promotion</Label><Switch checked={academicPolicy.automaticPromotion} onCheckedChange={(value) => updateAcademicPolicy({ automaticPromotion: value })} /></div>
                <div className="flex items-center justify-between rounded-2xl border border-border/80 bg-card p-4"><Label>Manual Override Allowed</Label><Switch checked={academicPolicy.manualOverrideAllowed} onCheckedChange={(value) => updateAcademicPolicy({ manualOverrideAllowed: value })} /></div>
          </div>
        </CardContent>
      </Card>

      <Card className={sectionCardClass}>
        <CardHeader className={sectionHeaderClass}>
          <CardTitle className={titleClass}>Grade Computation Method</CardTitle>
          <CardDescription>Controls how final grades and ranking calculations are computed.</CardDescription>
        </CardHeader>
        <CardContent className={sectionContentClass}>
          <ProfileControl field="gradeComputationMethod" value={settings.gradeComputationMethod || "Weighted Average (All Subjects)"} onChange={setField} />
          <div className="flex items-center justify-between rounded-2xl border border-border/80 bg-background/70 p-5">
            <div>
              <p className="text-sm font-semibold">CA / Exam Split Source</p>
              <p className="mt-1 text-sm text-muted-foreground">Use assessment configuration</p>
            </div>
            <Switch checked={Boolean(settings.useAssessmentConfigurationSplit ?? true)} onCheckedChange={(value) => setField("useAssessmentConfigurationSplit", value)} />
          </div>
        </CardContent>
      </Card>

      <Card className={sectionCardClass}>
        <CardHeader className={sectionHeaderClass}>
          <CardTitle className={titleClass}>Result Publication Control</CardTitle>
          <CardDescription>Controls when results are published, locked, approved, and communicated.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 p-6 md:grid-cols-2">
          <div className="flex items-center justify-between rounded-2xl border border-border/80 bg-card p-4"><Label>Auto Publish Results</Label><Switch checked={resultPublication.autoPublish} onCheckedChange={(value) => updateResultPublication({ autoPublish: value })} /></div>
          <div className="flex items-center justify-between rounded-2xl border border-border/80 bg-card p-4"><Label>Admin Approval Required</Label><Switch checked={resultPublication.adminApprovalRequired} onCheckedChange={(value) => updateResultPublication({ adminApprovalRequired: value })} /></div>
          <div className="flex items-center justify-between rounded-2xl border border-border/80 bg-card p-4"><Label>Lock After Submission</Label><Switch checked={resultPublication.lockAfterSubmission} onCheckedChange={(value) => updateResultPublication({ lockAfterSubmission: value })} /></div>
          <div className="flex items-center justify-between rounded-2xl border border-border/80 bg-card p-4"><Label>Notify Parents</Label><Switch checked={resultPublication.notifyParents} onCheckedChange={(value) => updateResultPublication({ notifyParents: value })} /></div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button className="rounded-2xl" disabled={saving} onClick={() => void onSave()}>
          <Save className={cn("mr-2 h-4 w-4", saving && "animate-pulse")} /> Save Academic Settings
        </Button>
      </div>
    </div>
  );
}

function ProfileNumber({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input type="number" value={value} onChange={(event) => onChange(Number(event.target.value || 0))} className="rounded-2xl" />
    </div>
  );
}

function AcademicStructureSection({ settings, setField, onSave, saving }: { settings: Record<string, SettingsValue>; setField: (key: string, value: SettingsValue) => void; onSave: () => Promise<void>; saving: boolean }) {
  const sectionCardClass = "rounded-3xl border border-border bg-card/95 shadow-sm ring-1 ring-border/60";
  const sectionHeaderClass = "px-6 py-5";
  const titleClass = "text-2xl font-bold tracking-tight text-foreground";
  const [expandedStageId, setExpandedStageId] = React.useState<string>("");
  const stages = asStages(settings.academicHierarchy);
  const classes = generatedClasses(stages);
  const validationIssues = [
    ...stages.flatMap((stage) => !stage.name.trim() ? ["Stage name is required"] : []),
    ...stages.flatMap((stage) => stage.capacityPerClass <= 0 ? [`${stage.name}: capacity must be greater than zero`] : []),
    ...stages.flatMap((stage) => !stage.levels.length ? [`${stage.name}: at least one level is required`] : []),
    ...stages.flatMap((stage) => new Set(stage.levels.map((item) => item.toLowerCase())).size !== stage.levels.length ? [`${stage.name}: duplicate levels detected`] : []),
    ...stages.flatMap((stage) => new Set(stage.streams.map((item) => item.toLowerCase())).size !== stage.streams.length ? [`${stage.name}: duplicate sections detected`] : []),
    ...new Set(classes.map((item) => item.toLowerCase())).size !== classes.length ? ["Generated class conflict detected"] : [],
  ];
  const stageSummaries = stages.map((stage) => ({
    name: stage.name,
    count: stage.levels.length * Math.max(stage.streams.length, 1),
  }));

  function updateStages(next: AcademicStage[]) {
    setField("academicHierarchy", next);
  }

  function applyTemplate(templateName: string) {
    setField("curriculumTemplate", templateName);
    const template = CURRICULUM_TEMPLATE_STAGES[templateName];
    if (!template) return;
    updateStages(template.map((stage, index) => ({ ...stage, id: `${templateName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${index}` })));
    toast.success(`${templateName} structure applied`);
  }

  function addStage() {
    const capacity = Number(settings.defaultClassCapacity || 40);
    const stage: AcademicStage = { id: crypto.randomUUID(), name: "Custom Stage", capacityPerClass: capacity, levels: ["Level 1"], streams: ["A"] };
    updateStages([...stages, stage]);
    setExpandedStageId(stage.id);
  }

  function updateStage(stageId: string, patch: Partial<AcademicStage>) {
    updateStages(stages.map((stage) => stage.id === stageId ? { ...stage, ...patch } : stage));
  }

  function addStageItem(stageId: string, key: "levels" | "streams") {
    const stage = stages.find((item) => item.id === stageId);
    if (!stage) return;
    const nextValue = key === "levels" ? `${stage.name} ${stage.levels.length + 1}` : `Section ${stage.streams.length + 1}`;
    updateStage(stageId, { [key]: [...stage[key], nextValue] } as Partial<AcademicStage>);
  }

  function updateStageItem(stageId: string, key: "levels" | "streams", index: number, value: string) {
    const stage = stages.find((item) => item.id === stageId);
    if (!stage) return;
    updateStage(stageId, { [key]: stage[key].map((item, itemIndex) => itemIndex === index ? value : item) } as Partial<AcademicStage>);
  }

  function removeStageItem(stageId: string, key: "levels" | "streams", index: number) {
    const stage = stages.find((item) => item.id === stageId);
    if (!stage) return;
    updateStage(stageId, { [key]: stage[key].filter((_, itemIndex) => itemIndex !== index) } as Partial<AcademicStage>);
  }

  return (
    <div className="space-y-7 pb-3">
      <Card className={sectionCardClass}>
        <CardHeader className={sectionHeaderClass}>
          <CardTitle className={titleClass}>Curriculum Template</CardTitle>
          <CardDescription>Select a starting structure from global and country-specific academic systems.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 p-6 md:grid-cols-2">
          <div className="space-y-2.5">
            <Label>Curriculum Template</Label>
            <Select value={String(settings.curriculumTemplate || "Custom Structure")} onValueChange={applyTemplate}>
              <SelectTrigger className="rounded-2xl"><SelectValue /></SelectTrigger>
              <SelectContent>{selectOptions.curriculumTemplate.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="rounded-2xl border border-border/80 bg-background/70 p-5">
            <p className="text-sm font-semibold">Template library</p>
            <p className="mt-1 text-sm text-muted-foreground">Includes custom, Montessori, American, British, Uganda UNEB PLE/UCE/UACE, Ghana GES/SHS, Kenya CBC, South Africa CAPS, Nigeria WAEC/NECO, Cambridge, and IB structures.</p>
          </div>
        </CardContent>
      </Card>

      <Card className={sectionCardClass}>
        <CardHeader className={sectionHeaderClass}>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className={titleClass}>Academic Stages</CardTitle>
              <CardDescription>Add unlimited stages with editable levels and sections/streams.</CardDescription>
            </div>
            <Button className="rounded-2xl" onClick={addStage}><Plus className="mr-2 h-4 w-4" />Add Stage</Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-5 p-6">
          {stages.map((stage) => {
            const expanded = expandedStageId === stage.id;
            return (
              <div key={stage.id} className="rounded-3xl border border-border/80 bg-background/70 p-5">
                <button type="button" className="flex w-full items-center justify-between gap-4 text-left" onClick={() => setExpandedStageId(expanded ? "" : stage.id)}>
                  <div>
                    <p className="text-lg font-bold">{stage.name}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{stage.levels.length} levels · {stage.streams.length} sections · {stage.levels.length * Math.max(stage.streams.length, 1)} generated classes</p>
                  </div>
                  <Badge variant="outline" className="rounded-full">{expanded ? "Collapse" : "Expand"}</Badge>
                </button>
                {expanded ? (
                  <div className="mt-5 space-y-5">
                    <div className="grid gap-4 md:grid-cols-[1fr_14rem_auto]">
                      <div className="space-y-2">
                        <Label>Stage Name</Label>
                        <Input value={stage.name} onChange={(event) => updateStage(stage.id, { name: event.target.value })} className="rounded-2xl" />
                      </div>
                      <div className="space-y-2">
                        <Label>Capacity Per Class</Label>
                        <Input type="number" min={1} value={stage.capacityPerClass} onChange={(event) => updateStage(stage.id, { capacityPerClass: Number(event.target.value || 0) })} className="rounded-2xl" />
                      </div>
                      <Button variant="secondary" className="self-end rounded-2xl" onClick={() => updateStages(stages.filter((item) => item.id !== stage.id))}><Trash2 className="mr-2 h-4 w-4" />Remove Stage</Button>
                    </div>
                    <div className="grid gap-5 md:grid-cols-2">
                      <StructureList title="Class Levels" items={stage.levels} onAdd={() => addStageItem(stage.id, "levels")} onChange={(index, value) => updateStageItem(stage.id, "levels", index, value)} onRemove={(index) => removeStageItem(stage.id, "levels", index)} />
                      <StructureList title="Sections / Streams" items={stage.streams} onAdd={() => addStageItem(stage.id, "streams")} onChange={(index, value) => updateStageItem(stage.id, "streams", index, value)} onRemove={(index) => removeStageItem(stage.id, "streams", index)} />
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
          {!stages.length ? <Button variant="outline" className="rounded-2xl" onClick={addStage}><Plus className="mr-2 h-4 w-4" />Create first stage</Button> : null}
        </CardContent>
      </Card>

      <Card className={sectionCardClass}>
        <CardHeader className={sectionHeaderClass}>
          <CardTitle className={titleClass}>Naming & Settings</CardTitle>
          <CardDescription>Control generated class names, class capacity, and class-teacher assignment defaults.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 p-6 md:grid-cols-2">
          <ProfileControl field="classNamingFormat" value={settings.classNamingFormat || "Stage + Number + Section (Primary 1A)"} onChange={setField} />
          <ProfileControl field="defaultClassCapacity" value={settings.defaultClassCapacity || "40"} onChange={setField} />
          <div className="flex items-center justify-between rounded-2xl border border-border/80 bg-background/70 p-5 md:col-span-2">
            <div>
              <p className="font-semibold">Auto Assign Class Teacher</p>
              <p className="mt-1 text-sm text-muted-foreground">When enabled, class creation workflows can automatically assign eligible teachers later.</p>
            </div>
            <Switch checked={Boolean(settings.autoAssignClassTeacher)} onCheckedChange={(value) => setField("autoAssignClassTeacher", value)} />
          </div>
        </CardContent>
      </Card>

      <Card className={sectionCardClass}>
        <CardHeader className={sectionHeaderClass}>
          <CardTitle className={titleClass}>Preview</CardTitle>
          <CardDescription>Review generated class counts and class tabs before saving.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5 p-6">
          <div className="grid gap-3 md:grid-cols-4">
            <CompactMetric label="Total Classes" value={String(classes.length)} detail="Generated" />
            <CompactMetric label="Stages" value={String(stages.length)} detail="Configured" />
            <CompactMetric label="Levels" value={String(stages.reduce((sum, stage) => sum + stage.levels.length, 0))} detail="Configured" />
            <CompactMetric label="Sections" value={String(stages.reduce((sum, stage) => sum + stage.streams.length, 0))} detail="Configured" />
          </div>
          <Alert variant={validationIssues.length ? "destructive" : "default"} className="rounded-2xl">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{validationIssues.length ? "Structure validation issues" : "Structure ready"}</AlertTitle>
            <AlertDescription>{validationIssues.length ? validationIssues.join("; ") : "No duplicate classes, missing levels, or capacity conflicts detected."}</AlertDescription>
          </Alert>
          <div className="grid gap-4 md:grid-cols-2">
            {stageSummaries.map((summary) => (
              <div key={summary.name} className="rounded-2xl border border-border/80 bg-background/70 p-4">
                <p className="font-semibold">{summary.name} ({summary.count} classes)</p>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {classes.map((className) => <span key={className} className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">{className}</span>)}
            {!classes.length ? <span className="text-sm text-muted-foreground">No classes generated yet.</span> : null}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button className="rounded-2xl" disabled={saving || Boolean(validationIssues.length)} onClick={() => void onSave()}>
          <Save className={cn("mr-2 h-4 w-4", saving && "animate-pulse")} /> Save Academic Structure
        </Button>
      </div>
    </div>
  );
}

function StructureList({ title, items, onAdd, onChange, onRemove }: { title: string; items: string[]; onAdd: () => void; onChange: (index: number, value: string) => void; onRemove: (index: number) => void }) {
  return (
    <div className="rounded-2xl border border-border/80 bg-card p-4">
      <div className="flex items-center justify-between">
        <p className="font-semibold">{title}</p>
        <Button size="sm" variant="outline" className="rounded-full" onClick={onAdd}><Plus className="mr-1 h-3 w-3" />Add</Button>
      </div>
      <div className="mt-4 space-y-2">
        {items.map((item, index) => (
          <div key={`${item}-${index}`} className="flex gap-2">
            <Input value={item} onChange={(event) => onChange(index, event.target.value)} className="rounded-xl" />
            <Button variant="secondary" className="rounded-xl" onClick={() => onRemove(index)}><Trash2 className="h-4 w-4" /></Button>
          </div>
        ))}
      </div>
    </div>
  );
}

function AttendanceSettingsSection({ settings, setField, onSave, saving }: { settings: Record<string, SettingsValue>; setField: (key: string, value: SettingsValue) => void; onSave: () => Promise<void>; saving: boolean }) {
  const sectionCardClass = "rounded-3xl border border-border bg-card/95 shadow-sm ring-1 ring-border/60";
  const sectionHeaderClass = "px-6 py-5";
  const sectionContentClass = "grid gap-6 p-6 md:grid-cols-2";

  return (
    <div className="space-y-7 pb-3">
      <Card className={sectionCardClass}>
        <CardHeader className={sectionHeaderClass}>
          <CardTitle className={settingsSectionTitleClass}>Attendance Mode & Policy</CardTitle>
          <CardDescription>Configure how attendance is captured, how lateness is converted, and the minimum attendance requirement for progression.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 p-6">
          <div className="grid gap-6 md:grid-cols-2">
            <ProfileControl field="attendanceMode" value={settings.attendanceMode || "Manual Entry"} onChange={setField} />
            <ProfileNumber label="Late Threshold (minutes)" value={Number(settings.lateThresholdMinutes || 15)} onChange={(value) => setField("lateThresholdMinutes", String(value))} />
            <ProfileNumber label="Minimum Attendance For Promotion (%)" value={Number(settings.minimumAttendanceForPromotion || 75)} onChange={(value) => setField("minimumAttendanceForPromotion", String(value))} />
            <ProfileNumber label="Grace Period (minutes)" value={Number(settings.attendanceGracePeriodMinutes || 5)} onChange={(value) => setField("attendanceGracePeriodMinutes", String(value))} />
            <ProfileControl field="attendanceCaptureWindow" value={settings.attendanceCaptureWindow || "Full school day"} onChange={setField} />
          </div>
          <div className="space-y-2">
            <Label>Late Policy</Label>
            <Textarea
              value={String(settings.latePolicy || "")}
              onChange={(event) => setField("latePolicy", event.target.value)}
              placeholder="Example: Mark as late after threshold; 3 lates = 1 absent"
              className="min-h-28 rounded-2xl"
            />
          </div>
        </CardContent>
      </Card>

      <Card className={sectionCardClass}>
        <CardHeader className={sectionHeaderClass}>
          <CardTitle className={settingsSectionTitleClass}>Notifications & Grading</CardTitle>
          <CardDescription>Control attendance alerts, parent notifications, attendance grading, and exception workflows.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 p-6 md:grid-cols-2">
          <AttendanceToggle label="Attendance Alerts" description="Notify staff when attendance is missing, late, or abnormal." checked={Boolean(settings.attendanceAlertsEnabled)} onChange={(value) => setField("attendanceAlertsEnabled", value)} />
          <AttendanceToggle label="Auto Notify Parents" description="Send parent notifications for absences, lateness, and exceptions." checked={Boolean(settings.autoNotifyParentsOnAttendance)} onChange={(value) => setField("autoNotifyParentsOnAttendance", value)} />
          <AttendanceToggle label="Attendance Grading" description="Include attendance score in reports, promotions, or conduct summaries." checked={Boolean(settings.attendanceGradingEnabled)} onChange={(value) => setField("attendanceGradingEnabled", value)} />
          <AttendanceToggle label="Excuse Workflow" description="Allow admins to review medical, disciplinary, or approved absences." checked={Boolean(settings.attendanceExcuseWorkflowEnabled)} onChange={(value) => setField("attendanceExcuseWorkflowEnabled", value)} />
        </CardContent>
      </Card>

      <Card className={sectionCardClass}>
        <CardHeader className={sectionHeaderClass}>
          <CardTitle className={settingsSectionTitleClass}>Operational Preview</CardTitle>
          <CardDescription>Review how the configured attendance rules will behave before saving.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 p-6 md:grid-cols-3">
          <CompactMetric label="Mode" value={String(settings.attendanceMode || "Manual Entry")} detail="Capture method" />
          <CompactMetric label="Late After" value={`${String(settings.lateThresholdMinutes || 15)} min`} detail="Threshold" />
          <CompactMetric label="Promotion Minimum" value={`${String(settings.minimumAttendanceForPromotion || 75)}%`} detail="Required attendance" />
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button className="rounded-2xl" disabled={saving} onClick={() => void onSave()}>
          <Save className={cn("mr-2 h-4 w-4", saving && "animate-pulse")} /> Save Attendance
        </Button>
      </div>
    </div>
  );
}

function AttendanceToggle({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-border/80 bg-background/70 p-5">
      <div>
        <p className="font-semibold">{label}</p>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function SubjectCategoryInput({ onAdd }: { onAdd: (value: string) => void }) {
  const [value, setValue] = React.useState("");
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-end">
      <div className="flex-1 space-y-2">
        <Label>Subject Categories</Label>
        <Textarea value={value} onChange={(event) => setValue(event.target.value)} placeholder="Enter one or more categories" className="min-h-20 rounded-2xl" />
      </div>
      <Button
        type="button"
        variant="outline"
        className="rounded-2xl"
        onClick={() => {
          value.split("\n").map((item) => item.trim()).filter(Boolean).forEach(onAdd);
          setValue("");
        }}
      >
        <Plus className="mr-2 h-4 w-4" /> Add
      </Button>
    </div>
  );
}

function ExaminationGradingSection({ settings, setField, onSave, saving }: { settings: Record<string, SettingsValue>; setField: (key: string, value: SettingsValue) => void; onSave: () => Promise<void>; saving: boolean }) {
  const sectionCardClass = "rounded-3xl border border-border bg-card/95 shadow-sm ring-1 ring-border/60";
  const sectionHeaderClass = "px-6 py-5";
  const schoolLevels = asStringArray(settings.schoolLevels);
  const categories = asAssessmentCategories(settings.assessmentCategories);
  const gradingRows = asGradingRows(settings.gradingScaleRows);
  const ranking = asRankingPolicy(settings.rankingPolicy);
  const positionRules = asPositionRules(settings.positionRules);
  const [addingCategory, setAddingCategory] = React.useState(false);
  const [draftCategory, setDraftCategory] = React.useState<AssessmentCategory>({ id: "", name: "", weight: 0, appliedTo: [] });
  const totalWeight = categories.reduce((sum, category) => sum + category.weight, 0);

  function saveCategory() {
    const name = draftCategory.name.trim();
    if (!name) return toast.error("Category name is required");
    if (categories.some((category) => category.name.toLowerCase() === name.toLowerCase())) return toast.error("Assessment category already exists");
    setField("assessmentCategories", [...categories, { ...draftCategory, id: crypto.randomUUID(), name }]);
    setDraftCategory({ id: "", name: "", weight: 0, appliedTo: [] });
    setAddingCategory(false);
  }

  const updateRanking = (patch: Partial<RankingPolicy>) => setField("rankingPolicy", { ...ranking, ...patch });
  const updatePositionRules = (patch: Partial<PositionRules>) => setField("positionRules", { ...positionRules, ...patch });

  return (
    <div className="space-y-7 pb-3">
      <Card className={sectionCardClass}>
        <CardHeader className={sectionHeaderClass}>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className={settingsSectionTitleClass}>Assessment Categories & Types</CardTitle>
              <CardDescription>Define assessment categories, their weight, and the levels they apply to.</CardDescription>
            </div>
            <Button className="rounded-2xl" onClick={() => setAddingCategory(true)}><Plus className="mr-2 h-4 w-4" />Add Category</Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-5 p-6">
          {addingCategory ? (
            <div className="rounded-3xl border border-border/80 bg-background/70 p-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2"><Label>Name</Label><Input value={draftCategory.name} onChange={(event) => setDraftCategory((current) => ({ ...current, name: event.target.value }))} className="rounded-2xl" /></div>
                <ProfileNumber label="Weight (%)" value={draftCategory.weight} onChange={(value) => setDraftCategory((current) => ({ ...current, weight: value }))} />
              </div>
              <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {(schoolLevels.length ? schoolLevels : ["Nursery / Preschool", "Primary", "Junior High (JHS)", "Secondary School", "High School", "College", "University"]).map((level) => (
                  <div key={level} className="flex items-center justify-between rounded-2xl border border-border/80 bg-card p-4">
                    <Label>{level}</Label>
                    <Switch checked={draftCategory.appliedTo.includes(level)} onCheckedChange={(checked) => setDraftCategory((current) => ({ ...current, appliedTo: checked ? [...current.appliedTo, level] : current.appliedTo.filter((item) => item !== level) }))} />
                  </div>
                ))}
              </div>
              <div className="mt-5 flex justify-end gap-2"><Button variant="secondary" className="rounded-2xl" onClick={() => setAddingCategory(false)}>Cancel</Button><Button className="rounded-2xl" onClick={saveCategory}>Add Category</Button></div>
            </div>
          ) : null}
          <div>
            <div className="flex items-center justify-between text-sm"><span className="font-medium">Total Weight</span><span className={cn("font-semibold", totalWeight === 100 ? "text-emerald-600" : "text-primary")}>{totalWeight}%</span></div>
            <div className="mt-2 h-3 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary transition-all" style={{ width: `${Math.min(totalWeight, 100)}%` }} /></div>
          </div>
          <div className="space-y-3">
            {categories.map((category) => (
              <div key={category.id} className="flex items-start justify-between gap-3 rounded-2xl border border-border/80 bg-background/70 p-4">
                <div><p className="font-semibold">{category.name}</p><p className="text-sm text-muted-foreground">{category.weight}% · {category.appliedTo.join(", ") || "All levels"}</p></div>
                <Button variant="secondary" className="rounded-xl" onClick={() => setField("assessmentCategories", categories.filter((item) => item.id !== category.id))}><Trash2 className="h-4 w-4" /></Button>
              </div>
            ))}
            {!categories.length ? <p className="rounded-2xl border border-dashed border-border/80 p-6 text-center text-sm text-muted-foreground">No assessment categories configured yet.</p> : null}
          </div>
        </CardContent>
      </Card>

      <Card className={sectionCardClass}>
        <CardHeader className={sectionHeaderClass}><div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"><div><CardTitle className={settingsSectionTitleClass}>Grading Scale</CardTitle><CardDescription>Configure percentage ranges and grade labels.</CardDescription></div><Button variant="outline" className="rounded-2xl" onClick={() => setField("gradingScaleRows", [...gradingRows, { id: crypto.randomUUID(), min: 0, max: 0, grade: "" }])}><Plus className="mr-2 h-4 w-4" />Add Row</Button></div></CardHeader>
        <CardContent className="space-y-3 p-6">{gradingRows.map((row, index) => <div key={row.id} className="grid gap-3 rounded-2xl border border-border/80 bg-background/70 p-4 md:grid-cols-[1fr_1fr_1fr_auto]"><Input type="number" value={row.min} onChange={(event) => setField("gradingScaleRows", gradingRows.map((item, itemIndex) => itemIndex === index ? { ...item, min: Number(event.target.value || 0) } : item))} className="rounded-xl" placeholder="Min (%)" /><Input type="number" value={row.max} onChange={(event) => setField("gradingScaleRows", gradingRows.map((item, itemIndex) => itemIndex === index ? { ...item, max: Number(event.target.value || 0) } : item))} className="rounded-xl" placeholder="Max (%)" /><Input value={row.grade} onChange={(event) => setField("gradingScaleRows", gradingRows.map((item, itemIndex) => itemIndex === index ? { ...item, grade: event.target.value } : item))} className="rounded-xl" placeholder="Grade e.g. A, B+, D1" /><Button variant="secondary" className="rounded-xl" onClick={() => setField("gradingScaleRows", gradingRows.filter((_, itemIndex) => itemIndex !== index))}><Trash2 className="h-4 w-4" /></Button></div>)}</CardContent>
      </Card>

      <Card className={sectionCardClass}>
        <CardHeader className={sectionHeaderClass}><CardTitle className={settingsSectionTitleClass}>Ranking & Report Cards</CardTitle><CardDescription>Control GPA calculation, ranking behavior, report card format, pass mark, and position display.</CardDescription></CardHeader>
        <CardContent className="grid gap-6 p-6 md:grid-cols-2"><SelectBlock label="GPA Calculation" value={ranking.gpaCalculation} options={selectOptions.gpaCalculation} onChange={(value) => updateRanking({ gpaCalculation: value })} /><SelectBlock label="Ranking System" value={ranking.rankingSystem} options={selectOptions.rankingSystem} onChange={(value) => updateRanking({ rankingSystem: value })} /><SelectBlock label="Report Card Format" value={ranking.reportCardFormat} options={selectOptions.reportCardFormat} onChange={(value) => updateRanking({ reportCardFormat: value })} /><ProfileNumber label="Pass Mark (%)" value={ranking.passMark} onChange={(value) => updateRanking({ passMark: value })} /><div className="flex items-center justify-between rounded-2xl border border-border/80 bg-background/70 p-5 md:col-span-2"><Label>Show Position On Report Cards</Label><Switch checked={ranking.showPositionOnReportCards} onCheckedChange={(value) => updateRanking({ showPositionOnReportCards: value })} /></div></CardContent>
      </Card>

      <Card className={sectionCardClass}>
        <CardHeader className={sectionHeaderClass}><CardTitle className={settingsSectionTitleClass}>Position Rules</CardTitle><CardDescription>Rules used for ranking eligibility, promotion decisions, and report-card position display.</CardDescription></CardHeader>
        <CardContent className="grid gap-6 p-6 md:grid-cols-2"><ProfileNumber label="Minimum Overall Average (%)" value={positionRules.minimumOverallAverage} onChange={(value) => updatePositionRules({ minimumOverallAverage: value })} /><ProfileNumber label="Minimum Subject Score (%)" value={positionRules.minimumSubjectScore} onChange={(value) => updatePositionRules({ minimumSubjectScore: value })} /><ProfileNumber label="Max Failed Subjects Allowed" value={positionRules.maxFailedSubjectsAllowed} onChange={(value) => updatePositionRules({ maxFailedSubjectsAllowed: value })} /><div className="space-y-2 md:col-span-2"><Label>Required Must Pass Subjects</Label><Textarea value={positionRules.requiredMustPassSubjects.join("\n")} onChange={(event) => updatePositionRules({ requiredMustPassSubjects: event.target.value.split("\n").map((item) => item.trim()).filter(Boolean) })} className="min-h-24 rounded-2xl" /></div></CardContent>
      </Card>

      <div className="flex justify-end"><Button className="rounded-2xl" disabled={saving} onClick={() => void onSave()}><Save className={cn("mr-2 h-4 w-4", saving && "animate-pulse")} /> Save Examination & Grading</Button></div>
    </div>
  );
}

function SelectBlock({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <div className="space-y-2"><Label>{label}</Label><Select value={value} onValueChange={onChange}><SelectTrigger className="rounded-2xl"><SelectValue /></SelectTrigger><SelectContent>{options.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent></Select></div>
  );
}

function FinanceSettingsSection({ settings, setField, onSave, saving, actionLoading, onTestProvider }: { settings: Record<string, SettingsValue>; setField: (key: string, value: SettingsValue) => void; onSave: () => Promise<void>; saving: boolean; actionLoading: string; onTestProvider: (provider: string) => void }) {
  const sectionCardClass = "rounded-3xl border border-border bg-card/95 shadow-sm ring-1 ring-border/60";
  const sectionHeaderClass = "px-6 py-5";
  const titleClass = settingsSectionTitleClass;
  const fallbackCurrency = String(settings.currency || "UGX");
  const feeItems = asFinanceFeeItems(settings.financeFeeItems);
  const discounts = asFinanceDiscountRules(settings.financeDiscountRules);
  const penalty = asFinancePenaltyEngine(settings.financePenaltyEngine);
  const installment = asFinanceInstallmentPlan(settings.financeInstallmentPlan);
  const paymentInvoice = asFinancePaymentInvoice(settings.financePaymentInvoice, fallbackCurrency, String(settings.invoicePrefix || "INV"));
  const currencies = asFinanceCurrencies(settings.financeCurrencies, fallbackCurrency);
  const providerCredentials = asRecord(settings.financeProviderCredentials);
  const exchangeRates = asRecord(settings.financeExchangeRates);
  const stages = asStages(settings.academicHierarchy);
  const configuredLevels = asStringArray(settings.schoolLevels);
  const stageNames = stages.length ? stages.map((stage) => stage.name) : configuredLevels.length ? configuredLevels : ["Nursery / Preschool", "Primary", "Junior High (JHS)", "Secondary School", "High School", "College", "University"];
  const currencyOptions = Array.from(new Set([...(selectOptions.currency || []), currencies.baseCurrency, paymentInvoice.currency, ...currencies.enabledCurrencies].filter(Boolean))).sort();
  const [expandedFeeId, setExpandedFeeId] = React.useState(feeItems[0]?.id || "");
  const [addingDiscount, setAddingDiscount] = React.useState(false);
  const [currencySearch, setCurrencySearch] = React.useState("");
  const [draftDiscount, setDraftDiscount] = React.useState<FinanceDiscountRule>({
    id: "",
    name: "",
    type: "Percentage",
    value: 0,
    appliedTo: "All students",
    autoApply: true,
  });

  const updateFeeItems = (next: FinanceFeeItem[]) => setField("financeFeeItems", next);
  const updateDiscounts = (next: FinanceDiscountRule[]) => setField("financeDiscountRules", next);
  const updatePenalty = (next: FinancePenaltyEngine) => setField("financePenaltyEngine", next);
  const updateInstallment = (next: FinanceInstallmentPlan) => setField("financeInstallmentPlan", next);
  const updatePaymentInvoice = (next: FinancePaymentInvoice) => {
    setField("financePaymentInvoice", next);
    setField("currency", next.currency);
    setField("invoicePrefix", next.invoicePrefix);
  };
  const updateCurrencies = (next: FinanceCurrencies) => {
    setField("financeCurrencies", next);
    setField("currency", next.baseCurrency);
  };
  const updateFeeItem = (id: string, patch: Partial<FinanceFeeItem>) => updateFeeItems(feeItems.map((item) => item.id === id ? { ...item, ...patch } : item));
  const addFeeItem = () => {
    const id = `fee-${Date.now()}`;
    const next: FinanceFeeItem = {
      id,
      name: "New Fee Item",
      type: "Academic",
      defaultAmount: 0,
      billingCycle: "Per Term",
      mandatory: true,
      appliesTo: [],
      stagePricing: Object.fromEntries(stageNames.map((stage) => [stage, 0])),
    };
    updateFeeItems([...feeItems, next]);
    setExpandedFeeId(id);
  };
  const removeFeeItem = (id: string) => {
    updateFeeItems(feeItems.filter((item) => item.id !== id));
    if (expandedFeeId === id) setExpandedFeeId("");
  };
  const addDiscount = () => {
    if (!draftDiscount.name.trim()) {
      toast.error("Enter a discount name first.");
      return;
    }
    updateDiscounts([...discounts, { ...draftDiscount, id: `discount-${Date.now()}`, name: draftDiscount.name.trim() }]);
    setDraftDiscount({ id: "", name: "", type: "Percentage", value: 0, appliedTo: "All students", autoApply: true });
    setAddingDiscount(false);
  };
  const addCurrency = () => {
    const code = currencySearch.trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(code)) {
      toast.error("Enter a valid 3-letter currency code.");
      return;
    }
    if (currencies.enabledCurrencies.includes(code)) {
      toast.message(`${code} is already enabled.`);
      return;
    }
    updateCurrencies({ ...currencies, enabledCurrencies: [...currencies.enabledCurrencies, code] });
    setCurrencySearch("");
  };
  const toggleEnabledCurrency = (code: string, enabled: boolean) => {
    const next = enabled
      ? Array.from(new Set([...currencies.enabledCurrencies, code]))
      : currencies.enabledCurrencies.filter((currency) => currency !== code && currency !== currencies.baseCurrency);
    updateCurrencies({ ...currencies, enabledCurrencies: next.length ? next : [currencies.baseCurrency] });
  };

  return (
    <div className="space-y-6">
      <Card className={sectionCardClass}>
        <CardHeader className={cn(sectionHeaderClass, "flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between")}>
          <div>
            <CardTitle className="text-xl font-bold">Fee Items</CardTitle>
            <CardDescription>Build reusable fee definitions with level coverage and stage-specific pricing.</CardDescription>
          </div>
          <Button onClick={addFeeItem} className="rounded-full"><Plus className="mr-2 h-4 w-4" />Add Fee Item</Button>
        </CardHeader>
        <CardContent className="space-y-4 p-6 pt-0">
          {feeItems.length ? feeItems.map((item) => {
            const expanded = expandedFeeId === item.id;
            return (
              <div key={item.id} className="rounded-3xl border border-border bg-background/70 p-4 ring-1 ring-border/40">
                <button type="button" onClick={() => setExpandedFeeId(expanded ? "" : item.id)} className="flex w-full items-center justify-between gap-4 text-left">
                  <div>
                    <p className="text-base font-bold">{item.name}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{item.type} · {item.billingCycle} · {currencies.baseCurrency} {item.defaultAmount.toLocaleString()}</p>
                  </div>
                  <Badge variant={item.mandatory ? "default" : "secondary"}>{item.mandatory ? "Mandatory" : "Optional"}</Badge>
                </button>
                {expanded ? (
                  <div className="mt-5 space-y-5 border-t border-border/70 pt-5">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Fee Item Name</Label>
                        <Input value={item.name} onChange={(event) => updateFeeItem(item.id, { name: event.target.value })} className="rounded-2xl" />
                      </div>
                      <SelectBlock label="Type" value={item.type} options={selectOptions.feeItemType || []} onChange={(value) => updateFeeItem(item.id, { type: value })} />
                      <ProfileNumber label={`Default Amount (${currencies.baseCurrency})`} value={item.defaultAmount} onChange={(value) => updateFeeItem(item.id, { defaultAmount: value })} />
                      <SelectBlock label="Billing Cycle" value={item.billingCycle} options={selectOptions.billingCycle || []} onChange={(value) => updateFeeItem(item.id, { billingCycle: value })} />
                    </div>
                    <AttendanceToggle label="Mandatory Fee" description="Mandatory items are automatically included in billing runs unless exempted." checked={item.mandatory} onChange={(value) => updateFeeItem(item.id, { mandatory: value })} />
                    <div className="space-y-3">
                      <Label>Applies To</Label>
                      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        {stageNames.map((stage) => {
                          const checked = item.appliesTo.includes(stage);
                          return (
                            <button key={stage} type="button" onClick={() => updateFeeItem(item.id, { appliesTo: checked ? item.appliesTo.filter((value) => value !== stage) : [...item.appliesTo, stage] })} className={cn("rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition", checked ? "border-primary bg-primary/10 text-primary" : "border-border bg-background/60 text-foreground hover:border-primary/50")}>
                              {stage}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div className="space-y-3">
                      <Label>Stage Based Pricing</Label>
                      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                        {stageNames.map((stage) => (
                          <div key={stage} className="rounded-2xl border border-border bg-card p-4">
                            <Label className="text-sm font-bold">{stage}</Label>
                            <Input type="number" value={Number(item.stagePricing?.[stage] ?? 0)} onChange={(event) => updateFeeItem(item.id, { stagePricing: { ...item.stagePricing, [stage]: Number(event.target.value || 0) } })} className="mt-2 rounded-2xl" />
                          </div>
                        ))}
                      </div>
                    </div>
                    <Button variant="destructive" className="rounded-full" onClick={() => removeFeeItem(item.id)}><Trash2 className="mr-2 h-4 w-4" />Remove Fee Item</Button>
                  </div>
                ) : null}
              </div>
            );
          }) : (
            <div className="rounded-3xl border border-dashed border-border bg-background/60 p-8 text-center">
              <p className="font-bold">No fee items configured yet</p>
              <p className="mt-2 text-sm text-muted-foreground">Create tuition, boarding, service, administrative, and one-time fee items before billing families.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className={sectionCardClass}>
        <CardHeader className={cn(sectionHeaderClass, "flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between")}>
          <div>
            <CardTitle className="text-xl font-bold">Discount Rules</CardTitle>
            <CardDescription>Set reusable discount policies for siblings, scholarships, staff children, and special cohorts.</CardDescription>
          </div>
          <Button variant="outline" onClick={() => setAddingDiscount(true)} className="rounded-full"><Plus className="mr-2 h-4 w-4" />Add Discount</Button>
        </CardHeader>
        <CardContent className="space-y-4 p-6 pt-0">
          {addingDiscount ? (
            <div className="rounded-3xl border border-primary/30 bg-primary/10 p-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2"><Label>Name</Label><Input value={draftDiscount.name} onChange={(event) => setDraftDiscount({ ...draftDiscount, name: event.target.value })} placeholder="Siblings discount" className="rounded-2xl" /></div>
                <SelectBlock label="Type" value={draftDiscount.type} options={selectOptions.discountType || []} onChange={(value) => setDraftDiscount({ ...draftDiscount, type: value })} />
                <ProfileNumber label="Value" value={draftDiscount.value} onChange={(value) => setDraftDiscount({ ...draftDiscount, value })} />
                <div className="space-y-2"><Label>Applied To</Label><Input value={draftDiscount.appliedTo} onChange={(event) => setDraftDiscount({ ...draftDiscount, appliedTo: event.target.value })} className="rounded-2xl" /></div>
              </div>
              <div className="mt-4"><AttendanceToggle label="Auto Apply When Conditions Are Met" description="Billing automation will apply this discount without manual finance approval." checked={draftDiscount.autoApply} onChange={(value) => setDraftDiscount({ ...draftDiscount, autoApply: value })} /></div>
              <div className="mt-4 flex flex-wrap gap-3">
                <Button onClick={addDiscount} className="rounded-full">Add Discount</Button>
                <Button variant="outline" onClick={() => setAddingDiscount(false)} className="rounded-full">Cancel</Button>
              </div>
            </div>
          ) : null}
          <div className="grid gap-3 md:grid-cols-2">
            {discounts.map((discount) => (
              <div key={discount.id} className="rounded-2xl border border-border bg-background/70 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div><p className="font-bold">{discount.name}</p><p className="mt-1 text-sm text-muted-foreground">{discount.type} · {discount.value} · {discount.appliedTo}</p></div>
                  <Button variant="ghost" size="icon" onClick={() => updateDiscounts(discounts.filter((item) => item.id !== discount.id))}><Trash2 className="h-4 w-4" /></Button>
                </div>
                <Badge variant={discount.autoApply ? "default" : "secondary"} className="mt-3">{discount.autoApply ? "Auto applied" : "Manual approval"}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className={sectionCardClass}>
          <CardHeader className={sectionHeaderClass}><CardTitle className="text-xl font-bold">Penalty Engine</CardTitle><CardDescription>Control late payment penalties and consequences.</CardDescription></CardHeader>
          <CardContent className="grid gap-4 p-6 pt-0 md:grid-cols-2">
            <ProfileNumber label="Grace Period (Days)" value={penalty.gracePeriodDays} onChange={(value) => updatePenalty({ ...penalty, gracePeriodDays: value })} />
            <SelectBlock label="Penalty Type" value={penalty.penaltyType} options={selectOptions.penaltyType || []} onChange={(value) => updatePenalty({ ...penalty, penaltyType: value })} />
            <ProfileNumber label="Penalty Value (%)" value={penalty.penaltyValue} onChange={(value) => updatePenalty({ ...penalty, penaltyValue: value })} />
            <ProfileNumber label={`Cap Amount (${currencies.baseCurrency})`} value={penalty.capAmount} onChange={(value) => updatePenalty({ ...penalty, capAmount: value })} />
            <div className="md:col-span-2"><AttendanceToggle label="Recurring Penalty" description="Apply the penalty repeatedly after each overdue billing cycle." checked={penalty.recurringPenalty} onChange={(value) => updatePenalty({ ...penalty, recurringPenalty: value })} /></div>
            <div className="md:col-span-2"><SelectBlock label="Consequence" value={penalty.consequence} options={selectOptions.financeConsequence || []} onChange={(value) => updatePenalty({ ...penalty, consequence: value })} /></div>
          </CardContent>
        </Card>

        <Card className={sectionCardClass}>
          <CardHeader className={sectionHeaderClass}><CardTitle className="text-xl font-bold">Installment Plan</CardTitle><CardDescription>Define partial payment rules and installment limits.</CardDescription></CardHeader>
          <CardContent className="space-y-4 p-6 pt-0">
            <AttendanceToggle label="Allow Partial Payments" description="Families can split invoices into approved installments." checked={installment.allowPartialPayments} onChange={(value) => updateInstallment({ ...installment, allowPartialPayments: value })} />
            <div className="grid gap-4 md:grid-cols-2">
              <ProfileNumber label={`Minimum Installment (${currencies.baseCurrency})`} value={installment.minimumInstallment} onChange={(value) => updateInstallment({ ...installment, minimumInstallment: value })} />
              <ProfileNumber label="Max Installments" value={installment.maxInstallments} onChange={(value) => updateInstallment({ ...installment, maxInstallments: value })} />
            </div>
            <AttendanceToggle label="Auto Due Date" description="Automatically calculate due dates from invoice issue date and term calendar." checked={installment.autoDueDate} onChange={(value) => updateInstallment({ ...installment, autoDueDate: value })} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className={sectionCardClass}>
          <CardHeader className={sectionHeaderClass}><CardTitle className="text-xl font-bold">Payment & Invoice</CardTitle><CardDescription>Set invoice currency, tax policy, and accepted payment channels.</CardDescription></CardHeader>
          <CardContent className="space-y-5 p-6 pt-0">
            <div className="grid gap-4 md:grid-cols-3">
              <CurrencySelect label="Currency" value={paymentInvoice.currency} onChange={(value) => updatePaymentInvoice({ ...paymentInvoice, currency: value })} />
              <div className="space-y-2"><Label>Invoice Prefix</Label><Input value={paymentInvoice.invoicePrefix} onChange={(event) => updatePaymentInvoice({ ...paymentInvoice, invoicePrefix: event.target.value.toUpperCase() })} className="rounded-2xl" /></div>
              <ProfileNumber label="Tax Rate (%)" value={paymentInvoice.taxRate} onChange={(value) => updatePaymentInvoice({ ...paymentInvoice, taxRate: value })} />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {[
                ["flutterwave", "Flutterwave"],
                ["paystack", "Paystack"],
                ["stripe", "Stripe"],
                ["mobileMoney", "Mobile Money (MTN / Airtel)"],
                ["cash", "Cash"],
                ["cardBankTransfer", "Card / Bank Transfer"],
              ].map(([key, label]) => (
                <AttendanceToggle key={key} label={label} description="Enable this payment method for tenant billing and collections." checked={Boolean(paymentInvoice.providers[key])} onChange={(value) => updatePaymentInvoice({ ...paymentInvoice, providers: { ...paymentInvoice.providers, [key]: value } })} />
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className={sectionCardClass}>
          <CardHeader className={sectionHeaderClass}><CardTitle className="text-xl font-bold">Currency & Exchange Rates</CardTitle><CardDescription>Choose the base currency and currencies accepted for payments.</CardDescription></CardHeader>
          <CardContent className="space-y-5 p-6 pt-0">
            <CurrencySelect label="Base Currency" value={currencies.baseCurrency} onChange={(value) => updateCurrencies({ baseCurrency: value, enabledCurrencies: Array.from(new Set([...currencies.enabledCurrencies, value])) })} />
            <div className="space-y-3">
              <Label>Enabled Currencies</Label>
              <div className="grid gap-3 md:grid-cols-2">
                {currencyOptions.map((code) => (
                  <AttendanceToggle key={code} label={code} description={code === currencies.baseCurrency ? "Base currency, always enabled." : "Accept payments and display invoices in this currency."} checked={currencies.enabledCurrencies.includes(code)} onChange={(value) => toggleEnabledCurrency(code, value)} />
                ))}
              </div>
            </div>
            <div className="rounded-3xl border border-primary/30 bg-primary/10 p-5">
              <Label>Add Currency</Label>
              <div className="mt-3 flex gap-3">
                <Input value={currencySearch} onChange={(event) => setCurrencySearch(event.target.value)} placeholder="Search or enter code, e.g. RWF" className="rounded-2xl uppercase" />
                <Button onClick={addCurrency} className="rounded-full">Add</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className={sectionCardClass}>
        <CardHeader className={sectionHeaderClass}>
          <CardTitle role="heading" aria-level={2} className="text-xl font-bold">Provider Credentials</CardTitle>
          <CardDescription>Store API keys, secret keys, webhooks, sandbox mode, and live mode for each enabled provider.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 p-6 pt-0 xl:grid-cols-2">
          {[
            ["paystack", "Paystack"],
            ["flutterwave", "Flutterwave"],
            ["stripe", "Stripe"],
            ["mobileMoney", "Mobile Money"],
            ["cashBankTransfer", "Cash / Bank Transfer"],
          ].map(([key, label]) => {
            const row = (providerCredentials[key] && typeof providerCredentials[key] === "object" ? providerCredentials[key] : {}) as Record<string, unknown>;
            const updateProvider = (patch: Record<string, unknown>) => setField("financeProviderCredentials", { ...providerCredentials, [key]: { ...row, ...patch } });
            return (
              <div key={key} className="rounded-3xl border border-border bg-background/70 p-5">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-base font-bold">{label}</p>
                  <Button variant="outline" size="sm" className="rounded-full" disabled={actionLoading === `test:${key}`} onClick={() => onTestProvider(key)}>
                    <RefreshCw className={cn("mr-2 h-3.5 w-3.5", actionLoading === `test:${key}` && "animate-spin")} /> Test {label}
                  </Button>
                </div>
                <div className="mt-4 grid gap-3">
                  <Input placeholder="Public / API key" value={String(row.publicKey || "")} onChange={(event) => updateProvider({ publicKey: event.target.value })} className="rounded-2xl" />
                  <Input placeholder="Secret key / token" type="password" value={String(row.secretKey || "")} onChange={(event) => updateProvider({ secretKey: event.target.value })} className="rounded-2xl" />
                  <Input placeholder="Webhook URL" value={String(row.webhookUrl || "")} onChange={(event) => updateProvider({ webhookUrl: event.target.value })} className="rounded-2xl" />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <AttendanceToggle label="Sandbox Mode" description="Use test credentials." checked={Boolean(row.sandboxMode ?? true)} onChange={(value) => updateProvider({ sandboxMode: value, liveMode: !value })} />
                    <AttendanceToggle label="Live Mode" description="Use live payment credentials." checked={Boolean(row.liveMode)} onChange={(value) => updateProvider({ liveMode: value, sandboxMode: !value })} />
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card className={sectionCardClass}>
        <CardHeader className={sectionHeaderClass}>
          <CardTitle className="text-xl font-bold">Exchange Rate Manager</CardTitle>
          <CardDescription>Control automatic currency sync, manual overrides, converter tests, and reporting currency.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 p-6 pt-0 md:grid-cols-2">
          <AttendanceToggle label="Automatic Currency Sync" description="Use real exchange-rate sync jobs when the rate service is configured." checked={Boolean(exchangeRates.automaticSync ?? true)} onChange={(value) => setField("financeExchangeRates", { ...exchangeRates, automaticSync: value })} />
          <AttendanceToggle label="Manual Rate Override" description="Allow finance users to override synced rates where policy permits." checked={Boolean(exchangeRates.manualRateOverride)} onChange={(value) => setField("financeExchangeRates", { ...exchangeRates, manualRateOverride: value })} />
          <CurrencySelect label="Financial Reporting Currency" value={String(exchangeRates.reportingCurrency || currencies.baseCurrency)} onChange={(value) => setField("financeExchangeRates", { ...exchangeRates, reportingCurrency: value })} />
          <ProfileNumber label="Converter Amount" value={Number(exchangeRates.converterAmount || 1)} onChange={(value) => setField("financeExchangeRates", { ...exchangeRates, converterAmount: value })} />
          <CurrencySelect label="Converter From" value={String(exchangeRates.converterFrom || "USD")} onChange={(value) => setField("financeExchangeRates", { ...exchangeRates, converterFrom: value })} />
          <CurrencySelect label="Converter To" value={String(exchangeRates.converterTo || currencies.baseCurrency)} onChange={(value) => setField("financeExchangeRates", { ...exchangeRates, converterTo: value })} />
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={onSave} disabled={saving} className="rounded-full px-7">
          {saving ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save Finance
        </Button>
      </div>
    </div>
  );
}

function NamingSettingsSection({ settings, setField, onSave, saving }: { settings: Record<string, SettingsValue>; setField: (key: string, value: SettingsValue) => void; onSave: () => Promise<void>; saving: boolean }) {
  const sectionCardClass = "rounded-3xl border border-border bg-card/95 shadow-sm ring-1 ring-border/60";
  const labelsRecord = asRecord(settings.namingLabels);
  const formats = asRecord(settings.numberFormats);
  const updateLabels = (patch: Record<string, unknown>) => setField("namingLabels", { ...labelsRecord, ...patch });
  const updateFormats = (patch: Record<string, unknown>) => setField("numberFormats", { ...formats, ...patch });
  return (
    <div className="space-y-6">
      <Card className={sectionCardClass}>
        <CardHeader className="px-6 py-5"><CardTitle className="text-xl font-bold">Academic Naming</CardTitle><CardDescription>Rename core academic concepts for this tenant without changing dashboard routes.</CardDescription></CardHeader>
        <CardContent className="grid gap-4 p-6 pt-0 md:grid-cols-2">
          {[
            ["student", "Student"],
            ["teacher", "Teacher"],
            ["parent", "Parent"],
            ["classroom", "Classroom"],
            ["subject", "Subject"],
            ["term", "Term"],
            ["semester", "Semester"],
            ["academicYear", "Academic Year"],
          ].map(([key, fallback]) => (
            <div key={key} className="space-y-2">
              <Label>{fallback}</Label>
              <Input value={String(labelsRecord[key] || fallback)} onChange={(event) => updateLabels({ [key]: event.target.value })} className="rounded-2xl" />
            </div>
          ))}
        </CardContent>
      </Card>
      <Card className={sectionCardClass}>
        <CardHeader className="px-6 py-5"><CardTitle className="text-xl font-bold">Formatting & Number Generation</CardTitle><CardDescription>Formats use tokens like {"{SCHOOL_CODE}"}, {"{YEAR}"}, and {"{0000}"} for deterministic generated numbers.</CardDescription></CardHeader>
        <CardContent className="grid gap-4 p-6 pt-0 md:grid-cols-2">
          {[
            ["studentIdFormat", "{SCHOOL_CODE}/STU/{YEAR}/{0000}", "Student ID Format"],
            ["staffIdFormat", "{SCHOOL_CODE}/STA/{YEAR}/{0000}", "Staff ID Format"],
            ["admissionNumberFormat", "{SCHOOL_CODE}/ADM/{YEAR}/{0000}", "Admission Number Format"],
            ["classNamingFormat", "Stage + Number + Section", "Class Naming Format"],
            ["prefix", "", "Prefix"],
            ["suffix", "", "Suffix"],
          ].map(([key, fallback, label]) => (
            <div key={key} className="space-y-2">
              <Label>{label}</Label>
              <Input value={String(formats[key] || fallback)} onChange={(event) => updateFormats({ [key]: event.target.value })} className="rounded-2xl" />
            </div>
          ))}
          <ProfileNumber label="Running Number" value={Number(formats.runningNumber || 1)} onChange={(value) => updateFormats({ runningNumber: value })} />
          <AttendanceToggle label="Auto Increment Logic" description="Automatically increment generated student, staff, and admission numbers after each successful creation." checked={Boolean(formats.autoIncrement ?? true)} onChange={(value) => updateFormats({ autoIncrement: value })} />
        </CardContent>
      </Card>
      <div className="flex justify-end"><Button className="rounded-2xl" disabled={saving} onClick={() => void onSave()}><Save className={cn("mr-2 h-4 w-4", saving && "animate-pulse")} /> Save Naming Settings</Button></div>
    </div>
  );
}

function AdvancedSettingsSection({ section, settings, setField, onSave, saving, actionLoading, onTestProvider, onCreateBackup, onRestoreBackup, data }: { section: Section; settings: Record<string, SettingsValue>; setField: (key: string, value: SettingsValue) => void; onSave: () => Promise<void>; saving: boolean; actionLoading: string; onTestProvider: (provider: string) => void; onCreateBackup: () => void; onRestoreBackup: (backupId: string) => void; data: Payload }) {
  const sectionCardClass = "rounded-3xl border border-border bg-card/95 shadow-sm ring-1 ring-border/60";
  const cards: Record<string, Array<{ title: string; description: string; fields: string[] }>> = {
    communication: [
      { title: "Email Providers", description: "Configure tenant email providers and securely store all API keys.", fields: ["emailProvider", "resendApiKey", "smtpEnabled", "smtpHost", "smtpPort", "smtpUsername", "smtpPassword", "smtpFromEmail", "sendgridEnabled", "sendgridApiKey", "sendgridFromEmail", "mailgunEnabled", "mailgunApiKey", "mailgunDomain", "mailgunRegion", "awsSesEnabled", "awsSesAccessKeyId", "awsSesSecretAccessKey", "awsSesRegion", "awsSesFromEmail"] },
      { title: "SMS Providers", description: "Enable SMS vendors and store provider credentials for tenant notifications.", fields: ["smsProvider", "smsTwilioEnabled", "twilioAccountSid", "twilioAuthToken", "twilioFromNumber", "smsAfricasTalkingEnabled", "africasTalkingUsername", "africasTalkingApiKey", "africasTalkingSenderId", "smsHubtelEnabled", "hubtelClientId", "hubtelClientSecret", "hubtelSenderId", "termiiApiKey", "termiiSenderId", "smsCustomEnabled", "customSmsEndpoint", "customSmsApiKey", "customSmsSenderId"] },
      { title: "Notification Preferences", description: "Choose which audience receives email, SMS, push, or WhatsApp updates.", fields: ["notifyStudentsEmail", "notifyStudentsSms", "notifyStudentsPush", "notifyStudentsWhatsapp", "notifyParentsEmail", "notifyParentsSms", "notifyParentsPush", "notifyParentsWhatsapp", "notifyTeachersEmail", "notifyTeachersSms", "notifyTeachersPush", "notifyTeachersWhatsapp"] },
    ],
    security: [
      { title: "Authentication", description: "Control MFA, SSO, Google login, Microsoft login, and password requirements.", fields: ["twoFactorRequired", "ssoEnabled", "ssoProvider", "ssoIssuerUrl", "ssoClientId", "ssoClientSecret", "googleLoginEnabled", "googleClientId", "googleClientSecret", "microsoftLoginEnabled", "microsoftClientId", "microsoftClientSecret", "microsoftTenantId", "passwordMinLength"] },
      { title: "Session Management", description: "Protect active sessions and monitor tenant device access.", fields: ["sessionTimeoutMinutes", "deviceTrackingEnabled", "activeSessionLimit"] },
      { title: "Audit Logs", description: "Enable login, change, and activity logs for tenant-wide accountability.", fields: ["loginLogsEnabled", "changeLogsEnabled", "activityLogsEnabled"] },
      { title: "Data Privacy", description: "Manage retention, export, and deletion request policies.", fields: ["dataRetentionYears", "dataExportEnabled", "dataDeletionRequestsEnabled"] },
    ],
    documents: [
      { title: "Document Templates", description: "Enable generated document templates for academic, finance, and compliance outputs.", fields: ["admissionLetterTemplateEnabled", "certificateTemplateEnabled", "reportCardTemplateEnabled", "transcriptTemplateEnabled", "feeInvoiceTemplateEnabled"] },
      { title: "Compliance Settings", description: "Track compliance, accreditation, legal records, officer assignment, and retention.", fields: ["ministryComplianceEnabled", "accreditationRecordsEnabled", "legalDocumentsEnabled", "complianceOfficer", "documentRetentionYears"] },
    ],
    automation: [
      { title: "Workflow Engine", description: "Enable automated academic, finance, communication, and timetable workflows.", fields: ["automationEnabled", "autoPromotionEnabled", "autoFeeGenerationEnabled", "autoNotificationsEnabled", "autoTimetableGenerationEnabled"] },
      { title: "Scheduler", description: "Control scheduled background jobs for recurring tenant operations.", fields: ["dailyJobsEnabled", "weeklyJobsEnabled", "monthlyJobsEnabled"] },
      { title: "Event Triggers", description: "Run automations when key tenant events happen.", fields: ["triggerStudentAdmissionEnabled", "triggerFeePaymentEnabled", "triggerExamCompletionEnabled", "triggerGraduationEnabled"] },
    ],
    backup: [
      { title: "Backup Settings", description: "Configure manual, scheduled, cloud backup, frequency, and storage provider.", fields: ["manualBackupEnabled", "scheduledBackupEnabled", "cloudBackupEnabled", "backupFrequency", "backupProvider"] },
      { title: "Restore Management", description: "Prepare controlled restore points, one-click restore, and rollback policy.", fields: ["restorePointSelection", "oneClickRestoreEnabled", "rollbackEnabled"] },
      { title: "Data Export", description: "Choose tenant export formats available to owners.", fields: ["exportCsvEnabled", "exportExcelEnabled", "exportPdfEnabled", "exportJsonEnabled"] },
    ],
    integrations: [
      { title: "LMS Integration", description: "Connect external learning platforms using an API URL, API key, and webhook secret.", fields: ["lmsEnabled", "lmsUrl", "lmsApiKey", "lmsWebhookSecret"] },
      { title: "Webhooks", description: "Deliver signed tenant events to external services.", fields: ["webhookUrl", "webhookSigningSecret", "webhookSigningEnabled", "allowedWebhookDomains"] },
    ],
  };
  const activeCards = cards[section.id] || [{ title: section.title, description: section.description, fields: section.fields }];
  return (
    <div className="space-y-6">
      {activeCards.map((card) => (
        <Card key={card.title} className={sectionCardClass}>
          <CardHeader className="px-6 py-5"><CardTitle className="text-xl font-bold">{card.title}</CardTitle><CardDescription>{card.description}</CardDescription></CardHeader>
          <CardContent className="grid gap-4 p-6 pt-0 md:grid-cols-2">
            {card.fields.map((field) => <FieldControl key={field} field={field} value={settings[field]} onChange={(value) => setField(field, value)} />)}
          </CardContent>
        </Card>
      ))}
      {section.id === "communication" ? (
        <Card className={sectionCardClass}>
          <CardHeader className="px-6 py-5"><CardTitle className="text-xl font-bold">Live Provider Tests</CardTitle><CardDescription>Run real provider health checks using the stored encrypted tenant credentials.</CardDescription></CardHeader>
          <CardContent className="flex flex-wrap gap-3 p-6 pt-0">
            {["resend", "smtp", "sendgrid", "mailgun", "awsSes", "twilio", "africasTalking", "hubtel", "termii", "customSms"].map((provider) => (
              <Button key={provider} variant="outline" className="rounded-full" disabled={actionLoading === `test:${provider}`} onClick={() => onTestProvider(provider)}>
                <RefreshCw className={cn("mr-2 h-4 w-4", actionLoading === `test:${provider}` && "animate-spin")} /> Test {provider}
              </Button>
            ))}
          </CardContent>
        </Card>
      ) : null}
      {section.id === "security" ? (
        <Card className={sectionCardClass}>
          <CardHeader className="px-6 py-5"><CardTitle className="text-xl font-bold">Authentication Provider Tests</CardTitle><CardDescription>Validate OIDC and OAuth provider discovery using stored credentials.</CardDescription></CardHeader>
          <CardContent className="flex flex-wrap gap-3 p-6 pt-0">
            {["sso", "googleOAuth", "microsoftOAuth"].map((provider) => (
              <Button key={provider} variant="outline" className="rounded-full" disabled={actionLoading === `test:${provider}`} onClick={() => onTestProvider(provider)}>
                <RefreshCw className={cn("mr-2 h-4 w-4", actionLoading === `test:${provider}` && "animate-spin")} /> Test {provider}
              </Button>
            ))}
          </CardContent>
        </Card>
      ) : null}
      {section.id === "integrations" ? (
        <Card className={sectionCardClass}>
          <CardHeader className="px-6 py-5"><CardTitle className="text-xl font-bold">Integration Tests</CardTitle><CardDescription>Validate LMS and webhook endpoints with stored credentials and signing secrets.</CardDescription></CardHeader>
          <CardContent className="flex flex-wrap gap-3 p-6 pt-0">
            {["lms", "webhook"].map((provider) => (
              <Button key={provider} variant="outline" className="rounded-full" disabled={actionLoading === `test:${provider}`} onClick={() => onTestProvider(provider)}>
                <RefreshCw className={cn("mr-2 h-4 w-4", actionLoading === `test:${provider}` && "animate-spin")} /> Test {provider}
              </Button>
            ))}
          </CardContent>
        </Card>
      ) : null}
      {section.id === "backup" ? (
        <Card className={sectionCardClass}>
          <CardHeader className="px-6 py-5"><CardTitle className="text-xl font-bold">Backup & Restore Execution</CardTitle><CardDescription>Create physical JSON restore points and restore them into the tenant settings store.</CardDescription></CardHeader>
          <CardContent className="space-y-4 p-6 pt-0">
            <Button className="rounded-full" disabled={actionLoading === "backup:create"} onClick={onCreateBackup}>
              <Database className="mr-2 h-4 w-4" /> Create Backup Now
            </Button>
            <div className="grid gap-3 md:grid-cols-2">
              {(data.backups || []).map((backup) => (
                <div key={backup.id} className="rounded-2xl border border-border bg-background/70 p-4">
                  <p className="font-semibold">{backup.id}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{backup.createdAt || "Unknown date"} · {backup.size ? `${Math.round(Number(backup.size) / 1024)} KB` : "Unknown size"}</p>
                  <Button variant="outline" className="mt-3 rounded-full" disabled={actionLoading === `backup:${backup.id}`} onClick={() => onRestoreBackup(backup.id)}>Restore</Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}
      <div className="flex justify-end"><Button className="rounded-2xl" disabled={saving} onClick={() => void onSave()}><Save className={cn("mr-2 h-4 w-4", saving && "animate-pulse")} /> Save {section.title}</Button></div>
    </div>
  );
}

function SectionPageHeader({ section }: { section: Section }) {
  const Icon = sectionIcons[section.id] || SlidersHorizontal;
  return (
    <Card className="rounded-3xl border border-border bg-card/95 shadow-sm ring-1 ring-border/60">
      <CardHeader className="px-6 py-5">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20">
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <CardTitle className={settingsSectionTitleClass}>{section.title}</CardTitle>
            <CardDescription className="mt-1 max-w-3xl">{section.description}</CardDescription>
          </div>
        </div>
      </CardHeader>
    </Card>
  );
}

function SettingsHardeningPanel({ data, actionLoading, onCreateBackup, onRestoreBackup, onRollbackVersion }: { data: Payload; actionLoading: string; onCreateBackup: () => void; onRestoreBackup: (backupId: string) => void; onRollbackVersion: (versionId: string) => void }) {
  return (
    <Card className="rounded-3xl border border-border bg-card/95 shadow-sm ring-1 ring-border/60">
      <CardHeader className="px-6 py-5">
        <CardTitle className="text-xl font-bold">Production Hardening</CardTitle>
        <CardDescription>Encrypted secrets, version history, rollback, and tenant backup controls for the settings module.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6 p-6 pt-0 xl:grid-cols-2">
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-semibold">Version History</p>
              <p className="text-sm text-muted-foreground">Rollback restores a saved settings snapshot and creates a safety snapshot first.</p>
            </div>
          </div>
          {(data.versions || []).length ? (data.versions || []).map((version) => (
            <div key={version.id} className="rounded-2xl border border-border bg-background/70 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium">{version.id}</p>
                  <p className="text-sm text-muted-foreground">{version.createdAt || "Unknown date"} · {version.changedKeys.length} changes</p>
                </div>
                <Button variant="outline" className="rounded-full" disabled={actionLoading === `rollback:${version.id}`} onClick={() => onRollbackVersion(version.id)}>Rollback</Button>
              </div>
            </div>
          )) : <p className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">No versions yet. Save settings once to create the first version snapshot.</p>}
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-semibold">Backups</p>
              <p className="text-sm text-muted-foreground">Create and restore tenant-scoped JSON backups of settings, secret vault, and automation bindings.</p>
            </div>
            <Button size="sm" className="rounded-full" disabled={actionLoading === "backup:create"} onClick={onCreateBackup}><Database className="mr-2 h-4 w-4" /> Create</Button>
          </div>
          {(data.backups || []).length ? (data.backups || []).map((backup) => (
            <div key={backup.id} className="rounded-2xl border border-border bg-background/70 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium">{backup.id}</p>
                  <p className="text-sm text-muted-foreground">{backup.createdAt || "Unknown date"} · {backup.size ? `${Math.round(Number(backup.size) / 1024)} KB` : "Unknown size"}</p>
                </div>
                <Button variant="outline" className="rounded-full" disabled={actionLoading === `backup:${backup.id}`} onClick={() => onRestoreBackup(backup.id)}>Restore</Button>
              </div>
            </div>
          )) : <p className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">No backups yet. Create a backup before major configuration changes.</p>}
        </div>
      </CardContent>
    </Card>
  );
}

function SectionPage({ data, section, settings, setField, setBrandingField, tenantSlug, onSave, saving, actionLoading, onTestProvider, onCreateBackup, onRestoreBackup, onRollbackVersion }: { data: Payload; section: Section; settings: Record<string, SettingsValue>; setField: (key: string, value: SettingsValue) => void; setBrandingField: (key: string, value: SettingsValue) => void; tenantSlug: string; onSave: () => Promise<void>; saving: boolean; actionLoading: string; onTestProvider: (provider: string) => void; onCreateBackup: () => void; onRestoreBackup: (backupId: string) => void; onRollbackVersion: (versionId: string) => void }) {
  const Icon = sectionIcons[section.id] || SlidersHorizontal;
  const pageHeader = <SectionPageHeader section={section} />;
  if (section.id === "school_name") {
    return <>{pageHeader}<SchoolProfileSection data={data} settings={settings} setField={setField} onSave={onSave} saving={saving} /></>;
  }
  if (section.id === "branding") {
    return <>{pageHeader}<BrandingAppearanceSection data={data} settings={settings} setField={setBrandingField} tenantSlug={tenantSlug} /></>;
  }
  if (section.id === "academic") {
    return <>{pageHeader}<AcademicSettingsSection settings={settings} setField={setField} onSave={onSave} saving={saving} /></>;
  }
  if (section.id === "academic_structure") {
    return <>{pageHeader}<AcademicStructureSection settings={settings} setField={setField} onSave={onSave} saving={saving} /></>;
  }
  if (section.id === "attendance") {
    return <>{pageHeader}<AttendanceSettingsSection settings={settings} setField={setField} onSave={onSave} saving={saving} /></>;
  }
  if (section.id === "examination") {
    return <>{pageHeader}<ExaminationGradingSection settings={settings} setField={setField} onSave={onSave} saving={saving} /></>;
  }
  if (section.id === "finance") {
    return <>{pageHeader}<FinanceSettingsSection settings={settings} setField={setField} onSave={onSave} saving={saving} actionLoading={actionLoading} onTestProvider={onTestProvider} /></>;
  }
  if (section.id === "naming") {
    return <>{pageHeader}<NamingSettingsSection settings={settings} setField={setField} onSave={onSave} saving={saving} /></>;
  }
  if (["communication", "security", "documents", "automation", "backup"].includes(section.id)) {
    return <>{pageHeader}<AdvancedSettingsSection section={section} settings={settings} setField={setField} onSave={onSave} saving={saving} actionLoading={actionLoading} onTestProvider={onTestProvider} onCreateBackup={onCreateBackup} onRestoreBackup={onRestoreBackup} data={data} /></>;
  }

  return (
    <>
      {pageHeader}
      <Card className="rounded-3xl border border-border bg-card/95 shadow-sm ring-1 ring-border/60">
        <CardHeader>
          <CardTitle className={cn(settingsSectionTitleClass, "flex items-center gap-2")}><Icon className="h-5 w-5 text-primary" /> {section.title}</CardTitle>
          <CardDescription>{section.description}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          {section.fields.map((field) => (
            <FieldControl key={field} field={field} value={settings[field]} onChange={(value) => setField(field, value)} />
          ))}
        </CardContent>
      </Card>

      <Card className="rounded-3xl border border-border bg-card/95 shadow-sm ring-1 ring-border/60">
        <CardHeader>
          <CardTitle className={settingsSectionTitleClass}>Operational Notes</CardTitle>
          <CardDescription>Use this section carefully because changes are applied tenant-wide after saving.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl border border-border/80 bg-background/70 p-4">
            <p className="text-sm font-medium">Propagation</p>
            <p className="mt-1 text-sm text-muted-foreground">Saved settings are read by dashboard pages, branding, finance, communications, and access workflows.</p>
          </div>
          <div className="rounded-2xl border border-border/80 bg-background/70 p-4">
            <p className="text-sm font-medium">Verification</p>
            <p className="mt-1 text-sm text-muted-foreground">Use refresh after saving to confirm the persisted server value.</p>
          </div>
          <div className="rounded-2xl border border-border/80 bg-background/70 p-4 md:col-span-2">
            <p className="text-sm font-medium">External services</p>
            <p className="mt-1 text-sm text-muted-foreground">Provider credentials are stored server-side in tenant settings and used by the relevant APIs when those providers are enabled.</p>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

function FieldControl({ field, value, onChange }: { field: string; value: SettingsValue | undefined; onChange: (value: SettingsValue) => void }) {
  const label = labels[field] || field;
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return (
      <div className="rounded-2xl border border-border/80 bg-background/70 p-4 md:col-span-2">
        <Label>{label}</Label>
        <p className="mt-1 text-sm text-muted-foreground">This setting uses a dedicated editor in its production section.</p>
      </div>
    );
  }
  if (typeof value === "boolean") {
    return (
      <div className="flex items-center justify-between rounded-2xl border bg-background/60 p-4 md:col-span-2">
        <div>
          <Label>{label}</Label>
          <p className="mt-1 text-sm text-muted-foreground">Toggle this tenant capability across the ecosystem.</p>
        </div>
        <Switch checked={Boolean(value)} onCheckedChange={onChange} />
      </div>
    );
  }
  if (["phone", "alternativePhone", "ownerPhone"].includes(field)) {
    return (
      <PhoneNumberField
        id={field}
        label={label}
        value={String(value || "")}
        onChange={onChange}
      />
    );
  }
  if (["currency", "baseCurrency", "financialReportingCurrency", "reportingCurrency", "converterFrom", "converterTo"].includes(field)) {
    return <CurrencySelect label={label} value={String(value || "")} onChange={(nextValue) => onChange(nextValue)} />;
  }
  if (selectOptions[field]) {
    return (
      <div className="space-y-2.5">
        <Label>{label}</Label>
        <Select value={String(value || "")} onValueChange={onChange}>
          <SelectTrigger className="rounded-2xl"><SelectValue /></SelectTrigger>
          <SelectContent>{selectOptions[field].map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent>
        </Select>
      </div>
    );
  }
  if (field === "country") {
    return (
      <CountrySelect
        id={field}
        label={label}
        value={String(value || "")}
        onChange={(nextValue) => onChange(nextValue)}
      />
    );
  }
  if (field === "city") {
    return (
      <CityInput
        id={field}
        label={label}
        value={String(value || "")}
        onChange={onChange}
      />
    );
  }
  if (["address", "schoolDescription", "postalAddress"].includes(field)) {
    return (
      <div className="space-y-2.5 md:col-span-2">
        <Label>{label}</Label>
        <Textarea value={String(value || "")} onChange={(event) => onChange(event.target.value)} className="rounded-2xl" />
      </div>
    );
  }
  if (field === "website" || field.endsWith("Url") || field === "lmsUrl") {
    return (
      <div className="space-y-2.5">
        <Label>{label}</Label>
        <div className="relative">
          <Input value={String(value || "")} onChange={(event) => onChange(event.target.value)} className="rounded-2xl pr-10" />
          <ExternalLink className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-2.5">
      <Label>{label}</Label>
      <Input
        type={field.toLowerCase().includes("key") || field.toLowerCase().includes("token") || field.toLowerCase().includes("secret") ? "password" : field === "dateEstablished" ? "date" : field.toLowerCase().includes("color") ? "color" : "text"}
        value={String(value || "")}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-2xl"
      />
    </div>
  );
}
