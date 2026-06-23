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
  ClipboardCheck,
  Download,
  FileText,
  GraduationCap,
  Mail,
  MessageSquare,
  Plus,
  RefreshCcw,
  Search,
  Send,
  Users,
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
// Tabs UI from the design system is not used here; we'll render a custom nav tab bar
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

type TeacherDashboardPayload = {
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

const riskTone = {
  low: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300",
  medium: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300",
  high: "border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300",
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
  if (!response?.ok) throw new Error(String(body?.error || "Assigned classes could not be loaded"))
  return body as TeacherDashboardPayload
}

function ClassesSkeleton() {
  return (
    <div className="w-full space-y-6 p-6 lg:p-8">
      <Skeleton className="h-56 rounded-3xl" />
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-32 rounded-3xl" />)}
      </section>
      <Skeleton className="h-[520px] rounded-3xl" />
    </div>
  )
}

export default function TeacherClassesPage() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()
  const requestedClassId = searchParams?.get("classId") || ""
  const requestedStudentId = searchParams?.get("studentId") || ""
  const requestedTab = searchParams?.get("tab") || ""
  const [payload, setPayload] = React.useState<TeacherDashboardPayload | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [refreshing, setRefreshing] = React.useState(false)
  const [acting, setActing] = React.useState(false)
  const [error, setError] = React.useState("")
  const [query, setQuery] = React.useState("")
  const [selectedClassId, setSelectedClassId] = React.useState(requestedClassId || "all")
  const [activeTab, setActiveTab] = React.useState(requestedStudentId ? "learners" : requestedTab || "classes")
  const [assessmentOpen, setAssessmentOpen] = React.useState(false)
  const [noteOpen, setNoteOpen] = React.useState(false)
  const [assessmentForm, setAssessmentForm] = React.useState({ classId: requestedClassId, subjectId: "", name: "", type: "assignment", totalScore: "100", passingScore: "50", dueDate: "", instructions: "" })
  const [noteForm, setNoteForm] = React.useState({ classId: requestedClassId, title: "Class follow-up", note: "" })
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
    // The dashboard API returns the full teacher payload (classes, learners, metrics, etc.)
    // Use the dashboard endpoint rather than an unimplemented /api/teacher/classes route.
    return teacherDashboardApi("dashboard")
  }, [tenantPrefix])

  const load = React.useCallback(async (notify = false) => {
    setError("")
    if (payloadRef.current) setRefreshing(true)
    else setLoading(true)
    try {
      const data = await fetchTeacherJson(endpoint())
      setPayload(data)
      const requestedClass = requestedClassId
      // guard in case the payload shape is incomplete
      if (requestedClass && Array.isArray(data.classes) && data.classes.some((item) => item.id === requestedClass)) {
        setSelectedClassId(requestedClass)
      }
      if (notify) toast.success("Assigned classes refreshed")
    } catch (err) {
      const message = err instanceof Error ? err.message : "Assigned classes could not be loaded"
      setError(message)
      if (notify) toast.error(message)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [endpoint, requestedClassId])

  React.useEffect(() => {
    void load()
  }, [load])

  const classes = payload?.classes || []
  const learners = payload?.learners || []
  const subjects = payload?.subjects || []
  const assessments = payload?.assessments || []
  const timetable = payload?.timetable || []
  const notes = payload?.notes || []
  const selectedClass = classes.find((item) => item.id === selectedClassId) || null
  const selectedClassIds = selectedClass ? [selectedClass.id] : classes.map((item) => item.id)
  const search = query.trim().toLowerCase()

  const classStats = React.useMemo(() => {
    return classes.map((item) => {
      const classLearners = learners.filter((learner) => learner.classId === item.id)
      const classAssessments = assessments.filter((assessment) => assessment.classId === item.id)
      const classLessons = timetable.filter((lesson) => lesson.classId === item.id)
      const lowScore = classLearners.filter((learner) => learner.averageScore > 0 && learner.averageScore < 60).length
      const lowAttendance = classLearners.filter((learner) => learner.attendanceRate > 0 && learner.attendanceRate < 85).length
      const risk = Math.max(0, Math.round((100 - item.attendanceRate) * 0.45 + Math.max(0, 70 - item.averageScore) * 0.55 + item.pendingAssessments * 4))
      return { ...item, classLearners, classAssessments, classLessons, lowScore, lowAttendance, risk }
    })
  }, [assessments, classes, learners, timetable])

  const filteredClasses = classStats.filter((item) => {
    if (selectedClass && item.id !== selectedClass.id) return false
    if (!search) return true
    return [item.name, item.grade, item.section, item.academicYear].some((value) => value.toLowerCase().includes(search))
  })

  const filteredLearners = learners
    .filter((learner) => selectedClassIds.includes(learner.classId))
    .filter((learner) => !search || [learner.name, learner.email, learner.admissionNumber, learner.className].some((value) => value.toLowerCase().includes(search)))
    .sort((a, b) => a.className.localeCompare(b.className) || a.name.localeCompare(b.name))

  const filteredAssessments = assessments
    .filter((assessment) => selectedClassIds.includes(assessment.classId))
    .filter((assessment) => !search || [assessment.name, assessment.className, assessment.subject, assessment.type, assessment.status].some((value) => value.toLowerCase().includes(search)))

  const filteredLessons = timetable
    .filter((lesson) => selectedClassIds.includes(lesson.classId))
    .filter((lesson) => !search || [lesson.day, lesson.subject, lesson.className, lesson.room].some((value) => value.toLowerCase().includes(search)))

  const selectedNotes = notes.filter((note) => !note.classId || selectedClassIds.includes(note.classId))
  const topRiskLearners = [...filteredLearners]
    .map((learner) => ({ ...learner, risk: Math.max(0, Math.round((100 - learner.attendanceRate) * 0.5 + Math.max(0, 70 - learner.averageScore) * 0.5)) }))
    .sort((a, b) => b.risk - a.risk)
    .slice(0, 5)

  const postAction = async (body: Record<string, unknown>, success: string) => {
    setActing(true)
    const response = await fetch(endpoint(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(body),
    }).catch(() => null)
    const result = await response?.json().catch(() => ({}))
    setActing(false)
    if (!response?.ok) {
      toast.error(String(result?.error || "Action failed"))
      return false
    }
    toast.success(success)
    await load()
    return true
  }

  const openAssessmentDialog = (classId?: string) => {
    const nextClassId = classId || selectedClass?.id || classes[0]?.id || ""
    setAssessmentForm((current) => ({ ...current, classId: nextClassId, subjectId: current.subjectId || subjects[0]?.id || "" }))
    setAssessmentOpen(true)
  }

  const createAssessment = async () => {
    const ok = await postAction({ action: "assessment.create", ...assessmentForm }, "Assessment created")
    if (ok) setAssessmentOpen(false)
  }

  const openNoteDialog = (classId?: string) => {
    setNoteForm((current) => ({ ...current, classId: classId || selectedClass?.id || "" }))
    setNoteOpen(true)
  }

  const saveNote = async () => {
    const ok = await postAction({ action: "class-note", ...noteForm }, "Class note saved")
    if (ok) setNoteOpen(false)
  }

  const exportRoster = (classId?: string) => {
    const rows = learners
      .filter((learner) => !classId || learner.classId === classId)
      .map((learner) => ({
        name: learner.name,
        className: learner.className,
        admissionNumber: learner.admissionNumber,
        email: learner.email,
        averageScore: learner.averageScore,
        attendanceRate: learner.attendanceRate,
      }))
    if (!rows.length) {
      toast.error("No learners available to export")
      return
    }
    downloadFile(`${payload?.school?.slug ?? "teacher"}-${classId || "assigned"}-roster.csv`, toCsv(rows), "text/csv")
    toast.success("Roster export started")
  }

  const messageClass = (classId: string) => router.push(teacherHref(`/teacher/messages?classId=${encodeURIComponent(classId)}`))
  const messageLearner = (learnerId: string) => router.push(teacherHref(`/teacher/messages?learnerId=${encodeURIComponent(learnerId)}`))

  if (loading) return <ClassesSkeleton />

  if (error) {
    return (
      <div className="w-full p-6 lg:p-8">
        <Card className="rounded-3xl border-destructive/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive"><AlertCircle className="size-5" />Assigned classes could not be loaded</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => load(true)}><RefreshCcw className="size-4" />Retry</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="w-full space-y-6 p-6 lg:p-8">
      <section className="overflow-hidden rounded-3xl border bg-card shadow-sm">
        <div className="relative p-6 md:p-8">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.16),transparent_34%),linear-gradient(135deg,rgba(16,185,129,0.12),transparent_46%)]" />
          <div className="relative flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
            <div className="max-w-4xl space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="bg-background/80"><GraduationCap className="mr-1 size-3.5" />Teacher workspace</Badge>
                <Badge variant="outline" className="bg-background/80">{payload?.school?.name}</Badge>
                <Badge variant="outline" className="bg-background/80">Assigned scope only</Badge>
              </div>
              <div>
                <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">My Classes</h1>
                <p className="mt-2 text-muted-foreground">
                  Manage the classes, learners, timetable records, assessments, and class notes assigned to {payload?.currentUser?.name}.
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row xl:flex-col 2xl:flex-row">
              <Button variant="outline" onClick={() => router.push(teacherHref("/teacher/dashboard"))}>
                <BarChart3 className="size-4" />Dashboard
              </Button>
              <Button variant="outline" onClick={() => load(true)} disabled={refreshing}>
                <RefreshCcw className={cn("size-4", refreshing && "animate-spin")} />Refresh
              </Button>
              <Button onClick={() => openAssessmentDialog()}>
                <Plus className="size-4" />Create assessment
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Assigned Classes", value: payload?.metrics?.classes ?? 0, helper: `${payload?.metrics?.students ?? 0} learners`, icon: Users },
          { label: "Average Score", value: `${payload?.metrics?.averageScore ?? 0}%`, helper: "Across teacher gradebook", icon: BarChart3 },
          { label: "Attendance", value: `${payload?.metrics?.attendanceRate ?? 0}%`, helper: "Assigned learners only", icon: CalendarCheck },
          { label: "Pending Grading", value: payload?.metrics?.pendingGrading ?? 0, helper: `${payload?.metrics?.assessments ?? 0} assessments`, icon: ClipboardCheck },
        ].map((item) => {
          const Icon = item.icon
          return (
            <Card key={item.label} className="rounded-3xl shadow-sm">
              <CardContent className="flex min-h-32 items-start justify-between gap-4 p-5">
                <div>
                  <p className="text-sm text-muted-foreground">{item.label}</p>
                  <p className="mt-2 text-3xl font-semibold">{item.value}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{item.helper}</p>
                </div>
                <div className="rounded-2xl bg-primary/10 p-3 text-primary"><Icon className="size-5" /></div>
              </CardContent>
            </Card>
          )
        })}
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <Card className="rounded-3xl shadow-sm">
            <CardHeader>
              <CardTitle>Class Controls</CardTitle>
              <CardDescription>Filter assigned classes and learners without leaving the page.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px_180px]">
              <div className="relative">
                <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
                <Input className="pl-9" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search class, learner, subject, assessment..." />
              </div>
              <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                <SelectTrigger><SelectValue placeholder="Class" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All assigned classes</SelectItem>
                  {classes.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={() => exportRoster(selectedClass?.id)}>
                <Download className="size-4" />Export roster
              </Button>
            </CardContent>
          </Card>

          {/* Nav tabs styled like resources page: responsive, scrollable, with active state */}
          <div className="space-y-4">
            <div className="border-b border-muted">
              <div className="flex gap-1 overflow-x-auto">
                <button
                  onClick={() => setActiveTab("classes")}
                  className={cn(
                    "flex items-center gap-2 px-5 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-all",
                    activeTab === "classes"
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Users className="size-4" />
                  Classes
                  <Badge variant="secondary" className="ml-1 text-xs">{filteredClasses.length}</Badge>
                </button>

                <button
                  onClick={() => setActiveTab("learners")}
                  className={cn(
                    "flex items-center gap-2 px-5 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-all",
                    activeTab === "learners"
                      ? "border-destructive text-destructive"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Users className="size-4" />
                  Learners
                  <Badge variant="secondary" className="ml-1 text-xs">{filteredLearners.length}</Badge>
                </button>

                <button
                  onClick={() => setActiveTab("assessments")}
                  className={cn(
                    "flex items-center gap-2 px-5 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-all",
                    activeTab === "assessments"
                      ? "border-emerald-500 text-emerald-600"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  <ClipboardCheck className="size-4" />
                  Assessments
                  <Badge variant="secondary" className="ml-1 text-xs">{filteredAssessments.length}</Badge>
                </button>

                <button
                  onClick={() => setActiveTab("schedule")}
                  className={cn(
                    "flex items-center gap-2 px-5 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-all",
                    activeTab === "schedule"
                      ? "border-amber-500 text-amber-600"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  <CalendarCheck className="size-4" />
                  Schedule
                  <Badge variant="secondary" className="ml-1 text-xs">{filteredLessons.length}</Badge>
                </button>
              </div>
            </div>

            {/* Tab panels (previously TabsContent) rendered conditionally */}
            {activeTab === "classes" && (
              <div className="grid gap-4 lg:grid-cols-2">
                {filteredClasses.map((item) => (
                  <Card key={item.id} className="rounded-3xl shadow-sm">
                    <CardHeader>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <CardTitle>{item.name}</CardTitle>
                          <CardDescription>{item.academicYear || "Academic year not assigned"}</CardDescription>
                        </div>
                        <Badge className={cn("border", item.risk >= 40 ? riskTone.high : item.risk >= 20 ? riskTone.medium : riskTone.low)} variant="outline">
                          Risk {item.risk}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid gap-3 sm:grid-cols-4">
                        <div className="rounded-2xl border p-3"><p className="text-xs text-muted-foreground">Learners</p><p className="text-lg font-semibold">{item.students}</p></div>
                        <div className="rounded-2xl border p-3"><p className="text-xs text-muted-foreground">Score</p><p className="text-lg font-semibold">{item.averageScore}%</p></div>
                        <div className="rounded-2xl border p-3"><p className="text-xs text-muted-foreground">Attendance</p><p className="text-lg font-semibold">{item.attendanceRate}%</p></div>
                        <div className="rounded-2xl border p-3"><p className="text-xs text-muted-foreground">Lessons</p><p className="text-lg font-semibold">{item.timetableEntries}</p></div>
                      </div>
                      <div>
                        <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                          <span>Capacity</span>
                          <span>{item.capacity ? `${item.students}/${item.capacity}` : `${item.students} learners`}</span>
                        </div>
                        <Progress value={item.capacity ? Math.min(100, (item.students / item.capacity) * 100) : 100} />
                      </div>
                      <div className="grid gap-2 sm:grid-cols-3">
                        <Button variant="outline" onClick={() => router.push(teacherHref(`/teacher/classes/${encodeURIComponent(item.id)}`))}>
                          <Users className="size-4" />Roster
                        </Button>
                        <Button variant="outline" onClick={() => messageClass(item.id)}>
                          <MessageSquare className="size-4" />Message
                        </Button>
                        <Button onClick={() => openAssessmentDialog(item.id)}>
                          <Plus className="size-4" />Assessment
                        </Button>
                        <Button variant="outline" onClick={() => openNoteDialog(item.id)}>
                          <FileText className="size-4" />Note
                        </Button>
                        <Button variant="outline" onClick={() => exportRoster(item.id)}>
                          <Download className="size-4" />Export
                        </Button>
                        <Button variant="outline" onClick={() => router.push(teacherHref(`/teacher/attendance?classId=${encodeURIComponent(item.id)}`))}>
                          <CalendarCheck className="size-4" />Attendance
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {!filteredClasses.length ? <Card className="rounded-3xl"><CardContent className="p-6 text-sm text-muted-foreground">No assigned classes match this filter.</CardContent></Card> : null}
              </div>
            )}

            {activeTab === "learners" && (
              <Card className="rounded-3xl shadow-sm">
                <CardHeader>
                  <CardTitle>Assigned Learners</CardTitle>
                  <CardDescription>Roster rows are limited to learners in classes assigned to this teacher.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Learner</TableHead>
                        <TableHead>Class</TableHead>
                        <TableHead>Admission</TableHead>
                        <TableHead>Score</TableHead>
                        <TableHead>Attendance</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredLearners.map((learner) => (
                        <TableRow key={learner.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar><AvatarFallback>{initials(learner.name)}</AvatarFallback></Avatar>
                              <div>
                                <p className="font-medium">{learner.name}</p>
                                <p className="text-xs text-muted-foreground">{learner.email || "No email"}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{learner.className}</TableCell>
                          <TableCell>{learner.admissionNumber || "-"}</TableCell>
                          <TableCell>{learner.averageScore || 0}%</TableCell>
                          <TableCell>{learner.attendanceRate || 0}%</TableCell>
                          <TableCell className="text-right">
                            <Button size="sm" variant="ghost" onClick={() => messageLearner(learner.id)}>
                              <MessageSquare className="size-4" />Message
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {!filteredLearners.length ? <p className="py-8 text-center text-sm text-muted-foreground">No learners found for this filter.</p> : null}
                </CardContent>
              </Card>
            )}

            {activeTab === "assessments" && (
              <div className="space-y-3">
                {filteredAssessments.map((assessment) => (
                  <Card key={assessment.id} className="rounded-3xl shadow-sm">
                    <CardContent className="grid gap-4 p-5 lg:grid-cols-[minmax(0,1fr)_220px_140px] lg:items-center">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold">{assessment.name}</p>
                          <Badge variant="outline">{assessment.type}</Badge>
                          <Badge variant={assessment.status === "published" ? "default" : "secondary"}>{assessment.status}</Badge>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">{assessment.subject || "Subject"} - {assessment.className} - Due {formatDate(assessment.dueDate)}</p>
                      </div>
                      <div>
                        <div className="mb-1 flex justify-between text-xs text-muted-foreground"><span>Grading</span><span>{assessment.gradingProgress}%</span></div>
                        <Progress value={assessment.gradingProgress} />
                      </div>
                      <Button variant="outline" onClick={() => router.push(teacherHref(`/teacher/assignments?assessmentId=${encodeURIComponent(assessment.id)}`))}>
                        Open
                      </Button>
                    </CardContent>
                  </Card>
                ))}
                {!filteredAssessments.length ? <Card className="rounded-3xl"><CardContent className="p-6 text-sm text-muted-foreground">No assessments found for this filter.</CardContent></Card> : null}
              </div>
            )}

            {activeTab === "schedule" && (
              <div className="space-y-3">
                {filteredLessons.map((lesson) => (
                  <div key={lesson.id} className="grid gap-3 rounded-2xl border bg-card p-4 md:grid-cols-[120px_minmax(0,1fr)_150px] md:items-center">
                    <div><p className="font-semibold">{lesson.day}</p><p className="text-sm text-muted-foreground">{lesson.startTime || "TBA"} - {lesson.endTime || "TBA"}</p></div>
                    <div><p className="font-medium">{lesson.subject}</p><p className="text-sm text-muted-foreground">{lesson.className} - Room {lesson.room || "TBA"}</p></div>
                    <Button variant="outline" onClick={() => router.push(teacherHref(`/teacher/attendance?classId=${encodeURIComponent(lesson.classId)}`))}>Attendance</Button>
                  </div>
                ))}
                {!filteredLessons.length ? <Card className="rounded-3xl"><CardContent className="p-6 text-sm text-muted-foreground">No timetable entries found for this filter.</CardContent></Card> : null}
              </div>
            )}
          </div>
        </div>

        <aside className="space-y-6">
          <Card className="rounded-3xl shadow-sm">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2">
              <Button variant="outline" onClick={() => openAssessmentDialog()}><Plus className="size-4" />Create assessment</Button>
              <Button variant="outline" onClick={() => openNoteDialog()}><FileText className="size-4" />Save class note</Button>
              <Button variant="outline" onClick={() => router.push(teacherHref("/teacher/dashboard"))}><BarChart3 className="size-4" />Open dashboard</Button>
              <Button variant="outline" onClick={() => router.push(teacherHref("/teacher/messages"))}><Send className="size-4" />Open messages</Button>
              <Button variant="outline" onClick={() => exportRoster()}><Download className="size-4" />Export all learners</Button>
              <Button variant="outline" onClick={() => {
                const emails = filteredLearners.map((learner) => learner.email).filter(Boolean)
                if (!emails.length) return toast.error("No learner emails found")
                window.location.href = `mailto:?bcc=${encodeURIComponent(emails.join(","))}`
              }}><Mail className="size-4" />Email filtered learners</Button>
            </CardContent>
          </Card>

          <Card className="rounded-3xl shadow-sm">
            <CardHeader>
              <CardTitle>Support Watchlist</CardTitle>
              <CardDescription>Highest support signals from assigned learners.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {topRiskLearners.map((learner) => (
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
              ))}
              {!topRiskLearners.length ? <p className="text-sm text-muted-foreground">No support watchlist data yet.</p> : null}
            </CardContent>
          </Card>

          <Card className="rounded-3xl shadow-sm">
            <CardHeader>
              <CardTitle>Teaching Load</CardTitle>
              <CardDescription>Assigned records currently available through the real teacher API.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: "Subjects", value: subjects.length, icon: BookOpen },
                { label: "Timetable entries", value: timetable.length, icon: CalendarCheck },
                { label: "Assessments", value: assessments.length, icon: ClipboardCheck },
                { label: "Learners loaded", value: learners.length, icon: Users },
              ].map((item) => {
                const Icon = item.icon
                return (
                  <div key={item.label} className="flex items-center justify-between rounded-2xl border p-3">
                    <div className="flex items-center gap-2"><Icon className="size-4 text-primary" /><span className="text-sm font-medium">{item.label}</span></div>
                    <Badge variant="outline">{item.value}</Badge>
                  </div>
                )
              })}
            </CardContent>
          </Card>

          <Card className="rounded-3xl shadow-sm">
            <CardHeader>
              <CardTitle>Recent Notes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {selectedNotes.slice(0, 5).map((note) => (
                <div key={note.id} className="rounded-2xl border p-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-emerald-500" />
                    <p className="font-medium">{note.title}</p>
                  </div>
                  <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">{note.note}</p>
                  <p className="mt-2 text-xs text-muted-foreground">{formatDate(note.createdAt)}</p>
                </div>
              ))}
              {!selectedNotes.length ? <p className="text-sm text-muted-foreground">No notes saved for this selection.</p> : null}
            </CardContent>
          </Card>
        </aside>
      </section>

      <Dialog open={assessmentOpen} onOpenChange={setAssessmentOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Create Assessment</DialogTitle>
            <DialogDescription>Create a published assessment for one of your assigned classes.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <Select value={assessmentForm.classId} onValueChange={(value) => setAssessmentForm((current) => ({ ...current, classId: value }))}>
              <SelectTrigger><SelectValue placeholder="Class" /></SelectTrigger>
              <SelectContent>{classes.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={assessmentForm.subjectId} onValueChange={(value) => setAssessmentForm((current) => ({ ...current, subjectId: value }))}>
              <SelectTrigger><SelectValue placeholder="Subject" /></SelectTrigger>
              <SelectContent>{subjects.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}{item.code ? ` (${item.code})` : ""}</SelectItem>)}</SelectContent>
            </Select>
            <Input placeholder="Assessment title" value={assessmentForm.name} onChange={(event) => setAssessmentForm((current) => ({ ...current, name: event.target.value }))} />
            <div className="grid gap-3 sm:grid-cols-3">
              <Select value={assessmentForm.type} onValueChange={(value) => setAssessmentForm((current) => ({ ...current, type: value }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["assignment", "quiz", "test", "project", "exam"].map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
              </Select>
              <Input placeholder="Total score" value={assessmentForm.totalScore} onChange={(event) => setAssessmentForm((current) => ({ ...current, totalScore: event.target.value }))} />
              <Input placeholder="Passing score" value={assessmentForm.passingScore} onChange={(event) => setAssessmentForm((current) => ({ ...current, passingScore: event.target.value }))} />
            </div>
            <Input type="date" value={assessmentForm.dueDate} onChange={(event) => setAssessmentForm((current) => ({ ...current, dueDate: event.target.value }))} />
            <Textarea placeholder="Instructions" value={assessmentForm.instructions} onChange={(event) => setAssessmentForm((current) => ({ ...current, instructions: event.target.value }))} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssessmentOpen(false)}>Cancel</Button>
            <Button onClick={createAssessment} disabled={acting || !assessmentForm.classId || !assessmentForm.subjectId || !assessmentForm.name}>
              {acting ? "Creating..." : "Create assessment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={noteOpen} onOpenChange={setNoteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Class Note</DialogTitle>
            <DialogDescription>Store a teacher follow-up note against your assigned class workspace.</DialogDescription>
          </DialogHeader>
          <Select value={noteForm.classId || "general"} onValueChange={(value) => setNoteForm((current) => ({ ...current, classId: value === "general" ? "" : value }))}>
            <SelectTrigger><SelectValue placeholder="Class" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="general">General note</SelectItem>
              {classes.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}
            </SelectContent>
          </Select>
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
