"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle, Clock, Eye, Loader2, MoreHorizontal, Plus, RefreshCw, X } from "lucide-react";

import { StatusPill } from "@/components/status-pill";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

type Invoice = {
  id: string;
  invoiceNumber: string;
  amount: number | string;
  currency: string;
  displayAmount?: number | string;
  displayCurrency?: string;
  status: "paid" | "pending" | "void" | "overdue";
  issueDate: string;
  dueDate: string;
  description?: string | null;
};

function safeCurrency(currency?: string | null) {
  return /^[A-Z]{3}$/.test(String(currency || "")) ? String(currency).toUpperCase() : "ZAR";
}

function money(value: number | string | null | undefined, currency?: string | null) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: safeCurrency(currency) }).format(Number(value || 0));
}

function dateLabel(value?: string | null) {
  if (!value) return "Not set";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Not set" : date.toLocaleDateString();
}

export default function SchoolInvoicesPage() {
  const params = useParams();
  const router = useRouter();
  const schoolId = String(params?.schoolId || "");
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [schoolName, setSchoolName] = useState("School");
  const [tenantCurrency, setTenantCurrency] = useState("ZAR");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    amount: "",
    currency: "ZAR",
    dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    description: "",
    notes: "",
  });

  const fetchInvoices = async (background = false) => {
    if (!schoolId) return;
    try {
      background ? setRefreshing(true) : setLoading(true);
      const response = await fetch(`/api/master/schools/${schoolId}/invoices`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to load invoices");
      setSchoolName(data.school?.name || "School");
      setTenantCurrency(data.school?.currencyCode || "ZAR");
      setFormData((current) => ({ ...current, currency: data.school?.currencyCode || current.currency || "ZAR" }));
      setInvoices(data.invoices || []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load invoices");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void fetchInvoices();
  }, [schoolId]);

  const handleCreateInvoice = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/master/schools/${schoolId}/invoices`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: formData.amount ? Number(formData.amount) : undefined,
          currency: formData.currency || tenantCurrency,
          dueDate: formData.dueDate,
          description: formData.description,
          notes: formData.notes,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to create invoice");
      toast.success("Invoice created");
      setIsCreateDialogOpen(false);
      setFormData({
        amount: "",
        currency: tenantCurrency,
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        description: "",
        notes: "",
      });
      await fetchInvoices(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create invoice");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAction = async (status: Invoice["status"], invoiceNumber: string) => {
    try {
      const response = await fetch(`/api/master/schools/${schoolId}/invoices/${invoiceNumber}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to update invoice");
      toast.success(`Invoice marked as ${status}`);
      await fetchInvoices(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update invoice");
    }
  };

  const totalOutstanding = invoices
    .filter((invoice) => invoice.status === "pending" || invoice.status === "overdue")
    .reduce((sum, invoice) => sum + Number(invoice.displayAmount ?? invoice.amount ?? 0), 0);

  return (
    <div className="space-y-8">
      <div className="rounded-3xl border bg-card/85 p-6 shadow-sm backdrop-blur">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <Button variant="ghost" size="sm" className="w-fit gap-2 px-0 hover:bg-transparent" onClick={() => router.push(`/master/schools/${schoolId}`)}>
              <ArrowLeft className="h-4 w-4" />
              Back to School
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Invoices</h1>
              <p className="mt-2 text-muted-foreground">Create, review, and update billing records for {schoolName}.</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="gap-2" onClick={() => void fetchInvoices(true)} disabled={refreshing}>
              <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
              Refresh
            </Button>
            <Button className="gap-2" onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4" />
              Create Invoice
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-card/85 backdrop-blur">
          <CardContent className="p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Total Invoices</p>
            <p className="mt-2 text-2xl font-semibold">{invoices.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-card/85 backdrop-blur">
          <CardContent className="p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Outstanding</p>
            <p className="mt-2 text-2xl font-semibold">{money(totalOutstanding, tenantCurrency)}</p>
          </CardContent>
        </Card>
        <Card className="bg-card/85 backdrop-blur">
          <CardContent className="p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Paid</p>
            <p className="mt-2 text-2xl font-semibold">{invoices.filter((invoice) => invoice.status === "paid").length}</p>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-xl">
          <form onSubmit={handleCreateInvoice}>
            <DialogHeader>
              <DialogTitle>Create Invoice</DialogTitle>
              <DialogDescription>Generate a database-backed invoice for {schoolName}. Leave amount empty to use the active subscription amount.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="amount">Amount</Label>
                  <Input id="amount" type="number" min="0" step="0.01" placeholder="Use plan amount" value={formData.amount} onChange={(event) => setFormData({ ...formData, amount: event.target.value })} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Input id="currency" maxLength={3} value={formData.currency} onChange={(event) => setFormData({ ...formData, currency: event.target.value.toUpperCase() })} />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="dueDate">Due Date</Label>
                <Input id="dueDate" type="date" value={formData.dueDate} onChange={(event) => setFormData({ ...formData, dueDate: event.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Input id="description" placeholder="Subscription invoice - June 2026" value={formData.description} onChange={(event) => setFormData({ ...formData, description: event.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="notes">Internal Notes</Label>
                <Textarea id="notes" rows={3} placeholder="Optional billing notes" value={formData.notes} onChange={(event) => setFormData({ ...formData, notes: event.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Create Invoice
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Card className="bg-card/85 shadow-sm backdrop-blur">
        <CardHeader>
          <CardTitle>Invoice History</CardTitle>
          <p className="text-sm text-muted-foreground">All invoices generated for this school.</p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead>Invoice</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                      <Loader2 className="mr-2 inline-block h-5 w-5 animate-spin" />
                      Loading invoices...
                    </TableCell>
                  </TableRow>
                ) : invoices.length ? (
                  invoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{dateLabel(invoice.issueDate)}</TableCell>
                      <TableCell className="max-w-xs truncate text-sm text-muted-foreground">{invoice.description || "School subscription"}</TableCell>
                      <TableCell className="font-medium">{money(invoice.displayAmount ?? invoice.amount, invoice.displayCurrency ?? invoice.currency)}</TableCell>
                      <TableCell><StatusPill status={invoice.status as any} text={invoice.status} /></TableCell>
                      <TableCell className="text-sm text-muted-foreground">{dateLabel(invoice.dueDate)}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm"><MoreHorizontal className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => router.push(`/master/schools/${schoolId}/invoices/${invoice.invoiceNumber}`)}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Invoice
                            </DropdownMenuItem>
                            {invoice.status !== "paid" ? (
                              <DropdownMenuItem onClick={() => void handleAction("paid", invoice.invoiceNumber)}>
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Mark as Paid
                              </DropdownMenuItem>
                            ) : null}
                            {invoice.status !== "pending" ? (
                              <DropdownMenuItem onClick={() => void handleAction("pending", invoice.invoiceNumber)}>
                                <Clock className="mr-2 h-4 w-4" />
                                Mark as Pending
                              </DropdownMenuItem>
                            ) : null}
                            <DropdownMenuItem className="text-destructive" onClick={() => void handleAction("void", invoice.invoiceNumber)}>
                              <X className="mr-2 h-4 w-4" />
                              Void Invoice
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">No invoices found for this school.</TableCell>
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
