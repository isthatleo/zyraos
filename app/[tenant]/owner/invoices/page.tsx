"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { AlertCircle, ArrowRight, CheckCircle2, FilePlus2, FileText, Receipt, RefreshCw, Search, TrendingUp, Wallet, XCircle } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { getTenantSubdomain } from "@/lib/tenant-routing";
import { cn } from "@/lib/utils";

type Invoice = {
  id: string;
  invoiceNumber: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  admissionNumber: string;
  totalAmount: number;
  amountPaid: number;
  outstandingBalance: number;
  status: string;
  dueDate: string | null;
  issuedDate: string | null;
  notes: string;
};

type Payload = {
  school: { name: string; displayName?: string; logoUrl?: string | null; schoolSealUrl?: string | null; reportCardWatermarkUrl?: string | null; primaryColor?: string; address?: string; phone?: string; email?: string; website?: string; motto?: string; slug: string; currencyCode?: string | null };
  generatedAt: string;
  invoices: Invoice[];
  students: Array<{ id: string; name: string; email: string; admissionNumber: string }>;
  analytics: {
    byStatus: Array<{ name: string; records: number; amount: number; outstanding: number }>;
    byMonth: Array<{ name: string; billed: number; paid: number; outstanding: number; records: number }>;
  };
  summary: {
    records: number;
    totalAmount: number;
    paidAmount: number;
    outstandingAmount: number;
    overdueAmount: number;
    paidRecords: number;
    partialRecords: number;
    unpaidRecords: number;
    overdueRecords: number;
    cancelledRecords: number;
    collectionRate: number;
  };
};

const STATUS_STYLES: Record<string, string> = {
  paid: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  partial: "border-primary/30 bg-primary/10 text-primary",
  unpaid: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  overdue: "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300",
  cancelled: "border-muted-foreground/20 bg-muted text-muted-foreground",
};

const CHART_COLORS = ["hsl(var(--primary))", "hsl(146 66% 36%)", "hsl(346 77% 49%)", "hsl(38 92% 50%)", "hsl(215 16% 47%)"];

const defaultForm = { studentId: "", totalAmount: "", amountPaid: "0", dueDate: "", invoiceNumber: "", notes: "" };

function formatDate(value: string | null) {
  if (!value) return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not set";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

function statusBadge(status: string) {
  return <Badge variant="outline" className={cn("rounded-full px-2.5 py-1 capitalize", STATUS_STYLES[status] || STATUS_STYLES.unpaid)}>{status}</Badge>;
}

function StatCard({ label, value, detail, icon: Icon }: { label: string; value: string | number; detail: string; icon: React.ElementType }) {
  return (
    <Card className="border-border/70 bg-card/80 shadow-sm backdrop-blur">
      <CardContent className="flex items-center gap-4 p-5">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Icon className="h-5 w-5" /></div>
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p>
          <p className="truncate text-xs text-muted-foreground">{detail}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function OwnerInvoicesPage() {
  const params = useParams<{ tenant: string }>();
  const router = useRouter();
  const tenantSlug = String(params?.tenant || "");
  const [data, setData] = React.useState<Payload | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [query, setQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [creating, setCreating] = React.useState(false);
  const [form, setForm] = React.useState(defaultForm);

  const currency = React.useMemo(() => new Intl.NumberFormat("en", { style: "currency", currency: data?.school.currencyCode || "ZAR", maximumFractionDigits: 0 }), [data?.school.currencyCode]);
  const tenantHref = React.useCallback((path: string) => (typeof window !== "undefined" && getTenantSubdomain(window.location.host) ? path : `/${tenantSlug}${path}`), [tenantSlug]);

  const load = React.useCallback(async (quiet = false) => {
    if (!tenantSlug) return;
    setError(null);
    if (quiet) setRefreshing(true); else setLoading(true);
    try {
      const response = await fetch(`/api/tenant/owner/invoices?tenant=${tenantSlug}`, { credentials: "include", cache: "no-store" });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || "Failed to load owner invoices data");
      setData(payload);
    } catch (nextError) {
      const message = nextError instanceof Error ? nextError.message : "Failed to load owner invoices data";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [tenantSlug]);

  React.useEffect(() => { void load(); }, [load]);

  const filtered = React.useMemo(() => {
    const term = query.trim().toLowerCase();
    return (data?.invoices || []).filter((invoice) => {
      const matchesTerm = !term || [invoice.invoiceNumber, invoice.studentName, invoice.studentEmail, invoice.admissionNumber, invoice.notes].filter(Boolean).some((value) => value.toLowerCase().includes(term));
      const matchesStatus = statusFilter === "all" || invoice.status === statusFilter;
      return matchesTerm && matchesStatus;
    });
  }, [data?.invoices, query, statusFilter]);

  const createInvoice = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreating(true);
    try {
      const response = await fetch(`/api/tenant/owner/invoices?tenant=${tenantSlug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ...form, totalAmount: Number(form.totalAmount || 0), amountPaid: Number(form.amountPaid || 0) }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || "Failed to create invoice");
      toast.success("Invoice created");
      setDialogOpen(false);
      setForm(defaultForm);
      await load(true);
    } catch (nextError) {
      toast.error(nextError instanceof Error ? nextError.message : "Failed to create invoice");
    } finally {
      setCreating(false);
    }
  };

  if (loading) return <div className="space-y-6"><Skeleton className="h-36 rounded-3xl" /><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-32 rounded-3xl" />)}</div><Skeleton className="h-96 rounded-3xl" /></div>;

  if (error || !data) {
    return (
      <Alert variant="destructive" className="rounded-3xl">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Invoices failed to load</AlertTitle>
        <AlertDescription className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span>{error || "No invoice data was returned for this tenant."}</span>
          <Button variant="secondary" size="sm" onClick={() => void load()}>Retry</Button>
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
                <div className="mb-3 flex items-center gap-3">
                  {data.school.logoUrl ? <img src={data.school.logoUrl} alt="" className="h-12 w-12 rounded-2xl border border-border bg-background object-cover" /> : null}
                  <div>
                    <Badge className="rounded-full bg-primary/10 text-primary hover:bg-primary/10">Owner finance command</Badge>
                    <p className="mt-1 text-xs text-muted-foreground">{data.school.displayName || data.school.name}</p>
                  </div>
                </div>
                <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Invoices</h1>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">Create, review, and drill into student invoices, collection state, and outstanding balances for {data.school.displayName || data.school.name}.</p>
                {[data.school.address, data.school.phone, data.school.email, data.school.website].filter(Boolean).length ? <p className="mt-2 text-xs text-muted-foreground">{[data.school.address, data.school.phone, data.school.email, data.school.website].filter(Boolean).join(" • ")}</p> : null}
                <p className="mt-3 text-xs text-muted-foreground">Last refreshed {formatDate(data.generatedAt)}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => router.push(tenantHref("/owner/finance"))}>Finance overview <ArrowRight className="ml-2 h-4 w-4" /></Button>
                <Button variant="outline" onClick={() => router.push(tenantHref("/owner/payments"))}>Payments <ArrowRight className="ml-2 h-4 w-4" /></Button>
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                  <DialogTrigger asChild><Button><FilePlus2 className="mr-2 h-4 w-4" />New invoice</Button></DialogTrigger>
                  <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
                    <form onSubmit={createInvoice} className="space-y-5">
                      <DialogHeader><DialogTitle>Create invoice</DialogTitle><DialogDescription>Create a student invoice using real tenant student records.</DialogDescription></DialogHeader>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2 md:col-span-2">
                          <Label>Student</Label>
                          <Select value={form.studentId} onValueChange={(value) => setForm((current) => ({ ...current, studentId: value }))}>
                            <SelectTrigger><SelectValue placeholder="Select student" /></SelectTrigger>
                            <SelectContent>{data.students.map((student) => <SelectItem key={student.id} value={student.id}>{student.name} • {student.admissionNumber || student.email}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2"><Label>Total amount</Label><Input type="number" min="0" step="0.01" value={form.totalAmount} onChange={(event) => setForm((current) => ({ ...current, totalAmount: event.target.value }))} /></div>
                        <div className="space-y-2"><Label>Amount paid</Label><Input type="number" min="0" step="0.01" value={form.amountPaid} onChange={(event) => setForm((current) => ({ ...current, amountPaid: event.target.value }))} /></div>
                        <div className="space-y-2"><Label>Due date</Label><Input type="date" value={form.dueDate} onChange={(event) => setForm((current) => ({ ...current, dueDate: event.target.value }))} /></div>
                        <div className="space-y-2"><Label>Invoice number</Label><Input value={form.invoiceNumber} onChange={(event) => setForm((current) => ({ ...current, invoiceNumber: event.target.value }))} placeholder="Auto-generated if empty" /></div>
                        <div className="space-y-2 md:col-span-2"><Label>Notes</Label><Textarea value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} /></div>
                      </div>
                      <DialogFooter><Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button><Button type="submit" disabled={creating}>{creating ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}Create invoice</Button></DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
                <Button variant="outline" onClick={() => void load(true)} disabled={refreshing}><RefreshCw className={cn("mr-2 h-4 w-4", refreshing && "animate-spin")} />Refresh</Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Billed" value={currency.format(data.summary.totalAmount)} detail={`${data.summary.records} invoice(s)`} icon={FileText} />
        <StatCard label="Collected" value={currency.format(data.summary.paidAmount)} detail={`${data.summary.collectionRate}% collection rate`} icon={TrendingUp} />
        <StatCard label="Outstanding" value={currency.format(data.summary.outstandingAmount)} detail={`${data.summary.unpaidRecords + data.summary.partialRecords} active invoice(s)`} icon={Wallet} />
        <StatCard label="Overdue" value={currency.format(data.summary.overdueAmount)} detail={`${data.summary.overdueRecords} overdue invoice(s)`} icon={XCircle} />
      </div>

      <Tabs defaultValue="overview" className="space-y-5">
        <TabsList className="mx-auto flex h-auto w-fit flex-wrap justify-center rounded-full bg-muted/70 p-1">
          <TabsTrigger value="overview" className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Overview</TabsTrigger>
          <TabsTrigger value="invoices" className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Invoices</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
          <Card className="border-border/70 bg-card/80 shadow-sm backdrop-blur">
            <CardHeader><CardTitle>Invoice Trend</CardTitle><CardDescription>Billed, paid, and outstanding balances by issued month.</CardDescription></CardHeader>
            <CardContent className="h-80">
              {data.analytics.byMonth.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.analytics.byMonth}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="name" tickLine={false} axisLine={false} className="text-xs" />
                    <YAxis tickLine={false} axisLine={false} className="text-xs" />
                    <Tooltip formatter={(value) => currency.format(Number(value || 0))} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12 }} />
                    <Bar dataKey="billed" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
                    <Bar dataKey="paid" fill="hsl(146 66% 36%)" radius={[8, 8, 0, 0]} />
                    <Bar dataKey="outstanding" fill="hsl(346 77% 49%)" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <EmptyState icon={Receipt} title="No invoice trend yet" description="Invoices will build monthly billing analytics." />}
            </CardContent>
          </Card>
          <Card className="border-border/70 bg-card/80 shadow-sm backdrop-blur">
            <CardHeader><CardTitle>Status Mix</CardTitle><CardDescription>Invoice value by workflow state.</CardDescription></CardHeader>
            <CardContent className="h-80">
              {data.analytics.byStatus.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={data.analytics.byStatus} dataKey="amount" nameKey="name" innerRadius={58} outerRadius={92} paddingAngle={3}>
                      {data.analytics.byStatus.map((entry, index) => <Cell key={entry.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(value) => currency.format(Number(value || 0))} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : <EmptyState icon={FileText} title="No status data" description="Invoice statuses will appear here." />}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invoices" className="space-y-5">
          <Card className="border-border/70 bg-card/80 shadow-sm backdrop-blur">
            <CardContent className="grid gap-3 p-4 md:grid-cols-[1fr_180px]">
              <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search invoice, student, admission number..." className="pl-9" /></div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="partial">Partial</SelectItem>
                  <SelectItem value="unpaid">Unpaid</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <div className="grid gap-4 xl:grid-cols-2">
            {filtered.map((invoice) => (
              <Card key={invoice.id} className="border-border/70 bg-card/80 shadow-sm backdrop-blur">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div><p className="font-semibold">{invoice.invoiceNumber}</p><p className="mt-1 text-sm text-muted-foreground">{invoice.studentName} • {invoice.admissionNumber || invoice.studentEmail}</p></div>
                    {statusBadge(invoice.status)}
                  </div>
                  <div className="mt-4 grid gap-3 rounded-2xl border bg-muted/25 p-3 text-sm sm:grid-cols-3">
                    <div><p className="text-muted-foreground">Total</p><p className="font-semibold">{currency.format(invoice.totalAmount)}</p></div>
                    <div><p className="text-muted-foreground">Paid</p><p className="font-semibold">{currency.format(invoice.amountPaid)}</p></div>
                    <div><p className="text-muted-foreground">Outstanding</p><p className="font-semibold">{currency.format(invoice.outstandingBalance)}</p></div>
                  </div>
                  <div className="mt-4 flex items-center justify-between gap-3">
                    <p className="text-sm text-muted-foreground">Due {formatDate(invoice.dueDate)}</p>
                    <Button size="sm" onClick={() => router.push(tenantHref(`/owner/invoices/${invoice.id}`))}>View details <ArrowRight className="ml-2 h-4 w-4" /></Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          {!filtered.length ? <EmptyState icon={FileText} title="No invoices matched" description="Adjust search or status filters." /> : null}
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
        <p className="font-medium">{title}</p>
        <p className="mt-1 max-w-md text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}
