"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  AlertCircle,
  ArrowRight,
  Award,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  FileText,
  GraduationCap,
  MessageSquare,
  Receipt,
  RefreshCcw,
  Search,
  ShieldCheck,
  TrendingUp,
  UserRound,
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
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
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

type ParentChildrenPayload = {
  generatedAt: string
  currentUser?: { id: string; name: string; email: string; role: string; image?: string | null }
  school?: { id: string; name: string; slug: string; type: string; currencyCode?: string }
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
  error?: string
}

const tone = {
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
  return name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "CH"
}

function healthScore(child: ChildSummary) {
  const financeClear = child.metrics.billed > 0 ? Math.max(0, Math.min(100, (child.metrics.paid / child.metrics.billed) * 100)) : 100
  return Math.round((child.metrics.averageScore * 0.42) + (child.metrics.attendanceRate * 0.38) + (financeClear * 0.2))
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

function ChildrenSkeleton() {
  return (
    <div className="w-full space-y-6 p-6 lg:p-8">
      <Skeleton className="h-56 rounded-3xl" />
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-36 rounded-3xl" />)}
      </section>
      <section className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
        <Skeleton className="h-[560px] rounded-3xl" />
        <Skeleton className="h-[560px] rounded-3xl" />
      </section>
    </div>
  )
}

export default function ParentChildrenPage() {
  const pathname = usePathname()
  const router = useRouter()
  const [payload, setPayload] = React.useState<ParentChildrenPayload | null>(null)
  const [selectedChildId, setSelectedChildId] = React.useState("")
  const [query, setQuery] = React.useState("")
  const [loading, setLoading] = React.useState(true)
  const [refreshing, setRefreshing] = React.useState(false)
  const [acting, setActing] = React.useState(false)
  const [error, setError] = React.useState("")
  const [messageOpen, setMessageOpen] = React.useState(false)
  const [noteOpen, setNoteOpen] = React.useState(false)
  const [messageBody, setMessageBody] = React.useState("")
  const [noteBody, setNoteBody] = React.useState("")
  const [activeTab, setActiveTab] = React.useState("academics")

  const tenantPrefix = React.useMemo(() => {
    const segments = (pathname ?? "").split("/").filter(Boolean)
    return segments[1] === "parent" ? `/${segments[0]}` : ""
  }, [pathname])

  const parentHref = React.useCallback((href: string) => `${tenantPrefix}${href}`, [tenantPrefix])

  const endpoint = React.useCallback(() => {
    const tenant = tenantPrefix ? tenantPrefix.slice(1) : ""
    return tenant ? `/api/tenant/parent/children?tenant=${encodeURIComponent(tenant)}` : "/api/parent/dashboard"
  }, [tenantPrefix])

  const loadChildren = React.useCallback(async (notify = false) => {
    setError("")
    setLoading(true)
    const response = await fetch(endpoint(), { cache: "no-store" }).catch(() => null)
    if (!response?.ok) {
      const data = await response?.json().catch(() => ({}))
      const message = String(data?.error || "Failed to load children")
      setError(message)
      setLoading(false)
      if (notify) toast.error(message)
      return
    }
    const data = (await response.json()) as ParentChildrenPayload
    setPayload(data)
    setSelectedChildId((current) => current || data.children[0]?.id || "")
    setLoading(false)
    if (notify) toast.success("Children refreshed")
  }, [endpoint])

  React.useEffect(() => {
    void loadChildren()
  }, [loadChildren])

  const children = payload?.children || []
  const filteredChildren = children.filter((child) => {
    const search = query.trim().toLowerCase()
    if (!search) return true
    return [child.name, child.className, child.admissionNumber, child.classTeacher, child.email].some((value) => value.toLowerCase().includes(search))
  })
  const selectedChild = children.find((child) => child.id === selectedChildId) || filteredChildren[0] || children[0] || null
  const currency = payload?.school?.currencyCode || ""
  const familyTotals = children.reduce(
    (totals, child) => ({
      lessons: totals.lessons + child.metrics.lessons,
      reports: totals.reports + child.metrics.reports,
      grades: totals.grades + child.recentGrades.length,
      notes: totals.notes + child.progressNotes.length,
      absences: totals.absences + child.metrics.absentDays,
      late: totals.late + child.metrics.lateDays,
      billed: totals.billed + child.metrics.billed,
      paid: totals.paid + child.metrics.paid,
      outstanding: totals.outstanding + child.metrics.outstanding,
    }),
    { lessons: 0, reports: 0, grades: 0, notes: 0, absences: 0, late: 0, billed: 0, paid: 0, outstanding: 0 }
  )
  const atRiskChildren = children.filter((child) => healthScore(child) < 65 || child.metrics.attendanceRate < 90 || child.metrics.financeAttention > 0)
  const topPerformer = children.toSorted((a, b) => b.metrics.averageScore - a.metrics.averageScore)[0] || null
  const childProfiles = children.map((child) => {
    const financeClearance = child.metrics.billed > 0
      ? Math.round(Math.max(0, Math.min(100, (child.metrics.paid / child.metrics.billed) * 100)) * 10) / 10
      : 100
    const readiness = healthScore(child)
    const focus = child.metrics.attendanceRate > 0 && child.metrics.attendanceRate < 90
      ? "Attendance"
      : child.metrics.outstanding > 0
        ? "Finance"
        : child.metrics.averageScore > 0 && child.metrics.averageScore < 60
          ? "Academics"
          : child.metrics.pendingAssessments + child.metrics.upcomingExams > 0
            ? "Upcoming work"
            : "Stable"
    const targetTab = focus === "Attendance" ? "attendance" : focus === "Finance" ? "finance" : focus === "Academics" || focus === "Upcoming work" ? "academics" : "notes"
    return { child, financeClearance, readiness, focus, targetTab }
  })
  const familyFinanceClearance = familyTotals.billed > 0 ? Math.round((familyTotals.paid / familyTotals.billed) * 1000) / 10 : 100
  const teacherCoverage = children.length ? Math.round((children.filter((child) => child.classTeacherId).length / children.length) * 1000) / 10 : 0
  const timetableCoverage = children.length ? Math.round((children.filter((child) => child.metrics.lessons > 0).length / children.length) * 1000) / 10 : 0
  const gradebookCoverage = children.length ? Math.round((children.filter((child) => child.recentGrades.length > 0).length / children.length) * 1000) / 10 : 0
  const childNeedingAttention = childProfiles.toSorted((a, b) => a.readiness - b.readiness)[0] || null
  const highWorkloadChildren = childProfiles.filter(({ child }) => child.metrics.pendingAssessments + child.metrics.upcomingExams >= 3)
  const communicationReadyChildren = childProfiles.filter(({ child }) => child.classTeacherId)
  const allUpcomingWork = children
    .flatMap((child) => [
      ...child.assessments.map((item) => ({
        id: `assessment_${item.id}`,
        childId: child.id,
        childName: child.name,
        title: item.title,
        type: "Assessment",
        helper: item.subject,
        date: item.dueDate,
      })),
      ...child.exams.map((item) => ({
        id: `exam_${item.id}`,
        childId: child.id,
        childName: child.name,
        title: item.title,
        type: "Exam",
        helper: item.room,
        date: item.date,
      })),
    ])
    .toSorted((a, b) => {
      const left = a.date ? new Date(a.date).getTime() : Number.MAX_SAFE_INTEGER
      const right = b.date ? new Date(b.date).getTime() : Number.MAX_SAFE_INTEGER
      return left - right
    })
  const dataCompletenessChecks = [
    { label: "Student identities", complete: children.filter((child) => child.admissionNumber && child.email).length, total: children.length, icon: UserRound },
    { label: "Class placement", complete: children.filter((child) => child.className && child.className !== "Unassigned class").length, total: children.length, icon: Users },
    { label: "Teacher links", complete: communicationReadyChildren.length, total: children.length, icon: MessageSquare },
    { label: "Timetable links", complete: children.filter((child) => child.metrics.lessons > 0).length, total: children.length, icon: Clock },
    { label: "Academic evidence", complete: children.filter((child) => child.recentGrades.length || child.reportCards.length).length, total: children.length, icon: GraduationCap },
    { label: "Guardian contacts", complete: children.filter((child) => child.guardian.email || child.guardian.phone).length, total: children.length, icon: ShieldCheck },
  ]
  const selectedCoverage = selectedChild ? [
    { label: "Identity", ready: Boolean(selectedChild.admissionNumber && selectedChild.email), helper: selectedChild.admissionNumber || "Admission number missing" },
    { label: "Teacher", ready: Boolean(selectedChild.classTeacherId), helper: selectedChild.classTeacher || "Teacher not assigned" },
    { label: "Timetable", ready: selectedChild.lessons.length > 0, helper: `${selectedChild.lessons.length} published lessons` },
    { label: "Grades", ready: selectedChild.recentGrades.length > 0, helper: `${selectedChild.recentGrades.length} recent records` },
    { label: "Reports", ready: selectedChild.reportCards.length > 0, helper: `${selectedChild.reportCards.length} report cards` },
    { label: "Guardian", ready: Boolean(selectedChild.guardian.email || selectedChild.guardian.phone), helper: selectedChild.guardian.relation || "Guardian details" },
  ] : []
  const selectedInterventions = selectedChild ? [
    {
      label: "Academic action",
      value: selectedChild.metrics.averageScore >= 70 ? "Maintain" : selectedChild.metrics.averageScore > 0 ? "Support" : "Awaiting data",
      helper: selectedChild.metrics.averageScore >= 70 ? "Current average is stable." : "Review grades, reports, and upcoming work.",
      tab: "academics",
      icon: GraduationCap,
      toneClass: selectedChild.metrics.averageScore >= 70 ? tone.good : tone.warn,
    },
    {
      label: "Attendance action",
      value: selectedChild.metrics.attendanceRate >= 90 ? "Healthy" : "Follow up",
      helper: `${selectedChild.metrics.absentDays} absences and ${selectedChild.metrics.lateDays} late records.`,
      tab: "attendance",
      icon: ShieldCheck,
      toneClass: selectedChild.metrics.attendanceRate >= 90 ? tone.good : tone.warn,
    },
    {
      label: "Finance action",
      value: selectedChild.metrics.outstanding > 0 ? "Balance due" : "Clear",
      helper: selectedChild.metrics.outstanding > 0 ? `${currency} ${selectedChild.metrics.outstanding} outstanding.` : "No outstanding balance detected.",
      tab: "finance",
      icon: Wallet,
      toneClass: selectedChild.metrics.outstanding > 0 ? tone.warn : tone.good,
    },
    {
      label: "Communication action",
      value: selectedChild.classTeacherId ? "Ready" : "Missing",
      helper: selectedChild.classTeacherId ? `Message ${selectedChild.classTeacher || "teacher"} when needed.` : "Class teacher contact is not assigned.",
      tab: "notes",
      icon: MessageSquare,
      toneClass: selectedChild.classTeacherId ? tone.good : tone.warn,
    },
  ] : []
  const academicMomentum = children.map((child) => {
    const latestGrade = child.recentGrades.toSorted((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime())[0]
    const strongGrades = child.recentGrades.filter((grade) => grade.percentage >= 70).length
    const weakGrades = child.recentGrades.filter((grade) => grade.percentage > 0 && grade.percentage < 60).length
    const label = weakGrades ? "Needs academic support" : strongGrades ? "Positive momentum" : "Awaiting grade evidence"
    return { child, latestGrade, strongGrades, weakGrades, label }
  })
  const attendanceRecovery = children.map((child) => {
    const flags = child.metrics.absentDays + child.metrics.lateDays
    const target = child.metrics.attendanceRate >= 90 ? "Maintain routine" : "Recover attendance"
    return { child, flags, target }
  }).toSorted((a, b) => b.flags - a.flags)
  const financeExposure = childProfiles
    .filter(({ child }) => child.metrics.outstanding > 0)
    .toSorted((a, b) => b.child.metrics.outstanding - a.child.metrics.outstanding)
  const communicationGaps = children.filter((child) => !child.classTeacherId || !child.classTeacher)
  const parentCommandCards = [
    {
      label: "Academic momentum",
      value: academicMomentum.filter((item) => item.weakGrades > 0 || !item.latestGrade).length,
      helper: "Children with weak or missing latest grade evidence",
      icon: GraduationCap,
      toneClass: academicMomentum.some((item) => item.weakGrades > 0 || !item.latestGrade) ? tone.warn : tone.good,
      action: () => {
        const item = academicMomentum.find((entry) => entry.weakGrades > 0 || !entry.latestGrade) || academicMomentum[0]
        if (item) setSelectedChildId(item.child.id)
        setActiveTab("academics")
      },
    },
    {
      label: "Attendance recovery",
      value: attendanceRecovery[0]?.flags ?? 0,
      helper: attendanceRecovery[0] ? `${attendanceRecovery[0].child.name} has the highest attendance flags` : "No attendance flags",
      icon: ShieldCheck,
      toneClass: (attendanceRecovery[0]?.flags ?? 0) ? tone.warn : tone.good,
      action: () => {
        if (attendanceRecovery[0]) setSelectedChildId(attendanceRecovery[0].child.id)
        setActiveTab("attendance")
      },
    },
    {
      label: "Finance exposure",
      value: `${currency} ${familyTotals.outstanding}`,
      helper: financeExposure[0] ? `${financeExposure[0].child.name} has the highest balance` : "No family balance detected",
      icon: Wallet,
      toneClass: familyTotals.outstanding > 0 ? tone.warn : tone.good,
      action: () => {
        if (financeExposure[0]) setSelectedChildId(financeExposure[0].child.id)
        setActiveTab("finance")
      },
    },
    {
      label: "Communication gaps",
      value: communicationGaps.length,
      helper: communicationGaps.length ? "Children missing teacher communication links" : "Teacher communication is ready",
      icon: MessageSquare,
      toneClass: communicationGaps.length ? tone.warn : tone.good,
      action: () => {
        if (communicationGaps[0]) setSelectedChildId(communicationGaps[0].id)
        setActiveTab("notes")
      },
    },
  ]
  const nextWork = selectedChild
    ? [...selectedChild.assessments.map((item) => ({ id: `a_${item.id}`, type: "Assessment", title: item.title, date: item.dueDate, helper: item.subject })), ...selectedChild.exams.map((item) => ({ id: `e_${item.id}`, type: "Exam", title: item.title, date: item.date, helper: item.room }))]
      .toSorted((a, b) => {
        const left = a.date ? new Date(a.date).getTime() : Number.MAX_SAFE_INTEGER
        const right = b.date ? new Date(b.date).getTime() : Number.MAX_SAFE_INTEGER
        return left - right
      })
    : []

  const refresh = () => {
    setRefreshing(true)
    void loadChildren(true).finally(() => setRefreshing(false))
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
      toast.error(String(data?.error || "Parent children action failed"))
      return false
    }
    toast.success(success)
    void loadChildren()
    return true
  }

  const sendTeacherMessage = async () => {
    if (!selectedChild) return
    const message = messageBody.trim()
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
    if (!selectedChild) return
    const message = noteBody.trim()
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

  const exportChildren = () => {
    if (!payload) return
    const rows = [
      ["Parent", payload.currentUser?.name || ""],
      ["School", payload.school?.name || ""],
      ["Children", String(children.length)],
      [],
      ["Child", "Admission", "Class", "Teacher", "Average", "Attendance", "Outstanding", "Assessments", "Exams", "Lessons"],
      ...children.map((child) => [
        child.name,
        child.admissionNumber,
        child.className,
        child.classTeacher,
        `${child.metrics.averageScore}%`,
        `${child.metrics.attendanceRate}%`,
        `${currency} ${child.metrics.outstanding}`,
        String(child.metrics.pendingAssessments),
        String(child.metrics.upcomingExams),
        String(child.metrics.lessons),
      ]),
    ]
    const csv = rows.map((row) => row.map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`).join(",")).join("\n")
    downloadFile("parent-children-summary.csv", csv, "text/csv;charset=utf-8")
    toast.success("Children summary downloaded")
  }

  if (loading && !payload) return <ChildrenSkeleton />

  if (error && !payload) {
    return (
      <div className="w-full p-6 lg:p-8">
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-3">
              <AlertCircle className="mt-0.5 size-5 text-destructive" />
              <div>
                <p className="font-medium text-destructive">Children page could not be loaded</p>
                <p className="text-sm text-muted-foreground">{error}</p>
              </div>
            </div>
            <Button type="button" variant="outline" onClick={() => void loadChildren(true)}>Retry</Button>
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
              <p className="text-sm text-muted-foreground">This page only renders for a signed-in parent or guardian with linked children.</p>
            </div>
            <Button type="button" variant="outline" onClick={() => router.refresh()}>Refresh session</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="w-full space-y-6 p-6 lg:p-8">
      <section className="overflow-hidden rounded-3xl border bg-card shadow-sm">
        <div className="relative p-6 md:p-8">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(20,184,166,0.18),transparent_34%),linear-gradient(135deg,rgba(245,158,11,0.12),transparent_45%)]" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-3xl space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="bg-background/80">
                  <Users className="mr-1 size-3.5" />
                  {children.length} linked child{children.length === 1 ? "" : "ren"}
                </Badge>
                <Badge variant="outline" className="bg-background/80">{payload.school?.name}</Badge>
                <Badge variant="outline" className="bg-background/80">Session: {payload.currentUser.name}</Badge>
              </div>
              <div>
                <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">My Children</h1>
                <p className="mt-2 text-muted-foreground">
                  Tenant-synced child profiles, academics, attendance, finance, timetable, and teacher communication for the logged-in parent.
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
              <Button type="button" variant="outline" onClick={refresh} disabled={refreshing}>
                <RefreshCcw className={cn("size-4", refreshing && "animate-spin")} />
                Refresh
              </Button>
              <Button type="button" onClick={exportChildren}>
                <Download className="size-4" />
                Export
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="grid items-stretch gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Family Average", value: `${payload.metrics?.averageScore ?? 0}%`, helper: "Average across linked children", icon: TrendingUp, progress: payload.metrics?.averageScore ?? 0 },
          { label: "Attendance", value: `${payload.metrics?.attendanceRate ?? 0}%`, helper: "Recent attendance average", icon: ShieldCheck, progress: payload.metrics?.attendanceRate ?? 0 },
          { label: "Upcoming Work", value: (payload.metrics?.pendingAssessments ?? 0) + (payload.metrics?.upcomingExams ?? 0), helper: "Assessments and exams", icon: Calendar },
          { label: "Outstanding", value: `${currency} ${payload.metrics?.outstandingBalance ?? 0}`, helper: `${payload.metrics?.financeAttention ?? 0} finance items`, icon: Wallet },
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
          { label: "At-Risk Children", value: atRiskChildren.length, helper: "Attendance, finance, or readiness needs attention", icon: AlertCircle, toneClass: atRiskChildren.length ? tone.warn : tone.good },
          { label: "Top Performer", value: topPerformer?.name || "No data", helper: topPerformer ? `${topPerformer.metrics.averageScore}% average` : "Waiting for gradebook data", icon: Award, toneClass: tone.good },
          { label: "Family Lessons", value: familyTotals.lessons, helper: `${familyTotals.grades} grades and ${familyTotals.reports} reports loaded`, icon: BookOpen, toneClass: tone.info },
          { label: "Attendance Flags", value: familyTotals.absences + familyTotals.late, helper: `${familyTotals.absences} absences, ${familyTotals.late} late records`, icon: Calendar, toneClass: familyTotals.absences + familyTotals.late ? tone.warn : tone.good },
        ].map((item) => {
          const Icon = item.icon
          return (
            <Card key={item.label} className="rounded-3xl shadow-sm">
              <CardContent className="flex min-h-32 items-start justify-between gap-4 p-5">
                <div className="min-w-0">
                  <p className="text-sm text-muted-foreground">{item.label}</p>
                  <p className="mt-2 truncate text-2xl font-semibold">{item.value}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{item.helper}</p>
                </div>
                <div className={cn("rounded-2xl border p-3", item.toneClass)}>
                  <Icon className="size-5" />
                </div>
              </CardContent>
            </Card>
          )
        })}
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <Card className="rounded-3xl shadow-sm">
          <CardHeader>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle>Family Coverage Board</CardTitle>
                <CardDescription>Production readiness across teacher contact, timetable, gradebook, finance, and attendance.</CardDescription>
              </div>
              <Badge variant="outline" className={atRiskChildren.length ? tone.warn : tone.good}>
                {atRiskChildren.length ? `${atRiskChildren.length} needs review` : "All children stable"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            {[
              { label: "Teacher coverage", value: `${teacherCoverage}%`, helper: `${communicationReadyChildren.length}/${children.length} children have teacher contact`, icon: MessageSquare, progress: teacherCoverage },
              { label: "Timetable coverage", value: `${timetableCoverage}%`, helper: "Children with published lessons", icon: Clock, progress: timetableCoverage },
              { label: "Gradebook coverage", value: `${gradebookCoverage}%`, helper: "Children with recent grades", icon: GraduationCap, progress: gradebookCoverage },
              { label: "Finance clearance", value: `${familyFinanceClearance}%`, helper: `${currency} ${familyTotals.outstanding} outstanding`, icon: Wallet, progress: familyFinanceClearance },
              { label: "Family attendance", value: `${payload.metrics?.attendanceRate ?? 0}%`, helper: `${familyTotals.absences} absences, ${familyTotals.late} late`, icon: ShieldCheck, progress: payload.metrics?.attendanceRate ?? 0 },
            ].map((item) => {
              const Icon = item.icon
              const ready = Number(item.progress) >= 90
              return (
                <div key={item.label} className="rounded-2xl border bg-background/60 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">{item.label}</p>
                      <p className="mt-1 truncate text-lg font-semibold">{item.value}</p>
                    </div>
                    <div className={cn("rounded-xl border p-2", ready ? tone.good : tone.warn)}>
                      <Icon className="size-4" />
                    </div>
                  </div>
                  <Progress className="mt-3" value={Number(item.progress || 0)} />
                  <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{item.helper}</p>
                </div>
              )
            })}
          </CardContent>
        </Card>

        <Card className="rounded-3xl shadow-sm">
          <CardHeader>
            <CardTitle>Next Parent Move</CardTitle>
            <CardDescription>Lowest readiness child and the most useful follow-up path.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <button
              type="button"
              className="w-full rounded-2xl border p-4 text-left transition-colors hover:bg-muted/50"
              onClick={() => {
                if (!childNeedingAttention) return
                setSelectedChildId(childNeedingAttention.child.id)
                setActiveTab(childNeedingAttention.targetTab)
              }}
            >
              <p className="text-xs text-muted-foreground">Priority child</p>
              <p className="mt-1 font-semibold">{childNeedingAttention?.child.name || "No linked child"}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {childNeedingAttention ? `${childNeedingAttention.focus} focus - ${childNeedingAttention.readiness}% readiness` : "No child data loaded"}
              </p>
            </button>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
              <Button type="button" variant="outline" className="justify-start" onClick={() => {
                if (childNeedingAttention) setSelectedChildId(childNeedingAttention.child.id)
                setActiveTab("attendance")
              }}>
                <ShieldCheck className="size-4" />
                Review attendance
              </Button>
              <Button type="button" variant="outline" className="justify-start" onClick={() => {
                if (childNeedingAttention) setSelectedChildId(childNeedingAttention.child.id)
                setActiveTab("academics")
              }}>
                <GraduationCap className="size-4" />
                Review academics
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

      <section>
        <Card className="rounded-3xl shadow-sm">
          <CardHeader>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle>Child Comparison Matrix</CardTitle>
                <CardDescription>Compare every linked child and jump directly into the right detail tab.</CardDescription>
              </div>
              <Badge variant="outline">{highWorkloadChildren.length} high workload</Badge>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {childProfiles.map(({ child, financeClearance, readiness, focus, targetTab }) => (
              <button
                key={child.id}
                type="button"
                className={cn("rounded-2xl border p-4 text-left transition-colors hover:bg-muted/50", child.id === selectedChild.id && "border-primary bg-primary/5")}
                onClick={() => {
                  setSelectedChildId(child.id)
                  setActiveTab(targetTab)
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{child.name}</p>
                    <p className="truncate text-sm text-muted-foreground">{child.className} - {child.classTeacher || "No teacher assigned"}</p>
                  </div>
                  <Badge variant="outline" className={readiness >= 80 ? tone.good : readiness >= 60 ? tone.warn : tone.danger}>{readiness}%</Badge>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Average</p>
                    <p className="font-semibold">{child.metrics.averageScore}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Attendance</p>
                    <p className="font-semibold">{child.metrics.attendanceRate}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Finance</p>
                    <p className="font-semibold">{financeClearance}%</p>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between rounded-xl bg-muted/40 p-3 text-xs text-muted-foreground">
                  <span>{focus}</span>
                  <ArrowRight className="size-4" />
                </div>
              </button>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <Card className="rounded-3xl shadow-sm">
          <CardHeader>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle>Family Workload Planner</CardTitle>
                <CardDescription>Upcoming assessments and exams across every linked child.</CardDescription>
              </div>
              <Badge variant="outline">{allUpcomingWork.length} upcoming item{allUpcomingWork.length === 1 ? "" : "s"}</Badge>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {allUpcomingWork.slice(0, 6).map((item) => (
              <button
                key={item.id}
                type="button"
                className="rounded-2xl border p-4 text-left transition-colors hover:bg-muted/50"
                onClick={() => {
                  setSelectedChildId(item.childId)
                  setActiveTab("academics")
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{item.title}</p>
                    <p className="mt-1 truncate text-sm text-muted-foreground">{item.childName} - {item.helper}</p>
                  </div>
                  <Badge variant="outline">{item.type}</Badge>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">{formatDate(item.date)}</p>
              </button>
            ))}
            {!allUpcomingWork.length ? (
              <p className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground md:col-span-2 xl:col-span-3">
                No upcoming assessments or exams are published for linked children.
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card className="rounded-3xl shadow-sm">
          <CardHeader>
            <CardTitle>{selectedChild.name} Intervention Plan</CardTitle>
            <CardDescription>Action cards generated from this child&apos;s academic, attendance, finance, and communication data.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            {selectedInterventions.map((item) => {
              const Icon = item.icon
              return (
                <button
                  key={item.label}
                  type="button"
                  className="rounded-2xl border p-4 text-left transition-colors hover:bg-muted/50"
                  onClick={() => setActiveTab(item.tab)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">{item.label}</p>
                      <p className="mt-1 truncate font-semibold">{item.value}</p>
                    </div>
                    <div className={cn("rounded-xl border p-2", item.toneClass)}>
                      <Icon className="size-4" />
                    </div>
                  </div>
                  <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{item.helper}</p>
                </button>
              )
            })}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <Card className="rounded-3xl shadow-sm">
          <CardHeader>
            <CardTitle>Children Data Completeness</CardTitle>
            <CardDescription>Checks whether tenant systems have enough data for a reliable parent view.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {dataCompletenessChecks.map((item) => {
              const Icon = item.icon
              const percent = item.total ? Math.round((item.complete / item.total) * 1000) / 10 : 0
              return (
                <div key={item.label} className="rounded-2xl border bg-background/60 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground">{item.label}</p>
                      <p className="mt-1 text-lg font-semibold">{item.complete}/{item.total}</p>
                    </div>
                    <div className={cn("rounded-xl border p-2", percent >= 90 ? tone.good : tone.warn)}>
                      <Icon className="size-4" />
                    </div>
                  </div>
                  <Progress className="mt-3" value={percent} />
                  <p className="mt-2 text-xs text-muted-foreground">{percent}% complete</p>
                </div>
              )
            })}
          </CardContent>
        </Card>

        <Card className="rounded-3xl shadow-sm">
          <CardHeader>
            <CardTitle>{selectedChild.name} Data Readiness</CardTitle>
            <CardDescription>Selected child data checks from the tenant database.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {selectedCoverage.map((item) => (
              <div key={item.label} className="flex items-center justify-between gap-3 rounded-2xl border p-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="truncate text-xs text-muted-foreground">{item.helper}</p>
                </div>
                <Badge variant="outline" className={item.ready ? tone.good : tone.warn}>{item.ready ? "Ready" : "Needs data"}</Badge>
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
                <CardTitle>Parent Command Layer</CardTitle>
                <CardDescription>Fast operational decisions across academics, attendance, finance, and communication.</CardDescription>
              </div>
              <Badge variant="outline">{payload.school?.slug || "tenant"} live</Badge>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {parentCommandCards.map((item) => {
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
                    <div className={cn("rounded-xl border p-2", item.toneClass)}>
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
            <CardTitle>Academic Momentum</CardTitle>
            <CardDescription>Latest grade signal for each linked child.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {academicMomentum.slice(0, 4).map((item) => (
              <button
                key={item.child.id}
                type="button"
                className="w-full rounded-2xl border p-3 text-left transition-colors hover:bg-muted/50"
                onClick={() => {
                  setSelectedChildId(item.child.id)
                  setActiveTab("academics")
                }}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{item.child.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{item.latestGrade ? `${item.latestGrade.subject} - ${item.latestGrade.percentage}%` : "No recent grade"}</p>
                  </div>
                  <Badge variant="outline" className={item.weakGrades ? tone.warn : item.latestGrade ? tone.good : tone.info}>{item.label}</Badge>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
        <Card className="rounded-3xl shadow-sm">
          <CardHeader>
            <CardTitle>Linked Children</CardTitle>
            <CardDescription>Guardian-linked records from the tenant database.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search child, class, teacher..." className="pl-9" />
            </div>
            <Select value={selectedChild.id} onValueChange={setSelectedChildId}>
              <SelectTrigger>
                <SelectValue placeholder="Select child" />
              </SelectTrigger>
              <SelectContent>
                {children.map((child) => <SelectItem key={child.id} value={child.id}>{child.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="space-y-3">
              {filteredChildren.map((child) => (
                <button
                  key={child.id}
                  type="button"
                  className={cn("w-full rounded-2xl border p-4 text-left transition-colors hover:bg-muted/50", child.id === selectedChild.id && "border-primary bg-primary/5")}
                  onClick={() => setSelectedChildId(child.id)}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 font-semibold text-primary">
                      {initials(child.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate font-medium">{child.name}</p>
                        <Badge variant="outline" className={healthScore(child) >= 80 ? tone.good : healthScore(child) >= 60 ? tone.warn : tone.danger}>{healthScore(child)}%</Badge>
                      </div>
                      <p className="truncate text-sm text-muted-foreground">{child.className} - {child.classTeacher || "No teacher assigned"}</p>
                      <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                        <span>Avg {child.metrics.averageScore}%</span>
                        <span>Att {child.metrics.attendanceRate}%</span>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
              {!filteredChildren.length ? <p className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">No children match this search.</p> : null}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="overflow-hidden rounded-3xl shadow-sm">
            <CardContent className="p-0">
              <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_320px]">
                <div className="p-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex items-start gap-4">
                      <div className="flex size-16 items-center justify-center rounded-3xl bg-primary/10 text-xl font-semibold text-primary">
                        {initials(selectedChild.name)}
                      </div>
                      <div>
                        <h2 className="text-2xl font-semibold">{selectedChild.name}</h2>
                        <p className="text-sm text-muted-foreground">{selectedChild.email || "Student email not configured"}</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <Badge variant="outline">{selectedChild.className}</Badge>
                          <Badge variant="outline">{selectedChild.admissionNumber || "No admission number"}</Badge>
                          <Badge variant="outline">{selectedChild.status || "Active"}</Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" variant="outline" onClick={() => setMessageOpen(true)}>
                        <MessageSquare className="size-4" />
                        Message teacher
                      </Button>
                      <Button type="button" onClick={() => setNoteOpen(true)}>
                        <FileText className="size-4" />
                        Add note
                      </Button>
                    </div>
                  </div>
                  <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {[
                      { label: "Average", value: `${selectedChild.metrics.averageScore}%`, icon: GraduationCap },
                      { label: "Attendance", value: `${selectedChild.metrics.attendanceRate}%`, icon: ShieldCheck },
                      { label: "Lessons", value: selectedChild.metrics.lessons, icon: Clock },
                      { label: "Reports", value: selectedChild.metrics.reports, icon: Award },
                    ].map((item) => {
                      const Icon = item.icon
                      return (
                        <div key={item.label} className="rounded-2xl border bg-muted/20 p-4">
                          <Icon className="mb-3 size-4 text-primary" />
                          <p className="text-xs text-muted-foreground">{item.label}</p>
                          <p className="text-xl font-semibold">{item.value}</p>
                        </div>
                      )
                    })}
                  </div>
                </div>
                <div className="border-t bg-muted/20 p-6 lg:border-l lg:border-t-0">
                  <p className="text-sm font-medium">Readiness score</p>
                  <p className="mt-2 text-4xl font-semibold">{healthScore(selectedChild)}%</p>
                  <Progress className="mt-4" value={healthScore(selectedChild)} />
                  <div className="mt-5 space-y-3 text-sm">
                    <div className="flex items-center justify-between"><span className="text-muted-foreground">Academic year</span><span>{selectedChild.academicYear || "Not configured"}</span></div>
                    <div className="flex items-center justify-between"><span className="text-muted-foreground">Term</span><span>{selectedChild.term || "Not configured"}</span></div>
                    <div className="flex items-center justify-between"><span className="text-muted-foreground">Guardian</span><span>{selectedChild.guardian.relation || "Guardian"}</span></div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <section className="grid gap-4 md:grid-cols-3">
            {[
              { label: "Attendance Risk", value: selectedChild.metrics.attendanceRate < 90 ? "Needs follow-up" : "Healthy", helper: `${selectedChild.metrics.absentDays} absent, ${selectedChild.metrics.lateDays} late`, icon: ShieldCheck, toneClass: selectedChild.metrics.attendanceRate < 90 ? tone.warn : tone.good },
              { label: "Academic Load", value: `${selectedChild.metrics.pendingAssessments + selectedChild.metrics.upcomingExams} upcoming`, helper: `${selectedChild.recentGrades.length} recent grade records`, icon: GraduationCap, toneClass: tone.info },
              { label: "Finance Status", value: selectedChild.metrics.outstanding > 0 ? `${currency} ${selectedChild.metrics.outstanding}` : "Clear", helper: `${selectedChild.metrics.financeAttention} invoice items needing attention`, icon: Receipt, toneClass: selectedChild.metrics.outstanding > 0 ? tone.warn : tone.good },
            ].map((item) => {
              const Icon = item.icon
              return (
                <Card key={item.label} className="rounded-3xl shadow-sm">
                  <CardContent className="flex min-h-32 items-start justify-between gap-4 p-5">
                    <div className="min-w-0">
                      <p className="text-sm text-muted-foreground">{item.label}</p>
                      <p className="mt-2 truncate text-xl font-semibold">{item.value}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{item.helper}</p>
                    </div>
                    <div className={cn("rounded-2xl border p-3", item.toneClass)}>
                      <Icon className="size-5" />
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </section>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="grid w-full grid-cols-2 md:grid-cols-5">
              <TabsTrigger value="academics">Academics</TabsTrigger>
              <TabsTrigger value="attendance">Attendance</TabsTrigger>
              <TabsTrigger value="schedule">Schedule</TabsTrigger>
              <TabsTrigger value="finance">Finance</TabsTrigger>
              <TabsTrigger value="notes">Notes</TabsTrigger>
            </TabsList>

            <TabsContent value="academics" className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Grades</CardTitle>
                  <CardDescription>Published gradebook results.</CardDescription>
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
                  {!selectedChild.recentGrades.length ? <p className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">No grades published yet.</p> : null}
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Upcoming Work</CardTitle>
                  <CardDescription>Assessments and exams for this child.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {nextWork.slice(0, 6).map((item) => (
                    <div key={item.id} className="flex items-center justify-between rounded-2xl border p-3">
                      <div>
                        <p className="text-sm font-medium">{item.title}</p>
                        <p className="text-xs text-muted-foreground">{item.helper} - {formatDate(item.date)}</p>
                      </div>
                      <Badge variant="outline">{item.type}</Badge>
                    </div>
                  ))}
                  {!nextWork.length ? <p className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">No upcoming assessments or exams.</p> : null}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="attendance" className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Attendance Health</CardTitle>
                  <CardDescription>Recent attendance and risk indicators.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="mb-1 flex items-center justify-between text-sm">
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
                      <Badge variant="outline" className={item.status.toLowerCase() === "absent" ? tone.danger : tone.good}>{item.status || "Recorded"}</Badge>
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
                  <CardDescription>Published lessons linked to this child&apos;s class.</CardDescription>
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
                  {!selectedChild.lessons.length ? <p className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground md:col-span-2">No timetable lessons published for this child yet.</p> : null}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="finance" className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Finance Summary</CardTitle>
                  <CardDescription>Billing status for this child.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border p-4"><p className="text-xs text-muted-foreground">Billed</p><p className="text-lg font-semibold">{currency} {selectedChild.metrics.billed}</p></div>
                  <div className="rounded-2xl border p-4"><p className="text-xs text-muted-foreground">Paid</p><p className="text-lg font-semibold">{currency} {selectedChild.metrics.paid}</p></div>
                  <div className="rounded-2xl border p-4"><p className="text-xs text-muted-foreground">Outstanding</p><p className="text-lg font-semibold">{currency} {selectedChild.metrics.outstanding}</p></div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Report Cards</CardTitle>
                  <CardDescription>Issued report cards and summaries.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {selectedChild.reportCards.map((report) => (
                    <div key={report.id} className="rounded-2xl border p-3">
                      <div className="flex items-center justify-between">
                        <p className="font-medium">{report.number || "Report card"}</p>
                        <Badge variant="outline">{report.status || "Issued"}</Badge>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{formatDate(report.issuedDate)} - {report.percentage}% - GPA {report.gpa}</p>
                    </div>
                  ))}
                  {!selectedChild.reportCards.length ? <p className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">No report cards issued yet.</p> : null}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="notes" className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Progress Notes</CardTitle>
                  <CardDescription>Teacher and guardian timeline.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {selectedChild.progressNotes.map((note) => (
                    <div key={note.id} className="rounded-2xl border p-3">
                      <Badge variant="outline" className={note.positive ? tone.good : tone.warn}>{note.category || note.type || "Progress"}</Badge>
                      <p className="mt-2 text-sm">{note.note || "Progress update recorded."}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{note.recordedBy || "School staff"} - {formatDate(note.createdAt)}</p>
                    </div>
                  ))}
                  {!selectedChild.progressNotes.length ? <p className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">No progress notes available yet.</p> : null}
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                  <CardDescription>Functional parent actions for this child.</CardDescription>
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
                    <Link href={parentHref("/parent/dashboard")}>
                      <UserRound className="size-4" />
                      Return to dashboard
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
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
