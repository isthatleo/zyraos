"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { AlertCircle, Bell, CalendarClock, CheckCircle2, ChevronLeft, ChevronRight, Download, Mail, Megaphone, MessageSquareText, RefreshCw, Search, Send, Trash2, Users } from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type Broadcast = {
  id: string;
  title: string;
  content: string;
  channel: string;
  targetAudience: string;
  status: string;
  scheduledAt: string | null;
  sentAt: string | null;
  createdAt: string | null;
  createdByName: string;
  deliveryCount: number;
  sentCount: number;
  deliveredCount: number;
  failedCount: number;
  pendingCount: number;
  smsCount: number;
};

type Payload = {
  broadcasts: Broadcast[];
  audience: { total: number; withPhone: number; withEmail: number; byRole: Array<{ role: string; total: number }> };
  summaries: { total: number; drafts: number; scheduled: number; sent: number; sms: number; email: number; inApp: number };
  pagination: { page: number; pageSize: number; total: number; totalPages: number; hasNextPage: boolean; hasPreviousPage: boolean };
  generatedAt: string;
};

const initialForm = { title: "", content: "", channel: "in-app", targetAudience: "all", status: "sent", scheduledAt: "" };

function formatDate(value: string | null) {
  if (!value) return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not set";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(date);
}

function badgeClass(value: string) {
  const status = value.toLowerCase();
  if (["sent", "delivered"].includes(status)) return "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  if (["scheduled", "pending"].includes(status)) return "border-primary/25 bg-primary/10 text-primary";
  if (["failed"].includes(status)) return "border-destructive/25 bg-destructive/10 text-destructive";
  return "border-border bg-muted text-muted-foreground";
}

export default function AdminBroadcastsPage() {
  const params = useParams<{ tenant?: string }>();
  const tenant = params?.tenant || "";
  const [data, setData] = React.useState<Payload | null>(null);
  const [form, setForm] = React.useState(initialForm);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [busy, setBusy] = React.useState("");
  const [error, setError] = React.useState("");
  const [query, setQuery] = React.useState("");
  const [status, setStatus] = React.useState("all");
  const [channel, setChannel] = React.useState("all");
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState("20");

  const load = React.useCallback(async (silent = false) => {
    if (!tenant) return;
    if (silent) setRefreshing(true);
    else setLoading(true);
    setError("");
    try {
      const search = new URLSearchParams({ tenant, page: String(page), pageSize, query, status, channel });
      const response = await fetch(`/api/tenant/admin/broadcasts?${search.toString()}`, { credentials: "include", cache: "no-store" });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || "Failed to load broadcasts");
      setData(payload);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load broadcasts";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [channel, page, pageSize, query, status, tenant]);

  React.useEffect(() => { void load(); }, [load]);

  async function submit() {
    setSaving(true);
    try {
      const response = await fetch(`/api/tenant/admin/broadcasts?tenant=${encodeURIComponent(tenant)}`, { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(form) });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || "Failed to save broadcast");
      setData(payload);
      setForm(initialForm);
      toast.success(form.status === "sent" ? "Broadcast sent" : form.status === "scheduled" ? "Broadcast scheduled" : "Broadcast saved as draft");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save broadcast");
    } finally {
      setSaving(false);
    }
  }

  async function sendNow(id: string) {
    setBusy(id);
    try {
      const response = await fetch(`/api/tenant/admin/broadcasts?tenant=${encodeURIComponent(tenant)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ id, action: "send_now" }) });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || "Failed to send broadcast");
      setData(payload);
      toast.success("Broadcast sent");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send broadcast");
    } finally {
      setBusy("");
    }
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this broadcast and its delivery rows?")) return;
    setBusy(id);
    try {
      const response = await fetch(`/api/tenant/admin/broadcasts?tenant=${encodeURIComponent(tenant)}&id=${encodeURIComponent(id)}`, { method: "DELETE", credentials: "include" });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || "Failed to delete broadcast");
      setData(payload);
      toast.success("Broadcast deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete broadcast");
    } finally {
      setBusy("");
    }
  }

  function exportBroadcasts(format: "csv" | "json") {
    const search = new URLSearchParams({ tenant, export: format, query, status, channel });
    window.open(`/api/tenant/admin/broadcasts?${search.toString()}`, "_blank", "noopener,noreferrer");
  }

  function resetFilters() {
    setQuery("");
    setStatus("all");
    setChannel("all");
    setPage(1);
  }

  if (loading) return <div className="space-y-6"><Skeleton className="h-48 rounded-3xl" /><div className="grid gap-4 md:grid-cols-4">{Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-28 rounded-3xl" />)}</div><Skeleton className="h-96 rounded-3xl" /></div>;

  if (error || !data) return <Alert variant="destructive" className="rounded-3xl"><AlertCircle className="h-4 w-4" /><AlertTitle>Broadcasts unavailable</AlertTitle><AlertDescription className="mt-2 flex items-center justify-between gap-4"><span>{error || "The broadcasts page could not be loaded."}</span><Button variant="outline" onClick={() => void load()}>Retry</Button></AlertDescription></Alert>;

  const estimatedRecipients = form.targetAudience === "students"
    ? data.audience.byRole.filter((item) => ["student", "learner", "pupil"].includes(item.role)).reduce((sum, item) => sum + item.total, 0)
    : form.targetAudience === "parents"
      ? data.audience.byRole.filter((item) => ["parent", "guardian"].includes(item.role)).reduce((sum, item) => sum + item.total, 0)
      : form.targetAudience === "teachers"
        ? data.audience.byRole.filter((item) => ["teacher", "lecturer", "professor"].includes(item.role)).reduce((sum, item) => sum + item.total, 0)
        : form.targetAudience === "staff"
          ? data.audience.byRole.filter((item) => !["student", "learner", "pupil", "parent", "guardian"].includes(item.role)).reduce((sum, item) => sum + item.total, 0)
          : data.audience.total;

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <Badge variant="outline" className="rounded-full">Communication</Badge>
            <h1 className="mt-4 flex items-center gap-3 text-3xl font-bold tracking-tight"><Megaphone className="h-8 w-8 text-orange-600" />Broadcasts</h1>
            <p className="mt-2 max-w-3xl text-sm text-muted-foreground">Send, schedule, track, export, and audit tenant broadcasts across in-app, SMS, and email channels. Owner/platform accounts are excluded.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" disabled={refreshing} onClick={() => void load(true)}><RefreshCw className={cn("mr-2 h-4 w-4", refreshing && "animate-spin")} />Refresh</Button>
            <Button variant="outline" onClick={() => exportBroadcasts("csv")}><Download className="mr-2 h-4 w-4" />CSV</Button>
            <Button variant="outline" onClick={() => exportBroadcasts("json")}><Download className="mr-2 h-4 w-4" />JSON</Button>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <Metric icon={Megaphone} label="Total" value={data.summaries.total} />
        <Metric icon={CheckCircle2} label="Sent" value={data.summaries.sent} />
        <Metric icon={CalendarClock} label="Scheduled" value={data.summaries.scheduled} />
        <Metric icon={Bell} label="In-app" value={data.summaries.inApp} />
        <Metric icon={MessageSquareText} label="SMS" value={data.summaries.sms} />
        <Metric icon={Mail} label="Email" value={data.summaries.email} />
      </div>

      <Card className="border-2">
        <CardHeader><CardTitle>Create Broadcast</CardTitle><CardDescription>Estimated recipients: {estimatedRecipients.toLocaleString()} · phone-ready {data.audience.withPhone.toLocaleString()} · email-ready {data.audience.withEmail.toLocaleString()}</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Field label="Title"><Input value={form.title} maxLength={160} onChange={(e) => setForm((current) => ({ ...current, title: e.target.value }))} /></Field>
            <div className="grid gap-4 md:grid-cols-3">
              <Field label="Channel"><Select value={form.channel} onValueChange={(value) => setForm((current) => ({ ...current, channel: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="in-app">In-app</SelectItem><SelectItem value="sms">SMS</SelectItem><SelectItem value="email">Email</SelectItem></SelectContent></Select></Field>
              <Field label="Audience"><Select value={form.targetAudience} onValueChange={(value) => setForm((current) => ({ ...current, targetAudience: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All except owners</SelectItem><SelectItem value="students">Students</SelectItem><SelectItem value="parents">Parents</SelectItem><SelectItem value="teachers">Teachers</SelectItem><SelectItem value="staff">Staff</SelectItem></SelectContent></Select></Field>
              <Field label="Action"><Select value={form.status} onValueChange={(value) => setForm((current) => ({ ...current, status: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="sent">Send now</SelectItem><SelectItem value="scheduled">Schedule</SelectItem><SelectItem value="draft">Draft</SelectItem></SelectContent></Select></Field>
            </div>
          </div>
          {form.status === "scheduled" ? <Field label="Scheduled date/time"><Input type="datetime-local" value={form.scheduledAt} onChange={(e) => setForm((current) => ({ ...current, scheduledAt: e.target.value }))} /></Field> : null}
          <Field label="Message"><Textarea value={form.content} rows={6} maxLength={5000} onChange={(e) => setForm((current) => ({ ...current, content: e.target.value }))} /></Field>
          <div className="flex flex-wrap items-center gap-2">
            <Button disabled={saving || !form.title || !form.content} onClick={submit} className="bg-orange-600 text-white hover:bg-orange-700">{saving ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}{form.status === "sent" ? "Send Broadcast" : form.status === "scheduled" ? "Schedule Broadcast" : "Save Draft"}</Button>
            {form.channel === "sms" ? <Badge variant="outline" className="rounded-full">{Math.max(1, Math.ceil(form.content.length / 160))} SMS segment(s)</Badge> : null}
          </div>
        </CardContent>
      </Card>

      <Card className="border-2">
        <CardContent className="space-y-3 p-4">
          <div className="grid gap-3 xl:grid-cols-[1fr_160px_160px_110px]">
            <div className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input value={query} onChange={(event) => { setPage(1); setQuery(event.target.value); }} placeholder="Search broadcasts..." className="pl-9" /></div>
            <Select value={status} onValueChange={(value) => { setPage(1); setStatus(value); }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All status</SelectItem><SelectItem value="draft">Draft</SelectItem><SelectItem value="scheduled">Scheduled</SelectItem><SelectItem value="sent">Sent</SelectItem><SelectItem value="failed">Failed</SelectItem></SelectContent></Select>
            <Select value={channel} onValueChange={(value) => { setPage(1); setChannel(value); }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All channels</SelectItem><SelectItem value="in-app">In-app</SelectItem><SelectItem value="sms">SMS</SelectItem><SelectItem value="email">Email</SelectItem></SelectContent></Select>
            <Button variant="outline" onClick={resetFilters}>Reset</Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {data.broadcasts.map((item) => (
          <Card key={item.id} className="border-2">
            <CardContent className="grid gap-4 p-5 xl:grid-cols-[1fr_300px]">
              <div>
                <div className="flex flex-wrap items-center gap-2"><Badge variant="outline" className={cn("rounded-full capitalize", badgeClass(item.status))}>{item.status}</Badge><Badge variant="outline" className="rounded-full">{item.channel}</Badge><Badge variant="outline" className="rounded-full">{item.targetAudience}</Badge></div>
                <h3 className="mt-3 text-xl font-bold">{item.title}</h3>
                <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{item.content}</p>
                <p className="mt-3 text-xs text-muted-foreground">By {item.createdByName} · Created {formatDate(item.createdAt)} · Scheduled {formatDate(item.scheduledAt)} · Sent {formatDate(item.sentAt)}</p>
              </div>
              <div className="space-y-3 rounded-2xl border bg-muted/30 p-4">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <Stat label="Recipients" value={item.deliveryCount} />
                  <Stat label="Sent" value={item.sentCount} />
                  <Stat label="Delivered" value={item.deliveredCount} />
                  <Stat label="Failed" value={item.failedCount} />
                </div>
                <div className="flex flex-wrap gap-2">
                  {item.status !== "sent" ? <Button variant="outline" disabled={busy === item.id} onClick={() => sendNow(item.id)}><Send className="mr-2 h-4 w-4" />Send now</Button> : null}
                  <Button variant="destructive" disabled={busy === item.id} onClick={() => remove(item.id)}><Trash2 className="mr-2 h-4 w-4" />Delete</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {!data.broadcasts.length ? <Card className="border-dashed"><CardContent className="p-10 text-center text-sm text-muted-foreground">No broadcasts match the selected filters.</CardContent></Card> : null}
      </div>

      <div className="flex flex-col gap-3 rounded-3xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">Page {data.pagination.page} of {data.pagination.totalPages} · {data.pagination.total.toLocaleString()} matching broadcasts</p>
        <div className="flex gap-2">
          <Select value={pageSize} onValueChange={(value) => { setPage(1); setPageSize(value); }}><SelectTrigger className="w-28"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="10">10</SelectItem><SelectItem value="20">20</SelectItem><SelectItem value="50">50</SelectItem><SelectItem value="100">100</SelectItem></SelectContent></Select>
          <Button variant="outline" disabled={!data.pagination.hasPreviousPage} onClick={() => setPage((current) => Math.max(1, current - 1))}><ChevronLeft className="h-4 w-4" /></Button>
          <Button variant="outline" disabled={!data.pagination.hasNextPage} onClick={() => setPage((current) => current + 1)}><ChevronRight className="h-4 w-4" /></Button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-2"><Label className="text-xs font-bold uppercase text-muted-foreground">{label}</Label>{children}</div>;
}

function Metric({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: number }) {
  return <Card className="border-2"><CardContent className="flex items-center justify-between p-5"><div><p className="text-sm text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-bold">{value.toLocaleString()}</p></div><Icon className="h-6 w-6 text-orange-500" /></CardContent></Card>;
}

function Stat({ label, value }: { label: string; value: number }) {
  return <div className="rounded-xl border bg-card p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="font-bold">{value.toLocaleString()}</p></div>;
}
