"use client";

import * as React from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import {
  Bell,
  CalendarDays,
  CheckCircle2,
  Database,
  Download,
  Eye,
  GraduationCap,
  Laptop,
  LockKeyhole,
  Mail,
  MessageSquare,
  Moon,
  Palette,
  RefreshCw,
  Shield,
  Smartphone,
  Sun,
  User,
  Volume2,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { UniversalDashboardShell } from "@/components/shared/universal-dashboard-shell";
import { CityInput, CountrySelect, PhoneNumberField } from "@/components/shared/localized-fields";
import { authClient } from "@/lib/auth-client";

type NotificationSettings = {
  emailNotifications: boolean;
  smsNotifications: boolean;
  inAppNotifications: boolean;
  broadcastNotifications: boolean;
  paymentNotifications: boolean;
};

type UserPreferences = {
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  digestFrequency: string;
  dashboardDensity: string;
  defaultLandingPage: string;
  academicCalendarView: string;
  gradePrivacyMode: boolean;
  guardianVisibility: boolean;
  attendanceAlerts: boolean;
  financeApprovals: boolean;
  dataExportFormat: string;
  sessionTimeout: string;
  pushNotifications: boolean;
  whatsappNotifications: boolean;
  soundEffects: boolean;
  reducedMotion: boolean;
  highContrast: boolean;
  autoMarkMessagesRead: boolean;
  showOnlineStatus: boolean;
  twoStepPrompt: boolean;
  loginAlerts: boolean;
  trustedDeviceRememberDays: string;
  timezone: string;
  locale: string;
  phone: string;
  country: string;
  city: string;
};

const defaultSettings: NotificationSettings = {
  emailNotifications: true,
  smsNotifications: true,
  inAppNotifications: true,
  broadcastNotifications: true,
  paymentNotifications: true,
};

const defaultPreferences: UserPreferences = {
  quietHoursEnabled: false,
  quietHoursStart: "20:00",
  quietHoursEnd: "07:00",
  digestFrequency: "daily",
  dashboardDensity: "comfortable",
  defaultLandingPage: "dashboard",
  academicCalendarView: "week",
  gradePrivacyMode: false,
  guardianVisibility: true,
  attendanceAlerts: true,
  financeApprovals: true,
  dataExportFormat: "csv",
  sessionTimeout: "30",
  pushNotifications: true,
  whatsappNotifications: false,
  soundEffects: true,
  reducedMotion: false,
  highContrast: false,
  autoMarkMessagesRead: true,
  showOnlineStatus: true,
  twoStepPrompt: false,
  loginAlerts: true,
  trustedDeviceRememberDays: "30",
  timezone: "Africa/Kampala",
  locale: "en-UG",
  phone: "",
  country: "",
  city: "",
};

function initials(name?: string | null, email?: string | null) {
  const source = name || email || "User";
  return source
    .split(/[ @._-]/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function getScopedPath(target: "profile" | "settings") {
  if (typeof window === "undefined") return `/${target}`;
  const parts = window.location.pathname.split("/").filter(Boolean);
  if (parts[0] === "master") return `/master/${target}`;
  if (parts[1] === "owner") return `/${parts[0]}/owner/${target === "settings" ? "user-settings" : "profile"}`;
  if (parts.length > 1) return `/${parts[0]}/${parts[1]}/${target}`;
  return `/${target}`;
}

export function SettingsContent() {
  const { data: session, isPending } = authClient.useSession();
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [settings, setSettings] = React.useState<NotificationSettings>(defaultSettings);
  const [preferences, setPreferences] = React.useState<UserPreferences>(defaultPreferences);
  const [currentUser, setCurrentUser] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [lastSavedAt, setLastSavedAt] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const response = await fetch("/api/settings", { cache: "no-store" }).catch(() => null);
        if (!response?.ok) return;
        const data = await response.json().catch(() => ({}));
        if (cancelled) return;
        setSettings({ ...defaultSettings, ...(data.settings || {}) });
        setPreferences({ ...defaultPreferences, ...(data.preferences || {}) });
        setCurrentUser(data.currentUser || null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const user = session?.user || currentUser;
  const role = String((user as { role?: string } | undefined)?.role || "user").replace(/_/g, " ");
  const profilePath = getScopedPath("profile");

  const saveSettings = async (nextSettings = settings, nextPreferences = preferences) => {
    setSaving(true);
    const response = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...nextSettings, ...nextPreferences }),
    }).catch(() => null);
    setSaving(false);

    if (!response?.ok) {
      const data = await response?.json().catch(() => ({}));
      toast.error(data?.error || "Failed to save settings");
      return false;
    }

    const data = await response.json().catch(() => ({}));
    setSettings({ ...defaultSettings, ...(data.settings || nextSettings) });
    setPreferences({ ...defaultPreferences, ...(data.preferences || nextPreferences) });
    setLastSavedAt(new Date().toLocaleTimeString());
    toast.success("Settings saved");
    return true;
  };

  const resetDefaults = () => {
    setSettings(defaultSettings);
    setPreferences(defaultPreferences);
    toast.info("Defaults restored locally. Save to persist them.");
  };

  const exportSettings = () => {
    const payload = JSON.stringify({ settings, preferences, exportedAt: new Date().toISOString() }, null, 2);
    const url = URL.createObjectURL(new Blob([payload], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "user-settings.json";
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Settings export downloaded");
  };

  const testNotification = () => {
    toast.success("Test notification delivered using your current notification preferences");
  };

  const updateNotification = (key: keyof NotificationSettings, value: boolean) => {
    setSettings((current) => ({ ...current, [key]: value }));
  };

  const updatePreference = <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => {
    setPreferences((current) => ({ ...current, [key]: value }));
  };

  if ((isPending || loading) && !user) {
    return (
      <div className="flex min-h-[420px] items-center justify-center rounded-3xl border bg-card">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <RefreshCw className="size-5 animate-spin text-primary" />
          Loading user settings...
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <section className="overflow-hidden rounded-[2rem] border bg-gradient-to-br from-card via-card to-primary/10 shadow-sm">
        <div className="grid gap-5 p-5 lg:grid-cols-[1fr_auto] lg:p-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <Avatar className="size-20 border-4 border-background shadow-lg">
              <AvatarImage src={user?.image || undefined} />
              <AvatarFallback className="bg-primary text-2xl text-primary-foreground">{initials(user?.name, user?.email)}</AvatarFallback>
            </Avatar>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="capitalize">{role}</Badge>
                <Badge variant="outline" className="gap-1 border-emerald-500/30 bg-emerald-500/10 text-emerald-700">
                  <CheckCircle2 className="size-3" />
                  Synced account
                </Badge>
              </div>
              <h1 className="mt-3 text-3xl font-bold tracking-tight">User Settings</h1>
              <p className="mt-1 text-muted-foreground">Control personal notifications, appearance, privacy, dashboard defaults, and security behavior across tenant dashboards.</p>
            </div>
          </div>
          <div className="grid content-start gap-2 sm:grid-cols-2 lg:w-72 lg:grid-cols-1">
            <Button onClick={() => void saveSettings()} disabled={saving}>
              {saving ? <RefreshCw className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
              Save Settings
            </Button>
            <Button asChild variant="outline">
              <Link href={profilePath}>
                <User className="size-4" />
                Edit Profile
              </Link>
            </Button>
            <Button type="button" variant="outline" onClick={testNotification}>
              <Bell className="size-4" />
              Send Test Alert
            </Button>
            <Button type="button" variant="outline" onClick={exportSettings}>
              <Download className="size-4" />
              Export Settings
            </Button>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[20rem_minmax(0,1fr)]">
        <aside className="space-y-6">
          <Card className="border-foreground/15">
            <CardHeader>
              <h2 className="font-heading text-base font-semibold">Signed-in User</h2>
              <CardDescription>Current account context for these preferences.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="min-w-0">
                <p className="truncate font-medium">{user?.name || "User"}</p>
                <p className="truncate text-sm text-muted-foreground">{user?.email || "No email"}</p>
              </div>
              <Separator />
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Theme</span>
                  <span className="capitalize">{theme || resolvedTheme || "system"}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Density</span>
                  <span className="capitalize">{preferences.dashboardDensity}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Last saved</span>
                  <span>{lastSavedAt || "Not this session"}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-foreground/15">
            <CardHeader>
              <h2 className="font-heading text-base font-semibold">Settings Actions</h2>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button type="button" variant="outline" className="w-full justify-start" onClick={resetDefaults}>
                <RefreshCw className="size-4" />
                Restore Defaults
              </Button>
              <Button type="button" variant="outline" className="w-full justify-start" onClick={testNotification}>
                <Bell className="size-4" />
                Preview Alert
              </Button>
              <Button type="button" variant="outline" className="w-full justify-start" onClick={exportSettings}>
                <Database className="size-4" />
                Export JSON
              </Button>
            </CardContent>
          </Card>
        </aside>

        <main className="space-y-6">
          <Card className="border-foreground/15">
            <CardHeader>
              <h2 className="font-heading text-lg font-semibold">Appearance & Accessibility</h2>
              <CardDescription>Theme and interface defaults applied immediately in the browser.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  { value: "light", label: "Light", icon: Sun },
                  { value: "dark", label: "Dark", icon: Moon },
                  { value: "system", label: "System", icon: Laptop },
                ].map((option) => {
                  const Icon = option.icon;
                  return (
                    <Button key={option.value} type="button" variant={theme === option.value ? "default" : "outline"} className="justify-start" onClick={() => setTheme(option.value)}>
                      <Icon className="size-4" />
                      {option.label}
                    </Button>
                  );
                })}
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <SelectField label="Dashboard Density" value={preferences.dashboardDensity} onValueChange={(value) => updatePreference("dashboardDensity", value)} options={["compact", "comfortable", "spacious"]} icon={Palette} />
                <SelectField label="Locale" value={preferences.locale} onValueChange={(value) => updatePreference("locale", value)} options={["en-UG", "en-GH", "en-KE", "en-ZA", "en-US", "fr-FR"]} icon={LanguagesIcon} />
                <CountrySelect id="settings-country" label="Country" value={preferences.country} onChange={(value) => updatePreference("country", value)} />
                <CityInput id="settings-city" label="City / Town" value={preferences.city} country={preferences.country} onChange={(value) => updatePreference("city", value)} />
                <PhoneNumberField id="settings-phone" label="Preferred Phone" value={preferences.phone} country={preferences.country} onChange={(value) => updatePreference("phone", value)} className="md:col-span-2" />
              </div>
              <SwitchGrid
                items={[
                  { key: "soundEffects", label: "Sound effects", description: "Play sounds for calls, alerts, and sent messages.", icon: Volume2 },
                  { key: "reducedMotion", label: "Reduced motion", description: "Reduce non-essential transitions for accessibility.", icon: Eye },
                  { key: "highContrast", label: "High contrast", description: "Prefer stronger visual contrast where supported.", icon: Palette },
                ]}
                values={preferences}
                onChange={updatePreference}
              />
            </CardContent>
          </Card>

          <Card className="border-foreground/15">
            <CardHeader>
              <h2 className="font-heading text-lg font-semibold">Notification Delivery</h2>
              <CardDescription>Choose which channels can notify this user.</CardDescription>
            </CardHeader>
            <CardContent>
              <SwitchGrid
                items={[
                  { key: "inAppNotifications", label: "In-app notifications", description: "Show dashboard alerts and workflow updates.", icon: Bell },
                  { key: "emailNotifications", label: "Email notifications", description: "Send important account and workflow updates by email.", icon: Mail },
                  { key: "smsNotifications", label: "SMS notifications", description: "Allow SMS alerts where SMS providers are configured.", icon: Smartphone },
                  { key: "broadcastNotifications", label: "Broadcast notifications", description: "Receive announcements, memos, and broadcasts.", icon: MessageSquare },
                  { key: "paymentNotifications", label: "Payment notifications", description: "Receive billing, receipt, refund, and payment alerts.", icon: Wallet },
                ]}
                values={settings}
                onChange={updateNotification}
              />
            </CardContent>
          </Card>

          <Card className="border-foreground/15">
            <CardHeader>
              <h2 className="font-heading text-lg font-semibold">Workflow Preferences</h2>
              <CardDescription>Personal defaults for academic, messaging, and dashboard workflows.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <SwitchGrid
                items={[
                  { key: "attendanceAlerts", label: "Attendance alerts", description: "Notify me when attendance events need action.", icon: Bell },
                  { key: "guardianVisibility", label: "Guardian visibility", description: "Show guardian/child context where my role permits it.", icon: Eye },
                  { key: "gradePrivacyMode", label: "Grade privacy mode", description: "Mask sensitive grade data until interaction confirms intent.", icon: Shield },
                  { key: "financeApprovals", label: "Finance approval prompts", description: "Require confirmation before finance approvals and refunds.", icon: Wallet },
                  { key: "autoMarkMessagesRead", label: "Auto-mark messages read", description: "Mark chats as read when opened.", icon: MessageSquare },
                  { key: "showOnlineStatus", label: "Show online status", description: "Allow permitted users to see my active presence.", icon: User },
                ]}
                values={preferences}
                onChange={updatePreference}
              />
              <div className="grid gap-4 md:grid-cols-2">
                <SelectField label="Default Landing Page" value={preferences.defaultLandingPage} onValueChange={(value) => updatePreference("defaultLandingPage", value)} options={["dashboard", "messages", "calendar", "profile"]} icon={GraduationCap} />
                <SelectField label="Academic Calendar View" value={preferences.academicCalendarView} onValueChange={(value) => updatePreference("academicCalendarView", value)} options={["day", "week", "month", "term"]} icon={CalendarDays} />
                <SelectField label="Preferred Export Format" value={preferences.dataExportFormat} onValueChange={(value) => updatePreference("dataExportFormat", value)} options={["csv", "xlsx", "pdf", "json"]} icon={Database} />
                <SelectField label="Digest Frequency" value={preferences.digestFrequency} onValueChange={(value) => updatePreference("digestFrequency", value)} options={["instant", "daily", "weekly"]} icon={Mail} />
              </div>
            </CardContent>
          </Card>

          <Card className="border-foreground/15">
            <CardHeader>
              <h2 className="font-heading text-lg font-semibold">Quiet Hours & Security</h2>
              <CardDescription>Control interruptions, login visibility, and session defaults.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <SwitchGrid
                items={[
                  { key: "quietHoursEnabled", label: "Quiet hours", description: "Pause non-critical alerts during the selected window.", icon: Moon },
                  { key: "pushNotifications", label: "Push notifications", description: "Allow browser/app push alerts where enabled.", icon: Smartphone },
                  { key: "whatsappNotifications", label: "WhatsApp notifications", description: "Allow WhatsApp reminders where configured by the school.", icon: MessageSquare },
                  { key: "twoStepPrompt", label: "Two-step prompts", description: "Require stronger confirmation for sensitive account actions.", icon: LockKeyhole },
                  { key: "loginAlerts", label: "Login alerts", description: "Notify me when a new login is detected.", icon: Shield },
                ]}
                values={preferences}
                onChange={updatePreference}
              />
              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="quietHoursStart">Quiet Hours Start</Label>
                  <Input id="quietHoursStart" type="time" value={preferences.quietHoursStart} onChange={(event) => updatePreference("quietHoursStart", event.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="quietHoursEnd">Quiet Hours End</Label>
                  <Input id="quietHoursEnd" type="time" value={preferences.quietHoursEnd} onChange={(event) => updatePreference("quietHoursEnd", event.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="sessionTimeout">Session Timeout Minutes</Label>
                  <Input id="sessionTimeout" inputMode="numeric" value={preferences.sessionTimeout} onChange={(event) => updatePreference("sessionTimeout", event.target.value)} />
                </div>
                <SelectField label="Trusted Device Memory" value={preferences.trustedDeviceRememberDays} onValueChange={(value) => updatePreference("trustedDeviceRememberDays", value)} options={["0", "7", "30", "90"]} icon={LockKeyhole} />
                <div className="grid gap-2 md:col-span-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Input id="timezone" value={preferences.timezone} onChange={(event) => updatePreference("timezone", event.target.value)} />
                </div>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}

type SwitchGridProps<T extends Record<string, unknown>> = {
  items: Array<{
    key: keyof T & string;
    label: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
  }>;
  values: T;
  onChange: <K extends keyof T>(key: K, value: T[K]) => void;
};

function SwitchGrid<T extends Record<string, unknown>>({ items, values, onChange }: SwitchGridProps<T>) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <div key={item.key} className="flex items-center justify-between gap-4 rounded-2xl border bg-card p-4">
            <div className="flex min-w-0 gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted">
                <Icon className="size-5" />
              </span>
              <div>
                <Label className="font-medium">{item.label}</Label>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </div>
            </div>
            <Switch checked={Boolean(values[item.key])} onCheckedChange={(checked) => onChange(item.key, checked as T[keyof T])} />
          </div>
        );
      })}
    </div>
  );
}

function SelectField({
  label,
  value,
  onValueChange,
  options,
  icon: Icon,
}: {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  options: string[];
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger>
          <span className="flex items-center gap-2">
            <Icon className="size-4 text-muted-foreground" />
            <SelectValue />
          </span>
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option} value={option}>
              {option.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase())}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function LanguagesIcon({ className }: { className?: string }) {
  return <GraduationCap className={className} />;
}

export default function UniversalSettingsPage() {
  return (
    <UniversalDashboardShell>
      <SettingsContent />
    </UniversalDashboardShell>
  );
}
