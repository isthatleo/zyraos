"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";

import { getTenantSubdomain } from "@/lib/tenant-routing";

function getCompleteAccessPath(pathname: string, tenantSlug?: string | null) {
  const parts = pathname.split("/").filter(Boolean);
  if (parts[0] === "master") return "/master/complete-access";
  const hostTenant = typeof window !== "undefined" ? getTenantSubdomain(window.location.hostname) : null;
  if (hostTenant) return "/complete-access";
  if (tenantSlug) {
    if (parts[0] === tenantSlug) return `/${tenantSlug}/complete-access`;
    return `/${tenantSlug}/complete-access`;
  }
  if (parts[0] && !["login", "complete-access"].includes(parts[0])) return `/${parts[0]}/complete-access`;
  return "/complete-access";
}

export function ForcePasswordChangeGuard() {
  const pathname = usePathname() || "/";
  const router = useRouter();

  React.useEffect(() => {
    if (pathname.includes("/complete-access") || pathname.endsWith("/login")) return;

    let cancelled = false;
    const checkPasswordStatus = async () => {
      try {
        const response = await fetch("/api/auth/password-status", {
          cache: "no-store",
          credentials: "include",
        });
        if (!response.ok) return;
        const data = await response.json().catch(() => ({}));
        if (!cancelled && data?.mustChangePassword) {
          const target = getCompleteAccessPath(pathname, data?.tenantSlug || null);
          const params = new URLSearchParams({ redirect: pathname });
          router.replace(`${target}?${params.toString()}`);
        }
      } catch {}
    };

    void checkPasswordStatus();
    return () => {
      cancelled = true;
    };
  }, [pathname, router]);

  return null;
}
