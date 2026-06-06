"use client";

import * as React from "react";
import { AlertCircle, Check, Circle, RefreshCw, Save, Search, ShieldCheck, SlidersHorizontal, Users, Building2 } from "lucide-react";
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
type PermissionRole = {
  id: string;
  name: string;
  description: string;
  isSystem: boolean;
  canonicalRole: string;
  userCount: number;
  selectedPermissions: string[];
  selectedCount: number;
};
type PermissionsPayload = {
  groups: PermissionGroup[];
  roles: PermissionRole[];
  summary: { tenants: number; activeTenants: number; roles: number; permissions: number; assignments: number; usersCovered: number };
  generatedAt: string;
  propagated?: { tenantCount: number; touchedRoles: number };
};

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not set";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(date);
}

function LoadingState() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-48 rounded-3xl" />
      <div className="grid gap-4 md:grid-cols-4">{Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-28 rounded-3xl" />)}</div>
      <Skeleton className="h-[520px] rounded-3xl" />
    </div>
  );
}

export default function MasterPermissionsPage() {
  const [data, setData] = React.useState<PermissionsPayload | null>(null);
  const [drafts, setDrafts] = React.useState<Record<string, string[]>>({});
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [savingRole, setSavingRole] = React.useState("");
  const [error, setError] = React.useState("");
  const [query, setQuery] = React.useState("");

  const allPermissionIds = React.useMemo(() => data?.groups.flatMap((group) => group.permissions.map((permission) => permission.id)) || [], [data?.groups]);

  const fetchData = React.useCallback(async (silent = false) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/master/permissions", { credentials: "include", cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || "Failed to load platform permissions");
      setData(payload);
      setDrafts(Object.fromEntries(payload.roles.map((role: PermissionRole) => [role.id, role.selectedPermissions])));
    } catch (fetchError) {
      const message = fetchError instanceof Error ? fetchError.message : "Failed to load platform permissions";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    void fetchData();
  }, [fetchData]);

  function selectedFor(roleId: string) {
    return drafts[roleId] || [];
  }

  function isDirty(role: PermissionRole) {
    const original = new Set(role.selectedPermissions);
    const draft = new Set(selectedFor(role.id));
    if (original.size !== draft.size) return true;
    return Array.from(draft).some((id) => !original.has(id));
  }

  function togglePermission(roleId: string, permissionId: string) {
    setDrafts((current) => {
      const selected = new Set(current[roleId] || []);
      if (selected.has(permissionId)) selected.delete(permissionId);
      else selected.add(permissionId);
      return { ...current, [roleId]: Array.from(selected) };
    });
  }

  function setRoleAll(roleId: string, checked: boolean) {
    setDrafts((current) => ({ ...current, [roleId]: checked ? allPermissionIds : [] }));
  }

  async function saveRole(role: PermissionRole) {
    setSavingRole(role.id);
    try {
      const response = await fetch("/api/master/permissions", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roleId: role.id, selectedPermissions: selectedFor(role.id) }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || "Failed to save platform permissions");
      setData(payload);
      setDrafts(Object.fromEntries(payload.roles.map((item: PermissionRole) => [item.id, item.selectedPermissions])));
      const failedTenants = payload.propagated?.failedTenants?.length || 0;
      if (failedTenants) {
        toast.warning(`${role.name} saved, but ${failedTenants} tenant(s) need retry`);
      } else {
        toast.success(`${role.name} permissions saved and propagated to ${payload.propagated?.tenantCount || 0} tenants`);
      }
    } catch (saveError) {
      toast.error(saveError instanceof Error ? saveError.message : "Failed to save platform permissions");
    } finally {
      setSavingRole("");
    }
  }

  const filteredRoles = React.useMemo(() => {
    const text = query.toLowerCase();
    return (data?.roles || []).filter((role) => [role.name, role.description, role.canonicalRole].join(" ").toLowerCase().includes(text));
  }, [data?.roles, query]);

  if (loading) {
    return (
      <div className="space-y-6">
        <section className="rounded-3xl border border-border/70 bg-card/80 p-6 shadow-sm backdrop-blur">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <Badge className="rounded-full bg-primary/10 text-primary hover:bg-primary/10">Platform control</Badge>
              <h1 className="mt-4 flex items-center gap-3 text-3xl font-semibold tracking-tight">
                <ShieldCheck className="h-8 w-8 text-primary" />
                Global Permissions Manager
              </h1>
              <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
                Manage the default permission structure for every tenant. Saving a role updates the platform default and propagates that role's permissions across all tenant databases.
              </p>
            </div>
          </div>
        </section>
        <LoadingState />
      </div>
    );
  }

  if (error || !data) {
    return (
      <Alert variant="destructive" className="rounded-3xl">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Platform permissions unavailable</AlertTitle>
        <AlertDescription className="mt-2 flex items-center justify-between gap-4">
          <span>{error || "The platform permissions manager could not be loaded."}</span>
          <Button variant="outline" onClick={() => fetchData()}>Retry</Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-border/70 bg-card/80 p-6 shadow-sm backdrop-blur">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <Badge className="rounded-full bg-primary/10 text-primary hover:bg-primary/10">Platform control</Badge>
            <h1 className="mt-4 flex items-center gap-3 text-3xl font-semibold tracking-tight">
              <ShieldCheck className="h-8 w-8 text-primary" />
              Global Permissions Manager
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
              Manage the default permission structure for every tenant. Saving a role updates the platform default and propagates that role's permissions across all tenant databases.
            </p>
          </div>
          <div className="rounded-2xl border bg-background/60 p-4 text-sm">
            <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Generated</p>
            <p className="mt-2 font-semibold">{formatDate(data.generatedAt)}</p>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Tenants", value: data.summary.tenants, detail: `${data.summary.activeTenants} active`, icon: Building2 },
          { label: "Roles", value: data.summary.roles, detail: "Canonical tenant roles", icon: Users },
          { label: "Permission points", value: data.summary.permissions, detail: "Grouped access controls", icon: SlidersHorizontal },
          { label: "Assignments", value: data.summary.assignments, detail: `${data.summary.usersCovered} users covered`, icon: Check },
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

      <div className="flex flex-col gap-3 rounded-3xl border bg-card/80 p-4 shadow-sm md:flex-row md:items-center md:justify-between">
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search global roles..." className="rounded-2xl pl-9" />
        </div>
        <Button variant="outline" className="rounded-2xl" disabled={refreshing} onClick={() => fetchData(true)}>
          <RefreshCw className={cn("mr-2 h-4 w-4", refreshing && "animate-spin")} />
          Refresh
        </Button>
      </div>

      <div className="space-y-6">
        {filteredRoles.map((role) => {
          const selected = selectedFor(role.id);
          const selectedSet = new Set(selected);
          const allSelected = selected.length === allPermissionIds.length;
          const dirty = isDirty(role);
          return (
            <Card key={role.id} className="rounded-3xl border-border/70 bg-card/80 shadow-sm">
              <CardHeader className="border-b border-border/70">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex items-start gap-3">
                    <div className="mt-1 rounded-2xl bg-primary/10 p-2 text-primary"><ShieldCheck className="h-5 w-5" /></div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <CardTitle>{role.name}</CardTitle>
                        <Badge variant="secondary" className="rounded-full">System Default</Badge>
                        {dirty ? <Badge className="rounded-full bg-primary text-primary-foreground">Unsaved</Badge> : null}
                      </div>
                      <CardDescription className="mt-1">{role.description}</CardDescription>
                      <p className="mt-2 text-xs text-muted-foreground">{role.userCount} users across tenants · {selected.length}/{allPermissionIds.length} permissions enabled</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <Button variant="ghost" className="rounded-full" onClick={() => setRoleAll(role.id, !allSelected)}>
                      <span className={cn("mr-2 flex h-4 w-4 items-center justify-center rounded-full border", allSelected && "border-primary bg-primary text-primary-foreground")}>
                        {allSelected ? <Check className="h-3 w-3" /> : null}
                      </span>
                      Select All
                    </Button>
                    <Button className="rounded-2xl" disabled={savingRole === role.id || !dirty} onClick={() => saveRole(role)}>
                      <Save className={cn("mr-2 h-4 w-4", savingRole === role.id && "animate-pulse")} />
                      Save + Propagate
                    </Button>
                  </div>
                </div>
                <Progress value={(selected.length / Math.max(allPermissionIds.length, 1)) * 100} className="mt-4 h-2" />
              </CardHeader>
              <CardContent className="p-5">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  {data.groups.map((group) => {
                    const groupSelected = group.permissions.filter((permission) => selectedSet.has(permission.id)).length;
                    return (
                      <div key={group.id} className="rounded-2xl border border-border/70 bg-background/55 p-4">
                        <div className="mb-3 flex items-center gap-2 border-b border-border/70 pb-3">
                          <button
                            type="button"
                            className={cn("flex h-4 w-4 items-center justify-center rounded-full border transition-colors", groupSelected === group.permissions.length && "border-primary bg-primary text-primary-foreground")}
                            onClick={() => {
                              const next = new Set(selectedFor(role.id));
                              const shouldSelect = groupSelected !== group.permissions.length;
                              for (const permission of group.permissions) {
                                if (shouldSelect) next.add(permission.id);
                                else next.delete(permission.id);
                              }
                              setDrafts((current) => ({ ...current, [role.id]: Array.from(next) }));
                            }}
                          >
                            {groupSelected === group.permissions.length ? <Check className="h-3 w-3" /> : null}
                          </button>
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{group.title}</p>
                            <p className="text-[11px] text-muted-foreground">{groupSelected}/{group.permissions.length} enabled</p>
                          </div>
                        </div>
                        <div className="space-y-2">
                          {group.permissions.map((permission) => {
                            const checked = selectedSet.has(permission.id);
                            return (
                              <button key={permission.id} type="button" onClick={() => {
                                const selectedDraft = new Set(selectedFor(role.id));
                                if (selectedDraft.has(permission.id)) selectedDraft.delete(permission.id);
                                else selectedDraft.add(permission.id);
                                setDrafts((current) => ({ ...current, [role.id]: Array.from(selectedDraft) }));
                              }} className="flex w-full items-center gap-2 rounded-xl px-1.5 py-1.5 text-left text-sm transition-colors hover:bg-muted/70">
                                <span className={cn("flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-colors", checked ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40 text-muted-foreground")}>
                                  {checked ? <Check className="h-3 w-3" /> : <Circle className="h-2 w-2 opacity-0" />}
                                </span>
                                <span className={cn("truncate", checked ? "font-medium text-foreground" : "text-muted-foreground")}>{permission.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
