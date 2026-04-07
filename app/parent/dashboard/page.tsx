import { ParentKPICards } from "@/components/parent-kpi-cards"
import { ChildPerformance } from "@/components/child-performance"

export default function ParentDashboard() {
  return (
    <div className="p-6 lg:p-8 space-y-8">
      {/* Page Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">
          Child Progress Dashboard
        </h1>
        <p className="text-muted-foreground">
          Monitor your child's academic journey and performance
        </p>
      </div>

      {/* KPI Cards */}
      <ParentKPICards />

      {/* Child Performance */}
      <ChildPerformance />
    </div>
  )
}
