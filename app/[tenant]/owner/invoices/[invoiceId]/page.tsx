"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { AlertCircle, ArrowLeft, CheckCircle2, CreditCard, FileText, Receipt, RefreshCw, User, Wallet } from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { getTenantSubdomain } from "@/lib/tenant-routing";
import { cn } from "@/lib/utils";

type DetailPayload = {
  school: { name: string; displayName?: string; logoUrl?: string | null; schoolSealUrl?: string | null; reportCardWatermarkUrl?: string | null; primaryColor?: string; address?: string; phone?: string; email?: string; website?: string; motto?: string; slug: string; currencyCode?: string | null };
  invoice: {
    id: string;
    invoiceNumber: string;
    totalAmount: number;
    amountPaid: number;
    outstandingBalance: number;
    status: string;
    dueDate: string | null;
    issuedDate: string | null;
    notes: string;
  };
  student: { name: string; email: string; admissionNumber: string; gender: string; phone: string; address: string; status: string; className: string; grade: string; section: string };
  fees: Array<{ id: string; name: string; feeType: string; totalAmount: number; amountPaid: number; outstandingBalance: number; status: string; dueDate: string | null; description: string }>;
  payments: Array<{ id: string; amount: number; paymentMethod: string; paymentReference: string; provider: string; status: string; completedAt: string | null; createdAt: string | null }>;
  ledger: Array<{ id: string; type: string; amount: number; description: string; reference: string; balance: number; createdAt: string | null }>;
  generatedAt: string;
};

const STATUS_STYLES: Record<string, string> = {
  paid: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  partial: "border-primary/30 bg-primary/10 text-primary",
  unpaid: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  overdue: "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300",
  cancelled: "border-muted-foreground/20 bg-muted text-muted-foreground",
  completed: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  pending: "border-primary/30 bg-primary/10 text-primary",
  failed: "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300",
  refunded: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300",
};

function formatDate(value: string | null) {
  if (!value) return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not set";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

function statusBadge(status: string) {
  return <Badge variant="outline" className={cn("rounded-full px-2.5 py-1 capitalize", STATUS_STYLES[status] || STATUS_STYLES.unpaid)}>{status}</Badge>;
}

function InfoCard({ label, value, detail, icon: Icon }: { label: string; value: string; detail: string; icon: React.ElementType }) {
  return (
    <Card className="border-border/70 bg-card/80 shadow-sm backdrop-blur">
      <CardContent className="flex items-center gap-4 p-5">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Icon className="h-5 w-5" /></div>
        <div className="min-w-0"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-semibold">{value}</p><p className="truncate text-xs text-muted-foreground">{detail}</p></div>
      </CardContent>
    </Card>
  );
}

export default function OwnerInvoiceDetailPage() {
  const params = useParams<{ tenant: string; invoiceId: string }>();
  const router = useRouter();
  const tenantSlug = String(params?.tenant || "");
  const invoiceId = String(params?.invoiceId || "");
  const [data, setData] = React.useState<DetailPayload | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [status, setStatus] = React.useState("");
  const [notes, setNotes] = React.useState("");

  const currency = React.useMemo(() => new Intl.NumberFormat("en", { style: "currency", currency: data?.school.currencyCode || "ZAR", maximumFractionDigits: 0 }), [data?.school.currencyCode]);
  const tenantHref = React.useCallback((path: string) => (typeof window !== "undefined" && getTenantSubdomain(window.location.host) ? path : `/${tenantSlug}${path}`), [tenantSlug]);

  const load = React.useCallback(async (quiet = false) => {
    if (!tenantSlug || !invoiceId) return;
    setError(null);
    if (quiet) setRefreshing(true); else setLoading(true);
    try {
      const response = await fetch(`/api/tenant/owner/invoices/${invoiceId}?tenant=${tenantSlug}`, { credentials: "include", cache: "no-store" });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || "Failed to load invoice details");
      setData(payload);
      setStatus(payload.invoice.status);
      setNotes(payload.invoice.notes || "");
    } catch (nextError) {
      const message = nextError instanceof Error ? nextError.message : "Failed to load invoice details";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [invoiceId, tenantSlug]);

  React.useEffect(() => { void load(); }, [load]);

  const save = async () => {
    setSaving(true);
    try {
      const response = await fetch(`/api/tenant/owner/invoices/${invoiceId}?tenant=${tenantSlug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status, notes }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || "Failed to update invoice");
      toast.success("Invoice updated");
      await load(true);
    } catch (nextError) {
      toast.error(nextError instanceof Error ? nextError.message : "Failed to update invoice");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="space-y-6"><Skeleton className="h-36 rounded-3xl" /><div className="grid gap-4 md:grid-cols-3"><Skeleton className="h-32 rounded-3xl" /><Skeleton className="h-32 rounded-3xl" /><Skeleton className="h-32 rounded-3xl" /></div><Skeleton className="h-96 rounded-3xl" /></div>;

  if (error || !data) {
    return (
      <Alert variant="destructive" className="rounded-3xl">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Invoice details failed to load</AlertTitle>
        <AlertDescription className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><span>{error || "No invoice data was returned."}</span><Button variant="secondary" onClick={() => void load()}>Retry</Button></AlertDescription>
      </Alert>
    );
  }

  const paidPercent = data.invoice.totalAmount ? Math.round((data.invoice.amountPaid / data.invoice.totalAmount) * 1000) / 10 : 0;

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-border/70 bg-card/80 shadow-sm backdrop-blur">
        <CardContent className="p-0">
          <div className="relative isolate p-6 md:p-8">
            <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_right,hsl(var(--primary)/0.16),transparent_38%),linear-gradient(135deg,hsl(var(--muted)/0.45),transparent)]" />
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <Button variant="ghost" className="-ml-3 mb-3" onClick={() => router.push(tenantHref("/owner/invoices"))}><ArrowLeft className="mr-2 h-4 w-4" />Back to invoices</Button>
                <div className="flex flex-wrap items-center gap-2">{statusBadge(data.invoice.status)}<Badge variant="outline" className="rounded-full">{data.school.displayName || data.school.name}</Badge></div>
                <div className="mt-3 flex items-center gap-3">
                  {data.school.logoUrl ? <img src={data.school.logoUrl} alt="" className="h-12 w-12 rounded-2xl border border-border bg-background object-cover" /> : null}
                  <div>
                    <p className="text-sm font-medium">{data.school.displayName || data.school.name}</p>
                    {[data.school.address, data.school.phone, data.school.email].filter(Boolean).length ? <p className="text-xs text-muted-foreground">{[data.school.address, data.school.phone, data.school.email].filter(Boolean).join(" • ")}</p> : null}
                  </div>
                </div>
                <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">{data.invoice.invoiceNumber}</h1>
                <p className="mt-2 text-sm text-muted-foreground">Issued {formatDate(data.invoice.issuedDate)} • Due {formatDate(data.invoice.dueDate)} • {data.student.name}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => void load(true)} disabled={refreshing}><RefreshCw className={cn("mr-2 h-4 w-4", refreshing && "animate-spin")} />Refresh</Button>
                <Button onClick={save} disabled={saving}>{saving ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}Save changes</Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <InfoCard label="Total" value={currency.format(data.invoice.totalAmount)} detail={`${paidPercent}% paid`} icon={FileText} />
        <InfoCard label="Paid" value={currency.format(data.invoice.amountPaid)} detail={`${data.payments.length} payment record(s)`} icon={CreditCard} />
        <InfoCard label="Outstanding" value={currency.format(data.invoice.outstandingBalance)} detail={`Status: ${data.invoice.status}`} icon={Wallet} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-5">
          <Card className="border-border/70 bg-card/80 shadow-sm backdrop-blur">
            <CardHeader><CardTitle>Collection Progress</CardTitle><CardDescription>Invoice payment progress and balance health.</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">Paid percentage</span><span className="font-medium">{paidPercent}%</span></div>
              <Progress value={paidPercent} />
              <div className="grid gap-3 text-sm sm:grid-cols-3">
                <div className="rounded-2xl bg-muted/30 p-3"><p className="text-muted-foreground">Total</p><p className="font-semibold">{currency.format(data.invoice.totalAmount)}</p></div>
                <div className="rounded-2xl bg-muted/30 p-3"><p className="text-muted-foreground">Paid</p><p className="font-semibold">{currency.format(data.invoice.amountPaid)}</p></div>
                <div className="rounded-2xl bg-muted/30 p-3"><p className="text-muted-foreground">Outstanding</p><p className="font-semibold">{currency.format(data.invoice.outstandingBalance)}</p></div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-card/80 shadow-sm backdrop-blur">
            <CardHeader><CardTitle>Related Fees</CardTitle><CardDescription>Student fee balances connected to this student.</CardDescription></CardHeader>
            <CardContent className="space-y-3">
              {data.fees.map((fee) => (
                <div key={fee.id} className="rounded-2xl border bg-muted/20 p-4">
                  <div className="flex items-start justify-between gap-3"><div><p className="font-medium">{fee.name}</p><p className="mt-1 text-sm text-muted-foreground">{fee.feeType} • Due {formatDate(fee.dueDate)}</p></div>{statusBadge(fee.status)}</div>
                  <div className="mt-3 grid gap-2 text-sm sm:grid-cols-3"><span>Total {currency.format(fee.totalAmount)}</span><span>Paid {currency.format(fee.amountPaid)}</span><span>Outstanding {currency.format(fee.outstandingBalance)}</span></div>
                </div>
              ))}
              {!data.fees.length ? <EmptyState icon={Receipt} title="No related fees" description="Student fee lines will appear here when available." /> : null}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-5">
          <Card className="border-border/70 bg-card/80 shadow-sm backdrop-blur">
            <CardHeader><CardTitle>Invoice Controls</CardTitle><CardDescription>Owner-level invoice status and notes.</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2"><label className="text-sm font-medium">Status</label><Select value={status} onValueChange={setStatus}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="unpaid">Unpaid</SelectItem><SelectItem value="partial">Partial</SelectItem><SelectItem value="paid">Paid</SelectItem><SelectItem value="overdue">Overdue</SelectItem><SelectItem value="cancelled">Cancelled</SelectItem></SelectContent></Select></div>
              <div className="space-y-2"><label className="text-sm font-medium">Notes</label><Textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={5} /></div>
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-card/80 shadow-sm backdrop-blur">
            <CardHeader><CardTitle>Student</CardTitle><CardDescription>Billing recipient details.</CardDescription></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <Info label="Name" value={data.student.name} />
              <Info label="Admission" value={data.student.admissionNumber || "Not set"} />
              <Info label="Email" value={data.student.email || "Not set"} />
              <Info label="Class" value={[data.student.grade, data.student.className, data.student.section].filter(Boolean).join(" / ") || "Not set"} />
              <Info label="Phone" value={data.student.phone || "Not set"} />
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card className="border-border/70 bg-card/80 shadow-sm backdrop-blur">
          <CardHeader><CardTitle>Payments</CardTitle><CardDescription>Recent payments for this student.</CardDescription></CardHeader>
          <CardContent className="space-y-3">
            {data.payments.map((payment) => (
              <div key={payment.id} className="flex items-center justify-between gap-4 rounded-2xl border bg-muted/20 p-4">
                <div><p className="font-medium">{currency.format(payment.amount)}</p><p className="mt-1 text-sm text-muted-foreground">{payment.paymentMethod.replace(/_/g, " ")} • {payment.paymentReference || payment.provider || "Payment"}</p></div>
                <div className="text-right">{statusBadge(payment.status)}<p className="mt-2 text-xs text-muted-foreground">{formatDate(payment.completedAt || payment.createdAt)}</p></div>
              </div>
            ))}
            {!data.payments.length ? <EmptyState icon={CreditCard} title="No payments" description="Payments for this student will appear here." /> : null}
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/80 shadow-sm backdrop-blur">
          <CardHeader><CardTitle>Ledger</CardTitle><CardDescription>Recent balance movements for this student.</CardDescription></CardHeader>
          <CardContent className="space-y-3">
            {data.ledger.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between gap-4 rounded-2xl border bg-muted/20 p-4">
                <div><p className="font-medium capitalize">{entry.type.replace(/_/g, " ")}</p><p className="mt-1 text-sm text-muted-foreground">{entry.reference || entry.description || "Ledger entry"}</p></div>
                <div className="text-right"><p className="font-semibold">{currency.format(entry.amount)}</p><p className="mt-1 text-xs text-muted-foreground">{formatDate(entry.createdAt)}</p></div>
              </div>
            ))}
            {!data.ledger.length ? <EmptyState icon={Receipt} title="No ledger activity" description="Ledger movements will appear here once recorded." /> : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between gap-4 rounded-xl bg-muted/30 px-3 py-2"><span className="text-muted-foreground">{label}</span><span className="text-right font-medium">{value}</span></div>;
}

function EmptyState({ icon: Icon, title, description }: { icon: React.ElementType; title: string; description: string }) {
  return (
    <div className="flex min-h-32 flex-col items-center justify-center rounded-2xl border border-dashed p-6 text-center">
      <Icon className="mb-3 h-8 w-8 text-muted-foreground" />
      <p className="font-medium">{title}</p>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
