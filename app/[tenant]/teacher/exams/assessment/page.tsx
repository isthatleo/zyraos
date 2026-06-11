"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  AlertCircle,
  BarChart3,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  Edit,
  Eye,
  FileText,
  Filter,
  Home,
  List,
  RefreshCcw,
  Search,
  TrendingDown,
  TrendingUp,
  Users,
  Grid,
  Save,
  X,
  Zap,
  Activity,
  BookOpen,
  AlertTriangle,
  Award,
  Target,
  Percent,
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

type StudentAssessment = {
  id: string
  studentId: string
  studentName: string
  admissionNumber: string
  className: string
  examId: string
  examName: string
  subject: string
  date: string
  marksObtained: number
  totalMarks: number
  percentage: number
  status: "pass" | "fail"
  grade: string
  remarks: string | null
  submittedOn: string
  checkedOn: string
}

type AssessmentInsight = {
  totalAssessments: number
  studentsPassed: number
  studentsFailed: number
  passPercentage: number
  failPercentage: number
  averageMarks: number
  highestMarks: number
  lowestMarks: number
  classAverage: number
  assessmentsBySubject: { [key: string]: number }
  assessmentsByGrade: { [key: string]: number }
  performanceDistribution: { range: string; count: number }[]
  topPerformers: StudentAssessment[]
  needsImprovement: StudentAssessment[]
}

const GRADE_COLORS = {
  "A+": "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400",
  "A": "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400",
  "B": "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400",
  "C": "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",
  "D": "bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400",
  "F": "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400",
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

const getGrade = (percentage: number): string => {
  if (percentage >= 90) return "A+"
  if (percentage >= 80) return "A"
  if (percentage >= 70) return "B"
  if (percentage >= 60) return "C"
  if (percentage >= 50) return "D"
  return "F"
}

const getPerformanceColor = (percentage: number) => {
  if (percentage >= 90) return "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
  if (percentage >= 75) return "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400"
  if (percentage >= 60) return "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
  return "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400"
}

const getAssessmentInsights = (assessments: StudentAssessment[]): AssessmentInsight => {
  if (assessments.length === 0) {
    return {
      totalAssessments: 0,
      studentsPassed: 0,
      studentsFailed: 0,
      passPercentage: 0,
      failPercentage: 0,
      averageMarks: 0,
      highestMarks: 0,
      lowestMarks: 0,
      classAverage: 0,
      assessmentsBySubject: {},
      assessmentsByGrade: {},
      performanceDistribution: [],
      topPerformers: [],
      needsImprovement: [],
    }
  }

  const passed = assessments.filter((a) => a.status === "pass").length
  const failed = assessments.filter((a) => a.status === "fail").length
  const percentages = assessments.map((a) => a.percentage)
  const marks = assessments.map((a) => a.marksObtained)

  const assessmentsBySubject: { [key: string]: number } = {}
  const assessmentsByGrade: { [key: string]: number } = {}

  assessments.forEach((assessment) => {
    assessmentsBySubject[assessment.subject] = (assessmentsBySubject[assessment.subject] || 0) + 1
    const grade = getGrade(assessment.percentage)
    assessmentsByGrade[grade] = (assessmentsByGrade[grade] || 0) + 1
  })

  const topPerformers = [...assessments].sort((a, b) => b.percentage - a.percentage).slice(0, 5)
  const needsImprovement = [...assessments].filter((a) => a.percentage < 50).sort((a, b) => a.percentage - b.percentage).slice(0, 5)

  return {
    totalAssessments: assessments.length,
    studentsPassed: passed,
    studentsFailed: failed,
    passPercentage: assessments.length > 0 ? Math.round((passed / assessments.length) * 100) : 0,
    failPercentage: assessments.length > 0 ? Math.round((failed / assessments.length) * 100) : 0,
    averageMarks: Math.round(marks.reduce((sum, m) => sum + m, 0) / assessments.length),
    highestMarks: Math.max(...marks),
    lowestMarks: Math.min(...marks),
    classAverage: Math.round(percentages.reduce((sum, p) => sum + p, 0) / assessments.length),
    assessmentsBySubject,
    assessmentsByGrade,
    performanceDistribution: [
      { range: "90-100%", count: assessments.filter((a) => a.percentage >= 90).length },
      { range: "75-89%", count: assessments.filter((a) => a.percentage >= 75 && a.percentage < 90).length },
      { range: "60-74%", count: assessments.filter((a) => a.percentage >= 60 && a.percentage < 75).length },
      { range: "Below 60%", count: assessments.filter((a) => a.percentage < 60).length },
    ],
    topPerformers,
    needsImprovement,
  }
}

const teacherHref = (path: string) => {
  const tenant = typeof window !== "undefined" ? window.location.pathname.split("/")[1] : ""
  return `/${tenant}${path}`
}

export default function AssessmentPage() {
  const router = useRouter()
  const [tenant, setTenant] = React.useState("")
  const [assessments, setAssessments] = React.useState<StudentAssessment[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [activeView, setActiveView] = React.useState<"list" | "grid">("list")
  const [filterStatus, setFilterStatus] = React.useState("all")
  const [filterSubject, setFilterSubject] = React.useState("all")
  const [filterGrade, setFilterGrade] = React.useState("all")
  const [search, setSearch] = React.useState("")
  const [sortBy, setSortBy] = React.useState("percentage-desc")
  const [selectedAssessment, setSelectedAssessment] = React.useState<StudentAssessment | null>(null)
  const [detailsDialogOpen, setDetailsDialogOpen] = React.useState(false)
  const [editingAssessment, setEditingAssessment] = React.useState<StudentAssessment | null>(null)
  const [editDialogOpen, setEditDialogOpen] = React.useState(false)

  React.useEffect(() => {
    const tenantSlug = typeof window !== "undefined" ? window.location.pathname.split("/")[1] : ""
    setTenant(tenantSlug)
  }, [])

  React.useEffect(() => {
    if (!tenant) return

    const fetchData = async () => {
      try {
        setLoading(true)
        const res = await fetch(`/api/teacher/dashboard`)
        if (!res.ok) throw new Error(`API error: ${res.status}`)
        const data = await res.json()
        setAssessments(data.assessments || [])
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load assessments")
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [tenant])

  const insights = React.useMemo(() => getAssessmentInsights(assessments), [assessments])

  const filteredAssessments = React.useMemo(() => {
    return assessments
      .filter((a) => filterStatus === "all" || a.status === filterStatus)
      .filter((a) => filterSubject === "all" || a.subject === filterSubject)
      .filter((a) => {
        if (filterGrade === "all") return true
        const grade = getGrade(a.percentage)
        return grade === filterGrade
      })
      .filter(
        (a) =>
          !search ||
          a.studentName.toLowerCase().includes(search.toLowerCase()) ||
          a.admissionNumber.toLowerCase().includes(search.toLowerCase()) ||
          a.examName.toLowerCase().includes(search.toLowerCase())
      )
      .sort((a, b) => {
        if (sortBy === "percentage-desc") return b.percentage - a.percentage
        if (sortBy === "percentage-asc") return a.percentage - b.percentage
        if (sortBy === "name") return a.studentName.localeCompare(b.studentName)
        if (sortBy === "marks-desc") return b.marksObtained - a.marksObtained
        return 0
      })
  }, [assessments, filterStatus, filterSubject, filterGrade, search, sortBy])

  const subjects = React.useMemo(() => [...new Set(assessments.map((a) => a.subject))], [assessments])

  const exportToCSV = () => {
    if (filteredAssessments.length === 0) {
      toast.error("No assessments to export")
      return
    }
    const headers = ["Student", "Admission No", "Class", "Exam", "Subject", "Marks Obtained", "Total Marks", "Percentage", "Grade", "Status", "Date"]
    const rows = filteredAssessments.map((a) => [
      a.studentName,
      a.admissionNumber,
      a.className,
      a.examName,
      a.subject,
      a.marksObtained,
      a.totalMarks,
      `${a.percentage}%`,
      getGrade(a.percentage),
      a.status.charAt(0).toUpperCase() + a.status.slice(1),
      formatDate(a.date),
    ])
    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `assessments-${new Date().toISOString().split("T")[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
    toast.success("Assessments exported successfully")
  }

  const updateAssessment = async () => {
    if (!editingAssessment || !tenant) return

    try {
      const res = await fetch(`/api/teacher/dashboard`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "assessment.update",
          assessmentId: editingAssessment.id,
          marksObtained: editingAssessment.marksObtained,
          remarks: editingAssessment.remarks,
        }),
      })

      if (!res.ok) throw new Error("Failed to update assessment")

      const data = await res.json()
      setAssessments(data.assessments || [])
      setEditDialogOpen(false)
      setEditingAssessment(null)
      toast.success("Assessment updated successfully")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update assessment")
    }
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

  if (error) {
    return (
      <div className="w-full p-6 lg:p-8">
        <Card className="rounded-3xl border-destructive/20 bg-destructive/5 shadow-sm dark:bg-red-950/20 dark:border-red-900/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 dark:text-red-300">
              <AlertCircle className="size-5" />
              Unable to Load Assessments
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground dark:text-slate-400">{error}</p>
            <Button onClick={() => window.location.reload()} className="dark:bg-blue-600 dark:hover:bg-blue-700">
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="w-full space-y-6 p-6 lg:p-8">
      {/* Hero Section */}
      <section className="overflow-hidden rounded-3xl border bg-card shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="relative p-6 md:p-8">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,197,94,0.18),transparent_34%),linear-gradient(135deg,rgba(14,165,233,0.12),transparent_46%)] dark:bg-[radial-gradient(circle_at_top_right,rgba(34,197,94,0.08),transparent_34%),linear-gradient(135deg,rgba(14,165,233,0.06),transparent_46%)]" />
          <div className="relative flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
            <div className="max-w-4xl space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="bg-background/80 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700">
                  <Award className="mr-1 size-3.5" />
                  Teacher workspace
                </Badge>
                <Badge variant="outline" className="bg-background/80 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700">
                  Assessment
                </Badge>
              </div>
              <div>
                <h1 className="text-3xl font-semibold tracking-tight md:text-4xl dark:text-white">Assessment & Performance</h1>
                <p className="mt-2 text-muted-foreground dark:text-slate-400">
                  Track student performance, analyze results, and generate comprehensive assessment reports
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row xl:flex-col 2xl:flex-row">
              <Button variant="outline" onClick={() => window.location.reload()} className="dark:bg-slate-800 dark:border-slate-700 dark:hover:bg-slate-700 dark:text-white">
                <RefreshCcw className="size-4" />
                Refresh
              </Button>
              <Button onClick={exportToCSV} className="dark:bg-emerald-600 dark:hover:bg-emerald-700">
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
          { label: "Total Assessments", value: insights.totalAssessments, helper: "All records", icon: FileText, color: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400" },
          { label: "Passed", value: insights.studentsPassed, helper: "Students passed", icon: CheckCircle2, color: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400" },
          { label: "Failed", value: insights.studentsFailed, helper: "Need improvement", icon: AlertCircle, color: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400" },
          { label: "Pass Rate", value: `${insights.passPercentage}%`, helper: "Overall rate", icon: TrendingUp, color: "bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400" },
          { label: "Class Average", value: `${insights.classAverage}%`, helper: "Average score", icon: BarChart3, color: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400" },
        ].map(({ label, value, helper, icon: Icon, color }, idx) => (
          <Card key={idx} className="rounded-3xl shadow-sm dark:bg-slate-900 dark:border-slate-800">
            <CardContent className="flex min-h-32 items-start justify-between gap-4 p-5">
              <div>
                <p className="text-sm text-muted-foreground dark:text-slate-400">{label}</p>
                <p className="mt-2 text-3xl font-semibold dark:text-white">{value}</p>
                <p className="mt-1 text-xs text-muted-foreground dark:text-slate-500">{helper}</p>
              </div>
              <div className={cn("rounded-2xl p-3", color)}>
                <Icon className="size-5" />
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

      {/* Filters and View Tabs */}
      <section className="space-y-4">
        <div className="flex gap-2 border-b dark:border-slate-700">
          {[
            { id: "list", label: "List View", icon: List },
            { id: "grid", label: "Grid View", icon: Grid },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveView(id as any)}
              className={cn(
                "flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-all",
                activeView === id
                  ? "border-primary text-primary dark:text-blue-400 dark:border-blue-400"
                  : "border-transparent text-muted-foreground dark:text-slate-400 hover:text-foreground dark:hover:text-slate-200"
              )}
            >
              <Icon className="size-4" />
              {label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-3">
          <Input
            placeholder="Search assessments..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs dark:bg-slate-800 dark:border-slate-700 dark:text-white dark:placeholder:text-slate-500"
          />
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[140px] dark:bg-slate-800 dark:border-slate-700 dark:text-white">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="dark:bg-slate-800 dark:border-slate-700">
              <SelectItem value="all" className="dark:text-white">
                All Status
              </SelectItem>
              <SelectItem value="pass" className="dark:text-white">
                Passed
              </SelectItem>
              <SelectItem value="fail" className="dark:text-white">
                Failed
              </SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterSubject} onValueChange={setFilterSubject}>
            <SelectTrigger className="w-[140px] dark:bg-slate-800 dark:border-slate-700 dark:text-white">
              <SelectValue placeholder="Subject" />
            </SelectTrigger>
            <SelectContent className="dark:bg-slate-800 dark:border-slate-700">
              <SelectItem value="all" className="dark:text-white">
                All Subjects
              </SelectItem>
              {subjects.map((subject) => (
                <SelectItem key={subject} value={subject} className="dark:text-white">
                  {subject}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterGrade} onValueChange={setFilterGrade}>
            <SelectTrigger className="w-[140px] dark:bg-slate-800 dark:border-slate-700 dark:text-white">
              <SelectValue placeholder="Grade" />
            </SelectTrigger>
            <SelectContent className="dark:bg-slate-800 dark:border-slate-700">
              <SelectItem value="all" className="dark:text-white">
                All Grades
              </SelectItem>
              {["A+", "A", "B", "C", "D", "F"].map((grade) => (
                <SelectItem key={grade} value={grade} className="dark:text-white">
                  {grade}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[140px] dark:bg-slate-800 dark:border-slate-700 dark:text-white">
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent className="dark:bg-slate-800 dark:border-slate-700">
              <SelectItem value="percentage-desc" className="dark:text-white">
                Highest First
              </SelectItem>
              <SelectItem value="percentage-asc" className="dark:text-white">
                Lowest First
              </SelectItem>
              <SelectItem value="name" className="dark:text-white">
                Student A-Z
              </SelectItem>
              <SelectItem value="marks-desc" className="dark:text-white">
                Marks High to Low
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </section>

      {/* Main Content */}
      <section className="grid gap-6 lg:grid-cols-4">
        <div className="lg:col-span-3 space-y-4">
          {activeView === "list" && (
            <Card className="rounded-3xl shadow-sm dark:bg-slate-900 dark:border-slate-800">
              <CardHeader>
                <CardTitle className="dark:text-white">Assessment Results</CardTitle>
                <CardDescription className="dark:text-slate-400">{filteredAssessments.length} records</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {filteredAssessments.map((assessment) => (
                  <div
                    key={assessment.id}
                    onClick={() => {
                      setSelectedAssessment(assessment)
                      setDetailsDialogOpen(true)
                    }}
                    className="grid gap-3 rounded-2xl border bg-card hover:bg-muted/50 transition-colors cursor-pointer md:grid-cols-[1fr_100px_80px_100px_80px] md:items-center p-4 dark:bg-slate-800 dark:border-slate-700 dark:hover:bg-slate-700"
                  >
                    <div>
                      <p className="font-medium dark:text-white">{assessment.studentName}</p>
                      <p className="text-sm text-muted-foreground dark:text-slate-400">{assessment.examName}</p>
                    </div>
                    <div className="text-sm">
                      <p className="text-muted-foreground dark:text-slate-400">Subject</p>
                      <p className="font-medium text-xs dark:text-white">{assessment.subject}</p>
                    </div>
                    <div className="text-sm">
                      <p className="text-muted-foreground dark:text-slate-400">Marks</p>
                      <p className="font-medium text-xs dark:text-white">{assessment.marksObtained}/{assessment.totalMarks}</p>
                    </div>
                    <div className="text-sm">
                      <p className="text-muted-foreground dark:text-slate-400">Percentage</p>
                      <p className="font-medium text-xs dark:text-white">{assessment.percentage}%</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={cn("text-xs font-semibold", GRADE_COLORS[getGrade(assessment.percentage) as keyof typeof GRADE_COLORS])}>
                        {getGrade(assessment.percentage)}
                      </Badge>
                      <Badge
                        className={cn(
                          "text-xs",
                          assessment.status === "pass"
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                            : "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400"
                        )}
                      >
                        {assessment.status.charAt(0).toUpperCase() + assessment.status.slice(1)}
                      </Badge>
                    </div>
                  </div>
                ))}
                {filteredAssessments.length === 0 && (
                  <p className="text-sm text-muted-foreground dark:text-slate-400 text-center py-8">No assessments match filters</p>
                )}
              </CardContent>
            </Card>
          )}

          {activeView === "grid" && (
            <div className="grid gap-4 md:grid-cols-2">
              {filteredAssessments.map((assessment) => (
                <Card
                  key={assessment.id}
                  className="rounded-3xl shadow-sm hover:shadow-md transition-shadow cursor-pointer dark:bg-slate-900 dark:border-slate-800"
                  onClick={() => {
                    setSelectedAssessment(assessment)
                    setDetailsDialogOpen(true)
                  }}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <CardTitle className="line-clamp-2 dark:text-white">{assessment.studentName}</CardTitle>
                        <CardDescription className="dark:text-slate-400">{assessment.admissionNumber}</CardDescription>
                      </div>
                      <Badge className={cn("text-xs font-semibold", GRADE_COLORS[getGrade(assessment.percentage) as keyof typeof GRADE_COLORS])}>
                        {getGrade(assessment.percentage)}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground dark:text-slate-400">Exam</p>
                        <p className="font-medium dark:text-white line-clamp-1">{assessment.examName}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground dark:text-slate-400">Subject</p>
                        <p className="font-medium dark:text-white">{assessment.subject}</p>
                      </div>
                    </div>
                    <div className="border-t pt-3 dark:border-slate-700">
                      <div className="flex items-center justify-between text-xs mb-2">
                        <span className="font-medium dark:text-white">Performance</span>
                        <span className="font-semibold text-blue-600 dark:text-blue-400">{assessment.percentage}%</span>
                      </div>
                      <Progress value={assessment.percentage} className="h-2" />
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2 rounded-xl bg-muted dark:bg-slate-700">
                        <p className="text-muted-foreground dark:text-slate-400">Marks</p>
                        <p className="font-semibold dark:text-white">{assessment.marksObtained}/{assessment.totalMarks}</p>
                      </div>
                      <div className="p-2 rounded-xl bg-muted dark:bg-slate-700">
                        <p className="text-muted-foreground dark:text-slate-400">Status</p>
                        <Badge
                          className={cn(
                            "text-xs mt-1",
                            assessment.status === "pass"
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                              : "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400"
                          )}
                        >
                          {assessment.status.charAt(0).toUpperCase() + assessment.status.slice(1)}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Analytics Cards */}
          <section className="grid gap-6 md:grid-cols-2">
            <Card className="rounded-3xl shadow-sm dark:bg-slate-900 dark:border-slate-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 dark:text-white">
                  <BarChart3 className="size-5 text-blue-500" />
                  Performance Distribution
                </CardTitle>
                <CardDescription className="dark:text-slate-400">Score ranges</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {insights.performanceDistribution.map((dist) => (
                  <div key={dist.range}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium dark:text-white">{dist.range}</span>
                      <span className="text-muted-foreground dark:text-slate-400">{dist.count} students</span>
                    </div>
                    <Progress value={(dist.count / insights.totalAssessments) * 100} className="h-1.5" />
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="rounded-3xl shadow-sm dark:bg-slate-900 dark:border-slate-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 dark:text-white">
                  <Award className="size-5 text-purple-500" />
                  Grade Breakdown
                </CardTitle>
                <CardDescription className="dark:text-slate-400">Distribution by grade</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {["A+", "A", "B", "C", "D", "F"].map((grade) => {
                  const count = insights.assessmentsByGrade[grade] || 0
                  return (
                    <div key={grade} className="flex items-center justify-between">
                      <span className="text-sm font-medium dark:text-white">{grade}</span>
                      <Badge className={cn("text-xs", GRADE_COLORS[grade as keyof typeof GRADE_COLORS])}>
                        {count}
                      </Badge>
                    </div>
                  )
                })}
              </CardContent>
            </Card>

            <Card className="rounded-3xl shadow-sm dark:bg-slate-900 dark:border-slate-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 dark:text-white">
                  <Target className="size-5 text-amber-500" />
                  Assessment Metrics
                </CardTitle>
                <CardDescription className="dark:text-slate-400">Key statistics</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { label: "Highest Score", value: `${insights.highestMarks}%` },
                  { label: "Lowest Score", value: `${insights.lowestMarks}%` },
                  { label: "Average Marks", value: insights.averageMarks },
                  { label: "Pass Rate", value: `${insights.passPercentage}%` },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between">
                    <span className="text-sm font-medium dark:text-white">{label}</span>
                    <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">{value}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="rounded-3xl shadow-sm dark:bg-slate-900 dark:border-slate-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 dark:text-white">
                  <Percent className="size-5 text-green-500" />
                  Subject Performance
                </CardTitle>
                <CardDescription className="dark:text-slate-400">By subject</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {Object.entries(insights.assessmentsBySubject).map(([subject, count]) => (
                  <div key={subject} className="flex items-center justify-between">
                    <span className="text-sm font-medium dark:text-white">{subject}</span>
                    <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400">{count}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </section>
        </div>

        {/* Sidebar */}
        <aside className="space-y-6">
          <Card className="rounded-3xl shadow-sm bg-gradient-to-br from-emerald-50 to-emerald-50/50 border-emerald-100/50 dark:from-emerald-950/40 dark:to-emerald-950/20 dark:border-emerald-900/50">
            <CardHeader>
              <CardTitle className="text-emerald-900 dark:text-emerald-300">Top Performers</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {insights.topPerformers.slice(0, 5).map((assessment, idx) => (
                <div key={assessment.id} className="p-2 rounded-xl bg-white/50 dark:bg-emerald-950/30">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium dark:text-emerald-200 line-clamp-1">{idx + 1}. {assessment.studentName}</p>
                      <p className="text-xs text-emerald-700 dark:text-emerald-400">{assessment.percentage}%</p>
                    </div>
                    <Badge className={cn("text-xs font-semibold ml-2", GRADE_COLORS[getGrade(assessment.percentage) as keyof typeof GRADE_COLORS])}>
                      {getGrade(assessment.percentage)}
                    </Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="rounded-3xl shadow-sm bg-gradient-to-br from-red-50 to-red-50/50 border-red-100/50 dark:from-red-950/40 dark:to-red-950/20 dark:border-red-900/50">
            <CardHeader>
              <CardTitle className="text-red-900 dark:text-red-300">Needs Improvement</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {insights.needsImprovement.slice(0, 5).map((assessment, idx) => (
                <div key={assessment.id} className="p-2 rounded-xl bg-white/50 dark:bg-red-950/30">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium dark:text-red-200 line-clamp-1">{idx + 1}. {assessment.studentName}</p>
                      <p className="text-xs text-red-700 dark:text-red-400">{assessment.percentage}%</p>
                    </div>
                    <Badge className={cn("text-xs font-semibold ml-2", GRADE_COLORS[getGrade(assessment.percentage) as keyof typeof GRADE_COLORS])}>
                      {getGrade(assessment.percentage)}
                    </Badge>
                  </div>
                </div>
              ))}
              {insights.needsImprovement.length === 0 && (
                <p className="text-sm text-muted-foreground dark:text-slate-400">Great! No students need improvement</p>
              )}
            </CardContent>
          </Card>

          <Button className="w-full dark:bg-blue-600 dark:hover:bg-blue-700" onClick={() => router.push(teacherHref("/teacher/dashboard"))}>
            <Home className="mr-2 size-4" />
            Back to Dashboard
          </Button>
        </aside>
      </section>

      {/* Details Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-2xl dark:bg-slate-900 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="dark:text-white">{selectedAssessment?.studentName}</DialogTitle>
            <DialogDescription className="dark:text-slate-400">{selectedAssessment?.className} · {selectedAssessment?.admissionNumber}</DialogDescription>
          </DialogHeader>
          {selectedAssessment && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground dark:text-slate-400">Exam</p>
                  <p className="font-medium dark:text-white">{selectedAssessment.examName}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground dark:text-slate-400">Subject</p>
                  <p className="font-medium dark:text-white">{selectedAssessment.subject}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground dark:text-slate-400">Date</p>
                  <p className="font-medium dark:text-white">{formatDate(selectedAssessment.date)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground dark:text-slate-400">Grade</p>
                  <Badge className={cn("text-xs font-semibold", GRADE_COLORS[getGrade(selectedAssessment.percentage) as keyof typeof GRADE_COLORS])}>
                    {getGrade(selectedAssessment.percentage)}
                  </Badge>
                </div>
              </div>

              <div className="border-t pt-4 dark:border-slate-700">
                <p className="text-sm font-medium dark:text-white mb-3">Performance Details</p>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted-foreground dark:text-slate-400">Marks Obtained</span>
                      <span className="font-semibold dark:text-white">{selectedAssessment.marksObtained}/{selectedAssessment.totalMarks}</span>
                    </div>
                    <Progress value={selectedAssessment.percentage} className="h-2" />
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground dark:text-slate-400">Percentage</span>
                    <span className="font-semibold dark:text-white">{selectedAssessment.percentage}%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground dark:text-slate-400">Status</span>
                    <Badge
                      className={cn(
                        "text-xs",
                        selectedAssessment.status === "pass"
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                          : "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400"
                      )}
                    >
                      {selectedAssessment.status.charAt(0).toUpperCase() + selectedAssessment.status.slice(1)}
                    </Badge>
                  </div>
                </div>
              </div>

              {selectedAssessment.remarks && (
                <div className="border-t pt-4 dark:border-slate-700">
                  <p className="text-sm text-muted-foreground dark:text-slate-400">Remarks</p>
                  <p className="text-sm dark:text-white">{selectedAssessment.remarks}</p>
                </div>
              )}

              <DialogFooter>
                <Button variant="outline" onClick={() => setDetailsDialogOpen(false)} className="dark:bg-slate-800 dark:border-slate-700 dark:hover:bg-slate-700 dark:text-white">
                  Close
                </Button>
                <Button
                  onClick={() => {
                    setEditingAssessment(selectedAssessment)
                    setEditDialogOpen(true)
                    setDetailsDialogOpen(false)
                  }}
                  className="dark:bg-blue-600 dark:hover:bg-blue-700"
                >
                  <Edit className="mr-2 size-4" />
                  Edit
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl dark:bg-slate-900 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="dark:text-white">Edit Assessment</DialogTitle>
            <DialogDescription className="dark:text-slate-400">Update marks and remarks</DialogDescription>
          </DialogHeader>
          {editingAssessment && (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground dark:text-slate-400">Student</p>
                <p className="font-medium dark:text-white">{editingAssessment.studentName}</p>
              </div>

              <div>
                <label className="text-sm font-medium dark:text-white">Marks Obtained</label>
                <Input
                  type="number"
                  value={editingAssessment.marksObtained}
                  onChange={(e) =>
                    setEditingAssessment({ ...editingAssessment, marksObtained: parseInt(e.target.value) })
                  }
                  className="mt-1 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                />
              </div>

              <div>
                <label className="text-sm font-medium dark:text-white">Remarks</label>
                <Input
                  value={editingAssessment.remarks || ""}
                  onChange={(e) =>
                    setEditingAssessment({ ...editingAssessment, remarks: e.target.value })
                  }
                  placeholder="Add remarks..."
                  className="mt-1 dark:bg-slate-800 dark:border-slate-700 dark:text-white dark:placeholder:text-slate-500"
                />
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setEditDialogOpen(false)} className="dark:bg-slate-800 dark:border-slate-700 dark:hover:bg-slate-700 dark:text-white">
                  Cancel
                </Button>
                <Button onClick={updateAssessment} className="dark:bg-blue-600 dark:hover:bg-blue-700">
                  <Save className="mr-2 size-4" />
                  Save Changes
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
