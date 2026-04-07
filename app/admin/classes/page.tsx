"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ClassManagementFull } from "@/components/academics/class-management-full"
import { SubjectManagement } from "@/components/academics/subject-management"
import { TimetableView } from "@/components/academics/timetable-view"
import { ExamManagement } from "@/components/academics/exam-management"
import { AttendanceTracker } from "@/components/academics/attendance-tracker"
import { GradingSystem } from "@/components/academics/grading-system"

export default function ClassesPage() {
  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Academics</h1>
        <p className="text-muted-foreground">Manage classes, subjects, timetables, exams, attendance, and grading</p>
      </div>

      <Tabs defaultValue="classes">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="classes">Classes</TabsTrigger>
          <TabsTrigger value="subjects">Subjects</TabsTrigger>
          <TabsTrigger value="timetable">Timetable</TabsTrigger>
          <TabsTrigger value="exams">Exams</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="grading">Grading</TabsTrigger>
        </TabsList>

        <TabsContent value="classes"><ClassManagementFull /></TabsContent>
        <TabsContent value="subjects"><SubjectManagement /></TabsContent>
        <TabsContent value="timetable"><TimetableView /></TabsContent>
        <TabsContent value="exams"><ExamManagement /></TabsContent>
        <TabsContent value="attendance"><AttendanceTracker /></TabsContent>
        <TabsContent value="grading"><GradingSystem /></TabsContent>
      </Tabs>
    </div>
  )
}
