import { MasterSidebar } from "@/components/master-sidebar"
import { MasterTopNav } from "@/components/master-top-nav"
import { MasterKPICards } from "@/components/master-kpi-cards"
import { RecentSchoolProvisioning } from "@/components/recent-school-provisioning"

export default function Page() {
  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <MasterSidebar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Navigation */}
        <MasterTopNav />

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-6 lg:p-8 space-y-8">
            {/* Page Header */}
            <div className="space-y-2">
              <h1 className="text-3xl font-bold text-gray-900">
                Master Control Dashboard
              </h1>
              <p className="text-gray-600">
                Global administrative overview of the Roxan ecosystem.
              </p>
            </div>

            {/* KPI Cards */}
            <MasterKPICards />

            {/* Recent School Provisioning */}
            <RecentSchoolProvisioning />
          </div>
        </main>
      </div>
    </div>
  )
}
