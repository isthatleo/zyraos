"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { AlertCircle, Bell, CalendarClock, CheckCircle2, Eye, Megaphone, Pencil, RefreshCw, Search, Send, Trash2, Users } from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type Announcement = {
  id: string;
  title: string;
  content: string;
  authorName: string;
  authorEmail: string;
  authorRole: string;
  targetRoles: string[];
  audience: string;
  isPublished: boolean;
  status: string;
  publishDate: string | null;
  expiryDate: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

type Payload = {
  school: { name: string; slug: string; type: string; status: string };
  generatedAt: string;
  announcements: Announcement[];
  recipientSummary: Array<{ role: string; total: number }>;
  summary: { total: number; published: number; scheduled: number; draft: number; expired: number; recipients: number };
};

const initialForm = {
  title: "",
  content: "",
  audience: "all_staff",
  publishMode: "publish",
  publishDate: "",
  expiryDate: "",
};

const STATUS_STYLES: Record<string, string> = {
  published: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  scheduled: "border-primary/30 bg-primary/10 text-primary",
  draft: "border-muted-foreground/20 bg-muted text-muted-foreground",
  expired: "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300",
};

function formatDate(value: string | null) {
  if (!value) return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not set";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(date);
}

function statusBadge(status: string) {
  return <Badge variant="outline" className={cn("rounded-full px-2.5 py-1 capitalize", STATUS_STYLES[status] || STATUS_STYLES.draft)}>{status.replace(/_/g, " ")}</Badge>;
}

function audienceLabel(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function StatCard({ label, value, detail, icon: Icon }: { label: string; value: string | number; detail: string; icon: React.ElementType }) {
  return (
    <Card className="border-border/70 bg-card/80 shadow-sm backdrop-blur">
      <CardContent className="flex items-center gap-4 p-5">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Icon className="h-5 w-5" /></div>
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p>
          <p className="truncate text-xs text-muted-foreground">{detail}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function OwnerAnnouncementsPage() {
  const params = useParams<{ tenant: string }>();
  const tenantSlug = String(params?.tenant || "");
  const [data, setData] = React.useState<Payload | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [actionId, setActionId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [form, setForm] = React.useState(initialForm);
  const [query, setQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [audienceFilter, setAudienceFilter] = React.useState("all");
  const [editing, setEditing] = React.useState<Announcement | null>(null);
  const [preview, setPreview] = React.useState<Announcement | null>(null);

  const load = React.useCallback(async (quiet = false) => {
    if (!tenantSlug) return;
    setError(null);
    if (quiet) setRefreshing(true); else setLoading(true);
    try {
      const response = await fetch(`/api/tenant/owner/announcements?tenant=${tenantSlug}`, { credentials: "include", cache: "no-store" });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || "Failed to load owner announcements");
      setData(payload);
    } catch (nextError) {
      const message = nextError instanceof Error ? nextError.message : "Failed to load owner announcements";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [tenantSlug]);

  React.useEffect(() => { void load(); }, [load]);

  const filtered = React.useMemo(() => {
    const term = query.trim().toLowerCase();
    return (data?.announcements || []).filter((announcement) => {
      const matchesTerm = !term || [announcement.title, announcement.content, announcement.authorName, announcement.audience].some((value) => value.toLowerCase().includes(term));
      const matchesStatus = statusFilter === "all" || announcement.status === statusFilter;
      const matchesAudience = audienceFilter === "all" || announcement.audience === audienceFilter;
      return matchesTerm && matchesStatus && matchesAudience;
    });
  }, [audienceFilter, data?.announcements, query, statusFilter]);

  const submit = async () => {
    if (!form.title.trim() || !form.content.trim()) {
      toast.error("Title and content are required");
      return;
    }
    setSaving(true);
    try {
      const response = await fetch(`/api/tenant/owner/announcements?tenant=${tenantSlug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(form),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || "Failed to create announcement");
      setData(payload);
      setForm(initialForm);
      toast.success(form.publishMode === "draft" ? "Announcement saved as draft" : "Announcement published");
    } catch (nextError) {
      toast.error(nextError instanceof Error ? nextError.message : "Failed to create announcement");
    } finally {
      setSaving(false);
    }
  };

  const patchAnnouncement = async (announcement: Announcement, action: string, updates: Partial<typeof initialForm> = {}) => {
    setActionId(announcement.id);
    try {
      const response = await fetch(`/api/tenant/owner/announcements?tenant=${tenantSlug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id: announcement.id, action, ...updates }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || "Failed to update announcement");
      setData(payload);
      setEditing(null);
      toast.success("Announcement updated");
    } catch (nextError) {
      toast.error(nextError instanceof Error ? nextError.message : "Failed to update announcement");
    } finally {
      setActionId(null);
    }
  };

  const deleteAnnouncement = async (announcement: Announcement) => {
    setActionId(announcement.id);
    try {
      const response = await fetch(`/api/tenant/owner/announcements?tenant=${tenantSlug}&id=${announcement.id}`, { method: "DELETE", credentials: "include" });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || "Failed to delete announcement");
      setData(payload);
      toast.success("Announcement deleted");
    } catch (nextError) {
      toast.error(nextError instanceof Error ? nextError.message : "Failed to delete announcement");
    } finally {
      setActionId(null);
    }
  };

  const openEdit = (announcement: Announcement) => {
    setEditing(announcement);
    setForm({
      title: announcement.title,
      content: announcement.content,
      audience: announcement.audience === "custom" ? "all_staff" : announcement.audience,
      publishMode: announcement.isPublished ? "publish" : "draft",
      publishDate: announcement.publishDate ? announcement.publishDate.slice(0, 16) : "",
      expiryDate: announcement.expiryDate ? announcement.expiryDate.slice(0, 16) : "",
    });
  };

  if (loading) return <div className="space-y-6"><Skeleton className="h-36 rounded-3xl" /><div className="grid gap-4 md:grid-cols-4">{Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-32 rounded-3xl" />)}</div><Skeleton className="h-96 rounded-3xl" /></div>;

  if (error || !data) {
    return (
      <Alert variant="destructive" className="rounded-3xl">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Announcements failed to load</AlertTitle>
        <AlertDescription className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span>{error || "No announcement data was returned for this tenant."}</span>
          <Button variant="secondary" onClick={() => void load()}>Retry</Button>
        </AlertDescription>
      </Alert>
    );
  }

  const formContent = (
    <div className="space-y-4">
      <div className="grid gap-2"><Label>Title</Label><Input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder="Term dates, staffing notice, policy update..." /></div>
      <div className="grid gap-2"><Label>Content</Label><Textarea value={form.content} onChange={(event) => setForm((current) => ({ ...current, content: event.target.value }))} rows={8} placeholder="Write the announcement..." /><p className="text-xs text-muted-foreground">{form.content.length} characters</p></div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-2"><Label>Audience</Label><Select value={form.audience} onValueChange={(value) => setForm((current) => ({ ...current, audience: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all_staff">All staff</SelectItem><SelectItem value="school_leadership">School leadership</SelectItem><SelectItem value="academic_staff">Academic staff</SelectItem><SelectItem value="finance_hr">Finance & HR</SelectItem><SelectItem value="support_staff">Support staff</SelectItem></SelectContent></Select></div>
        <div className="grid gap-2"><Label>Publish mode</Label><Select value={form.publishMode} onValueChange={(value) => setForm((current) => ({ ...current, publishMode: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="publish">Publish now</SelectItem><SelectItem value="schedule">Schedule</SelectItem><SelectItem value="draft">Save draft</SelectItem></SelectContent></Select></div>
        <div className="grid gap-2"><Label>Publish date</Label><Input type="datetime-local" value={form.publishDate} onChange={(event) => setForm((current) => ({ ...current, publishDate: event.target.value }))} disabled={form.publishMode === "draft"} /></div>
        <div className="grid gap-2"><Label>Expiry date</Label><Input type="datetime-local" value={form.expiryDate} onChange={(event) => setForm((current) => ({ ...current, expiryDate: event.target.value }))} /></div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-border/70 bg-card/80 shadow-sm backdrop-blur">
        <CardContent className="p-0">
          <div className="relative isolate p-6 md:p-8">
            <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_right,hsl(var(--primary)/0.16),transparent_38%),linear-gradient(135deg,hsl(var(--muted)/0.45),transparent)]" />
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-3xl">
                <Badge className="mb-3 rounded-full bg-primary/10 text-primary hover:bg-primary/10">Owner announcement centre</Badge>
                <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Announcements</h1>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">Create, schedule, publish, expire, and manage owner announcements for staff-side tenant audiences.</p>
                <p className="mt-3 text-xs text-muted-foreground">Loaded for {data.school.name} - refreshed {formatDate(data.generatedAt)}</p>
              </div>
              <Button variant="outline" onClick={() => void load(true)} disabled={refreshing}><RefreshCw className={cn("mr-2 h-4 w-4", refreshing && "animate-spin")} />Refresh</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Total" value={data.summary.total} detail="Owner announcement records" icon={Bell} />
        <StatCard label="Published" value={data.summary.published} detail="Currently visible" icon={CheckCircle2} />
        <StatCard label="Scheduled" value={data.summary.scheduled} detail="Future publish date" icon={CalendarClock} />
        <StatCard label="Drafts" value={data.summary.draft} detail="Not yet published" icon={Pencil} />
        <StatCard label="Recipients" value={data.summary.recipients} detail="Eligible staff users" icon={Users} />
      </div>

      <Tabs defaultValue="compose" className="space-y-5">
        <TabsList className="mx-auto flex h-auto w-fit flex-wrap justify-center rounded-full bg-muted/70 p-1">
          <TabsTrigger value="compose" className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Compose</TabsTrigger>
          <TabsTrigger value="history" className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">History</TabsTrigger>
          <TabsTrigger value="audience" className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Audience</TabsTrigger>
        </TabsList>

        <TabsContent value="compose" className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
          <Card className="border-border/70 bg-card/80 shadow-sm backdrop-blur">
            <CardHeader><CardTitle>Create Announcement</CardTitle><CardDescription>Publish immediately, schedule for later, or save as draft.</CardDescription></CardHeader>
            <CardContent className="space-y-5">
              {formContent}
              <Button className="w-full" onClick={() => void submit()} disabled={saving}>{saving ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}{form.publishMode === "draft" ? "Save draft" : form.publishMode === "schedule" ? "Schedule announcement" : "Publish announcement"}</Button>
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-card/80 shadow-sm backdrop-blur">
            <CardHeader><CardTitle>Live Preview</CardTitle><CardDescription>Preview how the announcement reads before publishing.</CardDescription></CardHeader>
            <CardContent>
              <div className="rounded-[2rem] border bg-muted/25 p-5">
                <div className="mb-4 flex flex-wrap gap-2"><Badge className="rounded-full bg-primary/10 text-primary hover:bg-primary/10">{audienceLabel(form.audience)}</Badge><Badge variant="outline" className="rounded-full capitalize">{form.publishMode}</Badge></div>
                <h2 className="text-2xl font-semibold">{form.title || "Announcement title"}</h2>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{form.content || "Your announcement preview appears here."}</p>
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl bg-card/70 p-3"><CalendarClock className="mb-2 h-4 w-4 text-primary" /><p className="text-sm font-medium">Publish</p><p className="text-xs text-muted-foreground">{form.publishMode === "draft" ? "Draft" : form.publishDate ? formatDate(form.publishDate) : "Immediately"}</p></div>
                  <div className="rounded-2xl bg-card/70 p-3"><Bell className="mb-2 h-4 w-4 text-primary" /><p className="text-sm font-medium">Expires</p><p className="text-xs text-muted-foreground">{form.expiryDate ? formatDate(form.expiryDate) : "No expiry"}</p></div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-5">
          <Card className="border-border/70 bg-card/80 shadow-sm backdrop-blur">
            <CardContent className="grid gap-3 p-4 md:grid-cols-[1fr_170px_190px]">
              <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search title, content, author..." className="pl-9" /></div>
              <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All statuses</SelectItem><SelectItem value="published">Published</SelectItem><SelectItem value="scheduled">Scheduled</SelectItem><SelectItem value="draft">Draft</SelectItem><SelectItem value="expired">Expired</SelectItem></SelectContent></Select>
              <Select value={audienceFilter} onValueChange={setAudienceFilter}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All audiences</SelectItem><SelectItem value="all_staff">All staff</SelectItem><SelectItem value="school_leadership">School leadership</SelectItem><SelectItem value="academic_staff">Academic staff</SelectItem><SelectItem value="finance_hr">Finance & HR</SelectItem><SelectItem value="support_staff">Support staff</SelectItem><SelectItem value="custom">Custom</SelectItem></SelectContent></Select>
            </CardContent>
          </Card>

          <div className="grid gap-4 xl:grid-cols-2">
            {filtered.map((announcement) => (
              <Card key={announcement.id} className="border-border/70 bg-card/80 shadow-sm backdrop-blur">
                <CardContent className="p-5">
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="mb-2 flex flex-wrap gap-2">{statusBadge(announcement.status)}<Badge variant="outline" className="rounded-full">{audienceLabel(announcement.audience)}</Badge></div>
                        <h3 className="text-lg font-semibold">{announcement.title}</h3>
                        <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted-foreground">{announcement.content}</p>
                      </div>
                    </div>
                    <div className="grid gap-3 rounded-2xl border bg-muted/25 p-3 text-sm sm:grid-cols-3">
                      <div><p className="text-muted-foreground">Publish</p><p className="font-medium">{formatDate(announcement.publishDate)}</p></div>
                      <div><p className="text-muted-foreground">Expiry</p><p className="font-medium">{formatDate(announcement.expiryDate)}</p></div>
                      <div><p className="text-muted-foreground">Updated</p><p className="font-medium">{formatDate(announcement.updatedAt)}</p></div>
                    </div>
                    <p className="text-xs text-muted-foreground">By {announcement.authorName} - {formatDate(announcement.createdAt)}</p>
                    <div className="flex flex-wrap justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => setPreview(announcement)}><Eye className="mr-2 h-4 w-4" />Preview</Button>
                      <Button variant="outline" size="sm" onClick={() => openEdit(announcement)}><Pencil className="mr-2 h-4 w-4" />Edit</Button>
                      {announcement.isPublished ? <Button variant="outline" size="sm" onClick={() => void patchAnnouncement(announcement, "draft")} disabled={actionId === announcement.id}>Unpublish</Button> : <Button variant="outline" size="sm" onClick={() => void patchAnnouncement(announcement, "publish")} disabled={actionId === announcement.id}>Publish</Button>}
                      {announcement.status !== "expired" ? <Button variant="outline" size="sm" onClick={() => void patchAnnouncement(announcement, "expire")} disabled={actionId === announcement.id}>Expire</Button> : null}
                      <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => void deleteAnnouncement(announcement)} disabled={actionId === announcement.id}>{actionId === announcement.id ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}Delete</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          {!filtered.length ? <div className="rounded-3xl border border-dashed p-10 text-center text-sm text-muted-foreground">No announcements match the selected filters.</div> : null}
        </TabsContent>

        <TabsContent value="audience" className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.recipientSummary.map((item) => <Card key={item.role} className="border-border/70 bg-card/80 shadow-sm backdrop-blur"><CardContent className="flex items-center justify-between gap-4 p-5"><div><p className="font-medium capitalize">{item.role.replace(/_/g, " ")}</p><p className="text-sm text-muted-foreground">Eligible announcement recipient group</p></div><Badge className="rounded-full bg-primary/10 text-primary hover:bg-primary/10">{item.total}</Badge></CardContent></Card>)}
          {!data.recipientSummary.length ? <div className="rounded-3xl border border-dashed p-10 text-center text-sm text-muted-foreground md:col-span-2 xl:col-span-3">No staff recipients found yet.</div> : null}
        </TabsContent>
      </Tabs>

      <Dialog open={Boolean(editing)} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader><DialogTitle>Edit announcement</DialogTitle><DialogDescription>Update content, audience, publish date, and expiry date.</DialogDescription></DialogHeader>
          {formContent}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={() => editing && void patchAnnouncement(editing, "update", form)} disabled={!editing || actionId === editing.id}>{actionId === editing?.id ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Pencil className="mr-2 h-4 w-4" />}Save changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(preview)} onOpenChange={(open) => !open && setPreview(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader><DialogTitle>{preview?.title || "Announcement preview"}</DialogTitle><DialogDescription>{preview ? `${statusBadge(preview.status).props.children} - ${audienceLabel(preview.audience)}` : ""}</DialogDescription></DialogHeader>
          <div className="rounded-3xl border bg-muted/25 p-5">
            <div className="mb-3 flex flex-wrap gap-2">{preview ? statusBadge(preview.status) : null}{preview ? <Badge variant="outline" className="rounded-full">{audienceLabel(preview.audience)}</Badge> : null}</div>
            <p className="whitespace-pre-wrap text-sm leading-6">{preview?.content}</p>
            <p className="mt-5 text-xs text-muted-foreground">Published {formatDate(preview?.publishDate || null)} - Expires {formatDate(preview?.expiryDate || null)}</p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
