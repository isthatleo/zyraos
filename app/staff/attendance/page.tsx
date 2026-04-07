"use client"

import { AttendanceTracker } from "@/components/academics/attendance-tracker"

export default function StaffAttendancePage() {
  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Mark Attendance</h1>
        <p className="text-muted-foreground">Record attendance for your classes</p>
      </div>
      <AttendanceTracker />
    </div>
  )
}
