"use client"

import { ParentPageLayout } from "@/components/parent-page-layout"
import { StudentProgress } from "@/components/student-progress"

export default function ParentAttendancePage() {
  return (
    <ParentPageLayout title="Attendance" description="Monitor your children's daily attendance records and biometric logs.">
      <StudentProgress tenantSlug="demo-school" />
    </ParentPageLayout>
  )
}