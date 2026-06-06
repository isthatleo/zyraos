"use client";

import * as React from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Building2,
  CheckCircle2,
  Clock,
  Database,
  Download,
  Loader2,
  RefreshCw,
  ShieldCheck,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

type AnalyticsData = {
  generatedAt: string;
  stats: {
    totalSchools: number;
    activeSchools: number;
    inactiveSchools: number;
    mrr: number;
    paidRevenue: number;
    outstanding: number;
    totalInvoices: number;
    overdueInvoices: number;
    platformAdmins: number;
    authUsers: number;
    credentialAccounts: number;
    activeSessions: number;
    activeSubscriptions: number;
    newSchoolsThisMonth: number;
    newSubscriptionsThisMonth: number;
    enabledModules: number;
    totalModules: number;
    auditEvents30d: number;
    failedAuditEvents: number;
    auditFailureRate: number;
    systemScore: number;
  };
  operations: {
    databaseSize: string;
    databaseBytes: number;
    tableCount: number;
    estimatedRows: number;
    dbQueryLatencyMs: number;
    connectionSecurity: string;
  };
  revenueTrend: Array<{ month: string; amount: number; invoices: number }>;
  schoolGrowth: Array<{ month: string; count: number; subscriptions: number }>;
  recentProvisionings: Array<{ month: string; count: number }>;
  planDistribution: Array<{ name: string; value: number; revenue: number; color: string }>;
  schoolTypeDistribution: Array<{ type: string; count: number }>;
  schoolStatusDistribution: Array<{ status: string; count: number }>;
  invoiceStatusDistribution: Array<{ status: string; count: number; amount: number }>;
  moduleAdoption: Array<{ moduleKey: string; moduleName: string; enabledSchools: number }>;
  topSchoolsByRevenue: Array<{ schoolId: string; schoolName: string; schoolSlug: string; revenue: number; outstanding: number; invoices: number }>;
  expiringSubscriptions: Array<{ id: string; schoolName: string; planName: string; status: string; endDate: string }>;
  recentActivity: Array<{ id: string; action: string; resource: string; status: string; createdAt: string; adminName: string }>;
  alerts: Array<{ severity: "info" | "warning" | "critical"; title: string; description: string; href: string }>;
};

function money(amount: number) {
  return new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR", maximumFractionDigits: 0 }).format(Number(amount || 0));
}

function compact(value: number) {
  return new Intl.NumberFormat("en-US", { notation: value >= 10000 ? "compact" : "standard" }).format(Number(value || 0));
}

function dateLabel(date?: string | null) {
  return date ? new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(new Date(date)) : "N/A";
}

function MetricCard({
  title,
  value,
  description,
  icon: Icon,
  tone = "default",
}: {
  title: string;
  value: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "default" | "success" | "warning" | "danger";
}) {
  const tones = {
    default: "bg-primary/10 text-primary",
    success: "bg-emerald-500/10 text-emerald-600",
    warning: "bg-amber-500/10 text-amber-600",
    danger: "bg-destructive/10 text-destructive",
  };
  return (
    <Card className="border-border/70 bg-card/95 shadow-sm">
      <CardHeader className="flex flex-row items-start justify-between gap-4 pb-2">
        <div>
          <CardDescription>{title}</CardDescription>
          <CardTitle className="mt-2 text-2xl">{value}</CardTitle>
        </div>
        <div className={cn("rounded-2xl p-3", tones[tone])}>
          <Icon className="size-5" />
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

function MetricSkeleton() {
  return (
    <Card className="border-border/70 bg-card/95 shadow-sm">
      <CardHeader className="flex flex-row items-start justify-between gap-4 pb-2">
        <div className="space-y-3">
          <div className="h-4 w-32 animate-pulse rounded-full bg-muted" />
          <div className="h-8 w-24 animate-pulse rounded-full bg-muted" />
        </div>
        <div className="size-11 animate-pulse rounded-2xl bg-muted" />
      </CardHeader>
      <CardContent><div className="h-4 w-44 animate-pulse rounded-full bg-muted" /></CardContent>
    </Card>
  );
}

async function exportFromServer(format: "csv" | "json") {
  const response = await fetch(`/api/master/analytics?export=${format}`, { cache: "no-store" });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload?.error || `Failed to export ${format.toUpperCase()}`);
  }
  const content = await response.text();
  const blob = new Blob([content], { type: format === "csv" ? "text/csv" : "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `roxan-system-analytics-${new Date().toISOString().slice(0, 10)}.${format}`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function SystemAnalyticsPage() {
  const [data, setData] = React.useState<AnalyticsData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [exporting, setExporting] = React.useState<"csv" | "json" | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const fetchAnalytics = React.useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/master/analytics", { cache: "no-store" });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Failed to load analytics");
      setData(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not load system analytics";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const handleExport = async (format: "csv" | "json") => {
    setExporting(format);
    try {
      await exportFromServer(format);
      toast.success(`Analytics ${format.toUpperCase()} exported`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Export failed");
    } finally {
      setExporting(null);
    }
  };

  React.useEffect(() => {
    void fetchAnalytics();
  }, [fetchAnalytics]);

  const stats = data?.stats;
  const operations = data?.operations;

  return (
    <div className="space-y-8 p-4 md:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">System Analytics</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Ecosystem Analytics</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Production analytics across schools, subscriptions, billing, modules, sessions, audit activity, and database operations.
          </p>
          {data?.generatedAt ? <p className="mt-2 text-xs text-muted-foreground">Last generated: {dateLabel(data.generatedAt)}</p> : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            className="rounded-full"
            onClick={() => handleExport("csv")}
            disabled={!data || exporting !== null}
          >
            {exporting === "csv" ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
            Export CSV
          </Button>
          <Button
            variant="outline"
            className="rounded-full"
            onClick={() => handleExport("json")}
            disabled={!data || exporting !== null}
          >
            {exporting === "json" ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
            Export JSON
          </Button>
          <Button variant="outline" className="rounded-full" onClick={() => fetchAnalytics(true)} disabled={refreshing}>
            <RefreshCw className={cn("size-4", refreshing && "animate-spin")} />
            Refresh Data
          </Button>
        </div>
      </div>

      {error ? (
        <Card className="border-destructive/40 bg-destructive/5 shadow-sm">
          <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold text-destructive">Could not load system analytics</p>
              <p className="mt-1 text-sm text-muted-foreground">{error}</p>
            </div>
            <Button variant="outline" onClick={() => fetchAnalytics(false)} disabled={loading}>
              <RefreshCw className={cn("size-4", loading && "animate-spin")} />
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {data?.alerts?.length ? (
        <div className="grid gap-3 md:grid-cols-3">
          {data.alerts.map((alert) => (
            <Link key={alert.title} href={alert.href} className={cn(
              "rounded-2xl border p-4 transition-colors hover:bg-muted/60",
              alert.severity === "critical" && "border-destructive/30 bg-destructive/10",
              alert.severity === "warning" && "border-amber-500/30 bg-amber-500/10"
            )}>
              <div className="flex items-start gap-3">
                <AlertTriangle className={cn("mt-0.5 size-5", alert.severity === "critical" ? "text-destructive" : "text-amber-600")} />
                <div>
                  <p className="font-medium">{alert.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{alert.description}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {loading && !stats ? (
          <>
            <MetricSkeleton />
            <MetricSkeleton />
            <MetricSkeleton />
            <MetricSkeleton />
            <MetricSkeleton />
            <MetricSkeleton />
            <MetricSkeleton />
            <MetricSkeleton />
          </>
        ) : stats ? (
          <>
          <MetricCard title="Estimated MRR" value={money(stats.mrr)} description={`${stats.activeSubscriptions} active subscriptions`} icon={TrendingUp} tone="success" />
          <MetricCard title="Total Environments" value={String(stats.totalSchools)} description={`${stats.activeSchools} active, ${stats.inactiveSchools} inactive`} icon={Building2} />
          <MetricCard title="Active Sessions" value={String(stats.activeSessions)} description={`${stats.authUsers} users and ${stats.credentialAccounts} credential accounts`} icon={Users} />
          <MetricCard title="System Score" value={`${stats.systemScore.toFixed(0)}%`} description={`${stats.failedAuditEvents} failed audit events in 30 days`} icon={ShieldCheck} tone={stats.systemScore >= 90 ? "success" : stats.systemScore >= 70 ? "warning" : "danger"} />
          <MetricCard title="Paid Revenue" value={money(stats.paidRevenue)} description={`${stats.totalInvoices} total platform invoices`} icon={BarChart3} tone="success" />
          <MetricCard title="Outstanding" value={money(stats.outstanding)} description={`${stats.overdueInvoices} overdue invoices`} icon={Clock} tone={stats.overdueInvoices ? "warning" : "default"} />
          <MetricCard title="New Schools" value={String(stats.newSchoolsThisMonth)} description="Provisioned this month" icon={Activity} />
          <MetricCard title="Enabled Modules" value={`${stats.enabledModules}/${stats.totalModules}`} description="Tenant module enablement records" icon={Zap} />
          </>
        ) : null}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.9fr]">
        <Card className="border-border/70 bg-card/95 shadow-sm">
          <CardHeader>
            <CardTitle>Revenue & Invoice Trend</CardTitle>
            <CardDescription>Paid revenue and invoice volume over the last six months.</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data?.revenueTrend || []}>
                <defs>
                  <linearGradient id="analyticsRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.28} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip formatter={(value, name) => name === "amount" ? money(Number(value)) : value} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12 }} />
                <Area type="monotone" dataKey="amount" stroke="hsl(var(--primary))" fill="url(#analyticsRevenue)" strokeWidth={2} name="Revenue" />
                <Line type="monotone" dataKey="invoices" stroke="#22c55e" strokeWidth={2} name="Invoices" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/95 shadow-sm">
          <CardHeader>
            <CardTitle>Plan Distribution</CardTitle>
            <CardDescription>Subscription share by plan tier.</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data?.planDistribution || []} dataKey="value" nameKey="name" outerRadius={98} innerRadius={58} paddingAngle={3}>
                  {(data?.planDistribution || []).map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="border-border/70 bg-card/95 shadow-sm xl:col-span-2">
          <CardHeader>
            <CardTitle>School & Subscription Growth</CardTitle>
            <CardDescription>New school environments and subscription records by month.</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.schoolGrowth || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12 }} />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} name="Schools" />
                <Bar dataKey="subscriptions" fill="#22c55e" radius={[8, 8, 0, 0]} name="Subscriptions" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/95 shadow-sm">
          <CardHeader>
            <CardTitle>Operations Health</CardTitle>
            <CardDescription>Derived from live database and audit telemetry.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <div className="mb-2 flex justify-between text-sm">
                <span>System Score</span>
                <span>{stats?.systemScore.toFixed(0) || 0}%</span>
              </div>
              <Progress value={stats?.systemScore || 0} />
            </div>
            <div className="grid gap-3 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">DB query latency</span><span className="font-medium">{operations?.dbQueryLatencyMs || 0}ms</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Database size</span><span className="font-medium">{operations?.databaseSize || "N/A"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Public tables</span><span className="font-medium">{operations?.tableCount || 0}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Estimated rows</span><span className="font-medium">{compact(operations?.estimatedRows || 0)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">DB connection</span><span className="font-medium">{operations?.connectionSecurity}</span></div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="border-border/70 bg-card/95 shadow-sm">
          <CardHeader>
            <CardTitle>Invoice Status Distribution</CardTitle>
            <CardDescription>Financial exposure by invoice state.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {(data?.invoiceStatusDistribution || []).map((row) => (
              <div key={row.status} className="rounded-2xl border bg-background/60 p-4">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="capitalize">{row.status}</Badge>
                  <span className="font-semibold">{money(row.amount)}</span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{row.count} invoice(s)</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/95 shadow-sm">
          <CardHeader>
            <CardTitle>Module Adoption</CardTitle>
            <CardDescription>Most enabled tenant modules across schools.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {(data?.moduleAdoption || []).map((module) => (
              <div key={module.moduleKey} className="space-y-2 rounded-2xl border bg-background/60 p-4">
                <div className="flex justify-between gap-3 text-sm">
                  <span className="font-medium">{module.moduleName}</span>
                  <span className="text-muted-foreground">{module.enabledSchools} schools</span>
                </div>
                <Progress value={stats?.totalSchools ? (module.enabledSchools / stats.totalSchools) * 100 : 0} />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="border-border/70 bg-card/95 shadow-sm">
          <CardHeader>
            <CardTitle>Top Schools By Revenue</CardTitle>
            <CardDescription>Paid revenue and outstanding balance by school.</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow><TableHead>School</TableHead><TableHead>Revenue</TableHead><TableHead>Outstanding</TableHead><TableHead>Invoices</TableHead></TableRow></TableHeader>
              <TableBody>
                {(data?.topSchoolsByRevenue || []).map((school) => (
                  <TableRow key={school.schoolId}>
                    <TableCell className="font-medium">{school.schoolName}<div className="text-xs text-muted-foreground">{school.schoolSlug}</div></TableCell>
                    <TableCell>{money(school.revenue)}</TableCell>
                    <TableCell>{money(school.outstanding)}</TableCell>
                    <TableCell>{school.invoices}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/95 shadow-sm">
          <CardHeader>
            <CardTitle>Recent Platform Activity</CardTitle>
            <CardDescription>Latest audit events from platform operations.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {(data?.recentActivity || []).map((activity) => (
              <div key={activity.id} className="flex items-center justify-between rounded-2xl border bg-background/60 p-4">
                <div>
                  <p className="font-medium">{activity.action}</p>
                  <p className="text-sm text-muted-foreground">{activity.resource} · {activity.adminName}</p>
                </div>
                <div className="text-right">
                  {activity.status === "success" ? <CheckCircle2 className="ml-auto size-5 text-emerald-600" /> : <AlertTriangle className="ml-auto size-5 text-destructive" />}
                  <p className="mt-1 text-xs text-muted-foreground">{dateLabel(activity.createdAt)}</p>
                </div>
              </div>
            ))}
            {!data?.recentActivity?.length ? <p className="py-8 text-center text-sm text-muted-foreground">No audit activity recorded yet.</p> : null}
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/70 bg-card/95 shadow-sm">
        <CardHeader>
          <CardTitle>Security & Compliance</CardTitle>
          <CardDescription>Real audit-derived security posture for the platform control centre.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border bg-background/60 p-5">
            <p className="text-sm text-muted-foreground">Audit Events (30d)</p>
            <p className="mt-2 text-2xl font-bold">{stats?.auditEvents30d || 0}</p>
          </div>
          <div className="rounded-2xl border bg-background/60 p-5">
            <p className="text-sm text-muted-foreground">Failed Events</p>
            <p className={cn("mt-2 text-2xl font-bold", stats?.failedAuditEvents ? "text-destructive" : "text-emerald-600")}>{stats?.failedAuditEvents || 0}</p>
          </div>
          <div className="rounded-2xl border bg-background/60 p-5">
            <p className="text-sm text-muted-foreground">Failure Rate</p>
            <p className={cn("mt-2 text-2xl font-bold", (stats?.auditFailureRate || 0) > 5 ? "text-destructive" : "text-emerald-600")}>{(stats?.auditFailureRate || 0).toFixed(1)}%</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
