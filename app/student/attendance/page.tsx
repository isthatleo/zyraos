"use client"

import { CheckCircle2, Calendar, Clock, XCircle, AlertTriangle } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"

export default function StudentAttendancePage() {
  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">My Attendance</h1>
          <p className="text-muted-foreground">Track your attendance record</p>
        </div>
        <Select defaultValue="current">
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="current">Current Term</SelectItem>
            <SelectItem value="term-1">Term 1</SelectItem>
            <SelectItem value="term-2">Term 2</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Present", value: "0", icon: CheckCircle2, color: "text-green-600 bg-green-500/10" },
          { label: "Absent", value: "0", icon: XCircle, color: "text-destructive bg-destructive/10" },
          { label: "Late", value: "0", icon: Clock, color: "text-yellow-600 bg-yellow-500/10" },
          { label: "Rate", value: "—", icon: Calendar, color: "text-primary bg-primary/10" },
        ].map(k => (
          <Card key={k.label}>
            <CardContent className="pt-6 text-center">
              <div className={cn("h-10 w-10 rounded-xl mx-auto flex items-center justify-center mb-2", k.color.split(" ")[1])}>
                <k.icon className={cn("h-5 w-5", k.color.split(" ")[0])} />
              </div>
              <p className="text-2xl font-bold">{k.value}</p>
              <p className="text-sm text-muted-foreground">{k.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Attendance History</CardTitle>
          <CardDescription>Your daily attendance records</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <Calendar className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground mb-2">No attendance records</h3>
            <p className="text-sm text-muted-foreground">Your attendance will be recorded here</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
