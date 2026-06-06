"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { AlertCircle, CalendarClock, CreditCard, Download, FileText, Gauge, Loader2, Printer, Receipt, RefreshCw, Search, Wallet } from "lucide-react";
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
import { downloadPlatformBillingInvoiceHtml, openPlatformBillingInvoiceDocument } from "@/lib/platform-billing-invoice-document";
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
  school: { name: string; displayName?: string; logoUrl?: string | null; primaryColor?: string; address?: string; phone?: string; email?: string; website?: string; slug: string; type: string; status: string; currencyCode: string };
  generatedAt: string;
  subscription: null | {
    status: string;
    startDate: string | null;
    endDate: string | null;
    autoRenew: boolean;
    daysToRenewal: number | null;
    plan: { name: string; description: string; price: number; currency: string; features: string[]; maxStudents: number; maxStaff: number; isActive: boolean };
  };
  usage: { activeStudents: number; totalStudents: number; maxStudents: number; studentUsageRate: number; activeUsers: number; totalUsers: number; maxStaff: number; staffUsageRate: number; enabledModules: number; totalModules: number };
  invoices: PlatformInvoice[];
  summary: { invoices: number; openInvoices: number; overdueInvoices: number; dueSoonInvoices: number; openAmount: number; overdueAmount: number; paidAmount: number; totalAmount: number; paymentCompletionRate: number; nextDueDate: string | null };
  analytics: { byStatus: Array<{ name: string; records: number; amount: number }>; byAge: Array<{ name: string; records: number; amount: number }> };
  recentAudit: Array<{ action: string; resource: string; status: string; createdAt: string | null }>;
};

const statusStyles: Record<string, string> = {
  paid: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  pending: "border-primary/30 bg-primary/10 text-primary",
  overdue: "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300",
  void: "border-muted-foreground/20 bg-muted text-muted-foreground",
};

function formatDate(value: string | null) {
  if (!value) return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not set";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

function statusBadge(status: string) {
  return <Badge variant="outline" className={cn("rounded-full capitalize", statusStyles[status] || statusStyles.pending)}>{status.replace(/_/g, " ")}</Badge>;
}

export default function AdminBillingPage() {
  const params = useParams<{ tenant: string }>();
  const tenant = String(params?.tenant || "");
  const [data, setData] = React.useState<BillingPayload | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState("");
  const [query, setQuery] = React.useState("");
  const [status, setStatus] = React.useState("all");
  const [payingInvoice, setPayingInvoice] = React.useState<PlatformInvoice | null>(null);
  const [paymentMethod, setPaymentMethod] = React.useState("manual");
  const [paymentReference, setPaymentReference] = React.useState("");
  const [paymentState, setPaymentState] = React.useState<"idle" | "processing" | "success">("idle");

  const currency = React.useMemo(() => new Intl.NumberFormat("en", { style: "currency", currency: data?.school.currencyCode || "USD", maximumFractionDigits: 0 }), [data?.school.currencyCode]);
  const planCurrency = React.useMemo(() => new Intl.NumberFormat("en", { style: "currency", currency: data?.subscription?.plan.currency || data?.school.currencyCode || "USD", maximumFractionDigits: 0 }), [data?.school.currencyCode, data?.subscription?.plan.currency]);

  const load = React.useCallback(async (quiet = false) => {
    if (!tenant) return;
    if (quiet) setRefreshing(true);
    else setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/tenant/admin/billing?tenant=${encodeURIComponent(tenant)}`, { credentials: "include", cache: "no-store" });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || "Failed to load school admin billing");
      setData(payload);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load school admin billing";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [tenant]);

  React.useEffect(() => { void load(); }, [load]);

  const invoices = React.useMemo(() => {
    const term = query.trim().toLowerCase();
    return (data?.invoices || []).filter((invoice) => {
      const matchesTerm = !term || [invoice.invoiceNumber, invoice.description, invoice.notes, invoice.status, invoice.age].some((value) => value.toLowerCase().includes(term));
      const matchesStatus = status === "all" || invoice.status === status;
      return matchesTerm && matchesStatus;
    });
  }, [data?.invoices, query, status]);

  function openPay(invoice: PlatformInvoice) {
    setPayingInvoice(invoice);
    setPaymentMethod("manual");
    setPaymentReference(`ADMIN-${invoice.invoiceNumber}-${Date.now()}`.replace(/[^A-Z0-9-]/gi, "-"));
    setPaymentState("idle");
  }

  async function completePayment() {
    if (!payingInvoice) return;
    setPaymentState("processing");
    try {
      const response = await fetch(`/api/tenant/admin/billing?tenant=${encodeURIComponent(tenant)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ invoiceId: payingInvoice.id, paymentMethod, paymentReference }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || "Failed to complete payment");
      setPaymentState("success");
      toast.success("Platform invoice marked paid");
      await load(true);
      window.setTimeout(() => setPayingInvoice(null), 650);
    } catch (err) {
      setPaymentState("idle");
      toast.error(err instanceof Error ? err.message : "Payment failed");
    }
  }

  if (loading) return <div className="space-y-6"><Skeleton className="h-44 rounded-3xl" /><div className="grid gap-4 md:grid-cols-4">{Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-28 rounded-3xl" />)}</div><Skeleton className="h-96 rounded-3xl" /></div>;

  if (error || !data) {
    return (
      <Alert variant="destructive" className="rounded-3xl">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Billing failed to load</AlertTitle>
        <AlertDescription className="mt-2 flex items-center justify-between gap-4">
          <span>{error || "No billing data was returned."}</span>
          <Button variant="outline" onClick={() => void load()}>Retry</Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-3xl border bg-card shadow-sm">
        <div className="bg-[radial-gradient(circle_at_top_left,rgba(249,115,22,0.16),transparent_34%),linear-gradient(135deg,hsl(var(--card)),hsl(var(--muted)/.55))] p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <Badge variant="outline" className="rounded-full">School admin platform billing</Badge>
              <h1 className="mt-3 text-3xl font-bold tracking-tight">Billing</h1>
              <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
                Review platform subscription invoices, usage limits, payment status, due dates, and downloadable platform invoice documents for {data.school.name}. Student fee billing remains in the finance dashboard.
              </p>
            </div>
            <Button variant="outline" onClick={() => void load(true)} disabled={refreshing}><RefreshCw className={cn("mr-2 h-4 w-4", refreshing && "animate-spin")} />Refresh</Button>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="border-2"><CardContent className="p-5"><Wallet className="mb-3 h-6 w-6 text-orange-500" /><p className="text-sm text-muted-foreground">Open amount</p><p className="mt-1 text-2xl font-bold">{currency.format(data.summary.openAmount)}</p></CardContent></Card>
        <Card className="border-2"><CardContent className="p-5"><Receipt className="mb-3 h-6 w-6 text-orange-500" /><p className="text-sm text-muted-foreground">Open invoices</p><p className="mt-1 text-2xl font-bold">{data.summary.openInvoices}</p></CardContent></Card>
        <Card className="border-2"><CardContent className="p-5"><CalendarClock className="mb-3 h-6 w-6 text-orange-500" /><p className="text-sm text-muted-foreground">Next due date</p><p className="mt-1 text-2xl font-bold">{formatDate(data.summary.nextDueDate)}</p></CardContent></Card>
        <Card className="border-2"><CardContent className="p-5"><Gauge className="mb-3 h-6 w-6 text-orange-500" /><p className="text-sm text-muted-foreground">Payment completion</p><p className="mt-1 text-2xl font-bold">{data.summary.paymentCompletionRate}%</p></CardContent></Card>
      </div>

      <Tabs defaultValue="invoices" className="space-y-5">
        <TabsList className="rounded-full bg-muted/70 p-1">
          <TabsTrigger value="invoices" className="rounded-full">Invoices</TabsTrigger>
          <TabsTrigger value="subscription" className="rounded-full">Subscription & Usage</TabsTrigger>
        </TabsList>
        <TabsContent value="invoices" className="space-y-4">
          <Card className="border-2">
            <CardContent className="grid gap-3 p-4 md:grid-cols-[1fr_180px]">
              <div className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search invoices..." className="pl-9" /></div>
              <Select value={status} onValueChange={setStatus}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All statuses</SelectItem><SelectItem value="pending">Pending</SelectItem><SelectItem value="paid">Paid</SelectItem><SelectItem value="overdue">Overdue</SelectItem><SelectItem value="void">Void</SelectItem></SelectContent></Select>
            </CardContent>
          </Card>
          <div className="grid gap-4">
            {invoices.map((invoice) => (
              <Card key={invoice.id} className="border-2">
                <CardContent className="grid gap-4 p-5 xl:grid-cols-[1fr_180px_240px] xl:items-center">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">{statusBadge(invoice.status)}<Badge variant="outline" className="rounded-full">{invoice.age.replace(/_/g, " ")}</Badge></div>
                    <h3 className="mt-3 text-xl font-bold">{invoice.invoiceNumber}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{invoice.description || "Platform subscription invoice"}</p>
                    <p className="mt-2 text-xs text-muted-foreground">Issued {formatDate(invoice.issueDate)} · Due {formatDate(invoice.dueDate)}</p>
                  </div>
                  <div><p className="text-sm text-muted-foreground">Amount</p><p className="text-2xl font-bold">{currency.format(invoice.amount)}</p><p className="text-xs text-muted-foreground">{invoice.originalCurrency} {invoice.originalAmount}</p></div>
                  <div className="flex flex-wrap gap-2 xl:justify-end">
                    <Button variant="outline" size="sm" onClick={() => openPlatformBillingInvoiceDocument(invoice, data.school, false)}><FileText className="mr-2 h-4 w-4" />Open</Button>
                    <Button variant="outline" size="sm" onClick={() => openPlatformBillingInvoiceDocument(invoice, data.school, true)}><Printer className="mr-2 h-4 w-4" />Print</Button>
                    <Button variant="outline" size="sm" onClick={() => downloadPlatformBillingInvoiceHtml(invoice, data.school)}><Download className="mr-2 h-4 w-4" />Download</Button>
                    {!["paid", "void"].includes(invoice.status) ? <Button size="sm" className="bg-orange-600 text-white hover:bg-orange-700" onClick={() => openPay(invoice)}><CreditCard className="mr-2 h-4 w-4" />Pay</Button> : null}
                  </div>
                </CardContent>
              </Card>
            ))}
            {!invoices.length ? <Card className="border-dashed"><CardContent className="p-10 text-center text-sm text-muted-foreground">No platform invoices match these filters.</CardContent></Card> : null}
          </div>
        </TabsContent>
        <TabsContent value="subscription" className="grid gap-5 xl:grid-cols-[1fr_420px]">
          <Card className="border-2">
            <CardHeader><CardTitle>Subscription Plan</CardTitle><CardDescription>Current platform plan and included feature access.</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-3xl border bg-muted/30 p-5">
                <p className="text-sm text-muted-foreground">Plan</p>
                <h3 className="mt-1 text-2xl font-bold">{data.subscription?.plan.name || "No active subscription"}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{data.subscription?.plan.description || "Contact the platform administrator to activate a plan."}</p>
                <p className="mt-4 text-3xl font-bold">{data.subscription ? planCurrency.format(data.subscription.plan.price) : currency.format(0)}</p>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">{(data.subscription?.plan.features || []).map((feature) => <div key={feature} className="rounded-2xl border p-3 text-sm font-medium">{feature}</div>)}</div>
            </CardContent>
          </Card>
          <Card className="border-2">
            <CardHeader><CardTitle>Usage Controls</CardTitle><CardDescription>Usage is calculated from live tenant users and students.</CardDescription></CardHeader>
            <CardContent className="space-y-5">
              <div><div className="flex justify-between text-sm"><span>Students</span><span>{data.usage.activeStudents}/{data.usage.maxStudents || "∞"}</span></div><Progress value={Math.min(data.usage.studentUsageRate, 100)} className="mt-2 h-2" /></div>
              <div><div className="flex justify-between text-sm"><span>Staff/users</span><span>{data.usage.activeUsers}/{data.usage.maxStaff || "∞"}</span></div><Progress value={Math.min(data.usage.staffUsageRate, 100)} className="mt-2 h-2" /></div>
              <div className="rounded-2xl border p-4"><p className="text-sm text-muted-foreground">Enabled modules</p><p className="mt-1 text-2xl font-bold">{data.usage.enabledModules}/{data.usage.totalModules}</p></div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={Boolean(payingInvoice)} onOpenChange={(open) => !open && paymentState !== "processing" && setPayingInvoice(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Record platform payment</DialogTitle><DialogDescription>Mark this invoice as paid after confirming payment evidence.</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div className="rounded-2xl border bg-muted/40 p-4"><p className="font-bold">{payingInvoice?.invoiceNumber}</p><p className="text-sm text-muted-foreground">{payingInvoice ? currency.format(payingInvoice.amount) : ""}</p></div>
            <div className="space-y-2"><Label>Payment method</Label><Select value={paymentMethod} onValueChange={setPaymentMethod}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="manual">Manual</SelectItem><SelectItem value="bank_transfer">Bank transfer</SelectItem><SelectItem value="card">Card</SelectItem><SelectItem value="mobile_money">Mobile money</SelectItem><SelectItem value="paystack">Paystack</SelectItem><SelectItem value="flutterwave">Flutterwave</SelectItem><SelectItem value="stripe">Stripe</SelectItem></SelectContent></Select></div>
            <div className="space-y-2"><Label>Payment reference</Label><Input value={paymentReference} onChange={(e) => setPaymentReference(e.target.value)} /></div>
            {paymentState !== "idle" ? <Progress value={paymentState === "success" ? 100 : 62} className="h-2" /> : null}
          </div>
          <DialogFooter><Button variant="outline" disabled={paymentState === "processing"} onClick={() => setPayingInvoice(null)}>Cancel</Button><Button disabled={paymentState === "processing" || paymentReference.length < 4} onClick={completePayment} className="bg-orange-600 text-white hover:bg-orange-700">{paymentState === "processing" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CreditCard className="mr-2 h-4 w-4" />}{paymentState === "processing" ? "Processing..." : "Confirm Payment"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
