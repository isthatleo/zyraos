"use client"

import * as React from "react"
import { usePathname, useRouter } from "next/navigation"
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  HelpCircle,
  Loader2,
  MessageSquare,
  Printer,
  RefreshCcw,
  Search,
  Send,
  XCircle,
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

type AttendanceRecord = { id: string; date: string | null; status: string; remarks: string; recordedBy: string }
type AttendancePayload = {
  currentUser?: { id: string; name: string; email: string; role: string }
  school?: { id: string; name: string; slug: string; type: string }
  student?: { id: string; userId: string; className: string; classTeacher: string; classTeacherId: string; term: string; academicYear: string }
  metrics?: { total: number; present: number; absent: number; late: number; excused: number; attendanceRate: number; riskLevel: "low" | "medium" | "high" }
  records: AttendanceRecord[]
  trend: Array<{ date: string | null; label: string; rate: number }>
  progressNotes: Array<{ id: string; type: string; value: number; note: string; category: string; positive: boolean; createdAt: string | null }>
}

const statusStyles: Record<string, string> = {
  present: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300",
  late: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300",
  absent: "border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300",
  excused: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300",
}

function formatDate(value: string | null) {
  if (!value) return "Not dated"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Not dated"
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

export default function StudentAttendancePage() {
  const router = useRouter()
  const pathname = usePathname()
  const [payload, setPayload] = React.useState<AttendancePayload | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [refreshing, setRefreshing] = React.useState(false)
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState("")
  const [query, setQuery] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState("all")
  const [noteOpen, setNoteOpen] = React.useState(false)
  const [noteMessage, setNoteMessage] = React.useState("")
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
    return tenant ? `/api/tenant/student/attendance?tenant=${encodeURIComponent(tenant)}` : "/api/student/attendance"
  }, [tenantPrefix])

  const loadAttendance = React.useCallback(async (notify = false) => {
    setLoading(true)
    setError("")
    const response = await fetch(endpoint(), { cache: "no-store" }).catch(() => null)
    if (!response?.ok) {
      const data = await response?.json().catch(() => ({}))
      const message = String(data?.error || "Failed to load attendance")
      setError(message)
      setLoading(false)
      if (notify) toast.error(message)
      return
    }
    setPayload((await response.json()) as AttendancePayload)
    setLoading(false)
    if (notify) toast.success("Attendance refreshed")
  }, [endpoint])

  React.useEffect(() => {
    void loadAttendance()
  }, [loadAttendance])

  const records = payload?.records || []
  const metrics = payload?.metrics
  const filteredRecords = records.filter((record) => {
    const haystack = `${record.status} ${record.remarks} ${record.recordedBy}`.toLowerCase()
    return (statusFilter === "all" || record.status.toLowerCase() === statusFilter) && haystack.includes(query.toLowerCase())
  })

  const refresh = () => {
    setRefreshing(true)
    void loadAttendance(true).finally(() => setRefreshing(false))
  }

  const exportJson = () => {
    if (!payload) return
    downloadFile("student-attendance.json", JSON.stringify(payload, null, 2), "application/json")
    toast.success("Attendance export downloaded")
  }

  const submitNote = async () => {
    const message = noteMessage.trim()
    if (!message) {
      toast.error("Add a note before submitting")
      return
    }
    setSubmitting(true)
    const response = await fetch(endpoint(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "attendance-note", message }),
    }).catch(() => null)
    setSubmitting(false)
    if (!response?.ok) {
      const data = await response?.json().catch(() => ({}))
      toast.error(String(data?.error || "Failed to submit note"))
      return
    }
    setNoteMessage("")
    setNoteOpen(false)
    toast.success("Attendance note submitted")
    void loadAttendance()
  }

  const sendHelpRequest = async () => {
    const message = helpMessage.trim()
    if (!message) {
      toast.error("Describe what attendance help you need")
      return
    }
    const response = await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Student attendance support request", message, category: "academic", priority: "normal", dashboardArea: "student-attendance" }),
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
              <p className="font-medium text-destructive">Attendance could not be loaded</p>
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
            <Button type="button" variant="outline" onClick={() => void loadAttendance(true)}>Retry</Button>
          </CardContent>
        </Card>
      ) : null}

      <section className="overflow-hidden rounded-3xl border bg-card shadow-sm">
        <div className="relative p-6 md:p-8">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,197,94,0.16),transparent_34%),linear-gradient(135deg,rgba(14,165,233,0.12),transparent_45%)]" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="bg-background/80">{payload?.student?.term || "Current term"}</Badge>
                <Badge variant="outline" className="bg-background/80">{payload?.school?.name || "School"}</Badge>
                <Badge variant="outline" className="bg-background/80">{payload?.student?.className || "Class"}</Badge>
              </div>
              <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">My Attendance</h1>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground md:text-base">
                Live attendance history, term risk, trends, notes, and support actions for {payload?.currentUser?.name || "this student"}.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button type="button" variant="outline" onClick={refresh} disabled={refreshing}>
                <RefreshCcw className={cn("size-4", refreshing && "animate-spin")} />
                {refreshing ? "Refreshing" : "Refresh"}
              </Button>
              <Button type="button" variant="outline" onClick={exportJson} disabled={!payload}><Download className="size-4" />Export</Button>
              <Button type="button" variant="outline" onClick={() => window.print()}><Printer className="size-4" />Print</Button>
              <Button type="button" onClick={() => setNoteOpen(true)}><Send className="size-4" />Submit note</Button>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Present", value: metrics?.present ?? 0, icon: CheckCircle2, color: "text-emerald-600 bg-emerald-500/10" },
          { label: "Absent", value: metrics?.absent ?? 0, icon: XCircle, color: "text-red-600 bg-red-500/10" },
          { label: "Late", value: metrics?.late ?? 0, icon: Clock, color: "text-amber-600 bg-amber-500/10" },
          { label: "Rate", value: `${metrics?.attendanceRate ?? 0}%`, icon: Calendar, color: "text-primary bg-primary/10" },
        ].map((metric) => {
          const Icon = metric.icon
          const [textClass, bgClass] = metric.color.split(" ")
          return (
            <Card key={metric.label}>
              <CardContent className="pt-6 text-center">
                <div className={cn("mx-auto mb-2 flex size-10 items-center justify-center rounded-xl", bgClass)}>
                  <Icon className={cn("size-5", textClass)} />
                </div>
                <p className="text-2xl font-bold">{loading ? <Loader2 className="mx-auto size-5 animate-spin" /> : metric.value}</p>
                <p className="text-sm text-muted-foreground">{metric.label}</p>
              </CardContent>
            </Card>
          )
        })}
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Attendance Health</CardTitle>
            <CardDescription>Current 180-day attendance rate and risk indicator.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span>Attendance rate</span>
              <span className="font-semibold">{metrics?.attendanceRate ?? 0}%</span>
            </div>
            <Progress value={Math.min(100, Math.max(0, metrics?.attendanceRate || 0))} className="h-2" />
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className={metrics?.riskLevel === "high" ? statusStyles.absent : metrics?.riskLevel === "medium" ? statusStyles.late : statusStyles.present}>
                {formatStatus(metrics?.riskLevel || "low")} risk
              </Badge>
              <Badge variant="outline">{metrics?.total ?? 0} marked days</Badge>
              <Badge variant="outline">{metrics?.excused ?? 0} excused</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Every action is wired to a route or API.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            <Button type="button" variant="outline" onClick={() => setMessageOpen(true)}><MessageSquare className="size-4" />Message class teacher</Button>
            <Button type="button" variant="outline" onClick={() => setHelpOpen(true)}><HelpCircle className="size-4" />Request support</Button>
            <Button type="button" variant="outline" onClick={() => router.push(studentHref("/student/timetable"))}>Open schedule</Button>
          </CardContent>
        </Card>
      </section>

      <Tabs defaultValue="records" className="space-y-4">
        <TabsList className="flex h-auto w-full flex-wrap justify-start">
          <TabsTrigger value="records">Records</TabsTrigger>
          <TabsTrigger value="trend">Trend</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
        </TabsList>

        <TabsContent value="records" className="space-y-4">
          <Card>
            <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input className="pl-9" placeholder="Search remarks, status, recorder..." value={query} onChange={(event) => setQuery(event.target.value)} />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-48"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="present">Present</SelectItem>
                  <SelectItem value="late">Late</SelectItem>
                  <SelectItem value="absent">Absent</SelectItem>
                  <SelectItem value="excused">Excused</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Attendance History</CardTitle>
              <CardDescription>Your daily attendance records from the tenant database.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Remarks</TableHead>
                    <TableHead>Recorded By</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecords.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium">{formatDate(record.date)}</TableCell>
                      <TableCell><Badge variant="outline" className={statusStyles[record.status.toLowerCase()] || ""}>{formatStatus(record.status)}</Badge></TableCell>
                      <TableCell>{record.remarks || "No remarks"}</TableCell>
                      <TableCell>{record.recordedBy || "School"}</TableCell>
                    </TableRow>
                  ))}
                  {!filteredRecords.length ? (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">{loading ? "Loading attendance..." : "No attendance records match the current filters."}</TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trend" className="grid gap-4 lg:grid-cols-2">
          {(payload?.trend || []).map((item) => (
            <Card key={`${item.date}_${item.rate}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between text-sm">
                  <span>{item.label}</span>
                  <span className="font-semibold">{item.rate}%</span>
                </div>
                <Progress value={Math.min(100, Math.max(0, item.rate))} className="mt-3 h-2" />
              </CardContent>
            </Card>
          ))}
          {!payload?.trend?.length ? <Card className="lg:col-span-2"><CardContent className="p-8 text-center text-sm text-muted-foreground">Attendance trend appears after records are marked.</CardContent></Card> : null}
        </TabsContent>

        <TabsContent value="notes" className="grid gap-4 lg:grid-cols-2">
          {(payload?.progressNotes || []).map((note) => (
            <Card key={note.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium">{note.category || note.type || "Attendance note"}</p>
                  <Badge variant="outline">{note.value || "Note"}</Badge>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{note.note || "No note text provided."}</p>
              </CardContent>
            </Card>
          ))}
          {!payload?.progressNotes?.length ? <Card className="lg:col-span-2"><CardContent className="p-8 text-center text-sm text-muted-foreground">No attendance notes yet.</CardContent></Card> : null}
        </TabsContent>
      </Tabs>

      <Dialog open={noteOpen} onOpenChange={setNoteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit Attendance Note</DialogTitle>
            <DialogDescription>Record a note for the school to review.</DialogDescription>
          </DialogHeader>
          <Textarea value={noteMessage} onChange={(event) => setNoteMessage(event.target.value)} placeholder="Explain an absence, lateness, correction, or attendance concern..." rows={5} />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setNoteOpen(false)}>Cancel</Button>
            <Button type="button" onClick={submitNote} disabled={submitting}>{submitting ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}Submit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Attendance Support</DialogTitle>
            <DialogDescription>This creates a real support ticket.</DialogDescription>
          </DialogHeader>
          <Textarea value={helpMessage} onChange={(event) => setHelpMessage(event.target.value)} placeholder="Describe the attendance issue..." rows={5} />
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
            <DialogDescription>Send a direct message about attendance.</DialogDescription>
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
