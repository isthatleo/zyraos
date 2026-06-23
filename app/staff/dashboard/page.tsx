"use client"

import { useCallback, useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  LayoutDashboard, Users, BookOpen, ClipboardList, BarChart3,
  Calendar, Clock, CheckCircle2, AlertCircle, TrendingUp,
  FileText, GraduationCap, Bell, MessageSquare, Award
} from "lucide-react"
import { cn } from "@/lib/utils"

export default function TeacherDashboardPage() {
  const [selectedPeriod, setSelectedPeriod] = useState("today")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<any | null>(null)

  const fetchDashboard = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/teacher/dashboard', { cache: 'no-store' })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || res.statusText)
      const json = await res.json()
      setData(json)
    } catch (err: any) {
      setError(err?.message || String(err))
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchDashboard() }, [fetchDashboard])

  const postAction = useCallback(async (action: string, payload: Record<string, unknown> = {}) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/teacher/dashboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...payload }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || res.statusText)
      // backend returns refreshed dashboard - use it if present
      if (json && typeof json === 'object' && json.currentUser) setData(json)
      else await fetchDashboard()
    } catch (err: any) {
      setError(err?.message || String(err))
    } finally {
      setLoading(false)
    }
  }, [fetchDashboard])

  return (
    <div className="p-6 lg:p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-foreground">Teaching Dashboard</h1>
          <p className="text-muted-foreground">Welcome back! Here&apos;s your teaching overview</p>
          {data?.currentUser && (
            <p className="text-sm text-muted-foreground">Signed in as <strong className="capitalize">{data.currentUser.role || 'teacher'}</strong> — {data.currentUser.name}</p>
          )}
        </div>
        <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
          <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="week">This Week</SelectItem>
            <SelectItem value="month">This Month</SelectItem>
            <SelectItem value="term">This Term</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "My Classes", key: 'classes', icon: Users, color: "primary", value: data?.metrics?.classes ?? '—' },
          { label: "Total Students", key: 'students', icon: GraduationCap, color: "chart-1", value: data?.metrics?.students ?? '—' },
          { label: "Pending Grades", key: 'pending', icon: ClipboardList, color: "chart-2", value: data?.metrics?.pendingGrading ?? '—' },
          { label: "Attendance Rate", key: 'attendance', icon: CheckCircle2, color: "chart-3", value: data?.metrics?.attendanceRate ? `${data.metrics.attendanceRate}%` : '—' },
        ].map(kpi => (
          <Card key={kpi.key} className="hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{kpi.label}</p>
                  <p className="text-3xl font-bold mt-1">{kpi.value}</p>
                </div>
                <div className={`h-12 w-12 rounded-2xl bg-[color:var(--muted)]/10 flex items-center justify-center`}>
                  <kpi.icon className={`h-6 w-6 text-primary`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Schedule */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Today&apos;s Schedule
            </CardTitle>
            <CardDescription>Your classes and periods for today</CardDescription>
          </CardHeader>
          <CardContent>
            {loading && !data ? (
              <div className="text-center py-8">Loading timetable…</div>
            ) : error ? (
              <div className="text-center py-8 text-destructive">{error}</div>
            ) : (data?.todaysLessons && data.todaysLessons.length ? (
              <div className="space-y-3">
                {data.todaysLessons.map((lesson: any) => (
                  <div key={lesson.id} className="flex items-center justify-between p-3 border rounded">
                    <div>
                      <div className="font-medium">{lesson.subject} <span className="text-sm text-muted-foreground">· {lesson.subjectCode}</span></div>
                      <div className="text-sm text-muted-foreground">{lesson.className}</div>
                    </div>
                    <div className="text-sm text-muted-foreground">{lesson.startTime || '—'} — {lesson.endTime || '—'}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
                <p className="text-muted-foreground">No classes scheduled for today</p>
                <p className="text-sm text-muted-foreground/60">Your timetable will appear here once configured</p>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="space-y-2">
              <Button variant="ghost" className="w-full justify-between h-11 gap-3" onClick={() => window.location.href = '/staff/attendance'}>
                <div className="flex items-center gap-3"><CheckCircle2 className="h-4 w-4 text-primary" />Mark Attendance</div>
                <Badge variant="outline">Go</Badge>
              </Button>
              <Button variant="ghost" className="w-full justify-between h-11 gap-3" onClick={() => window.location.href = '/staff/grades'}>
                <div className="flex items-center gap-3"><ClipboardList className="h-4 w-4 text-primary" />Enter Grades</div>
                <Badge variant="outline">Go</Badge>
              </Button>
              <Button variant="ghost" className="w-full justify-between h-11 gap-3" onClick={() => {
                // create a simple assignment quickly using the dashboard API as an example
                const name = prompt('Quick assignment title')
                const cls = prompt('Class name (optional)')
                if (name) postAction('assessment.create', { name, className: cls })
              }}>
                <div className="flex items-center gap-3"><FileText className="h-4 w-4 text-primary" />Create Assignment</div>
                <Badge variant="outline">Quick</Badge>
              </Button>
              <Button variant="ghost" className="w-full justify-between h-11 gap-3" onClick={() => window.location.href = '/staff/timetable'}>
                <div className="flex items-center gap-3"><Clock className="h-4 w-4 text-primary" />View Timetable</div>
                <Badge variant="outline">Go</Badge>
              </Button>
              <Button variant="ghost" className="w-full justify-between h-11 gap-3" onClick={() => window.location.href = '/staff/messages'}>
                <div className="flex items-center gap-3"><MessageSquare className="h-4 w-4 text-primary" />Send Message</div>
                <Badge variant="outline">Go</Badge>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Grading Queue */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              Grading Queue
            </CardTitle>
            <CardDescription>Assignments and exams pending grades</CardDescription>
          </CardHeader>
          <CardContent>
            {loading && !data ? (
              <div className="text-center py-8">Loading…</div>
            ) : error ? (
              <div className="text-center py-8 text-destructive">{error}</div>
            ) : (data?.assessments && data.assessments.length ? (
              <div className="space-y-2">
                {data.assessments.slice(0, 6).map((a: any) => (
                  <div key={a.id} className="flex items-center justify-between p-2 border rounded">
                    <div>
                      <div className="font-medium">{a.name}</div>
                      <div className="text-sm text-muted-foreground">{a.className} • {a.subject}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" onClick={() => postAction('assessment.markComplete', { assessmentId: a.id })}>Mark Complete</Button>
                      <Button size="sm" variant="destructive" onClick={() => { if (confirm('Delete assessment?')) postAction('assessment.delete', { assessmentId: a.id }) }}>Delete</Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <ClipboardList className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
                <p className="text-muted-foreground text-sm">No pending grades</p>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <Bell className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-muted-foreground text-sm">No recent activity</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
