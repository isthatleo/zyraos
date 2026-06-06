"use client";

import * as React from "react";
import { useParams, usePathname, useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  CreditCard,
  Download,
  FileText,
  Printer,
  Receipt,
  RefreshCw,
  ShieldCheck,
  Wallet,
} from "lucide-react";
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
import { downloadPlatformBillingInvoiceHtml, openPlatformBillingInvoiceDocument } from "@/lib/platform-billing-invoice-document";
import { getTenantSubdomain, resolveTenantSlug } from "@/lib/tenant-routing";
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
  createdAt: string | null;
  updatedAt: string | null;
};

type Payload = {
  school: { id: string; name: string; displayName?: string; logoUrl?: string | null; schoolSealUrl?: string | null; reportCardWatermarkUrl?: string | null; primaryColor?: string; secondaryColor?: string; address?: string; phone?: string; email?: string; website?: string; motto?: string; letterhead?: string; slug: string; type: string; status: string; currencyCode: string };
  generatedAt: string;
  invoice: PlatformInvoice;
  subscription: {
    id: string;
    status: string;
    startDate: string | null;
    endDate: string | null;
    autoRenew: boolean;
    plan: { id: string; name: string; description: string; price: number; currency: string; maxStudents: number; maxStaff: number };
  };
  usage: { activeStudents: number; totalStudents: number; activeUsers: number; totalUsers: number; enabledModules: number; totalModules: number };
  modules: Array<{ moduleKey: string; enabled: boolean }>;
  audit: Array<{ action: string; resource: string; resourceId: string; changes: unknown; status: string; createdAt: string | null }>;
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
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Icon className="h-5 w-5" /></div>
        <div className="min-w-0"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-semibold">{value}</p><p className="truncate text-xs text-muted-foreground">{detail}</p></div>
      </CardContent>
    </Card>
  );
}

function invoiceHtml(invoice: PlatformInvoice, school: Payload["school"]) {
  const money = new Intl.NumberFormat("en", { style: "currency", currency: invoice.currency, maximumFractionDigits: 2 });
  const original = new Intl.NumberFormat("en", { style: "currency", currency: invoice.originalCurrency, maximumFractionDigits: 2 });
  const schoolName = school.displayName || school.name;
  const primaryColor = school.primaryColor || "#f97316";
  return `<!doctype html><html><head><meta charset="utf-8"><title>${invoice.invoiceNumber}</title><style>
    body{font-family:Arial,Helvetica,sans-serif;background:#f8fafc;color:#111827;margin:0}.page{max-width:900px;margin:32px auto;background:white;border-radius:24px;padding:38px;box-shadow:0 18px 60px rgba(15,23,42,.1)}
    .page{position:relative;overflow:hidden}.watermark{position:fixed;inset:30%;opacity:.045}.watermark img{width:100%;height:100%;object-fit:contain}.content{position:relative;z-index:1}
    header{display:flex;justify-content:space-between;gap:24px;border-bottom:3px solid ${primaryColor};padding-bottom:20px;margin-bottom:24px}.brand{display:flex;align-items:center;gap:12px;font-size:26px;font-weight:800;color:${primaryColor}}.brand img{width:56px;height:56px;border-radius:16px;object-fit:cover;border:1px solid #e2e8f0}.muted{color:#64748b}.grid{display:grid;grid-template-columns:repeat(2,1fr);gap:14px}.box{border:1px solid #e2e8f0;border-radius:16px;padding:16px;background:#f8fafc}
    h1{margin:0;font-size:28px}.amount{font-size:34px;font-weight:800;margin-top:6px}.badge{display:inline-block;border-radius:999px;background:${primaryColor}12;color:${primaryColor};padding:6px 12px;font-size:12px;font-weight:700;text-transform:uppercase}
    table{width:100%;border-collapse:collapse;margin-top:24px}td,th{padding:12px;border-bottom:1px solid #e2e8f0;text-align:left}th{background:#111827;color:white}footer{margin-top:40px;border-top:1px solid #e2e8f0;padding-top:16px;font-size:12px;color:#64748b}@media print{body{background:white}.page{box-shadow:none;margin:0;border-radius:0}}
  </style></head><body><main class="page">${school.reportCardWatermarkUrl ? `<div class="watermark"><img src="${school.reportCardWatermarkUrl}" alt=""></div>` : ""}<div class="content"><header><div><div class="brand">${school.logoUrl ? `<img src="${school.logoUrl}" alt="">` : ""}<span>${schoolName}</span></div><p class="muted">${school.motto || "Roxan Education System"}<br>${[school.address, school.phone, school.email, school.website].filter(Boolean).join(" • ")}</p></div><div><span class="badge">${invoice.status}</span><h1>${invoice.invoiceNumber}</h1></div></header>
  <section class="grid"><div class="box"><p class="muted">Tenant currency amount</p><div class="amount">${money.format(invoice.amount)}</div></div><div class="box"><p class="muted">Original platform amount</p><div class="amount">${original.format(invoice.originalAmount)}</div></div><div class="box"><strong>Issued</strong><p>${formatDate(invoice.issueDate)}</p></div><div class="box"><strong>Due</strong><p>${formatDate(invoice.dueDate)}</p></div></section>
  <table><thead><tr><th>Description</th><th>Status</th><th>Rate</th><th>Provider</th></tr></thead><tbody><tr><td>${invoice.description || "Roxan platform subscription"}</td><td>${invoice.status}</td><td>${invoice.exchangeRate}</td><td>${invoice.exchangeRateProvider}${invoice.exchangeRateDate ? ` (${invoice.exchangeRateDate})` : ""}</td></tr></tbody></table>
  <footer>Generated by Roxan Education System. ${invoice.notes || ""}</footer></div></main></body></html>`;
}

export default function OwnerBillingInvoiceDetailPage() {
  const params = useParams<{ tenant: string; invoiceId: string }>();
  const pathname = usePathname();
  const router = useRouter();
  const paramTenantSlug = String(params?.tenant || "");
  const tenantSlug = paramTenantSlug && pathname?.startsWith(`/${paramTenantSlug}/`) ? paramTenantSlug : (typeof window !== "undefined" ? resolveTenantSlug(pathname, window.location.host) || "" : paramTenantSlug);
  const invoiceId = String(params?.invoiceId || "");
  const [data, setData] = React.useState<Payload | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [payOpen, setPayOpen] = React.useState(false);
  const [paymentReference, setPaymentReference] = React.useState("");
  const [paymentMethod, setPaymentMethod] = React.useState("manual");
  const [paymentState, setPaymentState] = React.useState<"idle" | "processing" | "success">("idle");

  const tenantHref = React.useCallback((path: string) => (typeof window !== "undefined" && getTenantSubdomain(window.location.host) ? path : `/${tenantSlug}${path}`), [tenantSlug]);
  const currency = React.useMemo(() => new Intl.NumberFormat("en", { style: "currency", currency: data?.school.currencyCode || "ZAR", maximumFractionDigits: 0 }), [data?.school.currencyCode]);
  const planCurrency = React.useMemo(() => new Intl.NumberFormat("en", { style: "currency", currency: data?.subscription.plan.currency || data?.school.currencyCode || "ZAR", maximumFractionDigits: 0 }), [data?.school.currencyCode, data?.subscription.plan.currency]);

  const load = React.useCallback(async (quiet = false) => {
    if (!tenantSlug || !invoiceId) return;
    setError(null);
    if (quiet) setRefreshing(true); else setLoading(true);
    try {
      const response = await fetch(`/api/tenant/owner/billing/${invoiceId}?tenant=${tenantSlug}`, { credentials: "include", cache: "no-store" });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || "Failed to load platform invoice details");
      setData(payload);
    } catch (nextError) {
      const message = nextError instanceof Error ? nextError.message : "Failed to load platform invoice details";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [invoiceId, tenantSlug]);

  React.useEffect(() => { void load(); }, [load]);

  const openDocument = (print = false) => {
    if (!data) return;
    const opened = openPlatformBillingInvoiceDocument(data.invoice, data.school, print);
    if (!opened) toast.error("Popup blocked. Allow popups to open the invoice document.");
  };

  const downloadHtml = () => {
    if (!data) return;
    downloadPlatformBillingInvoiceHtml(data.invoice, data.school);
  };

  const startPayment = () => {
    if (!data) return;
    setPaymentMethod("manual");
    setPaymentReference(`ROX-${data.invoice.invoiceNumber}-${Date.now()}`.replace(/[^A-Z0-9-]/gi, "-"));
    setPaymentState("idle");
    setPayOpen(true);
  };

  const completePayment = async () => {
    if (!data) return;
    setPaymentState("processing");
    try {
      const response = await fetch(`/api/tenant/owner/billing?tenant=${tenantSlug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ invoiceId: data.invoice.id, paymentMethod, paymentReference }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || "Failed to complete payment");
      setPaymentState("success");
      toast.success("Platform invoice paid");
      await load(true);
      window.setTimeout(() => {
        setPayOpen(false);
        setPaymentState("idle");
      }, 900);
    } catch (nextError) {
      setPaymentState("idle");
      toast.error(nextError instanceof Error ? nextError.message : "Failed to complete payment");
    }
  };

  if (loading) return <div className="space-y-6"><Skeleton className="h-36 rounded-3xl" /><div className="grid gap-4 md:grid-cols-3">{Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-32 rounded-3xl" />)}</div><Skeleton className="h-96 rounded-3xl" /></div>;

  if (error || !data) {
    return (
      <Alert variant="destructive" className="rounded-3xl">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Platform invoice failed to load</AlertTitle>
        <AlertDescription className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span>{error || "No platform invoice data was returned."}</span>
          <Button variant="secondary" onClick={() => void load()}>Retry</Button>
        </AlertDescription>
      </Alert>
    );
  }

  const paid = data.invoice.status === "paid";
  const remainingDays = data.invoice.daysToDue === null ? "Not scheduled" : data.invoice.daysToDue < 0 ? `${Math.abs(data.invoice.daysToDue)} days overdue` : `${data.invoice.daysToDue} days left`;

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-border/70 bg-card/80 shadow-sm backdrop-blur">
        <CardContent className="p-0">
          <div className="relative isolate p-6 md:p-8">
            <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_right,hsl(var(--primary)/0.16),transparent_38%),linear-gradient(135deg,hsl(var(--muted)/0.45),transparent)]" />
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <Button variant="ghost" className="-ml-3 mb-3" onClick={() => router.push(tenantHref("/owner/billing"))}><ArrowLeft className="mr-2 h-4 w-4" />Back to platform billing</Button>
                <div className="flex flex-wrap items-center gap-2">{statusBadge(data.invoice.status)}{ageBadge(data.invoice.age)}<Badge variant="outline" className="rounded-full">{data.school.displayName || data.school.name}</Badge></div>
                <div className="mt-3 flex items-center gap-3">
                  {data.school.logoUrl ? <img src={data.school.logoUrl} alt="" className="h-12 w-12 rounded-2xl border border-border bg-background object-cover" /> : null}
                  <div>
                    <p className="text-sm font-medium">{data.school.displayName || data.school.name}</p>
                    {[data.school.address, data.school.phone, data.school.email].filter(Boolean).length ? <p className="text-xs text-muted-foreground">{[data.school.address, data.school.phone, data.school.email].filter(Boolean).join(" • ")}</p> : null}
                  </div>
                </div>
                <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">{data.invoice.invoiceNumber}</h1>
                <p className="mt-2 text-sm text-muted-foreground">Issued {formatDate(data.invoice.issueDate)} - Due {formatDate(data.invoice.dueDate)} - {remainingDays}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => void load(true)} disabled={refreshing}><RefreshCw className={cn("mr-2 h-4 w-4", refreshing && "animate-spin")} />Refresh</Button>
                <Button variant="outline" onClick={() => openDocument(false)}><FileText className="mr-2 h-4 w-4" />Document</Button>
                <Button variant="outline" onClick={downloadHtml}><Download className="mr-2 h-4 w-4" />Download</Button>
                <Button variant="outline" onClick={() => openDocument(true)}><Printer className="mr-2 h-4 w-4" />Print / Save PDF</Button>
                {!paid && data.invoice.status !== "void" ? <Button onClick={startPayment}><CreditCard className="mr-2 h-4 w-4" />Pay Now</Button> : null}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Tenant amount" value={currency.format(data.invoice.amount)} detail={`${data.invoice.currency} converted dashboard value`} icon={Wallet} />
        <StatCard label="Original amount" value={`${data.invoice.originalCurrency} ${data.invoice.originalAmount.toLocaleString()}`} detail="Master platform invoice value" icon={Receipt} />
        <StatCard label="Exchange rate" value={data.invoice.exchangeRate.toLocaleString()} detail={`${data.invoice.exchangeRateProvider}${data.invoice.exchangeRateDate ? ` - ${data.invoice.exchangeRateDate}` : ""}`} icon={RefreshCw} />
        <StatCard label="Due status" value={remainingDays} detail={`Age bucket: ${data.invoice.age.replace(/_/g, " ")}`} icon={CalendarClock} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-5">
          <Card className="border-border/70 bg-card/80 shadow-sm backdrop-blur">
            <CardHeader><CardTitle>Invoice Summary</CardTitle><CardDescription>Platform invoice details and payment state.</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-2xl border bg-muted/25 p-4"><p className="text-sm text-muted-foreground">Status</p><div className="mt-2">{statusBadge(data.invoice.status)}</div></div>
                <div className="rounded-2xl border bg-muted/25 p-4"><p className="text-sm text-muted-foreground">Paid date</p><p className="mt-2 font-semibold">{formatDate(data.invoice.paidDate)}</p></div>
                <div className="rounded-2xl border bg-muted/25 p-4"><p className="text-sm text-muted-foreground">Last updated</p><p className="mt-2 font-semibold">{formatDate(data.invoice.updatedAt)}</p></div>
              </div>
              <div className="rounded-2xl border bg-muted/25 p-4">
                <p className="text-sm text-muted-foreground">Description</p>
                <p className="mt-2 font-medium">{data.invoice.description || "Roxan platform subscription invoice"}</p>
              </div>
              <div className="rounded-2xl border bg-muted/25 p-4">
                <p className="text-sm text-muted-foreground">Notes</p>
                <p className="mt-2 whitespace-pre-wrap text-sm">{data.invoice.notes || "No notes recorded."}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-card/80 shadow-sm backdrop-blur">
            <CardHeader><CardTitle>Audit Trail</CardTitle><CardDescription>Recent platform actions related to this invoice or tenant.</CardDescription></CardHeader>
            <CardContent className="space-y-3">
              {data.audit.length ? data.audit.map((item, index) => (
                <div key={`${item.action}-${index}`} className="rounded-2xl border bg-muted/20 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div><p className="font-medium capitalize">{item.action.replace(/_/g, " ")}</p><p className="text-xs text-muted-foreground">{item.resource} - {formatDate(item.createdAt)}</p></div>
                    <Badge variant="outline" className="rounded-full capitalize">{item.status || "success"}</Badge>
                  </div>
                </div>
              )) : <p className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">No audit events have been recorded for this invoice yet.</p>}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-5">
          <Card className="border-border/70 bg-card/80 shadow-sm backdrop-blur">
            <CardHeader><CardTitle>Subscription</CardTitle><CardDescription>Plan attached to this platform invoice.</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-3xl border bg-muted/25 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div><p className="text-lg font-semibold">{data.subscription.plan.name}</p><p className="mt-1 text-sm text-muted-foreground">{data.subscription.plan.description || "Roxan platform plan"}</p></div>
                  <Badge variant="outline" className="rounded-full capitalize">{data.subscription.status}</Badge>
                </div>
                <p className="mt-4 text-2xl font-semibold text-primary">{planCurrency.format(data.subscription.plan.price)}</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border bg-muted/25 p-4"><p className="text-xs text-muted-foreground">Start</p><p className="mt-1 font-semibold">{formatDate(data.subscription.startDate)}</p></div>
                <div className="rounded-2xl border bg-muted/25 p-4"><p className="text-xs text-muted-foreground">End</p><p className="mt-1 font-semibold">{formatDate(data.subscription.endDate)}</p></div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">Student usage</span><span>{data.usage.activeStudents}/{data.subscription.plan.maxStudents || "Unlimited"}</span></div>
                <Progress value={data.subscription.plan.maxStudents ? Math.min((data.usage.activeStudents / data.subscription.plan.maxStudents) * 100, 100) : 0} />
                <div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">Staff/user usage</span><span>{data.usage.activeUsers}/{data.subscription.plan.maxStaff || "Unlimited"}</span></div>
                <Progress value={data.subscription.plan.maxStaff ? Math.min((data.usage.activeUsers / data.subscription.plan.maxStaff) * 100, 100) : 0} />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-card/80 shadow-sm backdrop-blur">
            <CardHeader><CardTitle>Tenant Entitlements</CardTitle><CardDescription>Modules currently enabled for this school.</CardDescription></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3 rounded-2xl border bg-muted/25 p-4">
                <div className="rounded-2xl bg-primary/10 p-3 text-primary"><ShieldCheck className="h-5 w-5" /></div>
                <div><p className="font-semibold">{data.usage.enabledModules}/{data.usage.totalModules || data.usage.enabledModules} modules enabled</p><p className="text-sm text-muted-foreground">Tenant module access from platform settings.</p></div>
              </div>
              <div className="flex flex-wrap gap-2">
                {data.modules.slice(0, 18).map((item) => <Badge key={item.moduleKey} variant={item.enabled ? "secondary" : "outline"} className="rounded-full capitalize">{item.moduleKey.replace(/[_-]/g, " ")}</Badge>)}
                {data.modules.length > 18 ? <Badge variant="secondary" className="rounded-full">+{data.modules.length - 18}</Badge> : null}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={payOpen} onOpenChange={(open) => !open && paymentState !== "processing" && setPayOpen(false)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Pay platform invoice</DialogTitle>
            <DialogDescription>Complete this invoice using the current manual/offline payment rail. Gateway rails will attach here when configured.</DialogDescription>
          </DialogHeader>
          <div className="space-y-5">
            <div className="rounded-3xl border bg-muted/30 p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div><p className="text-sm text-muted-foreground">Invoice</p><p className="text-lg font-semibold">{data.invoice.invoiceNumber}</p><p className="mt-1 text-sm text-muted-foreground">{data.invoice.description || "Roxan platform subscription"}</p></div>
                <div className="text-left sm:text-right"><p className="text-sm text-muted-foreground">Amount</p><p className="text-2xl font-semibold">{currency.format(data.invoice.amount)}</p></div>
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
            {paymentState === "processing" ? <div className="rounded-3xl border border-primary/30 bg-primary/10 p-4 text-sm text-primary"><RefreshCw className="mr-2 inline h-4 w-4 animate-spin" />Processing payment and updating invoice state.</div> : null}
            {paymentState === "success" ? <div className="rounded-3xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-700 dark:text-emerald-300"><CheckCircle2 className="mr-2 inline h-4 w-4" />Payment completed. This invoice is now marked as paid.</div> : null}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setPayOpen(false)} disabled={paymentState === "processing"}>Cancel</Button>
            <Button type="button" onClick={() => void completePayment()} disabled={paymentState !== "idle" || !paymentReference.trim()}>{paymentState === "processing" ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <CreditCard className="mr-2 h-4 w-4" />}Pay Now</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
