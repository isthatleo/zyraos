"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { AlertCircle, Bell, Building2, CalendarCheck, CheckCircle2, ClipboardList, Database, Download, FileText, GraduationCap, HeartPulse, History, Library, Lock, RefreshCw, RotateCcw, Save, Send, Shield, SlidersHorizontal, ServerCog } from "lucide-react";
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
import { CityInput, CountrySelect, CurrencySelect, PhoneNumberField } from "@/components/shared/localized-fields";
import { cn } from "@/lib/utils";

type Settings = Record<string, string | boolean | number | unknown[] | Record<string, unknown>>;
type Payload = {
  school: { name: string; slug: string; type: string; status: string; country?: string | null; currencyCode?: string | null };
  settings: Settings;
  sections: Array<{ id: string; title: string; description: string }>;
  backups: Array<{ id: string; createdAt: string | null; actorId: string; size: number; checksum?: string; providerStatus?: { ok?: boolean; provider?: string; status?: string; message?: string } | null }>;
  hardening?: { checks: Array<{ id: string; label: string; ok: boolean }>; passed: number; total: number };
  generatedAt: string;
};

const icons: Record<string, React.ElementType> = {
  profile: Building2,
  academic: GraduationCap,
  attendance: CalendarCheck,
  admissions: ClipboardList,
  reports: FileText,
  operations: SlidersHorizontal,
  communication: Bell,
  security: Shield,
};

function str(value: unknown) {
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

function bool(value: unknown) {
  return value === true;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-2"><Label>{label}</Label>{children}</div>;
}

function ToggleRow({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border p-4">
      <div><p className="font-semibold">{label}</p><p className="text-xs text-muted-foreground">{description}</p></div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

export default function AdminSettingsPage() {
  const params = useParams<{ tenant?: string }>();
  const tenant = params?.tenant || "";
  const [data, setData] = React.useState<Payload | null>(null);
  const [draft, setDraft] = React.useState<Settings>({});
  const [active, setActive] = React.useState("profile");
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [busy, setBusy] = React.useState("");
  const [error, setError] = React.useState("");
  const [providerStatus, setProviderStatus] = React.useState<{ ok?: boolean; provider?: string; status?: string; message?: string } | null>(null);

  const load = React.useCallback(async () => {
    if (!tenant) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/tenant/admin/settings?tenant=${encodeURIComponent(tenant)}`, { cache: "no-store", credentials: "include" });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || "Failed to load settings");
      setData(payload);
      setDraft(payload.settings || {});
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load settings";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [tenant]);

  React.useEffect(() => { void load(); }, [load]);

  function update(key: string, value: string | boolean | number) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  async function save() {
    setSaving(true);
    try {
      const response = await fetch(`/api/tenant/admin/settings?tenant=${encodeURIComponent(tenant)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ settings: draft }) });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || "Failed to save settings");
      setData(payload);
      setDraft(payload.settings || {});
      toast.success("Settings saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  async function action(name: "backup" | "reset") {
    if (name === "reset" && !window.confirm("Reset admin-editable settings to defaults?")) return;
    setBusy(name);
    try {
      const response = await fetch(`/api/tenant/admin/settings?tenant=${encodeURIComponent(tenant)}`, { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ action: name }) });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || "Settings action failed");
      setData(payload);
      setDraft(payload.settings || {});
      toast.success(name === "backup" ? "Settings backup created" : "Settings reset");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Settings action failed");
    } finally {
      setBusy("");
    }
  }

  async function restoreBackup(backupId: string) {
    if (!window.confirm("Restore this settings version? Current settings will be replaced.")) return;
    setBusy(`restore:${backupId}`);
    try {
      const response = await fetch(`/api/tenant/admin/settings?tenant=${encodeURIComponent(tenant)}`, { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ action: "restore_backup", backupId }) });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || "Backup restore failed");
      setData(payload);
      setDraft(payload.settings || {});
      toast.success("Settings restored");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Backup restore failed");
    } finally {
      setBusy("");
    }
  }

  async function backupProviderAction(name: "backup_status" | "execute_backup") {
    setBusy(name);
    try {
      const response = await fetch(`/api/tenant/admin/settings?tenant=${encodeURIComponent(tenant)}`, { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ action: name }) });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || "Backup provider action failed");
      setProviderStatus(payload.status || null);
      toast.success(payload.status?.message || "Backup provider action completed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Backup provider action failed");
    } finally {
      setBusy("");
    }
  }

  async function testCommunication() {
    setBusy("test_communication");
    try {
      const response = await fetch(`/api/tenant/admin/settings?tenant=${encodeURIComponent(tenant)}`, { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ action: "test_communication" }) });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || "Communication test failed");
      toast.success(`Test complete: email ${payload.email?.status || "unknown"}${payload.sms ? `, SMS ${payload.sms.status}` : ", SMS skipped"}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Communication test failed");
    } finally {
      setBusy("");
    }
  }

  function exportJson() {
    const blob = new Blob([JSON.stringify(draft, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${tenant}-admin-settings.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  if (loading) return <div className="space-y-6"><Skeleton className="h-44 rounded-3xl" /><div className="grid gap-4 md:grid-cols-5">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-3xl" />)}</div><Skeleton className="h-[560px] rounded-3xl" /></div>;

  if (error || !data) return <Alert variant="destructive" className="rounded-3xl"><AlertCircle className="h-4 w-4" /><AlertTitle>Settings unavailable</AlertTitle><AlertDescription className="mt-2 flex items-center justify-between gap-4"><span>{error || "No settings returned."}</span><Button variant="outline" onClick={() => void load()}>Retry</Button></AlertDescription></Alert>;

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-3xl border bg-card shadow-sm">
        <div className="bg-[radial-gradient(circle_at_top_left,rgba(249,115,22,0.16),transparent_34%),linear-gradient(135deg,hsl(var(--card)),hsl(var(--muted)/.55))] p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <Badge variant="outline" className="rounded-full">School admin settings</Badge>
              <h1 className="mt-3 text-3xl font-bold tracking-tight">Settings</h1>
              <p className="mt-2 max-w-3xl text-sm text-muted-foreground">Manage tenant-wide operational defaults for profile, academics, attendance, communications, security, and data controls.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => void load()}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>
              <Button variant="outline" onClick={exportJson}><Download className="mr-2 h-4 w-4" />Export</Button>
              <Button variant="outline" disabled={busy === "backup"} onClick={() => action("backup")}><Database className="mr-2 h-4 w-4" />Create Backup</Button>
              <Button variant="outline" disabled={busy === "reset"} onClick={() => action("reset")}><RotateCcw className="mr-2 h-4 w-4" />Reset</Button>
              <Button disabled={saving} onClick={save} className="bg-orange-600 text-white hover:bg-orange-700"><Save className={cn("mr-2 h-4 w-4", saving && "animate-pulse")} />{saving ? "Saving..." : "Save Settings"}</Button>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-5">
        {data.sections.map((section) => {
          const Icon = icons[section.id] || SlidersHorizontal;
          return (
            <button key={section.id} onClick={() => setActive(section.id)} className={cn("rounded-3xl border-2 p-4 text-left transition hover:border-orange-400", active === section.id ? "border-orange-500 bg-orange-500/10" : "border-border bg-card")}>
              <Icon className="mb-3 h-5 w-5 text-orange-500" />
              <p className="font-bold">{section.title}</p>
              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{section.description}</p>
            </button>
          );
        })}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatusCard icon={Building2} label="Identity" value={str(draft.schoolName) || "Not set"} detail={`Code: ${str(draft.schoolCode) || "missing"}`} ok={Boolean(str(draft.schoolName) && str(draft.schoolCode))} />
        <StatusCard icon={ClipboardList} label="Admissions" value={bool(draft.admissionsOpen) ? "Open" : "Closed"} detail={`Mode: ${str(draft.enrollmentApprovalMode).replace(/_/g, " ")}`} ok={bool(draft.admissionsOpen)} />
        <StatusCard icon={Bell} label="Notifications" value={bool(draft.notifyParentsEmail) || bool(draft.notifyParentsSms) ? "Enabled" : "Limited"} detail={`Parents: ${bool(draft.notifyParentsEmail) ? "email" : ""}${bool(draft.notifyParentsSms) ? " SMS" : ""}`.trim()} ok={bool(draft.notifyParentsEmail) || bool(draft.notifyParentsSms)} />
        <StatusCard icon={Shield} label="Security" value={bool(draft.mfaRequiredForAdmins) ? "MFA required" : "MFA optional"} detail={`${str(draft.sessionTimeoutMinutes)} min sessions`} ok={Number(str(draft.sessionTimeoutMinutes)) >= 15} />
      </div>

      <Card className="border-2">
        <CardContent className="grid gap-4 p-5 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="rounded-full bg-orange-600 text-white">Production hardening</Badge>
              <Badge variant="outline" className="rounded-full">{data.hardening?.passed || 0}/{data.hardening?.total || 0} checks passing</Badge>
            </div>
            <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              {(data.hardening?.checks || []).map((check) => (
                <div key={check.id} className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className={cn("h-4 w-4", check.ok ? "text-emerald-600" : "text-muted-foreground")} />
                  <span className={check.ok ? "font-medium" : "text-muted-foreground"}>{check.label}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border bg-muted/30 p-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2 font-semibold text-foreground"><Lock className="h-4 w-4 text-orange-600" /> Permission boundary</div>
            <p className="mt-1 max-w-sm">Security, backup, reset, and restore controls are tenant-owner only. School admins can manage operational defaults.</p>
          </div>
        </CardContent>
      </Card>

      {active === "profile" ? (
        <div className="grid gap-5">
          <SettingsCard title="Basic Information" description="School identity and public contact records.">
            <Field label="School name"><Input value={str(draft.schoolName)} onChange={(e) => update("schoolName", e.target.value)} /></Field>
            <Field label="Short name"><Input value={str(draft.schoolShortName)} onChange={(e) => update("schoolShortName", e.target.value)} /></Field>
            <Field label="School code"><Input value={str(draft.schoolCode)} onChange={(e) => update("schoolCode", e.target.value.toUpperCase())} /></Field>
            <Field label="Registration number"><Input value={str(draft.registrationNumber)} onChange={(e) => update("registrationNumber", e.target.value)} /></Field>
            <Field label="Email"><Input type="email" value={str(draft.email)} onChange={(e) => update("email", e.target.value)} /></Field>
            <PhoneNumberField label="Phone" value={str(draft.phone)} country={str(draft.country)} onChange={(value) => update("phone", value)} />
            <Field label="Motto"><Input value={str(draft.motto)} onChange={(e) => update("motto", e.target.value)} /></Field>
            <Field label="Website"><Input value={str(draft.website)} onChange={(e) => update("website", e.target.value)} /></Field>
            <div className="md:col-span-2"><Field label="Description"><Textarea value={str(draft.schoolDescription)} onChange={(e) => update("schoolDescription", e.target.value)} /></Field></div>
          </SettingsCard>
          <SettingsCard title="Location & Regional Preferences" description="Country, city, timezone, and currency used by the tenant.">
            <CountrySelect label="Country" value={str(draft.country)} onChange={(value, option) => { update("country", value); if (option.currencyCode) update("currency", option.currencyCode); }} />
            <CityInput label="City / town" value={str(draft.city)} country={str(draft.country)} onChange={(value) => update("city", value)} />
            <Field label="State / Province"><Input value={str(draft.stateProvince)} onChange={(e) => update("stateProvince", e.target.value)} /></Field>
            <Field label="District"><Input value={str(draft.district)} onChange={(e) => update("district", e.target.value)} /></Field>
            <CurrencySelect label="Currency" value={str(draft.currency)} onChange={(value) => update("currency", value)} />
            <Field label="Timezone"><Input value={str(draft.timezone)} onChange={(e) => update("timezone", e.target.value)} /></Field>
            <div className="md:col-span-2"><Field label="Physical address"><Textarea value={str(draft.address)} onChange={(e) => update("address", e.target.value)} /></Field></div>
          </SettingsCard>
        </div>
      ) : null}

      {active === "academic" ? (
        <SettingsCard title="Academic Defaults" description="Defaults used by admissions, classes, reports, and promotion workflows.">
          <Field label="Academic year"><Input value={str(draft.academicYear)} onChange={(e) => update("academicYear", e.target.value)} /></Field>
          <Field label="Current term"><Input value={str(draft.currentTerm)} onChange={(e) => update("currentTerm", e.target.value)} /></Field>
          <Field label="Curriculum type"><Select value={str(draft.curriculumType)} onValueChange={(v) => update("curriculumType", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="National Curriculum">National Curriculum</SelectItem><SelectItem value="British">British</SelectItem><SelectItem value="Cambridge IGCSE">Cambridge IGCSE</SelectItem><SelectItem value="International Baccalaureate">International Baccalaureate</SelectItem><SelectItem value="American">American</SelectItem><SelectItem value="Hybrid">Hybrid</SelectItem></SelectContent></Select></Field>
          <Field label="Academic year format"><Select value={str(draft.academicYearFormat)} onValueChange={(v) => update("academicYearFormat", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="September - July">September - July</SelectItem><SelectItem value="January - December">January - December</SelectItem><SelectItem value="August - June">August - June</SelectItem><SelectItem value="Custom">Custom</SelectItem></SelectContent></Select></Field>
          <Field label="Term system"><Select value={str(draft.termSystem)} onValueChange={(v) => update("termSystem", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="trimester">Trimester</SelectItem><SelectItem value="semester">Semester</SelectItem><SelectItem value="quarterly">Quarterly</SelectItem></SelectContent></Select></Field>
          <Field label="Grading scale"><Select value={str(draft.gradingScale)} onValueChange={(v) => update("gradingScale", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="percentage">Percentage</SelectItem><SelectItem value="letter">Letter grades</SelectItem><SelectItem value="points">Points</SelectItem></SelectContent></Select></Field>
          <Field label="Pass mark (%)"><Input value={str(draft.passMark)} onChange={(e) => update("passMark", e.target.value.replace(/[^\d.]/g, ""))} /></Field>
        </SettingsCard>
      ) : null}

      {active === "attendance" ? (
        <SettingsCard title="Attendance Policy" description="Attendance defaults used by registers, dashboards, and promotion checks.">
          <Field label="Attendance mode"><Select value={str(draft.attendanceMode)} onValueChange={(v) => update("attendanceMode", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="daily">Daily</SelectItem><SelectItem value="per_lesson">Per lesson</SelectItem><SelectItem value="qr">QR code</SelectItem><SelectItem value="biometric">Biometric/RFID</SelectItem></SelectContent></Select></Field>
          <Field label="Late threshold minutes"><Input value={str(draft.lateThresholdMinutes)} onChange={(e) => update("lateThresholdMinutes", e.target.value.replace(/\D/g, ""))} /></Field>
          <Field label="Minimum attendance for promotion (%)"><Input value={str(draft.minimumAttendanceForPromotion)} onChange={(e) => update("minimumAttendanceForPromotion", e.target.value.replace(/[^\d.]/g, ""))} /></Field>
          <div className="md:col-span-2"><Field label="Late policy"><Textarea value={str(draft.latePolicy)} onChange={(e) => update("latePolicy", e.target.value)} /></Field></div>
          <ToggleRow label="Attendance alerts" description="Surface attendance warnings to dashboards." checked={bool(draft.attendanceAlertsEnabled)} onChange={(v) => update("attendanceAlertsEnabled", v)} />
          <ToggleRow label="Auto notify parents" description="Send parent notifications for configured attendance events." checked={bool(draft.autoNotifyParentsOnAttendance)} onChange={(v) => update("autoNotifyParentsOnAttendance", v)} />
        </SettingsCard>
      ) : null}

      {active === "admissions" ? (
        <div className="grid gap-5">
          <SettingsCard title="Enrollment Controls" description="Control application intake, numbering, admission approval, and capacity checks.">
            <ToggleRow label="Admissions open" description="Allow new applications and enrollment records." checked={bool(draft.admissionsOpen)} onChange={(v) => update("admissionsOpen", v)} />
            <ToggleRow label="Auto-generate admission numbers" description="Use school code and running sequence for admission IDs." checked={bool(draft.autoGenerateAdmissionNumbers)} onChange={(v) => update("autoGenerateAdmissionNumbers", v)} />
            <ToggleRow label="Enforce class capacity" description="Block enrollment into full classes." checked={bool(draft.admissionCapacityEnforcement)} onChange={(v) => update("admissionCapacityEnforcement", v)} />
            <Field label="Application prefix"><Input value={str(draft.admissionPrefix)} onChange={(e) => update("admissionPrefix", e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ""))} /></Field>
            <Field label="Approval mode"><Select value={str(draft.enrollmentApprovalMode)} onValueChange={(v) => update("enrollmentApprovalMode", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="admin_review">Admin review</SelectItem><SelectItem value="auto_accept">Auto accept</SelectItem><SelectItem value="interview_required">Interview required</SelectItem><SelectItem value="payment_required">Payment required</SelectItem></SelectContent></Select></Field>
          </SettingsCard>
          <SettingsCard title="Required Admission Data" description="Define minimum documents and guardian requirements before enrollment.">
            <ToggleRow label="Guardian required" description="Require parent/guardian details for every admission." checked={bool(draft.requireGuardianForAdmission)} onChange={(v) => update("requireGuardianForAdmission", v)} />
            <ToggleRow label="Birth certificate required" description="Require birth certificate upload or URL." checked={bool(draft.requireBirthCertificate)} onChange={(v) => update("requireBirthCertificate", v)} />
            <ToggleRow label="Previous results required" description="Require previous school academic results for transfers." checked={bool(draft.requirePreviousResults)} onChange={(v) => update("requirePreviousResults", v)} />
          </SettingsCard>
        </div>
      ) : null}

      {active === "reports" ? (
        <SettingsCard title="Reports & Results" description="Controls used by exams, report cards, result publication, and parent notifications.">
          <Field label="Report card format"><Select value={str(draft.reportCardFormat)} onValueChange={(v) => update("reportCardFormat", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="standard">Standard</SelectItem><SelectItem value="compact">Compact</SelectItem><SelectItem value="detailed">Detailed</SelectItem><SelectItem value="competency">Competency based</SelectItem></SelectContent></Select></Field>
          <ToggleRow label="Show position on reports" description="Show class/grade rank on report cards." checked={bool(draft.showPositionOnReports)} onChange={(v) => update("showPositionOnReports", v)} />
          <ToggleRow label="Lock published results" description="Prevent edits after result publication." checked={bool(draft.lockPublishedResults)} onChange={(v) => update("lockPublishedResults", v)} />
          <ToggleRow label="Require admin approval" description="Require school admin approval before publishing results." checked={bool(draft.requireAdminApprovalForResults)} onChange={(v) => update("requireAdminApprovalForResults", v)} />
          <ToggleRow label="Notify parents on results" description="Send result publication notifications to parents." checked={bool(draft.notifyParentsOnResults)} onChange={(v) => update("notifyParentsOnResults", v)} />
        </SettingsCard>
      ) : null}

      {active === "operations" ? (
        <div className="grid gap-5">
          <SettingsCard title="Operational Defaults" description="Library, health, visitors, exports, and maintenance controls.">
            <Field label="Library loan limit"><Input value={str(draft.libraryLoanLimit)} onChange={(e) => update("libraryLoanLimit", e.target.value.replace(/\D/g, ""))} /></Field>
            <Field label="Library loan days"><Input value={str(draft.libraryLoanDays)} onChange={(e) => update("libraryLoanDays", e.target.value.replace(/\D/g, ""))} /></Field>
            <Field label="Export format"><Select value={str(draft.exportFormat)} onValueChange={(v) => update("exportFormat", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="xlsx">Excel (.xlsx)</SelectItem><SelectItem value="csv">CSV</SelectItem><SelectItem value="pdf">PDF</SelectItem><SelectItem value="json">JSON</SelectItem></SelectContent></Select></Field>
            <Field label="Maintenance window"><Input value={str(draft.maintenanceWindow)} onChange={(e) => update("maintenanceWindow", e.target.value)} /></Field>
            <ToggleRow label="Health alert escalation" description="Escalate urgent health alerts to admins." checked={bool(draft.healthAlertEscalation)} onChange={(v) => update("healthAlertEscalation", v)} />
            <ToggleRow label="Visitor log required" description="Require visitor logging in school operations." checked={bool(draft.visitorLogRequired)} onChange={(v) => update("visitorLogRequired", v)} />
          </SettingsCard>
          <div className="grid gap-4 md:grid-cols-3">
            <MiniPolicy icon={Library} title="Library" value={`${str(draft.libraryLoanLimit)} books · ${str(draft.libraryLoanDays)} days`} />
            <MiniPolicy icon={HeartPulse} title="Health" value={bool(draft.healthAlertEscalation) ? "Escalation enabled" : "Escalation disabled"} />
            <MiniPolicy icon={Database} title="Exports" value={str(draft.exportFormat).toUpperCase()} />
          </div>
        </div>
      ) : null}

      {active === "communication" ? (
        <SettingsCard title="Communication Defaults" description="Default notification channels and provider switches.">
          <div className="md:col-span-2 xl:col-span-3 flex flex-wrap items-center justify-between gap-3 rounded-3xl border bg-muted/30 p-4">
            <div><p className="font-bold">Provider health test</p><p className="text-xs text-muted-foreground">Sends a real test through configured platform email/SMS providers using this tenant's contact settings.</p></div>
            <Button variant="outline" disabled={busy === "test_communication"} onClick={testCommunication}><Send className={cn("mr-2 h-4 w-4", busy === "test_communication" && "animate-pulse")} />Run Test</Button>
          </div>
          <ToggleRow label="Parent email notifications" description="Use email for parent notices." checked={bool(draft.notifyParentsEmail)} onChange={(v) => update("notifyParentsEmail", v)} />
          <ToggleRow label="Parent SMS notifications" description="Use SMS for parent notices." checked={bool(draft.notifyParentsSms)} onChange={(v) => update("notifyParentsSms", v)} />
          <ToggleRow label="Teacher email notifications" description="Use email for teacher notices." checked={bool(draft.notifyTeachersEmail)} onChange={(v) => update("notifyTeachersEmail", v)} />
          <ToggleRow label="Teacher SMS notifications" description="Use SMS for teacher notices." checked={bool(draft.notifyTeachersSms)} onChange={(v) => update("notifyTeachersSms", v)} />
          <ToggleRow label="SMTP enabled" description="Enable configured SMTP provider." checked={bool(draft.smtpEnabled)} onChange={(v) => update("smtpEnabled", v)} />
          <ToggleRow label="Twilio SMS enabled" description="Enable configured Twilio SMS provider." checked={bool(draft.smsTwilioEnabled)} onChange={(v) => update("smsTwilioEnabled", v)} />
        </SettingsCard>
      ) : null}

      {active === "security" ? (
        <div className="grid gap-5">
          <SettingsCard title="Security & Data Controls" description="Admin access and data retention controls.">
            <ToggleRow label="Require MFA for admins" description="Require multi-factor authentication for owner and school admin roles." checked={bool(draft.mfaRequiredForAdmins)} onChange={(v) => update("mfaRequiredForAdmins", v)} />
            <ToggleRow label="Data export enabled" description="Allow authorized data exports from dashboards." checked={bool(draft.dataExportEnabled)} onChange={(v) => update("dataExportEnabled", v)} />
            <Field label="Session timeout minutes"><Input value={str(draft.sessionTimeoutMinutes)} onChange={(e) => update("sessionTimeoutMinutes", e.target.value.replace(/\D/g, ""))} /></Field>
            <Field label="Audit retention days"><Input value={str(draft.auditRetentionDays)} onChange={(e) => update("auditRetentionDays", e.target.value.replace(/\D/g, ""))} /></Field>
            <Field label="Backup schedule"><Select value={str(draft.backupSchedule)} onValueChange={(v) => update("backupSchedule", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="daily">Daily</SelectItem><SelectItem value="weekly">Weekly</SelectItem><SelectItem value="monthly">Monthly</SelectItem><SelectItem value="manual">Manual only</SelectItem></SelectContent></Select></Field>
            <Field label="Backup provider"><Select value={str(draft.backupProvider)} onValueChange={(v) => update("backupProvider", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="local">Local version history</SelectItem><SelectItem value="neon">Neon database snapshots</SelectItem><SelectItem value="s3">AWS S3</SelectItem><SelectItem value="gcs">Google Cloud</SelectItem><SelectItem value="azure">Azure Blob</SelectItem></SelectContent></Select></Field>
          </SettingsCard>
          <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
            <Card className="border-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><History className="h-5 w-5 text-orange-600" /> Version History & Rollback</CardTitle>
                <CardDescription>Restore a previous settings version with tenant audit logging.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.backups.length ? data.backups.map((backup) => (
                  <div key={backup.id} className="grid gap-3 rounded-2xl border p-4 md:grid-cols-[1fr_auto] md:items-center">
                    <div>
                      <p className="font-semibold">{backup.id}</p>
                      <p className="text-xs text-muted-foreground">{backup.createdAt || "No timestamp"} · {backup.size.toLocaleString()} bytes</p>
                      {backup.checksum ? <p className="mt-1 truncate text-xs text-muted-foreground">SHA-256: {backup.checksum}</p> : null}
                      {backup.providerStatus?.message ? <p className="mt-1 text-xs text-muted-foreground">Provider: {backup.providerStatus.message}</p> : null}
                    </div>
                    <Button variant="outline" disabled={busy === `restore:${backup.id}`} onClick={() => restoreBackup(backup.id)}>
                      <RotateCcw className="mr-2 h-4 w-4" />Restore
                    </Button>
                  </div>
                )) : <p className="text-sm text-muted-foreground">No admin settings backups yet.</p>}
              </CardContent>
            </Card>
            <Card className="border-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><ServerCog className="h-5 w-5 text-orange-600" /> Backup Execution</CardTitle>
                <CardDescription>Validate the configured backup provider and bind live schedules where supported.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="rounded-2xl border bg-muted/30 p-4">
                  <p className="text-sm font-semibold">Provider: {(str(draft.backupProvider) || "local").toUpperCase()}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{providerStatus?.message || "Run a provider check to verify execution readiness."}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" disabled={busy === "backup_status"} onClick={() => backupProviderAction("backup_status")}>Check Provider</Button>
                  <Button variant="outline" disabled={busy === "execute_backup"} onClick={() => backupProviderAction("execute_backup")}>Bind Schedule</Button>
                </div>
                <Alert className="rounded-2xl">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Provider rule</AlertTitle>
                  <AlertDescription>Local backups are restoreable settings versions. Neon uses the existing platform Neon credentials. S3, GCS, and Azure return not-configured until provider credentials and upload executors are added.</AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SettingsCard({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <Card className="border-2">
      <CardHeader><CardTitle className="text-2xl">{title}</CardTitle><CardDescription>{description}</CardDescription></CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{children}</CardContent>
    </Card>
  );
}

function StatusCard({ icon: Icon, label, value, detail, ok }: { icon: React.ElementType; label: string; value: string; detail: string; ok: boolean }) {
  return (
    <Card className="border-2">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div><p className="text-sm text-muted-foreground">{label}</p><p className="mt-1 truncate text-lg font-bold">{value}</p><p className="mt-1 text-xs text-muted-foreground">{detail}</p></div>
          <div className={cn("rounded-2xl p-3", ok ? "bg-emerald-500/10 text-emerald-600" : "bg-orange-500/10 text-orange-600")}><Icon className="h-5 w-5" /></div>
        </div>
      </CardContent>
    </Card>
  );
}

function MiniPolicy({ icon: Icon, title, value }: { icon: React.ElementType; title: string; value: string }) {
  return (
    <Card className="border-2">
      <CardContent className="flex items-center gap-4 p-5">
        <div className="rounded-2xl bg-orange-500/10 p-3 text-orange-600"><Icon className="h-5 w-5" /></div>
        <div><p className="font-bold">{title}</p><p className="text-sm text-muted-foreground">{value}</p></div>
      </CardContent>
    </Card>
  );
}
