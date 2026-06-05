"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { AlertCircle, Download, Loader2, RefreshCw, Receipt, TrendingUp } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

type PlatformInvoice = {
  id: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  originalAmount: number;
  originalCurrency: string;
  displayAmount: number;
  displayCurrency: string;
  exchangeRate: number;
  exchangeRateDate: string | null;
  exchangeRateProvider: string;
  exchangeRateStale: boolean;
  conversionAvailable: boolean;
  status: string;
  issueDate: string | null;
  dueDate: string | null;
  paidDate: string | null;
  description: string | null;
  plan: string;
};

type PlatformInvoiceData = {
  school: { name: string; slug: string; currencyCode: string | null; currencyName: string | null };
  invoices: PlatformInvoice[];
  summary: { currency: string; total: number; paid: number; outstanding: number };
  generatedAt: string;
};

function money(amount: number, currency = "ZAR") {
  return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(Number(amount || 0));
}

function dateLabel(value?: string | null) {
  return value ? new Date(value).toLocaleDateString() : "Not set";
}

function statusClass(status: string) {
  if (status === "paid") return "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  if (status === "overdue") return "border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-300";
  if (status === "pending") return "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300";
  return "border-muted bg-muted text-muted-foreground";
}

function downloadCsv(invoices: PlatformInvoice[]) {
  const rows = [
    ["Invoice", "Plan", "Status", "Tenant Amount", "Tenant Currency", "Original Amount", "Original Currency", "Rate", "Rate Date", "Due Date"],
    ...invoices.map((invoice) => [
      invoice.invoiceNumber,
      invoice.plan,
      invoice.status,
      invoice.displayAmount,
      invoice.displayCurrency,
      invoice.originalAmount,
      invoice.originalCurrency,
      invoice.exchangeRate,
      invoice.exchangeRateDate || "",
      invoice.dueDate || "",
    ]),
  ];
  const csv = rows.map((row) => row.map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `platform-invoices-${new Date().toISOString().slice(0, 10)}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function FinanceDashboard() {
  const params = useParams<{ tenant?: string }>();
  const tenant = params?.tenant || "";
  const [data, setData] = React.useState<PlatformInvoiceData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [query, setQuery] = React.useState("");

  const loadInvoices = React.useCallback(async () => {
    if (!tenant) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/tenant/${tenant}/platform-invoices`, { cache: "no-store" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || "Failed to load platform invoices");
      setData(payload);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load platform invoices");
    } finally {
      setLoading(false);
    }
  }, [tenant]);

  React.useEffect(() => {
    void loadInvoices();
  }, [loadInvoices]);

  const invoices = React.useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return data?.invoices || [];
    return (data?.invoices || []).filter((invoice) =>
      [invoice.invoiceNumber, invoice.plan, invoice.status, invoice.description].filter(Boolean).join(" ").toLowerCase().includes(term)
    );
  }, [data?.invoices, query]);

  return (
    <div className="space-y-8 p-4 md:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">Platform Billing</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Finance & Billing</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Platform subscription invoices are converted into {data?.school.currencyCode || "your school currency"} using current exchange rates.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="rounded-full" onClick={() => data && downloadCsv(data.invoices)} disabled={!data?.invoices?.length}>
            <Download className="h-4 w-4" />
            Export
          </Button>
          <Button variant="outline" className="rounded-full" onClick={loadInvoices} disabled={loading}>
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      {loading && !data ? (
        <div className="flex min-h-[45vh] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Invoiced</CardTitle>
                <Receipt className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{money(data?.summary.total || 0, data?.summary.currency)}</div>
                <p className="text-xs text-muted-foreground">Converted tenant display value</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Paid</CardTitle>
                <TrendingUp className="h-4 w-4 text-emerald-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-emerald-600">{money(data?.summary.paid || 0, data?.summary.currency)}</div>
                <p className="text-xs text-muted-foreground">Confirmed platform payments</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
                <AlertCircle className="h-4 w-4 text-amber-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-600">{money(data?.summary.outstanding || 0, data?.summary.currency)}</div>
                <p className="text-xs text-muted-foreground">Pending and overdue invoices</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <CardTitle>Platform Subscription Invoices</CardTitle>
                  <CardDescription>
                    Original invoice currency is preserved for accounting; tenant display amount uses live conversion.
                  </CardDescription>
                </div>
                <Input className="max-w-sm" placeholder="Search invoices..." value={query} onChange={(event) => setQuery(event.target.value)} />
              </div>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Tenant Amount</TableHead>
                    <TableHead>Original Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.length ? invoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-mono font-medium">{invoice.invoiceNumber}</TableCell>
                      <TableCell>{invoice.plan}</TableCell>
                      <TableCell className="font-semibold">{money(invoice.displayAmount, invoice.displayCurrency)}</TableCell>
                      <TableCell className="text-muted-foreground">{money(invoice.originalAmount, invoice.originalCurrency)}</TableCell>
                      <TableCell><Badge className={cn("rounded-full border capitalize", statusClass(invoice.status))}>{invoice.status}</Badge></TableCell>
                      <TableCell>{dateLabel(invoice.dueDate)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {invoice.conversionAvailable
                          ? `${invoice.exchangeRate.toFixed(6)} · ${invoice.exchangeRateProvider}${invoice.exchangeRateDate ? ` · ${invoice.exchangeRateDate}` : ""}${invoice.exchangeRateStale ? " · cached" : ""}`
                          : "Conversion unavailable"}
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                        No platform invoices found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
