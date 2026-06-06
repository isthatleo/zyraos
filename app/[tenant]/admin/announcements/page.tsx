"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { AlertCircle, Bell, CalendarClock, CheckCircle2, ChevronLeft, ChevronRight, Download, Edit3, Eye, RefreshCw, Save, Search, Send, Trash2, Users } from "lucide-react";
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
import { cn } from "@/lib/utils";

type Announcement = {
  id: string;
  title: string;
  content: string;
  authorName: string;
  targetRoles: string[];
  isPublished: boolean;
  lifecycle: string;
  publishDate: string | null;
  expiryDate: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

type Payload = {
  announcements: Announcement[];
  audience: { total: number; byRole: Array<{ role: string; total: number }> };
  summaries: { total: number; drafts: number; active: number; scheduled: number; expired: number };
  pagination: { page: number; pageSize: number; total: number; totalPages: number; hasNextPage: boolean; hasPreviousPage: boolean };
  generatedAt: string;
};

const ROLE_OPTIONS = ["all", "student", "parent", "teacher", "school_admin", "hr", "finance", "librarian", "canteen", "receptionist", "staff"];

const emptyForm = { id: "", title: "", content: "", targetRoles: ["all"], isPublished: true, publishDate: new Date().toISOString().slice(0, 10), expiryDate: "" };

function formatDate(value: string | null) {
  if (!value) return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not set";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(date);
}

function badgeClass(value: string) {
  const status = value.toLowerCase();
  if (["active", "published"].includes(status)) return "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  if (["scheduled"].includes(status)) return "border-primary/25 bg-primary/10 text-primary";
  if (["expired"].includes(status)) return "border-destructive/25 bg-destructive/10 text-destructive";
  return "border-border bg-muted text-muted-foreground";
}

export default function AdminAnnouncementsPage() {
  const params = useParams<{ tenant?: string }>();
  const tenant = params?.tenant || "";
  const [data, setData] = React.useState<Payload | null>(null);
  const [form, setForm] = React.useState(emptyForm);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");
  const [query, setQuery] = React.useState("");
  const [status, setStatus] = React.useState("all");
  const [role, setRole] = React.useState("all");
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState("20");

  const load = React.useCallback(async (silent = false) => {
    if (!tenant) return;
    if (silent) setRefreshing(true);
    else setLoading(true);
    setError("");
    try {
      const search = new URLSearchParams({ tenant, page: String(page), pageSize, query, status, role });
      const response = await fetch(`/api/tenant/admin/announcements?${search.toString()}`, { credentials: "include", cache: "no-store" });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || "Failed to load announcements");
      setData(payload);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load announcements";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [page, pageSize, query, role, status, tenant]);

  React.useEffect(() => { void load(); }, [load]);

  function setRoles(value: string) {
    setForm((current) => {
      if (value === "all") return { ...current, targetRoles: ["all"] };
      const next = new Set(current.targetRoles.filter((item) => item !== "all"));
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return { ...current, targetRoles: next.size ? Array.from(next) : ["all"] };
    });
  }

  async function submit() {
    setSaving(true);
    try {
      const method = form.id ? "PATCH" : "POST";
      const response = await fetch(`/api/tenant/admin/announcements?tenant=${encodeURIComponent(tenant)}`, { method, headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(form) });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || "Failed to save announcement");
      setData(payload);
      setForm(emptyForm);
      toast.success(form.id ? "Announcement updated" : "Announcement created");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save announcement");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this announcement? This action is audit logged.")) return;
    try {
      const response = await fetch(`/api/tenant/admin/announcements?tenant=${encodeURIComponent(tenant)}&id=${encodeURIComponent(id)}`, { method: "DELETE", credentials: "include" });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || "Failed to delete announcement");
      setData(payload);
      toast.success("Announcement deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete announcement");
    }
  }

  async function togglePublish(item: Announcement) {
    try {
      const payload = { id: item.id, title: item.title, content: item.content, targetRoles: item.targetRoles, isPublished: !item.isPublished, publishDate: item.publishDate?.slice(0, 10) || "", expiryDate: item.expiryDate?.slice(0, 10) || "" };
      const response = await fetch(`/api/tenant/admin/announcements?tenant=${encodeURIComponent(tenant)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(payload) });
      const next = await response.json().catch(() => null);
      if (!response.ok) throw new Error(next?.error || "Failed to update publish state");
      setData(next);
      toast.success(item.isPublished ? "Announcement unpublished" : "Announcement published");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update publish state");
    }
  }

  function edit(item: Announcement) {
    setForm({ id: item.id, title: item.title, content: item.content, targetRoles: item.targetRoles.length ? item.targetRoles : ["all"], isPublished: item.isPublished, publishDate: item.publishDate?.slice(0, 10) || "", expiryDate: item.expiryDate?.slice(0, 10) || "" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetFilters() {
    setQuery("");
    setStatus("all");
    setRole("all");
    setPage(1);
  }

  function exportAnnouncements(format: "csv" | "json") {
    const search = new URLSearchParams({ tenant, export: format, query, status, role });
    window.open(`/api/tenant/admin/announcements?${search.toString()}`, "_blank", "noopener,noreferrer");
  }

  if (loading) return <div className="space-y-6"><Skeleton className="h-48 rounded-3xl" /><div className="grid gap-4 md:grid-cols-5">{Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} className="h-28 rounded-3xl" />)}</div><Skeleton className="h-96 rounded-3xl" /></div>;

  if (error || !data) {
    return (
      <Alert variant="destructive" className="rounded-3xl">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Announcements unavailable</AlertTitle>
        <AlertDescription className="mt-2 flex items-center justify-between gap-4">
          <span>{error || "The announcements page could not be loaded."}</span>
          <Button variant="outline" onClick={() => void load()}>Retry</Button>
        </AlertDescription>
      </Alert>
    );
  }

  const previewCount = form.targetRoles.includes("all") ? data.audience.total : data.audience.byRole.filter((item) => form.targetRoles.includes(item.role)).reduce((sum, item) => sum + item.total, 0);

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <Badge variant="outline" className="rounded-full">Communication</Badge>
            <h1 className="mt-4 flex items-center gap-3 text-3xl font-bold tracking-tight"><Bell className="h-8 w-8 text-orange-600" />Announcements</h1>
            <p className="mt-2 max-w-3xl text-sm text-muted-foreground">Create, schedule, publish, expire, edit, export, and audit tenant announcements. Owners are excluded from school-admin announcement audiences.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" disabled={refreshing} onClick={() => void load(true)}><RefreshCw className={cn("mr-2 h-4 w-4", refreshing && "animate-spin")} />Refresh</Button>
            <Button variant="outline" onClick={() => exportAnnouncements("csv")}><Download className="mr-2 h-4 w-4" />CSV</Button>
            <Button variant="outline" onClick={() => exportAnnouncements("json")}><Download className="mr-2 h-4 w-4" />JSON</Button>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Metric icon={Bell} label="Total" value={data.summaries.total} />
        <Metric icon={Eye} label="Active" value={data.summaries.active} />
        <Metric icon={CalendarClock} label="Scheduled" value={data.summaries.scheduled} />
        <Metric icon={Edit3} label="Drafts" value={data.summaries.drafts} />
        <Metric icon={CheckCircle2} label="Audience" value={data.audience.total} />
      </div>

      <Card className="border-2">
        <CardHeader>
          <CardTitle>{form.id ? "Edit Announcement" : "Create Announcement"}</CardTitle>
          <CardDescription>Targeted roles exclude owner/platform accounts. Estimated recipients: {previewCount.toLocaleString()}.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Field label="Title"><Input value={form.title} maxLength={160} onChange={(e) => setForm((current) => ({ ...current, title: e.target.value }))} /></Field>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Publish date"><Input type="date" value={form.publishDate} onChange={(e) => setForm((current) => ({ ...current, publishDate: e.target.value }))} /></Field>
              <Field label="Expiry date"><Input type="date" value={form.expiryDate} onChange={(e) => setForm((current) => ({ ...current, expiryDate: e.target.value }))} /></Field>
            </div>
          </div>
          <Field label="Content"><Textarea value={form.content} rows={6} maxLength={5000} onChange={(e) => setForm((current) => ({ ...current, content: e.target.value }))} /></Field>
          <div className="grid gap-4 xl:grid-cols-[1fr_260px]">
            <div className="rounded-3xl border p-4">
              <p className="text-sm font-bold">Audience</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {ROLE_OPTIONS.map((item) => <Button key={item} type="button" size="sm" variant={form.targetRoles.includes(item) ? "default" : "outline"} className={cn("rounded-full", form.targetRoles.includes(item) && "bg-orange-600 text-white hover:bg-orange-700")} onClick={() => setRoles(item)}>{item.replace(/_/g, " ")}</Button>)}
              </div>
            </div>
            <div className="flex items-center justify-between rounded-3xl border p-4">
              <div><p className="font-bold">Published</p><p className="text-xs text-muted-foreground">Turn off to save as draft.</p></div>
              <Switch checked={form.isPublished} onCheckedChange={(value) => setForm((current) => ({ ...current, isPublished: value }))} />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button disabled={saving || !form.title || !form.content} onClick={submit} className="bg-orange-600 text-white hover:bg-orange-700">{saving ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : form.id ? <Save className="mr-2 h-4 w-4" /> : <Send className="mr-2 h-4 w-4" />}{form.id ? "Save Changes" : "Create Announcement"}</Button>
            {form.id ? <Button variant="outline" onClick={() => setForm(emptyForm)}>Cancel Edit</Button> : null}
          </div>
        </CardContent>
      </Card>

      <Card className="border-2">
        <CardContent className="space-y-3 p-4">
          <div className="grid gap-3 xl:grid-cols-[1fr_170px_180px_110px]">
            <div className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input value={query} onChange={(event) => { setPage(1); setQuery(event.target.value); }} placeholder="Search title, content, author..." className="pl-9" /></div>
            <Select value={status} onValueChange={(value) => { setPage(1); setStatus(value); }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All status</SelectItem><SelectItem value="active">Active</SelectItem><SelectItem value="scheduled">Scheduled</SelectItem><SelectItem value="expired">Expired</SelectItem><SelectItem value="published">Published</SelectItem><SelectItem value="draft">Draft</SelectItem></SelectContent></Select>
            <Select value={role} onValueChange={(value) => { setPage(1); setRole(value); }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All roles</SelectItem>{ROLE_OPTIONS.filter((item) => item !== "all").map((item) => <SelectItem key={item} value={item}>{item.replace(/_/g, " ")}</SelectItem>)}</SelectContent></Select>
            <Button variant="outline" onClick={resetFilters}>Reset</Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {data.announcements.map((item) => (
          <Card key={item.id} className="border-2">
            <CardContent className="grid gap-4 p-5 xl:grid-cols-[1fr_260px]">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className={cn("rounded-full capitalize", badgeClass(item.lifecycle))}>{item.lifecycle}</Badge>
                  {item.targetRoles.map((target) => <Badge key={target} variant="outline" className="rounded-full">{target.replace(/_/g, " ")}</Badge>)}
                </div>
                <h3 className="mt-3 text-xl font-bold">{item.title}</h3>
                <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{item.content}</p>
                <p className="mt-3 text-xs text-muted-foreground">By {item.authorName} · Created {formatDate(item.createdAt)} · Updated {formatDate(item.updatedAt)}</p>
              </div>
              <div className="space-y-3 rounded-2xl border bg-muted/30 p-4">
                <div className="text-sm text-muted-foreground"><p>Publish: {formatDate(item.publishDate)}</p><p>Expiry: {formatDate(item.expiryDate)}</p></div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={() => edit(item)}><Edit3 className="mr-2 h-4 w-4" />Edit</Button>
                  <Button variant="outline" onClick={() => togglePublish(item)}><Eye className="mr-2 h-4 w-4" />{item.isPublished ? "Unpublish" : "Publish"}</Button>
                  <Button variant="destructive" onClick={() => remove(item.id)}><Trash2 className="mr-2 h-4 w-4" />Delete</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {!data.announcements.length ? <Card className="border-dashed"><CardContent className="p-10 text-center text-sm text-muted-foreground">No announcements match the selected filters.</CardContent></Card> : null}
      </div>

      <div className="flex flex-col gap-3 rounded-3xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">Page {data.pagination.page} of {data.pagination.totalPages} · {data.pagination.total.toLocaleString()} matching announcements</p>
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
  return (
    <Card className="border-2">
      <CardContent className="flex items-center justify-between p-5">
        <div><p className="text-sm text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-bold">{value.toLocaleString()}</p></div>
        <Icon className="h-6 w-6 text-orange-500" />
      </CardContent>
    </Card>
  );
}
