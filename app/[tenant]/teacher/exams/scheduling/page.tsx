"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  AlertCircle,
  BarChart3,
  Calendar,
  CheckCircle2,
  Clock,
  Copy,
  Download,
  Edit,
  Eye,
  FileText,
  Filter,
  Home,
  List,
  MapPin,
  Plus,
  RefreshCcw,
  Search,
  Settings,
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
  Trash2,
  Archive,
  Power,
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

type ExamSchedule = {
  id: string
  examId: string
  examName: string
  subject: string
  subjectCode: string
  classId: string
  className: string
  date: string
  startTime: string
  endTime: string
  duration: number
  room: string
  invigilator: string
  totalStudents: number
  registeredStudents: number
  status: "scheduled" | "ongoing" | "completed" | "postponed" | "cancelled"
  difficulty: "easy" | "medium" | "hard"
  totalMarks: number
  passingMarks: number
  remarks: string | null
  isActive: boolean
  isArchived: boolean
}

type SchedulingInsight = {
  totalSchedules: number
  scheduledCount: number
  ongoingCount: number
  completedCount: number
  postponedCount: number
  cancelledCount: number
  totalStudentsExpected: number
  totalRegistered: number
  registrationRate: number
  upcomingExams: number
  averageExamDuration: number
  examsByDifficulty: { [key: string]: number }
  examsByStatus: { [key: string]: number }
  schedulesByDate: { [key: string]: number }
  roomUtilization: { [key: string]: number }
  upcomingExamCount: number
}

const EXAM_STATUS = {
  scheduled: { label: "Scheduled", color: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400" },
  ongoing: { label: "Ongoing", color: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400" },
  completed: { label: "Completed", color: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400" },
  postponed: { label: "Postponed", color: "bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400" },
  cancelled: { label: "Cancelled", color: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400" },
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

const formatTime = (timeString: string) => {
  try {
    const [hours, minutes] = timeString.split(":")
    const hour = parseInt(hours)
    const ampm = hour >= 12 ? "PM" : "AM"
    const displayHour = hour > 12 ? hour - 12 : hour || 12
    return `${displayHour}:${minutes} ${ampm}`
  } catch {
    return timeString
  }
}

const getStatusColor = (status: string) => {
  return EXAM_STATUS[status as keyof typeof EXAM_STATUS]?.color || "bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-950/40 dark:text-gray-400"
}

const getDifficultyColor = (difficulty: string) => {
  switch (difficulty) {
    case "easy":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
    case "medium":
      return "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
    case "hard":
      return "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400"
    default:
      return "bg-gray-100 text-gray-700 dark:bg-gray-950/40 dark:text-gray-400"
  }
}

const getSchedulingInsights = (schedules: ExamSchedule[]): SchedulingInsight => {
  if (schedules.length === 0) {
    return {
      totalSchedules: 0,
      scheduledCount: 0,
      ongoingCount: 0,
      completedCount: 0,
      postponedCount: 0,
      cancelledCount: 0,
      totalStudentsExpected: 0,
      totalRegistered: 0,
      registrationRate: 0,
      upcomingExams: 0,
      averageExamDuration: 0,
      examsByDifficulty: {},
      examsByStatus: {},
      schedulesByDate: {},
      roomUtilization: {},
      upcomingExamCount: 0,
    }
  }

  const scheduledCount = schedules.filter((s) => s.status === "scheduled").length
  const ongoingCount = schedules.filter((s) => s.status === "ongoing").length
  const completedCount = schedules.filter((s) => s.status === "completed").length
  const postponedCount = schedules.filter((s) => s.status === "postponed").length
  const cancelledCount = schedules.filter((s) => s.status === "cancelled").length
  const totalStudentsExpected = schedules.reduce((sum, s) => sum + s.totalStudents, 0)
  const totalRegistered = schedules.reduce((sum, s) => sum + s.registeredStudents, 0)

  const examsByDifficulty: { [key: string]: number } = {}
  const examsByStatus: { [key: string]: number } = {}
  const schedulesByDate: { [key: string]: number } = {}
  const roomUtilization: { [key: string]: number } = {}

  schedules.forEach((schedule) => {
    examsByDifficulty[schedule.difficulty] = (examsByDifficulty[schedule.difficulty] || 0) + 1
    examsByStatus[schedule.status] = (examsByStatus[schedule.status] || 0) + 1
    schedulesByDate[schedule.date] = (schedulesByDate[schedule.date] || 0) + 1
    roomUtilization[schedule.room] = (roomUtilization[schedule.room] || 0) + 1
  })

  const registrationRate = totalStudentsExpected > 0 ? Math.round((totalRegistered / totalStudentsExpected) * 100) : 0
  const averageExamDuration = Math.round(schedules.reduce((sum, s) => sum + s.duration, 0) / schedules.length)
  const upcomingExamCount = scheduledCount + ongoingCount

  return {
    totalSchedules: schedules.length,
    scheduledCount,
    ongoingCount,
    completedCount,
    postponedCount,
    cancelledCount,
    totalStudentsExpected,
    totalRegistered,
    registrationRate,
    upcomingExams: upcomingExamCount,
    averageExamDuration,
    examsByDifficulty,
    examsByStatus,
    schedulesByDate,
    roomUtilization,
    upcomingExamCount,
  }
}

const teacherHref = (path: string) => {
  const tenant = typeof window !== "undefined" ? window.location.pathname.split("/")[1] : ""
  return `/${tenant}${path}`
}

export default function ExamSchedulingPage() {
  const router = useRouter()
  const [tenant, setTenant] = React.useState("")
  const [schedules, setSchedules] = React.useState<ExamSchedule[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [activeView, setActiveView] = React.useState<"list" | "grid" | "calendar">("list")
  const [filterStatus, setFilterStatus] = React.useState("all")
  const [filterDifficulty, setFilterDifficulty] = React.useState("all")
  const [filterDate, setFilterDate] = React.useState("")
  const [search, setSearch] = React.useState("")
  const [sortBy, setSortBy] = React.useState("date-asc")
  const [selectedSchedule, setSelectedSchedule] = React.useState<ExamSchedule | null>(null)
  const [detailsDialogOpen, setDetailsDialogOpen] = React.useState(false)
  const [editingSchedule, setEditingSchedule] = React.useState<ExamSchedule | null>(null)
  const [editDialogOpen, setEditDialogOpen] = React.useState(false)
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)
  const [archiveDialogOpen, setArchiveDialogOpen] = React.useState(false)
  const [newExam, setNewExam] = React.useState<Partial<ExamSchedule>>({
    status: "scheduled",
    difficulty: "medium",
    isActive: true,
    isArchived: false,
  })

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
        setSchedules(data.examSchedules || [])
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load exam schedules")
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [tenant])

  const insights = React.useMemo(() => getSchedulingInsights(schedules), [schedules])

  const filteredSchedules = React.useMemo(() => {
    return schedules
      .filter((s) => filterStatus === "all" || s.status === filterStatus)
      .filter((s) => filterDifficulty === "all" || s.difficulty === filterDifficulty)
      .filter((s) => !filterDate || s.date === filterDate)
      .filter(
        (s) =>
          !search ||
          s.examName.toLowerCase().includes(search.toLowerCase()) ||
          s.subject.toLowerCase().includes(search.toLowerCase()) ||
          s.className.toLowerCase().includes(search.toLowerCase()) ||
          s.room.toLowerCase().includes(search.toLowerCase())
      )
      .sort((a, b) => {
        if (sortBy === "date-asc") return new Date(a.date).getTime() - new Date(b.date).getTime()
        if (sortBy === "date-desc") return new Date(b.date).getTime() - new Date(a.date).getTime()
        if (sortBy === "name") return a.examName.localeCompare(b.examName)
        if (sortBy === "class") return a.className.localeCompare(b.className)
        return 0
      })
  }, [schedules, filterStatus, filterDifficulty, filterDate, search, sortBy])

  const rooms = React.useMemo(() => [...new Set(schedules.map((s) => s.room))], [schedules])
  const subjects = React.useMemo(() => [...new Set(schedules.map((s) => s.subject))], [schedules])

  const exportToCSV = () => {
    if (filteredSchedules.length === 0) {
      toast.error("No schedules to export")
      return
    }
    const headers = ["Exam", "Subject", "Class", "Date", "Time", "Duration", "Room", "Total Students", "Registered", "Status", "Difficulty"]
    const rows = filteredSchedules.map((s) => [
      s.examName,
      s.subject,
      s.className,
      formatDate(s.date),
      `${formatTime(s.startTime)} - ${formatTime(s.endTime)}`,
      `${s.duration} mins`,
      s.room,
      s.totalStudents,
      s.registeredStudents,
      s.status.charAt(0).toUpperCase() + s.status.slice(1),
      s.difficulty.charAt(0).toUpperCase() + s.difficulty.slice(1),
    ])
    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `exam-schedules-${new Date().toISOString().split("T")[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
    toast.success("Exam schedules exported successfully")
  }

  const updateSchedule = async () => {
    if (!editingSchedule || !tenant) return

    try {
      const res = await fetch(`/api/teacher/dashboard`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "exam.schedule.update",
          scheduleId: editingSchedule.id,
          status: editingSchedule.status,
          remarks: editingSchedule.remarks,
        }),
      })

      if (!res.ok) throw new Error("Failed to update schedule")

      const data = await res.json()
      setSchedules(data.examSchedules || [])
      setEditDialogOpen(false)
      setEditingSchedule(null)
      toast.success("Exam schedule updated successfully")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update schedule")
    }
  }

  const duplicateSchedule = async (schedule: ExamSchedule) => {
    try {
      const newSchedule = { ...schedule, id: `dup-${Date.now()}` }
      toast.success("Schedule duplicated successfully")
    } catch (err) {
      toast.error("Failed to duplicate schedule")
    }
  }

  const createExam = async () => {
    if (!tenant || !newExam.examName) {
      toast.error("Please fill in all required fields")
      return
    }

    try {
      const res = await fetch(`/api/teacher/dashboard`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "exam.create",
          exam: newExam,
        }),
      })

      if (!res.ok) throw new Error("Failed to create exam")

      const data = await res.json()
      setSchedules(data.examSchedules || [])
      setCreateDialogOpen(false)
      setNewExam({ status: "scheduled", difficulty: "medium", isActive: true, isArchived: false })
      toast.success("Exam created successfully")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create exam")
    }
  }

  const deleteExam = async () => {
    if (!selectedSchedule || !tenant) return

    try {
      const res = await fetch(`/api/teacher/dashboard`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "exam.delete",
          scheduleId: selectedSchedule.id,
        }),
      })

      if (!res.ok) throw new Error("Failed to delete exam")

      const data = await res.json()
      setSchedules(data.examSchedules || [])
      setDeleteDialogOpen(false)
      setDetailsDialogOpen(false)
      setSelectedSchedule(null)
      toast.success("Exam deleted successfully")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete exam")
    }
  }

  const archiveExam = async () => {
    if (!selectedSchedule || !tenant) return

    try {
      const res = await fetch(`/api/teacher/dashboard`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "exam.archive",
          scheduleId: selectedSchedule.id,
          isArchived: true,
        }),
      })

      if (!res.ok) throw new Error("Failed to archive exam")

      const data = await res.json()
      setSchedules(data.examSchedules || [])
      setArchiveDialogOpen(false)
      setDetailsDialogOpen(false)
      setSelectedSchedule(null)
      toast.success("Exam archived successfully")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to archive exam")
    }
  }

  const toggleExamActive = async (schedule: ExamSchedule) => {
    if (!tenant) return

    try {
      const res = await fetch(`/api/teacher/dashboard`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "exam.toggle_active",
          scheduleId: schedule.id,
          isActive: !schedule.isActive,
        }),
      })

      if (!res.ok) throw new Error("Failed to toggle exam status")

      const data = await res.json()
      setSchedules(data.examSchedules || [])
      toast.success(schedule.isActive ? "Exam deactivated" : "Exam activated")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to toggle exam status")
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
              Unable to Load Exam Schedules
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
                  <Calendar className="mr-1 size-3.5" />
                  Teacher workspace
                </Badge>
                <Badge variant="outline" className="bg-background/80 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700">
                  Exam Scheduling
                </Badge>
              </div>
              <div>
                <h1 className="text-3xl font-semibold tracking-tight md:text-4xl dark:text-white">Exam Scheduling Hub</h1>
                <p className="mt-2 text-muted-foreground dark:text-slate-400">
                  Manage exam schedules, invigilations, and student registrations with comprehensive analytics
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row xl:flex-col 2xl:flex-row">
              <Button onClick={() => setCreateDialogOpen(true)} className="dark:bg-blue-600 dark:hover:bg-blue-700">
                <Plus className="size-4" />
                Create Exam
              </Button>
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
          { label: "Total Exams", value: insights.totalSchedules, helper: "Scheduled", icon: BookOpen, color: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400" },
          { label: "Scheduled", value: insights.scheduledCount, helper: "Upcoming", icon: Calendar, color: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400" },
          { label: "Completed", value: insights.completedCount, helper: "Finished", icon: CheckCircle2, color: "bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-400" },
          { label: "Registration Rate", value: `${insights.registrationRate}%`, helper: "Student signup", icon: Users, color: "bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400" },
          { label: "Avg Duration", value: `${insights.averageExamDuration}m`, helper: "Average length", icon: Clock, color: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400" },
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
            { id: "calendar", label: "Calendar", icon: Calendar },
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
            placeholder="Search exams..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs dark:bg-slate-800 dark:border-slate-700 dark:text-white dark:placeholder:text-slate-500"
          />
          <Input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="max-w-xs dark:bg-slate-800 dark:border-slate-700 dark:text-white"
          />
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[140px] dark:bg-slate-800 dark:border-slate-700 dark:text-white">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="dark:bg-slate-800 dark:border-slate-700">
              <SelectItem value="all" className="dark:text-white">
                All Status
              </SelectItem>
              <SelectItem value="scheduled" className="dark:text-white">
                Scheduled
              </SelectItem>
              <SelectItem value="ongoing" className="dark:text-white">
                Ongoing
              </SelectItem>
              <SelectItem value="completed" className="dark:text-white">
                Completed
              </SelectItem>
              <SelectItem value="postponed" className="dark:text-white">
                Postponed
              </SelectItem>
              <SelectItem value="cancelled" className="dark:text-white">
                Cancelled
              </SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterDifficulty} onValueChange={setFilterDifficulty}>
            <SelectTrigger className="w-[140px] dark:bg-slate-800 dark:border-slate-700 dark:text-white">
              <SelectValue placeholder="Difficulty" />
            </SelectTrigger>
            <SelectContent className="dark:bg-slate-800 dark:border-slate-700">
              <SelectItem value="all" className="dark:text-white">
                All Difficulty
              </SelectItem>
              <SelectItem value="easy" className="dark:text-white">
                Easy
              </SelectItem>
              <SelectItem value="medium" className="dark:text-white">
                Medium
              </SelectItem>
              <SelectItem value="hard" className="dark:text-white">
                Hard
              </SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[140px] dark:bg-slate-800 dark:border-slate-700 dark:text-white">
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent className="dark:bg-slate-800 dark:border-slate-700">
              <SelectItem value="date-asc" className="dark:text-white">
                Date (Earliest)
              </SelectItem>
              <SelectItem value="date-desc" className="dark:text-white">
                Date (Latest)
              </SelectItem>
              <SelectItem value="name" className="dark:text-white">
                Exam Name
              </SelectItem>
              <SelectItem value="class" className="dark:text-white">
                Class
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
                <CardTitle className="dark:text-white">Exam Schedules</CardTitle>
                <CardDescription className="dark:text-slate-400">{filteredSchedules.length} exams</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {filteredSchedules.map((schedule) => (
                  <div
                    key={schedule.id}
                    onClick={() => {
                      setSelectedSchedule(schedule)
                      setDetailsDialogOpen(true)
                    }}
                    className="grid gap-3 rounded-2xl border bg-card hover:bg-muted/50 transition-colors cursor-pointer md:grid-cols-[1fr_100px_80px_100px_80px] md:items-center p-4 dark:bg-slate-800 dark:border-slate-700 dark:hover:bg-slate-700"
                  >
                    <div>
                      <p className="font-medium dark:text-white">{schedule.examName}</p>
                      <p className="text-sm text-muted-foreground dark:text-slate-400">{schedule.subject} · {schedule.className}</p>
                    </div>
                    <div className="text-sm">
                      <p className="text-muted-foreground dark:text-slate-400">Date</p>
                      <p className="font-medium text-xs dark:text-white">{formatDate(schedule.date)}</p>
                    </div>
                    <div className="text-sm">
                      <p className="text-muted-foreground dark:text-slate-400">Time</p>
                      <p className="font-medium text-xs dark:text-white">{formatTime(schedule.startTime)}</p>
                    </div>
                    <div className="text-sm">
                      <p className="text-muted-foreground dark:text-slate-400">Room</p>
                      <p className="font-medium text-xs dark:text-white">{schedule.room}</p>
                    </div>
                    <div>
                      <Badge className={cn("text-xs font-semibold", getStatusColor(schedule.status))}>
                        {EXAM_STATUS[schedule.status as keyof typeof EXAM_STATUS].label}
                      </Badge>
                    </div>
                  </div>
                ))}
                {filteredSchedules.length === 0 && (
                  <p className="text-sm text-muted-foreground dark:text-slate-400 text-center py-8">No schedules match filters</p>
                )}
              </CardContent>
            </Card>
          )}

          {activeView === "grid" && (
            <div className="grid gap-4 md:grid-cols-2">
              {filteredSchedules.map((schedule) => (
                <Card
                  key={schedule.id}
                  className="rounded-3xl shadow-sm hover:shadow-md transition-shadow cursor-pointer dark:bg-slate-900 dark:border-slate-800"
                  onClick={() => {
                    setSelectedSchedule(schedule)
                    setDetailsDialogOpen(true)
                  }}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <CardTitle className="line-clamp-2 dark:text-white">{schedule.examName}</CardTitle>
                        <CardDescription className="dark:text-slate-400">{schedule.subject}</CardDescription>
                      </div>
                      <Badge className={cn("text-xs", getDifficultyColor(schedule.difficulty))}>
                        {schedule.difficulty.charAt(0).toUpperCase() + schedule.difficulty.slice(1)}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground dark:text-slate-400">Class</p>
                        <p className="font-medium dark:text-white">{schedule.className}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground dark:text-slate-400">Date</p>
                        <p className="font-medium dark:text-white">{formatDate(schedule.date)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground dark:text-slate-400">Time</p>
                        <p className="font-medium dark:text-white">{formatTime(schedule.startTime)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground dark:text-slate-400">Room</p>
                        <p className="font-medium dark:text-white">{schedule.room}</p>
                      </div>
                    </div>
                    <div className="border-t pt-3 dark:border-slate-700">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground dark:text-slate-400">Registration Rate</span>
                        <span className="font-semibold text-blue-600 dark:text-blue-400">
                          {schedule.totalStudents > 0 ? Math.round((schedule.registeredStudents / schedule.totalStudents) * 100) : 0}%
                        </span>
                      </div>
                      <Progress value={schedule.totalStudents > 0 ? Math.round((schedule.registeredStudents / schedule.totalStudents) * 100) : 0} className="h-1.5 mt-1" />
                    </div>
                    <div className="flex gap-2">
                      <Badge className={cn("text-xs", getStatusColor(schedule.status))}>
                        {EXAM_STATUS[schedule.status as keyof typeof EXAM_STATUS].label}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {activeView === "calendar" && (
            <Card className="rounded-3xl shadow-sm dark:bg-slate-900 dark:border-slate-800">
              <CardHeader>
                <CardTitle className="dark:text-white">Calendar View</CardTitle>
                <CardDescription className="dark:text-slate-400">Exams organized by date</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(insights.schedulesByDate).map(([date, count]) => (
                    <div key={date} className="p-4 rounded-2xl border bg-card dark:bg-slate-800 dark:border-slate-700">
                      <div className="flex items-center justify-between mb-3">
                        <p className="font-semibold dark:text-white">{formatDate(date)}</p>
                        <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400">{count} exams</Badge>
                      </div>
                      <div className="space-y-2">
                        {filteredSchedules
                          .filter((s) => s.date === date)
                          .map((schedule) => (
                            <div
                              key={schedule.id}
                              className="p-2 rounded-xl bg-muted dark:bg-slate-700 cursor-pointer hover:bg-muted/75 dark:hover:bg-slate-600 transition-colors"
                              onClick={() => {
                                setSelectedSchedule(schedule)
                                setDetailsDialogOpen(true)
                              }}
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm font-medium dark:text-white">{schedule.examName}</p>
                                  <p className="text-xs text-muted-foreground dark:text-slate-400">{formatTime(schedule.startTime)} · {schedule.room}</p>
                                </div>
                                <Badge className={cn("text-xs", getStatusColor(schedule.status))}>
                                  {EXAM_STATUS[schedule.status as keyof typeof EXAM_STATUS].label}
                                </Badge>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Analytics Cards */}
          <section className="grid gap-6 md:grid-cols-2">
            <Card className="rounded-3xl shadow-sm dark:bg-slate-900 dark:border-slate-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 dark:text-white">
                  <BarChart3 className="size-5 text-blue-500" />
                  Status Distribution
                </CardTitle>
                <CardDescription className="dark:text-slate-400">Exam breakdown</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { label: "Scheduled", value: insights.scheduledCount, color: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400" },
                  { label: "Ongoing", value: insights.ongoingCount, color: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400" },
                  { label: "Completed", value: insights.completedCount, color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400" },
                  { label: "Postponed", value: insights.postponedCount, color: "bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400" },
                  { label: "Cancelled", value: insights.cancelledCount, color: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400" },
                ].map(({ label, value, color }) => (
                  <div key={label} className="flex items-center justify-between">
                    <span className="text-sm font-medium dark:text-white">{label}</span>
                    <Badge className={color}>{value}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="rounded-3xl shadow-sm dark:bg-slate-900 dark:border-slate-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 dark:text-white">
                  <AlertTriangle className="size-5 text-orange-500" />
                  Difficulty Distribution
                </CardTitle>
                <CardDescription className="dark:text-slate-400">By exam level</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { label: "Easy", value: insights.examsByDifficulty["easy"] || 0, color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400" },
                  { label: "Medium", value: insights.examsByDifficulty["medium"] || 0, color: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400" },
                  { label: "Hard", value: insights.examsByDifficulty["hard"] || 0, color: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400" },
                ].map(({ label, value, color }) => (
                  <div key={label} className="flex items-center justify-between">
                    <span className="text-sm font-medium dark:text-white">{label}</span>
                    <Badge className={color}>{value}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="rounded-3xl shadow-sm dark:bg-slate-900 dark:border-slate-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 dark:text-white">
                  <Users className="size-5 text-purple-500" />
                  Student Registration
                </CardTitle>
                <CardDescription className="dark:text-slate-400">Enrollment metrics</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { label: "Total Expected", value: insights.totalStudentsExpected },
                  { label: "Total Registered", value: insights.totalRegistered },
                  { label: "Registration Rate", value: `${insights.registrationRate}%` },
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
                  <MapPin className="size-5 text-cyan-500" />
                  Room Utilization
                </CardTitle>
                <CardDescription className="dark:text-slate-400">By exam venue</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {rooms.slice(0, 4).map((room) => {
                  const count = insights.roomUtilization[room] || 0
                  const percentage = Math.round((count / insights.totalSchedules) * 100)
                  return (
                    <div key={room}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium dark:text-white">{room}</span>
                        <span className="text-muted-foreground dark:text-slate-400">{count} exams</span>
                      </div>
                      <Progress value={percentage} className="h-1.5" />
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          </section>
        </div>

        {/* Sidebar */}
        <aside className="space-y-6">
          <Card className="rounded-3xl shadow-sm bg-gradient-to-br from-blue-50 to-blue-50/50 border-blue-100/50 dark:from-blue-950/40 dark:to-blue-950/20 dark:border-blue-900/50">
            <CardHeader>
              <CardTitle className="text-blue-900 dark:text-blue-300">Upcoming Exams</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {schedules
                .filter((s) => s.status === "scheduled" || s.status === "ongoing")
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                .slice(0, 5)
                .map((exam) => (
                  <div
                    key={exam.id}
                    onClick={() => {
                      setSelectedSchedule(exam)
                      setDetailsDialogOpen(true)
                    }}
                    className="p-2 rounded-xl bg-white/50 dark:bg-blue-950/30 cursor-pointer hover:bg-white/75 dark:hover:bg-blue-950/50 transition-colors"
                  >
                    <p className="text-sm font-medium dark:text-blue-200 line-clamp-1">{exam.examName}</p>
                    <p className="text-xs text-blue-700 dark:text-blue-400">{formatDate(exam.date)} · {formatTime(exam.startTime)}</p>
                  </div>
                ))}
              {schedules.filter((s) => s.status === "scheduled" || s.status === "ongoing").length === 0 && (
                <p className="text-sm text-muted-foreground dark:text-slate-400">No upcoming exams</p>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-3xl shadow-sm bg-gradient-to-br from-emerald-50 to-emerald-50/50 border-emerald-100/50 dark:from-emerald-950/40 dark:to-emerald-950/20 dark:border-emerald-900/50">
            <CardHeader>
              <CardTitle className="text-emerald-900 dark:text-emerald-300">Quick Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: "Total Exams", value: insights.totalSchedules, icon: BookOpen },
                { label: "Upcoming", value: insights.upcomingExamCount, icon: Calendar },
                { label: "Completed", value: insights.completedCount, icon: CheckCircle2 },
                { label: "Rooms in Use", value: rooms.length, icon: MapPin },
              ].map(({ label, value, icon: Icon }) => (
                <div key={label} className="flex items-center justify-between p-2 rounded-xl bg-white/50 dark:bg-emerald-950/30">
                  <div className="flex items-center gap-2">
                    <Icon className="size-4 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-sm font-medium dark:text-emerald-200">{label}</span>
                  </div>
                  <Badge variant="outline" className="text-sm dark:bg-emerald-950/50 dark:border-emerald-800 dark:text-emerald-300">
                    {value}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="rounded-3xl shadow-sm bg-gradient-to-br from-amber-50 to-amber-50/50 border-amber-100/50 dark:from-amber-950/40 dark:to-amber-950/20 dark:border-amber-900/50">
            <CardHeader>
              <CardTitle className="text-amber-900 dark:text-amber-300">Subject Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {subjects.slice(0, 5).map((subject) => {
                const count = schedules.filter((s) => s.subject === subject).length
                return (
                  <div key={subject} className="p-2 rounded-xl bg-white/50 dark:bg-amber-950/30">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium dark:text-amber-200 line-clamp-1">{subject}</span>
                      <Badge variant="outline" className="text-xs dark:bg-amber-950/50 dark:border-amber-800 dark:text-amber-300">
                        {count}
                      </Badge>
                    </div>
                  </div>
                )
              })}
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
            <DialogTitle className="dark:text-white">{selectedSchedule?.examName}</DialogTitle>
            <DialogDescription className="dark:text-slate-400">{selectedSchedule?.subject} · {selectedSchedule?.className}</DialogDescription>
          </DialogHeader>
          {selectedSchedule && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground dark:text-slate-400">Date</p>
                  <p className="font-medium dark:text-white">{formatDate(selectedSchedule.date)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground dark:text-slate-400">Time</p>
                  <p className="font-medium dark:text-white">{formatTime(selectedSchedule.startTime)} - {formatTime(selectedSchedule.endTime)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground dark:text-slate-400">Room</p>
                  <p className="font-medium dark:text-white">{selectedSchedule.room}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground dark:text-slate-400">Duration</p>
                  <p className="font-medium dark:text-white">{selectedSchedule.duration} minutes</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground dark:text-slate-400">Invigilator</p>
                  <p className="font-medium dark:text-white">{selectedSchedule.invigilator}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground dark:text-slate-400">Difficulty</p>
                  <Badge className={cn("text-xs", getDifficultyColor(selectedSchedule.difficulty))}>
                    {selectedSchedule.difficulty.charAt(0).toUpperCase() + selectedSchedule.difficulty.slice(1)}
                  </Badge>
                </div>
              </div>

              <div className="border-t pt-4 dark:border-slate-700">
                <p className="text-sm font-medium dark:text-white mb-3">Student Registration</p>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground dark:text-slate-400">Total Students</span>
                    <span className="font-medium dark:text-white">{selectedSchedule.totalStudents}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground dark:text-slate-400">Registered</span>
                    <span className="font-medium dark:text-white">{selectedSchedule.registeredStudents}</span>
                  </div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-muted-foreground dark:text-slate-400">Registration Rate</span>
                    <span className="font-semibold text-blue-600 dark:text-blue-400">
                      {selectedSchedule.totalStudents > 0 ? Math.round((selectedSchedule.registeredStudents / selectedSchedule.totalStudents) * 100) : 0}%
                    </span>
                  </div>
                  <Progress value={selectedSchedule.totalStudents > 0 ? Math.round((selectedSchedule.registeredStudents / selectedSchedule.totalStudents) * 100) : 0} className="h-2" />
                </div>
              </div>

              <div className="border-t pt-4 dark:border-slate-700">
                <p className="text-sm font-medium dark:text-white mb-3">Exam Details</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground dark:text-slate-400">Total Marks</span>
                    <span className="font-medium dark:text-white">{selectedSchedule.totalMarks}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground dark:text-slate-400">Passing Marks</span>
                    <span className="font-medium dark:text-white">{selectedSchedule.passingMarks}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground dark:text-slate-400">Status</span>
                    <Badge className={cn("text-xs", getStatusColor(selectedSchedule.status))}>
                      {EXAM_STATUS[selectedSchedule.status as keyof typeof EXAM_STATUS].label}
                    </Badge>
                  </div>
                </div>
              </div>

              {selectedSchedule.remarks && (
                <div className="border-t pt-4 dark:border-slate-700">
                  <p className="text-sm text-muted-foreground dark:text-slate-400">Remarks</p>
                  <p className="text-sm dark:text-white">{selectedSchedule.remarks}</p>
                </div>
              )}

              <DialogFooter>
                <Button variant="outline" onClick={() => setDetailsDialogOpen(false)} className="dark:bg-slate-800 dark:border-slate-700 dark:hover:bg-slate-700 dark:text-white">
                  Close
                </Button>
                <Button
                  variant="outline"
                  onClick={() => toggleExamActive(selectedSchedule)}
                  className="dark:bg-slate-800 dark:border-slate-700 dark:hover:bg-slate-700 dark:text-white"
                >
                  <Power className="mr-2 size-4" />
                  {selectedSchedule.isActive ? "Deactivate" : "Activate"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => duplicateSchedule(selectedSchedule)}
                  className="dark:bg-slate-800 dark:border-slate-700 dark:hover:bg-slate-700 dark:text-white"
                >
                  <Copy className="mr-2 size-4" />
                  Duplicate
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setArchiveDialogOpen(true)}
                  className="dark:bg-orange-800 dark:border-orange-700 dark:hover:bg-orange-700 dark:text-white"
                >
                  <Archive className="mr-2 size-4" />
                  Archive
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => setDeleteDialogOpen(true)}
                  className="dark:bg-red-700 dark:hover:bg-red-800"
                >
                  <Trash2 className="mr-2 size-4" />
                  Delete
                </Button>
                <Button
                  onClick={() => {
                    setEditingSchedule(selectedSchedule)
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
            <DialogTitle className="dark:text-white">Edit Exam Schedule</DialogTitle>
            <DialogDescription className="dark:text-slate-400">Update schedule details and status</DialogDescription>
          </DialogHeader>
          {editingSchedule && (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground dark:text-slate-400">Exam</p>
                <p className="font-medium dark:text-white">{editingSchedule.examName}</p>
              </div>

              <div>
                <label className="text-sm font-medium dark:text-white">Status</label>
                <Select
                  value={editingSchedule.status}
                  onValueChange={(status) =>
                    setEditingSchedule({ ...editingSchedule, status: status as any })
                  }
                >
                  <SelectTrigger className="mt-1 dark:bg-slate-800 dark:border-slate-700 dark:text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="dark:bg-slate-800 dark:border-slate-700">
                    <SelectItem value="scheduled" className="dark:text-white">
                      Scheduled
                    </SelectItem>
                    <SelectItem value="ongoing" className="dark:text-white">
                      Ongoing
                    </SelectItem>
                    <SelectItem value="completed" className="dark:text-white">
                      Completed
                    </SelectItem>
                    <SelectItem value="postponed" className="dark:text-white">
                      Postponed
                    </SelectItem>
                    <SelectItem value="cancelled" className="dark:text-white">
                      Cancelled
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium dark:text-white">Remarks</label>
                <Input
                  value={editingSchedule.remarks || ""}
                  onChange={(e) =>
                    setEditingSchedule({ ...editingSchedule, remarks: e.target.value })
                  }
                  placeholder="Add remarks..."
                  className="mt-1 dark:bg-slate-800 dark:border-slate-700 dark:text-white dark:placeholder:text-slate-500"
                />
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setEditDialogOpen(false)} className="dark:bg-slate-800 dark:border-slate-700 dark:hover:bg-slate-700 dark:text-white">
                  Cancel
                </Button>
                <Button onClick={updateSchedule} className="dark:bg-blue-600 dark:hover:bg-blue-700">
                  <Save className="mr-2 size-4" />
                  Save Changes
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Exam Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-2xl dark:bg-slate-900 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="dark:text-white">Create New Exam</DialogTitle>
            <DialogDescription className="dark:text-slate-400">Add a new exam schedule</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium dark:text-white">Exam Name</label>
                <Input
                  value={newExam.examName || ""}
                  onChange={(e) => setNewExam({ ...newExam, examName: e.target.value })}
                  placeholder="Enter exam name"
                  className="mt-1 dark:bg-slate-800 dark:border-slate-700 dark:text-white dark:placeholder:text-slate-500"
                />
              </div>
              <div>
                <label className="text-sm font-medium dark:text-white">Subject</label>
                <Input
                  value={newExam.subject || ""}
                  onChange={(e) => setNewExam({ ...newExam, subject: e.target.value })}
                  placeholder="Enter subject"
                  className="mt-1 dark:bg-slate-800 dark:border-slate-700 dark:text-white dark:placeholder:text-slate-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium dark:text-white">Class</label>
                <Input
                  value={newExam.className || ""}
                  onChange={(e) => setNewExam({ ...newExam, className: e.target.value })}
                  placeholder="Enter class"
                  className="mt-1 dark:bg-slate-800 dark:border-slate-700 dark:text-white dark:placeholder:text-slate-500"
                />
              </div>
              <div>
                <label className="text-sm font-medium dark:text-white">Date</label>
                <Input
                  type="date"
                  value={newExam.date || ""}
                  onChange={(e) => setNewExam({ ...newExam, date: e.target.value })}
                  className="mt-1 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium dark:text-white">Start Time</label>
                <Input
                  type="time"
                  value={newExam.startTime || ""}
                  onChange={(e) => setNewExam({ ...newExam, startTime: e.target.value })}
                  className="mt-1 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                />
              </div>
              <div>
                <label className="text-sm font-medium dark:text-white">End Time</label>
                <Input
                  type="time"
                  value={newExam.endTime || ""}
                  onChange={(e) => setNewExam({ ...newExam, endTime: e.target.value })}
                  className="mt-1 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium dark:text-white">Room</label>
                <Input
                  value={newExam.room || ""}
                  onChange={(e) => setNewExam({ ...newExam, room: e.target.value })}
                  placeholder="Enter room"
                  className="mt-1 dark:bg-slate-800 dark:border-slate-700 dark:text-white dark:placeholder:text-slate-500"
                />
              </div>
              <div>
                <label className="text-sm font-medium dark:text-white">Duration (mins)</label>
                <Input
                  type="number"
                  value={newExam.duration || ""}
                  onChange={(e) => setNewExam({ ...newExam, duration: parseInt(e.target.value) })}
                  placeholder="60"
                  className="mt-1 dark:bg-slate-800 dark:border-slate-700 dark:text-white dark:placeholder:text-slate-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium dark:text-white">Total Marks</label>
                <Input
                  type="number"
                  value={newExam.totalMarks || ""}
                  onChange={(e) => setNewExam({ ...newExam, totalMarks: parseInt(e.target.value) })}
                  placeholder="100"
                  className="mt-1 dark:bg-slate-800 dark:border-slate-700 dark:text-white dark:placeholder:text-slate-500"
                />
              </div>
              <div>
                <label className="text-sm font-medium dark:text-white">Passing Marks</label>
                <Input
                  type="number"
                  value={newExam.passingMarks || ""}
                  onChange={(e) => setNewExam({ ...newExam, passingMarks: parseInt(e.target.value) })}
                  placeholder="40"
                  className="mt-1 dark:bg-slate-800 dark:border-slate-700 dark:text-white dark:placeholder:text-slate-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium dark:text-white">Difficulty</label>
                <Select value={newExam.difficulty || "medium"} onValueChange={(d) => setNewExam({ ...newExam, difficulty: d as any })}>
                  <SelectTrigger className="mt-1 dark:bg-slate-800 dark:border-slate-700 dark:text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="dark:bg-slate-800 dark:border-slate-700">
                    <SelectItem value="easy" className="dark:text-white">Easy</SelectItem>
                    <SelectItem value="medium" className="dark:text-white">Medium</SelectItem>
                    <SelectItem value="hard" className="dark:text-white">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium dark:text-white">Total Students</label>
                <Input
                  type="number"
                  value={newExam.totalStudents || ""}
                  onChange={(e) => setNewExam({ ...newExam, totalStudents: parseInt(e.target.value) })}
                  placeholder="30"
                  className="mt-1 dark:bg-slate-800 dark:border-slate-700 dark:text-white dark:placeholder:text-slate-500"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)} className="dark:bg-slate-800 dark:border-slate-700 dark:hover:bg-slate-700 dark:text-white">
                Cancel
              </Button>
              <Button onClick={createExam} className="dark:bg-blue-600 dark:hover:bg-blue-700">
                <Plus className="mr-2 size-4" />
                Create Exam
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="dark:bg-slate-900 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="dark:text-white">Delete Exam</DialogTitle>
            <DialogDescription className="dark:text-slate-400">
              Are you sure you want to delete this exam? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50">
            <p className="text-sm text-red-900 dark:text-red-300">
              <strong>Exam:</strong> {selectedSchedule?.examName}
            </p>
            <p className="text-sm text-red-800 dark:text-red-400 mt-2">
              All associated data will be permanently removed.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} className="dark:bg-slate-800 dark:border-slate-700 dark:hover:bg-slate-700 dark:text-white">
              Cancel
            </Button>
            <Button variant="destructive" onClick={deleteExam} className="dark:bg-red-700 dark:hover:bg-red-800">
              <Trash2 className="mr-2 size-4" />
              Delete Permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Archive Confirmation Dialog */}
      <Dialog open={archiveDialogOpen} onOpenChange={setArchiveDialogOpen}>
        <DialogContent className="dark:bg-slate-900 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="dark:text-white">Archive Exam</DialogTitle>
            <DialogDescription className="dark:text-slate-400">
              Archive this exam to hide it from active schedules. You can restore it later.
            </DialogDescription>
          </DialogHeader>
          <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50">
            <p className="text-sm text-amber-900 dark:text-amber-300">
              <strong>Exam:</strong> {selectedSchedule?.examName}
            </p>
            <p className="text-sm text-amber-800 dark:text-amber-400 mt-2">
              This exam will be moved to archives and hidden from active view.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setArchiveDialogOpen(false)} className="dark:bg-slate-800 dark:border-slate-700 dark:hover:bg-slate-700 dark:text-white">
              Cancel
            </Button>
            <Button onClick={archiveExam} className="dark:bg-amber-600 dark:hover:bg-amber-700">
              <Archive className="mr-2 size-4" />
              Archive Exam
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
