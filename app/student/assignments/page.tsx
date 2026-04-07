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

const assignments = [
  {
    id: "1",
    title: "Algebra Problem Set",
    subject: "Mathematics",
    dueDate: "2024-02-20",
    status: "Submitted",
    grade: "95%",
  },
  {
    id: "2",
    title: "Essay Writing",
    subject: "English",
    dueDate: "2024-02-22",
    status: "Submitted",
    grade: "92%",
  },
  {
    id: "3",
    title: "Science Project",
    subject: "Science",
    dueDate: "2024-02-25",
    status: "In Progress",
    grade: "-",
  },
]

export default function AssignmentsPage() {
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
              <h1 className="text-3xl font-bold text-foreground">My Assignments</h1>
              <p className="text-muted-foreground">Track your assignments and submissions</p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Assignments Overview</CardTitle>
                <CardDescription>All your current assignments</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Grade</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assignments.map((assignment) => (
                      <TableRow key={assignment.id}>
                        <TableCell className="font-medium">{assignment.title}</TableCell>
                        <TableCell>{assignment.subject}</TableCell>
                        <TableCell>{assignment.dueDate}</TableCell>
                        <TableCell>
                          <Badge variant={assignment.status === "Submitted" ? "default" : "secondary"}>
                            {assignment.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{assignment.grade}</TableCell>
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
