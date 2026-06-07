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
  ClipboardCheck,
  Clock3,
  Download,
  Eye,
  FileText,
  GraduationCap,
  HelpCircle,
  Loader2,
  MapPin,
  MessageSquare,
  Pin,
  PlayCircle,
  Printer,
  RefreshCcw,
  Search,
  ShieldCheck,
  Trophy,
  UserRound,
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

type ExamStatus = "scheduled" | "available" | "pending-results" | "completed" | "cancelled"

type ExamResult = {
  id: string
  title: string
  type: string
  subjectId: string
  subject: string
  subjectCode: string
  teacherId: string
  teacher: string
  score: number
  maxScore: number
  percentage: number
  grade: string
  feedback: string
  date: string | null
  displayDate: string
  excused: boolean
}

type Exam = {
  id: string
  title: string
  description: string
  assessmentName: string
  subjectId: string
  subject: string
  subjectCode: string
  examDate: string | null
  displayDate: string
  startTime: string
  endTime: string
  location: string
  invigilator: string
  invigilatorId: string
  totalMarks: number
  passingMarks: number
  duration: number
  examType: string
  status: ExamStatus
  rawStatus: string
  instructions: string
  rules: Record<string, unknown>
  result: ExamResult | null
  subjectResults: ExamResult[]
}

type SubjectPerformance = {
  id: string
  name: string
  code: string
  type: string
  entries: number
  average: number
  highest: number
  lowest: number
  grade: string
}

type ExamsPayload = {
  generatedAt: string
  currentUser?: { id: string; name: string; email: string; role: string }
  school?: { id: string; name: string; slug: string; type: string; country: string; currencyCode: string }
  student?: {
    id: string
    userId: string
    admissionNumber: string
    status: string
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
    totalExams: number
    scheduled: number
    available: number
    pendingResults: number
    completed: number
    results: number
    averageScore: number
    highestScore: number
    lowestScore: number
    passingResults: number
    reminders: number
    pinned: number
    reviewed: number
    nextExam: Exam | null
    strongestSubject: SubjectPerformance | null
    needsAttention: number
  }
  reminderIds?: string[]
  pinnedIds?: string[]
  reviewedIds?: string[]
  exams: Exam[]
  results: ExamResult[]
  subjectPerformance: SubjectPerformance[]
  progressNotes: Array<{ id: string; type: string; value: number; note: string; category: string; positive: boolean; createdAt: string | null }>
}

const statusStyles: Record<ExamStatus, string> = {
  scheduled: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300",
  available: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300",
  "pending-results": "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300",
  completed: "border-green-200 bg-green-50 text-green-700 dark:border-green-900/60 dark:bg-green-950/40 dark:text-green-300",
  cancelled: "border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300",
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

export default function ExamsPage() {
  const router = useRouter()
  const pathname = usePathname()
  const [payload, setPayload] = React.useState<ExamsPayload | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [refreshing, setRefreshing] = React.useState(false)
  const [error, setError] = React.useState("")
  const [query, setQuery] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState("all")
  const [sortBy, setSortBy] = React.useState("date")
  const [actingId, setActingId] = React.useState("")
  const [selectedExam, setSelectedExam] = React.useState<Exam | null>(null)
  const [selectedResult, setSelectedResult] = React.useState<ExamResult | null>(null)
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
    return tenant ? `/api/tenant/student/exams?tenant=${encodeURIComponent(tenant)}` : "/api/student/exams"
  }, [tenantPrefix])

  const loadExams = React.useCallback(async (notify = false) => {
    setLoading(true)
    setError("")
    const response = await fetch(endpoint(), { cache: "no-store" }).catch(() => null)
    if (!response?.ok) {
      const data = await response?.json().catch(() => ({}))
      const message = String(data?.error || "Failed to load exams and results")
      setError(message)
      setLoading(false)
      if (notify) toast.error(message)
      return
    }
    setPayload((await response.json()) as ExamsPayload)
    setLoading(false)
    if (notify) toast.success("Exams and results refreshed")
  }, [endpoint])

  React.useEffect(() => {
    void loadExams()
  }, [loadExams])

  const exams = payload?.exams || []
  const results = payload?.results || []
  const subjects = payload?.subjectPerformance || []
  const nextExam = payload?.metrics?.nextExam
  const reminders = payload?.reminderIds || []
  const pinnedIds = payload?.pinnedIds || []
  const reviewedIds = payload?.reviewedIds || []
  const dueThisWeek = exams.filter((exam) => {
    if (!exam.examDate || !["scheduled", "available"].includes(exam.status)) return false
    const time = new Date(exam.examDate).getTime()
    return time >= Date.now() && time <= Date.now() + 7 * 24 * 60 * 60 * 1000
  })
  const pinnedExams = exams.filter((exam) => pinnedIds.includes(exam.id))

  const filteredExams = exams
    .filter((exam) => {
      const haystack = `${exam.title} ${exam.subject} ${exam.location} ${exam.invigilator} ${exam.examType}`.toLowerCase()
      return (statusFilter === "all" || exam.status === statusFilter) && haystack.includes(query.toLowerCase())
    })
    .toSorted((a, b) => {
      if (sortBy === "subject") return a.subject.localeCompare(b.subject)
      if (sortBy === "status") return a.status.localeCompare(b.status)
      return new Date(a.examDate || 0).getTime() - new Date(b.examDate || 0).getTime()
    })

  const recentResults = results.slice(0, 8)
  const attentionSubjects = subjects.filter((subject) => subject.average > 0 && subject.average < 60)

  const refresh = () => {
    setRefreshing(true)
    void loadExams(true).finally(() => setRefreshing(false))
  }

  const runExamAction = async (body: Record<string, unknown>, notify: string) => {
    const id = String(body.examId || body.action || "")
    setActingId(id)
    const response = await fetch(endpoint(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).catch(() => null)
    setActingId("")
    if (!response?.ok) {
      const data = await response?.json().catch(() => ({}))
      toast.error(String(data?.error || "Exam action failed"))
      return false
    }
    toast.success(notify)
    void loadExams()
    return true
  }

  const toggleReminder = (exam: Exam) => {
    void runExamAction({
      action: reminders.includes(exam.id) ? "reminder.remove" : "reminder.add",
      examId: exam.id,
    }, reminders.includes(exam.id) ? "Exam reminder removed" : "Exam reminder saved")
  }

  const togglePinned = (exam: Exam) => {
    void runExamAction({
      action: pinnedIds.includes(exam.id) ? "unpin" : "pin",
      examId: exam.id,
    }, pinnedIds.includes(exam.id) ? "Exam unpinned" : "Exam pinned")
  }

  const markReviewed = (exam: Exam) => {
    void runExamAction({ action: "reviewed", examId: exam.id }, "Exam marked as reviewed")
  }

  const exportJson = () => {
    if (!payload) return
    downloadFile("student-exams-results.json", JSON.stringify(payload, null, 2), "application/json")
    toast.success("Exams export downloaded")
  }

  const exportCsv = () => {
    const rows = [
      ["title", "subject", "status", "date", "time", "location", "score", "grade"],
      ...exams.map((exam) => [
        exam.title,
        exam.subject,
        exam.status,
        formatDate(exam.examDate),
        exam.startTime,
        exam.location,
        exam.result ? `${exam.result.percentage}%` : "",
        exam.result?.grade || "",
      ]),
    ]
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n")
    downloadFile("student-exams-results.csv", csv, "text/csv")
    toast.success("Exams CSV downloaded")
  }

  const openExamWorkspace = (exam: Exam) => {
    if (exam.status === "completed" && exam.result) {
      setSelectedResult(exam.result)
      return
    }
    if (exam.status === "cancelled") {
      toast.error("This exam has been cancelled")
      return
    }
    if (exam.status === "scheduled") {
      setSelectedExam(exam)
      toast.info("Review the exam details and save a reminder")
      return
    }
    router.push(`${studentHref("/student/assessments")}?exam=${encodeURIComponent(exam.id)}`)
    toast.success("Opening exam workspace")
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
        title: "Student exam support request",
        message,
        category: "academic",
        priority: "normal",
        dashboardArea: "student-exams",
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

  const sendExamOfficeMessage = async () => {
    const message = messageBody.trim()
    if (!payload?.student?.classTeacherId) {
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
      body: JSON.stringify({ action: "teacher-message", receiverId: payload.student.classTeacherId, message }),
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
              <p className="font-medium text-destructive">Exams could not be loaded</p>
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
            <Button type="button" variant="outline" onClick={() => void loadExams(true)}>Retry</Button>
          </CardContent>
        </Card>
      ) : null}

      <section className="overflow-hidden rounded-3xl border bg-card shadow-sm">
        <div className="relative p-6 md:p-8">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(245,158,11,0.18),transparent_34%),linear-gradient(135deg,rgba(14,165,233,0.12),transparent_45%)]" />
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
              <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Exams & Results</h1>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground md:text-base">
                Live exam schedule, readiness tools, published results, and support actions for {payload?.currentUser?.name || "this student"}.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button type="button" variant="outline" onClick={exportJson} disabled={!payload}>
                <Download className="size-4" />
                Export
              </Button>
              <Button type="button" variant="outline" onClick={exportCsv} disabled={!payload}>
                <Download className="size-4" />
                CSV
              </Button>
              <Button type="button" variant="outline" onClick={refresh} disabled={refreshing}>
                <RefreshCcw className={cn("size-4", refreshing && "animate-spin")} />
                {refreshing ? "Refreshing" : "Refresh"}
              </Button>
              <Button type="button" variant="outline" onClick={() => window.print()}>
                <Printer className="size-4" />
                Print timetable
              </Button>
              <Button type="button" onClick={() => setHelpOpen(true)}>
                <HelpCircle className="size-4" />
                Exam support
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Total Exams", value: payload?.metrics?.totalExams ?? exams.length, helper: `${payload?.metrics?.scheduled ?? 0} scheduled`, icon: CalendarClock },
          { label: "Available Now", value: payload?.metrics?.available ?? 0, helper: "Can be opened", icon: PlayCircle },
          { label: "Average Score", value: `${payload?.metrics?.averageScore ?? 0}%`, helper: `${payload?.metrics?.results ?? results.length} results`, icon: Trophy },
          { label: "Pending Results", value: payload?.metrics?.pendingResults ?? 0, helper: "Awaiting publication", icon: Clock3 },
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
              <ShieldCheck className="size-5" />
              Exam Readiness
            </CardTitle>
            <CardDescription>Next exam, preparation status, and quick actions.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border p-4">
              <p className="text-sm font-medium">Next exam</p>
              {nextExam ? (
                <div className="mt-3 space-y-3">
                  <div>
                    <p className="text-lg font-semibold">{nextExam.title}</p>
                    <p className="text-sm text-muted-foreground">{nextExam.subject} - {formatDate(nextExam.examDate)}</p>
                  </div>
                  <div className="grid gap-2 text-sm">
                    <span className="flex items-center gap-2"><Clock3 className="size-4 text-muted-foreground" />{nextExam.startTime || "Time pending"} {nextExam.endTime ? `to ${nextExam.endTime}` : ""}</span>
                    <span className="flex items-center gap-2"><MapPin className="size-4 text-muted-foreground" />{nextExam.location}</span>
                    <span className="flex items-center gap-2"><UserRound className="size-4 text-muted-foreground" />{nextExam.invigilator}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" size="sm" onClick={() => openExamWorkspace(nextExam)}>
                      <PlayCircle className="size-4" />
                      {nextExam.status === "available" ? "Open exam" : "View details"}
                    </Button>
                    <Button type="button" size="sm" variant="outline" onClick={() => toggleReminder(nextExam)}>
                      <Bell className="size-4" />
                      {reminders.includes(nextExam.id) ? "Reminder saved" : "Set reminder"}
                    </Button>
                    <Button type="button" size="sm" variant="outline" onClick={() => togglePinned(nextExam)}>
                      <Pin className="size-4" />
                      {pinnedIds.includes(nextExam.id) ? "Pinned" : "Pin"}
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">No upcoming exam has been published for your class.</p>
              )}
            </div>
            <div className="rounded-2xl border p-4">
              <p className="text-sm font-medium">Readiness checklist</p>
              <div className="mt-3 space-y-3 text-sm">
                {[
                  { label: "Review current timetable", done: exams.length > 0 },
                  { label: "Save reminders for upcoming exams", done: reminders.length > 0 },
                  { label: "Check published results", done: results.length > 0 },
                  { label: "Ask for help before exam day", done: Boolean(payload?.progressNotes?.length) },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between rounded-xl bg-muted/40 p-3">
                    <span>{item.label}</span>
                    {item.done ? <CheckCircle2 className="size-4 text-emerald-600" /> : <AlertCircle className="size-4 text-amber-600" />}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Support Desk</CardTitle>
            <CardDescription>Every action here is connected to a real workflow.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            <Button type="button" variant="outline" className="justify-between" onClick={() => setMessageOpen(true)}>
              <span className="flex items-center gap-2"><MessageSquare className="size-4" />Message class teacher</span>
            </Button>
            <Button type="button" variant="outline" className="justify-between" onClick={() => router.push(studentHref("/student/subjects"))}>
              <span className="flex items-center gap-2"><BookOpen className="size-4" />Open subjects</span>
            </Button>
            <Button type="button" variant="outline" className="justify-between" onClick={() => router.push(studentHref("/student/assessments"))}>
              <span className="flex items-center gap-2"><FileText className="size-4" />Open assessments</span>
            </Button>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Exam Work Plan</CardTitle>
            <CardDescription>Pinned exams and exams scheduled within the next seven days.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            {[...pinnedExams, ...dueThisWeek.filter((item) => !pinnedIds.includes(item.id))].slice(0, 6).map((exam) => (
              <button
                key={exam.id}
                type="button"
                onClick={() => setSelectedExam(exam)}
                className="rounded-2xl border p-4 text-left transition-colors hover:bg-muted/60"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{exam.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{exam.subject} - {formatDate(exam.examDate)}</p>
                  </div>
                  <Badge variant="outline" className={statusStyles[exam.status]}>{pinnedIds.includes(exam.id) ? "Pinned" : formatStatus(exam.status)}</Badge>
                </div>
                <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                  <span>{exam.startTime || "Time pending"}</span>
                  <span>{exam.location}</span>
                </div>
              </button>
            ))}
            {!pinnedExams.length && !dueThisWeek.length ? (
              <div className="rounded-2xl border border-dashed p-6 text-sm text-muted-foreground md:col-span-2">
                No pinned or seven-day exam priorities. Pin exams from the schedule to build a plan.
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Workflow Health</CardTitle>
            <CardDescription>Student-owned exam controls saved server-side.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between rounded-xl border p-3"><span>Server reminders</span><Badge>{reminders.length}</Badge></div>
            <div className="flex items-center justify-between rounded-xl border p-3"><span>Pinned exams</span><Badge>{pinnedIds.length}</Badge></div>
            <div className="flex items-center justify-between rounded-xl border p-3"><span>Reviewed exams</span><Badge>{reviewedIds.length}</Badge></div>
            <div className="flex items-center justify-between rounded-xl border p-3"><span>Due this week</span><Badge variant="outline">{dueThisWeek.length}</Badge></div>
          </CardContent>
        </Card>
      </section>

      <Tabs defaultValue="schedule" className="space-y-4">
        <TabsList className="flex h-auto w-full flex-wrap justify-start">
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
          <TabsTrigger value="results">Results</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
        </TabsList>

        <TabsContent value="schedule" className="space-y-4">
          <Card>
            <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input className="pl-9" placeholder="Search exams, subjects, rooms, invigilators..." value={query} onChange={(event) => setQuery(event.target.value)} />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-48"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {Object.keys(statusStyles).map((status) => <SelectItem key={status} value={status}>{formatStatus(status)}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-full md:w-44"><SelectValue placeholder="Sort" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">Sort by date</SelectItem>
                  <SelectItem value="subject">Sort by subject</SelectItem>
                  <SelectItem value="status">Sort by status</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            {filteredExams.map((exam) => (
              <Card key={exam.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle>{exam.title}</CardTitle>
                      <CardDescription>{exam.subject} {exam.subjectCode ? `- ${exam.subjectCode}` : ""}</CardDescription>
                    </div>
                    <Badge variant="outline" className={statusStyles[exam.status]}>{formatStatus(exam.status)}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                    <span className="flex items-center gap-2"><CalendarClock className="size-4" />{formatDate(exam.examDate)}</span>
                    <span className="flex items-center gap-2"><Clock3 className="size-4" />{exam.startTime || "Time pending"} {exam.duration ? `(${exam.duration} min)` : ""}</span>
                    <span className="flex items-center gap-2"><MapPin className="size-4" />{exam.location}</span>
                    <span className="flex items-center gap-2"><UserRound className="size-4" />{exam.invigilator}</span>
                  </div>
                  {exam.instructions ? <p className="rounded-2xl bg-muted/50 p-3 text-sm">{exam.instructions}</p> : null}
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" size="sm" onClick={() => openExamWorkspace(exam)}>
                      {exam.status === "completed" ? <Eye className="size-4" /> : <PlayCircle className="size-4" />}
                      {exam.status === "completed" ? "View result" : exam.status === "available" ? "Open exam" : "View details"}
                    </Button>
                    <Button type="button" size="sm" variant="outline" onClick={() => toggleReminder(exam)}>
                      <Bell className="size-4" />
                      {reminders.includes(exam.id) ? "Reminder saved" : "Reminder"}
                    </Button>
                    <Button type="button" size="sm" variant="outline" onClick={() => togglePinned(exam)} disabled={actingId === exam.id}>
                      <Pin className="size-4" />
                      {pinnedIds.includes(exam.id) ? "Pinned" : "Pin"}
                    </Button>
                    <Button type="button" size="sm" variant="outline" onClick={() => markReviewed(exam)} disabled={reviewedIds.includes(exam.id) || actingId === exam.id}>
                      <ClipboardCheck className="size-4" />
                      {reviewedIds.includes(exam.id) ? "Reviewed" : "Reviewed"}
                    </Button>
                    <Button type="button" size="sm" variant="outline" onClick={() => setSelectedExam(exam)}>
                      <FileText className="size-4" />
                      Details
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          {!filteredExams.length ? (
            <Card>
              <CardContent className="p-8 text-center text-sm text-muted-foreground">
                {loading ? "Loading exam timetable..." : "No exams match the current filters."}
              </CardContent>
            </Card>
          ) : null}
        </TabsContent>

        <TabsContent value="results">
          <Card>
            <CardHeader>
              <CardTitle>Published Results</CardTitle>
              <CardDescription>Scores are loaded from the tenant gradebook for this signed-in student.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Exam</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Grade</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentResults.map((result) => (
                    <TableRow key={result.id}>
                      <TableCell className="font-medium">{result.title}</TableCell>
                      <TableCell>{result.subject}</TableCell>
                      <TableCell>{result.displayDate}</TableCell>
                      <TableCell className={cn("font-semibold", scoreTone(result.percentage))}>{result.percentage}%</TableCell>
                      <TableCell><Badge variant="outline">{result.grade}</Badge></TableCell>
                      <TableCell className="text-right">
                        <Button type="button" size="sm" variant="outline" onClick={() => setSelectedResult(result)}>
                          <Eye className="size-4" />
                          Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!recentResults.length ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                        {loading ? "Loading results..." : "No published exam results yet."}
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="grid gap-4 lg:grid-cols-2">
          {subjects.map((subject) => (
            <Card key={subject.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle>{subject.name}</CardTitle>
                    <CardDescription>{subject.entries} exam result{subject.entries === 1 ? "" : "s"}</CardDescription>
                  </div>
                  <Badge variant="outline">{subject.grade}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span>Average</span>
                  <span className={cn("font-semibold", scoreTone(subject.average))}>{subject.average}%</span>
                </div>
                <Progress value={Math.min(100, Math.max(0, subject.average))} className="h-2" />
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-xl bg-muted/50 p-3"><p className="text-muted-foreground">Highest</p><p className="font-semibold">{subject.highest}%</p></div>
                  <div className="rounded-xl bg-muted/50 p-3"><p className="text-muted-foreground">Lowest</p><p className="font-semibold">{subject.lowest}%</p></div>
                </div>
              </CardContent>
            </Card>
          ))}
          {!subjects.length ? (
            <Card className="lg:col-span-2">
              <CardContent className="p-8 text-center text-sm text-muted-foreground">Subject exam performance will appear after results are published.</CardContent>
            </Card>
          ) : null}
        </TabsContent>

        <TabsContent value="notes" className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Exam Progress Notes</CardTitle>
              <CardDescription>Teacher or school notes connected to exam preparation.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {(payload?.progressNotes || []).map((note) => (
                <div key={note.id} className="rounded-2xl border p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium">{note.type || note.category || "Exam note"}</p>
                    <Badge variant="outline" className={note.positive ? statusStyles.completed : statusStyles["pending-results"]}>{note.value || "Note"}</Badge>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{note.note || "No note text provided."}</p>
                </div>
              ))}
              {!payload?.progressNotes?.length ? <p className="text-sm text-muted-foreground">No exam-specific progress notes yet.</p> : null}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Needs Attention</CardTitle>
              <CardDescription>Subjects with exam average below 60%.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {attentionSubjects.map((subject) => (
                <div key={subject.id} className="rounded-2xl border p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium">{subject.name}</p>
                    <Badge variant="outline" className={statusStyles["pending-results"]}>{subject.average}%</Badge>
                  </div>
                  <Button type="button" variant="ghost" size="sm" className="mt-3" onClick={() => setHelpOpen(true)}>
                    <HelpCircle className="size-4" />
                    Request support
                  </Button>
                </div>
              ))}
              {!attentionSubjects.length ? <p className="text-sm text-muted-foreground">No exam attention areas from current results.</p> : null}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={Boolean(selectedExam)} onOpenChange={(open) => !open && setSelectedExam(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedExam?.title}</DialogTitle>
            <DialogDescription>{selectedExam?.subject} exam details and instructions.</DialogDescription>
          </DialogHeader>
          {selectedExam ? (
            <div className="space-y-4">
              <div className="grid gap-3 text-sm sm:grid-cols-2">
                <div className="rounded-xl bg-muted/50 p-3">Date: {formatDate(selectedExam.examDate)}</div>
                <div className="rounded-xl bg-muted/50 p-3">Time: {selectedExam.startTime || "Pending"} {selectedExam.endTime ? `to ${selectedExam.endTime}` : ""}</div>
                <div className="rounded-xl bg-muted/50 p-3">Room: {selectedExam.location}</div>
                <div className="rounded-xl bg-muted/50 p-3">Marks: {selectedExam.totalMarks} total, {selectedExam.passingMarks} pass</div>
              </div>
              <div>
                <p className="font-medium">Instructions</p>
                <p className="mt-2 rounded-xl border p-3 text-sm text-muted-foreground">{selectedExam.instructions || "No special instructions have been published."}</p>
              </div>
            </div>
          ) : null}
          <DialogFooter>
            {selectedExam ? (
              <>
                <Button type="button" variant="outline" onClick={() => toggleReminder(selectedExam)} disabled={actingId === selectedExam.id}>
                  <Bell className="size-4" />
                  {reminders.includes(selectedExam.id) ? "Remove reminder" : "Save reminder"}
                </Button>
                <Button type="button" variant="outline" onClick={() => togglePinned(selectedExam)} disabled={actingId === selectedExam.id}>
                  <Pin className="size-4" />
                  {pinnedIds.includes(selectedExam.id) ? "Unpin" : "Pin"}
                </Button>
                <Button type="button" variant="outline" onClick={() => markReviewed(selectedExam)} disabled={reviewedIds.includes(selectedExam.id) || actingId === selectedExam.id}>
                  <ClipboardCheck className="size-4" />
                  {reviewedIds.includes(selectedExam.id) ? "Reviewed" : "Mark reviewed"}
                </Button>
              </>
            ) : null}
            <Button type="button" onClick={() => selectedExam && openExamWorkspace(selectedExam)}>
              <PlayCircle className="size-4" />
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(selectedResult)} onOpenChange={(open) => !open && setSelectedResult(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedResult?.title}</DialogTitle>
            <DialogDescription>{selectedResult?.subject} result details.</DialogDescription>
          </DialogHeader>
          {selectedResult ? (
            <div className="space-y-4">
              <div className="rounded-2xl border p-4 text-center">
                <p className={cn("text-4xl font-semibold", scoreTone(selectedResult.percentage))}>{selectedResult.percentage}%</p>
                <p className="mt-1 text-sm text-muted-foreground">Grade {selectedResult.grade} - {selectedResult.score}/{selectedResult.maxScore}</p>
              </div>
              <div className="grid gap-2 text-sm">
                <p>Teacher: {selectedResult.teacher}</p>
                <p>Date: {selectedResult.displayDate}</p>
                <p>Feedback: {selectedResult.feedback || "No feedback has been added yet."}</p>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Exam Support</DialogTitle>
            <DialogDescription>This creates a real feedback ticket for the student support workflow.</DialogDescription>
          </DialogHeader>
          <Textarea value={helpMessage} onChange={(event) => setHelpMessage(event.target.value)} placeholder="Explain the exam, subject, or result issue..." rows={5} />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setHelpOpen(false)}>Cancel</Button>
            <Button type="button" onClick={sendHelpRequest}>Send request</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={messageOpen} onOpenChange={setMessageOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Message Class Teacher</DialogTitle>
            <DialogDescription>Send a direct message about exam preparation or results.</DialogDescription>
          </DialogHeader>
          <Textarea value={messageBody} onChange={(event) => setMessageBody(event.target.value)} placeholder="Write your message..." rows={5} />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setMessageOpen(false)}>Cancel</Button>
            <Button type="button" onClick={sendExamOfficeMessage}>Send message</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
