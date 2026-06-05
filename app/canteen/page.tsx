import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { TenantPortalLogin } from "@/components/tenant-portal-login";
import { getTenantSubdomain } from "@/lib/tenant-routing";

export default async function SubdomainCanteenPortalPage() {
  const headersList = await headers();
  const tenantSlug = getTenantSubdomain(headersList.get("host"));

  if (!tenantSlug) redirect("/login");

  return (
    <TenantPortalLogin
      title="Canteen Portal"
      description="For meal operations, inventory, orders, and canteen finance."
      roles={["canteen"]}
      defaultRole="canteen"
      tenantSlugOverride={tenantSlug}
    />
  );
}
