import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, FileText, CheckCircle, Clock } from "lucide-react"

export function StaffKPICards() {
  const cards = [
    {
      title: "Classes Assigned",
      value: "4",
      subtitle: "Active classes",
      icon: Users,
      color: "text-blue-600",
    },
    {
      title: "Assignments Created",
      value: "12",
      subtitle: "This month",
      icon: FileText,
      color: "text-purple-600",
    },
    {
      title: "Grading Pending",
      value: "8",
      subtitle: "Assignments to grade",
      icon: Clock,
      color: "text-orange-600",
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {cards.map((card, index) => {
        const Icon = card.icon
        return (
          <Card key={index} className="relative overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
              <Icon className={`h-4 w-4 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {card.subtitle}
              </p>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
