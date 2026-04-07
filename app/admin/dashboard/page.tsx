import { AdminKPICards } from "@/components/admin-kpi-cards"
import { UserManagement } from "@/components/user-management"

export default function AdminDashboard() {
  return (
    <div className="p-6 lg:p-8 space-y-8">
      {/* Page Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">
          Admin Control Center
        </h1>
        <p className="text-muted-foreground">
          Comprehensive school management and system administration
        </p>
      </div>

      {/* KPI Cards */}
      <AdminKPICards />

      {/* User Management */}
      <UserManagement />
    </div>
  )
}
