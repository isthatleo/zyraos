"use client";

import * as React from "react";
import { useParams, usePathname, useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  Briefcase,
  CalendarCheck,
  CheckCircle2,
  CreditCard,
  RefreshCw,
  Search,
  Users,
  XCircle,
} from "lucide-react";
import {
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

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getTenantSubdomain, resolveTenantSlug } from "@/lib/tenant-routing";
import { cn } from "@/lib/utils";

type HrPayload = {
  school: { name: string; slug: string; type: string; currencyCode?: string | null };
  staff: Array<{
    id: string;
    staffId: string;
    name: string;
    email: string;
    roleId: string;
    departmentId: string | null;
    departmentName: string;
    isActive: boolean;
    employeeId: string;
    position: string;
    hireDate: string | null;
    salary: number;
    status: string;
  }>;
  leave: Array<{
    id: string;
    staffId: string;
    staffName: string;
    staffEmail: string;
    staffPosition: string;
    leaveType: string;
    startDate: string | null;
    endDate: string | null;
    days: number;
    reason: string;
    status: string;
    remarks: string;
    createdAt: string | null;
  }>;
  payroll: Array<{
    id: string;
    staffId: string;
    staffName: string;
    staffEmail: string;
    staffPosition: string;
    period: string;
    month: string;
    basicSalary: number;
    allowances: number;
    deductions: number;
    grossSalary: number;
    netSalary: number;
    status: string;
    paymentDate: string | null;
    createdAt: string | null;
  }>;
  departments: Array<{ id: string; name: string; headId: string | null; createdAt: string | null }>;
  departmentDistribution: Array<{ name: string; value: number }>;
  summary: {
    totalStaff: number;
    activeStaff: number;
    inactiveStaff: number;
    departments: number;
    pendingLeave: number;
    approvedLeaveDays: number;
    payrollRecords: number;
    totalPayroll: number;
    pendingPayroll: number;
    payrollPaid: number;
  };
};

const chartColors = ["var(--primary)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function formatDate(value: string | null) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

function statusClass(status: string) {
  const value = status.toLowerCase();
  if (["active", "approved", "paid"].includes(value)) return "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  if (["pending"].includes(value)) return "border-primary/25 bg-primary/10 text-primary";
  return "border-destructive/25 bg-destructive/10 text-destructive";
}

function LoadingState() {
  return (
    <div className="space-y-6">
      <section className="rounded-3xl border bg-card p-6 shadow-sm">
        <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Briefcase className="size-6" />
        </div>
        <Badge variant="outline" className="rounded-full">Owner HR</Badge>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight">Owner HR Dashboard</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">Loading workforce capacity, leave decisions, payroll exposure, and department analytics.</p>
      </section>
      <div className="grid gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-32 rounded-3xl" />)}
      </div>
      <Skeleton className="h-96 rounded-3xl" />
    </div>
  );
}

export default function OwnerHrPage() {
  const params = useParams<{ tenant?: string }>();
  const pathname = usePathname();
  const router = useRouter();
  const paramTenantSlug = String(params?.tenant || "");
  const tenantSlug = paramTenantSlug && pathname?.startsWith(`/${paramTenantSlug}/`) ? paramTenantSlug : (typeof window !== "undefined" ? resolveTenantSlug(pathname, window.location.host) || "" : paramTenantSlug);
  const [isTenantSubdomain, setIsTenantSubdomain] = React.useState(false);
  const [data, setData] = React.useState<HrPayload | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [updatingId, setUpdatingId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [staffSearch, setStaffSearch] = React.useState("");
  const [departmentFilter, setDepartmentFilter] = React.useState("all");

  React.useEffect(() => {
    setIsTenantSubdomain(Boolean(getTenantSubdomain(window.location.hostname)));
  }, []);

  const tenantHref = React.useCallback(
    (href: string) => (isTenantSubdomain || !tenantSlug ? href : href.startsWith("/") ? `/${tenantSlug}${href}` : `/${tenantSlug}/${href}`),
    [isTenantSubdomain, tenantSlug]
  );

  const loadHr = React.useCallback(
    async (refresh = false) => {
      setError(null);
      if (refresh) setRefreshing(true);
      else setLoading(true);
      try {
        const response = await fetch(`/api/tenant/owner/hr?tenant=${encodeURIComponent(tenantSlug)}`, {
          credentials: "include",
          cache: "no-store",
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload?.error || "Failed to load HR data");
        setData(payload);
        if (refresh) toast.success("HR data refreshed");
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Failed to load HR data");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [tenantSlug]
  );

  React.useEffect(() => {
    void loadHr();
  }, [loadHr]);

  const currency = React.useMemo(
    () => new Intl.NumberFormat("en", { style: "currency", currency: data?.school.currencyCode || "ZAR", maximumFractionDigits: 0 }),
    [data?.school.currencyCode]
  );

  const filteredStaff = React.useMemo(() => {
    const term = staffSearch.trim().toLowerCase();
    return (data?.staff || []).filter((member) => {
      const matchesTerm =
        !term ||
        member.name.toLowerCase().includes(term) ||
        member.email.toLowerCase().includes(term) ||
        member.position.toLowerCase().includes(term) ||
        member.departmentName.toLowerCase().includes(term);
      const matchesDepartment = departmentFilter === "all" || member.departmentId === departmentFilter || (departmentFilter === "unassigned" && !member.departmentId);
      return matchesTerm && matchesDepartment;
    });
  }, [data?.staff, departmentFilter, staffSearch]);

  const updateRecord = async (type: "leave" | "payroll", id: string, status: string) => {
    setUpdatingId(id);
    try {
      const response = await fetch(`/api/tenant/owner/hr?tenant=${encodeURIComponent(tenantSlug)}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, id, status }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || "Failed to update record");
      toast.success(payload?.message || "Record updated");
      await loadHr(true);
    } catch (updateError) {
      toast.error(updateError instanceof Error ? updateError.message : "Failed to update record");
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) return <LoadingState />;

  if (error || !data) {
    return (
      <Alert variant="destructive" className="rounded-3xl">
        <AlertCircle className="size-4" />
        <AlertTitle>HR page failed to load</AlertTitle>
        <AlertDescription className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span>{error || "No HR data was returned."}</span>
          <Button variant="secondary" onClick={() => loadHr()}>Retry</Button>
        </AlertDescription>
      </Alert>
    );
  }

  const activeRate = data.summary.totalStaff ? Math.round((data.summary.activeStaff / data.summary.totalStaff) * 100) : 0;

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Briefcase className="size-6" />
            </div>
            <Badge variant="outline" className="rounded-full">{data.school.name}</Badge>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight">Owner HR Dashboard</h1>
            <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
              Owner-level human resources visibility for workforce capacity, leave decisions, payroll exposure, departments, and staffing risk.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => loadHr(true)} disabled={refreshing}>
              <RefreshCw className={cn("size-4", refreshing && "animate-spin")} />
              Refresh
            </Button>
            <Button variant="outline" onClick={() => router.push(tenantHref("/owner/staff"))}>
              <Users className="size-4" />
              Staff
            </Button>
            <Button onClick={() => router.push(tenantHref("/owner/payroll"))}>
              <CreditCard className="size-4" />
              Payroll
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader><CardTitle className="text-sm text-muted-foreground">Active staff</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-semibold">{data.summary.activeStaff}</p><p className="mt-2 text-xs text-muted-foreground">{activeRate}% of workforce active</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm text-muted-foreground">Pending leave</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-semibold">{data.summary.pendingLeave}</p><p className="mt-2 text-xs text-muted-foreground">{data.summary.approvedLeaveDays} approved leave days</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm text-muted-foreground">Payroll exposure</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-semibold">{currency.format(data.summary.totalPayroll)}</p><p className="mt-2 text-xs text-muted-foreground">{currency.format(data.summary.pendingPayroll)} pending/approved</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm text-muted-foreground">Departments</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-semibold">{data.summary.departments}</p><p className="mt-2 text-xs text-muted-foreground">{data.summary.inactiveStaff} inactive accounts</p></CardContent>
        </Card>
      </section>

      <Tabs defaultValue="overview" className="space-y-5">
        <TabsList className="mx-auto flex w-fit rounded-full bg-muted/70 p-1">
          <TabsTrigger value="overview" className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Overview</TabsTrigger>
          <TabsTrigger value="leave" className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Leave Queue</TabsTrigger>
          <TabsTrigger value="payroll" className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Payroll</TabsTrigger>
          <TabsTrigger value="staff" className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Staff</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="grid gap-5 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Department Distribution</CardTitle>
              <CardDescription>Live staff split by department.</CardDescription>
            </CardHeader>
            <CardContent>
              {data.departmentDistribution.length ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={data.departmentDistribution}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={12} />
                    <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                    <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 14, color: "var(--popover-foreground)" }} />
                    <Bar dataKey="value" fill="var(--primary)" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="rounded-2xl border border-dashed bg-muted/30 p-10 text-center text-sm text-muted-foreground">No department distribution yet.</div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Workforce Health</CardTitle>
              <CardDescription>Active/inactive staff ratio.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <Progress value={activeRate} />
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={[{ name: "Active", value: data.summary.activeStaff }, { name: "Inactive", value: data.summary.inactiveStaff }]} dataKey="value" innerRadius={58} outerRadius={88}>
                    {[0, 1].map((index) => <Cell key={index} fill={chartColors[index]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 14, color: "var(--popover-foreground)" }} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="leave">
          <Card>
            <CardHeader>
              <CardTitle>Leave Queue</CardTitle>
              <CardDescription>Approve or reject pending leave requests from live tenant records.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.leave.length ? data.leave.map((item) => (
                <div key={item.id} className="rounded-2xl border bg-muted/20 p-4">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{item.staffName}</p>
                        <Badge className={cn("rounded-full capitalize", statusClass(item.status))}>{item.status}</Badge>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{item.leaveType} · {item.days} days · {formatDate(item.startDate)} - {formatDate(item.endDate)}</p>
                      {item.reason ? <p className="mt-1 text-sm text-muted-foreground">{item.reason}</p> : null}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" disabled={updatingId === item.id || item.status === "approved"} onClick={() => updateRecord("leave", item.id, "approved")}>
                        <CheckCircle2 className="size-4" />
                        Approve
                      </Button>
                      <Button variant="outline" disabled={updatingId === item.id || item.status === "rejected"} onClick={() => updateRecord("leave", item.id, "rejected")}>
                        <XCircle className="size-4" />
                        Reject
                      </Button>
                    </div>
                  </div>
                </div>
              )) : (
                <div className="rounded-2xl border border-dashed bg-muted/30 p-10 text-center text-sm text-muted-foreground">No leave requests found.</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payroll">
          <Card>
            <CardHeader>
              <CardTitle>Payroll Records</CardTitle>
              <CardDescription>Owner visibility and payment state control for payroll records.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.payroll.length ? data.payroll.map((item) => (
                <div key={item.id} className="rounded-2xl border bg-muted/20 p-4">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{item.staffName}</p>
                        <Badge className={cn("rounded-full capitalize", statusClass(item.status))}>{item.status}</Badge>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{item.month} · Net {currency.format(item.netSalary)} · Gross {currency.format(item.grossSalary)}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" disabled={updatingId === item.id || item.status === "approved"} onClick={() => updateRecord("payroll", item.id, "approved")}>Approve</Button>
                      <Button disabled={updatingId === item.id || item.status === "paid"} onClick={() => updateRecord("payroll", item.id, "paid")}>Mark paid</Button>
                    </div>
                  </div>
                </div>
              )) : (
                <div className="rounded-2xl border border-dashed bg-muted/30 p-10 text-center text-sm text-muted-foreground">No payroll records found.</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="staff">
          <Card>
            <CardHeader>
              <CardTitle>HR Staff View</CardTitle>
              <CardDescription>Filter workforce by department and search by person, role, or position.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 lg:grid-cols-[1fr_240px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input className="pl-9" placeholder="Search staff..." value={staffSearch} onChange={(event) => setStaffSearch(event.target.value)} />
                </div>
                <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                  <SelectTrigger><SelectValue placeholder="Department" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All departments</SelectItem>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {data.departments.map((department) => <SelectItem key={department.id} value={department.id}>{department.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-3">
                {filteredStaff.map((member) => (
                  <div key={member.id} className="flex flex-col gap-4 rounded-2xl border bg-muted/20 p-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar><AvatarFallback>{initials(member.name)}</AvatarFallback></Avatar>
                      <div className="min-w-0">
                        <p className="truncate font-medium">{member.name}</p>
                        <p className="truncate text-sm text-muted-foreground">{member.email}</p>
                      </div>
                    </div>
                    <div className="grid gap-3 text-sm md:grid-cols-3 md:text-right">
                      <div><p className="text-xs text-muted-foreground">Department</p><p className="font-medium">{member.departmentName}</p></div>
                      <div><p className="text-xs text-muted-foreground">Position</p><p className="font-medium">{member.position}</p></div>
                      <div><p className="text-xs text-muted-foreground">Hire date</p><p className="font-medium">{formatDate(member.hireDate)}</p></div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>HR Actions</CardTitle>
            <CardDescription>Owner-scoped HR navigation.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            <Button variant="outline" className="justify-start rounded-2xl" onClick={() => router.push(tenantHref("/owner/staff"))}><Users className="size-4" /> Create staff account</Button>
            <Button variant="outline" className="justify-start rounded-2xl" onClick={() => router.push(tenantHref("/owner/leave"))}><CalendarCheck className="size-4" /> Leave overview</Button>
            <Button variant="outline" className="justify-start rounded-2xl" onClick={() => router.push(tenantHref("/owner/payroll"))}><CreditCard className="size-4" /> Payroll overview</Button>
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Production HR Notes</CardTitle>
            <CardDescription>How this page behaves with phased tenant implementation.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border bg-muted/20 p-4"><p className="font-medium">Real records only</p><p className="mt-1 text-sm text-muted-foreground">No placeholder staff, leave, or payroll values are generated.</p></div>
            <div className="rounded-2xl border bg-muted/20 p-4"><p className="font-medium">Safe empty states</p><p className="mt-1 text-sm text-muted-foreground">Unseeded modules render empty queues without crashing.</p></div>
            <div className="rounded-2xl border bg-muted/20 p-4"><p className="font-medium">Owner controls</p><p className="mt-1 text-sm text-muted-foreground">Approvals update live tenant records through the owner HR API.</p></div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
