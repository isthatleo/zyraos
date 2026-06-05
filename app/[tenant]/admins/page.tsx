import { TenantPortalLogin } from "@/components/tenant-portal-login";

export default function TenantAdminsPortalPage() {
  return (
    <TenantPortalLogin
      title="School Admins Portal"
      description="For owners, principals, headteachers, and school administrators."
      roles={["owner", "school_admin"]}
      defaultRole="school_admin"
    />
  );
}

