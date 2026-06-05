import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { TenantPortalLogin } from "@/components/tenant-portal-login";
import { getTenantSubdomain } from "@/lib/tenant-routing";

export default async function SubdomainStudentParentPortalPage() {
  const headersList = await headers();
  const tenantSlug = getTenantSubdomain(headersList.get("host"));

  if (!tenantSlug) redirect("/login");

  return (
    <TenantPortalLogin
      title="Student & Parent Portal"
      description="For learners, parents, and guardians."
      roles={["student", "parent"]}
      defaultRole="student"
      tenantSlugOverride={tenantSlug}
    />
  );
}
