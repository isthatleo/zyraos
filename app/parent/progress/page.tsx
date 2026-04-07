"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { useRouter } from "next/navigation"

const childData = {
  name: "John Doe",
  class: "Grade 3A",
  overallScore: "87%",
  subjects: [
    { name: "Mathematics", score: 85, progress: 85 },
    { name: "English", score: 90, progress: 90 },
    { name: "Science", score: 88, progress: 88 },
  ],
}

export default function ProgressPage() {
  const router = useRouter()

  return (
    <div className="flex h-screen bg-background">
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="h-16 border-b border-border bg-background px-6 flex items-center">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>

        <main className="flex-1 overflow-y-auto">
          <div className="p-6 lg:p-8 space-y-8">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold text-foreground">Child Progress</h1>
              <p className="text-muted-foreground">Monitor {childData.name}'s academic progress</p>
            </div>

            {/* Overall Score Card */}
            <Card>
              <CardHeader>
                <CardTitle>{childData.name}</CardTitle>
                <CardDescription>{childData.class}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Overall Score</p>
                    <p className="text-4xl font-bold">{childData.overallScore}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Subject Progress */}
            <Card>
              <CardHeader>
                <CardTitle>Subject Progress</CardTitle>
                <CardDescription>Performance by subject</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {childData.subjects.map((subject) => (
                  <div key={subject.name} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">{subject.name}</p>
                      <p className="text-sm font-medium">{subject.score}%</p>
                    </div>
                    <Progress value={subject.progress} />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
}
