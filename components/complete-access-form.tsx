"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, KeyRound, Loader2, ShieldCheck, XCircle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { normalizeRole, roleLoginMeta } from "@/lib/roles";
import { getTenantSubdomain } from "@/lib/tenant-routing";

function getPasswordChecks(password: string, confirmPassword: string) {
  return [
    { key: "length", label: "At least 8 characters", met: password.length >= 8 },
    { key: "uppercase", label: "At least one uppercase letter", met: /[A-Z]/.test(password) },
    { key: "lowercase", label: "At least one lowercase letter", met: /[a-z]/.test(password) },
    { key: "number", label: "At least one number", met: /[0-9]/.test(password) },
    { key: "special", label: "At least one special character", met: /[^A-Za-z0-9\s]/.test(password) },
    { key: "spaces", label: "No spaces", met: password.length > 0 && !/\s/.test(password) },
    { key: "match", label: "Passwords match", met: password.length > 0 && password === confirmPassword },
  ];
}

export function CompleteAccessForm({ defaultRedirect = "/" }: { defaultRedirect?: string }) {
  const router = useRouter();
  const pathname = usePathname() || "";
  const searchParams = useSearchParams();
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");

  const requestedRole = searchParams?.get("role");
  const passwordChecks = getPasswordChecks(password, confirmPassword);
  const passwordReady = passwordChecks.every((check) => check.met);

  const getRoleDashboardRedirect = React.useCallback(() => {
    const explicitRedirect = searchParams?.get("redirect");
    if (explicitRedirect) return explicitRedirect;

    const role = normalizeRole(requestedRole);
    const rolePath = roleLoginMeta[role]?.redirectPath || defaultRedirect;
    if (role === "super_admin") return rolePath;

    if (typeof window !== "undefined" && getTenantSubdomain(window.location.hostname)) {
      return rolePath;
    }

    const parts = pathname.split("/").filter(Boolean);
    const tenantSlug = parts[0] && parts[0] !== "complete-access" ? parts[0] : "";
    return tenantSlug && rolePath.startsWith("/") ? `/${tenantSlug}${rolePath}` : rolePath;
  }, [defaultRedirect, pathname, requestedRole, searchParams]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (loading) return;

    setLoading(true);
    setError("");
    try {
      if (!passwordReady) {
        throw new Error("Complete every password requirement before continuing.");
      }

      const response = await fetch("/api/auth/complete-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ password, confirmPassword }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || "Failed to save the new password.");
      }

      toast.success("Password updated. Access unlocked.");
      const nextPath = getRoleDashboardRedirect();
      router.replace(nextPath);
      router.refresh();
      window.location.assign(nextPath);
    } catch (submitError: any) {
      setError(submitError?.message || "Failed to save the new password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <Card className="w-full max-w-xl border-border/70 bg-card/95 shadow-xl backdrop-blur">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <CardTitle className="text-2xl">Set Your New Password</CardTitle>
          <CardDescription>
            Your temporary password unlocked the account once. Create a permanent password before continuing to the dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-2xl border bg-background/70 p-4 text-sm">
            <p className="font-medium text-foreground">Password requirements</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {passwordChecks.map((check) => (
                <div
                  key={check.key}
                  className={check.met ? "flex items-center gap-2 text-emerald-600" : "flex items-center gap-2 text-muted-foreground"}
                >
                  {check.met ? <CheckCircle2 className="size-4" /> : <XCircle className="size-4" />}
                  <span>{check.label}</span>
                </div>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error ? (
              <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            ) : null}

            <label className="block space-y-2">
              <span className="text-sm font-medium">New password</span>
              <div className="relative">
                <KeyRound className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="pl-10"
                  placeholder="Enter a permanent password"
                  autoComplete="new-password"
                  required
                />
              </div>
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium">Confirm password</span>
              <div className="relative">
                <KeyRound className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className="pl-10"
                  placeholder="Re-enter the permanent password"
                  autoComplete="new-password"
                  required
                />
              </div>
            </label>

            <Button type="submit" className="w-full" disabled={loading || !passwordReady}>
              {loading ? <Loader2 className="size-4 animate-spin" /> : null}
              Save Password & Continue
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
