"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

const performanceData = [
  { month: "Jan", score: 82 },
  { month: "Feb", score: 85 },
  { month: "Mar", score: 87 },
  { month: "Apr", score: 89 },
  { month: "May", score: 87 },
  { month: "Jun", score: 90 },
]

const recentResults = [
  { subject: "Mathematics", exam: "Algebra Test", type: "Assignment", score: 78, date: "2024-01-15" },
  { subject: "English", exam: "Essay Writing", type: "Midterm", score: 92, date: "2024-01-12" },
  { subject: "Science", exam: "Lab Report", type: "Assignment", score: 85, date: "2024-01-10" },
  { subject: "History", exam: "World War II Quiz", type: "Midterm", score: 88, date: "2024-01-08" },
]

const attendanceData = [
  { subject: "Present", count: 22, percentage: 95 },
  { subject: "Absent", count: 1, percentage: 5 },
]

export function ChildPerformance() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Performance Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Academic Performance Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={performanceData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis domain={[70, 100]} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="score"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{ fill: "hsl(var(--primary))" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Recent Results */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Results</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentResults.map((result, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <h4 className="font-medium">{result.subject}</h4>
                  <p className="text-sm text-muted-foreground">{result.exam}</p>
                  <p className="text-xs text-muted-foreground">{result.date}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={result.type === "Assignment" ? "secondary" : "outline"}>
                    {result.type}
                  </Badge>
                  <span className="font-medium">{result.score}%</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Attendance Overview */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Attendance Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="font-medium">This Month</h4>
              <div className="space-y-2">
                {attendanceData.map((item, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-sm">{item.subject}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{item.count} days</span>
                      <span className="text-sm text-muted-foreground">({item.percentage}%)</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-center">
              <div className="relative w-32 h-32">
                <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="hsl(var(--muted))"
                    strokeWidth="2"
                  />
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="hsl(var(--primary))"
                    strokeWidth="2"
                    strokeDasharray={`${95}, 100`}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl font-bold">95%</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
