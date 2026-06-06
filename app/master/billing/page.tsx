"use client";

import * as React from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  Clock,
  CreditCard,
  FileText,
  Loader2,
  Plus,
  Receipt,
  RefreshCw,
  TrendingUp,
  Wallet,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusPill } from "@/components/status-pill";
import { cn } from "@/lib/utils";

type BillingOverview = {
  metrics: {
    totalInvoiced: number;
    totalCollected: number;
    outstanding: number;
    overdue: number;
    invoiceCount: number;
    activeSubscriptions: number;
    mrr: number;
    collectionRate: number;
    statusCounts: Record<string, number>;
  };
  recentInvoices: Array<{
    id: string;
    invoiceNumber: string;
    school: string;
    amount: number;
    currency: string;
    status: "paid" | "pending" | "overdue" | "void";
    dueDate: string | null;
    plan: string;
  }>;
  planDistribution: Array<{ name: string; value: number; revenue: number }>;
  revenueTrend: Array<{ month: string; invoiced: number; collected: number }>;
  agingBuckets: Array<{ label: string; amount: number; count: number }>;
  atRiskInvoices: Array<{ id: string; invoiceNumber: string; school: string; amount: number; currency: string; dueDate: string | null }>;
};

type SchoolOption = {
  id: string;
  name: string;
  currencyCode?: string | null;
  planPrice?: string | null;
};

const chartColors = ["hsl(var(--primary))", "#22c55e", "#0ea5e9", "#f59e0b", "#ef4444", "#8b5cf6"];

function money(amount: number, currency = "ZAR") {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number(amount || 0));
}

function dateLabel(date?: string | null) {
  if (!date) return "Not set";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "Not set";
  return new Intl.DateTimeFormat("en", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" }).format(parsed);
}

function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  tone = "default",
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "default" | "success" | "warning" | "danger";
}) {
  const tones = {
    default: "bg-primary/10 text-primary",
    success: "bg-emerald-500/10 text-emerald-600",
    warning: "bg-amber-500/10 text-amber-600",
    danger: "bg-destructive/10 text-destructive",
  };

  return (
    <Card className="border-border/70 bg-card/95 shadow-sm backdrop-blur">
      <CardHeader className="flex flex-row items-start justify-between gap-4 pb-2">
        <div>
          <CardDescription>{title}</CardDescription>
          <CardTitle className="mt-2 text-2xl">{value}</CardTitle>
        </div>
        <div className={cn("rounded-2xl p-3", tones[tone])}>
          <Icon className="size-5" />
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </CardContent>
    </Card>
  );
}

function CreateInvoiceDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = React.useState(false);
  const [schools, setSchools] = React.useState<SchoolOption[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [form, setForm] = React.useState({
    schoolId: "",
    amount: "",
    currency: "ZAR",
    dueDate: "",
    description: "Platform subscription invoice",
    notes: "",
  });

  React.useEffect(() => {
    if (!open) return;
    let cancelled = false;
    fetch("/api/master/schools?limit=200", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        setSchools(data.schools || []);
      })
      .catch(() => toast.error("Failed to load schools"));
    return () => {
      cancelled = true;
    };
  }, [open]);

  const selectedSchool = schools.find((school) => school.id === form.schoolId);

  React.useEffect(() => {
    if (!selectedSchool) return;
    setForm((current) => ({
      ...current,
      amount: current.amount || String(selectedSchool.planPrice || ""),
      currency: selectedSchool.currencyCode || current.currency || "ZAR",
    }));
  }, [selectedSchool]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    try {
      const response = await fetch("/api/master/billing/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schoolId: form.schoolId,
          amount: Number(form.amount),
          currency: form.currency,
          dueDate: form.dueDate,
          description: form.description,
          notes: form.notes,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Failed to create invoice");
      toast.success("Invoice created");
      setOpen(false);
      setForm({ schoolId: "", amount: "", currency: "ZAR", dueDate: "", description: "Platform subscription invoice", notes: "" });
      onCreated();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create invoice");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="rounded-full">
          <Plus className="size-4" />
          New Invoice
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Create Platform Invoice</DialogTitle>
          <DialogDescription>Create a real invoice against a school subscription account.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label>School</Label>
            <Select value={form.schoolId} onValueChange={(value) => setForm((current) => ({ ...current, schoolId: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select school" />
              </SelectTrigger>
              <SelectContent>
                {schools.map((school) => (
                  <SelectItem key={school.id} value={school.id}>
                    {school.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Amount</Label>
              <Input value={form.amount} onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))} type="number" min="0" step="0.01" required />
            </div>
            <div className="space-y-2">
              <Label>Currency</Label>
              <Input value={form.currency} onChange={(event) => setForm((current) => ({ ...current, currency: event.target.value.toUpperCase() }))} maxLength={3} required />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Due Date</Label>
            <Input value={form.dueDate} onChange={(event) => setForm((current) => ({ ...current, dueDate: event.target.value }))} type="date" required />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Input value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} required />
          </div>
          <div className="space-y-2">
            <Label>Notes</Label>
            <Input value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} placeholder="Optional internal or invoice note" />
          </div>
          <Button type="submit" className="w-full" disabled={loading || !form.schoolId || !form.amount}>
            {loading ? <Loader2 className="size-4 animate-spin" /> : null}
            Create Invoice
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function BillingPage() {
  const [data, setData] = React.useState<BillingOverview | null>(null);
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/master/billing", { cache: "no-store" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Failed to load billing overview");
      setData(payload);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load billing overview");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const metrics = data?.metrics;

  return (
    <div className="space-y-8 p-4 md:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">Platform Billing</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Financial Overview</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Monitor subscription revenue, collections, invoice risk, and plan performance across all schools.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" className="rounded-full">
            <Link href="/master/billing/invoices">
              <Receipt className="size-4" />
              View Invoices
            </Link>
          </Button>
          <Button variant="outline" className="rounded-full" onClick={load} disabled={loading}>
            <RefreshCw className={cn("size-4", loading && "animate-spin")} />
            Refresh
          </Button>
          <CreateInvoiceDialog onCreated={load} />
        </div>
      </div>

      {metrics ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard title="Total Collected" value={money(metrics.totalCollected)} subtitle={`${metrics.collectionRate.toFixed(1)}% collection rate`} icon={Wallet} tone="success" />
          <MetricCard title="Outstanding" value={money(metrics.outstanding)} subtitle={`${metrics.statusCounts.pending || 0} pending invoices`} icon={Clock} tone="warning" />
          <MetricCard title="Overdue Risk" value={money(metrics.overdue)} subtitle={`${metrics.statusCounts.overdue || 0} overdue invoices`} icon={AlertTriangle} tone="danger" />
          <MetricCard title="MRR" value={money(metrics.mrr)} subtitle={`${metrics.activeSubscriptions} active subscriptions`} icon={TrendingUp} />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {["Total Collected", "Outstanding", "Overdue Risk", "MRR"].map((title) => (
            <Card key={title} className="border-border/70 bg-card/95 shadow-sm">
              <CardHeader className="pb-2">
                <CardDescription>{title}</CardDescription>
                <CardTitle className="mt-2 text-2xl">Loading...</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Loading platform billing data</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
        <Card className="border-border/70 bg-card/95 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="size-5 text-primary" />
              Revenue Trend
            </CardTitle>
            <CardDescription>Monthly invoiced versus collected revenue.</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data?.revenueTrend || []}>
                <defs>
                  <linearGradient id="invoiced" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.28} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="collected" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.24} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip formatter={(value) => money(Number(value))} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12 }} />
                <Area type="monotone" dataKey="invoiced" stroke="hsl(var(--primary))" fill="url(#invoiced)" strokeWidth={2} />
                <Area type="monotone" dataKey="collected" stroke="#22c55e" fill="url(#collected)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/95 shadow-sm">
          <CardHeader>
            <CardTitle>Plan Distribution</CardTitle>
            <CardDescription>Active subscriptions by plan.</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data?.planDistribution || []} dataKey="value" nameKey="name" innerRadius={64} outerRadius={92} paddingAngle={3}>
                  {(data?.planDistribution || []).map((entry, index) => (
                    <Cell key={entry.name} fill={chartColors[index % chartColors.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value, _name, item) => [`${value} schools`, item.payload.name]} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Card className="border-border/70 bg-card/95 shadow-sm">
          <CardHeader>
            <CardTitle>A/R Aging</CardTitle>
            <CardDescription>Outstanding receivables grouped by due-date age.</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.agingBuckets || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip formatter={(value) => money(Number(value))} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12 }} />
                <Bar dataKey="amount" radius={[8, 8, 0, 0]} fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/95 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Overdue Risk</CardTitle>
              <CardDescription>Invoices that need collection follow-up.</CardDescription>
            </div>
            <Button asChild variant="outline" size="sm" className="rounded-full">
              <Link href="/master/billing/invoices?status=overdue">Open</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {(data?.atRiskInvoices || []).length ? (
              data?.atRiskInvoices.map((invoice) => (
                <Link key={invoice.id} href={`/master/billing/invoices/${invoice.id}`} className="flex items-center justify-between rounded-2xl border bg-background/60 p-4 transition-colors hover:bg-muted/60">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{invoice.school}</p>
                    <p className="text-sm text-muted-foreground">{invoice.invoiceNumber} - Due {dateLabel(invoice.dueDate)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-destructive">{money(invoice.amount, invoice.currency)}</p>
                    <ArrowUpRight className="ml-auto mt-1 size-4 text-muted-foreground" />
                  </div>
                </Link>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed p-8 text-center">
                <CheckCircle2 className="mx-auto size-8 text-emerald-600" />
                <p className="mt-3 font-medium">No overdue invoices</p>
                <p className="text-sm text-muted-foreground">Collection risk is currently clear.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/70 bg-card/95 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recent Invoices</CardTitle>
            <CardDescription>Latest generated invoices across the platform.</CardDescription>
          </div>
          <Button asChild variant="outline" className="rounded-full">
            <Link href="/master/billing/invoices">
              <FileText className="size-4" />
              Manage All
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {(data?.recentInvoices || []).length ? (
            data?.recentInvoices.map((invoice) => (
              <Link key={invoice.id} href={`/master/billing/invoices/${invoice.id}`} className="grid gap-3 rounded-2xl border bg-background/60 p-4 transition-colors hover:bg-muted/60 md:grid-cols-[1fr_auto_auto] md:items-center">
                <div>
                  <p className="font-semibold">{invoice.school}</p>
                  <p className="text-sm text-muted-foreground">{invoice.invoiceNumber} - {invoice.plan}</p>
                </div>
                <StatusPill status={invoice.status} text={invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)} />
                <div className="font-semibold">{money(invoice.amount, invoice.currency)}</div>
              </Link>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed p-8 text-center text-muted-foreground">No invoices have been generated yet.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
