"use client"

import * as React from "react"
import { usePathname, useRouter } from "next/navigation"
import {
  ArrowLeft,
  Bell,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Download,
  Eye,
  GraduationCap,
  HelpCircle,
  Loader2,
  MapPin,
  MessageSquare,
  Printer,
  RefreshCcw,
  Search,
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

type ScheduleEntry = {
  id: string
  day: string
  period: string
  startTime: string
  endTime: string
  subjectId: string
  subject: string
  subjectCode: string
  teacherId: string
  teacher: string
  room: string
  reminder: boolean
  viewed: boolean
  checkedIn: boolean
}

type ScheduleEvent = {
  id: string
  type: string
  title: string
  date: string | null
  startTime: string
  endTime: string
  location: string
  status: string
  description: string
  reminder: boolean
}

type TimetablePayload = {
  generatedAt: string
  currentUser?: { id: string; name: string; email: string; role: string }
  school?: { id: string; name: string; slug: string; type: string }
  student?: { id: string; userId: string; className: string; classTeacher: string; classTeacherId: string; term: string; academicYear: string }
  settings?: { periodsPerDay: number; schoolStart: string; schoolEnd: string; breaks: Array<{ name: string; day: string; startTime: string; endTime: string }> }
  metrics?: { lessons: number; subjects: number; reminders: number; checkins: number; upcomingEvents: number }
  entries: ScheduleEntry[]
  events: ScheduleEvent[]
  attendance: Array<{ date: string | null; status: string; remarks: string }>
}

const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

function formatDate(value: string | null) {
  if (!value) return "Not dated"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Not dated"
  return new Intl.DateTimeFormat("en", { month: "short", day: "2-digit", year: "numeric" }).format(date)
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

export default function StudentTimetablePage() {
  const router = useRouter()
  const pathname = usePathname()
  const [payload, setPayload] = React.useState<TimetablePayload | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [refreshing, setRefreshing] = React.useState(false)
  const [actingId, setActingId] = React.useState("")
  const [error, setError] = React.useState("")
  const [query, setQuery] = React.useState("")
  const [selectedDay, setSelectedDay] = React.useState("all")
  const [selectedEntry, setSelectedEntry] = React.useState<ScheduleEntry | null>(null)
  const [selectedEvent, setSelectedEvent] = React.useState<ScheduleEvent | null>(null)
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
    return tenant ? `/api/tenant/student/timetable?tenant=${encodeURIComponent(tenant)}` : "/api/student/timetable"
  }, [tenantPrefix])

  const loadSchedule = React.useCallback(async (notify = false) => {
    setLoading(true)
    setError("")
    const response = await fetch(endpoint(), { cache: "no-store" }).catch(() => null)
    if (!response?.ok) {
      const data = await response?.json().catch(() => ({}))
      const message = String(data?.error || "Failed to load schedule")
      setError(message)
      setLoading(false)
      if (notify) toast.error(message)
      return
    }
    setPayload((await response.json()) as TimetablePayload)
    setLoading(false)
    if (notify) toast.success("Schedule refreshed")
  }, [endpoint])

  React.useEffect(() => {
    void loadSchedule()
  }, [loadSchedule])

  const entries = payload?.entries || []
  const events = payload?.events || []
  const timeSlots = Array.from(new Set(entries.map((entry) => entry.startTime).filter(Boolean))).toSorted()
  const filteredEntries = entries.filter((entry) => {
    const haystack = `${entry.subject} ${entry.teacher} ${entry.room} ${entry.day}`.toLowerCase()
    return (selectedDay === "all" || entry.day === selectedDay) && haystack.includes(query.toLowerCase())
  })
  const todayName = new Intl.DateTimeFormat("en", { weekday: "long" }).format(new Date())
  const todayEntries = entries.filter((entry) => entry.day === todayName)
  const nextLesson = todayEntries.toSorted((a, b) => a.startTime.localeCompare(b.startTime))[0] || entries[0] || null

  const runAction = async (action: string, itemId: string, notify: string) => {
    setActingId(itemId)
    const response = await fetch(endpoint(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, itemId }),
    }).catch(() => null)
    setActingId("")
    if (!response?.ok) {
      const data = await response?.json().catch(() => ({}))
      toast.error(String(data?.error || "Action failed"))
      return
    }
    toast.success(notify)
    void loadSchedule()
  }

  const refresh = () => {
    setRefreshing(true)
    void loadSchedule(true).finally(() => setRefreshing(false))
  }

  const exportJson = () => {
    if (!payload) return
    downloadFile("student-schedule.json", JSON.stringify(payload, null, 2), "application/json")
    toast.success("Schedule export downloaded")
  }

  const sendHelpRequest = async () => {
    const message = helpMessage.trim()
    if (!message) {
      toast.error("Describe what schedule help you need")
      return
    }
    const response = await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Student schedule support request", message, category: "academic", priority: "normal", dashboardArea: "student-schedule" }),
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
    const receiverId = selectedEntry?.teacherId || payload?.student?.classTeacherId
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
              <p className="font-medium text-destructive">Schedule could not be loaded</p>
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
            <Button type="button" variant="outline" onClick={() => void loadSchedule(true)}>Retry</Button>
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
              <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">My Schedule</h1>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground md:text-base">
                Live class timetable, upcoming exams, assessment deadlines, reminders, and attendance-aware planning for {payload?.currentUser?.name || "this student"}.
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
              <Button type="button" variant="outline" onClick={() => window.print()}>
                <Printer className="size-4" />
                Print
              </Button>
              <Button type="button" onClick={() => setHelpOpen(true)}>
                <HelpCircle className="size-4" />
                Schedule help
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Lessons", value: payload?.metrics?.lessons ?? entries.length, helper: `${payload?.metrics?.subjects ?? 0} subjects`, icon: CalendarClock },
          { label: "Today", value: todayEntries.length, helper: todayName, icon: Clock3 },
          { label: "Reminders", value: payload?.metrics?.reminders ?? 0, helper: "Saved schedule alerts", icon: Bell },
          { label: "Upcoming", value: payload?.metrics?.upcomingEvents ?? events.length, helper: "Exams and deadlines", icon: CheckCircle2 },
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
            <CardTitle>Next Lesson</CardTitle>
            <CardDescription>Quick actions for the next visible lesson in your timetable.</CardDescription>
          </CardHeader>
          <CardContent>
            {nextLesson ? (
              <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
                <div>
                  <p className="text-xl font-semibold">{nextLesson.subject}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{nextLesson.day} - {nextLesson.startTime} to {nextLesson.endTime} - {nextLesson.room}</p>
                  <p className="mt-2 text-sm text-muted-foreground">Teacher: {nextLesson.teacher}</p>
                </div>
                <div className="flex flex-wrap gap-2 md:flex-col">
                  <Button type="button" onClick={() => void runAction("checkin", nextLesson.id, "Lesson check-in recorded")} disabled={nextLesson.checkedIn || actingId === nextLesson.id}>
                    <CheckCircle2 className="size-4" />
                    {nextLesson.checkedIn ? "Checked in" : "Check in"}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => void runAction(nextLesson.reminder ? "reminder.remove" : "reminder.add", nextLesson.id, nextLesson.reminder ? "Reminder removed" : "Reminder saved")}>
                    <Bell className="size-4" />
                    {nextLesson.reminder ? "Reminder saved" : "Set reminder"}
                  </Button>
                </div>
              </div>
            ) : <p className="text-sm text-muted-foreground">No lesson is published for your class yet.</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Quick Links</CardTitle>
            <CardDescription>Related student pages.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            <Button type="button" variant="outline" className="justify-between" onClick={() => router.push(studentHref("/student/assessments"))}>Open assessments</Button>
            <Button type="button" variant="outline" className="justify-between" onClick={() => router.push(studentHref("/student/exams"))}>Open exams</Button>
            <Button type="button" variant="outline" className="justify-between" onClick={() => setMessageOpen(true)}>Message teacher</Button>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search subject, room, teacher..." value={query} onChange={(event) => setQuery(event.target.value)} />
          </div>
          <Select value={selectedDay} onValueChange={setSelectedDay}>
            <SelectTrigger className="w-full md:w-48"><SelectValue placeholder="Day" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All days</SelectItem>
              {days.map((day) => <SelectItem key={day} value={day}>{day}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Tabs defaultValue="week" className="space-y-4">
        <TabsList className="flex h-auto w-full flex-wrap justify-start">
          <TabsTrigger value="week">Weekly Grid</TabsTrigger>
          <TabsTrigger value="list">Lesson List</TabsTrigger>
          <TabsTrigger value="events">Upcoming Events</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
        </TabsList>

        <TabsContent value="week">
          <Card>
            <CardContent className="overflow-x-auto p-0">
              <table className="w-full min-w-[900px] border-collapse text-sm">
                <thead>
                  <tr>
                    <th className="w-24 border-b border-r bg-muted/40 p-3 text-left">Time</th>
                    {days.slice(0, 6).map((day) => <th key={day} className="border-b bg-muted/40 p-3 text-left">{day}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {(timeSlots.length ? timeSlots : [payload?.settings?.schoolStart || "08:00"]).map((time) => (
                    <tr key={time}>
                      <td className="border-b border-r p-3 font-mono text-xs text-muted-foreground">{time}</td>
                      {days.slice(0, 6).map((day) => {
                        const dayEntries = entries.filter((entry) => entry.day === day && entry.startTime === time)
                        return (
                          <td key={day} className="border-b p-2 align-top">
                            {dayEntries.map((entry) => (
                              <button
                                key={entry.id}
                                type="button"
                                className="mb-2 w-full rounded-xl border bg-card p-3 text-left hover:bg-muted/50"
                                onClick={() => {
                                  setSelectedEntry(entry)
                                  void runAction("view", entry.id, "Lesson marked as viewed")
                                }}
                              >
                                <p className="font-medium">{entry.subject}</p>
                                <p className="text-xs text-muted-foreground">{entry.endTime} - {entry.room}</p>
                                <p className="text-xs text-muted-foreground">{entry.teacher}</p>
                              </button>
                            ))}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="list" className="grid gap-4 lg:grid-cols-2">
          {filteredEntries.map((entry) => (
            <Card key={entry.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle>{entry.subject}</CardTitle>
                    <CardDescription>{entry.day} - {entry.startTime} to {entry.endTime}</CardDescription>
                  </div>
                  <Badge variant="outline">{entry.room}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">Teacher: {entry.teacher}</p>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" size="sm" onClick={() => setSelectedEntry(entry)}><Eye className="size-4" />Details</Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => void runAction(entry.reminder ? "reminder.remove" : "reminder.add", entry.id, entry.reminder ? "Reminder removed" : "Reminder saved")}><Bell className="size-4" />{entry.reminder ? "Reminder saved" : "Reminder"}</Button>
                  <Button type="button" size="sm" variant="outline" disabled={entry.checkedIn} onClick={() => void runAction("checkin", entry.id, "Lesson check-in recorded")}><CheckCircle2 className="size-4" />{entry.checkedIn ? "Checked in" : "Check in"}</Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => { setSelectedEntry(entry); setMessageOpen(true) }}><MessageSquare className="size-4" />Message</Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {!filteredEntries.length ? <Card className="lg:col-span-2"><CardContent className="p-8 text-center text-sm text-muted-foreground">{loading ? "Loading lessons..." : "No lessons match the current filters."}</CardContent></Card> : null}
        </TabsContent>

        <TabsContent value="events" className="grid gap-4 lg:grid-cols-2">
          {events.map((event) => (
            <Card key={event.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle>{event.title}</CardTitle>
                    <CardDescription>{formatDate(event.date)} {event.startTime ? `- ${event.startTime}` : ""}</CardDescription>
                  </div>
                  <Badge variant="outline">{event.type}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="flex items-center gap-2 text-sm text-muted-foreground"><MapPin className="size-4" />{event.location}</p>
                <p className="text-sm text-muted-foreground">{event.description}</p>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" size="sm" onClick={() => setSelectedEvent(event)}>Details</Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => void runAction(event.reminder ? "reminder.remove" : "reminder.add", event.id, event.reminder ? "Reminder removed" : "Reminder saved")}><Bell className="size-4" />{event.reminder ? "Reminder saved" : "Reminder"}</Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {!events.length ? <Card className="lg:col-span-2"><CardContent className="p-8 text-center text-sm text-muted-foreground">No upcoming exams or assessment deadlines.</CardContent></Card> : null}
        </TabsContent>

        <TabsContent value="attendance" className="grid gap-4 lg:grid-cols-2">
          {(payload?.attendance || []).map((item) => (
            <Card key={`${item.date}_${item.status}`}>
              <CardContent className="flex items-center justify-between gap-4 p-4">
                <div>
                  <p className="font-medium">{formatDate(item.date)}</p>
                  <p className="text-sm text-muted-foreground">{item.remarks || "No remarks"}</p>
                </div>
                <Badge variant="outline">{item.status || "unknown"}</Badge>
              </CardContent>
            </Card>
          ))}
          {!payload?.attendance?.length ? <Card className="lg:col-span-2"><CardContent className="p-8 text-center text-sm text-muted-foreground">No attendance records are available yet.</CardContent></Card> : null}
        </TabsContent>
      </Tabs>

      <Dialog open={Boolean(selectedEntry)} onOpenChange={(open) => !open && setSelectedEntry(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedEntry?.subject}</DialogTitle>
            <DialogDescription>{selectedEntry?.day} lesson details.</DialogDescription>
          </DialogHeader>
          {selectedEntry ? (
            <div className="space-y-2 text-sm">
              <p>Time: {selectedEntry.startTime} to {selectedEntry.endTime}</p>
              <p>Room: {selectedEntry.room}</p>
              <p>Teacher: {selectedEntry.teacher}</p>
              <p>Subject code: {selectedEntry.subjectCode || "N/A"}</p>
            </div>
          ) : null}
          <DialogFooter>
            {selectedEntry ? <Button type="button" onClick={() => void runAction("checkin", selectedEntry.id, "Lesson check-in recorded")}>Check in</Button> : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(selectedEvent)} onOpenChange={(open) => !open && setSelectedEvent(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedEvent?.title}</DialogTitle>
            <DialogDescription>{selectedEvent?.type} schedule event.</DialogDescription>
          </DialogHeader>
          {selectedEvent ? (
            <div className="space-y-2 text-sm">
              <p>Date: {formatDate(selectedEvent.date)}</p>
              <p>Time: {selectedEvent.startTime || "Any time"} {selectedEvent.endTime ? `to ${selectedEvent.endTime}` : ""}</p>
              <p>Location: {selectedEvent.location}</p>
              <p>{selectedEvent.description}</p>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Schedule Support</DialogTitle>
            <DialogDescription>This creates a real support ticket.</DialogDescription>
          </DialogHeader>
          <Textarea value={helpMessage} onChange={(event) => setHelpMessage(event.target.value)} placeholder="Explain the schedule issue..." rows={5} />
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
            <DialogDescription>Send a direct message about your schedule.</DialogDescription>
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
