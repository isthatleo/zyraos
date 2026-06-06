"use client";

import * as React from "react";
import { useParams, usePathname, useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  Briefcase,
  CheckCircle2,
  Copy,
  KeyRound,
  Mail,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  UserCheck,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { getTenantSubdomain, resolveTenantSlug } from "@/lib/tenant-routing";
import { cn } from "@/lib/utils";

type StaffMember = {
  id: string;
  name: string;
  email: string;
  image: string | null;
  roleId: string;
  roleName: string;
  roleDescription: string;
  departmentId: string | null;
  departmentName: string;
  isActive: boolean;
  createdAt: string | null;
  employeeId: string;
  position: string;
  hireDate: string | null;
  salary: number;
  status: string;
};

type StaffPayload = {
  school: { name: string; type: string; slug: string };
  staff: StaffMember[];
  roles: Array<{ id: string; name: string; description: string; canonicalRole: string; portal: string; dashboardPath: string }>;
  departments: Array<{ id: string; name: string; headId?: string | null }>;
  summary: { total: number; active: number; inactive: number; unassigned: number; departments: number };
};

type AccessResult = {
  user: { name: string; email: string; roleId: string; role: string; dashboardPath: string };
  temporaryPassword: string;
  loginUrl: string;
  delivery: { email?: { ok: boolean; status: string; message: string }; sms?: { ok: boolean; status: string; message: string } | null };
};

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
  if (["pending", "draft"].includes(value)) return "border-primary/25 bg-primary/10 text-primary";
  return "border-destructive/25 bg-destructive/10 text-destructive";
}

function LoadingState() {
  return (
    <div className="space-y-6">
      <section className="rounded-3xl border bg-card p-6 shadow-sm">
        <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Users className="size-6" />
        </div>
        <Badge variant="outline" className="rounded-full">Owner staff</Badge>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight">Owner Staff Management</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">Loading staff access, departments, roles, and credential delivery state.</p>
      </section>
      <div className="grid gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-32 rounded-3xl" />)}
      </div>
      <Skeleton className="h-96 rounded-3xl" />
    </div>
  );
}

export default function OwnerStaffPage() {
  const params = useParams<{ tenant?: string }>();
  const pathname = usePathname();
  const router = useRouter();
  const paramTenantSlug = String(params?.tenant || "");
  const tenantSlug = paramTenantSlug && pathname?.startsWith(`/${paramTenantSlug}/`) ? paramTenantSlug : (typeof window !== "undefined" ? resolveTenantSlug(pathname, window.location.host) || "" : paramTenantSlug);
  const [isTenantSubdomain, setIsTenantSubdomain] = React.useState(false);
  const [data, setData] = React.useState<StaffPayload | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [accessResult, setAccessResult] = React.useState<AccessResult | null>(null);
  const [query, setQuery] = React.useState("");
  const [roleFilter, setRoleFilter] = React.useState("all");
  const [departmentFilter, setDepartmentFilter] = React.useState("all");
  const [form, setForm] = React.useState({
    name: "",
    email: "",
    phone: "",
    roleId: "",
    departmentId: "",
    position: "",
    employeeId: "",
    hireDate: new Date().toISOString().slice(0, 10),
    salary: "",
  });

  React.useEffect(() => {
    setIsTenantSubdomain(Boolean(getTenantSubdomain(window.location.hostname)));
  }, []);

  const tenantHref = React.useCallback(
    (href: string) => (isTenantSubdomain || !tenantSlug ? href : href.startsWith("/") ? `/${tenantSlug}${href}` : `/${tenantSlug}/${href}`),
    [isTenantSubdomain, tenantSlug]
  );

  const loadStaff = React.useCallback(
    async (refresh = false) => {
      setError(null);
      if (refresh) setRefreshing(true);
      else setLoading(true);
      try {
        const response = await fetch(`/api/tenant/owner/staff?tenant=${encodeURIComponent(tenantSlug)}`, {
          credentials: "include",
          cache: "no-store",
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload?.error || "Failed to load staff");
        setData(payload);
        if (refresh) toast.success("Staff data refreshed");
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Failed to load staff");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [tenantSlug]
  );

  React.useEffect(() => {
    void loadStaff();
  }, [loadStaff]);

  const filteredStaff = React.useMemo(() => {
    const term = query.trim().toLowerCase();
    return (data?.staff || []).filter((member) => {
      const matchesSearch =
        !term ||
        member.name.toLowerCase().includes(term) ||
        member.email.toLowerCase().includes(term) ||
        member.roleName.toLowerCase().includes(term) ||
        member.departmentName.toLowerCase().includes(term) ||
        member.employeeId.toLowerCase().includes(term);
      const matchesRole = roleFilter === "all" || member.roleId === roleFilter;
      const matchesDepartment = departmentFilter === "all" || (departmentFilter === "unassigned" ? !member.departmentId : member.departmentId === departmentFilter);
      return matchesSearch && matchesRole && matchesDepartment;
    });
  }, [data?.staff, departmentFilter, query, roleFilter]);

  const submitStaff = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setAccessResult(null);
    try {
      const response = await fetch(`/api/tenant/owner/staff?tenant=${encodeURIComponent(tenantSlug)}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          departmentId: form.departmentId || undefined,
          salary: form.salary ? Number(form.salary) : undefined,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || "Failed to create staff account");
      setAccessResult(payload);
      toast.success("Staff access created");
      setForm({
        name: "",
        email: "",
        phone: "",
        roleId: "",
        departmentId: "",
        position: "",
        employeeId: "",
        hireDate: new Date().toISOString().slice(0, 10),
        salary: "",
      });
      await loadStaff(true);
    } catch (saveError) {
      toast.error(saveError instanceof Error ? saveError.message : "Failed to create staff account");
    } finally {
      setSaving(false);
    }
  };

  const copyAccess = async () => {
    if (!accessResult) return;
    await navigator.clipboard.writeText(
      [`Login: ${accessResult.loginUrl}`, `Email: ${accessResult.user.email}`, `Temporary password: ${accessResult.temporaryPassword}`].join("\n")
    );
    toast.success("Access details copied");
  };

  if (loading) return <LoadingState />;

  if (error || !data) {
    return (
      <Alert variant="destructive" className="rounded-3xl">
        <AlertCircle className="size-4" />
        <AlertTitle>Staff page failed to load</AlertTitle>
        <AlertDescription className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span>{error || "No staff data was returned."}</span>
          <Button variant="secondary" onClick={() => loadStaff()}>Retry</Button>
        </AlertDescription>
      </Alert>
    );
  }

  const roleOptions = data.roles;
  const departmentOptions = data.departments;

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Users className="size-6" />
            </div>
            <Badge variant="outline" className="rounded-full">{data.school.name}</Badge>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight">Owner Staff Management</h1>
            <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
              Create staff access, review school leadership, monitor departments, and hand off temporary credentials with first-login password change enforcement.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => loadStaff(true)} disabled={refreshing}>
              <RefreshCw className={cn("size-4", refreshing && "animate-spin")} />
              Refresh
            </Button>
            <Button variant="outline" onClick={() => router.push(tenantHref("/owner/permissions"))}>
              <ShieldCheck className="size-4" />
              Permissions
            </Button>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="size-4" />
                  Create Staff
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-4xl">
                <form onSubmit={submitStaff}>
                  <DialogHeader>
                    <DialogTitle>Create staff access</DialogTitle>
                    <DialogDescription>
                      A temporary password is generated automatically, sent to the user, and must be changed before dashboard access.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="mt-6 grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full name</Label>
                      <Input id="name" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone</Label>
                      <Input id="phone" value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} placeholder="+256..." />
                    </div>
                    <div className="space-y-2">
                      <Label>Role</Label>
                      <Select value={form.roleId} onValueChange={(value) => setForm((current) => ({ ...current, roleId: value }))} required>
                        <SelectTrigger><SelectValue placeholder="Select staff role" /></SelectTrigger>
                        <SelectContent>
                          {roleOptions.map((role) => (
                            <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Department</Label>
                      <Select value={form.departmentId || "none"} onValueChange={(value) => setForm((current) => ({ ...current, departmentId: value === "none" ? "" : value }))}>
                        <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">General Administration</SelectItem>
                          {departmentOptions.map((department) => (
                            <SelectItem key={department.id} value={department.id}>{department.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="position">Position / title</Label>
                      <Input id="position" value={form.position} onChange={(event) => setForm((current) => ({ ...current, position: event.target.value }))} placeholder="Teacher, Bursar, Principal..." />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="employeeId">Employee ID</Label>
                      <Input id="employeeId" value={form.employeeId} onChange={(event) => setForm((current) => ({ ...current, employeeId: event.target.value }))} placeholder="Auto-generated if blank" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="hireDate">Hire date</Label>
                      <Input id="hireDate" type="date" value={form.hireDate} onChange={(event) => setForm((current) => ({ ...current, hireDate: event.target.value }))} />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="salary">Salary / compensation</Label>
                      <Input id="salary" type="number" min="0" step="0.01" value={form.salary} onChange={(event) => setForm((current) => ({ ...current, salary: event.target.value }))} placeholder="Optional" />
                    </div>
                  </div>
                  {accessResult ? (
                    <div className="mt-5 rounded-2xl border border-primary/25 bg-primary/10 p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="font-semibold text-primary">Temporary access generated</p>
                          <p className="mt-1 text-sm text-muted-foreground break-all">{accessResult.loginUrl}</p>
                          <p className="mt-2 text-sm">Email: <span className="font-medium">{accessResult.user.email}</span></p>
                          <p className="text-sm">Temporary password: <span className="font-medium">{accessResult.temporaryPassword}</span></p>
                        </div>
                        <Button type="button" variant="outline" onClick={copyAccess}>
                          <Copy className="size-4" />
                          Copy
                        </Button>
                      </div>
                    </div>
                  ) : null}
                  <DialogFooter className="mt-6">
                    <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Close</Button>
                    <Button type="submit" disabled={saving}>
                      {saving ? <RefreshCw className="size-4 animate-spin" /> : <KeyRound className="size-4" />}
                      Create access
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Total staff</CardTitle></CardHeader><CardContent><p className="text-3xl font-semibold">{data.summary.total}</p><p className="mt-2 text-xs text-muted-foreground">{data.summary.active} active accounts</p></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Departments</CardTitle></CardHeader><CardContent><p className="text-3xl font-semibold">{data.summary.departments}</p><p className="mt-2 text-xs text-muted-foreground">{data.summary.unassigned} unassigned users</p></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Inactive</CardTitle></CardHeader><CardContent><p className="text-3xl font-semibold">{data.summary.inactive}</p><p className="mt-2 text-xs text-muted-foreground">Accounts needing review</p></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Available roles</CardTitle></CardHeader><CardContent><p className="text-3xl font-semibold">{data.roles.length}</p><p className="mt-2 text-xs text-muted-foreground">For this education level</p></CardContent></Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Staff Directory</CardTitle>
          <CardDescription>Live tenant staff and leadership accounts. Use filters to audit roles, departments, and access state.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 lg:grid-cols-[1fr_220px_220px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9" placeholder="Search name, email, role, department, employee ID..." value={query} onChange={(event) => setQuery(event.target.value)} />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger><SelectValue placeholder="Filter role" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All roles</SelectItem>
                {roleOptions.map((role) => <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger><SelectValue placeholder="Filter department" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All departments</SelectItem>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {departmentOptions.map((department) => <SelectItem key={department.id} value={department.id}>{department.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {filteredStaff.length ? (
            <div className="grid gap-3">
              {filteredStaff.map((member) => (
                <div key={member.id} className="rounded-2xl border bg-muted/20 p-4 transition-colors hover:border-primary/40">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar className="size-11">
                        <AvatarImage src={member.image || undefined} />
                        <AvatarFallback>{initials(member.name)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate font-medium">{member.name}</p>
                          <Badge className={cn("rounded-full capitalize", statusClass(member.status))}>{member.status}</Badge>
                        </div>
                        <p className="truncate text-sm text-muted-foreground">{member.email}</p>
                      </div>
                    </div>
                    <div className="grid gap-3 text-sm md:grid-cols-4 lg:min-w-[680px]">
                      <div>
                        <p className="text-xs text-muted-foreground">Role</p>
                        <p className="font-medium">{member.roleName}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Department</p>
                        <p className="font-medium">{member.departmentName}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Position</p>
                        <p className="font-medium">{member.position || member.roleName}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Hire date</p>
                        <p className="font-medium">{formatDate(member.hireDate || member.createdAt)}</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => window.location.href = `mailto:${member.email}`}>
                      <Mail className="size-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed bg-muted/30 p-10 text-center">
              <UserCheck className="mx-auto mb-3 size-8 text-primary" />
              <p className="font-medium">No staff found</p>
              <p className="mt-1 text-sm text-muted-foreground">Adjust filters or create the first staff account for this tenant.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Role Coverage</CardTitle>
            <CardDescription>Allowed staff/admin roles for this tenant type.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {roleOptions.slice(0, 8).map((role) => (
              <div key={role.id} className="rounded-2xl border bg-muted/20 p-3">
                <p className="font-medium">{role.name}</p>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{role.description}</p>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Access Workflow</CardTitle>
            <CardDescription>Production-grade owner staff onboarding flow.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border bg-muted/20 p-4">
              <KeyRound className="mb-3 size-5 text-primary" />
              <p className="font-medium">Temporary password</p>
              <p className="mt-1 text-sm text-muted-foreground">Generated server-side and returned only after creation.</p>
            </div>
            <div className="rounded-2xl border bg-muted/20 p-4">
              <CheckCircle2 className="mb-3 size-5 text-primary" />
              <p className="font-medium">Forced completion</p>
              <p className="mt-1 text-sm text-muted-foreground">User must change password before entering their dashboard.</p>
            </div>
            <div className="rounded-2xl border bg-muted/20 p-4">
              <ArrowRight className="mb-3 size-5 text-primary" />
              <p className="font-medium">Correct portal</p>
              <p className="mt-1 text-sm text-muted-foreground">Login link is generated for the selected role and tenant slug.</p>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
