"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  Banknote,
  CheckCircle2,
  CreditCard,
  FilePlus2,
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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getTenantSubdomain } from "@/lib/tenant-routing";
import { cn } from "@/lib/utils";

type PaymentRecord = {
  id: string;
  studentId: string;
  studentFeeId: string;
  studentName: string;
  studentEmail: string;
  admissionNumber: string;
  feeName: string;
  feeType: string;
  amount: number;
  paymentMethod: string;
  paymentReference: string;
  provider: string;
  status: string;
  completedAt: string | null;
  failedAt: string | null;
  refundedAt: string | null;
  createdAt: string | null;
  studentFee: { totalAmount: number; amountPaid: number; outstandingBalance: number };
};

type PayableFee = {
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
};

type PaymentsPayload = {
  school: { name: string; slug: string; type: string; status: string; currencyCode?: string | null };
  generatedAt: string;
  payments: PaymentRecord[];
  payableFees: PayableFee[];
  analytics: {
    byStatus: Array<{ name: string; records: number; amount: number }>;
    byMethod: Array<{ name: string; records: number; amount: number }>;
    byFeeType: Array<{ name: string; records: number; amount: number }>;
    byMonth: Array<{ name: string; amount: number; records: number }>;
  };
  summary: {
    records: number;
    completedRecords: number;
    pendingRecords: number;
    failedRecords: number;
    refundedRecords: number;
    completedAmount: number;
    pendingAmount: number;
    failedAmount: number;
    refundedAmount: number;
    receivableOutstanding: number;
    collectionEfficiency: number;
  };
};

const STATUS_STYLES: Record<string, string> = {
  completed: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  paid: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  success: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  pending: "border-primary/30 bg-primary/10 text-primary",
  failed: "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300",
  refunded: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300",
};

const CHART_COLORS = ["hsl(var(--primary))", "hsl(146 66% 36%)", "hsl(346 77% 49%)", "hsl(199 89% 48%)", "hsl(38 92% 50%)"];

const defaultForm = {
  studentFeeId: "",
  studentId: "",
  amount: "",
  paymentMethod: "cash",
  provider: "manual",
  paymentReference: "",
  status: "completed",
};

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

export default function OwnerPaymentsPage() {
  const params = useParams<{ tenant: string }>();
  const router = useRouter();
  const tenantSlug = String(params?.tenant || "");
  const [data, setData] = React.useState<PaymentsPayload | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [query, setQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [methodFilter, setMethodFilter] = React.useState("all");
  const [updatingId, setUpdatingId] = React.useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [creating, setCreating] = React.useState(false);
  const [form, setForm] = React.useState(defaultForm);

  const currency = React.useMemo(
    () => new Intl.NumberFormat("en", { style: "currency", currency: data?.school.currencyCode || "ZAR", maximumFractionDigits: 0 }),
    [data?.school.currencyCode]
  );

  const tenantHref = React.useCallback(
    (path: string) => {
      if (typeof window !== "undefined" && getTenantSubdomain(window.location.host)) return path;
      return `/${tenantSlug}${path}`;
    },
    [tenantSlug]
  );

  const loadPayments = React.useCallback(
    async (quiet = false) => {
      if (!tenantSlug) return;
      setError(null);
      if (quiet) setRefreshing(true);
      else setLoading(true);
      try {
        const response = await fetch(`/api/tenant/owner/payments?tenant=${tenantSlug}`, { credentials: "include", cache: "no-store" });
        const payload = await response.json().catch(() => null);
        if (!response.ok) throw new Error(payload?.error || "Failed to load owner payments data");
        setData(payload as PaymentsPayload);
      } catch (nextError) {
        const message = nextError instanceof Error ? nextError.message : "Failed to load owner payments data";
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
    void loadPayments();
  }, [loadPayments]);

  const selectedFee = React.useMemo(() => data?.payableFees.find((fee) => fee.id === form.studentFeeId), [data?.payableFees, form.studentFeeId]);

  React.useEffect(() => {
    if (!selectedFee) return;
    setForm((current) => ({
      ...current,
      studentId: selectedFee.studentId,
      amount: current.amount || String(selectedFee.outstandingBalance),
    }));
  }, [selectedFee]);

  const filteredPayments = React.useMemo(() => {
    const term = query.trim().toLowerCase();
    return (data?.payments || []).filter((payment) => {
      const matchesTerm =
        !term ||
        [payment.studentName, payment.studentEmail, payment.admissionNumber, payment.paymentReference, payment.paymentMethod, payment.provider, payment.feeName]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(term));
      const matchesStatus = statusFilter === "all" || payment.status === statusFilter;
      const matchesMethod = methodFilter === "all" || payment.paymentMethod === methodFilter;
      return matchesTerm && matchesStatus && matchesMethod;
    });
  }, [data?.payments, methodFilter, query, statusFilter]);

  const updatePayment = async (id: string, status: "completed" | "failed" | "refunded") => {
    setUpdatingId(id);
    try {
      const response = await fetch(`/api/tenant/owner/payments?tenant=${tenantSlug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id, status }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || "Failed to update payment");
      toast.success(`Payment ${status}`);
      await loadPayments(true);
    } catch (nextError) {
      toast.error(nextError instanceof Error ? nextError.message : "Failed to update payment");
    } finally {
      setUpdatingId(null);
    }
  };

  const createPayment = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreating(true);
    try {
      const response = await fetch(`/api/tenant/owner/payments?tenant=${tenantSlug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ...form, amount: Number(form.amount || 0) }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || "Failed to create payment");
      toast.success("Payment recorded");
      setDialogOpen(false);
      setForm(defaultForm);
      await loadPayments(true);
    } catch (nextError) {
      toast.error(nextError instanceof Error ? nextError.message : "Failed to create payment");
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-36 rounded-3xl" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-32 rounded-3xl" />)}
        </div>
        <Skeleton className="h-96 rounded-3xl" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <Alert variant="destructive" className="rounded-3xl">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Payments failed to load</AlertTitle>
        <AlertDescription className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span>{error || "No payment data was returned for this tenant."}</span>
          <Button variant="secondary" size="sm" onClick={() => void loadPayments()}>Retry</Button>
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
                <h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">Payments</h1>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Monitor collections, record manual payments, update payment outcomes, and keep student fee balances accurate for {data.school.name}.
                </p>
                <p className="mt-3 text-xs text-muted-foreground">Last refreshed {formatDate(data.generatedAt)}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => router.push(tenantHref("/owner/finance"))}>Finance overview <ArrowRight className="ml-2 h-4 w-4" /></Button>
                <Button variant="outline" onClick={() => router.push(tenantHref("/owner/invoices"))}>Invoices <ArrowRight className="ml-2 h-4 w-4" /></Button>
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                  <DialogTrigger asChild>
                    <Button><FilePlus2 className="mr-2 h-4 w-4" />Record payment</Button>
                  </DialogTrigger>
                  <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
                    <form onSubmit={createPayment} className="space-y-5">
                      <DialogHeader>
                        <DialogTitle>Record payment</DialogTitle>
                        <DialogDescription>Record an owner-authorized payment against a real outstanding student fee.</DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2 md:col-span-2">
                          <Label>Outstanding fee</Label>
                          <Select value={form.studentFeeId} onValueChange={(value) => setForm((current) => ({ ...current, studentFeeId: value, amount: "" }))}>
                            <SelectTrigger><SelectValue placeholder="Select outstanding student fee" /></SelectTrigger>
                            <SelectContent>
                              {data.payableFees.map((fee) => (
                                <SelectItem key={fee.id} value={fee.id}>
                                  {fee.studentName} • {fee.feeName} • {currency.format(fee.outstandingBalance)} outstanding
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Amount</Label>
                          <Input type="number" min="0" step="0.01" value={form.amount} onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))} />
                        </div>
                        <div className="space-y-2">
                          <Label>Method</Label>
                          <Select value={form.paymentMethod} onValueChange={(value) => setForm((current) => ({ ...current, paymentMethod: value, provider: value === "cash" ? "manual" : current.provider }))}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="cash">Cash</SelectItem>
                              <SelectItem value="card">Card</SelectItem>
                              <SelectItem value="mobile_money">Mobile money</SelectItem>
                              <SelectItem value="bank_transfer">Bank transfer</SelectItem>
                              <SelectItem value="paystack">Paystack</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Provider</Label>
                          <Input value={form.provider} onChange={(event) => setForm((current) => ({ ...current, provider: event.target.value }))} />
                        </div>
                        <div className="space-y-2">
                          <Label>Status</Label>
                          <Select value={form.status} onValueChange={(value) => setForm((current) => ({ ...current, status: value }))}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="completed">Completed</SelectItem>
                              <SelectItem value="pending">Pending</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <Label>Reference</Label>
                          <Input value={form.paymentReference} onChange={(event) => setForm((current) => ({ ...current, paymentReference: event.target.value }))} placeholder="Leave empty to auto-generate" />
                        </div>
                      </div>
                      {selectedFee ? (
                        <Card className="bg-muted/30">
                          <CardContent className="grid gap-3 p-4 text-sm md:grid-cols-3">
                            <div><p className="text-muted-foreground">Student</p><p className="font-semibold">{selectedFee.studentName}</p></div>
                            <div><p className="text-muted-foreground">Outstanding</p><p className="font-semibold">{currency.format(selectedFee.outstandingBalance)}</p></div>
                            <div><p className="text-muted-foreground">After payment</p><p className="font-semibold">{currency.format(Math.max(0, selectedFee.outstandingBalance - Number(form.amount || 0)))}</p></div>
                          </CardContent>
                        </Card>
                      ) : null}
                      <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                        <Button type="submit" disabled={creating}>{creating ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}Record payment</Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
                <Button variant="outline" onClick={() => void loadPayments(true)} disabled={refreshing}>
                  <RefreshCw className={cn("mr-2 h-4 w-4", refreshing && "animate-spin")} />Refresh
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Collected" value={currency.format(data.summary.completedAmount)} detail={`${data.summary.completedRecords} completed payment(s)`} icon={TrendingUp} />
        <StatCard label="Pending" value={currency.format(data.summary.pendingAmount)} detail={`${data.summary.pendingRecords} pending payment(s)`} icon={Wallet} />
        <StatCard label="Outstanding" value={currency.format(data.summary.receivableOutstanding)} detail={`${data.summary.collectionEfficiency}% collection efficiency`} icon={Receipt} />
        <StatCard label="Failed/refunded" value={currency.format(data.summary.failedAmount + data.summary.refundedAmount)} detail={`${data.summary.failedRecords} failed • ${data.summary.refundedRecords} refunded`} icon={XCircle} />
      </div>

      <Tabs defaultValue="overview" className="space-y-5">
        <TabsList className="mx-auto flex h-auto w-fit flex-wrap justify-center rounded-full bg-muted/70 p-1">
          <TabsTrigger value="overview" className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Overview</TabsTrigger>
          <TabsTrigger value="payments" className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Payments</TabsTrigger>
          <TabsTrigger value="receivables" className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Receivables</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-5">
          <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
            <Card className="border-border/70 bg-card/80 shadow-sm backdrop-blur">
              <CardHeader><CardTitle>Payment Trend</CardTitle><CardDescription>Completed collections by recent payment month.</CardDescription></CardHeader>
              <CardContent className="h-80">
                {data.analytics.byMonth.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.analytics.byMonth}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="name" tickLine={false} axisLine={false} className="text-xs" />
                      <YAxis tickLine={false} axisLine={false} className="text-xs" />
                      <Tooltip formatter={(value) => currency.format(Number(value || 0))} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12 }} />
                      <Bar dataKey="amount" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <EmptyState icon={Banknote} title="No payment trend yet" description="Completed payments will build the trend." />}
              </CardContent>
            </Card>
            <Card className="border-border/70 bg-card/80 shadow-sm backdrop-blur">
              <CardHeader><CardTitle>Payment Methods</CardTitle><CardDescription>Completed payment value by method.</CardDescription></CardHeader>
              <CardContent className="space-y-5">
                <div className="h-56">
                  {data.analytics.byMethod.length ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={data.analytics.byMethod} dataKey="amount" nameKey="name" innerRadius={58} outerRadius={92} paddingAngle={3}>
                          {data.analytics.byMethod.map((entry, index) => <Cell key={entry.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}
                        </Pie>
                        <Tooltip formatter={(value) => currency.format(Number(value || 0))} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : <EmptyState icon={CreditCard} title="No method data" description="Completed payments will appear here." />}
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">Collection efficiency</span><span className="font-medium">{data.summary.collectionEfficiency}%</span></div>
                  <Progress value={data.summary.collectionEfficiency} />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="payments" className="space-y-5">
          <Card className="border-border/70 bg-card/80 shadow-sm backdrop-blur">
            <CardContent className="grid gap-3 p-4 md:grid-cols-[1fr_170px_190px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search student, reference, fee, provider..." className="pl-9" />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="refunded">Refunded</SelectItem>
                </SelectContent>
              </Select>
              <Select value={methodFilter} onValueChange={setMethodFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All methods</SelectItem>
                  {Array.from(new Set(data.payments.map((payment) => payment.paymentMethod))).map((method) => <SelectItem key={method} value={method}>{method.replace(/_/g, " ")}</SelectItem>)}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <div className="grid gap-4 xl:grid-cols-2">
            {filteredPayments.map((payment) => (
              <PaymentCard key={payment.id} payment={payment} currency={currency} updatingId={updatingId} onUpdate={updatePayment} />
            ))}
          </div>
          {!filteredPayments.length ? <EmptyState icon={CreditCard} title="No payments matched" description="Adjust search, status, or method filters." /> : null}
        </TabsContent>

        <TabsContent value="receivables" className="grid gap-4 xl:grid-cols-2">
          {data.payableFees.map((fee) => (
            <Card key={fee.id} className="border-border/70 bg-card/80 shadow-sm backdrop-blur">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold">{fee.studentName}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{fee.admissionNumber || fee.studentEmail} • {fee.feeName}</p>
                  </div>
                  {statusBadge(fee.status)}
                </div>
                <div className="mt-4 grid gap-3 rounded-2xl border bg-muted/25 p-3 text-sm sm:grid-cols-3">
                  <div><p className="text-muted-foreground">Total</p><p className="font-semibold">{currency.format(fee.totalAmount)}</p></div>
                  <div><p className="text-muted-foreground">Paid</p><p className="font-semibold">{currency.format(fee.amountPaid)}</p></div>
                  <div><p className="text-muted-foreground">Outstanding</p><p className="font-semibold">{currency.format(fee.outstandingBalance)}</p></div>
                </div>
                <div className="mt-4 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Due {formatDate(fee.dueDate)}</span>
                  <Button size="sm" onClick={() => { setForm({ ...defaultForm, studentFeeId: fee.id, studentId: fee.studentId, amount: String(fee.outstandingBalance) }); setDialogOpen(true); }}>Record payment</Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {!data.payableFees.length ? <EmptyState icon={Receipt} title="No outstanding receivables" description="Student fees with outstanding balances will appear here." /> : null}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function PaymentCard({
  payment,
  currency,
  updatingId,
  onUpdate,
}: {
  payment: PaymentRecord;
  currency: Intl.NumberFormat;
  updatingId: string | null;
  onUpdate: (id: string, status: "completed" | "failed" | "refunded") => void;
}) {
  return (
    <Card className="border-border/70 bg-card/80 shadow-sm backdrop-blur">
      <CardContent className="p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 gap-3">
            <Avatar className="h-11 w-11 border border-border">
              <AvatarFallback className="bg-primary/10 text-primary">{initials(payment.studentName)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <h3 className="truncate font-semibold text-foreground">{payment.studentName}</h3>
              <p className="truncate text-sm text-muted-foreground">{payment.admissionNumber || payment.studentEmail || "Student"} • {payment.feeName}</p>
              <p className="mt-2 text-sm text-foreground">{currency.format(payment.amount)} • {payment.paymentMethod.replace(/_/g, " ")}</p>
            </div>
          </div>
          {statusBadge(payment.status)}
        </div>
        <div className="mt-4 rounded-2xl border bg-muted/25 p-3 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2"><span className="text-muted-foreground">Reference</span><span className="font-medium">{payment.paymentReference || "Not recorded"}</span></div>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground"><span>{payment.provider || "Manual provider"}</span><span>{formatDate(payment.completedAt || payment.createdAt)}</span></div>
        </div>
        <div className="mt-4 flex flex-wrap justify-end gap-2">
          {payment.status === "pending" ? (
            <>
              <Button variant="outline" size="sm" disabled={updatingId === payment.id} onClick={() => onUpdate(payment.id, "failed")}>Mark failed</Button>
              <Button size="sm" disabled={updatingId === payment.id} onClick={() => onUpdate(payment.id, "completed")}>{updatingId === payment.id ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}Complete</Button>
            </>
          ) : ["completed", "paid", "success"].includes(payment.status) ? (
            <Button variant="outline" size="sm" disabled={updatingId === payment.id} onClick={() => onUpdate(payment.id, "refunded")}>Mark refunded</Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
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
