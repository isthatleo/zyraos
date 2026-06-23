"use client"

import { teacherDashboardApi } from "@/lib/teacher-api-client"

import * as React from "react"
import { useParams, usePathname, useRouter } from "next/navigation"
import {
  AlertCircle,
  ArrowLeft,
  BarChart3,
  CalendarCheck,
  Download,
  Flag,
  Flame,
  FileText,
  Mail,
  MessageSquare,
  Plus,
  RefreshCcw,
  Search,
  TrendingUp,
  Users,
  AlertTriangle,
  CheckCircle2,
  Clock,
} from "lucide-react"
import { toast } from "sonner"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

type TeacherClass = {
  id: string
  name: string
  grade: string
  section: string
  academicYear: string
  students: number
  capacity: number
  timetableEntries: number
  averageScore: number
  attendanceRate: number
  pendingAssessments: number
}

type TeacherLearner = {
  id: string
  name: string
  email: string
  admissionNumber: string
  classId: string
  className: string
  gradebookEntries: number
  averageScore: number
  attendanceRate: number
}

type TeacherAssessment = { id: string; name: string; classId: string; subject: string; type: string; status: string; gradingProgress: number; dueDate: string | null }
type TeacherLesson = { id: string; day: string; startTime: string; endTime: string; classId: string; subject: string; room: string }
type Payload = { school: { slug: string; name: string }; classes: TeacherClass[]; learners: TeacherLearner[]; assessments: TeacherAssessment[]; timetable: TeacherLesson[] }

type EnrichedLearner = TeacherLearner & {
  riskScore: number
  scoreBand: "A" | "B" | "C" | "D" | "F"
  attendanceStatus: "excellent" | "good" | "warning" | "critical"
  riskReason: string
}

function initials(name: string) {
  return name.split(" ").map((part) => part[0]).join("").toUpperCase().slice(0, 2) || "ST"
}

function formatDate(value: string | null) {
  if (!value) return "Not dated"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Not dated"
  return new Intl.DateTimeFormat("en", { month: "short", day: "2-digit", year: "numeric" }).format(date)
}

function getScoreBand(score: number): "A" | "B" | "C" | "D" | "F" {
  if (score >= 90) return "A"
  if (score >= 80) return "B"
  if (score >= 70) return "C"
  if (score >= 60) return "D"
  return "F"
}

function getAttendanceStatus(attendance: number): "excellent" | "good" | "warning" | "critical" {
  if (attendance >= 95) return "excellent"
  if (attendance >= 85) return "good"
  if (attendance >= 75) return "warning"
  return "critical"
}

function calculateRiskScore(learner: TeacherLearner): number {
  const scoreRisk = Math.max(0, Math.round((70 - (learner.averageScore || 0)) * 0.6))
  const attendanceRisk = Math.max(0, Math.round((85 - (learner.attendanceRate || 0)) * 0.4))
  return scoreRisk + attendanceRisk
}

function enrichLearner(learner: TeacherLearner): EnrichedLearner {
  const riskScore = calculateRiskScore(learner)
  const scoreBand = getScoreBand(learner.averageScore || 0)
  const attendanceStatus = getAttendanceStatus(learner.attendanceRate || 0)

  const reasons: string[] = []
  if ((learner.averageScore || 0) < 60) reasons.push("Low score")
  if ((learner.attendanceRate || 0) < 75) reasons.push("Low attendance")
  if ((learner.gradebookEntries || 0) === 0) reasons.push("No grades")

  return {
    ...learner,
    riskScore,
    scoreBand,
    attendanceStatus,
    riskReason: reasons.join(", ") || "On track",
  }
}

function downloadFile(filename: string, rows: Record<string, unknown>[]) {
  if (!rows.length) {
    toast.error("No rows to export")
    return
  }
  const headers = Object.keys(rows[0])
  const escape = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`
  const csv = [headers.join(","), ...rows.map((row) => headers.map((header) => escape(row[header])).join(","))].join("\n")
  const blob = new Blob([csv], { type: "text/csv" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
  toast.success("Export started")
}

async function loadPayload(endpoint: string) {
  const response = await fetch(endpoint, { cache: "no-store", credentials: "include" }).catch(() => null)
  const body = await response?.json().catch(() => ({}))
  if (!response?.ok) throw new Error(String(body?.error || "Class details could not be loaded"))
  return body as Payload
}

export default function ClassDetailPage() {
  const params = useParams()
  const pathname = usePathname()
  const router = useRouter()
  const classId = String(params?.classId || "")
  const [payload, setPayload] = React.useState<Payload | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [refreshing, setRefreshing] = React.useState(false)
  const [error, setError] = React.useState("")
  const [query, setQuery] = React.useState("")
  const [riskFilter, setRiskFilter] = React.useState<"all" | "low" | "medium" | "high">("all")
  const [scoreFilter, setScoreFilter] = React.useState<"all" | "A" | "B" | "C" | "D" | "F">("all")
  const [attendanceFilter, setAttendanceFilter] = React.useState<"all" | "excellent" | "good" | "warning" | "critical">("all")
  const [sortBy, setSortBy] = React.useState<"name" | "score" | "attendance" | "risk">("name")
  const [supportDialogOpen, setSupportDialogOpen] = React.useState(false)
  const [selectedLearner, setSelectedLearner] = React.useState<EnrichedLearner | null>(null)
  const [supportForm, setSupportForm] = React.useState({ learner: "", reason: "", action: "" })
  const payloadRef = React.useRef<Payload | null>(null)

  React.useEffect(() => {
    payloadRef.current = payload
  }, [payload])

  const tenantPrefix = React.useMemo(() => {
    const segments = (pathname || "").split("/").filter(Boolean)
    return segments[1] === "teacher" ? `/${segments[0]}` : ""
  }, [pathname])

  const teacherHref = React.useCallback((href: string) => `${tenantPrefix}${href}`, [tenantPrefix])

  const endpoint = React.useCallback(() => {
    const hostTenant = typeof window !== "undefined" ? window.location.hostname.split(".")[0] : ""
    const tenant = tenantPrefix ? tenantPrefix.slice(1) : hostTenant && !["localhost", "127", "www"].includes(hostTenant) ? hostTenant : ""
    return teacherDashboardApi(`classes/${classId}`)
  }, [tenantPrefix])

  const load = React.useCallback(async (notify = false) => {
    if (payloadRef.current) setRefreshing(true)
    else setLoading(true)
    setError("")
    try {
      const data = await loadPayload(endpoint())
      setPayload(data)
      if (!data.classes.some((item) => item.id === classId)) setError("This class is not assigned to the current teacher")
      if (notify) toast.success("Class refreshed")
    } catch (err) {
      const message = err instanceof Error ? err.message : "Class details could not be loaded"
      setError(message)
      if (notify) toast.error(message)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [classId, endpoint])

  React.useEffect(() => {
    void load()
  }, [load])

  const classDetail = payload?.classes.find((item) => item.id === classId) || null
  const enrichedLearners = (payload?.learners || [])
    .filter((learner) => learner.classId === classId)
    .map(enrichLearner)

  const filteredLearners = enrichedLearners
    .filter((learner) => !query.trim() || [learner.name, learner.email, learner.admissionNumber].some((value) => value.toLowerCase().includes(query.trim().toLowerCase())))
    .filter((learner) => riskFilter === "all" || (riskFilter === "low" && learner.riskScore < 20) || (riskFilter === "medium" && learner.riskScore >= 20 && learner.riskScore < 40) || (riskFilter === "high" && learner.riskScore >= 40))
    .filter((learner) => scoreFilter === "all" || learner.scoreBand === scoreFilter)
    .filter((learner) => attendanceFilter === "all" || learner.attendanceStatus === attendanceFilter)
    .sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name)
      if (sortBy === "score") return (b.averageScore || 0) - (a.averageScore || 0)
      if (sortBy === "attendance") return (b.attendanceRate || 0) - (a.attendanceRate || 0)
      if (sortBy === "risk") return b.riskScore - a.riskScore
      return 0
    })

  const assessments = (payload?.assessments || []).filter((item) => item.classId === classId)
  const lessons = (payload?.timetable || []).filter((item) => item.classId === classId)

  const stats = React.useMemo(() => {
    const performanceBands = { A: 0, B: 0, C: 0, D: 0, F: 0 }
    let strugglingCount = 0
    let onTrackCount = 0
    let excellentAttendance = 0
    let lowAttendance = 0

    enrichedLearners.forEach((learner) => {
      performanceBands[learner.scoreBand]++
      if (learner.riskScore >= 40) strugglingCount++
      else if (learner.riskScore < 20) onTrackCount++
      if (learner.attendanceRate >= 95) excellentAttendance++
      if (learner.attendanceRate < 75) lowAttendance++
    })

    const gradedAssessments = assessments.filter((a) => a.gradingProgress === 100)
    const avgTimeToGrade = assessments.length > 0 ? Math.round(assessments.reduce((sum, a) => sum + a.gradingProgress, 0) / assessments.length) : 0
    const completionRate = assessments.length > 0 ? Math.round((gradedAssessments.length / assessments.length) * 100) : 0

    return { performanceBands, strugglingCount, onTrackCount, excellentAttendance, lowAttendance, avgTimeToGrade, completionRate }
  }, [enrichedLearners, assessments])

  if (loading) {
    return (
      <div className="w-full space-y-6 p-6 lg:p-8">
        <Skeleton className="h-48 rounded-3xl" />
        <Skeleton className="h-40 rounded-3xl" />
        <Skeleton className="h-[520px] rounded-3xl" />
      </div>
    )
  }

  if (error || !classDetail) {
    return (
      <div className="w-full p-6 lg:p-8">
        <Card className="rounded-3xl border-destructive/30">
          <CardHeader>
            <CardTitle>{error || "Class not found"}</CardTitle>
            <CardDescription>Only classes assigned to this teacher can be opened here.</CardDescription>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Button variant="outline" onClick={() => router.push(teacherHref("/teacher/classes"))}><ArrowLeft className="size-4" />Back to classes</Button>
            <Button onClick={() => load(true)}><RefreshCcw className="size-4" />Retry</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="w-full space-y-6 p-6 lg:p-8">
      <section className="overflow-hidden rounded-3xl border bg-card shadow-sm">
        <div className="p-6 md:p-8">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
            <div className="space-y-4">
              <Button variant="ghost" className="px-0" onClick={() => router.push(teacherHref("/teacher/classes"))}>
                <ArrowLeft className="size-4" />Back to classes
              </Button>
              <div>
                <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">{classDetail.name}</h1>
                <p className="mt-2 text-muted-foreground">{classDetail.academicYear || "Academic year not assigned"} - Comprehensive class insights and analytics</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">{classDetail.students} learners</Badge>
                <Badge variant="outline">{classDetail.averageScore}% average</Badge>
                <Badge variant="outline">{classDetail.attendanceRate}% attendance</Badge>
                <Badge variant="outline">{classDetail.timetableEntries} lessons</Badge>
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row xl:flex-col 2xl:flex-row">
              <Button variant="outline" onClick={() => load(true)} disabled={refreshing}><RefreshCcw className={cn("size-4", refreshing && "animate-spin")} />Refresh</Button>
              <Button variant="outline" onClick={() => router.push(teacherHref(`/teacher/messages?classId=${encodeURIComponent(classId)}`))}><MessageSquare className="size-4" />Message</Button>
              <Button><Plus className="size-4" />Create assessment</Button>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Learners", value: classDetail.students, helper: `${stats.onTrackCount} on track`, icon: Users, color: "bg-blue-50 text-blue-700" },
          { label: "Average Score", value: `${classDetail.averageScore}%`, helper: `${stats.strugglingCount} struggling`, icon: BarChart3, color: "bg-purple-50 text-purple-700" },
          { label: "Attendance", value: `${classDetail.attendanceRate}%`, helper: `${stats.lowAttendance} low attendance`, icon: CalendarCheck, color: "bg-emerald-50 text-emerald-700" },
          { label: "Pending Grading", value: classDetail.pendingAssessments, helper: `${stats.completionRate}% complete`, icon: FileText, color: "bg-amber-50 text-amber-700" },
        ].map((item) => {
          const Icon = item.icon
          return (
            <Card key={item.label} className="rounded-3xl shadow-sm">
              <CardContent className="flex min-h-32 items-start justify-between gap-4 p-5">
                <div><p className="text-sm text-muted-foreground">{item.label}</p><p className="mt-2 text-3xl font-semibold">{item.value}</p><p className="mt-1 text-xs text-muted-foreground">{item.helper}</p></div>
                <div className={cn("rounded-2xl p-3", item.color)}><Icon className="size-5" /></div>
              </CardContent>
            </Card>
          )
        })}
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <Card className="rounded-3xl shadow-sm lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><TrendingUp className="size-5 text-emerald-500" />Performance Distribution</CardTitle>
            <CardDescription>How learners are distributed across grade bands</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { band: "A", range: "90-100", count: stats.performanceBands.A, color: "bg-emerald-500" },
              { band: "B", range: "80-89", count: stats.performanceBands.B, color: "bg-blue-500" },
              { band: "C", range: "70-79", count: stats.performanceBands.C, color: "bg-amber-500" },
              { band: "D", range: "60-69", count: stats.performanceBands.D, color: "bg-orange-500" },
              { band: "F", range: "below 60", count: stats.performanceBands.F, color: "bg-red-500" },
            ].map((item) => (
              <div key={item.band}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="font-medium">{item.band} ({item.range})</span>
                  <span className="text-muted-foreground">{item.count} students</span>
                </div>
                <div className="flex items-center gap-2">
                  <Progress value={enrichedLearners.length ? (item.count / enrichedLearners.length) * 100 : 0} className="flex-1" />
                  <span className="text-xs font-medium">{enrichedLearners.length ? Math.round((item.count / enrichedLearners.length) * 100) : 0}%</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="rounded-3xl shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><AlertTriangle className="size-5 text-red-500" />Support Watchlist</CardTitle>
            <CardDescription>Highest risk students</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {enrichedLearners.filter((l) => l.riskScore >= 40).slice(0, 6).map((learner) => (
              <button
                key={learner.id}
                type="button"
                onClick={() => {
                  setSelectedLearner(learner)
                  setSupportDialogOpen(true)
                }}
                className="w-full rounded-2xl border p-3 text-left transition-colors hover:bg-red-50"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium line-clamp-1">{learner.name}</p>
                  <Badge variant={learner.riskScore >= 60 ? "destructive" : "outline"}>{learner.riskScore}</Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{learner.averageScore}% score • {learner.attendanceRate}% attendance</p>
              </button>
            ))}
            {!enrichedLearners.filter((l) => l.riskScore >= 40).length ? <p className="text-xs text-muted-foreground">No high-risk students detected</p> : null}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <Card className="rounded-3xl shadow-sm">
          <CardHeader>
            <CardTitle>Attendance Insights</CardTitle>
            <CardDescription>Class attendance breakdown</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="mb-2 flex justify-between text-sm">
                <span className="text-muted-foreground">Class Rate</span>
                <span className="font-semibold">{classDetail.attendanceRate}%</span>
              </div>
              <Progress value={classDetail.attendanceRate} />
            </div>
            <div className="grid gap-3">
              <div className="rounded-2xl border p-3">
                <p className="text-xs text-muted-foreground">Excellent (≥95%)</p>
                <p className="mt-1 text-lg font-semibold">{stats.excellentAttendance}</p>
              </div>
              <div className="rounded-2xl border p-3">
                <p className="text-xs text-muted-foreground">Low (below 75%)</p>
                <p className="mt-1 text-lg font-semibold text-orange-600">{stats.lowAttendance}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl shadow-sm">
          <CardHeader>
            <CardTitle>Assessment Workload</CardTitle>
            <CardDescription>Grading status overview</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="mb-2 flex justify-between text-sm">
                <span className="text-muted-foreground">Completion</span>
                <span className="font-semibold">{stats.completionRate}%</span>
              </div>
              <Progress value={stats.completionRate} />
            </div>
            <div className="grid gap-3">
              <div className="rounded-2xl border p-3">
                <p className="text-xs text-muted-foreground">Total Assessments</p>
                <p className="mt-1 text-lg font-semibold">{assessments.length}</p>
              </div>
              <div className="rounded-2xl border p-3">
                <p className="text-xs text-muted-foreground">Pending Grading</p>
                <p className="mt-1 text-lg font-semibold text-amber-600">{classDetail.pendingAssessments}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Users className="size-5 text-blue-500" />Class Summary</CardTitle>
            <CardDescription>Quick statistics</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between rounded-2xl border p-3">
              <span className="text-sm">Total Learners</span>
              <Badge variant="outline">{classDetail.students}</Badge>
            </div>
            <div className="flex items-center justify-between rounded-2xl border p-3">
              <span className="text-sm">Timetable Entries</span>
              <Badge variant="outline">{classDetail.timetableEntries}</Badge>
            </div>
            <div className="flex items-center justify-between rounded-2xl border p-3">
              <span className="text-sm">Assessments</span>
              <Badge variant="outline">{assessments.length}</Badge>
            </div>
            <div className="flex items-center justify-between rounded-2xl border p-3">
              <span className="text-sm">Lessons This Week</span>
              <Badge variant="outline">{lessons.length}</Badge>
            </div>
          </CardContent>
        </Card>
      </section>

      <Card className="rounded-3xl shadow-sm">
        <CardHeader>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Class Roster</CardTitle>
              <CardDescription>Learners with risk indicators and performance metrics</CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
                <Input className="pl-9 w-48" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search..." />
              </div>
              <Button variant="outline" onClick={() => downloadFile(`${payload?.school.slug || "teacher"}-${classId}-roster.csv`, filteredLearners.map((learner) => ({
                name: learner.name,
                admissionNumber: learner.admissionNumber,
                email: learner.email,
                score: learner.averageScore,
                attendance: learner.attendanceRate,
                band: learner.scoreBand,
                risk: learner.riskScore,
              })))}><Download className="size-4" />Export</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-wrap gap-2">
            <Select value={riskFilter} onValueChange={(v: any) => setRiskFilter(v)}>
              <SelectTrigger className="w-32"><SelectValue placeholder="Risk" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All risks</SelectItem>
                <SelectItem value="low">Low risk</SelectItem>
                <SelectItem value="medium">Medium risk</SelectItem>
                <SelectItem value="high">High risk</SelectItem>
              </SelectContent>
            </Select>
            <Select value={scoreFilter} onValueChange={(v: any) => setScoreFilter(v)}>
              <SelectTrigger className="w-32"><SelectValue placeholder="Score band" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All bands</SelectItem>
                <SelectItem value="A">A (90-100)</SelectItem>
                <SelectItem value="B">B (80-89)</SelectItem>
                <SelectItem value="C">C (70-79)</SelectItem>
                <SelectItem value="D">D (60-69)</SelectItem>
                <SelectItem value="F">F (&lt;60)</SelectItem>
              </SelectContent>
            </Select>
            <Select value={attendanceFilter} onValueChange={(v: any) => setAttendanceFilter(v)}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Attendance" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All attendance</SelectItem>
                <SelectItem value="excellent">Excellent (≥95%)</SelectItem>
                <SelectItem value="good">Good (≥85%)</SelectItem>
                <SelectItem value="warning">Warning (≥75%)</SelectItem>
                <SelectItem value="critical">Critical (&lt;75%)</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
              <SelectTrigger className="w-32"><SelectValue placeholder="Sort" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="score">Score</SelectItem>
                <SelectItem value="attendance">Attendance</SelectItem>
                <SelectItem value="risk">Risk</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8">Risk</TableHead>
                <TableHead>Learner</TableHead>
                <TableHead>Admission</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Band</TableHead>
                <TableHead>Attendance</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLearners.map((learner) => (
                <TableRow key={learner.id} className={learner.riskScore >= 40 ? "bg-red-50" : ""}>
                  <TableCell>
                    <div className={cn("rounded-full w-6 h-6 flex items-center justify-center text-white text-xs font-semibold", learner.riskScore >= 60 ? "bg-red-600" : learner.riskScore >= 40 ? "bg-orange-600" : learner.riskScore >= 20 ? "bg-yellow-600" : "bg-green-600")}>
                      {learner.riskScore}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar><AvatarFallback>{initials(learner.name)}</AvatarFallback></Avatar>
                      <div><p className="font-medium">{learner.name}</p><p className="text-xs text-muted-foreground">{learner.email || "No email"}</p></div>
                    </div>
                  </TableCell>
                  <TableCell>{learner.admissionNumber || "-"}</TableCell>
                  <TableCell>{learner.averageScore || 0}%</TableCell>
                  <TableCell><Badge>{learner.scoreBand}</Badge></TableCell>
                  <TableCell><Progress value={learner.attendanceRate || 0} className="w-20" /></TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button size="sm" variant="ghost" onClick={() => router.push(teacherHref(`/teacher/messages?learnerId=${encodeURIComponent(learner.id)}`))}><MessageSquare className="size-4" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => { setSelectedLearner(learner); setSupportDialogOpen(true) }}><Flag className="size-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {!filteredLearners.length ? <p className="py-8 text-center text-sm text-muted-foreground">No learners found for this filter.</p> : null}
        </CardContent>
      </Card>

      <section className="grid gap-6 lg:grid-cols-3">
        <Card className="rounded-3xl shadow-sm lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent Assessments</CardTitle>
            <CardDescription>Current and upcoming class assessments</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {assessments.slice(0, 8).map((assessment) => (
              <div key={assessment.id} className="rounded-2xl border p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-sm">{assessment.name}</p>
                  <Badge variant={assessment.status === "published" ? "default" : "secondary"}>{assessment.status}</Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{assessment.subject} • {assessment.type} • Due {formatDate(assessment.dueDate)}</p>
                <div className="mt-2 flex items-center gap-2">
                  <Progress value={assessment.gradingProgress} className="flex-1" />
                  <span className="text-xs font-medium">{assessment.gradingProgress}%</span>
                </div>
              </div>
            ))}
            {!assessments.length ? <p className="text-sm text-muted-foreground">No assessments found for this class.</p> : null}
          </CardContent>
        </Card>

        <Card className="rounded-3xl shadow-sm">
          <CardHeader>
            <CardTitle>Timetable</CardTitle>
            <CardDescription>Upcoming lessons this week</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {lessons.slice(0, 6).map((lesson) => (
              <div key={lesson.id} className="rounded-2xl border p-3">
                <p className="font-medium text-sm">{lesson.subject}</p>
                <p className="text-xs text-muted-foreground">{lesson.day} • {lesson.startTime || "TBA"} • Room {lesson.room || "TBA"}</p>
              </div>
            ))}
            {!lessons.length ? <p className="text-sm text-muted-foreground">No lessons found.</p> : null}
          </CardContent>
        </Card>
      </section>

      <Dialog open={supportDialogOpen} onOpenChange={setSupportDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Flag for Support</DialogTitle>
            <DialogDescription>Create a support intervention for {selectedLearner?.name}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="rounded-2xl border bg-muted p-3">
              <p className="text-sm font-medium">{selectedLearner?.name}</p>
              <p className="text-xs text-muted-foreground">{selectedLearner?.averageScore}% score • {selectedLearner?.attendanceRate}% attendance • Risk: {selectedLearner?.riskScore}</p>
            </div>
            <div>
              <label className="text-sm font-medium">Issue</label>
              <Select value={supportForm.reason} onValueChange={(v) => setSupportForm((c) => ({ ...c, reason: v }))}>
                <SelectTrigger><SelectValue placeholder="Select reason" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="lowscore">Low score</SelectItem>
                  <SelectItem value="lowattendance">Low attendance</SelectItem>
                  <SelectItem value="notsubmitting">Not submitting work</SelectItem>
                  <SelectItem value="behavioral">Behavioral concern</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Recommended Action</label>
              <Select value={supportForm.action} onValueChange={(v) => setSupportForm((c) => ({ ...c, action: v }))}>
                <SelectTrigger><SelectValue placeholder="Select action" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="parentcontact">Contact parent</SelectItem>
                  <SelectItem value="tutoringref">Refer to tutoring</SelectItem>
                  <SelectItem value="counseling">Refer to counselor</SelectItem>
                  <SelectItem value="monitoring">Monitor progress</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSupportDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => { toast.success("Support flag created"); setSupportDialogOpen(false) }} disabled={!supportForm.reason || !supportForm.action}>
              Create Flag
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
