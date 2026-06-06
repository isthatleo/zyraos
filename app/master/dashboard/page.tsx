"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  Building2,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  DollarSign,
  FileText,
  Layers,
  RefreshCw,
  ServerCog,
  ShieldAlert,
  TrendingUp,
  Users,
} from "lucide-react";

import { KPICard } from "@/components/master/kpi-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

interface SchoolInfo {
  id: string;
  name: string;
  slug: string;
  status: string;
  type?: string;
  country?: string;
  createdAt: string;
  subscriptionPlan?: string;
  subscriptionStatus?: string;
}

type DashboardStats = {
  totalSchools: number;
  activeSchools: number;
  inactiveSchools: number;
  newSchoolsThisMonth: number;
  newSchoolsLastMonth: number;
  totalRevenue: number;
  mrr: number;
  paidRevenue: number;
  outstandingRevenue: number;
  pendingInvoices: number;
  overdueInvoices: number;
  activeSubscriptions: number;
  expiringSubscriptions: number;
  platformAdmins: number;
  enabledModules: number;
  systemStatus: "healthy" | "warning" | "error";
};

type TrendPoint = { month: string; revenue?: number; invoices?: number; schools?: number };
type DistributionItem = { name?: string; type?: string; status?: string; count: number; revenue?: number };
type InvoiceInfo = {
  id: string;
  invoiceNumber: string;
  schoolId: string;
  schoolName: string;
  amount: number;
  amountFormatted: string;
  currency: string;
  status: string;
  dueDate: string;
  issueDate: string;
};
type SubscriptionInfo = {
  id: string;
  schoolId: string;
  schoolName: string;
  slug: string;
  planName: string;
  status: string;
  endDate: string;
  autoRenew: boolean;
};
type ActivityInfo = {
  id: string;
  action: string;
  resource: string;
  status: string;
  createdAt: string;
  adminName: string;
};
type AlertInfo = {
  type: string;
  severity: "info" | "warning" | "critical";
  title: string;
  description: string;
  href: string;
};

type DashboardData = {
  generatedAt?: string;
  stats: DashboardStats;
  recentSchools: SchoolInfo[];
  revenueTrend: TrendPoint[];
  schoolGrowth: TrendPoint[];
  planDistribution: DistributionItem[];
  typeDistribution: DistributionItem[];
  statusDistribution: DistributionItem[];
  recentInvoices: InvoiceInfo[];
  expiringSubscriptions: SubscriptionInfo[];
  recentActivity: ActivityInfo[];
  alerts: AlertInfo[];
};

const MASTER_DASHBOARD_CACHE_KEY = "roxan:master-dashboard:v1";

const emptyStats: DashboardStats = {
  totalSchools: 0,
  activeSchools: 0,
  inactiveSchools: 0,
  newSchoolsThisMonth: 0,
  newSchoolsLastMonth: 0,
  totalRevenue: 0,
  mrr: 0,
  paidRevenue: 0,
  outstandingRevenue: 0,
  pendingInvoices: 0,
  overdueInvoices: 0,
  activeSubscriptions: 0,
  expiringSubscriptions: 0,
  platformAdmins: 0,
  enabledModules: 0,
  systemStatus: "healthy",
};

const emptyDashboardData: DashboardData = {
  stats: emptyStats,
  recentSchools: [],
  revenueTrend: [],
  schoolGrowth: [],
  planDistribution: [],
  typeDistribution: [],
  statusDistribution: [],
  recentInvoices: [],
  expiringSubscriptions: [],
  recentActivity: [],
  alerts: [],
};

const currencyFormatter = new Intl.NumberFormat("en-ZA", {
  style: "currency",
  currency: "ZAR",
  maximumFractionDigits: 0,
});

const statusColors: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300",
  inactive: "bg-slate-100 text-slate-800 dark:bg-slate-500/15 dark:text-slate-300",
  trial: "bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-300",
  paid: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300",
  pending: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
  overdue: "bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300",
  warning: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
  healthy: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300",
  error: "bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300",
};

function formatCurrency(value: number) {
  return currencyFormatter.format(Number(value || 0));
}

function formatTimestamp(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short",
  }).format(date);
}

function percentageChange(current: number, previous: number) {
  if (!previous && current) return 100;
  if (!previous) return 0;
  return Math.round(((current - previous) / previous) * 100);
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
      {label}
    </div>
  );
}

function MiniBarChart({
  data,
  valueKey,
  label,
}: {
  data: TrendPoint[];
  valueKey: "revenue" | "schools" | "invoices";
  label: string;
}) {
  const maxValue = Math.max(...data.map((item) => Number(item[valueKey] || 0)), 0);

  if (!data.length) return <EmptyState label={`No ${label.toLowerCase()} data yet.`} />;

  return (
    <div className="flex h-56 items-end gap-3 rounded-2xl border bg-muted/20 p-4">
      {data.map((item) => {
        const value = Number(item[valueKey] || 0);
        const height = maxValue ? Math.max(8, (value / maxValue) * 100) : 8;
        return (
          <div key={`${item.month}-${valueKey}`} className="flex min-w-0 flex-1 flex-col items-center gap-2">
            <div className="flex h-36 w-full items-end">
              <div
                className="w-full rounded-t-xl bg-primary/85 shadow-sm transition-all"
                style={{ height: `${height}%` }}
                title={`${item.month}: ${valueKey === "revenue" ? formatCurrency(value) : value}`}
              />
            </div>
            <span className="w-full truncate text-center text-[11px] text-muted-foreground">{item.month.replace(" 20", " ")}</span>
          </div>
        );
      })}
    </div>
  );
}

function DistributionList({
  items,
  getLabel,
  getValue,
}: {
  items: DistributionItem[];
  getLabel: (item: DistributionItem) => string;
  getValue?: (item: DistributionItem) => string;
}) {
  const total = items.reduce((sum, item) => sum + Number(item.count || 0), 0);

  if (!items.length) return <EmptyState label="No distribution data yet." />;

  return (
    <div className="space-y-4">
      {items.map((item) => {
        const value = Number(item.count || 0);
        const percent = total ? Math.round((value / total) * 100) : 0;
        return (
          <div key={getLabel(item)} className="space-y-2">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="truncate font-medium capitalize">{getLabel(item).replace(/_/g, " ")}</span>
              <span className="shrink-0 text-muted-foreground">{getValue?.(item) || `${value} (${percent}%)`}</span>
            </div>
            <Progress value={percent} className="h-2" />
          </div>
        );
      })}
    </div>
  );
}

export default function MasterDashboard() {
  const [data, setData] = useState<DashboardData>(emptyDashboardData);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDashboardData = async (refresh = false) => {
    if (refresh) setIsRefreshing(true);
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch("/api/master/dashboard", {
        cache: "no-store",
        credentials: "include",
        signal: controller.signal,
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to load dashboard data");
      setData({
        stats: { ...emptyStats, ...(result.stats || {}) },
        recentSchools: result.recentSchools || [],
        revenueTrend: result.revenueTrend || [],
        schoolGrowth: result.schoolGrowth || [],
        planDistribution: result.planDistribution || [],
        typeDistribution: result.typeDistribution || [],
        statusDistribution: result.statusDistribution || [],
        recentInvoices: result.recentInvoices || [],
        expiringSubscriptions: result.expiringSubscriptions || [],
        recentActivity: result.recentActivity || [],
        alerts: result.alerts || [],
        generatedAt: result.generatedAt,
      });
      window.sessionStorage.setItem(MASTER_DASHBOARD_CACHE_KEY, JSON.stringify({
        stats: { ...emptyStats, ...(result.stats || {}) },
        recentSchools: result.recentSchools || [],
        revenueTrend: result.revenueTrend || [],
        schoolGrowth: result.schoolGrowth || [],
        planDistribution: result.planDistribution || [],
        typeDistribution: result.typeDistribution || [],
        statusDistribution: result.statusDistribution || [],
        recentInvoices: result.recentInvoices || [],
        expiringSubscriptions: result.expiringSubscriptions || [],
        recentActivity: result.recentActivity || [],
        alerts: result.alerts || [],
        generatedAt: result.generatedAt,
      }));
      setError(null);
    } catch (caught) {
      console.error("Error fetching dashboard data:", caught);
      setError(
        caught instanceof DOMException && caught.name === "AbortError"
          ? "Dashboard data request timed out. Check the database connection and try again."
          : caught instanceof Error
            ? caught.message
            : "Failed to load dashboard data"
      );
    } finally {
      window.clearTimeout(timeoutId);
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    try {
      const cached = window.sessionStorage.getItem(MASTER_DASHBOARD_CACHE_KEY);
      if (cached) {
        setData(JSON.parse(cached) as DashboardData);
        setIsLoading(false);
      }
    } catch {}
    void loadDashboardData();
  }, []);

  const stats = data.stats;
  const schoolGrowthTrend = percentageChange(stats.newSchoolsThisMonth, stats.newSchoolsLastMonth);
  const activationRate = stats.totalSchools ? Math.round((stats.activeSchools / stats.totalSchools) * 100) : 0;
  const billingRiskScore = useMemo(() => {
    const invoiceRisk = stats.pendingInvoices + stats.overdueInvoices * 2;
    const subscriptionRisk = stats.expiringSubscriptions;
    return Math.min(100, invoiceRisk * 8 + subscriptionRisk * 6);
  }, [stats.pendingInvoices, stats.overdueInvoices, stats.expiringSubscriptions]);

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <div className="rounded-3xl border bg-card/85 p-6 shadow-sm backdrop-blur">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge className={cn("capitalize", statusColors[stats.systemStatus])}>
                {stats.systemStatus === "healthy" ? <CheckCircle2 className="size-3" /> : <AlertTriangle className="size-3" />}
                {stats.systemStatus}
              </Badge>
              {data.generatedAt ? (
                <span className="text-xs text-muted-foreground">Updated {formatTimestamp(data.generatedAt)}</span>
              ) : null}
            </div>
            <h1 className="mt-3 text-3xl font-bold tracking-tight">Master Dashboard</h1>
            <p className="mt-2 text-muted-foreground">
              Overview of all schools, billing health, subscriptions, platform operations, and system metrics.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => void loadDashboardData(true)} disabled={isRefreshing}>
              <RefreshCw className={cn("size-4", isRefreshing && "animate-spin")} />
              Refresh
            </Button>
            <Button asChild>
              <Link href="/master/schools">
                <Building2 className="size-4" />
                Manage Schools
              </Link>
            </Button>
          </div>
        </div>
        {error ? (
          <div className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-600 dark:text-red-300">
            {error}
          </div>
        ) : null}
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KPICard
          title="Total Schools"
          value={stats.totalSchools}
          description={`${stats.activeSchools} active, ${stats.inactiveSchools} inactive`}
          icon={Building2}
          trend={{
            value: Math.abs(schoolGrowthTrend),
            isPositive: schoolGrowthTrend >= 0,
            label: "vs last month",
          }}
          isLoading={isLoading}
        />
        <KPICard
          title="Active Schools"
          value={stats.activeSchools}
          description={`${activationRate}% activation rate`}
          icon={Activity}
          trend={{
            value: activationRate,
            isPositive: activationRate >= 80,
            label: "active",
          }}
          isLoading={isLoading}
        />
        <KPICard
          title="Monthly Revenue"
          value={formatCurrency(stats.mrr || stats.totalRevenue)}
          description="Estimated MRR from active subscriptions"
          icon={DollarSign}
          trend={{
            value: stats.activeSubscriptions,
            isPositive: true,
            label: "active subscriptions",
          }}
          isLoading={isLoading}
        />
        <KPICard
          title="System Status"
          value={stats.systemStatus === "healthy" ? "Healthy" : stats.systemStatus === "warning" ? "Needs Review" : "Error"}
          description={`${stats.overdueInvoices} overdue invoices, ${stats.expiringSubscriptions} renewals`}
          icon={ServerCog}
          isLoading={isLoading}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="bg-card/85 backdrop-blur">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <CreditCard className="size-4 text-primary" />
              Billing Exposure
            </CardTitle>
            <CardDescription>Pending and overdue invoices.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-16 w-full" /> : (
              <>
                <div className="text-2xl font-semibold">{formatCurrency(stats.outstandingRevenue)}</div>
                <p className="mt-1 text-sm text-muted-foreground">{stats.pendingInvoices} pending, {stats.overdueInvoices} overdue</p>
                <Progress value={billingRiskScore} className="mt-4 h-2" />
              </>
            )}
          </CardContent>
        </Card>
        <Card className="bg-card/85 backdrop-blur">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="size-4 text-primary" />
              Paid Revenue
            </CardTitle>
            <CardDescription>Collected platform invoice revenue.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-16 w-full" /> : (
              <>
                <div className="text-2xl font-semibold">{formatCurrency(stats.paidRevenue)}</div>
                <p className="mt-1 text-sm text-muted-foreground">From paid platform invoices</p>
              </>
            )}
          </CardContent>
        </Card>
        <Card className="bg-card/85 backdrop-blur">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Layers className="size-4 text-primary" />
              Enabled Modules
            </CardTitle>
            <CardDescription>Active tenant module assignments.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-16 w-full" /> : (
              <>
                <div className="text-2xl font-semibold">{stats.enabledModules}</div>
                <p className="mt-1 text-sm text-muted-foreground">Across all provisioned schools</p>
              </>
            )}
          </CardContent>
        </Card>
        <Card className="bg-card/85 backdrop-blur">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="size-4 text-primary" />
              Platform Admins
            </CardTitle>
            <CardDescription>Super admin control accounts.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-16 w-full" /> : (
              <>
                <div className="text-2xl font-semibold">{stats.platformAdmins}</div>
                <p className="mt-1 text-sm text-muted-foreground">Accounts with platform-level access</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.5fr_0.9fr]">
        <Tabs defaultValue="revenue" className="space-y-4">
          <TabsList className="rounded-full bg-muted/70 p-1">
            <TabsTrigger value="revenue" className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Revenue</TabsTrigger>
            <TabsTrigger value="growth" className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Growth</TabsTrigger>
            <TabsTrigger value="plans" className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Plans</TabsTrigger>
          </TabsList>
          <TabsContent value="revenue" className="mt-0">
            <Card>
              <CardHeader>
                <CardTitle>Revenue Trend</CardTitle>
                <CardDescription>Paid invoice revenue by invoice issue month.</CardDescription>
              </CardHeader>
              <CardContent>{isLoading ? <Skeleton className="h-56 w-full rounded-2xl" /> : <MiniBarChart data={data.revenueTrend} valueKey="revenue" label="Revenue" />}</CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="growth" className="mt-0">
            <Card>
              <CardHeader>
                <CardTitle>School Provisioning Trend</CardTitle>
                <CardDescription>New schools created over the last six months.</CardDescription>
              </CardHeader>
              <CardContent>{isLoading ? <Skeleton className="h-56 w-full rounded-2xl" /> : <MiniBarChart data={data.schoolGrowth} valueKey="schools" label="School growth" />}</CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="plans" className="mt-0">
            <Card>
              <CardHeader>
                <CardTitle>Subscription Plan Mix</CardTitle>
                <CardDescription>Schools grouped by active subscription plan.</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? <Skeleton className="h-56 w-full rounded-2xl" /> : (
                  <DistributionList
                    items={data.planDistribution}
                    getLabel={(item) => item.name || "No Plan"}
                    getValue={(item) => `${item.count} schools / ${formatCurrency(item.revenue || 0)}`}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldAlert className="size-5 text-primary" />
              Operational Alerts
            </CardTitle>
            <CardDescription>Live issues generated from billing, subscriptions, schools, and audit logs.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              [1, 2, 3].map((item) => <Skeleton key={item} className="h-20 w-full rounded-2xl" />)
            ) : data.alerts.length ? (
              data.alerts.map((alert) => (
                <Link
                  key={`${alert.type}-${alert.title}`}
                  href={alert.href}
                  className="block rounded-2xl border bg-muted/20 p-4 transition-colors hover:bg-muted/50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Badge variant={alert.severity === "critical" ? "destructive" : alert.severity === "warning" ? "secondary" : "outline"} className="mb-2 capitalize">
                        {alert.severity}
                      </Badge>
                      <p className="font-medium">{alert.title}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{alert.description}</p>
                    </div>
                    <ArrowUpRight className="size-4 shrink-0 text-muted-foreground" />
                  </div>
                </Link>
              ))
            ) : (
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-700 dark:text-emerald-300">
                No operational alerts. Platform indicators are healthy.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>School Type Distribution</CardTitle>
            <CardDescription>Tenant education levels across the platform.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-52 w-full rounded-2xl" /> : (
              <DistributionList items={data.typeDistribution} getLabel={(item) => item.type || "Unspecified"} />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>School Status Distribution</CardTitle>
            <CardDescription>Lifecycle state of all provisioned schools.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-52 w-full rounded-2xl" /> : (
              <DistributionList items={data.statusDistribution} getLabel={(item) => item.status || "Unknown"} />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent School Provisioning */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle>Recent School Provisioning</CardTitle>
              <CardDescription>Latest schools provisioned in the system.</CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href="/master/schools">
                View All <ChevronRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : data.recentSchools.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>School Name</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.recentSchools.map((school) => (
                  <TableRow key={school.id}>
                    <TableCell className="font-medium">{school.name}</TableCell>
                    <TableCell className="text-muted-foreground">{school.slug}</TableCell>
                    <TableCell className="capitalize">{school.type?.replace(/_/g, " ") || "N/A"}</TableCell>
                    <TableCell>{school.subscriptionPlan}</TableCell>
                    <TableCell>
                      <Badge className={cn("capitalize", statusColors[school.status] || statusColors.inactive)}>{school.status}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{school.createdAt}</TableCell>
                    <TableCell className="text-right">
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/master/schools/${school.id}`}>Manage</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <EmptyState label="No schools have been provisioned yet." />
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardTitle>Recent Invoices</CardTitle>
                <CardDescription>Latest platform billing records.</CardDescription>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link href="/master/billing">Billing <ChevronRight className="ml-1 size-4" /></Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">{[1, 2, 3].map((item) => <Skeleton key={item} className="h-12 w-full" />)}</div>
            ) : data.recentInvoices.length ? (
              <div className="space-y-3">
                {data.recentInvoices.map((invoice) => (
                  <div key={invoice.id} className="flex items-center justify-between gap-4 rounded-2xl border p-4">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{invoice.invoiceNumber}</p>
                      <p className="truncate text-sm text-muted-foreground">{invoice.schoolName} / due {invoice.dueDate}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-semibold">{invoice.amountFormatted}</p>
                      <Badge className={cn("capitalize", statusColors[invoice.status] || statusColors.pending)}>{invoice.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState label="No platform invoices found." />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Expiring Subscriptions</CardTitle>
            <CardDescription>Active subscriptions ending within the next 30 days.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">{[1, 2, 3].map((item) => <Skeleton key={item} className="h-12 w-full" />)}</div>
            ) : data.expiringSubscriptions.length ? (
              <div className="space-y-3">
                {data.expiringSubscriptions.map((subscription) => (
                  <Link
                    key={subscription.id}
                    href={`/master/schools/${subscription.schoolId}`}
                    className="flex items-center justify-between gap-4 rounded-2xl border p-4 transition-colors hover:bg-muted/50"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{subscription.schoolName}</p>
                      <p className="truncate text-sm text-muted-foreground">{subscription.planName} / {subscription.slug}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-medium">{subscription.endDate}</p>
                      <Badge variant={subscription.autoRenew ? "secondary" : "outline"}>{subscription.autoRenew ? "Auto-renew" : "Manual"}</Badge>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <EmptyState label="No subscriptions expire in the next 30 days." />
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle>Recent Platform Activity</CardTitle>
              <CardDescription>Latest audit events from the platform control center.</CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href="/master/activity">
                Activity Log <ChevronRight className="ml-1 size-4" />
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">{[1, 2, 3, 4].map((item) => <Skeleton key={item} className="h-12 w-full" />)}</div>
          ) : data.recentActivity.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Action</TableHead>
                  <TableHead>Resource</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.recentActivity.map((activity) => (
                  <TableRow key={activity.id}>
                    <TableCell className="font-medium">{activity.action}</TableCell>
                    <TableCell className="capitalize text-muted-foreground">{activity.resource}</TableCell>
                    <TableCell>{activity.adminName}</TableCell>
                    <TableCell>
                      <Badge className={cn("capitalize", activity.status === "success" ? statusColors.healthy : statusColors.error)}>
                        {activity.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{activity.createdAt}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <EmptyState label="No platform activity has been recorded yet." />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
