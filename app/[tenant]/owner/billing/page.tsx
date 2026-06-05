"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  CreditCard,
  Download,
  FileText,
  Gauge,
  Printer,
  Receipt,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Wallet,
} from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getTenantSubdomain } from "@/lib/tenant-routing";
import { cn } from "@/lib/utils";

type PlatformInvoice = {
  id: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  originalAmount: number;
  originalCurrency: string;
  exchangeRate: number;
  exchangeRateDate: string | null;
  exchangeRateProvider: string;
  exchangeRateStale: boolean;
  conversionAvailable: boolean;
  status: string;
  age: string;
  daysToDue: number | null;
  issueDate: string | null;
  dueDate: string | null;
  paidDate: string | null;
  description: string;
  notes: string;
};

type BillingPayload = {
  school: { name: string; slug: string; type: string; status: string; currencyCode: string };
  generatedAt: string;
  subscription: null | {
    id: string;
    status: string;
    startDate: string | null;
    endDate: string | null;
    autoRenew: boolean;
    daysToRenewal: number | null;
    plan: {
      id: string;
      name: string;
      description: string;
      price: number;
      currency: string;
      originalPrice: number;
      originalCurrency: string;
      exchangeRate: number;
      exchangeRateProvider: string;
      features: string[];
      maxStudents: number;
      maxStaff: number;
      isActive: boolean;
    };
  };
  usage: {
    activeStudents: number;
    totalStudents: number;
    maxStudents: number;
    studentUsageRate: number;
    activeUsers: number;
    totalUsers: number;
    maxStaff: number;
    staffUsageRate: number;
    enabledModules: number;
    totalModules: number;
  };
  invoices: PlatformInvoice[];
  recentAudit: Array<{ action: string; resource: string; status: string; createdAt: string | null }>;
  analytics: {
    byStatus: Array<{ name: string; records: number; amount: number }>;
    byAge: Array<{ name: string; records: number; amount: number }>;
  };
  summary: {
    invoices: number;
    openInvoices: number;
    overdueInvoices: number;
    dueSoonInvoices: number;
    openAmount: number;
    overdueAmount: number;
    paidAmount: number;
    totalAmount: number;
    paymentCompletionRate: number;
    nextDueDate: string | null;
  };
};

const STATUS_STYLES: Record<string, string> = {
  paid: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  pending: "border-primary/30 bg-primary/10 text-primary",
  overdue: "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300",
  void: "border-muted-foreground/20 bg-muted text-muted-foreground",
};

const AGE_STYLES: Record<string, string> = {
  current: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  due_soon: "border-primary/30 bg-primary/10 text-primary",
  overdue: "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300",
  closed: "border-muted-foreground/20 bg-muted text-muted-foreground",
  unscheduled: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
};

const CHART_COLORS = ["hsl(var(--primary))", "hsl(146 66% 36%)", "hsl(346 77% 49%)", "hsl(199 89% 48%)", "hsl(38 92% 50%)"];

function formatDate(value: string | null) {
  if (!value) return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not set";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

function statusBadge(status: string) {
  return <Badge variant="outline" className={cn("rounded-full px-2.5 py-1 capitalize", STATUS_STYLES[status] || STATUS_STYLES.pending)}>{status.replace(/_/g, " ")}</Badge>;
}

function ageBadge(age: string) {
  return <Badge variant="outline" className={cn("rounded-full px-2.5 py-1 capitalize", AGE_STYLES[age] || AGE_STYLES.current)}>{age.replace(/_/g, " ")}</Badge>;
}

function StatCard({ label, value, detail, icon: Icon }: { label: string; value: string | number; detail: string; icon: React.ElementType }) {
  return (
    <Card className="border-border/70 bg-card/80 shadow-sm backdrop-blur">
      <CardContent className="flex items-center gap-4 p-5">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p>
          <p className="truncate text-xs text-muted-foreground">{detail}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function invoiceHtml(invoice: PlatformInvoice, schoolName: string) {
  const money = new Intl.NumberFormat("en", { style: "currency", currency: invoice.currency, maximumFractionDigits: 2 });
  const original = new Intl.NumberFormat("en", { style: "currency", currency: invoice.originalCurrency, maximumFractionDigits: 2 });
  return `<!doctype html><html><head><meta charset="utf-8"><title>${invoice.invoiceNumber}</title><style>
    body{font-family:Arial,Helvetica,sans-serif;background:#f8fafc;color:#111827;margin:0}.page{max-width:860px;margin:32px auto;background:white;border-radius:24px;padding:38px;box-shadow:0 18px 60px rgba(15,23,42,.1)}
    header{display:flex;justify-content:space-between;gap:24px;border-bottom:3px solid #f97316;padding-bottom:20px;margin-bottom:24px}.brand{font-size:28px;font-weight:800;color:#f97316}.muted{color:#64748b}.grid{display:grid;grid-template-columns:repeat(2,1fr);gap:14px}.box{border:1px solid #e2e8f0;border-radius:16px;padding:16px;background:#f8fafc}
    h1{margin:0;font-size:28px}.amount{font-size:34px;font-weight:800;margin-top:6px}.badge{display:inline-block;border-radius:999px;background:#fff7ed;color:#c2410c;padding:6px 12px;font-size:12px;font-weight:700;text-transform:uppercase}
    table{width:100%;border-collapse:collapse;margin-top:24px}td,th{padding:12px;border-bottom:1px solid #e2e8f0;text-align:left}th{background:#111827;color:white}footer{margin-top:40px;border-top:1px solid #e2e8f0;padding-top:16px;font-size:12px;color:#64748b}@media print{body{background:white}.page{box-shadow:none;margin:0;border-radius:0}}
  </style></head><body><main class="page"><header><div><div class="brand">ROXAN</div><p class="muted">Platform billing invoice for ${schoolName}</p></div><div><span class="badge">${invoice.status}</span><h1>${invoice.invoiceNumber}</h1></div></header>
  <section class="grid"><div class="box"><p class="muted">Amount due in tenant currency</p><div class="amount">${money.format(invoice.amount)}</div></div><div class="box"><p class="muted">Original platform amount</p><div class="amount">${original.format(invoice.originalAmount)}</div></div><div class="box"><strong>Issued</strong><p>${formatDate(invoice.issueDate)}</p></div><div class="box"><strong>Due</strong><p>${formatDate(invoice.dueDate)}</p></div></section>
  <table><thead><tr><th>Description</th><th>Status</th><th>Rate</th><th>Provider</th></tr></thead><tbody><tr><td>${invoice.description || "Roxan platform subscription"}</td><td>${invoice.status}</td><td>${invoice.exchangeRate}</td><td>${invoice.exchangeRateProvider}${invoice.exchangeRateDate ? ` (${invoice.exchangeRateDate})` : ""}</td></tr></tbody></table>
  <footer>Generated by Roxan Education System. ${invoice.notes || ""}</footer></main></body></html>`;
}

export default function OwnerBillingPage() {
  const params = useParams<{ tenant: string }>();
  const router = useRouter();
  const tenantSlug = String(params?.tenant || "");
  const [data, setData] = React.useState<BillingPayload | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [query, setQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [ageFilter, setAgeFilter] = React.useState("all");
  const [payingInvoice, setPayingInvoice] = React.useState<PlatformInvoice | null>(null);
  const [paymentReference, setPaymentReference] = React.useState("");
  const [paymentMethod, setPaymentMethod] = React.useState("manual");
  const [paymentState, setPaymentState] = React.useState<"idle" | "processing" | "success">("idle");

  const tenantHref = React.useCallback((path: string) => (typeof window !== "undefined" && getTenantSubdomain(window.location.host) ? path : `/${tenantSlug}${path}`), [tenantSlug]);
  const currency = React.useMemo(() => new Intl.NumberFormat("en", { style: "currency", currency: data?.school.currencyCode || "ZAR", maximumFractionDigits: 0 }), [data?.school.currencyCode]);
  const planCurrency = React.useMemo(() => new Intl.NumberFormat("en", { style: "currency", currency: data?.subscription?.plan.currency || data?.school.currencyCode || "ZAR", maximumFractionDigits: 0 }), [data?.school.currencyCode, data?.subscription?.plan.currency]);

  const load = React.useCallback(async (quiet = false) => {
    if (!tenantSlug) return;
    setError(null);
    if (quiet) setRefreshing(true); else setLoading(true);
    try {
      const response = await fetch(`/api/tenant/owner/billing?tenant=${tenantSlug}`, { credentials: "include", cache: "no-store" });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || "Failed to load platform billing");
      setData(payload);
    } catch (nextError) {
      const message = nextError instanceof Error ? nextError.message : "Failed to load platform billing";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [tenantSlug]);

  React.useEffect(() => { void load(); }, [load]);

  const filteredInvoices = React.useMemo(() => {
    const term = query.trim().toLowerCase();
    return (data?.invoices || []).filter((invoice) => {
      const matchesTerm = !term || [invoice.invoiceNumber, invoice.description, invoice.notes, invoice.status, invoice.age].some((value) => value.toLowerCase().includes(term));
      const matchesStatus = statusFilter === "all" || invoice.status === statusFilter;
      const matchesAge = ageFilter === "all" || invoice.age === ageFilter;
      return matchesTerm && matchesStatus && matchesAge;
    });
  }, [ageFilter, data?.invoices, query, statusFilter]);

  const openDocument = (invoice: PlatformInvoice, print = false) => {
    if (!data) return;
    const doc = window.open("", "_blank", "noopener,noreferrer");
    if (!doc) return toast.error("Popup blocked. Allow popups to open the invoice document.");
    doc.document.write(invoiceHtml(invoice, data.school.name));
    doc.document.close();
    doc.focus();
    if (print) doc.print();
  };

  const downloadHtml = (invoice: PlatformInvoice) => {
    if (!data) return;
    const blob = new Blob([invoiceHtml(invoice, data.school.name)], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${invoice.invoiceNumber || "platform-invoice"}.html`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const openPayNow = (invoice: PlatformInvoice) => {
    setPayingInvoice(invoice);
    setPaymentMethod("manual");
    setPaymentReference(`ROX-${invoice.invoiceNumber}-${Date.now()}`.replace(/[^A-Z0-9-]/gi, "-"));
    setPaymentState("idle");
  };

  const completePayment = async () => {
    if (!payingInvoice) return;
    setPaymentState("processing");
    try {
      const response = await fetch(`/api/tenant/owner/billing?tenant=${tenantSlug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          invoiceId: payingInvoice.id,
          paymentMethod,
          paymentReference,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || "Failed to complete payment");
      setPaymentState("success");
      toast.success("Platform invoice paid");
      await load(true);
      window.setTimeout(() => {
        setPayingInvoice(null);
        setPaymentState("idle");
      }, 900);
    } catch (nextError) {
      setPaymentState("idle");
      toast.error(nextError instanceof Error ? nextError.message : "Failed to complete payment");
    }
  };

  if (loading) return <div className="space-y-6"><Skeleton className="h-36 rounded-3xl" /><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-32 rounded-3xl" />)}</div><Skeleton className="h-96 rounded-3xl" /></div>;

  if (error || !data) {
    return (
      <Alert variant="destructive" className="rounded-3xl">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Platform billing failed to load</AlertTitle>
        <AlertDescription className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span>{error || "No platform billing data was returned for this tenant."}</span>
          <Button variant="secondary" onClick={() => void load()}>Retry</Button>
        </AlertDescription>
      </Alert>
    );
  }

  const studentLimit = data.usage.maxStudents || Math.max(data.usage.activeStudents, 1);
  const staffLimit = data.usage.maxStaff || Math.max(data.usage.activeUsers, 1);

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-border/70 bg-card/80 shadow-sm backdrop-blur">
        <CardContent className="p-0">
          <div className="relative isolate p-6 md:p-8">
            <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_right,hsl(var(--primary)/0.16),transparent_38%),linear-gradient(135deg,hsl(var(--muted)/0.45),transparent)]" />
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-3xl">
                <Badge className="mb-3 rounded-full bg-primary/10 text-primary hover:bg-primary/10">Owner platform billing</Badge>
                <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Platform Billing</h1>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Review Roxan subscription status, plan limits, invoice exposure, renewal timing, and converted invoice values in {data.school.currencyCode}.
                </p>
                <p className="mt-3 text-xs text-muted-foreground">Last refreshed {formatDate(data.generatedAt)}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => router.push(tenantHref("/owner/finance"))}>Finance overview <ArrowRight className="ml-2 h-4 w-4" /></Button>
                <Button variant="outline" onClick={() => router.push(tenantHref("/owner/reports"))}>Reports <ArrowRight className="ml-2 h-4 w-4" /></Button>
                <Button variant="outline" onClick={() => void load(true)} disabled={refreshing}><RefreshCw className={cn("mr-2 h-4 w-4", refreshing && "animate-spin")} />Refresh</Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Open balance" value={currency.format(data.summary.openAmount)} detail={`${data.summary.openInvoices} open platform invoices`} icon={Wallet} />
        <StatCard label="Overdue exposure" value={currency.format(data.summary.overdueAmount)} detail={`${data.summary.overdueInvoices} overdue invoices`} icon={AlertCircle} />
        <StatCard label="Paid to date" value={currency.format(data.summary.paidAmount)} detail={`${data.summary.paymentCompletionRate}% completion rate`} icon={CheckCircle2} />
        <StatCard label="Next due" value={formatDate(data.summary.nextDueDate)} detail={`${data.summary.dueSoonInvoices} invoices due within 7 days`} icon={CalendarClock} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="border-border/70 bg-card/80 shadow-sm backdrop-blur">
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" /> Current Plan</CardTitle>
                <CardDescription>Subscription package, renewal posture, and plan limits.</CardDescription>
              </div>
              {data.subscription ? statusBadge(data.subscription.status) : <Badge variant="outline" className="rounded-full">No plan</Badge>}
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {data.subscription ? (
              <>
                <div className="rounded-3xl border bg-muted/25 p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <h2 className="text-2xl font-semibold">{data.subscription.plan.name}</h2>
                      <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{data.subscription.plan.description || "Roxan education platform subscription."}</p>
                    </div>
                    <div className="rounded-2xl bg-primary/10 px-5 py-4 text-primary">
                      <p className="text-xs font-medium uppercase tracking-wide">Plan value</p>
                      <p className="text-2xl font-semibold">{planCurrency.format(data.subscription.plan.price)}</p>
                    </div>
                  </div>
                  <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl border bg-card/70 p-4"><p className="text-xs text-muted-foreground">Start date</p><p className="mt-1 font-semibold">{formatDate(data.subscription.startDate)}</p></div>
                    <div className="rounded-2xl border bg-card/70 p-4"><p className="text-xs text-muted-foreground">Renewal date</p><p className="mt-1 font-semibold">{formatDate(data.subscription.endDate)}</p></div>
                    <div className="rounded-2xl border bg-card/70 p-4"><p className="text-xs text-muted-foreground">Auto renew</p><p className="mt-1 font-semibold">{data.subscription.autoRenew ? "Enabled" : "Disabled"}</p></div>
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-3xl border bg-muted/25 p-5">
                    <div className="flex items-center justify-between gap-4"><p className="font-medium">Student capacity</p><Badge variant="secondary" className="rounded-full">{data.usage.activeStudents}/{data.usage.maxStudents || "Unlimited"}</Badge></div>
                    <Progress value={Math.min(data.usage.studentUsageRate || 0, 100)} className="mt-4" />
                    <p className="mt-2 text-xs text-muted-foreground">{data.usage.studentUsageRate || 0}% of configured student limit used.</p>
                  </div>
                  <div className="rounded-3xl border bg-muted/25 p-5">
                    <div className="flex items-center justify-between gap-4"><p className="font-medium">Staff/user capacity</p><Badge variant="secondary" className="rounded-full">{data.usage.activeUsers}/{data.usage.maxStaff || "Unlimited"}</Badge></div>
                    <Progress value={Math.min(data.usage.staffUsageRate || 0, 100)} className="mt-4" />
                    <p className="mt-2 text-xs text-muted-foreground">{data.usage.staffUsageRate || 0}% of configured staff limit used.</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {data.subscription.plan.features.slice(0, 12).map((feature) => <Badge key={feature} variant="secondary" className="rounded-full capitalize">{feature}</Badge>)}
                  {data.subscription.plan.features.length > 12 ? <Badge variant="secondary" className="rounded-full">+{data.subscription.plan.features.length - 12}</Badge> : null}
                </div>
              </>
            ) : (
              <div className="rounded-3xl border border-dashed p-8 text-center">
                <CreditCard className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
                <p className="font-medium">No subscription assigned</p>
                <p className="mt-1 text-sm text-muted-foreground">This school has no current Roxan subscription record in the master platform database.</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/80 shadow-sm backdrop-blur">
          <CardHeader>
            <CardTitle>Billing Health</CardTitle>
            <CardDescription>Live risk posture from platform invoices and usage.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-3xl border bg-muted/25 p-5">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-primary/10 p-3 text-primary"><Gauge className="h-5 w-5" /></div>
                <div>
                  <p className="font-semibold">Capacity pressure</p>
                  <p className="text-sm text-muted-foreground">Students {data.usage.activeStudents}/{studentLimit}, users {data.usage.activeUsers}/{staffLimit}</p>
                </div>
              </div>
            </div>
            <div className="rounded-3xl border bg-muted/25 p-5">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-primary/10 p-3 text-primary"><ShieldCheck className="h-5 w-5" /></div>
                <div>
                  <p className="font-semibold">Enabled modules</p>
                  <p className="text-sm text-muted-foreground">{data.usage.enabledModules}/{data.usage.totalModules || data.usage.enabledModules} tenant modules enabled.</p>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              {data.recentAudit.length ? data.recentAudit.map((item, index) => (
                <div key={`${item.action}-${index}`} className="flex items-center justify-between gap-3 rounded-2xl border bg-card/70 p-3">
                  <div><p className="text-sm font-medium capitalize">{item.action || "Audit event"}</p><p className="text-xs text-muted-foreground">{item.resource || "platform"} - {formatDate(item.createdAt)}</p></div>
                  <Badge variant="outline" className="rounded-full capitalize">{item.status || "success"}</Badge>
                </div>
              )) : <p className="rounded-2xl border bg-muted/25 p-4 text-sm text-muted-foreground">No recent platform billing audit events.</p>}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="invoices" className="space-y-5">
        <TabsList className="mx-auto flex h-auto w-fit flex-wrap justify-center rounded-full bg-muted/70 p-1">
          <TabsTrigger value="invoices" className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Invoices</TabsTrigger>
          <TabsTrigger value="analytics" className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Analytics</TabsTrigger>
          <TabsTrigger value="conversion" className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Currency Conversion</TabsTrigger>
        </TabsList>

        <TabsContent value="invoices" className="space-y-5">
          <Card className="border-border/70 bg-card/80 shadow-sm backdrop-blur">
            <CardContent className="grid gap-3 p-4 md:grid-cols-[1fr_170px_170px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search invoice, description, notes..." className="pl-9" />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                  <SelectItem value="void">Void</SelectItem>
                </SelectContent>
              </Select>
              <Select value={ageFilter} onValueChange={setAgeFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All ages</SelectItem>
                  <SelectItem value="current">Current</SelectItem>
                  <SelectItem value="due_soon">Due soon</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                  <SelectItem value="unscheduled">Unscheduled</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <div className="grid gap-4 xl:grid-cols-2">
            {filteredInvoices.map((invoice) => (
              <Card key={invoice.id} className="border-border/70 bg-card/80 shadow-sm backdrop-blur">
                <CardContent className="p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="mb-2 flex flex-wrap gap-2">{statusBadge(invoice.status)}{ageBadge(invoice.age)}</div>
                      <h3 className="text-lg font-semibold">{invoice.invoiceNumber}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">{invoice.description || "Roxan platform subscription invoice"}</p>
                    </div>
                    <div className="text-left sm:text-right">
                      <p className="text-2xl font-semibold">{currency.format(invoice.amount)}</p>
                      <p className="text-xs text-muted-foreground">{invoice.originalCurrency} {invoice.originalAmount.toLocaleString()} original</p>
                    </div>
                  </div>
                  <div className="mt-5 grid gap-3 rounded-2xl border bg-muted/25 p-3 text-sm sm:grid-cols-3">
                    <div><p className="text-muted-foreground">Issued</p><p className="font-medium">{formatDate(invoice.issueDate)}</p></div>
                    <div><p className="text-muted-foreground">Due</p><p className="font-medium">{formatDate(invoice.dueDate)}</p></div>
                    <div><p className="text-muted-foreground">Paid</p><p className="font-medium">{formatDate(invoice.paidDate)}</p></div>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span>Rate {invoice.exchangeRate} from {invoice.exchangeRateProvider}{invoice.exchangeRateDate ? ` on ${invoice.exchangeRateDate}` : ""}</span>
                    {!invoice.conversionAvailable || invoice.exchangeRateStale ? <Badge variant="outline" className="rounded-full">Fallback rate</Badge> : null}
                  </div>
                  <div className="mt-5 flex flex-wrap justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => router.push(tenantHref(`/owner/billing/${invoice.id}`))}><FileText className="mr-2 h-4 w-4" />View</Button>
                    <Button variant="outline" size="sm" onClick={() => downloadHtml(invoice)}><Download className="mr-2 h-4 w-4" />Download</Button>
                    <Button size="sm" onClick={() => openDocument(invoice, true)}><Printer className="mr-2 h-4 w-4" />Print / Save PDF</Button>
                    {!["paid", "void"].includes(invoice.status) ? (
                      <Button size="sm" onClick={() => openPayNow(invoice)}><CreditCard className="mr-2 h-4 w-4" />Pay Now</Button>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          {!filteredInvoices.length ? <div className="rounded-3xl border border-dashed p-10 text-center text-sm text-muted-foreground">No platform invoices match the selected filters.</div> : null}
        </TabsContent>

        <TabsContent value="analytics" className="grid gap-5 xl:grid-cols-2">
          <Card className="border-border/70 bg-card/80 shadow-sm backdrop-blur">
            <CardHeader><CardTitle>Invoice Status</CardTitle><CardDescription>Converted invoice value by platform invoice status.</CardDescription></CardHeader>
            <CardContent className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={data.analytics.byStatus} dataKey="amount" nameKey="name" innerRadius={68} outerRadius={112} paddingAngle={3}>
                    {data.analytics.byStatus.map((entry, index) => <Cell key={entry.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(value) => currency.format(Number(value || 0))} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card className="border-border/70 bg-card/80 shadow-sm backdrop-blur">
            <CardHeader><CardTitle>Aging Buckets</CardTitle><CardDescription>Open risk by due-date state.</CardDescription></CardHeader>
            <CardContent className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.analytics.byAge}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" tickFormatter={(value) => String(value).replace(/_/g, " ")} />
                  <YAxis tickFormatter={(value) => currency.format(Number(value || 0))} width={90} />
                  <Tooltip formatter={(value) => currency.format(Number(value || 0))} />
                  <Bar dataKey="amount" radius={[10, 10, 0, 0]} fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="conversion" className="space-y-4">
          {data.invoices.map((invoice) => (
            <Card key={invoice.id} className="border-border/70 bg-card/80 shadow-sm backdrop-blur">
              <CardContent className="grid gap-4 p-5 md:grid-cols-[1fr_1fr_1fr_auto] md:items-center">
                <div><p className="font-semibold">{invoice.invoiceNumber}</p><p className="text-sm text-muted-foreground">{invoice.exchangeRateProvider}</p></div>
                <div><p className="text-sm text-muted-foreground">Original</p><p className="font-medium">{invoice.originalCurrency} {invoice.originalAmount.toLocaleString()}</p></div>
                <div><p className="text-sm text-muted-foreground">Tenant display</p><p className="font-medium">{currency.format(invoice.amount)}</p></div>
                <Badge variant="outline" className="w-fit rounded-full">Rate {invoice.exchangeRate}</Badge>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
      <Dialog open={Boolean(payingInvoice)} onOpenChange={(open) => !open && paymentState !== "processing" && setPayingInvoice(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Pay platform invoice</DialogTitle>
            <DialogDescription>
              Complete this invoice now. This uses the current manual/offline payment rail and records a successful payment immediately; gateway rails will attach here when configured.
            </DialogDescription>
          </DialogHeader>
          {payingInvoice ? (
            <div className="space-y-5">
              <div className="rounded-3xl border bg-muted/30 p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Invoice</p>
                    <p className="text-lg font-semibold">{payingInvoice.invoiceNumber}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{payingInvoice.description || "Roxan platform subscription"}</p>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-sm text-muted-foreground">Amount</p>
                    <p className="text-2xl font-semibold">{currency.format(payingInvoice.amount)}</p>
                  </div>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Payment rail</Label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod} disabled={paymentState !== "idle"}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">Manual/offline</SelectItem>
                      <SelectItem value="bank_transfer">Bank transfer</SelectItem>
                      <SelectItem value="cash_deposit">Cash deposit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Payment reference</Label>
                  <Input value={paymentReference} onChange={(event) => setPaymentReference(event.target.value)} disabled={paymentState !== "idle"} />
                </div>
              </div>
              {paymentState === "processing" ? (
                <div className="rounded-3xl border border-primary/30 bg-primary/10 p-4 text-sm text-primary">
                  <RefreshCw className="mr-2 inline h-4 w-4 animate-spin" />
                  Processing payment, updating invoice status, and writing audit trail.
                </div>
              ) : null}
              {paymentState === "success" ? (
                <div className="rounded-3xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-700 dark:text-emerald-300">
                  <CheckCircle2 className="mr-2 inline h-4 w-4" />
                  Payment completed. This invoice is now marked as paid.
                </div>
              ) : null}
            </div>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setPayingInvoice(null)} disabled={paymentState === "processing"}>Cancel</Button>
            <Button type="button" onClick={() => void completePayment()} disabled={!payingInvoice || paymentState !== "idle" || !paymentReference.trim()}>
              {paymentState === "processing" ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <CreditCard className="mr-2 h-4 w-4" />}
              Pay Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
