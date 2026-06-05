"use client";

import { useParams } from "next/navigation";

import { TenantLoginHub } from "@/components/tenant-login-hub";

export default function SchoolLoginPage() {
  const params = useParams<{ tenant?: string }>();
  const tenantSlug = params?.tenant || "";
  return <TenantLoginHub tenantSlug={tenantSlug} />;
}
