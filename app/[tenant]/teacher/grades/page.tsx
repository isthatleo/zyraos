"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { teacherDashboardApi } from "@/lib/teacher-api-client"
import {
  AlertCircle,
  BarChart3,
  CheckCircle2,
  Download,
  Edit,
  Filter,
  FileText,
  Home,
  List,
  PieChart,
  RefreshCcw,
  Search,
  TrendingDown,
  TrendingUp,
  Grid,
} from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

type TeacherGrade = {
  id: string
  studentId: string
  studentName: string
  classId: string
  className: string
  subjectId: string
  subject: string
  subjectCode: string
  type: string
  assessment: string
  score: number
  maxScore: number
  percentage: number
  grade: string
  date: string | null
}

type TeacherClass = {
  id: string
  name: string
  grade: string
  section: string
  students: number
  averageScore: number
  attendanceRate: number
}

type TeacherSubject = {
  id: string
  name: string
  code: string
  type: string
  description: string
  classes: number
}

type TeacherLearner = {
  id: string
  name: string
  email: string
  admissionNumber: string
  classId: string
  className: string
  gradebookEntries: number
  averageScore: number
  attendanceRate: number
}

type TeacherDashboardPayload = {
  generatedAt: string
  school: { type: string; name: string }
  currentUser: { id: string; name: string; email: string }
  metrics: {
    classes: number
    students: number
    subjects: number
    assessments: number
    pendingGrading: number
    averageScore: number
    attendanceRate: number
    lessonsToday: number
  }
  grades: TeacherGrade[]
  classes: TeacherClass[]
  subjects: TeacherSubject[]
  learners: TeacherLearner[]
}

type GradingInsight = {
  totalGrades: number
  averageScore: number
  highestScore: number
  lowestScore: number
  gradeDistribution: { [key: string]: number }
  subjectDistribution: { [key: string]: { count: number; avgScore: number } }
  classDistribution: { [key: string]: { count: number; avgScore: number } }
  studentDistribution: { [key: string]: { count: number; avgScore: number } }
  aboveAverageCount: number
  belowAverageCount: number
  excellentCount: number
  passCount: number
  failCount: number
}

const teacherHref = (path: string) => {
  const tenant = typeof window !== "undefined" ? window.location.pathname.split("/")[1] : ""
  return `/${tenant}${path}`
}

const formatDate = (dateString: string | null) => {
  if (!dateString) return "No date"
  const date = new Date(dateString)
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

const getGradeColor = (percentage: number) => {
  if (percentage >= 90) return "bg-emerald-50 text-emerald-700 border-emerald-200"
  if (percentage >= 80) return "bg-blue-50 text-blue-700 border-blue-200"
  if (percentage >= 70) return "bg-amber-50 text-amber-700 border-amber-200"
  if (percentage >= 60) return "bg-orange-50 text-orange-700 border-orange-200"
  return "bg-red-50 text-red-700 border-red-200"
}

const getGradingInsights = (grades: TeacherGrade[]): GradingInsight => {
  if (grades.length === 0) {
    return {
      totalGrades: 0,
      averageScore: 0,
      highestScore: 0,
      lowestScore: 0,
      gradeDistribution: {},
      subjectDistribution: {},
      classDistribution: {},
      studentDistribution: {},
      aboveAverageCount: 0,
      belowAverageCount: 0,
      excellentCount: 0,
      passCount: 0,
      failCount: 0,
    }
  }

  const percentages = grades.map((g) => g.percentage)
  const averageScore = Math.round((percentages.reduce((a, b) => a + b) / percentages.length) * 10) / 10
  const gradeDistribution: { [key: string]: number } = {}
  const subjectDistribution: { [key: string]: { count: number; scores: number[] } } = {}
  const classDistribution: { [key: string]: { count: number; scores: number[] } } = {}
  const studentDistribution: { [key: string]: { count: number; scores: number[] } } = {}

  grades.forEach((grade) => {
    gradeDistribution[grade.grade] = (gradeDistribution[grade.grade] || 0) + 1

    if (!subjectDistribution[grade.subject]) subjectDistribution[grade.subject] = { count: 0, scores: [] }
    subjectDistribution[grade.subject].count++
    subjectDistribution[grade.subject].scores.push(grade.percentage)

    if (!classDistribution[grade.className]) classDistribution[grade.className] = { count: 0, scores: [] }
    classDistribution[grade.className].count++
    classDistribution[grade.className].scores.push(grade.percentage)

    if (!studentDistribution[grade.studentName]) studentDistribution[grade.studentName] = { count: 0, scores: [] }
    studentDistribution[grade.studentName].count++
    studentDistribution[grade.studentName].scores.push(grade.percentage)
  })

  const subjectDist = Object.entries(subjectDistribution).reduce(
    (acc, [subject, data]) => ({
      ...acc,
      [subject]: { count: data.count, avgScore: Math.round((data.scores.reduce((a, b) => a + b) / data.scores.length) * 10) / 10 },
    }),
    {} as Record<string, { count: number; avgScore: number }>
  )

  const classDist = Object.entries(classDistribution).reduce(
    (acc, [cls, data]) => ({
      ...acc,
      [cls]: { count: data.count, avgScore: Math.round((data.scores.reduce((a, b) => a + b) / data.scores.length) * 10) / 10 },
    }),
    {} as Record<string, { count: number; avgScore: number }>
  )

  const studentDist = Object.entries(studentDistribution).reduce(
    (acc, [student, data]) => ({
      ...acc,
      [student]: { count: data.count, avgScore: Math.round((data.scores.reduce((a, b) => a + b) / data.scores.length) * 10) / 10 },
    }),
    {} as Record<string, { count: number; avgScore: number }>
  )

  const excellentCount = grades.filter((g) => g.percentage >= 90).length
  const passCount = grades.filter((g) => g.percentage >= 60).length
  const failCount = grades.filter((g) => g.percentage < 60).length
  const aboveAverage = grades.filter((g) => g.percentage > averageScore).length
  const belowAverage = grades.filter((g) => g.percentage < averageScore).length

  return {
    totalGrades: grades.length,
    averageScore,
    highestScore: Math.max(...percentages),
    lowestScore: Math.min(...percentages),
    gradeDistribution,
    subjectDistribution: subjectDist,
    classDistribution: classDist,
    studentDistribution: studentDist,
    aboveAverageCount: aboveAverage,
    belowAverageCount: belowAverage,
    excellentCount,
    passCount,
    failCount,
  }
}

export default function GradesPage() {
  const router = useRouter()
  const [payload, setPayload] = React.useState<TeacherDashboardPayload | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [activeView, setActiveView] = React.useState<"list" | "grid" | "student">("list")
  const [filterClass, setFilterClass] = React.useState("all")
  const [filterSubject, setFilterSubject] = React.useState("all")
  const [filterStudent, setFilterStudent] = React.useState("all")
  const [filterGrade, setFilterGrade] = React.useState("all")
  const [search, setSearch] = React.useState("")
  const [sortBy, setSortBy] = React.useState("date-desc")
  const [selectedGrade, setSelectedGrade] = React.useState<TeacherGrade | null>(null)
  const [detailsDialogOpen, setDetailsDialogOpen] = React.useState(false)

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(teacherDashboardApi("grades"))
        if (!res.ok) throw new Error(`API error: ${res.status}`)
        const data = await res.json()
        setPayload(data)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load grades")
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const grades = React.useMemo(() => payload?.grades || [], [payload])
  const classes = React.useMemo(() => payload?.classes || [], [payload])
  const subjects = React.useMemo(() => payload?.subjects || [], [payload])
  const learners = React.useMemo(() => payload?.learners || [], [payload])
  const insights = React.useMemo(() => getGradingInsights(grades), [grades])

  const filteredGrades = React.useMemo(() => {
    return grades
      .filter((g) => filterClass === "all" || g.classId === filterClass)
      .filter((g) => filterSubject === "all" || g.subjectId === filterSubject)
      .filter((g) => filterStudent === "all" || g.studentId === filterStudent)
      .filter((g) => {
        if (filterGrade === "all") return true
        if (filterGrade === "excellent") return g.percentage >= 90
        if (filterGrade === "good") return g.percentage >= 80 && g.percentage < 90
        if (filterGrade === "satisfactory") return g.percentage >= 70 && g.percentage < 80
        if (filterGrade === "fair") return g.percentage >= 60 && g.percentage < 70
        if (filterGrade === "fail") return g.percentage < 60
        return true
      })
      .filter((g) => !search || [g.studentName, g.subject, g.assessment, g.className].some((v) => v.toLowerCase().includes(search.toLowerCase())))
      .sort((a, b) => {
        if (sortBy === "date-desc") return new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime()
        if (sortBy === "date-asc") return new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime()
        if (sortBy === "score-high") return b.percentage - a.percentage
        if (sortBy === "score-low") return a.percentage - b.percentage
        if (sortBy === "student") return a.studentName.localeCompare(b.studentName)
        if (sortBy === "subject") return a.subject.localeCompare(b.subject)
        return 0
      })
  }, [grades, filterClass, filterSubject, filterStudent, filterGrade, search, sortBy])

  const classIds = React.useMemo(() => [...new Set(grades.map((g) => g.classId))], [grades])
  const subjectIds = React.useMemo(() => [...new Set(grades.map((g) => g.subjectId))], [grades])
  const studentIds = React.useMemo(() => [...new Set(grades.map((g) => g.studentId))], [grades])

  const exportToCSV = () => {
    if (filteredGrades.length === 0) {
      toast.error("No grades to export")
      return
    }
    const headers = ["Date", "Student", "Class", "Subject", "Assessment", "Score", "Max Score", "Percentage", "Grade"]
    const rows = filteredGrades.map((g) => [
      formatDate(g.date),
      g.studentName,
      g.className,
      g.subject,
      g.assessment,
      g.score,
      g.maxScore,
      `${g.percentage}%`,
      g.grade,
    ])
    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `grades-export-${new Date().toISOString().split("T")[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
    toast.success("Grades exported successfully")
  }

  if (loading) {
    return (
      <div className="w-full space-y-6 p-6 lg:p-8">
        <Skeleton className="h-48 rounded-3xl" />
        <Skeleton className="h-60 rounded-3xl" />
        <Skeleton className="h-96 rounded-3xl" />
      </div>
    )
  }

  if (error || !payload) {
    return (
      <div className="w-full p-6 lg:p-8">
        <Card className="rounded-3xl border-destructive/20 bg-destructive/5 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="size-5" />
              Unable to Load Grades
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">{error || "Grade data could not be loaded."}</p>
            <Button onClick={() => window.location.reload()}>Retry</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const schoolLevel = payload.school.type?.toLowerCase() || "secondary"
  const isUniversity = schoolLevel.includes("university") || schoolLevel.includes("college")
  const isPrimary = schoolLevel.includes("primary")

  return (
    <div className="w-full space-y-6 p-6 lg:p-8">
      {/* Hero Section */}
      <section className="overflow-hidden rounded-3xl border bg-card shadow-sm">
        <div className="relative p-6 md:p-8">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.18),transparent_34%),linear-gradient(135deg,rgba(34,197,94,0.12),transparent_46%)]" />
          <div className="relative flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
            <div className="max-w-4xl space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="bg-background/80">
                  <BarChart3 className="mr-1 size-3.5" />
                  Teacher workspace
                </Badge>
                <Badge variant="outline" className="bg-background/80">
                  Grading Hub
                </Badge>
              </div>
              <div>
                <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Grading Hub & Analytics</h1>
                <p className="mt-2 text-muted-foreground">
                  Manage grades, track student performance, and analyze grading trends across all your classes
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row xl:flex-col 2xl:flex-row">
              <Button variant="outline" onClick={() => window.location.reload()}>
                <RefreshCcw className="size-4" />
                Refresh
              </Button>
              <Button onClick={exportToCSV}>
                <Download className="size-4" />
                Export
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Metric Cards */}
      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {[
          { label: "Total Grades", value: insights.totalGrades, helper: "All records", icon: FileText, color: "bg-blue-50 text-blue-700" },
          { label: "Average Score", value: `${insights.averageScore}%`, helper: "Class average", icon: BarChart3, color: "bg-purple-50 text-purple-700" },
          { label: "Excellent (90%+)", value: insights.excellentCount, helper: "Top performers", icon: TrendingUp, color: "bg-emerald-50 text-emerald-700" },
          { label: "Pass Rate", value: `${Math.round((insights.passCount / insights.totalGrades) * 100)}%`, helper: "60% and above", icon: CheckCircle2, color: "bg-amber-50 text-amber-700" },
          { label: "Fail Count", value: insights.failCount, helper: "Below 60%", icon: TrendingDown, color: "bg-red-50 text-red-700" },
        ].map(({ label, value, helper, icon: Icon, color }, idx) => {
          const [bgColor, textColor] = color.split(" ")
          return (
            <Card key={idx} className="rounded-3xl shadow-sm">
              <CardContent className="flex min-h-32 items-start justify-between gap-4 p-5">
                <div>
                  <p className="text-sm text-muted-foreground">{label}</p>
                  <p className="mt-2 text-3xl font-semibold">{value}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{helper}</p>
                </div>
                <div className={cn("rounded-2xl p-3", color)}>
                  <Icon className="size-5" />
                </div>
              </CardContent>
            </Card>
          )
        })}
      </section>

      {/* Filters and View Tabs */}
      <section className="space-y-4">
        <div className="flex gap-2 border-b">
          {[
            { id: "list", label: "List View", icon: List },
            { id: "grid", label: "Grid View", icon: Grid },
            { id: "student", label: "By Student", icon: PieChart },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveView(id as any)}
              className={cn(
                "flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-all",
                activeView === id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="size-4" />
              {label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-3">
          <Input placeholder="Search grades..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
          <Select value={filterClass} onValueChange={setFilterClass}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Class" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Classes</SelectItem>
              {classIds.map((id) => {
                const cls = classes.find((c) => c.id === id)
                return (
                  <SelectItem key={id} value={id}>
                    {cls?.name || id}
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>
          <Select value={filterSubject} onValueChange={setFilterSubject}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Subject" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Subjects</SelectItem>
              {subjectIds.map((id) => {
                const subj = subjects.find((s) => s.id === id)
                return (
                  <SelectItem key={id} value={id}>
                    {subj?.name || id}
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>
          <Select value={filterStudent} onValueChange={setFilterStudent}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Student" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Students</SelectItem>
              {studentIds.map((id) => {
                const student = learners.find((l) => l.id === id)
                return (
                  <SelectItem key={id} value={id}>
                    {student?.name || id}
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>
          <Select value={filterGrade} onValueChange={setFilterGrade}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Grade Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Grades</SelectItem>
              <SelectItem value="excellent">90%+ (Excellent)</SelectItem>
              <SelectItem value="good">80-89% (Good)</SelectItem>
              <SelectItem value="satisfactory">70-79% (Satisfactory)</SelectItem>
              <SelectItem value="fair">60-69% (Fair)</SelectItem>
              <SelectItem value="fail">&lt;60% (Fail)</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date-desc">Latest First</SelectItem>
              <SelectItem value="date-asc">Oldest First</SelectItem>
              <SelectItem value="score-high">Highest Score</SelectItem>
              <SelectItem value="score-low">Lowest Score</SelectItem>
              <SelectItem value="student">Student A-Z</SelectItem>
              <SelectItem value="subject">Subject A-Z</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </section>

      {/* Main Content */}
      <section className="grid gap-6 lg:grid-cols-4">
        <div className="lg:col-span-3 space-y-4">
          {/* List View */}
          {activeView === "list" && (
            <Card className="rounded-3xl shadow-sm">
              <CardHeader>
                <CardTitle>Grades</CardTitle>
                <CardDescription>{filteredGrades.length} records</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {filteredGrades.map((grade) => (
                  <div
                    key={grade.id}
                    onClick={() => {
                      setSelectedGrade(grade)
                      setDetailsDialogOpen(true)
                    }}
                    className="grid gap-3 rounded-2xl border bg-card p-4 hover:bg-muted/50 transition-colors cursor-pointer md:grid-cols-[1fr_100px_80px_80px_100px] md:items-center"
                  >
                    <div>
                      <p className="font-medium">{grade.studentName}</p>
                      <p className="text-sm text-muted-foreground">
                        {grade.className} · {grade.subject} · {grade.assessment}
                      </p>
                    </div>
                    <div className="text-sm">
                      <p className="text-muted-foreground">Type</p>
                      <Badge variant="outline" className="text-xs">
                        {grade.type}
                      </Badge>
                    </div>
                    <div className="text-sm">
                      <p className="text-muted-foreground">Date</p>
                      <p className="font-medium text-xs">{formatDate(grade.date)}</p>
                    </div>
                    <div className="text-sm">
                      <p className="text-muted-foreground">Score</p>
                      <p className="font-medium">
                        {grade.score}/{grade.maxScore}
                      </p>
                    </div>
                    <div>
                      <Badge className={cn("text-xs font-semibold", getGradeColor(grade.percentage))}>{grade.percentage}%</Badge>
                    </div>
                  </div>
                ))}
                {filteredGrades.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No grades match filters</p>}
              </CardContent>
            </Card>
          )}

          {/* Grid View */}
          {activeView === "grid" && (
            <div className="grid gap-4 md:grid-cols-2">
              {filteredGrades.map((grade) => (
                <Card
                  key={grade.id}
                  className="rounded-3xl shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => {
                    setSelectedGrade(grade)
                    setDetailsDialogOpen(true)
                  }}
                >
                  <CardHeader>
                    <CardTitle className="line-clamp-2">{grade.studentName}</CardTitle>
                    <CardDescription>{grade.className}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Subject</p>
                        <p className="font-medium">{grade.subject}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Assessment</p>
                        <p className="font-medium text-sm line-clamp-1">{grade.assessment}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Type</p>
                        <p className="font-medium">{grade.type}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Date</p>
                        <p className="font-medium text-xs">{formatDate(grade.date)}</p>
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm text-muted-foreground">Score</p>
                        <p className="text-sm font-semibold">
                          {grade.score}/{grade.maxScore}
                        </p>
                      </div>
                      <Progress value={(grade.percentage / 100) * 100} />
                      <p className="text-xs text-muted-foreground mt-2">
                        <Badge className={cn("text-xs font-semibold", getGradeColor(grade.percentage))}>{grade.percentage}%</Badge>
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Student Summary View */}
          {activeView === "student" && (
            <div className="space-y-4">
              {Object.entries(insights.studentDistribution)
                .sort((a, b) => b[1].avgScore - a[1].avgScore)
                .map(([studentName, data]) => {
                  const studentGrades = filteredGrades.filter((g) => g.studentName === studentName)
                  const studentInfo = learners.find((l) => l.name === studentName)
                  if (studentGrades.length === 0) return null
                  return (
                    <Card key={studentName} className="rounded-3xl shadow-sm">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle>{studentName}</CardTitle>
                            <CardDescription>{studentInfo?.className || ""}</CardDescription>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-semibold">{data.avgScore}%</p>
                            <Badge className={cn("mt-2", getGradeColor(data.avgScore))}>{data.count} grades</Badge>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <Progress value={(data.avgScore / 100) * 100} />
                        <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
                          {studentGrades.slice(0, 2).map((grade, idx) => (
                            <div key={idx}>
                              <p className="text-muted-foreground">{grade.subject}</p>
                              <p className="font-medium">{grade.percentage}% - {grade.assessment}</p>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
            </div>
          )}

          {/* Analytics Cards */}
          <section className="grid gap-6 md:grid-cols-2">
            <Card className="rounded-3xl shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="size-5 text-blue-500" />
                  Subject Performance
                </CardTitle>
                <CardDescription>Average score by subject</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {Object.entries(insights.subjectDistribution)
                  .sort((a, b) => b[1].avgScore - a[1].avgScore)
                  .slice(0, 6)
                  .map(([subject, data]) => (
                    <div key={subject}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium line-clamp-1">{subject}</span>
                        <span className="text-muted-foreground">{data.avgScore}%</span>
                      </div>
                      <Progress value={data.avgScore} className="h-1.5" />
                    </div>
                  ))}
              </CardContent>
            </Card>

            <Card className="rounded-3xl shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="size-5 text-emerald-500" />
                  Class Performance
                </CardTitle>
                <CardDescription>Average score by class</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {Object.entries(insights.classDistribution)
                  .sort((a, b) => b[1].avgScore - a[1].avgScore)
                  .map(([cls, data]) => (
                    <div key={cls} className="flex items-center justify-between">
                      <span className="text-sm font-medium">{cls}</span>
                      <div className="flex items-center gap-2">
                        <Progress value={data.avgScore} className="w-20 h-1.5" />
                        <Badge variant="outline">{data.avgScore}%</Badge>
                      </div>
                    </div>
                  ))}
              </CardContent>
            </Card>

            <Card className="rounded-3xl shadow-sm md:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="size-5 text-purple-500" />
                  Grade Distribution
                </CardTitle>
                <CardDescription>Number of grades per performance level</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4 md:grid-cols-5">
                {[
                  { label: "Excellent (90%+)", value: insights.excellentCount, color: "bg-emerald-50 text-emerald-700" },
                  { label: "Good (80-89%)", value: insights.gradeDistribution["A"] || 0, color: "bg-blue-50 text-blue-700" },
                  { label: "Satisfactory (70-79%)", value: insights.gradeDistribution["B"] || 0, color: "bg-amber-50 text-amber-700" },
                  { label: "Fair (60-69%)", value: insights.gradeDistribution["C"] || 0, color: "bg-orange-50 text-orange-700" },
                  { label: "Fail (<60%)", value: insights.failCount, color: "bg-red-50 text-red-700" },
                ].map(({ label, value, color }, idx) => (
                  <div key={idx} className={cn("p-3 rounded-2xl text-center", color)}>
                    <p className="text-sm font-semibold">{value}</p>
                    <p className="text-xs">{label}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </section>
        </div>

        {/* Sidebar */}
        <aside className="space-y-6">
          <Card className="rounded-3xl shadow-sm bg-gradient-to-br from-blue-50 to-blue-50/50 border-blue-100/50">
            <CardHeader>
              <CardTitle className="text-blue-900">Performance Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: "Total Grades", value: insights.totalGrades, icon: FileText },
                { label: "Average", value: `${insights.averageScore}%`, icon: BarChart3 },
                { label: "Highest", value: `${insights.highestScore}%`, icon: TrendingUp },
                { label: "Lowest", value: `${insights.lowestScore}%`, icon: TrendingDown },
              ].map(({ label, value, icon: Icon }) => (
                <div key={label} className="flex items-center justify-between p-2 rounded-xl bg-white/50">
                  <div className="flex items-center gap-2">
                    <Icon className="size-4 text-blue-600" />
                    <span className="text-sm font-medium">{label}</span>
                  </div>
                  <Badge variant="outline" className="text-sm">
                    {value}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="rounded-3xl shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="size-5 text-amber-500" />
                Performance Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                { label: "Pass Rate", value: `${Math.round((insights.passCount / insights.totalGrades) * 100)}%`, color: "bg-emerald-50 text-emerald-700" },
                { label: "Fail Rate", value: `${Math.round((insights.failCount / insights.totalGrades) * 100)}%`, color: "bg-red-50 text-red-700" },
                { label: "Above Average", value: `${insights.aboveAverageCount} students`, color: "bg-blue-50 text-blue-700" },
                { label: "Below Average", value: `${insights.belowAverageCount} students`, color: "bg-amber-50 text-amber-700" },
              ].map(({ label, value, color }, idx) => (
                <div key={idx} className={cn("p-3 rounded-2xl", color)}>
                  <p className="text-xs font-medium">{label}</p>
                  <p className="font-semibold text-sm">{value}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Button className="w-full" onClick={() => router.push(teacherHref("/teacher/dashboard"))}>
            <Home className="mr-2 size-4" />
            Back to Dashboard
          </Button>
        </aside>
      </section>

      {/* Details Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedGrade?.studentName} - {selectedGrade?.subject}</DialogTitle>
            <DialogDescription>{selectedGrade?.className} · {selectedGrade?.assessment}</DialogDescription>
          </DialogHeader>
          {selectedGrade && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Assessment Type</p>
                  <p className="font-medium">{selectedGrade.type}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Date</p>
                  <p className="font-medium">{formatDate(selectedGrade.date)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Score</p>
                  <p className="font-medium">
                    {selectedGrade.score} / {selectedGrade.maxScore}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Grade</p>
                  <p className="font-medium">{selectedGrade.grade}</p>
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-2">Performance</p>
                <Progress value={selectedGrade.percentage} />
                <p className="text-xs text-muted-foreground mt-1">
                  <Badge className={cn("mt-2", getGradeColor(selectedGrade.percentage))}>{selectedGrade.percentage}%</Badge>
                </p>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setDetailsDialogOpen(false)}>
                  Close
                </Button>
                <Button onClick={() => router.push(teacherHref("/teacher/dashboard"))}>
                  <Edit className="mr-2 size-4" />
                  Edit Grade
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
