import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { TrendingUp, Calendar, FileText, Users } from "lucide-react"

export function ParentKPICards() {
  const cards = [
    {
      title: "Child Average Score",
      value: "87%",
      subtitle: "Across all subjects",
      progress: 87,
      icon: TrendingUp,
      color: "text-green-600",
    },
    {
      title: "Attendance Rate",
      value: "95%",
      subtitle: "This month",
      progress: 95,
      icon: Calendar,
      color: "text-blue-600",
    },
    {
      title: "Completed Assignments",
      value: "12/15",
      subtitle: "This week",
      icon: FileText,
      color: "text-purple-600",
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
              {card.progress && (
                <Progress value={card.progress} className="mt-3" />
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
