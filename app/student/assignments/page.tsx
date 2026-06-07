"use client"

import * as React from "react"
import { usePathname, useRouter } from "next/navigation"
import {
  AlertCircle,
  ArrowLeft,
  Bell,
  BookOpen,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Download,
  Eye,
  FileText,
  GraduationCap,
  HelpCircle,
  Loader2,
  MessageSquare,
  Printer,
  RefreshCcw,
  Search,
  Send,
  Target,
  Trophy,
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

type AssignmentStatus = "pending" | "submitted" | "late" | "graded" | "closed"

type Assignment = {
  id: string
  title: string
  description: string
  subjectId: string
  subject: string
  subjectCode: string
  type: string
  totalScore: number
  dueDate: string | null
  releaseDate: string | null
  createdAt: string | null
  status: AssignmentStatus
  rawStatus: string
  instructions: string
  attachments: unknown
  teacherId: string
  teacher: string
  grade: null | {
    id: string
    score: number
    maxScore: number
    percentage: number
    letter: string
    feedback: string
    date: string | null
  }
}

type SubjectSummary = {
  id: string
  name: string
  code: string
  total: number
  pending: number
  submitted: number
  graded: number
  average: number
}

type AssignmentsPayload = {
  generatedAt: string
  currentUser?: { id: string; name: string; email: string; role: string }
  school?: { id: string; name: string; slug: string; type: string }
  student?: {
    id: string
    userId: string
    admissionNumber: string
    classId: string
    className: string
    classGrade: string
    classSection: string
    classTeacher: string
    classTeacherId: string
    academicYear: string
    term: string
  }
  metrics?: {
    totalAssignments: number
    pending: number
    submitted: number
    late: number
    graded: number
    closed: number
    averageScore: number
    highestScore: number
    nextDue: Assignment | null
    reminders?: number
    pinned?: number
  }
  reminderIds?: string[]
  pinnedIds?: string[]
  assignments: Assignment[]
  subjects: SubjectSummary[]
  progressNotes: Array<{ id: string; type: string; value: number; note: string; category: string; positive: boolean; createdAt: string | null }>
}

const statusStyles: Record<AssignmentStatus, string> = {
  pending: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300",
  submitted: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300",
  late: "border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300",
  graded: "border-green-200 bg-green-50 text-green-700 dark:border-green-900/60 dark:bg-green-950/40 dark:text-green-300",
  closed: "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-300",
}

function formatStatus(value: string) {
  return value.replace("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function formatDate(value: string | null) {
  if (!value) return "Not scheduled"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Not scheduled"
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
  link.click()
  URL.revokeObjectURL(url)
}

export default function AssignmentsPage() {
  const router = useRouter()
  const pathname = usePathname()
  const [payload, setPayload] = React.useState<AssignmentsPayload | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [refreshing, setRefreshing] = React.useState(false)
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState("")
  const [query, setQuery] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState("all")
  const [subjectFilter, setSubjectFilter] = React.useState("all")
  const [sortBy, setSortBy] = React.useState("due")
  const [actingId, setActingId] = React.useState("")
  const [selectedAssignment, setSelectedAssignment] = React.useState<Assignment | null>(null)
  const [submissionAssignment, setSubmissionAssignment] = React.useState<Assignment | null>(null)
  const [submissionNote, setSubmissionNote] = React.useState("")
  const [helpOpen, setHelpOpen] = React.useState(false)
  const [helpMessage, setHelpMessage] = React.useState("")
  const [messageOpen, setMessageOpen] = React.useState(false)
  const [messageBody, setMessageBody] = React.useState("")

  const tenantPrefix = React.useMemo(() => {
    const segments = (pathname ?? "").split("/").filter(Boolean)
    return segments[1] === "student" ? `/${segments[0]}` : ""
  }, [pathname])

  const studentHref = React.useCallback((href: string) => `${tenantPrefix}${href}`, [tenantPrefix])
  const endpoint = React.useCallback(() => {
    const tenant = tenantPrefix ? tenantPrefix.slice(1) : ""
    return tenant ? `/api/tenant/student/assignments?tenant=${encodeURIComponent(tenant)}` : "/api/student/assignments"
  }, [tenantPrefix])

  const loadAssignments = React.useCallback(async (notify = false) => {
    setLoading(true)
    setError("")
    const response = await fetch(endpoint(), { cache: "no-store" }).catch(() => null)
    if (!response?.ok) {
      const data = await response?.json().catch(() => ({}))
      const message = String(data?.error || "Failed to load assignments")
      setError(message)
      setLoading(false)
      if (notify) toast.error(message)
      return
    }
    setPayload((await response.json()) as AssignmentsPayload)
    setLoading(false)
    if (notify) toast.success("Assignments refreshed")
  }, [endpoint])

  React.useEffect(() => {
    void loadAssignments()
  }, [loadAssignments])

  const assignments = payload?.assignments || []
  const subjects = payload?.subjects || []
  const nextDue = payload?.metrics?.nextDue
  const reminders = payload?.reminderIds || []
  const pinnedIds = payload?.pinnedIds || []
  const pinnedAssignments = assignments.filter((assignment) => pinnedIds.includes(assignment.id))

  const filteredAssignments = assignments
    .filter((assignment) => {
      const haystack = `${assignment.title} ${assignment.subject} ${assignment.type} ${assignment.teacher}`.toLowerCase()
      const matchesStatus = statusFilter === "all" || assignment.status === statusFilter
      const matchesSubject = subjectFilter === "all" || assignment.subjectId === subjectFilter
      return matchesStatus && matchesSubject && haystack.includes(query.toLowerCase())
    })
    .toSorted((a, b) => {
      if (sortBy === "subject") return a.subject.localeCompare(b.subject)
      if (sortBy === "status") return a.status.localeCompare(b.status)
      if (sortBy === "score") return (b.grade?.percentage || 0) - (a.grade?.percentage || 0)
      return new Date(a.dueDate || 0).getTime() - new Date(b.dueDate || 0).getTime()
    })

  const gradedAssignments = assignments.filter((assignment) => assignment.grade)
  const attentionItems = assignments.filter((assignment) => assignment.status === "late" || (assignment.grade?.percentage || 100) < 60)
  const dueThisWeek = assignments.filter((assignment) => {
    if (!assignment.dueDate || !["pending", "late"].includes(assignment.status)) return false
    const due = new Date(assignment.dueDate).getTime()
    const now = Date.now()
    return Number.isFinite(due) && due >= now - 24 * 60 * 60 * 1000 && due <= now + 7 * 24 * 60 * 60 * 1000
  })

  const refresh = () => {
    setRefreshing(true)
    void loadAssignments(true).finally(() => setRefreshing(false))
  }

  const runAssignmentAction = async (body: Record<string, unknown>, notify: string) => {
    const id = String(body.assignmentId || body.action || "")
    setActingId(id)
    const response = await fetch(endpoint(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).catch(() => null)
    setActingId("")
    if (!response?.ok) {
      const data = await response?.json().catch(() => ({}))
      toast.error(String(data?.error || "Action failed"))
      return false
    }
    toast.success(notify)
    void loadAssignments()
    return true
  }

  const toggleReminder = (assignment: Assignment) => {
    void runAssignmentAction({
      action: reminders.includes(assignment.id) ? "reminder.remove" : "reminder.add",
      assignmentId: assignment.id,
    }, reminders.includes(assignment.id) ? "Assignment reminder removed" : "Assignment reminder saved")
  }

  const togglePinned = (assignment: Assignment) => {
    void runAssignmentAction({
      action: pinnedIds.includes(assignment.id) ? "unpin" : "pin",
      assignmentId: assignment.id,
    }, pinnedIds.includes(assignment.id) ? "Assignment unpinned" : "Assignment pinned")
  }

  const exportJson = () => {
    if (!payload) return
    downloadFile("student-assignments.json", JSON.stringify(payload, null, 2), "application/json")
    toast.success("Assignments export downloaded")
  }

  const exportCsv = () => {
    const rows = [
      ["title", "subject", "status", "due_date", "score", "teacher"],
      ...assignments.map((assignment) => [
        assignment.title,
        assignment.subject,
        assignment.status,
        formatDate(assignment.dueDate),
        assignment.grade ? `${assignment.grade.percentage}%` : "",
        assignment.teacher,
      ]),
    ]
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n")
    downloadFile("student-assignments.csv", csv, "text/csv")
    toast.success("Assignments CSV downloaded")
  }

  const submitAssignment = async () => {
    if (!submissionAssignment) return
    setSubmitting(true)
    const response = await fetch(endpoint(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "assignment-submission", assignmentId: submissionAssignment.id, note: submissionNote }),
    }).catch(() => null)
    setSubmitting(false)
    if (!response?.ok) {
      const data = await response?.json().catch(() => ({}))
      toast.error(String(data?.error || "Failed to submit assignment"))
      return
    }
    setSubmissionAssignment(null)
    setSubmissionNote("")
    toast.success("Assignment submitted")
    void loadAssignments()
  }

  const sendHelpRequest = async () => {
    const message = helpMessage.trim()
    if (!message) {
      toast.error("Describe what you need help with")
      return
    }
    const response = await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Student assignment support request",
        message,
        category: "academic",
        priority: "normal",
        dashboardArea: "student-assignments",
      }),
    }).catch(() => null)
    if (!response?.ok) {
      const data = await response?.json().catch(() => ({}))
      toast.error(String(data?.error || "Failed to send support request"))
      return
    }
    setHelpMessage("")
    setHelpOpen(false)
    toast.success("Support request sent")
  }

  const sendTeacherMessage = async () => {
    const message = messageBody.trim()
    const receiverId = selectedAssignment?.teacherId || payload?.student?.classTeacherId
    if (!receiverId) {
      router.push(studentHref("/student/communication"))
      toast.info("Open communication to select a staff member")
      return
    }
    if (!message) {
      toast.error("Message cannot be empty")
      return
    }
    const response = await fetch(endpoint(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "teacher-message", receiverId, message }),
    }).catch(() => null)
    if (!response?.ok) {
      const data = await response?.json().catch(() => ({}))
      toast.error(String(data?.error || "Failed to send message"))
      return
    }
    setMessageBody("")
    setMessageOpen(false)
    toast.success("Message sent")
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" className="w-fit" onClick={() => router.back()}>
        <ArrowLeft className="size-4" />
        Back
      </Button>

      {error ? (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium text-destructive">Assignments could not be loaded</p>
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
            <Button type="button" variant="outline" onClick={() => void loadAssignments(true)}>Retry</Button>
          </CardContent>
        </Card>
      ) : null}

      <section className="overflow-hidden rounded-3xl border bg-card shadow-sm">
        <div className="relative p-6 md:p-8">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(14,165,233,0.16),transparent_34%),linear-gradient(135deg,rgba(245,158,11,0.12),transparent_45%)]" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="bg-background/80">
                  <GraduationCap className="mr-1 size-3.5" />
                  {payload?.student?.term || "Current term"}
                </Badge>
                <Badge variant="outline" className="bg-background/80">{payload?.school?.name || "School"}</Badge>
                <Badge variant="outline" className="bg-background/80">{payload?.student?.className || "Class"}</Badge>
              </div>
              <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">My Assignments</h1>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground md:text-base">
                Live assignment workload, submissions, grades, reminders, and teacher support for {payload?.currentUser?.name || "this student"}.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button type="button" variant="outline" onClick={refresh} disabled={refreshing}>
                <RefreshCcw className={cn("size-4", refreshing && "animate-spin")} />
                {refreshing ? "Refreshing" : "Refresh"}
              </Button>
              <Button type="button" variant="outline" onClick={exportJson} disabled={!payload}>
                <Download className="size-4" />
                Export
              </Button>
              <Button type="button" variant="outline" onClick={exportCsv} disabled={!payload}>
                <Download className="size-4" />
                CSV
              </Button>
              <Button type="button" variant="outline" onClick={() => window.print()}>
                <Printer className="size-4" />
                Print work plan
              </Button>
              <Button type="button" onClick={() => setHelpOpen(true)}>
                <HelpCircle className="size-4" />
                Assignment help
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Assignments", value: payload?.metrics?.totalAssignments ?? assignments.length, helper: `${payload?.metrics?.pending ?? 0} pending`, icon: FileText },
          { label: "Submitted", value: payload?.metrics?.submitted ?? 0, helper: "Awaiting grading", icon: CheckCircle2 },
          { label: "Average Grade", value: `${payload?.metrics?.averageScore ?? 0}%`, helper: `${payload?.metrics?.graded ?? 0} graded`, icon: Trophy },
          { label: "Late", value: payload?.metrics?.late ?? 0, helper: "Needs action", icon: AlertCircle },
        ].map((metric) => {
          const Icon = metric.icon
          return (
            <Card key={metric.label}>
              <CardContent className="flex items-start justify-between gap-4 p-5">
                <div>
                  <p className="text-sm text-muted-foreground">{metric.label}</p>
                  <p className="mt-2 text-3xl font-semibold">{loading ? <Loader2 className="size-6 animate-spin" /> : metric.value}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{metric.helper}</p>
                </div>
                <div className="rounded-2xl bg-primary/10 p-3 text-primary">
                  <Icon className="size-5" />
                </div>
              </CardContent>
            </Card>
          )
        })}
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="size-5" />
              Next Assignment Due
            </CardTitle>
            <CardDescription>Submit, review instructions, or save a reminder from the live tenant feed.</CardDescription>
          </CardHeader>
          <CardContent>
            {nextDue ? (
              <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
                <div>
                  <p className="text-xl font-semibold">{nextDue.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{nextDue.subject} - {formatDate(nextDue.dueDate)} - {nextDue.totalScore} marks</p>
                  <p className="mt-3 rounded-2xl bg-muted/50 p-3 text-sm">{nextDue.instructions || nextDue.description || "No special instructions have been published."}</p>
                </div>
                <div className="flex flex-wrap gap-2 md:flex-col">
                  <Button type="button" onClick={() => setSubmissionAssignment(nextDue)}>
                    <Send className="size-4" />
                    Submit
                  </Button>
                  <Button type="button" variant="outline" onClick={() => toggleReminder(nextDue)}>
                    <Bell className="size-4" />
                    {reminders.includes(nextDue.id) ? "Reminder saved" : "Set reminder"}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setSelectedAssignment(nextDue)}>
                    <Eye className="size-4" />
                    Details
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No pending assignment is currently due.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Navigation and communication actions are fully wired.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            <Button type="button" variant="outline" className="justify-between" onClick={() => router.push(studentHref("/student/assessments"))}>
              <span className="flex items-center gap-2"><CalendarClock className="size-4" />Open assessments</span>
            </Button>
            <Button type="button" variant="outline" className="justify-between" onClick={() => router.push(studentHref("/student/subjects"))}>
              <span className="flex items-center gap-2"><BookOpen className="size-4" />Open subjects</span>
            </Button>
            <Button type="button" variant="outline" className="justify-between" onClick={() => setMessageOpen(true)}>
              <span className="flex items-center gap-2"><MessageSquare className="size-4" />Message teacher</span>
            </Button>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Work Plan</CardTitle>
            <CardDescription>Pinned assignments and near-deadline work from your tenant data.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            {[...pinnedAssignments, ...dueThisWeek.filter((item) => !pinnedIds.includes(item.id))].slice(0, 6).map((assignment) => (
              <button
                key={assignment.id}
                type="button"
                onClick={() => setSelectedAssignment(assignment)}
                className="rounded-2xl border p-4 text-left transition-colors hover:bg-muted/60"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{assignment.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{assignment.subject} - {formatDate(assignment.dueDate)}</p>
                  </div>
                  <Badge variant="outline" className={statusStyles[assignment.status]}>{pinnedIds.includes(assignment.id) ? "Pinned" : formatStatus(assignment.status)}</Badge>
                </div>
              </button>
            ))}
            {!pinnedAssignments.length && !dueThisWeek.length ? <p className="rounded-2xl border p-6 text-center text-sm text-muted-foreground md:col-span-2">No pinned or urgent assignments. Pin assignments from the workspace to build a work plan.</p> : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Workflow Health</CardTitle>
            <CardDescription>Student-owned assignment controls saved server-side.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between rounded-xl border p-3"><span>Server reminders</span><Badge>{reminders.length}</Badge></div>
            <div className="flex items-center justify-between rounded-xl border p-3"><span>Pinned work</span><Badge>{pinnedIds.length}</Badge></div>
            <div className="flex items-center justify-between rounded-xl border p-3"><span>Due this week</span><Badge>{dueThisWeek.length}</Badge></div>
            <div className="flex items-center justify-between rounded-xl border p-3"><span>Attention items</span><Badge variant="outline">{attentionItems.length}</Badge></div>
          </CardContent>
        </Card>
      </section>

      <Tabs defaultValue="workspace" className="space-y-4">
        <TabsList className="flex h-auto w-full flex-wrap justify-start">
          <TabsTrigger value="workspace">Workspace</TabsTrigger>
          <TabsTrigger value="grades">Grades</TabsTrigger>
          <TabsTrigger value="subjects">Subjects</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="workspace" className="space-y-4">
          <Card>
            <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input className="pl-9" placeholder="Search assignments, subjects, types, teachers..." value={query} onChange={(event) => setQuery(event.target.value)} />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-48"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {Object.keys(statusStyles).map((status) => <SelectItem key={status} value={status}>{formatStatus(status)}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={subjectFilter} onValueChange={setSubjectFilter}>
                <SelectTrigger className="w-full md:w-52"><SelectValue placeholder="Subject" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All subjects</SelectItem>
                  {subjects.map((subject) => <SelectItem key={subject.id} value={subject.id || subject.name}>{subject.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-full md:w-44"><SelectValue placeholder="Sort" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="due">Sort by due date</SelectItem>
                  <SelectItem value="subject">Sort by subject</SelectItem>
                  <SelectItem value="status">Sort by status</SelectItem>
                  <SelectItem value="score">Sort by score</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            {filteredAssignments.map((assignment) => (
              <Card key={assignment.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle>{assignment.title}</CardTitle>
                      <CardDescription>{assignment.subject} - {formatDate(assignment.dueDate)}</CardDescription>
                    </div>
                    <Badge variant="outline" className={statusStyles[assignment.status]}>{formatStatus(assignment.status)}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                    <span className="flex items-center gap-2"><Clock3 className="size-4" />{assignment.type}</span>
                    <span className="flex items-center gap-2"><Trophy className="size-4" />{assignment.totalScore} marks</span>
                    <span className="flex items-center gap-2"><MessageSquare className="size-4" />{assignment.teacher}</span>
                    <span className="flex items-center gap-2"><FileText className="size-4" />{assignment.attachments ? "Resources attached" : "No attachments"}</span>
                  </div>
                  {assignment.grade ? (
                    <div className="rounded-2xl border p-3">
                      <div className="flex items-center justify-between text-sm">
                        <span>Grade</span>
                        <span className={cn("font-semibold", scoreTone(assignment.grade.percentage))}>{assignment.grade.percentage}% ({assignment.grade.letter})</span>
                      </div>
                      <Progress value={Math.min(100, Math.max(0, assignment.grade.percentage))} className="mt-2 h-2" />
                    </div>
                  ) : (
                    <p className="rounded-2xl bg-muted/50 p-3 text-sm">{assignment.instructions || assignment.description || "No instructions have been published."}</p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {["pending", "late"].includes(assignment.status) ? (
                      <Button type="button" size="sm" onClick={() => setSubmissionAssignment(assignment)}>
                        <Send className="size-4" />
                        Submit
                      </Button>
                    ) : null}
                    <Button type="button" size="sm" variant="outline" onClick={() => setSelectedAssignment(assignment)}>
                      <Eye className="size-4" />
                      Details
                    </Button>
                    <Button type="button" size="sm" variant="outline" onClick={() => toggleReminder(assignment)}>
                      <Bell className="size-4" />
                      {reminders.includes(assignment.id) ? "Reminder saved" : "Reminder"}
                    </Button>
                    <Button type="button" size="sm" variant="outline" disabled={actingId === assignment.id} onClick={() => togglePinned(assignment)}>
                      <Target className="size-4" />
                      {pinnedIds.includes(assignment.id) ? "Pinned" : "Pin"}
                    </Button>
                    <Button type="button" size="sm" variant="outline" onClick={() => {
                      setSelectedAssignment(assignment)
                      setMessageOpen(true)
                    }}>
                      <MessageSquare className="size-4" />
                      Message
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          {!filteredAssignments.length ? (
            <Card>
              <CardContent className="p-8 text-center text-sm text-muted-foreground">
                {loading ? "Loading assignments..." : "No assignments match the current filters."}
              </CardContent>
            </Card>
          ) : null}
        </TabsContent>

        <TabsContent value="grades">
          <Card>
            <CardHeader>
              <CardTitle>Assignment Grades</CardTitle>
              <CardDescription>Published gradebook scores for assignment-style work.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Assignment</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Grade</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {gradedAssignments.map((assignment) => (
                    <TableRow key={assignment.id}>
                      <TableCell className="font-medium">{assignment.title}</TableCell>
                      <TableCell>{assignment.subject}</TableCell>
                      <TableCell className={cn("font-semibold", scoreTone(assignment.grade?.percentage || 0))}>{assignment.grade?.percentage || 0}%</TableCell>
                      <TableCell><Badge variant="outline">{assignment.grade?.letter || "N/A"}</Badge></TableCell>
                      <TableCell className="text-right">
                        <Button type="button" size="sm" variant="outline" onClick={() => setSelectedAssignment(assignment)}>
                          <Eye className="size-4" />
                          Feedback
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!gradedAssignments.length ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                        {loading ? "Loading grades..." : "No assignment grades have been published yet."}
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subjects" className="grid gap-4 lg:grid-cols-2">
          {subjects.map((subject) => (
            <Card key={subject.id || subject.name}>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle>{subject.name}</CardTitle>
                    <CardDescription>{subject.total} assignments - {subject.pending} pending - {subject.submitted} submitted</CardDescription>
                  </div>
                  <Badge variant="outline">{subject.code || "SUBJ"}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span>Assignment average</span>
                  <span className={cn("font-semibold", scoreTone(subject.average))}>{subject.average || 0}%</span>
                </div>
                <Progress value={Math.min(100, Math.max(0, subject.average || 0))} className="h-2" />
                <Button type="button" variant="outline" size="sm" onClick={() => {
                  setSubjectFilter(subject.id || subject.name)
                  toast.info(`Filtered to ${subject.name}`)
                }}>
                  View assignments
                </Button>
              </CardContent>
            </Card>
          ))}
          {!subjects.length ? (
            <Card className="lg:col-span-2">
              <CardContent className="p-8 text-center text-sm text-muted-foreground">Subject assignment summaries will appear once assignments are published.</CardContent>
            </Card>
          ) : null}
        </TabsContent>

        <TabsContent value="activity" className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Submission Activity</CardTitle>
              <CardDescription>Assignment progress and submission events.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {(payload?.progressNotes || []).map((note) => (
                <div key={note.id} className="rounded-2xl border p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium">{note.category || note.type || "Activity"}</p>
                    <Badge variant="outline" className={note.positive ? statusStyles.submitted : statusStyles.pending}>{note.value || "Note"}</Badge>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{note.note || "No note text provided."}</p>
                </div>
              ))}
              {!payload?.progressNotes?.length ? <p className="text-sm text-muted-foreground">No assignment activity has been recorded yet.</p> : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Needs Attention</CardTitle>
              <CardDescription>Late assignments or low assignment scores.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {attentionItems.map((assignment) => (
                <div key={assignment.id} className="rounded-2xl border p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium">{assignment.title}</p>
                    <Badge variant="outline" className={statusStyles[assignment.status]}>{assignment.grade?.percentage ?? formatStatus(assignment.status)}</Badge>
                  </div>
                  <Button type="button" variant="ghost" size="sm" className="mt-3" onClick={() => {
                    setSelectedAssignment(assignment)
                    setHelpOpen(true)
                  }}>
                    <HelpCircle className="size-4" />
                    Request support
                  </Button>
                </div>
              ))}
              {!attentionItems.length ? <p className="text-sm text-muted-foreground">No assignment attention areas from current data.</p> : null}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={Boolean(selectedAssignment)} onOpenChange={(open) => !open && setSelectedAssignment(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedAssignment?.title}</DialogTitle>
            <DialogDescription>{selectedAssignment?.subject} assignment details.</DialogDescription>
          </DialogHeader>
          {selectedAssignment ? (
            <div className="space-y-4">
              <div className="grid gap-3 text-sm sm:grid-cols-2">
                <div className="rounded-xl bg-muted/50 p-3">Due: {formatDate(selectedAssignment.dueDate)}</div>
                <div className="rounded-xl bg-muted/50 p-3">Type: {selectedAssignment.type}</div>
                <div className="rounded-xl bg-muted/50 p-3">Marks: {selectedAssignment.totalScore}</div>
                <div className="rounded-xl bg-muted/50 p-3">Teacher: {selectedAssignment.teacher}</div>
              </div>
              <div>
                <p className="font-medium">Instructions</p>
                <p className="mt-2 rounded-xl border p-3 text-sm text-muted-foreground">{selectedAssignment.instructions || selectedAssignment.description || "No special instructions have been published."}</p>
              </div>
              {selectedAssignment.grade ? (
                <div className="rounded-2xl border p-4">
                  <p className={cn("text-3xl font-semibold", scoreTone(selectedAssignment.grade.percentage))}>{selectedAssignment.grade.percentage}%</p>
                  <p className="text-sm text-muted-foreground">Grade {selectedAssignment.grade.letter} - {selectedAssignment.grade.score}/{selectedAssignment.grade.maxScore}</p>
                  <p className="mt-3 text-sm">Feedback: {selectedAssignment.grade.feedback || "No feedback has been added yet."}</p>
                </div>
              ) : null}
            </div>
          ) : null}
          <DialogFooter>
            {selectedAssignment && ["pending", "late"].includes(selectedAssignment.status) ? (
              <Button type="button" onClick={() => setSubmissionAssignment(selectedAssignment)}>
                <Send className="size-4" />
                Submit
              </Button>
            ) : null}
            {selectedAssignment ? (
              <Button type="button" variant="outline" onClick={() => toggleReminder(selectedAssignment)}>
                <Bell className="size-4" />
                {reminders.includes(selectedAssignment.id) ? "Remove reminder" : "Save reminder"}
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(submissionAssignment)} onOpenChange={(open) => !open && setSubmissionAssignment(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit Assignment</DialogTitle>
            <DialogDescription>{submissionAssignment?.title} will be recorded as submitted for staff review.</DialogDescription>
          </DialogHeader>
          <Textarea value={submissionNote} onChange={(event) => setSubmissionNote(event.target.value)} placeholder="Add a submission note, link, or context for your teacher..." rows={5} />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setSubmissionAssignment(null)}>Cancel</Button>
            <Button type="button" onClick={submitAssignment} disabled={submitting}>
              {submitting ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Assignment Support</DialogTitle>
            <DialogDescription>This creates a real support ticket for academic help.</DialogDescription>
          </DialogHeader>
          <Textarea value={helpMessage} onChange={(event) => setHelpMessage(event.target.value)} placeholder="Explain the assignment, subject, or grade issue..." rows={5} />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setHelpOpen(false)}>Cancel</Button>
            <Button type="button" onClick={sendHelpRequest}>Send request</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={messageOpen} onOpenChange={setMessageOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Message Teacher</DialogTitle>
            <DialogDescription>Send a direct message about an assignment.</DialogDescription>
          </DialogHeader>
          <Textarea value={messageBody} onChange={(event) => setMessageBody(event.target.value)} placeholder="Write your message..." rows={5} />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setMessageOpen(false)}>Cancel</Button>
            <Button type="button" onClick={sendTeacherMessage}>Send message</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
