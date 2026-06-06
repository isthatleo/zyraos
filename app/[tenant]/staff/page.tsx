import { TenantPortalLogin } from "@/components/tenant-portal-login";
import { rolePortalGroups } from "@/lib/roles";

export default function TenantStaffPortalPage() {
  return (
    <TenantPortalLogin
      title="Staff Portal"
      description="For teachers, HR, finance, library, canteen, health, transport, hostel, security, procurement, inventory, and wellbeing teams."
      roles={rolePortalGroups.staff}
      defaultRole="teacher"
      showAdminShortcut
    />
  );
}
