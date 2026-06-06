import { AdminUserDetailsPage } from "@/components/admin/admin-user-management-pages";

export default async function AdminUserDetailsRoute({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  return <AdminUserDetailsPage mode="users" id={userId} />;
}
