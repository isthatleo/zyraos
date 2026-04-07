"use client"

import { TimetableView } from "@/components/academics/timetable-view"

export default function StudentTimetablePage() {
  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">My Timetable</h1>
        <p className="text-muted-foreground">Your weekly class schedule</p>
      </div>
      <TimetableView />
    </div>
  )
}
