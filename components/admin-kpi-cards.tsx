import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Users, UserCheck, BookOpen, Activity } from "lucide-react"

export function AdminKPICards() {
  const cards = [
    {
      title: "Total Students",
      value: "1,247",
      subtitle: "Enrolled this year",
      progress: 85,
      icon: Users,
      color: "text-blue-600",
    },
    {
      title: "Total Staff",
      value: "89",
      subtitle: "Teaching & admin staff",
      icon: UserCheck,
      color: "text-green-600",
    },
    {
      title: "Active Classes",
      value: "42",
      subtitle: "Running this term",
      icon: BookOpen,
      color: "text-purple-600",
    },
    {
      title: "System Activity",
      value: "94%",
      subtitle: "Uptime this month",
      progress: 94,
      icon: Activity,
      color: "text-orange-600",
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
