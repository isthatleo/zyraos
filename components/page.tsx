"use client"

import { StudentPageLayout } from "@/components/student-page-layout"
import { StudentKPICards } from "@/components/student-kpi-cards"
import { RecentGrades } from "@/components/recent-grades"

export default function StudentDashboardPage() {
  return (
    <StudentPageLayout 
      title="Academic Journey" 
      description="Welcome back! Track your progress and upcoming assignments."
    >
      <StudentKPICards />
      
      <RecentGrades />
    </StudentPageLayout>
  )
}