"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { AlertCircle, Archive, CheckCircle2, ChevronLeft, ChevronRight, Copy, Download, Filter, Fingerprint, RefreshCw, Search, ShieldAlert, UserCheck, XCircle } from "lucide-react";
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
  filters: { query: string; status: string; severity: string; resource: string; actor: string; startDate: string; endDate: string };
  retention: { policy: string; immutable: boolean; integrity: string; exportLimit: number };
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

function LoadingState() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-48 rounded-3xl" />
      <div className="grid gap-4 md:grid-cols-4">{Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-28 rounded-3xl" />)}</div>
      <Skeleton className="h-96 rounded-3xl" />
    </div>
  );
}

export default function OwnerAuditPage() {
  const params = useParams<{ tenant?: string }>();
  const tenantSlug = params?.tenant || "";
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

  const fetchData = React.useCallback(async (silent = false) => {
    if (!tenantSlug) return;
    if (silent) setRefreshing(true);
    else setLoading(true);
    setError("");
    try {
      const search = new URLSearchParams({
        tenant: tenantSlug,
        page: String(page),
        pageSize,
        query,
        status,
        severity,
        resource,
        actor,
        startDate,
        endDate,
      });
      const response = await fetch(`/api/tenant/owner/audit?${search.toString()}`, { credentials: "include", cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || "Failed to load owner audit logs");
      setData(payload);
    } catch (fetchError) {
      const message = fetchError instanceof Error ? fetchError.message : "Failed to load owner audit logs";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [actor, endDate, page, pageSize, query, resource, severity, startDate, status, tenantSlug]);

  React.useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const resources = React.useMemo(() => Array.from(new Set([...(data?.analytics.byResource || []).map((item) => item.name), ...(data?.logs || []).map((log) => log.resource)])).sort(), [data?.analytics.byResource, data?.logs]);
  const logs = data?.logs || [];

  const resetFilters = () => {
    setQuery("");
    setStatus("all");
    setSeverity("all");
    setResource("all");
    setActor("");
    setStartDate("");
    setEndDate("");
    setPage(1);
  };

  const exportLogs = (format: "json" | "csv") => {
    if (!tenantSlug) return;
    const search = new URLSearchParams({
      tenant: tenantSlug,
      export: format,
      query,
      status,
      severity,
      resource,
      actor,
      startDate,
      endDate,
    });
    window.open(`/api/tenant/owner/audit?${search.toString()}`, "_blank", "noopener,noreferrer");
  };

  if (loading) return <LoadingState />;

  if (error || !data) {
    return (
      <Alert variant="destructive" className="rounded-3xl">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Audit logs unavailable</AlertTitle>
        <AlertDescription className="mt-2 flex items-center justify-between gap-4">
          <span>{error || "The owner audit page could not be loaded."}</span>
          <Button variant="outline" onClick={() => fetchData()}>Retry</Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-border/70 bg-card/80 p-6 shadow-sm backdrop-blur">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <Badge className="rounded-full bg-primary/10 text-primary hover:bg-primary/10">System governance</Badge>
            <h1 className="mt-4 flex items-center gap-3 text-3xl font-semibold tracking-tight">
              <Archive className="h-8 w-8 text-primary" />
              Audit & Logs
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
              Review tenant activity, risky actions, actor history, resource changes, IP addresses, and operational events for {data.school.name}.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="rounded-2xl" disabled={refreshing} onClick={() => fetchData(true)}>
              <RefreshCw className={cn("mr-2 h-4 w-4", refreshing && "animate-spin")} />
              Refresh
            </Button>
            <Button className="rounded-2xl" onClick={() => {
              navigator.clipboard.writeText(JSON.stringify(logs, null, 2));
              toast.success("Current audit page copied");
            }}>
              <Copy className="mr-2 h-4 w-4" />
              Copy Page
            </Button>
            <Button variant="outline" className="rounded-2xl" onClick={() => exportLogs("csv")}>
              <Download className="mr-2 h-4 w-4" />
              CSV
            </Button>
            <Button variant="outline" className="rounded-2xl" onClick={() => exportLogs("json")}>
              <Download className="mr-2 h-4 w-4" />
              JSON
            </Button>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {[
          { label: "Total events", value: data.summaries.total, detail: "Matching server filters", icon: Archive },
          { label: "Successful", value: data.summaries.success, detail: "Matching completed events", icon: CheckCircle2 },
          { label: "Failed", value: data.summaries.failed, detail: "Matching failed/error events", icon: XCircle },
          { label: "High risk", value: data.summaries.highRisk, detail: "Matching high/critical events", icon: ShieldAlert },
          { label: "Actors", value: data.summaries.uniqueActors, detail: "Matching unique identities", icon: UserCheck },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="border-border/70 bg-card/80 shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div><p className="text-sm text-muted-foreground">{stat.label}</p><p className="mt-2 text-2xl font-semibold">{stat.value.toLocaleString()}</p></div>
                  <div className="rounded-2xl bg-primary/10 p-3 text-primary"><Icon className="h-5 w-5" /></div>
                </div>
                <p className="mt-4 text-xs text-muted-foreground">{stat.detail}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex flex-col gap-3 rounded-3xl border bg-card/80 p-4 shadow-sm xl:flex-row xl:items-center xl:justify-between">
        <div className="relative w-full xl:max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(event) => { setPage(1); setQuery(event.target.value); }} placeholder="Search action, actor, resource, IP..." className="rounded-2xl pl-9" />
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={status} onValueChange={(value) => { setPage(1); setStatus(value); }}>
            <SelectTrigger className="w-40 rounded-2xl"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">All status</SelectItem><SelectItem value="success">Success</SelectItem><SelectItem value="failed">Failed</SelectItem><SelectItem value="error">Error</SelectItem></SelectContent>
          </Select>
          <Select value={severity} onValueChange={(value) => { setPage(1); setSeverity(value); }}>
            <SelectTrigger className="w-40 rounded-2xl"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">All severity</SelectItem><SelectItem value="critical">Critical</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="low">Low</SelectItem></SelectContent>
          </Select>
          <Select value={resource} onValueChange={(value) => { setPage(1); setResource(value); }}>
            <SelectTrigger className="w-48 rounded-2xl"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">All resources</SelectItem>{resources.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-3 rounded-3xl border bg-card/80 p-4 shadow-sm md:grid-cols-2 xl:grid-cols-[1fr_1fr_180px_140px]">
        <Input value={actor} onChange={(event) => { setPage(1); setActor(event.target.value); }} placeholder="Filter by actor name, email, or id" className="rounded-2xl" />
        <div className="grid grid-cols-2 gap-2">
          <Input type="date" value={startDate} onChange={(event) => { setPage(1); setStartDate(event.target.value); }} className="rounded-2xl" />
          <Input type="date" value={endDate} onChange={(event) => { setPage(1); setEndDate(event.target.value); }} className="rounded-2xl" />
        </div>
        <Select value={pageSize} onValueChange={(value) => { setPage(1); setPageSize(value); }}>
          <SelectTrigger className="rounded-2xl"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="10">10 per page</SelectItem>
            <SelectItem value="25">25 per page</SelectItem>
            <SelectItem value="50">50 per page</SelectItem>
            <SelectItem value="100">100 per page</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" className="rounded-2xl" onClick={resetFilters}>Reset filters</Button>
      </div>

      <Tabs defaultValue="events" className="space-y-5">
        <TabsList className="mx-auto flex w-fit rounded-full bg-muted/60 p-1">
          <TabsTrigger value="events" className="rounded-full px-5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Events</TabsTrigger>
          <TabsTrigger value="analytics" className="rounded-full px-5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Analytics</TabsTrigger>
          <TabsTrigger value="risk" className="rounded-full px-5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Risk Review</TabsTrigger>
        </TabsList>

        <TabsContent value="events" className="space-y-4">
          <div className="flex flex-col gap-3 rounded-3xl border bg-card/80 p-4 text-sm text-muted-foreground shadow-sm md:flex-row md:items-center md:justify-between">
            <span>
              Showing page {data.pagination.page} of {data.pagination.totalPages} ({data.pagination.total.toLocaleString()} matching events)
            </span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="rounded-xl" disabled={!data.pagination.hasPreviousPage || refreshing} onClick={() => setPage((current) => Math.max(1, current - 1))}>
                <ChevronLeft className="mr-1 h-4 w-4" />
                Previous
              </Button>
              <Button variant="outline" size="sm" className="rounded-xl" disabled={!data.pagination.hasNextPage || refreshing} onClick={() => setPage((current) => current + 1)}>
                Next
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </div>
          {logs.map((log) => (
            <Card key={log.id} className="border-border/70 bg-card/80">
              <CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{log.action}</p>
                    <Badge variant="outline" className={badgeClass(log.status)}>{log.status}</Badge>
                    <Badge variant="outline" className={badgeClass(log.severity)}>{log.severity}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{log.resource}{log.resourceId ? ` / ${log.resourceId}` : ""} - {formatDate(log.createdAt)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{log.actorName} {log.actorEmail ? `(${log.actorEmail})` : ""} - {log.ipAddress || "No IP recorded"}</p>
                  <p className="mt-2 flex items-center gap-2 break-all text-[11px] text-muted-foreground">
                    <Fingerprint className="h-3.5 w-3.5 shrink-0 text-primary" />
                    Integrity SHA-256: {log.integrityHash}
                  </p>
                </div>
                <div className="rounded-2xl border bg-background/60 p-3 text-xs text-muted-foreground lg:max-w-md">
                  <pre className="max-h-24 overflow-auto whitespace-pre-wrap">{JSON.stringify(log.changes || {}, null, 2)}</pre>
                </div>
              </CardContent>
            </Card>
          ))}
          {!logs.length ? <Card className="border-border/70 bg-card/80"><CardContent className="p-8 text-center text-muted-foreground">No logs match the current filters.</CardContent></Card> : null}
        </TabsContent>

        <TabsContent value="analytics" className="grid gap-4 lg:grid-cols-3">
          <SummaryList title="By status" items={data.analytics.byStatus} />
          <SummaryList title="By resource" items={data.analytics.byResource} />
          <SummaryList title="Top actors" items={data.analytics.byActor} />
        </TabsContent>

        <TabsContent value="risk" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="border-border/70 bg-card/80">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><ShieldAlert className="h-5 w-5 text-primary" /> Retention</CardTitle>
                <CardDescription>{data.retention.policy}</CardDescription>
              </CardHeader>
            </Card>
            <Card className="border-border/70 bg-card/80">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Fingerprint className="h-5 w-5 text-primary" /> Integrity</CardTitle>
                <CardDescription>{data.retention.integrity}. Every visible row includes a deterministic hash for verification and exports.</CardDescription>
              </CardHeader>
            </Card>
            <Card className="border-border/70 bg-card/80">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Download className="h-5 w-5 text-primary" /> Exports</CardTitle>
                <CardDescription>CSV and JSON exports include up to {data.retention.exportLimit.toLocaleString()} matching events using the active filters.</CardDescription>
              </CardHeader>
            </Card>
          </div>
          {logs.filter((log) => ["critical", "high"].includes(log.severity)).map((log) => (
            <Alert key={log.id} className="rounded-3xl border-destructive/30 bg-destructive/5">
              <ShieldAlert className="h-4 w-4 text-destructive" />
              <AlertTitle>{log.action}</AlertTitle>
              <AlertDescription>{log.actorName} triggered a {log.severity} event on {log.resource} at {formatDate(log.createdAt)}.</AlertDescription>
            </Alert>
          ))}
          {!logs.filter((log) => ["critical", "high"].includes(log.severity)).length ? (
            <Card className="border-border/70 bg-card/80"><CardContent className="p-8 text-center text-muted-foreground">No high-risk events on this page.</CardContent></Card>
          ) : null}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SummaryList({ title, items }: { title: string; items: Array<{ name: string; total: number }> }) {
  const max = Math.max(...items.map((item) => item.total), 1);
  return (
    <Card className="border-border/70 bg-card/80">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Filter className="h-5 w-5 text-primary" /> {title}</CardTitle>
        <CardDescription>Audit distribution summary.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item) => (
          <div key={item.name} className="space-y-1">
            <div className="flex justify-between text-sm"><span className="capitalize">{item.name}</span><span>{item.total}</span></div>
            <div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary" style={{ width: `${Math.round((item.total / max) * 100)}%` }} /></div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
