import { TenantPortalLogin } from "@/components/tenant-portal-login";
import { rolePortalGroups } from "@/lib/roles";

export default function TenantStaffPortalPage() {
  return (
    <TenantPortalLogin
      title="Staff Portal"
      description="For academic, finance, library, HR, operations, welfare, transport, hostel, security, procurement, inventory, alumni, and canteen teams."
      roles={rolePortalGroups.staff}
      defaultRole="teacher"
      showAdminShortcut
    />
  );
}
