"use client"

import * as React from "react"
import { usePathname, useRouter } from "next/navigation"
import {
  AlertCircle,
  Award,
  BarChart3,
  BookOpen,
  Download,
  GraduationCap,
  RefreshCcw,
  TrendingUp,
} from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"

type SubjectInsight = {
  id: string
  name: string
  code: string
  type: string
  gradeCount: number
  assessmentCount: number
  upcomingAssessments: number
  average: number
  highest: number
  lowest: number
  grade: string
  risk: "low" | "medium" | "high"
}

type RecentGrade = {
  id: string
  title: string
  type: string
  subject: string
  subjectCode: string
  teacher: string
  percentage: number
  grade: string
  feedback: string
  date: string | null
}

type GradesPayload = {
  generatedAt: string
  currentUser?: { id: string; name: string; email: string; role: string }
  school?: { id: string; name: string; slug: string; type: string }
  student?: {
    id: string
    admissionNumber: string
    className: string
    classGrade: string
    classSection: string
    classTeacher: string
    academicYear: string
    term: string
  }
  metrics?: {
    averageScore: number
    highestScore: number
    lowestScore: number
    gradeCount: number
    subjectCount: number
    attendanceRate: number
    upcomingAssessments: number
    overdueAssessments: number
    riskSubjects: number
  }
  subjects: SubjectInsight[]
  recentGrades: RecentGrade[]
  performanceTrend: Array<{ key: string; label: string; score: number }>
  recommendations: string[]
}

const riskStyles: Record<SubjectInsight["risk"], string> = {
  low: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300",
  medium: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300",
  high: "border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300",
}

function formatDate(value: string | null) {
  if (!value) return "Not dated"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Not dated"
  return new Intl.DateTimeFormat("en", { month: "short", day: "2-digit", year: "numeric" }).format(date)
}

function scoreTone(score: number) {
  if (score >= 80) return "text-emerald-600"
  if (score >= 60) return "text-blue-600"
  if (score > 0) return "text-amber-600"
  return "text-muted-foreground"
}

function downloadFile(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

function GradesSkeleton() {
  return (
    <div className="space-y-6 p-6 lg:p-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-3">
          <Skeleton className="h-10 w-56" />
          <Skeleton className="h-5 w-96 max-w-full" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-44" />
          <Skeleton className="h-10 w-40" />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index}>
            <CardContent className="space-y-4 p-5">
              <Skeleton className="size-10 rounded-xl" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <Skeleton className="h-72 rounded-2xl lg:col-span-2" />
        <Skeleton className="h-72 rounded-2xl" />
      </div>
      <Skeleton className="h-96 rounded-2xl" />
    </div>
  )
}

export default function StudentGradesPage() {
  const pathname = usePathname()
  const router = useRouter()
  const [payload, setPayload] = React.useState<GradesPayload | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [refreshing, setRefreshing] = React.useState(false)
  const [error, setError] = React.useState("")
  const [subjectFilter, setSubjectFilter] = React.useState("all")

  const tenantPrefix = React.useMemo(() => {
    const segments = (pathname ?? "").split("/").filter(Boolean)
    return segments[1] === "student" ? `/${segments[0]}` : ""
  }, [pathname])

  const endpoint = React.useCallback(() => {
    const tenant = tenantPrefix ? tenantPrefix.slice(1) : ""
    return tenant ? `/api/tenant/student/performance?tenant=${encodeURIComponent(tenant)}` : "/api/student/performance"
  }, [tenantPrefix])

  const loadGrades = React.useCallback(async (notify = false) => {
    setError("")
    setLoading(true)
    const response = await fetch(endpoint(), { cache: "no-store" }).catch(() => null)
    if (!response?.ok) {
      const data = await response?.json().catch(() => ({}))
      const message = String(data?.error || "Failed to load student grades")
      setError(message)
      setLoading(false)
      if (notify) toast.error(message)
      return
    }
    setPayload((await response.json()) as GradesPayload)
    setLoading(false)
    if (notify) toast.success("Grades refreshed")
  }, [endpoint])

  React.useEffect(() => {
    void loadGrades()
  }, [loadGrades])

  const refresh = () => {
    setRefreshing(true)
    void loadGrades(true).finally(() => setRefreshing(false))
  }

  const subjects = payload?.subjects || []
  const grades = payload?.recentGrades || []
  const filteredGrades = grades.filter((grade) => subjectFilter === "all" || grade.subjectCode === subjectFilter || grade.subject === subjectFilter)
  const metrics = payload?.metrics
  const student = payload?.student
  const currentUser = payload?.currentUser

  const exportTranscript = () => {
    if (!payload) return
    const rows = [
      ["Student", currentUser?.name || ""],
      ["Admission number", student?.admissionNumber || ""],
      ["School", payload.school?.name || ""],
      ["Class", student?.className || ""],
      ["Term", student?.term || ""],
      ["Average", `${metrics?.averageScore ?? 0}%`],
      [],
      ["Assessment", "Type", "Subject", "Teacher", "Score", "Grade", "Date", "Feedback"],
      ...grades.map((grade) => [
        grade.title,
        grade.type,
        grade.subject,
        grade.teacher,
        `${grade.percentage}%`,
        grade.grade,
        formatDate(grade.date),
        grade.feedback,
      ]),
    ]
    const csv = rows.map((row) => row.map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`).join(",")).join("\n")
    downloadFile("student-transcript.csv", csv, "text/csv;charset=utf-8")
    toast.success("Transcript downloaded")
  }

  if (loading && !payload) return <GradesSkeleton />

  if (error) {
    return (
      <div className="p-6 lg:p-8">
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-3">
              <AlertCircle className="mt-0.5 size-5 text-destructive" />
              <div>
                <p className="font-medium text-destructive">Grades could not be loaded</p>
                <p className="text-sm text-muted-foreground">{error}</p>
              </div>
            </div>
            <Button type="button" variant="outline" onClick={() => void loadGrades(true)}>Retry</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!payload?.currentUser?.id || !payload?.student?.id) {
    return (
      <div className="p-6 lg:p-8">
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium text-destructive">Student session profile is required</p>
              <p className="text-sm text-muted-foreground">Grades only render for the current signed-in student profile.</p>
            </div>
            <Button type="button" variant="outline" onClick={() => router.refresh()}>Refresh session</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-2">
          <Badge variant="outline" className="w-fit">
            <GraduationCap className="mr-1 size-3.5" />
            {payload.school?.name || "School"} - {student?.className || "Class not assigned"}
          </Badge>
          <h1 className="text-3xl font-semibold tracking-tight">My Grades</h1>
          <p className="text-muted-foreground">
            Published gradebook results for {currentUser?.name}. {student?.term ? `Current term: ${student.term}.` : ""}
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Select value={subjectFilter} onValueChange={setSubjectFilter}>
            <SelectTrigger className="w-full sm:w-52">
              <SelectValue placeholder="Filter subject" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All subjects</SelectItem>
              {subjects.map((subject) => (
                <SelectItem key={subject.id} value={subject.code || subject.name}>{subject.code || subject.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="button" variant="outline" onClick={refresh} disabled={refreshing}>
            <RefreshCcw className={cn("size-4", refreshing && "animate-spin")} />
            Refresh
          </Button>
          <Button type="button" onClick={exportTranscript} disabled={!grades.length}>
            <Download className="size-4" />
            Download transcript
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: "Average", value: `${metrics?.averageScore ?? 0}%`, helper: "Current gradebook average", icon: Award },
          { label: "Highest", value: `${metrics?.highestScore ?? 0}%`, helper: "Best published result", icon: TrendingUp },
          { label: "Subjects", value: metrics?.subjectCount ?? subjects.length, helper: `${metrics?.gradeCount ?? grades.length} grade records`, icon: BookOpen },
          { label: "Attendance", value: `${metrics?.attendanceRate ?? 0}%`, helper: "Academic attendance context", icon: BarChart3 },
        ].map((item) => {
          const Icon = item.icon
          return (
            <Card key={item.label}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm text-muted-foreground">{item.label}</p>
                    <p className="mt-1 text-2xl font-semibold">{item.value}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{item.helper}</p>
                  </div>
                  <div className="rounded-2xl bg-primary/10 p-3 text-primary">
                    <Icon className="size-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Subject Performance</CardTitle>
            <CardDescription>Current averages and risk indicators by subject or course unit.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            {subjects.map((subject) => (
              <button
                key={subject.id}
                type="button"
                className="rounded-2xl border p-4 text-left transition-colors hover:bg-muted/50"
                onClick={() => setSubjectFilter(subject.code || subject.name)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{subject.name}</p>
                    <p className="text-sm text-muted-foreground">{subject.code || subject.type}</p>
                  </div>
                  <Badge variant="outline" className={riskStyles[subject.risk]}>{subject.grade}</Badge>
                </div>
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Average</span>
                    <span>{subject.average}%</span>
                  </div>
                  <Progress value={subject.average} />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{subject.gradeCount} results</span>
                    <span>{subject.upcomingAssessments} upcoming</span>
                  </div>
                </div>
              </button>
            ))}
            {!subjects.length ? (
              <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground md:col-span-2">
                No subjects with published grades are available yet.
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Grade Readiness</CardTitle>
            <CardDescription>Operational checks for this gradebook view.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: "Student profile loaded", ready: Boolean(payload.student?.id) },
              { label: "Published grades loaded", ready: grades.length > 0 },
              { label: "Subject averages computed", ready: subjects.length > 0 },
              { label: "Transcript export available", ready: grades.length > 0 },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between rounded-xl border p-3 text-sm">
                <span>{item.label}</span>
                <Badge variant="outline" className={item.ready ? riskStyles.low : riskStyles.medium}>{item.ready ? "Ready" : "Pending"}</Badge>
              </div>
            ))}
            {payload.recommendations?.length ? (
              <div className="rounded-2xl bg-muted/50 p-4">
                <p className="text-sm font-medium">Recommendations</p>
                <div className="mt-2 space-y-2">
                  {payload.recommendations.slice(0, 3).map((item) => (
                    <p key={item} className="text-sm text-muted-foreground">{item}</p>
                  ))}
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Grade Sheet</CardTitle>
          <CardDescription>Assessment-by-assessment results from the student gradebook.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Assessment</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Teacher</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Grade</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredGrades.map((grade) => (
                <TableRow key={grade.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{grade.title}</p>
                      <p className="text-xs text-muted-foreground">{grade.type || "Assessment"}</p>
                    </div>
                  </TableCell>
                  <TableCell>{grade.subjectCode || grade.subject}</TableCell>
                  <TableCell>{grade.teacher || "Teacher"}</TableCell>
                  <TableCell>{formatDate(grade.date)}</TableCell>
                  <TableCell className={cn("font-semibold", scoreTone(grade.percentage))}>{grade.percentage}%</TableCell>
                  <TableCell><Badge variant="outline">{grade.grade}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {!filteredGrades.length ? (
            <div className="py-12 text-center">
              <BarChart3 className="mx-auto mb-4 size-12 text-muted-foreground/40" />
              <h3 className="text-lg font-medium text-muted-foreground">No grades match this view</h3>
              <p className="text-sm text-muted-foreground">Published teacher gradebook records will appear here.</p>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
