"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  AlertCircle,
  BarChart3,
  BookOpen,
  CalendarCheck,
  CheckCircle2,
  ClipboardCheck,
  Download,
  FileText,
  GraduationCap,
  MessageSquare,
  Plus,
  RefreshCcw,
  Save,
  Search,
  Send,
  ShieldCheck,
  TrendingUp,
  Users,
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
  description: string
  classId: string
  className: string
  subjectId: string
  subject: string
  subjectCode: string
  type: string
  totalScore: number
  passingScore: number
  dueDate: string | null
  status: string
  graded: number
  classStudents: number
  gradingProgress: number
  instructions: string
}

type TeacherGrade = {
  id: string
  studentName: string
  className: string
  subject: string
  subjectCode: string
  type: string
  assessment: string
  score: number
  maxScore: number
  percentage: number
  grade: string
  date: string | null
}

type TeacherLesson = {
  id: string
  day: string
  period: string
  startTime: string
  endTime: string
  classId: string
  className: string
  subjectId: string
  subject: string
  subjectCode: string
  room: string
  published: boolean
}

type TeacherAttendance = { id: string; classId: string; className: string; studentName: string; date: string | null; status: string; remarks: string }
type TeacherExam = { id: string; name: string; classId: string; className: string; date: string | null; startTime: string; endTime: string; room: string; type: string; status: string; totalMarks: number }
type TeacherNote = { id: string; classId: string; title: string; note: string; createdAt: string }
type Announcement = { id: string; title: string; content: string; createdAt: string | null }

type TeacherDashboardPayload = {
  generatedAt: string
  school: { id: string; name: string; slug: string; type: string }
  currentUser: { id: string; name: string; email: string; role: string; roleId: string; position: string; department: string; employeeId: string; qualifications: string }
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
    upcomingExams: number
  }
  classes: TeacherClass[]
  learners: TeacherLearner[]
  subjects: TeacherSubject[]
  assessments: TeacherAssessment[]
  grades: TeacherGrade[]
  timetable: TeacherLesson[]
  todaysLessons: TeacherLesson[]
  attendance: TeacherAttendance[]
  exams: TeacherExam[]
  notes: TeacherNote[]
  announcements: Announcement[]
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

function DashboardSkeleton() {
  return (
    <div className="w-full space-y-6 p-6 lg:p-8">
      <Skeleton className="h-60 rounded-3xl" />
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-36 rounded-3xl" />)}
      </section>
      <Skeleton className="h-[640px] rounded-3xl" />
    </div>
  )
}

async function fetchTeacherJson<T>(endpoint: string, fallback: string): Promise<{ data: T | null; error: string }> {
  let last = fallback
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetch(endpoint, { cache: "no-store", credentials: "include" }).catch(() => null)
    if (response?.ok) return { data: await response.json() as T, error: "" }
    const body = await response?.json().catch(() => ({}))
    last = String(body?.error || fallback)
    if (!response || ![401, 403].includes(response.status) || attempt === 3) break
    await new Promise((resolve) => window.setTimeout(resolve, 300 + attempt * 350))
  }
  return { data: null, error: last }
}

export default function TeacherDashboardPage() {
  const pathname = usePathname()
  const router = useRouter()
  const [payload, setPayload] = React.useState<TeacherDashboardPayload | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [refreshing, setRefreshing] = React.useState(false)
  const [error, setError] = React.useState("")
  const [query, setQuery] = React.useState("")
  const [selectedClassId, setSelectedClassId] = React.useState("all")
  const [activeTab, setActiveTab] = React.useState("classes")
  const [assessmentOpen, setAssessmentOpen] = React.useState(false)
  const [noteOpen, setNoteOpen] = React.useState(false)
  const [acting, setActing] = React.useState(false)
  const [assessmentForm, setAssessmentForm] = React.useState({ name: "", type: "assignment", totalScore: "100", passingScore: "50", dueDate: "", instructions: "" })
  const [noteForm, setNoteForm] = React.useState({ title: "Class follow-up", note: "" })
  const payloadRef = React.useRef<TeacherDashboardPayload | null>(null)

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
    return tenant ? `/api/tenant/teacher/dashboard?tenant=${encodeURIComponent(tenant)}` : "/api/teacher/dashboard"
  }, [tenantPrefix])

  const loadDashboard = React.useCallback(async (notify = false) => {
    setError("")
    if (!payloadRef.current) setLoading(true)
    const result = await fetchTeacherJson<TeacherDashboardPayload>(endpoint(), "Teacher dashboard could not be loaded")
    if (result.error || !result.data) {
      setError(result.error)
      if (!payloadRef.current) setLoading(false)
      if (notify) toast.error(result.error)
      return
    }
    const data = result.data
    setPayload(data)
    setSelectedClassId((current) => current === "all" ? current : current || data.classes[0]?.id || "all")
    setLoading(false)
    if (notify) toast.success("Teacher dashboard refreshed")
  }, [endpoint])

  React.useEffect(() => {
    void loadDashboard()
  }, [loadDashboard])

  const classes = payload?.classes || []
  const learners = payload?.learners || []
  const subjects = payload?.subjects || []
  const assessments = payload?.assessments || []
  const grades = payload?.grades || []
  const timetable = payload?.timetable || []
  const attendance = payload?.attendance || []
  const exams = payload?.exams || []
  const selectedClass = classes.find((item) => item.id === selectedClassId) || null
  const classOptions = selectedClassId === "all" ? classes : classes.filter((item) => item.id === selectedClassId)
  const search = query.trim().toLowerCase()
  const filteredClasses = classOptions.filter((item) => !search || [item.name, item.grade, item.academicYear].some((value) => value.toLowerCase().includes(search)))
  const filteredLearners = learners.filter((item) => (selectedClassId === "all" || item.classId === selectedClassId) && (!search || [item.name, item.email, item.admissionNumber, item.className].some((value) => value.toLowerCase().includes(search))))
  const filteredAssessments = assessments.filter((item) => (selectedClassId === "all" || item.classId === selectedClassId) && (!search || [item.name, item.className, item.subject, item.type, item.status].some((value) => value.toLowerCase().includes(search))))
  const filteredGrades = grades.filter((item) => (!selectedClass || item.className === selectedClass.name) && (!search || [item.studentName, item.subject, item.assessment, item.grade].some((value) => value.toLowerCase().includes(search))))
  const filteredLessons = timetable.filter((item) => (selectedClassId === "all" || item.classId === selectedClassId) && (!search || [item.day, item.className, item.subject, item.room].some((value) => value.toLowerCase().includes(search))))
  const filteredAttendance = attendance.filter((item) => (selectedClassId === "all" || item.classId === selectedClassId) && (!search || [item.studentName, item.className, item.status, item.remarks].some((value) => value.toLowerCase().includes(search))))

  const readiness = [
    { label: "Classes linked", ready: classes.length > 0, value: classes.length },
    { label: "Subjects mapped", ready: subjects.length > 0, value: subjects.length },
    { label: "Timetable synced", ready: timetable.length > 0, value: timetable.length },
    { label: "Gradebook active", ready: grades.length > 0, value: grades.length },
    { label: "Attendance records", ready: attendance.length > 0, value: attendance.length },
    { label: "Assessments live", ready: assessments.length > 0, value: assessments.length },
  ]
  const classRisk = classes.map((item) => ({
    ...item,
    risk: Math.max(0, Math.round((100 - item.attendanceRate) * 0.45 + Math.max(0, 70 - item.averageScore) * 0.55 + item.pendingAssessments * 4)),
  }))
  classRisk.sort((a, b) => b.risk - a.risk)
  const highestRisk = classRisk[0] || null
  const learnerRisk = learners.map((learner) => ({
    ...learner,
    risk: Math.max(0, Math.round((100 - learner.attendanceRate) * 0.5 + Math.max(0, 70 - learner.averageScore) * 0.5)),
  }))
  learnerRisk.sort((a, b) => b.risk - a.risk)
  const priorityLearners = learnerRisk.slice(0, 5)
  const coverage = {
    roster: learners.length,
    withGrades: learners.filter((learner) => learner.gradebookEntries > 0).length,
    withAttendance: learners.filter((learner) => learner.attendanceRate > 0).length,
    belowTarget: learnerRisk.filter((learner) => learner.risk >= 30).length,
  }

  const postAction = async (body: Record<string, unknown>, success: string) => {
    setActing(true)
    const response = await fetch(endpoint(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(body),
    }).catch(() => null)
    const data = await response?.json().catch(() => ({}))
    setActing(false)
    if (!response?.ok) {
      toast.error(String(data?.error || "Action failed"))
      return false
    }
    toast.success(success)
    await loadDashboard()
    return true
  }

  const createAssessment = async () => {
    const classId = selectedClass?.id || classes[0]?.id
    const subjectId = subjects[0]?.id
    if (!classId || !subjectId) {
      toast.error("A class and subject are required before creating an assessment")
      return
    }
    const ok = await postAction({ action: "assessment.create", classId, subjectId, ...assessmentForm }, "Assessment created")
    if (ok) setAssessmentOpen(false)
  }

  const saveNote = async () => {
    const ok = await postAction({ action: "class-note", classId: selectedClass?.id || "", ...noteForm }, "Class note saved")
    if (ok) setNoteOpen(false)
  }

  const exportDashboard = () => {
    if (!payload) return
    downloadFile(`${payload.school.slug}-teacher-dashboard.json`, JSON.stringify(payload, null, 2), "application/json")
  }

  if (loading) return <DashboardSkeleton />

  if (error) {
    return (
      <div className="w-full p-6 lg:p-8">
        <Card className="rounded-3xl border-destructive/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive"><AlertCircle className="size-5" />Teacher dashboard could not be loaded</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => loadDashboard(true)}><RefreshCcw className="size-4" />Retry</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="w-full space-y-6 p-6 lg:p-8">
      <section className="overflow-hidden rounded-3xl border bg-card shadow-sm">
        <div className="relative p-6 md:p-8">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(14,165,233,0.18),transparent_34%),linear-gradient(135deg,rgba(34,197,94,0.12),transparent_46%)]" />
          <div className="relative flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
            <div className="max-w-4xl space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="bg-background/80"><GraduationCap className="mr-1 size-3.5" />Teacher workspace</Badge>
                <Badge variant="outline" className="bg-background/80">{payload?.school.name}</Badge>
                <Badge variant="outline" className="bg-background/80">{payload?.currentUser.position || "Teacher / Lecturer"}</Badge>
              </div>
              <div>
                <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Teacher Dashboard</h1>
                <p className="mt-2 text-muted-foreground">
                  Welcome {payload?.currentUser.name}. Manage classes, lessons, attendance, assessments, gradebook activity, and school communication from one tenant-aware command center.
                </p>
              </div>
              <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2 xl:grid-cols-4">
                <span>Role: <strong className="text-foreground">{payload?.currentUser.roleId || payload?.currentUser.role}</strong></span>
                <span>Department: <strong className="text-foreground">{payload?.currentUser.department || "Not assigned"}</strong></span>
                <span>Employee ID: <strong className="text-foreground">{payload?.currentUser.employeeId || "Not assigned"}</strong></span>
                <span>Synced: <strong className="text-foreground">{formatDate(payload?.generatedAt || null)}</strong></span>
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row xl:flex-col 2xl:flex-row">
              <Button variant="outline" onClick={async () => { setRefreshing(true); await loadDashboard(true); setRefreshing(false) }} disabled={refreshing}>
                <RefreshCcw className={cn("size-4", refreshing && "animate-spin")} />Refresh
              </Button>
              <Button variant="outline" onClick={() => router.push(teacherHref("/teacher/messages"))}>
                <MessageSquare className="size-4" />Messages
              </Button>
              <Button onClick={() => setAssessmentOpen(true)}>
                <Plus className="size-4" />Create assessment
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Classes", value: payload?.metrics.classes || 0, helper: `${payload?.metrics.students || 0} learners`, icon: Users },
          { label: "Average Score", value: `${payload?.metrics.averageScore || 0}%`, helper: "Current gradebook average", icon: BarChart3 },
          { label: "Pending Grading", value: payload?.metrics.pendingGrading || 0, helper: "Submissions needing marks", icon: ClipboardCheck },
          { label: "Lessons Today", value: payload?.metrics.lessonsToday || 0, helper: `${payload?.metrics.timetableEntries || 0} timetable entries`, icon: CalendarCheck },
          { label: "Subjects", value: payload?.metrics.subjects || 0, helper: "Mapped to assigned teaching load", icon: BookOpen },
          { label: "Attendance", value: `${payload?.metrics.attendanceRate || 0}%`, helper: "Assigned learners only", icon: ShieldCheck },
          { label: "Upcoming Exams", value: payload?.metrics.upcomingExams || 0, helper: "For assigned classes", icon: FileText },
          { label: "At-Risk Learners", value: coverage.belowTarget, helper: "Needs teacher follow-up", icon: TrendingUp },
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
                <div className="rounded-2xl bg-primary/10 p-3 text-primary"><Icon className="size-5" /></div>
              </CardContent>
            </Card>
          )
        })}
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-6">
          <Card className="rounded-3xl shadow-sm">
            <CardHeader>
              <CardTitle>Teacher Command Center</CardTitle>
              <CardDescription>Only assigned classes and learners are loaded. Filter live class, timetable, assessment, attendance, and gradebook records.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px_220px]">
              <div className="relative">
                <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
                <Input className="pl-9" placeholder="Search classes, students, subjects, assessments..." value={query} onChange={(event) => setQuery(event.target.value)} />
              </div>
              <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                <SelectTrigger><SelectValue placeholder="Class" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All classes</SelectItem>
                  {classes.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={exportDashboard}><Download className="size-4" />Export dashboard</Button>
            </CardContent>
          </Card>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="grid h-auto grid-cols-2 gap-2 rounded-2xl bg-muted p-2 md:grid-cols-5">
              <TabsTrigger value="classes">Classes</TabsTrigger>
              <TabsTrigger value="learners">Learners</TabsTrigger>
              <TabsTrigger value="assessments">Assessments</TabsTrigger>
              <TabsTrigger value="gradebook">Gradebook</TabsTrigger>
              <TabsTrigger value="schedule">Schedule</TabsTrigger>
              <TabsTrigger value="attendance">Attendance</TabsTrigger>
            </TabsList>

            <TabsContent value="classes" className="grid gap-4 lg:grid-cols-2">
              {filteredClasses.map((item) => (
                <Card key={item.id} className="rounded-3xl shadow-sm">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <CardTitle>{item.name}</CardTitle>
                        <CardDescription>{item.academicYear || "Academic year not assigned"}</CardDescription>
                      </div>
                      <Badge variant="outline">{item.students} learners</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="rounded-2xl border p-3"><p className="text-xs text-muted-foreground">Score</p><p className="text-lg font-semibold">{item.averageScore}%</p></div>
                      <div className="rounded-2xl border p-3"><p className="text-xs text-muted-foreground">Attendance</p><p className="text-lg font-semibold">{item.attendanceRate}%</p></div>
                      <div className="rounded-2xl border p-3"><p className="text-xs text-muted-foreground">Lessons</p><p className="text-lg font-semibold">{item.timetableEntries}</p></div>
                    </div>
                    <Progress value={item.capacity ? Math.min(100, (item.students / item.capacity) * 100) : 100} />
                    <div className="grid gap-2 sm:grid-cols-3">
                      <Button variant="outline" onClick={() => router.push(teacherHref(`/teacher/classes?classId=${encodeURIComponent(item.id)}`))}>View class</Button>
                      <Button variant="outline" onClick={() => router.push(teacherHref(`/teacher/grades?classId=${encodeURIComponent(item.id)}`))}>Gradebook</Button>
                      <Button onClick={() => { setSelectedClassId(item.id); setNoteOpen(true) }}><FileText className="size-4" />Note</Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="learners" className="space-y-3">
              {filteredLearners.map((learner) => (
                <Card key={learner.id} className="rounded-3xl shadow-sm">
                  <CardContent className="grid gap-4 p-5 md:grid-cols-[minmax(0,1fr)_160px_160px_140px] md:items-center">
                    <div>
                      <p className="font-semibold">{learner.name}</p>
                      <p className="text-sm text-muted-foreground">{learner.admissionNumber || "No admission no."} - {learner.className}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Average score</p>
                      <p className="font-semibold">{learner.averageScore || 0}%</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Attendance</p>
                      <p className="font-semibold">{learner.attendanceRate || 0}%</p>
                    </div>
                    <Button variant="outline" onClick={() => router.push(teacherHref(`/teacher/classes?studentId=${encodeURIComponent(learner.id)}`))}>Open learner</Button>
                  </CardContent>
                </Card>
              ))}
              {!filteredLearners.length ? <Card className="rounded-3xl"><CardContent className="p-6 text-sm text-muted-foreground">No assigned learners found for this filter.</CardContent></Card> : null}
            </TabsContent>

            <TabsContent value="assessments" className="space-y-3">
              {filteredAssessments.map((item) => (
                <Card key={item.id} className="rounded-3xl shadow-sm">
                  <CardContent className="grid gap-4 p-5 lg:grid-cols-[minmax(0,1fr)_220px_160px] lg:items-center">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold">{item.name}</p>
                        <Badge variant="outline">{item.type}</Badge>
                        <Badge variant={item.status === "published" ? "default" : "secondary"}>{item.status}</Badge>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{item.subject} - {item.className} - Due {formatDate(item.dueDate)}</p>
                    </div>
                    <div>
                      <div className="mb-1 flex justify-between text-xs text-muted-foreground"><span>Grading progress</span><span>{item.gradingProgress}%</span></div>
                      <Progress value={item.gradingProgress} />
                    </div>
                    <Button variant="outline" onClick={() => router.push(teacherHref(`/teacher/assignments?assessmentId=${encodeURIComponent(item.id)}`))}>Open</Button>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="gradebook" className="space-y-3">
              {filteredGrades.slice(0, 25).map((item) => (
                <div key={item.id} className="grid gap-3 rounded-2xl border bg-card p-4 md:grid-cols-[minmax(0,1fr)_120px_120px] md:items-center">
                  <div>
                    <p className="font-medium">{item.studentName}</p>
                    <p className="text-sm text-muted-foreground">{item.assessment} - {item.subject} - {item.className}</p>
                  </div>
                  <div className="text-sm"><span className="font-semibold">{item.percentage}%</span> <span className="text-muted-foreground">({item.score}/{item.maxScore})</span></div>
                  <Badge variant="outline" className="w-fit">{item.grade || "Ungraded"}</Badge>
                </div>
              ))}
            </TabsContent>

            <TabsContent value="schedule" className="space-y-3">
              {filteredLessons.map((lesson) => (
                <div key={lesson.id} className="grid gap-3 rounded-2xl border bg-card p-4 md:grid-cols-[120px_minmax(0,1fr)_160px] md:items-center">
                  <div><p className="font-semibold">{lesson.day}</p><p className="text-sm text-muted-foreground">{lesson.startTime} - {lesson.endTime}</p></div>
                  <div><p className="font-medium">{lesson.subject}</p><p className="text-sm text-muted-foreground">{lesson.className} - Room {lesson.room || "TBA"}</p></div>
                  <Button variant="outline" onClick={() => router.push(teacherHref(`/teacher/attendance?classId=${encodeURIComponent(lesson.classId)}`))}>Mark attendance</Button>
                </div>
              ))}
            </TabsContent>

            <TabsContent value="attendance" className="space-y-3">
              {filteredAttendance.slice(0, 40).map((record) => (
                <div key={record.id} className="grid gap-3 rounded-2xl border bg-card p-4 md:grid-cols-[minmax(0,1fr)_120px_140px] md:items-center">
                  <div><p className="font-medium">{record.studentName}</p><p className="text-sm text-muted-foreground">{record.className} - {record.remarks || "No remarks"}</p></div>
                  <Badge variant="outline" className="w-fit">{record.status}</Badge>
                  <span className="text-sm text-muted-foreground">{formatDate(record.date)}</span>
                </div>
              ))}
            </TabsContent>
          </Tabs>
        </div>

        <aside className="space-y-6">
          <Card className="rounded-3xl shadow-sm">
            <CardHeader>
              <CardTitle>Assigned Learner Coverage</CardTitle>
              <CardDescription>Roster health for learners this teacher is assigned to teach.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: "Assigned roster", value: coverage.roster, helper: "Learners in assigned classes" },
                { label: "With gradebook", value: coverage.withGrades, helper: "Has teacher-recorded grades" },
                { label: "With attendance", value: coverage.withAttendance, helper: "Has attendance signal" },
                { label: "Below target", value: coverage.belowTarget, helper: "Score/attendance risk" },
              ].map((item) => (
                <div key={item.label} className="rounded-2xl border p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{item.label}</p>
                    <Badge variant="outline">{item.value}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{item.helper}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="rounded-3xl shadow-sm">
            <CardHeader>
              <CardTitle>Operational Readiness</CardTitle>
              <CardDescription>Signals needed for a complete teaching workflow.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {readiness.map((item) => (
                <div key={item.label} className="flex items-center justify-between rounded-2xl border p-3">
                  <div className="flex items-center gap-2">
                    {item.ready ? <CheckCircle2 className="size-4 text-emerald-500" /> : <AlertCircle className="size-4 text-amber-500" />}
                    <span className="text-sm font-medium">{item.label}</span>
                  </div>
                  <Badge variant="outline">{item.value}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="rounded-3xl shadow-sm">
            <CardHeader>
              <CardTitle>Priority Learners</CardTitle>
              <CardDescription>Highest support needs from assigned learner data.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {priorityLearners.length ? priorityLearners.map((learner) => (
                <button
                  key={learner.id}
                  type="button"
                  onClick={() => {
                    setSelectedClassId(learner.classId)
                    setQuery(learner.name)
                    setActiveTab("learners")
                  }}
                  className="w-full rounded-2xl border p-3 text-left transition-colors hover:bg-muted"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium">{learner.name}</p>
                    <Badge variant={learner.risk >= 35 ? "destructive" : "outline"}>{learner.risk}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{learner.className} - {learner.averageScore || 0}% score - {learner.attendanceRate || 0}% attendance</p>
                </button>
              )) : <p className="text-sm text-muted-foreground">No assigned learner risk data yet.</p>}
            </CardContent>
          </Card>

          <Card className="rounded-3xl shadow-sm">
            <CardHeader>
              <CardTitle>Priority Class</CardTitle>
              <CardDescription>{highestRisk ? "Highest support need by score, attendance, and grading load." : "No class risk data available."}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {highestRisk ? (
                <>
                  <div className={cn("rounded-2xl border p-4", highestRisk.risk > 35 ? tone.warn : tone.good)}>
                    <p className="text-sm text-muted-foreground">Focus class</p>
                    <p className="text-xl font-semibold">{highestRisk.name}</p>
                    <p className="text-sm">Risk score {highestRisk.risk}</p>
                  </div>
                  <Button className="w-full" onClick={() => { setSelectedClassId(highestRisk.id); setActiveTab("classes") }}>Open priority class</Button>
                </>
              ) : <p className="text-sm text-muted-foreground">Assign classes, timetable, or assessments to populate this view.</p>}
            </CardContent>
          </Card>

          <Card className="rounded-3xl shadow-sm">
            <CardHeader>
              <CardTitle>Today&apos;s Lessons</CardTitle>
              <CardDescription>Published timetable entries assigned to you today.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {(payload?.todaysLessons || []).length ? payload!.todaysLessons.map((lesson) => (
                <div key={lesson.id} className="rounded-2xl border p-3">
                  <p className="font-medium">{lesson.subject}</p>
                  <p className="text-sm text-muted-foreground">{lesson.className} - {lesson.startTime} to {lesson.endTime}</p>
                </div>
              )) : <p className="text-sm text-muted-foreground">No lessons assigned for today.</p>}
            </CardContent>
          </Card>

          <Card className="rounded-3xl shadow-sm">
            <CardHeader>
              <CardTitle>Teacher Actions</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2">
              <Button variant="outline" onClick={() => setAssessmentOpen(true)}><Plus className="size-4" />Create assessment</Button>
              <Button variant="outline" onClick={() => setNoteOpen(true)}><Save className="size-4" />Save class note</Button>
              <Button variant="outline" onClick={() => router.push(teacherHref("/teacher/resources"))}><BookOpen className="size-4" />Learning content</Button>
              <Button variant="outline" onClick={() => router.push(teacherHref("/teacher/messages"))}><Send className="size-4" />Message students/staff</Button>
            </CardContent>
          </Card>

          <Card className="rounded-3xl shadow-sm">
            <CardHeader>
              <CardTitle>School Notices</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(payload?.announcements || []).slice(0, 4).map((item) => (
                <div key={item.id} className="rounded-2xl border p-3">
                  <p className="font-medium">{item.title}</p>
                  <p className="line-clamp-2 text-sm text-muted-foreground">{item.content}</p>
                </div>
              ))}
              {!payload?.announcements?.length ? <p className="text-sm text-muted-foreground">No published notices for teachers.</p> : null}
            </CardContent>
          </Card>
        </aside>
      </section>

      <Dialog open={assessmentOpen} onOpenChange={setAssessmentOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Create Assessment</DialogTitle>
            <DialogDescription>Create a published assignment, quiz, test, project, or exam for the selected class.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <Input placeholder="Assessment title" value={assessmentForm.name} onChange={(event) => setAssessmentForm((current) => ({ ...current, name: event.target.value }))} />
            <div className="grid gap-3 sm:grid-cols-3">
              <Select value={assessmentForm.type} onValueChange={(value) => setAssessmentForm((current) => ({ ...current, type: value }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["assignment", "quiz", "test", "project", "exam"].map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input placeholder="Total score" value={assessmentForm.totalScore} onChange={(event) => setAssessmentForm((current) => ({ ...current, totalScore: event.target.value }))} />
              <Input placeholder="Passing score" value={assessmentForm.passingScore} onChange={(event) => setAssessmentForm((current) => ({ ...current, passingScore: event.target.value }))} />
            </div>
            <Input type="date" value={assessmentForm.dueDate} onChange={(event) => setAssessmentForm((current) => ({ ...current, dueDate: event.target.value }))} />
            <Textarea placeholder="Instructions" value={assessmentForm.instructions} onChange={(event) => setAssessmentForm((current) => ({ ...current, instructions: event.target.value }))} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssessmentOpen(false)}>Cancel</Button>
            <Button onClick={createAssessment} disabled={acting || !assessmentForm.name}>{acting ? "Creating..." : "Create assessment"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={noteOpen} onOpenChange={setNoteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Class Note</DialogTitle>
            <DialogDescription>Store a teacher follow-up note for this dashboard.</DialogDescription>
          </DialogHeader>
          <Input value={noteForm.title} onChange={(event) => setNoteForm((current) => ({ ...current, title: event.target.value }))} />
          <Textarea value={noteForm.note} placeholder="Write note..." onChange={(event) => setNoteForm((current) => ({ ...current, note: event.target.value }))} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setNoteOpen(false)}>Cancel</Button>
            <Button onClick={saveNote} disabled={acting || !noteForm.note}>{acting ? "Saving..." : "Save note"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
