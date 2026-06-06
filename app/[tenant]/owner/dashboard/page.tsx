"use client";

import * as React from "react";
import { useParams, usePathname, useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  Bell,
  Briefcase,
  CreditCard,
  Megaphone,
  MessageSquare,
  RefreshCw,
  Settings,
  ShieldCheck,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getTenantSubdomain, resolveTenantSlug } from "@/lib/tenant-routing";
import { cn } from "@/lib/utils";

type OwnerDashboardData = {
  school: {
    name: string;
    slug: string;
    type: string;
    status: string;
    country: string;
    currencyCode: string;
    createdAt: string | null;
  };
  subscription: null | {
    status: string;
    planName: string;
    maxStudents: number | null;
    maxStaff: number | null;
    autoRenew: boolean;
    startDate: string | null;
    endDate: string | null;
  };
  kpis: {
    totalStudents: number;
    activeStudents: number;
    newStudentsThisMonth: number;
    totalTeachers: number;
    totalStaff: number;
    totalClasses: number;
    attendanceRate: number;
    todayAttendanceRate: number;
    performanceAverage: number;
    activeUsers: number;
    ownerCount: number;
    adminCount: number;
    parentCount: number;
    totalCapacity: number;
    capacityUsed: number;
  };
  finance: {
    billed: number;
    paid: number;
    outstanding: number;
    collectionRate: number;
    paymentsCollected: number;
    pendingPayments: number;
    failedPayments: number;
    invoicesNeedingAttention: number;
    platformInvoiceAmount: number;
    platformInvoicesPending: number;
    platformInvoicesOverdue: number;
  };
  operations: {
    broadcasts: { total: number; sent: number; pending: number; failed: number };
    messages: { total: number; last7Days: number };
    pendingLeaveRequests: number;
  };
  charts: {
    monthly: Array<{ key: string; month: string; students: number; revenue: number; attendance: number; performance: number }>;
  };
  recentActivity: Array<{ type: string; title: string; description: string; status: string; timestamp: string | null; href: string }>;
  attention: Array<{ label: string; value: number; severity: string; href: string }>;
};

function ownerDashboardCacheKey(tenantSlug: string) {
  return `roxan:owner-dashboard:${tenantSlug}:v1`;
}

function compact(value: number) {
  return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(value || 0);
}

function percent(value: number) {
  return `${Number(value || 0).toFixed(value % 1 ? 1 : 0)}%`;
}

function dateLabel(value?: string | null) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

function timeAgo(value?: string | null) {
  if (!value) return "No timestamp";
  const minutes = Math.max(1, Math.round((Date.now() - new Date(value).getTime()) / 60000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

function badgeClass(status: string) {
  const value = status.toLowerCase();
  if (["active", "paid", "completed", "sent", "healthy"].includes(value)) return "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  if (["pending", "draft", "scheduled", "info", "warning"].includes(value)) return "border-primary/25 bg-primary/10 text-primary";
  if (["overdue", "failed", "critical"].includes(value)) return "border-destructive/25 bg-destructive/10 text-destructive";
  return "border-border bg-muted text-muted-foreground";
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex min-h-44 flex-col items-center justify-center rounded-2xl border border-dashed bg-muted/30 p-8 text-center">
      <BarChart3 className="mb-3 size-6 text-primary" />
      <p className="font-medium">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="space-y-6">
      <section className="rounded-3xl border bg-card p-6 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="rounded-full">Owner dashboard</Badge>
          <Badge variant="outline" className="rounded-full">Loading tenant analytics</Badge>
        </div>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">Owner Command Centre</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          Loading tenant-scoped analytics, staff governance, finance, platform billing, and operational risk.
        </p>
      </section>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-36 rounded-3xl" />)}
      </div>
      <Skeleton className="h-96 rounded-3xl" />
    </div>
  );
}

export default function OwnerDashboardPage() {
  const router = useRouter();
  const params = useParams<{ tenant?: string }>();
  const pathname = usePathname();
  const paramTenantSlug = String(params?.tenant || "");
  const tenantSlug = paramTenantSlug && pathname?.startsWith(`/${paramTenantSlug}/`) ? paramTenantSlug : (typeof window !== "undefined" ? resolveTenantSlug(pathname, window.location.host) || "" : paramTenantSlug);
  const [isTenantSubdomain, setIsTenantSubdomain] = React.useState(false);
  const [data, setData] = React.useState<OwnerDashboardData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setIsTenantSubdomain(Boolean(getTenantSubdomain(window.location.hostname)));
  }, []);

  React.useEffect(() => {
    if (!tenantSlug) return;
    try {
      const cached = window.sessionStorage.getItem(ownerDashboardCacheKey(tenantSlug));
      if (cached) {
        setData(JSON.parse(cached) as OwnerDashboardData);
        setLoading(false);
      }
    } catch {
      window.sessionStorage.removeItem(ownerDashboardCacheKey(tenantSlug));
    }
  }, [tenantSlug]);

  const tenantHref = React.useCallback(
    (href: string) => (isTenantSubdomain || !tenantSlug ? href : href.startsWith("/") ? `/${tenantSlug}${href}` : `/${tenantSlug}/${href}`),
    [isTenantSubdomain, tenantSlug]
  );

  const ownerHref = React.useCallback((href: string) => {
    if (href.includes("/finance/payments")) return "/owner/payments";
    if (href.includes("/finance/invoices")) return "/owner/invoices";
    if (href.includes("/finance/reports")) return "/owner/reports";
    if (href.includes("/finance")) return "/owner/finance";
    if (href.includes("/billing")) return "/owner/billing";
    if (href.includes("/staff")) return "/owner/staff";
    if (href.includes("/attendance")) return "/owner/staff-attendance";
    if (href.includes("/leave")) return "/owner/leave";
    if (href.includes("/payroll")) return "/owner/payroll";
    if (href.includes("/messages")) return "/owner/messages";
    if (href.includes("/broadcast")) return "/owner/broadcasts";
    if (href.includes("/announcement")) return "/owner/announcements";
    if (href.includes("/users")) return "/owner/users";
    if (href.includes("/roles") || href.includes("/permissions")) return "/owner/permissions";
    if (href.includes("/audit")) return "/owner/audit";
    if (href.includes("/settings")) return "/owner/settings";
    if (href.includes("/canteen")) return "/owner/canteen";
    return href.startsWith("/owner/") ? href : "/owner/dashboard";
  }, []);

  const loadDashboard = React.useCallback(
    async (refresh = false) => {
      setError(null);
      if (refresh) setRefreshing(true);
      else setLoading(true);

      try {
        if (!tenantSlug) throw new Error("Tenant slug is required");
        const response = await fetch(`/api/tenant/dashboard?slug=${encodeURIComponent(tenantSlug)}&portal=owner`, {
          credentials: "include",
          cache: "no-store",
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload?.error || "Failed to load owner dashboard");
        setData(payload);
        window.sessionStorage.setItem(ownerDashboardCacheKey(tenantSlug), JSON.stringify(payload));
        if (refresh) toast.success("Owner dashboard refreshed");
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Failed to load owner dashboard");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [tenantSlug]
  );

  React.useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const currency = React.useMemo(
    () => new Intl.NumberFormat("en", { style: "currency", currency: data?.school.currencyCode || "ZAR", maximumFractionDigits: 0 }),
    [data?.school.currencyCode]
  );

  if (loading) return <LoadingState />;

  if (error || !data) {
    return (
      <Alert variant="destructive" className="rounded-3xl">
        <AlertCircle className="size-4" />
        <AlertTitle>Owner dashboard failed to load</AlertTitle>
        <AlertDescription className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span>{error || "No dashboard data was returned."}</span>
          <Button variant="secondary" onClick={() => loadDashboard()}>Retry</Button>
        </AlertDescription>
      </Alert>
    );
  }

  const executiveCards = [
    { label: "Students", value: compact(data.kpis.totalStudents), detail: `${compact(data.kpis.activeStudents)} active, ${compact(data.kpis.newStudentsThisMonth)} new this month`, icon: Users, href: "/owner/dashboard" },
    { label: "Staff", value: compact(data.kpis.totalStaff), detail: `${compact(data.kpis.totalTeachers)} academic staff, ${compact(data.kpis.activeUsers)} active users`, icon: Briefcase, href: "/owner/staff" },
    { label: "Collection Rate", value: percent(data.finance.collectionRate), detail: `${currency.format(data.finance.outstanding)} outstanding`, icon: Wallet, href: "/owner/finance" },
    { label: "Attendance", value: percent(data.kpis.attendanceRate), detail: `Today: ${percent(data.kpis.todayAttendanceRate)}`, icon: TrendingUp, href: "/owner/staff-attendance" },
  ];

  const ownerActions = [
    { label: "Create Staff Account", href: "/owner/staff", icon: Users },
    { label: "Finance Overview", href: "/owner/finance", icon: Wallet },
    { label: "Platform Billing", href: "/owner/billing", icon: CreditCard },
    { label: "Owner Dashboard", href: "/owner/dashboard", icon: BarChart3 },
    { label: "Messages", href: "/owner/messages", icon: MessageSquare },
    { label: "School Settings", href: "/owner/settings", icon: Settings },
  ];

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border bg-card p-6 shadow-sm">
        <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge className={cn("rounded-full capitalize", badgeClass(data.school.status))}>{data.school.status}</Badge>
              <Badge variant="outline" className="rounded-full capitalize">{data.school.type.replace(/_/g, " ")}</Badge>
              <Badge variant="outline" className="rounded-full">{data.school.country || "Tenant"}</Badge>
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">Owner Command Centre</h1>
            <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
              Executive view for {data.school.name}. This dashboard focuses on analytics, staff/governance, finance, billing, and high-level operational risk. Student creation stays in the school admin dashboard.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Button onClick={() => router.push(tenantHref("/owner/staff"))}>
                Create Staff Account
                <ArrowRight className="size-4" />
              </Button>
              <Button variant="outline" onClick={() => router.push(tenantHref("/owner/finance"))}>Review Finance</Button>
              <Button variant="ghost" onClick={() => loadDashboard(true)} disabled={refreshing}>
                <RefreshCw className={cn("size-4", refreshing && "animate-spin")} />
                Refresh
              </Button>
            </div>
          </div>

          <Card className="bg-muted/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ShieldCheck className="size-4 text-primary" />
                Ownership Snapshot
              </CardTitle>
              <CardDescription>Governance and subscription state.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-2xl border bg-card p-3">
                  <p className="text-xs text-muted-foreground">Owners</p>
                  <p className="text-xl font-semibold">{data.kpis.ownerCount}</p>
                </div>
                <div className="rounded-2xl border bg-card p-3">
                  <p className="text-xs text-muted-foreground">Admins</p>
                  <p className="text-xl font-semibold">{data.kpis.adminCount}</p>
                </div>
                <div className="rounded-2xl border bg-card p-3">
                  <p className="text-xs text-muted-foreground">Parents</p>
                  <p className="text-xl font-semibold">{compact(data.kpis.parentCount)}</p>
                </div>
              </div>
              {data.subscription ? (
                <div className="rounded-2xl border bg-card p-4">
                  <p className="text-sm text-muted-foreground">Current plan</p>
                  <p className="mt-1 text-xl font-semibold">{data.subscription.planName}</p>
                  <p className="mt-1 text-xs capitalize text-muted-foreground">
                    {data.subscription.status} - {data.subscription.autoRenew ? "auto renews" : "manual renewal"} - ends {dateLabel(data.subscription.endDate)}
                  </p>
                </div>
              ) : (
                <div className="rounded-2xl border border-primary/25 bg-primary/10 p-4 text-sm text-primary">No subscription is linked to this tenant yet.</div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {executiveCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.label} className="transition-colors hover:border-primary/40">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">{card.label}</CardTitle>
                <div className="rounded-xl bg-primary/10 p-2 text-primary"><Icon className="size-4" /></div>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold">{card.value}</p>
                <p className="mt-2 text-xs text-muted-foreground">{card.detail}</p>
                <Button variant="link" className="mt-3 h-auto px-0 text-primary" onClick={() => router.push(tenantHref(card.href))}>
                  View details
                  <ArrowRight className="size-3.5" />
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <Tabs defaultValue="analytics" className="space-y-5">
        <TabsList className="mx-auto flex w-fit rounded-full bg-muted/70 p-1">
          <TabsTrigger value="analytics" className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Analytics</TabsTrigger>
          <TabsTrigger value="staff" className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Staff & Governance</TabsTrigger>
          <TabsTrigger value="finance" className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Finance</TabsTrigger>
          <TabsTrigger value="risk" className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Risk Queue</TabsTrigger>
        </TabsList>

        <TabsContent value="analytics" className="grid gap-5 xl:grid-cols-3">
          <Card className="xl:col-span-2">
            <CardHeader>
              <CardTitle>Institution Trend</CardTitle>
              <CardDescription>Students, attendance, and performance from real tenant records.</CardDescription>
            </CardHeader>
            <CardContent>
              {data.charts.monthly.some((row) => row.students || row.attendance || row.performance) ? (
                <ResponsiveContainer width="100%" height={340}>
                  <AreaChart data={data.charts.monthly}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={12} />
                    <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                    <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 14, color: "var(--popover-foreground)" }} />
                    <Area type="monotone" dataKey="students" name="New students" stroke="var(--primary)" fill="var(--primary)" fillOpacity={0.12} strokeWidth={2} />
                    <Area type="monotone" dataKey="attendance" name="Attendance %" stroke="var(--chart-2)" fill="transparent" strokeWidth={2} />
                    <Area type="monotone" dataKey="performance" name="Performance %" stroke="var(--chart-3)" fill="transparent" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState title="No analytics trend yet" description="This chart fills automatically as staff record attendance, assessments, and enrollment activity." />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Owner Actions</CardTitle>
              <CardDescription>Actions owners should use without entering student creation flows.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              {ownerActions.map((action) => {
                const Icon = action.icon;
                return (
                  <Button key={action.href} variant="outline" className="h-14 justify-start rounded-2xl" onClick={() => router.push(tenantHref(action.href))}>
                    <span className="mr-3 rounded-xl bg-primary/10 p-2 text-primary"><Icon className="size-4" /></span>
                    {action.label}
                  </Button>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="staff" className="grid gap-5 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Staff Capacity</CardTitle>
              <CardDescription>Teaching and operational staff footprint.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="mb-2 flex justify-between text-sm">
                  <span className="text-muted-foreground">Configured staff limit</span>
                  <span>{data.subscription?.maxStaff ? compact(data.subscription.maxStaff) : "Unlimited"}</span>
                </div>
                <Progress value={data.subscription?.maxStaff ? Math.min(100, (data.kpis.totalStaff / data.subscription.maxStaff) * 100) : 0} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border bg-muted/30 p-4">
                  <p className="text-sm text-muted-foreground">Total staff</p>
                  <p className="text-2xl font-semibold">{compact(data.kpis.totalStaff)}</p>
                </div>
                <div className="rounded-2xl border bg-muted/30 p-4">
                  <p className="text-sm text-muted-foreground">Teachers</p>
                  <p className="text-2xl font-semibold">{compact(data.kpis.totalTeachers)}</p>
                </div>
              </div>
              <Button className="w-full" onClick={() => router.push(tenantHref("/owner/staff"))}>Create or Manage Staff</Button>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Governance Signals</CardTitle>
              <CardDescription>Ownership, administration, leave, and communications oversight.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border bg-muted/30 p-5">
                <p className="text-sm text-muted-foreground">Pending leave requests</p>
                <p className="mt-1 text-3xl font-semibold">{compact(data.operations.pendingLeaveRequests)}</p>
              </div>
              <div className="rounded-2xl border bg-muted/30 p-5">
                <p className="text-sm text-muted-foreground">Messages this week</p>
                <p className="mt-1 text-3xl font-semibold">{compact(data.operations.messages.last7Days)}</p>
              </div>
              <div className="rounded-2xl border bg-muted/30 p-5">
                <p className="text-sm text-muted-foreground">Broadcasts sent</p>
                <p className="mt-1 text-3xl font-semibold">{compact(data.operations.broadcasts.sent)}</p>
              </div>
              <div className="rounded-2xl border bg-muted/30 p-5">
                <p className="text-sm text-muted-foreground">Failed broadcasts</p>
                <p className="mt-1 text-3xl font-semibold">{compact(data.operations.broadcasts.failed)}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="finance" className="grid gap-5 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Revenue Oversight</CardTitle>
              <CardDescription>Collection and outstanding balance tracking.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-2xl border bg-muted/30 p-4"><p className="text-sm text-muted-foreground">Billed</p><p className="mt-1 text-2xl font-semibold">{currency.format(data.finance.billed)}</p></div>
                <div className="rounded-2xl border bg-muted/30 p-4"><p className="text-sm text-muted-foreground">Collected</p><p className="mt-1 text-2xl font-semibold">{currency.format(data.finance.paid || data.finance.paymentsCollected)}</p></div>
                <div className="rounded-2xl border bg-muted/30 p-4"><p className="text-sm text-muted-foreground">Outstanding</p><p className="mt-1 text-2xl font-semibold">{currency.format(data.finance.outstanding)}</p></div>
              </div>
              <div>
                <div className="mb-2 flex justify-between text-sm"><span className="text-muted-foreground">Collection rate</span><span>{percent(data.finance.collectionRate)}</span></div>
                <Progress value={data.finance.collectionRate} />
              </div>
              {data.charts.monthly.some((row) => row.revenue) ? (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={data.charts.monthly}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={12} />
                    <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                    <Tooltip formatter={(value) => currency.format(Number(value || 0))} contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 14, color: "var(--popover-foreground)" }} />
                    <Bar dataKey="revenue" name="Revenue" fill="var(--primary)" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState title="No payment trend yet" description="Completed payments will show here once finance workflows are used." />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Platform Billing</CardTitle>
              <CardDescription>Roxan subscription invoices for this tenant.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-2xl border bg-muted/30 p-4">
                <p className="text-sm text-muted-foreground">Pending / overdue</p>
                <p className="mt-1 text-3xl font-semibold">{compact(data.finance.platformInvoicesPending + data.finance.platformInvoicesOverdue)}</p>
                <p className="mt-1 text-xs text-muted-foreground">{currency.format(data.finance.platformInvoiceAmount)} total platform billing</p>
              </div>
              <Button className="w-full" onClick={() => router.push(tenantHref("/owner/billing"))}>Open Billing</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="risk" className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {data.attention.map((item) => (
              <Card key={item.label} className="transition-colors hover:border-primary/40">
                <CardHeader>
                  <div className="flex items-center justify-between gap-3">
                    <CardTitle className="text-base">{item.label}</CardTitle>
                    <Badge className={cn("rounded-full capitalize", badgeClass(item.severity))}>{item.severity}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-4xl font-semibold">{compact(item.value)}</p>
                  <Button variant="link" className="mt-3 h-auto px-0 text-primary" onClick={() => router.push(tenantHref(ownerHref(item.href)))}>
                    Review
                    <ArrowRight className="size-3.5" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Recent Owner-Relevant Activity</CardTitle>
              <CardDescription>Latest tenant records that affect oversight and review.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.recentActivity.length ? data.recentActivity.slice(0, 6).map((activity, index) => (
                <button
                  key={`${activity.type}-${activity.timestamp}-${index}`}
                  type="button"
                  onClick={() => router.push(tenantHref(ownerHref(activity.href)))}
                  className="flex w-full items-center justify-between gap-4 rounded-2xl border bg-muted/20 p-4 text-left transition-colors hover:border-primary/40"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{activity.title}</p>
                    <p className="mt-1 truncate text-xs text-muted-foreground">{activity.description}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <Badge variant="outline" className={cn("rounded-full", badgeClass(activity.status))}>{activity.status}</Badge>
                    <p className="mt-1 text-[11px] text-muted-foreground">{timeAgo(activity.timestamp)}</p>
                  </div>
                </button>
              )) : (
                <EmptyState title="No recent activity yet" description="Owner-relevant records will appear here as tenant workflows are used." />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
