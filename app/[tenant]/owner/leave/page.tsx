"use client";

import * as React from "react";
import { useParams, usePathname, useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  Clock3,
  ClipboardList,
  FilePlus2,
  RefreshCw,
  Search,
  ShieldCheck,
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
import { Textarea } from "@/components/ui/textarea";
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
  active: boolean;
};

type LeaveRecord = {
  id: string;
  staffId: string;
  staffName: string;
  staffEmail: string;
  staffRole: string;
  staffPosition: string;
  departmentName: string;
  leaveType: string;
  startDate: string | null;
  endDate: string | null;
  days: number;
  reason: string;
  approvedBy: string | null;
  approverName: string;
  status: "pending" | "approved" | "rejected" | "cancelled" | string;
  remarks: string;
  createdAt: string | null;
  updatedAt: string | null;
};

type LeavePayload = {
  school: { name: string; slug: string; type: string };
  generatedAt: string;
  staff: StaffOption[];
  leave: LeaveRecord[];
  departments: Array<{ id: string; name: string; headId: string | null }>;
  analytics: {
    byStatus: Array<{ name: string; value: number; days: number }>;
    byType: Array<{ name: string; value: number; days: number }>;
    byDepartment: Array<{ name: string; total: number; pending: number; approved: number; rejected: number; cancelled: number; days: number }>;
    byMonth: Array<{ name: string; requests: number; days: number }>;
  };
  summary: {
    totalRequests: number;
    pending: number;
    approved: number;
    rejected: number;
    cancelled: number;
    approvedDays: number;
    pendingDays: number;
    approvalRate: number;
    activeStaff: number;
  };
};

const LEAVE_TYPES = [
  { value: "annual", label: "Annual leave" },
  { value: "sick", label: "Sick leave" },
  { value: "maternity", label: "Maternity leave" },
  { value: "paternity", label: "Paternity leave" },
  { value: "compassionate", label: "Compassionate leave" },
  { value: "study", label: "Study leave" },
  { value: "unpaid", label: "Unpaid leave" },
  { value: "other", label: "Other leave" },
];

const STATUS_META: Record<string, { label: string; className: string; icon: React.ElementType }> = {
  pending: { label: "Pending", className: "border-primary/30 bg-primary/10 text-primary", icon: Clock3 },
  approved: { label: "Approved", className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300", icon: CheckCircle2 },
  rejected: { label: "Rejected", className: "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300", icon: XCircle },
  cancelled: { label: "Cancelled", className: "border-muted-foreground/20 bg-muted text-muted-foreground", icon: XCircle },
};

const CHART_COLORS = ["hsl(var(--primary))", "hsl(146 66% 36%)", "hsl(346 77% 49%)", "hsl(215 16% 47%)"];

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

function typeLabel(value: string) {
  return LEAVE_TYPES.find((type) => type.value === value)?.label || value.replace(/_/g, " ");
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
  leaveType: "annual",
  startDate: "",
  endDate: "",
  reason: "",
  status: "pending",
  remarks: "",
};

export default function OwnerLeavePage() {
  const params = useParams<{ tenant: string }>();
  const pathname = usePathname();
  const router = useRouter();
  const paramTenantSlug = String(params?.tenant || "");
  const tenantSlug = paramTenantSlug && pathname?.startsWith(`/${paramTenantSlug}/`) ? paramTenantSlug : (typeof window !== "undefined" ? resolveTenantSlug(pathname, window.location.host) || "" : paramTenantSlug);
  const [data, setData] = React.useState<LeavePayload | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [query, setQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [typeFilter, setTypeFilter] = React.useState("all");
  const [departmentFilter, setDepartmentFilter] = React.useState("all");
  const [updatingId, setUpdatingId] = React.useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [creating, setCreating] = React.useState(false);
  const [form, setForm] = React.useState(defaultForm);

  const tenantHref = React.useCallback(
    (path: string) => {
      if (typeof window !== "undefined" && getTenantSubdomain(window.location.host)) return path;
      return `/${tenantSlug}${path}`;
    },
    [tenantSlug]
  );

  const loadLeave = React.useCallback(
    async (quiet = false) => {
      if (!tenantSlug) return;
      setError(null);
      if (quiet) setRefreshing(true);
      else setLoading(true);

      try {
        const response = await fetch(`/api/tenant/owner/leave?tenant=${tenantSlug}`, {
          credentials: "include",
          cache: "no-store",
        });
        const payload = await response.json().catch(() => null);
        if (!response.ok) throw new Error(payload?.error || "Failed to load owner leave data");
        setData(payload as LeavePayload);
      } catch (nextError) {
        const message = nextError instanceof Error ? nextError.message : "Failed to load owner leave data";
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
    void loadLeave();
  }, [loadLeave]);

  const filteredLeave = React.useMemo(() => {
    const term = query.trim().toLowerCase();
    return (data?.leave || []).filter((record) => {
      const matchesTerm =
        !term ||
        [record.staffName, record.staffEmail, record.staffPosition, record.departmentName, record.leaveType, record.reason, record.remarks]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(term));
      const matchesStatus = statusFilter === "all" || record.status === statusFilter;
      const matchesType = typeFilter === "all" || record.leaveType === typeFilter;
      const matchesDepartment = departmentFilter === "all" || record.departmentName === departmentFilter;
      return matchesTerm && matchesStatus && matchesType && matchesDepartment;
    });
  }, [data?.leave, departmentFilter, query, statusFilter, typeFilter]);

  const pendingLeave = React.useMemo(() => (data?.leave || []).filter((record) => record.status === "pending"), [data?.leave]);

  const updateLeave = async (id: string, status: "approved" | "rejected" | "cancelled") => {
    setUpdatingId(id);
    try {
      const response = await fetch(`/api/tenant/owner/leave?tenant=${tenantSlug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id, status }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || "Failed to update leave status");
      toast.success(`Leave ${status}`);
      await loadLeave(true);
    } catch (nextError) {
      toast.error(nextError instanceof Error ? nextError.message : "Failed to update leave status");
    } finally {
      setUpdatingId(null);
    }
  };

  const createLeave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreating(true);
    try {
      const response = await fetch(`/api/tenant/owner/leave?tenant=${tenantSlug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(form),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || "Failed to create leave record");
      toast.success("Leave record created");
      setDialogOpen(false);
      setForm(defaultForm);
      await loadLeave(true);
    } catch (nextError) {
      toast.error(nextError instanceof Error ? nextError.message : "Failed to create leave record");
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Card className="overflow-hidden border-border/70 bg-card/80 shadow-sm backdrop-blur">
          <CardContent className="p-6 md:p-8">
            <Badge className="mb-3 rounded-full bg-primary/10 text-primary hover:bg-primary/10">Owner leave command</Badge>
            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Leave Management</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">Loading leave requests, approvals, staff availability, and department leave analytics.</p>
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
        <AlertTitle>Leave data failed to load</AlertTitle>
        <AlertDescription className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span>{error || "No leave data was returned for this tenant."}</span>
          <Button variant="secondary" size="sm" onClick={() => void loadLeave()}>
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
                <Badge className="mb-3 rounded-full bg-primary/10 text-primary hover:bg-primary/10">Owner HR governance</Badge>
                <h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">Leave Management</h1>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Review leave pressure, approve staff requests, create owner-authorized leave records, and monitor coverage risk across {data.school.name}.
                </p>
                <p className="mt-3 text-xs text-muted-foreground">Last refreshed {formatDate(data.generatedAt)}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => router.push(tenantHref("/owner/staff-attendance"))}>
                  Attendance view
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button variant="outline" onClick={() => router.push(tenantHref("/owner/hr"))}>
                  HR dashboard
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <FilePlus2 className="mr-2 h-4 w-4" />
                      New leave
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
                    <form onSubmit={createLeave} className="space-y-5">
                      <DialogHeader>
                        <DialogTitle>Create leave record</DialogTitle>
                        <DialogDescription>Create an owner-authorized leave record using real staff records from this tenant.</DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2 md:col-span-2">
                          <Label>Staff member</Label>
                          <Select value={form.staffId} onValueChange={(value) => setForm((current) => ({ ...current, staffId: value }))}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select staff member" />
                            </SelectTrigger>
                            <SelectContent>
                              {data.staff.map((member) => (
                                <SelectItem key={member.id} value={member.id}>
                                  {member.name} • {member.position}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Leave type</Label>
                          <Select value={form.leaveType} onValueChange={(value) => setForm((current) => ({ ...current, leaveType: value }))}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {LEAVE_TYPES.map((type) => (
                                <SelectItem key={type.value} value={type.value}>
                                  {type.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Status</Label>
                          <Select value={form.status} onValueChange={(value) => setForm((current) => ({ ...current, status: value }))}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">Pending review</SelectItem>
                              <SelectItem value="approved">Approved immediately</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Start date</Label>
                          <Input type="date" value={form.startDate} onChange={(event) => setForm((current) => ({ ...current, startDate: event.target.value }))} />
                        </div>
                        <div className="space-y-2">
                          <Label>End date</Label>
                          <Input type="date" value={form.endDate} onChange={(event) => setForm((current) => ({ ...current, endDate: event.target.value }))} />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <Label>Reason</Label>
                          <Textarea value={form.reason} onChange={(event) => setForm((current) => ({ ...current, reason: event.target.value }))} placeholder="Reason for leave..." />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <Label>Owner remarks</Label>
                          <Textarea value={form.remarks} onChange={(event) => setForm((current) => ({ ...current, remarks: event.target.value }))} placeholder="Optional internal remarks..." />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button type="submit" disabled={creating}>
                          {creating ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
                          Create leave
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
                <Button variant="outline" onClick={() => void loadLeave(true)} disabled={refreshing}>
                  <RefreshCw className={cn("mr-2 h-4 w-4", refreshing && "animate-spin")} />
                  Refresh
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total requests" value={data.summary.totalRequests} detail={`${data.summary.activeStaff} active staff tracked`} icon={ClipboardList} />
        <StatCard label="Pending review" value={data.summary.pending} detail={`${data.summary.pendingDays} pending leave days`} icon={Clock3} />
        <StatCard label="Approved leave" value={data.summary.approved} detail={`${data.summary.approvedDays} approved days`} icon={CheckCircle2} />
        <StatCard label="Approval rate" value={`${data.summary.approvalRate}%`} detail={`${data.summary.rejected} rejected • ${data.summary.cancelled} cancelled`} icon={ShieldCheck} />
      </div>

      <Tabs defaultValue="overview" className="space-y-5">
        <TabsList className="mx-auto flex h-auto w-fit flex-wrap justify-center rounded-full bg-muted/70 p-1">
          <TabsTrigger value="overview" className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            Overview
          </TabsTrigger>
          <TabsTrigger value="requests" className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            Requests
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
                <CardTitle>Leave Trend</CardTitle>
                <CardDescription>Recent request volume and requested days by leave start month.</CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                {data.analytics.byMonth.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.analytics.byMonth}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="name" tickLine={false} axisLine={false} className="text-xs" />
                      <YAxis allowDecimals={false} tickLine={false} axisLine={false} className="text-xs" />
                      <Tooltip cursor={{ fill: "hsl(var(--muted))" }} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12 }} />
                      <Bar dataKey="requests" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
                      <Bar dataKey="days" fill="hsl(146 66% 36%)" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center rounded-2xl border border-dashed text-sm text-muted-foreground">No leave trend data yet.</div>
                )}
              </CardContent>
            </Card>

            <Card className="border-border/70 bg-card/80 shadow-sm backdrop-blur">
              <CardHeader>
                <CardTitle>Status Mix</CardTitle>
                <CardDescription>Current decision state across leave requests.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="h-56">
                  {data.analytics.byStatus.length ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={data.analytics.byStatus} dataKey="value" nameKey="name" innerRadius={58} outerRadius={92} paddingAngle={3}>
                          {data.analytics.byStatus.map((entry, index) => (
                            <Cell key={entry.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-full items-center justify-center rounded-2xl border border-dashed text-sm text-muted-foreground">No leave records yet.</div>
                  )}
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Decision completion</span>
                    <span className="font-medium">{data.summary.totalRequests ? Math.round(((data.summary.totalRequests - data.summary.pending) / data.summary.totalRequests) * 100) : 0}%</span>
                  </div>
                  <Progress value={data.summary.totalRequests ? ((data.summary.totalRequests - data.summary.pending) / data.summary.totalRequests) * 100 : 0} />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {data.analytics.byType.slice(0, 4).map((item) => (
              <Card key={item.name} className="border-border/70 bg-card/80 shadow-sm backdrop-blur">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm text-muted-foreground">{typeLabel(item.name)}</p>
                      <p className="mt-1 text-2xl font-semibold">{item.value}</p>
                    </div>
                    <div className="rounded-2xl bg-primary/10 p-3 text-primary">
                      <CalendarDays className="h-5 w-5" />
                    </div>
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">{item.days} requested day(s)</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="requests" className="space-y-5">
          <Card className="border-border/70 bg-card/80 shadow-sm backdrop-blur">
            <CardContent className="grid gap-3 p-4 md:grid-cols-[1fr_170px_190px_220px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search staff, type, reason..." className="pl-9" />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All leave types</SelectItem>
                  {LEAVE_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All departments</SelectItem>
                  {Array.from(new Set(data.leave.map((record) => record.departmentName))).map((department) => (
                    <SelectItem key={department} value={department}>
                      {department}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <div className="grid gap-4 xl:grid-cols-2">
            {filteredLeave.map((record) => (
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
                          {typeLabel(record.leaveType)} • {record.days} day(s) • {formatDate(record.startDate)} - {formatDate(record.endDate)}
                        </p>
                      </div>
                    </div>
                    {statusBadge(record.status)}
                  </div>
                  <div className="mt-4 rounded-2xl border bg-muted/25 p-3 text-sm">
                    <p className="text-muted-foreground">{record.reason || "No reason provided."}</p>
                    {record.remarks ? <p className="mt-2 text-xs text-foreground">Remarks: {record.remarks}</p> : null}
                    {record.approverName ? <p className="mt-2 text-xs text-muted-foreground">Approved by {record.approverName}</p> : null}
                  </div>
                  {record.status === "pending" ? (
                    <div className="mt-4 flex flex-wrap justify-end gap-2">
                      <Button variant="outline" size="sm" disabled={updatingId === record.id} onClick={() => void updateLeave(record.id, "rejected")}>
                        Reject
                      </Button>
                      <Button size="sm" disabled={updatingId === record.id} onClick={() => void updateLeave(record.id, "approved")}>
                        {updatingId === record.id ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                        Approve
                      </Button>
                    </div>
                  ) : record.status === "approved" ? (
                    <div className="mt-4 flex justify-end">
                      <Button variant="outline" size="sm" disabled={updatingId === record.id} onClick={() => void updateLeave(record.id, "cancelled")}>
                        Cancel leave
                      </Button>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            ))}
          </div>

          {!filteredLeave.length ? (
            <Card className="border-dashed bg-card/60">
              <CardContent className="flex min-h-44 flex-col items-center justify-center p-6 text-center">
                <ClipboardList className="mb-3 h-9 w-9 text-muted-foreground" />
                <p className="font-medium text-foreground">No leave requests matched your filters</p>
                <p className="mt-1 text-sm text-muted-foreground">Adjust the filters or create the first leave record for this school.</p>
              </CardContent>
            </Card>
          ) : null}
        </TabsContent>

        <TabsContent value="approvals" className="space-y-4">
          {pendingLeave.map((record) => (
            <Card key={record.id} className="border-border/70 bg-card/80 shadow-sm backdrop-blur">
              <CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-foreground">{record.staffName}</h3>
                    {statusBadge(record.status)}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{record.staffPosition || "Staff"} • {record.departmentName} • Requested {formatDate(record.createdAt)}</p>
                  <p className="mt-2 text-sm text-foreground">
                    {typeLabel(record.leaveType)} for {record.days} day(s), {formatDate(record.startDate)} - {formatDate(record.endDate)}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">{record.reason || "No reason provided."}</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" disabled={updatingId === record.id} onClick={() => void updateLeave(record.id, "rejected")}>
                    Reject
                  </Button>
                  <Button disabled={updatingId === record.id} onClick={() => void updateLeave(record.id, "approved")}>
                    {updatingId === record.id ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
                    Approve
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          {!pendingLeave.length ? (
            <Card className="border-dashed bg-card/60">
              <CardContent className="flex min-h-56 flex-col items-center justify-center p-6 text-center">
                <CalendarClock className="mb-3 h-9 w-9 text-primary" />
                <p className="font-medium text-foreground">No pending leave approvals</p>
                <p className="mt-1 max-w-md text-sm text-muted-foreground">Pending staff leave requests will appear here for fast owner review.</p>
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
                    <CardDescription>{department.total} request(s), {department.days} day(s)</CardDescription>
                  </div>
                  <div className="rounded-2xl bg-primary/10 p-2 text-primary">
                    <Users className="h-5 w-5" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Approved share</span>
                    <span className="font-medium">{department.total ? Math.round((department.approved / department.total) * 100) : 0}%</span>
                  </div>
                  <Progress value={department.total ? (department.approved / department.total) * 100 : 0} />
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
                  <div className="rounded-2xl bg-rose-500/10 p-3 text-rose-700 dark:text-rose-300">
                    <p className="text-lg font-semibold">{department.rejected}</p>
                    <p>Rejected</p>
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
                <p className="font-medium text-foreground">No department leave data yet</p>
                <p className="mt-1 text-sm text-muted-foreground">Leave requests will unlock department-level leave risk tracking.</p>
              </CardContent>
            </Card>
          ) : null}
        </TabsContent>
      </Tabs>
    </div>
  );
}
