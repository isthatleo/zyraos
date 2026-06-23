"use client"

import * as React from "react"
import { AlertTriangle, Bell, CalendarDays, CheckCircle2, ClipboardCheck, Megaphone, RefreshCcw } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { teacherDashboardApi } from "@/lib/teacher-api-client"
import { cn } from "@/lib/utils"

type NotificationPayload = {
  generatedAt: string
  school: { name: string; type: string }
  metrics: { pendingGrading: number; lessonsToday: number; attendanceRate: number; upcomingExams: number }
  announcements: Array<{ id: string; title: string; content: string; createdAt: string | null }>
  alerts: Array<{ id: string; type: string; severity: string; studentName: string; className: string; message: string; createdAt: string }>
  todaysLessons: Array<{ id: string; subject: string; className: string; startTime: string; endTime: string; room: string }>
  assessments: Array<{ id: string; name: string; className: string; subject: string; gradingProgress: number; dueDate: string | null; status: string }>
  exams: Array<{ id: string; name: string; className: string; date: string | null; status: string }>
}

type FeedItem = {
  id: string
  title: string
  detail: string
  meta: string
  priority: "high" | "medium" | "normal"
  kind: "alert" | "announcement" | "lesson" | "grading" | "exam"
}

const KIND_STYLES = {
  alert: "bg-red-50 text-red-700 border-red-200",
  announcement: "bg-blue-50 text-blue-700 border-blue-200",
  lesson: "bg-emerald-50 text-emerald-700 border-emerald-200",
  grading: "bg-amber-50 text-amber-700 border-amber-200",
  exam: "bg-purple-50 text-purple-700 border-purple-200",
}

export default function TeacherNotificationsPage() {
  const [payload, setPayload] = React.useState<NotificationPayload | null>(null)
  const [error, setError] = React.useState("")
  const [filter, setFilter] = React.useState<"all" | FeedItem["kind"]>("all")
  const [refreshing, setRefreshing] = React.useState(false)

  const load = React.useCallback(async () => {
    setRefreshing(true)
    try {
      const response = await fetch(teacherDashboardApi("notifications"), { cache: "no-store", credentials: "include" })
      if (!response.ok) throw new Error(`API error: ${response.status}`)
      setPayload(await response.json())
      setError("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load notifications")
    } finally {
      setRefreshing(false)
    }
  }, [])

  React.useEffect(() => { void load() }, [load])

  const feed = React.useMemo(() => payload ? buildFeed(payload) : [], [payload])
  const filteredFeed = filter === "all" ? feed : feed.filter((item) => item.kind === filter)
  const context = payload ? academicContext(payload) : null

  if (error) return <ErrorState message={error} onRetry={load} />
  if (!payload) return <div className="space-y-6 p-6 lg:p-8"><Skeleton className="h-40 rounded-3xl" /><Skeleton className="h-96 rounded-3xl" /></div>

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <section className="rounded-3xl border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <Badge variant="outline" className="rounded-full">{context?.label} notifications</Badge>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight">{context?.heading}</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              {context?.description}
            </p>
          </div>
          <Button variant="outline" onClick={load} disabled={refreshing} className="gap-2">
            <RefreshCcw className={cn("size-4", refreshing && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Summary icon={AlertTriangle} label={context?.alertsLabel || "Open learner alerts"} value={payload.alerts.length} />
        <Summary icon={CalendarDays} label="Lessons today" value={payload.metrics.lessonsToday} />
        <Summary icon={ClipboardCheck} label="Pending grading" value={payload.metrics.pendingGrading} />
        <Summary icon={CheckCircle2} label="Attendance rate" value={`${payload.metrics.attendanceRate}%`} />
      </section>

      <section className="flex flex-wrap gap-2">
        {(["all", "alert", "announcement", "lesson", "grading", "exam"] as const).map((item) => (
          <Button key={item} variant={filter === item ? "default" : "outline"} size="sm" onClick={() => setFilter(item)}>
            {item}
          </Button>
        ))}
      </section>

      <Card className="rounded-3xl">
        <CardHeader>
          <CardTitle>Action Feed</CardTitle>
          <CardDescription>{filteredFeed.length} current teacher signals</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {filteredFeed.map((item) => (
            <div key={item.id} className="grid gap-3 rounded-2xl border p-4 md:grid-cols-[auto_1fr_auto] md:items-center">
              <div className={cn("flex size-11 items-center justify-center rounded-2xl border", KIND_STYLES[item.kind])}>
                {item.kind === "announcement" ? <Megaphone className="size-5" /> : item.kind === "lesson" ? <CalendarDays className="size-5" /> : item.kind === "grading" ? <ClipboardCheck className="size-5" /> : item.kind === "exam" ? <Bell className="size-5" /> : <AlertTriangle className="size-5" />}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{item.title}</p>
                  <Badge variant={item.priority === "high" ? "destructive" : "secondary"} className="rounded-full">{item.priority}</Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{item.detail}</p>
              </div>
              <p className="text-sm text-muted-foreground">{item.meta}</p>
            </div>
          ))}
          {filteredFeed.length === 0 && <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">No current items for this filter.</div>}
        </CardContent>
      </Card>
    </div>
  )
}

function buildFeed(payload: NotificationPayload): FeedItem[] {
  const items: FeedItem[] = []
  for (const alert of payload.alerts) {
    items.push({ id: alert.id, kind: "alert", priority: alert.severity === "high" ? "high" : "medium", title: alert.studentName, detail: alert.message, meta: alert.className })
  }
  for (const announcement of payload.announcements) {
    items.push({ id: announcement.id, kind: "announcement", priority: "normal", title: announcement.title, detail: announcement.content, meta: announcement.createdAt ? new Date(announcement.createdAt).toLocaleDateString() : "Published" })
  }
  for (const lesson of payload.todaysLessons) {
    items.push({ id: lesson.id, kind: "lesson", priority: "normal", title: lesson.subject, detail: lesson.className, meta: [lesson.startTime, lesson.endTime, lesson.room].filter(Boolean).join(" - ") })
  }
  for (const assessment of payload.assessments.filter((item) => item.gradingProgress < 100).slice(0, 8)) {
    items.push({ id: assessment.id, kind: "grading", priority: assessment.gradingProgress < 50 ? "high" : "medium", title: assessment.name, detail: `${assessment.subject} - ${assessment.className}`, meta: `${assessment.gradingProgress}% graded` })
  }
  for (const exam of payload.exams.filter((item) => item.date && new Date(item.date).getTime() >= Date.now()).slice(0, 6)) {
    items.push({ id: exam.id, kind: "exam", priority: "medium", title: exam.name, detail: exam.className, meta: exam.date ? new Date(exam.date).toLocaleDateString() : exam.status })
  }
  return items
}

function Summary({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: React.ReactNode }) {
  return <Card className="rounded-3xl"><CardContent className="flex items-center justify-between p-5"><div><p className="text-sm text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-semibold">{value}</p></div><Icon className="size-5 text-primary" /></CardContent></Card>
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <div className="p-6 lg:p-8"><Card className="rounded-3xl border-destructive/30 bg-destructive/5"><CardHeader><CardTitle>Unable to Load Teacher Notifications</CardTitle><CardDescription>{message}</CardDescription></CardHeader><CardContent><Button onClick={onRetry}>Retry</Button></CardContent></Card></div>
}

function academicContext(payload: NotificationPayload) {
  const type = payload.school.type.toLowerCase()
  const firstExamName = payload.exams[0]?.name.toLowerCase() || ""
  const isHigherEd = firstExamName.includes("course") || firstExamName.includes("semester")
  if (isHigherEd) {
    return {
      label: "Lecturer / professor",
      heading: "Priority Academic Feed",
      description: "Announcements, student risk, lectures, grading, and assessment signals generated from the current academic workspace.",
      alertsLabel: "Open student alerts",
    }
  }
  if (type.includes("primary")) {
    return {
      label: "Primary teacher",
      heading: "Priority Classroom Feed",
      description: "Announcements, pupil support, class periods, marking, and attendance signals generated from the current classroom workspace.",
      alertsLabel: "Open pupil alerts",
    }
  }
  return {
    label: "Teacher",
    heading: "Priority Teaching Feed",
    description: "Announcements, learner risk, lessons, grading, and exam signals generated from the current teacher workspace.",
    alertsLabel: "Open learner alerts",
  }
}
