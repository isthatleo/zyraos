"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  Bell,
  BookOpen,
  Briefcase,
  CheckCircle2,
  CreditCard,
  GraduationCap,
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
  Cell,
  Pie,
  PieChart,
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
import { getTenantSubdomain } from "@/lib/tenant-routing";
import { cn } from "@/lib/utils";

type OwnerDashboardData = {
  generatedAt: string;
  school: {
    id: string;
    name: string;
    slug: string;
    type: string;
    status: string;
    country: string;
    currencyCode: string;
    currencyName: string;
    createdAt: string | null;
  };
  subscription: null | {
    status: string;
    planName: string;
    price: number;
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
    studentInvoices: number;
    invoicesNeedingAttention: number;
    platformInvoiceAmount: number;
    platformInvoicesPending: number;
    platformInvoicesOverdue: number;
  };
  operations: {
    announcements: Array<{
      id: string;
      title: string;
      published: boolean;
      publishDate: string | null;
      expiryDate: string | null;
      createdAt: string | null;
    }>;
    broadcasts: {
      total: number;
      sent: number;
      pending: number;
      failed: number;
    };
    messages: {
      total: number;
      last7Days: number;
    };
    pendingLeaveRequests: number;
  };
  charts: {
    monthly: Array<{
      key: string;
      month: string;
      students: number;
      revenue: number;
      attendance: number;
      performance: number;
    }>;
    classDistribution: Array<{ name: string; value: number }>;
  };
  recentActivity: Array<{
    type: string;
    title: string;
    description: string;
    amount?: number;
    status: string;
    timestamp: string | null;
    href: string;
  }>;
  attention: Array<{
    label: string;
    value: number;
    severity: "healthy" | "info" | "warning" | "critical" | string;
    href: string;
  }>;
};

const distributionColors = [
  "var(--primary)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

function compactNumber(value: number) {
  return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(value || 0);
}

function formatPercent(value: number) {
  return `${Number(value || 0).toFixed(value % 1 ? 1 : 0)}%`;
}

function formatDate(value: string | null) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

function relativeTime(value: string | null) {
  if (!value) return "No timestamp";
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.max(1, Math.round(diff / 60000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

function statusClass(status: string) {
  const value = status.toLowerCase();
  if (["active", "paid", "completed", "sent", "published", "healthy"].includes(value)) return "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  if (["pending", "partial", "draft", "scheduled", "info"].includes(value)) return "border-primary/25 bg-primary/10 text-primary";
  if (["overdue", "failed", "critical", "suspended"].includes(value)) return "border-destructive/25 bg-destructive/10 text-destructive";
  return "border-border bg-muted text-muted-foreground";
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex min-h-48 flex-col items-center justify-center rounded-2xl border border-dashed bg-muted/30 p-8 text-center">
      <div className="mb-3 rounded-full bg-primary/10 p-3 text-primary">
        <BarChart3 className="size-5" />
      </div>
      <p className="font-medium">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function LoadingDashboard() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index}>
            <CardHeader>
              <Skeleton className="h-4 w-28" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-24" />
              <Skeleton className="mt-3 h-3 w-36" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Skeleton className="h-96 rounded-3xl lg:col-span-2" />
        <Skeleton className="h-96 rounded-3xl" />
      </div>
    </div>
  );
}

export default function OwnerDashboardPage() {
  const router = useRouter();
  const params = useParams<{ tenant?: string }>();
  const tenantSlug = String(params?.tenant || "");
  const [isTenantSubdomain, setIsTenantSubdomain] = React.useState(false);
  const [data, setData] = React.useState<OwnerDashboardData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setIsTenantSubdomain(Boolean(getTenantSubdomain(window.location.hostname)));
  }, []);

  const tenantHref = React.useCallback(
    (href: string) => {
      if (isTenantSubdomain || !tenantSlug) return href;
      return href.startsWith("/") ? `/${tenantSlug}${href}` : `/${tenantSlug}/${href}`;
    },
    [isTenantSubdomain, tenantSlug]
  );

  const loadDashboard = React.useCallback(
    async (mode: "initial" | "refresh" = "initial") => {
      if (mode === "refresh") setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/tenant/dashboard?slug=${encodeURIComponent(tenantSlug)}`, {
          credentials: "include",
          cache: "no-store",
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload?.error || "Failed to load owner dashboard.");
        setData(payload as OwnerDashboardData);
        if (mode === "refresh") toast.success("Owner dashboard refreshed");
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Failed to load owner dashboard.");
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
    () =>
      new Intl.NumberFormat("en", {
        style: "currency",
        currency: data?.school.currencyCode || "ZAR",
        maximumFractionDigits: 0,
      }),
    [data?.school.currencyCode]
  );

  if (loading) return <LoadingDashboard />;

  if (error || !data) {
    return (
      <Alert variant="destructive" className="rounded-3xl">
        <AlertCircle className="size-4" />
        <AlertTitle>Owner dashboard failed to load</AlertTitle>
        <AlertDescription className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <span>{error || "No dashboard data was returned."}</span>
          <Button variant="secondary" onClick={() => loadDashboard()}>
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  const kpiCards = [
    {
      title: "Total Students",
      value: compactNumber(data.kpis.totalStudents),
      detail: `${compactNumber(data.kpis.activeStudents)} active, ${compactNumber(data.kpis.newStudentsThisMonth)} new this month`,
      icon: Users,
      href: "/admin/students",
    },
    {
      title: "Teachers & Staff",
      value: compactNumber(data.kpis.totalStaff),
      detail: `${compactNumber(data.kpis.totalTeachers)} teachers, ${compactNumber(data.kpis.activeUsers)} active users`,
      icon: GraduationCap,
      href: "/admin/staff",
    },
    {
      title: "Classes",
      value: compactNumber(data.kpis.totalClasses),
      detail: data.kpis.totalCapacity ? `${formatPercent(data.kpis.capacityUsed)} capacity used` : "Capacity not configured",
      icon: BookOpen,
      href: "/admin/classes",
    },
    {
      title: "Attendance Rate",
      value: formatPercent(data.kpis.attendanceRate),
      detail: `Today: ${formatPercent(data.kpis.todayAttendanceRate)}`,
      icon: TrendingUp,
      href: "/admin/attendance",
    },
  ];

  const quickActions = [
    { label: "Enroll Student", href: "/admin/admissions", icon: Users },
    { label: "Create Invoice", href: "/admin/finance/invoices", icon: CreditCard },
    { label: "Manage Staff", href: "/admin/staff", icon: Briefcase },
    { label: "Open Messages", href: "/admin/messages", icon: MessageSquare },
    { label: "Broadcast Update", href: "/broadcasts", icon: Megaphone },
    { label: "School Settings", href: "/admin/settings", icon: Settings },
  ];

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-3xl border bg-card shadow-sm">
        <div className="grid gap-6 p-6 lg:grid-cols-[1fr_320px]">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge className={cn("rounded-full capitalize", statusClass(data.school.status))}>{data.school.status}</Badge>
              <Badge variant="outline" className="rounded-full capitalize">{data.school.type.replace(/_/g, " ")}</Badge>
              <Badge variant="outline" className="rounded-full">{data.school.currencyCode}</Badge>
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">{data.school.name} Owner Dashboard</h1>
            <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
              Live operational control for enrollment, academics, attendance, finance, communications, staffing, and platform billing.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Button onClick={() => router.push(tenantHref("/admin/admissions"))}>
                Start Admissions
                <ArrowRight className="size-4" />
              </Button>
              <Button variant="outline" onClick={() => router.push(tenantHref("/admin/finance/dashboard"))}>
                Finance Dashboard
              </Button>
              <Button variant="ghost" onClick={() => loadDashboard("refresh")} disabled={refreshing}>
                <RefreshCw className={cn("size-4", refreshing && "animate-spin")} />
                Refresh
              </Button>
            </div>
          </div>
          <Card className="bg-muted/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ShieldCheck className="size-4 text-primary" />
                Subscription & Limits
              </CardTitle>
              <CardDescription>Current platform plan for this tenant.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {data.subscription ? (
                <>
                  <div>
                    <p className="text-2xl font-semibold">{data.subscription.planName}</p>
                    <p className="text-sm text-muted-foreground">
                      {data.subscription.status} · renews {data.subscription.autoRenew ? "automatically" : "manually"}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-2xl border bg-card p-3">
                      <p className="text-muted-foreground">Student limit</p>
                      <p className="font-semibold">{data.subscription.maxStudents ? compactNumber(data.subscription.maxStudents) : "Unlimited"}</p>
                    </div>
                    <div className="rounded-2xl border bg-card p-3">
                      <p className="text-muted-foreground">Staff limit</p>
                      <p className="font-semibold">{data.subscription.maxStaff ? compactNumber(data.subscription.maxStaff) : "Unlimited"}</p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">Plan window: {formatDate(data.subscription.startDate)} - {formatDate(data.subscription.endDate)}</p>
                </>
              ) : (
                <EmptyState title="No subscription linked" description="Assign a plan from the super admin billing tools to activate owner-level plan reporting." />
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {kpiCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.title} className="group transition-colors hover:border-primary/40">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
                <div className="rounded-xl bg-primary/10 p-2 text-primary">
                  <Icon className="size-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-semibold">{card.value}</div>
                <p className="mt-2 text-xs text-muted-foreground">{card.detail}</p>
                <Button variant="link" className="mt-3 h-auto px-0 text-primary" onClick={() => router.push(tenantHref(card.href))}>
                  Open section
                  <ArrowRight className="size-3.5" />
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <Tabs defaultValue="overview" className="space-y-5">
        <TabsList className="mx-auto flex w-fit rounded-full bg-muted/70 p-1">
          <TabsTrigger value="overview" className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Overview</TabsTrigger>
          <TabsTrigger value="finance" className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Finance</TabsTrigger>
          <TabsTrigger value="operations" className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Operations</TabsTrigger>
          <TabsTrigger value="attention" className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Attention</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-5">
          <div className="grid gap-5 xl:grid-cols-3">
            <Card className="xl:col-span-2">
              <CardHeader>
                <CardTitle>Enrollment, Revenue & Performance</CardTitle>
                <CardDescription>Live trend from tenant data for the last six months.</CardDescription>
              </CardHeader>
              <CardContent>
                {data.charts.monthly.some((entry) => entry.students || entry.revenue || entry.attendance || entry.performance) ? (
                  <ResponsiveContainer width="100%" height={330}>
                    <AreaChart data={data.charts.monthly}>
                      <defs>
                        <linearGradient id="studentsGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.28} />
                          <stop offset="95%" stopColor="var(--primary)" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={12} />
                      <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                      <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: "14px", color: "var(--popover-foreground)" }} />
                      <Area type="monotone" dataKey="students" name="New students" stroke="var(--primary)" fill="url(#studentsGradient)" strokeWidth={2} />
                      <Area type="monotone" dataKey="attendance" name="Attendance %" stroke="var(--chart-2)" fill="transparent" strokeWidth={2} />
                      <Area type="monotone" dataKey="performance" name="Performance %" stroke="var(--chart-3)" fill="transparent" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyState title="No trend data yet" description="Enrollment, attendance, and assessment activity will appear here as staff use the tenant dashboards." />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Class Distribution</CardTitle>
                <CardDescription>Classes grouped by grade or stage.</CardDescription>
              </CardHeader>
              <CardContent>
                {data.charts.classDistribution.length ? (
                  <ResponsiveContainer width="100%" height={330}>
                    <PieChart>
                      <Pie data={data.charts.classDistribution} dataKey="value" nameKey="name" innerRadius={58} outerRadius={105} paddingAngle={4}>
                        {data.charts.classDistribution.map((entry, index) => (
                          <Cell key={entry.name} fill={distributionColors[index % distributionColors.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: "14px", color: "var(--popover-foreground)" }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyState title="No classes configured" description="Create classes from Academics to activate distribution analytics." />
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Newest records across admissions, payments, invoices, and announcements.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.recentActivity.length ? (
                  data.recentActivity.map((activity, index) => (
                    <button
                      key={`${activity.type}-${activity.timestamp}-${index}`}
                      type="button"
                      onClick={() => router.push(tenantHref(activity.href))}
                      className="flex w-full gap-3 rounded-2xl border bg-card p-3 text-left transition-colors hover:border-primary/40 hover:bg-muted/40"
                    >
                      <div className="mt-0.5 rounded-xl bg-primary/10 p-2 text-primary">
                        {activity.type === "payment" ? <Wallet className="size-4" /> : activity.type === "invoice" ? <CreditCard className="size-4" /> : <CheckCircle2 className="size-4" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <p className="truncate text-sm font-medium">{activity.title}</p>
                          <Badge variant="outline" className={cn("rounded-full text-[10px]", statusClass(activity.status))}>{activity.status}</Badge>
                        </div>
                        <p className="mt-1 truncate text-xs text-muted-foreground">{activity.description}</p>
                        <p className="mt-1 text-[11px] text-muted-foreground">{relativeTime(activity.timestamp)}</p>
                      </div>
                    </button>
                  ))
                ) : (
                  <EmptyState title="No activity yet" description="Recent records will appear as users begin working in the tenant dashboard." />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Owner shortcuts routed inside this tenant dashboard.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                {quickActions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <Button key={action.href} variant="outline" className="h-16 justify-start rounded-2xl" onClick={() => router.push(tenantHref(action.href))}>
                      <span className="mr-3 rounded-xl bg-primary/10 p-2 text-primary">
                        <Icon className="size-4" />
                      </span>
                      {action.label}
                    </Button>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="finance" className="space-y-5">
          <div className="grid gap-5 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Financial Health</CardTitle>
                <CardDescription>Student invoice collections, payments, outstanding balances, and platform invoices.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border bg-muted/30 p-4">
                    <p className="text-sm text-muted-foreground">Billed</p>
                    <p className="mt-1 text-2xl font-semibold">{currency.format(data.finance.billed)}</p>
                  </div>
                  <div className="rounded-2xl border bg-muted/30 p-4">
                    <p className="text-sm text-muted-foreground">Collected</p>
                    <p className="mt-1 text-2xl font-semibold">{currency.format(data.finance.paid || data.finance.paymentsCollected)}</p>
                  </div>
                  <div className="rounded-2xl border bg-muted/30 p-4">
                    <p className="text-sm text-muted-foreground">Outstanding</p>
                    <p className="mt-1 text-2xl font-semibold">{currency.format(data.finance.outstanding)}</p>
                  </div>
                </div>
                <div>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Collection rate</span>
                    <span className="font-medium">{formatPercent(data.finance.collectionRate)}</span>
                  </div>
                  <Progress value={data.finance.collectionRate} className="h-3" />
                </div>
                {data.charts.monthly.some((entry) => entry.revenue) ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={data.charts.monthly}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={12} />
                      <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                      <Tooltip formatter={(value) => currency.format(Number(value || 0))} contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: "14px", color: "var(--popover-foreground)" }} />
                      <Bar dataKey="revenue" name="Revenue" fill="var(--primary)" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyState title="No revenue trend yet" description="Completed payments will populate this chart." />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Billing Alerts</CardTitle>
                <CardDescription>Finance records requiring owner review.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="rounded-2xl border bg-muted/30 p-4">
                  <p className="text-sm text-muted-foreground">Student invoices needing attention</p>
                  <p className="mt-1 text-3xl font-semibold">{compactNumber(data.finance.invoicesNeedingAttention)}</p>
                </div>
                <div className="rounded-2xl border bg-muted/30 p-4">
                  <p className="text-sm text-muted-foreground">Platform invoices pending/overdue</p>
                  <p className="mt-1 text-3xl font-semibold">{compactNumber(data.finance.platformInvoicesPending + data.finance.platformInvoicesOverdue)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{currency.format(data.finance.platformInvoiceAmount)} total platform billing</p>
                </div>
                <Button className="w-full" onClick={() => router.push(tenantHref("/admin/finance/dashboard"))}>
                  Open Finance
                  <ArrowRight className="size-4" />
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="operations" className="space-y-5">
          <div className="grid gap-5 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Communication</CardTitle>
                <CardDescription>Messages, broadcasts, and latest announcements.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border bg-muted/30 p-4">
                    <MessageSquare className="mb-3 size-5 text-primary" />
                    <p className="text-2xl font-semibold">{compactNumber(data.operations.messages.last7Days)}</p>
                    <p className="text-xs text-muted-foreground">messages this week</p>
                  </div>
                  <div className="rounded-2xl border bg-muted/30 p-4">
                    <Megaphone className="mb-3 size-5 text-primary" />
                    <p className="text-2xl font-semibold">{compactNumber(data.operations.broadcasts.sent)}</p>
                    <p className="text-xs text-muted-foreground">broadcasts sent</p>
                  </div>
                </div>
                <Button variant="outline" className="w-full" onClick={() => router.push(tenantHref("/admin/messages"))}>Open Messages</Button>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Latest Announcements</CardTitle>
                <CardDescription>Published and drafted announcements from this tenant.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.operations.announcements.length ? (
                  data.operations.announcements.map((announcement) => (
                    <div key={announcement.id} className="flex items-center justify-between gap-3 rounded-2xl border bg-muted/20 p-4">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{announcement.title}</p>
                        <p className="text-xs text-muted-foreground">Created {relativeTime(announcement.createdAt)} · Publishes {formatDate(announcement.publishDate)}</p>
                      </div>
                      <Badge className={cn("rounded-full", statusClass(announcement.published ? "published" : "draft"))}>
                        {announcement.published ? "Published" : "Draft"}
                      </Badge>
                    </div>
                  ))
                ) : (
                  <EmptyState title="No announcements yet" description="Create announcements to keep staff, students, and parents aligned." />
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="attention" className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {data.attention.map((item) => (
              <Card key={item.label} className="transition-colors hover:border-primary/40">
                <CardHeader>
                  <div className="flex items-center justify-between gap-3">
                    <CardTitle className="text-base">{item.label}</CardTitle>
                    <Badge className={cn("rounded-full capitalize", statusClass(item.severity))}>{item.severity}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-4xl font-semibold">{compactNumber(item.value)}</p>
                  <Button variant="link" className="mt-3 h-auto px-0 text-primary" onClick={() => router.push(tenantHref(item.href))}>
                    Review
                    <ArrowRight className="size-3.5" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          <Alert className="rounded-3xl">
            <Bell className="size-4" />
            <AlertTitle>Owner review workflow</AlertTitle>
            <AlertDescription>
              These cards are calculated from real tenant records. As we implement each owner dashboard module, this section will become the central triage queue for billing, HR, communication, and academic risks.
            </AlertDescription>
          </Alert>
        </TabsContent>
      </Tabs>
    </div>
  );
}
