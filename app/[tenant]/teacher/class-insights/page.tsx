"use client"

import { teacherDashboardApi } from "@/lib/teacher-api-client"

import * as React from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import {
  AlertCircle,
  BarChart3,
  BookOpen,
  CalendarCheck,
  CheckCircle2,
  Download,
  Flag,
  Flame,
  FileText,
  GraduationCap,
  Heart,
  ListChecks,
  Lock,
  Mail,
  MessageSquare,
  Plus,
  RefreshCcw,
  Search,
  Share2,
  Star,
  TrendingUp,
  Trash2,
  Users,
  AlertTriangle,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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

type TeacherSubject = { id: string; name: string; code: string; type: string; description: string; classes: number }

type TeacherAssessment = {
  id: string
  name: string
  classId: string
  className: string
  subjectId: string
  subject: string
  subjectCode: string
  type: string
  totalScore: number
  dueDate: string | null
  status: string
  graded: number
  classStudents: number
  gradingProgress: number
}

type TeacherLesson = {
  id: string
  day: string
  startTime: string
  endTime: string
  classId: string
  className: string
  subjectId: string
  subject: string
  room: string
}

type TeacherNote = { id: string; classId: string; title: string; note: string; createdAt: string }

type Payload = {
  generatedAt: string
  school: { id: string; name: string; slug: string; type: string }
  currentUser: { id: string; name: string; email: string; position: string; department: string }
  metrics: {
    classes: number
    students: number
    subjects: number
    assessments: number
    pendingGrading: number
    averageScore: number
    attendanceRate: number
    lessonsToday: number
    timetableEntries: number
  }
  classes: TeacherClass[]
  learners: TeacherLearner[]
  subjects: TeacherSubject[]
  assessments: TeacherAssessment[]
  timetable: TeacherLesson[]
  notes: TeacherNote[]
}

type EnrichedLearner = TeacherLearner & {
  riskScore: number
  scoreBand: "A" | "B" | "C" | "D" | "F"
  attendanceStatus: "excellent" | "good" | "warning" | "critical"
}

type EnrichedClass = TeacherClass & {
  classRisk: number
  strugglingStudents: number
}

function initials(name: string) {
  return name.split(" ").map((part) => part[0]).join("").toUpperCase().slice(0, 2) || "ST"
}

function formatDate(value: string | null) {
  if (!value) return "Recently"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Recently"
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return "Today"
  if (days === 1) return "Yesterday"
  if (days < 7) return `${days} days ago`
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`
  if (days < 365) return `${Math.floor(days / 30)} months ago`
  return new Intl.DateTimeFormat("en", { month: "short", day: "2-digit", year: "numeric" }).format(date)
}

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 B"
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`
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

  return {
    ...learner,
    riskScore,
    scoreBand,
    attendanceStatus,
  }
}

function enrichClass(classItem: TeacherClass, learners: TeacherLearner[]): EnrichedClass {
  const classLearners = learners.filter((l) => l.classId === classItem.id)
  const strugglingStudents = classLearners.filter((l) => calculateRiskScore(l) >= 40).length
  const classRisk = Math.max(0, Math.round((100 - classItem.attendanceRate) * 0.45 + Math.max(0, 70 - classItem.averageScore) * 0.55))

  return {
    ...classItem,
    classRisk,
    strugglingStudents,
  }
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

function toCsv(rows: Record<string, unknown>[]) {
  if (!rows.length) return ""
  const headers = Object.keys(rows[0])
  const escape = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`
  return [headers.join(","), ...rows.map((row) => headers.map((header) => escape(row[header])).join(","))].join("\n")
}

async function fetchTeacherJson(endpoint: string) {
  const response = await fetch(endpoint, { cache: "no-store", credentials: "include" }).catch(() => null)
  const body = await response?.json().catch(() => ({}))
  if (!response?.ok) throw new Error(String(body?.error || "Class insights could not be loaded"))
  return body as Payload
}

function PageSkeleton() {
  return (
    <div className="w-full space-y-6 p-6 lg:p-8">
      <Skeleton className="h-56 rounded-3xl" />
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-32 rounded-3xl" />)}
      </section>
      <Skeleton className="h-[640px] rounded-3xl" />
    </div>
  )
}

export default function ClassInsightsPage() {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [payload, setPayload] = React.useState<Payload | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [refreshing, setRefreshing] = React.useState(false)
  const [error, setError] = React.useState("")
  const [query, setQuery] = React.useState(searchParams?.get("q") || "")
  const [selectedClassId, setSelectedClassId] = React.useState(searchParams?.get("classId") || "all")
  const [riskFilter, setRiskFilter] = React.useState<"all" | "low" | "medium" | "high">("all")
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
    return teacherDashboardApi("class-insights")
  }, [tenantPrefix])

  const loadResources = React.useCallback(async (notify = false) => {
    setError("")
    if (!payloadRef.current) setLoading(true)
    else setRefreshing(true)
    try {
      const result = await fetchTeacherJson(endpoint())
      setPayload(result)
      setLoading(false)
      setRefreshing(false)
      if (notify) toast.success("Class insights refreshed")
    } catch (err) {
      const message = err instanceof Error ? err.message : "Class insights could not be loaded"
      setError(message)
      setLoading(false)
      setRefreshing(false)
      if (notify) toast.error(message)
    }
  }, [endpoint])

  React.useEffect(() => {
    void loadResources()
  }, [loadResources])

  const classes = payload?.classes || []
  const learners = payload?.learners || []
  const subjects = payload?.subjects || []
  const assessments = payload?.assessments || []
  const timetable = payload?.timetable || []

  const enrichedClasses = classes.map((c) => enrichClass(c, learners))
  const enrichedLearners = learners.map(enrichLearner)

  const selectedClass = enrichedClasses.find((c) => c.id === selectedClassId)
  const selectedClassIds = selectedClass ? [selectedClass.id] : enrichedClasses.map((c) => c.id)

  const filteredLearners = enrichedLearners
    .filter((l) => selectedClassIds.includes(l.classId))
    .filter((l) => !query || [l.name, l.email, l.admissionNumber, l.className].some((v) => v.toLowerCase().includes(query.toLowerCase())))
    .filter((l) => riskFilter === "all" || (riskFilter === "low" && l.riskScore < 20) || (riskFilter === "medium" && l.riskScore >= 20 && l.riskScore < 40) || (riskFilter === "high" && l.riskScore >= 40))
    .sort((a, b) => b.riskScore - a.riskScore)

  const stats = React.useMemo(() => {
    const topRiskLearners = [...enrichedLearners].sort((a, b) => b.riskScore - a.riskScore).slice(0, 8)
    const strugglingClasses = [...enrichedClasses].sort((a, b) => b.classRisk - a.classRisk).slice(0, 5)
    const avgClassRisk = enrichedClasses.length ? Math.round(enrichedClasses.reduce((sum, c) => sum + c.classRisk, 0) / enrichedClasses.length) : 0
    const totalStruggling = enrichedLearners.filter((l) => l.riskScore >= 40).length
    const performanceBands = { A: 0, B: 0, C: 0, D: 0, F: 0 }
    enrichedLearners.forEach((l) => performanceBands[l.scoreBand]++)

    return { topRiskLearners, strugglingClasses, avgClassRisk, totalStruggling, performanceBands }
  }, [enrichedLearners, enrichedClasses])

  if (loading) return <PageSkeleton />

  if (error) {
    return (
      <div className="w-full p-6 lg:p-8">
        <Card className="rounded-3xl border-destructive/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive"><AlertCircle className="size-5" />Class insights could not be loaded</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => loadResources(true)}><RefreshCcw className="size-4" />Retry</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="w-full space-y-6 p-6 lg:p-8">
      <section className="overflow-hidden rounded-3xl border bg-card shadow-sm">
        <div className="relative p-6 md:p-8">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,197,94,0.18),transparent_34%),linear-gradient(135deg,rgba(14,165,233,0.12),transparent_46%)]" />
          <div className="relative flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
            <div className="max-w-4xl space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="bg-background/80"><GraduationCap className="mr-1 size-3.5" />Teacher workspace</Badge>
                <Badge variant="outline" className="bg-background/80">{payload?.school?.name}</Badge>
                <Badge variant="outline" className="bg-background/80">Class Insights</Badge>
              </div>
              <div>
                <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Class Insights & Analytics</h1>
                <p className="mt-2 text-muted-foreground">
                  Comprehensive class performance analysis, student risk assessment, and actionable insights across all assigned classes.
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row xl:flex-col 2xl:flex-row">
              <Button variant="outline" onClick={() => router.push(teacherHref("/teacher/dashboard"))}>
                <BarChart3 className="size-4" />Dashboard
              </Button>
              <Button variant="outline" onClick={async () => { setRefreshing(true); await loadResources(true); setRefreshing(false) }} disabled={refreshing}>
                <RefreshCcw className={cn("size-4", refreshing && "animate-spin")} />Refresh
              </Button>
              <Button onClick={() => router.push(teacherHref("/teacher/classes"))}>
                <ListChecks className="size-4" />All Classes
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {[
          { label: "Total Classes", value: payload?.metrics.classes || 0, helper: `${payload?.metrics.students || 0} learners`, icon: Users, color: "bg-blue-50 text-blue-700" },
          { label: "Average Score", value: `${payload?.metrics.averageScore || 0}%`, helper: `${stats.totalStruggling} struggling`, icon: BarChart3, color: "bg-purple-50 text-purple-700" },
          { label: "Attendance", value: `${payload?.metrics.attendanceRate || 0}%`, helper: "Across all classes", icon: CalendarCheck, color: "bg-emerald-50 text-emerald-700" },
          { label: "Avg Class Risk", value: `${stats.avgClassRisk}`, helper: "Risk assessment score", icon: AlertTriangle, color: "bg-orange-50 text-orange-700" },
          { label: "Pending Grading", value: payload?.metrics.pendingGrading || 0, helper: `${payload?.metrics.assessments || 0} assessments`, icon: FileText, color: "bg-amber-50 text-amber-700" },
        ].map((card) => {
          const Icon = card.icon
          return (
            <Card key={card.label} className="rounded-3xl shadow-sm">
              <CardContent className="flex min-h-32 items-start justify-between gap-4 p-5">
                <div>
                  <p className="text-sm text-muted-foreground">{card.label}</p>
                  <p className="mt-2 text-3xl font-semibold">{card.value}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{card.helper}</p>
                </div>
                <div className={cn("rounded-2xl p-3", card.color)}><Icon className="size-5" /></div>
              </CardContent>
            </Card>
          )
        })}
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <Card className="rounded-3xl shadow-sm lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><TrendingUp className="size-5 text-emerald-500" />Performance Distribution</CardTitle>
            <CardDescription>All learners across all assigned classes</CardDescription>
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
                  <span className="text-muted-foreground">{item.count} learners</span>
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
            <CardTitle className="flex items-center gap-2"><AlertTriangle className="size-5 text-red-500" />Struggling Classes</CardTitle>
            <CardDescription>Highest risk classes</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {stats.strugglingClasses.map((classItem) => (
              <button
                key={classItem.id}
                type="button"
                onClick={() => router.push(teacherHref(`/teacher/classes/${encodeURIComponent(classItem.id)}`))}
                className="w-full rounded-2xl border p-3 text-left transition-colors hover:bg-red-50"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium line-clamp-1">{classItem.name}</p>
                  <Badge variant={classItem.classRisk >= 50 ? "destructive" : "outline"}>{classItem.classRisk}</Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{classItem.students} students • {classItem.strugglingStudents} struggling</p>
              </button>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card className="rounded-3xl shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Flame className="size-5 text-orange-500" />Top At-Risk Learners</CardTitle>
            <CardDescription>Highest risk students across all classes</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {stats.topRiskLearners.slice(0, 6).map((learner) => (
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
                  <div>
                    <p className="text-sm font-medium">{learner.name}</p>
                    <p className="text-xs text-muted-foreground">{learner.className}</p>
                  </div>
                  <Badge variant={learner.riskScore >= 60 ? "destructive" : "outline"}>{learner.riskScore}</Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{learner.averageScore}% score • {learner.attendanceRate}% attendance</p>
              </button>
            ))}
          </CardContent>
        </Card>

        <Card className="rounded-3xl shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Heart className="size-5 text-emerald-500" />Top Performers</CardTitle>
            <CardDescription>Highest scoring learners</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {[...enrichedLearners].sort((a, b) => (b.averageScore || 0) - (a.averageScore || 0)).slice(0, 6).map((learner) => (
              <div key={learner.id} className="rounded-2xl border p-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">{learner.name}</p>
                    <p className="text-xs text-muted-foreground">{learner.className}</p>
                  </div>
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700">{learner.scoreBand}</Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{learner.averageScore}% score • {learner.attendanceRate}% attendance</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <Card className="rounded-3xl shadow-sm">
        <CardHeader>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Learner Analysis</CardTitle>
              <CardDescription>Filter and analyze all learners across classes</CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
                <Input className="pl-9 w-48" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search..." />
              </div>
              <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                <SelectTrigger className="w-48"><SelectValue placeholder="Class" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All classes</SelectItem>
                  {enrichedClasses.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={riskFilter} onValueChange={(v: any) => setRiskFilter(v)}>
                <SelectTrigger className="w-32"><SelectValue placeholder="Risk" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All risks</SelectItem>
                  <SelectItem value="low">Low risk</SelectItem>
                  <SelectItem value="medium">Medium risk</SelectItem>
                  <SelectItem value="high">High risk</SelectItem>
                </SelectContent>
              </Select>
               <Button variant="outline" onClick={() => downloadFile(`${payload?.school?.slug || "teacher"}-learner-insights.csv`, toCsv(filteredLearners.map((l) => ({
                name: l.name,
                class: l.className,
                admission: l.admissionNumber,
                email: l.email,
                score: l.averageScore,
                attendance: l.attendanceRate,
                band: l.scoreBand,
                risk: l.riskScore,
              }))), "text/csv")}><Download className="size-4" />Export</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8">Risk</TableHead>
                <TableHead>Learner</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Band</TableHead>
                <TableHead>Attendance</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLearners.slice(0, 20).map((learner) => (
                <TableRow key={learner.id} className={learner.riskScore >= 40 ? "bg-red-50" : ""}>
                  <TableCell>
                    <div className={cn("rounded-full w-6 h-6 flex items-center justify-center text-white text-xs font-semibold", learner.riskScore >= 60 ? "bg-red-600" : learner.riskScore >= 40 ? "bg-orange-600" : learner.riskScore >= 20 ? "bg-yellow-600" : "bg-green-600")}>
                      {learner.riskScore}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8"><AvatarFallback>{initials(learner.name)}</AvatarFallback></Avatar>
                      <div><p className="font-medium text-sm">{learner.name}</p></div>
                    </div>
                  </TableCell>
                  <TableCell>{learner.className}</TableCell>
                  <TableCell>{learner.averageScore}%</TableCell>
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
          {filteredLearners.length > 20 ? <p className="py-4 text-center text-xs text-muted-foreground">Showing 20 of {filteredLearners.length} learners. Use filters to narrow results.</p> : null}
        </CardContent>
      </Card>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card className="rounded-3xl shadow-sm">
          <CardHeader>
            <CardTitle>Recent Assessments</CardTitle>
            <CardDescription>Latest assessment activity</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {assessments.slice(0, 8).map((assessment) => (
              <div key={assessment.id} className="rounded-2xl border p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-sm line-clamp-1">{assessment.name}</p>
                  <Badge variant={assessment.status === "published" ? "default" : "secondary"}>{assessment.status}</Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{assessment.subject} • {assessment.className} • {assessment.type}</p>
                <div className="mt-2 flex items-center gap-2">
                  <Progress value={assessment.gradingProgress} className="flex-1" />
                  <span className="text-xs font-medium">{assessment.gradingProgress}%</span>
                </div>
              </div>
            ))}
            {!assessments.length ? <p className="text-sm text-muted-foreground">No assessments found.</p> : null}
          </CardContent>
        </Card>

        <Card className="rounded-3xl shadow-sm">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common teacher tasks</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            <Button variant="outline" onClick={() => router.push(teacherHref("/teacher/classes"))} className="justify-start"><ListChecks className="size-4" />View All Classes</Button>
            <Button variant="outline" onClick={() => router.push(teacherHref("/teacher/resources"))} className="justify-start"><BookOpen className="size-4" />Learning Resources</Button>
            <Button variant="outline" onClick={() => router.push(teacherHref("/teacher/dashboard"))} className="justify-start"><BarChart3 className="size-4" />Main Dashboard</Button>
            <Button variant="outline" onClick={() => router.push(teacherHref("/teacher/messages"))} className="justify-start"><MessageSquare className="size-4" />Messages</Button>
            <Button variant="outline" onClick={() => router.push(teacherHref("/teacher/lesson-plans"))} className="justify-start"><FileText className="size-4" />Lesson Plans</Button>
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
              <p className="text-xs text-muted-foreground">{selectedLearner?.className} • {selectedLearner?.averageScore}% score • {selectedLearner?.attendanceRate}% attendance • Risk: {selectedLearner?.riskScore}</p>
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
