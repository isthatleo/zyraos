"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { AlertCircle, Check, Circle, Lock, RefreshCw, RotateCcw, Save, Search, ShieldCheck, SlidersHorizontal, Users } from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type PermissionItem = { id: string; label: string; resource: string; permission: string };
type PermissionGroup = { id: string; title: string; permissions: PermissionItem[] };
type PermissionRole = { id: string; name: string; description: string; isSystem: boolean; canonicalRole: string; userCount: number; selectedPermissions: string[]; selectedCount: number; editable: boolean };
type Payload = {
  school: { name: string; slug: string; type: string; status: string };
  groups: PermissionGroup[];
  roles: PermissionRole[];
  summary: { roles: number; permissions: number; assignments: number; usersCovered: number };
  policy: { requiredPermissionIds: string[]; ownerOnlyPermissionIds: string[]; ownerManagedRoleIds: string[]; actorRole: "owner" | "school_admin" };
  generatedAt: string;
};

function roleLabel(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function AdminPermissionsPage() {
  const params = useParams<{ tenant?: string }>();
  const tenant = params?.tenant || "";
  const [data, setData] = React.useState<Payload | null>(null);
  const [drafts, setDrafts] = React.useState<Record<string, string[]>>({});
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [savingRole, setSavingRole] = React.useState("");
  const [error, setError] = React.useState("");
  const [query, setQuery] = React.useState("");
  const [activeRole, setActiveRole] = React.useState("");

  const allPermissionIds = React.useMemo(() => data?.groups.flatMap((group) => group.permissions.map((permission) => permission.id)) || [], [data?.groups]);
  const grantablePermissionIds = React.useMemo(() => {
    if (!data) return [];
    return allPermissionIds.filter((id) => data.policy.actorRole === "owner" || !data.policy.ownerOnlyPermissionIds.includes(id));
  }, [allPermissionIds, data]);

  const load = React.useCallback(async (silent = false) => {
    if (!tenant) return;
    if (silent) setRefreshing(true);
    else setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/tenant/admin/permissions?tenant=${encodeURIComponent(tenant)}`, { credentials: "include", cache: "no-store" });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || "Failed to load permissions");
      setData(payload);
      setDrafts(Object.fromEntries(payload.roles.map((role: PermissionRole) => [role.id, role.selectedPermissions])));
      setActiveRole((current) => current || payload.roles[0]?.id || "");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load permissions";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [tenant]);

  React.useEffect(() => { void load(); }, [load]);

  const roles = React.useMemo(() => {
    const term = query.trim().toLowerCase();
    return (data?.roles || []).filter((role) => !term || [role.name, role.id, role.description, role.canonicalRole].join(" ").toLowerCase().includes(term));
  }, [data?.roles, query]);
  const role = roles.find((item) => item.id === activeRole) || roles[0];
  const selected = role ? drafts[role.id] || [] : [];
  const dirty = role ? selected.sort().join("|") !== [...role.selectedPermissions].sort().join("|") : false;
  const added = role ? selected.filter((id) => !role.selectedPermissions.includes(id)) : [];
  const removed = role ? role.selectedPermissions.filter((id) => !selected.includes(id)) : [];

  function toggle(roleId: string, permissionId: string) {
    if (!role?.editable) return;
    if (data?.policy.requiredPermissionIds.includes(permissionId) && selected.includes(permissionId)) {
      toast.error("This baseline permission is required for dashboard access");
      return;
    }
    if (data?.policy.actorRole !== "owner" && data?.policy.ownerOnlyPermissionIds.includes(permissionId)) {
      toast.error("Only the tenant owner can grant this permission");
      return;
    }
    setDrafts((current) => {
      const set = new Set(current[roleId] || []);
      if (set.has(permissionId)) set.delete(permissionId);
      else set.add(permissionId);
      return { ...current, [roleId]: Array.from(set) };
    });
  }

  async function save(roleId: string) {
    if (!role?.editable) {
      toast.error("This role is locked for your account");
      return;
    }
    setSavingRole(roleId);
    try {
      const response = await fetch(`/api/tenant/admin/permissions?tenant=${encodeURIComponent(tenant)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ roleId, selectedPermissions: drafts[roleId] || [] }) });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || "Failed to save permissions");
      setData(payload);
      setDrafts(Object.fromEntries(payload.roles.map((item: PermissionRole) => [item.id, item.selectedPermissions])));
      toast.success("Permissions saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save permissions");
    } finally {
      setSavingRole("");
    }
  }

  async function resetDefaults(roleId: string) {
    if (!role?.editable) {
      toast.error("This role is locked for your account");
      return;
    }
    if (!window.confirm(`Reset ${role.name} permissions to system defaults?`)) return;
    setSavingRole(roleId);
    try {
      const response = await fetch(`/api/tenant/admin/permissions?tenant=${encodeURIComponent(tenant)}`, { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ action: "reset_defaults", roleId }) });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || "Failed to reset permissions");
      setData(payload);
      setDrafts(Object.fromEntries(payload.roles.map((item: PermissionRole) => [item.id, item.selectedPermissions])));
      toast.success("Permissions reset to defaults");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to reset permissions");
    } finally {
      setSavingRole("");
    }
  }

  if (loading) return <div className="space-y-6"><Skeleton className="h-48 rounded-3xl" /><div className="grid gap-4 md:grid-cols-4">{Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-28 rounded-3xl" />)}</div><Skeleton className="h-[520px] rounded-3xl" /></div>;

  if (error || !data) return <Alert variant="destructive" className="rounded-3xl"><AlertCircle className="h-4 w-4" /><AlertTitle>Permissions unavailable</AlertTitle><AlertDescription className="mt-2 flex items-center justify-between gap-4"><span>{error || "No permissions data returned."}</span><Button variant="outline" onClick={() => void load()}>Retry</Button></AlertDescription></Alert>;

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-3xl border bg-card shadow-sm">
        <div className="bg-[radial-gradient(circle_at_top_left,rgba(249,115,22,0.16),transparent_34%),linear-gradient(135deg,hsl(var(--card)),hsl(var(--muted)/.55))] p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <Badge variant="outline" className="rounded-full">School admin governance</Badge>
              <h1 className="mt-3 text-3xl font-bold tracking-tight">Permissions</h1>
              <p className="mt-2 max-w-3xl text-sm text-muted-foreground">Manage tenant role capabilities across academics, users, finance, facilities, communications, and governance.</p>
            </div>
            <Button variant="outline" disabled={refreshing} onClick={() => void load(true)}><RefreshCw className={cn("mr-2 h-4 w-4", refreshing && "animate-spin")} />Refresh</Button>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Metric icon={ShieldCheck} label="Roles" value={data.summary.roles} />
        <Metric icon={SlidersHorizontal} label="Permissions" value={data.summary.permissions} />
        <Metric icon={Check} label="Assignments" value={data.summary.assignments} />
        <Metric icon={Users} label="Users covered" value={data.summary.usersCovered} />
      </div>

      <Alert className="rounded-3xl border-2">
        <Lock className="h-4 w-4" />
        <AlertTitle>Permission boundary</AlertTitle>
        <AlertDescription>
          You are managing permissions as {roleLabel(data.policy.actorRole)}. Owner-managed roles and sensitive capabilities are locked unless the signed-in tenant owner is making the change.
        </AlertDescription>
      </Alert>

      <div className="grid gap-5 xl:grid-cols-[340px_1fr]">
        <Card className="border-2">
          <CardHeader><CardTitle>Roles</CardTitle><CardDescription>Select a role to edit permissions.</CardDescription></CardHeader>
          <CardContent className="space-y-3">
            <div className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search roles..." className="pl-9" /></div>
            <div className="max-h-[620px] space-y-2 overflow-y-auto pr-1">
              {roles.map((item) => {
                const count = (drafts[item.id] || []).length;
                return (
                  <button key={item.id} onClick={() => setActiveRole(item.id)} className={cn("w-full rounded-2xl border p-3 text-left transition hover:bg-muted", role?.id === item.id && "border-orange-500 bg-orange-500/10")}>
                    <div className="flex items-center justify-between gap-3"><p className="font-bold">{item.name}</p><Badge variant="outline" className="rounded-full">{item.userCount} users</Badge></div>
                    <p className="mt-1 text-xs text-muted-foreground">{roleLabel(item.canonicalRole)} · {count}/{allPermissionIds.length} permissions</p>
                    {!item.editable ? <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground"><Lock className="h-3 w-3" /> Locked</p> : null}
                    <Progress value={allPermissionIds.length ? (count / allPermissionIds.length) * 100 : 0} className="mt-3 h-2" />
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardHeader>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div><CardTitle>{role?.name || "Role"}</CardTitle><CardDescription>{role?.description || "Configure the selected role permissions."}</CardDescription></div>
              {role ? <div className="flex flex-wrap gap-2"><Button variant="outline" disabled={!role.editable} onClick={() => setDrafts((current) => ({ ...current, [role.id]: Array.from(new Set([...grantablePermissionIds, ...data.policy.requiredPermissionIds])) }))}>Select allowed</Button><Button variant="outline" disabled={!role.editable} onClick={() => setDrafts((current) => ({ ...current, [role.id]: role.selectedPermissions }))}>Undo</Button><Button variant="outline" disabled={!role.editable || savingRole === role.id} onClick={() => resetDefaults(role.id)}><RotateCcw className="mr-2 h-4 w-4" />Defaults</Button><Button className="bg-orange-600 text-white hover:bg-orange-700" disabled={!role.editable || !dirty || savingRole === role.id} onClick={() => save(role.id)}>{savingRole === role.id ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}Save</Button></div> : null}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {role && dirty ? (
              <Alert className="rounded-2xl">
                <ShieldCheck className="h-4 w-4" />
                <AlertTitle>Pending permission changes</AlertTitle>
                <AlertDescription>{added.length} added, {removed.length} removed. Saving writes an audit log with before/after permission IDs.</AlertDescription>
              </Alert>
            ) : null}
            {role ? data.groups.map((group) => (
              <div key={group.id} className="rounded-3xl border p-4">
                <div className="mb-3 flex items-center justify-between gap-3"><h3 className="font-bold">{group.title}</h3><Badge variant="outline" className="rounded-full">{group.permissions.filter((permission) => selected.includes(permission.id)).length}/{group.permissions.length}</Badge></div>
                <div className="grid gap-2 md:grid-cols-2">
                  {group.permissions.map((permission) => {
                    const checked = selected.includes(permission.id);
                    const required = data.policy.requiredPermissionIds.includes(permission.id);
                    const ownerOnly = data.policy.ownerOnlyPermissionIds.includes(permission.id);
                    const locked = !role.editable || required || (data.policy.actorRole !== "owner" && ownerOnly);
                    return (
                      <button key={permission.id} disabled={locked && !required} onClick={() => toggle(role.id, permission.id)} className={cn("flex items-start gap-3 rounded-2xl border p-3 text-left transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-70", checked && "border-orange-500 bg-orange-500/10")}>
                        {checked ? <Check className="mt-0.5 h-4 w-4 text-orange-600" /> : <Circle className="mt-0.5 h-4 w-4 text-muted-foreground" />}
                        <span>
                          <span className="block font-semibold">{permission.label}</span>
                          <span className="text-xs text-muted-foreground">{permission.resource}:{permission.permission}</span>
                          {required || ownerOnly || !role.editable ? (
                            <span className="mt-2 flex flex-wrap gap-1">
                              {required ? <Badge variant="outline" className="rounded-full text-[10px]">required</Badge> : null}
                              {ownerOnly ? <Badge variant="outline" className="rounded-full text-[10px]">owner-only</Badge> : null}
                              {!role.editable ? <Badge variant="outline" className="rounded-full text-[10px]">locked role</Badge> : null}
                            </span>
                          ) : null}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )) : <p className="text-sm text-muted-foreground">Select a role to manage permissions.</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Metric({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: number }) {
  return <Card className="border-2"><CardContent className="flex items-center justify-between p-5"><div><p className="text-sm text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-bold">{value.toLocaleString()}</p></div><Icon className="h-7 w-7 text-orange-500" /></CardContent></Card>;
}
