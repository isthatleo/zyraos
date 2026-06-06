"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { AlertCircle, CheckCircle2, ChevronLeft, ChevronRight, Download, MessageSquareText, PhoneOff, RefreshCw, RotateCw, Search, Send, ShieldCheck, XCircle } from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type Delivery = {
  id: string;
  broadcastId: string;
  title: string;
  content: string;
  recipientName: string;
  recipientEmail: string;
  role: string;
  phone: string;
  status: string;
  error: string;
  externalReference: string;
  createdAt: string | null;
  deliveredAt: string | null;
  failedAt: string | null;
  smsCount: number;
  costEstimate: number;
};

type Payload = {
  deliveries: Delivery[];
  summaries: { total: number; sent: number; delivered: number; pending: number; failed: number; missingPhone: number; estimatedCost: number };
  analytics: { byRole: Array<{ name: string; total: number }> };
  provider: { ok: boolean; provider: string; status: string; message: string; checkedAt: string };
  pagination: { page: number; pageSize: number; total: number; totalPages: number; hasNextPage: boolean; hasPreviousPage: boolean };
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
  if (["sent", "delivered", "healthy", "configured"].includes(status)) return "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  if (["pending", "disabled"].includes(status)) return "border-primary/25 bg-primary/10 text-primary";
  if (["failed", "bounced", "missing_credentials"].includes(status)) return "border-destructive/25 bg-destructive/10 text-destructive";
  return "border-border bg-muted text-muted-foreground";
}

export default function AdminSmsReportsPage() {
  const params = useParams<{ tenant?: string }>();
  const tenant = params?.tenant || "";
  const [data, setData] = React.useState<Payload | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [busy, setBusy] = React.useState("");
  const [error, setError] = React.useState("");
  const [query, setQuery] = React.useState("");
  const [status, setStatus] = React.useState("all");
  const [role, setRole] = React.useState("all");
  const [startDate, setStartDate] = React.useState("");
  const [endDate, setEndDate] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState("25");

  const load = React.useCallback(async (silent = false) => {
    if (!tenant) return;
    if (silent) setRefreshing(true);
    else setLoading(true);
    setError("");
    try {
      const search = new URLSearchParams({ tenant, page: String(page), pageSize, query, status, role, startDate, endDate });
      const response = await fetch(`/api/tenant/admin/sms-reports?${search.toString()}`, { credentials: "include", cache: "no-store" });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || "Failed to load SMS reports");
      setData(payload);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load SMS reports";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [endDate, page, pageSize, query, role, startDate, status, tenant]);

  React.useEffect(() => { void load(); }, [load]);

  function resetFilters() {
    setQuery("");
    setStatus("all");
    setRole("all");
    setStartDate("");
    setEndDate("");
    setPage(1);
  }

  function exportReports(format: "csv" | "json") {
    const search = new URLSearchParams({ tenant, export: format, query, status, role, startDate, endDate });
    window.open(`/api/tenant/admin/sms-reports?${search.toString()}`, "_blank", "noopener,noreferrer");
  }

  async function runAction(action: "provider_status" | "reconcile", deliveryId?: string) {
    setBusy(action);
    try {
      const response = await fetch(`/api/tenant/admin/sms-reports?tenant=${encodeURIComponent(tenant)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action, deliveryId }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || "SMS report action failed");
      toast.success(action === "provider_status" ? payload.provider?.message || "Provider checked" : `Reconciled ${payload.reconciled || 0} records`);
      void load(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "SMS report action failed");
    } finally {
      setBusy("");
    }
  }

  async function retry(deliveryId: string) {
    setBusy(deliveryId);
    try {
      const response = await fetch(`/api/tenant/admin/sms-reports?tenant=${encodeURIComponent(tenant)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "retry", deliveryId }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || payload?.result?.message || "SMS retry failed");
      toast.success(payload.result?.message || "SMS retry submitted");
      void load(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "SMS retry failed");
    } finally {
      setBusy("");
    }
  }

  if (loading) return <div className="space-y-6"><Skeleton className="h-48 rounded-3xl" /><div className="grid gap-4 md:grid-cols-4">{Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-28 rounded-3xl" />)}</div><Skeleton className="h-96 rounded-3xl" /></div>;

  if (error || !data) {
    return (
      <Alert variant="destructive" className="rounded-3xl">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>SMS reports unavailable</AlertTitle>
        <AlertDescription className="mt-2 flex items-center justify-between gap-4">
          <span>{error || "The SMS reports page could not be loaded."}</span>
          <Button variant="outline" onClick={() => void load()}>Retry</Button>
        </AlertDescription>
      </Alert>
    );
  }

  const roles = Array.from(new Set(data.analytics.byRole.map((item) => item.name).filter(Boolean))).sort();

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <Badge variant="outline" className="rounded-full">Communication reporting</Badge>
            <h1 className="mt-4 flex items-center gap-3 text-3xl font-bold tracking-tight"><MessageSquareText className="h-8 w-8 text-orange-600" />SMS Reports</h1>
            <p className="mt-2 max-w-3xl text-sm text-muted-foreground">Tenant-scoped SMS delivery logs, provider health, retries, reconciliation, cost estimates, and exports.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" disabled={refreshing} onClick={() => void load(true)}><RefreshCw className={cn("mr-2 h-4 w-4", refreshing && "animate-spin")} />Refresh</Button>
            <Button variant="outline" disabled={busy === "provider_status"} onClick={() => runAction("provider_status")}><ShieldCheck className="mr-2 h-4 w-4" />Provider Check</Button>
            <Button variant="outline" disabled={busy === "reconcile"} onClick={() => runAction("reconcile")}><RotateCw className="mr-2 h-4 w-4" />Reconcile</Button>
            <Button variant="outline" onClick={() => exportReports("csv")}><Download className="mr-2 h-4 w-4" />CSV</Button>
            <Button variant="outline" onClick={() => exportReports("json")}><Download className="mr-2 h-4 w-4" />JSON</Button>
          </div>
        </div>
      </section>

      <Alert className="rounded-3xl border-2">
        <ShieldCheck className="h-4 w-4" />
        <AlertTitle>Provider status: {data.provider.provider}</AlertTitle>
        <AlertDescription className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className={cn("rounded-full", badgeClass(data.provider.status))}>{data.provider.status}</Badge>
          <span>{data.provider.message}</span>
        </AlertDescription>
      </Alert>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <Metric icon={MessageSquareText} label="Total" value={data.summaries.total} />
        <Metric icon={Send} label="Sent" value={data.summaries.sent} />
        <Metric icon={CheckCircle2} label="Delivered" value={data.summaries.delivered} />
        <Metric icon={RefreshCw} label="Pending" value={data.summaries.pending} />
        <Metric icon={XCircle} label="Failed" value={data.summaries.failed} />
        <Metric icon={PhoneOff} label="No phone" value={data.summaries.missingPhone} />
      </div>

      <Card className="border-2">
        <CardContent className="space-y-3 p-4">
          <div className="grid gap-3 xl:grid-cols-[1fr_160px_180px_170px_170px_110px]">
            <div className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input value={query} onChange={(event) => { setPage(1); setQuery(event.target.value); }} placeholder="Search title, recipient, phone, error..." className="pl-9" /></div>
            <Select value={status} onValueChange={(value) => { setPage(1); setStatus(value); }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All status</SelectItem><SelectItem value="pending">Pending</SelectItem><SelectItem value="sent">Sent</SelectItem><SelectItem value="delivered">Delivered</SelectItem><SelectItem value="failed">Failed</SelectItem><SelectItem value="bounced">Bounced</SelectItem></SelectContent></Select>
            <Select value={role} onValueChange={(value) => { setPage(1); setRole(value); }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All roles</SelectItem>{roles.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select>
            <Input type="date" value={startDate} onChange={(event) => { setPage(1); setStartDate(event.target.value); }} />
            <Input type="date" value={endDate} onChange={(event) => { setPage(1); setEndDate(event.target.value); }} />
            <Button variant="outline" onClick={resetFilters}>Reset</Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-2">
        <CardHeader>
          <CardTitle>Delivery Log</CardTitle>
          <CardDescription>Estimated page cost: {data.summaries.estimatedCost.toLocaleString(undefined, { style: "currency", currency: "USD" })}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.deliveries.map((delivery) => (
            <div key={delivery.id} className="grid gap-4 rounded-2xl border p-4 xl:grid-cols-[1fr_220px_160px] xl:items-center">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="rounded-full">{delivery.role || "unknown"}</Badge>
                  <Badge variant="outline" className={cn("rounded-full capitalize", badgeClass(delivery.status))}>{delivery.status}</Badge>
                  <Badge variant="outline" className="rounded-full">{delivery.smsCount} SMS</Badge>
                </div>
                <h3 className="mt-3 font-bold">{delivery.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{delivery.recipientName} · {delivery.phone || delivery.recipientEmail || "No contact"}</p>
                {delivery.externalReference ? <p className="mt-1 text-xs text-muted-foreground">Provider ref: {delivery.externalReference}</p> : null}
                {delivery.error ? <p className="mt-2 text-sm text-destructive">{delivery.error}</p> : null}
              </div>
              <div className="text-sm text-muted-foreground">
                <p>Created: {formatDate(delivery.createdAt)}</p>
                <p>Delivered: {formatDate(delivery.deliveredAt)}</p>
                <p>Failed: {formatDate(delivery.failedAt)}</p>
              </div>
              <div className="flex flex-wrap gap-2 xl:justify-end">
                <Button variant="outline" disabled={!delivery.phone || busy === delivery.id || !["failed", "pending", "bounced"].includes(delivery.status)} onClick={() => retry(delivery.id)}>
                  {busy === delivery.id ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}Retry
                </Button>
              </div>
            </div>
          ))}
          {!data.deliveries.length ? <div className="rounded-3xl border border-dashed p-10 text-center text-sm text-muted-foreground">No SMS reports match the selected filters.</div> : null}
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3 rounded-3xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">Page {data.pagination.page} of {data.pagination.totalPages} · {data.pagination.total.toLocaleString()} matching deliveries</p>
        <div className="flex gap-2">
          <Select value={pageSize} onValueChange={(value) => { setPage(1); setPageSize(value); }}><SelectTrigger className="w-28"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="10">10</SelectItem><SelectItem value="25">25</SelectItem><SelectItem value="50">50</SelectItem><SelectItem value="100">100</SelectItem></SelectContent></Select>
          <Button variant="outline" disabled={!data.pagination.hasPreviousPage} onClick={() => setPage((current) => Math.max(1, current - 1))}><ChevronLeft className="h-4 w-4" /></Button>
          <Button variant="outline" disabled={!data.pagination.hasNextPage} onClick={() => setPage((current) => current + 1)}><ChevronRight className="h-4 w-4" /></Button>
        </div>
      </div>
    </div>
  );
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
