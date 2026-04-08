"use client"

import { ParentPageLayout } from "@/components/parent-page-layout"
import { StudentProgress } from "@/components/student-progress"

export default function ParentChildrenProgressPage() {
  // In a real app, we would pass the child's context here
  return (
    <ParentPageLayout title="Children Progress" description="Track academic performance and teacher observations.">
      <StudentProgress tenantSlug="demo-school" />
    </ParentPageLayout>
  )
}