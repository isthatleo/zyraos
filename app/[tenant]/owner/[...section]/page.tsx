"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  Bell,
  Briefcase,
  CalendarCheck,
  ClipboardList,
  CreditCard,
  FileText,
  Megaphone,
  MessageSquare,
  Receipt,
  RefreshCw,
  Settings,
  Shield,
  Users,
  Utensils,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { getTenantSubdomain } from "@/lib/tenant-routing";
import { cn } from "@/lib/utils";

type OwnerDashboardData = {
  school: { name: string; slug: string; type: string; status: string; currencyCode: string };
  subscription: null | { planName: string; status: string; maxStaff: number | null; maxStudents: number | null; endDate: string | null };
  kpis: {
    totalStudents: number;
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
    capacityUsed: number;
  };
  finance: {
    billed: number;
    paid: number;
    outstanding: number;
    collectionRate: number;
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
  attention: Array<{ label: string; value: number; severity: string; href: string }>;
};

type OwnerSectionConfig = {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  primaryAction?: { label: string; href: string };
  secondaryAction?: { label: string; href: string };
  focus: Array<"students" | "staff" | "finance" | "billing" | "attendance" | "communication" | "governance" | "subscription">;
};

const sectionConfigs: Record<string, OwnerSectionConfig> = {
  analytics: {
    title: "School Analytics",
    description: "Executive analytics across students, staff, attendance, performance, capacity, and revenue.",
    icon: BarChart3,
    primaryAction: { label: "Open owner dashboard", href: "/owner/dashboard" },
    focus: ["students", "staff", "attendance", "finance", "subscription"],
  },
  staff: {
    title: "Staff Management",
    description: "Owner-level staff creation, leadership assignment, and staff capacity oversight.",
    icon: Users,
    primaryAction: { label: "Create staff account", href: "/owner/staff" },
    secondaryAction: { label: "Open HR dashboard", href: "/owner/hr" },
    focus: ["staff", "governance", "subscription"],
  },
  hr: {
    title: "HR Dashboard",
    description: "Staff footprint, leave queue, payroll exposure, and human-resource controls.",
    icon: Briefcase,
    primaryAction: { label: "Open HR dashboard", href: "/owner/hr" },
    focus: ["staff", "governance"],
  },
  "staff-attendance": {
    title: "Staff Attendance",
    description: "High-level attendance and workforce reliability view for ownership review.",
    icon: CalendarCheck,
    primaryAction: { label: "Open attendance overview", href: "/owner/staff-attendance" },
    focus: ["attendance", "staff"],
  },
  leave: {
    title: "Leave Management",
    description: "Owner review of leave pressure, pending leave, and staff availability.",
    icon: ClipboardList,
    primaryAction: { label: "Open leave overview", href: "/owner/leave" },
    focus: ["staff", "governance"],
  },
  payroll: {
    title: "Payroll Oversight",
    description: "Payroll exposure, salary workflow state, and owner finance review.",
    icon: CreditCard,
    primaryAction: { label: "Open payroll overview", href: "/owner/payroll" },
    focus: ["staff", "finance"],
  },
  finance: {
    title: "Finance Overview",
    description: "Owner-level fee collection, payment health, outstanding balances, and finance controls.",
    icon: Wallet,
    primaryAction: { label: "Open finance overview", href: "/owner/finance" },
    focus: ["finance", "billing"],
  },
  payments: {
    title: "Payments",
    description: "Payment collection monitoring, pending payments, and failed transaction visibility.",
    icon: CreditCard,
    primaryAction: { label: "Open payments overview", href: "/owner/payments" },
    focus: ["finance"],
  },
  invoices: {
    title: "Invoices",
    description: "Student invoice status, unpaid balances, and invoice risk review.",
    icon: FileText,
    primaryAction: { label: "Open invoices overview", href: "/owner/invoices" },
    focus: ["finance"],
  },
  reports: {
    title: "Owner Reports",
    description: "Executive report access for finance, staffing, attendance, and academic performance.",
    icon: BarChart3,
    primaryAction: { label: "Open owner reports", href: "/owner/reports" },
    focus: ["students", "staff", "finance", "attendance"],
  },
  billing: {
    title: "Platform Billing",
    description: "Roxan subscription invoices, plan limits, billing status, and renewal pressure.",
    icon: Receipt,
    primaryAction: { label: "Open billing overview", href: "/owner/billing" },
    focus: ["billing", "subscription"],
  },
  messages: {
    title: "Owner Messages",
    description: "Owner communication inbox for school leadership, platform support, and governance matters.",
    icon: MessageSquare,
    primaryAction: { label: "Open owner messages", href: "/owner/messages" },
    focus: ["communication"],
  },
  broadcasts: {
    title: "Broadcasts",
    description: "Owner review of school-wide communication delivery and failed broadcast risk.",
    icon: Megaphone,
    primaryAction: { label: "Open broadcasts overview", href: "/owner/broadcasts" },
    focus: ["communication"],
  },
  announcements: {
    title: "Announcements",
    description: "Owner visibility into announcements and communication governance.",
    icon: Bell,
    primaryAction: { label: "Open announcements overview", href: "/owner/announcements" },
    focus: ["communication"],
  },
  canteen: {
    title: "Canteen Oversight",
    description: "Owner view for canteen revenue, activity, and operational controls.",
    icon: Utensils,
    primaryAction: { label: "Open canteen overview", href: "/owner/canteen" },
    focus: ["finance", "staff"],
  },
  users: {
    title: "Users",
    description: "Owner-level user management, staff account creation, and access governance.",
    icon: Users,
    primaryAction: { label: "Open users overview", href: "/owner/users" },
    focus: ["staff", "governance"],
  },
  permissions: {
    title: "Permissions",
    description: "Role permissions and governance controls for leadership access.",
    icon: Shield,
    primaryAction: { label: "Open permissions overview", href: "/owner/permissions" },
    focus: ["governance"],
  },
  audit: {
    title: "Audit & Logs",
    description: "Owner-level audit visibility for risky changes, access events, and governance review.",
    icon: ClipboardList,
    primaryAction: { label: "Open audit overview", href: "/owner/audit" },
    focus: ["governance"],
  },
  settings: {
    title: "School Settings",
    description: "Owner settings entry point for tenant branding, security, finance, and operational policies.",
    icon: Settings,
    primaryAction: { label: "Open owner settings", href: "/owner/settings" },
    focus: ["governance", "subscription"],
  },
};

function compact(value: number) {
  return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(value || 0);
}

function percent(value: number) {
  return `${Number(value || 0).toFixed(value % 1 ? 1 : 0)}%`;
}

function severityClass(severity: string) {
  if (severity === "critical") return "border-destructive/25 bg-destructive/10 text-destructive";
  if (severity === "warning" || severity === "info") return "border-primary/25 bg-primary/10 text-primary";
  return "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
}

function MetricCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-semibold">{value}</p>
        <p className="mt-2 text-xs text-muted-foreground">{detail}</p>
      </CardContent>
    </Card>
  );
}

export default function OwnerModulePage() {
  const params = useParams<{ tenant?: string; section?: string[] }>();
  const router = useRouter();
  const tenantSlug = String(params?.tenant || "");
  const sectionKey = params?.section?.join("/") || "analytics";
  const config = sectionConfigs[sectionKey] || sectionConfigs.analytics;
  const Icon = config.icon;
  const [isTenantSubdomain, setIsTenantSubdomain] = React.useState(false);
  const [data, setData] = React.useState<OwnerDashboardData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setIsTenantSubdomain(Boolean(getTenantSubdomain(window.location.hostname)));
  }, []);

  const tenantHref = React.useCallback(
    (href: string) => (isTenantSubdomain || !tenantSlug ? href : href.startsWith("/") ? `/${tenantSlug}${href}` : `/${tenantSlug}/${href}`),
    [isTenantSubdomain, tenantSlug]
  );

  React.useEffect(() => {
    if (sectionKey === "analytics") {
      router.replace(tenantHref("/owner/dashboard"));
    }
  }, [router, sectionKey, tenantHref]);

  const load = React.useCallback(
    async (refresh = false) => {
      setError(null);
      if (refresh) setRefreshing(true);
      else setLoading(true);
      try {
        const response = await fetch(`/api/tenant/dashboard?slug=${encodeURIComponent(tenantSlug)}`, {
          credentials: "include",
          cache: "no-store",
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload?.error || "Failed to load owner page.");
        setData(payload);
        if (refresh) toast.success("Owner page refreshed");
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Failed to load owner page.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [tenantSlug]
  );

  React.useEffect(() => {
    void load();
  }, [load]);

  const currency = React.useMemo(
    () => new Intl.NumberFormat("en", { style: "currency", currency: data?.school.currencyCode || "ZAR", maximumFractionDigits: 0 }),
    [data?.school.currencyCode]
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-56 rounded-3xl" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-32 rounded-3xl" />)}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <Alert variant="destructive" className="rounded-3xl">
        <AlertCircle className="size-4" />
        <AlertTitle>{config.title} failed to load</AlertTitle>
        <AlertDescription className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span>{error || "No owner data was returned."}</span>
          <Button variant="secondary" onClick={() => load()}>Retry</Button>
        </AlertDescription>
      </Alert>
    );
  }

  const metrics = {
    students: <MetricCard label="Students" value={compact(data.kpis.totalStudents)} detail={`${compact(data.kpis.totalClasses)} classes · ${percent(data.kpis.capacityUsed)} capacity used`} />,
    staff: <MetricCard label="Staff" value={compact(data.kpis.totalStaff)} detail={`${compact(data.kpis.totalTeachers)} teachers · ${compact(data.kpis.activeUsers)} active users`} />,
    finance: <MetricCard label="Collections" value={percent(data.finance.collectionRate)} detail={`${currency.format(data.finance.outstanding)} outstanding`} />,
    billing: <MetricCard label="Platform billing" value={compact(data.finance.platformInvoicesPending + data.finance.platformInvoicesOverdue)} detail={`${currency.format(data.finance.platformInvoiceAmount)} total platform invoices`} />,
    attendance: <MetricCard label="Attendance" value={percent(data.kpis.attendanceRate)} detail={`Today ${percent(data.kpis.todayAttendanceRate)} · performance ${percent(data.kpis.performanceAverage)}`} />,
    communication: <MetricCard label="Communication" value={compact(data.operations.messages.last7Days)} detail={`${compact(data.operations.broadcasts.sent)} broadcasts sent · ${compact(data.operations.broadcasts.failed)} failed`} />,
    governance: <MetricCard label="Governance" value={compact(data.kpis.ownerCount + data.kpis.adminCount)} detail={`${compact(data.operations.pendingLeaveRequests)} leave requests · ${compact(data.kpis.parentCount)} parents`} />,
    subscription: <MetricCard label="Subscription" value={data.subscription?.planName || "Unassigned"} detail={data.subscription ? `${data.subscription.status} · staff limit ${data.subscription.maxStaff ? compact(data.subscription.maxStaff) : "unlimited"}` : "No plan linked"} />,
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Icon className="size-6" />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="rounded-full">{data.school.name}</Badge>
              <Badge className={cn("rounded-full capitalize", severityClass(data.school.status === "active" ? "healthy" : "warning"))}>{data.school.status}</Badge>
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight">{config.title}</h1>
            <p className="mt-2 max-w-3xl text-sm text-muted-foreground">{config.description}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => load(true)} disabled={refreshing}>
              <RefreshCw className={cn("size-4", refreshing && "animate-spin")} />
              Refresh
            </Button>
            {config.secondaryAction ? (
              <Button variant="outline" onClick={() => router.push(tenantHref(config.secondaryAction!.href))}>
                {config.secondaryAction.label}
              </Button>
            ) : null}
            {config.primaryAction ? (
              <Button onClick={() => router.push(tenantHref(config.primaryAction!.href))}>
                {config.primaryAction.label}
                <ArrowRight className="size-4" />
              </Button>
            ) : null}
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {config.focus.map((key) => (
          <React.Fragment key={key}>{metrics[key]}</React.Fragment>
        ))}
      </section>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Owner Controls</CardTitle>
            <CardDescription>Owner-scoped navigation for this section. Operational forms remain delegated to the correct underlying module.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {(config.primaryAction ? [config.primaryAction] : []).concat(config.secondaryAction ? [config.secondaryAction] : []).map((action) => (
              <Button key={action.href} variant="outline" className="h-16 justify-start rounded-2xl" onClick={() => router.push(tenantHref(action.href))}>
                <span className="mr-3 rounded-xl bg-primary/10 p-2 text-primary">
                  <ArrowRight className="size-4" />
                </span>
                {action.label}
              </Button>
            ))}
            <Button variant="outline" className="h-16 justify-start rounded-2xl" onClick={() => router.push(tenantHref("/owner/dashboard"))}>
              <span className="mr-3 rounded-xl bg-primary/10 p-2 text-primary">
                <BarChart3 className="size-4" />
              </span>
              Back to Owner Dashboard
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Risk Snapshot</CardTitle>
            <CardDescription>Live owner attention items.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.attention.map((item) => (
              <div key={item.label} className="rounded-2xl border bg-muted/25 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium">{item.label}</p>
                  <Badge className={cn("rounded-full capitalize", severityClass(item.severity))}>{item.severity}</Badge>
                </div>
                <p className="mt-2 text-2xl font-semibold">{compact(item.value)}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
