"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { AlertCircle, Bell, CalendarClock, CheckCircle2, Megaphone, RefreshCw, Search, Send, Users, XCircle } from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  failedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  createdByName: string;
  deliveryCount: number;
  sentCount: number;
  failedCount: number;
  pendingCount: number;
  metadata: { category?: string; priority?: string; recipientCount?: number; characterCount?: number; smsCount?: number };
};

type Payload = {
  school: { name: string; slug: string; type: string; status: string };
  generatedAt: string;
  broadcasts: Broadcast[];
  recipientSummary: Array<{ role: string; total: number }>;
  summary: { total: number; sent: number; scheduled: number; failed: number; recipients: number; delivered: number; pending: number };
};

const initialForm = {
  title: "",
  content: "",
  channel: "in-app",
  targetAudience: "all_staff",
  category: "memo",
  priority: "normal",
  scheduledAt: "",
};

const STATUS_STYLES: Record<string, string> = {
  sent: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  scheduled: "border-primary/30 bg-primary/10 text-primary",
  draft: "border-muted-foreground/20 bg-muted text-muted-foreground",
  failed: "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300",
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

export default function OwnerBroadcastsPage() {
  const params = useParams<{ tenant: string }>();
  const tenantSlug = String(params?.tenant || "");
  const [data, setData] = React.useState<Payload | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [sending, setSending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [form, setForm] = React.useState(initialForm);
  const [query, setQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [audienceFilter, setAudienceFilter] = React.useState("all");

  const load = React.useCallback(async (quiet = false) => {
    if (!tenantSlug) return;
    setError(null);
    if (quiet) setRefreshing(true); else setLoading(true);
    try {
      const response = await fetch(`/api/tenant/owner/broadcasts?tenant=${tenantSlug}`, { credentials: "include", cache: "no-store" });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || "Failed to load owner broadcasts");
      setData(payload);
    } catch (nextError) {
      const message = nextError instanceof Error ? nextError.message : "Failed to load owner broadcasts";
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
    return (data?.broadcasts || []).filter((broadcast) => {
      const matchesTerm = !term || [broadcast.title, broadcast.content, broadcast.channel, broadcast.targetAudience, broadcast.metadata?.category || ""].some((value) => value.toLowerCase().includes(term));
      const matchesStatus = statusFilter === "all" || broadcast.status === statusFilter;
      const matchesAudience = audienceFilter === "all" || broadcast.targetAudience === audienceFilter;
      return matchesTerm && matchesStatus && matchesAudience;
    });
  }, [audienceFilter, data?.broadcasts, query, statusFilter]);

  const submit = async () => {
    if (!form.title.trim() || !form.content.trim()) {
      toast.error("Title and message are required");
      return;
    }
    setSending(true);
    try {
      const response = await fetch(`/api/tenant/owner/broadcasts?tenant=${tenantSlug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(form),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || "Failed to send broadcast");
      toast.success(`Broadcast ${form.scheduledAt ? "scheduled" : "sent"} to ${payload.recipientCount || 0} staff users`);
      setForm(initialForm);
      if (payload.payload) setData(payload.payload);
      else await load(true);
    } catch (nextError) {
      toast.error(nextError instanceof Error ? nextError.message : "Failed to send broadcast");
    } finally {
      setSending(false);
    }
  };

  if (loading) return <div className="space-y-6"><Skeleton className="h-36 rounded-3xl" /><div className="grid gap-4 md:grid-cols-4">{Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-32 rounded-3xl" />)}</div><Skeleton className="h-96 rounded-3xl" /></div>;

  if (error || !data) {
    return (
      <Alert variant="destructive" className="rounded-3xl">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Broadcasts failed to load</AlertTitle>
        <AlertDescription className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span>{error || "No broadcast data was returned for this tenant."}</span>
          <Button variant="secondary" onClick={() => void load()}>Retry</Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-border/70 bg-card/80 shadow-sm backdrop-blur">
        <CardContent className="p-0">
          <div className="relative isolate p-6 md:p-8">
            <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_right,hsl(var(--primary)/0.16),transparent_38%),linear-gradient(135deg,hsl(var(--muted)/0.45),transparent)]" />
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-3xl">
                <Badge className="mb-3 rounded-full bg-primary/10 text-primary hover:bg-primary/10">Owner staff broadcasts</Badge>
                <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Broadcasts</h1>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Send owner memos, meeting notices, operational updates, and staff-only announcements to your school team.
                </p>
                <p className="mt-3 text-xs text-muted-foreground">Loaded for {data.school.name} - refreshed {formatDate(data.generatedAt)}</p>
              </div>
              <Button variant="outline" onClick={() => void load(true)} disabled={refreshing}><RefreshCw className={cn("mr-2 h-4 w-4", refreshing && "animate-spin")} />Refresh</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Broadcasts" value={data.summary.total} detail={`${data.summary.sent} sent, ${data.summary.scheduled} scheduled`} icon={Megaphone} />
        <StatCard label="Recipients" value={data.summary.recipients} detail={`${data.summary.delivered} delivered records`} icon={Users} />
        <StatCard label="Pending" value={data.summary.pending} detail="Scheduled or queued deliveries" icon={CalendarClock} />
        <StatCard label="Failed" value={data.summary.failed} detail="Broadcasts requiring review" icon={XCircle} />
      </div>

      <Tabs defaultValue="compose" className="space-y-5">
        <TabsList className="mx-auto flex h-auto w-fit flex-wrap justify-center rounded-full bg-muted/70 p-1">
          <TabsTrigger value="compose" className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Compose</TabsTrigger>
          <TabsTrigger value="history" className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">History</TabsTrigger>
          <TabsTrigger value="audience" className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Audience</TabsTrigger>
        </TabsList>

        <TabsContent value="compose" className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
          <Card className="border-border/70 bg-card/80 shadow-sm backdrop-blur">
            <CardHeader><CardTitle>Create Staff Broadcast</CardTitle><CardDescription>Only staff-side audiences are available to owners.</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2"><Label>Title</Label><Input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder="Staff meeting, memo, schedule update..." /></div>
              <div className="grid gap-2"><Label>Message</Label><Textarea value={form.content} onChange={(event) => setForm((current) => ({ ...current, content: event.target.value }))} rows={8} placeholder="Write the staff announcement..." /><p className="text-xs text-muted-foreground">{form.content.length} characters - {Math.ceil(form.content.length / 160) || 0} SMS segment(s)</p></div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="grid gap-2"><Label>Audience</Label><Select value={form.targetAudience} onValueChange={(value) => setForm((current) => ({ ...current, targetAudience: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all_staff">All staff</SelectItem><SelectItem value="school_leadership">School leadership</SelectItem><SelectItem value="teachers">Teachers & lecturers</SelectItem><SelectItem value="finance_hr">Finance & HR</SelectItem><SelectItem value="support_staff">Support staff</SelectItem></SelectContent></Select></div>
                <div className="grid gap-2"><Label>Channel</Label><Select value={form.channel} onValueChange={(value) => setForm((current) => ({ ...current, channel: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="in-app">In-app</SelectItem><SelectItem value="email">Email</SelectItem><SelectItem value="sms">SMS</SelectItem></SelectContent></Select></div>
                <div className="grid gap-2"><Label>Category</Label><Select value={form.category} onValueChange={(value) => setForm((current) => ({ ...current, category: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="memo">Memo</SelectItem><SelectItem value="meeting">Meeting</SelectItem><SelectItem value="operations">Operations</SelectItem><SelectItem value="policy">Policy</SelectItem><SelectItem value="urgent_notice">Urgent notice</SelectItem></SelectContent></Select></div>
                <div className="grid gap-2"><Label>Priority</Label><Select value={form.priority} onValueChange={(value) => setForm((current) => ({ ...current, priority: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="low">Low</SelectItem><SelectItem value="normal">Normal</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="urgent">Urgent</SelectItem></SelectContent></Select></div>
                <div className="grid gap-2 sm:col-span-2"><Label>Schedule for later</Label><Input type="datetime-local" value={form.scheduledAt} onChange={(event) => setForm((current) => ({ ...current, scheduledAt: event.target.value }))} /></div>
              </div>
              <Button className="w-full" onClick={() => void submit()} disabled={sending}>{sending ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}{form.scheduledAt ? "Schedule broadcast" : "Send broadcast"}</Button>
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-card/80 shadow-sm backdrop-blur">
            <CardHeader><CardTitle>Live Preview</CardTitle><CardDescription>Staff will receive this content through the selected channel.</CardDescription></CardHeader>
            <CardContent>
              <div className="rounded-[2rem] border bg-muted/25 p-5">
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  <Badge className="rounded-full bg-primary/10 text-primary hover:bg-primary/10">{audienceLabel(form.targetAudience)}</Badge>
                  <Badge variant="outline" className="rounded-full capitalize">{form.channel}</Badge>
                  <Badge variant="outline" className="rounded-full capitalize">{form.priority}</Badge>
                </div>
                <h2 className="text-2xl font-semibold">{form.title || "Broadcast title"}</h2>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{form.content || "Your staff memo or announcement preview appears here."}</p>
                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl bg-card/70 p-3"><Bell className="mb-2 h-4 w-4 text-primary" /><p className="text-sm font-medium">Category</p><p className="text-xs text-muted-foreground capitalize">{form.category.replace(/_/g, " ")}</p></div>
                  <div className="rounded-2xl bg-card/70 p-3"><Users className="mb-2 h-4 w-4 text-primary" /><p className="text-sm font-medium">Audience</p><p className="text-xs text-muted-foreground">{audienceLabel(form.targetAudience)}</p></div>
                  <div className="rounded-2xl bg-card/70 p-3"><CalendarClock className="mb-2 h-4 w-4 text-primary" /><p className="text-sm font-medium">Send time</p><p className="text-xs text-muted-foreground">{form.scheduledAt ? formatDate(form.scheduledAt) : "Immediately"}</p></div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-5">
          <Card className="border-border/70 bg-card/80 shadow-sm backdrop-blur">
            <CardContent className="grid gap-3 p-4 md:grid-cols-[1fr_170px_190px]">
              <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search title, content, category..." className="pl-9" /></div>
              <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All statuses</SelectItem><SelectItem value="sent">Sent</SelectItem><SelectItem value="scheduled">Scheduled</SelectItem><SelectItem value="failed">Failed</SelectItem></SelectContent></Select>
              <Select value={audienceFilter} onValueChange={setAudienceFilter}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All audiences</SelectItem><SelectItem value="all_staff">All staff</SelectItem><SelectItem value="school_leadership">School leadership</SelectItem><SelectItem value="teachers">Teachers</SelectItem><SelectItem value="finance_hr">Finance & HR</SelectItem><SelectItem value="support_staff">Support staff</SelectItem></SelectContent></Select>
            </CardContent>
          </Card>

          <div className="grid gap-4 xl:grid-cols-2">
            {filtered.map((broadcast) => (
              <Card key={broadcast.id} className="border-border/70 bg-card/80 shadow-sm backdrop-blur">
                <CardContent className="p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="mb-2 flex flex-wrap gap-2">{statusBadge(broadcast.status)}<Badge variant="outline" className="rounded-full capitalize">{broadcast.channel}</Badge><Badge variant="outline" className="rounded-full">{audienceLabel(broadcast.targetAudience)}</Badge></div>
                      <h3 className="text-lg font-semibold">{broadcast.title}</h3>
                      <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted-foreground">{broadcast.content}</p>
                    </div>
                  </div>
                  <div className="mt-5 grid gap-3 rounded-2xl border bg-muted/25 p-3 text-sm sm:grid-cols-4">
                    <div><p className="text-muted-foreground">Recipients</p><p className="font-semibold">{broadcast.deliveryCount}</p></div>
                    <div><p className="text-muted-foreground">Delivered</p><p className="font-semibold">{broadcast.sentCount}</p></div>
                    <div><p className="text-muted-foreground">Pending</p><p className="font-semibold">{broadcast.pendingCount}</p></div>
                    <div><p className="text-muted-foreground">Failed</p><p className="font-semibold">{broadcast.failedCount}</p></div>
                  </div>
                  <p className="mt-4 text-xs text-muted-foreground">By {broadcast.createdByName} - {broadcast.sentAt ? `Sent ${formatDate(broadcast.sentAt)}` : broadcast.scheduledAt ? `Scheduled ${formatDate(broadcast.scheduledAt)}` : `Created ${formatDate(broadcast.createdAt)}`}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          {!filtered.length ? <div className="rounded-3xl border border-dashed p-10 text-center text-sm text-muted-foreground">No broadcasts match the selected filters.</div> : null}
        </TabsContent>

        <TabsContent value="audience" className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.recipientSummary.map((item) => (
            <Card key={item.role} className="border-border/70 bg-card/80 shadow-sm backdrop-blur">
              <CardContent className="flex items-center justify-between gap-4 p-5">
                <div><p className="font-medium capitalize">{item.role.replace(/_/g, " ")}</p><p className="text-sm text-muted-foreground">Eligible staff recipient group</p></div>
                <Badge className="rounded-full bg-primary/10 text-primary hover:bg-primary/10">{item.total}</Badge>
              </CardContent>
            </Card>
          ))}
          {!data.recipientSummary.length ? <div className="rounded-3xl border border-dashed p-10 text-center text-sm text-muted-foreground md:col-span-2 xl:col-span-3">No staff recipients found yet.</div> : null}
        </TabsContent>
      </Tabs>
    </div>
  );
}
