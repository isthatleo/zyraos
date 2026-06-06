import { AdminUserDetailsPage } from "@/components/admin/admin-user-management-pages";

export default async function AdminStaffDetailsRoute({ params }: { params: Promise<{ staffId: string }> }) {
  const { staffId } = await params;
  return <AdminUserDetailsPage mode="staff" id={staffId} />;
}
