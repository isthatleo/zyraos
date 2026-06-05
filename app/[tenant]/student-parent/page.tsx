import { TenantPortalLogin } from "@/components/tenant-portal-login";

export default function TenantStudentParentPortalPage() {
  return (
    <TenantPortalLogin
      title="Student & Parent Portal"
      description="For learners, parents, and guardians."
      roles={["student", "parent"]}
      defaultRole="student"
    />
  );
}

