"use client";

import * as React from "react";
import { useParams, usePathname, useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  Banknote,
  CheckCircle2,
  Clock3,
  CreditCard,
  FilePlus2,
  Receipt,
  RefreshCw,
  Search,
  ShieldCheck,
  TrendingUp,
  Users,
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
import { getTenantSubdomain, resolveTenantSlug } from "@/lib/tenant-routing";
import { cn } from "@/lib/utils";

type StaffOption = {
  id: string;
  userId: string;
  name: string;
  email: string;
  roleId: string;
  departmentId: string | null;
  departmentName: string;
  employeeId: string;
  position: string;
  salary: number;
  active: boolean;
};

type PayrollRecord = {
  id: string;
  staffId: string;
  staffName: string;
  staffEmail: string;
  staffRole: string;
  staffPosition: string;
  departmentName: string;
  period: string;
  month: string;
  basicSalary: number;
  allowances: number;
  deductions: number;
  grossSalary: number;
  netSalary: number;
  status: "pending" | "approved" | "paid" | "cancelled" | string;
  paymentDate: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

type PayrollPayload = {
  school: { name: string; slug: string; type: string; currencyCode?: string | null };
  generatedAt: string;
  staff: StaffOption[];
  payroll: PayrollRecord[];
  departments: Array<{ id: string; name: string; headId: string | null }>;
  analytics: {
    byStatus: Array<{ name: string; records: number; amount: number }>;
    byDepartment: Array<{ name: string; records: number; gross: number; net: number; pending: number; approved: number; paid: number; cancelled: number }>;
    byMonth: Array<{ name: string; gross: number; net: number; records: number }>;
  };
  summary: {
    records: number;
    activeStaff: number;
    grossPayroll: number;
    netPayroll: number;
    pendingPayroll: number;
    approvedPayroll: number;
    paidPayroll: number;
    totalDeductions: number;
    totalAllowances: number;
    pendingRecords: number;
    approvedRecords: number;
    paidRecords: number;
    cancelledRecords: number;
    payoutCompletion: number;
  };
};

const STATUS_META: Record<string, { label: string; className: string; icon: React.ElementType }> = {
  pending: { label: "Pending", className: "border-primary/30 bg-primary/10 text-primary", icon: Clock3 },
  approved: { label: "Approved", className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300", icon: CheckCircle2 },
  paid: { label: "Paid", className: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300", icon: CreditCard },
  cancelled: { label: "Cancelled", className: "border-muted-foreground/20 bg-muted text-muted-foreground", icon: XCircle },
};

const PERIODS = [
  { value: "monthly", label: "Monthly" },
  { value: "bi-weekly", label: "Bi-weekly" },
  { value: "weekly", label: "Weekly" },
  { value: "contract", label: "Contract" },
  { value: "bonus", label: "Bonus" },
];

const CHART_COLORS = ["hsl(var(--primary))", "hsl(146 66% 36%)", "hsl(199 89% 48%)", "hsl(215 16% 47%)"];

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
  const meta = STATUS_META[status] || STATUS_META.pending;
  const Icon = meta.icon;
  return (
    <Badge variant="outline" className={cn("gap-1 rounded-full px-2.5 py-1 capitalize", meta.className)}>
      <Icon className="h-3.5 w-3.5" />
      {meta.label}
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

const defaultForm = {
  staffId: "",
  period: "monthly",
  month: new Date().toISOString().slice(0, 7),
  basicSalary: "",
  allowances: "0",
  deductions: "0",
  status: "pending",
};

export default function OwnerPayrollPage() {
  const params = useParams<{ tenant: string }>();
  const pathname = usePathname();
  const router = useRouter();
  const paramTenantSlug = String(params?.tenant || "");
  const tenantSlug = paramTenantSlug && pathname?.startsWith(`/${paramTenantSlug}/`) ? paramTenantSlug : (typeof window !== "undefined" ? resolveTenantSlug(pathname, window.location.host) || "" : paramTenantSlug);
  const [data, setData] = React.useState<PayrollPayload | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [query, setQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [departmentFilter, setDepartmentFilter] = React.useState("all");
  const [monthFilter, setMonthFilter] = React.useState("all");
  const [updatingId, setUpdatingId] = React.useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [creating, setCreating] = React.useState(false);
  const [form, setForm] = React.useState(defaultForm);

  const currency = React.useMemo(
    () =>
      new Intl.NumberFormat("en", {
        style: "currency",
        currency: data?.school.currencyCode || "ZAR",
        maximumFractionDigits: 0,
      }),
    [data?.school.currencyCode]
  );

  const tenantHref = React.useCallback(
    (path: string) => {
      if (typeof window !== "undefined" && getTenantSubdomain(window.location.host)) return path;
      return `/${tenantSlug}${path}`;
    },
    [tenantSlug]
  );

  const loadPayroll = React.useCallback(
    async (quiet = false) => {
      if (!tenantSlug) return;
      setError(null);
      if (quiet) setRefreshing(true);
      else setLoading(true);

      try {
        const response = await fetch(`/api/tenant/owner/payroll?tenant=${tenantSlug}`, {
          credentials: "include",
          cache: "no-store",
        });
        const payload = await response.json().catch(() => null);
        if (!response.ok) throw new Error(payload?.error || "Failed to load owner payroll data");
        setData(payload as PayrollPayload);
      } catch (nextError) {
        const message = nextError instanceof Error ? nextError.message : "Failed to load owner payroll data";
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
    void loadPayroll();
  }, [loadPayroll]);

  const selectedStaff = React.useMemo(() => data?.staff.find((member) => member.id === form.staffId), [data?.staff, form.staffId]);

  React.useEffect(() => {
    if (!selectedStaff || form.basicSalary) return;
    if (selectedStaff.salary > 0) setForm((current) => ({ ...current, basicSalary: String(selectedStaff.salary) }));
  }, [form.basicSalary, selectedStaff]);

  const filteredPayroll = React.useMemo(() => {
    const term = query.trim().toLowerCase();
    return (data?.payroll || []).filter((record) => {
      const matchesTerm =
        !term ||
        [record.staffName, record.staffEmail, record.staffPosition, record.departmentName, record.month, record.period]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(term));
      const matchesStatus = statusFilter === "all" || record.status === statusFilter;
      const matchesDepartment = departmentFilter === "all" || record.departmentName === departmentFilter;
      const matchesMonth = monthFilter === "all" || record.month === monthFilter;
      return matchesTerm && matchesStatus && matchesDepartment && matchesMonth;
    });
  }, [data?.payroll, departmentFilter, monthFilter, query, statusFilter]);

  const updatePayroll = async (id: string, status: "approved" | "paid" | "cancelled") => {
    setUpdatingId(id);
    try {
      const response = await fetch(`/api/tenant/owner/payroll?tenant=${tenantSlug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id, status }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || "Failed to update payroll status");
      toast.success(`Payroll ${status}`);
      await loadPayroll(true);
    } catch (nextError) {
      toast.error(nextError instanceof Error ? nextError.message : "Failed to update payroll status");
    } finally {
      setUpdatingId(null);
    }
  };

  const createPayroll = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreating(true);
    try {
      const response = await fetch(`/api/tenant/owner/payroll?tenant=${tenantSlug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...form,
          basicSalary: Number(form.basicSalary || 0),
          allowances: Number(form.allowances || 0),
          deductions: Number(form.deductions || 0),
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || "Failed to create payroll record");
      toast.success("Payroll record created");
      setDialogOpen(false);
      setForm(defaultForm);
      await loadPayroll(true);
    } catch (nextError) {
      toast.error(nextError instanceof Error ? nextError.message : "Failed to create payroll record");
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Card className="overflow-hidden border-border/70 bg-card/80 shadow-sm backdrop-blur">
          <CardContent className="p-6 md:p-8">
            <Badge className="mb-3 rounded-full bg-primary/10 text-primary hover:bg-primary/10">Owner payroll command</Badge>
            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Payroll</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">Loading payroll records, payout exposure, staff compensation, and approval workflow state.</p>
          </CardContent>
        </Card>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-32 rounded-3xl" />
          ))}
        </div>
        <Skeleton className="h-96 rounded-3xl" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <Alert variant="destructive" className="rounded-3xl">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Payroll data failed to load</AlertTitle>
        <AlertDescription className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span>{error || "No payroll data was returned for this tenant."}</span>
          <Button variant="secondary" size="sm" onClick={() => void loadPayroll()}>
            Retry
          </Button>
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
                <Badge className="mb-3 rounded-full bg-primary/10 text-primary hover:bg-primary/10">Owner finance governance</Badge>
                <h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">Payroll Oversight</h1>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Review payroll exposure, approve salary runs, mark payouts as paid, and monitor department payroll risk across {data.school.name}.
                </p>
                <p className="mt-3 text-xs text-muted-foreground">Last refreshed {formatDate(data.generatedAt)}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => router.push(tenantHref("/owner/hr"))}>
                  HR dashboard
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button variant="outline" onClick={() => router.push(tenantHref("/owner/finance"))}>
                  Finance overview
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <FilePlus2 className="mr-2 h-4 w-4" />
                      New payroll
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
                    <form onSubmit={createPayroll} className="space-y-5">
                      <DialogHeader>
                        <DialogTitle>Create payroll record</DialogTitle>
                        <DialogDescription>Create an owner-authorized payroll record using real staff records and tenant currency.</DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2 md:col-span-2">
                          <Label>Staff member</Label>
                          <Select value={form.staffId} onValueChange={(value) => setForm((current) => ({ ...current, staffId: value, basicSalary: "" }))}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select staff member" />
                            </SelectTrigger>
                            <SelectContent>
                              {data.staff.map((member) => (
                                <SelectItem key={member.id} value={member.id}>
                                  {member.name} • {member.position} • {currency.format(member.salary)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Payroll month</Label>
                          <Input type="month" value={form.month} onChange={(event) => setForm((current) => ({ ...current, month: event.target.value }))} />
                        </div>
                        <div className="space-y-2">
                          <Label>Period</Label>
                          <Select value={form.period} onValueChange={(value) => setForm((current) => ({ ...current, period: value }))}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {PERIODS.map((period) => (
                                <SelectItem key={period.value} value={period.value}>
                                  {period.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Basic salary</Label>
                          <Input type="number" min="0" step="0.01" value={form.basicSalary} onChange={(event) => setForm((current) => ({ ...current, basicSalary: event.target.value }))} />
                        </div>
                        <div className="space-y-2">
                          <Label>Allowances</Label>
                          <Input type="number" min="0" step="0.01" value={form.allowances} onChange={(event) => setForm((current) => ({ ...current, allowances: event.target.value }))} />
                        </div>
                        <div className="space-y-2">
                          <Label>Deductions</Label>
                          <Input type="number" min="0" step="0.01" value={form.deductions} onChange={(event) => setForm((current) => ({ ...current, deductions: event.target.value }))} />
                        </div>
                        <div className="space-y-2">
                          <Label>Status</Label>
                          <Select value={form.status} onValueChange={(value) => setForm((current) => ({ ...current, status: value }))}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">Pending approval</SelectItem>
                              <SelectItem value="approved">Approved</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <Card className="bg-muted/30">
                        <CardContent className="grid gap-3 p-4 text-sm md:grid-cols-3">
                          <div>
                            <p className="text-muted-foreground">Gross</p>
                            <p className="font-semibold">{currency.format(Number(form.basicSalary || 0) + Number(form.allowances || 0))}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Deductions</p>
                            <p className="font-semibold">{currency.format(Number(form.deductions || 0))}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Net</p>
                            <p className="font-semibold">{currency.format(Math.max(0, Number(form.basicSalary || 0) + Number(form.allowances || 0) - Number(form.deductions || 0)))}</p>
                          </div>
                        </CardContent>
                      </Card>
                      <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button type="submit" disabled={creating}>
                          {creating ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
                          Create payroll
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
                <Button variant="outline" onClick={() => void loadPayroll(true)} disabled={refreshing}>
                  <RefreshCw className={cn("mr-2 h-4 w-4", refreshing && "animate-spin")} />
                  Refresh
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Net payroll" value={currency.format(data.summary.netPayroll)} detail={`${data.summary.records} payroll records`} icon={Banknote} />
        <StatCard label="Pending approval" value={currency.format(data.summary.pendingPayroll)} detail={`${data.summary.pendingRecords} pending records`} icon={Clock3} />
        <StatCard label="Approved unpaid" value={currency.format(data.summary.approvedPayroll)} detail={`${data.summary.approvedRecords} records ready for payout`} icon={CheckCircle2} />
        <StatCard label="Paid out" value={currency.format(data.summary.paidPayroll)} detail={`${data.summary.payoutCompletion}% payout completion`} icon={CreditCard} />
      </div>

      <Tabs defaultValue="overview" className="space-y-5">
        <TabsList className="mx-auto flex h-auto w-fit flex-wrap justify-center rounded-full bg-muted/70 p-1">
          <TabsTrigger value="overview" className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            Overview
          </TabsTrigger>
          <TabsTrigger value="records" className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            Records
          </TabsTrigger>
          <TabsTrigger value="approvals" className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            Approvals
          </TabsTrigger>
          <TabsTrigger value="departments" className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            Departments
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-5">
          <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
            <Card className="border-border/70 bg-card/80 shadow-sm backdrop-blur">
              <CardHeader>
                <CardTitle>Payroll Trend</CardTitle>
                <CardDescription>Gross and net payroll by payroll month.</CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                {data.analytics.byMonth.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.analytics.byMonth}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="name" tickLine={false} axisLine={false} className="text-xs" />
                      <YAxis tickLine={false} axisLine={false} className="text-xs" />
                      <Tooltip cursor={{ fill: "hsl(var(--muted))" }} formatter={(value) => currency.format(Number(value || 0))} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12 }} />
                      <Bar dataKey="gross" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
                      <Bar dataKey="net" fill="hsl(146 66% 36%)" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center rounded-2xl border border-dashed text-sm text-muted-foreground">No payroll trend data yet.</div>
                )}
              </CardContent>
            </Card>

            <Card className="border-border/70 bg-card/80 shadow-sm backdrop-blur">
              <CardHeader>
                <CardTitle>Status Mix</CardTitle>
                <CardDescription>Payroll value by workflow state.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="h-56">
                  {data.analytics.byStatus.length ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={data.analytics.byStatus} dataKey="amount" nameKey="name" innerRadius={58} outerRadius={92} paddingAngle={3}>
                          {data.analytics.byStatus.map((entry, index) => (
                            <Cell key={entry.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => currency.format(Number(value || 0))} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-full items-center justify-center rounded-2xl border border-dashed text-sm text-muted-foreground">No payroll records yet.</div>
                  )}
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Payout completion</span>
                    <span className="font-medium">{data.summary.payoutCompletion}%</span>
                  </div>
                  <Progress value={data.summary.payoutCompletion} />
                  <p className="text-xs text-muted-foreground">Completion is calculated from paid net payroll over total net payroll.</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <StatCard label="Gross payroll" value={currency.format(data.summary.grossPayroll)} detail="Before deductions" icon={Receipt} />
            <StatCard label="Allowances" value={currency.format(data.summary.totalAllowances)} detail="Additional compensation" icon={TrendingUp} />
            <StatCard label="Deductions" value={currency.format(data.summary.totalDeductions)} detail="Total payroll deductions" icon={XCircle} />
          </div>
        </TabsContent>

        <TabsContent value="records" className="space-y-5">
          <Card className="border-border/70 bg-card/80 shadow-sm backdrop-blur">
            <CardContent className="grid gap-3 p-4 md:grid-cols-[1fr_170px_220px_170px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search staff, department, month..." className="pl-9" />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All departments</SelectItem>
                  {Array.from(new Set(data.payroll.map((record) => record.departmentName))).map((department) => (
                    <SelectItem key={department} value={department}>
                      {department}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={monthFilter} onValueChange={setMonthFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All months</SelectItem>
                  {Array.from(new Set(data.payroll.map((record) => record.month))).map((month) => (
                    <SelectItem key={month} value={month}>
                      {month}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <div className="grid gap-4 xl:grid-cols-2">
            {filteredPayroll.map((record) => (
              <Card key={record.id} className="border-border/70 bg-card/80 shadow-sm backdrop-blur">
                <CardContent className="p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex min-w-0 gap-3">
                      <Avatar className="h-11 w-11 border border-border">
                        <AvatarFallback className="bg-primary/10 text-primary">{initials(record.staffName)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <h3 className="truncate font-semibold text-foreground">{record.staffName}</h3>
                        <p className="truncate text-sm text-muted-foreground">{record.staffPosition || record.staffRole || "Staff"} • {record.departmentName}</p>
                        <p className="mt-2 text-sm text-foreground">
                          {record.month} • {record.period} • Net {currency.format(record.netSalary)}
                        </p>
                      </div>
                    </div>
                    {statusBadge(record.status)}
                  </div>
                  <div className="mt-4 grid gap-2 rounded-2xl border bg-muted/25 p-3 text-sm sm:grid-cols-4">
                    <div>
                      <p className="text-muted-foreground">Basic</p>
                      <p className="font-semibold">{currency.format(record.basicSalary)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Allowances</p>
                      <p className="font-semibold">{currency.format(record.allowances)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Deductions</p>
                      <p className="font-semibold">{currency.format(record.deductions)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Gross</p>
                      <p className="font-semibold">{currency.format(record.grossSalary)}</p>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap justify-end gap-2">
                    {record.status === "pending" ? (
                      <>
                        <Button variant="outline" size="sm" disabled={updatingId === record.id} onClick={() => void updatePayroll(record.id, "cancelled")}>
                          Cancel
                        </Button>
                        <Button size="sm" disabled={updatingId === record.id} onClick={() => void updatePayroll(record.id, "approved")}>
                          {updatingId === record.id ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                          Approve
                        </Button>
                      </>
                    ) : record.status === "approved" ? (
                      <>
                        <Button variant="outline" size="sm" disabled={updatingId === record.id} onClick={() => void updatePayroll(record.id, "cancelled")}>
                          Cancel
                        </Button>
                        <Button size="sm" disabled={updatingId === record.id} onClick={() => void updatePayroll(record.id, "paid")}>
                          {updatingId === record.id ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <CreditCard className="mr-2 h-4 w-4" />}
                          Mark paid
                        </Button>
                      </>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {!filteredPayroll.length ? (
            <Card className="border-dashed bg-card/60">
              <CardContent className="flex min-h-44 flex-col items-center justify-center p-6 text-center">
                <Banknote className="mb-3 h-9 w-9 text-muted-foreground" />
                <p className="font-medium text-foreground">No payroll records matched your filters</p>
                <p className="mt-1 text-sm text-muted-foreground">Adjust filters or create the first payroll record for this school.</p>
              </CardContent>
            </Card>
          ) : null}
        </TabsContent>

        <TabsContent value="approvals" className="space-y-4">
          {data.payroll.filter((record) => record.status === "pending" || record.status === "approved").map((record) => (
            <Card key={record.id} className="border-border/70 bg-card/80 shadow-sm backdrop-blur">
              <CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-foreground">{record.staffName}</h3>
                    {statusBadge(record.status)}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{record.staffPosition || "Staff"} • {record.departmentName} • {record.month}</p>
                  <p className="mt-2 text-sm text-foreground">Net payout {currency.format(record.netSalary)} from gross {currency.format(record.grossSalary)}</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" disabled={updatingId === record.id} onClick={() => void updatePayroll(record.id, "cancelled")}>
                    Cancel
                  </Button>
                  {record.status === "pending" ? (
                    <Button disabled={updatingId === record.id} onClick={() => void updatePayroll(record.id, "approved")}>
                      {updatingId === record.id ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
                      Approve
                    </Button>
                  ) : (
                    <Button disabled={updatingId === record.id} onClick={() => void updatePayroll(record.id, "paid")}>
                      {updatingId === record.id ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <CreditCard className="mr-2 h-4 w-4" />}
                      Mark paid
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}

          {!data.payroll.some((record) => record.status === "pending" || record.status === "approved") ? (
            <Card className="border-dashed bg-card/60">
              <CardContent className="flex min-h-56 flex-col items-center justify-center p-6 text-center">
                <CreditCard className="mb-3 h-9 w-9 text-primary" />
                <p className="font-medium text-foreground">No payroll approvals pending</p>
                <p className="mt-1 max-w-md text-sm text-muted-foreground">Pending and approved payroll records will appear here for owner action.</p>
              </CardContent>
            </Card>
          ) : null}
        </TabsContent>

        <TabsContent value="departments" className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.analytics.byDepartment.map((department) => (
            <Card key={department.name} className="border-border/70 bg-card/80 shadow-sm backdrop-blur">
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-base">{department.name}</CardTitle>
                    <CardDescription>{department.records} payroll record(s)</CardDescription>
                  </div>
                  <div className="rounded-2xl bg-primary/10 p-2 text-primary">
                    <Users className="h-5 w-5" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Paid share</span>
                    <span className="font-medium">{department.net ? Math.round((department.paid / department.records) * 100) : 0}%</span>
                  </div>
                  <Progress value={department.records ? (department.paid / department.records) * 100 : 0} />
                </div>
                <div className="rounded-2xl bg-muted/30 p-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Net exposure</span>
                    <span className="font-semibold">{currency.format(department.net)}</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                    <span>Gross {currency.format(department.gross)}</span>
                    <span>{department.pending} pending</span>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-2 text-center text-xs">
                  <div className="rounded-2xl bg-primary/10 p-3 text-primary">
                    <p className="text-lg font-semibold">{department.pending}</p>
                    <p>Pending</p>
                  </div>
                  <div className="rounded-2xl bg-emerald-500/10 p-3 text-emerald-700 dark:text-emerald-300">
                    <p className="text-lg font-semibold">{department.approved}</p>
                    <p>Approved</p>
                  </div>
                  <div className="rounded-2xl bg-sky-500/10 p-3 text-sky-700 dark:text-sky-300">
                    <p className="text-lg font-semibold">{department.paid}</p>
                    <p>Paid</p>
                  </div>
                  <div className="rounded-2xl bg-muted p-3 text-muted-foreground">
                    <p className="text-lg font-semibold">{department.cancelled}</p>
                    <p>Cancelled</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {!data.analytics.byDepartment.length ? (
            <Card className="border-dashed bg-card/60 md:col-span-2 xl:col-span-3">
              <CardContent className="flex min-h-48 flex-col items-center justify-center p-6 text-center">
                <Users className="mb-3 h-9 w-9 text-muted-foreground" />
                <p className="font-medium text-foreground">No department payroll data yet</p>
                <p className="mt-1 text-sm text-muted-foreground">Payroll records will unlock department-level payroll exposure tracking.</p>
              </CardContent>
            </Card>
          ) : null}
        </TabsContent>
      </Tabs>
    </div>
  );
}
