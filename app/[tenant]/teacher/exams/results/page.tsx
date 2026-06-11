"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  AlertCircle,
  BarChart3,
  Calendar,
  CheckCircle2,
  Download,
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
  Award,
  Percent,
  Target,
  BookOpen,
  Activity,
  Zap,
  Medal,
  AlertTriangle,
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

type ExamResult = {
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
  grade: string
  rank: number
  classRank: number
  status: "pass" | "fail"
  submittedOn: string
}

type ResultsInsight = {
  totalResults: number
  passedStudents: number
  failedStudents: number
  passPercentage: number
  averageMarks: number
  highestMarks: number
  lowestMarks: number
  classAverage: number
  resultsByGrade: { [key: string]: number }
  resultsBySubject: { [key: string]: number }
  resultsByClass: { [key: string]: number }
  performanceDistribution: { range: string; count: number }[]
  topStudents: ExamResult[]
  improvementNeeded: ExamResult[]
  classAverages: { className: string; average: number }[]
  subjectAverages: { subject: string; average: number }[]
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

const getResultsInsights = (results: ExamResult[]): ResultsInsight => {
  if (results.length === 0) {
    return {
      totalResults: 0,
      passedStudents: 0,
      failedStudents: 0,
      passPercentage: 0,
      averageMarks: 0,
      highestMarks: 0,
      lowestMarks: 0,
      classAverage: 0,
      resultsByGrade: {},
      resultsBySubject: {},
      resultsByClass: {},
      performanceDistribution: [],
      topStudents: [],
      improvementNeeded: [],
      classAverages: [],
      subjectAverages: [],
    }
  }

  const passed = results.filter((r) => r.status === "pass").length
  const failed = results.filter((r) => r.status === "fail").length
  const percentages = results.map((r) => r.percentage)
  const marks = results.map((r) => r.marksObtained)

  const resultsByGrade: { [key: string]: number } = {}
  const resultsBySubject: { [key: string]: number } = {}
  const resultsByClass: { [key: string]: number } = {}
  const classPercentages: { [key: string]: number[] } = {}
  const subjectPercentages: { [key: string]: number[] } = {}

  results.forEach((result) => {
    const grade = getGrade(result.percentage)
    resultsByGrade[grade] = (resultsByGrade[grade] || 0) + 1
    resultsBySubject[result.subject] = (resultsBySubject[result.subject] || 0) + 1
    resultsByClass[result.className] = (resultsByClass[result.className] || 0) + 1

    if (!classPercentages[result.className]) classPercentages[result.className] = []
    classPercentages[result.className].push(result.percentage)

    if (!subjectPercentages[result.subject]) subjectPercentages[result.subject] = []
    subjectPercentages[result.subject].push(result.percentage)
  })

  const classAverages = Object.entries(classPercentages).map(([className, percs]) => ({
    className,
    average: Math.round(percs.reduce((a, b) => a + b, 0) / percs.length),
  }))

  const subjectAverages = Object.entries(subjectPercentages).map(([subject, percs]) => ({
    subject,
    average: Math.round(percs.reduce((a, b) => a + b, 0) / percs.length),
  }))

  const topStudents = [...results].sort((a, b) => b.percentage - a.percentage).slice(0, 5)
  const improvementNeeded = [...results].filter((r) => r.percentage < 60).sort((a, b) => a.percentage - b.percentage).slice(0, 5)

  return {
    totalResults: results.length,
    passedStudents: passed,
    failedStudents: failed,
    passPercentage: results.length > 0 ? Math.round((passed / results.length) * 100) : 0,
    averageMarks: Math.round(marks.reduce((sum, m) => sum + m, 0) / results.length),
    highestMarks: Math.max(...marks),
    lowestMarks: Math.min(...marks),
    classAverage: Math.round(percentages.reduce((sum, p) => sum + p, 0) / results.length),
    resultsByGrade,
    resultsBySubject,
    resultsByClass,
    performanceDistribution: [
      { range: "90-100%", count: results.filter((r) => r.percentage >= 90).length },
      { range: "80-89%", count: results.filter((r) => r.percentage >= 80 && r.percentage < 90).length },
      { range: "70-79%", count: results.filter((r) => r.percentage >= 70 && r.percentage < 80).length },
      { range: "60-69%", count: results.filter((r) => r.percentage >= 60 && r.percentage < 70).length },
      { range: "Below 60%", count: results.filter((r) => r.percentage < 60).length },
    ],
    topStudents,
    improvementNeeded,
    classAverages,
    subjectAverages,
  }
}

const teacherHref = (path: string) => {
  const tenant = typeof window !== "undefined" ? window.location.pathname.split("/")[1] : ""
  return `/${tenant}${path}`
}

export default function ResultsPage() {
  const router = useRouter()
  const [tenant, setTenant] = React.useState("")
  const [results, setResults] = React.useState<ExamResult[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [activeView, setActiveView] = React.useState<"list" | "grid">("list")
  const [filterStatus, setFilterStatus] = React.useState("all")
  const [filterClass, setFilterClass] = React.useState("all")
  const [filterSubject, setFilterSubject] = React.useState("all")
  const [filterGrade, setFilterGrade] = React.useState("all")
  const [search, setSearch] = React.useState("")
  const [sortBy, setSortBy] = React.useState("percentage-desc")
  const [selectedResult, setSelectedResult] = React.useState<ExamResult | null>(null)
  const [detailsDialogOpen, setDetailsDialogOpen] = React.useState(false)

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
        setResults(data.results || data.assessments || [])
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load results")
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [tenant])

  const insights = React.useMemo(() => getResultsInsights(results), [results])

  const classes = React.useMemo(() => [...new Set(results.map((r) => r.className))], [results])
  const subjects = React.useMemo(() => [...new Set(results.map((r) => r.subject))], [results])
  const grades = ["A+", "A", "B", "C", "D", "F"]

  const filteredResults = React.useMemo(() => {
    return results
      .filter((r) => filterStatus === "all" || r.status === filterStatus)
      .filter((r) => filterClass === "all" || r.className === filterClass)
      .filter((r) => filterSubject === "all" || r.subject === filterSubject)
      .filter((r) => {
        if (filterGrade === "all") return true
        return getGrade(r.percentage) === filterGrade
      })
      .filter(
        (r) =>
          !search ||
          r.studentName.toLowerCase().includes(search.toLowerCase()) ||
          r.admissionNumber.toLowerCase().includes(search.toLowerCase()) ||
          r.examName.toLowerCase().includes(search.toLowerCase())
      )
      .sort((a, b) => {
        if (sortBy === "percentage-desc") return b.percentage - a.percentage
        if (sortBy === "percentage-asc") return a.percentage - b.percentage
        if (sortBy === "name") return a.studentName.localeCompare(b.studentName)
        if (sortBy === "rank") return a.classRank - b.classRank
        return 0
      })
  }, [results, filterStatus, filterClass, filterSubject, filterGrade, search, sortBy])

  const exportToCSV = () => {
    if (filteredResults.length === 0) {
      toast.error("No results to export")
      return
    }
    const headers = ["Student", "Admission No", "Class", "Exam", "Subject", "Marks", "Total Marks", "Percentage", "Grade", "Status", "Rank", "Date"]
    const rows = filteredResults.map((r) => [
      r.studentName,
      r.admissionNumber,
      r.className,
      r.examName,
      r.subject,
      r.marksObtained,
      r.totalMarks,
      `${r.percentage}%`,
      getGrade(r.percentage),
      r.status.charAt(0).toUpperCase() + r.status.slice(1),
      r.classRank,
      formatDate(r.date),
    ])
    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `results-${new Date().toISOString().split("T")[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
    toast.success("Results exported successfully")
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
              Unable to Load Results
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
                  Results & Analytics
                </Badge>
              </div>
              <div>
                <h1 className="text-3xl font-semibold tracking-tight md:text-4xl dark:text-white">Exam Results & Performance Analytics</h1>
                <p className="mt-2 text-muted-foreground dark:text-slate-400">
                  Comprehensive results dashboard with detailed performance metrics and comparative analysis
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

      {/* Main Metric Cards */}
      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {[
          { label: "Total Results", value: insights.totalResults, helper: "All records", icon: FileText, color: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400" },
          { label: "Passed", value: insights.passedStudents, helper: "Students passed", icon: CheckCircle2, color: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400" },
          { label: "Failed", value: insights.failedStudents, helper: "Improvement needed", icon: AlertCircle, color: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400" },
          { label: "Pass Rate", value: `${insights.passPercentage}%`, helper: "Success rate", icon: TrendingUp, color: "bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400" },
          { label: "Class Average", value: `${insights.classAverage}%`, helper: "Mean performance", icon: BarChart3, color: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400" },
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

      {/* Performance Metrics */}
      <section className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
        {[
          { label: "Highest Score", value: `${insights.highestMarks}%`, helper: "Top performer", icon: Medal, color: "bg-yellow-50 text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-400" },
          { label: "Lowest Score", value: `${insights.lowestMarks}%`, helper: "Lowest performer", icon: TrendingDown, color: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400" },
          { label: "Average Marks", value: `${insights.averageMarks}%`, helper: "Mean score", icon: Percent, color: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400" },
          { label: "Total Exams", value: Object.values(insights.resultsBySubject).reduce((a, b) => a + b, 0), helper: "Exams conducted", icon: BookOpen, color: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400" },
        ].map(({ label, value, helper, icon: Icon, color }, idx) => (
          <Card key={idx} className="rounded-3xl shadow-sm dark:bg-slate-900 dark:border-slate-800">
            <CardContent className="flex min-h-28 items-start justify-between gap-4 p-5">
              <div>
                <p className="text-sm text-muted-foreground dark:text-slate-400">{label}</p>
                <p className="mt-2 text-2xl font-semibold dark:text-white">{value}</p>
                <p className="mt-1 text-xs text-muted-foreground dark:text-slate-500">{helper}</p>
              </div>
              <div className={cn("rounded-2xl p-3", color)}>
                <Icon className="size-5" />
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

      {/* Filters */}
      <section className="rounded-3xl border bg-card p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Filter className="size-4 text-muted-foreground dark:text-slate-400" />
            <h3 className="font-medium dark:text-white">Filters & Search</h3>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <Input
              placeholder="Search student, exam..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="dark:bg-slate-800 dark:border-slate-700 dark:text-white dark:placeholder:text-slate-500"
            />

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="dark:bg-slate-800 dark:border-slate-700 dark:text-white">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="dark:bg-slate-800 dark:border-slate-700">
                <SelectItem value="all">All Results</SelectItem>
                <SelectItem value="pass">Passed</SelectItem>
                <SelectItem value="fail">Failed</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterClass} onValueChange={setFilterClass}>
              <SelectTrigger className="dark:bg-slate-800 dark:border-slate-700 dark:text-white">
                <SelectValue placeholder="Class" />
              </SelectTrigger>
              <SelectContent className="dark:bg-slate-800 dark:border-slate-700">
                <SelectItem value="all">All Classes</SelectItem>
                {classes.map((cls) => (
                  <SelectItem key={cls} value={cls}>
                    {cls}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterSubject} onValueChange={setFilterSubject}>
              <SelectTrigger className="dark:bg-slate-800 dark:border-slate-700 dark:text-white">
                <SelectValue placeholder="Subject" />
              </SelectTrigger>
              <SelectContent className="dark:bg-slate-800 dark:border-slate-700">
                <SelectItem value="all">All Subjects</SelectItem>
                {subjects.map((subj) => (
                  <SelectItem key={subj} value={subj}>
                    {subj}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterGrade} onValueChange={setFilterGrade}>
              <SelectTrigger className="dark:bg-slate-800 dark:border-slate-700 dark:text-white">
                <SelectValue placeholder="Grade" />
              </SelectTrigger>
              <SelectContent className="dark:bg-slate-800 dark:border-slate-700">
                <SelectItem value="all">All Grades</SelectItem>
                {grades.map((grade) => (
                  <SelectItem key={grade} value={grade}>
                    {grade}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2 border-t pt-3 dark:border-slate-700">
            <span className="text-sm text-muted-foreground dark:text-slate-400">Sort by:</span>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-48 dark:bg-slate-800 dark:border-slate-700 dark:text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="dark:bg-slate-800 dark:border-slate-700">
                <SelectItem value="percentage-desc">Highest Score</SelectItem>
                <SelectItem value="percentage-asc">Lowest Score</SelectItem>
                <SelectItem value="name">Student Name</SelectItem>
                <SelectItem value="rank">Rank</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      {/* View Mode */}
      <div className="flex items-center gap-2">
        <Button
          variant={activeView === "list" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveView("list")}
          className="dark:bg-blue-600 dark:hover:bg-blue-700"
        >
          <List className="mr-1 size-4" />
          List
        </Button>
        <Button
          variant={activeView === "grid" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveView("grid")}
          className="dark:bg-blue-600 dark:hover:bg-blue-700"
        >
          <Grid className="mr-1 size-4" />
          Grid
        </Button>
        <span className="text-sm text-muted-foreground dark:text-slate-400 ml-auto">{filteredResults.length} results</span>
      </div>

      {/* Results List View */}
      {activeView === "list" && (
        <div className="rounded-3xl border shadow-sm overflow-hidden dark:border-slate-700 dark:bg-slate-900">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50 dark:bg-slate-800 dark:border-slate-700">
                  <th className="px-6 py-3 text-left font-medium text-muted-foreground dark:text-slate-400">Student</th>
                  <th className="px-6 py-3 text-left font-medium text-muted-foreground dark:text-slate-400">Class</th>
                  <th className="px-6 py-3 text-left font-medium text-muted-foreground dark:text-slate-400">Subject</th>
                  <th className="px-6 py-3 text-center font-medium text-muted-foreground dark:text-slate-400">Marks</th>
                  <th className="px-6 py-3 text-center font-medium text-muted-foreground dark:text-slate-400">Grade</th>
                  <th className="px-6 py-3 text-center font-medium text-muted-foreground dark:text-slate-400">Rank</th>
                  <th className="px-6 py-3 text-center font-medium text-muted-foreground dark:text-slate-400">Status</th>
                  <th className="px-6 py-3 text-center font-medium text-muted-foreground dark:text-slate-400">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-slate-700">
                {filteredResults.map((result) => (
                  <tr key={result.id} className="hover:bg-muted/50 dark:hover:bg-slate-800 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium dark:text-white">{result.studentName}</p>
                        <p className="text-xs text-muted-foreground dark:text-slate-400">{result.admissionNumber}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 dark:text-slate-300">{result.className}</td>
                    <td className="px-6 py-4 dark:text-slate-300">{result.subject}</td>
                    <td className="px-6 py-4 text-center">
                      <div>
                        <p className="font-semibold dark:text-white">{result.marksObtained}/{result.totalMarks}</p>
                        <p className="text-xs text-muted-foreground dark:text-slate-400">{result.percentage}%</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Badge className={cn("text-xs font-semibold", GRADE_COLORS[getGrade(result.percentage) as keyof typeof GRADE_COLORS])}>
                        {getGrade(result.percentage)}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-center dark:text-slate-300">#{result.classRank}</td>
                    <td className="px-6 py-4 text-center">
                      <Badge
                        className={cn(
                          "text-xs",
                          result.status === "pass"
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                            : "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400"
                        )}
                      >
                        {result.status.charAt(0).toUpperCase() + result.status.slice(1)}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedResult(result)
                          setDetailsDialogOpen(true)
                        }}
                        className="dark:text-blue-400 dark:hover:bg-slate-800"
                      >
                        <Eye className="size-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Results Grid View */}
      {activeView === "grid" && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredResults.map((result) => (
            <Card key={result.id} className="rounded-3xl shadow-sm dark:bg-slate-900 dark:border-slate-800 hover:shadow-md transition-shadow cursor-pointer" onClick={() => { setSelectedResult(result); setDetailsDialogOpen(true) }}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <p className="font-semibold dark:text-white line-clamp-1">{result.studentName}</p>
                    <p className="text-xs text-muted-foreground dark:text-slate-400">{result.admissionNumber}</p>
                  </div>
                  <Badge className={cn("text-xs font-semibold", GRADE_COLORS[getGrade(result.percentage) as keyof typeof GRADE_COLORS])}>
                    {getGrade(result.percentage)}
                  </Badge>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground dark:text-slate-400">{result.subject}</span>
                    <span className="font-medium dark:text-white">{result.className}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground dark:text-slate-400">Marks</span>
                    <span className="font-semibold dark:text-white">{result.marksObtained}/{result.totalMarks}</span>
                  </div>
                </div>

                <Progress value={result.percentage} className="h-2 mb-3" />

                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div>
                    <p className="text-muted-foreground dark:text-slate-400">Percentage</p>
                    <p className="font-semibold dark:text-white">{result.percentage}%</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground dark:text-slate-400">Rank</p>
                    <p className="font-semibold dark:text-white">#{result.classRank}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground dark:text-slate-400">Status</p>
                    <Badge
                      className={cn(
                        "text-xs mt-1",
                        result.status === "pass"
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                          : "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400"
                      )}
                    >
                      {result.status.charAt(0).toUpperCase() + result.status.slice(1)}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Analytics Section */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card className="rounded-3xl shadow-sm dark:bg-slate-900 dark:border-slate-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 dark:text-white">
                <BarChart3 className="size-5 text-blue-500" />
                Performance Distribution
              </CardTitle>
              <CardDescription className="dark:text-slate-400">Score range breakdown</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {insights.performanceDistribution.map(({ range, count }) => (
                <div key={range}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium dark:text-white">{range}</span>
                    <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">{count}</span>
                  </div>
                  <Progress value={(count / insights.totalResults) * 100} className="h-2" />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="rounded-3xl shadow-sm dark:bg-slate-900 dark:border-slate-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 dark:text-white">
                <Percent className="size-5 text-green-500" />
                Grade Distribution
              </CardTitle>
              <CardDescription className="dark:text-slate-400">By grades</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {Object.entries(insights.resultsByGrade).map(([grade, count]) => (
                <div key={grade} className="flex items-center justify-between">
                  <span className="text-sm font-medium dark:text-white">{grade}</span>
                  <Badge className={cn("text-xs", GRADE_COLORS[grade as keyof typeof GRADE_COLORS])}>{count}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <aside className="space-y-6">
          <Card className="rounded-3xl shadow-sm bg-gradient-to-br from-emerald-50 to-emerald-50/50 border-emerald-100/50 dark:from-emerald-950/40 dark:to-emerald-950/20 dark:border-emerald-900/50">
            <CardHeader>
              <CardTitle className="text-emerald-900 dark:text-emerald-300">Top Performers</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {insights.topStudents.map((result, idx) => (
                <div key={result.id} className="p-2 rounded-xl bg-white/50 dark:bg-emerald-950/30">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium dark:text-emerald-200 line-clamp-1">{idx + 1}. {result.studentName}</p>
                      <p className="text-xs text-emerald-700 dark:text-emerald-400">{result.percentage}%</p>
                    </div>
                    <Badge className={cn("text-xs font-semibold ml-2", GRADE_COLORS[getGrade(result.percentage) as keyof typeof GRADE_COLORS])}>
                      {getGrade(result.percentage)}
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
            <CardContent className="space-y-2">
              {insights.improvementNeeded.map((result, idx) => (
                <div key={result.id} className="p-2 rounded-xl bg-white/50 dark:bg-red-950/30">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium dark:text-red-200 line-clamp-1">{idx + 1}. {result.studentName}</p>
                      <p className="text-xs text-red-700 dark:text-red-400">{result.percentage}%</p>
                    </div>
                    <Badge className={cn("text-xs font-semibold ml-2", GRADE_COLORS[getGrade(result.percentage) as keyof typeof GRADE_COLORS])}>
                      {getGrade(result.percentage)}
                    </Badge>
                  </div>
                </div>
              ))}
              {insights.improvementNeeded.length === 0 && (
                <p className="text-sm text-muted-foreground dark:text-slate-400">Great! All students performing well</p>
              )}
            </CardContent>
          </Card>

          <Button className="w-full dark:bg-blue-600 dark:hover:bg-blue-700" onClick={() => router.push(teacherHref("/teacher/dashboard"))}>
            <Home className="mr-2 size-4" />
            Back to Dashboard
          </Button>
        </aside>
      </div>

      {/* Details Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-2xl dark:bg-slate-900 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="dark:text-white">{selectedResult?.studentName}</DialogTitle>
            <DialogDescription className="dark:text-slate-400">{selectedResult?.className} · {selectedResult?.admissionNumber}</DialogDescription>
          </DialogHeader>
          {selectedResult && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground dark:text-slate-400">Exam</p>
                  <p className="font-medium dark:text-white">{selectedResult.examName}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground dark:text-slate-400">Subject</p>
                  <p className="font-medium dark:text-white">{selectedResult.subject}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground dark:text-slate-400">Date</p>
                  <p className="font-medium dark:text-white">{formatDate(selectedResult.date)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground dark:text-slate-400">Grade</p>
                  <Badge className={cn("text-xs font-semibold", GRADE_COLORS[getGrade(selectedResult.percentage) as keyof typeof GRADE_COLORS])}>
                    {getGrade(selectedResult.percentage)}
                  </Badge>
                </div>
              </div>

              <div className="border-t pt-4 dark:border-slate-700">
                <p className="text-sm font-medium dark:text-white mb-3">Performance Details</p>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted-foreground dark:text-slate-400">Marks Obtained</span>
                      <span className="font-semibold dark:text-white">{selectedResult.marksObtained}/{selectedResult.totalMarks}</span>
                    </div>
                    <Progress value={selectedResult.percentage} className="h-2" />
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground dark:text-slate-400">Percentage</span>
                    <span className="font-semibold dark:text-white">{selectedResult.percentage}%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground dark:text-slate-400">Class Rank</span>
                    <span className="font-semibold dark:text-white">#{selectedResult.classRank}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground dark:text-slate-400">Status</span>
                    <Badge
                      className={cn(
                        "text-xs",
                        selectedResult.status === "pass"
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                          : "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400"
                      )}
                    >
                      {selectedResult.status.charAt(0).toUpperCase() + selectedResult.status.slice(1)}
                    </Badge>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setDetailsDialogOpen(false)} className="dark:bg-slate-800 dark:border-slate-700 dark:hover:bg-slate-700 dark:text-white">
                  Close
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
