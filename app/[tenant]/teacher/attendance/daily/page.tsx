"use client"

import { teacherDashboardApi } from "@/lib/teacher-api-client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  AlertCircle,
  BarChart3,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  Home,
  List,
  Plus,
  RefreshCcw,
  Search,
  TrendingUp,
  Users,
  ChevronLeft,
  ChevronRight,
  FileText,
  Eye,
  Settings,
  Zap,
  AlertTriangle,
} from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"

type Student = {
  id: string
  name: string
  admissionNumber: string
  classId: string
  className: string
}

type DailyAttendance = {
  studentId: string
  studentName: string
  admissionNumber: string
  classId: string
  className: string
  status: "present" | "absent" | "late" | "excused"
  marked: boolean
}

type DailyInsight = {
  totalStudents: number
  marked: number
  present: number
  absent: number
  late: number
  excused: number
  percentageMarked: number
  presentRate: number
  absentRate: number
}

const teacherHref = (path: string) => {
  const tenant = typeof window !== "undefined" ? window.location.pathname.split("/")[1] : ""
  return `/${tenant}${path}`
}

const formatDate = (date: Date) => {
  return date.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", year: "numeric" })
}

const getDailyInsights = (attendance: DailyAttendance[]): DailyInsight => {
  const marked = attendance.filter((a) => a.marked).length
  const present = attendance.filter((a) => a.status === "present").length
  const absent = attendance.filter((a) => a.status === "absent").length
  const late = attendance.filter((a) => a.status === "late").length
  const excused = attendance.filter((a) => a.status === "excused").length

  return {
    totalStudents: attendance.length,
    marked,
    present,
    absent,
    late,
    excused,
    percentageMarked: attendance.length > 0 ? Math.round((marked / attendance.length) * 100) : 0,
    presentRate: marked > 0 ? Math.round((present / marked) * 100) : 0,
    absentRate: marked > 0 ? Math.round((absent / marked) * 100) : 0,
  }
}

const getStatusColor = (status: string, isDark = false) => {
  const colors = {
    present: isDark ? "dark:bg-emerald-900/30 dark:text-emerald-400 bg-emerald-50 text-emerald-700" : "bg-emerald-50 text-emerald-700",
    absent: isDark ? "dark:bg-red-900/30 dark:text-red-400 bg-red-50 text-red-700" : "bg-red-50 text-red-700",
    late: isDark ? "dark:bg-amber-900/30 dark:text-amber-400 bg-amber-50 text-amber-700" : "bg-amber-50 text-amber-700",
    excused: isDark ? "dark:bg-blue-900/30 dark:text-blue-400 bg-blue-50 text-blue-700" : "bg-blue-50 text-blue-700",
  }
  return colors[status as keyof typeof colors] || "bg-gray-50 text-gray-700"
}

export default function DailyAttendanceTrackingPage() {
  const router = useRouter()
  const [tenant, setTenant] = React.useState("")
  const [attendance, setAttendance] = React.useState<DailyAttendance[]>([])
  const [classes, setClasses] = React.useState<string[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [currentDate, setCurrentDate] = React.useState(new Date())
  const [filterClass, setFilterClass] = React.useState("all")
  const [search, setSearch] = React.useState("")
  const [saving, setSaving] = React.useState(false)

  React.useEffect(() => {
    const tenantSlug = typeof window !== "undefined" ? window.location.pathname.split("/")[1] : ""
    setTenant(tenantSlug)
  }, [])

  React.useEffect(() => {
    if (!tenant) return

    const fetchData = async () => {
      try {
        setLoading(true)
        const res = await fetch(teacherDashboardApi("attendance/daily"))
        if (!res.ok) throw new Error(`API error: ${res.status}`)
        const data = await res.json()

        const learners = data.learners || []
        const dailyAttendance = learners.map((learner: Record<string, any>) => ({
          studentId: learner.id,
          studentName: learner.name,
          admissionNumber: learner.admissionNumber,
          classId: learner.classId,
          className: learner.className,
          status: "present" as const,
          marked: false,
        }))

        setAttendance(dailyAttendance)
        const uniqueClasses = [...new Set(dailyAttendance.map((a: Record<string, any>) => a.className))] as string[]
        setClasses(uniqueClasses)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load student data")
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [tenant])

  const filteredAttendance = React.useMemo(() => {
    return attendance
      .filter((a) => filterClass === "all" || a.className === filterClass)
      .filter((a) => !search || a.studentName.toLowerCase().includes(search.toLowerCase()) || a.admissionNumber.toLowerCase().includes(search.toLowerCase()))
  }, [attendance, filterClass, search])

  const insights = React.useMemo(() => getDailyInsights(filteredAttendance), [filteredAttendance])

  const updateAttendance = (studentId: string, status: "present" | "absent" | "late" | "excused") => {
    setAttendance(
      attendance.map((a) =>
        a.studentId === studentId
          ? { ...a, status, marked: true }
          : a
      )
    )
  }

  const markAllAsPresent = () => {
    setAttendance(
      attendance.map((a) =>
        filterClass === "all" || a.className === filterClass
          ? { ...a, status: "present" as const, marked: true }
          : a
      )
    )
    toast.success("All selected students marked as present")
  }

  const markAllAsAbsent = () => {
    setAttendance(
      attendance.map((a) =>
        filterClass === "all" || a.className === filterClass
          ? { ...a, status: "absent" as const, marked: true }
          : a
      )
    )
    toast.success("All selected students marked as absent")
  }

  const resetAttendance = () => {
    setAttendance(attendance.map((a) => ({ ...a, marked: false, status: "present" as const })))
    toast.info("Attendance reset")
  }

  const saveAttendance = async () => {
    if (filteredAttendance.filter((a) => a.marked).length === 0) {
      toast.error("No attendance records to save")
      return
    }

    setSaving(true)
    try {
      const res = await fetch(teacherDashboardApi("attendance/daily"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "attendance.mark-daily",
          date: currentDate.toISOString().split("T")[0],
          records: attendance.filter((a) => a.marked),
        }),
      })

      if (!res.ok) throw new Error("Failed to save attendance")

      toast.success(`${filteredAttendance.filter((a) => a.marked).length} attendance records saved`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save attendance")
    } finally {
      setSaving(false)
    }
  }

  const previousDay = () => {
    const newDate = new Date(currentDate)
    newDate.setDate(newDate.getDate() - 1)
    setCurrentDate(newDate)
  }

  const nextDay = () => {
    const newDate = new Date(currentDate)
    newDate.setDate(newDate.getDate() + 1)
    setCurrentDate(newDate)
  }

  const todayDate = () => {
    setCurrentDate(new Date())
  }

  if (loading) {
    return (
      <div className="w-full space-y-6 p-6 lg:p-8">
        <Skeleton className="h-48 rounded-3xl" />
        <Skeleton className="h-96 rounded-3xl" />
      </div>
    )
  }

  if (error && attendance.length === 0) {
    return (
      <div className="w-full p-6 lg:p-8">
        <Card className="rounded-3xl border-destructive/20 bg-destructive/5 shadow-sm dark:bg-destructive/10 dark:border-destructive/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="size-5" />
              Unable to Load Student Data
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
                <Badge variant="outline" className="bg-background/80 dark:bg-slate-800/80">
                  <Calendar className="mr-1 size-3.5" />
                  Teacher workspace
                </Badge>
                <Badge variant="outline" className="bg-background/80 dark:bg-slate-800/80">
                  Daily Tracking
                </Badge>
              </div>
              <div>
                <h1 className="text-3xl font-semibold tracking-tight md:text-4xl dark:text-white">Daily Attendance Tracking</h1>
                <p className="mt-2 text-muted-foreground dark:text-slate-400">Mark attendance for all your students in real-time with instant analytics</p>
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row xl:flex-col 2xl:flex-row">
              <Button variant="outline" onClick={() => window.location.reload()} className="dark:border-slate-700 dark:hover:bg-slate-800">
                <RefreshCcw className="size-4" />
                Refresh
              </Button>
              <Button onClick={saveAttendance} disabled={saving} className="dark:bg-emerald-600 dark:hover:bg-emerald-700">
                <CheckCircle2 className="size-4" />
                Save Attendance
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Date Navigation */}
      <Card className="rounded-3xl shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <CardContent className="p-6">
          <div className="flex items-center justify-between gap-4">
            <Button variant="outline" size="icon" onClick={previousDay} className="dark:border-slate-700 dark:hover:bg-slate-800">
              <ChevronLeft className="size-4" />
            </Button>
            <div className="text-center min-w-64">
              <p className="text-sm text-muted-foreground dark:text-slate-400">Date</p>
              <p className="text-lg font-semibold dark:text-white">{formatDate(currentDate)}</p>
            </div>
            <Button variant="outline" size="icon" onClick={nextDay} className="dark:border-slate-700 dark:hover:bg-slate-800">
              <ChevronRight className="size-4" />
            </Button>
            <Button variant="outline" onClick={todayDate} className="ml-auto dark:border-slate-700 dark:hover:bg-slate-800">
              Today
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Metric Cards */}
      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {[
          { label: "Total Students", value: insights.totalStudents, helper: "In selected class", icon: Users, color: "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400" },
          { label: "Marked", value: insights.marked, helper: "Attendance filled", icon: CheckCircle2, color: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400" },
          { label: "Present Rate", value: `${insights.presentRate}%`, helper: "Of marked students", icon: TrendingUp, color: "bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-400" },
          { label: "Absent", value: insights.absent, helper: "Students absent", icon: AlertTriangle, color: "bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400" },
          { label: "Progress", value: `${insights.percentageMarked}%`, helper: "Completion rate", icon: BarChart3, color: "bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-400" },
        ].map(({ label, value, helper, icon: Icon, color }, idx) => (
          <Card key={idx} className="rounded-3xl shadow-sm dark:border-slate-700 dark:bg-slate-900">
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

      {/* Filters and Actions */}
      <section className="space-y-4">
        <div className="flex flex-wrap gap-3">
          <Input
            placeholder="Search students..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs dark:bg-slate-800 dark:border-slate-700 dark:text-white"
          />
          <Select value={filterClass} onValueChange={setFilterClass}>
            <SelectTrigger className="w-[140px] dark:bg-slate-800 dark:border-slate-700">
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
          <div className="ml-auto flex gap-2">
            <Button onClick={markAllAsPresent} variant="outline" className="dark:border-slate-700 dark:hover:bg-slate-800">
              <Plus className="mr-2 size-4" />
              All Present
            </Button>
            <Button onClick={markAllAsAbsent} variant="outline" className="dark:border-slate-700 dark:hover:bg-slate-800">
              Mark Absent
            </Button>
            <Button onClick={resetAttendance} variant="outline" className="dark:border-slate-700 dark:hover:bg-slate-800">
              Reset
            </Button>
          </div>
        </div>
      </section>

      {/* Attendance List */}
      <Card className="rounded-3xl shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <CardHeader>
          <CardTitle className="dark:text-white">Student Attendance</CardTitle>
          <CardDescription className="dark:text-slate-400">{filteredAttendance.length} students</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 max-h-96 overflow-y-auto">
          {filteredAttendance.length === 0 ? (
            <p className="text-sm text-muted-foreground dark:text-slate-400 text-center py-8">No students match filters</p>
          ) : (
            filteredAttendance.map((student) => (
              <div
                key={student.studentId}
                className="flex items-center justify-between gap-4 rounded-2xl border p-4 hover:bg-muted/30 transition-colors dark:border-slate-700 dark:hover:bg-slate-800/50"
              >
                <div className="flex-1">
                  <p className="font-medium dark:text-white">{student.studentName}</p>
                  <p className="text-sm text-muted-foreground dark:text-slate-400">{student.className} · {student.admissionNumber}</p>
                </div>
                <div className="flex items-center gap-2">
                  {!student.marked ? (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateAttendance(student.studentId, "present")}
                        className="text-emerald-700 dark:text-emerald-400 dark:border-slate-700 dark:hover:bg-slate-800"
                      >
                        Present
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateAttendance(student.studentId, "absent")}
                        className="text-red-700 dark:text-red-400 dark:border-slate-700 dark:hover:bg-slate-800"
                      >
                        Absent
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateAttendance(student.studentId, "late")}
                        className="text-amber-700 dark:text-amber-400 dark:border-slate-700 dark:hover:bg-slate-800"
                      >
                        Late
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateAttendance(student.studentId, "excused")}
                        className="text-blue-700 dark:text-blue-400 dark:border-slate-700 dark:hover:bg-slate-800"
                      >
                        Excused
                      </Button>
                    </>
                  ) : (
                    <Badge className={cn("text-xs font-semibold", getStatusColor(student.status))}>
                      {student.status.charAt(0).toUpperCase() + student.status.slice(1)}
                    </Badge>
                  )}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Summary and Stats Cards */}
      <section className="grid gap-6 md:grid-cols-2">
        {/* Summary Card */}
        <Card className="rounded-3xl shadow-sm bg-gradient-to-br from-emerald-50 to-emerald-50/50 border-emerald-100/50 dark:from-emerald-950/30 dark:to-emerald-950/10 dark:border-emerald-900/30">
          <CardHeader>
            <CardTitle className="text-emerald-900 dark:text-emerald-400">Daily Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium dark:text-emerald-300">Marked</span>
                <span className="text-sm font-semibold dark:text-emerald-400">{insights.marked}/{insights.totalStudents}</span>
              </div>
              <Progress value={(insights.marked / insights.totalStudents) * 100} className="h-2" />
            </div>
            <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-emerald-200/50 dark:border-emerald-900/30">
              {[
                { label: "Present", value: insights.present, color: "text-emerald-700 dark:text-emerald-400" },
                { label: "Absent", value: insights.absent, color: "text-red-700 dark:text-red-400" },
                { label: "Late", value: insights.late, color: "text-amber-700 dark:text-amber-400" },
                { label: "Excused", value: insights.excused, color: "text-blue-700 dark:text-blue-400" },
              ].map(({ label, value, color }) => (
                <div key={label}>
                  <p className="text-xs text-muted-foreground dark:text-slate-500">{label}</p>
                  <p className={cn("text-lg font-semibold", color)}>{value}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Statistics Card */}
        <Card className="rounded-3xl shadow-sm bg-gradient-to-br from-blue-50 to-blue-50/50 border-blue-100/50 dark:from-blue-950/30 dark:to-blue-950/10 dark:border-blue-900/30">
          <CardHeader>
            <CardTitle className="text-blue-900 dark:text-blue-400 flex items-center gap-2">
              <BarChart3 className="size-5" />
              Quick Stats
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: "Completion", value: `${insights.percentageMarked}%`, subtext: "of attendance marked" },
              { label: "Attendance Rate", value: `${insights.presentRate}%`, subtext: "of marked students present" },
              { label: "Classes Tracked", value: classes.length, subtext: "total classes" },
              { label: "Remaining", value: insights.totalStudents - insights.marked, subtext: "students to mark" },
            ].map(({ label, value, subtext }) => (
              <div key={label} className="flex items-center justify-between p-3 rounded-2xl bg-white/50 dark:bg-blue-950/20">
                <div>
                  <p className="text-xs text-muted-foreground dark:text-slate-500">{label}</p>
                  <p className="text-sm font-semibold dark:text-blue-400">{subtext}</p>
                </div>
                <p className="text-xl font-bold text-blue-700 dark:text-blue-400">{value}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      {/* Back to Dashboard */}
      <div className="flex justify-center">
        <Button variant="outline" onClick={() => router.push(teacherHref("/teacher/dashboard"))} className="dark:border-slate-700 dark:hover:bg-slate-800">
          <Home className="mr-2 size-4" />
          Back to Dashboard
        </Button>
      </div>
    </div>
  )
}
