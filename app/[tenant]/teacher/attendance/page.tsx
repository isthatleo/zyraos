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
  Plus,
  RefreshCcw,
  Search,
  TrendingDown,
  TrendingUp,
  Users,
  Grid,
  Trash2,
  Save,
  X,
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

type AttendanceRecord = {
  id: string
  studentId: string
  studentName: string
  admissionNumber: string
  classId: string
  className: string
  date: string
  status: "present" | "absent" | "late" | "excused"
  remarks: string | null
}

type TeacherClass = {
  id: string
  name: string
  grade: string
  section: string
  students: number
}

type AttendanceInsight = {
  totalRecords: number
  presentCount: number
  absentCount: number
  lateCount: number
  excusedCount: number
  presentPercentage: number
  averageAttendanceRate: number
  absentStudents: string[]
  lateStudents: string[]
  classDistribution: { [key: string]: { present: number; absent: number; late: number; excused: number } }
}

const teacherHref = (path: string) => {
  const tenant = typeof window !== "undefined" ? window.location.pathname.split("/")[1] : ""
  return `/${tenant}${path}`
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "present":
      return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/50"
    case "absent":
      return "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-900/50"
    case "late":
      return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/50"
    case "excused":
      return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900/50"
    default:
      return "bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-950/40 dark:text-gray-400 dark:border-gray-900/50"
  }
}

const getAttendanceInsights = (records: AttendanceRecord[]): AttendanceInsight => {
  if (records.length === 0) {
    return {
      totalRecords: 0,
      presentCount: 0,
      absentCount: 0,
      lateCount: 0,
      excusedCount: 0,
      presentPercentage: 0,
      averageAttendanceRate: 0,
      absentStudents: [],
      lateStudents: [],
      classDistribution: {},
    }
  }

  const presentCount = records.filter((r) => r.status === "present").length
  const absentCount = records.filter((r) => r.status === "absent").length
  const lateCount = records.filter((r) => r.status === "late").length
  const excusedCount = records.filter((r) => r.status === "excused").length

  const absentStudents = [...new Set(records.filter((r) => r.status === "absent").map((r) => r.studentName))]
  const lateStudents = [...new Set(records.filter((r) => r.status === "late").map((r) => r.studentName))]

  const classDistribution: { [key: string]: { present: number; absent: number; late: number; excused: number } } = {}
  records.forEach((record) => {
    if (!classDistribution[record.className]) {
      classDistribution[record.className] = { present: 0, absent: 0, late: 0, excused: 0 }
    }
    classDistribution[record.className][record.status]++
  })

  const presentPercentage = Math.round((presentCount / records.length) * 100)
  const averageAttendanceRate = Math.round(
    ((presentCount + excusedCount) / records.length) * 100
  )

  return {
    totalRecords: records.length,
    presentCount,
    absentCount,
    lateCount,
    excusedCount,
    presentPercentage,
    averageAttendanceRate,
    absentStudents,
    lateStudents,
    classDistribution,
  }
}

export default function AttendancePage() {
  const router = useRouter()
  const [tenant, setTenant] = React.useState("")
  const [attendanceRecords, setAttendanceRecords] = React.useState<AttendanceRecord[]>([])
  const [classes, setClasses] = React.useState<TeacherClass[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [activeView, setActiveView] = React.useState<"list" | "grid">("list")
  const [filterClass, setFilterClass] = React.useState("all")
  const [filterDate, setFilterDate] = React.useState("")
  const [filterStatus, setFilterStatus] = React.useState("all")
  const [search, setSearch] = React.useState("")
  const [sortBy, setSortBy] = React.useState("date-desc")
  const [selectedRecord, setSelectedRecord] = React.useState<AttendanceRecord | null>(null)
  const [detailsDialogOpen, setDetailsDialogOpen] = React.useState(false)
  const [editingRecord, setEditingRecord] = React.useState<AttendanceRecord | null>(null)
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
        setAttendanceRecords(data.attendance || [])
        setClasses(data.classes || [])
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load attendance data")
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [tenant])

  const insights = React.useMemo(() => getAttendanceInsights(attendanceRecords), [attendanceRecords])

  const filteredRecords = React.useMemo(() => {
    return attendanceRecords
      .filter((r) => filterClass === "all" || r.classId === filterClass)
      .filter((r) => filterStatus === "all" || r.status === filterStatus)
      .filter((r) => !filterDate || r.date === filterDate)
      .filter((r) => !search || r.studentName.toLowerCase().includes(search.toLowerCase()) || r.admissionNumber.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => {
        if (sortBy === "date-desc") return new Date(b.date).getTime() - new Date(a.date).getTime()
        if (sortBy === "date-asc") return new Date(a.date).getTime() - new Date(b.date).getTime()
        if (sortBy === "name") return a.studentName.localeCompare(b.studentName)
        if (sortBy === "status") return a.status.localeCompare(b.status)
        return 0
      })
  }, [attendanceRecords, filterClass, filterDate, filterStatus, search, sortBy])

  const classIds = React.useMemo(() => [...new Set(attendanceRecords.map((r) => r.classId))], [attendanceRecords])

  const exportToCSV = () => {
    if (filteredRecords.length === 0) {
      toast.error("No records to export")
      return
    }
    const headers = ["Date", "Student", "Admission No", "Class", "Status", "Remarks"]
    const rows = filteredRecords.map((r) => [
      formatDate(r.date),
      r.studentName,
      r.admissionNumber,
      r.className,
      r.status.charAt(0).toUpperCase() + r.status.slice(1),
      r.remarks || "",
    ])
    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `attendance-export-${new Date().toISOString().split("T")[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
    toast.success("Attendance exported successfully")
  }

  const saveAttendance = async () => {
    if (!editingRecord || !tenant) return

    try {
      const res = await fetch(`/api/teacher/dashboard`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "attendance.update",
          recordId: editingRecord.id,
          status: editingRecord.status,
          remarks: editingRecord.remarks,
        }),
      })

      if (!res.ok) throw new Error("Failed to save attendance")

      const data = await res.json()
      setAttendanceRecords(data.attendance || [])
      setEditDialogOpen(false)
      setEditingRecord(null)
      toast.success("Attendance saved successfully")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save attendance")
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
        <Card className="rounded-3xl border-destructive/20 bg-destructive/5 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="size-5" />
              Unable to Load Attendance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button onClick={() => window.location.reload()}>Retry</Button>
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
                  <FileText className="mr-1 size-3.5" />
                  Teacher workspace
                </Badge>
                <Badge variant="outline" className="bg-background/80 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700">
                  Attendance
                </Badge>
              </div>
              <div>
                <h1 className="text-3xl font-semibold tracking-tight md:text-4xl dark:text-white">Mark Attendance & Tracking</h1>
                <p className="mt-2 text-muted-foreground dark:text-slate-400">Track student attendance across all your classes with comprehensive analytics</p>
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
          { label: "Total Records", value: insights.totalRecords, helper: "All records", icon: FileText, color: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400" },
          { label: "Present", value: insights.presentCount, helper: "Students present", icon: CheckCircle2, color: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400" },
          { label: "Absent", value: insights.absentCount, helper: "Students absent", icon: AlertCircle, color: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400" },
          { label: "Late", value: insights.lateCount, helper: "Students late", icon: Clock, color: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400" },
          { label: "Attendance Rate", value: `${insights.presentPercentage}%`, helper: "Overall rate", icon: BarChart3, color: "bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400" },
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
            placeholder="Search students..."
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
          <Select value={filterClass} onValueChange={setFilterClass}>
            <SelectTrigger className="w-[140px] dark:bg-slate-800 dark:border-slate-700 dark:text-white">
              <SelectValue placeholder="Class" />
            </SelectTrigger>
            <SelectContent className="dark:bg-slate-800 dark:border-slate-700">
              <SelectItem value="all" className="dark:text-white">All Classes</SelectItem>
              {classIds.map((id) => {
                const cls = classes.find((c) => c.id === id)
                return (
                  <SelectItem key={id} value={id} className="dark:text-white">
                    {cls?.name || id}
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[140px] dark:bg-slate-800 dark:border-slate-700 dark:text-white">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="dark:bg-slate-800 dark:border-slate-700">
              <SelectItem value="all" className="dark:text-white">All Status</SelectItem>
              <SelectItem value="present" className="dark:text-white">Present</SelectItem>
              <SelectItem value="absent" className="dark:text-white">Absent</SelectItem>
              <SelectItem value="late" className="dark:text-white">Late</SelectItem>
              <SelectItem value="excused" className="dark:text-white">Excused</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[140px] dark:bg-slate-800 dark:border-slate-700 dark:text-white">
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent className="dark:bg-slate-800 dark:border-slate-700">
              <SelectItem value="date-desc" className="dark:text-white">Latest First</SelectItem>
              <SelectItem value="date-asc" className="dark:text-white">Oldest First</SelectItem>
              <SelectItem value="name" className="dark:text-white">Student A-Z</SelectItem>
              <SelectItem value="status" className="dark:text-white">Status</SelectItem>
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
                <CardTitle className="dark:text-white">Attendance Records</CardTitle>
                <CardDescription className="dark:text-slate-400">{filteredRecords.length} records</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {filteredRecords.map((record) => (
                  <div
                    key={record.id}
                    onClick={() => {
                      setSelectedRecord(record)
                      setDetailsDialogOpen(true)
                    }}
                    className="grid gap-3 rounded-2xl border bg-card hover:bg-muted/50 transition-colors cursor-pointer md:grid-cols-[1fr_100px_80px_100px] md:items-center p-4 dark:bg-slate-800 dark:border-slate-700 dark:hover:bg-slate-700"
                  >
                    <div>
                      <p className="font-medium dark:text-white">{record.studentName}</p>
                      <p className="text-sm text-muted-foreground dark:text-slate-400">{record.className} · {record.admissionNumber}</p>
                    </div>
                    <div className="text-sm">
                      <p className="text-muted-foreground dark:text-slate-400">Date</p>
                      <p className="font-medium text-xs dark:text-white">{formatDate(record.date)}</p>
                    </div>
                    <div className="text-sm">
                      <p className="text-muted-foreground dark:text-slate-400">Remarks</p>
                      <p className="font-medium text-xs dark:text-white">{record.remarks || "-"}</p>
                    </div>
                    <div>
                      <Badge className={cn("text-xs font-semibold", getStatusColor(record.status))}>
                        {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                      </Badge>
                    </div>
                  </div>
                ))}
                {filteredRecords.length === 0 && <p className="text-sm text-muted-foreground dark:text-slate-400 text-center py-8">No records match filters</p>}
              </CardContent>
            </Card>
          )}

          {activeView === "grid" && (
            <div className="grid gap-4 md:grid-cols-2">
              {filteredRecords.map((record) => (
                <Card
                  key={record.id}
                  className="rounded-3xl shadow-sm hover:shadow-md transition-shadow cursor-pointer dark:bg-slate-900 dark:border-slate-800"
                  onClick={() => {
                    setSelectedRecord(record)
                    setDetailsDialogOpen(true)
                  }}
                >
                  <CardHeader>
                    <CardTitle className="line-clamp-2 dark:text-white">{record.studentName}</CardTitle>
                    <CardDescription className="dark:text-slate-400">{record.className}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground dark:text-slate-400">Admission</p>
                        <p className="font-medium dark:text-white">{record.admissionNumber}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground dark:text-slate-400">Date</p>
                        <p className="font-medium dark:text-white">{formatDate(record.date)}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground dark:text-slate-400 mb-2">Status</p>
                      <Badge className={cn("text-xs font-semibold", getStatusColor(record.status))}>
                        {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                      </Badge>
                    </div>
                    {record.remarks && (
                      <div>
                        <p className="text-xs text-muted-foreground dark:text-slate-400">Remarks</p>
                        <p className="text-sm dark:text-white">{record.remarks}</p>
                      </div>
                    )}
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
                  Class Attendance
                </CardTitle>
                <CardDescription className="dark:text-slate-400">Attendance by class</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {Object.entries(insights.classDistribution)
                  .map(([className, data]) => {
                    const total = data.present + data.absent + data.late + data.excused
                    const rate = total > 0 ? Math.round((data.present / total) * 100) : 0
                    return (
                      <div key={className}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium dark:text-white">{className}</span>
                          <span className="text-muted-foreground dark:text-slate-400">{rate}%</span>
                        </div>
                        <Progress value={rate} className="h-1.5" />
                      </div>
                    )
                  })}
              </CardContent>
            </Card>

            <Card className="rounded-3xl shadow-sm dark:bg-slate-900 dark:border-slate-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 dark:text-white">
                  <Users className="size-5 text-emerald-500" />
                  Status Breakdown
                </CardTitle>
                <CardDescription className="dark:text-slate-400">All attendance status</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { label: "Present", value: insights.presentCount, color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400" },
                  { label: "Absent", value: insights.absentCount, color: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400" },
                  { label: "Late", value: insights.lateCount, color: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400" },
                  { label: "Excused", value: insights.excusedCount, color: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400" },
                ].map(({ label, value, color }) => (
                  <div key={label} className="flex items-center justify-between">
                    <span className="text-sm font-medium dark:text-white">{label}</span>
                    <Badge className={color}>{value}</Badge>
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
              <CardTitle className="text-emerald-900 dark:text-emerald-300">Attendance Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: "Total Records", value: insights.totalRecords, icon: FileText },
                { label: "Attendance Rate", value: `${insights.presentPercentage}%`, icon: CheckCircle2 },
                { label: "Average Rate", value: `${insights.averageAttendanceRate}%`, icon: BarChart3 },
                { label: "Classes Tracked", value: classIds.length, icon: Users },
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

          <Card className="rounded-3xl shadow-sm dark:bg-slate-900 dark:border-slate-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 dark:text-white">
                <AlertCircle className="size-5 text-red-500" />
                Attention Needed
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {insights.absentCount > 0 && (
                <div className="p-3 rounded-2xl bg-red-50 border border-red-200 dark:bg-red-950/40 dark:border-red-900/50">
                  <p className="text-sm font-medium text-red-900 dark:text-red-300">{insights.absentCount} absent</p>
                  <p className="text-xs text-red-700 dark:text-red-400 mt-1">{insights.absentStudents.slice(0, 2).join(", ")}{insights.absentStudents.length > 2 ? "..." : ""}</p>
                </div>
              )}
              {insights.lateCount > 0 && (
                <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 dark:bg-amber-950/40 dark:border-amber-900/50">
                  <p className="text-sm font-medium text-amber-900 dark:text-amber-300">{insights.lateCount} late</p>
                  <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">{insights.lateStudents.slice(0, 2).join(", ")}{insights.lateStudents.length > 2 ? "..." : ""}</p>
                </div>
              )}
              {insights.absentCount === 0 && insights.lateCount === 0 && (
                <p className="text-sm text-muted-foreground dark:text-slate-400 text-center py-4">All on track!</p>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-3xl shadow-sm bg-gradient-to-br from-blue-50 to-blue-50/50 border-blue-100/50 dark:from-blue-950/40 dark:to-blue-950/20 dark:border-blue-900/50">
            <CardHeader>
              <CardTitle className="text-blue-900 dark:text-blue-300">Quick Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: "Marked Today", value: `${insights.presentCount + insights.absentCount + insights.lateCount}`, icon: CheckCircle2 },
                { label: "Pending", value: `${Math.max(0, classIds.length * 30 - (insights.presentCount + insights.absentCount + insights.lateCount + insights.excusedCount))}`, icon: Clock },
                { label: "Completion Rate", value: `${insights.totalRecords > 0 ? Math.round(((insights.presentCount + insights.absentCount + insights.lateCount + insights.excusedCount) / (classIds.length * 30 || 1)) * 100) : 0}%`, icon: TrendingUp },
              ].map(({ label, value, icon: Icon }) => (
                <div key={label} className="flex items-center justify-between p-2 rounded-xl bg-white/50 dark:bg-blue-950/30">
                  <div className="flex items-center gap-2">
                    <Icon className="size-4 text-blue-600 dark:text-blue-400" />
                    <span className="text-sm font-medium dark:text-blue-200">{label}</span>
                  </div>
                  <Badge className="text-sm dark:bg-blue-950/50 dark:border-blue-800 dark:text-blue-300">{value}</Badge>
                </div>
              ))}
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
            <DialogTitle className="dark:text-white">{selectedRecord?.studentName}</DialogTitle>
            <DialogDescription className="dark:text-slate-400">{selectedRecord?.className} · {selectedRecord?.admissionNumber}</DialogDescription>
          </DialogHeader>
          {selectedRecord && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground dark:text-slate-400">Date</p>
                  <p className="font-medium dark:text-white">{formatDate(selectedRecord.date)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground dark:text-slate-400">Status</p>
                  <Badge className={cn("text-xs font-semibold mt-1", getStatusColor(selectedRecord.status))}>
                    {selectedRecord.status.charAt(0).toUpperCase() + selectedRecord.status.slice(1)}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground dark:text-slate-400">Class</p>
                  <p className="font-medium dark:text-white">{selectedRecord.className}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground dark:text-slate-400">Admission No</p>
                  <p className="font-medium dark:text-white">{selectedRecord.admissionNumber}</p>
                </div>
              </div>

              {selectedRecord.remarks && (
                <div>
                  <p className="text-sm text-muted-foreground dark:text-slate-400">Remarks</p>
                  <p className="text-sm dark:text-white">{selectedRecord.remarks}</p>
                </div>
              )}

              <DialogFooter>
                <Button variant="outline" onClick={() => setDetailsDialogOpen(false)} className="dark:bg-slate-800 dark:border-slate-700 dark:hover:bg-slate-700 dark:text-white">
                  Close
                </Button>
                <Button
                  onClick={() => {
                    setEditingRecord(selectedRecord)
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
            <DialogTitle className="dark:text-white">Edit Attendance</DialogTitle>
            <DialogDescription className="dark:text-slate-400">Update attendance status and remarks</DialogDescription>
          </DialogHeader>
          {editingRecord && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground dark:text-slate-400">Student</p>
                  <p className="font-medium dark:text-white">{editingRecord.studentName}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground dark:text-slate-400">Class</p>
                  <p className="font-medium dark:text-white">{editingRecord.className}</p>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium dark:text-white">Status</label>
                <Select
                  value={editingRecord.status}
                  onValueChange={(status) =>
                    setEditingRecord({ ...editingRecord, status: status as any })
                  }
                >
                  <SelectTrigger className="mt-1 dark:bg-slate-800 dark:border-slate-700 dark:text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="dark:bg-slate-800 dark:border-slate-700">
                    <SelectItem value="present" className="dark:text-white">Present</SelectItem>
                    <SelectItem value="absent" className="dark:text-white">Absent</SelectItem>
                    <SelectItem value="late" className="dark:text-white">Late</SelectItem>
                    <SelectItem value="excused" className="dark:text-white">Excused</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium dark:text-white">Remarks</label>
                <Input
                  value={editingRecord.remarks || ""}
                  onChange={(e) =>
                    setEditingRecord({ ...editingRecord, remarks: e.target.value })
                  }
                  placeholder="Add any remarks..."
                  className="mt-1 dark:bg-slate-800 dark:border-slate-700 dark:text-white dark:placeholder:text-slate-500"
                />
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setEditDialogOpen(false)} className="dark:bg-slate-800 dark:border-slate-700 dark:hover:bg-slate-700 dark:text-white">
                  Cancel
                </Button>
                <Button onClick={saveAttendance} className="dark:bg-blue-600 dark:hover:bg-blue-700">
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
