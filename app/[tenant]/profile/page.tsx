"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProfileForm } from "@/components/profile-form";

export default function TenantProfilePage() {
  const params = useParams<{ tenant: string }>();
  const searchParams = useSearchParams();
  const tenant = params?.tenant || "";
  const from = searchParams?.get("from") || "";
  const context = dashboardContext(tenant, from);

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex flex-col gap-4 rounded-3xl border bg-card p-5 shadow-sm md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{context.label}</Badge>
            <Badge variant="secondary">Universal account profile</Badge>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">My Profile</h1>
          <p className="text-muted-foreground">
            Manage the signed-in user profile used across dashboards, messages, notifications, and account menus.
          </p>
        </div>
        {context.href ? (
          <Button asChild variant="outline">
            <Link href={context.href}>
              <ArrowLeft className="size-4" />
              Back to {context.shortLabel}
            </Link>
          </Button>
        ) : null}
      </div>

      <ProfileForm />
    </div>
  );
}

function dashboardContext(tenant: string, from: string) {
  const normalized = from.trim().toLowerCase();
  const labels: Record<string, string> = {
    teacher: "Teacher dashboard context",
    student: "Student dashboard context",
    parent: "Parent dashboard context",
    admin: "Admin dashboard context",
    owner: "Owner dashboard context",
    finance: "Finance dashboard context",
    staff: "Staff dashboard context",
  };
  const shortLabels: Record<string, string> = {
    teacher: "Teacher Dashboard",
    student: "Student Dashboard",
    parent: "Parent Dashboard",
    admin: "Admin Dashboard",
    owner: "Owner Dashboard",
    finance: "Finance Dashboard",
    staff: "Staff Dashboard",
  };
  return {
    label: labels[normalized] || "Tenant dashboard context",
    shortLabel: shortLabels[normalized] || "Dashboard",
    href: normalized ? `/${encodeURIComponent(tenant)}/${normalized}/dashboard` : "",
  };
}
