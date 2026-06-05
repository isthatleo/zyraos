"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  Copy,
  KeyRound,
  LockKeyhole,
  Mail,
  MoreHorizontal,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserCog,
  UserX,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

type OwnerUser = {
  id: string;
  name: string;
  email: string;
  image: string | null;
  roleId: string;
  roleName: string;
  roleDescription: string;
  canonicalRole: string;
  portal: string;
  dashboardPath: string;
  departmentId: string | null;
  departmentName: string;
  isActive: boolean;
  createdAt: string | null;
  updatedAt: string | null;
  employeeId: string;
  position: string;
  staffStatus: string;
  admissionNumber: string;
  studentStatus: string;
  guardianLinks: number;
  forcePasswordChange: boolean;
  passwordLastChangedAt: string | null;
  temporaryPasswordIssuedAt: string | null;
  loginUrl: string;
};

type UsersPayload = {
  school: { name: string; slug: string; type: string; status: string };
  users: OwnerUser[];
  departments: Array<{ id: string; name: string; headId?: string | null }>;
  roles: Array<{ id: string; name: string; description: string; isSystem: boolean; canonicalRole: string; portal: string; dashboardPath: string }>;
  summary: {
    total: number;
    active: number;
    inactive: number;
    staff: number;
    learners: number;
    guardians: number;
    forcePasswordChange: number;
    unassigned: number;
    byCanonicalRole: Record<string, number>;
  };
  generatedAt: string;
  temporaryPassword?: string;
  loginUrl?: string;
  delivery?: { ok?: boolean; status?: string; message?: string };
};

function initials(name: string) {
  return name.split(" ").map((part) => part[0]).join("").toUpperCase().slice(0, 2) || "U";
}

function formatDate(value: string | null) {
  if (!value) return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not set";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

function statusClass(active: boolean) {
  return active ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "border-destructive/25 bg-destructive/10 text-destructive";
}

function roleLabel(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function LoadingState() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-52 rounded-3xl" />
      <div className="grid gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-28 rounded-3xl" />)}
      </div>
      <Skeleton className="h-96 rounded-3xl" />
    </div>
  );
}

export default function OwnerUsersPage() {
  const params = useParams<{ tenant?: string }>();
  const tenantSlug = params?.tenant || "";
  const [data, setData] = React.useState<UsersPayload | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState("");
  const [query, setQuery] = React.useState("");
  const [roleFilter, setRoleFilter] = React.useState("all");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [selected, setSelected] = React.useState<OwnerUser | null>(null);
  const [editOpen, setEditOpen] = React.useState(false);
  const [resetResult, setResetResult] = React.useState<{ temporaryPassword: string; loginUrl: string } | null>(null);
  const [form, setForm] = React.useState({ name: "", email: "", roleId: "", departmentId: "none", image: "" });

  const fetchData = React.useCallback(async (silent = false) => {
    if (!tenantSlug) return;
    if (silent) setRefreshing(true);
    else setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/tenant/owner/users?tenant=${encodeURIComponent(tenantSlug)}`, { credentials: "include", cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || "Failed to load owner users");
      setData(payload);
    } catch (fetchError) {
      const message = fetchError instanceof Error ? fetchError.message : "Failed to load owner users";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [tenantSlug]);

  React.useEffect(() => {
    void fetchData();
  }, [fetchData]);

  function openEdit(user: OwnerUser) {
    setSelected(user);
    setForm({
      name: user.name,
      email: user.email,
      roleId: user.roleId,
      departmentId: user.departmentId || "none",
      image: user.image || "",
    });
    setEditOpen(true);
  }

  async function mutate(method: "PATCH" | "DELETE", body: Record<string, unknown>, success: string) {
    try {
      const response = await fetch(`/api/tenant/owner/users?tenant=${encodeURIComponent(tenantSlug)}`, {
        method,
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || "User update failed");
      setData(payload);
      if (payload.temporaryPassword && payload.loginUrl) setResetResult({ temporaryPassword: payload.temporaryPassword, loginUrl: payload.loginUrl });
      toast.success(success);
      return true;
    } catch (mutationError) {
      toast.error(mutationError instanceof Error ? mutationError.message : "User update failed");
      return false;
    }
  }

  const filteredUsers = React.useMemo(() => {
    const text = query.toLowerCase();
    return (data?.users || []).filter((user) => {
      const matchesQuery = [user.name, user.email, user.roleName, user.departmentName, user.employeeId, user.admissionNumber].join(" ").toLowerCase().includes(text);
      const matchesRole = roleFilter === "all" || user.canonicalRole === roleFilter || user.roleId === roleFilter;
      const matchesStatus = statusFilter === "all" || (statusFilter === "active" ? user.isActive : !user.isActive);
      return matchesQuery && matchesRole && matchesStatus;
    });
  }, [data?.users, query, roleFilter, statusFilter]);

  const riskUsers = React.useMemo(() => (data?.users || []).filter((user) => !user.isActive || user.forcePasswordChange || (!user.departmentId && !["student", "parent"].includes(user.canonicalRole))), [data?.users]);

  if (loading) return <LoadingState />;

  if (error || !data) {
    return (
      <Alert variant="destructive" className="rounded-3xl">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>User management unavailable</AlertTitle>
        <AlertDescription className="mt-2 flex items-center justify-between gap-4">
          <span>{error || "The owner users page could not be loaded."}</span>
          <Button variant="outline" onClick={() => fetchData()}>Retry</Button>
        </AlertDescription>
      </Alert>
    );
  }

  const roleOptions = Array.from(new Set(data.users.map((user) => user.canonicalRole))).sort();

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-3xl border border-border/70 bg-card/80 shadow-sm backdrop-blur">
        <div className="grid gap-6 p-6 lg:grid-cols-[1fr_340px]">
          <div>
            <Badge className="rounded-full bg-primary/10 text-primary hover:bg-primary/10">Owner user management</Badge>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight">Users</h1>
            <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
              Govern all tenant user accounts, role assignments, access state, login portals, departments, and temporary password resets from one owner-level directory.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border bg-background/60 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Tenant</p>
                <p className="mt-2 font-semibold">{data.school.name}</p>
              </div>
              <div className="rounded-2xl border bg-background/60 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Education type</p>
                <p className="mt-2 font-semibold capitalize">{data.school.type}</p>
              </div>
              <div className="rounded-2xl border bg-background/60 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Generated</p>
                <p className="mt-2 font-semibold">{formatDate(data.generatedAt)}</p>
              </div>
            </div>
          </div>
          <Card className="border-border/70 bg-background/70">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" /> Access health</CardTitle>
              <CardDescription>Active users compared with total directory accounts.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-semibold">{data.summary.total ? Math.round((data.summary.active / data.summary.total) * 100) : 0}%</div>
              <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-2xl border bg-card p-3"><p className="text-muted-foreground">Forced resets</p><p className="text-xl font-semibold">{data.summary.forcePasswordChange}</p></div>
                <div className="rounded-2xl border bg-card p-3"><p className="text-muted-foreground">Unassigned</p><p className="text-xl font-semibold">{data.summary.unassigned}</p></div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Total users", value: data.summary.total, detail: `${data.summary.active} active`, icon: Users },
          { label: "Staff accounts", value: data.summary.staff, detail: "Includes owner/admin/support", icon: UserCog },
          { label: "Learners", value: data.summary.learners, detail: `${data.summary.guardians} guardians`, icon: UserCheck },
          { label: "Inactive accounts", value: data.summary.inactive, detail: "Disabled from tenant access", icon: UserX },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="border-border/70 bg-card/80 shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div><p className="text-sm text-muted-foreground">{stat.label}</p><p className="mt-2 text-2xl font-semibold">{stat.value.toLocaleString()}</p></div>
                  <div className="rounded-2xl bg-primary/10 p-3 text-primary"><Icon className="h-5 w-5" /></div>
                </div>
                <p className="mt-4 text-xs text-muted-foreground">{stat.detail}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex flex-col gap-3 rounded-3xl border bg-card/80 p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search users, roles, departments..." className="rounded-2xl pl-9" />
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-44 rounded-2xl"><SelectValue placeholder="Role" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All roles</SelectItem>
              {roleOptions.map((role) => <SelectItem key={role} value={role}>{roleLabel(role)}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40 rounded-2xl"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent><SelectItem value="all">All status</SelectItem><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent>
          </Select>
          <Button variant="outline" className="rounded-2xl" disabled={refreshing} onClick={() => fetchData(true)}>
            <RefreshCw className={cn("mr-2 h-4 w-4", refreshing && "animate-spin")} /> Refresh
          </Button>
        </div>
      </div>

      {resetResult ? (
        <Alert className="rounded-3xl border-primary/30 bg-primary/5">
          <KeyRound className="h-4 w-4 text-primary" />
          <AlertTitle>Temporary access generated</AlertTitle>
          <AlertDescription className="mt-2 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <span>Password: <strong>{resetResult.temporaryPassword}</strong> · Login: {resetResult.loginUrl}</span>
            <Button variant="outline" className="rounded-2xl" onClick={() => {
              navigator.clipboard.writeText(`Login: ${resetResult.loginUrl}\nTemporary password: ${resetResult.temporaryPassword}`);
              toast.success("Access details copied");
            }}><Copy className="mr-2 h-4 w-4" /> Copy</Button>
          </AlertDescription>
        </Alert>
      ) : null}

      <Tabs defaultValue="directory" className="space-y-5">
        <TabsList className="mx-auto flex w-fit rounded-full bg-muted/60 p-1">
          <TabsTrigger value="directory" className="rounded-full px-5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Directory</TabsTrigger>
          <TabsTrigger value="roles" className="rounded-full px-5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Roles</TabsTrigger>
          <TabsTrigger value="risks" className="rounded-full px-5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Access Risks</TabsTrigger>
        </TabsList>

        <TabsContent value="directory" className="space-y-4">
          {filteredUsers.map((user) => (
            <Card key={user.id} className="border-border/70 bg-card/80 shadow-sm">
              <CardContent className="flex flex-col gap-4 p-5 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex min-w-0 items-center gap-4">
                  <Avatar className="h-12 w-12 border">
                    <AvatarImage src={user.image || undefined} alt={user.name} />
                    <AvatarFallback>{initials(user.name)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-semibold">{user.name}</p>
                      <Badge variant="outline" className={statusClass(user.isActive)}>{user.isActive ? "active" : "inactive"}</Badge>
                      {user.forcePasswordChange ? <Badge variant="outline" className="border-primary/25 bg-primary/10 text-primary">password reset required</Badge> : null}
                    </div>
                    <p className="truncate text-sm text-muted-foreground">{user.email}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{user.roleName} · {user.departmentName} · {user.portal}</p>
                  </div>
                </div>
                <div className="grid gap-3 text-sm sm:grid-cols-3 xl:min-w-[460px]">
                  <div className="rounded-2xl border bg-background/60 p-3"><p className="text-muted-foreground">Created</p><p className="font-medium">{formatDate(user.createdAt)}</p></div>
                  <div className="rounded-2xl border bg-background/60 p-3"><p className="text-muted-foreground">Dashboard</p><p className="truncate font-medium">{user.dashboardPath}</p></div>
                  <div className="rounded-2xl border bg-background/60 p-3"><p className="text-muted-foreground">Identity</p><p className="font-medium">{user.employeeId || user.admissionNumber || `${user.guardianLinks} guardian links`}</p></div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild><Button variant="outline" size="icon" className="rounded-2xl"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuItem onClick={() => openEdit(user)}><UserCog className="mr-2 h-4 w-4" /> Edit user</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => mutate("PATCH", { userId: user.id, action: user.isActive ? "deactivate" : "activate" }, user.isActive ? "User deactivated" : "User activated")}>
                      {user.isActive ? <UserX className="mr-2 h-4 w-4" /> : <UserCheck className="mr-2 h-4 w-4" />}
                      {user.isActive ? "Deactivate" : "Activate"}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => mutate("PATCH", { userId: user.id, action: "reset_access" }, "Temporary access generated")}><LockKeyhole className="mr-2 h-4 w-4" /> Reset access</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => {
                      navigator.clipboard.writeText(user.loginUrl);
                      toast.success("Login URL copied");
                    }}><Copy className="mr-2 h-4 w-4" /> Copy login URL</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive" onClick={() => mutate("DELETE", { userId: user.id }, "User deleted")}><Trash2 className="mr-2 h-4 w-4" /> Delete user</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="roles" className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.roles.map((role) => (
            <Card key={role.id} className="border-border/70 bg-card/80">
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div><CardTitle>{role.name}</CardTitle><CardDescription>{role.description || "No description recorded."}</CardDescription></div>
                  <Badge variant="secondary" className="rounded-full">{data.summary.byCanonicalRole[role.canonicalRole] || 0}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Canonical</span><span>{roleLabel(role.canonicalRole)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Portal</span><span>{role.portal}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Dashboard</span><span className="max-w-40 truncate">{role.dashboardPath}</span></div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="risks" className="space-y-4">
          {riskUsers.length ? riskUsers.map((user) => (
            <Card key={user.id} className="border-border/70 bg-card/80">
              <CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-3">
                  <Avatar><AvatarImage src={user.image || undefined} /><AvatarFallback>{initials(user.name)}</AvatarFallback></Avatar>
                  <div><p className="font-semibold">{user.name}</p><p className="text-sm text-muted-foreground">{user.email}</p></div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {!user.isActive ? <Badge variant="outline" className={statusClass(false)}>inactive</Badge> : null}
                  {user.forcePasswordChange ? <Badge variant="outline" className="border-primary/25 bg-primary/10 text-primary">forced password change</Badge> : null}
                  {!user.departmentId && !["student", "parent"].includes(user.canonicalRole) ? <Badge variant="outline">no department</Badge> : null}
                  <Button variant="outline" className="rounded-2xl" onClick={() => openEdit(user)}>Resolve</Button>
                </div>
              </CardContent>
            </Card>
          )) : (
            <Card className="border-border/70 bg-card/80"><CardContent className="p-8 text-center text-muted-foreground">No account risks detected.</CardContent></Card>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl rounded-3xl">
          <DialogHeader>
            <DialogTitle>Edit user</DialogTitle>
            <DialogDescription>Update tenant identity, role, department, and avatar URL. Password resets are handled separately from the action menu.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2"><Label>Name</Label><Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></div>
            <div className="space-y-2"><Label>Email</Label><Input value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={form.roleId} onValueChange={(value) => setForm({ ...form, roleId: value })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{data.roles.map((role) => <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Department</Label>
              <Select value={form.departmentId} onValueChange={(value) => setForm({ ...form, departmentId: value })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {data.departments.map((department) => <SelectItem key={department.id} value={department.id}>{department.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2"><Label>Avatar URL</Label><Input value={form.image} onChange={(event) => setForm({ ...form, image: event.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-2xl" onClick={() => selected && mutate("PATCH", { userId: selected.id, action: selected.isActive ? "deactivate" : "activate" }, selected.isActive ? "User deactivated" : "User activated")}>
              {selected?.isActive ? <UserX className="mr-2 h-4 w-4" /> : <UserCheck className="mr-2 h-4 w-4" />}
              {selected?.isActive ? "Deactivate" : "Activate"}
            </Button>
            <Button className="rounded-2xl" onClick={async () => {
              if (!selected) return;
              const ok = await mutate("PATCH", { userId: selected.id, action: "update", ...form, departmentId: form.departmentId === "none" ? "" : form.departmentId }, "User updated");
              if (ok) setEditOpen(false);
            }}><CheckCircle2 className="mr-2 h-4 w-4" /> Save changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
