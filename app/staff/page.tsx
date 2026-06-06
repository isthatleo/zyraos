import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { TenantPortalLogin } from "@/components/tenant-portal-login";
import { rolePortalGroups } from "@/lib/roles";
import { getTenantSubdomain } from "@/lib/tenant-routing";

export default async function SubdomainStaffPortalPage() {
  const headersList = await headers();
  const tenantSlug = getTenantSubdomain(headersList.get("host"));

  if (!tenantSlug) redirect("/login");

  return (
    <TenantPortalLogin
      title="Staff Portal"
      description="For teachers, HR, finance, library, canteen, health, transport, hostel, security, procurement, inventory, and wellbeing teams."
      roles={rolePortalGroups.staff}
      defaultRole="teacher"
      showAdminShortcut
      tenantSlugOverride={tenantSlug}
    />
  );
}
