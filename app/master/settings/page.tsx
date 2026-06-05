"use client";

import * as React from "react";
import {
  AlertTriangle,
  Banknote,
  Bell,
  Check,
  ChevronRight,
  Database,
  FileCheck2,
  Globe,
  Languages,
  Loader2,
  Mail,
  Network,
  RefreshCw,
  Save,
  ServerCog,
  Shield,
  Sparkles,
  Workflow,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { publishPlatformSettings, type PublicPlatformSettings } from "@/lib/platform-settings-sync";
import { cn } from "@/lib/utils";

type SettingsState = {
  platformName: string;
  platformShortName: string;
  platformSubtitle: string;
  supportEmail: string;
  supportPhone: string;
  companyAddress: string;
  timezone: string;
  currency: string;
  announcementBanner: string;
  tenantBrandingLock: boolean;

  smtpHost: string;
  smtpPort: string;
  smtpUsername: string;
  smtpPassword: string;
  resendApiKey: string;
  emailFrom: string;
  emailFromName: string;
  emailNotifications: boolean;
  emailProviderHealth: string;

  sessionTimeout: string;
  passwordMinLength: string;
  passwordRequireSymbols: boolean;
  twoFactorRequired: boolean;
  ipWhitelist: string;
  maintenanceMode: boolean;
  auditRetentionDays: string;
  failedLoginLockout: string;

  backupFrequency: string;
  retentionPeriod: string;
  autoOptimize: boolean;
  tenantBackupPolicy: string;
  exportFormat: string;

  emailAlerts: boolean;
  smsAlerts: boolean;
  twilioAccountSid: string;
  twilioAuthToken: string;
  twilioFromNumber: string;
  inAppAlerts: boolean;
  webhookUrl: string;
  webhookSigningSecret: string;
  incidentDigestFrequency: string;

  ownerSeatLimit: string;
  defaultSchoolStatus: string;
  trialDays: string;
  autoProvisionModules: boolean;
  allowTenantSelfService: boolean;

  invoicePrefix: string;
  invoiceDueDays: string;
  taxLabel: string;
  taxRate: string;
  paymentGraceDays: string;
  autoSuspendOverdueTenants: boolean;

  subscriptionRenewalNoticeDays: string;
  allowPlanDowngrades: boolean;
  proratePlanChanges: boolean;
  enforceModuleEntitlements: boolean;

  dataResidencyRegion: string;
  privacyContactEmail: string;
  requireDpaAcceptance: boolean;
  studentDataExportApproval: boolean;
  anonymizeDeletedUsers: boolean;

  apiAccessEnabled: boolean;
  webhookSigningEnabled: boolean;
  allowedWebhookDomains: string;
  ssoProvider: string;
  ssoIssuerUrl: string;
  ssoClientId: string;
  ssoClientSecret: string;
  lmsIntegrationMode: string;
  lmsApiUrl: string;
  lmsApiKey: string;
  neonApiKey: string;
  neonProjectId: string;
  neonBranchId: string;

  defaultLanguage: string;
  dateFormat: string;
  timeFormat: string;
  firstDayOfWeek: string;

  automationEnabled: boolean;
  nightlyJobWindow: string;
  autoArchiveGraduatedStudents: boolean;
  autoNotifyInactiveTenants: boolean;
};

type SettingsResponse = {
  settings: Partial<SettingsState>;
  rawSettings?: Partial<SettingsState>;
  publicSettings: PublicPlatformSettings;
  platformHealth: {
    totalSchools: number;
    activeSchools: number;
    settingsCount: number;
    publicSettingCount: number;
  };
};

type IntegrationStatus = {
  providers?: Record<string, { ok: boolean; provider: string; status: string; message: string; checkedAt: string; data?: unknown }>;
};

const DEFAULT_SETTINGS: SettingsState = {
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

  smtpHost: "smtp.gmail.com",
  smtpPort: "587",
  smtpUsername: "",
  smtpPassword: "",
  resendApiKey: "",
  emailFrom: "noreply@roxan.com",
  emailFromName: "Roxan Education System",
  emailNotifications: true,
  emailProviderHealth: "monitor",

  sessionTimeout: "60",
  passwordMinLength: "8",
  passwordRequireSymbols: true,
  twoFactorRequired: false,
  ipWhitelist: "",
  maintenanceMode: false,
  auditRetentionDays: "365",
  failedLoginLockout: "5",

  backupFrequency: "daily",
  retentionPeriod: "30",
  autoOptimize: true,
  tenantBackupPolicy: "daily",
  exportFormat: "csv",

  emailAlerts: true,
  smsAlerts: false,
  twilioAccountSid: "",
  twilioAuthToken: "",
  twilioFromNumber: "",
  inAppAlerts: true,
  webhookUrl: "",
  webhookSigningSecret: "",
  incidentDigestFrequency: "daily",

  ownerSeatLimit: "2",
  defaultSchoolStatus: "active",
  trialDays: "14",
  autoProvisionModules: true,
  allowTenantSelfService: true,

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
};

const SECTIONS = [
  { id: "general", title: "General", description: "Branding and platform defaults", icon: Globe },
  { id: "email", title: "Email", description: "Transactional email infrastructure", icon: Mail },
  { id: "security", title: "Security", description: "Sessions, passwords, access policy", icon: Shield },
  { id: "database", title: "Database", description: "Backup, retention, exports", icon: Database },
  { id: "notifications", title: "Notifications", description: "Alerts and external webhooks", icon: Bell },
  { id: "tenants", title: "Tenants", description: "Provisioning defaults and limits", icon: Users },
  { id: "billing", title: "Billing", description: "Invoices, tax, grace periods", icon: Banknote },
  { id: "subscriptions", title: "Subscriptions", description: "Renewals and entitlements", icon: Sparkles },
  { id: "compliance", title: "Compliance", description: "Privacy and data governance", icon: FileCheck2 },
  { id: "integrations", title: "Integrations", description: "APIs, webhooks, SSO, LMS", icon: Network },
  { id: "localization", title: "Localization", description: "Language, date, time formats", icon: Languages },
  { id: "automation", title: "Automation", description: "Scheduled system workflows", icon: Workflow },
];

const SECTION_FIELDS: Record<string, Array<keyof SettingsState>> = {
  general: [
    "platformName",
    "platformShortName",
    "platformSubtitle",
    "supportEmail",
    "supportPhone",
    "companyAddress",
    "timezone",
    "currency",
    "announcementBanner",
    "tenantBrandingLock",
  ],
  email: ["smtpHost", "smtpPort", "smtpUsername", "smtpPassword", "resendApiKey", "emailFrom", "emailFromName", "emailNotifications", "emailProviderHealth"],
  security: [
    "sessionTimeout",
    "passwordMinLength",
    "passwordRequireSymbols",
    "twoFactorRequired",
    "ipWhitelist",
    "maintenanceMode",
    "auditRetentionDays",
    "failedLoginLockout",
  ],
  database: ["backupFrequency", "retentionPeriod", "autoOptimize", "tenantBackupPolicy", "exportFormat"],
  notifications: ["emailAlerts", "smsAlerts", "twilioAccountSid", "twilioAuthToken", "twilioFromNumber", "inAppAlerts", "webhookUrl", "webhookSigningSecret", "incidentDigestFrequency"],
  tenants: ["ownerSeatLimit", "defaultSchoolStatus", "trialDays", "autoProvisionModules", "allowTenantSelfService"],
  billing: ["invoicePrefix", "invoiceDueDays", "taxLabel", "taxRate", "paymentGraceDays", "autoSuspendOverdueTenants"],
  subscriptions: ["subscriptionRenewalNoticeDays", "allowPlanDowngrades", "proratePlanChanges", "enforceModuleEntitlements"],
  compliance: ["dataResidencyRegion", "privacyContactEmail", "requireDpaAcceptance", "studentDataExportApproval", "anonymizeDeletedUsers"],
  integrations: [
    "apiAccessEnabled",
    "webhookSigningEnabled",
    "allowedWebhookDomains",
    "ssoProvider",
    "ssoIssuerUrl",
    "ssoClientId",
    "ssoClientSecret",
    "lmsIntegrationMode",
    "lmsApiUrl",
    "lmsApiKey",
    "neonApiKey",
    "neonProjectId",
    "neonBranchId",
  ],
  localization: ["defaultLanguage", "dateFormat", "timeFormat", "firstDayOfWeek"],
  automation: ["automationEnabled", "nightlyJobWindow", "autoArchiveGraduatedStudents", "autoNotifyInactiveTenants"],
};

const SECTION_SCROLL_OFFSET = 132;
const SECRET_FIELDS = new Set<keyof SettingsState>([
  "smtpPassword",
  "resendApiKey",
  "twilioAccountSid",
  "twilioAuthToken",
  "webhookSigningSecret",
  "ssoClientSecret",
  "lmsApiKey",
  "neonApiKey",
]);

const INTEGRATION_ACTION_FIELDS: Record<string, Array<keyof SettingsState>> = {
  email_status: ["resendApiKey", "emailFrom", "emailFromName", "emailNotifications", "smtpHost", "smtpPort", "smtpUsername", "smtpPassword"],
  email_send: ["resendApiKey", "emailFrom", "emailFromName", "emailNotifications", "supportEmail"],
  sms_status: ["smsAlerts", "twilioAccountSid", "twilioAuthToken", "twilioFromNumber"],
  sms_send: ["smsAlerts", "twilioAccountSid", "twilioAuthToken", "twilioFromNumber", "supportPhone"],
  webhook: ["webhookUrl", "webhookSigningEnabled", "webhookSigningSecret", "allowedWebhookDomains"],
  sso: ["ssoProvider", "ssoIssuerUrl", "ssoClientId", "ssoClientSecret"],
  lms: ["lmsIntegrationMode", "lmsApiUrl", "lmsApiKey"],
  backup_schedule: ["backupFrequency", "retentionPeriod", "nightlyJobWindow", "neonApiKey", "neonProjectId", "neonBranchId"],
  backup_snapshot: ["retentionPeriod", "neonApiKey", "neonProjectId", "neonBranchId"],
};

function coerceSettings(input: Partial<SettingsState> = {}) {
  return {
    ...DEFAULT_SETTINGS,
    ...input,
    tenantBrandingLock: Boolean(input.tenantBrandingLock ?? DEFAULT_SETTINGS.tenantBrandingLock),
    emailNotifications: Boolean(input.emailNotifications ?? DEFAULT_SETTINGS.emailNotifications),
    passwordRequireSymbols: Boolean(input.passwordRequireSymbols ?? DEFAULT_SETTINGS.passwordRequireSymbols),
    twoFactorRequired: Boolean(input.twoFactorRequired ?? DEFAULT_SETTINGS.twoFactorRequired),
    maintenanceMode: Boolean(input.maintenanceMode ?? DEFAULT_SETTINGS.maintenanceMode),
    autoOptimize: Boolean(input.autoOptimize ?? DEFAULT_SETTINGS.autoOptimize),
    emailAlerts: Boolean(input.emailAlerts ?? DEFAULT_SETTINGS.emailAlerts),
    smsAlerts: Boolean(input.smsAlerts ?? DEFAULT_SETTINGS.smsAlerts),
    inAppAlerts: Boolean(input.inAppAlerts ?? DEFAULT_SETTINGS.inAppAlerts),
    autoProvisionModules: Boolean(input.autoProvisionModules ?? DEFAULT_SETTINGS.autoProvisionModules),
    allowTenantSelfService: Boolean(input.allowTenantSelfService ?? DEFAULT_SETTINGS.allowTenantSelfService),
    autoSuspendOverdueTenants: Boolean(input.autoSuspendOverdueTenants ?? DEFAULT_SETTINGS.autoSuspendOverdueTenants),
    allowPlanDowngrades: Boolean(input.allowPlanDowngrades ?? DEFAULT_SETTINGS.allowPlanDowngrades),
    proratePlanChanges: Boolean(input.proratePlanChanges ?? DEFAULT_SETTINGS.proratePlanChanges),
    enforceModuleEntitlements: Boolean(input.enforceModuleEntitlements ?? DEFAULT_SETTINGS.enforceModuleEntitlements),
    requireDpaAcceptance: Boolean(input.requireDpaAcceptance ?? DEFAULT_SETTINGS.requireDpaAcceptance),
    studentDataExportApproval: Boolean(input.studentDataExportApproval ?? DEFAULT_SETTINGS.studentDataExportApproval),
    anonymizeDeletedUsers: Boolean(input.anonymizeDeletedUsers ?? DEFAULT_SETTINGS.anonymizeDeletedUsers),
    apiAccessEnabled: Boolean(input.apiAccessEnabled ?? DEFAULT_SETTINGS.apiAccessEnabled),
    webhookSigningEnabled: Boolean(input.webhookSigningEnabled ?? DEFAULT_SETTINGS.webhookSigningEnabled),
    automationEnabled: Boolean(input.automationEnabled ?? DEFAULT_SETTINGS.automationEnabled),
    autoArchiveGraduatedStudents: Boolean(input.autoArchiveGraduatedStudents ?? DEFAULT_SETTINGS.autoArchiveGraduatedStudents),
    autoNotifyInactiveTenants: Boolean(input.autoNotifyInactiveTenants ?? DEFAULT_SETTINGS.autoNotifyInactiveTenants),
  };
}

function publicFromSettings(settings: SettingsState): PublicPlatformSettings {
  return {
    platformName: settings.platformName,
    platformShortName: settings.platformShortName,
    platformSubtitle: settings.platformSubtitle,
    supportEmail: settings.supportEmail,
    supportPhone: settings.supportPhone,
    timezone: settings.timezone,
    currency: settings.currency,
    maintenanceMode: settings.maintenanceMode,
    announcementBanner: settings.announcementBanner,
    tenantBrandingLock: settings.tenantBrandingLock,
    updatedAt: new Date().toISOString(),
  };
}

function changedKeys(current: SettingsState, saved: SettingsState) {
  return (Object.keys(current) as Array<keyof SettingsState>).filter((key) => current[key] !== saved[key]);
}

function pickSettingsFields(settings: SettingsState, fields: Array<keyof SettingsState>) {
  return fields.reduce((acc, field) => {
    acc[field] = settings[field] as never;
    return acc;
  }, {} as Partial<SettingsState>);
}

function statusTone(enabled: boolean) {
  return enabled
    ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
    : "border-muted bg-muted text-muted-foreground";
}

function SettingSwitch({
  label,
  description,
  checked,
  onCheckedChange,
  destructive = false,
}: {
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  destructive?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 rounded-2xl border bg-muted/35 p-4",
        destructive && checked && "border-destructive/30 bg-destructive/10"
      )}
    >
      <div className="space-y-1">
        <Label className={cn("text-base", destructive && checked && "text-destructive")}>{label}</Label>
        <p className={cn("text-sm text-muted-foreground", destructive && checked && "text-destructive/80")}>{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

export default function SettingsPage() {
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [activeSection, setActiveSection] = React.useState("general");
  const [settings, setSettings] = React.useState<SettingsState>(DEFAULT_SETTINGS);
  const [savedSettings, setSavedSettings] = React.useState<SettingsState>(DEFAULT_SETTINGS);
  const [health, setHealth] = React.useState<SettingsResponse["platformHealth"]>({
    totalSchools: 0,
    activeSchools: 0,
    settingsCount: 0,
    publicSettingCount: 0,
  });
  const [integrationStatus, setIntegrationStatus] = React.useState<IntegrationStatus>({});
  const [integrationBusy, setIntegrationBusy] = React.useState<string | null>(null);
  const scrollContainerRef = React.useRef<HTMLDivElement | null>(null);

  const dirtyKeys = React.useMemo(() => changedKeys(settings, savedSettings), [settings, savedSettings]);
  const dirty = dirtyKeys.length > 0;
  const activeSectionMeta = React.useMemo(
    () => SECTIONS.find((section) => section.id === activeSection) || SECTIONS[0],
    [activeSection]
  );
  const activeSectionDirtyKeys = React.useMemo(() => {
    const ownedFields = SECTION_FIELDS[activeSection] || [];
    return dirtyKeys.filter((key) => ownedFields.includes(key));
  }, [activeSection, dirtyKeys]);

  const setField = <K extends keyof SettingsState>(field: K, value: SettingsState[K]) => {
    setSettings((current) => ({ ...current, [field]: value }));
  };

  const loadIntegrationStatus = React.useCallback(async () => {
    try {
      const response = await fetch("/api/master/integrations/status", { cache: "no-store" });
      const data = (await response.json()) as IntegrationStatus & { error?: string };
      if (!response.ok) throw new Error(data.error || "Failed to load integration status");
      setIntegrationStatus(data);
    } catch (error) {
      console.error("Failed to load integration status:", error);
    }
  }, []);

  const loadSettings = React.useCallback(async (initial = false) => {
    if (initial) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }
    try {
      const response = await fetch("/api/master/settings", { cache: "no-store" });
      const data = (await response.json()) as SettingsResponse & { error?: string };
      if (!response.ok) throw new Error(data.error || "Failed to load settings");
      const next = coerceSettings(data.rawSettings || data.settings || {});
      setSettings(next);
      setSavedSettings(next);
      setHealth(data.platformHealth);
      publishPlatformSettings(data.publicSettings || publicFromSettings(next));
      const scheduleStatusLoad = () => void loadIntegrationStatus();
      if (typeof window !== "undefined" && "requestIdleCallback" in window) {
        window.requestIdleCallback(scheduleStatusLoad, { timeout: 2500 });
      } else {
        globalThis.setTimeout(scheduleStatusLoad, 250);
      }
    } catch (error) {
      console.error("Failed to fetch settings:", error);
      toast.error(error instanceof Error ? error.message : "Failed to load settings");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [loadIntegrationStatus]);

  React.useEffect(() => {
    void loadSettings(true);
  }, [loadSettings]);

  React.useEffect(() => {
    if (loading) return;
    const hashSection = window.location.hash.replace("#", "");
    if (hashSection && SECTIONS.some((section) => section.id === hashSection)) {
      setActiveSection(hashSection);
      return;
    }
  }, [loading]);

  React.useEffect(() => {
    if (loading || typeof window === "undefined") return;
    const nextUrl = `${window.location.pathname}#${activeSection}`;
    if (window.location.hash !== `#${activeSection}`) {
      window.history.replaceState(null, "", nextUrl);
    }
  }, [activeSection, loading]);

  const saveSettings = async (settingsToSave: Partial<SettingsState> = settings, label = "Settings") => {
    setSaving(true);
    try {
      const response = await fetch("/api/master/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: settingsToSave }),
      });
      const data = (await response.json()) as SettingsResponse & { error?: string; changedKeys?: string[] };
      if (!response.ok) throw new Error(data.error || "Failed to save settings");
      const next = coerceSettings(data.rawSettings || data.settings || settings);
      setSettings(next);
      setSavedSettings(next);
      publishPlatformSettings(data.publicSettings || publicFromSettings(next));
      toast.success(`${label} saved and synced${data.changedKeys?.length ? ` (${data.changedKeys.length} updates)` : ""}`);
      await loadIntegrationStatus();
      return true;
    } catch (error) {
      console.error("Save failed:", error);
      toast.error(error instanceof Error ? error.message : "Failed to save settings");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const saveActiveSection = () => {
    const fields = SECTION_FIELDS[activeSection] || [];
    const payload = fields.reduce((acc, field) => {
      acc[field] = settings[field] as never;
      return acc;
    }, {} as Partial<SettingsState>);
    return saveSettings(payload, activeSectionMeta.title);
  };

  const runIntegrationAction = async (type: string, payload: Record<string, unknown> = {}) => {
    setIntegrationBusy(type);
    try {
      const fields = INTEGRATION_ACTION_FIELDS[type] || [];
      const dirtyActionFields = fields.filter((field) => settings[field] !== savedSettings[field]);
      if (dirtyActionFields.length) {
        const saved = await saveSettings(pickSettingsFields(settings, fields), "Integration credentials");
        if (!saved) return;
      }
      const response = await fetch("/api/master/integrations/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, ...payload }),
      });
      const data = (await response.json()) as { ok?: boolean; message?: string; error?: string };
      if (!response.ok) throw new Error(data.message || data.error || "Integration action failed");
      toast.success(data.message || "Integration action completed");
      await loadIntegrationStatus();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Integration action failed");
    } finally {
      setIntegrationBusy(null);
    }
  };

  const runBackupAction = async (action: "snapshot" | "schedule") => {
    setIntegrationBusy(`backup_${action}`);
    try {
      const fields = INTEGRATION_ACTION_FIELDS[`backup_${action}`] || [];
      const dirtyActionFields = fields.filter((field) => settings[field] !== savedSettings[field]);
      if (dirtyActionFields.length) {
        const saved = await saveSettings(pickSettingsFields(settings, fields), "Backup credentials");
        if (!saved) return;
      }
      const response = await fetch("/api/master/backups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = (await response.json()) as { ok?: boolean; message?: string; error?: string };
      if (!response.ok) throw new Error(data.message || data.error || "Backup operation failed");
      toast.success(data.message || "Backup operation completed");
      await loadIntegrationStatus();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Backup operation failed");
    } finally {
      setIntegrationBusy(null);
    }
  };

  const discardChanges = () => {
    setSettings(savedSettings);
    toast.info("Unsaved changes discarded");
  };

  const scrollToSection = (id: string, historyMode: "push" | "replace" = "push") => {
    setActiveSection(id);
    const root = scrollContainerRef.current;
    const nextUrl = `${window.location.pathname}#${id}`;
    if (historyMode === "replace") {
      window.history.replaceState(null, "", nextUrl);
    } else {
      window.history.pushState(null, "", nextUrl);
    }
    root?.scrollTo({ top: 0, behavior: "auto" });
  };

  if (loading) {
    return (
      <div className="flex h-[520px] items-center justify-center">
        <div className="flex items-center gap-3 rounded-full border bg-card px-5 py-3 text-sm text-muted-foreground shadow-sm">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          Loading platform settings...
        </div>
      </div>
    );
  }

  const ActiveSectionIcon = activeSectionMeta.icon;

  return (
    <div className="mx-auto flex h-[calc(100vh-6rem)] max-w-7xl flex-col gap-5 overflow-hidden p-4 lg:p-6">
      <div className="shrink-0 border-b bg-background/80 pb-4 backdrop-blur-xl">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <ServerCog className="h-3.5 w-3.5" />
              Platform Control
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">System Settings</h1>
              <p className="text-muted-foreground">
                Global configuration for Roxan, tenant defaults, dashboard sync, security, backups, and communications.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Badge className={cn("rounded-full border", dirty ? "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300" : statusTone(true))}>
              {dirty ? `${dirtyKeys.length} unsaved changes` : "Synced"}
            </Badge>
            <Button variant="outline" className="gap-2 rounded-full" onClick={() => loadSettings(false)} disabled={saving || refreshing}>
              <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
              Refresh
            </Button>
            <Button variant="outline" className="gap-2 rounded-full" onClick={discardChanges} disabled={!dirty || saving}>
              <X className="h-4 w-4" />
              Discard
            </Button>
            <Button className="gap-2 rounded-full" onClick={() => saveSettings()} disabled={!dirty || saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save & Sync
            </Button>
          </div>
        </div>
      </div>

      {settings.maintenanceMode ? (
        <Alert variant="destructive" className="shrink-0">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Maintenance mode is enabled. Tenant dashboards should treat this as a global platform lockout state.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid shrink-0 gap-4 md:grid-cols-4">
        <Card className="border-border/70 bg-card/95">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Active Schools</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{health.activeSchools}</div>
            <p className="text-xs text-muted-foreground">of {health.totalSchools} provisioned tenants</p>
          </CardContent>
        </Card>
        <Card className="border-border/70 bg-card/95">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Settings Stored</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{health.settingsCount}</div>
            <p className="text-xs text-muted-foreground">persisted in master database</p>
          </CardContent>
        </Card>
        <Card className="border-border/70 bg-card/95">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Public Sync Keys</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{health.publicSettingCount}</div>
            <p className="text-xs text-muted-foreground">safe for tenant dashboard sync</p>
          </CardContent>
        </Card>
        <Card className="border-border/70 bg-card/95">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Provider Mode</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold capitalize">{settings.emailProviderHealth}</div>
            <p className="text-xs text-muted-foreground">email infrastructure monitoring</p>
          </CardContent>
        </Card>
      </div>

      <div className="shrink-0 overflow-x-auto pb-1 lg:hidden">
        <div className="flex min-w-max gap-2">
          {SECTIONS.map((section) => {
            const Icon = section.icon;
            return (
              <button
                key={section.id}
                type="button"
                onClick={() => scrollToSection(section.id)}
                aria-current={activeSection === section.id ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-medium transition-colors",
                  activeSection === section.id
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {section.title}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-8 overflow-hidden lg:flex-row">
        <aside className="hidden min-h-0 w-72 shrink-0 lg:block">
          <nav className="max-h-full space-y-2 overflow-y-auto pr-2">
            {SECTIONS.map((section) => {
              const Icon = section.icon;
              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => scrollToSection(section.id)}
                  aria-current={activeSection === section.id ? "page" : undefined}
                  title={section.description}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl border px-3 py-2 text-left text-sm transition-colors",
                    activeSection === section.id
                      ? "border-primary bg-primary text-primary-foreground shadow-sm"
                      : "border-transparent text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">{section.title}</span>
                    <span className={cn("block truncate text-[11px] leading-tight", activeSection === section.id ? "text-primary-foreground/80" : "text-muted-foreground")}>
                      {section.description}
                    </span>
                  </span>
                  {activeSection === section.id ? (
                    <span className="flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-primary-foreground" />
                      <ChevronRight className="h-4 w-4" />
                    </span>
                  ) : null}
                </button>
              );
            })}
          </nav>
        </aside>

        <div
          ref={scrollContainerRef}
          className="min-h-0 min-w-0 flex-1 space-y-10 overflow-y-auto pr-2"
        >
          <div className="sticky top-0 z-20 rounded-3xl border border-primary/15 bg-card/95 p-4 shadow-lg shadow-background/20 backdrop-blur-xl">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-primary/10 p-3 text-primary ring-1 ring-primary/15">
                  <ActiveSectionIcon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Now editing</p>
                  <h2 className="text-2xl font-semibold tracking-tight">{activeSectionMeta.title}</h2>
                  <p className="text-sm text-muted-foreground">{activeSectionMeta.description}</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="w-fit rounded-full border border-primary/20 bg-primary/10 text-primary">
                  /master/settings#{activeSectionMeta.id}
                </Badge>
                <Badge className={cn("w-fit rounded-full border", activeSectionDirtyKeys.length ? "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300" : statusTone(true))}>
                  {activeSectionDirtyKeys.length ? `${activeSectionDirtyKeys.length} unsaved` : "Section synced"}
                </Badge>
                <Button
                  size="sm"
                  className="rounded-full"
                  onClick={saveActiveSection}
                  disabled={!activeSectionDirtyKeys.length || saving}
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save this section
                </Button>
              </div>
            </div>
          </div>

          {activeSection === "general" ? (
          <section id="general" className="scroll-mt-40 space-y-5">
            <SectionHeading icon={Globe} title="General Configuration" description="Branding, support identity, default currency, and public dashboard sync." />
            <Card className="border-border/70 bg-card/95">
              <CardHeader>
                <CardTitle>Platform Identity</CardTitle>
                <CardDescription>These public-safe values sync to the super admin dashboard and tenant dashboard shells.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-3">
                  <Field label="Platform Name">
                    <Input value={settings.platformName} onChange={(event) => setField("platformName", event.target.value)} />
                  </Field>
                  <Field label="Sidebar Brand">
                    <Input value={settings.platformShortName} onChange={(event) => setField("platformShortName", event.target.value)} />
                  </Field>
                  <Field label="Super Admin Subtitle">
                    <Input value={settings.platformSubtitle} onChange={(event) => setField("platformSubtitle", event.target.value)} />
                  </Field>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Support Email">
                    <Input type="email" value={settings.supportEmail} onChange={(event) => setField("supportEmail", event.target.value)} />
                  </Field>
                  <Field label="Support Phone">
                    <Input value={settings.supportPhone} onChange={(event) => setField("supportPhone", event.target.value)} />
                  </Field>
                </div>
                <Field label="Physical Address">
                  <Textarea rows={3} value={settings.companyAddress} onChange={(event) => setField("companyAddress", event.target.value)} />
                </Field>
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="System Timezone">
                    <Select value={settings.timezone} onValueChange={(value) => setField("timezone", value)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Africa/Johannesburg">Africa/Johannesburg</SelectItem>
                        <SelectItem value="Africa/Kampala">Africa/Kampala</SelectItem>
                        <SelectItem value="UTC">UTC</SelectItem>
                        <SelectItem value="Europe/London">Europe/London</SelectItem>
                        <SelectItem value="Asia/Dubai">Asia/Dubai</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Default Currency">
                    <Select value={settings.currency} onValueChange={(value) => setField("currency", value)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ZAR">ZAR - South African Rand</SelectItem>
                        <SelectItem value="USD">USD - US Dollar</SelectItem>
                        <SelectItem value="UGX">UGX - Ugandan Shilling</SelectItem>
                        <SelectItem value="KES">KES - Kenyan Shilling</SelectItem>
                        <SelectItem value="NGN">NGN - Nigerian Naira</SelectItem>
                        <SelectItem value="GBP">GBP - British Pound</SelectItem>
                        <SelectItem value="EUR">EUR - Euro</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
                <Field label="Platform Announcement Banner">
                  <Textarea
                    rows={3}
                    value={settings.announcementBanner}
                    onChange={(event) => setField("announcementBanner", event.target.value)}
                    placeholder="Optional message shown across dashboards after future banner surfaces are enabled."
                  />
                </Field>
                <SettingSwitch
                  label="Lock Tenant Branding Overrides"
                  description="When enabled, tenant dashboards should prioritize platform branding defaults over custom school branding."
                  checked={settings.tenantBrandingLock}
                  onCheckedChange={(checked) => setField("tenantBrandingLock", checked)}
                />
              </CardContent>
            </Card>
          </section>
          ) : null}

          {activeSection === "email" ? (
          <section id="email" className="scroll-mt-40 space-y-5">
            <SectionHeading icon={Mail} title="Communications Infrastructure" description="SMTP configuration and transactional email behavior." />
            <Card className="border-border/70 bg-card/95">
              <CardHeader>
                <CardTitle>SMTP Service</CardTitle>
                <CardDescription>Secrets are stored in the master database but are never included in public dashboard sync payloads.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Hostname / Server">
                    <Input value={settings.smtpHost} onChange={(event) => setField("smtpHost", event.target.value)} />
                  </Field>
                  <Field label="Port">
                    <Input value={settings.smtpPort} onChange={(event) => setField("smtpPort", event.target.value)} />
                  </Field>
                  <Field label="Username">
                    <Input value={settings.smtpUsername} onChange={(event) => setField("smtpUsername", event.target.value)} />
                  </Field>
                  <Field label="Password / API Secret">
                    <Input
                      type="password"
                      value={settings.smtpPassword === "********" ? "" : settings.smtpPassword}
                      onChange={(event) => setField("smtpPassword", event.target.value)}
                      placeholder={settings.smtpPassword === "********" ? "Stored secret unchanged unless replaced" : "Enter SMTP secret"}
                    />
                  </Field>
                  <Field label="Resend API Key">
                    <Input
                      type="password"
                      value={settings.resendApiKey === "********" ? "" : settings.resendApiKey}
                      onChange={(event) => setField("resendApiKey", event.target.value)}
                      placeholder={settings.resendApiKey === "********" ? "Stored Resend key unchanged unless replaced" : "re_..."}
                    />
                  </Field>
                  <Field label="Default From Address">
                    <Input type="email" value={settings.emailFrom} onChange={(event) => setField("emailFrom", event.target.value)} />
                  </Field>
                  <Field label="Default From Name">
                    <Input value={settings.emailFromName} onChange={(event) => setField("emailFromName", event.target.value)} />
                  </Field>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Provider Health Mode">
                    <Select value={settings.emailProviderHealth} onValueChange={(value) => setField("emailProviderHealth", value)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monitor">Monitor only</SelectItem>
                        <SelectItem value="strict">Strict failures</SelectItem>
                        <SelectItem value="disabled">Disabled</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <SettingSwitch
                    label="System Email Notifications"
                    description="Allow automated status, invoice, onboarding, and security emails."
                    checked={settings.emailNotifications}
                    onCheckedChange={(checked) => setField("emailNotifications", checked)}
                  />
                </div>
                <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
                  <IntegrationProviderStatus provider={integrationStatus.providers?.email} />
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" className="rounded-full" onClick={() => runIntegrationAction("email_status")} disabled={integrationBusy === "email_status"}>
                      {integrationBusy === "email_status" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                      Check Email
                    </Button>
                    <Button className="rounded-full" onClick={() => runIntegrationAction("email_send", { to: settings.supportEmail })} disabled={integrationBusy === "email_send" || !settings.supportEmail}>
                      {integrationBusy === "email_send" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
                      Send Test
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>
          ) : null}

          {activeSection === "security" ? (
          <section id="security" className="scroll-mt-40 space-y-5">
            <SectionHeading icon={Shield} title="Security & Access Control" description="Password policy, session rules, lockouts, and maintenance mode." />
            <Card className="border-border/70 bg-card/95">
              <CardHeader>
                <CardTitle>System Policies</CardTitle>
                <CardDescription>These values become the platform defaults used by dashboard auth and tenant operations.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-4">
                  <Field label="Session Lifetime (minutes)">
                    <Input type="number" value={settings.sessionTimeout} onChange={(event) => setField("sessionTimeout", event.target.value)} />
                  </Field>
                  <Field label="Minimum Password Length">
                    <Input type="number" value={settings.passwordMinLength} onChange={(event) => setField("passwordMinLength", event.target.value)} />
                  </Field>
                  <Field label="Audit Retention (days)">
                    <Input type="number" value={settings.auditRetentionDays} onChange={(event) => setField("auditRetentionDays", event.target.value)} />
                  </Field>
                  <Field label="Failed Login Lockout">
                    <Input type="number" value={settings.failedLoginLockout} onChange={(event) => setField("failedLoginLockout", event.target.value)} />
                  </Field>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <SettingSwitch
                    label="Require Password Symbols"
                    description="Enforce at least one symbol in passwords created through platform flows."
                    checked={settings.passwordRequireSymbols}
                    onCheckedChange={(checked) => setField("passwordRequireSymbols", checked)}
                  />
                  <SettingSwitch
                    label="Require MFA for Platform Admins"
                    description="Require multi-factor authentication before accessing master controls."
                    checked={settings.twoFactorRequired}
                    onCheckedChange={(checked) => setField("twoFactorRequired", checked)}
                  />
                </div>
                <Field label="IP Whitelisting (CIDR)">
                  <Textarea
                    rows={3}
                    value={settings.ipWhitelist}
                    onChange={(event) => setField("ipWhitelist", event.target.value)}
                    placeholder="192.168.1.0/24, 10.0.0.1"
                  />
                </Field>
                <SettingSwitch
                  label="Maintenance Mode"
                  description="Broadcast a global maintenance state to all dashboards and tenant portals."
                  checked={settings.maintenanceMode}
                  onCheckedChange={(checked) => setField("maintenanceMode", checked)}
                  destructive
                />
              </CardContent>
            </Card>
          </section>
          ) : null}

          {activeSection === "database" ? (
          <section id="database" className="scroll-mt-40 space-y-5">
            <SectionHeading icon={Database} title="Data Persistence & Backups" description="Master and tenant backup defaults, retention, and exports." />
            <Card className="border-border/70 bg-card/95">
              <CardHeader>
                <CardTitle>Storage Management</CardTitle>
                <CardDescription>Control the platform defaults consumed by backup and reporting workflows.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-4">
                  <Field label="Master Backup Schedule">
                    <Select value={settings.backupFrequency} onValueChange={(value) => setField("backupFrequency", value)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hourly">Every hour</SelectItem>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Tenant Backup Policy">
                    <Select value={settings.tenantBackupPolicy} onValueChange={(value) => setField("tenantBackupPolicy", value)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hourly">Hourly</SelectItem>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Retention Period (days)">
                    <Input type="number" value={settings.retentionPeriod} onChange={(event) => setField("retentionPeriod", event.target.value)} />
                  </Field>
                  <Field label="Default Export Format">
                    <Select value={settings.exportFormat} onValueChange={(value) => setField("exportFormat", value)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="csv">CSV</SelectItem>
                        <SelectItem value="xlsx">Excel</SelectItem>
                        <SelectItem value="json">JSON</SelectItem>
                        <SelectItem value="pdf">PDF</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
                <SettingSwitch
                  label="Automatic Index Optimization"
                  description="Allow scheduled jobs to optimize indexes and run database maintenance tasks."
                  checked={settings.autoOptimize}
                  onCheckedChange={(checked) => setField("autoOptimize", checked)}
                />
                <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
                  <IntegrationProviderStatus provider={integrationStatus.providers?.backups} />
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" className="rounded-full" onClick={() => runBackupAction("schedule")} disabled={integrationBusy === "backup_schedule"}>
                      {integrationBusy === "backup_schedule" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                      Sync Schedule
                    </Button>
                    <Button className="rounded-full" onClick={() => runBackupAction("snapshot")} disabled={integrationBusy === "backup_snapshot"}>
                      {integrationBusy === "backup_snapshot" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Database className="mr-2 h-4 w-4" />}
                      Create Snapshot
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>
          ) : null}

          {activeSection === "notifications" ? (
          <section id="notifications" className="scroll-mt-40 space-y-5">
            <SectionHeading icon={Bell} title="Alerting & Connectivity" description="System alert channels, incident digests, and external webhooks." />
            <Card className="border-border/70 bg-card/95">
              <CardHeader>
                <CardTitle>Operational Alerts</CardTitle>
                <CardDescription>Configure how platform incidents reach administrators and external systems.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-3">
                  <SettingSwitch label="Email Alerts" description="Email admins for server failures, billing risks, and security events." checked={settings.emailAlerts} onCheckedChange={(checked) => setField("emailAlerts", checked)} />
                  <SettingSwitch label="SMS Security Alerts" description="Send emergency SMS alerts for critical security incidents." checked={settings.smsAlerts} onCheckedChange={(checked) => setField("smsAlerts", checked)} />
                  <SettingSwitch label="In-App Alerts" description="Create platform notifications for incidents and sync changes." checked={settings.inAppAlerts} onCheckedChange={(checked) => setField("inAppAlerts", checked)} />
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  <Field label="Twilio Account SID">
                    <Input
                      type="password"
                      value={settings.twilioAccountSid === "********" ? "" : settings.twilioAccountSid}
                      onChange={(event) => setField("twilioAccountSid", event.target.value)}
                      placeholder={settings.twilioAccountSid === "********" ? "Stored SID unchanged unless replaced" : "AC..."}
                    />
                  </Field>
                  <Field label="Twilio Auth Token">
                    <Input
                      type="password"
                      value={settings.twilioAuthToken === "********" ? "" : settings.twilioAuthToken}
                      onChange={(event) => setField("twilioAuthToken", event.target.value)}
                      placeholder={settings.twilioAuthToken === "********" ? "Stored token unchanged unless replaced" : "Auth token"}
                    />
                  </Field>
                  <Field label="Twilio From Number">
                    <Input value={settings.twilioFromNumber} onChange={(event) => setField("twilioFromNumber", event.target.value)} placeholder="+15551234567" />
                  </Field>
                </div>
                <div className="grid gap-4 md:grid-cols-[1fr_240px]">
                  <Field label="External Webhook URL">
                    <Input value={settings.webhookUrl} onChange={(event) => setField("webhookUrl", event.target.value)} placeholder="https://hooks.slack.com/services/..." />
                  </Field>
                  <Field label="Incident Digest">
                    <Select value={settings.incidentDigestFrequency} onValueChange={(value) => setField("incidentDigestFrequency", value)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="realtime">Realtime</SelectItem>
                        <SelectItem value="hourly">Hourly</SelectItem>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
                <Field label="Webhook Signing Secret">
                  <Input
                    type="password"
                    value={settings.webhookSigningSecret === "********" ? "" : settings.webhookSigningSecret}
                    onChange={(event) => setField("webhookSigningSecret", event.target.value)}
                    placeholder={settings.webhookSigningSecret === "********" ? "Stored signing secret unchanged unless replaced" : "Used for X-Roxan-Signature"}
                  />
                </Field>
                <div className="grid gap-4 lg:grid-cols-2">
                  <IntegrationProviderStatus provider={integrationStatus.providers?.sms} />
                  <div className="rounded-2xl border bg-muted/35 p-4">
                    <p className="text-sm font-semibold">Webhook Delivery</p>
                    <p className="text-sm text-muted-foreground">Send a signed test event to the configured webhook URL and enforce the allowed-domain list.</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button variant="outline" className="rounded-full" onClick={() => runIntegrationAction("sms_status")} disabled={integrationBusy === "sms_status"}>
                        {integrationBusy === "sms_status" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                        Check SMS
                      </Button>
                      <Button variant="outline" className="rounded-full" onClick={() => runIntegrationAction("sms_send", { to: settings.supportPhone })} disabled={integrationBusy === "sms_send" || !settings.supportPhone}>
                        {integrationBusy === "sms_send" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Bell className="mr-2 h-4 w-4" />}
                        Test SMS
                      </Button>
                      <Button className="rounded-full" onClick={() => runIntegrationAction("webhook")} disabled={integrationBusy === "webhook" || !settings.webhookUrl}>
                        {integrationBusy === "webhook" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Network className="mr-2 h-4 w-4" />}
                        Test Webhook
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>
          ) : null}

          {activeSection === "tenants" ? (
          <section id="tenants" className="scroll-mt-40 space-y-5">
            <SectionHeading icon={Users} title="Tenant Provisioning Defaults" description="Defaults used when schools are provisioned and users are created." />
            <Card className="border-border/70 bg-card/95">
              <CardHeader>
                <CardTitle>School Ecosystem Defaults</CardTitle>
                <CardDescription>These values are shared with provisioning flows and future tenant dashboard settings.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-3">
                  <Field label="Owner Seat Limit">
                    <Input type="number" value={settings.ownerSeatLimit} onChange={(event) => setField("ownerSeatLimit", event.target.value)} />
                  </Field>
                  <Field label="Default Trial Days">
                    <Input type="number" value={settings.trialDays} onChange={(event) => setField("trialDays", event.target.value)} />
                  </Field>
                  <Field label="New School Status">
                    <Select value={settings.defaultSchoolStatus} onValueChange={(value) => setField("defaultSchoolStatus", value)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="pending">Pending review</SelectItem>
                        <SelectItem value="trial">Trial</SelectItem>
                        <SelectItem value="suspended">Suspended</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <SettingSwitch
                    label="Auto-Provision Default Modules"
                    description="Automatically enable core SIS, academics, finance, communications, and system modules for new tenants."
                    checked={settings.autoProvisionModules}
                    onCheckedChange={(checked) => setField("autoProvisionModules", checked)}
                  />
                  <SettingSwitch
                    label="Tenant Self-Service Settings"
                    description="Allow school owners/admins to manage selected tenant-side settings without platform support."
                    checked={settings.allowTenantSelfService}
                    onCheckedChange={(checked) => setField("allowTenantSelfService", checked)}
                  />
                </div>
              </CardContent>
            </Card>
          </section>
          ) : null}

          {activeSection === "billing" ? (
          <section id="billing" className="scroll-mt-40 space-y-5">
            <SectionHeading icon={Banknote} title="Billing Operations" description="Invoice numbering, tax defaults, payment windows, and overdue handling." />
            <Card className="border-border/70 bg-card/95">
              <CardHeader>
                <CardTitle>Invoice & Payment Policy</CardTitle>
                <CardDescription>These defaults are consumed by platform billing and future tenant invoice flows.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-5">
                  <Field label="Invoice Prefix">
                    <Input value={settings.invoicePrefix} onChange={(event) => setField("invoicePrefix", event.target.value.toUpperCase())} />
                  </Field>
                  <Field label="Due Days">
                    <Input type="number" value={settings.invoiceDueDays} onChange={(event) => setField("invoiceDueDays", event.target.value)} />
                  </Field>
                  <Field label="Tax Label">
                    <Input value={settings.taxLabel} onChange={(event) => setField("taxLabel", event.target.value)} />
                  </Field>
                  <Field label="Tax Rate (%)">
                    <Input type="number" value={settings.taxRate} onChange={(event) => setField("taxRate", event.target.value)} />
                  </Field>
                  <Field label="Grace Days">
                    <Input type="number" value={settings.paymentGraceDays} onChange={(event) => setField("paymentGraceDays", event.target.value)} />
                  </Field>
                </div>
                <SettingSwitch
                  label="Auto-Suspend Overdue Tenants"
                  description="Automatically suspend tenant access after invoices exceed the configured grace period."
                  checked={settings.autoSuspendOverdueTenants}
                  onCheckedChange={(checked) => setField("autoSuspendOverdueTenants", checked)}
                  destructive
                />
              </CardContent>
            </Card>
          </section>
          ) : null}

          {activeSection === "subscriptions" ? (
          <section id="subscriptions" className="scroll-mt-40 space-y-5">
            <SectionHeading icon={Sparkles} title="Subscription Governance" description="Renewal notices, plan changes, proration, and module entitlement enforcement." />
            <Card className="border-border/70 bg-card/95">
              <CardHeader>
                <CardTitle>Plan Lifecycle Rules</CardTitle>
                <CardDescription>Control how plan changes and renewals affect schools across the platform.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <Field label="Renewal Notice Window (days)">
                  <Input className="max-w-xs" type="number" value={settings.subscriptionRenewalNoticeDays} onChange={(event) => setField("subscriptionRenewalNoticeDays", event.target.value)} />
                </Field>
                <div className="grid gap-4 md:grid-cols-3">
                  <SettingSwitch label="Allow Plan Downgrades" description="Permit schools to move to lower-tier plans when eligible." checked={settings.allowPlanDowngrades} onCheckedChange={(checked) => setField("allowPlanDowngrades", checked)} />
                  <SettingSwitch label="Prorate Plan Changes" description="Calculate prorated charges or credits for mid-cycle plan changes." checked={settings.proratePlanChanges} onCheckedChange={(checked) => setField("proratePlanChanges", checked)} />
                  <SettingSwitch label="Enforce Entitlements" description="Restrict module access based on the active subscription plan." checked={settings.enforceModuleEntitlements} onCheckedChange={(checked) => setField("enforceModuleEntitlements", checked)} />
                </div>
              </CardContent>
            </Card>
          </section>
          ) : null}

          {activeSection === "compliance" ? (
          <section id="compliance" className="scroll-mt-40 space-y-5">
            <SectionHeading icon={FileCheck2} title="Compliance & Privacy" description="Data residency, privacy contact, export approvals, and deletion policy." />
            <Card className="border-border/70 bg-card/95">
              <CardHeader>
                <CardTitle>Data Governance</CardTitle>
                <CardDescription>Platform defaults for privacy, regulatory posture, and sensitive education data controls.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Data Residency Region">
                    <Select value={settings.dataResidencyRegion} onValueChange={(value) => setField("dataResidencyRegion", value)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="africa">Africa</SelectItem>
                        <SelectItem value="eu">European Union</SelectItem>
                        <SelectItem value="uk">United Kingdom</SelectItem>
                        <SelectItem value="us">United States</SelectItem>
                        <SelectItem value="global">Global</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Privacy Contact Email">
                    <Input type="email" value={settings.privacyContactEmail} onChange={(event) => setField("privacyContactEmail", event.target.value)} />
                  </Field>
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  <SettingSwitch label="Require DPA Acceptance" description="Require owners to accept data processing terms during onboarding." checked={settings.requireDpaAcceptance} onCheckedChange={(checked) => setField("requireDpaAcceptance", checked)} />
                  <SettingSwitch label="Approve Student Exports" description="Require approval before exporting student records or guardian data." checked={settings.studentDataExportApproval} onCheckedChange={(checked) => setField("studentDataExportApproval", checked)} />
                  <SettingSwitch label="Anonymize Deleted Users" description="Replace personal identifiers when users are removed from the platform." checked={settings.anonymizeDeletedUsers} onCheckedChange={(checked) => setField("anonymizeDeletedUsers", checked)} />
                </div>
              </CardContent>
            </Card>
          </section>
          ) : null}

          {activeSection === "integrations" ? (
          <section id="integrations" className="scroll-mt-40 space-y-5">
            <SectionHeading icon={Network} title="Integrations & APIs" description="API access, webhook security, SSO, and learning system integration defaults." />
            <Card className="border-border/70 bg-card/95">
              <CardHeader>
                <CardTitle>External Connectivity</CardTitle>
                <CardDescription>Control how Roxan connects to approved external systems.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <SettingSwitch label="Platform API Access" description="Enable API access for approved partners and automation clients." checked={settings.apiAccessEnabled} onCheckedChange={(checked) => setField("apiAccessEnabled", checked)} />
                  <SettingSwitch label="Webhook Signing" description="Sign outbound webhooks so receivers can verify authenticity." checked={settings.webhookSigningEnabled} onCheckedChange={(checked) => setField("webhookSigningEnabled", checked)} />
                </div>
                <Field label="Allowed Webhook Domains">
                  <Textarea rows={3} value={settings.allowedWebhookDomains} onChange={(event) => setField("allowedWebhookDomains", event.target.value)} placeholder="example.com, hooks.slack.com" />
                </Field>
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="SSO Provider">
                    <Select value={settings.ssoProvider} onValueChange={(value) => setField("ssoProvider", value)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="disabled">Disabled</SelectItem>
                        <SelectItem value="saml">SAML</SelectItem>
                        <SelectItem value="oidc">OpenID Connect</SelectItem>
                        <SelectItem value="google-workspace">Google Workspace</SelectItem>
                        <SelectItem value="microsoft-entra">Microsoft Entra ID</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="LMS Integration Mode">
                    <Select value={settings.lmsIntegrationMode} onValueChange={(value) => setField("lmsIntegrationMode", value)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="disabled">Disabled</SelectItem>
                        <SelectItem value="lti">LTI</SelectItem>
                        <SelectItem value="moodle">Moodle</SelectItem>
                        <SelectItem value="canvas">Canvas</SelectItem>
                        <SelectItem value="google-classroom">Google Classroom</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
                <div className="rounded-2xl border bg-muted/25 p-4">
                  <div className="mb-4">
                    <p className="text-sm font-semibold">SSO OIDC Credentials</p>
                    <p className="text-sm text-muted-foreground">Used by `/api/auth/sso/start` and callback token exchange.</p>
                  </div>
                  <div className="grid gap-4 md:grid-cols-3">
                    <Field label="Issuer URL">
                      <Input value={settings.ssoIssuerUrl} onChange={(event) => setField("ssoIssuerUrl", event.target.value)} placeholder="https://accounts.example.com" />
                    </Field>
                    <Field label="Client ID">
                      <Input value={settings.ssoClientId} onChange={(event) => setField("ssoClientId", event.target.value)} />
                    </Field>
                    <Field label="Client Secret">
                      <Input
                        type="password"
                        value={settings.ssoClientSecret === "********" ? "" : settings.ssoClientSecret}
                        onChange={(event) => setField("ssoClientSecret", event.target.value)}
                        placeholder={settings.ssoClientSecret === "********" ? "Stored secret unchanged unless replaced" : "OIDC client secret"}
                      />
                    </Field>
                  </div>
                </div>
                <div className="rounded-2xl border bg-muted/25 p-4">
                  <div className="mb-4">
                    <p className="text-sm font-semibold">LMS API Credentials</p>
                    <p className="text-sm text-muted-foreground">Used to validate Moodle, Canvas, LTI, or classroom provider connectivity.</p>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="LMS API URL">
                      <Input value={settings.lmsApiUrl} onChange={(event) => setField("lmsApiUrl", event.target.value)} placeholder="https://lms.example.com/api" />
                    </Field>
                    <Field label="LMS API Key">
                      <Input
                        type="password"
                        value={settings.lmsApiKey === "********" ? "" : settings.lmsApiKey}
                        onChange={(event) => setField("lmsApiKey", event.target.value)}
                        placeholder={settings.lmsApiKey === "********" ? "Stored API key unchanged unless replaced" : "LMS API key"}
                      />
                    </Field>
                  </div>
                </div>
                <div className="rounded-2xl border bg-muted/25 p-4">
                  <div className="mb-4">
                    <p className="text-sm font-semibold">Neon Backup Credentials</p>
                    <p className="text-sm text-muted-foreground">Used for live snapshot creation and backup schedule synchronization.</p>
                  </div>
                  <div className="grid gap-4 md:grid-cols-3">
                    <Field label="Neon API Key">
                      <Input
                        type="password"
                        value={settings.neonApiKey === "********" ? "" : settings.neonApiKey}
                        onChange={(event) => setField("neonApiKey", event.target.value)}
                        placeholder={settings.neonApiKey === "********" ? "Stored API key unchanged unless replaced" : "napi_..."}
                      />
                    </Field>
                    <Field label="Neon Project ID">
                      <Input value={settings.neonProjectId} onChange={(event) => setField("neonProjectId", event.target.value)} placeholder="project-id" />
                    </Field>
                    <Field label="Neon Branch ID">
                      <Input value={settings.neonBranchId} onChange={(event) => setField("neonBranchId", event.target.value)} placeholder="branch-id" />
                    </Field>
                  </div>
                </div>
                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="space-y-3">
                    <IntegrationProviderStatus provider={integrationStatus.providers?.sso} />
                    <Button variant="outline" className="rounded-full" onClick={() => runIntegrationAction("sso")} disabled={integrationBusy === "sso"}>
                      {integrationBusy === "sso" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Shield className="mr-2 h-4 w-4" />}
                      Validate SSO Discovery
                    </Button>
                  </div>
                  <div className="space-y-3">
                    <IntegrationProviderStatus provider={integrationStatus.providers?.lms} />
                    <Button variant="outline" className="rounded-full" onClick={() => runIntegrationAction("lms")} disabled={integrationBusy === "lms"}>
                      {integrationBusy === "lms" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Network className="mr-2 h-4 w-4" />}
                      Check LMS Endpoint
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>
          ) : null}

          {activeSection === "localization" ? (
          <section id="localization" className="scroll-mt-40 space-y-5">
            <SectionHeading icon={Languages} title="Localization" description="Default language, date format, time format, and calendar behavior." />
            <Card className="border-border/70 bg-card/95">
              <CardHeader>
                <CardTitle>Regional Defaults</CardTitle>
                <CardDescription>These settings shape how new schools and dashboard surfaces format dates and time.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-4">
                <Field label="Default Language">
                  <Select value={settings.defaultLanguage} onValueChange={(value) => setField("defaultLanguage", value)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="fr">French</SelectItem>
                      <SelectItem value="sw">Swahili</SelectItem>
                      <SelectItem value="ar">Arabic</SelectItem>
                      <SelectItem value="pt">Portuguese</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Date Format">
                  <Select value={settings.dateFormat} onValueChange={(value) => setField("dateFormat", value)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dd MMM yyyy">03 Jun 2026</SelectItem>
                      <SelectItem value="MM/dd/yyyy">06/03/2026</SelectItem>
                      <SelectItem value="yyyy-MM-dd">2026-06-03</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Time Format">
                  <Select value={settings.timeFormat} onValueChange={(value) => setField("timeFormat", value)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="12h">12-hour</SelectItem>
                      <SelectItem value="24h">24-hour</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="First Day of Week">
                  <Select value={settings.firstDayOfWeek} onValueChange={(value) => setField("firstDayOfWeek", value)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monday">Monday</SelectItem>
                      <SelectItem value="sunday">Sunday</SelectItem>
                      <SelectItem value="saturday">Saturday</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </CardContent>
            </Card>
          </section>
          ) : null}

          {activeSection === "automation" ? (
          <section id="automation" className="scroll-mt-40 space-y-5">
            <SectionHeading icon={Workflow} title="System Automation" description="Scheduled automation, nightly windows, archival jobs, and tenant activity notifications." />
            <Card className="border-border/70 bg-card/95">
              <CardHeader>
                <CardTitle>Workflow Scheduler</CardTitle>
                <CardDescription>Configure platform-level jobs that run across schools and master operations.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-[1fr_260px]">
                  <SettingSwitch label="Enable Automation Jobs" description="Allow scheduled system jobs to run for billing, analytics, cleanup, and notifications." checked={settings.automationEnabled} onCheckedChange={(checked) => setField("automationEnabled", checked)} />
                  <Field label="Nightly Job Window">
                    <Input value={settings.nightlyJobWindow} onChange={(event) => setField("nightlyJobWindow", event.target.value)} placeholder="02:00-04:00" />
                  </Field>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <SettingSwitch label="Auto-Archive Graduated Students" description="Move graduated students to alumni/archive states during end-of-year automation." checked={settings.autoArchiveGraduatedStudents} onCheckedChange={(checked) => setField("autoArchiveGraduatedStudents", checked)} />
                  <SettingSwitch label="Notify Inactive Tenants" description="Notify owners when usage drops below the configured activity thresholds." checked={settings.autoNotifyInactiveTenants} onCheckedChange={(checked) => setField("autoNotifyInactiveTenants", checked)} />
                </div>
              </CardContent>
            </Card>
          </section>
          ) : null}

          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-primary/10 p-2 text-primary">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-semibold">Settings sync is live.</p>
                  <p className="text-sm text-muted-foreground">
                    Saving publishes a browser event, writes to local storage, sends a BroadcastChannel update, and persists to the master database.
                  </p>
                </div>
              </div>
              <Button className="gap-2 rounded-full" onClick={() => saveSettings()} disabled={!dirty || saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Save All Changes
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function SectionHeading({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="rounded-2xl bg-primary/10 p-2 text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function IntegrationProviderStatus({
  provider,
}: {
  provider?: { ok: boolean; provider: string; status: string; message: string; checkedAt: string };
}) {
  if (!provider) return null;
  return (
    <div className="rounded-2xl border bg-muted/35 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold capitalize">{provider.provider}</p>
          <p className="text-sm text-muted-foreground">{provider.message}</p>
        </div>
        <Badge className={cn("rounded-full border", provider.ok ? statusTone(true) : "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300")}>
          {provider.status.replace(/_/g, " ")}
        </Badge>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">Checked {new Date(provider.checkedAt).toLocaleString()}</p>
    </div>
  );
}
