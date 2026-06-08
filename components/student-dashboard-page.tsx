"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import {
  ArrowRight,
  Award,
  BarChart3,
  Bell,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  ExternalLink,
  FileText,
  GraduationCap,
  HelpCircle,
  MessageSquare,
  Play,
  RefreshCcw,
  Search,
  Send,
  ShieldCheck,
  Star,
  Timer,
  TrendingUp,
  Upload,
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

type Level = "primary" | "secondary" | "college" | "university" | "vocational"
type AssignmentStatus = "submitted" | "pending" | "late" | "graded"
type ExamStatus = "available" | "scheduled" | "completed"

type Course = {
  id?: string
  code: string
  title: string
  type?: string
  teacherId?: string
  instructor: string
  progress: number
  grade: string
  attendance: number
  credits: number
}

type Assignment = {
  id: string
  subjectId?: string
  title: string
  type?: string
  course: string
  teacherId?: string
  teacher?: string
  due: string
  dueDate?: string | null
  releaseDate?: string | null
  points: number
  status: AssignmentStatus
  score?: number
  description?: string
  instructions?: string
  hasResources?: boolean
}

type ScheduleItem = {
  id?: string
  day?: string
  period?: string
  startTime?: string
  endTime?: string
  time: string
  course: string
  title?: string
  type: string
  room: string
  instructor: string
  teacherId?: string
  subjectId?: string
  online?: boolean
  reminder?: boolean
  viewed?: boolean
  checkedIn?: boolean
}

type Exam = {
  id: string
  subjectId?: string
  title: string
  course: string
  date: string
  examDate?: string | null
  duration: string
  status: ExamStatus
  location?: string
  invigilator?: string
  instructions?: string
}

type TeacherSummary = {
  id: string
  name: string
  role: string
  subjects: string[]
}

type LearningResource = {
  id: string
  title: string
  description?: string
  type: string
  kind?: string
  size: string
  course: string
  teacher?: string
  url?: string
  source?: string
  saved?: boolean
  viewed?: boolean
  downloaded?: boolean
  available?: number
  shelf?: string
  author?: string
}

type PerformancePoint = {
  week: string
  score: number
  attendance: number
}

type GradePoint = {
  name: string
  value: number
}

type StudentDashboardData = {
  generatedAt?: string
  currentUser?: {
    id: string
    name: string
    email: string
    role: string
    image?: string | null
  }
  school?: {
    id: string
    name: string
    slug: string
    type: string
    status: string
    country?: string
    currencyCode?: string
    currencyName?: string
  }
  student?: {
    id: string
    admissionNumber?: string
    status: string
    level: Level
    stage?: string
    classId?: string
    className?: string
    classGrade?: string
    classSection?: string
    classTeacher?: string
    classTeacherId?: string
    classmates?: number
    academicYear?: string
    term?: string
    guardianContact?: string
    phone?: string
    address?: string
    enrollmentDate?: string | null
  }
  metrics?: {
    courses: number
    credits: number
    averageProgress: number
    attendance: number
    attendanceTotal: number
    absentDays: number
    lateDays: number
    pendingAssignments: number
    completedAssignments: number
    coursework?: number
    assessments?: number
    tests?: number
    exams?: number
    teachers?: number
    lessons?: number
    gpa?: number | null
    unreadMessages: number
    outstandingBalance: number
    invoicesNeedingAttention: number
    savedResources?: number
    viewedResources?: number
    downloadedResources?: number
    libraryBooks?: number
  }
  savedResourceIds?: string[]
  courses?: Course[]
  assignments?: Assignment[]
  academicCatalog?: {
    subjects: Course[]
    coursework: Assignment[]
    assignments: Assignment[]
    assessments: Assignment[]
    tests: Assignment[]
    exams: Exam[]
    teachers: TeacherSummary[]
    lessons?: ScheduleItem[]
    timetable?: {
      entries: ScheduleItem[]
      settings: {
        periodsPerDay: number
        schoolStart: string
        schoolEnd: string
        breaks: Array<{ name: string; day: string; startTime: string; endTime: string }>
      }
    }
  }
  schedule?: ScheduleItem[]
  exams?: Exam[]
  performanceTrend?: PerformancePoint[]
  gradeBreakdown?: GradePoint[]
  resources?: LearningResource[]
  attendance?: Array<{
    date: string | null
    label: string
    status: string
    remarks: string
  }>
  progressNotes?: Array<{
    id: string
    type: string
    value: number
    note: string
    category: string
    positive: boolean
    recordedBy: string
    createdAt: string | null
  }>
  finance?: {
    billed: number
    paid: number
    outstanding: number
    payments: Array<{ amount: number; method: string; reference: string; status: string; createdAt: string | null }>
  }
  announcements?: Array<{ id: string; title: string; content: string; createdAt: string | null }>
}

const levelLabels: Record<Level, { title: string; subtitle: string; term: string }> = {
  primary: {
    title: "My Learning Space",
    subtitle: "Track homework, stars, classes, and teacher updates.",
    term: "Term 2",
  },
  secondary: {
    title: "Academic Dashboard",
    subtitle: "Track subjects, performance, attendance, assignments, and exams.",
    term: "Term 2",
  },
  college: {
    title: "College Portal",
    subtitle: "Manage courses, grades, labs, assessments, and campus updates.",
    term: "Semester 1",
  },
  university: {
    title: "Student Portal",
    subtitle: "Your academic progress, upcoming work, examinations, and resources in one place.",
    term: "Semester 1",
  },
  vocational: {
    title: "Training Dashboard",
    subtitle: "Track modules, practical hours, certifications, and skill progress.",
    term: "Cycle 2",
  },
}

const levelProfiles: Record<Level, {
  learner: string
  coursePlural: string
  workPlural: string
  educator: string
  performanceLabel: string
  financeLabel: string
  primaryRoute: string
  secondaryRoute: string
  focus: string
}> = {
  primary: {
    learner: "Pupil",
    coursePlural: "Subjects",
    workPlural: "Homework",
    educator: "Class teacher",
    performanceLabel: "Stars and progress",
    financeLabel: "Parent billing",
    primaryRoute: "/student/subjects",
    secondaryRoute: "/student/attendance",
    focus: "Keep homework simple, track attendance, and keep guardian-teacher communication visible.",
  },
  secondary: {
    learner: "Student",
    coursePlural: "Subjects",
    workPlural: "Assignments",
    educator: "Class teacher",
    performanceLabel: "Performance",
    financeLabel: "Fees",
    primaryRoute: "/student/subjects",
    secondaryRoute: "/student/exams",
    focus: "Balance subjects, assignments, attendance, and exam readiness.",
  },
  college: {
    learner: "College student",
    coursePlural: "Courses",
    workPlural: "Assessments",
    educator: "Advisor",
    performanceLabel: "Academic standing",
    financeLabel: "Account balance",
    primaryRoute: "/student/performance",
    secondaryRoute: "/student/resources",
    focus: "Track course progress, credit load, resources, and advisor support.",
  },
  university: {
    learner: "University student",
    coursePlural: "Courses",
    workPlural: "Coursework",
    educator: "Academic advisor",
    performanceLabel: "GPA and progress",
    financeLabel: "Account balance",
    primaryRoute: "/student/performance",
    secondaryRoute: "/student/resources",
    focus: "Manage courses, assessment evidence, resources, finance, and exam readiness.",
  },
  vocational: {
    learner: "Trainee",
    coursePlural: "Modules",
    workPlural: "Practical tasks",
    educator: "Instructor",
    performanceLabel: "Skill progress",
    financeLabel: "Training fees",
    primaryRoute: "/student/performance",
    secondaryRoute: "/student/timetable",
    focus: "Track modules, practical readiness, attendance, and instructor feedback.",
  },
}

const statusStyles: Record<AssignmentStatus | ExamStatus, string> = {
  available: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300",
  completed: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300",
  graded: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300",
  late: "border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300",
  pending: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300",
  scheduled: "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300",
  submitted: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300",
}

function formatStatus(status: string) {
  return status.replace("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function buildCsv(assignments: Assignment[], activeCourses: Course[], data: StudentDashboardData | null) {
  const rows = [
    ["Metric", "Value"],
    ["Student", data?.currentUser?.name || ""],
    ["School", data?.school?.name || "School"],
    ["Class", data?.student?.className || "Class not assigned"],
    ["Level", data?.student?.level || "unknown"],
    ["Courses", String(activeCourses.length)],
    ["Credits", String(activeCourses.reduce((total, course) => total + course.credits, 0))],
    ["Average progress", `${Math.round(activeCourses.reduce((total, course) => total + course.progress, 0) / Math.max(activeCourses.length, 1))}%`],
    ["Average attendance", `${Math.round(activeCourses.reduce((total, course) => total + course.attendance, 0) / Math.max(activeCourses.length, 1))}%`],
    [],
    ["Assignment", "Course", "Due", "Status", "Score"],
    ...assignments.map((assignment) => [
      assignment.title,
      assignment.course,
      assignment.due,
      assignment.status,
      assignment.score ? `${assignment.score}/${assignment.points}` : "",
    ]),
  ]

  return rows.map((row) => row.map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`).join(",")).join("\n")
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-3xl border bg-card shadow-sm">
        <div className="relative p-6 md:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-3xl space-y-4">
              <div className="flex flex-wrap gap-2">
                <Skeleton className="h-7 w-24 rounded-full" />
                <Skeleton className="h-7 w-36 rounded-full" />
                <Skeleton className="h-7 w-28 rounded-full" />
                <Skeleton className="h-7 w-32 rounded-full" />
              </div>
              <Skeleton className="h-10 w-72 max-w-full" />
              <Skeleton className="h-6 w-96 max-w-full" />
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-5 w-28" />
                <Skeleton className="h-5 w-28" />
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row lg:flex-col xl:flex-row">
              <Skeleton className="h-10 w-44" />
              <Skeleton className="h-10 w-28" />
              <Skeleton className="h-10 w-40" />
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index}>
            <CardContent className="space-y-4 p-5">
              <div className="flex items-center justify-between">
                <Skeleton className="h-5 w-28" />
                <Skeleton className="size-10 rounded-2xl" />
              </div>
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-4 w-36" />
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <Skeleton className="h-6 w-44" />
            <Skeleton className="h-4 w-80 max-w-full" />
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-28 rounded-2xl" />
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-36" />
            <Skeleton className="h-4 w-56" />
          </CardHeader>
          <CardContent className="space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-20 rounded-2xl" />
            ))}
          </CardContent>
        </Card>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          <Skeleton className="h-10 w-full rounded-xl" />
          <div className="grid gap-6 lg:grid-cols-2">
            <Skeleton className="h-80 rounded-2xl" />
            <Skeleton className="h-80 rounded-2xl" />
          </div>
          <Skeleton className="h-72 rounded-2xl" />
        </div>
        <div className="space-y-6">
          <Skeleton className="h-64 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </div>
    </div>
  )
}

export function StudentDashboardPage() {
  const pathname = usePathname()
  const router = useRouter()
  const [level, setLevel] = React.useState<Level>("university")
  const [courseFilter, setCourseFilter] = React.useState("all")
  const [query, setQuery] = React.useState("")
  const [assignments, setAssignments] = React.useState<Assignment[]>([])
  const [actingId, setActingId] = React.useState("")
  const [selectedAssignment, setSelectedAssignment] = React.useState<Assignment | null>(null)
  const [assignmentNote, setAssignmentNote] = React.useState("")
  const [helpOpen, setHelpOpen] = React.useState(false)
  const [messageOpen, setMessageOpen] = React.useState(false)
  const [messageReceiverId, setMessageReceiverId] = React.useState("")
  const [messageReceiverName, setMessageReceiverName] = React.useState("")
  const [helpMessage, setHelpMessage] = React.useState("")
  const [messageBody, setMessageBody] = React.useState("")
  const [selectedHelpCourse, setSelectedHelpCourse] = React.useState("")
  const [dashboardData, setDashboardData] = React.useState<StudentDashboardData | null>(null)
  const [loadError, setLoadError] = React.useState("")
  const [loadingData, setLoadingData] = React.useState(true)
  const [syncing, setSyncing] = React.useState(false)
  const [chartsReady, setChartsReady] = React.useState(false)

  React.useEffect(() => {
    setChartsReady(true)
  }, [])

  const tenantPrefix = React.useMemo(() => {
    const segments = (pathname ?? "").split("/").filter(Boolean)
    return segments[1] === "student" ? `/${segments[0]}` : ""
  }, [pathname])

  const studentHref = React.useCallback((href: string) => `${tenantPrefix}${href}`, [tenantPrefix])

  const endpoint = React.useCallback(() => {
    const tenant = tenantPrefix ? tenantPrefix.slice(1) : ""
    return tenant ? `/api/tenant/student/dashboard?tenant=${encodeURIComponent(tenant)}` : "/api/student/dashboard"
  }, [tenantPrefix])

  const timetableEndpoint = React.useCallback(() => {
    const tenant = tenantPrefix ? tenantPrefix.slice(1) : ""
    return tenant ? `/api/tenant/student/timetable?tenant=${encodeURIComponent(tenant)}` : "/api/student/timetable"
  }, [tenantPrefix])

  const loadDashboard = React.useCallback(async (notify = false) => {
    setLoadingData(true)
    setLoadError("")
    const response = await fetch(endpoint(), { cache: "no-store" }).catch(() => null)
    if (!response?.ok) {
      const payload = await response?.json().catch(() => ({}))
      const message = String(payload?.error || "Failed to load student dashboard data")
      setLoadError(message)
      setLoadingData(false)
      if (notify) toast.error(message)
      return
    }
    const payload = (await response.json()) as StudentDashboardData
    setDashboardData(payload)
    setLevel(payload.student?.level || "university")
    setAssignments(payload.assignments || [])
    setSelectedHelpCourse(payload.courses?.[0]?.code || "")
    setLoadingData(false)
    if (notify) toast.success("Dashboard refreshed")
  }, [endpoint])

  React.useEffect(() => {
    void loadDashboard()
  }, [loadDashboard])

  const liveCourses = dashboardData?.courses || []
  const liveSchedule = dashboardData?.schedule || []
  const liveExams = dashboardData?.exams || []
  const liveTrend = dashboardData?.performanceTrend || []
  const liveGradeBreakdown = dashboardData?.gradeBreakdown || []
  const liveResources = dashboardData?.resources || []
  const savedResources = React.useMemo(
    () => Array.from(new Set([...(dashboardData?.savedResourceIds || []), ...liveResources.filter((resource) => resource.saved).map((resource) => resource.id)])),
    [dashboardData?.savedResourceIds, liveResources]
  )
  const academicCatalog = dashboardData?.academicCatalog
  const catalogSubjects = academicCatalog?.subjects || liveCourses
  const catalogCoursework = academicCatalog?.coursework || []
  const catalogAssessments = academicCatalog?.assessments || []
  const catalogTests = academicCatalog?.tests || []
  const catalogExams = academicCatalog?.exams || liveExams
  const catalogTeachers = academicCatalog?.teachers || []
  const student = dashboardData?.student
  const currentUser = dashboardData?.currentUser
  const school = dashboardData?.school
  const metrics = dashboardData?.metrics

  const filteredAssignments = assignments.filter((assignment) => {
    const matchesCourse = courseFilter === "all" || assignment.course === courseFilter
    const haystack = `${assignment.title} ${assignment.course} ${assignment.status}`.toLowerCase()
    return matchesCourse && haystack.includes(query.toLowerCase())
  })

  const averageProgress = metrics?.averageProgress ?? Math.round(liveCourses.reduce((total, course) => total + course.progress, 0) / Math.max(liveCourses.length, 1))
  const averageAttendance = metrics?.attendance ?? Math.round(liveCourses.reduce((total, course) => total + course.attendance, 0) / Math.max(liveCourses.length, 1))
  const pendingCount = assignments.filter((assignment) => assignment.status === "pending" || assignment.status === "late").length
  const completedCount = assignments.filter((assignment) => assignment.status === "submitted" || assignment.status === "graded").length
  const labels = {
    ...levelLabels[level],
    term: student?.term || levelLabels[level].term,
  }
  const levelProfile = levelProfiles[level]
  const studentDisplayName = currentUser?.name || ""
  const schoolDisplayName = school?.name || ""
  const classLabel = student?.className || student?.stage || "Class not assigned"
  const upcomingAssignments = assignments
    .filter((assignment) => assignment.status === "pending" || assignment.status === "late")
    .toSorted((a, b) => new Date(a.dueDate || 0).getTime() - new Date(b.dueDate || 0).getTime())
  const dueThisWeek = upcomingAssignments.filter((assignment) => {
    if (!assignment.dueDate) return assignment.status === "late"
    const due = new Date(assignment.dueDate).getTime()
    return due <= Date.now() + 7 * 24 * 60 * 60 * 1000
  })
  const lateAssignments = assignments.filter((assignment) => assignment.status === "late")
  const availableExams = liveExams.filter((exam) => exam.status === "available")
  const upcomingExams = liveExams.filter((exam) => exam.status !== "completed")
  const financeAttention = metrics?.invoicesNeedingAttention ?? 0
  const academicHealthScore = Math.max(
    0,
    Math.min(
      100,
      Math.round((averageProgress * 0.45) + (averageAttendance * 0.35) + ((completedCount / Math.max(assignments.length, 1)) * 100 * 0.2))
    )
  )
  const priorityActions = [
    ...lateAssignments.slice(0, 2).map((assignment) => ({
      id: `late-${assignment.id}`,
      label: assignment.title,
      helper: `${assignment.course} is late`,
      href: "/student/assignments",
      tone: statusStyles.late,
    })),
    ...dueThisWeek.filter((assignment) => assignment.status !== "late").slice(0, 2).map((assignment) => ({
      id: `due-${assignment.id}`,
      label: assignment.title,
      helper: `${assignment.course} due ${assignment.due}`,
      href: "/student/assignments",
      tone: statusStyles.pending,
    })),
    ...availableExams.slice(0, 1).map((exam) => ({
      id: `exam-${exam.id}`,
      label: exam.title,
      helper: `${exam.course} is available`,
      href: "/student/exams",
      tone: statusStyles.available,
    })),
    ...(financeAttention > 0 ? [{
      id: "finance-attention",
      label: "Finance attention required",
      helper: `${financeAttention} invoice item${financeAttention === 1 ? "" : "s"} need attention`,
      href: "/student/finance",
      tone: statusStyles.pending,
    }] : []),
  ].slice(0, 5)
  const savedResourceRows = liveResources.filter((resource) => savedResources.includes(resource.id))
  const levelCards = [
    {
      title: levelProfile.coursePlural,
      value: liveCourses.length,
      helper: level === "primary" ? "Class subjects assigned" : level === "vocational" ? "Training modules active" : `${metrics?.credits ?? 0} credit load`,
      href: "/student/subjects",
      icon: BookOpen,
    },
    {
      title: levelProfile.workPlural,
      value: pendingCount,
      helper: `${completedCount} completed`,
      href: level === "primary" ? "/student/assignments" : "/student/assessments",
      icon: FileText,
    },
    {
      title: levelProfile.performanceLabel,
      value: `${averageProgress}%`,
      helper: metrics?.gpa ? `GPA ${metrics.gpa}` : `${averageAttendance}% attendance`,
      href: "/student/performance",
      icon: TrendingUp,
    },
    {
      title: levelProfile.financeLabel,
      value: financeAttention,
      helper: `${school?.currencyCode || ""} ${metrics?.outstandingBalance ?? 0} outstanding`,
      href: "/student/finance",
      icon: ShieldCheck,
    },
  ]
  const academicCatalogCards = [
    { label: levelProfile.coursePlural, value: catalogSubjects.length, helper: "Student/class enrolment", href: "/student/subjects", icon: BookOpen },
    { label: "Coursework", value: catalogCoursework.length, helper: "Homework, projects, practical work", href: "/student/assignments", icon: FileText },
    { label: "Assessments", value: catalogAssessments.length, helper: "Class assessments and graded work", href: "/student/assessments", icon: CheckCircle2 },
    { label: "Tests", value: catalogTests.length, helper: "Tests, quizzes, mocks, finals", href: "/student/exams", icon: Timer },
    { label: "Lessons", value: dashboardData?.academicCatalog?.lessons?.length || liveSchedule.length, helper: "Timetable lessons and lectures", href: "/student/timetable", icon: Calendar },
    { label: "Exams", value: catalogExams.length, helper: "Scheduled and available exams", href: "/student/exams", icon: Award },
    { label: "Teachers", value: catalogTeachers.length, helper: "Teachers, lecturers, instructors", href: "/student/messages", icon: MessageSquare },
  ]
  const levelReadiness = [
    {
      label: level === "primary" ? "Guardian contact available" : "Profile and admission verified",
      ready: level === "primary" ? Boolean(student?.guardianContact) : Boolean(student?.admissionNumber && currentUser?.email),
    },
    {
      label: level === "vocational" ? "Practical schedule visible" : level === "university" || level === "college" ? "Credit/course load visible" : "Class subjects visible",
      ready: level === "vocational" ? liveSchedule.length > 0 : liveCourses.length > 0,
    },
    {
      label: level === "primary" ? "Homework queue checked" : "Assessment queue checked",
      ready: pendingCount === 0,
    },
    {
      label: level === "secondary" ? "Exam readiness visible" : level === "primary" ? "Teacher notes checked" : "Advisor support available",
      ready: level === "secondary" ? upcomingExams.length > 0 : level === "primary" ? Boolean(dashboardData?.progressNotes?.length) : Boolean(student?.classTeacherId),
    },
  ]

  const kpis = [
    { label: levelProfile.coursePlural, value: liveCourses.length, suffix: "", helper: labels.term, icon: BookOpen, tone: "bg-sky-500/10 text-sky-600 dark:text-sky-300" },
    { label: level === "primary" ? "Learning Progress" : "Average Progress", value: averageProgress, suffix: "%", helper: metrics?.gpa ? `GPA ${metrics.gpa}` : "Current academic average", icon: TrendingUp, tone: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300" },
    { label: levelProfile.workPlural, value: `${completedCount}/${assignments.length}`, suffix: "", helper: `${pendingCount} pending`, icon: FileText, tone: "bg-amber-500/10 text-amber-600 dark:text-amber-300" },
    { label: "Attendance", value: averageAttendance, suffix: "%", helper: averageAttendance >= 90 ? "Good standing" : `${metrics?.absentDays ?? 0} absences`, icon: ShieldCheck, tone: "bg-violet-500/10 text-violet-600 dark:text-violet-300" },
  ]

  const downloadReport = () => {
    const blob = new Blob([buildCsv(assignments, liveCourses, dashboardData)], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = "student-dashboard-report.csv"
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
    toast.success("Report downloaded")
  }

  const downloadActionPlan = () => {
    const rows = [
      ["item", "details", "route"],
      ...priorityActions.map((action) => [action.label, action.helper, studentHref(action.href)]),
      ["Academic health", `${academicHealthScore}%`, studentHref("/student/performance")],
      ["Due this week", String(dueThisWeek.length), studentHref("/student/assignments")],
      ["Upcoming exams", String(upcomingExams.length), studentHref("/student/exams")],
    ]
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = "student-dashboard-action-plan.csv"
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
    toast.success("Action plan downloaded")
  }

  const syncDashboard = () => {
    setSyncing(true)
    void loadDashboard(true).finally(() => {
      setSyncing(false)
    })
  }

  const markSubmitted = async (assignmentId: string) => {
    const assignment = assignments.find((item) => item.id === assignmentId)
    const response = await fetch(endpoint(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "assignment-submission",
        assignmentId,
        assignmentTitle: assignment?.title,
        note: assignmentNote,
      }),
    }).catch(() => null)
    if (!response?.ok) {
      const payload = await response?.json().catch(() => ({}))
      toast.error(String(payload?.error || "Failed to record assignment submission"))
      return
    }
    setAssignments((current) =>
      current.map((assignment) =>
        assignment.id === assignmentId ? { ...assignment, status: "submitted" } : assignment
      )
    )
    setAssignmentNote("")
    setSelectedAssignment(null)
    toast.success("Assignment marked as submitted")
  }

  const startExam = (exam: Exam) => {
    if (exam.status !== "available") {
      router.push(studentHref(`/student/exams?exam=${encodeURIComponent(exam.id)}`))
      return
    }
    router.push(studentHref(`/student/exams?exam=${encodeURIComponent(exam.id)}`))
  }

  const runDashboardAction = async (body: Record<string, unknown>, notify: string) => {
    const id = String(body.resourceId || body.action || "")
    setActingId(id)
    const response = await fetch(endpoint(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).catch(() => null)
    setActingId("")
    if (!response?.ok) {
      const payload = await response?.json().catch(() => ({}))
      toast.error(String(payload?.error || "Dashboard action failed"))
      return false
    }
    toast.success(notify)
    void loadDashboard()
    return true
  }

  const toggleResource = (resourceId: string) => {
    void runDashboardAction({
      action: savedResources.includes(resourceId) ? "resource.unsave" : "resource.save",
      resourceId,
    }, savedResources.includes(resourceId) ? "Resource removed from saved list" : "Resource saved")
  }

  const openResource = (resource: LearningResource) => {
    void runDashboardAction({
      action: resource.url ? "resource.download" : "resource.view",
      resourceId: resource.id,
    }, resource.url ? "Resource download recorded" : "Resource opened")
    if (resource.url) {
      window.open(resource.url, "_blank", "noopener,noreferrer")
      return
    }
    router.push(studentHref(`/student/resources?resource=${encodeURIComponent(resource.id)}`))
  }

  const openScheduleItem = async (item: ScheduleItem) => {
    if (item.id) {
      await fetch(timetableEndpoint(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "view", itemId: item.id }),
      }).catch(() => null)
    }
    router.push(studentHref(`/student/timetable${item.id ? `?lesson=${encodeURIComponent(item.id)}` : ""}`))
  }

  const sendAcademicHelpRequest = async () => {
    const message = helpMessage.trim()
    if (!message) {
      toast.error("Describe what you need help with")
      return
    }
    const response = await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: `Academic help: ${selectedHelpCourse || "General"}`,
        message,
        category: "academic",
        priority: "normal",
        dashboardArea: "student-dashboard",
      }),
    }).catch(() => null)
    if (!response?.ok) {
      const payload = await response?.json().catch(() => ({}))
      toast.error(String(payload?.error || "Failed to send help request"))
      return
    }
    setHelpMessage("")
    setHelpOpen(false)
    toast.success("Academic help request sent")
  }

  const sendAdvisorMessage = async () => {
    const receiverId = messageReceiverId || student?.classTeacherId
    const content = messageBody.trim()
    if (!receiverId) {
      router.push(studentHref("/student/messages"))
      toast.info("Open the inbox to select a teacher or advisor")
      return
    }
    if (!content) {
      toast.error("Message cannot be empty")
      return
    }
    const response = await fetch(endpoint(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "advisor-message", receiverId, message: content }),
    }).catch(() => null)
    if (!response?.ok) {
      const payload = await response?.json().catch(() => ({}))
      toast.error(String(payload?.error || "Failed to send message"))
      return
    }
    setMessageBody("")
    setMessageReceiverId("")
    setMessageReceiverName("")
    setMessageOpen(false)
    toast.success(`Message sent to ${messageReceiverName || "advisor"}`)
  }

  if (loadingData && !dashboardData) {
    return <DashboardSkeleton />
  }

  if (!loadError && (!currentUser?.id || !student?.id)) {
    return (
      <div className="space-y-6">
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium text-destructive">Student session profile is required</p>
              <p className="text-sm text-muted-foreground">The dashboard will not render fallback student data. Sign in with a student account or configure the student profile for this user.</p>
            </div>
            <Button type="button" variant="outline" onClick={() => void loadDashboard(true)}>
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {loadError ? (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium text-destructive">Student dashboard data could not be loaded</p>
              <p className="text-sm text-muted-foreground">{loadError}</p>
            </div>
            <Button type="button" variant="outline" onClick={() => void loadDashboard(true)}>
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : null}
      <section className="overflow-hidden rounded-3xl border bg-card shadow-sm">
        <div className="relative p-6 md:p-8">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(14,165,233,0.18),transparent_34%),linear-gradient(135deg,rgba(16,185,129,0.10),transparent_45%)]" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-3xl">
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="bg-background/80">
                  <GraduationCap className="mr-1 size-3.5" />
                  {labels.term}
                </Badge>
                <Badge variant="outline" className="bg-background/80">
                  {schoolDisplayName}
                </Badge>
                <Badge variant="outline" className="bg-background/80">
                  {classLabel}
                </Badge>
                <Badge variant="outline" className="bg-background/80">
                  Academic status: {student?.status || "On track"}
                </Badge>
                <Badge variant="outline" className="bg-background/80">
                  {levelProfile.learner}
                </Badge>
              </div>
              <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
                {labels.title}
                {studentDisplayName ? <span className="block text-xl font-medium text-muted-foreground md:text-2xl">Welcome, {studentDisplayName}</span> : null}
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground md:text-base">
                {labels.subtitle} {student?.admissionNumber ? `Admission: ${student.admissionNumber}.` : ""}
              </p>
              <div className="mt-4 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2 lg:grid-cols-4">
                <span>Stage: <strong className="text-foreground">{student?.stage || level}</strong></span>
                <span>{levelProfile.educator}: <strong className="text-foreground">{student?.classTeacher || "Not assigned"}</strong></span>
                <span>Classmates: <strong className="text-foreground">{student?.classmates ?? 0}</strong></span>
                <span>Messages: <strong className="text-foreground">{metrics?.unreadMessages ?? 0} unread</strong></span>
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row lg:flex-col xl:flex-row">
              <Select value={level} disabled>
                <SelectTrigger className="w-full bg-background/90 sm:w-44">
                  <SelectValue placeholder="Student level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="primary">Primary</SelectItem>
                  <SelectItem value="secondary">Secondary</SelectItem>
                  <SelectItem value="college">College</SelectItem>
                  <SelectItem value="university">University</SelectItem>
                  <SelectItem value="vocational">Vocational</SelectItem>
                </SelectContent>
              </Select>
              <Button type="button" variant="outline" onClick={syncDashboard} disabled={syncing}>
                <RefreshCcw className={cn("size-4", syncing && "animate-spin")} />
                {loadingData || syncing ? "Refreshing" : "Refresh"}
              </Button>
              <Button type="button" onClick={downloadReport}>
                <Download className="size-4" />
                Download report
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon
          return (
            <Card key={kpi.label}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">{kpi.label}</p>
                    <p className="mt-2 text-3xl font-semibold">
                      {kpi.value}
                      {kpi.suffix}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">{kpi.helper}</p>
                  </div>
                  <div className={cn("rounded-2xl p-3", kpi.tone)}>
                    <Icon className="size-5" />
                  </div>
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
              <GraduationCap className="size-5" />
              {formatStatus(level)} Workspace
            </CardTitle>
            <CardDescription>{levelProfile.focus}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            {levelCards.map((card) => {
              const Icon = card.icon
              return (
                <Link
                  key={card.title}
                  href={studentHref(card.href)}
                  className="rounded-2xl border p-4 transition-colors hover:bg-muted/60"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">{card.title}</p>
                      <p className="mt-2 text-2xl font-semibold">{card.value}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{card.helper}</p>
                    </div>
                    <div className="rounded-2xl bg-primary/10 p-3 text-primary">
                      <Icon className="size-5" />
                    </div>
                  </div>
                </Link>
              )
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="size-5" />
              Level Readiness
            </CardTitle>
            <CardDescription>Checks adapted to this student level.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {levelReadiness.map((item) => (
              <div key={item.label} className="flex items-center gap-3 rounded-xl border p-3">
                <div className={cn("flex size-8 items-center justify-center rounded-full", item.ready ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600")}>
                  {item.ready ? <CheckCircle2 className="size-4" /> : <Clock className="size-4" />}
                </div>
                <span className="text-sm">{item.label}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="size-5" />
              Academic Catalog
            </CardTitle>
            <CardDescription>
              Auto-loaded tenant data for this {levelProfile.learner.toLowerCase()}: subjects, coursework, assessments, tests, exams, and teachers.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {academicCatalogCards.map((card) => {
              const Icon = card.icon
              return (
                <Link key={card.label} href={studentHref(card.href)} className="rounded-2xl border p-4 transition-colors hover:bg-muted/60">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm text-muted-foreground">{card.label}</p>
                      <p className="mt-2 text-2xl font-semibold">{card.value}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{card.helper}</p>
                    </div>
                    <div className="rounded-2xl bg-primary/10 p-3 text-primary">
                      <Icon className="size-5" />
                    </div>
                  </div>
                </Link>
              )
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="size-5" />
              Teaching Team
            </CardTitle>
            <CardDescription>Teachers linked to this student&apos;s class, subjects, and assessments.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {catalogTeachers.slice(0, 5).map((teacher) => (
              <div key={teacher.id || teacher.name} className="rounded-2xl border p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">{teacher.name}</p>
                    <p className="text-xs text-muted-foreground">{teacher.role}</p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setMessageReceiverId(teacher.id || "")
                      setMessageReceiverName(teacher.name)
                      setMessageOpen(true)
                      setMessageBody((current) => current || `Hello ${teacher.name}, `)
                    }}
                  >
                    Message
                  </Button>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{teacher.subjects.slice(0, 4).join(", ") || "General support"}</p>
              </div>
            ))}
            {!catalogTeachers.length ? (
              <p className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">
                No teachers are linked in the dashboard API yet.
              </p>
            ) : null}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="size-5" />
                  Student Command Center
                </CardTitle>
                <CardDescription>Priority actions generated from live assignments, exams, attendance, and finance data.</CardDescription>
              </div>
              <Button type="button" variant="outline" onClick={downloadActionPlan}>
                <Download className="size-4" />
                Action plan CSV
              </Button>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            {priorityActions.map((action) => (
              <Link
                key={action.id}
                href={studentHref(action.href)}
                className="rounded-2xl border p-4 transition-colors hover:bg-muted/60"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{action.label}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{action.helper}</p>
                  </div>
                  <Badge variant="outline" className={action.tone}>Action</Badge>
                </div>
              </Link>
            ))}
            {!priorityActions.length ? (
              <div className="rounded-2xl border border-dashed p-5 text-sm text-muted-foreground md:col-span-2">
                No urgent dashboard actions right now. Keep checking assignments, attendance, and announcements.
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="size-5" />
              Academic Health
            </CardTitle>
            <CardDescription>Composite of grades, attendance, and assignment completion.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl border p-4 text-center">
              <p className="text-4xl font-semibold">{academicHealthScore}%</p>
              <p className="mt-1 text-sm text-muted-foreground">{academicHealthScore >= 80 ? "Strong standing" : academicHealthScore >= 60 ? "Watch closely" : "Needs support"}</p>
            </div>
            <div className="space-y-3">
              <div>
                <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                  <span>Progress</span>
                  <span>{averageProgress}%</span>
                </div>
                <Progress value={averageProgress} />
              </div>
              <div>
                <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                  <span>Attendance</span>
                  <span>{averageAttendance}%</span>
                </div>
                <Progress value={averageAttendance} />
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Timer className="size-5" />
              Weekly Workload
            </CardTitle>
            <CardDescription>Assignments due within seven days plus late work.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {dueThisWeek.slice(0, 5).map((assignment) => (
              <button
                key={assignment.id}
                type="button"
                className="w-full rounded-2xl border p-3 text-left hover:bg-muted/50"
                onClick={() => setSelectedAssignment(assignment)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">{assignment.title}</p>
                    <p className="text-xs text-muted-foreground">{assignment.course} - {assignment.due}</p>
                  </div>
                  <Badge variant="outline" className={statusStyles[assignment.status]}>{formatStatus(assignment.status)}</Badge>
                </div>
              </button>
            ))}
            {!dueThisWeek.length ? <p className="text-sm text-muted-foreground">No assignments are due within the next seven days.</p> : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="size-5" />
              Saved Resource Shelf
            </CardTitle>
            <CardDescription>Server-backed resources saved from this dashboard.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {savedResourceRows.slice(0, 4).map((resource) => (
              <div key={resource.id} className="flex items-center justify-between rounded-2xl border p-3">
                <div>
                  <p className="text-sm font-medium">{resource.title}</p>
                  <p className="text-xs text-muted-foreground">{resource.course}</p>
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={() => toggleResource(resource.id)}>
                  Remove
                </Button>
              </div>
            ))}
            {!savedResourceRows.length ? <p className="text-sm text-muted-foreground">Save resources from the resources tab to pin them here.</p> : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="size-5" />
              Student Profile Snapshot
            </CardTitle>
            <CardDescription>Identity, level, class, and guardian context.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between gap-3"><span className="text-muted-foreground">Level</span><span className="font-medium">{formatStatus(student?.level || level)}</span></div>
            <div className="flex justify-between gap-3"><span className="text-muted-foreground">Stage</span><span className="font-medium">{student?.stage || "Not set"}</span></div>
            <div className="flex justify-between gap-3"><span className="text-muted-foreground">Class</span><span className="font-medium">{classLabel}</span></div>
            <div className="flex justify-between gap-3"><span className="text-muted-foreground">Academic year</span><span className="font-medium">{student?.academicYear || "Not set"}</span></div>
            <div className="flex justify-between gap-3"><span className="text-muted-foreground">Guardian contact</span><span className="font-medium">{student?.guardianContact || "Not set"}</span></div>
          </CardContent>
        </Card>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Tabs defaultValue="overview" className="min-w-0 space-y-4">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="assignments">{level === "primary" ? "Homework" : "Assignments"}</TabsTrigger>
            <TabsTrigger value="performance">{levelProfile.performanceLabel}</TabsTrigger>
            <TabsTrigger value="resources">Resources</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="size-5" />
                    {level === "vocational" ? "Today&apos;s Training Schedule" : level === "primary" ? "Today&apos;s Class Schedule" : "Today&apos;s Schedule"}
                  </CardTitle>
                  <CardDescription>{level === "primary" ? "Classes, rooms, teacher, and next actions." : level === "vocational" ? "Modules, practical rooms, instructors, and launch actions." : "Classes, rooms, lecturers, and launch actions."}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {liveSchedule.map((item) => (
                    <div key={item.id || `${item.time}-${item.course}`} className="rounded-2xl border p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="font-medium">{item.course} - {item.type}</p>
                          <p className="text-sm text-muted-foreground">
                            {item.day ? `${item.day} - ` : ""}{item.time} - {item.room}
                          </p>
                          <p className="text-xs text-muted-foreground">{item.instructor}</p>
                          {item.viewed ? <Badge variant="outline" className={cn("mt-2", statusStyles.submitted)}>Viewed</Badge> : null}
                        </div>
                        <Button
                          type="button"
                          variant={item.online ? "default" : "outline"}
                          onClick={() => void openScheduleItem(item)}
                        >
                          {item.online ? <Play className="size-4" /> : <ExternalLink className="size-4" />}
                          {item.online ? "Join" : item.type === "Exam" ? "Open exam" : "Open lesson"}
                        </Button>
                      </div>
                    </div>
                  ))}
                  {!liveSchedule.length ? (
                    <p className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">
                      No timetable items are available from the student dashboard API yet.
                    </p>
                  ) : null}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="size-5" />
                    Progress Trend
                  </CardTitle>
                  <CardDescription>Academic score and attendance over six weeks.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-72">
                    {chartsReady && liveTrend.length ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={liveTrend} margin={{ left: -20, right: 10 }}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis dataKey="week" tickLine={false} axisLine={false} />
                          <YAxis tickLine={false} axisLine={false} domain={[60, 100]} />
                          <Tooltip />
                          <Line type="monotone" dataKey="score" stroke="#0ea5e9" strokeWidth={3} dot={false} />
                          <Line type="monotone" dataKey="attendance" stroke="#10b981" strokeWidth={3} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : chartsReady ? (
                      <div className="flex h-full items-center justify-center rounded-2xl border border-dashed text-sm text-muted-foreground">
                        No performance trend data is available from the dashboard API yet.
                      </div>
                    ) : (
                      <div className="flex h-full items-center justify-center rounded-2xl bg-muted/40 text-sm text-muted-foreground">
                        Loading chart
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="size-5" />
                  Current {levelProfile.coursePlural}
                </CardTitle>
                <CardDescription>{level === "primary" ? "Live subject progress, attendance, and teacher evidence." : `Live progress, attendance, grades, and ${level === "secondary" ? "subject load" : "credit load"}.`}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 lg:grid-cols-2">
                  {liveCourses.map((course) => (
                    <div key={course.code} className="rounded-2xl border p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-sm font-semibold">{course.code}</p>
                          <p className="mt-1 font-medium">{course.title}</p>
                          <p className="text-xs text-muted-foreground">{course.instructor}</p>
                        </div>
                        <Badge variant="outline">{course.grade}</Badge>
                      </div>
                      <div className="mt-4 space-y-3">
                        <div>
                          <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                            <span>Course progress</span>
                            <span>{course.progress}%</span>
                          </div>
                          <Progress value={course.progress} />
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{course.attendance}% attendance</span>
                          <span>{course.credits} credits</span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {!liveCourses.length ? (
                    <p className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground lg:col-span-2">
                      No enrolled subjects or courses are available from the student dashboard API yet.
                    </p>
                  ) : null}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="size-5" />
                  Coursework, Assessments & Tests
                </CardTitle>
                <CardDescription>Latest class work auto-loaded from the tenant assessment records.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 lg:grid-cols-3">
                {[
                  { title: "Coursework", items: catalogCoursework.slice(0, 3), href: "/student/assignments" },
                  { title: "Assessments", items: catalogAssessments.slice(0, 3), href: "/student/assessments" },
                  { title: "Tests", items: catalogTests.slice(0, 3), href: "/student/exams" },
                ].map((group) => (
                  <div key={group.title} className="rounded-2xl border p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium">{group.title}</p>
                      <Button type="button" variant="ghost" size="sm" asChild>
                        <Link href={studentHref(group.href)}>Open</Link>
                      </Button>
                    </div>
                    <div className="mt-3 space-y-2">
                      {group.items.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          className="w-full rounded-xl bg-muted/40 p-3 text-left hover:bg-muted"
                          onClick={() => setSelectedAssignment(item)}
                        >
                          <p className="truncate text-sm font-medium">{item.title}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{item.course} - {item.due}</p>
                        </button>
                      ))}
                      {!group.items.length ? <p className="text-sm text-muted-foreground">No {group.title.toLowerCase()} loaded yet.</p> : null}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle2 className="size-5" />
                    Attendance Register
                  </CardTitle>
                  <CardDescription>Recent attendance entries pulled from the student record.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {(dashboardData?.attendance || []).slice(0, 5).map((record) => (
                    <div key={`${record.date}-${record.status}`} className="flex items-center justify-between rounded-2xl border p-3">
                      <div>
                        <p className="text-sm font-medium">{record.label}</p>
                        <p className="text-xs text-muted-foreground">{record.remarks || "No remarks recorded"}</p>
                      </div>
                      <Badge variant="outline" className={cn(
                        record.status.toLowerCase() === "absent" ? statusStyles.late : statusStyles.submitted
                      )}>
                        {formatStatus(record.status || "recorded")}
                      </Badge>
                    </div>
                  ))}
                  {!dashboardData?.attendance?.length ? (
                    <p className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">No attendance entries have been recorded yet.</p>
                  ) : null}
                  <Button type="button" variant="outline" className="w-full justify-start" asChild>
                    <Link href={studentHref("/student/attendance")}>
                      <Calendar className="size-4" />
                      Open full attendance
                    </Link>
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="size-5" />
                    Teacher Progress Notes
                  </CardTitle>
                  <CardDescription>Latest academic, behaviour, and progress notes.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {(dashboardData?.progressNotes || []).slice(0, 4).map((note) => (
                    <div key={note.id} className="rounded-2xl border p-3">
                      <div className="flex items-center justify-between gap-3">
                        <Badge variant="outline" className={note.positive ? statusStyles.submitted : statusStyles.pending}>
                          {note.category || note.type || "Progress"}
                        </Badge>
                        {note.value ? <span className="text-xs text-muted-foreground">{note.value}%</span> : null}
                      </div>
                      <p className="mt-2 text-sm">{note.note || "Progress update recorded."}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{note.recordedBy || "School staff"}</p>
                    </div>
                  ))}
                  {!dashboardData?.progressNotes?.length ? (
                    <p className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">No teacher progress notes are available yet.</p>
                  ) : null}
                  <Button type="button" variant="outline" className="w-full justify-start" onClick={() => setHelpOpen(true)}>
                    <HelpCircle className="size-4" />
                    Ask about my progress
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="size-5" />
                    Recent Payments
                  </CardTitle>
                  <CardDescription>Latest student payment records from finance.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {(dashboardData?.finance?.payments || []).slice(0, 4).map((payment) => (
                    <div key={`${payment.reference}-${payment.createdAt}`} className="flex items-center justify-between rounded-2xl border p-3">
                      <div>
                        <p className="text-sm font-medium">{payment.reference || "Payment"}</p>
                        <p className="text-xs text-muted-foreground">{payment.method || "Payment method"} - {payment.status || "recorded"}</p>
                      </div>
                      <span className="text-sm font-semibold">{school?.currencyCode || ""} {payment.amount}</span>
                    </div>
                  ))}
                  {!dashboardData?.finance?.payments?.length ? (
                    <p className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">No recent payments found for this student.</p>
                  ) : null}
                  <Button type="button" variant="outline" className="w-full justify-start" asChild>
                    <Link href={studentHref("/student/finance")}>
                      <ArrowRight className="size-4" />
                      View finance ledger
                    </Link>
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="size-5" />
                    Action Center
                  </CardTitle>
                  <CardDescription>Live tasks that need student attention.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    { label: "Pending assignments", value: pendingCount, href: "/student/assignments", urgent: pendingCount > 0 },
                    { label: "Unread messages", value: metrics?.unreadMessages ?? 0, href: "/student/messages", urgent: (metrics?.unreadMessages ?? 0) > 0 },
                    { label: "Finance items", value: metrics?.invoicesNeedingAttention ?? 0, href: "/student/finance", urgent: (metrics?.invoicesNeedingAttention ?? 0) > 0 },
                    { label: "Upcoming exams", value: liveExams.filter((exam) => exam.status !== "completed").length, href: "/student/exams", urgent: liveExams.some((exam) => exam.status === "available") },
                  ].map((item) => (
                    <Button key={item.label} type="button" variant="ghost" className="h-11 w-full justify-between" asChild>
                      <Link href={studentHref(item.href)}>
                        <span className="flex items-center gap-3">
                          <span className={cn("size-2 rounded-full", item.urgent ? "bg-amber-500" : "bg-emerald-500")} />
                          {item.label}
                        </span>
                        <Badge variant="outline">{item.value}</Badge>
                      </Link>
                    </Button>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="assignments" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                  <CardTitle>{levelProfile.workPlural} Center</CardTitle>
                    <CardDescription>Search, filter, submit, and review {level === "primary" ? "homework" : level === "vocational" ? "practical tasks" : "coursework"}.</CardDescription>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder={`Search ${levelProfile.workPlural.toLowerCase()}`}
                        className="pl-8 sm:w-56"
                      />
                    </div>
                    <Select value={courseFilter} onValueChange={setCourseFilter}>
                      <SelectTrigger className="sm:w-40">
                        <SelectValue placeholder="Course" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All courses</SelectItem>
                        {liveCourses.map((course) => (
                          <SelectItem key={course.code} value={course.code}>{course.code}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{level === "primary" ? "Homework" : level === "vocational" ? "Task" : "Assignment"}</TableHead>
                      <TableHead>Due</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAssignments.map((assignment) => (
                      <TableRow key={assignment.id}>
                        <TableCell>
                          <p className="font-medium">{assignment.title}</p>
                          <p className="text-xs text-muted-foreground">{assignment.course} - {assignment.points} pts</p>
                        </TableCell>
                        <TableCell>{assignment.due}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={statusStyles[assignment.status]}>
                            {formatStatus(assignment.status)}
                          </Badge>
                        </TableCell>
                        <TableCell>{assignment.score ? `${assignment.score}/${assignment.points}` : "Pending"}</TableCell>
                        <TableCell className="text-right">
                          <Button type="button" variant="outline" onClick={() => setSelectedAssignment(assignment)}>
                            {assignment.status === "pending" || assignment.status === "late" ? "Submit" : "Review"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {filteredAssignments.length === 0 ? (
                  <div className="py-10 text-center text-sm text-muted-foreground">No {levelProfile.workPlural.toLowerCase()} match the current filters.</div>
                ) : null}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="performance" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>{levelProfile.performanceLabel} Breakdown</CardTitle>
                  <CardDescription>{level === "primary" ? "Progress evidence by learning activity." : "Performance by assessment category."}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-72">
                    {chartsReady && liveGradeBreakdown.length ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={liveGradeBreakdown} margin={{ left: -20, right: 10 }}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis dataKey="name" tickLine={false} axisLine={false} />
                          <YAxis tickLine={false} axisLine={false} domain={[0, 100]} />
                          <Tooltip />
                          <Bar dataKey="value" fill="#0ea5e9" radius={[8, 8, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : chartsReady ? (
                      <div className="flex h-full items-center justify-center rounded-2xl border border-dashed text-sm text-muted-foreground">
                        No assessment breakdown data is available from the dashboard API yet.
                      </div>
                    ) : (
                      <div className="flex h-full items-center justify-center rounded-2xl bg-muted/40 text-sm text-muted-foreground">
                        Loading chart
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Attendance Reliability</CardTitle>
                  <CardDescription>Weekly attendance stability.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-72">
                    {chartsReady && liveTrend.length ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={liveTrend} margin={{ left: -20, right: 10 }}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis dataKey="week" tickLine={false} axisLine={false} />
                          <YAxis tickLine={false} axisLine={false} domain={[80, 100]} />
                          <Tooltip />
                          <Area type="monotone" dataKey="attendance" stroke="#10b981" fill="#10b98133" strokeWidth={3} />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : chartsReady ? (
                      <div className="flex h-full items-center justify-center rounded-2xl border border-dashed text-sm text-muted-foreground">
                        No attendance trend data is available from the dashboard API yet.
                      </div>
                    ) : (
                      <div className="flex h-full items-center justify-center rounded-2xl bg-muted/40 text-sm text-muted-foreground">
                        Loading chart
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="resources">
            <Card>
              <CardHeader>
                <CardTitle>{level === "primary" ? "Learning Materials" : "Learning Resources"}</CardTitle>
                <CardDescription>Open and save {level === "vocational" ? "training materials" : level === "primary" ? "class materials" : "course materials"}.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3">
                {liveResources.map((resource) => (
                  <div key={resource.id} className="flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-medium">{resource.title}</p>
                      <p className="text-sm text-muted-foreground">{resource.course} - {resource.type} - {resource.size}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" onClick={() => toggleResource(resource.id)} disabled={actingId === resource.id}>
                        <Star className={cn("size-4", savedResources.includes(resource.id) && "fill-current")} />
                        {savedResources.includes(resource.id) ? "Saved" : "Save"}
                      </Button>
                      <Button type="button" onClick={() => openResource(resource)} disabled={actingId === resource.id}>
                        {resource.url ? <Download className="size-4" /> : <ExternalLink className="size-4" />}
                        {resource.url ? "Download" : "Open"}
                      </Button>
                    </div>
                    {resource.description ? <p className="text-sm text-muted-foreground sm:basis-full">{resource.description}</p> : null}
                    <div className="flex flex-wrap gap-2 sm:basis-full">
                      {resource.teacher ? <Badge variant="outline">{resource.teacher}</Badge> : null}
                      {resource.source ? <Badge variant="secondary">{formatStatus(resource.source)}</Badge> : null}
                      {resource.viewed ? <Badge variant="outline" className={statusStyles.submitted}>Viewed</Badge> : null}
                      {resource.downloaded ? <Badge variant="outline" className={statusStyles.completed}>Downloaded</Badge> : null}
                    </div>
                  </div>
                ))}
                {!liveResources.length ? (
                  <p className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">
                    No learning resources are available from the student dashboard API yet.
                  </p>
                ) : null}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <aside className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>All actions route correctly from tenant and non-tenant dashboards.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2">
              {[
                { label: level === "primary" ? "View class timetable" : level === "vocational" ? "View training timetable" : "View timetable", href: "/student/timetable", icon: Clock },
                { label: level === "primary" ? "Check progress" : level === "vocational" ? "Check skill progress" : "Check grades", href: level === "primary" ? "/student/performance" : "/student/grades", icon: Award },
                { label: `Open ${levelProfile.workPlural.toLowerCase()}`, href: "/student/assignments", icon: FileText },
                { label: level === "primary" ? "Class assessments" : level === "vocational" ? "Practical assessments" : "Exam center", href: level === "primary" ? "/student/assessments" : "/student/exams", icon: Timer },
                { label: "Notifications", href: "/student/notifications", icon: Bell },
              ].map((action) => {
                const Icon = action.icon
                return (
                  <Button key={action.href} variant="ghost" className="h-11 justify-between" asChild>
                    <Link href={studentHref(action.href)}>
                      <span className="flex items-center gap-3">
                        <Icon className="size-4 text-primary" />
                        {action.label}
                      </span>
                      <ArrowRight className="size-4" />
                    </Link>
                  </Button>
                )
              })}
              <Button type="button" variant="outline" className="mt-2 justify-start" onClick={() => setMessageOpen(true)}>
                <MessageSquare className="size-4" />
                Message advisor
              </Button>
              <Button type="button" variant="outline" className="justify-start" onClick={() => setHelpOpen(true)}>
                <HelpCircle className="size-4" />
                Request academic help
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Online Examinations</CardTitle>
              <CardDescription>Secure launch and status for upcoming exams.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {liveExams.map((exam) => (
                <div key={exam.id} className="rounded-2xl border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{exam.title}</p>
                      <p className="text-xs text-muted-foreground">{exam.course} - {exam.date} - {exam.duration}</p>
                    </div>
                    <Badge variant="outline" className={statusStyles[exam.status]}>
                      {formatStatus(exam.status)}
                    </Badge>
                  </div>
                  <Button type="button" className="mt-3 w-full" variant={exam.status === "available" ? "default" : "outline"} onClick={() => startExam(exam)}>
                    <Play className="size-4" />
                    {exam.status === "available" ? "Start exam" : "View details"}
                  </Button>
                </div>
              ))}
              {!liveExams.length ? (
                <p className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">
                  No exams are available from the student dashboard API yet.
                </p>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Readiness Checklist</CardTitle>
              <CardDescription>Production-critical student tasks.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: level === "primary" ? "Pupil profile verified" : "Profile verified", ready: Boolean(student?.admissionNumber && currentUser?.email) },
                { label: `${levelProfile.financeLabel} synced`, ready: (metrics?.outstandingBalance ?? 0) <= 0 },
                { label: level === "primary" ? "Class assessments visible" : level === "vocational" ? "Practical assessment readiness" : "Exam browser ready", ready: level === "primary" ? assignments.length > 0 : liveExams.some((exam) => exam.status === "available" || exam.status === "scheduled") },
                { label: level === "primary" ? "Guardian contact active" : `${levelProfile.educator} assigned`, ready: level === "primary" ? Boolean(student?.guardianContact) : Boolean(student?.classTeacherId) },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-3">
                  <div className={cn("flex size-8 items-center justify-center rounded-full", item.ready ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600")}>
                    {item.ready ? <CheckCircle2 className="size-4" /> : <Clock className="size-4" />}
                  </div>
                  <span className="text-sm">{item.label}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Finance Snapshot</CardTitle>
              <CardDescription>Live student invoice and payment summary.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Outstanding</span>
                <span className="font-semibold">{school?.currencyCode || ""} {metrics?.outstandingBalance ?? 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Invoices needing attention</span>
                <span className="font-semibold">{metrics?.invoicesNeedingAttention ?? 0}</span>
              </div>
              <Button type="button" variant="outline" className="w-full justify-start" asChild>
                <Link href={studentHref("/student/finance")}>
                  <ArrowRight className="size-4" />
                  Open finance
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>School Updates</CardTitle>
              <CardDescription>Published announcements for this student context.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {(dashboardData?.announcements || []).slice(0, 3).map((announcement) => (
                <div key={announcement.id} className="rounded-xl border p-3">
                  <p className="text-sm font-medium">{announcement.title}</p>
                  <p className="line-clamp-2 text-xs text-muted-foreground">{announcement.content}</p>
                </div>
              ))}
              {!dashboardData?.announcements?.length ? (
                <p className="text-sm text-muted-foreground">No current announcements.</p>
              ) : null}
            </CardContent>
          </Card>
        </aside>
      </div>

      <Dialog open={Boolean(selectedAssignment)} onOpenChange={(open) => !open && setSelectedAssignment(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedAssignment?.title}</DialogTitle>
            <DialogDescription>
              {selectedAssignment?.course} - due {selectedAssignment?.due}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Textarea value={assignmentNote} onChange={(event) => setAssignmentNote(event.target.value)} placeholder="Add a submission note or revision comment" />
            <Input type="file" aria-label="Upload assignment file" />
            <p className="text-xs text-muted-foreground">
              The dashboard records a real submission event against your student profile. File storage remains handled by the LMS assignment module.
            </p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setSelectedAssignment(null)}>Cancel</Button>
            <Button
              type="button"
              onClick={() => selectedAssignment && void markSubmitted(selectedAssignment.id)}
              disabled={!selectedAssignment || selectedAssignment.status === "submitted"}
            >
              <Upload className="size-4" />
              {selectedAssignment?.status === "submitted" ? "Already submitted" : "Submit assignment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request academic help</DialogTitle>
            <DialogDescription>Send a concise support request to your class teacher or advisor.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Select value={selectedHelpCourse} onValueChange={setSelectedHelpCourse}>
              <SelectTrigger>
                <SelectValue placeholder="Course" />
              </SelectTrigger>
              <SelectContent>
                {liveCourses.map((course) => (
                  <SelectItem key={course.code} value={course.code}>{course.code} - {course.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Textarea value={helpMessage} onChange={(event) => setHelpMessage(event.target.value)} placeholder="Describe what you need help with" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setHelpOpen(false)}>Cancel</Button>
            <Button type="button" onClick={sendAcademicHelpRequest}>
              <Send className="size-4" />
              Send request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={messageOpen} onOpenChange={setMessageOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Message {messageReceiverName || "advisor"}</DialogTitle>
            <DialogDescription>Start a message from the dashboard or continue in the inbox.</DialogDescription>
          </DialogHeader>
          <Textarea value={messageBody} onChange={(event) => setMessageBody(event.target.value)} placeholder="Write your message" />
          <DialogFooter>
            <Button type="button" variant="outline" asChild>
              <Link href={studentHref("/student/messages")}>Open inbox</Link>
            </Button>
            <Button type="button" onClick={sendAdvisorMessage}>
              <MessageSquare className="size-4" />
              Send message
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
