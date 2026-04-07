"use client"

import { SubjectManagement } from "@/components/academics/subject-management"

export default function SubjectsPage() {
  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Subjects</h1>
        <p className="text-muted-foreground">Manage curriculum subjects and assignments</p>
      </div>
      <SubjectManagement />
    </div>
  )
}
