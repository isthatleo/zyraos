"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  BookOpen, GraduationCap, Calendar, Clock, CheckCircle2, Star,
  FileText, BarChart3, Bell, TrendingUp, Award, ClipboardList,
  Timer, Play, Send
} from "lucide-react"
import { cn } from "@/lib/utils"

export default function StudentDashboardPage() {
  const [level] = useState<"primary" | "secondary" | "college" | "university" | "vocational">("university")

  return (
    <div className="p-6 lg:p-8 space-y-8">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-3xl font-bold text-foreground">
          {level === "primary" && "My Learning Space"}
          {level === "secondary" && "Academic Dashboard"}
          {level === "college" && "College Portal"}
          {level === "university" && "Student Portal"}
          {level === "vocational" && "Training Dashboard"}
        </h1>
        <p className="text-muted-foreground">
          {level === "primary" && "Welcome back! Let's learn something new today 🌟"}
          {level === "secondary" && "Track your academic progress and performance"}
          {level === "college" && "Manage your courses, grades, and campus life"}
          {level === "university" && "Your academic journey at a glance"}
          {level === "vocational" && "Track your skills, certifications, and progress"}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {level === "primary" && (
          <>
            {[
              { label: "My Subjects", value: "0", icon: BookOpen, color: "primary", sub: "This term" },
              { label: "Homework Done", value: "0", icon: CheckCircle2, color: "chart-1", sub: "Completed" },
              { label: "Stars Earned", value: "0", icon: Star, color: "chart-2", sub: "Keep it up!" },
              { label: "Attendance", value: "—", icon: Calendar, color: "chart-3", sub: "This month" },
            ].map(k => (
              <Card key={k.label} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{k.label}</p>
                      <p className="text-3xl font-bold mt-1">{k.value}</p>
                      <p className="text-xs text-muted-foreground mt-1">{k.sub}</p>
                    </div>
                    <div className={cn("h-12 w-12 rounded-2xl flex items-center justify-center", `bg-${k.color}/10`)}>
                      <k.icon className={cn("h-6 w-6", `text-${k.color}`)} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </>
        )}
        {level === "secondary" && (
          <>
            {[
              { label: "Subjects", value: "0", icon: BookOpen, color: "primary", sub: "Enrolled" },
              { label: "GPA", value: "—", icon: TrendingUp, color: "chart-1", sub: "Current term" },
              { label: "Assignments Due", value: "0", icon: FileText, color: "chart-2", sub: "Pending" },
              { label: "Attendance", value: "—", icon: Calendar, color: "chart-3", sub: "Overall" },
            ].map(k => (
              <Card key={k.label} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{k.label}</p>
                      <p className="text-3xl font-bold mt-1">{k.value}</p>
                      <p className="text-xs text-muted-foreground mt-1">{k.sub}</p>
                    </div>
                    <div className={cn("h-12 w-12 rounded-2xl flex items-center justify-center", `bg-${k.color}/10`)}>
                      <k.icon className={cn("h-6 w-6", `text-${k.color}`)} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </>
        )}
        {(level === "college" || level === "university") && (
          <>
            {[
              { label: "Courses", value: "0", icon: BookOpen, color: "primary", sub: "This semester" },
              { label: "CGPA", value: "—", icon: Award, color: "chart-1", sub: "Cumulative" },
              { label: "Credit Hours", value: "0", icon: Clock, color: "chart-2", sub: "Registered" },
              { label: "Upcoming Exams", value: "0", icon: ClipboardList, color: "chart-3", sub: "This month" },
            ].map(k => (
              <Card key={k.label} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{k.label}</p>
                      <p className="text-3xl font-bold mt-1">{k.value}</p>
                      <p className="text-xs text-muted-foreground mt-1">{k.sub}</p>
                    </div>
                    <div className={cn("h-12 w-12 rounded-2xl flex items-center justify-center", `bg-${k.color}/10`)}>
                      <k.icon className={cn("h-6 w-6", `text-${k.color}`)} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </>
        )}
        {level === "vocational" && (
          <>
            {[
              { label: "Modules", value: "0", icon: BookOpen, color: "primary", sub: "In progress" },
              { label: "Certifications", value: "0", icon: Award, color: "chart-1", sub: "Earned" },
              { label: "Lab Hours", value: "0", icon: Timer, color: "chart-2", sub: "This week" },
              { label: "Skill Progress", value: "—", icon: TrendingUp, color: "chart-3", sub: "Overall" },
            ].map(k => (
              <Card key={k.label} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{k.label}</p>
                      <p className="text-3xl font-bold mt-1">{k.value}</p>
                      <p className="text-xs text-muted-foreground mt-1">{k.sub}</p>
                    </div>
                    <div className={cn("h-12 w-12 rounded-2xl flex items-center justify-center", `bg-${k.color}/10`)}>
                      <k.icon className={cn("h-6 w-6", `text-${k.color}`)} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Classes / Schedule */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              {level === "university" ? "Today's Lectures" : "Today's Classes"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-muted-foreground">No classes scheduled for today</p>
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
              { label: "View Timetable", icon: Clock, href: "/student/timetable" },
              { label: "My Grades", icon: BarChart3, href: "/student/grades" },
              { label: level === "university" ? "Take Exam" : "View Exams", icon: ClipboardList, href: "/student/exams" },
              { label: "Assignments", icon: FileText, href: "/student/assignments" },
              { label: "Notifications", icon: Bell, href: "/student/notifications" },
            ].map(a => (
              <Button key={a.label} variant="ghost" className="w-full justify-start h-11 gap-3" asChild>
                <a href={a.href}>
                  <a.icon className="h-4 w-4 text-primary" />
                  {a.label}
                </a>
              </Button>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* University Exam Section */}
      {(level === "university" || level === "college") && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              Online Examinations
            </CardTitle>
            <CardDescription>Available exams and upcoming tests</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <ClipboardList className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-muted-foreground">No active examinations</p>
              <p className="text-sm text-muted-foreground/60 mt-1">Exams will appear here when scheduled by your lecturers</p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Grades */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Recent Grades
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <BarChart3 className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-muted-foreground text-sm">No grades available yet</p>
            </div>
          </CardContent>
        </Card>

        {/* Attendance Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" />
              Attendance Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <CheckCircle2 className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-muted-foreground text-sm">No attendance records</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
