"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BarChart3, Search, Download, TrendingUp, Award, BookOpen, Users } from "lucide-react"

interface GradeEntry {
  id: string
  student: string
  subject: string
  ca1: number | null
  ca2: number | null
  midterm: number | null
  exam: number | null
  total: number | null
  grade: string
  remark: string
}

const gradeScale = [
  { min: 70, max: 100, grade: "A", remark: "Excellent", color: "text-green-600" },
  { min: 60, max: 69, grade: "B", remark: "Very Good", color: "text-blue-600" },
  { min: 50, max: 59, grade: "C", remark: "Good", color: "text-primary" },
  { min: 45, max: 49, grade: "D", remark: "Fair", color: "text-yellow-600" },
  { min: 40, max: 44, grade: "E", remark: "Pass", color: "text-orange-600" },
  { min: 0, max: 39, grade: "F", remark: "Fail", color: "text-destructive" },
]

export function GradingSystem() {
  const [selectedClass, setSelectedClass] = useState("")
  const [selectedSubject, setSelectedSubject] = useState("")
  const [selectedTerm, setSelectedTerm] = useState("")
  const [search, setSearch] = useState("")
  const [grades, setGrades] = useState<GradeEntry[]>([])

  const getGrade = (total: number | null) => {
    if (total === null) return { grade: "—", remark: "—", color: "text-muted-foreground" }
    const scale = gradeScale.find(s => total >= s.min && total <= s.max)
    return scale || { grade: "—", remark: "—", color: "text-muted-foreground" }
  }

  const classAvg = grades.length > 0
    ? Math.round(grades.reduce((sum, g) => sum + (g.total || 0), 0) / grades.length)
    : 0

  return (
    <div className="space-y-6">
      {/* KPI */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Students</p>
                <p className="text-2xl font-bold">{grades.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-chart-1/10 flex items-center justify-center">
                <BarChart3 className="h-5 w-5 text-chart-1" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Class Average</p>
                <p className="text-2xl font-bold">{classAvg}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pass Rate</p>
                <p className="text-2xl font-bold">
                  {grades.length > 0 ? Math.round((grades.filter(g => (g.total || 0) >= 40).length / grades.length) * 100) : 0}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-chart-3/10 flex items-center justify-center">
                <Award className="h-5 w-5 text-chart-3" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Highest Score</p>
                <p className="text-2xl font-bold">
                  {grades.length > 0 ? Math.max(...grades.map(g => g.total || 0)) : 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={selectedClass} onValueChange={setSelectedClass}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Select Class" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="grade-1a">Grade 1A</SelectItem>
            <SelectItem value="jss-1a">JSS 1A</SelectItem>
            <SelectItem value="ss-1a">SS 1A</SelectItem>
            <SelectItem value="100-level">100 Level</SelectItem>
          </SelectContent>
        </Select>
        <Select value={selectedSubject} onValueChange={setSelectedSubject}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Select Subject" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="math">Mathematics</SelectItem>
            <SelectItem value="eng">English</SelectItem>
            <SelectItem value="sci">Science</SelectItem>
            <SelectItem value="phy">Physics</SelectItem>
          </SelectContent>
        </Select>
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
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search students..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Button variant="outline"><Download className="h-4 w-4 mr-2" />Export</Button>
      </div>

      {/* Grading Scale Reference */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Grading Scale</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {gradeScale.map(s => (
              <div key={s.grade} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50 border border-border text-xs">
                <span className={`font-bold ${s.color}`}>{s.grade}</span>
                <span className="text-muted-foreground">{s.min}-{s.max}%</span>
                <span className="text-muted-foreground">({s.remark})</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Grade Sheet */}
      <Card>
        <CardHeader>
          <CardTitle>Grade Sheet</CardTitle>
          <CardDescription>Enter and manage student scores. CA weight: 40%, Exam weight: 60%</CardDescription>
        </CardHeader>
        <CardContent>
          {grades.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground mb-2">No grades entered</h3>
              <p className="text-sm text-muted-foreground">Select a class and subject to begin grading</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead className="text-center">CA 1 (10)</TableHead>
                  <TableHead className="text-center">CA 2 (10)</TableHead>
                  <TableHead className="text-center">Mid-Term (20)</TableHead>
                  <TableHead className="text-center">Exam (60)</TableHead>
                  <TableHead className="text-center">Total (100)</TableHead>
                  <TableHead className="text-center">Grade</TableHead>
                  <TableHead>Remark</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {grades.map(entry => {
                  const result = getGrade(entry.total)
                  return (
                    <TableRow key={entry.id}>
                      <TableCell className="font-medium">{entry.student}</TableCell>
                      <TableCell className="text-center">{entry.ca1 ?? "—"}</TableCell>
                      <TableCell className="text-center">{entry.ca2 ?? "—"}</TableCell>
                      <TableCell className="text-center">{entry.midterm ?? "—"}</TableCell>
                      <TableCell className="text-center">{entry.exam ?? "—"}</TableCell>
                      <TableCell className="text-center font-bold">{entry.total ?? "—"}</TableCell>
                      <TableCell className="text-center">
                        <span className={`font-bold ${result.color}`}>{result.grade}</span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{result.remark}</TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
