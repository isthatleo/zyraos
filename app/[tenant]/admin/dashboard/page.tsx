"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  Bell,
  BookOpen,
  CalendarCheck,
  CheckCircle2,
  ClipboardList,
  GraduationCap,
  Loader2,
  Megaphone,
  MessageSquare,
  RefreshCw,
  Settings,
  ShieldCheck,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  Area,
  AreaChart,
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
import { getTenantSubdomain } from "@/lib/tenant-routing";
import { cn } from "@/lib/utils";

type AdminDashboardData = {
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

const quickActions = [
  { label: "Start Admissions", description: "Register or review student applications.", href: "/admin/admissions", icon: Users },
  { label: "Manage Classes", description: "Open stages, streams, subjects, and timetable.", href: "/admin/classes", icon: BookOpen },
  { label: "Mark Attendance", description: "Review daily student attendance.", href: "/admin/attendance", icon: CalendarCheck },
  { label: "Open Messages", description: "Contact staff, owner, and platform admins.", href: "/admin/messages", icon: MessageSquare },
  { label: "Broadcast Update", description: "Send staff-wide school operations updates.", href: "/admin/broadcasts", icon: Megaphone },
  { label: "School Settings", description: "Configure school profile and academic policies.", href: "/admin/settings", icon: Settings },
];

function compactNumber(value: number) {
  return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(value || 0);
}

function formatPercent(value: number) {
  const safeValue = Number.isFinite(value) ? value : 0;
  return `${safeValue.toFixed(safeValue % 1 ? 1 : 0)}%`;
}

function formatDate(value: string | null) {
  if (!value) return "Not scheduled";
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
  if (["active", "completed", "sent", "published", "healthy"].includes(value)) {
    return "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  }
  if (["pending", "draft", "scheduled", "info"].includes(value)) {
    return "border-primary/25 bg-primary/10 text-primary";
  }
  if (["overdue", "failed", "critical", "suspended"].includes(value)) {
    return "border-destructive/25 bg-destructive/10 text-destructive";
  }
  return "border-border bg-muted text-muted-foreground";
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex min-h-44 flex-col items-center justify-center rounded-2xl border border-dashed bg-muted/30 p-8 text-center">
      <div className="mb-3 rounded-full bg-primary/10 p-3 text-primary">
        <BarChart3 className="size-5" />
      </div>
      <p className="font-semibold">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function DashboardShellHeader({ onRefresh, refreshing }: { onRefresh?: () => void; refreshing?: boolean }) {
  return (
    <section className="overflow-hidden rounded-3xl border bg-card shadow-sm">
      <div className="p-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="rounded-full">School admin</Badge>
          <Badge variant="outline" className="rounded-full">Tenant operations</Badge>
        </div>
        <h1 className="mt-4 text-3xl font-bold tracking-tight md:text-4xl">School Admin Command Center</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          Loading live admissions, academics, attendance, communication, users, and school readiness.
        </p>
        <Button variant="ghost" className="mt-5" onClick={onRefresh} disabled={!onRefresh || refreshing}>
          {refreshing ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
          Refresh
        </Button>
      </div>
    </section>
  );
}

function LoadingDashboard({ onRefresh, refreshing }: { onRefresh?: () => void; refreshing?: boolean }) {
  return (
    <div className="space-y-6">
      <DashboardShellHeader onRefresh={onRefresh} refreshing={refreshing} />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-40 rounded-3xl" />
        ))}
      </div>
      <div className="grid gap-5 xl:grid-cols-3">
        <Skeleton className="h-96 rounded-3xl xl:col-span-2" />
        <Skeleton className="h-96 rounded-3xl" />
      </div>
    </div>
  );
}

export default function SchoolAdminDashboardPage() {
  const router = useRouter();
  const params = useParams<{ tenant?: string }>();
  const tenantSlug = String(params?.tenant || "");
  const [isTenantSubdomain, setIsTenantSubdomain] = React.useState(false);
  const [data, setData] = React.useState<AdminDashboardData | null>(null);
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

  const navigate = React.useCallback(
    (href: string) => {
      router.push(tenantHref(href));
    },
    [router, tenantHref]
  );

  const loadDashboard = React.useCallback(
    async (mode: "initial" | "refresh" = "initial") => {
      if (!tenantSlug) return;
      if (mode === "refresh") setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/tenant/dashboard?slug=${encodeURIComponent(tenantSlug)}`, {
          credentials: "include",
          cache: "no-store",
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload?.error || "Failed to load school admin dashboard.");
        setData(payload as AdminDashboardData);
        if (mode === "refresh") toast.success("School admin dashboard refreshed");
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Failed to load school admin dashboard.");
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

  if (loading) return <LoadingDashboard onRefresh={() => loadDashboard()} refreshing={refreshing} />;

  if (error || !data) {
    return (
      <div className="space-y-6">
        <DashboardShellHeader onRefresh={() => loadDashboard()} refreshing={refreshing} />
        <Alert variant="destructive" className="rounded-3xl">
          <AlertCircle className="size-4" />
          <AlertTitle>School admin dashboard failed to load</AlertTitle>
          <AlertDescription className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <span>{error || "No dashboard data was returned."}</span>
            <Button variant="secondary" onClick={() => loadDashboard()}>
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const capacityValue = Math.min(Math.max(data.kpis.capacityUsed || 0, 0), 100);
  const attendanceValue = Math.min(Math.max(data.kpis.attendanceRate || 0, 0), 100);
  const performanceValue = Math.min(Math.max(data.kpis.performanceAverage || 0, 0), 100);
  const hasTrendData = data.charts.monthly.some((entry) => entry.students || entry.attendance || entry.performance);
  const updatedAt = data.generatedAt ? formatDate(data.generatedAt) : "Just now";

  const kpiCards = [
    {
      title: "Students",
      value: compactNumber(data.kpis.totalStudents),
      detail: `${compactNumber(data.kpis.activeStudents)} active, ${compactNumber(data.kpis.newStudentsThisMonth)} new this month`,
      icon: Users,
      href: "/admin/students",
      progress: data.kpis.totalStudents ? (data.kpis.activeStudents / data.kpis.totalStudents) * 100 : 0,
    },
    {
      title: "Teachers & Staff",
      value: compactNumber(data.kpis.totalStaff),
      detail: `${compactNumber(data.kpis.totalTeachers)} teachers, ${compactNumber(data.kpis.activeUsers)} active users`,
      icon: GraduationCap,
      href: "/admin/staff",
      progress: data.kpis.totalStaff ? (data.kpis.activeUsers / data.kpis.totalStaff) * 100 : 0,
    },
    {
      title: "Classes",
      value: compactNumber(data.kpis.totalClasses),
      detail: data.kpis.totalCapacity ? `${formatPercent(capacityValue)} capacity used` : "Capacity not configured",
      icon: BookOpen,
      href: "/admin/classes",
      progress: capacityValue,
    },
    {
      title: "Attendance",
      value: formatPercent(attendanceValue),
      detail: `Today: ${formatPercent(data.kpis.todayAttendanceRate)}`,
      icon: CalendarCheck,
      href: "/admin/attendance",
      progress: attendanceValue,
    },
  ];

  const readinessCards = [
    { title: "Academic performance", value: formatPercent(performanceValue), progress: performanceValue, action: "Open Exams", href: "/admin/exams", icon: TrendingUp },
    { title: "Announcements live", value: compactNumber(data.operations.announcements.filter((item) => item.published).length), progress: data.operations.announcements.length ? (data.operations.announcements.filter((item) => item.published).length / data.operations.announcements.length) * 100 : 0, action: "Manage Announcements", href: "/admin/announcements", icon: Bell },
    { title: "Broadcast delivery", value: compactNumber(data.operations.broadcasts.sent), progress: data.operations.broadcasts.total ? (data.operations.broadcasts.sent / data.operations.broadcasts.total) * 100 : 0, action: "Open Broadcasts", href: "/admin/broadcasts", icon: Megaphone },
  ];

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-3xl border bg-card shadow-sm">
        <div className="grid gap-6 p-6 xl:grid-cols-[1fr_360px]">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge className={cn("rounded-full capitalize", statusClass(data.school.status))}>{data.school.status}</Badge>
              <Badge variant="outline" className="rounded-full capitalize">{data.school.type.replace(/_/g, " ")}</Badge>
              <Badge variant="outline" className="rounded-full">{data.school.country || "Tenant school"}</Badge>
              <Badge variant="outline" className="rounded-full">Updated {updatedAt}</Badge>
            </div>
            <h1 className="mt-4 text-3xl font-bold tracking-tight md:text-4xl">School Admin Command Center</h1>
            <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
              Live tenant operations for {data.school.name}: admissions, academics, attendance, communication, users, and school readiness.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Button onClick={() => navigate("/admin/admissions")}>
                Start Admissions
                <ArrowRight className="size-4" />
              </Button>
              <Button variant="outline" onClick={() => navigate("/admin/classes")}>
                Manage Classes
              </Button>
              <Button variant="ghost" onClick={() => loadDashboard("refresh")} disabled={refreshing}>
                {refreshing ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
                Refresh
              </Button>
            </div>
          </div>

          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ShieldCheck className="size-4 text-primary" />
                Admin Readiness
              </CardTitle>
              <CardDescription>Operational health from real tenant records.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Attendance health</span>
                  <span className="font-semibold">{formatPercent(attendanceValue)}</span>
                </div>
                <Progress value={attendanceValue} className="h-3" />
              </div>
              <div>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Academic performance</span>
                  <span className="font-semibold">{formatPercent(performanceValue)}</span>
                </div>
                <Progress value={performanceValue} className="h-3" />
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <button type="button" onClick={() => navigate("/admin/users")} className="rounded-2xl border bg-card p-3 text-left transition-colors hover:border-primary/40">
                  <p className="text-muted-foreground">Admins</p>
                  <p className="text-xl font-semibold">{compactNumber(data.kpis.adminCount)}</p>
                </button>
                <button type="button" onClick={() => navigate("/admin/users")} className="rounded-2xl border bg-card p-3 text-left transition-colors hover:border-primary/40">
                  <p className="text-muted-foreground">Parents</p>
                  <p className="text-xl font-semibold">{compactNumber(data.kpis.parentCount)}</p>
                </button>
              </div>
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
                <CardTitle className="text-sm font-semibold text-muted-foreground">{card.title}</CardTitle>
                <div className="rounded-xl bg-primary/10 p-2 text-primary">
                  <Icon className="size-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{card.value}</div>
                <p className="mt-2 text-xs text-muted-foreground">{card.detail}</p>
                <Progress value={Math.min(Math.max(card.progress, 0), 100)} className="mt-4 h-2" />
                <Button variant="link" className="mt-3 h-auto px-0 text-primary" onClick={() => navigate(card.href)}>
                  Open section
                  <ArrowRight className="size-3.5" />
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <section className="grid gap-5 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Academic Pulse</CardTitle>
            <CardDescription>Enrollment, attendance, and performance trends from tenant records.</CardDescription>
          </CardHeader>
          <CardContent>
            {hasTrendData ? (
              <ResponsiveContainer width="100%" height={330}>
                <AreaChart data={data.charts.monthly}>
                  <defs>
                    <linearGradient id="adminStudentsGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.28} />
                      <stop offset="95%" stopColor="var(--primary)" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={12} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                  <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: "14px", color: "var(--popover-foreground)" }} />
                  <Area type="monotone" dataKey="students" name="New students" stroke="var(--primary)" fill="url(#adminStudentsGradient)" strokeWidth={2} />
                  <Area type="monotone" dataKey="attendance" name="Attendance %" stroke="var(--chart-2)" fill="transparent" strokeWidth={2} />
                  <Area type="monotone" dataKey="performance" name="Performance %" stroke="var(--chart-3)" fill="transparent" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState title="No academic trend yet" description="Admissions, attendance, and assessment activity will appear here as staff work in the tenant dashboard." />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Class Distribution</CardTitle>
            <CardDescription>Configured classes grouped by stage or level.</CardDescription>
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
              <EmptyState title="No classes configured" description="Create classes from Academics to activate class distribution analytics." />
            )}
            <Button variant="outline" className="mt-4 w-full" onClick={() => navigate("/admin/classes")}>
              Manage Academic Structure
            </Button>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Every action routes inside the active tenant school admin dashboard.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.href}
                  type="button"
                  onClick={() => navigate(action.href)}
                  className="flex gap-3 rounded-2xl border bg-card p-4 text-left transition-colors hover:border-primary/40 hover:bg-muted/40"
                >
                  <span className="rounded-xl bg-primary/10 p-2 text-primary">
                    <Icon className="size-5" />
                  </span>
                  <span>
                    <span className="block font-semibold">{action.label}</span>
                    <span className="mt-1 block text-xs text-muted-foreground">{action.description}</span>
                  </span>
                </button>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Communication Queue</CardTitle>
            <CardDescription>Messages, broadcasts, and announcements.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <button type="button" onClick={() => navigate("/admin/messages")} className="flex w-full items-center justify-between rounded-2xl border bg-muted/30 p-4 text-left transition-colors hover:border-primary/40">
              <span>
                <span className="block font-semibold">{compactNumber(data.operations.messages.last7Days)}</span>
                <span className="text-xs text-muted-foreground">messages this week</span>
              </span>
              <MessageSquare className="size-5 text-primary" />
            </button>
            <button type="button" onClick={() => navigate("/admin/broadcasts")} className="flex w-full items-center justify-between rounded-2xl border bg-muted/30 p-4 text-left transition-colors hover:border-primary/40">
              <span>
                <span className="block font-semibold">{compactNumber(data.operations.broadcasts.pending)}</span>
                <span className="text-xs text-muted-foreground">pending broadcasts</span>
              </span>
              <Megaphone className="size-5 text-primary" />
            </button>
            <button type="button" onClick={() => navigate("/admin/announcements")} className="flex w-full items-center justify-between rounded-2xl border bg-muted/30 p-4 text-left transition-colors hover:border-primary/40">
              <span>
                <span className="block font-semibold">{compactNumber(data.operations.announcements.length)}</span>
                <span className="text-xs text-muted-foreground">announcement records</span>
              </span>
              <Bell className="size-5 text-primary" />
            </button>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-5 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Operational Readiness</CardTitle>
            <CardDescription>School admin priorities calculated from tenant activity.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {readinessCards.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="rounded-2xl border bg-muted/20 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold">{item.title}</p>
                      <p className="text-2xl font-bold">{item.value}</p>
                    </div>
                    <div className="rounded-xl bg-primary/10 p-2 text-primary">
                      <Icon className="size-5" />
                    </div>
                  </div>
                  <Progress value={Math.min(Math.max(item.progress, 0), 100)} className="mt-3 h-2" />
                  <Button variant="link" className="mt-2 h-auto px-0 text-primary" onClick={() => navigate(item.href)}>
                    {item.action}
                    <ArrowRight className="size-3.5" />
                  </Button>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Attention Required</CardTitle>
            <CardDescription>Live triage queue from tenant dashboard data.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.attention.length ? (
              data.attention.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => navigate(item.href)}
                  className="flex w-full items-center justify-between gap-4 rounded-2xl border bg-card p-4 text-left transition-colors hover:border-primary/40 hover:bg-muted/40"
                >
                  <span>
                    <span className="block font-semibold">{item.label}</span>
                    <span className="text-xs text-muted-foreground">{compactNumber(item.value)} records need review</span>
                  </span>
                  <Badge className={cn("rounded-full capitalize", statusClass(item.severity))}>{item.severity}</Badge>
                </button>
              ))
            ) : (
              <EmptyState title="No attention items" description="Critical tenant issues will appear here as modules begin recording activity." />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Newest school activity across tenant modules.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.recentActivity.length ? (
              data.recentActivity.slice(0, 6).map((activity, index) => (
                <button
                  key={`${activity.type}-${activity.timestamp}-${index}`}
                  type="button"
                  onClick={() => navigate(activity.href)}
                  className="flex w-full gap-3 rounded-2xl border bg-card p-3 text-left transition-colors hover:border-primary/40 hover:bg-muted/40"
                >
                  <div className="mt-0.5 rounded-xl bg-primary/10 p-2 text-primary">
                    {activity.type === "announcement" ? <Megaphone className="size-4" /> : activity.type === "student" ? <Users className="size-4" /> : <CheckCircle2 className="size-4" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <p className="truncate text-sm font-semibold">{activity.title}</p>
                      <Badge variant="outline" className={cn("rounded-full text-[10px]", statusClass(activity.status))}>{activity.status}</Badge>
                    </div>
                    <p className="mt-1 truncate text-xs text-muted-foreground">{activity.description}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">{relativeTime(activity.timestamp)}</p>
                  </div>
                </button>
              ))
            ) : (
              <EmptyState title="No activity yet" description="Recent admissions, announcements, and academic records will appear here." />
            )}
          </CardContent>
        </Card>
      </section>

      <Alert className="rounded-3xl">
        <ClipboardList className="size-4" />
        <AlertTitle>School admin workflow</AlertTitle>
        <AlertDescription>
          This dashboard reads from the tenant dashboard API and routes every action within the signed-in tenant scope. As each admin module is built, its live metrics will continue feeding this page.
        </AlertDescription>
      </Alert>
    </div>
  );
}
