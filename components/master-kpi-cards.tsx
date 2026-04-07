import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Building2, Activity, DollarSign, CheckCircle } from "lucide-react"

interface KPICardProps {
  title: string
  value: string | number
  subtitle: string
  icon?: React.ComponentType<{ className?: string }>
  highlight?: boolean
}

function KPICard({ title, value, subtitle, icon: Icon, highlight }: KPICardProps) {
  return (
    <Card className="rounded-xl border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow duration-200">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="space-y-1">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className={`text-2xl font-bold ${highlight ? 'text-orange-600' : 'text-gray-900'}`}>
            {value}
          </p>
        </div>
        {Icon && (
          <Icon className={`h-5 w-5 ${highlight ? 'text-orange-600' : 'text-gray-400'}`} />
        )}
      </CardHeader>
      <CardContent>
        <p className="text-xs text-gray-500">{subtitle}</p>
      </CardContent>
    </Card>
  )
}

export function MasterKPICards() {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      <KPICard
        title="Total Schools"
        value={4}
        subtitle="+4 new this month"
        icon={Building2}
      />
      <KPICard
        title="Active Ecosystem"
        value={4}
        subtitle="Active school environments"
        icon={Activity}
      />
      <KPICard
        title="Monthly Revenue"
        value="GH₵0.00"
        subtitle="Estimated MRR"
        icon={DollarSign}
      />
      <KPICard
        title="System Status"
        value="Operational"
        subtitle="All systems normal"
        icon={CheckCircle}
        highlight={true}
      />
    </div>
  )
}
