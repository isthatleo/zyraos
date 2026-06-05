"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { ArrowLeft, GraduationCap, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";
import { normalizeRole, roleLabels, roleLoginMeta, type CanonicalRole, type TenantRoleDefinition } from "@/lib/roles";
import { getTenantSubdomain } from "@/lib/tenant-routing";

type TenantPortalLoginProps = {
  title: string;
  description: string;
  roles: CanonicalRole[];
  defaultRole: CanonicalRole;
  showAdminShortcut?: boolean;
  tenantSlugOverride?: string;
};

function formatTenantName(slug: string) {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getTenantPath(tenantSlug: string, path: string, isSubdomain: boolean) {
  if (isSubdomain) return path;
  return tenantSlug ? `/${tenantSlug}${path}` : path;
}

const roleVisuals: Partial<Record<CanonicalRole, { color: string; bg: string }>> = {
  owner: { color: "text-indigo-600", bg: "bg-indigo-50 group-hover:bg-indigo-100 dark:bg-indigo-950/40 dark:group-hover:bg-indigo-900/50" },
  school_admin: { color: "text-sky-600", bg: "bg-sky-50 group-hover:bg-sky-100 dark:bg-sky-950/40 dark:group-hover:bg-sky-900/50" },
  teacher: { color: "text-blue-600", bg: "bg-blue-50 group-hover:bg-blue-100 dark:bg-blue-950/40 dark:group-hover:bg-blue-900/50" },
  student: { color: "text-emerald-600", bg: "bg-emerald-50 group-hover:bg-emerald-100 dark:bg-emerald-950/40 dark:group-hover:bg-emerald-900/50" },
  parent: { color: "text-pink-600", bg: "bg-pink-50 group-hover:bg-pink-100 dark:bg-pink-950/40 dark:group-hover:bg-pink-900/50" },
  finance: { color: "text-amber-600", bg: "bg-amber-50 group-hover:bg-amber-100 dark:bg-amber-950/40 dark:group-hover:bg-amber-900/50" },
  librarian: { color: "text-purple-600", bg: "bg-purple-50 group-hover:bg-purple-100 dark:bg-purple-950/40 dark:group-hover:bg-purple-900/50" },
  hr: { color: "text-cyan-600", bg: "bg-cyan-50 group-hover:bg-cyan-100 dark:bg-cyan-950/40 dark:group-hover:bg-cyan-900/50" },
  canteen: { color: "text-orange-600", bg: "bg-orange-50 group-hover:bg-orange-100 dark:bg-orange-950/40 dark:group-hover:bg-orange-900/50" },
  admissions_officer: { color: "text-teal-600", bg: "bg-teal-50 group-hover:bg-teal-100 dark:bg-teal-950/40 dark:group-hover:bg-teal-900/50" },
  registrar: { color: "text-violet-600", bg: "bg-violet-50 group-hover:bg-violet-100 dark:bg-violet-950/40 dark:group-hover:bg-violet-900/50" },
  exam_officer: { color: "text-rose-600", bg: "bg-rose-50 group-hover:bg-rose-100 dark:bg-rose-950/40 dark:group-hover:bg-rose-900/50" },
  department_head: { color: "text-slate-600", bg: "bg-slate-100 group-hover:bg-slate-200 dark:bg-slate-800 dark:group-hover:bg-slate-700" },
  class_teacher: { color: "text-lime-600", bg: "bg-lime-50 group-hover:bg-lime-100 dark:bg-lime-950/40 dark:group-hover:bg-lime-900/50" },
  nurse: { color: "text-red-600", bg: "bg-red-50 group-hover:bg-red-100 dark:bg-red-950/40 dark:group-hover:bg-red-900/50" },
  transport_manager: { color: "text-yellow-600", bg: "bg-yellow-50 group-hover:bg-yellow-100 dark:bg-yellow-950/40 dark:group-hover:bg-yellow-900/50" },
  hostel_warden: { color: "text-fuchsia-600", bg: "bg-fuchsia-50 group-hover:bg-fuchsia-100 dark:bg-fuchsia-950/40 dark:group-hover:bg-fuchsia-900/50" },
  security: { color: "text-zinc-600", bg: "bg-zinc-100 group-hover:bg-zinc-200 dark:bg-zinc-800 dark:group-hover:bg-zinc-700" },
  procurement: { color: "text-green-600", bg: "bg-green-50 group-hover:bg-green-100 dark:bg-green-950/40 dark:group-hover:bg-green-900/50" },
  inventory_manager: { color: "text-stone-600", bg: "bg-stone-100 group-hover:bg-stone-200 dark:bg-stone-800 dark:group-hover:bg-stone-700" },
  counselor: { color: "text-emerald-600", bg: "bg-emerald-50 group-hover:bg-emerald-100 dark:bg-emerald-950/40 dark:group-hover:bg-emerald-900/50" },
  alumni_officer: { color: "text-blue-600", bg: "bg-blue-50 group-hover:bg-blue-100 dark:bg-blue-950/40 dark:group-hover:bg-blue-900/50" },
};

export function TenantPortalLogin({
  title,
  description,
  roles,
  defaultRole,
  showAdminShortcut = false,
  tenantSlugOverride,
}: TenantPortalLoginProps) {
  const params = useParams<{ tenant?: string }>();
  const searchParams = useSearchParams();
  const tenantSlug = tenantSlugOverride || params?.tenant || "";
  const requestedRole = searchParams?.get("role");
  const [tenantName, setTenantName] = React.useState(formatTenantName(tenantSlug) || "School Portal");
  const [tenantRoles, setTenantRoles] = React.useState<TenantRoleDefinition[]>([]);
  const [selectedRole, setSelectedRole] = React.useState<CanonicalRole | null>(null);
  const [selectedRoleId, setSelectedRoleId] = React.useState<string>("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState("");
  const [rolesError, setRolesError] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);
  const [isTenantSubdomain, setIsTenantSubdomain] = React.useState(false);

  const roleOptions = React.useMemo(() => {
    const tenantOptions = tenantRoles.filter((role) => roles.includes(role.canonicalRole));
    if (tenantOptions.length) return tenantOptions;

    return roles.map((role) => ({
      id: role,
      canonicalRole: role,
      name: roleLabels[role],
      description: roleLoginMeta[role].subtitle,
      portal: "staff",
      dashboardPath: roleLoginMeta[role].redirectPath,
      isSystem: true,
    })) satisfies TenantRoleDefinition[];
  }, [roles, tenantRoles]);

  React.useEffect(() => {
    setMounted(true);
    const subdomain = Boolean(getTenantSubdomain(window.location.hostname));
    setIsTenantSubdomain(subdomain);
    try {
      document.cookie = `x-tenant-slug=${tenantSlug}; path=/; SameSite=Lax`;
      sessionStorage.setItem("active_tenant_slug", tenantSlug);
      sessionStorage.setItem("active_tenant_name", tenantName);
    } catch {}
  }, [tenantName, tenantSlug]);

  React.useEffect(() => {
    let cancelled = false;

    async function loadRoles() {
      if (!tenantSlug) return;
      try {
        setRolesError("");
        const response = await fetch(`/api/tenant/roles?tenant=${tenantSlug}`, { cache: "no-store" });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || "Failed to load tenant roles");
        if (cancelled) return;
        setTenantName(data.tenant?.name || formatTenantName(tenantSlug));
        setTenantRoles(data.roles || []);
      } catch (loadError) {
        console.error("Error loading tenant roles:", loadError);
        if (!cancelled) {
          setRolesError(loadError instanceof Error ? loadError.message : "Failed to load tenant roles");
        }
      }
    }

    void loadRoles();
    return () => {
      cancelled = true;
    };
  }, [tenantSlug]);

  React.useEffect(() => {
    if (!requestedRole || !roleOptions.length) return;
    const normalized = normalizeRole(requestedRole);
    const match = roleOptions.find((role) => role.id === requestedRole || role.canonicalRole === normalized);
    if (match && roles.includes(match.canonicalRole)) {
      setSelectedRole(match.canonicalRole);
      setSelectedRoleId(match.id);
    }
  }, [requestedRole, roleOptions, roles]);

  const roleConfig = selectedRole ? roleLoginMeta[selectedRole] : null;
  const dashboardPath = selectedRole ? getTenantPath(tenantSlug, roleConfig?.redirectPath || roleLoginMeta[defaultRole].redirectPath, isTenantSubdomain) : "";
  const roleSelectionHref = getTenantPath(tenantSlug, "/login", isTenantSubdomain);
  const adminHref = getTenantPath(tenantSlug, "/admins", isTenantSubdomain);

  const openRole = (role: TenantRoleDefinition) => {
    setSelectedRole(role.canonicalRole);
    setSelectedRoleId(role.id);
    setError("");
  };

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedRole || loading) return;
    if (!email || !password) {
      setError("Email and password are required.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const result = await authClient.signIn.email({ email, password });
      if (result.error) {
        setError(result.error.message || "Invalid login credentials.");
        return;
      }

      const roleResponse = await fetch("/api/auth/tenant-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, tenantSlug, requestedRole: selectedRoleId || selectedRole }),
      });
      const roleData = await roleResponse.json().catch(() => ({}));
      if (!roleResponse.ok) {
        await authClient.signOut().catch(() => null);
        setError(roleData.error || "This account is not allowed to access this tenant portal.");
        return;
      }

      const passwordStatus = await fetch("/api/auth/password-status", {
        cache: "no-store",
        credentials: "include",
      }).then((response) => response.json()).catch(() => null);

      if (passwordStatus?.mustChangePassword) {
        const completeAccessPath = getTenantPath(tenantSlug, "/complete-access", isTenantSubdomain);
        const params = new URLSearchParams({ redirect: dashboardPath, role: roleData.role || selectedRole });
        window.location.assign(`${completeAccessPath}?${params.toString()}`);
        return;
      }

      toast.success("Signed in successfully");
      window.location.assign(dashboardPath);
    } catch (loginError: any) {
      setError(loginError?.message || "Sign-in failed.");
    } finally {
      setLoading(false);
    }
  };

  if (!selectedRole || !roleConfig) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center bg-muted p-6">
        <div className="mb-10 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
            <GraduationCap className="size-7" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">{tenantName || title}</h1>
          <p className="mt-2 text-lg text-muted-foreground">Select your role to continue</p>
          <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">{description}</p>
        </div>

        {rolesError ? (
          <div className="mb-6 w-full max-w-3xl rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-center text-sm text-destructive">
            {rolesError}
          </div>
        ) : null}

        <div className="grid w-full max-w-5xl grid-cols-2 gap-3 md:grid-cols-3">
          {roleOptions.map((role) => {
            const Icon = roleLoginMeta[role.canonicalRole].icon;
            const visual = roleVisuals[role.canonicalRole] || {
              color: "text-primary",
              bg: "bg-primary/10 group-hover:bg-primary/15",
            };
            return (
              <Card
                key={role.id}
                className="group cursor-pointer border-2 transition-all duration-200 hover:border-primary/40 hover:shadow-lg"
                onClick={() => openRole(role)}
              >
                <CardHeader className="pb-1 pt-4 text-center">
                  <div className={`mx-auto mb-1.5 rounded-xl p-2.5 transition-colors ${visual.bg} ${visual.color}`}>
                    <Icon className="size-6" />
                  </div>
                  <CardTitle className="text-base font-bold">{role.name}</CardTitle>
                </CardHeader>
                <CardContent className="pb-4">
                  <CardDescription className="mb-2 min-h-[28px] text-center text-xs">{role.description}</CardDescription>
                  <Button type="button" variant="outline" className="w-full text-xs font-semibold">
                    Login as {role.name}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {showAdminShortcut && mounted ? (
          <div className="mt-8 flex flex-col items-center gap-3 text-sm">
            <Button asChild variant="link" className="text-muted-foreground hover:text-foreground">
              <Link href={adminHref}>Admin / Owner Portal</Link>
            </Button>
          </div>
        ) : (
          <div className="mt-8 flex flex-col items-center gap-3 text-sm">
            <Button asChild variant="link" className="text-muted-foreground hover:text-foreground">
              <Link href={roleSelectionHref}>Back to Staff Portal</Link>
            </Button>
          </div>
        )}
      </div>
    );
  }

  const RoleIcon = roleConfig.icon;
  const selectedVisual = roleVisuals[selectedRole] || {
    color: "text-primary",
    bg: "bg-primary/10",
  };

  return (
    <div className="flex min-h-svh items-center justify-center bg-muted p-6">
      <div className="w-full max-w-md">
        <button
          type="button"
          onClick={() => {
            setSelectedRole(null);
            setSelectedRoleId("");
            setError("");
          }}
          className="mb-6 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to roles
        </button>

        <Card className="rounded-2xl border-border bg-card p-2 shadow-sm">
          <CardHeader className="mb-2 text-center">
            <div className={`mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-xl ${selectedVisual.bg} ${selectedVisual.color}`}>
              <RoleIcon className="h-7 w-7" />
            </div>
            <CardTitle>{roleConfig.title}</CardTitle>
            <CardDescription>Sign in to {tenantName || "your workspace"}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              {error ? (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                  {error}
                </div>
              ) : null}

              <div className="space-y-1.5">
                <Label htmlFor="tenant-email">Email</Label>
                <Input
                  id="tenant-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@school.com"
                  autoComplete="email"
                  required
                  className="h-11 rounded-lg"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="tenant-password">Password</Label>
                <Input
                  id="tenant-password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  required
                  className="h-11 rounded-lg"
                />
              </div>

              <div className="rounded-lg border bg-muted/40 p-3">
                <div className="flex gap-3">
                  <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
                  <p className="text-xs leading-5 text-muted-foreground">
                    Access is verified against this school and selected role before opening the dashboard.
                  </p>
                </div>
              </div>

              <Button type="submit" disabled={loading} className="h-11 w-full rounded-lg">
                {loading ? <Loader2 className="size-4 animate-spin" /> : null}
                {loading ? "Signing in..." : "Sign In"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
