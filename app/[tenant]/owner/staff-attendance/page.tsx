"use client";

import * as React from "react";
import { useParams, usePathname, useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  BriefcaseBusiness,
  CalendarCheck,
  CheckCircle2,
  Clock3,
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
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getTenantSubdomain, resolveTenantSlug } from "@/lib/tenant-routing";
import { cn } from "@/lib/utils";

type AttendanceState = "available" | "on_leave" | "inactive";

type StaffMember = {
  id: string;
  staffId: string;
  name: string;
  email: string;
  roleId: string;
  departmentId: string | null;
  departmentName: string;
  employeeId: string;
  position: string;
  hireDate: string | null;
  isActive: boolean;
  state: AttendanceState;
  leave: null | {
    id: string;
    type: string;
    startDate: string | null;
    endDate: string | null;
    days: number;
    reason: string;
  };
};

type PendingLeave = {
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
  createdAt: string | null;
};

type DepartmentCoverage = {
  departmentId: string | null;
  departmentName: string;
  total: number;
  available: number;
  onLeave: number;
  inactive: number;
  coverageRate: number;
};

type AttendancePayload = {
  school: { name: string; slug: string; type: string };
  generatedAt: string;
  staff: StaffMember[];
  pendingLeave: PendingLeave[];
  departments: Array<{ id: string; name: string; headId: string | null }>;
  departmentCoverage: DepartmentCoverage[];
  summary: {
    totalStaff: number;
    available: number;
    onLeave: number;
    inactive: number;
    pendingLeave: number;
    coverageRate: number;
    departments: number;
  };
};

const STATE_META: Record<string, { label: string; className: string; icon: React.ElementType }> = {
  available: {
    label: "Available",
    className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    icon: CheckCircle2,
  },
  on_leave: {
    label: "On leave",
    className: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    icon: Clock3,
  },
  inactive: {
    label: "Inactive",
    className: "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300",
    icon: XCircle,
  },
  pending: {
    label: "Pending",
    className: "border-primary/30 bg-primary/10 text-primary",
    icon: Clock3,
  },
};

const PIE_COLORS = ["hsl(var(--primary))", "hsl(38 92% 50%)", "hsl(346 77% 49%)"];

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

function stateBadge(state: string) {
  const meta = STATE_META[state] || STATE_META.pending;
  const Icon = meta.icon;
  return (
    <Badge variant="outline" className={cn("gap-1 rounded-full px-2.5 py-1 capitalize", meta.className)}>
      <Icon className="h-3.5 w-3.5" />
      {meta.label}
    </Badge>
  );
}

function StatCard({
  title,
  value,
  description,
  icon: Icon,
}: {
  title: string;
  value: string | number;
  description: string;
  icon: React.ElementType;
}) {
  return (
    <Card className="border-border/70 bg-card/80 shadow-sm backdrop-blur">
      <CardContent className="flex items-center gap-4 p-5">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight text-foreground">{value}</p>
          <p className="truncate text-xs text-muted-foreground">{description}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function OwnerStaffAttendancePage() {
  const params = useParams<{ tenant: string }>();
  const pathname = usePathname();
  const router = useRouter();
  const paramTenantSlug = String(params?.tenant || "");
  const tenantSlug = paramTenantSlug && pathname?.startsWith(`/${paramTenantSlug}/`) ? paramTenantSlug : (typeof window !== "undefined" ? resolveTenantSlug(pathname, window.location.host) || "" : paramTenantSlug);
  const [data, setData] = React.useState<AttendancePayload | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [query, setQuery] = React.useState("");
  const [stateFilter, setStateFilter] = React.useState("all");
  const [departmentFilter, setDepartmentFilter] = React.useState("all");
  const [updatingLeaveId, setUpdatingLeaveId] = React.useState<string | null>(null);

  const tenantHref = React.useCallback(
    (path: string) => {
      if (typeof window !== "undefined" && getTenantSubdomain(window.location.host)) return path;
      return `/${tenantSlug}${path}`;
    },
    [tenantSlug]
  );

  const loadAttendance = React.useCallback(
    async (quiet = false) => {
      if (!tenantSlug) return;
      if (quiet) setRefreshing(true);
      else setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/tenant/owner/staff-attendance?tenant=${tenantSlug}`, {
          credentials: "include",
          cache: "no-store",
        });
        const payload = await response.json().catch(() => null);
        if (!response.ok) throw new Error(payload?.error || "Failed to load owner staff attendance data");
        setData(payload as AttendancePayload);
      } catch (nextError) {
        const message = nextError instanceof Error ? nextError.message : "Failed to load owner staff attendance data";
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
    void loadAttendance();
  }, [loadAttendance]);

  const updateLeave = async (id: string, status: "approved" | "rejected") => {
    setUpdatingLeaveId(id);
    try {
      const response = await fetch(`/api/tenant/owner/staff-attendance?tenant=${tenantSlug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id, status }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || "Failed to update leave status");
      toast.success(status === "approved" ? "Leave approved" : "Leave rejected");
      await loadAttendance(true);
    } catch (nextError) {
      toast.error(nextError instanceof Error ? nextError.message : "Failed to update leave status");
    } finally {
      setUpdatingLeaveId(null);
    }
  };

  const filteredStaff = React.useMemo(() => {
    const term = query.trim().toLowerCase();
    return (data?.staff || []).filter((member) => {
      const matchesTerm =
        !term ||
        [member.name, member.email, member.employeeId, member.position, member.roleId, member.departmentName]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(term));
      const matchesState = stateFilter === "all" || member.state === stateFilter;
      const matchesDepartment = departmentFilter === "all" || (member.departmentId || "unassigned") === departmentFilter;
      return matchesTerm && matchesState && matchesDepartment;
    });
  }, [data?.staff, departmentFilter, query, stateFilter]);

  const coverageChart = React.useMemo(
    () =>
      (data?.departmentCoverage || []).map((department) => ({
        name: department.departmentName,
        Available: department.available,
        "On leave": department.onLeave,
        Inactive: department.inactive,
      })),
    [data?.departmentCoverage]
  );

  const pieData = React.useMemo(
    () =>
      data
        ? [
            { name: "Available", value: data.summary.available },
            { name: "On leave", value: data.summary.onLeave },
            { name: "Inactive", value: data.summary.inactive },
          ].filter((item) => item.value > 0)
        : [],
    [data]
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <Card className="overflow-hidden border-border/70 bg-card/80 shadow-sm backdrop-blur">
          <CardContent className="p-6 md:p-8">
            <Badge className="mb-3 rounded-full bg-primary/10 text-primary hover:bg-primary/10">Owner workforce coverage</Badge>
            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Staff Attendance</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">Loading staff availability, leave coverage, department coverage, and attendance decisions.</p>
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
        <AlertTitle>Staff attendance failed to load</AlertTitle>
        <AlertDescription className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span>{error || "No attendance data was returned for this tenant."}</span>
          <Button variant="secondary" size="sm" onClick={() => void loadAttendance()}>
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
                <Badge className="mb-3 rounded-full bg-primary/10 text-primary hover:bg-primary/10">Owner operations</Badge>
                <h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">Staff Attendance Command Centre</h1>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Live owner view for staff availability, current leave coverage, pending leave decisions, and department readiness at {data.school.name}.
                </p>
                <p className="mt-3 text-xs text-muted-foreground">Last refreshed {formatDate(data.generatedAt)}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => router.push(tenantHref("/owner/staff"))}>
                  Staff directory
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button variant="outline" onClick={() => router.push(tenantHref("/owner/hr"))}>
                  HR overview
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button onClick={() => void loadAttendance(true)} disabled={refreshing}>
                  <RefreshCw className={cn("mr-2 h-4 w-4", refreshing && "animate-spin")} />
                  Refresh
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <StatCard title="Total staff" value={data.summary.totalStaff} description={`${data.summary.departments} departments`} icon={Users} />
        <StatCard title="Available" value={data.summary.available} description="Active and not on leave" icon={CheckCircle2} />
        <StatCard title="On leave" value={data.summary.onLeave} description="Approved leave today" icon={Clock3} />
        <StatCard title="Inactive" value={data.summary.inactive} description="Disabled or inactive records" icon={XCircle} />
        <StatCard title="Pending leave" value={data.summary.pendingLeave} description="Awaiting owner action" icon={CalendarCheck} />
        <StatCard title="Coverage" value={`${data.summary.coverageRate}%`} description="Available workforce" icon={TrendingUp} />
      </div>

      <Tabs defaultValue="overview" className="space-y-5">
        <TabsList className="mx-auto flex h-auto w-fit flex-wrap justify-center rounded-full bg-muted/70 p-1">
          <TabsTrigger value="overview" className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            Overview
          </TabsTrigger>
          <TabsTrigger value="directory" className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            Directory
          </TabsTrigger>
          <TabsTrigger value="leave" className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            Leave Queue
          </TabsTrigger>
          <TabsTrigger value="departments" className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            Departments
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-5">
          <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
            <Card className="border-border/70 bg-card/80 shadow-sm backdrop-blur">
              <CardHeader>
                <CardTitle>Department Coverage</CardTitle>
                <CardDescription>Available, leave, and inactive staffing by department.</CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                {coverageChart.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={coverageChart}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="name" tickLine={false} axisLine={false} className="text-xs" />
                      <YAxis allowDecimals={false} tickLine={false} axisLine={false} className="text-xs" />
                      <Tooltip cursor={{ fill: "hsl(var(--muted))" }} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12 }} />
                      <Bar dataKey="Available" stackId="a" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                      <Bar dataKey="On leave" stackId="a" fill="hsl(38 92% 50%)" />
                      <Bar dataKey="Inactive" stackId="a" fill="hsl(346 77% 49%)" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center rounded-2xl border border-dashed text-sm text-muted-foreground">No department coverage data yet.</div>
                )}
              </CardContent>
            </Card>

            <Card className="border-border/70 bg-card/80 shadow-sm backdrop-blur">
              <CardHeader>
                <CardTitle>Workforce Mix</CardTitle>
                <CardDescription>Today’s operational staff state.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="h-56">
                  {pieData.length ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={92} paddingAngle={3}>
                          {pieData.map((entry, index) => (
                            <Cell key={entry.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-full items-center justify-center rounded-2xl border border-dashed text-sm text-muted-foreground">No staff records yet.</div>
                  )}
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Coverage target</span>
                    <span className="font-medium text-foreground">{data.summary.coverageRate}%</span>
                  </div>
                  <Progress value={data.summary.coverageRate} />
                  <p className="text-xs leading-5 text-muted-foreground">Coverage is calculated from active staff who are not currently on approved leave.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="directory" className="space-y-5">
          <Card className="border-border/70 bg-card/80 shadow-sm backdrop-blur">
            <CardContent className="grid gap-3 p-4 md:grid-cols-[1fr_180px_220px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search staff, role, employee ID..." className="pl-9" />
              </div>
              <Select value={stateFilter} onValueChange={setStateFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="State" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All states</SelectItem>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="on_leave">On leave</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
              <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All departments</SelectItem>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {data.departments.map((department) => (
                    <SelectItem key={department.id} value={department.id}>
                      {department.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <div className="grid gap-4 xl:grid-cols-2">
            {filteredStaff.map((member) => (
              <Card key={member.id} className="border-border/70 bg-card/80 shadow-sm backdrop-blur">
                <CardContent className="p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex min-w-0 gap-3">
                      <Avatar className="h-11 w-11 border border-border">
                        <AvatarFallback className="bg-primary/10 text-primary">{initials(member.name)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <h3 className="truncate font-semibold text-foreground">{member.name}</h3>
                        <p className="truncate text-sm text-muted-foreground">{member.email || "No email recorded"}</p>
                        <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                          <span className="rounded-full bg-muted px-2 py-1">{member.position}</span>
                          <span className="rounded-full bg-muted px-2 py-1">{member.departmentName}</span>
                          {member.employeeId ? <span className="rounded-full bg-muted px-2 py-1">ID {member.employeeId}</span> : null}
                        </div>
                      </div>
                    </div>
                    {stateBadge(member.state)}
                  </div>
                  {member.leave ? (
                    <div className="mt-4 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-3 text-sm">
                      <p className="font-medium text-amber-700 dark:text-amber-300">
                        {member.leave.type} leave, {formatDate(member.leave.startDate)} - {formatDate(member.leave.endDate)}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">{member.leave.reason || "No reason provided."}</p>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            ))}
          </div>

          {!filteredStaff.length ? (
            <Card className="border-dashed bg-card/60">
              <CardContent className="flex min-h-40 flex-col items-center justify-center p-6 text-center">
                <Users className="mb-3 h-8 w-8 text-muted-foreground" />
                <p className="font-medium text-foreground">No staff matched your filters</p>
                <p className="mt-1 text-sm text-muted-foreground">Adjust search, state, or department filters to widen the results.</p>
              </CardContent>
            </Card>
          ) : null}
        </TabsContent>

        <TabsContent value="leave" className="space-y-4">
          {data.pendingLeave.map((leave) => (
            <Card key={leave.id} className="border-border/70 bg-card/80 shadow-sm backdrop-blur">
              <CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-foreground">{leave.staffName}</h3>
                    {stateBadge("pending")}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{leave.staffPosition || "Staff"} • {leave.staffEmail || "No email"}</p>
                  <p className="mt-2 text-sm text-foreground">
                    {leave.leaveType} leave for {leave.days || 0} day(s), {formatDate(leave.startDate)} - {formatDate(leave.endDate)}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">{leave.reason || "No reason provided."}</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" disabled={updatingLeaveId === leave.id} onClick={() => void updateLeave(leave.id, "rejected")}>
                    Reject
                  </Button>
                  <Button disabled={updatingLeaveId === leave.id} onClick={() => void updateLeave(leave.id, "approved")}>
                    {updatingLeaveId === leave.id ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
                    Approve
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          {!data.pendingLeave.length ? (
            <Card className="border-dashed bg-card/60">
              <CardContent className="flex min-h-56 flex-col items-center justify-center p-6 text-center">
                <CalendarCheck className="mb-3 h-9 w-9 text-primary" />
                <p className="font-medium text-foreground">No pending leave approvals</p>
                <p className="mt-1 max-w-md text-sm text-muted-foreground">New leave requests from staff will appear here for owner review before they affect coverage.</p>
              </CardContent>
            </Card>
          ) : null}
        </TabsContent>

        <TabsContent value="departments" className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.departmentCoverage.map((department) => (
            <Card key={department.departmentId || "unassigned"} className="border-border/70 bg-card/80 shadow-sm backdrop-blur">
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-base">{department.departmentName}</CardTitle>
                    <CardDescription>{department.total} assigned staff</CardDescription>
                  </div>
                  <div className="rounded-2xl bg-primary/10 p-2 text-primary">
                    <BriefcaseBusiness className="h-5 w-5" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Coverage</span>
                    <span className="font-medium">{department.coverageRate}%</span>
                  </div>
                  <Progress value={department.coverageRate} />
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="rounded-2xl bg-emerald-500/10 p-3 text-emerald-700 dark:text-emerald-300">
                    <p className="text-lg font-semibold">{department.available}</p>
                    <p>Available</p>
                  </div>
                  <div className="rounded-2xl bg-amber-500/10 p-3 text-amber-700 dark:text-amber-300">
                    <p className="text-lg font-semibold">{department.onLeave}</p>
                    <p>Leave</p>
                  </div>
                  <div className="rounded-2xl bg-rose-500/10 p-3 text-rose-700 dark:text-rose-300">
                    <p className="text-lg font-semibold">{department.inactive}</p>
                    <p>Inactive</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {!data.departmentCoverage.length ? (
            <Card className="border-dashed bg-card/60 md:col-span-2 xl:col-span-3">
              <CardContent className="flex min-h-48 flex-col items-center justify-center p-6 text-center">
                <BriefcaseBusiness className="mb-3 h-9 w-9 text-muted-foreground" />
                <p className="font-medium text-foreground">No department coverage yet</p>
                <p className="mt-1 text-sm text-muted-foreground">Create departments and assign staff to unlock coverage monitoring.</p>
              </CardContent>
            </Card>
          ) : null}
        </TabsContent>
      </Tabs>
    </div>
  );
}
