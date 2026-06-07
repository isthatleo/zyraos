"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AlertCircle, BookOpen, Briefcase, Copy, Edit3, Eye, KeyRound, Loader2, Mail, MoreHorizontal, Plus, RefreshCw, Search, ShieldCheck, Trash2, UserCheck, UserCog, Users } from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type ManagedUser = {
  id: string;
  name: string;
  email: string;
  roleId: string;
  roleName: string;
  canonicalRole: string;
  portal: string;
  dashboardPath: string;
  departmentId: string | null;
  departmentName: string;
  isActive: boolean;
  employeeId: string;
  position: string;
  hireDate: string | null;
  salary: number;
  salaryPeriod: string;
  staffStatus: string;
  admissionNumber: string;
  studentStatus: string;
  loginUrl: string;
};

type Payload = {
  school: { name: string; slug: string; type: string; status: string; currencyCode?: string | null };
  users: ManagedUser[];
  staff: ManagedUser[];
  roles: Array<{ id: string; name: string; description: string; canonicalRole: string; portal: string; dashboardPath: string }>;
  staffRoles: Array<{ id: string; name: string; description: string; canonicalRole: string; portal: string; dashboardPath: string }>;
  departments: Array<{ id: string; name: string; headId?: string | null }>;
  summary: { total: number; active: number; inactive: number; staff: number; learners: number; guardians: number; unassigned: number };
};

type AccessResult = {
  user: { name: string; email: string; roleId: string; role: string; dashboardPath: string };
  employeeId: string;
  temporaryPassword: string;
  loginUrl: string;
};

function statusClass(active: boolean) {
  return active ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "border-destructive/25 bg-destructive/10 text-destructive";
}

function money(amount: string, currency: string) {
  const value = Number(amount || 0);
  if (!Number.isFinite(value) || value <= 0) return "";
  try {
    return new Intl.NumberFormat("en", { style: "currency", currency, maximumFractionDigits: 2 }).format(value);
  } catch {
    return `${currency} ${value.toLocaleString()}`;
  }
}

const emptyForm = { name: "", email: "", phone: "", roleId: "", departmentId: "", position: "", employeeId: "", salary: "", salaryPeriod: "monthly", temporaryPassword: "" };

export function AdminUsersPage() {
  return <AdminDirectoryPage mode="users" />;
}

export function AdminStaffPage() {
  return <AdminDirectoryPage mode="staff" />;
}

export function AdminUserDetailsPage({ mode, id }: { mode: "users" | "staff"; id: string }) {
  const params = useParams<{ tenant: string }>();
  const tenant = params?.tenant || "";
  const [data, setData] = React.useState<Payload | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const staffMode = mode === "staff";

  React.useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const search = new URLSearchParams({ tenant });
        if (staffMode) search.set("staffOnly", "true");
        const response = await fetch(`/api/tenant/admin/${staffMode ? "staff" : "users"}?${search.toString()}`, { cache: "no-store", credentials: "include" });
        const payload = await response.json().catch(() => null);
        if (!response.ok) throw new Error(payload?.error || "Failed to load record");
        if (!cancelled) setData(payload);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load record");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [staffMode, tenant]);

  const record = (staffMode ? data?.staff || [] : data?.users || []).find((item) => item.id === id);
  const currency = data?.school.currencyCode || "USD";

  if (loading) return <div className="space-y-6"><Skeleton className="h-44 rounded-3xl" /><Skeleton className="h-96 rounded-3xl" /></div>;
  if (error || !data || !record) {
    return (
      <Alert variant="destructive" className="rounded-3xl">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>{staffMode ? "Staff" : "User"} record unavailable</AlertTitle>
        <AlertDescription>{error || "This record was not found in the current tenant."}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-3xl border bg-card shadow-sm">
        <div className="bg-[radial-gradient(circle_at_top_left,rgba(249,115,22,0.16),transparent_34%),linear-gradient(135deg,hsl(var(--card)),hsl(var(--muted)/.55))] p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <Badge variant="outline" className="rounded-full">{staffMode ? "Staff full record" : "User full record"}</Badge>
              <h1 className="mt-3 text-3xl font-bold tracking-tight">{record.name}</h1>
              <p className="mt-2 text-sm text-muted-foreground">{record.email} · {record.roleName} · {record.departmentName}</p>
            </div>
            <Button asChild variant="outline"><Link href={`/${tenant}/admin/${staffMode ? "staff" : "users"}`}>Back to {staffMode ? "Staff" : "Users"}</Link></Button>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Metric icon={UserCheck} label="Status" value={record.isActive ? 1 : 0} />
        <Metric icon={ShieldCheck} label="Role" value={record.roleName ? 1 : 0} />
        <Metric icon={Briefcase} label="Department" value={record.departmentId ? 1 : 0} />
        <Metric icon={KeyRound} label="Dashboard access" value={record.dashboardPath ? 1 : 0} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[360px_1fr]">
        <Card className="border-2">
          <CardHeader><CardTitle>Profile</CardTitle><CardDescription>Identity and access summary.</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-3xl border bg-muted/30 p-5">
              <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-orange-500 text-2xl font-black text-white">{record.name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase()}</div>
              <h2 className="mt-4 text-xl font-bold">{record.name}</h2>
              <p className="text-sm text-muted-foreground">{record.email}</p>
              <div className="mt-4 flex flex-wrap gap-2"><Badge variant="outline" className={cn("rounded-full", statusClass(record.isActive))}>{record.isActive ? "Active" : "Inactive"}</Badge><Badge variant="outline" className="rounded-full">{record.roleName}</Badge></div>
            </div>
            <Detail label="Login URL" value={record.loginUrl} copy />
            <Detail label="Dashboard path" value={record.dashboardPath} />
            <Detail label="Portal" value={record.portal} />
          </CardContent>
        </Card>

        <div className="grid gap-5">
          <Card className="border-2">
            <CardHeader><CardTitle>Role & Department</CardTitle></CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <Detail label="Role ID" value={record.roleId} />
              <Detail label="Canonical role" value={record.canonicalRole} />
              <Detail label="Department" value={record.departmentName} />
              <Detail label="Position" value={record.position || "Not set"} />
            </CardContent>
          </Card>
          <Card className="border-2">
            <CardHeader><CardTitle>{staffMode ? "Staff Employment" : "Record Identifiers"}</CardTitle></CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <Detail label="Employee ID" value={record.employeeId || "Not assigned"} />
              <Detail label="Admission number" value={record.admissionNumber || "Not applicable"} />
              <Detail label="Hire date" value={record.hireDate ? new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(record.hireDate)) : "Not set"} />
              <Detail label="Staff status" value={record.staffStatus || "Not set"} />
              <Detail label="Compensation" value={record.salary ? `${new Intl.NumberFormat("en", { style: "currency", currency }).format(record.salary)} · ${record.salaryPeriod}` : "Not configured"} />
              <Detail label="Student status" value={record.studentStatus || "Not applicable"} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function AdminDirectoryPage({ mode }: { mode: "users" | "staff" }) {
  const params = useParams<{ tenant: string }>();
  const tenant = params?.tenant || "";
  const staffMode = mode === "staff";
  const [data, setData] = React.useState<Payload | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState("");
  const [query, setQuery] = React.useState("");
  const [role, setRole] = React.useState("all");
  const [status, setStatus] = React.useState("all");
  const [editing, setEditing] = React.useState<ManagedUser | null>(null);
  const [editForm, setEditForm] = React.useState({ name: "", roleId: "", departmentId: "", position: "", salary: "", salaryPeriod: "monthly" });
  const [createOpen, setCreateOpen] = React.useState(false);
  const [createForm, setCreateForm] = React.useState(emptyForm);
  const [creating, setCreating] = React.useState(false);
  const [busyId, setBusyId] = React.useState("");
  const [accessResult, setAccessResult] = React.useState<AccessResult | null>(null);
  const currency = data?.school.currencyCode || "USD";

  const load = React.useCallback(async (quiet = false) => {
    if (!tenant) return;
    if (quiet) setRefreshing(true);
    else setLoading(true);
    setError("");
    try {
      const search = new URLSearchParams({ tenant, query, role, status });
      if (staffMode) search.set("staffOnly", "true");
      const response = await fetch(`/api/tenant/admin/${staffMode ? "staff" : "users"}?${search.toString()}`, { cache: "no-store", credentials: "include" });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || "Failed to load records");
      setData(payload);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load records";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [query, role, staffMode, status, tenant]);

  React.useEffect(() => {
    const timer = window.setTimeout(() => void load(), 180);
    return () => window.clearTimeout(timer);
  }, [load]);

  const records = staffMode ? data?.staff || [] : data?.users || [];
  const roles = staffMode ? data?.staffRoles || [] : data?.roles || [];
  const pageHeader = (
    <section className="overflow-hidden rounded-3xl border bg-card shadow-sm">
      <div className="bg-[radial-gradient(circle_at_top_left,rgba(249,115,22,0.16),transparent_34%),linear-gradient(135deg,hsl(var(--card)),hsl(var(--muted)/.55))] p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Badge variant="outline" className="rounded-full">School admin</Badge>
            <h1 className="mt-3 text-3xl font-bold tracking-tight">{staffMode ? "Staff Management" : "Users"}</h1>
            <p className="mt-2 max-w-3xl text-sm text-muted-foreground">{staffMode ? "Create staff access, manage departments, roles, employee IDs, compensation periods, and activation state." : "Manage all tenant users, role assignments, dashboard access, departments, account status, and login routes."}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => void load(true)} disabled={refreshing || loading}><RefreshCw className={cn("mr-2 h-4 w-4", (refreshing || loading) && "animate-spin")} />Refresh</Button>
            {staffMode ? <Button className="bg-orange-600 text-white hover:bg-orange-700" onClick={() => setCreateOpen(true)}><Plus className="mr-2 h-4 w-4" />New Staff</Button> : null}
          </div>
        </div>
      </div>
    </section>
  );

  function openEdit(user: ManagedUser) {
    setEditing(user);
    setEditForm({ name: user.name, roleId: user.roleId, departmentId: user.departmentId || "", position: user.position || "", salary: user.salary ? String(user.salary) : "", salaryPeriod: user.salaryPeriod || "monthly" });
  }

  async function updateUser(userId: string, body: Record<string, unknown>, message: string) {
    setBusyId(userId);
    try {
      const response = await fetch(`/api/tenant/admin/users?tenant=${encodeURIComponent(tenant)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ userId, ...body }) });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || "Update failed");
      setData(payload);
      setEditing(null);
      toast.success(message);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    } finally {
      setBusyId("");
    }
  }

  async function createStaff() {
    setCreating(true);
    try {
      const response = await fetch(`/api/tenant/admin/staff?tenant=${encodeURIComponent(tenant)}`, { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(createForm) });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || "Staff creation failed");
      setAccessResult(payload);
      setCreateForm(emptyForm);
      setCreateOpen(false);
      await load(true);
      toast.success("Staff account created");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Staff creation failed");
    } finally {
      setCreating(false);
    }
  }

  if (loading) return <div className="space-y-6">{pageHeader}<div className="grid gap-4 md:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-3xl" />)}</div><Skeleton className="h-96 rounded-3xl" /></div>;

  if (error || !data) return <div className="space-y-6">{pageHeader}<Alert variant="destructive" className="rounded-3xl"><AlertCircle className="h-4 w-4" /><AlertTitle>{staffMode ? "Staff" : "Users"} failed to load</AlertTitle><AlertDescription className="mt-2 flex items-center justify-between gap-4"><span>{error || "No data returned."}</span><Button variant="outline" onClick={() => void load()}>Retry</Button></AlertDescription></Alert></div>;

  return (
    <div className="space-y-6">
      {pageHeader}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Metric icon={Users} label="Total" value={staffMode ? data.summary.staff : data.summary.total} />
        <Metric icon={UserCheck} label="Active" value={data.summary.active} />
        <Metric icon={UserCog} label={staffMode ? "Unassigned" : "Staff"} value={staffMode ? data.summary.unassigned : data.summary.staff} />
        <Metric icon={ShieldCheck} label={staffMode ? "Departments" : "Learners"} value={staffMode ? data.departments.length : data.summary.learners} />
      </div>

      <Card className="border-2">
        <CardContent className="grid gap-3 p-4 xl:grid-cols-[1fr_200px_170px]">
          <div className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, email, role, department, employee ID..." className="pl-9" /></div>
          <Select value={role} onValueChange={setRole}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All roles</SelectItem>{roles.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select>
          <Select value={status} onValueChange={setStatus}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All statuses</SelectItem><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent></Select>
        </CardContent>
      </Card>

      <Card className="border-2">
        <CardHeader><CardTitle>{staffMode ? "Staff Directory" : "User Directory"}</CardTitle><CardDescription>Tenant-scoped records with functional actions.</CardDescription></CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-2xl border">
            <table className="w-full min-w-[980px] text-sm">
              <thead className="bg-muted/70 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left">Name</th>
                  <th className="px-4 py-3 text-left">Role</th>
                  <th className="px-4 py-3 text-left">Department</th>
                  <th className="px-4 py-3 text-left">{staffMode ? "Employee ID" : "Identifier"}</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {records.map((user) => (
                  <tr key={user.id} className="border-t">
                    <td className="px-4 py-4">
                      <p className="font-semibold">{user.name}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </td>
                    <td className="px-4 py-4"><Badge variant="outline" className="rounded-full">{user.roleName}</Badge><p className="mt-1 text-xs text-muted-foreground">{user.dashboardPath}</p></td>
                    <td className="px-4 py-4"><p className="font-medium">{user.departmentName}</p><p className="text-xs text-muted-foreground">{user.position || "No position"}</p></td>
                    <td className="px-4 py-4"><p className="font-medium">{user.employeeId || user.admissionNumber || "Not assigned"}</p>{user.salary ? <p className="text-xs text-muted-foreground">{new Intl.NumberFormat("en", { style: "currency", currency }).format(user.salary)} · {user.salaryPeriod}</p> : null}</td>
                    <td className="px-4 py-4"><Badge variant="outline" className={cn("rounded-full", statusClass(user.isActive))}>{user.isActive ? "Active" : "Inactive"}</Badge></td>
                    <td className="px-4 py-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" disabled={busyId === user.id}><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                          <DropdownMenuItem asChild><Link href={`/${tenant}/admin/${staffMode ? "staff" : "users"}/${user.id}`}><Eye className="mr-2 h-4 w-4" />View details</Link></DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEdit(user)}><Edit3 className="mr-2 h-4 w-4" />Edit</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => navigator.clipboard.writeText(user.loginUrl).then(() => toast.success("Login URL copied"))}><Copy className="mr-2 h-4 w-4" />Copy login URL</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => updateUser(user.id, { action: "status", isActive: !user.isActive }, user.isActive ? "User deactivated" : "User activated")}><KeyRound className="mr-2 h-4 w-4" />{user.isActive ? "Deactivate" : "Activate"}</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => updateUser(user.id, { action: "status", isActive: false }, "User deactivated")}><Trash2 className="mr-2 h-4 w-4" />Deactivate user</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!records.length ? <div className="p-10 text-center text-sm text-muted-foreground">No records match the selected filters.</div> : null}
          </div>
        </CardContent>
      </Card>

      <Dialog open={Boolean(editing)} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit User</DialogTitle><DialogDescription>Update tenant role, department, position, and compensation metadata.</DialogDescription></DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name"><Input value={editForm.name} onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))} /></Field>
            <Field label="Role"><Select value={editForm.roleId} onValueChange={(value) => setEditForm((p) => ({ ...p, roleId: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{data.roles.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select></Field>
            <Field label="Department"><Select value={editForm.departmentId || "none"} onValueChange={(value) => setEditForm((p) => ({ ...p, departmentId: value === "none" ? "" : value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Unassigned</SelectItem>{data.departments.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select></Field>
            <Field label="Position"><Input value={editForm.position} onChange={(e) => setEditForm((p) => ({ ...p, position: e.target.value }))} /></Field>
            <Field label="Salary"><Input value={editForm.salary} onChange={(e) => setEditForm((p) => ({ ...p, salary: e.target.value.replace(/[^\d.]/g, "") }))} placeholder={money(editForm.salary, currency)} /></Field>
            <Field label="Billing period"><Select value={editForm.salaryPeriod} onValueChange={(value) => setEditForm((p) => ({ ...p, salaryPeriod: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="monthly">Monthly</SelectItem><SelectItem value="per_term">Per term</SelectItem><SelectItem value="per_year">Per year</SelectItem></SelectContent></Select></Field>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button><Button className="bg-orange-600 text-white hover:bg-orange-700" disabled={!editing || busyId === editing.id} onClick={() => editing && updateUser(editing.id, { action: "update", ...editForm }, "User updated")}>{busyId === editing?.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Create Staff Access</DialogTitle><DialogDescription>Create a tenant staff account with dashboard access and a temporary password.</DialogDescription></DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name"><Input value={createForm.name} onChange={(e) => setCreateForm((p) => ({ ...p, name: e.target.value }))} /></Field>
            <Field label="Email"><Input type="email" value={createForm.email} onChange={(e) => setCreateForm((p) => ({ ...p, email: e.target.value }))} /></Field>
            <Field label="Phone"><Input value={createForm.phone} onChange={(e) => setCreateForm((p) => ({ ...p, phone: e.target.value }))} /></Field>
            <Field label="Role"><Select value={createForm.roleId} onValueChange={(value) => setCreateForm((p) => ({ ...p, roleId: value }))}><SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger><SelectContent>{data.staffRoles.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select></Field>
            <Field label="Department"><Select value={createForm.departmentId || "administration"} onValueChange={(value) => setCreateForm((p) => ({ ...p, departmentId: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{data.departments.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select></Field>
            <Field label="Position"><Input value={createForm.position} onChange={(e) => setCreateForm((p) => ({ ...p, position: e.target.value }))} /></Field>
            <Field label="Employee ID"><Input value={createForm.employeeId} onChange={(e) => setCreateForm((p) => ({ ...p, employeeId: e.target.value.toUpperCase() }))} placeholder="Auto-generated if empty" /></Field>
            <Field label="Temporary password"><Input value={createForm.temporaryPassword} onChange={(e) => setCreateForm((p) => ({ ...p, temporaryPassword: e.target.value }))} placeholder="Auto-generated if empty" /></Field>
            <Field label="Compensation"><Input value={createForm.salary} onChange={(e) => setCreateForm((p) => ({ ...p, salary: e.target.value.replace(/[^\d.]/g, "") }))} placeholder="Optional amount" /></Field>
            <Field label="Billing period"><Select value={createForm.salaryPeriod} onValueChange={(value) => setCreateForm((p) => ({ ...p, salaryPeriod: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="monthly">Monthly</SelectItem><SelectItem value="per_term">Per term</SelectItem><SelectItem value="per_year">Per year</SelectItem></SelectContent></Select></Field>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setCreateOpen(false)} disabled={creating}>Cancel</Button><Button className="bg-orange-600 text-white hover:bg-orange-700" onClick={createStaff} disabled={creating || !createForm.name || !createForm.email || !createForm.roleId}>{creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}{creating ? "Creating..." : "Create Staff"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(accessResult)} onOpenChange={(open) => !open && setAccessResult(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Staff access created</DialogTitle><DialogDescription>Share these credentials securely. The user must change the password on first login.</DialogDescription></DialogHeader>
          <div className="space-y-3 rounded-3xl border bg-orange-500/10 p-4">
            <p className="font-bold">{accessResult?.user.name}</p>
            <p className="text-sm">Email: <strong>{accessResult?.user.email}</strong></p>
            <p className="text-sm">Temporary password: <strong>{accessResult?.temporaryPassword}</strong></p>
            <p className="break-all text-sm">Login: {accessResult?.loginUrl}</p>
            <p className="text-sm">Employee ID: <strong>{accessResult?.employeeId}</strong></p>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => accessResult && navigator.clipboard.writeText(`Login: ${accessResult.loginUrl}\nEmail: ${accessResult.user.email}\nTemporary password: ${accessResult.temporaryPassword}`).then(() => toast.success("Credentials copied"))}><Copy className="mr-2 h-4 w-4" />Copy</Button><Button onClick={() => setAccessResult(null)}>Close</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Metric({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: number }) {
  return <Card className="border-2"><CardContent className="flex items-center justify-between p-5"><div><p className="text-sm text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-bold">{value}</p></div><Icon className="h-7 w-7 text-orange-500" /></CardContent></Card>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-2"><Label>{label}</Label>{children}</div>;
}

function Detail({ label, value, copy = false }: { label: string; value: string; copy?: boolean }) {
  return (
    <div className="rounded-2xl border p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase text-muted-foreground">{label}</p>
          <p className="mt-1 break-words font-medium">{value || "Not set"}</p>
        </div>
        {copy ? <Button size="icon" variant="ghost" onClick={() => navigator.clipboard.writeText(value).then(() => toast.success("Copied"))}><Copy className="h-4 w-4" /></Button> : null}
      </div>
    </div>
  );
}
