"use client";

import * as React from "react";
import Link from "next/link";
import { Crown, GraduationCap, UserCheck, Utensils } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getTenantSubdomain } from "@/lib/tenant-routing";

const portals = [
  {
    title: "Admins",
    description: "Owners, headteachers, principals, and school admins.",
    href: "admins",
    icon: Crown,
  },
  {
    title: "Staff",
    description: "Teachers, lecturers, finance, HR, library, and staff operations.",
    href: "staff",
    icon: UserCheck,
  },
  {
    title: "Student / Parent",
    description: "Student, parent, and guardian access.",
    href: "student-parent",
    icon: GraduationCap,
  },
  {
    title: "Canteen",
    description: "Canteen staff access for meals, inventory, and payments.",
    href: "canteen",
    icon: Utensils,
  },
];

function formatTenantName(slug: string) {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function TenantLoginHub({ tenantSlug }: { tenantSlug: string }) {
  const [isTenantSubdomain, setIsTenantSubdomain] = React.useState(false);

  React.useEffect(() => {
    const subdomainSlug = getTenantSubdomain(window.location.hostname);
    setIsTenantSubdomain(Boolean(subdomainSlug));
    const activeSlug = subdomainSlug || tenantSlug;
    if (!activeSlug) return;

    try {
      document.cookie = `x-tenant-slug=${activeSlug}; path=/; SameSite=Lax`;
      sessionStorage.setItem("active_tenant_slug", activeSlug);
      sessionStorage.setItem("active_tenant_name", formatTenantName(activeSlug));
    } catch {}
  }, [tenantSlug]);

  const portalHref = (portal: string) => {
    if (isTenantSubdomain) return `/${portal}`;
    return tenantSlug ? `/${tenantSlug}/${portal}` : `/${portal}`;
  };

  return (
    <div className="min-h-svh bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.14),transparent_35%),linear-gradient(135deg,hsl(var(--background)),hsl(var(--muted)))] p-6">
      <div className="mx-auto flex min-h-[calc(100svh-3rem)] max-w-6xl flex-col justify-center">
        <div className="mb-8 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-primary">Roxan Education System</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight">{formatTenantName(tenantSlug) || "School"} portal</h1>
          <p className="mt-2 text-muted-foreground">Choose the correct portal, then select your role to sign in.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {portals.map((portal) => {
            const Icon = portal.icon;
            return (
              <Card
                key={portal.href}
                className="group border-border/70 bg-card/85 shadow-sm backdrop-blur transition-all hover:-translate-y-1 hover:shadow-xl"
              >
                <CardHeader>
                  <div className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Icon className="size-6" />
                  </div>
                  <CardTitle>{portal.title}</CardTitle>
                  <CardDescription>{portal.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button asChild className="w-full rounded-full">
                    <Link href={portalHref(portal.href)}>Open portal</Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
