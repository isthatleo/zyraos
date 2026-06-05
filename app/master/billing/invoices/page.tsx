"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle,
  Clock,
  Download,
  FileText,
  Filter,
  Loader2,
  MoreHorizontal,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusPill } from "@/components/status-pill";

type Invoice = {
  id: string;
  invoiceNumber: string;
  school: string;
  schoolSlug?: string;
  date: string;
  issueDate: string | null;
  amount: number;
  status: "paid" | "pending" | "void" | "overdue";
  dueDate: string;
  dueDateIso: string | null;
  currency: string;
  plan: string;
  description?: string | null;
};

type InvoiceSummary = {
  totalInvoiced: number;
  totalPaid: number;
  totalOutstanding: number;
  overdueAmount: number;
  byStatus: Record<string, number>;
};

function money(amount: number, currency = "ZAR") {
  return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(Number(amount || 0));
}

function exportCsv(invoices: Invoice[]) {
  const headers = ["Invoice", "School", "Plan", "Issue Date", "Due Date", "Currency", "Amount", "Status"];
  const rows = invoices.map((invoice) => [
    invoice.invoiceNumber,
    invoice.school,
    invoice.plan,
    invoice.issueDate || "",
    invoice.dueDateIso || "",
    invoice.currency,
    String(invoice.amount),
    invoice.status,
  ]);
  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `roxan-platform-invoices-${new Date().toISOString().slice(0, 10)}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function SummaryCard({ title, value, subtitle, tone }: { title: string; value: string; subtitle: string; tone?: "success" | "warning" | "danger" }) {
  const toneClass = tone === "success" ? "text-emerald-600" : tone === "danger" ? "text-destructive" : tone === "warning" ? "text-amber-600" : "text-foreground";
  return (
    <Card className="border-border/70 bg-card/95 shadow-sm">
      <CardHeader className="pb-2">
        <CardDescription>{title}</CardDescription>
        <CardTitle className={toneClass}>{value}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </CardContent>
    </Card>
  );
}

export default function InvoicesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [invoices, setInvoices] = React.useState<Invoice[]>([]);
  const [summary, setSummary] = React.useState<InvoiceSummary | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [updatingId, setUpdatingId] = React.useState<string | null>(null);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState(searchParams?.get("status") || "all");

  const fetchInvoices = React.useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/master/billing/invoices", { cache: "no-store" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Failed to load invoices");
      setInvoices(data.invoices || []);
      setSummary(data.summary || null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error loading system invoices");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void fetchInvoices();
  }, [fetchInvoices]);

  const updateStatus = async (invoiceId: string, status: Invoice["status"]) => {
    setUpdatingId(invoiceId);
    try {
      const response = await fetch(`/api/master/billing/invoices/${invoiceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Failed to update invoice");
      toast.success(`Invoice marked as ${status}`);
      await fetchInvoices();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update invoice");
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredInvoices = React.useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return invoices.filter((invoice) => {
      const matchesSearch =
        !query ||
        invoice.invoiceNumber.toLowerCase().includes(query) ||
        invoice.id.toLowerCase().includes(query) ||
        invoice.school.toLowerCase().includes(query) ||
        invoice.plan.toLowerCase().includes(query);
      const matchesStatus = statusFilter === "all" || invoice.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [invoices, searchTerm, statusFilter]);

  return (
    <div className="space-y-8 p-4 md:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push("/master/billing")}>
            <ArrowLeft className="size-5" />
          </Button>
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">Billing Ledger</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">Platform Invoices</h1>
            <p className="mt-2 text-muted-foreground">Review, filter, export, and update invoice status across all schools.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="rounded-full" onClick={fetchInvoices}>
            <RefreshCw className="size-4" />
            Refresh
          </Button>
          <Button variant="outline" className="rounded-full" onClick={() => exportCsv(filteredInvoices)} disabled={!filteredInvoices.length}>
            <Download className="size-4" />
            Export CSV
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard title="Total Invoiced" value={money(summary?.totalInvoiced || 0)} subtitle={`${invoices.length} invoices generated`} />
        <SummaryCard title="Paid Amount" value={money(summary?.totalPaid || 0)} subtitle={`${summary?.byStatus?.paid || 0} paid invoices`} tone="success" />
        <SummaryCard title="Outstanding" value={money(summary?.totalOutstanding || 0)} subtitle={`${(summary?.byStatus?.pending || 0) + (summary?.byStatus?.overdue || 0)} open invoices`} tone="warning" />
        <SummaryCard title="Overdue" value={money(summary?.overdueAmount || 0)} subtitle={`${summary?.byStatus?.overdue || 0} overdue invoices`} tone="danger" />
      </div>

      <Card className="overflow-hidden border-border/70 bg-card/95 shadow-sm">
        <CardHeader className="border-b">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle>Invoice History</CardTitle>
              <CardDescription>Showing {filteredInvoices.length} of {invoices.length} invoices.</CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Search invoices, schools, plans..." className="pl-9" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-44">
                  <Filter className="mr-2 size-4 text-muted-foreground" />
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                  <SelectItem value="void">Void</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="px-6">Invoice</TableHead>
                  <TableHead>School</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Issue Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 6 }).map((_, index) => (
                    <TableRow key={index}>
                      <TableCell colSpan={8} className="p-4">
                        <Skeleton className="h-9 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : filteredInvoices.length ? (
                  filteredInvoices.map((invoice) => (
                    <TableRow key={invoice.id} className="cursor-pointer" onClick={() => router.push(`/master/billing/invoices/${invoice.id}`)}>
                      <TableCell className="px-6 font-semibold">{invoice.invoiceNumber}</TableCell>
                      <TableCell>{invoice.school}</TableCell>
                      <TableCell className="text-muted-foreground">{invoice.plan}</TableCell>
                      <TableCell className="text-muted-foreground">{invoice.date}</TableCell>
                      <TableCell className="font-semibold">{money(invoice.amount, invoice.currency)}</TableCell>
                      <TableCell>
                        <StatusPill status={invoice.status} text={invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)} />
                      </TableCell>
                      <TableCell className="text-muted-foreground">{invoice.dueDate}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" disabled={updatingId === invoice.id} onClick={(event) => event.stopPropagation()}>
                              {updatingId === invoice.id ? <Loader2 className="size-4 animate-spin" /> : <MoreHorizontal className="size-4" />}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => router.push(`/master/billing/invoices/${invoice.id}`)}>
                              <FileText className="mr-2 size-4" />
                              View Invoice
                            </DropdownMenuItem>
                            <DropdownMenuItem disabled={invoice.status === "paid"} onClick={(event) => { event.stopPropagation(); void updateStatus(invoice.id, "paid"); }}>
                              <CheckCircle className="mr-2 size-4" />
                              Mark as Paid
                            </DropdownMenuItem>
                            <DropdownMenuItem disabled={invoice.status === "pending"} onClick={(event) => { event.stopPropagation(); void updateStatus(invoice.id, "pending"); }}>
                              <Clock className="mr-2 size-4" />
                              Mark as Pending
                            </DropdownMenuItem>
                            <DropdownMenuItem disabled={invoice.status === "void"} className="text-destructive" onClick={(event) => { event.stopPropagation(); void updateStatus(invoice.id, "void"); }}>
                              <X className="mr-2 size-4" />
                              Void Invoice
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                      No invoices match the current filters.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
