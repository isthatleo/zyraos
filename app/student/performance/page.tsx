"use client"

import * as React from "react"
import { usePathname, useRouter } from "next/navigation"
import {
  AlertCircle,
  ArrowLeft,
  BarChart3,
  BookOpen,
  CalendarCheck,
  CheckCircle2,
  Download,
  FileText,
  GraduationCap,
  HelpCircle,
  Loader2,
  MessageSquare,
  Plus,
  Printer,
  RefreshCcw,
  Target,
  TrendingDown,
  TrendingUp,
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

type SubjectInsight = {
  id: string
  name: string
  code: string
  type: string
  gradeCount: number
  assessmentCount: number
  upcomingAssessments: number
  average: number
  highest: number
  lowest: number
  grade: string
  risk: "low" | "medium" | "high"
}

type PerformancePayload = {
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
    averageScore: number
    highestScore: number
    lowestScore: number
    gradeCount: number
    subjectCount: number
    attendanceRate: number
    absentDays: number
    lateDays: number
    upcomingAssessments: number
    overdueAssessments: number
    riskSubjects: number
    activeGoals?: number
    completedGoals?: number
    strongestSubject: SubjectInsight | null
  }
  subjects: SubjectInsight[]
  strongestSubjects: SubjectInsight[]
  attentionSubjects: SubjectInsight[]
  recentGrades: Array<{ id: string; title: string; type: string; subject: string; subjectCode: string; teacher: string; percentage: number; grade: string; feedback: string; date: string | null }>
  performanceTrend: Array<{ key: string; label: string; score: number }>
  attendanceTrend: Array<{ date: string; label: string; present: number; status: string }>
  recommendations: string[]
  goals?: Array<{ id: string; title: string; target: number; dueDate: string | null; status: string; createdAt: string }>
  watchedSubjectIds?: string[]
  progressNotes: Array<{ id: string; type: string; value: number; note: string; category: string; positive: boolean; createdAt: string | null; recordedBy: string }>
}

const riskStyles: Record<SubjectInsight["risk"], string> = {
  low: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300",
  medium: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300",
  high: "border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300",
}

function formatDate(value: string | null) {
  if (!value) return "Not dated"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Not dated"
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

export default function PerformancePage() {
  const router = useRouter()
  const pathname = usePathname()
  const [payload, setPayload] = React.useState<PerformancePayload | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [refreshing, setRefreshing] = React.useState(false)
  const [error, setError] = React.useState("")
  const [helpOpen, setHelpOpen] = React.useState(false)
  const [helpMessage, setHelpMessage] = React.useState("")
  const [messageOpen, setMessageOpen] = React.useState(false)
  const [messageBody, setMessageBody] = React.useState("")
  const [selectedSubject, setSelectedSubject] = React.useState<SubjectInsight | null>(null)
  const [goalOpen, setGoalOpen] = React.useState(false)
  const [goalTitle, setGoalTitle] = React.useState("")
  const [goalTarget, setGoalTarget] = React.useState("80")
  const [goalDueDate, setGoalDueDate] = React.useState("")
  const [actingId, setActingId] = React.useState("")

  const tenantPrefix = React.useMemo(() => {
    const segments = (pathname ?? "").split("/").filter(Boolean)
    return segments[1] === "student" ? `/${segments[0]}` : ""
  }, [pathname])

  const studentHref = React.useCallback((href: string) => `${tenantPrefix}${href}`, [tenantPrefix])
  const endpoint = React.useCallback(() => {
    const tenant = tenantPrefix ? tenantPrefix.slice(1) : ""
    return tenant ? `/api/tenant/student/performance?tenant=${encodeURIComponent(tenant)}` : "/api/student/performance"
  }, [tenantPrefix])

  const loadPerformance = React.useCallback(async (notify = false) => {
    setLoading(true)
    setError("")
    const response = await fetch(endpoint(), { cache: "no-store" }).catch(() => null)
    if (!response?.ok) {
      const data = await response?.json().catch(() => ({}))
      const message = String(data?.error || "Failed to load performance insights")
      setError(message)
      setLoading(false)
      if (notify) toast.error(message)
      return
    }
    setPayload((await response.json()) as PerformancePayload)
    setLoading(false)
    if (notify) toast.success("Performance insights refreshed")
  }, [endpoint])

  React.useEffect(() => {
    void loadPerformance()
  }, [loadPerformance])

  const subjects = payload?.subjects || []
  const metrics = payload?.metrics
  const goals = payload?.goals || []
  const watchedSubjectIds = payload?.watchedSubjectIds || []
  const watchedSubjects = subjects.filter((subject) => watchedSubjectIds.includes(subject.id))
  const activeGoals = goals.filter((goal) => goal.status === "active")
  const completedGoals = goals.filter((goal) => goal.status === "completed")
  const trend = payload?.performanceTrend || []
  const lastTrend = trend[trend.length - 1]?.score || 0
  const previousTrend = trend[trend.length - 2]?.score || lastTrend
  const trendDelta = Math.round((lastTrend - previousTrend) * 10) / 10
  const attendanceAverage = payload?.attendanceTrend?.length
    ? Math.round((payload.attendanceTrend.reduce((sum, item) => sum + item.present, 0) / payload.attendanceTrend.length) * 10) / 10
    : metrics?.attendanceRate || 0

  const refresh = () => {
    setRefreshing(true)
    void loadPerformance(true).finally(() => setRefreshing(false))
  }

  const exportJson = () => {
    if (!payload) return
    downloadFile("student-performance-insights.json", JSON.stringify(payload, null, 2), "application/json")
    toast.success("Performance export downloaded")
  }

  const exportCsv = () => {
    const rows = [
      ["section", "name", "metric", "value", "detail"],
      ...subjects.map((subject) => ["subject", subject.name, "average", `${subject.average}%`, `${subject.risk} risk`]),
      ...(payload?.recentGrades || []).map((grade) => ["grade", grade.title, grade.subject, `${grade.percentage}%`, grade.grade]),
      ...(payload?.progressNotes || []).map((note) => ["note", note.category || note.type, "progress", String(note.value || ""), note.note]),
    ]
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n")
    downloadFile("student-performance-insights.csv", csv, "text/csv")
    toast.success("Performance CSV downloaded")
  }

  const runPerformanceAction = async (body: Record<string, unknown>, notify: string) => {
    const id = String(body.subjectId || body.goalId || body.action || "")
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
    void loadPerformance()
    return true
  }

  const submitGoal = async () => {
    const title = goalTitle.trim()
    if (!title) {
      toast.error("Goal title is required")
      return
    }
    const ok = await runPerformanceAction({
      action: "goal.add",
      title,
      target: Number(goalTarget),
      dueDate: goalDueDate || null,
    }, "Performance goal added")
    if (!ok) return
    setGoalTitle("")
    setGoalTarget("80")
    setGoalDueDate("")
    setGoalOpen(false)
  }

  const sendHelpRequest = async () => {
    const message = helpMessage.trim()
    if (!message) {
      toast.error("Describe what support you need")
      return
    }
    const response = await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Student performance support request",
        message,
        category: "academic",
        priority: "normal",
        dashboardArea: "student-performance",
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
      body: JSON.stringify({ action: "teacher-message", message }),
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
              <p className="font-medium text-destructive">Performance insights could not be loaded</p>
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
            <Button type="button" variant="outline" onClick={() => void loadPerformance(true)}>Retry</Button>
          </CardContent>
        </Card>
      ) : null}

      <section className="overflow-hidden rounded-3xl border bg-card shadow-sm">
        <div className="relative p-6 md:p-8">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,197,94,0.16),transparent_34%),linear-gradient(135deg,rgba(14,165,233,0.12),transparent_45%)]" />
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
              <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Performance Insights</h1>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground md:text-base">
                Live academic trends, subject strengths, attendance signals, progress notes, and action plans for {payload?.currentUser?.name || "this student"}.
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
                Print
              </Button>
              <Button type="button" onClick={() => setHelpOpen(true)}>
                <HelpCircle className="size-4" />
                Get support
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Average Score", value: `${metrics?.averageScore ?? 0}%`, helper: `${metrics?.gradeCount ?? 0} grade entries`, icon: BarChart3 },
          { label: "Attendance", value: `${metrics?.attendanceRate ?? 0}%`, helper: `${metrics?.absentDays ?? 0} absent days`, icon: CalendarCheck },
          { label: "Trend", value: `${trendDelta >= 0 ? "+" : ""}${trendDelta}%`, helper: "Latest vs previous period", icon: trendDelta >= 0 ? TrendingUp : TrendingDown },
          { label: "Risk Subjects", value: metrics?.riskSubjects ?? 0, helper: `${metrics?.overdueAssessments ?? 0} overdue assessments`, icon: AlertCircle },
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
          <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Performance Goals</CardTitle>
              <CardDescription>Student-owned improvement targets saved in the tenant database.</CardDescription>
            </div>
            <Button type="button" onClick={() => setGoalOpen(true)}>
              <Plus className="size-4" />
              Add goal
            </Button>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            {activeGoals.map((goal) => (
              <Card key={goal.id} className="border-dashed">
                <CardContent className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{goal.title}</p>
                      <p className="text-sm text-muted-foreground">Target {goal.target}% {goal.dueDate ? `by ${formatDate(goal.dueDate)}` : ""}</p>
                    </div>
                    <Badge variant="outline">Active</Badge>
                  </div>
                  <Progress value={Math.min(100, Math.max(0, metrics?.averageScore || 0))} className="h-2" />
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" size="sm" variant="outline" disabled={actingId === goal.id} onClick={() => void runPerformanceAction({ action: "goal.complete", goalId: goal.id }, "Goal marked complete")}>
                      <CheckCircle2 className="size-4" />
                      Complete
                    </Button>
                    <Button type="button" size="sm" variant="outline" disabled={actingId === goal.id} onClick={() => void runPerformanceAction({ action: "goal.remove", goalId: goal.id }, "Goal removed")}>Remove</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {!activeGoals.length ? <p className="rounded-2xl border p-6 text-center text-sm text-muted-foreground md:col-span-2">No active performance goals yet. Add one to track a target score or study outcome.</p> : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Watchlist</CardTitle>
            <CardDescription>Subjects you are actively monitoring.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {watchedSubjects.map((subject) => (
              <div key={subject.id} className="flex items-center justify-between gap-3 rounded-xl border p-3">
                <div>
                  <p className="font-medium">{subject.name}</p>
                  <p className={cn("text-sm", scoreTone(subject.average))}>{subject.average}% average</p>
                </div>
                <Button type="button" size="sm" variant="outline" disabled={actingId === subject.id} onClick={() => void runPerformanceAction({ action: "unwatch.subject", subjectId: subject.id }, "Subject removed from watchlist")}>Unwatch</Button>
              </div>
            ))}
            {!watchedSubjects.length ? <p className="rounded-xl border p-4 text-center text-sm text-muted-foreground">Use a subject card to add it to your watchlist.</p> : null}
            {completedGoals.length ? <Badge variant="outline">{completedGoals.length} completed goal(s)</Badge> : null}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="size-5" />
              Performance Trend
            </CardTitle>
            <CardDescription>Gradebook averages grouped by recent academic periods.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {trend.map((item) => (
              <div key={item.key} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>{item.label}</span>
                  <span className={cn("font-semibold", scoreTone(item.score))}>{item.score}%</span>
                </div>
                <Progress value={Math.min(100, Math.max(0, item.score))} className="h-2" />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recommended Actions</CardTitle>
            <CardDescription>Generated from current grades, attendance, and workload.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {(payload?.recommendations || []).map((item) => (
              <div key={item} className="rounded-2xl border p-3 text-sm">{item}</div>
            ))}
            {!payload?.recommendations?.length ? <p className="text-sm text-muted-foreground">No urgent recommendations from current data.</p> : null}
            <Button type="button" variant="outline" className="w-full justify-between" onClick={() => setMessageOpen(true)}>
              <span className="flex items-center gap-2"><MessageSquare className="size-4" />Discuss with class teacher</span>
            </Button>
          </CardContent>
        </Card>
      </section>

      <Tabs defaultValue="subjects" className="space-y-4">
        <TabsList className="flex h-auto w-full flex-wrap justify-start">
          <TabsTrigger value="subjects">Subjects</TabsTrigger>
          <TabsTrigger value="grades">Recent Grades</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="notes">Progress Notes</TabsTrigger>
        </TabsList>

        <TabsContent value="subjects" className="grid gap-4 lg:grid-cols-2">
          {subjects.map((subject) => (
            <Card key={subject.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle>{subject.name}</CardTitle>
                    <CardDescription>{subject.gradeCount} grades - {subject.assessmentCount} assessments</CardDescription>
                  </div>
                  <Badge variant="outline" className={riskStyles[subject.risk]}>{subject.risk} risk</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span>Average</span>
                  <span className={cn("font-semibold", scoreTone(subject.average))}>{subject.average}% ({subject.grade})</span>
                </div>
                <Progress value={Math.min(100, Math.max(0, subject.average))} className="h-2" />
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div className="rounded-xl bg-muted/50 p-3"><p className="text-muted-foreground">High</p><p className="font-semibold">{subject.highest}%</p></div>
                  <div className="rounded-xl bg-muted/50 p-3"><p className="text-muted-foreground">Low</p><p className="font-semibold">{subject.lowest}%</p></div>
                  <div className="rounded-xl bg-muted/50 p-3"><p className="text-muted-foreground">Upcoming</p><p className="font-semibold">{subject.upcomingAssessments}</p></div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" size="sm" variant="outline" onClick={() => setSelectedSubject(subject)}>
                    <Target className="size-4" />
                    Action plan
                  </Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => router.push(studentHref("/student/subjects"))}>
                    <BookOpen className="size-4" />
                    Open subject
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={actingId === subject.id}
                    onClick={() => void runPerformanceAction({ action: watchedSubjectIds.includes(subject.id) ? "unwatch.subject" : "watch.subject", subjectId: subject.id }, watchedSubjectIds.includes(subject.id) ? "Subject removed from watchlist" : "Subject added to watchlist")}
                  >
                    <Target className="size-4" />
                    {watchedSubjectIds.includes(subject.id) ? "Watching" : "Watch"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {!subjects.length ? (
            <Card className="lg:col-span-2">
              <CardContent className="p-8 text-center text-sm text-muted-foreground">Performance insights will appear once grades or assessments are available.</CardContent>
            </Card>
          ) : null}
        </TabsContent>

        <TabsContent value="grades">
          <Card>
            <CardHeader>
              <CardTitle>Recent Gradebook Signals</CardTitle>
              <CardDescription>Latest graded assessments across subjects.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Assessment</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Grade</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(payload?.recentGrades || []).map((grade) => (
                    <TableRow key={grade.id}>
                      <TableCell className="font-medium">{grade.title}</TableCell>
                      <TableCell>{grade.subject}</TableCell>
                      <TableCell>{formatDate(grade.date)}</TableCell>
                      <TableCell className={cn("font-semibold", scoreTone(grade.percentage))}>{grade.percentage}%</TableCell>
                      <TableCell><Badge variant="outline">{grade.grade}</Badge></TableCell>
                    </TableRow>
                  ))}
                  {!payload?.recentGrades?.length ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">No grades are available yet.</TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attendance" className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Attendance Correlation</CardTitle>
              <CardDescription>Attendance consistency compared with current academic average.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-2xl border p-4">
                <div className="flex items-center justify-between text-sm">
                  <span>Attendance rate</span>
                  <span className="font-semibold">{metrics?.attendanceRate ?? 0}%</span>
                </div>
                <Progress value={Math.min(100, Math.max(0, metrics?.attendanceRate || 0))} className="mt-2 h-2" />
              </div>
              <div className="rounded-2xl border p-4">
                <div className="flex items-center justify-between text-sm">
                  <span>Academic average</span>
                  <span className={cn("font-semibold", scoreTone(metrics?.averageScore || 0))}>{metrics?.averageScore ?? 0}%</span>
                </div>
                <Progress value={Math.min(100, Math.max(0, metrics?.averageScore || 0))} className="mt-2 h-2" />
              </div>
              <p className="text-sm text-muted-foreground">Recent marked-day attendance average: {attendanceAverage}%.</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Recent Attendance</CardTitle>
              <CardDescription>Last marked attendance records used in the insight model.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {(payload?.attendanceTrend || []).slice(-8).reverse().map((item) => (
                <div key={item.date} className="flex items-center justify-between rounded-xl border p-3 text-sm">
                  <span>{item.label}</span>
                  <Badge variant="outline" className={item.present ? riskStyles.low : riskStyles.high}>{item.status || "unknown"}</Badge>
                </div>
              ))}
              {!payload?.attendanceTrend?.length ? <p className="text-sm text-muted-foreground">No attendance records are available yet.</p> : null}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notes" className="grid gap-4 lg:grid-cols-2">
          {(payload?.progressNotes || []).map((note) => (
            <Card key={note.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium">{note.category || note.type || "Progress note"}</p>
                  <Badge variant="outline" className={note.positive ? riskStyles.low : riskStyles.medium}>{note.value || "Note"}</Badge>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{note.note || "No note text provided."}</p>
                <p className="mt-2 text-xs text-muted-foreground">{formatDate(note.createdAt)} {note.recordedBy ? `by ${note.recordedBy}` : ""}</p>
              </CardContent>
            </Card>
          ))}
          {!payload?.progressNotes?.length ? (
            <Card className="lg:col-span-2">
              <CardContent className="p-8 text-center text-sm text-muted-foreground">No progress notes are available yet.</CardContent>
            </Card>
          ) : null}
        </TabsContent>
      </Tabs>

      <Dialog open={Boolean(selectedSubject)} onOpenChange={(open) => !open && setSelectedSubject(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedSubject?.name} Action Plan</DialogTitle>
            <DialogDescription>Recommended next steps based on current performance.</DialogDescription>
          </DialogHeader>
          {selectedSubject ? (
            <div className="space-y-3 text-sm">
              <div className="rounded-2xl border p-4">
                <p className={cn("text-3xl font-semibold", scoreTone(selectedSubject.average))}>{selectedSubject.average}%</p>
                <p className="text-muted-foreground">Current average, grade {selectedSubject.grade}</p>
              </div>
              <p>Review recent feedback, complete {selectedSubject.upcomingAssessments} upcoming assessment(s), and contact the teacher if blockers remain.</p>
            </div>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => router.push(studentHref("/student/subjects"))}>Open subjects</Button>
            <Button type="button" onClick={() => setHelpOpen(true)}>Request support</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Performance Support</DialogTitle>
            <DialogDescription>This creates a real academic support ticket.</DialogDescription>
          </DialogHeader>
          <Textarea value={helpMessage} onChange={(event) => setHelpMessage(event.target.value)} placeholder="Explain the subject, trend, attendance, or performance concern..." rows={5} />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setHelpOpen(false)}>Cancel</Button>
            <Button type="button" onClick={sendHelpRequest}>Send request</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={goalOpen} onOpenChange={setGoalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Performance Goal</DialogTitle>
            <DialogDescription>Create a measurable student-owned target.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input value={goalTitle} onChange={(event) => setGoalTitle(event.target.value)} placeholder="Example: Raise Mathematics average to 80%" />
            <Input value={goalTarget} onChange={(event) => setGoalTarget(event.target.value)} type="number" min={1} max={100} placeholder="Target score" />
            <Input value={goalDueDate} onChange={(event) => setGoalDueDate(event.target.value)} type="date" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setGoalOpen(false)}>Cancel</Button>
            <Button type="button" onClick={submitGoal}>Save goal</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={messageOpen} onOpenChange={setMessageOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Message Class Teacher</DialogTitle>
            <DialogDescription>Send a direct message about performance or improvement planning.</DialogDescription>
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
