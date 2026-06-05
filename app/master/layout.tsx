"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { DashboardShell } from "@/components/shared/dashboard-shell";

export default function MasterLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 12000);

    if (pathname === "/master/login") {
      return () => {
        cancelled = true;
        window.clearTimeout(timeoutId);
        controller.abort();
      };
    }

    const verifyMasterSession = async () => {
      try {
        const response = await fetch("/api/master/session", {
          cache: "no-store",
          credentials: "include",
          signal: controller.signal,
        });
        const payload = await response.json().catch(() => ({}));
        if (cancelled) return;
        if (!response.ok || !payload?.authenticated || payload?.user?.role !== "super_admin") {
          router.replace("/master/login");
          return;
        }
      } catch (error) {
        if (!cancelled && error instanceof DOMException && error.name === "AbortError") {
          toast.error("Session verification timed out. Check the database connection and try again.");
        } else if (!cancelled) {
          console.error("Master session verification failed:", error);
        }
      } finally {
        window.clearTimeout(timeoutId);
      }
    };

    void verifyMasterSession();
    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [pathname, router]);

  if (pathname === "/master/login") {
    return <>{children}</>;
  }

  return <DashboardShell role="master">{children}</DashboardShell>;
}
