"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { teacherDashboardApi } from "@/lib/teacher-api-client"
import {
  AlertCircle,
  BarChart3,
  CheckCircle2,
  ChevronDown,
  Download,
  Edit,
  Eye,
  FileText,
  Filter,
  Home,
  List,
  MessageSquare,
  Plus,
  RefreshCcw,
  Save,
  Search,
  Send,
  TrendingUp,
  Users,
  Grid,
  X,
  Award,
  BookOpen,
  Target,
  Percent,
  AlertTriangle,
  Check,
  Clock,
  Trash2,
  Flag,
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
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

type SubjectMark = {
  id: string
  subjectId: string
  subject: string
  marks: number
  totalMarks: number
  percentage: number
  grade: string
  status: "submitted" | "pending" | "rejected"
  teacherRemarks: string | null
  adminRemarks: string | null
  suggestedImprovement: string | null
  remarked: boolean
  originalMarks?: number
}

type StudentReportCard = {
  id: string
  studentId: string
  studentName: string
  admissionNumber: string
  className: string
  examId: string
  examName: string
  overallPercentage: number
  overallGrade: string
  overallStatus: "pass" | "fail"
  subjectMarks: SubjectMark[]
  generalRemarks: string | null
  adminRemarks: string | null
  status: "pending" | "submitted" | "approved" | "rejected"
  submittedBy: string | null
  submittedOn: string | null
  approvedBy: string | null
  approvedOn: string | null
}

type ReportCardInsight = {
  totalReportCards: number
  submittedCards: number
  pendingCards: number
  approvedCards: number
  rejectedCards: number
  averagePercentage: number
  passPercentage: number
  remarkedCards: number
  cardsByClass: { [key: string]: number }
}

const GRADE_COLORS = {
  "A+": "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400",
  "A": "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400",
  "B": "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400",
  "C": "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",
  "D": "bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400",
  "F": "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400",
}

const getGrade = (percentage: number): string => {
  if (percentage >= 90) return "A+"
  if (percentage >= 80) return "A"
  if (percentage >= 70) return "B"
  if (percentage >= 60) return "C"
  if (percentage >= 50) return "D"
  return "F"
}

const getRemarkInsights = (cards: StudentReportCard[]): ReportCardInsight => {
  if (cards.length === 0) {
    return {
      totalReportCards: 0,
      submittedCards: 0,
      pendingCards: 0,
      approvedCards: 0,
      rejectedCards: 0,
      averagePercentage: 0,
      passPercentage: 0,
      remarkedCards: 0,
      cardsByClass: {},
    }
  }

  const submitted = cards.filter((c) => c.status === "submitted").length
  const pending = cards.filter((c) => c.status === "pending").length
  const approved = cards.filter((c) => c.status === "approved").length
  const rejected = cards.filter((c) => c.status === "rejected").length
  const remarked = cards.filter((c) => c.subjectMarks.some((m) => m.remarked)).length
  const percentages = cards.map((c) => c.overallPercentage)
  const passed = cards.filter((c) => c.overallStatus === "pass").length
  const cardsByClass: { [key: string]: number } = {}

  cards.forEach((card) => {
    cardsByClass[card.className] = (cardsByClass[card.className] || 0) + 1
  })

  return {
    totalReportCards: cards.length,
    submittedCards: submitted,
    pendingCards: pending,
    approvedCards: approved,
    rejectedCards: rejected,
    averagePercentage: Math.round(percentages.reduce((a, b) => a + b, 0) / cards.length),
    passPercentage: Math.round((passed / cards.length) * 100),
    remarkedCards: remarked,
    cardsByClass,
  }
}

const teacherHref = (path: string) => {
  const tenant = typeof window !== "undefined" ? window.location.pathname.split("/")[1] : ""
  return `/${tenant}${path}`
}

export default function ReportCardsPage() {
  const router = useRouter()
  const [tenant, setTenant] = React.useState("")
  const [reportCards, setReportCards] = React.useState<StudentReportCard[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [activeView, setActiveView] = React.useState<"list" | "grid">("list")
  const [filterClass, setFilterClass] = React.useState("all")
  const [filterStatus, setFilterStatus] = React.useState("all")
  const [search, setSearch] = React.useState("")
  const [sortBy, setSortBy] = React.useState("percentage-desc")
  const [userRole, setUserRole] = React.useState<"teacher" | "admin" | "faculty">("teacher")

  const [selectedCard, setSelectedCard] = React.useState<StudentReportCard | null>(null)
  const [viewDialogOpen, setViewDialogOpen] = React.useState(false)
  const [editDialogOpen, setEditDialogOpen] = React.useState(false)
  const [addMarksDialogOpen, setAddMarksDialogOpen] = React.useState(false)
  const [remarksDialogOpen, setRemarksDialogOpen] = React.useState(false)
  const [remarksData, setRemarksData] = React.useState({
    studentId: "",
    subjectId: "",
    adminRemarks: "",
    suggestedImprovement: "",
  })
  const [editingMarks, setEditingMarks] = React.useState<SubjectMark | null>(null)
  const [newMarksData, setNewMarksData] = React.useState({
    studentId: "",
    subject: "",
    marks: 0,
    totalMarks: 100,
  })

  React.useEffect(() => {
    const tenantSlug = typeof window !== "undefined" ? window.location.pathname.split("/")[1] : ""
    setTenant(tenantSlug)
    const role = localStorage.getItem("userRole") as any
    if (role) setUserRole(role)
  }, [])

  React.useEffect(() => {
    if (!tenant) return

    const fetchData = async () => {
      try {
        setLoading(true)
        const res = await fetch(teacherDashboardApi("exams/report-cards"))
        if (!res.ok) throw new Error(`API error: ${res.status}`)
        const data = await res.json()
        setReportCards(data.reportCards || data.assessments || [])
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load report cards")
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [tenant])

  const insights = React.useMemo(() => getRemarkInsights(reportCards), [reportCards])
  const classes = React.useMemo(() => [...new Set(reportCards.map((r) => r.className))], [reportCards])

  const filteredCards = React.useMemo(() => {
    return reportCards
      .filter((c) => filterClass === "all" || c.className === filterClass)
      .filter((c) => filterStatus === "all" || c.status === filterStatus)
      .filter(
        (c) =>
          !search ||
          c.studentName.toLowerCase().includes(search.toLowerCase()) ||
          c.admissionNumber.toLowerCase().includes(search.toLowerCase())
      )
      .sort((a, b) => {
        if (sortBy === "percentage-desc") return b.overallPercentage - a.overallPercentage
        if (sortBy === "percentage-asc") return a.overallPercentage - b.overallPercentage
        if (sortBy === "name") return a.studentName.localeCompare(b.studentName)
        if (sortBy === "status") return a.status.localeCompare(b.status)
        return 0
      })
  }, [reportCards, filterClass, filterStatus, search, sortBy])

  const addMarksToCard = async () => {
    if (!newMarksData.studentId || !newMarksData.subject || !tenant) {
      toast.error("Please fill all required fields")
      return
    }

    try {
      const res = await fetch(teacherDashboardApi("exams/report-cards"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reportcard.addMarks",
          studentId: newMarksData.studentId,
          subject: newMarksData.subject,
          marks: newMarksData.marks,
          totalMarks: newMarksData.totalMarks,
        }),
      })

      if (!res.ok) throw new Error("Failed to add marks")

      const data = await res.json()
      setReportCards(data.reportCards || [])
      setAddMarksDialogOpen(false)
      setNewMarksData({ studentId: "", subject: "", marks: 0, totalMarks: 100 })
      toast.success("Marks added successfully")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add marks")
    }
  }

  const updateMarks = async () => {
    if (!editingMarks || !selectedCard || !tenant) return

    try {
      const res = await fetch(teacherDashboardApi("exams/report-cards"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reportcard.updateMarks",
          cardId: selectedCard.id,
          subjectId: editingMarks.subjectId,
          marks: editingMarks.marks,
          teacherRemarks: editingMarks.teacherRemarks,
        }),
      })

      if (!res.ok) throw new Error("Failed to update marks")

      const data = await res.json()
      setReportCards(data.reportCards || [])
      setEditDialogOpen(false)
      setEditingMarks(null)
      toast.success("Marks updated successfully")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update marks")
    }
  }

  const submitReportCard = async () => {
    if (!selectedCard || !tenant) return

    try {
      const res = await fetch(teacherDashboardApi("exams/report-cards"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reportcard.submit",
          cardId: selectedCard.id,
        }),
      })

      if (!res.ok) throw new Error("Failed to submit report card")

      const data = await res.json()
      setReportCards(data.reportCards || [])
      setViewDialogOpen(false)
      toast.success("Report card submitted for approval")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to submit report card")
    }
  }

  const approveReportCard = async () => {
    if (!selectedCard || !tenant) return

    try {
      const res = await fetch(teacherDashboardApi("exams/report-cards"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reportcard.approve",
          cardId: selectedCard.id,
        }),
      })

      if (!res.ok) throw new Error("Failed to approve report card")

      const data = await res.json()
      setReportCards(data.reportCards || [])
      setViewDialogOpen(false)
      toast.success("Report card approved")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to approve")
    }
  }

  const rejectReportCard = async () => {
    if (!selectedCard || !tenant) return

    try {
      const res = await fetch(teacherDashboardApi("exams/report-cards"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reportcard.reject",
          cardId: selectedCard.id,
        }),
      })

      if (!res.ok) throw new Error("Failed to reject report card")

      const data = await res.json()
      setReportCards(data.reportCards || [])
      setViewDialogOpen(false)
      toast.success("Report card rejected")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to reject")
    }
  }

  const requestRemarking = async () => {
    if (!selectedCard || !tenant) return

    try {
      const res = await fetch(teacherDashboardApi("exams/report-cards"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reportcard.requestRemark",
          cardId: selectedCard.id,
          reason: "Teacher requested remarking",
        }),
      })

      if (!res.ok) throw new Error("Failed to request remarking")

      const data = await res.json()
      setReportCards(data.reportCards || [])
      toast.success("Remarking requested")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to request remarking")
    }
  }

  const addAdminRemarks = async () => {
    if (!remarksData.studentId || !tenant) {
      toast.error("Please fill all fields")
      return
    }

    try {
      const res = await fetch(teacherDashboardApi("exams/report-cards"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reportcard.addAdminRemarks",
          studentId: remarksData.studentId,
          subjectId: remarksData.subjectId,
          adminRemarks: remarksData.adminRemarks,
          suggestedImprovement: remarksData.suggestedImprovement,
        }),
      })

      if (!res.ok) throw new Error("Failed to add remarks")

      const data = await res.json()
      setReportCards(data.reportCards || [])
      setRemarksDialogOpen(false)
      setRemarksData({ studentId: "", subjectId: "", adminRemarks: "", suggestedImprovement: "" })
      toast.success("Remarks added successfully")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add remarks")
    }
  }

  const exportToCSV = () => {
    if (filteredCards.length === 0) {
      toast.error("No report cards to export")
      return
    }

    const headers = ["Student", "Admission No", "Class", "Exam", "Overall %", "Grade", "Status", "Submitted By", "Approved By"]
    const rows = filteredCards.map((c) => [
      c.studentName,
      c.admissionNumber,
      c.className,
      c.examName,
      c.overallPercentage,
      c.overallGrade,
      c.status,
      c.submittedBy || "N/A",
      c.approvedBy || "N/A",
    ])
    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `report-cards-${new Date().toISOString().split("T")[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
    toast.success("Report cards exported successfully")
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
              Unable to Load Report Cards
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
                  Report Cards
                </Badge>
              </div>
              <div>
                <h1 className="text-3xl font-semibold tracking-tight md:text-4xl dark:text-white">Student Report Cards & Remarks</h1>
                <p className="mt-2 text-muted-foreground dark:text-slate-400">
                  Manage subject marks, add remarks, approve cards, and track student performance across all subjects
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row xl:flex-col 2xl:flex-row">
              <Button variant="outline" onClick={() => window.location.reload()} className="dark:bg-slate-800 dark:border-slate-700 dark:hover:bg-slate-700 dark:text-white">
                <RefreshCcw className="size-4" />
                Refresh
              </Button>
              <Button onClick={() => setAddMarksDialogOpen(true)} className="dark:bg-blue-600 dark:hover:bg-blue-700">
                <Plus className="size-4" />
                Add Marks
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
          { label: "Total Cards", value: insights.totalReportCards, helper: "All records", icon: FileText, color: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400" },
          { label: "Submitted", value: insights.submittedCards, helper: "Awaiting approval", icon: Send, color: "bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400" },
          { label: "Approved", value: insights.approvedCards, helper: "Finalized", icon: CheckCircle2, color: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400" },
          { label: "Pending", value: insights.pendingCards, helper: "In progress", icon: Clock, color: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400" },
          { label: "Pass Rate", value: `${insights.passPercentage}%`, helper: "Students passed", icon: TrendingUp, color: "bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-400" },
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

      {/* Additional Metrics */}
      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[
          { label: "Remarked Cards", value: insights.remarkedCards, helper: "Cards with remarking", icon: Flag, color: "bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400" },
          { label: "Average %", value: `${insights.averagePercentage}%`, helper: "Overall average", icon: BarChart3, color: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400" },
          { label: "Rejected", value: insights.rejectedCards, helper: "Need revision", icon: AlertTriangle, color: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400" },
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

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Input
              placeholder="Search student..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="dark:bg-slate-800 dark:border-slate-700 dark:text-white dark:placeholder:text-slate-500"
            />

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

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="dark:bg-slate-800 dark:border-slate-700 dark:text-white">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="dark:bg-slate-800 dark:border-slate-700">
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="submitted">Submitted</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="dark:bg-slate-800 dark:border-slate-700 dark:text-white">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent className="dark:bg-slate-800 dark:border-slate-700">
                <SelectItem value="percentage-desc">Highest %</SelectItem>
                <SelectItem value="percentage-asc">Lowest %</SelectItem>
                <SelectItem value="name">Student Name</SelectItem>
                <SelectItem value="status">Status</SelectItem>
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
        <span className="text-sm text-muted-foreground dark:text-slate-400 ml-auto">{filteredCards.length} cards</span>
      </div>

      {/* Report Cards List */}
      {activeView === "list" && (
        <div className="rounded-3xl border shadow-sm overflow-hidden dark:border-slate-700 dark:bg-slate-900">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50 dark:bg-slate-800 dark:border-slate-700">
                  <th className="px-6 py-3 text-left font-medium text-muted-foreground dark:text-slate-400">Student</th>
                  <th className="px-6 py-3 text-left font-medium text-muted-foreground dark:text-slate-400">Class</th>
                  <th className="px-6 py-3 text-left font-medium text-muted-foreground dark:text-slate-400">Exam</th>
                  <th className="px-6 py-3 text-center font-medium text-muted-foreground dark:text-slate-400">Overall %</th>
                  <th className="px-6 py-3 text-center font-medium text-muted-foreground dark:text-slate-400">Grade</th>
                  <th className="px-6 py-3 text-center font-medium text-muted-foreground dark:text-slate-400">Status</th>
                  <th className="px-6 py-3 text-center font-medium text-muted-foreground dark:text-slate-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-slate-700">
                {filteredCards.map((card) => (
                  <tr key={card.id} className="hover:bg-muted/50 dark:hover:bg-slate-800 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium dark:text-white">{card.studentName}</p>
                        <p className="text-xs text-muted-foreground dark:text-slate-400">{card.admissionNumber}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 dark:text-slate-300">{card.className}</td>
                    <td className="px-6 py-4 dark:text-slate-300">{card.examName}</td>
                    <td className="px-6 py-4 text-center">
                      <p className="font-semibold dark:text-white">{card.overallPercentage}%</p>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Badge className={cn("text-xs font-semibold", GRADE_COLORS[card.overallGrade as keyof typeof GRADE_COLORS])}>
                        {card.overallGrade}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Badge
                        className={cn(
                          "text-xs capitalize",
                          card.status === "approved"
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                            : card.status === "rejected"
                            ? "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400"
                            : card.status === "submitted"
                            ? "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400"
                            : "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
                        )}
                      >
                        {card.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-center flex items-center justify-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedCard(card)
                          setViewDialogOpen(true)
                        }}
                        className="dark:text-blue-400 dark:hover:bg-slate-800"
                      >
                        <Eye className="size-4" />
                      </Button>
                      {card.status === "pending" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedCard(card)
                            setEditDialogOpen(true)
                          }}
                          className="dark:text-amber-400 dark:hover:bg-slate-800"
                        >
                          <Edit className="size-4" />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Report Cards Grid */}
      {activeView === "grid" && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredCards.map((card) => (
            <Card
              key={card.id}
              className="rounded-3xl shadow-sm dark:bg-slate-900 dark:border-slate-800 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => {
                setSelectedCard(card)
                setViewDialogOpen(true)
              }}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <p className="font-semibold dark:text-white line-clamp-1">{card.studentName}</p>
                    <p className="text-xs text-muted-foreground dark:text-slate-400">{card.admissionNumber}</p>
                  </div>
                  <Badge className={cn("text-xs font-semibold", GRADE_COLORS[card.overallGrade as keyof typeof GRADE_COLORS])}>
                    {card.overallGrade}
                  </Badge>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground dark:text-slate-400">{card.className}</span>
                    <span className="font-medium dark:text-white">{card.examName}</span>
                  </div>
                </div>

                <Progress value={card.overallPercentage} className="h-2 mb-3" />

                <div className="grid grid-cols-2 gap-2 text-center text-xs mb-3">
                  <div>
                    <p className="text-muted-foreground dark:text-slate-400">Overall %</p>
                    <p className="font-semibold dark:text-white">{card.overallPercentage}%</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground dark:text-slate-400">Subjects</p>
                    <p className="font-semibold dark:text-white">{card.subjectMarks.length}</p>
                  </div>
                </div>

                <Badge
                  className={cn(
                    "w-full justify-center text-xs capitalize",
                    card.status === "approved"
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                      : card.status === "rejected"
                      ? "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400"
                      : card.status === "submitted"
                      ? "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400"
                      : "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
                  )}
                >
                  {card.status}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* View Report Card Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-4xl dark:bg-slate-900 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="dark:text-white">{selectedCard?.studentName}</DialogTitle>
            <DialogDescription className="dark:text-slate-400">{selectedCard?.className} · {selectedCard?.examName}</DialogDescription>
          </DialogHeader>
          {selectedCard && (
            <div className="space-y-6 max-h-96 overflow-y-auto">
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground dark:text-slate-400">Overall %</p>
                  <p className="font-semibold dark:text-white">{selectedCard.overallPercentage}%</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground dark:text-slate-400">Grade</p>
                  <Badge className={cn("text-xs font-semibold", GRADE_COLORS[selectedCard.overallGrade as keyof typeof GRADE_COLORS])}>
                    {selectedCard.overallGrade}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground dark:text-slate-400">Status</p>
                  <Badge
                    className={cn(
                      "text-xs capitalize",
                      selectedCard.status === "approved"
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                        : selectedCard.status === "rejected"
                        ? "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400"
                        : "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400"
                    )}
                  >
                    {selectedCard.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground dark:text-slate-400">Result</p>
                  <Badge
                    className={cn(
                      "text-xs",
                      selectedCard.overallStatus === "pass"
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                        : "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400"
                    )}
                  >
                    {selectedCard.overallStatus === "pass" ? "Pass" : "Fail"}
                  </Badge>
                </div>
              </div>

              <div className="border-t pt-4 dark:border-slate-700">
                <p className="text-sm font-medium dark:text-white mb-3">Subject Marks</p>
                <div className="space-y-3">
                  {selectedCard.subjectMarks.map((mark) => (
                    <div key={mark.id} className="p-3 rounded-lg border dark:border-slate-700 dark:bg-slate-800">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-medium dark:text-white">{mark.subject}</p>
                        <Badge className={cn("text-xs font-semibold", GRADE_COLORS[mark.grade as keyof typeof GRADE_COLORS])}>
                          {mark.grade}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="text-muted-foreground dark:text-slate-400">Marks: {mark.marks}/{mark.totalMarks}</span>
                        <span className="font-semibold dark:text-white">{mark.percentage}%</span>
                      </div>
                      <Progress value={mark.percentage} className="h-1 mb-2" />
                      {mark.teacherRemarks && (
                        <p className="text-xs text-muted-foreground dark:text-slate-400">Teacher: {mark.teacherRemarks}</p>
                      )}
                      {mark.adminRemarks && (
                        <p className="text-xs text-blue-600 dark:text-blue-400">Admin: {mark.adminRemarks}</p>
                      )}
                      {mark.suggestedImprovement && (
                        <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">💡 {mark.suggestedImprovement}</p>
                      )}
                      {mark.remarked && (
                        <Badge className="text-xs mt-2 bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400">
                          Remarked
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {selectedCard.generalRemarks && (
                <div className="border-t pt-4 dark:border-slate-700">
                  <p className="text-sm font-medium dark:text-white mb-2">General Remarks</p>
                  <p className="text-sm dark:text-slate-300">{selectedCard.generalRemarks}</p>
                </div>
              )}

              {selectedCard.adminRemarks && (
                <div className="border-t pt-4 dark:border-slate-700">
                  <p className="text-sm font-medium dark:text-blue-400 mb-2">Admin Remarks</p>
                  <p className="text-sm dark:text-slate-300">{selectedCard.adminRemarks}</p>
                </div>
              )}

              <DialogFooter className="gap-2 flex-wrap">
                <Button variant="outline" onClick={() => setViewDialogOpen(false)} className="dark:bg-slate-800 dark:border-slate-700 dark:hover:bg-slate-700 dark:text-white">
                  Close
                </Button>

                {userRole === "teacher" && selectedCard.status === "pending" && (
                  <Button onClick={submitReportCard} className="dark:bg-blue-600 dark:hover:bg-blue-700">
                    <Send className="mr-2 size-4" />
                    Submit for Approval
                  </Button>
                )}

                {userRole === "teacher" && selectedCard.status === "submitted" && (
                  <Button onClick={requestRemarking} className="dark:bg-orange-600 dark:hover:bg-orange-700">
                    <Edit className="mr-2 size-4" />
                    Request Remarking
                  </Button>
                )}

                {(userRole === "admin" || userRole === "faculty") && selectedCard.status === "submitted" && (
                  <>
                    <Button onClick={approveReportCard} className="dark:bg-emerald-600 dark:hover:bg-emerald-700">
                      <Check className="mr-2 size-4" />
                      Approve
                    </Button>
                    <Button onClick={rejectReportCard} className="dark:bg-red-600 dark:hover:bg-red-700">
                      <X className="mr-2 size-4" />
                      Reject
                    </Button>
                  </>
                )}

                {(userRole === "admin" || userRole === "faculty") && (
                  <Button
                    onClick={() => {
                      setRemarksData({ ...remarksData, studentId: selectedCard.studentId })
                      setRemarksDialogOpen(true)
                    }}
                    className="dark:bg-purple-600 dark:hover:bg-purple-700"
                  >
                    <MessageSquare className="mr-2 size-4" />
                    Add Remarks
                  </Button>
                )}
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Marks Dialog */}
      <Dialog open={addMarksDialogOpen} onOpenChange={setAddMarksDialogOpen}>
        <DialogContent className="max-w-2xl dark:bg-slate-900 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="dark:text-white">Add Subject Marks</DialogTitle>
            <DialogDescription className="dark:text-slate-400">Enter marks for a student's subject</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium dark:text-white">Student</label>
              <Select value={newMarksData.studentId} onValueChange={(value) => setNewMarksData({ ...newMarksData, studentId: value })}>
                <SelectTrigger className="mt-1 dark:bg-slate-800 dark:border-slate-700 dark:text-white">
                  <SelectValue placeholder="Select student..." />
                </SelectTrigger>
                <SelectContent className="dark:bg-slate-800 dark:border-slate-700">
                  {[...new Set(reportCards.map((c) => c.studentId))].map((id) => {
                    const card = reportCards.find((c) => c.studentId === id)
                    return (
                      <SelectItem key={id} value={id}>
                        {card?.studentName}
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium dark:text-white">Subject</label>
              <Input
                value={newMarksData.subject}
                onChange={(e) => setNewMarksData({ ...newMarksData, subject: e.target.value })}
                placeholder="Enter subject name..."
                className="mt-1 dark:bg-slate-800 dark:border-slate-700 dark:text-white dark:placeholder:text-slate-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium dark:text-white">Marks Obtained</label>
                <Input
                  type="number"
                  value={newMarksData.marks}
                  onChange={(e) => setNewMarksData({ ...newMarksData, marks: parseInt(e.target.value) || 0 })}
                  className="mt-1 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                />
              </div>

              <div>
                <label className="text-sm font-medium dark:text-white">Total Marks</label>
                <Input
                  type="number"
                  value={newMarksData.totalMarks}
                  onChange={(e) => setNewMarksData({ ...newMarksData, totalMarks: parseInt(e.target.value) || 100 })}
                  className="mt-1 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setAddMarksDialogOpen(false)} className="dark:bg-slate-800 dark:border-slate-700 dark:hover:bg-slate-700 dark:text-white">
                Cancel
              </Button>
              <Button onClick={addMarksToCard} className="dark:bg-blue-600 dark:hover:bg-blue-700">
                <Plus className="mr-2 size-4" />
                Add Marks
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Marks Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl dark:bg-slate-900 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="dark:text-white">Edit Subject Marks</DialogTitle>
            <DialogDescription className="dark:text-slate-400">Update marks and remarks for {editingMarks?.subject}</DialogDescription>
          </DialogHeader>
          {editingMarks && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium dark:text-white">Marks Obtained</label>
                  <Input
                    type="number"
                    value={editingMarks.marks}
                    onChange={(e) => setEditingMarks({ ...editingMarks, marks: parseInt(e.target.value) || 0 })}
                    className="mt-1 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium dark:text-white">Percentage</label>
                  <p className="mt-2 text-lg font-semibold dark:text-white">{editingMarks.percentage}%</p>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium dark:text-white">Teacher Remarks</label>
                <Textarea
                  value={editingMarks.teacherRemarks || ""}
                  onChange={(e) => setEditingMarks({ ...editingMarks, teacherRemarks: e.target.value })}
                  placeholder="Add remarks for this subject..."
                  className="mt-1 dark:bg-slate-800 dark:border-slate-700 dark:text-white dark:placeholder:text-slate-500"
                  rows={3}
                />
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setEditDialogOpen(false)} className="dark:bg-slate-800 dark:border-slate-700 dark:hover:bg-slate-700 dark:text-white">
                  Cancel
                </Button>
                <Button onClick={updateMarks} className="dark:bg-blue-600 dark:hover:bg-blue-700">
                  <Save className="mr-2 size-4" />
                  Save Changes
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Admin Remarks Dialog */}
      <Dialog open={remarksDialogOpen} onOpenChange={setRemarksDialogOpen}>
        <DialogContent className="max-w-2xl dark:bg-slate-900 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="dark:text-white">Add Remarks & Suggestions</DialogTitle>
            <DialogDescription className="dark:text-slate-400">Provide feedback and improvement suggestions</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium dark:text-white">Subject (Optional)</label>
              <Input
                value={remarksData.subjectId}
                onChange={(e) => setRemarksData({ ...remarksData, subjectId: e.target.value })}
                placeholder="Enter subject ID or leave empty for general..."
                className="mt-1 dark:bg-slate-800 dark:border-slate-700 dark:text-white dark:placeholder:text-slate-500"
              />
            </div>

            <div>
              <label className="text-sm font-medium dark:text-white">Admin Remarks</label>
              <Textarea
                value={remarksData.adminRemarks}
                onChange={(e) => setRemarksData({ ...remarksData, adminRemarks: e.target.value })}
                placeholder="Enter admin remarks..."
                className="mt-1 dark:bg-slate-800 dark:border-slate-700 dark:text-white dark:placeholder:text-slate-500"
                rows={3}
              />
            </div>

            <div>
              <label className="text-sm font-medium dark:text-white">Suggested Areas for Improvement</label>
              <Textarea
                value={remarksData.suggestedImprovement}
                onChange={(e) => setRemarksData({ ...remarksData, suggestedImprovement: e.target.value })}
                placeholder="Suggest improvements and areas to focus on..."
                className="mt-1 dark:bg-slate-800 dark:border-slate-700 dark:text-white dark:placeholder:text-slate-500"
                rows={3}
              />
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setRemarksDialogOpen(false)} className="dark:bg-slate-800 dark:border-slate-700 dark:hover:bg-slate-700 dark:text-white">
                Cancel
              </Button>
              <Button onClick={addAdminRemarks} className="dark:bg-purple-600 dark:hover:bg-purple-700">
                <MessageSquare className="mr-2 size-4" />
                Add Remarks
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <Button className="w-full dark:bg-blue-600 dark:hover:bg-blue-700 mt-4" onClick={() => router.push(teacherHref("/teacher/dashboard"))}>
        <Home className="mr-2 size-4" />
        Back to Dashboard
      </Button>
    </div>
  )
}
