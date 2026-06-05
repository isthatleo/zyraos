import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { TenantPortalLogin } from "@/components/tenant-portal-login";
import { getTenantSubdomain } from "@/lib/tenant-routing";

export default async function SubdomainAdminsPortalPage() {
  const headersList = await headers();
  const tenantSlug = getTenantSubdomain(headersList.get("host"));

  if (!tenantSlug) redirect("/login");

  return (
    <TenantPortalLogin
      title="School Admins Portal"
      description="For owners, principals, headteachers, and school administrators."
      roles={["owner", "school_admin"]}
      defaultRole="school_admin"
      tenantSlugOverride={tenantSlug}
    />
  );
}
