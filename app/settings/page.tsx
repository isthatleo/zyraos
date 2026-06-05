"use client";

import * as React from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { Bell, CalendarDays, Database, Eye, GraduationCap, Laptop, Mail, MessageSquare, Moon, Shield, Smartphone, Sun, User, Wallet } from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { UniversalDashboardShell } from "@/components/shared/universal-dashboard-shell";
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
};

function initials(name?: string | null) {
  return (name || "User")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function SettingsContent() {
  const { data: session, isPending } = authClient.useSession();
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [settings, setSettings] = React.useState<NotificationSettings>(defaultSettings);
  const [preferences, setPreferences] = React.useState<UserPreferences>(defaultPreferences);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    void (async () => {
      const response = await fetch("/api/settings", { cache: "no-store" }).catch(() => null);
      if (!response?.ok) return;
      const data = await response.json();
      setSettings({ ...defaultSettings, ...(data.settings || {}) });
      setPreferences({ ...defaultPreferences, ...(data.preferences || {}) });
    })();
  }, []);

  const saveSettings = async (nextSettings = settings, nextPreferences = preferences) => {
    setSaving(true);
    const response = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...nextSettings, ...nextPreferences }),
    }).catch(() => null);
    setSaving(false);
    if (!response?.ok) {
      toast.error("Failed to save settings");
      return false;
    }
    toast.success("Settings saved");
    return true;
  };

  const updateNotificationSetting = async (key: keyof NotificationSettings, value: boolean) => {
    const next = { ...settings, [key]: value };
    setSettings(next);
    const saved = await saveSettings(next, preferences);
    if (!saved) {
      setSettings(settings);
    }
  };

  const updateUserPreference = async <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => {
    const next = { ...preferences, [key]: value };
    setPreferences(next);
    const saved = await saveSettings(settings, next);
    if (!saved) {
      setPreferences(preferences);
    }
  };

  const user = session?.user;
  const role = String((user as { role?: string } | undefined)?.role || "user").replace(/_/g, " ");

  return (
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Universal account controls</p>
            <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
            <p className="text-muted-foreground">Manage appearance, notification delivery, and account security across dashboards.</p>
          </div>
          <Button asChild>
            <Link href="/profile">
              <User className="size-4" />
              Edit Profile
            </Link>
          </Button>
        </div>

      <div className="grid gap-6 lg:grid-cols-[22rem_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Signed-in User</CardTitle>
            <CardDescription>Current authenticated account context.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isPending ? (
              <p className="text-sm text-muted-foreground">Loading session...</p>
            ) : user ? (
              <>
                <div className="flex items-center gap-3">
                  <Avatar className="size-14">
                    <AvatarImage src={user.image || undefined} />
                    <AvatarFallback>{initials(user.name)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate font-medium">{user.name || "User"}</p>
                    <p className="truncate text-sm text-muted-foreground">{user.email}</p>
                  </div>
                </div>
                <Separator />
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">Role</span>
                    <Badge className="capitalize" variant="secondary">{role}</Badge>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">User ID</span>
                    <span className="max-w-40 truncate font-mono text-xs">{user.id}</span>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No active session.</p>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Appearance</CardTitle>
              <CardDescription>Theme preference is applied immediately and stored locally by the browser.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-3">
              {[
                { value: "light", label: "Light", icon: Sun },
                { value: "dark", label: "Dark", icon: Moon },
                { value: "system", label: "System", icon: Laptop },
              ].map((option) => {
                const Icon = option.icon;
                return (
                  <Button
                    key={option.value}
                    type="button"
                    variant={(theme === option.value || resolvedTheme === option.value) ? "default" : "outline"}
                    className="justify-start"
                    onClick={() => setTheme(option.value)}
                  >
                    <Icon className="size-4" />
                    {option.label}
                  </Button>
                );
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Notifications</CardTitle>
              <CardDescription>These preferences are stored in the database for the signed-in user.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { key: "inAppNotifications", label: "In-app notifications", description: "Show operational alerts in the dashboard.", icon: Bell },
                { key: "emailNotifications", label: "Email notifications", description: "Send important account and workflow updates by email.", icon: Mail },
                { key: "smsNotifications", label: "SMS notifications", description: "Allow SMS alerts where SMS providers are configured.", icon: Smartphone },
                { key: "broadcastNotifications", label: "Broadcast notifications", description: "Receive announcements and broadcast updates.", icon: MessageSquare },
                { key: "paymentNotifications", label: "Payment notifications", description: "Receive billing, receipt, refund, and payment alerts.", icon: Wallet },
              ].map((item) => {
                const Icon = item.icon;
                const key = item.key as keyof NotificationSettings;
                return (
                  <div key={key} className="flex items-center justify-between gap-4 rounded-xl border p-4">
                    <div className="flex min-w-0 gap-3">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted">
                        <Icon className="size-5" />
                      </span>
                      <div>
                        <Label className="font-medium">{item.label}</Label>
                        <p className="text-sm text-muted-foreground">{item.description}</p>
                      </div>
                    </div>
                    <Switch
                      checked={settings[key]}
                      disabled={saving}
                      onCheckedChange={(checked) => void updateNotificationSetting(key, checked)}
                    />
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>School Workflow Preferences</CardTitle>
              <CardDescription>Personal defaults for education workflows, privacy, approvals, and dashboard behavior.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { key: "attendanceAlerts", label: "Attendance alerts", description: "Notify me when attendance events need action.", icon: Bell },
                { key: "guardianVisibility", label: "Guardian visibility", description: "Show linked guardian/child context where your role permits it.", icon: Eye },
                { key: "gradePrivacyMode", label: "Grade privacy mode", description: "Mask sensitive grade data until a page interaction confirms intent.", icon: Shield },
                { key: "financeApprovals", label: "Finance approval prompts", description: "Require confirmation before finance approvals and refund actions.", icon: Wallet },
                { key: "quietHoursEnabled", label: "Quiet hours", description: "Pause non-critical alerts during the time window below.", icon: Moon },
              ].map((item) => {
                const Icon = item.icon;
                const key = item.key as keyof UserPreferences;
                return (
                  <div key={item.key} className="flex items-center justify-between gap-4 rounded-xl border p-4">
                    <div className="flex min-w-0 gap-3">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted">
                        <Icon className="size-5" />
                      </span>
                      <div>
                        <Label className="font-medium">{item.label}</Label>
                        <p className="text-sm text-muted-foreground">{item.description}</p>
                      </div>
                    </div>
                    <Switch
                      checked={Boolean(preferences[key])}
                      disabled={saving}
                      onCheckedChange={(checked) => void updateUserPreference(key, checked as never)}
                    />
                  </div>
                );
              })}

              <div className="grid gap-4 rounded-xl border p-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="quietHoursStart">Quiet Hours Start</Label>
                  <Input id="quietHoursStart" type="time" value={preferences.quietHoursStart} onChange={(event) => void updateUserPreference("quietHoursStart", event.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="quietHoursEnd">Quiet Hours End</Label>
                  <Input id="quietHoursEnd" type="time" value={preferences.quietHoursEnd} onChange={(event) => void updateUserPreference("quietHoursEnd", event.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="digestFrequency">Digest Frequency</Label>
                  <Input id="digestFrequency" value={preferences.digestFrequency} onChange={(event) => void updateUserPreference("digestFrequency", event.target.value)} placeholder="instant, daily, weekly" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="sessionTimeout">Session Timeout Minutes</Label>
                  <Input id="sessionTimeout" inputMode="numeric" value={preferences.sessionTimeout} onChange={(event) => void updateUserPreference("sessionTimeout", event.target.value)} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Dashboard Defaults</CardTitle>
              <CardDescription>Set defaults used by future dashboard pages and reports.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              {[
                { key: "defaultLandingPage", label: "Default Landing Page", icon: GraduationCap, placeholder: "dashboard" },
                { key: "dashboardDensity", label: "Dashboard Density", icon: Eye, placeholder: "comfortable" },
                { key: "academicCalendarView", label: "Academic Calendar View", icon: CalendarDays, placeholder: "week" },
                { key: "dataExportFormat", label: "Preferred Export Format", icon: Database, placeholder: "csv" },
              ].map((item) => {
                const Icon = item.icon;
                const key = item.key as keyof UserPreferences;
                return (
                  <div key={item.key} className="grid gap-2">
                    <Label htmlFor={item.key}>{item.label}</Label>
                    <div className="relative">
                      <Icon className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                      <Input
                        id={item.key}
                        className="pl-9"
                        value={String(preferences[key] || "")}
                        placeholder={item.placeholder}
                        onChange={(event) => void updateUserPreference(key, event.target.value as never)}
                      />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Security</CardTitle>
              <CardDescription>Account security status and recommended controls.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              <div className="rounded-xl border p-4">
                <div className="flex items-center gap-2 font-medium">
                  <Shield className="size-4 text-primary" />
                  Password Authentication
                </div>
                <p className="mt-2 text-sm text-muted-foreground">Your account is authenticated through Better Auth email/password credentials.</p>
              </div>
              <div className="rounded-xl border p-4">
                <div className="flex items-center gap-2 font-medium">
                  <Bell className="size-4 text-primary" />
                  Session Alerts
                </div>
                <p className="mt-2 text-sm text-muted-foreground">Security event surfacing will use audit logs as dashboard implementation expands.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      </div>
  );
}

export default function UniversalSettingsPage() {
  return (
    <UniversalDashboardShell>
      <SettingsContent />
    </UniversalDashboardShell>
  );
}
