import { TenantPortalLogin } from "@/components/tenant-portal-login";
import { rolePortalGroups } from "@/lib/roles";

export default function TenantStaffPortalPage() {
  return (
    <TenantPortalLogin
      title="Staff Portal"
      description="For teachers, HR, finance, library, canteen, reception, health, transport, hostel, security, inventory, and wellbeing teams."
      roles={rolePortalGroups.staff}
      defaultRole="teacher"
      showAdminShortcut
    />
  );
}
