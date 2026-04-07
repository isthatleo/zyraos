import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { TrendingUp, BookOpen, Target } from "lucide-react"

export function StudentKPICards() {
  const cards = [
    {
      title: "Average Score",
      value: "85%",
      subtitle: "2 assessments graded",
      progress: 85,
      icon: TrendingUp,
      color: "text-green-600",
    },
    {
      title: "Subjects",
      value: "6",
      subtitle: "Enrolled subjects",
      icon: BookOpen,
      color: "text-blue-600",
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
