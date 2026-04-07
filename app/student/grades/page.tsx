"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { BarChart3, TrendingUp, Award, BookOpen, Download } from "lucide-react"

const gradeScale = [
  { min: 70, max: 100, grade: "A", color: "text-green-600" },
  { min: 60, max: 69, grade: "B", color: "text-blue-600" },
  { min: 50, max: 59, grade: "C", color: "text-primary" },
  { min: 45, max: 49, grade: "D", color: "text-yellow-600" },
  { min: 40, max: 44, grade: "E", color: "text-orange-600" },
  { min: 0, max: 39, grade: "F", color: "text-destructive" },
]

export default function StudentGradesPage() {
  const [selectedTerm, setSelectedTerm] = useState("")

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">My Grades</h1>
          <p className="text-muted-foreground">View your academic performance</p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedTerm} onValueChange={setSelectedTerm}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Select Term" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="term-1">Term 1</SelectItem>
              <SelectItem value="term-2">Term 2</SelectItem>
              <SelectItem value="term-3">Term 3</SelectItem>
              <SelectItem value="semester-1">Semester 1</SelectItem>
              <SelectItem value="semester-2">Semester 2</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline"><Download className="h-4 w-4 mr-2" />Download Transcript</Button>
        </div>
      </div>

      {/* GPA Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Award className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">CGPA</p>
                <p className="text-2xl font-bold">—</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-chart-1/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-chart-1" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Term GPA</p>
                <p className="text-2xl font-bold">—</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-chart-2/10 flex items-center justify-center">
                <BookOpen className="h-5 w-5 text-chart-2" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Courses Taken</p>
                <p className="text-2xl font-bold">0</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-chart-3/10 flex items-center justify-center">
                <BarChart3 className="h-5 w-5 text-chart-3" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Best Grade</p>
                <p className="text-2xl font-bold">—</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Grade Scale */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Grading Scale</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {gradeScale.map(s => (
              <div key={s.grade} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50 border border-border text-xs">
                <span className={`font-bold ${s.color}`}>{s.grade}</span>
                <span className="text-muted-foreground">{s.min}–{s.max}%</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Grades Table */}
      <Card>
        <CardHeader>
          <CardTitle>Grade Sheet</CardTitle>
          <CardDescription>Your grades by subject</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground mb-2">No grades available</h3>
            <p className="text-sm text-muted-foreground">Grades will appear here once published by your teachers</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
