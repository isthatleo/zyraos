"use client"

import { ExamManagement } from "@/components/academics/exam-management"

export default function ExamsPage() {
  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Exams & Results</h1>
        <p className="text-muted-foreground">Create, schedule, and manage examinations</p>
      </div>
      <ExamManagement />
    </div>
  )
}
