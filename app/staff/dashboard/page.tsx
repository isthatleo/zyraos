"use client"

import { useState } from "react"
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

  return (
    <div className="p-6 lg:p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-foreground">Teaching Dashboard</h1>
          <p className="text-muted-foreground">Welcome back! Here&apos;s your teaching overview</p>
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
          { label: "My Classes", value: "0", icon: Users, change: "Active", color: "primary" },
          { label: "Total Students", value: "0", icon: GraduationCap, change: "Enrolled", color: "chart-1" },
          { label: "Pending Grades", value: "0", icon: ClipboardList, change: "To grade", color: "chart-2" },
          { label: "Attendance Today", value: "—", icon: CheckCircle2, change: "Present", color: "chart-3" },
        ].map(kpi => (
          <Card key={kpi.label} className="hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{kpi.label}</p>
                  <p className="text-3xl font-bold mt-1">{kpi.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{kpi.change}</p>
                </div>
                <div className={`h-12 w-12 rounded-2xl bg-${kpi.color}/10 flex items-center justify-center`}>
                  <kpi.icon className={`h-6 w-6 text-${kpi.color}`} />
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
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-muted-foreground">No classes scheduled for today</p>
              <p className="text-sm text-muted-foreground/60">Your timetable will appear here once configured</p>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {[
              { label: "Mark Attendance", icon: CheckCircle2, href: "/staff/attendance" },
              { label: "Enter Grades", icon: ClipboardList, href: "/staff/grades" },
              { label: "Create Assignment", icon: FileText, href: "/staff/assignments" },
              { label: "View Timetable", icon: Clock, href: "/staff/timetable" },
              { label: "Send Message", icon: MessageSquare, href: "/staff/messages" },
            ].map(action => (
              <Button key={action.label} variant="ghost" className="w-full justify-start h-11 gap-3" asChild>
                <a href={action.href}>
                  <action.icon className="h-4 w-4 text-primary" />
                  {action.label}
                </a>
              </Button>
            ))}
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
            <div className="text-center py-8">
              <ClipboardList className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-muted-foreground text-sm">No pending grades</p>
            </div>
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
