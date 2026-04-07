"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { useRouter } from "next/navigation"

const attendanceData = {
  childName: "John Doe",
  thisMonth: {
    present: 18,
    absent: 1,
    late: 1,
    percentage: 90,
  },
  byMonth: [
    { month: "January", percentage: 92 },
    { month: "February", percentage: 90 },
  ],
}

export default function AttendancePage() {
  const router = useRouter()

  return (
    <div className="flex h-screen bg-background">
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="h-16 border-b border-border bg-background px-6 flex items-center">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>

        <main className="flex-1 overflow-y-auto">
          <div className="p-6 lg:p-8 space-y-8">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold text-foreground">Attendance Records</h1>
              <p className="text-muted-foreground">Track {attendanceData.childName}'s attendance</p>
            </div>

            {/* This Month Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Present</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-green-600">{attendanceData.thisMonth.present}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Absent</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-red-600">{attendanceData.thisMonth.absent}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Late</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-orange-600">{attendanceData.thisMonth.late}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Attendance Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{attendanceData.thisMonth.percentage}%</p>
                </CardContent>
              </Card>
            </div>

            {/* Monthly Trend */}
            <Card>
              <CardHeader>
                <CardTitle>Attendance Trend</CardTitle>
                <CardDescription>Monthly attendance percentage</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {attendanceData.byMonth.map((month) => (
                  <div key={month.month} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">{month.month}</p>
                      <p className="text-sm font-medium">{month.percentage}%</p>
                    </div>
                    <Progress value={month.percentage} />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
}
