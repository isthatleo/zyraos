"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  AlertCircle,
  ArrowRight,
  Award,
  Bell,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  FileText,
  GraduationCap,
  MessageSquare,
  RefreshCcw,
  ShieldCheck,
  TrendingUp,
  Users,
  Wallet,
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
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { fetchParentDashboardJson } from "@/lib/parent-dashboard-fetch"
import { cn } from "@/lib/utils"

type ChildSummary = {
  id: string
  name: string
  email: string
  admissionNumber: string
  avatar?: string
  status: string
  className: string
  classGrade: string
  classSection: string
  classTeacher: string
  classTeacherId: string
  academicYear: string
  term: string
  guardian: { name: string; relation: string; phone: string; email: string }
  metrics: {
    averageScore: number
    grade: string
    attendanceRate: number
    absentDays: number
    lateDays: number
    billed: number
    paid: number
    outstanding: number
    financeAttention: number
    pendingAssessments: number
    upcomingExams: number
    lessons: number
    reports: number
  }
  recentGrades: Array<{ id: string; title: string; type: string; subject: string; subjectCode: string; teacher: string; percentage: number; grade: string; date: string | null }>
  attendance: Array<{ date: string | null; status: string; remarks: string }>
  assessments: Array<{ id: string; title: string; type: string; subject: string; dueDate: string | null; status: string; points: number }>
  exams: Array<{ id: string; title: string; type: string; date: string | null; time: string; room: string; status: string }>
  lessons: Array<{ id: string; day: string; period: string; startTime: string; endTime: string; subject: string; subjectCode: string; teacherId: string; teacher: string; room: string }>
  progressNotes: Array<{ id: string; type: string; value: number; note: string; category: string; positive: boolean; recordedBy: string; createdAt: string | null }>
  reportCards: Array<{ id: string; number: string; grade: string; percentage: number; gpa: number; rank: number; totalStudents: number; status: string; issuedDate: string | null; teacherComments: string; principalComments: string }>
}

type ParentDashboardPayload = {
  generatedAt: string
  currentUser?: { id: string; name: string; email: string; role: string; image?: string | null }
  school?: { id: string; name: string; slug: string; type: string; country?: string; currencyCode?: string; currencyName?: string }
  metrics?: {
    children: number
    averageScore: number
    attendanceRate: number
    outstandingBalance: number
    financeAttention: number
    pendingAssessments: number
    upcomingExams: number
    unreadMessages: number
    actionItems: number
  }
  children: ChildSummary[]
  actionItems: Array<{ id: string; type: string; title: string; helper: string; childId: string; href: string; severity: string }>
  announcements: Array<{ id: string; title: string; content: string; createdAt: string | null }>
}

const statusTone = {
  good: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300",
  warn: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300",
  danger: "border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300",
  info: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300",
}

function formatDate(value: string | null) {
  if (!value) return "Not dated"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Not dated"
  return new Intl.DateTimeFormat("en", { month: "short", day: "2-digit", year: "numeric" }).format(date)
}

function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "ST"
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

function ParentDashboardSkeleton() {
  return (
    <div className="w-full space-y-6 p-6 lg:p-8">
      <section className="rounded-3xl border bg-card p-6 shadow-sm md:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-4">
            <div className="flex gap-2">
              <Skeleton className="h-7 w-28 rounded-full" />
              <Skeleton className="h-7 w-36 rounded-full" />
            </div>
            <Skeleton className="h-10 w-72 max-w-full" />
            <Skeleton className="h-5 w-96 max-w-full" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-10 w-36" />
            <Skeleton className="h-10 w-40" />
          </div>
        </div>
      </section>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-32 rounded-2xl" />
        ))}
      </section>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <Skeleton className="h-48 rounded-2xl" />
          <Skeleton className="h-96 rounded-2xl" />
        </div>
        <div className="space-y-6">
          <Skeleton className="h-72 rounded-2xl" />
          <Skeleton className="h-72 rounded-2xl" />
        </div>
      </div>
    </div>
  )
}

export default function ParentDashboardPage() {
  const pathname = usePathname()
  const router = useRouter()
  const [payload, setPayload] = React.useState<ParentDashboardPayload | null>(null)
  const [selectedChildId, setSelectedChildId] = React.useState("")
  const [loading, setLoading] = React.useState(true)
  const [refreshing, setRefreshing] = React.useState(false)
  const [error, setError] = React.useState("")
  const [messageOpen, setMessageOpen] = React.useState(false)
  const [messageBody, setMessageBody] = React.useState("")
  const [noteOpen, setNoteOpen] = React.useState(false)
  const [noteBody, setNoteBody] = React.useState("")
  const [acting, setActing] = React.useState(false)
  const [activeTab, setActiveTab] = React.useState("overview")

  const tenantPrefix = React.useMemo(() => {
    const segments = (pathname ?? "").split("/").filter(Boolean)
    return segments[1] === "parent" ? `/${segments[0]}` : ""
  }, [pathname])

  const parentHref = React.useCallback((href: string) => `${tenantPrefix}${href}`, [tenantPrefix])

  const endpoint = React.useCallback(() => {
    const hostTenant = typeof window !== "undefined" ? window.location.hostname.split(".")[0] : ""
    const tenant = tenantPrefix ? tenantPrefix.slice(1) : hostTenant && !["localhost", "127", "www"].includes(hostTenant) ? hostTenant : ""
    return tenant ? `/api/tenant/parent/dashboard?tenant=${encodeURIComponent(tenant)}` : "/api/parent/dashboard"
  }, [tenantPrefix])

  const loadDashboard = React.useCallback(async (notify = false) => {
    setError("")
    setLoading(true)
    const result = await fetchParentDashboardJson<ParentDashboardPayload>(endpoint(), "Failed to load parent dashboard")
    if (result.error) {
      setError(result.error)
      setLoading(false)
      if (notify) toast.error(result.error)
      return
    }
    const data = result.data!
    setPayload(data)
    setSelectedChildId((current) => current || data.children[0]?.id || "")
    setLoading(false)
    if (notify) toast.success("Parent dashboard refreshed")
  }, [endpoint])

  React.useEffect(() => {
    void loadDashboard()
  }, [loadDashboard])

  const selectedChild = payload?.children.find((child) => child.id === selectedChildId) || payload?.children[0] || null
  const metrics = payload?.metrics
  const school = payload?.school
  const currency = school?.currencyCode || ""

  const refresh = () => {
    setRefreshing(true)
    void loadDashboard(true).finally(() => setRefreshing(false))
  }

  const runAction = async (body: Record<string, unknown>, success: string) => {
    setActing(true)
    const response = await fetch(endpoint(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).catch(() => null)
    setActing(false)
    if (!response?.ok) {
      const data = await response?.json().catch(() => ({}))
      toast.error(String(data?.error || "Parent dashboard action failed"))
      return false
    }
    toast.success(success)
    void loadDashboard()
    return true
  }

  const sendTeacherMessage = async () => {
    const message = messageBody.trim()
    if (!selectedChild) return
    if (!message) {
      toast.error("Message cannot be empty")
      return
    }
    const ok = await runAction({
      action: "teacher-message",
      childId: selectedChild.id,
      receiverId: selectedChild.classTeacherId,
      message,
    }, "Message sent to teacher")
    if (ok) {
      setMessageBody("")
      setMessageOpen(false)
    }
  }

  const submitGuardianNote = async () => {
    const message = noteBody.trim()
    if (!selectedChild) return
    if (!message) {
      toast.error("Note cannot be empty")
      return
    }
    const ok = await runAction({ action: "guardian-note", childId: selectedChild.id, message }, "Guardian note submitted")
    if (ok) {
      setNoteBody("")
      setNoteOpen(false)
    }
  }

  const exportSummary = () => {
    if (!payload) return
    const rows = [
      ["Parent", payload.currentUser?.name || ""],
      ["School", payload.school?.name || ""],
      ["Children", String(payload.children.length)],
      ["Average score", `${metrics?.averageScore ?? 0}%`],
      ["Attendance", `${metrics?.attendanceRate ?? 0}%`],
      ["Outstanding", `${currency} ${metrics?.outstandingBalance ?? 0}`],
      [],
      ["Child", "Class", "Average", "Attendance", "Outstanding", "Pending assessments", "Upcoming exams"],
      ...payload.children.map((child) => [
        child.name,
        child.className,
        `${child.metrics.averageScore}%`,
        `${child.metrics.attendanceRate}%`,
        `${currency} ${child.metrics.outstanding}`,
        String(child.metrics.pendingAssessments),
        String(child.metrics.upcomingExams),
      ]),
    ]
    const csv = rows.map((row) => row.map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`).join(",")).join("\n")
    downloadFile("parent-dashboard-summary.csv", csv, "text/csv;charset=utf-8")
    toast.success("Parent summary downloaded")
  }

  const openActionItem = (item: ParentDashboardPayload["actionItems"][number]) => {
    setSelectedChildId(item.childId)
    if (item.type === "finance") setActiveTab("finance")
    else if (item.type === "attendance") setActiveTab("attendance")
    else if (item.type === "assessment") setActiveTab("overview")
    else setActiveTab("overview")
  }

  if (loading && !payload) return <ParentDashboardSkeleton />

  if (error && !payload) {
    return (
      <div className="w-full p-6 lg:p-8">
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-3">
              <AlertCircle className="mt-0.5 size-5 text-destructive" />
              <div>
                <p className="font-medium text-destructive">Parent dashboard could not be loaded</p>
                <p className="text-sm text-muted-foreground">{error}</p>
              </div>
            </div>
            <Button type="button" variant="outline" onClick={() => void loadDashboard(true)}>Retry</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!payload?.currentUser?.id || !selectedChild) {
    return (
      <div className="w-full p-6 lg:p-8">
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium text-destructive">Linked parent profile is required</p>
              <p className="text-sm text-muted-foreground">This dashboard only renders for a signed-in parent or guardian with linked children.</p>
            </div>
            <Button type="button" variant="outline" onClick={() => router.refresh()}>Refresh session</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const financeClearRate = selectedChild.metrics.billed > 0
    ? Math.max(0, Math.min(100, Math.round((selectedChild.metrics.paid / selectedChild.metrics.billed) * 1000) / 10))
    : 100
  const childHealthScore = Math.round(
    (selectedChild.metrics.averageScore * 0.42)
    + (selectedChild.metrics.attendanceRate * 0.38)
    + (financeClearRate * 0.2)
  )
  const upcomingWork = payload.children
    .flatMap((child) => [
      ...child.assessments.map((item) => ({
        id: `assessment_${item.id}`,
        childId: child.id,
        childName: child.name,
        title: item.title,
        type: "Assessment",
        subject: item.subject,
        date: item.dueDate,
      })),
      ...child.exams.map((item) => ({
        id: `exam_${item.id}`,
        childId: child.id,
        childName: child.name,
        title: item.title,
        type: "Exam",
        subject: item.room,
        date: item.date,
      })),
    ])
    .toSorted((a, b) => {
      const left = a.date ? new Date(a.date).getTime() : Number.MAX_SAFE_INTEGER
      const right = b.date ? new Date(b.date).getTime() : Number.MAX_SAFE_INTEGER
      return left - right
    })
  const nextWork = upcomingWork[0]
  const familyTotals = payload.children.reduce(
    (totals, child) => ({
      lessons: totals.lessons + child.metrics.lessons,
      reports: totals.reports + child.metrics.reports,
      notes: totals.notes + child.progressNotes.length,
      grades: totals.grades + child.recentGrades.length,
      absences: totals.absences + child.metrics.absentDays,
      late: totals.late + child.metrics.lateDays,
      billed: totals.billed + child.metrics.billed,
      paid: totals.paid + child.metrics.paid,
    }),
    { lessons: 0, reports: 0, notes: 0, grades: 0, absences: 0, late: 0, billed: 0, paid: 0 }
  )
  const familyFinanceClearRate = familyTotals.billed > 0
    ? Math.round((familyTotals.paid / familyTotals.billed) * 1000) / 10
    : 100
  const atRiskChildren = payload.children.filter((child) => (
    child.metrics.attendanceRate > 0 && child.metrics.attendanceRate < 90
  ) || child.metrics.averageScore < 50 || child.metrics.financeAttention > 0)
  const topPerformer = payload.children.toSorted((a, b) => b.metrics.averageScore - a.metrics.averageScore)[0] || null
  const financeChildren = payload.children.filter((child) => child.metrics.outstanding > 0)
  const childrenWithTeacher = payload.children.filter((child) => child.classTeacherId).length
  const dashboardReadiness = Math.round((
    (payload.children.length ? 25 : 0)
    + (childrenWithTeacher === payload.children.length ? 20 : 0)
    + (familyTotals.lessons > 0 ? 20 : 0)
    + (metrics?.unreadMessages === 0 ? 10 : 0)
    + (familyFinanceClearRate >= 90 ? 25 : familyFinanceClearRate >= 60 ? 15 : 5)
  ))
  const latestGrade = payload.children
    .flatMap((child) => child.recentGrades.map((grade) => ({ ...grade, childName: child.name, childId: child.id })))
    .toSorted((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime())[0]
  const latestAttendance = payload.children
    .flatMap((child) => child.attendance.map((attendance) => ({ ...attendance, childName: child.name, childId: child.id })))
    .toSorted((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime())[0]
  const latestNote = payload.children
    .flatMap((child) => child.progressNotes.map((note) => ({ ...note, childName: child.name, childId: child.id })))
    .toSorted((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())[0]
  const nextLesson = payload.children
    .flatMap((child) => child.lessons.map((lesson) => ({ ...lesson, childName: child.name, childId: child.id })))
    [0]
  const latestAnnouncement = payload.announcements
    .toSorted((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())[0]
  const urgentSignals = [
    atRiskChildren.length ? `${atRiskChildren.length} child risk flag${atRiskChildren.length === 1 ? "" : "s"}` : "",
    financeChildren.length ? `${financeChildren.length} child balance${financeChildren.length === 1 ? "" : "s"} pending` : "",
    familyTotals.absences + familyTotals.late ? `${familyTotals.absences + familyTotals.late} attendance flag${familyTotals.absences + familyTotals.late === 1 ? "" : "s"}` : "",
    metrics?.unreadMessages ? `${metrics.unreadMessages} unread message${metrics.unreadMessages === 1 ? "" : "s"}` : "",
  ].filter(Boolean)
  const successPlan = [
    {
      title: "Academic follow-up",
      status: (metrics?.averageScore || 0) >= 70 ? "Healthy" : "Review",
      helper: (metrics?.averageScore || 0) >= 70 ? "Family average is on track." : "Review recent grades and upcoming work.",
      tone: (metrics?.averageScore || 0) >= 70 ? statusTone.good : statusTone.warn,
      tab: "academics",
    },
    {
      title: "Attendance discipline",
      status: (metrics?.attendanceRate || 0) >= 90 ? "Healthy" : "Review",
      helper: (metrics?.attendanceRate || 0) >= 90 ? "Attendance is meeting target." : "Review absences, late days, and class attendance.",
      tone: (metrics?.attendanceRate || 0) >= 90 ? statusTone.good : statusTone.warn,
      tab: "attendance",
    },
    {
      title: "Finance clearance",
      status: familyFinanceClearRate >= 90 ? "Healthy" : "Review",
      helper: familyFinanceClearRate >= 90 ? "Family fee clearance is strong." : "Review outstanding balances and invoice actions.",
      tone: familyFinanceClearRate >= 90 ? statusTone.good : statusTone.warn,
      tab: "finance",
    },
  ]
  const syncHealth = [
    { label: "Children", value: payload.children.length, ready: payload.children.length > 0 },
    { label: "Grades", value: familyTotals.grades, ready: familyTotals.grades > 0 },
    { label: "Attendance", value: payload.children.reduce((sum, child) => sum + child.attendance.length, 0), ready: payload.children.some((child) => child.attendance.length > 0) },
    { label: "Lessons", value: familyTotals.lessons, ready: familyTotals.lessons > 0 },
    { label: "Finance", value: payload.children.reduce((sum, child) => sum + child.metrics.billed, 0), ready: payload.children.some((child) => child.metrics.billed > 0) },
    { label: "Messages", value: metrics?.unreadMessages ?? 0, ready: true },
  ]
  const childSupportMatrix = payload.children.map((child) => {
    const clearance = child.metrics.billed > 0
      ? Math.max(0, Math.min(100, Math.round((child.metrics.paid / child.metrics.billed) * 1000) / 10))
      : 100
    const readiness = Math.round((child.metrics.averageScore * 0.4) + (child.metrics.attendanceRate * 0.4) + (clearance * 0.2))
    const focus = child.metrics.attendanceRate > 0 && child.metrics.attendanceRate < 90
      ? "Attendance follow-up"
      : child.metrics.outstanding > 0
        ? "Fee clearance"
        : child.metrics.averageScore > 0 && child.metrics.averageScore < 60
          ? "Academic support"
          : child.metrics.pendingAssessments > 0 || child.metrics.upcomingExams > 0
            ? "Upcoming work"
            : "Keep monitoring"
    const tab = focus === "Attendance follow-up" ? "attendance" : focus === "Fee clearance" ? "finance" : focus === "Academic support" ? "academics" : "overview"
    return { child, clearance, readiness, focus, tab }
  })
  const academicSupportChildren = childSupportMatrix.filter(({ child }) => (child.metrics.averageScore > 0 && child.metrics.averageScore < 60) || !child.recentGrades.length)
  const attendanceFollowUpChildren = childSupportMatrix.filter(({ child }) => child.metrics.attendanceRate > 0 && child.metrics.attendanceRate < 90)
  const financeFollowUpChildren = childSupportMatrix.filter(({ child }) => child.metrics.outstanding > 0)
  const teacherContactGaps = payload.children.length - childrenWithTeacher
  const familyNextBestActions = [
    academicSupportChildren.length ? {
      label: "Academic intervention",
      value: academicSupportChildren.length,
      helper: "Children with low or missing gradebook evidence",
      icon: GraduationCap,
      action: () => {
        setSelectedChildId(academicSupportChildren[0].child.id)
        setActiveTab("academics")
      },
    } : null,
    attendanceFollowUpChildren.length ? {
      label: "Attendance intervention",
      value: attendanceFollowUpChildren.length,
      helper: "Children below the 90% attendance target",
      icon: ShieldCheck,
      action: () => {
        setSelectedChildId(attendanceFollowUpChildren[0].child.id)
        setActiveTab("attendance")
      },
    } : null,
    financeFollowUpChildren.length ? {
      label: "Finance follow-up",
      value: financeFollowUpChildren.length,
      helper: `${currency} ${metrics?.outstandingBalance ?? 0} outstanding across linked children`,
      icon: Wallet,
      action: () => setActiveTab("finance"),
    } : null,
    teacherContactGaps ? {
      label: "Teacher assignment gap",
      value: teacherContactGaps,
      helper: "Linked children missing class-teacher contact data",
      icon: MessageSquare,
      action: () => router.push(parentHref("/parent/children")),
    } : null,
  ].filter((item): item is { label: string; value: number; helper: string; icon: typeof GraduationCap; action: () => void } => Boolean(item))
  const strongestChild = childSupportMatrix.toSorted((a, b) => b.readiness - a.readiness)[0]
  const focusChild = childSupportMatrix.toSorted((a, b) => a.readiness - b.readiness)[0]

  return (
    <div className="w-full space-y-6 p-6 lg:p-8">
      <section className="overflow-hidden rounded-3xl border bg-card shadow-sm">
        <div className="relative p-6 md:p-8">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(245,158,11,0.18),transparent_34%),linear-gradient(135deg,rgba(20,184,166,0.10),transparent_45%)]" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-3xl space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="bg-background/80">
                  <Users className="mr-1 size-3.5" />
                  {payload.children.length} linked child{payload.children.length === 1 ? "" : "ren"}
                </Badge>
                <Badge variant="outline" className="bg-background/80">{school?.name}</Badge>
                <Badge variant="outline" className="bg-background/80">{metrics?.unreadMessages ?? 0} unread messages</Badge>
              </div>
              <div>
                <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Parent Dashboard</h1>
                <p className="mt-2 text-muted-foreground">
                  Live academic, attendance, timetable, finance, and communication overview for {payload.currentUser?.name}.
                </p>
              </div>
              <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2 lg:grid-cols-4">
                <span>Selected child: <strong className="text-foreground">{selectedChild.name}</strong></span>
                <span>Class: <strong className="text-foreground">{selectedChild.className}</strong></span>
                <span>Teacher: <strong className="text-foreground">{selectedChild.classTeacher || "Not assigned"}</strong></span>
                <span>Term: <strong className="text-foreground">{selectedChild.term || "Current term"}</strong></span>
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row lg:flex-col xl:flex-row">
              <Select value={selectedChild.id} onValueChange={setSelectedChildId}>
                <SelectTrigger className="w-full bg-background/90 sm:w-56">
                  <SelectValue placeholder="Select child" />
                </SelectTrigger>
                <SelectContent>
                  {payload.children.map((child) => (
                    <SelectItem key={child.id} value={child.id}>{child.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button type="button" variant="outline" onClick={refresh} disabled={refreshing}>
                <RefreshCcw className={cn("size-4", refreshing && "animate-spin")} />
                Refresh
              </Button>
              <Button type="button" onClick={exportSummary}>
                <Download className="size-4" />
                Export
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="grid items-stretch gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Family Average", value: `${metrics?.averageScore ?? 0}%`, helper: "Across linked children", icon: TrendingUp, progress: metrics?.averageScore ?? 0 },
          { label: "Attendance", value: `${metrics?.attendanceRate ?? 0}%`, helper: "Recent attendance average", icon: ShieldCheck, progress: metrics?.attendanceRate ?? 0 },
          { label: "Outstanding", value: `${currency} ${metrics?.outstandingBalance ?? 0}`, helper: `${metrics?.financeAttention ?? 0} invoice items`, icon: Wallet },
          { label: "Action Items", value: metrics?.actionItems ?? 0, helper: `${metrics?.pendingAssessments ?? 0} assessments, ${metrics?.upcomingExams ?? 0} exams`, icon: Bell },
        ].map((card) => {
          const Icon = card.icon
          return (
            <Card key={card.label} className="group h-full overflow-hidden rounded-3xl border bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
              <CardContent className="relative flex h-full min-h-36 flex-col justify-between p-5">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(20,184,166,0.12),transparent_34%)] opacity-80" />
                <div className="relative flex items-start justify-between gap-3">
                  <div className="min-w-0 text-left">
                    <p className="text-sm font-medium text-muted-foreground">{card.label}</p>
                    <p className="mt-2 truncate text-2xl font-semibold tracking-tight">{card.value}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{card.helper}</p>
                  </div>
                  <div className="rounded-2xl bg-primary/10 p-3 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    <Icon className="size-5" />
                  </div>
                </div>
                {"progress" in card ? <Progress className="relative mt-4" value={Number(card.progress || 0)} /> : null}
              </CardContent>
            </Card>
          )
        })}
      </section>

      <section className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
        {[
          {
            label: "Family Risk",
            value: atRiskChildren.length,
            helper: atRiskChildren.length ? "Children needing attendance, finance, or academic follow-up" : "No immediate child risk flags",
            icon: AlertCircle,
            tone: atRiskChildren.length ? statusTone.warn : statusTone.good,
            href: "/parent/children",
          },
          {
            label: "Top Performer",
            value: topPerformer?.name || "No scores",
            helper: topPerformer ? `${topPerformer.metrics.averageScore}% average in ${topPerformer.className}` : "Waiting for gradebook records",
            icon: Award,
            tone: statusTone.good,
            href: "/parent/children",
          },
          {
            label: "Attendance Flags",
            value: familyTotals.absences + familyTotals.late,
            helper: `${familyTotals.absences} absences and ${familyTotals.late} late records across linked children`,
            icon: ShieldCheck,
            tone: familyTotals.absences + familyTotals.late ? statusTone.warn : statusTone.good,
            href: "/parent/attendance",
          },
          {
            label: "Finance Clearance",
            value: `${familyFinanceClearRate}%`,
            helper: financeChildren.length ? `${financeChildren.length} child balance${financeChildren.length === 1 ? "" : "s"} still pending` : "No outstanding balances detected",
            icon: Wallet,
            tone: familyFinanceClearRate >= 90 ? statusTone.good : familyFinanceClearRate >= 60 ? statusTone.warn : statusTone.danger,
            href: "/parent/finance",
          },
        ].map((card) => {
          const Icon = card.icon
          return (
            <Card key={card.label} className="overflow-hidden rounded-3xl shadow-sm">
              <CardContent className="flex min-h-32 items-start justify-between gap-4 p-5">
                <div className="min-w-0">
                  <p className="text-sm text-muted-foreground">{card.label}</p>
                  <p className="mt-2 truncate text-2xl font-semibold">{card.value}</p>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{card.helper}</p>
                </div>
                <Link href={parentHref(card.href)} className={cn("rounded-2xl border p-3 transition-colors hover:bg-muted/50", card.tone)} aria-label={`Open ${card.label}`}>
                  <Icon className="size-5" />
                </Link>
              </CardContent>
            </Card>
          )
        })}
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <Card className="overflow-hidden rounded-3xl shadow-sm">
          <CardHeader>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle>Parent Operating Brief</CardTitle>
                <CardDescription>Priority signals from academics, attendance, finance, timetable, and communications.</CardDescription>
              </div>
              <Badge variant="outline" className={dashboardReadiness >= 80 ? statusTone.good : dashboardReadiness >= 60 ? statusTone.warn : statusTone.danger}>
                {dashboardReadiness}% ready
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {[
              { label: "Next priority", value: nextWork ? nextWork.title : "No upcoming work", helper: nextWork ? `${nextWork.childName} - ${formatDate(nextWork.date)}` : "Published assessments and exams are clear", href: "/parent/children", icon: Calendar },
              { label: "Teacher coverage", value: `${childrenWithTeacher}/${payload.children.length}`, helper: "Linked children with assigned class teachers", href: "/parent/messages", icon: MessageSquare },
              { label: "Learning footprint", value: familyTotals.lessons, helper: `${familyTotals.grades} grades, ${familyTotals.reports} reports, ${familyTotals.notes} notes`, href: "/parent/children", icon: BookOpen },
              { label: "Unread messages", value: metrics?.unreadMessages ?? 0, helper: "Open parent inbox for school communication", href: "/parent/messages", icon: Bell },
            ].map((item) => {
              const Icon = item.icon
              return (
                <Link key={item.label} href={parentHref(item.href)} className="rounded-2xl border bg-background/60 p-4 transition-colors hover:bg-muted/50">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">{item.label}</p>
                      <p className="mt-1 truncate text-lg font-semibold">{item.value}</p>
                    </div>
                    <div className="rounded-xl bg-primary/10 p-2 text-primary">
                      <Icon className="size-4" />
                    </div>
                  </div>
                  <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{item.helper}</p>
                </Link>
              )
            })}
          </CardContent>
        </Card>

        <Card className="rounded-3xl shadow-sm">
          <CardHeader>
            <CardTitle>Quick Navigation</CardTitle>
            <CardDescription>Open fully implemented parent dashboard pages.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            {[
              { label: "Children", helper: "Profiles, academics, finance, notes", href: "/parent/children", icon: Users },
              { label: "Attendance", helper: "Risk flags and attendance records", href: "/parent/attendance", icon: ShieldCheck },
              { label: "Fees", helper: "Invoices, payments, receipts, ledger", href: "/parent/finance", icon: Wallet },
              { label: "Messages", helper: "Parent inbox and teacher chat", href: "/parent/messages", icon: MessageSquare },
            ].map((item) => {
              const Icon = item.icon
              return (
                <Button key={item.label} type="button" variant="outline" className="h-auto justify-start rounded-2xl p-4 text-left" asChild>
                  <Link href={parentHref(item.href)}>
                    <Icon className="size-4 shrink-0" />
                    <span className="min-w-0">
                      <span className="block font-medium">{item.label}</span>
                      <span className="block truncate text-xs font-normal text-muted-foreground">{item.helper}</span>
                    </span>
                  </Link>
                </Button>
              )
            })}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_420px]">
        <Card className="overflow-hidden rounded-3xl shadow-sm">
          <CardHeader>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle>Family Activity Timeline</CardTitle>
                <CardDescription>Latest cross-child signals from grades, attendance, notes, announcements, timetable, and finance.</CardDescription>
              </div>
              <Badge variant="outline" className="w-fit">{formatDate(payload.generatedAt)}</Badge>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {[
              {
                label: "Latest Grade",
                value: latestGrade ? `${latestGrade.percentage}%` : "No grades",
                helper: latestGrade ? `${latestGrade.childName} - ${latestGrade.subject} - ${latestGrade.title}` : "No gradebook records published yet",
                icon: GraduationCap,
                childId: latestGrade?.childId,
                tab: "academics",
              },
              {
                label: "Latest Attendance",
                value: latestAttendance?.status || "No records",
                helper: latestAttendance ? `${latestAttendance.childName} - ${formatDate(latestAttendance.date)}${latestAttendance.remarks ? ` - ${latestAttendance.remarks}` : ""}` : "No attendance records available yet",
                icon: ShieldCheck,
                childId: latestAttendance?.childId,
                tab: "attendance",
              },
              {
                label: "Latest Note",
                value: latestNote?.category || latestNote?.type || "No notes",
                helper: latestNote ? `${latestNote.childName} - ${latestNote.note || "Progress update recorded"}` : "No teacher or guardian notes available yet",
                icon: FileText,
                childId: latestNote?.childId,
                tab: "finance",
              },
              {
                label: "Next Lesson",
                value: nextLesson?.subjectCode || nextLesson?.subject || "No lesson",
                helper: nextLesson ? `${nextLesson.childName} - ${nextLesson.day} - ${nextLesson.startTime || `Period ${nextLesson.period}`}` : "No published timetable lesson available",
                icon: Clock,
                childId: nextLesson?.childId,
                tab: "schedule",
              },
              {
                label: "Latest Notice",
                value: latestAnnouncement?.title || "No notice",
                helper: latestAnnouncement ? `${formatDate(latestAnnouncement.createdAt)} - ${latestAnnouncement.content}` : "No current school announcements",
                icon: Bell,
                tab: "overview",
              },
              {
                label: "Finance Watch",
                value: financeChildren.length ? `${currency} ${metrics?.outstandingBalance ?? 0}` : "Clear",
                helper: financeChildren.length ? `${financeChildren.map((child) => child.name).slice(0, 3).join(", ")}${financeChildren.length > 3 ? " and more" : ""}` : "No outstanding linked-child balances detected",
                icon: Wallet,
                tab: "finance",
              },
            ].map((item) => {
              const Icon = item.icon
              return (
                <button
                  key={item.label}
                  type="button"
                  className="min-h-32 rounded-2xl border bg-background/60 p-4 text-left transition-colors hover:bg-muted/50"
                  onClick={() => {
                    if (item.childId) setSelectedChildId(item.childId)
                    setActiveTab(item.tab)
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">{item.label}</p>
                      <p className="mt-1 truncate text-lg font-semibold">{item.value}</p>
                    </div>
                    <div className="rounded-xl bg-primary/10 p-2 text-primary">
                      <Icon className="size-4" />
                    </div>
                  </div>
                  <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{item.helper}</p>
                </button>
              )
            })}
          </CardContent>
        </Card>

        <Card className="rounded-3xl shadow-sm">
          <CardHeader>
            <CardTitle>Parent Watchlist</CardTitle>
            <CardDescription>Immediate signals that need parent review.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {urgentSignals.map((signal) => (
              <div key={signal} className="flex items-center justify-between rounded-2xl border p-3 text-sm">
                <span>{signal}</span>
                <Badge variant="outline" className={statusTone.warn}>Review</Badge>
              </div>
            ))}
            {!urgentSignals.length ? (
              <div className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">
                No urgent parent watchlist items right now.
              </div>
            ) : null}
            <div className="grid gap-2 sm:grid-cols-2 2xl:grid-cols-1">
              <Button type="button" variant="outline" className="justify-start" asChild>
                <Link href={parentHref("/parent/attendance")}>
                  <ShieldCheck className="size-4" />
                  Review attendance
                </Link>
              </Button>
              <Button type="button" variant="outline" className="justify-start" asChild>
                <Link href={parentHref("/parent/finance")}>
                  <Wallet className="size-4" />
                  Review fees
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <Card className="rounded-3xl shadow-sm">
          <CardHeader>
            <CardTitle>Family Success Plan</CardTitle>
            <CardDescription>Actionable parent plan generated from current academics, attendance, and finance signals.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3">
            {successPlan.map((item) => (
              <button
                key={item.title}
                type="button"
                className="rounded-2xl border p-4 text-left transition-colors hover:bg-muted/50"
                onClick={() => setActiveTab(item.tab)}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium">{item.title}</p>
                  <Badge variant="outline" className={item.tone}>{item.status}</Badge>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{item.helper}</p>
              </button>
            ))}
          </CardContent>
        </Card>

        <Card className="rounded-3xl shadow-sm">
          <CardHeader>
            <CardTitle>Data Sync Health</CardTitle>
            <CardDescription>What this dashboard is currently receiving from tenant systems.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            {syncHealth.map((item) => (
              <div key={item.label} className="rounded-2xl border p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm text-muted-foreground">{item.label}</p>
                  <Badge variant="outline" className={item.ready ? statusTone.good : statusTone.warn}>{item.ready ? "Synced" : "No data"}</Badge>
                </div>
                <p className="mt-2 text-xl font-semibold">{item.value}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <Card className="rounded-3xl shadow-sm">
          <CardHeader>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle>Parent Accountability Board</CardTitle>
                <CardDescription>Next best actions generated from linked-child gradebook, attendance, finance, and teacher-contact data.</CardDescription>
              </div>
              <Badge variant="outline" className={familyNextBestActions.length ? statusTone.warn : statusTone.good}>
                {familyNextBestActions.length ? `${familyNextBestActions.length} action area${familyNextBestActions.length === 1 ? "" : "s"}` : "All clear"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {[
              {
                label: "Academic support",
                value: academicSupportChildren.length,
                helper: academicSupportChildren.length ? "Low or missing recent gradebook evidence" : "Gradebook signals are stable",
                icon: GraduationCap,
                tone: academicSupportChildren.length ? statusTone.warn : statusTone.good,
                action: () => {
                  if (academicSupportChildren[0]) setSelectedChildId(academicSupportChildren[0].child.id)
                  setActiveTab("academics")
                },
              },
              {
                label: "Attendance support",
                value: attendanceFollowUpChildren.length,
                helper: attendanceFollowUpChildren.length ? "Children below attendance target" : "Attendance target is currently protected",
                icon: ShieldCheck,
                tone: attendanceFollowUpChildren.length ? statusTone.warn : statusTone.good,
                action: () => {
                  if (attendanceFollowUpChildren[0]) setSelectedChildId(attendanceFollowUpChildren[0].child.id)
                  setActiveTab("attendance")
                },
              },
              {
                label: "Finance follow-up",
                value: `${currency} ${metrics?.outstandingBalance ?? 0}`,
                helper: financeFollowUpChildren.length ? `${financeFollowUpChildren.length} linked child balance${financeFollowUpChildren.length === 1 ? "" : "s"}` : "No outstanding balance detected",
                icon: Wallet,
                tone: financeFollowUpChildren.length ? statusTone.warn : statusTone.good,
                action: () => setActiveTab("finance"),
              },
              {
                label: "Teacher coverage",
                value: `${childrenWithTeacher}/${payload.children.length}`,
                helper: teacherContactGaps ? "Some children need assigned teacher contact data" : "Teacher communication path is ready",
                icon: MessageSquare,
                tone: teacherContactGaps ? statusTone.warn : statusTone.good,
                action: () => router.push(parentHref("/parent/messages")),
              },
            ].map((item) => {
              const Icon = item.icon
              return (
                <button
                  key={item.label}
                  type="button"
                  className="min-h-32 rounded-2xl border bg-background/60 p-4 text-left transition-colors hover:bg-muted/50"
                  onClick={item.action}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">{item.label}</p>
                      <p className="mt-1 truncate text-xl font-semibold">{item.value}</p>
                    </div>
                    <div className={cn("rounded-xl border p-2", item.tone)}>
                      <Icon className="size-4" />
                    </div>
                  </div>
                  <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{item.helper}</p>
                </button>
              )
            })}
          </CardContent>
        </Card>

        <Card className="rounded-3xl shadow-sm">
          <CardHeader>
            <CardTitle>Family Highlights</CardTitle>
            <CardDescription>Strongest and highest-priority child signals.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <button
              type="button"
              className="w-full rounded-2xl border p-4 text-left transition-colors hover:bg-muted/50"
              onClick={() => {
                if (focusChild) setSelectedChildId(focusChild.child.id)
                if (focusChild) setActiveTab(focusChild.tab)
              }}
            >
              <p className="text-xs text-muted-foreground">Needs attention</p>
              <p className="mt-1 font-semibold">{focusChild?.child.name || "No child selected"}</p>
              <p className="mt-1 text-sm text-muted-foreground">{focusChild ? `${focusChild.focus} - ${focusChild.readiness}% readiness` : "No linked child data available"}</p>
            </button>
            <button
              type="button"
              className="w-full rounded-2xl border p-4 text-left transition-colors hover:bg-muted/50"
              onClick={() => {
                if (strongestChild) setSelectedChildId(strongestChild.child.id)
                if (strongestChild) setActiveTab("overview")
              }}
            >
              <p className="text-xs text-muted-foreground">Strongest signal</p>
              <p className="mt-1 font-semibold">{strongestChild?.child.name || "No child selected"}</p>
              <p className="mt-1 text-sm text-muted-foreground">{strongestChild ? `${strongestChild.readiness}% readiness across academics, attendance, and finance` : "No linked child data available"}</p>
            </button>
          </CardContent>
        </Card>
      </section>

      <section>
        <Card className="rounded-3xl shadow-sm">
          <CardHeader>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle>Child Support Matrix</CardTitle>
                <CardDescription>Per-child readiness, next focus, teacher coverage, and actionable navigation.</CardDescription>
              </div>
              <Button type="button" variant="outline" asChild>
                <Link href={parentHref("/parent/children")}>
                  Open children page
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {childSupportMatrix.map(({ child, clearance, readiness, focus, tab }) => (
              <button
                key={child.id}
                type="button"
                className={cn("rounded-2xl border p-4 text-left transition-colors hover:bg-muted/50", child.id === selectedChild.id && "border-primary bg-primary/5")}
                onClick={() => {
                  setSelectedChildId(child.id)
                  setActiveTab(tab)
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{child.name}</p>
                    <p className="truncate text-sm text-muted-foreground">{child.className} - {child.classTeacher || "Teacher not assigned"}</p>
                  </div>
                  <Badge variant="outline" className={readiness >= 80 ? statusTone.good : readiness >= 60 ? statusTone.warn : statusTone.danger}>
                    {readiness}%
                  </Badge>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Average</p>
                    <p className="font-semibold">{child.metrics.averageScore}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Attendance</p>
                    <p className="font-semibold">{child.metrics.attendanceRate}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Clearance</p>
                    <p className="font-semibold">{clearance}%</p>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-muted/40 p-3">
                  <p className="text-xs text-muted-foreground">{focus}</p>
                  <ArrowRight className="size-4 text-muted-foreground" />
                </div>
              </button>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <Card className="overflow-hidden rounded-3xl shadow-sm">
          <CardHeader>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle>Family Command Center</CardTitle>
                <CardDescription>Cross-child operational view from the tenant academic, finance, timetable, and messaging data.</CardDescription>
              </div>
              <Badge variant="outline" className="w-fit">{school?.slug || "tenant"} synced</Badge>
            </div>
          </CardHeader>
          <CardContent className="grid items-stretch gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {[
              { label: "Next Work", value: nextWork ? nextWork.title : "Clear", helper: nextWork ? `${nextWork.childName} - ${nextWork.type} - ${formatDate(nextWork.date)}` : "No published upcoming work", icon: Calendar, tab: "overview" },
              { label: "Published Lessons", value: familyTotals.lessons, helper: "Timetable lessons linked to children", icon: Clock, tab: "schedule" },
              { label: "Recent Grades", value: familyTotals.grades, helper: "Latest gradebook records loaded", icon: GraduationCap, tab: "academics" },
              { label: "Report Cards", value: familyTotals.reports, helper: "Issued report cards available", icon: FileText, tab: "academics" },
              { label: "Progress Notes", value: familyTotals.notes, helper: "Teacher and guardian timeline notes", icon: Award, tab: "finance" },
              { label: "Teacher Contact", value: selectedChild.classTeacherId ? "Ready" : "Missing", helper: selectedChild.classTeacher || "Class teacher not assigned", icon: MessageSquare, tab: "overview" },
            ].map((item) => {
              const Icon = item.icon
              return (
                <button
                  key={item.label}
                  type="button"
                  className="min-h-28 rounded-2xl border bg-background/60 p-4 text-left transition-colors hover:bg-muted/50"
                  onClick={() => setActiveTab(item.tab)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground">{item.label}</p>
                      <p className="mt-1 line-clamp-1 text-lg font-semibold">{item.value}</p>
                    </div>
                    <div className="rounded-xl bg-primary/10 p-2 text-primary">
                      <Icon className="size-4" />
                    </div>
                  </div>
                  <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{item.helper}</p>
                </button>
              )
            })}
          </CardContent>
        </Card>

        <Card className="rounded-3xl shadow-sm">
          <CardHeader>
            <CardTitle>{selectedChild.name} Snapshot</CardTitle>
            <CardDescription>Weighted readiness across academics, attendance, and finance.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl border bg-muted/30 p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Overall readiness</p>
                <Badge variant="outline" className={childHealthScore >= 80 ? statusTone.good : childHealthScore >= 60 ? statusTone.warn : statusTone.danger}>
                  {childHealthScore}%
                </Badge>
              </div>
              <Progress className="mt-3" value={childHealthScore} />
            </div>
            {[
              { label: "Academic average", value: selectedChild.metrics.averageScore },
              { label: "Attendance rate", value: selectedChild.metrics.attendanceRate },
              { label: "Finance clearance", value: financeClearRate },
            ].map((item) => (
              <div key={item.label}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span>{item.label}</span>
                  <span>{item.value}%</span>
                </div>
                <Progress value={item.value} />
              </div>
            ))}
            <div className="grid gap-2 sm:grid-cols-2">
              <Button type="button" variant="outline" onClick={() => setMessageOpen(true)}>
                <MessageSquare className="size-4" />
                Message teacher
              </Button>
              <Button type="button" variant="outline" onClick={() => setNoteOpen(true)}>
                <FileText className="size-4" />
                Add note
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Children Overview</CardTitle>
              <CardDescription>Live guardian-linked student records from the tenant database.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              {payload.children.map((child) => (
                <button
                  key={child.id}
                  type="button"
                  className={cn("rounded-2xl border p-4 text-left transition-colors hover:bg-muted/50", child.id === selectedChild.id && "border-primary bg-primary/5")}
                  onClick={() => setSelectedChildId(child.id)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 font-semibold text-primary">
                        {initials(child.name)}
                      </div>
                      <div>
                        <p className="font-medium">{child.name}</p>
                        <p className="text-sm text-muted-foreground">{child.className}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className={child.metrics.averageScore >= 70 ? statusTone.good : child.metrics.averageScore >= 50 ? statusTone.warn : statusTone.danger}>
                      {child.metrics.grade}
                    </Badge>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div>
                      <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                        <span>Average</span>
                        <span>{child.metrics.averageScore}%</span>
                      </div>
                      <Progress value={child.metrics.averageScore} />
                    </div>
                    <div>
                      <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                        <span>Attendance</span>
                        <span>{child.metrics.attendanceRate}%</span>
                      </div>
                      <Progress value={child.metrics.attendanceRate} />
                    </div>
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="grid w-full grid-cols-2 md:grid-cols-5">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="academics">Academics</TabsTrigger>
              <TabsTrigger value="attendance">Attendance</TabsTrigger>
              <TabsTrigger value="schedule">Schedule</TabsTrigger>
              <TabsTrigger value="finance">Finance</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><FileText className="size-5" />Upcoming Work</CardTitle>
                  <CardDescription>Assessments and exams for {selectedChild.name}.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[...selectedChild.assessments.map((item) => ({ ...item, kind: "Assessment" })), ...selectedChild.exams.map((item) => ({ ...item, dueDate: item.date, subject: item.room, kind: "Exam" }))].slice(0, 6).map((item) => (
                    <div key={`${item.kind}_${item.id}`} className="rounded-2xl border p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium">{item.title}</p>
                          <p className="text-xs text-muted-foreground">{item.subject} - {formatDate(item.dueDate)}</p>
                        </div>
                        <Badge variant="outline">{item.kind}</Badge>
                      </div>
                    </div>
                  ))}
                  {!selectedChild.assessments.length && !selectedChild.exams.length ? <p className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">No upcoming assessments or exams are currently published.</p> : null}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><MessageSquare className="size-5" />Teacher & Guardian Actions</CardTitle>
                  <CardDescription>Functional parent actions for the selected child.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3">
                  <Button type="button" className="justify-start" onClick={() => setMessageOpen(true)}>
                    <MessageSquare className="size-4" />
                    Message {selectedChild.classTeacher || "teacher"}
                  </Button>
                  <Button type="button" variant="outline" className="justify-start" onClick={() => setNoteOpen(true)}>
                    <FileText className="size-4" />
                    Add guardian note
                  </Button>
                  <Button type="button" variant="outline" className="justify-start" asChild>
                    <Link href={parentHref("/parent/messages")}>
                      <ArrowRight className="size-4" />
                      Open messages
                    </Link>
                  </Button>
                  <Button type="button" variant="outline" className="justify-start" asChild>
                    <Link href={parentHref("/parent/notifications")}>
                      <Bell className="size-4" />
                      Open notifications
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="academics" className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Grades</CardTitle>
                  <CardDescription>Latest published gradebook records.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {selectedChild.recentGrades.map((grade) => (
                    <div key={grade.id} className="flex items-center justify-between rounded-2xl border p-3">
                      <div>
                        <p className="text-sm font-medium">{grade.title}</p>
                        <p className="text-xs text-muted-foreground">{grade.subject} - {grade.teacher}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{grade.percentage}%</p>
                        <Badge variant="outline">{grade.grade}</Badge>
                      </div>
                    </div>
                  ))}
                  {!selectedChild.recentGrades.length ? <p className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">No grades have been published yet.</p> : null}
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Report Cards</CardTitle>
                  <CardDescription>Issued report cards and teacher comments.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {selectedChild.reportCards.map((report) => (
                    <div key={report.id} className="rounded-2xl border p-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-medium">{report.number}</p>
                        <Badge variant="outline">{report.status}</Badge>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{formatDate(report.issuedDate)} - {report.percentage}% - GPA {report.gpa}</p>
                      {report.teacherComments ? <p className="mt-2 text-sm">{report.teacherComments}</p> : null}
                    </div>
                  ))}
                  {!selectedChild.reportCards.length ? <p className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">No report cards are issued yet.</p> : null}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="attendance" className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Attendance Summary</CardTitle>
                  <CardDescription>Recent attendance records and risk indicators.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="mb-1 flex justify-between text-sm">
                      <span>Attendance rate</span>
                      <span>{selectedChild.metrics.attendanceRate}%</span>
                    </div>
                    <Progress value={selectedChild.metrics.attendanceRate} />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border p-4"><p className="text-sm text-muted-foreground">Absences</p><p className="text-2xl font-semibold">{selectedChild.metrics.absentDays}</p></div>
                    <div className="rounded-2xl border p-4"><p className="text-sm text-muted-foreground">Late days</p><p className="text-2xl font-semibold">{selectedChild.metrics.lateDays}</p></div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Recent Attendance</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {selectedChild.attendance.map((item) => (
                    <div key={`${item.date}_${item.status}`} className="flex items-center justify-between rounded-2xl border p-3">
                      <div>
                        <p className="text-sm font-medium">{formatDate(item.date)}</p>
                        <p className="text-xs text-muted-foreground">{item.remarks || "No remarks"}</p>
                      </div>
                      <Badge variant="outline" className={item.status.toLowerCase() === "absent" ? statusTone.danger : statusTone.good}>{item.status || "Recorded"}</Badge>
                    </div>
                  ))}
                  {!selectedChild.attendance.length ? <p className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">No attendance records available yet.</p> : null}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="schedule">
              <Card>
                <CardHeader>
                  <CardTitle>Lessons & Timetable</CardTitle>
                  <CardDescription>Published lessons from the school timetable.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3 md:grid-cols-2">
                  {selectedChild.lessons.map((lesson) => (
                    <div key={lesson.id} className="rounded-2xl border p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium">{lesson.subjectCode || lesson.subject}</p>
                          <p className="text-sm text-muted-foreground">{lesson.day} - {lesson.startTime || `Period ${lesson.period}`} {lesson.endTime ? `to ${lesson.endTime}` : ""}</p>
                          <p className="text-xs text-muted-foreground">{lesson.teacher} - {lesson.room}</p>
                        </div>
                        <Clock className="size-4 text-muted-foreground" />
                      </div>
                    </div>
                  ))}
                  {!selectedChild.lessons.length ? <p className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground md:col-span-2">No published timetable lessons are linked to this child yet.</p> : null}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="finance" className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Finance Summary</CardTitle>
                  <CardDescription>Billing status for {selectedChild.name}.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl border p-4"><p className="text-xs text-muted-foreground">Billed</p><p className="text-lg font-semibold">{currency} {selectedChild.metrics.billed}</p></div>
                    <div className="rounded-2xl border p-4"><p className="text-xs text-muted-foreground">Paid</p><p className="text-lg font-semibold">{currency} {selectedChild.metrics.paid}</p></div>
                    <div className="rounded-2xl border p-4"><p className="text-xs text-muted-foreground">Outstanding</p><p className="text-lg font-semibold">{currency} {selectedChild.metrics.outstanding}</p></div>
                  </div>
                  <Button type="button" variant="outline" onClick={() => setActiveTab("finance")}>
                      <Wallet className="size-4" />
                      Review finance action items
                  </Button>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Progress Notes</CardTitle>
                  <CardDescription>Latest teacher and school updates.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {selectedChild.progressNotes.slice(0, 5).map((note) => (
                    <div key={note.id} className="rounded-2xl border p-3">
                      <Badge variant="outline" className={note.positive ? statusTone.good : statusTone.warn}>{note.category || note.type || "Progress"}</Badge>
                      <p className="mt-2 text-sm">{note.note || "Progress update recorded."}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{note.recordedBy || "School staff"} - {formatDate(note.createdAt)}</p>
                    </div>
                  ))}
                  {!selectedChild.progressNotes.length ? <p className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">No progress notes available yet.</p> : null}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <aside className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Bell className="size-5" />Action Center</CardTitle>
              <CardDescription>Items needing parent attention.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {payload.actionItems.map((item) => (
                <button key={item.id} type="button" onClick={() => openActionItem(item)} className="block w-full rounded-2xl border p-3 text-left transition-colors hover:bg-muted/50">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">{item.title}</p>
                      <p className="text-xs text-muted-foreground">{item.helper}</p>
                    </div>
                    <ArrowRight className="size-4 text-muted-foreground" />
                  </div>
                </button>
              ))}
              {!payload.actionItems.length ? <p className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">No urgent parent action items right now.</p> : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><BookOpen className="size-5" />Readiness</CardTitle>
              <CardDescription>Production-critical parent dashboard checks.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: "Parent session loaded", ready: Boolean(payload.currentUser?.id) },
                { label: "Children linked", ready: payload.children.length > 0 },
                { label: "Teacher contact available", ready: Boolean(selectedChild.classTeacherId) },
                { label: "Finance synced", ready: selectedChild.metrics.financeAttention === 0 },
                { label: "Timetable synced", ready: selectedChild.metrics.lessons > 0 },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between rounded-xl border p-3 text-sm">
                  <span>{item.label}</span>
                  <Badge variant="outline" className={item.ready ? statusTone.good : statusTone.warn}>{item.ready ? "Ready" : "Needs data"}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Award className="size-5" />Announcements</CardTitle>
              <CardDescription>Published school notices.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {payload.announcements.slice(0, 5).map((item) => (
                <div key={item.id} className="rounded-2xl border p-3">
                  <p className="text-sm font-medium">{item.title}</p>
                  <p className="mt-1 line-clamp-3 text-xs text-muted-foreground">{item.content}</p>
                  <p className="mt-2 text-xs text-muted-foreground">{formatDate(item.createdAt)}</p>
                </div>
              ))}
              {!payload.announcements.length ? <p className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">No current announcements.</p> : null}
            </CardContent>
          </Card>
        </aside>
      </section>

      <Dialog open={messageOpen} onOpenChange={setMessageOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Message {selectedChild.classTeacher || "teacher"}</DialogTitle>
            <DialogDescription>Send a direct parent-teacher message for {selectedChild.name}.</DialogDescription>
          </DialogHeader>
          <Textarea value={messageBody} onChange={(event) => setMessageBody(event.target.value)} placeholder="Write your message" />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setMessageOpen(false)}>Cancel</Button>
            <Button type="button" onClick={sendTeacherMessage} disabled={acting}>
              <MessageSquare className="size-4" />
              Send message
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={noteOpen} onOpenChange={setNoteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add guardian note</DialogTitle>
            <DialogDescription>Record a tenant-scoped guardian note against {selectedChild.name}&apos;s progress timeline.</DialogDescription>
          </DialogHeader>
          <Textarea value={noteBody} onChange={(event) => setNoteBody(event.target.value)} placeholder="Write the note" />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setNoteOpen(false)}>Cancel</Button>
            <Button type="button" onClick={submitGuardianNote} disabled={acting}>
              <CheckCircle2 className="size-4" />
              Submit note
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
