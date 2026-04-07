"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { useRouter } from "next/navigation"

const exams = [
  {
    id: "1",
    name: "Mathematics Mid-Term",
    date: "2024-02-10",
    subject: "Mathematics",
    score: "95%",
    grade: "A",
  },
  {
    id: "2",
    name: "English Mid-Term",
    date: "2024-02-12",
    subject: "English",
    score: "92%",
    grade: "A",
  },
  {
    id: "3",
    name: "Science Mid-Term",
    date: "2024-02-14",
    subject: "Science",
    score: "88%",
    grade: "A-",
  },
]

export default function ExamsPage() {
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
              <h1 className="text-3xl font-bold text-foreground">Exams & Results</h1>
              <p className="text-muted-foreground">Your exam scores and grades</p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Exam Results</CardTitle>
                <CardDescription>All your exam scores</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Exam Name</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead>Grade</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {exams.map((exam) => (
                      <TableRow key={exam.id}>
                        <TableCell className="font-medium">{exam.name}</TableCell>
                        <TableCell>{exam.subject}</TableCell>
                        <TableCell>{exam.date}</TableCell>
                        <TableCell>{exam.score}</TableCell>
                        <TableCell>
                          <Badge className="bg-green-100 text-green-800">{exam.grade}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
}
