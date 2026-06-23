"use client"

import { teacherDashboardApi } from "@/lib/teacher-api-client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  Eye,
  Flame,
  Home,
  List,
  MapPin,
  RefreshCcw,
  Search,
  Sun,
  TrendingDown,
  TrendingUp,
  Users,
  Zap,
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

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
const TIMES = ["07:30", "08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00", "12:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:15"]
const SUBJECT_COLORS = {
  "Mathematics": "bg-blue-500",
  "English": "bg-green-500",
  "Science": "bg-purple-500",
  "History": "bg-amber-500",
  "Geography": "bg-teal-500",
  "ICT": "bg-red-500",
  "PE": "bg-pink-500",
  "Art": "bg-orange-500",
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

type TeacherDashboardPayload = {
  generatedAt: string
  timetable: TeacherLesson[]
  todaysLessons: TeacherLesson[]
  classes: any[]
  learners: any[]
  subjects: any[]
}

type ScheduleInsight = {
  totalLessons: number
  dayDistribution: { [key: string]: number }
  subjectDistribution: { [key: string]: number }
  classDistribution: { [key: string]: number }
  timeSlotDistribution: { [key: string]: number }
  roomDistribution: { [key: string]: number }
  busiestDay: string
  busiestHour: string
  distinctClasses: number
  avgLessonsPerDay: number
  freePeriods: number
  todaysLessons: number
  publishedLessons: number
}

const teacherHref = (path: string) => {
  const tenant = typeof window !== "undefined" ? window.location.pathname.split("/")[1] : ""
  return `/${tenant}${path}`
}

const formatTime = (time: string) => {
  const [hours, minutes] = time.split(":").map(Number)
  const period = hours >= 12 ? "PM" : "AM"
  const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours
  return `${displayHours}:${String(minutes).padStart(2, "0")} ${period}`
}

const getScheduleInsights = (lessons: TeacherLesson[]): ScheduleInsight => {
  const dayDistribution: { [key: string]: number } = {}
  const subjectDistribution: { [key: string]: number } = {}
  const classDistribution: { [key: string]: number } = {}
  const timeSlotDistribution: { [key: string]: number } = {}
  const roomDistribution: { [key: string]: number } = {}

  DAYS.forEach((day) => (dayDistribution[day] = 0))
  TIMES.forEach((time) => (timeSlotDistribution[time] = 0))

  lessons.forEach((lesson) => {
    dayDistribution[lesson.day] = (dayDistribution[lesson.day] || 0) + 1
    subjectDistribution[lesson.subject] = (subjectDistribution[lesson.subject] || 0) + 1
    classDistribution[lesson.className] = (classDistribution[lesson.className] || 0) + 1
    timeSlotDistribution[lesson.startTime] = (timeSlotDistribution[lesson.startTime] || 0) + 1
    roomDistribution[lesson.room] = (roomDistribution[lesson.room] || 0) + 1
  })

  const busiestDay = Object.entries(dayDistribution).sort((a, b) => b[1] - a[1])[0]?.[0] || "N/A"
  const busiestHour = Object.entries(timeSlotDistribution).sort((a, b) => b[1] - a[1])[0]?.[0] || "N/A"

  const todayName = new Date().toLocaleDateString("en-US", { weekday: "long" })
  const todaysLessons = dayDistribution[todayName] || 0
  const freePeriods = TIMES.length * 5 - lessons.filter(l => DAYS.slice(0, 5).includes(l.day)).length

  return {
    totalLessons: lessons.length,
    dayDistribution,
    subjectDistribution,
    classDistribution,
    timeSlotDistribution,
    roomDistribution,
    busiestDay,
    busiestHour,
    distinctClasses: Object.keys(classDistribution).length,
    avgLessonsPerDay: Math.round(lessons.length / 5),
    freePeriods,
    todaysLessons,
    publishedLessons: lessons.filter((l) => l.published).length,
  }
}

const getSubjectColor = (subject: string) => {
  return (SUBJECT_COLORS[subject as keyof typeof SUBJECT_COLORS] || "bg-slate-500")
}

export default function MySchedulePage() {
  const router = useRouter()
  const [payload, setPayload] = React.useState<TeacherDashboardPayload | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [activeView, setActiveView] = React.useState<"week" | "list" | "day" | "upcoming">("week")
  const [selectedDay, setSelectedDay] = React.useState(new Date().toLocaleDateString("en-US", { weekday: "long" }))
  const [filterDay, setFilterDay] = React.useState("all")
  const [filterSubject, setFilterSubject] = React.useState("all")
  const [filterClass, setFilterClass] = React.useState("all")
  const [search, setSearch] = React.useState("")
  const [sortBy, setSortBy] = React.useState("time")
  const [selectedLesson, setSelectedLesson] = React.useState<TeacherLesson | null>(null)
  const [lessonDialogOpen, setLessonDialogOpen] = React.useState(false)
  const [exportDialogOpen, setExportDialogOpen] = React.useState(false)

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(teacherDashboardApi("timetable"))
        if (!res.ok) throw new Error(`API error: ${res.status}`)
        const data = await res.json()
        setPayload(data)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load schedule")
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const lessons = React.useMemo(() => payload?.timetable || [], [payload])
  const filteredLessons = React.useMemo(() => {
    return lessons
      .filter((l) => (filterDay === "all" ? true : l.day === filterDay))
      .filter((l) => (filterSubject === "all" ? true : l.subject === filterSubject))
      .filter((l) => (filterClass === "all" ? true : l.className === filterClass))
      .filter((l) => !search || [l.subject, l.className, l.room].some((v) => v.toLowerCase().includes(search.toLowerCase())))
      .sort((a, b) => {
        if (sortBy === "time") return a.startTime.localeCompare(b.startTime)
        if (sortBy === "class") return a.className.localeCompare(b.className)
        if (sortBy === "subject") return a.subject.localeCompare(b.subject)
        return 0
      })
  }, [lessons, filterDay, filterSubject, filterClass, search, sortBy])

  const insights = React.useMemo(() => getScheduleInsights(lessons), [lessons])

  const subjects = React.useMemo(() => [...new Set(lessons.map((l) => l.subject))], [lessons])
  const classes = React.useMemo(() => [...new Set(lessons.map((l) => l.className))], [lessons])

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
              Unable to Load Schedule
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">{error || "Schedule data could not be loaded."}</p>
            <Button onClick={() => window.location.reload()}>Retry</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const toCsv = () => {
    const headers = ["Day", "Time", "Class", "Subject", "Room"]
    const rows = filteredLessons.map((l) => [l.day, `${l.startTime}-${l.endTime}`, l.className, l.subject, l.room])
    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `schedule-${new Date().toISOString().split("T")[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="w-full space-y-6 p-6 lg:p-8">
      {/* Hero Section with Metric Cards */}
      <section className="overflow-hidden rounded-3xl border bg-card shadow-sm">
        <div className="relative p-6 md:p-8">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,197,94,0.18),transparent_34%),linear-gradient(135deg,rgba(14,165,233,0.12),transparent_46%)]" />
          <div className="relative flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
            <div className="max-w-4xl space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="bg-background/80"><Calendar className="mr-1 size-3.5" />Teacher workspace</Badge>
                <Badge variant="outline" className="bg-background/80">My Schedule</Badge>
              </div>
              <div>
                <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">My Schedule</h1>
                <p className="mt-2 text-muted-foreground">
                  View, manage, and optimize your teaching timetable with comprehensive analytics
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row xl:flex-col 2xl:flex-row">
              <Button variant="outline" onClick={() => window.location.reload()}>
                <RefreshCcw className="size-4" />
                Refresh
              </Button>
              <Button onClick={() => setExportDialogOpen(true)}>
                <Download className="size-4" />
                Export
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Metric Cards Grid */}
      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {[
          { label: "Total Lessons", value: insights.totalLessons, helper: `${insights.publishedLessons} published`, icon: Calendar, color: "bg-blue-50 text-blue-700" },
          { label: "Today's Lessons", value: insights.todaysLessons, helper: "Scheduled for today", icon: Sun, color: "bg-amber-50 text-amber-700" },
          { label: "Classes", value: insights.distinctClasses, helper: "Different classes", icon: Users, color: "bg-emerald-50 text-emerald-700" },
          { label: "Free Periods", value: insights.freePeriods, helper: "Week availability", icon: Clock, color: "bg-purple-50 text-purple-700" },
          { label: "Busiest Day", value: insights.busiestDay, helper: `${insights.dayDistribution[insights.busiestDay]} lessons`, icon: Flame, color: "bg-red-50 text-red-700" },
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

      {/* View Tabs */}
      <section className="flex gap-2 border-b">
        {[
          { id: "week", label: "Week View", icon: Calendar },
          { id: "list", label: "List View", icon: List },
          { id: "day", label: "Day View", icon: Eye },
          { id: "upcoming", label: "Upcoming", icon: Clock },
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
      </section>

      {/* Filters */}
      <section className="flex flex-wrap gap-3">
        <Input placeholder="Search subject, class, room..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
        <Select value={filterDay} onValueChange={setFilterDay}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Day" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Days</SelectItem>
            {DAYS.map((day) => (
              <SelectItem key={day} value={day}>
                {day}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterSubject} onValueChange={setFilterSubject}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Subject" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Subjects</SelectItem>
            {subjects.map((subject) => (
              <SelectItem key={subject} value={subject}>
                {subject}
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
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="time">Time</SelectItem>
            <SelectItem value="class">Class</SelectItem>
            <SelectItem value="subject">Subject</SelectItem>
          </SelectContent>
        </Select>
      </section>

      {/* Content Area */}
      <section className="grid gap-6 lg:grid-cols-4">
        <div className="lg:col-span-3 space-y-6">
          {/* Week View */}
          {activeView === "week" && (
            <Card className="rounded-3xl shadow-sm">
              <CardHeader>
                <CardTitle>Week Schedule</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <div className="inline-block min-w-full">
                  <div className="grid gap-1" style={{ gridTemplateColumns: `80px repeat(${DAYS.length}, 1fr)` }}>
                    <div className="text-xs font-medium text-muted-foreground">Time</div>
                    {DAYS.map((day) => (
                      <div key={day} className="text-center text-xs font-medium">
                        {day.slice(0, 3)}
                      </div>
                    ))}
                    {TIMES.map((time) => (
                      <React.Fragment key={time}>
                        <div className="text-xs font-medium text-muted-foreground py-2">{formatTime(time)}</div>
                        {DAYS.map((day) => {
                          const lesson = filteredLessons.find((l) => l.day === day && l.startTime === time)
                          return (
                            <div key={`${day}-${time}`} className="p-1 min-h-12 flex items-center justify-center">
                              {lesson && (
                                <button
                                  onClick={() => {
                                    setSelectedLesson(lesson)
                                    setLessonDialogOpen(true)
                                  }}
                                  className={cn("w-full text-xs font-medium text-white rounded p-1 cursor-pointer hover:opacity-90 transition-opacity", getSubjectColor(lesson.subject))}
                                >
                                  <div>{lesson.subject.slice(0, 4)}</div>
                                  <div className="text-xs">{lesson.className}</div>
                                </button>
                              )}
                            </div>
                          )
                        })}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* List View */}
          {activeView === "list" && (
            <Card className="rounded-3xl shadow-sm">
              <CardHeader>
                <CardTitle>Schedule List</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {filteredLessons.map((lesson) => (
                    <div
                      key={lesson.id}
                      className="grid gap-3 rounded-2xl border bg-card p-4 md:grid-cols-[100px_1fr_100px_120px] md:items-center hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => {
                        setSelectedLesson(lesson)
                        setLessonDialogOpen(true)
                      }}
                    >
                      <div>
                        <p className="font-semibold text-sm">{lesson.day}</p>
                        <p className="text-xs text-muted-foreground">{lesson.startTime} - {lesson.endTime}</p>
                      </div>
                      <div>
                        <p className="font-medium">{lesson.subject}</p>
                        <p className="text-sm text-muted-foreground">{lesson.className} - Room {lesson.room || "TBA"}</p>
                      </div>
                      <Badge variant="outline" className={cn("w-fit", getSubjectColor(lesson.subject))}>{lesson.subjectCode}</Badge>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            router.push(teacherHref(`/teacher/attendance?classId=${encodeURIComponent(lesson.classId)}`))
                          }}
                        >
                          Mark
                        </Button>
                      </div>
                    </div>
                  ))}
                  {filteredLessons.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No lessons match filters</p>}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Day View */}
          {activeView === "day" && (
            <Card className="rounded-3xl shadow-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Day Schedule - {selectedDay}</CardTitle>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const idx = DAYS.indexOf(selectedDay)
                        setSelectedDay(idx > 0 ? DAYS[idx - 1] : DAYS[6])
                      }}
                    >
                      <ChevronLeft className="size-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const idx = DAYS.indexOf(selectedDay)
                        setSelectedDay(idx < 6 ? DAYS[idx + 1] : DAYS[0])
                      }}
                    >
                      <ChevronRight className="size-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {TIMES.map((time) => {
                  const lesson = filteredLessons.find((l) => l.day === selectedDay && l.startTime === time)
                  return (
                    <div
                      key={time}
                      className="flex items-center gap-3 rounded-2xl border p-3 hover:bg-muted/50 transition-colors"
                      onClick={() => lesson && (setSelectedLesson(lesson), setLessonDialogOpen(true))}
                    >
                      <div className="w-24 flex-shrink-0">
                        <p className="font-semibold text-sm">{formatTime(time)}</p>
                      </div>
                      <div className="flex-1">
                        {lesson ? (
                          <>
                            <p className="font-medium">{lesson.subject}</p>
                            <p className="text-sm text-muted-foreground">{lesson.className} - Room {lesson.room || "TBA"}</p>
                          </>
                        ) : (
                          <p className="text-sm text-muted-foreground">Free Period</p>
                        )}
                      </div>
                      {lesson && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            router.push(teacherHref(`/teacher/attendance?classId=${encodeURIComponent(lesson.classId)}`))
                          }}
                        >
                          Mark
                        </Button>
                      )}
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          )}

          {/* Upcoming Lessons */}
          {activeView === "upcoming" && (
            <Card className="rounded-3xl shadow-sm">
              <CardHeader>
                <CardTitle>Upcoming Lessons</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {filteredLessons.slice(0, 10).map((lesson) => (
                  <div
                    key={lesson.id}
                    className="flex items-center justify-between rounded-2xl border p-3 hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => {
                      setSelectedLesson(lesson)
                      setLessonDialogOpen(true)
                    }}
                  >
                    <div className="flex-1">
                      <p className="font-medium">{lesson.subject}</p>
                      <p className="text-sm text-muted-foreground">{lesson.day} - {lesson.startTime} to {lesson.endTime}</p>
                      <p className="text-xs text-muted-foreground mt-1">{lesson.className} - Room {lesson.room || "TBA"}</p>
                    </div>
                    <Badge variant="outline">{lesson.className}</Badge>
                  </div>
                ))}
                {filteredLessons.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No upcoming lessons</p>}
              </CardContent>
            </Card>
          )}

          {/* Analytics Cards */}
          <section className="grid gap-6 md:grid-cols-2">
            <Card className="rounded-3xl shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="size-5 text-emerald-500" />
                  Peak Teaching Hours
                </CardTitle>
                <CardDescription>Your busiest lesson slots</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {Object.entries(insights.timeSlotDistribution)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 6)
                  .map(([time, count]) => (
                    <div key={time}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium">{formatTime(time)}</span>
                        <span className="text-muted-foreground">{count} lesson{count !== 1 ? 's' : ''}</span>
                      </div>
                      <Progress value={(count / Math.max(...Object.values(insights.timeSlotDistribution))) * 100} className="h-2" />
                    </div>
                  ))}
              </CardContent>
            </Card>

            <Card className="rounded-3xl shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="size-5 text-blue-500" />
                  Subject Distribution
                </CardTitle>
                <CardDescription>Teaching load by subject</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {Object.entries(insights.subjectDistribution)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 6)
                  .map(([subject, count]) => (
                    <div key={subject}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium">{subject}</span>
                        <span className="text-muted-foreground">{count} lessons ({Math.round((count / insights.totalLessons) * 100)}%)</span>
                      </div>
                      <Progress value={(count / insights.totalLessons) * 100} className="h-2" />
                    </div>
                  ))}
              </CardContent>
            </Card>

            <Card className="rounded-3xl shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="size-5 text-orange-500" />
                  Room Distribution
                </CardTitle>
                <CardDescription>Where you teach the most</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {Object.entries(insights.roomDistribution)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 6)
                  .map(([room, count]) => (
                    <div key={room} className="flex items-center justify-between rounded-2xl border p-2.5 bg-muted/30">
                      <span className="text-sm font-medium">{room || "TBA"}</span>
                      <Badge variant="outline" className="text-xs">{count}</Badge>
                    </div>
                  ))}
              </CardContent>
            </Card>

            <Card className="rounded-3xl shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="size-5 text-yellow-500" />
                  Day Workload
                </CardTitle>
                <CardDescription>Lessons per day breakdown</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {DAYS.slice(0, 5).map((day) => (
                  <div key={day}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium">{day}</span>
                      <span className="text-muted-foreground">{insights.dayDistribution[day] || 0} lessons</span>
                    </div>
                    <Progress value={((insights.dayDistribution[day] || 0) / Math.max(...Object.values(insights.dayDistribution), 1)) * 100} className="h-2" />
                  </div>
                ))}
              </CardContent>
            </Card>
          </section>
        </div>

        {/* Sidebar Analytics */}
        <aside className="space-y-6">
          <Card className="rounded-3xl shadow-sm bg-gradient-to-br from-blue-50 to-blue-50/50 border-blue-100/50">
            <CardHeader>
              <CardTitle className="text-lg">Teaching Load</CardTitle>
              <CardDescription>Weekly overview</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { label: "Total Lessons", value: insights.totalLessons, icon: Calendar, highlight: true },
                { label: "Classes Taught", value: insights.distinctClasses, icon: Users },
                { label: "Avg per Day", value: insights.avgLessonsPerDay, icon: TrendingUp },
                { label: "Published", value: insights.publishedLessons, icon: CheckCircle2 },
              ].map(({ label, value, icon: Icon, highlight }) => (
                <div key={label} className={cn("flex items-center justify-between p-3 rounded-2xl", highlight ? "bg-white/70 border border-blue-200" : "")}>
                  <div className="flex items-center gap-2">
                    <Icon className="size-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">{label}</span>
                  </div>
                  <Badge variant={highlight ? "default" : "outline"} className="text-xs">{value}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="rounded-3xl shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="size-5 text-emerald-500" />
                Day Distribution
              </CardTitle>
              <CardDescription>Lessons across the week</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {DAYS.slice(0, 5).map((day) => (
                <div key={day}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium">{day}</span>
                    <span className="text-muted-foreground">{insights.dayDistribution[day] || 0}</span>
                  </div>
                  <Progress value={((insights.dayDistribution[day] || 0) / Math.max(...Object.values(insights.dayDistribution), 1)) * 100} className="h-1.5" />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="rounded-3xl shadow-sm">
            <CardHeader>
              <CardTitle>Classes Taught</CardTitle>
              <CardDescription>{insights.distinctClasses} classes total</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {classes.slice(0, 8).map((cls) => (
                <div key={cls} className="flex items-center justify-between rounded-2xl border p-2.5 hover:bg-muted/50 transition-colors cursor-pointer">
                  <span className="text-sm font-medium">{cls}</span>
                  <Badge variant="outline" className="text-xs">{insights.classDistribution[cls] || 0}</Badge>
                </div>
              ))}
              {classes.length > 8 && (
                <p className="text-xs text-muted-foreground text-center pt-2">+{classes.length - 8} more classes</p>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-3xl shadow-sm bg-gradient-to-br from-emerald-50 to-emerald-50/50 border-emerald-100/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-emerald-900">
                <TrendingDown className="size-5 text-emerald-600" />
                Break Time
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-emerald-700">{insights.freePeriods}</p>
              <p className="text-sm text-emerald-600/80 mt-1">Free periods per week</p>
            </CardContent>
          </Card>

          <Button className="w-full" onClick={() => router.push(teacherHref("/teacher/dashboard"))}>
            <Home className="mr-2 size-4" />
            Back to Dashboard
          </Button>
        </aside>
      </section>

      {/* Lesson Details Dialog */}
      <Dialog open={lessonDialogOpen} onOpenChange={setLessonDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedLesson?.subject}</DialogTitle>
            <DialogDescription>{selectedLesson?.className}</DialogDescription>
          </DialogHeader>
          {selectedLesson && (
            <div className="space-y-4">
              <div className="grid gap-2">
                <div>
                  <p className="text-sm text-muted-foreground">Date & Time</p>
                  <p className="font-medium">{selectedLesson.day}, {selectedLesson.startTime} - {selectedLesson.endTime}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Class</p>
                  <p className="font-medium">{selectedLesson.className}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Room</p>
                  <p className="font-medium">{selectedLesson.room || "TBA"}</p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setLessonDialogOpen(false)}>Close</Button>
                <Button onClick={() => {
                  router.push(teacherHref(`/teacher/attendance?classId=${encodeURIComponent(selectedLesson.classId)}`))
                  setLessonDialogOpen(false)
                }}>
                  Mark Attendance
                </Button>
                <Button variant="ghost" onClick={() => {
                  router.push(teacherHref(`/teacher/classes/${selectedLesson.classId}`))
                  setLessonDialogOpen(false)
                }}>
                  View Class
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Export Dialog */}
      <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Export Schedule</DialogTitle>
            <DialogDescription>Choose your preferred format</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Button className="w-full justify-start" variant="outline" onClick={() => {
              toCsv()
              setExportDialogOpen(false)
              toast.success("Schedule exported as CSV")
            }}>
              <Download className="mr-2 size-4" />
              Export as CSV
            </Button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExportDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
