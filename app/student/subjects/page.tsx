"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

const subjects = [
  {
    id: "1",
    name: "Mathematics",
    teacher: "Mr. Johnson",
    progress: 78,
    grade: "B+",
  },
  {
    id: "2",
    name: "English Language",
    teacher: "Ms. Davis",
    progress: 92,
    grade: "A",
  },
  {
    id: "3",
    name: "Science",
    teacher: "Dr. Wilson",
    progress: 85,
    grade: "A-",
  },
]

export default function SubjectsPage() {
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
              <h1 className="text-3xl font-bold text-foreground">My Subjects</h1>
              <p className="text-muted-foreground">Your enrolled subjects and progress</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {subjects.map((subject) => (
                <Card key={subject.id}>
                  <CardHeader>
                    <CardTitle className="text-lg">{subject.name}</CardTitle>
                    <CardDescription>{subject.teacher}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Progress</p>
                      <Progress value={subject.progress} />
                      <p className="text-sm font-medium mt-1">{subject.progress}%</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Current Grade</p>
                      <p className="text-2xl font-bold">{subject.grade}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
