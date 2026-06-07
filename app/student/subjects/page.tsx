"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  ArrowLeft,
  ArrowRight,
  Award,
  BarChart3,
  BookOpen,
  CalendarClock,
  ClipboardCheck,
  Download,
  FileText,
  GraduationCap,
  HelpCircle,
  MessageSquare,
  RefreshCcw,
  Search,
  Star,
  Target,
  TrendingUp,
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

type SubjectStatus = "graded" | "submitted" | "pending" | "late"

type Subject = {
  id: string
  name: string
  code: string
  description: string
  type: string
  teacherId: string
  teacher: string
  progress: number
  grade: string
  lastAssessmentAt: string | null
  gradeCount: number
  assessmentCount: number
  pendingAssessments: number
  upcomingAssessments: number
  recentGrades: Array<{
    id: string
    title: string
    type: string
    score: number
    maxScore: number
    percentage: number
    grade: string
    notes: string
    date: string | null
  }>
  assessments: Array<{
    id: string
    title: string
    description: string
    type: string
    dueDate: string | null
    totalScore: number
    status: SubjectStatus
    instructions: string
    hasResources: boolean
  }>
  progressNotes: Array<{
    id: string
    type: string
    value: number
    note: string
    category: string
    positive: boolean
    createdAt: string | null
  }>
}

type SubjectsPayload = {
  currentUser?: { id: string; name: string; email: string; role: string }
  school?: { id: string; name: string; slug: string; type: string; currencyCode: string }
  student?: {
    id: string
    admissionNumber: string
    className: string
    classGrade: string
    classSection: string
    classTeacher: string
    term: string
    academicYear: string
  }
  metrics?: {
    totalSubjects: number
    averageProgress: number
    totalAssessments: number
    pendingAssessments: number
    savedSubjects: number
    strongestSubject: Subject | null
    needsAttention: number
  }
  savedSubjectIds?: string[]
  subjects: Subject[]
}

const statusStyles: Record<SubjectStatus, string> = {
  graded: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300",
  late: "border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300",
  pending: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300",
  submitted: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300",
}

function formatDate(value: string | null) {
  if (!value) return "Not scheduled"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Not scheduled"
  return new Intl.DateTimeFormat("en", { month: "short", day: "2-digit", year: "numeric" }).format(date)
}

function formatStatus(value: string) {
  return value.replace("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase())
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

export default function SubjectsPage() {
  const router = useRouter()
  const pathname = usePathname()
  const [payload, setPayload] = React.useState<SubjectsPayload | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [refreshing, setRefreshing] = React.useState(false)
  const [error, setError] = React.useState("")
  const [query, setQuery] = React.useState("")
  const [typeFilter, setTypeFilter] = React.useState("all")
  const [sortBy, setSortBy] = React.useState("name")
  const [actingId, setActingId] = React.useState("")
  const [selectedSubject, setSelectedSubject] = React.useState<Subject | null>(null)
  const [helpOpen, setHelpOpen] = React.useState(false)
  const [helpSubject, setHelpSubject] = React.useState("")
  const [helpMessage, setHelpMessage] = React.useState("")
  const [messageOpen, setMessageOpen] = React.useState(false)
  const [messageSubject, setMessageSubject] = React.useState<Subject | null>(null)
  const [messageBody, setMessageBody] = React.useState("")

  const tenantPrefix = React.useMemo(() => {
    const segments = (pathname ?? "").split("/").filter(Boolean)
    return segments[1] === "student" ? `/${segments[0]}` : ""
  }, [pathname])

  const studentHref = React.useCallback((href: string) => `${tenantPrefix}${href}`, [tenantPrefix])

  const endpoint = React.useCallback(() => {
    const tenant = tenantPrefix ? tenantPrefix.slice(1) : ""
    return tenant ? `/api/tenant/student/subjects?tenant=${encodeURIComponent(tenant)}` : "/api/student/subjects"
  }, [tenantPrefix])

  const loadSubjects = React.useCallback(async (notify = false) => {
    setLoading(true)
    setError("")
    const response = await fetch(endpoint(), { cache: "no-store" }).catch(() => null)
    if (!response?.ok) {
      const data = await response?.json().catch(() => ({}))
      const message = String(data?.error || "Failed to load subjects")
      setError(message)
      setLoading(false)
      if (notify) toast.error(message)
      return
    }
    const data = (await response.json()) as SubjectsPayload
    setPayload(data)
    setHelpSubject(data.subjects[0]?.code || "")
    setLoading(false)
    if (notify) toast.success("Subjects refreshed")
  }, [endpoint])

  React.useEffect(() => {
    void loadSubjects()
  }, [loadSubjects])

  const subjects = payload?.subjects || []
  const savedSubjects = payload?.savedSubjectIds || []
  const subjectTypes = Array.from(new Set(subjects.map((subject) => subject.type).filter(Boolean)))

  const filteredSubjects = subjects
    .filter((subject) => {
      const matchesType = typeFilter === "all" || subject.type === typeFilter
      const haystack = `${subject.name} ${subject.code} ${subject.teacher} ${subject.type}`.toLowerCase()
      return matchesType && haystack.includes(query.toLowerCase())
    })
    .toSorted((a, b) => {
      if (sortBy === "progress") return b.progress - a.progress
      if (sortBy === "pending") return b.pendingAssessments - a.pendingAssessments
      if (sortBy === "grade") return b.grade.localeCompare(a.grade)
      return a.name.localeCompare(b.name)
    })

  const upcomingAssessments = subjects
    .flatMap((subject) =>
      subject.assessments
        .filter((assessment) => assessment.status === "pending" || assessment.status === "late")
        .map((assessment) => ({ ...assessment, subjectName: subject.name, subjectCode: subject.code }))
    )
    .toSorted((a, b) => new Date(a.dueDate || 0).getTime() - new Date(b.dueDate || 0).getTime())
    .slice(0, 6)

  const teacherDirectory = Array.from(
    subjects.reduce((map, subject) => {
      if (!subject.teacherId) return map
      const existing = map.get(subject.teacherId) || { id: subject.teacherId, name: subject.teacher, subjects: [] as Subject[] }
      existing.subjects.push(subject)
      map.set(subject.teacherId, existing)
      return map
    }, new Map<string, { id: string; name: string; subjects: Subject[] }>())
  ).map(([, teacher]) => teacher)

  const attentionSubjects = subjects
    .filter((subject) => subject.progress > 0 && subject.progress < 60)
    .toSorted((a, b) => a.progress - b.progress)

  const strongestSubjects = subjects
    .filter((subject) => subject.progress > 0)
    .toSorted((a, b) => b.progress - a.progress)
    .slice(0, 3)

  const savedSubjectRows = subjects.filter((subject) => savedSubjects.includes(subject.id))

  const assessmentStats = subjects.reduce(
    (stats, subject) => {
      for (const assessment of subject.assessments) {
        stats.total += 1
        stats[assessment.status] += 1
      }
      return stats
    },
    { total: 0, graded: 0, submitted: 0, pending: 0, late: 0 } as Record<SubjectStatus | "total", number>
  )

  const resourceSubjects = subjects
    .map((subject) => ({
      subject,
      resources: subject.assessments.filter((assessment) => assessment.hasResources),
    }))
    .filter((entry) => entry.resources.length > 0)

  const allAssessments = subjects.flatMap((subject) =>
    subject.assessments.map((assessment) => ({
      ...assessment,
      subjectId: subject.id,
      subjectName: subject.name,
      subjectCode: subject.code,
      teacher: subject.teacher,
    }))
  )

  const dueThisWeek = allAssessments
    .filter((assessment) => {
      if (!assessment.dueDate || !["pending", "late"].includes(assessment.status)) return false
      const due = new Date(assessment.dueDate).getTime()
      return due <= Date.now() + 7 * 24 * 60 * 60 * 1000
    })
    .toSorted((a, b) => new Date(a.dueDate || 0).getTime() - new Date(b.dueDate || 0).getTime())

  const recentGradeActivity = subjects
    .flatMap((subject) => subject.recentGrades.map((grade) => ({ ...grade, subjectName: subject.name, subjectCode: subject.code })))
    .toSorted((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime())
    .slice(0, 6)

  const subjectPlans = subjects
    .map((subject) => {
      const late = subject.assessments.filter((assessment) => assessment.status === "late").length
      const pending = subject.assessments.filter((assessment) => assessment.status === "pending").length
      const graded = subject.assessments.filter((assessment) => assessment.status === "graded").length
      const resources = subject.assessments.filter((assessment) => assessment.hasResources).length
      const nextWork = subject.assessments
        .filter((assessment) => assessment.status === "pending" || assessment.status === "late")
        .toSorted((a, b) => new Date(a.dueDate || 0).getTime() - new Date(b.dueDate || 0).getTime())[0] || null
      const riskScore = late * 35 + pending * 12 + (subject.progress > 0 && subject.progress < 60 ? 30 : 0) + (subject.gradeCount === 0 ? 8 : 0)
      return {
        subject,
        late,
        pending,
        graded,
        resources,
        nextWork,
        evidenceCoverage: subject.assessmentCount ? Math.round((graded / subject.assessmentCount) * 100) : 0,
        riskScore,
      }
    })
    .toSorted((a, b) => b.riskScore - a.riskScore || a.subject.name.localeCompare(b.subject.name))

  const priorityPlans = subjectPlans.filter((plan) => plan.riskScore > 0).slice(0, 5)
  const coverageAverage = subjectPlans.length
    ? Math.round(subjectPlans.reduce((total, plan) => total + plan.evidenceCoverage, 0) / subjectPlans.length)
    : 0
  const teacherLoad = teacherDirectory
    .map((teacher) => ({
      ...teacher,
      pending: teacher.subjects.reduce((total, subject) => total + subject.pendingAssessments, 0),
      averageProgress: teacher.subjects.length
        ? Math.round(teacher.subjects.reduce((total, subject) => total + subject.progress, 0) / teacher.subjects.length)
        : 0,
    }))
    .toSorted((a, b) => b.pending - a.pending || a.name.localeCompare(b.name))

  const typeStats = subjectTypes.map((type) => ({
    type,
    count: subjects.filter((subject) => subject.type === type).length,
    average: Math.round(
      subjects.filter((subject) => subject.type === type).reduce((total, subject) => total + subject.progress, 0) /
        Math.max(1, subjects.filter((subject) => subject.type === type).length)
    ),
  }))

  const refresh = () => {
    setRefreshing(true)
    void loadSubjects(true).finally(() => setRefreshing(false))
  }

  const runSubjectAction = async (body: Record<string, unknown>, notify: string) => {
    const id = String(body.subjectId || body.action || "")
    setActingId(id)
    const response = await fetch(endpoint(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).catch(() => null)
    setActingId("")
    if (!response?.ok) {
      const data = await response?.json().catch(() => ({}))
      toast.error(String(data?.error || "Subject action failed"))
      return false
    }
    toast.success(notify)
    void loadSubjects()
    return true
  }

  const toggleSaved = (subjectId: string) => {
    void runSubjectAction({
      action: savedSubjects.includes(subjectId) ? "subject.unsave" : "subject.save",
      subjectId,
    }, savedSubjects.includes(subjectId) ? "Subject removed from saved list" : "Subject saved")
  }

  const exportJson = () => {
    if (!payload) return
    downloadFile("student-subjects.json", JSON.stringify(payload, null, 2), "application/json")
    toast.success("Subjects export downloaded")
  }

  const exportCsv = () => {
    const rows = [
      ["subject", "code", "type", "teacher", "progress", "grade", "assessments", "pending"],
      ...subjects.map((subject) => [
        subject.name,
        subject.code,
        subject.type,
        subject.teacher,
        `${subject.progress}%`,
        subject.grade,
        subject.assessmentCount,
        subject.pendingAssessments,
      ]),
    ]
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n")
    downloadFile("student-subjects.csv", csv, "text/csv")
    toast.success("Subjects CSV downloaded")
  }

  const exportStudyPlan = () => {
    const rows = [
      ["subject", "code", "progress", "grade", "pending", "late", "next_work", "due_date", "teacher"],
      ...subjectPlans.map((plan) => [
        plan.subject.name,
        plan.subject.code,
        `${plan.subject.progress}%`,
        plan.subject.grade,
        plan.pending,
        plan.late,
        plan.nextWork?.title || "",
        formatDate(plan.nextWork?.dueDate || null),
        plan.subject.teacher,
      ]),
    ]
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n")
    downloadFile("student-subject-study-plan.csv", csv, "text/csv")
    toast.success("Study plan downloaded")
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
        title: `Subject help: ${helpSubject || "General"}`,
        message,
        category: "academic",
        priority: "normal",
        dashboardArea: "student-subjects",
      }),
    }).catch(() => null)
    if (!response?.ok) {
      const data = await response?.json().catch(() => ({}))
      toast.error(String(data?.error || "Failed to send help request"))
      return
    }
    setHelpMessage("")
    setHelpOpen(false)
    toast.success("Help request sent")
  }

  const sendTeacherMessage = async () => {
    const message = messageBody.trim()
    if (!messageSubject?.teacherId) {
      router.push(studentHref("/student/messages"))
      toast.info("Open messages to select a teacher")
      return
    }
    if (!message) {
      toast.error("Message cannot be empty")
      return
    }
    const response = await fetch(endpoint(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "teacher-message", receiverId: messageSubject.teacherId, message }),
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button variant="ghost" className="w-fit" onClick={() => router.back()}>
          <ArrowLeft className="size-4" />
          Back
        </Button>
      </div>

      {error ? (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium text-destructive">Subjects could not be loaded</p>
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
            <Button type="button" variant="outline" onClick={() => void loadSubjects(true)}>Retry</Button>
          </CardContent>
        </Card>
      ) : null}

      <section className="overflow-hidden rounded-3xl border bg-card shadow-sm">
        <div className="relative p-6 md:p-8">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(14,165,233,0.16),transparent_34%),linear-gradient(135deg,rgba(34,197,94,0.10),transparent_45%)]" />
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
              <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">My Subjects</h1>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground md:text-base">
                Live enrolled subjects, teachers, assessment progress, resources, and support actions for {payload?.currentUser?.name || "this student"}.
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
              <Button type="button" variant="outline" onClick={() => setHelpOpen(true)}>
                <HelpCircle className="size-4" />
                Request subject help
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Subjects", value: payload?.metrics?.totalSubjects ?? subjects.length, helper: "Enrolled", icon: BookOpen },
          { label: "Average Progress", value: `${payload?.metrics?.averageProgress ?? 0}%`, helper: "Across subjects", icon: TrendingUp },
          { label: "Assessments", value: payload?.metrics?.totalAssessments ?? 0, helper: `${payload?.metrics?.pendingAssessments ?? 0} pending`, icon: FileText },
          { label: "Due This Week", value: dueThisWeek.length, helper: `${coverageAverage}% coverage`, icon: CalendarClock },
        ].map((metric) => {
          const Icon = metric.icon
          return (
            <Card key={metric.label}>
              <CardContent className="flex items-start justify-between gap-4 p-5">
                <div>
                  <p className="text-sm text-muted-foreground">{metric.label}</p>
                  <p className="mt-2 text-3xl font-semibold">{metric.value}</p>
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
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Target className="size-5" />
                  Priority Study Plan
                </CardTitle>
                <CardDescription>Ranked from live grades, pending work, late work, and available evidence.</CardDescription>
              </div>
              <Button type="button" variant="outline" onClick={exportStudyPlan} disabled={!subjects.length}>
                <Download className="size-4" />
                Study plan CSV
              </Button>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            {(priorityPlans.length ? priorityPlans : subjectPlans.slice(0, 4)).map((plan) => (
              <div key={plan.subject.id} className="rounded-2xl border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{plan.subject.name}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{plan.subject.code} - {plan.subject.teacher}</p>
                  </div>
                  <Badge variant="outline" className={plan.late ? statusStyles.late : plan.pending ? statusStyles.pending : statusStyles.submitted}>
                    {plan.late ? `${plan.late} late` : plan.pending ? `${plan.pending} pending` : "Clear"}
                  </Badge>
                </div>
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Evidence coverage</span>
                    <span className="font-medium">{plan.evidenceCoverage}%</span>
                  </div>
                  <Progress value={plan.evidenceCoverage} />
                  <p className="text-sm text-muted-foreground">
                    Next: {plan.nextWork ? `${plan.nextWork.title} due ${formatDate(plan.nextWork.dueDate)}` : "No pending work"}
                  </p>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button type="button" size="sm" variant="outline" onClick={() => setSelectedSubject(plan.subject)}>
                    Open plan
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setHelpSubject(plan.subject.code)
                      setHelpOpen(true)
                    }}
                  >
                    <HelpCircle className="size-4" />
                    Help
                  </Button>
                  <Button type="button" size="sm" variant="outline" asChild>
                    <Link href={studentHref(`/student/resources?subject=${encodeURIComponent(plan.subject.code)}`)}>Resources</Link>
                  </Button>
                </div>
              </div>
            ))}
            {!subjects.length ? (
              <p className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground md:col-span-2">No subjects are available to build a study plan.</p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardCheck className="size-5" />
              Subject Intelligence
            </CardTitle>
            <CardDescription>Quick operational view of workload and grade evidence.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between rounded-xl border p-3">
              <span>Saved subjects</span>
              <Badge>{payload?.metrics?.savedSubjects ?? savedSubjects.length}</Badge>
            </div>
            <div className="flex items-center justify-between rounded-xl border p-3">
              <span>Evidence coverage</span>
              <Badge variant="outline">{coverageAverage}%</Badge>
            </div>
            <div className="flex items-center justify-between rounded-xl border p-3">
              <span>Due this week</span>
              <Badge variant="outline">{dueThisWeek.length}</Badge>
            </div>
            <div className="flex items-center justify-between rounded-xl border p-3">
              <span>Resource-linked subjects</span>
              <Badge variant="outline">{resourceSubjects.length}</Badge>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-4">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="size-5" />
              Learning Health
            </CardTitle>
            <CardDescription>Strengths and attention areas calculated from live subject grades.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border p-4">
              <p className="text-sm font-medium">Strongest subjects</p>
              <div className="mt-3 space-y-3">
                {strongestSubjects.map((subject) => (
                  <button
                    key={subject.id}
                    type="button"
                    className="flex w-full items-center justify-between rounded-xl bg-muted/40 p-3 text-left text-sm hover:bg-muted"
                    onClick={() => setSelectedSubject(subject)}
                  >
                    <span>
                      <span className="block font-medium">{subject.name}</span>
                      <span className="text-xs text-muted-foreground">{subject.code}</span>
                    </span>
                    <Badge variant="outline">{subject.progress}%</Badge>
                  </button>
                ))}
                {!strongestSubjects.length ? <p className="text-sm text-muted-foreground">No graded subjects yet.</p> : null}
              </div>
            </div>
            <div className="rounded-2xl border p-4">
              <p className="text-sm font-medium">Needs attention</p>
              <div className="mt-3 space-y-3">
                {attentionSubjects.slice(0, 3).map((subject) => (
                  <div key={subject.id} className="rounded-xl bg-muted/40 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-medium">{subject.name}</span>
                      <Badge variant="outline" className={statusStyles.pending}>{subject.progress}%</Badge>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      className="mt-2 h-8 px-2 text-xs"
                      onClick={() => {
                        setHelpSubject(subject.code)
                        setHelpOpen(true)
                      }}
                    >
                      <HelpCircle className="size-3.5" />
                      Ask for help
                    </Button>
                  </div>
                ))}
                {!attentionSubjects.length ? <p className="text-sm text-muted-foreground">No subject is below the attention threshold.</p> : null}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="size-5" />
              Assessment Status
            </CardTitle>
            <CardDescription>Workload split across published assessments.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {(["graded", "submitted", "pending", "late"] as SubjectStatus[]).map((status) => (
              <button
                key={status}
                type="button"
                className="flex w-full items-center justify-between rounded-2xl border p-3 text-sm hover:bg-muted/50"
                onClick={() => {
                  setSortBy("pending")
                  if (status === "pending" || status === "late") setTypeFilter("all")
                }}
              >
                <span className="capitalize">{formatStatus(status)}</span>
                <Badge variant="outline" className={statusStyles[status]}>{assessmentStats[status]}</Badge>
              </button>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="size-5" />
              Saved Subjects
            </CardTitle>
            <CardDescription>Quick access to subjects you saved for this student.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {savedSubjectRows.slice(0, 4).map((subject) => (
              <button
                key={subject.id}
                type="button"
                className="flex w-full items-center justify-between rounded-2xl border p-3 text-left text-sm hover:bg-muted/50"
                onClick={() => setSelectedSubject(subject)}
              >
                <span>
                  <span className="block font-medium">{subject.name}</span>
                  <span className="text-xs text-muted-foreground">{subject.code}</span>
                </span>
                <ArrowRight className="size-4" />
              </button>
            ))}
            {!savedSubjectRows.length ? (
              <p className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">Use the star button on any subject to pin it here.</p>
            ) : null}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="size-5" />
              Upcoming Subject Work
            </CardTitle>
            <CardDescription>Pending and late assessments from the live tenant subject feed.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcomingAssessments.map((assessment) => (
              <div key={assessment.id} className="flex flex-col gap-3 rounded-2xl border p-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium">{assessment.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {assessment.subjectCode} - {formatStatus(assessment.type)} - Due {formatDate(assessment.dueDate)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={statusStyles[assessment.status]}>{formatStatus(assessment.status)}</Badge>
                  <Button type="button" variant="outline" asChild>
                    <Link href={studentHref("/student/assignments")}>Open</Link>
                  </Button>
                </div>
              </div>
            ))}
            {!upcomingAssessments.length ? (
              <p className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">No pending subject work is currently published.</p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="size-5" />
              Subject Teachers
            </CardTitle>
            <CardDescription>Contact teachers connected to your enrolled subjects.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {teacherDirectory.slice(0, 5).map((teacher) => (
              <div key={teacher.id} className="flex flex-col gap-3 rounded-2xl border p-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium">{teacher.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {teacher.subjects.map((subject) => subject.code).join(", ")}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setMessageSubject(teacher.subjects[0] || null)
                    setMessageOpen(true)
                  }}
                >
                  <MessageSquare className="size-4" />
                  Message
                </Button>
              </div>
            ))}
            {!teacherDirectory.length ? (
              <p className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">No subject teacher contacts are linked yet.</p>
            ) : null}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="size-5" />
              Resource Center
            </CardTitle>
            <CardDescription>Subjects with published instructions or attachments.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {resourceSubjects.slice(0, 4).map(({ subject, resources }) => (
              <div key={subject.id} className="flex items-center justify-between rounded-2xl border p-3">
                <div>
                  <p className="text-sm font-medium">{subject.name}</p>
                  <p className="text-xs text-muted-foreground">{resources.length} resource-linked assessment(s)</p>
                </div>
                <Button type="button" variant="outline" onClick={() => setSelectedSubject(subject)}>
                  Open
                </Button>
              </div>
            ))}
            {!resourceSubjects.length ? <p className="text-sm text-muted-foreground">No subject resources are published yet.</p> : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarClock className="size-5" />
              Due This Week
            </CardTitle>
            <CardDescription>Near-term subject work that needs attention.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {dueThisWeek.slice(0, 5).map((assessment) => (
              <div key={`${assessment.subjectId}-${assessment.id}`} className="rounded-2xl border p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">{assessment.title}</p>
                    <p className="text-xs text-muted-foreground">{assessment.subjectCode} - {formatDate(assessment.dueDate)}</p>
                  </div>
                  <Badge variant="outline" className={statusStyles[assessment.status]}>{formatStatus(assessment.status)}</Badge>
                </div>
                <Button type="button" variant="ghost" size="sm" className="mt-2 px-2" asChild>
                  <Link href={studentHref("/student/assignments")}>Open assignment</Link>
                </Button>
              </div>
            ))}
            {!dueThisWeek.length ? <p className="text-sm text-muted-foreground">No subject work is due within the next week.</p> : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="size-5" />
              Grade Coverage
            </CardTitle>
            <CardDescription>How much evidence exists for each subject grade.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {subjects.toSorted((a, b) => b.gradeCount - a.gradeCount).slice(0, 5).map((subject) => (
              <div key={subject.id}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span>{subject.code}</span>
                  <span className="text-muted-foreground">{subject.gradeCount} grade(s)</span>
                </div>
                <Progress value={Math.min(subject.gradeCount * 20, 100)} />
              </div>
            ))}
            {!subjects.length ? <p className="text-sm text-muted-foreground">No subjects loaded.</p> : null}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="size-5" />
              Recent Grade Activity
            </CardTitle>
            <CardDescription>Latest subject scores from the tenant gradebook.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentGradeActivity.map((grade) => (
              <div key={grade.id} className="flex items-center justify-between rounded-2xl border p-3">
                <div>
                  <p className="text-sm font-medium">{grade.title}</p>
                  <p className="text-xs text-muted-foreground">{grade.subjectCode} - {formatDate(grade.date)}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{grade.percentage}%</p>
                  <p className="text-xs text-muted-foreground">{grade.grade}</p>
                </div>
              </div>
            ))}
            {!recentGradeActivity.length ? <p className="text-sm text-muted-foreground">No recent subject grades have been published.</p> : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="size-5" />
              Subject Types
            </CardTitle>
            <CardDescription>Distribution and average progress by subject type.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {typeStats.map((entry) => (
              <button
                key={entry.type}
                type="button"
                className="w-full rounded-2xl border p-3 text-left hover:bg-muted/50"
                onClick={() => setTypeFilter(entry.type)}
              >
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{formatStatus(entry.type)}</span>
                  <Badge variant="outline">{entry.count}</Badge>
                </div>
                <div className="mt-2 flex items-center gap-3">
                  <Progress value={entry.average} className="h-2" />
                  <span className="text-xs text-muted-foreground">{entry.average}%</span>
                </div>
              </button>
            ))}
            {!typeStats.length ? <p className="text-sm text-muted-foreground">No subject types available.</p> : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="size-5" />
              Teacher Load
            </CardTitle>
            <CardDescription>Teacher contacts sorted by pending subject work.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {teacherLoad.slice(0, 5).map((teacher) => (
              <div key={teacher.id} className="rounded-2xl border p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">{teacher.name}</p>
                    <p className="text-xs text-muted-foreground">{teacher.subjects.map((subject) => subject.code).join(", ")}</p>
                  </div>
                  <Badge variant="outline">{teacher.pending} pending</Badge>
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                  <span>Average progress</span>
                  <span>{teacher.averageProgress}%</span>
                </div>
              </div>
            ))}
            {!teacherLoad.length ? <p className="text-sm text-muted-foreground">No teacher load data available.</p> : null}
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowRight className="size-5" />
            Quick Actions
          </CardTitle>
          <CardDescription>Shortcuts and exports that work against this student portal.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <Button variant="outline" className="justify-between" asChild>
            <Link href={studentHref("/student/grades")}>
              Open grades
              <ArrowRight className="size-4" />
            </Link>
          </Button>
          <Button variant="outline" className="justify-between" asChild>
            <Link href={studentHref("/student/assignments")}>
              Open assignments
              <ArrowRight className="size-4" />
            </Link>
          </Button>
          <Button variant="outline" className="justify-between" asChild>
            <Link href={studentHref("/student/timetable")}>
              Open timetable
              <ArrowRight className="size-4" />
            </Link>
          </Button>
          <Button variant="outline" className="justify-between" onClick={exportStudyPlan} disabled={!subjects.length}>
            Export study plan
            <Download className="size-4" />
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle>Subject Explorer</CardTitle>
              <CardDescription>Search, filter, sort, and open subject actions.</CardDescription>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search subjects" className="pl-8 sm:w-56" />
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="sm:w-40">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  {subjectTypes.map((type) => <SelectItem key={type} value={type}>{formatStatus(type)}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="sm:w-44">
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="progress">Progress</SelectItem>
                  <SelectItem value="pending">Pending work</SelectItem>
                  <SelectItem value="grade">Grade</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((item) => (
                <div key={item} className="h-56 animate-pulse rounded-2xl border bg-muted/30" />
              ))}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredSubjects.map((subject) => (
                <Card key={subject.id} className="overflow-hidden">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <CardTitle className="text-lg">{subject.name}</CardTitle>
                        <CardDescription>{subject.code} - {subject.teacher}</CardDescription>
                      </div>
                      <Button type="button" variant="ghost" size="icon" onClick={() => toggleSaved(subject.id)} aria-label="Save subject" disabled={actingId === subject.id}>
                        <Star className={cn("size-4", savedSubjects.includes(subject.id) && "fill-current text-amber-500")} />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="mb-1 flex justify-between text-sm">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="font-medium">{subject.progress}%</span>
                      </div>
                      <Progress value={subject.progress} />
                    </div>
                    <div className="grid grid-cols-3 gap-3 text-sm">
                      <div>
                        <p className="text-muted-foreground">Grade</p>
                        <p className="text-xl font-semibold">{subject.grade}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Assessments</p>
                        <p className="text-xl font-semibold">{subject.assessmentCount}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Pending</p>
                        <p className="text-xl font-semibold">{subject.pendingAssessments}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" variant="outline" onClick={() => setSelectedSubject(subject)}>
                        View details
                      </Button>
                      <Button type="button" variant="outline" onClick={() => { setMessageSubject(subject); setMessageOpen(true) }}>
                        <MessageSquare className="size-4" />
                        Teacher
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          {!loading && filteredSubjects.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">No subjects match the current filters.</div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Subject Performance Table</CardTitle>
          <CardDescription>A compact view for grades, workload, and next actions.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Subject</TableHead>
                <TableHead>Teacher</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Grade</TableHead>
                <TableHead>Pending</TableHead>
                <TableHead>Next Work</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSubjects.map((subject) => {
                const plan = subjectPlans.find((item) => item.subject.id === subject.id)
                return (
                  <TableRow key={subject.id}>
                    <TableCell>
                      <p className="font-medium">{subject.name}</p>
                      <p className="text-xs text-muted-foreground">{subject.code} - {formatStatus(subject.type)}</p>
                    </TableCell>
                    <TableCell>{subject.teacher}</TableCell>
                    <TableCell>{subject.progress}%</TableCell>
                    <TableCell>{subject.grade}</TableCell>
                    <TableCell>{subject.pendingAssessments}</TableCell>
                    <TableCell>
                      {plan?.nextWork ? (
                        <span className="text-sm">{plan.nextWork.title} - {formatDate(plan.nextWork.dueDate)}</span>
                      ) : (
                        <span className="text-sm text-muted-foreground">No pending work</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button type="button" variant="ghost" onClick={() => setSelectedSubject(subject)}>
                        Open
                        <ArrowRight className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={Boolean(selectedSubject)} onOpenChange={(open) => !open && setSelectedSubject(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{selectedSubject?.name}</DialogTitle>
            <DialogDescription>{selectedSubject?.code} - {selectedSubject?.teacher}</DialogDescription>
          </DialogHeader>
          {selectedSubject ? (
            <Tabs defaultValue="grades" className="space-y-4">
              <TabsList className="grid grid-cols-4">
                <TabsTrigger value="grades">Grades</TabsTrigger>
                <TabsTrigger value="assessments">Assessments</TabsTrigger>
                <TabsTrigger value="plan">Plan</TabsTrigger>
                <TabsTrigger value="notes">Notes</TabsTrigger>
              </TabsList>
              <TabsContent value="grades" className="space-y-3">
                {selectedSubject.recentGrades.map((grade) => (
                  <div key={grade.id} className="flex items-center justify-between rounded-2xl border p-3">
                    <div>
                      <p className="text-sm font-medium">{grade.title}</p>
                      <p className="text-xs text-muted-foreground">{formatStatus(grade.type)} - {formatDate(grade.date)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{grade.percentage}%</p>
                      <p className="text-xs text-muted-foreground">{grade.score}/{grade.maxScore}</p>
                    </div>
                  </div>
                ))}
                {!selectedSubject.recentGrades.length ? <p className="text-sm text-muted-foreground">No grades recorded for this subject yet.</p> : null}
              </TabsContent>
              <TabsContent value="assessments" className="space-y-3">
                {selectedSubject.assessments.map((assessment) => (
                  <div key={assessment.id} className="rounded-2xl border p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium">{assessment.title}</p>
                        <p className="text-xs text-muted-foreground">{formatStatus(assessment.type)} - Due {formatDate(assessment.dueDate)}</p>
                      </div>
                      <Badge variant="outline" className={statusStyles[assessment.status]}>{formatStatus(assessment.status)}</Badge>
                    </div>
                    {assessment.instructions ? <p className="mt-2 text-xs text-muted-foreground">{assessment.instructions}</p> : null}
                  </div>
                ))}
                {!selectedSubject.assessments.length ? <p className="text-sm text-muted-foreground">No assessments are currently published for this subject.</p> : null}
              </TabsContent>
              <TabsContent value="plan" className="space-y-3">
                {(() => {
                  const plan = subjectPlans.find((item) => item.subject.id === selectedSubject.id)
                  if (!plan) return <p className="text-sm text-muted-foreground">No plan data is available for this subject.</p>
                  return (
                    <>
                      <div className="grid gap-3 sm:grid-cols-3">
                        <div className="rounded-2xl border p-3">
                          <p className="text-xs text-muted-foreground">Evidence</p>
                          <p className="text-2xl font-semibold">{plan.evidenceCoverage}%</p>
                        </div>
                        <div className="rounded-2xl border p-3">
                          <p className="text-xs text-muted-foreground">Pending</p>
                          <p className="text-2xl font-semibold">{plan.pending}</p>
                        </div>
                        <div className="rounded-2xl border p-3">
                          <p className="text-xs text-muted-foreground">Resources</p>
                          <p className="text-2xl font-semibold">{plan.resources}</p>
                        </div>
                      </div>
                      <div className="rounded-2xl border p-4">
                        <p className="font-medium">Recommended next step</p>
                        <p className="mt-2 text-sm text-muted-foreground">
                          {plan.nextWork
                            ? `Focus on ${plan.nextWork.title}, due ${formatDate(plan.nextWork.dueDate)}.`
                            : plan.subject.progress < 60
                              ? "Request teacher support and review recent grades for this subject."
                              : "No urgent work is pending. Keep reviewing resources and grade feedback."}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Button type="button" variant="outline" asChild>
                            <Link href={studentHref("/student/assignments")}>Open assignments</Link>
                          </Button>
                          <Button type="button" variant="outline" asChild>
                            <Link href={studentHref(`/student/resources?subject=${encodeURIComponent(plan.subject.code)}`)}>Open resources</Link>
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              setMessageSubject(plan.subject)
                              setMessageOpen(true)
                            }}
                          >
                            <MessageSquare className="size-4" />
                            Message teacher
                          </Button>
                        </div>
                      </div>
                    </>
                  )
                })()}
              </TabsContent>
              <TabsContent value="notes" className="space-y-3">
                {selectedSubject.progressNotes.map((note) => (
                  <div key={note.id} className="rounded-2xl border p-3">
                    <Badge variant="outline" className={note.positive ? statusStyles.submitted : statusStyles.pending}>{note.category || note.type || "Progress"}</Badge>
                    <p className="mt-2 text-sm">{note.note || "Progress update recorded."}</p>
                  </div>
                ))}
                {!selectedSubject.progressNotes.length ? <p className="text-sm text-muted-foreground">No progress notes are available for this subject.</p> : null}
              </TabsContent>
            </Tabs>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" asChild>
              <Link href={studentHref("/student/grades")}>
                <BarChart3 className="size-4" />
                Open grades
              </Link>
            </Button>
            <Button type="button" asChild>
              <Link href={studentHref("/student/assignments")}>
                <FileText className="size-4" />
                Open assignments
              </Link>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request subject help</DialogTitle>
            <DialogDescription>Send a real support request to the academic team.</DialogDescription>
          </DialogHeader>
          <Select value={helpSubject} onValueChange={setHelpSubject}>
            <SelectTrigger>
              <SelectValue placeholder="Subject" />
            </SelectTrigger>
            <SelectContent>
              {subjects.map((subject) => <SelectItem key={subject.id} value={subject.code}>{subject.code} - {subject.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Textarea value={helpMessage} onChange={(event) => setHelpMessage(event.target.value)} placeholder="Describe what you need help with" />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setHelpOpen(false)}>Cancel</Button>
            <Button type="button" onClick={sendHelpRequest}>
              <HelpCircle className="size-4" />
              Send request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={messageOpen} onOpenChange={setMessageOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Message teacher</DialogTitle>
            <DialogDescription>{messageSubject ? `${messageSubject.name} - ${messageSubject.teacher}` : "Send a direct message"}</DialogDescription>
          </DialogHeader>
          <Textarea value={messageBody} onChange={(event) => setMessageBody(event.target.value)} placeholder="Write your message" />
          <DialogFooter>
            <Button type="button" variant="outline" asChild>
              <Link href={studentHref("/student/messages")}>Open inbox</Link>
            </Button>
            <Button type="button" onClick={sendTeacherMessage}>
              <MessageSquare className="size-4" />
              Send message
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
