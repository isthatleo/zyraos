"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { AlertCircle, Archive, CheckCircle2, ChevronLeft, ChevronRight, CloudUpload, Copy, Download, RefreshCw, Search, ShieldAlert, Trash2, UserCheck, XCircle } from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

type AuditLog = {
  id: string;
  adminId: string;
  action: string;
  resource: string;
  resourceId: string;
  changes: Record<string, unknown>;
  ipAddress: string;
  userAgent: string;
  status: string;
  severity: string;
  createdAt: string | null;
  actorName: string;
  actorEmail: string;
  actorRole: string;
  integrityHash: string;
};

type AuditPayload = {
  school: { name: string; slug: string; type: string; status: string };
  logs: AuditLog[];
  summaries: { total: number; success: number; failed: number; highRisk: number; uniqueActors: number };
  analytics: {
    byStatus: Array<{ name: string; total: number }>;
    byResource: Array<{ name: string; total: number }>;
    byActor: Array<{ name: string; total: number }>;
    daily: Array<{ date: string | null; total: number }>;
  };
  pagination: { page: number; pageSize: number; total: number; totalPages: number; hasNextPage: boolean; hasPreviousPage: boolean };
  retention: { policy: string; retentionDays: number; immutable: boolean; integrity: string; exportLimit: number; archiveProvider?: string };
  integrity: { checked: number; verified: number; failed: number; algorithm: string };
  generatedAt: string;
};

function formatDate(value: string | null) {
  if (!value) return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not set";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(date);
}

function badgeClass(value: string) {
  const status = value.toLowerCase();
  if (["success", "low"].includes(status)) return "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  if (["medium", "warning"].includes(status)) return "border-primary/25 bg-primary/10 text-primary";
  if (["high", "critical", "failed", "error"].includes(status)) return "border-destructive/25 bg-destructive/10 text-destructive";
  return "border-border bg-muted text-muted-foreground";
}

export default function AdminAuditPage() {
  const params = useParams<{ tenant?: string }>();
  const tenant = params?.tenant || "";
  const [data, setData] = React.useState<AuditPayload | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState("");
  const [query, setQuery] = React.useState("");
  const [status, setStatus] = React.useState("all");
  const [severity, setSeverity] = React.useState("all");
  const [resource, setResource] = React.useState("all");
  const [actor, setActor] = React.useState("");
  const [startDate, setStartDate] = React.useState("");
  const [endDate, setEndDate] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState("25");
  const [busyAction, setBusyAction] = React.useState("");
  const [actionResult, setActionResult] = React.useState<string>("");

  const fetchData = React.useCallback(async (silent = false) => {
    if (!tenant) return;
    if (silent) setRefreshing(true);
    else setLoading(true);
    setError("");
    try {
      const search = new URLSearchParams({ tenant, page: String(page), pageSize, query, status, severity, resource, actor, startDate, endDate });
      const response = await fetch(`/api/tenant/admin/audit?${search.toString()}`, { credentials: "include", cache: "no-store" });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || "Failed to load audit logs");
      setData(payload);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load audit logs";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [actor, endDate, page, pageSize, query, resource, severity, startDate, status, tenant]);

  React.useEffect(() => { void fetchData(); }, [fetchData]);

  const logs = data?.logs || [];
  const resources = React.useMemo(() => Array.from(new Set([...(data?.analytics.byResource || []).map((item) => item.name), ...logs.map((log) => log.resource)])).sort(), [data?.analytics.byResource, logs]);

  function resetFilters() {
    setQuery("");
    setStatus("all");
    setSeverity("all");
    setResource("all");
    setActor("");
    setStartDate("");
    setEndDate("");
    setPage(1);
  }

  function exportLogs(format: "json" | "csv") {
    const search = new URLSearchParams({ tenant, export: format, query, status, severity, resource, actor, startDate, endDate });
    window.open(`/api/tenant/admin/audit?${search.toString()}`, "_blank", "noopener,noreferrer");
  }

  async function runAuditAction(action: "verify_integrity" | "prune_retention" | "archive_retention") {
    if (action === "prune_retention" && !window.confirm(`Prune logs older than ${data?.retention.retentionDays || 730} days? This is owner-only and will be audit logged.`)) return;
    if (action === "archive_retention" && !window.confirm(`Archive logs older than ${data?.retention.retentionDays || 730} days to ${data?.retention.archiveProvider || "local"} storage?`)) return;
    setBusyAction(action);
    setActionResult("");
    try {
      const response = await fetch(`/api/tenant/admin/audit?tenant=${encodeURIComponent(tenant)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || "Audit action failed");
      if (action === "verify_integrity") {
        setActionResult(`Verified ${payload.integrity?.verified || 0}/${payload.integrity?.checked || 0} rows; failed ${payload.integrity?.failed || 0}.`);
      } else if (action === "archive_retention") {
        setActionResult(payload.archived ? `Archived ${payload.archived} rows. ${payload.archive?.message || ""}` : payload.message || "No rows required archival.");
      } else {
        setActionResult(`Pruned ${payload.deleted || 0} rows older than ${payload.cutoff || "retention cutoff"}.`);
        void fetchData(true);
      }
      toast.success(action === "verify_integrity" ? "Integrity verified" : action === "archive_retention" ? "Cold archive complete" : "Retention pruning complete");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Audit action failed";
      setActionResult(message);
      toast.error(message);
    } finally {
      setBusyAction("");
    }
  }

  if (loading) return <div className="space-y-6"><Skeleton className="h-48 rounded-3xl" /><div className="grid gap-4 md:grid-cols-5">{Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} className="h-28 rounded-3xl" />)}</div><Skeleton className="h-96 rounded-3xl" /></div>;

  if (error || !data) {
    return (
      <Alert variant="destructive" className="rounded-3xl">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Audit logs unavailable</AlertTitle>
        <AlertDescription className="mt-2 flex items-center justify-between gap-4">
          <span>{error || "The audit page could not be loaded."}</span>
          <Button variant="outline" onClick={() => void fetchData()}>Retry</Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-border/70 bg-card/80 p-6 shadow-sm backdrop-blur">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <Badge className="rounded-full bg-primary/10 text-primary hover:bg-primary/10">School admin governance</Badge>
            <h1 className="mt-4 flex items-center gap-3 text-3xl font-semibold tracking-tight"><Archive className="h-8 w-8 text-primary" />Audit & Logs</h1>
            <p className="mt-2 max-w-3xl text-sm text-muted-foreground">Tenant-scoped activity logs, risky actions, actor history, resource changes, IP addresses, and operational events for {data.school.name}.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="rounded-2xl" disabled={refreshing} onClick={() => void fetchData(true)}><RefreshCw className={cn("mr-2 h-4 w-4", refreshing && "animate-spin")} />Refresh</Button>
            <Button className="rounded-2xl" onClick={() => { navigator.clipboard.writeText(JSON.stringify(logs, null, 2)); toast.success("Current audit page copied"); }}><Copy className="mr-2 h-4 w-4" />Copy Page</Button>
            <Button variant="outline" className="rounded-2xl" onClick={() => exportLogs("csv")}><Download className="mr-2 h-4 w-4" />CSV</Button>
            <Button variant="outline" className="rounded-2xl" onClick={() => exportLogs("json")}><Download className="mr-2 h-4 w-4" />JSON</Button>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {[
          { label: "Total events", value: data.summaries.total, detail: "Matching server filters", icon: Archive },
          { label: "Successful", value: data.summaries.success, detail: "Completed events", icon: CheckCircle2 },
          { label: "Failed", value: data.summaries.failed, detail: "Failed/error events", icon: XCircle },
          { label: "High risk", value: data.summaries.highRisk, detail: "High/critical events", icon: ShieldAlert },
          { label: "Actors", value: data.summaries.uniqueActors, detail: "Unique identities", icon: UserCheck },
        ].map((stat) => {
          const Icon = stat.icon;
          return <Card key={stat.label} className="border-border/70 bg-card/80 shadow-sm"><CardContent className="p-5"><div className="flex items-start justify-between"><div><p className="text-sm text-muted-foreground">{stat.label}</p><p className="mt-2 text-2xl font-semibold">{stat.value.toLocaleString()}</p></div><div className="rounded-2xl bg-primary/10 p-3 text-primary"><Icon className="h-5 w-5" /></div></div><p className="mt-4 text-xs text-muted-foreground">{stat.detail}</p></CardContent></Card>;
        })}
      </div>

      <Card className="border-2">
        <CardContent className="space-y-3 p-4">
          <div className="grid gap-3 xl:grid-cols-[1fr_160px_160px_190px]">
            <div className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input value={query} onChange={(event) => { setPage(1); setQuery(event.target.value); }} placeholder="Search action, actor, resource, IP..." className="pl-9" /></div>
            <Select value={status} onValueChange={(value) => { setPage(1); setStatus(value); }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All status</SelectItem><SelectItem value="success">Success</SelectItem><SelectItem value="failed">Failed</SelectItem><SelectItem value="error">Error</SelectItem></SelectContent></Select>
            <Select value={severity} onValueChange={(value) => { setPage(1); setSeverity(value); }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All severity</SelectItem><SelectItem value="critical">Critical</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="low">Low</SelectItem></SelectContent></Select>
            <Select value={resource} onValueChange={(value) => { setPage(1); setResource(value); }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All resources</SelectItem>{resources.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1fr_180px_180px_120px]">
            <Input value={actor} onChange={(event) => { setPage(1); setActor(event.target.value); }} placeholder="Actor name, email, or id" />
            <Input type="date" value={startDate} onChange={(event) => { setPage(1); setStartDate(event.target.value); }} />
            <Input type="date" value={endDate} onChange={(event) => { setPage(1); setEndDate(event.target.value); }} />
            <Button variant="outline" onClick={resetFilters}>Reset</Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="events" className="space-y-5">
        <TabsList className="rounded-full bg-muted/70 p-1"><TabsTrigger value="events" className="rounded-full">Events</TabsTrigger><TabsTrigger value="analytics" className="rounded-full">Analytics</TabsTrigger><TabsTrigger value="integrity" className="rounded-full">Integrity</TabsTrigger></TabsList>
        <TabsContent value="events" className="space-y-4">
          {logs.map((log) => (
            <Card key={log.id} className="border-2">
              <CardContent className="grid gap-4 p-5 xl:grid-cols-[1fr_260px]">
                <div>
                  <div className="flex flex-wrap items-center gap-2"><Badge variant="outline" className={cn("rounded-full capitalize", badgeClass(log.status))}>{log.status}</Badge><Badge variant="outline" className={cn("rounded-full capitalize", badgeClass(log.severity))}>{log.severity}</Badge><Badge variant="outline" className="rounded-full">{log.resource}</Badge></div>
                  <h3 className="mt-3 text-lg font-bold">{log.action.replace(/[_-]/g, " ")}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{log.actorName} · {log.actorEmail || log.adminId}</p>
                  <p className="mt-2 text-xs text-muted-foreground">Resource ID: {log.resourceId || "none"} · {formatDate(log.createdAt)}</p>
                  <pre className="mt-3 max-h-36 overflow-auto rounded-2xl bg-muted/50 p-3 text-xs">{JSON.stringify(log.changes || {}, null, 2)}</pre>
                </div>
                <div className="space-y-3 rounded-2xl border bg-muted/30 p-4 text-sm">
                  <div><p className="text-muted-foreground">IP address</p><p className="font-medium">{log.ipAddress || "Not captured"}</p></div>
                  <div><p className="text-muted-foreground">Actor role</p><p className="font-medium">{log.actorRole || "Unknown"}</p></div>
                  <div><p className="text-muted-foreground">Integrity hash</p><p className="break-all font-mono text-xs">{log.integrityHash}</p></div>
                </div>
              </CardContent>
            </Card>
          ))}
          {!logs.length ? <Card className="border-dashed"><CardContent className="p-10 text-center text-sm text-muted-foreground">No audit logs match the selected filters.</CardContent></Card> : null}
          <div className="flex flex-col gap-3 rounded-3xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">Page {data.pagination.page} of {data.pagination.totalPages} · {data.pagination.total.toLocaleString()} matching events</p>
            <div className="flex gap-2">
              <Select value={pageSize} onValueChange={(value) => { setPage(1); setPageSize(value); }}><SelectTrigger className="w-28"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="10">10</SelectItem><SelectItem value="25">25</SelectItem><SelectItem value="50">50</SelectItem><SelectItem value="100">100</SelectItem></SelectContent></Select>
              <Button variant="outline" disabled={!data.pagination.hasPreviousPage} onClick={() => setPage((current) => Math.max(1, current - 1))}><ChevronLeft className="h-4 w-4" /></Button>
              <Button variant="outline" disabled={!data.pagination.hasNextPage} onClick={() => setPage((current) => current + 1)}><ChevronRight className="h-4 w-4" /></Button>
            </div>
          </div>
        </TabsContent>
        <TabsContent value="analytics" className="grid gap-4 xl:grid-cols-3">
          <AnalyticsCard title="By Status" items={data.analytics.byStatus} />
          <AnalyticsCard title="By Resource" items={data.analytics.byResource} />
          <AnalyticsCard title="By Actor" items={data.analytics.byActor} />
        </TabsContent>
        <TabsContent value="integrity" className="space-y-4">
          <Card className="border-2">
            <CardHeader>
              <CardTitle>Retention & Integrity</CardTitle>
              <CardDescription>Audit records are tenant-scoped, export events are logged, and row hashes are verified server-side.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border p-4"><p className="text-sm text-muted-foreground">Retention policy</p><p className="mt-2 font-semibold">{data.retention.policy}</p></div>
              <div className="rounded-2xl border p-4"><p className="text-sm text-muted-foreground">Integrity</p><p className="mt-2 font-semibold">{data.integrity.verified.toLocaleString()}/{data.integrity.checked.toLocaleString()} verified</p></div>
              <div className="rounded-2xl border p-4"><p className="text-sm text-muted-foreground">Algorithm</p><p className="mt-2 font-semibold">{data.integrity.algorithm}</p></div>
              <div className="rounded-2xl border p-4"><p className="text-sm text-muted-foreground">Export limit</p><p className="mt-2 font-semibold">{data.retention.exportLimit.toLocaleString()} rows</p></div>
              <div className="rounded-2xl border p-4"><p className="text-sm text-muted-foreground">Cold archive</p><p className="mt-2 font-semibold uppercase">{data.retention.archiveProvider || "local"}</p></div>
            </CardContent>
          </Card>
          <Card className="border-2">
            <CardHeader>
              <CardTitle>Production Controls</CardTitle>
              <CardDescription>Run integrity verification and owner-only retention pruning from the server.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" disabled={busyAction === "verify_integrity"} onClick={() => runAuditAction("verify_integrity")}><ShieldAlert className="mr-2 h-4 w-4" />Verify Integrity</Button>
                <Button variant="outline" disabled={busyAction === "archive_retention"} onClick={() => runAuditAction("archive_retention")}><CloudUpload className="mr-2 h-4 w-4" />Archive Retention</Button>
                <Button variant="outline" disabled={busyAction === "prune_retention"} onClick={() => runAuditAction("prune_retention")}><Trash2 className="mr-2 h-4 w-4" />Prune Retention</Button>
              </div>
              {actionResult ? <Alert className="rounded-2xl"><CheckCircle2 className="h-4 w-4" /><AlertTitle>Audit action result</AlertTitle><AlertDescription>{actionResult}</AlertDescription></Alert> : null}
              <Alert className="rounded-2xl">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Boundary</AlertTitle>
                <AlertDescription>Retention archive and pruning are restricted to tenant owners. School admins can view, filter, copy, and export tenant logs, but cannot delete audit history.</AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function AnalyticsCard({ title, items }: { title: string; items: Array<{ name: string; total: number }> }) {
  const max = Math.max(1, ...items.map((item) => item.total));
  return (
    <Card className="border-2">
      <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {items.map((item) => (
          <div key={item.name} className="space-y-1">
            <div className="flex justify-between text-sm"><span className="capitalize">{item.name || "Unknown"}</span><span>{item.total}</span></div>
            <div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-orange-500" style={{ width: `${Math.max(4, (item.total / max) * 100)}%` }} /></div>
          </div>
        ))}
        {!items.length ? <p className="text-sm text-muted-foreground">No analytics available yet.</p> : null}
      </CardContent>
    </Card>
  );
}
