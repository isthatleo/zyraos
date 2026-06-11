"use client"

import * as React from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import {
  AlertCircle,
  Archive,
  BookOpen,
  CalendarCheck,
  CheckCircle2,
  ClipboardCheck,
  Copy,
  Download,
  Edit3,
  FileText,
  GraduationCap,
  LayoutTemplate,
  ListChecks,
  MoreHorizontal,
  Plus,
  RefreshCcw,
  Search,
  Sparkles,
  Trash2,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

type TeacherClass = { id: string; name: string; grade: string; section: string; academicYear: string; students: number }
type TeacherSubject = { id: string; name: string; code: string; type: string; description: string }
type TeacherAssessment = { id: string; name: string; classId: string; className: string; subjectId: string; subject: string; type: string; dueDate: string | null; status: string; instructions: string }
type TimetableLesson = { id: string; day: string; period: string; startTime: string; endTime: string; classId: string; className: string; subjectId: string; subject: string; room: string; published: boolean }

type LessonPlan = {
  id: string
  title: string
  classId: string
  className: string
  subjectId: string
  subject: string
  subjectCode: string
  week: string
  date: string | null
  period: string
  durationMinutes: number
  status: "draft" | "ready" | "in-progress" | "completed" | "archived"
  objectives: string[]
  materials: string[]
  activities: string[]
  assessments: string[]
  differentiation: string
  homework: string
  standards: string
  notes: string
  reflection: string
  readiness: number
  needsAttention: boolean
  relatedAssessments: TeacherAssessment[]
  createdAt: string
  updatedAt: string
}

type LessonPlanPayload = {
  generatedAt: string
  school: { id: string; name: string; slug: string; type: string }
  currentUser: { id: string; name: string; email: string; position: string; department: string }
  classes: TeacherClass[]
  subjects: TeacherSubject[]
  timetable: TimetableLesson[]
  assessments: TeacherAssessment[]
  plans: LessonPlan[]
  suggestions: Array<TimetableLesson & { title: string; week: string }>
  metrics: {
    total: number
    ready: number
    inProgress: number
    completed: number
    drafts: number
    archived: number
    averageReadiness: number
    timetableCoverage: number
  }
}

type PlanForm = {
  id: string
  title: string
  classId: string
  subjectId: string
  week: string
  date: string
  period: string
  durationMinutes: string
  status: LessonPlan["status"]
  objectives: string
  materials: string
  activities: string
  assessments: string
  differentiation: string
  homework: string
  standards: string
  notes: string
  reflection: string
}

const emptyForm: PlanForm = {
  id: "",
  title: "",
  classId: "",
  subjectId: "",
  week: "",
  date: "",
  period: "",
  durationMinutes: "40",
  status: "draft",
  objectives: "",
  materials: "",
  activities: "",
  assessments: "",
  differentiation: "",
  homework: "",
  standards: "",
  notes: "",
  reflection: "",
}

const statusTone: Record<LessonPlan["status"], string> = {
  draft: "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-300",
  ready: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300",
  "in-progress": "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300",
  completed: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300",
  archived: "border-zinc-200 bg-zinc-50 text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-zinc-300",
}

type LevelConfig = {
  level: "primary" | "secondary" | "university" | "vocational" | "college"
  badge: string
  title: string
  actor: string
  learnerLabel: string
  classLabel: string
  classPlural: string
  subjectLabel: string
  subjectPlural: string
  planLabel: string
  planPlural: string
  objectiveLabel: string
  activityLabel: string
  assessmentLabel: string
  standardsLabel: string
  homeworkLabel: string
  differentiationLabel: string
  reflectionLabel: string
  readinessFocus: string
  workflow: string[]
  evidenceTypes: string[]
  planningFocus: string[]
}

const levelConfigs: Record<LevelConfig["level"], LevelConfig> = {
  primary: {
    level: "primary",
    badge: "Primary teacher",
    title: "Primary Lesson Plans",
    actor: "teacher",
    learnerLabel: "learners",
    classLabel: "class",
    classPlural: "classes",
    subjectLabel: "learning area",
    subjectPlural: "learning areas",
    planLabel: "lesson plan",
    planPlural: "lesson plans",
    objectiveLabel: "Learning intentions",
    activityLabel: "Guided activities / play-based sequence",
    assessmentLabel: "Observation and quick checks",
    standardsLabel: "Curriculum strands / competencies",
    homeworkLabel: "Home practice",
    differentiationLabel: "Support, enrichment, and accommodations",
    reflectionLabel: "Post-lesson reflection",
    readinessFocus: "objectives, activities, materials, observation evidence, and learner support",
    workflow: ["Set simple learning intentions", "Prepare materials and guided practice", "Capture observation evidence", "Reflect on support and enrichment"],
    evidenceTypes: ["Observation notes", "Exercise book check", "Oral questioning", "Practical demonstration"],
    planningFocus: ["Foundational skills", "Classroom routines", "Differentiated support", "Parent-friendly home practice"],
  },
  secondary: {
    level: "secondary",
    badge: "Secondary teacher",
    title: "Secondary Lesson Plans",
    actor: "teacher",
    learnerLabel: "students",
    classLabel: "class",
    classPlural: "classes",
    subjectLabel: "subject",
    subjectPlural: "subjects",
    planLabel: "lesson plan",
    planPlural: "lesson plans",
    objectiveLabel: "Syllabus objectives",
    activityLabel: "Teaching sequence and practice",
    assessmentLabel: "Formative assessment evidence",
    standardsLabel: "Syllabus references / exam objectives",
    homeworkLabel: "Homework / revision task",
    differentiationLabel: "Remediation, extension, and accommodations",
    reflectionLabel: "Lesson evaluation",
    readinessFocus: "syllabus alignment, formative assessment, practice tasks, and exam readiness",
    workflow: ["Map syllabus objective", "Plan instruction and guided practice", "Attach assessment evidence", "Evaluate mastery and remediation"],
    evidenceTypes: ["Exit ticket", "Quiz", "Classwork sample", "Past-paper practice"],
    planningFocus: ["Syllabus coverage", "Exam readiness", "Remediation groups", "Independent practice"],
  },
  university: {
    level: "university",
    badge: "University lecturer",
    title: "Lecture & Seminar Plans",
    actor: "lecturer",
    learnerLabel: "students",
    classLabel: "cohort",
    classPlural: "cohorts",
    subjectLabel: "course",
    subjectPlural: "courses",
    planLabel: "session plan",
    planPlural: "session plans",
    objectiveLabel: "Learning outcomes",
    activityLabel: "Lecture, seminar, lab, and tutorial sequence",
    assessmentLabel: "Assessment and participation evidence",
    standardsLabel: "Course outcomes / accreditation mapping",
    homeworkLabel: "Reading / independent study",
    differentiationLabel: "Accessibility, office-hour, and extension support",
    reflectionLabel: "Teaching reflection",
    readinessFocus: "course outcomes, pre-reading, active learning, assessment alignment, and research links",
    workflow: ["Map course outcome", "Set pre-reading and active learning", "Align assessment evidence", "Reflect on cohort engagement"],
    evidenceTypes: ["Seminar participation", "Lab output", "Quiz", "Assignment milestone"],
    planningFocus: ["Outcome-based education", "Research integration", "Tutorial/lab delivery", "Accreditation evidence"],
  },
  college: {
    level: "college",
    badge: "College lecturer",
    title: "College Session Plans",
    actor: "lecturer",
    learnerLabel: "students",
    classLabel: "cohort",
    classPlural: "cohorts",
    subjectLabel: "course",
    subjectPlural: "courses",
    planLabel: "session plan",
    planPlural: "session plans",
    objectiveLabel: "Session outcomes",
    activityLabel: "Lecture, workshop, and tutorial sequence",
    assessmentLabel: "Competency and assessment evidence",
    standardsLabel: "Programme outcomes / module references",
    homeworkLabel: "Independent study / portfolio task",
    differentiationLabel: "Academic support and extension work",
    reflectionLabel: "Session reflection",
    readinessFocus: "module outcomes, workshop tasks, competency evidence, and portfolio support",
    workflow: ["Map module outcome", "Plan workshop or tutorial", "Capture competency evidence", "Assign portfolio follow-up"],
    evidenceTypes: ["Portfolio item", "Workshop output", "Quiz", "Tutorial participation"],
    planningFocus: ["Module progression", "Practical application", "Portfolio evidence", "Student support"],
  },
  vocational: {
    level: "vocational",
    badge: "Vocational instructor",
    title: "Vocational Training Plans",
    actor: "instructor",
    learnerLabel: "trainees",
    classLabel: "group",
    classPlural: "groups",
    subjectLabel: "trade / module",
    subjectPlural: "trades / modules",
    planLabel: "training plan",
    planPlural: "training plans",
    objectiveLabel: "Competency outcomes",
    activityLabel: "Demonstration, practice, and safety sequence",
    assessmentLabel: "Practical competency evidence",
    standardsLabel: "Trade standards / competency unit",
    homeworkLabel: "Practice / logbook task",
    differentiationLabel: "Safety, remediation, and extension support",
    reflectionLabel: "Training reflection",
    readinessFocus: "competency outcomes, tools/materials, safety checks, practice tasks, and evidence capture",
    workflow: ["Confirm competency unit", "Prepare tools and safety checks", "Demonstrate and supervise practice", "Record competency evidence"],
    evidenceTypes: ["Practical checklist", "Workshop output", "Safety compliance", "Logbook entry"],
    planningFocus: ["Workshop safety", "Hands-on competency", "Tool readiness", "Evidence-based assessment"],
  },
}

function resolveLevelConfig(payload: LessonPlanPayload | null): LevelConfig {
  const raw = `${payload?.school.type || ""} ${payload?.currentUser.position || ""}`.toLowerCase()
  if (raw.includes("university") || raw.includes("lecturer")) return levelConfigs.university
  if (raw.includes("college")) return levelConfigs.college
  if (raw.includes("vocational") || raw.includes("trade") || raw.includes("instructor")) return levelConfigs.vocational
  if (raw.includes("secondary")) return levelConfigs.secondary
  return levelConfigs.primary
}

function formatDate(value: string | null) {
  if (!value) return "Unscheduled"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Unscheduled"
  return new Intl.DateTimeFormat("en", { month: "short", day: "2-digit", year: "numeric" }).format(date)
}

function toLines(values: string[]) {
  return values.join("\n")
}

function fromLines(value: string) {
  return value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean)
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

function currentWeek() {
  const start = new Date()
  start.setDate(start.getDate() - start.getDay() + 1)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  return `${start.toISOString().slice(0, 10)} to ${end.toISOString().slice(0, 10)}`
}

async function fetchJson(endpoint: string) {
  const response = await fetch(endpoint, { cache: "no-store", credentials: "include" }).catch(() => null)
  const body = await response?.json().catch(() => ({}))
  if (!response?.ok) throw new Error(String(body?.error || "Lesson plans could not be loaded"))
  return body as LessonPlanPayload
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

function planToForm(plan: LessonPlan): PlanForm {
  return {
    id: plan.id,
    title: plan.title,
    classId: plan.classId,
    subjectId: plan.subjectId,
    week: plan.week,
    date: plan.date ? plan.date.slice(0, 10) : "",
    period: plan.period,
    durationMinutes: String(plan.durationMinutes || 40),
    status: plan.status,
    objectives: toLines(plan.objectives),
    materials: toLines(plan.materials),
    activities: toLines(plan.activities),
    assessments: toLines(plan.assessments),
    differentiation: plan.differentiation,
    homework: plan.homework,
    standards: plan.standards,
    notes: plan.notes,
    reflection: plan.reflection,
  }
}

function formToPlan(form: PlanForm) {
  return {
    id: form.id,
    title: form.title.trim(),
    classId: form.classId,
    subjectId: form.subjectId,
    week: form.week.trim() || currentWeek(),
    date: form.date || null,
    period: form.period.trim(),
    durationMinutes: Number(form.durationMinutes) || 40,
    status: form.status,
    objectives: fromLines(form.objectives),
    materials: fromLines(form.materials),
    activities: fromLines(form.activities),
    assessments: fromLines(form.assessments),
    differentiation: form.differentiation.trim(),
    homework: form.homework.trim(),
    standards: form.standards.trim(),
    notes: form.notes.trim(),
    reflection: form.reflection.trim(),
  }
}

export default function TeacherLessonPlansPage() {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [payload, setPayload] = React.useState<LessonPlanPayload | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [refreshing, setRefreshing] = React.useState(false)
  const [acting, setActing] = React.useState(false)
  const [error, setError] = React.useState("")
  const [query, setQuery] = React.useState("")
  const [selectedClassId, setSelectedClassId] = React.useState(searchParams?.get("classId") || "all")
  const [selectedStatus, setSelectedStatus] = React.useState("active")
  const [activeTab, setActiveTab] = React.useState("plans")
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editingId, setEditingId] = React.useState("")
  const [form, setForm] = React.useState<PlanForm>(emptyForm)
  const payloadRef = React.useRef<LessonPlanPayload | null>(null)

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
    return tenant ? `/api/tenant/teacher/lesson-plans?tenant=${encodeURIComponent(tenant)}` : "/api/teacher/lesson-plans"
  }, [tenantPrefix])

  const load = React.useCallback(async (notify = false) => {
    setError("")
    if (payloadRef.current) setRefreshing(true)
    else setLoading(true)
    try {
      const data = await fetchJson(endpoint())
      setPayload(data)
      if (notify) toast.success("Lesson plans refreshed")
    } catch (err) {
      const message = err instanceof Error ? err.message : "Lesson plans could not be loaded"
      setError(message)
      if (notify) toast.error(message)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [endpoint])

  React.useEffect(() => {
    void load()
  }, [load])

  const classes = payload?.classes || []
  const subjects = payload?.subjects || []
  const plans = payload?.plans || []
  const timetable = payload?.timetable || []
  const assessments = payload?.assessments || []
  const suggestions = payload?.suggestions || []
  const levelConfig = resolveLevelConfig(payload)
  const selectedClass = classes.find((item) => item.id === selectedClassId) || null
  const search = query.trim().toLowerCase()

  const filteredPlans = plans.filter((plan) => {
    if (selectedClassId !== "all" && plan.classId !== selectedClassId) return false
    if (selectedStatus === "active" && plan.status === "archived") return false
    if (selectedStatus !== "all" && selectedStatus !== "active" && plan.status !== selectedStatus) return false
    if (!search) return true
    return [plan.title, plan.className, plan.subject, plan.week, plan.period, plan.status, ...plan.objectives, ...plan.activities]
      .some((value) => value.toLowerCase().includes(search))
  })

  const weekGroups = [...new Set(filteredPlans.map((plan) => plan.week || "Unscheduled"))]
  const attentionPlans = plans.filter((plan) => plan.needsAttention && plan.status !== "archived")
  const readyPlans = plans.filter((plan) => ["ready", "in-progress", "completed"].includes(plan.status))
  const upcomingPlans = plans
    .filter((plan) => plan.date && plan.status !== "archived" && new Date(plan.date).getTime() >= Date.now() - 86400000)
    .sort((a, b) => new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime())
  const totalObjectives = plans.reduce((sum, plan) => sum + plan.objectives.length, 0)
  const totalActivities = plans.reduce((sum, plan) => sum + plan.activities.length, 0)
  const totalEvidence = plans.reduce((sum, plan) => sum + plan.assessments.length + plan.relatedAssessments.length, 0)
  const classCoverage = classes.map((classItem) => {
    const classPlans = plans.filter((plan) => plan.classId === classItem.id && plan.status !== "archived")
    const classTimetable = timetable.filter((lesson) => lesson.classId === classItem.id)
    return {
      ...classItem,
      plans: classPlans.length,
      timetableEntries: classTimetable.length,
      readiness: classPlans.length ? Math.round(classPlans.reduce((sum, plan) => sum + plan.readiness, 0) / classPlans.length) : 0,
    }
  })

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

  const openCreateDialog = (seed?: Partial<PlanForm>) => {
    const classId = seed?.classId || selectedClass?.id || classes[0]?.id || ""
    const subjectId = seed?.subjectId || subjects[0]?.id || ""
    setEditingId("")
    setForm({ ...emptyForm, week: currentWeek(), classId, subjectId, ...seed })
    setDialogOpen(true)
  }

  const openEditDialog = (plan: LessonPlan) => {
    setEditingId(plan.id)
    setForm(planToForm(plan))
    setDialogOpen(true)
  }

  const savePlan = async () => {
    const action = editingId ? "plan.update" : "plan.create"
    const ok = await postAction({ action, plan: formToPlan(form) }, editingId ? "Lesson plan updated" : "Lesson plan created")
    if (ok) setDialogOpen(false)
  }

  const updateStatus = async (plan: LessonPlan, status: LessonPlan["status"]) => {
    await postAction({ action: "plan.status", id: plan.id, status }, "Lesson plan status updated")
  }

  const duplicatePlan = async (plan: LessonPlan) => {
    await postAction({ action: "plan.duplicate", id: plan.id }, "Lesson plan duplicated")
  }

  const deletePlan = async (plan: LessonPlan) => {
    if (!window.confirm(`Delete "${plan.title}"? This cannot be undone.`)) return
    await postAction({ action: "plan.delete", id: plan.id }, "Lesson plan deleted")
  }

  const archiveCompleted = async () => {
    await postAction({ action: "plan.archive-completed" }, "Completed lesson plans archived")
  }

  const exportJson = () => {
    if (!payload) return
    downloadFile(`${payload.school.slug}-lesson-plans.json`, JSON.stringify({ ...payload, plans: filteredPlans }, null, 2), "application/json")
    toast.success("JSON export started")
  }

  const exportCsv = () => {
    const rows = filteredPlans.map((plan) => ({
      title: plan.title,
      className: plan.className,
      subject: plan.subject,
      week: plan.week,
      date: plan.date,
      period: plan.period,
      durationMinutes: plan.durationMinutes,
      status: plan.status,
      readiness: plan.readiness,
      objectives: plan.objectives.join("; "),
      activities: plan.activities.join("; "),
    }))
    if (!rows.length) return toast.error("No lesson plans available to export")
    downloadFile(`${payload?.school.slug || "teacher"}-lesson-plans.csv`, toCsv(rows), "text/csv")
    toast.success("CSV export started")
  }

  if (loading) return <PageSkeleton />

  if (error) {
    return (
      <div className="w-full p-6 lg:p-8">
        <Card className="rounded-3xl border-destructive/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive"><AlertCircle className="size-5" />Lesson plans could not be loaded</CardTitle>
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
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,197,94,0.18),transparent_34%),linear-gradient(135deg,rgba(14,165,233,0.13),transparent_48%)]" />
          <div className="relative flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
            <div className="max-w-4xl space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="bg-background/80"><GraduationCap className="mr-1 size-3.5" />Teacher workspace</Badge>
                <Badge variant="outline" className="bg-background/80">{payload?.school.name}</Badge>
                <Badge variant="outline" className="bg-background/80">{levelConfig.badge}</Badge>
                <Badge variant="outline" className="bg-background/80">Real tenant API</Badge>
              </div>
              <div>
                <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">{levelConfig.title}</h1>
                <p className="mt-2 text-muted-foreground">
                  Plan, review, export, and track readiness for {payload?.currentUser.name}. This {levelConfig.actor} workspace adapts language and planning checks for {payload?.school.type || levelConfig.level} delivery.
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row xl:flex-col 2xl:flex-row">
              <Button variant="outline" onClick={() => router.push(teacherHref("/teacher/classes"))}>
                <BookOpen className="size-4" />My classes
              </Button>
              <Button variant="outline" onClick={() => load(true)} disabled={refreshing}>
                <RefreshCcw className={cn("size-4", refreshing && "animate-spin")} />Refresh
              </Button>
              <Button onClick={() => openCreateDialog()}>
                <Plus className="size-4" />New {levelConfig.planLabel}
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: levelConfig.planPlural[0].toUpperCase() + levelConfig.planPlural.slice(1), value: payload?.metrics.total || 0, helper: `${payload?.metrics.drafts || 0} drafts`, icon: FileText },
          { label: "Readiness", value: `${payload?.metrics.averageReadiness || 0}%`, helper: "Average completeness", icon: ListChecks },
          { label: "Coverage", value: `${payload?.metrics.timetableCoverage || 0}%`, helper: `${timetable.length} timetable entries`, icon: CalendarCheck },
          { label: "Needs Attention", value: attentionPlans.length, helper: "Draft or under 70% ready", icon: AlertCircle },
          { label: "Ready", value: payload?.metrics.ready || 0, helper: `Prepared ${levelConfig.planPlural}`, icon: CheckCircle2 },
          { label: "In Progress", value: payload?.metrics.inProgress || 0, helper: "Currently teaching", icon: ClipboardCheck },
          { label: "Upcoming", value: upcomingPlans.length, helper: "Scheduled active plans", icon: CalendarCheck },
          { label: levelConfig.classPlural[0].toUpperCase() + levelConfig.classPlural.slice(1), value: classes.length, helper: `${subjects.length} ${levelConfig.subjectPlural} available`, icon: GraduationCap },
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

      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="rounded-3xl shadow-sm">
          <CardHeader>
            <CardTitle>{levelConfig.badge} Focus</CardTitle>
            <CardDescription>Readiness prioritizes {levelConfig.readinessFocus}.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            {levelConfig.planningFocus.map((item) => (
              <div key={item} className="flex items-center gap-2 rounded-2xl border p-3 text-sm">
                <CheckCircle2 className="size-4 text-emerald-500" />
                <span>{item}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="rounded-3xl shadow-sm">
          <CardHeader>
            <CardTitle>Evidence Mix</CardTitle>
            <CardDescription>{totalEvidence} evidence links across {plans.length} active and archived records.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            {levelConfig.evidenceTypes.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => openCreateDialog({ assessments: item })}
                className="flex items-center justify-between rounded-2xl border p-3 text-left text-sm transition-colors hover:bg-muted"
              >
                <span>{item}</span>
                <Plus className="size-4 text-muted-foreground" />
              </button>
            ))}
          </CardContent>
        </Card>

        <Card className="rounded-3xl shadow-sm">
          <CardHeader>
            <CardTitle>Instructional Load</CardTitle>
            <CardDescription>{totalObjectives} objectives and {totalActivities} activities planned.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                <span>Objective density</span>
                <span>{plans.length ? Math.round(totalObjectives / plans.length) : 0} per plan</span>
              </div>
              <Progress value={Math.min(100, plans.length ? (totalObjectives / plans.length) * 20 : 0)} />
            </div>
            <div>
              <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                <span>Activity density</span>
                <span>{plans.length ? Math.round(totalActivities / plans.length) : 0} per plan</span>
              </div>
              <Progress value={Math.min(100, plans.length ? (totalActivities / plans.length) * 14 : 0)} />
            </div>
            <Button variant="outline" className="w-full" onClick={() => setActiveTab("level")}>
              <LayoutTemplate className="size-4" />Open level workflow
            </Button>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-6">
          <Card className="rounded-3xl shadow-sm">
            <CardHeader>
              <CardTitle>Planning Controls</CardTitle>
              <CardDescription>Filter, export, and manage plans. All mutations persist through `/api/tenant/teacher/lesson-plans`.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-[minmax(0,1fr)_210px_190px_180px]">
              <div className="relative">
                <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
                <Input className="pl-9" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search title, objective, activity, class, subject..." />
              </div>
              <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                <SelectTrigger><SelectValue placeholder="Class" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All assigned classes</SelectItem>
                  {classes.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active only</SelectItem>
                  <SelectItem value="all">All statuses</SelectItem>
                  {["draft", "ready", "in-progress", "completed", "archived"].map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
                </SelectContent>
              </Select>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline"><Download className="size-4" />Export</Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={exportCsv}>Export filtered CSV</DropdownMenuItem>
                  <DropdownMenuItem onClick={exportJson}>Export filtered JSON</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={archiveCompleted}>Archive completed</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </CardContent>
          </Card>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
              <TabsList className="grid h-auto grid-cols-2 gap-2 rounded-2xl bg-muted p-2 md:grid-cols-5">
                <TabsTrigger value="plans">Plans</TabsTrigger>
                <TabsTrigger value="weeks">Weekly Board</TabsTrigger>
                <TabsTrigger value="coverage">Coverage</TabsTrigger>
                <TabsTrigger value="templates">Suggestions</TabsTrigger>
                <TabsTrigger value="level">Level Fit</TabsTrigger>
              </TabsList>

            <TabsContent value="plans" className="grid gap-4 lg:grid-cols-2">
              {filteredPlans.map((plan) => (
                <Card key={plan.id} className="rounded-3xl shadow-sm">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <CardTitle className="line-clamp-2">{plan.title}</CardTitle>
                        <CardDescription>{plan.subject} - {plan.className}</CardDescription>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon"><MoreHorizontal className="size-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Plan actions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => openEditDialog(plan)}><Edit3 className="size-4" />Edit</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => duplicatePlan(plan)}><Copy className="size-4" />Duplicate</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {(["draft", "ready", "in-progress", "completed", "archived"] as const).map((status) => (
                            <DropdownMenuItem key={status} onClick={() => updateStatus(plan, status)}>Mark {status}</DropdownMenuItem>
                          ))}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem variant="destructive" onClick={() => deletePlan(plan)}><Trash2 className="size-4" />Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline" className={cn("border", statusTone[plan.status])}>{plan.status}</Badge>
                      <Badge variant="outline">{formatDate(plan.date)}</Badge>
                      <Badge variant="outline">{plan.week || "No week"}</Badge>
                      {plan.period ? <Badge variant="outline">{plan.period}</Badge> : null}
                    </div>
                    <div>
                      <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                        <span>Readiness</span>
                        <span>{plan.readiness}%</span>
                      </div>
                      <Progress value={plan.readiness} />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="rounded-2xl border p-3"><p className="text-xs text-muted-foreground">Objectives</p><p className="text-lg font-semibold">{plan.objectives.length}</p></div>
                      <div className="rounded-2xl border p-3"><p className="text-xs text-muted-foreground">Activities</p><p className="text-lg font-semibold">{plan.activities.length}</p></div>
                      <div className="rounded-2xl border p-3"><p className="text-xs text-muted-foreground">Assessments</p><p className="text-lg font-semibold">{plan.assessments.length + plan.relatedAssessments.length}</p></div>
                    </div>
                    {plan.objectives.length ? (
                      <ul className="space-y-1 text-sm text-muted-foreground">
                        {plan.objectives.slice(0, 3).map((objective) => <li key={objective} className="line-clamp-1">- {objective}</li>)}
                      </ul>
                    ) : <p className="text-sm text-muted-foreground">No objectives added yet.</p>}
                    <div className="grid gap-2 sm:grid-cols-3">
                      <Button variant="outline" onClick={() => openEditDialog(plan)}><Edit3 className="size-4" />Edit</Button>
                      <Button variant="outline" onClick={() => duplicatePlan(plan)}><Copy className="size-4" />Duplicate</Button>
                      <Button onClick={() => updateStatus(plan, plan.status === "completed" ? "ready" : "completed")}><CheckCircle2 className="size-4" />{plan.status === "completed" ? "Reopen" : "Complete"}</Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {!filteredPlans.length ? (
                <Card className="rounded-3xl lg:col-span-2">
                  <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
                    <LayoutTemplate className="size-10 text-muted-foreground" />
                    <div>
                      <p className="font-semibold">No lesson plans match this view</p>
                      <p className="text-sm text-muted-foreground">Create a plan manually or use a timetable suggestion.</p>
                    </div>
                    <Button onClick={() => openCreateDialog()}><Plus className="size-4" />Create lesson plan</Button>
                  </CardContent>
                </Card>
              ) : null}
            </TabsContent>

            <TabsContent value="weeks" className="space-y-4">
              {weekGroups.map((week) => {
                const weekPlans = filteredPlans.filter((plan) => (plan.week || "Unscheduled") === week)
                return (
                  <Card key={week} className="rounded-3xl shadow-sm">
                    <CardHeader>
                      <CardTitle>{week}</CardTitle>
                      <CardDescription>{weekPlans.length} planned lesson{weekPlans.length === 1 ? "" : "s"}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {weekPlans.map((plan) => (
                        <button key={plan.id} type="button" onClick={() => openEditDialog(plan)} className="grid w-full gap-3 rounded-2xl border p-4 text-left transition-colors hover:bg-muted md:grid-cols-[minmax(0,1fr)_120px_120px] md:items-center">
                          <div>
                            <p className="font-medium">{plan.title}</p>
                            <p className="text-sm text-muted-foreground">{plan.subject} - {plan.className} - {formatDate(plan.date)}</p>
                          </div>
                          <Badge variant="outline" className={cn("w-fit border", statusTone[plan.status])}>{plan.status}</Badge>
                          <span className="text-sm text-muted-foreground">{plan.readiness}% ready</span>
                        </button>
                      ))}
                    </CardContent>
                  </Card>
                )
              })}
              {!weekGroups.length ? <Card className="rounded-3xl"><CardContent className="p-6 text-sm text-muted-foreground">No weekly plan groups yet.</CardContent></Card> : null}
            </TabsContent>

            <TabsContent value="coverage" className="grid gap-4 lg:grid-cols-2">
              {classCoverage.map((item) => (
                <Card key={item.id} className="rounded-3xl shadow-sm">
                  <CardHeader>
                    <CardTitle>{item.name}</CardTitle>
                    <CardDescription>{item.students} learners - {item.timetableEntries} timetable entries</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="rounded-2xl border p-3"><p className="text-xs text-muted-foreground">Plans</p><p className="text-lg font-semibold">{item.plans}</p></div>
                      <div className="rounded-2xl border p-3"><p className="text-xs text-muted-foreground">Readiness</p><p className="text-lg font-semibold">{item.readiness}%</p></div>
                      <div className="rounded-2xl border p-3"><p className="text-xs text-muted-foreground">Timetable</p><p className="text-lg font-semibold">{item.timetableEntries}</p></div>
                    </div>
                    <Progress value={item.timetableEntries ? Math.min(100, (item.plans / item.timetableEntries) * 100) : item.plans ? 100 : 0} />
                    <Button variant="outline" onClick={() => { setSelectedClassId(item.id); setActiveTab("plans") }}>Open class plans</Button>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="templates" className="space-y-3">
              {suggestions.map((suggestion) => (
                <Card key={suggestion.id} className="rounded-3xl shadow-sm">
                  <CardContent className="grid gap-4 p-5 md:grid-cols-[minmax(0,1fr)_180px_160px] md:items-center">
                    <div>
                      <p className="font-semibold">{suggestion.title}</p>
                      <p className="text-sm text-muted-foreground">{suggestion.day} - {suggestion.startTime || "TBA"} to {suggestion.endTime || "TBA"} - Room {suggestion.room || "TBA"}</p>
                    </div>
                    <Badge variant="outline" className="w-fit">{suggestion.week}</Badge>
                    <Button onClick={() => openCreateDialog({
                      title: suggestion.title,
                      classId: suggestion.classId,
                      subjectId: suggestion.subjectId,
                      week: suggestion.week,
                      period: suggestion.period || `${suggestion.day} ${suggestion.startTime}`,
                    })}>
                      <Sparkles className="size-4" />Use suggestion
                    </Button>
                  </CardContent>
                </Card>
              ))}
              {!suggestions.length ? <Card className="rounded-3xl"><CardContent className="p-6 text-sm text-muted-foreground">No timetable suggestions available. Published timetable entries will appear here.</CardContent></Card> : null}
            </TabsContent>
          </Tabs>
        </div>

        <aside className="space-y-6">
          <Card className="rounded-3xl shadow-sm">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2">
              <Button variant="outline" onClick={() => openCreateDialog()}><Plus className="size-4" />Create blank plan</Button>
              <Button variant="outline" onClick={() => router.push(teacherHref("/teacher/classes"))}><GraduationCap className="size-4" />Open classes</Button>
              <Button variant="outline" onClick={() => setActiveTab("templates")}><Sparkles className="size-4" />Use timetable suggestion</Button>
              <Button variant="outline" onClick={exportCsv}><Download className="size-4" />Export CSV</Button>
              <Button variant="outline" onClick={archiveCompleted}><Archive className="size-4" />Archive completed</Button>
            </CardContent>
          </Card>

          <Card className="rounded-3xl shadow-sm">
            <CardHeader>
              <CardTitle>Planning Readiness</CardTitle>
              <CardDescription>Production checks that keep plans usable before delivery.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: "Assigned classes loaded", value: classes.length, ready: classes.length > 0 },
                { label: "Subjects mapped", value: subjects.length, ready: subjects.length > 0 },
                { label: "Timetable synced", value: timetable.length, ready: timetable.length > 0 },
                { label: "Plans ready or active", value: readyPlans.length, ready: readyPlans.length > 0 },
                { label: "Assessment links", value: assessments.length, ready: assessments.length > 0 },
              ].map((item) => (
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
              <CardTitle>Needs Attention</CardTitle>
              <CardDescription>Drafts or incomplete plans below the readiness threshold.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {attentionPlans.slice(0, 6).map((plan) => (
                <button key={plan.id} type="button" onClick={() => openEditDialog(plan)} className="w-full rounded-2xl border p-3 text-left transition-colors hover:bg-muted">
                  <div className="flex items-center justify-between gap-3">
                    <p className="line-clamp-1 text-sm font-medium">{plan.title}</p>
                    <Badge variant="outline">{plan.readiness}%</Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{plan.subject} - {plan.className}</p>
                </button>
              ))}
              {!attentionPlans.length ? <p className="text-sm text-muted-foreground">No active lesson plans need attention.</p> : null}
            </CardContent>
          </Card>
        </aside>
      </section>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Lesson Plan" : "Create Lesson Plan"}</DialogTitle>
            <DialogDescription>Use one item per line for objectives, materials, activities, and assessment evidence.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <Input placeholder="Lesson title" value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} />
            <div className="grid gap-3 md:grid-cols-2">
              <Select value={form.classId} onValueChange={(value) => setForm((current) => ({ ...current, classId: value }))}>
                <SelectTrigger><SelectValue placeholder="Class" /></SelectTrigger>
                <SelectContent>{classes.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={form.subjectId} onValueChange={(value) => setForm((current) => ({ ...current, subjectId: value }))}>
                <SelectTrigger><SelectValue placeholder="Subject" /></SelectTrigger>
                <SelectContent>{subjects.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}{item.code ? ` (${item.code})` : ""}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid gap-3 md:grid-cols-4">
              <Input placeholder="Week" value={form.week} onChange={(event) => setForm((current) => ({ ...current, week: event.target.value }))} />
              <Input type="date" value={form.date} onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))} />
              <Input placeholder="Period / time" value={form.period} onChange={(event) => setForm((current) => ({ ...current, period: event.target.value }))} />
              <Input placeholder="Minutes" value={form.durationMinutes} onChange={(event) => setForm((current) => ({ ...current, durationMinutes: event.target.value }))} />
            </div>
            <Select value={form.status} onValueChange={(value) => setForm((current) => ({ ...current, status: value as LessonPlan["status"] }))}>
              <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>{(["draft", "ready", "in-progress", "completed", "archived"] as const).map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
            </Select>
            <div className="grid gap-3 md:grid-cols-2">
              <Textarea className="min-h-32" placeholder="Learning objectives" value={form.objectives} onChange={(event) => setForm((current) => ({ ...current, objectives: event.target.value }))} />
              <Textarea className="min-h-32" placeholder="Materials and resources" value={form.materials} onChange={(event) => setForm((current) => ({ ...current, materials: event.target.value }))} />
              <Textarea className="min-h-32" placeholder="Lesson activities / sequence" value={form.activities} onChange={(event) => setForm((current) => ({ ...current, activities: event.target.value }))} />
              <Textarea className="min-h-32" placeholder="Assessment evidence / checks for understanding" value={form.assessments} onChange={(event) => setForm((current) => ({ ...current, assessments: event.target.value }))} />
            </div>
            <Textarea placeholder="Differentiation / accommodations" value={form.differentiation} onChange={(event) => setForm((current) => ({ ...current, differentiation: event.target.value }))} />
            <Textarea placeholder="Homework / independent practice" value={form.homework} onChange={(event) => setForm((current) => ({ ...current, homework: event.target.value }))} />
            <Textarea placeholder="Curriculum standards / syllabus references" value={form.standards} onChange={(event) => setForm((current) => ({ ...current, standards: event.target.value }))} />
            <Textarea placeholder="Teacher notes" value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} />
            <Textarea placeholder="Post-lesson reflection" value={form.reflection} onChange={(event) => setForm((current) => ({ ...current, reflection: event.target.value }))} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={savePlan} disabled={acting || !form.title || !form.classId || !form.subjectId}>
              {acting ? "Saving..." : editingId ? "Update lesson plan" : "Create lesson plan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
