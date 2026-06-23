"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { teacherDashboardApi } from "@/lib/teacher-api-client"
import {
  AlertCircle,
  BarChart3,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  Filter,
  Grid,
  List,
  MapPin,
  RefreshCcw,
  Search,
  TrendingUp,
  Users,
  BookOpen,
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

type ScheduleInsight = {
  totalLessonsPerWeek: number
  averageClassSize: number
  busiestDay: string
  busiestHour: string
  classesCount: number
  lessonsPerDay: { [key: string]: number }
  lessonsBySubject: { [key: string]: number }
  lessonsByClass: { [key: string]: number }
  uniqueSubjects: string[]
  uniqueClasses: Set<string>
  timeSlots: Set<string>
}

const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]

const getSubjectColor = (subject: string, isDark: boolean = false): string => {
  const colors = isDark
    ? [
        "bg-blue-950/40 text-blue-300",
        "bg-emerald-950/40 text-emerald-300",
        "bg-purple-950/40 text-purple-300",
        "bg-amber-950/40 text-amber-300",
        "bg-red-950/40 text-red-300",
        "bg-cyan-950/40 text-cyan-300",
      ]
    : [
        "bg-blue-100 text-blue-700",
        "bg-emerald-100 text-emerald-700",
        "bg-purple-100 text-purple-700",
        "bg-amber-100 text-amber-700",
        "bg-red-100 text-red-700",
        "bg-cyan-100 text-cyan-700",
      ]
  const index = subject.charCodeAt(0) % colors.length
  return colors[index]
}

const formatTime = (time: string): string => {
  if (!time) return ""
  const [hours, minutes] = time.split(":")
  const hour = parseInt(hours)
  const ampm = hour >= 12 ? "PM" : "AM"
  const displayHour = hour > 12 ? hour - 12 : hour || 12
  return `${displayHour}:${minutes} ${ampm}`
}

const getScheduleInsights = (lessons: TeacherLesson[]): ScheduleInsight => {
  if (lessons.length === 0) {
    return {
      totalLessonsPerWeek: 0,
      averageClassSize: 0,
      busiestDay: "",
      busiestHour: "",
      classesCount: 0,
      lessonsPerDay: {},
      lessonsBySubject: {},
      lessonsByClass: {},
      uniqueSubjects: [],
      uniqueClasses: new Set(),
      timeSlots: new Set(),
    }
  }

  const lessonsPerDay: { [key: string]: number } = {}
  const lessonsBySubject: { [key: string]: number } = {}
  const lessonsByClass: { [key: string]: number } = {}
  const uniqueClasses = new Set<string>()
  const uniqueSubjects = new Set<string>()
  const timeSlots = new Set<string>()

  lessons.forEach((lesson) => {
    lessonsPerDay[lesson.day] = (lessonsPerDay[lesson.day] || 0) + 1
    lessonsBySubject[lesson.subject] = (lessonsBySubject[lesson.subject] || 0) + 1
    lessonsByClass[lesson.className] = (lessonsByClass[lesson.className] || 0) + 1
    uniqueClasses.add(lesson.className)
    uniqueSubjects.add(lesson.subject)
    timeSlots.add(lesson.startTime)
  })

  const busiestDay =
    Object.entries(lessonsPerDay).sort(([, a], [, b]) => b - a)[0]?.[0] || ""
  const busiestHour = [...timeSlots].sort()[Math.floor(timeSlots.size / 2)] || ""

  return {
    totalLessonsPerWeek: lessons.length,
    averageClassSize: Math.ceil(lessons.length / uniqueClasses.size),
    busiestDay,
    busiestHour: busiestHour ? formatTime(busiestHour) : "",
    classesCount: uniqueClasses.size,
    lessonsPerDay,
    lessonsBySubject,
    lessonsByClass,
    uniqueSubjects: [...uniqueSubjects],
    uniqueClasses,
    timeSlots,
  }
}

const teacherHref = (path: string) => {
  const tenant = typeof window !== "undefined" ? window.location.pathname.split("/")[1] : ""
  return `/${tenant}${path}`
}

export default function MySchedulePage() {
  const router = useRouter()
  const [tenant, setTenant] = React.useState("")
  const [lessons, setLessons] = React.useState<TeacherLesson[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [activeView, setActiveView] = React.useState<"week" | "list" | "day" | "upcoming">("week")
  const [selectedDay, setSelectedDay] = React.useState(new Date())
  const [filterSubject, setFilterSubject] = React.useState("all")
  const [filterClass, setFilterClass] = React.useState("all")
  const [search, setSearch] = React.useState("")
  const [selectedLesson, setSelectedLesson] = React.useState<TeacherLesson | null>(null)
  const [detailsDialogOpen, setDetailsDialogOpen] = React.useState(false)

  React.useEffect(() => {
    const tenantSlug = typeof window !== "undefined" ? window.location.pathname.split("/")[1] : ""
    setTenant(tenantSlug)
  }, [])

  React.useEffect(() => {
    if (!tenant) return

    const fetchData = async () => {
      try {
        setLoading(true)
        const res = await fetch(teacherDashboardApi("my-schedule"))
        if (!res.ok) throw new Error(`API error: ${res.status}`)
        const data = await res.json()
        setLessons(data.timetable || [])
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load schedule data")
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [tenant])

  const insights = React.useMemo(() => getScheduleInsights(lessons), [lessons])

  const filteredLessons = React.useMemo(() => {
    return lessons
      .filter((l) => filterSubject === "all" || l.subject === filterSubject)
      .filter((l) => filterClass === "all" || l.className === filterClass)
      .filter(
        (l) =>
          !search ||
          l.subject.toLowerCase().includes(search.toLowerCase()) ||
          l.className.toLowerCase().includes(search.toLowerCase()) ||
          l.room.toLowerCase().includes(search.toLowerCase())
      )
  }, [lessons, filterSubject, filterClass, search])

  const dayLessons = React.useMemo(() => {
    const dayName = DAYS_OF_WEEK[selectedDay.getDay() - 1] || DAYS_OF_WEEK[0]
    return filteredLessons
      .filter((l) => l.day === dayName)
      .sort((a, b) => a.startTime.localeCompare(b.startTime))
  }, [filteredLessons, selectedDay])

  const upcomingLessons = React.useMemo(() => {
    return filteredLessons
      .sort((a, b) => a.startTime.localeCompare(b.startTime))
      .slice(0, 10)
  }, [filteredLessons])

  const exportSchedule = () => {
    if (filteredLessons.length === 0) {
      toast.error("No lessons to export")
      return
    }
    const headers = ["Day", "Time", "Class", "Subject", "Room", "Period"]
    const rows = filteredLessons.map((l) => [
      l.day,
      `${formatTime(l.startTime)} - ${formatTime(l.endTime)}`,
      l.className,
      l.subject,
      l.room,
      l.period,
    ])
    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `schedule-export-${new Date().toISOString().split("T")[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
    toast.success("Schedule exported successfully")
  }

  if (loading) {
    return (
      <div className="w-full space-y-6 p-6 lg:p-8">
        <Skeleton className="h-48 rounded-3xl" />
        <Skeleton className="h-60 rounded-3xl" />
        <Skeleton className="h-96 rounded-3xl" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="w-full p-6 lg:p-8">
        <Card className="rounded-3xl border-destructive/20 bg-destructive/5 shadow-sm dark:bg-red-950/20 dark:border-red-900/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 dark:text-red-300">
              <AlertCircle className="size-5" />
              Unable to Load Schedule
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground dark:text-slate-400">{error}</p>
            <Button onClick={() => window.location.reload()} className="dark:bg-blue-600 dark:hover:bg-blue-700">
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="w-full space-y-6 p-6 lg:p-8">
      {/* Hero Section */}
      <section className="overflow-hidden rounded-3xl border bg-card shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="relative p-6 md:p-8">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,197,94,0.18),transparent_34%),linear-gradient(135deg,rgba(14,165,233,0.12),transparent_46%)] dark:bg-[radial-gradient(circle_at_top_right,rgba(34,197,94,0.08),transparent_34%),linear-gradient(135deg,rgba(14,165,233,0.06),transparent_46%)]" />
          <div className="relative flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
            <div className="max-w-4xl space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="bg-background/80 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700">
                  <Calendar className="mr-1 size-3.5" />
                  Teacher workspace
                </Badge>
                <Badge variant="outline" className="bg-background/80 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700">
                  My Schedule
                </Badge>
              </div>
              <div>
                <h1 className="text-3xl font-semibold tracking-tight md:text-4xl dark:text-white">My Schedule</h1>
                <p className="mt-2 text-muted-foreground dark:text-slate-400">
                  Manage your teaching schedule with comprehensive views and analytics
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row xl:flex-col 2xl:flex-row">
              <Button variant="outline" onClick={() => window.location.reload()} className="dark:bg-slate-800 dark:border-slate-700 dark:hover:bg-slate-700 dark:text-white">
                <RefreshCcw className="size-4" />
                Refresh
              </Button>
              <Button onClick={exportSchedule} className="dark:bg-emerald-600 dark:hover:bg-emerald-700">
                <Download className="size-4" />
                Export
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Metric Cards */}
      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {[
          {
            label: "Total Lessons",
            value: insights.totalLessonsPerWeek,
            helper: "Per week",
            icon: BookOpen,
            color: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400",
          },
          {
            label: "Classes",
            value: insights.classesCount,
            helper: "Assigned",
            icon: Users,
            color: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400",
          },
          {
            label: "Subjects",
            value: insights.uniqueSubjects.length,
            helper: "Teaching",
            icon: BookOpen,
            color: "bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400",
          },
          {
            label: "Busiest Day",
            value: insights.busiestDay.slice(0, 3),
            helper: insights.lessonsPerDay[insights.busiestDay] + " lessons",
            icon: TrendingUp,
            color: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",
          },
          {
            label: "Peak Time",
            value: insights.busiestHour,
            helper: "Most lessons",
            icon: Clock,
            color: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400",
          },
        ].map(({ label, value, helper, icon: Icon, color }, idx) => (
          <Card key={idx} className="rounded-3xl shadow-sm dark:bg-slate-900 dark:border-slate-800">
            <CardContent className="flex min-h-32 items-start justify-between gap-4 p-5">
              <div>
                <p className="text-sm text-muted-foreground dark:text-slate-400">{label}</p>
                <p className="mt-2 text-3xl font-semibold dark:text-white">{value}</p>
                <p className="mt-1 text-xs text-muted-foreground dark:text-slate-500">{helper}</p>
              </div>
              <div className={cn("rounded-2xl p-3", color)}>
                <Icon className="size-5" />
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

      {/* Filters and View Tabs */}
      <section className="space-y-4">
        <div className="flex gap-2 border-b dark:border-slate-700">
          {[
            { id: "week", label: "Week View", icon: Grid },
            { id: "list", label: "List View", icon: List },
            { id: "day", label: "Day View", icon: Calendar },
            { id: "upcoming", label: "Upcoming", icon: Clock },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveView(id as any)}
              className={cn(
                "flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-all",
                activeView === id
                  ? "border-primary text-primary dark:text-blue-400 dark:border-blue-400"
                  : "border-transparent text-muted-foreground dark:text-slate-400 hover:text-foreground dark:hover:text-slate-200"
              )}
            >
              <Icon className="size-4" />
              {label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-3">
          <Input
            placeholder="Search lessons..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs dark:bg-slate-800 dark:border-slate-700 dark:text-white dark:placeholder:text-slate-500"
          />
          <Select value={filterSubject} onValueChange={setFilterSubject}>
            <SelectTrigger className="w-[140px] dark:bg-slate-800 dark:border-slate-700 dark:text-white">
              <SelectValue placeholder="Subject" />
            </SelectTrigger>
            <SelectContent className="dark:bg-slate-800 dark:border-slate-700">
              <SelectItem value="all" className="dark:text-white">
                All Subjects
              </SelectItem>
              {insights.uniqueSubjects.map((subject) => (
                <SelectItem key={subject} value={subject} className="dark:text-white">
                  {subject}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterClass} onValueChange={setFilterClass}>
            <SelectTrigger className="w-[140px] dark:bg-slate-800 dark:border-slate-700 dark:text-white">
              <SelectValue placeholder="Class" />
            </SelectTrigger>
            <SelectContent className="dark:bg-slate-800 dark:border-slate-700">
              <SelectItem value="all" className="dark:text-white">
                All Classes
              </SelectItem>
              {[...insights.uniqueClasses].map((cls) => (
                <SelectItem key={cls} value={cls} className="dark:text-white">
                  {cls}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </section>

      {/* Main Content */}
      <section className="grid gap-6 lg:grid-cols-4">
        <div className="lg:col-span-3 space-y-4">
          {/* Week View */}
          {activeView === "week" && (
            <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-7 rounded-3xl overflow-hidden border bg-card shadow-sm dark:bg-slate-900 dark:border-slate-800 p-4">
              {DAYS_OF_WEEK.map((day) => {
                const dayLessons = filteredLessons.filter((l) => l.day === day)
                return (
                  <div key={day} className="rounded-2xl border bg-card dark:bg-slate-800 dark:border-slate-700 p-3">
                    <h3 className="text-sm font-semibold dark:text-white mb-3">{day.slice(0, 3)}</h3>
                    <div className="space-y-2">
                      {dayLessons.map((lesson) => (
                        <div
                          key={lesson.id}
                          onClick={() => {
                            setSelectedLesson(lesson)
                            setDetailsDialogOpen(true)
                          }}
                          className={cn(
                            "p-2 rounded-xl text-xs cursor-pointer hover:opacity-80 transition-opacity",
                            getSubjectColor(lesson.subject)
                          )}
                        >
                          <p className="font-medium line-clamp-1">{lesson.subject}</p>
                          <p className="text-xs opacity-75">{formatTime(lesson.startTime)}</p>
                        </div>
                      ))}
                      {dayLessons.length === 0 && <p className="text-xs text-muted-foreground dark:text-slate-500">No classes</p>}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* List View */}
          {activeView === "list" && (
            <Card className="rounded-3xl shadow-sm dark:bg-slate-900 dark:border-slate-800">
              <CardHeader>
                <CardTitle className="dark:text-white">Schedule List</CardTitle>
                <CardDescription className="dark:text-slate-400">{filteredLessons.length} lessons</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {filteredLessons.map((lesson) => (
                  <div
                    key={lesson.id}
                    onClick={() => {
                      setSelectedLesson(lesson)
                      setDetailsDialogOpen(true)
                    }}
                    className="grid gap-3 rounded-2xl border bg-card hover:bg-muted/50 transition-colors cursor-pointer md:grid-cols-[100px_120px_80px_1fr_80px_100px] md:items-center p-4 dark:bg-slate-800 dark:border-slate-700 dark:hover:bg-slate-700"
                  >
                    <div>
                      <p className="text-sm font-medium dark:text-white">{lesson.day}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground dark:text-slate-400">Time</p>
                      <p className="text-xs font-medium dark:text-white">{formatTime(lesson.startTime)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground dark:text-slate-400">Class</p>
                      <p className="text-xs font-medium dark:text-white">{lesson.className}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium dark:text-white">{lesson.subject}</p>
                      <p className="text-xs text-muted-foreground dark:text-slate-400">{lesson.room}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground dark:text-slate-400">Period</p>
                      <p className="text-xs font-medium dark:text-white">{lesson.period}</p>
                    </div>
                    <Badge className={cn("text-xs", getSubjectColor(lesson.subject, true))}>
                      {lesson.published ? "Published" : "Draft"}
                    </Badge>
                  </div>
                ))}
                {filteredLessons.length === 0 && (
                  <p className="text-sm text-muted-foreground dark:text-slate-400 text-center py-8">
                    No lessons match filters
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Day View */}
          {activeView === "day" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-3xl border bg-card p-4 shadow-sm dark:bg-slate-900 dark:border-slate-800">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedDay(new Date(selectedDay.getTime() - 24 * 60 * 60 * 1000))}
                  className="dark:bg-slate-800 dark:border-slate-700 dark:hover:bg-slate-700"
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <h2 className="text-lg font-semibold dark:text-white">
                  {selectedDay.toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "short",
                    day: "numeric",
                  })}
                </h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedDay(new Date(selectedDay.getTime() + 24 * 60 * 60 * 1000))}
                  className="dark:bg-slate-800 dark:border-slate-700 dark:hover:bg-slate-700"
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>
              <Card className="rounded-3xl shadow-sm dark:bg-slate-900 dark:border-slate-800">
                <CardContent className="space-y-3 pt-6">
                  {dayLessons.length > 0 ? (
                    dayLessons.map((lesson) => (
                      <div
                        key={lesson.id}
                        onClick={() => {
                          setSelectedLesson(lesson)
                          setDetailsDialogOpen(true)
                        }}
                        className="p-4 rounded-2xl border cursor-pointer hover:shadow-md transition-shadow dark:border-slate-700"
                      >
                        <div className="flex justify-between items-start gap-4">
                          <div className="flex-1">
                            <h3 className="font-semibold dark:text-white">{lesson.subject}</h3>
                            <p className="text-sm text-muted-foreground dark:text-slate-400">
                              {lesson.className}
                            </p>
                            <div className="flex items-center gap-4 mt-2 text-sm">
                              <span className="flex items-center gap-1 text-muted-foreground dark:text-slate-400">
                                <Clock className="size-4" />
                                {formatTime(lesson.startTime)} - {formatTime(lesson.endTime)}
                              </span>
                              <span className="flex items-center gap-1 text-muted-foreground dark:text-slate-400">
                                <MapPin className="size-4" />
                                {lesson.room}
                              </span>
                            </div>
                          </div>
                          <Badge className={cn("text-xs", getSubjectColor(lesson.subject, true))}>
                            {lesson.period}
                          </Badge>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground dark:text-slate-400 text-center py-8">
                      No classes scheduled for this day
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Upcoming View */}
          {activeView === "upcoming" && (
            <Card className="rounded-3xl shadow-sm dark:bg-slate-900 dark:border-slate-800">
              <CardHeader>
                <CardTitle className="dark:text-white">Upcoming Lessons</CardTitle>
                <CardDescription className="dark:text-slate-400">Next 10 lessons chronologically</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {upcomingLessons.length > 0 ? (
                  upcomingLessons.map((lesson, idx) => (
                    <div
                      key={lesson.id}
                      onClick={() => {
                        setSelectedLesson(lesson)
                        setDetailsDialogOpen(true)
                      }}
                      className="flex items-center gap-4 p-4 rounded-2xl border cursor-pointer hover:bg-muted/50 transition-colors dark:border-slate-700 dark:hover:bg-slate-700"
                    >
                      <div className="flex-shrink-0 text-center">
                        <div className="text-2xl font-semibold dark:text-white">{idx + 1}</div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold dark:text-white">{lesson.subject}</p>
                        <p className="text-sm text-muted-foreground dark:text-slate-400">
                          {lesson.day} · {lesson.className}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-medium dark:text-white">{formatTime(lesson.startTime)}</p>
                        <p className="text-xs text-muted-foreground dark:text-slate-400">{lesson.room}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground dark:text-slate-400 text-center py-8">
                    No upcoming lessons
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Analytics Cards */}
          <section className="grid gap-6 md:grid-cols-2">
            <Card className="rounded-3xl shadow-sm dark:bg-slate-900 dark:border-slate-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 dark:text-white">
                  <BarChart3 className="size-5 text-blue-500" />
                  Lessons by Subject
                </CardTitle>
                <CardDescription className="dark:text-slate-400">Subject distribution</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {insights.uniqueSubjects.map((subject) => {
                  const count = insights.lessonsBySubject[subject] || 0
                  const percentage = Math.round((count / insights.totalLessonsPerWeek) * 100)
                  return (
                    <div key={subject}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium dark:text-white">{subject}</span>
                        <span className="text-muted-foreground dark:text-slate-400">
                          {count} ({percentage}%)
                        </span>
                      </div>
                      <Progress value={percentage} className="h-1.5" />
                    </div>
                  )
                })}
              </CardContent>
            </Card>

            <Card className="rounded-3xl shadow-sm dark:bg-slate-900 dark:border-slate-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 dark:text-white">
                  <Calendar className="size-5 text-emerald-500" />
                  Lessons by Day
                </CardTitle>
                <CardDescription className="dark:text-slate-400">Daily breakdown</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {DAYS_OF_WEEK.map((day) => {
                  const count = insights.lessonsPerDay[day] || 0
                  const percentage = Math.round((count / insights.totalLessonsPerWeek) * 100)
                  return (
                    <div key={day}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium dark:text-white">{day}</span>
                        <span className="text-muted-foreground dark:text-slate-400">
                          {count} ({percentage}%)
                        </span>
                      </div>
                      <Progress value={percentage} className="h-1.5" />
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          </section>
        </div>

        {/* Sidebar */}
        <aside className="space-y-6">
          <Card className="rounded-3xl shadow-sm bg-gradient-to-br from-blue-50 to-blue-50/50 border-blue-100/50 dark:from-blue-950/40 dark:to-blue-950/20 dark:border-blue-900/50">
            <CardHeader>
              <CardTitle className="text-blue-900 dark:text-blue-300">Schedule Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: "Weekly Lessons", value: insights.totalLessonsPerWeek, icon: BookOpen },
                { label: "Classes", value: insights.classesCount, icon: Users },
                { label: "Subjects", value: insights.uniqueSubjects.length, icon: BookOpen },
                { label: "Time Slots", value: insights.timeSlots.size, icon: Clock },
              ].map(({ label, value, icon: Icon }) => (
                <div key={label} className="flex items-center justify-between p-2 rounded-xl bg-white/50 dark:bg-blue-950/30">
                  <div className="flex items-center gap-2">
                    <Icon className="size-4 text-blue-600 dark:text-blue-400" />
                    <span className="text-sm font-medium dark:text-blue-200">{label}</span>
                  </div>
                  <Badge className="text-sm dark:bg-blue-950/50 dark:border-blue-800 dark:text-blue-300">
                    {value}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="rounded-3xl shadow-sm bg-gradient-to-br from-emerald-50 to-emerald-50/50 border-emerald-100/50 dark:from-emerald-950/40 dark:to-emerald-950/20 dark:border-emerald-900/50">
            <CardHeader>
              <CardTitle className="text-emerald-900 dark:text-emerald-300">Class Schedule</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {[...insights.uniqueClasses].map((cls) => {
                const count = insights.lessonsByClass[cls] || 0
                return (
                  <div key={cls} className="p-2 rounded-xl bg-white/50 dark:bg-emerald-950/30">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium dark:text-emerald-200">{cls}</span>
                      <Badge variant="outline" className="text-xs dark:bg-emerald-950/50 dark:border-emerald-800 dark:text-emerald-300">
                        {count}
                      </Badge>
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>

          <Button
            className="w-full dark:bg-blue-600 dark:hover:bg-blue-700"
            onClick={() => router.push(teacherHref("/teacher/dashboard"))}
          >
            Back to Dashboard
          </Button>
        </aside>
      </section>

      {/* Details Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-2xl dark:bg-slate-900 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="dark:text-white">{selectedLesson?.subject}</DialogTitle>
            <DialogDescription className="dark:text-slate-400">
              {selectedLesson?.day} · {selectedLesson?.className}
            </DialogDescription>
          </DialogHeader>
          {selectedLesson && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground dark:text-slate-400">Time</p>
                  <p className="font-medium dark:text-white">
                    {formatTime(selectedLesson.startTime)} - {formatTime(selectedLesson.endTime)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground dark:text-slate-400">Period</p>
                  <p className="font-medium dark:text-white">{selectedLesson.period}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground dark:text-slate-400">Class</p>
                  <p className="font-medium dark:text-white">{selectedLesson.className}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground dark:text-slate-400">Room</p>
                  <p className="font-medium dark:text-white">{selectedLesson.room}</p>
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground dark:text-slate-400">Subject Code</p>
                <Badge className={cn("text-sm", getSubjectColor(selectedLesson.subject, true))}>
                  {selectedLesson.subjectCode}
                </Badge>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setDetailsDialogOpen(false)}
                  className="dark:bg-slate-800 dark:border-slate-700 dark:hover:bg-slate-700 dark:text-white"
                >
                  Close
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
