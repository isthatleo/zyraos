"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { teacherDashboardApi } from "@/lib/teacher-api-client"
import {
  AlertCircle,
  BarChart3,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  Edit,
  Eye,
  FileText,
  Filter,
  Flame,
  Grid,
  Home,
  List,
  Plus,
  RefreshCcw,
  Search,
  Trash2,
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
import { cn } from "@/lib/utils"

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

type TeacherClass = {
  id: string
  name: string
  grade: string
  section: string
  students: number
}

type TeacherDashboardPayload = {
  generatedAt: string
  assessments: TeacherAssessment[]
  classes: TeacherClass[]
  metrics: {
    assessments: number
    pendingGrading: number
  }
}

type AssignmentInsight = {
  totalAssignments: number
  pendingGradingCount: number
  typeDistribution: { [key: string]: number }
  classDistribution: { [key: string]: number }
  dueThisWeek: number
  overdue: number
  avgGradingProgress: number
  submissionRate: number
}

const teacherHref = (path: string) => {
  const tenant = typeof window !== "undefined" ? window.location.pathname.split("/")[1] : ""
  return `/${tenant}${path}`
}

const formatDate = (dateString: string | null) => {
  if (!dateString) return "No due date"
  const date = new Date(dateString)
  const today = new Date()
  const diffTime = date.getTime() - today.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays < 0) return `${Math.abs(diffDays)} days overdue`
  if (diffDays === 0) return "Due today"
  if (diffDays === 1) return "Due tomorrow"
  if (diffDays <= 7) return `Due in ${diffDays} days`

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

const getAssignmentInsights = (assessments: TeacherAssessment[]): AssignmentInsight => {
  const typeDistribution: { [key: string]: number } = {}
  const classDistribution: { [key: string]: number } = {}
  let pendingGradingCount = 0
  let dueThisWeek = 0
  let overdue = 0
  const today = new Date()
  const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)

  assessments.forEach((assessment) => {
    typeDistribution[assessment.type] = (typeDistribution[assessment.type] || 0) + 1
    classDistribution[assessment.className] = (classDistribution[assessment.className] || 0) + 1

    const ungradedCount = Math.max(0, assessment.classStudents - assessment.graded)
    pendingGradingCount += ungradedCount

    if (assessment.dueDate) {
      const dueDate = new Date(assessment.dueDate)
      if (dueDate < today) overdue++
      else if (dueDate <= weekFromNow) dueThisWeek++
    }
  })

  const gradingProgressValues = assessments.map((a) => a.gradingProgress || 0)
  const avgGradingProgress = gradingProgressValues.length ? Math.round(gradingProgressValues.reduce((a, b) => a + b) / gradingProgressValues.length) : 0

  return {
    totalAssignments: assessments.length,
    pendingGradingCount,
    typeDistribution,
    classDistribution,
    dueThisWeek,
    overdue,
    avgGradingProgress,
    submissionRate: assessments.length ? Math.round((assessments.filter((a) => a.gradingProgress > 0).length / assessments.length) * 100) : 0,
  }
}

export default function AssignmentsPage() {
  const router = useRouter()
  const [payload, setPayload] = React.useState<TeacherDashboardPayload | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [activeView, setActiveView] = React.useState<"list" | "grid">("list")
  const [filterType, setFilterType] = React.useState("all")
  const [filterClass, setFilterClass] = React.useState("all")
  const [filterStatus, setFilterStatus] = React.useState("all")
  const [search, setSearch] = React.useState("")
  const [sortBy, setSortBy] = React.useState("due-date")
  const [selectedAssignment, setSelectedAssignment] = React.useState<TeacherAssessment | null>(null)
  const [detailsDialogOpen, setDetailsDialogOpen] = React.useState(false)

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(teacherDashboardApi("assignments"))
        if (!res.ok) throw new Error(`API error: ${res.status}`)
        const data = await res.json()
        setPayload(data)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load assignments")
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const assignments = React.useMemo(() => payload?.assessments || [], [payload])
  const insights = React.useMemo(() => getAssignmentInsights(assignments), [assignments])

  const filteredAssignments = React.useMemo(() => {
    return assignments
      .filter((a) => filterType === "all" || a.type === filterType)
      .filter((a) => filterClass === "all" || a.className === filterClass)
      .filter((a) => {
        if (filterStatus === "all") return true
        if (filterStatus === "pending") return a.gradingProgress < 100
        if (filterStatus === "graded") return a.gradingProgress === 100
        return true
      })
      .filter((a) => !search || [a.name, a.subject, a.className].some((v) => v.toLowerCase().includes(search.toLowerCase())))
      .sort((a, b) => {
        if (sortBy === "due-date") {
          if (!a.dueDate && !b.dueDate) return 0
          if (!a.dueDate) return 1
          if (!b.dueDate) return -1
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
        }
        if (sortBy === "name") return a.name.localeCompare(b.name)
        if (sortBy === "progress") return (b.gradingProgress || 0) - (a.gradingProgress || 0)
        return 0
      })
  }, [assignments, filterType, filterClass, filterStatus, search, sortBy])

  const types = React.useMemo(() => [...new Set(assignments.map((a) => a.type))], [assignments])
  const classes = React.useMemo(() => [...new Set(assignments.map((a) => a.className))], [assignments])

  if (loading) {
    return (
      <div className="w-full space-y-6 p-6 lg:p-8">
        <Skeleton className="h-48 rounded-3xl" />
        <Skeleton className="h-60 rounded-3xl" />
        <Skeleton className="h-96 rounded-3xl" />
      </div>
    )
  }

  if (error || !payload) {
    return (
      <div className="w-full p-6 lg:p-8">
        <Card className="rounded-3xl border-destructive/20 bg-destructive/5 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="size-5" />
              Unable to Load Assignments
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">{error || "Assignment data could not be loaded."}</p>
            <Button onClick={() => window.location.reload()}>Retry</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="w-full space-y-6 p-6 lg:p-8">
      {/* Hero Section */}
      <section className="overflow-hidden rounded-3xl border bg-card shadow-sm">
        <div className="relative p-6 md:p-8">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,197,94,0.18),transparent_34%),linear-gradient(135deg,rgba(14,165,233,0.12),transparent_46%)]" />
          <div className="relative flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
            <div className="max-w-4xl space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="bg-background/80"><FileText className="mr-1 size-3.5" />Teacher workspace</Badge>
                <Badge variant="outline" className="bg-background/80">Assignments</Badge>
              </div>
              <div>
                <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Assignments & Assessments</h1>
                <p className="mt-2 text-muted-foreground">
                  Create, manage, and grade assignments across all your classes with comprehensive analytics
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row xl:flex-col 2xl:flex-row">
              <Button variant="outline" onClick={() => window.location.reload()}>
                <RefreshCcw className="size-4" />
                Refresh
              </Button>
              <Button onClick={() => router.push(teacherHref("/teacher/dashboard"))}>
                <Plus className="size-4" />
                New Assignment
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Metric Cards */}
      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {[
          { label: "Total Assignments", value: insights.totalAssignments, helper: "All time", icon: FileText, color: "bg-blue-50 text-blue-700" },
          { label: "Pending Grading", value: insights.pendingGradingCount, helper: "Submissions to grade", icon: Clock, color: "bg-amber-50 text-amber-700" },
          { label: "Due This Week", value: insights.dueThisWeek, helper: "Upcoming deadlines", icon: Calendar, color: "bg-emerald-50 text-emerald-700" },
          { label: "Overdue", value: insights.overdue, helper: "Past due date", icon: Flame, color: "bg-red-50 text-red-700" },
          { label: "Avg Grading", value: `${insights.avgGradingProgress}%`, helper: "Overall progress", icon: BarChart3, color: "bg-purple-50 text-purple-700" },
        ].map(({ label, value, helper, icon: Icon, color }, idx) => {
          const [bgColor, textColor] = color.split(" ")
          return (
            <Card key={idx} className="rounded-3xl shadow-sm">
              <CardContent className="flex min-h-32 items-start justify-between gap-4 p-5">
                <div>
                  <p className="text-sm text-muted-foreground">{label}</p>
                  <p className="mt-2 text-3xl font-semibold">{value}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{helper}</p>
                </div>
                <div className={cn("rounded-2xl p-3", color)}><Icon className="size-5" /></div>
              </CardContent>
            </Card>
          )
        })}
      </section>

      {/* Filters and View Tabs */}
      <section className="space-y-4">
        <div className="flex gap-2 border-b">
          {[
            { id: "list", label: "List View", icon: List },
            { id: "grid", label: "Grid View", icon: Grid },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveView(id as any)}
              className={cn(
                "flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-all",
                activeView === id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="size-4" />
              {label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-3">
          <Input placeholder="Search assignments..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {types.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterClass} onValueChange={setFilterClass}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Class" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Classes</SelectItem>
              {classes.map((cls) => (
                <SelectItem key={cls} value={cls}>
                  {cls}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="graded">Graded</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="due-date">Due Date</SelectItem>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="progress">Progress</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </section>

      {/* Main Content */}
      <section className="grid gap-6 lg:grid-cols-4">
        <div className="lg:col-span-3 space-y-4">
          {activeView === "list" && (
            <Card className="rounded-3xl shadow-sm">
              <CardHeader>
                <CardTitle>All Assignments</CardTitle>
                <CardDescription>{filteredAssignments.length} assignments</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {filteredAssignments.map((assignment) => (
                  <div
                    key={assignment.id}
                    onClick={() => {
                      setSelectedAssignment(assignment)
                      setDetailsDialogOpen(true)
                    }}
                    className="grid gap-3 rounded-2xl border bg-card p-4 hover:bg-muted/50 transition-colors cursor-pointer md:grid-cols-[1fr_120px_100px_100px] md:items-center"
                  >
                    <div>
                      <p className="font-medium">{assignment.name}</p>
                      <p className="text-sm text-muted-foreground">{assignment.className} - {assignment.subject}</p>
                    </div>
                    <div className="text-sm">
                      <p className="text-muted-foreground">Due</p>
                      <p className="font-medium">{formatDate(assignment.dueDate)}</p>
                    </div>
                    <div className="text-sm">
                      <p className="text-muted-foreground">Type</p>
                      <Badge variant="outline" className="text-xs">{assignment.type}</Badge>
                    </div>
                    <div className="text-sm">
                      <p className="text-muted-foreground">Progress</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Progress value={assignment.gradingProgress || 0} className="h-1.5 flex-1" />
                        <span className="text-xs font-medium">{assignment.gradingProgress || 0}%</span>
                      </div>
                    </div>
                  </div>
                ))}
                {filteredAssignments.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">No assignments match filters</p>
                )}
              </CardContent>
            </Card>
          )}

          {activeView === "grid" && (
            <div className="grid gap-4 md:grid-cols-2">
              {filteredAssignments.map((assignment) => (
                <Card
                  key={assignment.id}
                  className="rounded-3xl shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => {
                    setSelectedAssignment(assignment)
                    setDetailsDialogOpen(true)
                  }}
                >
                  <CardHeader>
                    <CardTitle className="line-clamp-2">{assignment.name}</CardTitle>
                    <CardDescription>{assignment.className}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Subject</p>
                        <p className="font-medium">{assignment.subject}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Type</p>
                        <p className="font-medium">{assignment.type}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Score</p>
                        <p className="font-medium">{assignment.totalScore} points</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Due</p>
                        <p className="font-medium text-sm">{formatDate(assignment.dueDate)}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Grading Progress</p>
                      <Progress value={assignment.gradingProgress || 0} />
                      <p className="text-xs text-muted-foreground mt-1">{assignment.graded}/{assignment.classStudents} graded</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Analytics Cards */}
          <section className="grid gap-6 md:grid-cols-2">
            <Card className="rounded-3xl shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="size-5 text-emerald-500" />
                  Assignment Types
                </CardTitle>
                <CardDescription>Distribution by type</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {Object.entries(insights.typeDistribution)
                  .sort((a, b) => b[1] - a[1])
                  .map(([type, count]) => (
                    <div key={type}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium capitalize">{type}</span>
                        <span className="text-muted-foreground">{count}</span>
                      </div>
                      <Progress value={(count / insights.totalAssignments) * 100} className="h-1.5" />
                    </div>
                  ))}
              </CardContent>
            </Card>

            <Card className="rounded-3xl shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="size-5 text-blue-500" />
                  Class Distribution
                </CardTitle>
                <CardDescription>Assignments per class</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {Object.entries(insights.classDistribution)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 6)
                  .map(([cls, count]) => (
                    <div key={cls} className="flex items-center justify-between">
                      <span className="text-sm font-medium">{cls}</span>
                      <Badge variant="outline">{count}</Badge>
                    </div>
                  ))}
              </CardContent>
            </Card>
          </section>
        </div>

        {/* Sidebar */}
        <aside className="space-y-6">
          <Card className="rounded-3xl shadow-sm bg-gradient-to-br from-emerald-50 to-emerald-50/50 border-emerald-100/50">
            <CardHeader>
              <CardTitle className="text-emerald-900">Workload Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: "Total Assignments", value: insights.totalAssignments, icon: FileText },
                { label: "Pending Grading", value: insights.pendingGradingCount, icon: Clock },
                { label: "Submission Rate", value: `${insights.submissionRate}%`, icon: CheckCircle2 },
                { label: "Avg Progress", value: `${insights.avgGradingProgress}%`, icon: BarChart3 },
              ].map(({ label, value, icon: Icon }) => (
                <div key={label} className="flex items-center justify-between p-2 rounded-xl bg-white/50">
                  <div className="flex items-center gap-2">
                    <Icon className="size-4 text-emerald-600" />
                    <span className="text-sm font-medium">{label}</span>
                  </div>
                  <Badge variant="outline" className="text-sm">{value}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="rounded-3xl shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Flame className="size-5 text-red-500" />
                Urgent Tasks
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {insights.overdue > 0 && (
                <div className="p-3 rounded-2xl bg-red-50 border border-red-200">
                  <p className="text-sm font-medium text-red-900">{insights.overdue} overdue</p>
                  <p className="text-xs text-red-700">Grading pending</p>
                </div>
              )}
              {insights.dueThisWeek > 0 && (
                <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200">
                  <p className="text-sm font-medium text-amber-900">{insights.dueThisWeek} due this week</p>
                  <p className="text-xs text-amber-700">Upcoming deadlines</p>
                </div>
              )}
              {insights.pendingGradingCount > 0 && (
                <div className="p-3 rounded-2xl bg-blue-50 border border-blue-200">
                  <p className="text-sm font-medium text-blue-900">{insights.pendingGradingCount} to grade</p>
                  <p className="text-xs text-blue-700">Student submissions</p>
                </div>
              )}
              {insights.overdue === 0 && insights.dueThisWeek === 0 && insights.pendingGradingCount === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">All caught up!</p>
              )}
            </CardContent>
          </Card>

          <Button className="w-full" onClick={() => router.push(teacherHref("/teacher/dashboard"))}>
            <Home className="mr-2 size-4" />
            Back to Dashboard
          </Button>
        </aside>
      </section>

      {/* Details Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedAssignment?.name}</DialogTitle>
            <DialogDescription>{selectedAssignment?.className} - {selectedAssignment?.subject}</DialogDescription>
          </DialogHeader>
          {selectedAssignment && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Type</p>
                  <p className="font-medium">{selectedAssignment.type}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Score</p>
                  <p className="font-medium">{selectedAssignment.totalScore} points</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Passing Score</p>
                  <p className="font-medium">{selectedAssignment.passingScore} points</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Due Date</p>
                  <p className="font-medium">{formatDate(selectedAssignment.dueDate)}</p>
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-2">Grading Progress</p>
                <Progress value={selectedAssignment.gradingProgress || 0} />
                <p className="text-xs text-muted-foreground mt-1">
                  {selectedAssignment.graded} out of {selectedAssignment.classStudents} graded ({selectedAssignment.gradingProgress || 0}%)
                </p>
              </div>

              {selectedAssignment.description && (
                <div>
                  <p className="text-sm text-muted-foreground">Description</p>
                  <p className="text-sm">{selectedAssignment.description}</p>
                </div>
              )}

              {selectedAssignment.instructions && (
                <div>
                  <p className="text-sm text-muted-foreground">Instructions</p>
                  <p className="text-sm">{selectedAssignment.instructions}</p>
                </div>
              )}

              <DialogFooter>
                <Button variant="outline" onClick={() => setDetailsDialogOpen(false)}>
                  Close
                </Button>
                <Button>
                  <Edit className="mr-2 size-4" />
                  Edit Assignment
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
