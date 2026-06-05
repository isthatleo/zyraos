"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  Banknote,
  CreditCard,
  FileText,
  Landmark,
  PieChartIcon,
  Receipt,
  RefreshCw,
  Search,
  TrendingUp,
  Wallet,
  XCircle,
} from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getTenantSubdomain } from "@/lib/tenant-routing";
import { cn } from "@/lib/utils";

type FinancePayload = {
  school: { id: string; name: string; slug: string; type: string; status: string; currencyCode?: string | null };
  generatedAt: string;
  fees: Array<{ id: string; name: string; feeType: string; description: string; amount: number; semester: string; academicYear: string; dueDate: string | null; createdAt: string | null }>;
  studentFees: Array<{
    id: string;
    studentId: string;
    studentName: string;
    studentEmail: string;
    admissionNumber: string;
    feeName: string;
    feeType: string;
    totalAmount: number;
    amountPaid: number;
    outstandingBalance: number;
    status: string;
    dueDate: string | null;
    createdAt: string | null;
  }>;
  payments: Array<{
    id: string;
    studentId: string;
    studentName: string;
    studentEmail: string;
    admissionNumber: string;
    amount: number;
    paymentMethod: string;
    paymentReference: string;
    provider: string;
    status: string;
    completedAt: string | null;
    failedAt: string | null;
    refundedAt: string | null;
    createdAt: string | null;
  }>;
  invoices: Array<{
    id: string;
    invoiceNumber: string;
    studentId: string;
    studentName: string;
    admissionNumber: string;
    totalAmount: number;
    amountPaid: number;
    outstandingBalance: number;
    status: string;
    dueDate: string | null;
    issuedDate: string | null;
  }>;
  ledger: Array<{ id: string; studentName: string; admissionNumber: string; type: string; amount: number; description: string; reference: string; balance: number; createdAt: string | null }>;
  platformInvoices: Array<{
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
    dueDate: string | null;
    description: string;
  }>;
  analytics: {
    byFeeType: Array<{ name: string; billed: number; paid: number; outstanding: number; records: number }>;
    byPaymentMethod: Array<{ name: string; amount: number; records: number }>;
    byInvoiceStatus: Array<{ name: string; amount: number; records: number }>;
    recentLedger: Array<{ id: string; studentName: string; admissionNumber: string; type: string; amount: number; description: string; reference: string; balance: number; createdAt: string | null }>;
  };
  summary: {
    feeCatalogValue: number;
    studentFeeTotal: number;
    studentFeePaid: number;
    studentOutstanding: number;
    collectionRate: number;
    completedPaymentAmount: number;
    pendingPayments: number;
    failedPayments: number;
    refundedPayments: number;
    invoiceTotal: number;
    invoiceOutstanding: number;
    unpaidInvoices: number;
    overdueInvoices: number;
    platformOutstanding: number;
    platformInvoicesDue: number;
  };
};

const STATUS_STYLES: Record<string, string> = {
  completed: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  paid: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  pending: "border-primary/30 bg-primary/10 text-primary",
  partial: "border-primary/30 bg-primary/10 text-primary",
  unpaid: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  overdue: "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300",
  failed: "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300",
  refunded: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  cancelled: "border-muted-foreground/20 bg-muted text-muted-foreground",
  void: "border-muted-foreground/20 bg-muted text-muted-foreground",
};

const CHART_COLORS = ["hsl(var(--primary))", "hsl(146 66% 36%)", "hsl(346 77% 49%)", "hsl(199 89% 48%)", "hsl(38 92% 50%)"];

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function formatDate(value: string | null) {
  if (!value) return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not set";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

function statusBadge(status: string) {
  return (
    <Badge variant="outline" className={cn("rounded-full px-2.5 py-1 capitalize", STATUS_STYLES[status] || STATUS_STYLES.pending)}>
      {status.replace(/_/g, " ")}
    </Badge>
  );
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
          <p className="mt-1 text-2xl font-semibold tracking-tight text-foreground">{value}</p>
          <p className="truncate text-xs text-muted-foreground">{detail}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function OwnerFinancePage() {
  const params = useParams<{ tenant: string }>();
  const router = useRouter();
  const tenantSlug = String(params?.tenant || "");
  const [data, setData] = React.useState<FinancePayload | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [paymentSearch, setPaymentSearch] = React.useState("");
  const [paymentStatus, setPaymentStatus] = React.useState("all");
  const [invoiceStatus, setInvoiceStatus] = React.useState("all");

  const currency = React.useMemo(
    () =>
      new Intl.NumberFormat("en", {
        style: "currency",
        currency: data?.school.currencyCode || "ZAR",
        maximumFractionDigits: 0,
      }),
    [data?.school.currencyCode]
  );

  const tenantHref = React.useCallback(
    (path: string) => {
      if (typeof window !== "undefined" && getTenantSubdomain(window.location.host)) return path;
      return `/${tenantSlug}${path}`;
    },
    [tenantSlug]
  );

  const loadFinance = React.useCallback(
    async (quiet = false) => {
      if (!tenantSlug) return;
      setError(null);
      if (quiet) setRefreshing(true);
      else setLoading(true);
      try {
        const response = await fetch(`/api/tenant/owner/finance?tenant=${tenantSlug}`, {
          credentials: "include",
          cache: "no-store",
        });
        const payload = await response.json().catch(() => null);
        if (!response.ok) throw new Error(payload?.error || "Failed to load owner finance data");
        setData(payload as FinancePayload);
      } catch (nextError) {
        const message = nextError instanceof Error ? nextError.message : "Failed to load owner finance data";
        setError(message);
        toast.error(message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [tenantSlug]
  );

  React.useEffect(() => {
    void loadFinance();
  }, [loadFinance]);

  const filteredPayments = React.useMemo(() => {
    const term = paymentSearch.trim().toLowerCase();
    return (data?.payments || []).filter((payment) => {
      const matchesTerm =
        !term ||
        [payment.studentName, payment.studentEmail, payment.admissionNumber, payment.paymentReference, payment.paymentMethod, payment.provider]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(term));
      const matchesStatus = paymentStatus === "all" || payment.status === paymentStatus;
      return matchesTerm && matchesStatus;
    });
  }, [data?.payments, paymentSearch, paymentStatus]);

  const filteredInvoices = React.useMemo(
    () => (data?.invoices || []).filter((invoice) => invoiceStatus === "all" || invoice.status === invoiceStatus),
    [data?.invoices, invoiceStatus]
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-36 rounded-3xl" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-32 rounded-3xl" />
          ))}
        </div>
        <Skeleton className="h-96 rounded-3xl" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <Alert variant="destructive" className="rounded-3xl">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Finance overview failed to load</AlertTitle>
        <AlertDescription className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span>{error || "No finance data was returned for this tenant."}</span>
          <Button variant="secondary" size="sm" onClick={() => void loadFinance()}>
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-border/70 bg-card/80 shadow-sm backdrop-blur">
        <CardContent className="p-0">
          <div className="relative isolate p-6 md:p-8">
            <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_right,hsl(var(--primary)/0.16),transparent_38%),linear-gradient(135deg,hsl(var(--muted)/0.45),transparent)]" />
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-3xl">
                <Badge className="mb-3 rounded-full bg-primary/10 text-primary hover:bg-primary/10">Owner finance command</Badge>
                <h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">Finance Overview</h1>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Executive view of school collections, fee balances, payments, student invoices, transaction activity, and platform billing exposure for {data.school.name}.
                </p>
                <p className="mt-3 text-xs text-muted-foreground">Last refreshed {formatDate(data.generatedAt)}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => router.push(tenantHref("/owner/payments"))}>
                  Payments
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button variant="outline" onClick={() => router.push(tenantHref("/owner/invoices"))}>
                  Invoices
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button variant="outline" onClick={() => router.push(tenantHref("/owner/billing"))}>
                  Billing
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button onClick={() => void loadFinance(true)} disabled={refreshing}>
                  <RefreshCw className={cn("mr-2 h-4 w-4", refreshing && "animate-spin")} />
                  Refresh
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Billed to students" value={currency.format(data.summary.studentFeeTotal)} detail={`${data.summary.collectionRate}% collection rate`} icon={Wallet} />
        <StatCard label="Collected" value={currency.format(data.summary.studentFeePaid)} detail={`${currency.format(data.summary.completedPaymentAmount)} completed payments`} icon={TrendingUp} />
        <StatCard label="Outstanding" value={currency.format(data.summary.studentOutstanding)} detail={`${data.summary.unpaidInvoices} unpaid/partial invoices`} icon={Receipt} />
        <StatCard label="Platform due" value={currency.format(data.summary.platformOutstanding)} detail={`${data.summary.platformInvoicesDue} Roxan invoice(s) due`} icon={Landmark} />
      </div>

      <Tabs defaultValue="overview" className="space-y-5">
        <TabsList className="mx-auto flex h-auto w-fit flex-wrap justify-center rounded-full bg-muted/70 p-1">
          <TabsTrigger value="overview" className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            Overview
          </TabsTrigger>
          <TabsTrigger value="payments" className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            Payments
          </TabsTrigger>
          <TabsTrigger value="invoices" className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            Invoices
          </TabsTrigger>
          <TabsTrigger value="ledger" className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            Ledger
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-5">
          <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
            <Card className="border-border/70 bg-card/80 shadow-sm backdrop-blur">
              <CardHeader>
                <CardTitle>Fee Collection by Type</CardTitle>
                <CardDescription>Billed, paid, and outstanding balances across fee categories.</CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                {data.analytics.byFeeType.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.analytics.byFeeType}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="name" tickLine={false} axisLine={false} className="text-xs" />
                      <YAxis tickLine={false} axisLine={false} className="text-xs" />
                      <Tooltip cursor={{ fill: "hsl(var(--muted))" }} formatter={(value) => currency.format(Number(value || 0))} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12 }} />
                      <Bar dataKey="billed" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
                      <Bar dataKey="paid" fill="hsl(146 66% 36%)" radius={[8, 8, 0, 0]} />
                      <Bar dataKey="outstanding" fill="hsl(346 77% 49%)" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center rounded-2xl border border-dashed text-sm text-muted-foreground">No fee collection data yet.</div>
                )}
              </CardContent>
            </Card>

            <Card className="border-border/70 bg-card/80 shadow-sm backdrop-blur">
              <CardHeader>
                <CardTitle>Payment Channels</CardTitle>
                <CardDescription>Completed payment value by collection method.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="h-56">
                  {data.analytics.byPaymentMethod.length ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={data.analytics.byPaymentMethod} dataKey="amount" nameKey="name" innerRadius={58} outerRadius={92} paddingAngle={3}>
                          {data.analytics.byPaymentMethod.map((entry, index) => (
                            <Cell key={entry.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => currency.format(Number(value || 0))} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-full items-center justify-center rounded-2xl border border-dashed text-sm text-muted-foreground">No completed payments yet.</div>
                  )}
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Collection rate</span>
                    <span className="font-medium">{data.summary.collectionRate}%</span>
                  </div>
                  <Progress value={data.summary.collectionRate} />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <StatCard label="Failed payments" value={data.summary.failedPayments} detail={`${data.summary.pendingPayments} pending payment(s)`} icon={XCircle} />
            <StatCard label="Student invoices" value={currency.format(data.summary.invoiceTotal)} detail={`${currency.format(data.summary.invoiceOutstanding)} outstanding`} icon={FileText} />
            <StatCard label="Fee catalog" value={currency.format(data.summary.feeCatalogValue)} detail={`${data.fees.length} fee item(s) configured`} icon={PieChartIcon} />
          </div>
        </TabsContent>

        <TabsContent value="payments" className="space-y-5">
          <Card className="border-border/70 bg-card/80 shadow-sm backdrop-blur">
            <CardContent className="grid gap-3 p-4 md:grid-cols-[1fr_180px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={paymentSearch} onChange={(event) => setPaymentSearch(event.target.value)} placeholder="Search payments, students, references..." className="pl-9" />
              </div>
              <Select value={paymentStatus} onValueChange={setPaymentStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="refunded">Refunded</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <div className="grid gap-4 xl:grid-cols-2">
            {filteredPayments.map((payment) => (
              <Card key={payment.id} className="border-border/70 bg-card/80 shadow-sm backdrop-blur">
                <CardContent className="p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex min-w-0 gap-3">
                      <Avatar className="h-11 w-11 border border-border">
                        <AvatarFallback className="bg-primary/10 text-primary">{initials(payment.studentName)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <h3 className="truncate font-semibold text-foreground">{payment.studentName}</h3>
                        <p className="truncate text-sm text-muted-foreground">{payment.admissionNumber || payment.studentEmail || "Student payment"}</p>
                        <p className="mt-2 text-sm text-foreground">{currency.format(payment.amount)} • {payment.paymentMethod.replace(/_/g, " ")}</p>
                      </div>
                    </div>
                    {statusBadge(payment.status)}
                  </div>
                  <div className="mt-4 rounded-2xl border bg-muted/25 p-3 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-muted-foreground">Reference</span>
                      <span className="font-medium">{payment.paymentReference || "Not recorded"}</span>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                      <span>{payment.provider || "Manual provider"}</span>
                      <span>{formatDate(payment.completedAt || payment.createdAt)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          {!filteredPayments.length ? <EmptyState icon={CreditCard} title="No payments matched" description="Adjust your search or payment status filter." /> : null}
        </TabsContent>

        <TabsContent value="invoices" className="space-y-5">
          <Card className="border-border/70 bg-card/80 shadow-sm backdrop-blur">
            <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium">Student invoice exposure</p>
                <p className="text-sm text-muted-foreground">{filteredInvoices.length} invoice(s) currently visible.</p>
              </div>
              <Select value={invoiceStatus} onValueChange={setInvoiceStatus}>
                <SelectTrigger className="sm:w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="unpaid">Unpaid</SelectItem>
                  <SelectItem value="partial">Partial</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <div className="grid gap-4 xl:grid-cols-2">
            {filteredInvoices.map((invoice) => (
              <Card key={invoice.id} className="border-border/70 bg-card/80 shadow-sm backdrop-blur">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-foreground">{invoice.invoiceNumber}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{invoice.studentName} • Due {formatDate(invoice.dueDate)}</p>
                    </div>
                    {statusBadge(invoice.status)}
                  </div>
                  <div className="mt-4 grid gap-3 rounded-2xl border bg-muted/25 p-3 text-sm sm:grid-cols-3">
                    <div>
                      <p className="text-muted-foreground">Total</p>
                      <p className="font-semibold">{currency.format(invoice.totalAmount)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Paid</p>
                      <p className="font-semibold">{currency.format(invoice.amountPaid)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Outstanding</p>
                      <p className="font-semibold">{currency.format(invoice.outstandingBalance)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          {!filteredInvoices.length ? <EmptyState icon={FileText} title="No invoices matched" description="Adjust the invoice status filter." /> : null}
        </TabsContent>

        <TabsContent value="ledger" className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
          <Card className="border-border/70 bg-card/80 shadow-sm backdrop-blur">
            <CardHeader>
              <CardTitle>Recent Ledger Activity</CardTitle>
              <CardDescription>Latest payments, refunds, adjustments, and balance movements.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.analytics.recentLedger.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between gap-4 rounded-2xl border bg-muted/20 p-4">
                  <div>
                    <p className="font-medium text-foreground">{entry.studentName}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{entry.type.replace(/_/g, " ")} • {entry.reference || entry.description || "Ledger entry"}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{currency.format(entry.amount)}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{formatDate(entry.createdAt)}</p>
                  </div>
                </div>
              ))}
              {!data.analytics.recentLedger.length ? <EmptyState icon={Banknote} title="No ledger entries yet" description="Finance movements will appear here once payments or adjustments are recorded." /> : null}
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-card/80 shadow-sm backdrop-blur">
            <CardHeader>
              <CardTitle>Platform Billing</CardTitle>
              <CardDescription>Roxan subscription invoices tied to this tenant.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.platformInvoices.map((invoice) => (
                <div key={invoice.id} className="rounded-2xl border bg-muted/20 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{invoice.invoiceNumber}</p>
                      <p className="mt-1 text-xs text-muted-foreground">Due {formatDate(invoice.dueDate)}</p>
                    </div>
                    {statusBadge(invoice.status)}
                  </div>
                  <p className="mt-3 text-2xl font-semibold">{currency.format(invoice.amount)}</p>
                  {invoice.originalCurrency !== invoice.currency ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Original {new Intl.NumberFormat("en", { style: "currency", currency: invoice.originalCurrency, maximumFractionDigits: 0 }).format(invoice.originalAmount)} • Rate{" "}
                      {invoice.exchangeRate.toFixed(6)} via {invoice.exchangeRateProvider}
                      {invoice.exchangeRateDate ? ` • ${invoice.exchangeRateDate}` : ""}
                      {invoice.exchangeRateStale ? " • cached" : ""}
                    </p>
                  ) : null}
                  <p className="mt-1 text-xs text-muted-foreground">{invoice.description || "Platform billing invoice"}</p>
                </div>
              ))}
              {!data.platformInvoices.length ? <EmptyState icon={Landmark} title="No platform invoices" description="Roxan platform invoices will appear here when issued." /> : null}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function EmptyState({ icon: Icon, title, description }: { icon: React.ElementType; title: string; description: string }) {
  return (
    <Card className="border-dashed bg-card/60">
      <CardContent className="flex min-h-44 flex-col items-center justify-center p-6 text-center">
        <Icon className="mb-3 h-9 w-9 text-muted-foreground" />
        <p className="font-medium text-foreground">{title}</p>
        <p className="mt-1 max-w-md text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}
