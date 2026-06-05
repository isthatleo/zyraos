"use client";

import { useParams } from "next/navigation";

import { CompleteAccessForm } from "@/components/complete-access-form";

export default function TenantCompleteAccessPage() {
  const params = useParams<{ tenant?: string }>();
  const tenant = params?.tenant || "";

  return <CompleteAccessForm defaultRedirect={`/${tenant}/admin/dashboard`} />;
}
