"use client";

import * as React from "react";

import { DashboardShell } from "@/components/shared/dashboard-shell";
import { authClient } from "@/lib/auth-client";

type DashboardRole =
  | "master"
  | "super_admin"
  | "admin"
  | "school_admin"
  | "owner"
  | "staff"
  | "teacher"
  | "lecturer"
  | "student"
  | "parent"
  | "guardian"
  | "finance"
  | "accountant"
  | "librarian"
  | "canteen"
  | "hr";

function normalizeRole(role?: string | null): DashboardRole {
  if (role === "super_admin") return "master";
  if (role === "accountant") return "finance";
  if (role === "guardian") return "parent";
  if (role === "lecturer") return "teacher";
  if (
    role === "master" ||
    role === "admin" ||
    role === "school_admin" ||
    role === "owner" ||
    role === "staff" ||
    role === "teacher" ||
    role === "student" ||
    role === "parent" ||
    role === "finance" ||
    role === "librarian" ||
    role === "canteen" ||
    role === "hr"
  ) {
    return role;
  }
  return "master";
}

export function UniversalDashboardShell({ children }: { children: React.ReactNode }) {
  const { data: session } = authClient.useSession();
  const [databaseRole, setDatabaseRole] = React.useState<string | null>(null);
  const [loadingRole, setLoadingRole] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      const response = await fetch("/api/user/role", { cache: "no-store" }).catch(() => null);
      const data = response?.ok ? await response.json().catch(() => ({})) : {};
      if (!cancelled) {
        setDatabaseRole(data.role || null);
        setLoadingRole(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const sessionRole = (session?.user as { role?: string } | undefined)?.role;
  const role = normalizeRole(sessionRole || databaseRole);

  if (loadingRole && !sessionRole) {
    return <div className="min-h-screen bg-background" />;
  }

  return <DashboardShell role={role}>{children}</DashboardShell>;
}
