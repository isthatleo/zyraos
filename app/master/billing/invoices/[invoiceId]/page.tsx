"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  CheckCircle,
  Clock,
  Copy,
  Download,
  Loader2,
  Mail,
  MoreHorizontal,
  Printer,
  ReceiptText,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { StatusPill } from "@/components/status-pill";

type Invoice = {
  id: string;
  invoiceId: string;
  invoiceNumber: string;
  schoolId: string;
  schoolName: string;
  schoolSlug: string;
  schoolAddress: string;
  amount: number;
  currency: string;
  status: "pending" | "paid" | "overdue" | "void";
  issueDate: string;
  dueDate: string;
  paidDate?: string | null;
  plan: string;
  planPrice?: number | null;
  description?: string | null;
  notes?: string | null;
  billingPeriod: string;
  subscriptionStatus?: string | null;
  schoolCurrency: string;
  schoolCurrencyName?: string;
};

function money(amount: number, currency = "ZAR") {
  return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(Number(amount || 0));
}

function dateLabel(date?: string | null) {
  if (!date) return "Not set";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "Not set";
  return new Intl.DateTimeFormat("en", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" }).format(parsed);
}

export default function InvoiceDetailPage() {
  const params = useParams<{ invoiceId?: string }>();
  const router = useRouter();
  const invoiceId = params?.invoiceId || "";
  const [invoice, setInvoice] = React.useState<Invoice | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [updating, setUpdating] = React.useState(false);

  const load = React.useCallback(async () => {
    if (!invoiceId) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/master/billing/invoices/${invoiceId}`, { cache: "no-store" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Could not load invoice");
      setInvoice(data.invoice);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load invoice");
    } finally {
      setLoading(false);
    }
  }, [invoiceId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const updateStatus = async (status: Invoice["status"]) => {
    if (!invoice) return;
    setUpdating(true);
    try {
      const response = await fetch(`/api/master/billing/invoices/${invoice.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Failed to update invoice");
      toast.success(`Invoice marked as ${status}`);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update invoice");
    } finally {
      setUpdating(false);
    }
  };

  const copyPaymentReference = async () => {
    if (!invoice) return;
    await navigator.clipboard.writeText(invoice.invoiceNumber).catch(() => null);
    toast.success("Invoice reference copied");
  };

  const composeEmail = () => {
    if (!invoice) return;
    const subject = encodeURIComponent(`Invoice ${invoice.invoiceNumber} from Roxan`);
    const body = encodeURIComponent(
      `Hello ${invoice.schoolName},\n\nPlease find invoice ${invoice.invoiceNumber} for ${money(invoice.amount, invoice.currency)} due on ${dateLabel(invoice.dueDate)}.\n\nPayment reference: ${invoice.invoiceNumber}\n\nRoxan Education System`
    );
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  if (loading) {
    return (
      <div className="flex min-h-[55vh] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="flex min-h-[55vh] flex-col items-center justify-center p-6 text-center">
        <X className="mb-4 size-12 text-destructive" />
        <h1 className="text-2xl font-semibold">Invoice Not Found</h1>
        <p className="mt-2 text-muted-foreground">The invoice does not exist or has been deleted.</p>
        <Button onClick={() => router.push("/master/billing/invoices")} className="mt-6">Back to Invoices</Button>
      </div>
    );
  }

  const total = money(invoice.amount, invoice.currency);

  return (
    <div className="space-y-6 p-4 md:p-6 print:p-0">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between print:hidden">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push("/master/billing/invoices")}>
            <ArrowLeft className="size-5" />
          </Button>
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">Invoice Detail</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">{invoice.invoiceNumber}</h1>
            <p className="mt-2 text-muted-foreground">{invoice.schoolName} - {invoice.plan}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="rounded-full">
                <MoreHorizontal className="size-4" />
                Actions
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => window.print()}>
                <Download className="mr-2 size-4" />
                Download PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={composeEmail}>
                <Mail className="mr-2 size-4" />
                Compose Email
              </DropdownMenuItem>
              <DropdownMenuItem onClick={copyPaymentReference}>
                <Copy className="mr-2 size-4" />
                Copy Reference
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button onClick={() => window.print()} className="rounded-full">
            <Printer className="size-4" />
            Print
          </Button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.8fr_1.4fr] print:block">
        <div className="space-y-6 print:hidden">
          <Card className="border-border/70 bg-card/95 shadow-sm">
            <CardHeader>
              <CardTitle>Status Controls</CardTitle>
              <CardDescription>Persist status changes directly to the billing ledger.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-2xl border bg-background/70 p-4">
                <span className="text-sm text-muted-foreground">Current status</span>
                <StatusPill status={invoice.status} text={invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)} />
              </div>
              <div className="grid gap-2">
                <Button variant="outline" disabled={updating || invoice.status === "paid"} onClick={() => updateStatus("paid")}>
                  <CheckCircle className="size-4" />
                  Mark as Paid
                </Button>
                <Button variant="outline" disabled={updating || invoice.status === "pending"} onClick={() => updateStatus("pending")}>
                  <Clock className="size-4" />
                  Mark as Pending
                </Button>
                <Button variant="outline" disabled={updating || invoice.status === "void"} onClick={() => updateStatus("void")}>
                  <X className="size-4" />
                  Void Invoice
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-card/95 shadow-sm">
            <CardHeader>
              <CardTitle>Billing Metadata</CardTitle>
              <CardDescription>Subscription and collection context.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">School Slug</span>
                <span className="font-medium">{invoice.schoolSlug || "N/A"}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Subscription</span>
                <span className="font-medium capitalize">{invoice.subscriptionStatus || "N/A"}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Paid Date</span>
                <span className="font-medium">{dateLabel(invoice.paidDate)}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Currency</span>
                <span className="font-medium">{invoice.currency}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mx-auto w-full max-w-5xl overflow-hidden border-border/70 bg-card shadow-xl print:max-w-full print:border-none print:shadow-none">
          <div className="h-2 bg-primary" />
          <CardContent className="p-6 md:p-10">
            <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
              <div className="space-y-4">
                <div className="flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                  <ReceiptText className="size-7" />
                </div>
                <div>
                  <h2 className="text-3xl font-bold uppercase tracking-tight">Tax Invoice</h2>
                  <p className="font-mono text-muted-foreground">#{invoice.invoiceNumber}</p>
                </div>
              </div>
              <div className="space-y-1 text-left text-sm text-muted-foreground md:text-right">
                <p className="font-bold text-foreground">Roxan Education System</p>
                <p>Platform Billing & Subscription Operations</p>
                <p>Cape Town, South Africa</p>
                <p>billing@roxan.com</p>
              </div>
            </div>

            <div className="mt-12 grid gap-8 md:grid-cols-2">
              <div className="rounded-2xl border bg-background/70 p-5">
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Billed To</p>
                <div className="flex items-start gap-3">
                  <Building2 className="mt-1 size-5 text-primary" />
                  <div>
                    <p className="text-lg font-semibold">{invoice.schoolName}</p>
                    <p className="text-muted-foreground">{invoice.schoolAddress || "School account"}</p>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 rounded-2xl border bg-background/70 p-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Issued</p>
                  <p className="mt-2 font-semibold">{dateLabel(invoice.issueDate)}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Due</p>
                  <p className="mt-2 font-semibold">{dateLabel(invoice.dueDate)}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Status</p>
                  <div className="mt-2"><StatusPill status={invoice.status} text={invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)} /></div>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Reference</p>
                  <p className="mt-2 font-mono font-semibold">{invoice.invoiceNumber}</p>
                </div>
              </div>
            </div>

            <div className="mt-12 overflow-hidden rounded-2xl border">
              <table className="w-full border-collapse text-left">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="p-4 font-semibold">Description</th>
                    <th className="p-4 font-semibold">Period</th>
                    <th className="p-4 text-right font-semibold">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t">
                    <td className="p-4">
                      <p className="font-semibold">{invoice.plan}</p>
                      <p className="text-sm text-muted-foreground">{invoice.description || "School management subscription"}</p>
                    </td>
                    <td className="p-4 text-muted-foreground">{invoice.billingPeriod}</td>
                    <td className="p-4 text-right font-semibold">{total}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="mt-10 flex justify-end">
              <div className="w-full max-w-sm space-y-3">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span>{total}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Tax</span>
                  <span>{money(0, invoice.currency)}</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between text-xl font-bold">
                  <span>Total Due</span>
                  <span className="text-primary">{total}</span>
                </div>
              </div>
            </div>

            <div className="mt-16 grid gap-6 border-t pt-8 md:grid-cols-2">
              <div className="text-sm text-muted-foreground">
                <p className="font-semibold text-foreground">Payment Notes</p>
                <p className="mt-2">Use invoice number <span className="font-mono font-semibold text-foreground">{invoice.invoiceNumber}</span> as the payment reference.</p>
                {invoice.notes ? <p className="mt-2">{invoice.notes}</p> : null}
              </div>
              <div className="text-sm text-muted-foreground md:text-right">
                <p className="font-semibold text-foreground">Authorized By</p>
                <p className="mt-2">Roxan Platform Billing</p>
                <div className="ml-auto mt-6 h-px w-44 bg-border" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
