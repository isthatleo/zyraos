"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calendar, CheckCircle2, XCircle, Clock, Users, AlertTriangle, Search, Download, BarChart3 } from "lucide-react"
import { cn } from "@/lib/utils"

interface AttendanceRecord {
  id: string
  studentName: string
  studentId: string
  class: string
  date: string
  status: "present" | "absent" | "late" | "excused"
  timeIn?: string
  notes?: string
}

export function AttendanceTracker() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0])
  const [selectedClass, setSelectedClass] = useState("")
  const [search, setSearch] = useState("")
  const [markingMode, setMarkingMode] = useState<"manual" | "qr" | "bulk">("manual")
  const [records, setRecords] = useState<AttendanceRecord[]>([])

  const present = records.filter(r => r.status === "present").length
  const absent = records.filter(r => r.status === "absent").length
  const late = records.filter(r => r.status === "late").length
  const total = records.length
  const rate = total > 0 ? Math.round((present / total) * 100) : 0

  const statusConfig = {
    present: { icon: CheckCircle2, className: "bg-green-500/10 text-green-600 border-green-500/20" },
    absent: { icon: XCircle, className: "bg-destructive/10 text-destructive border-destructive/20" },
    late: { icon: Clock, className: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20" },
    excused: { icon: AlertTriangle, className: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  }

  return (
    <div className="space-y-6">
      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-sm text-muted-foreground mb-1">Total Students</p>
            <p className="text-3xl font-bold">{total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-sm text-muted-foreground mb-1">Present</p>
            <p className="text-3xl font-bold text-green-600">{present}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-sm text-muted-foreground mb-1">Absent</p>
            <p className="text-3xl font-bold text-destructive">{absent}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-sm text-muted-foreground mb-1">Late</p>
            <p className="text-3xl font-bold text-yellow-600">{late}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground mb-1 text-center">Attendance Rate</p>
            <p className="text-3xl font-bold text-center mb-2">{rate}%</p>
            <Progress value={rate} className="h-2" />
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <Input
          type="date"
          className="w-[180px]"
          value={selectedDate}
          onChange={e => setSelectedDate(e.target.value)}
        />
        <Select value={selectedClass} onValueChange={setSelectedClass}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select class" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Classes</SelectItem>
            <SelectItem value="grade-1a">Grade 1A</SelectItem>
            <SelectItem value="grade-2a">Grade 2A</SelectItem>
            <SelectItem value="jss-1a">JSS 1A</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center rounded-lg border border-border overflow-hidden">
          {(["manual", "qr", "bulk"] as const).map(mode => (
            <Button
              key={mode}
              variant={markingMode === mode ? "default" : "ghost"}
              size="sm"
              onClick={() => setMarkingMode(mode)}
              className="rounded-none capitalize"
            >
              {mode === "qr" ? "QR Scan" : mode}
            </Button>
          ))}
        </div>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-2" />Export</Button>
          <Button variant="outline" size="sm"><BarChart3 className="h-4 w-4 mr-2" />Reports</Button>
        </div>
      </div>

      {/* Marking Area */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Attendance for {new Date(selectedDate).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </CardTitle>
          <CardDescription>
            {markingMode === "manual" && "Click status buttons to mark attendance for each student"}
            {markingMode === "qr" && "Scan student QR codes to auto-mark attendance"}
            {markingMode === "bulk" && "Mark all students at once, then adjust individual records"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {records.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground mb-2">No attendance records</h3>
              <p className="text-sm text-muted-foreground mb-4">Select a class and date to begin marking attendance</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>ID</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Time In</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map(record => {
                  const config = statusConfig[record.status]
                  const StatusIcon = config.icon
                  return (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium">{record.studentName}</TableCell>
                      <TableCell className="font-mono text-xs">{record.studentId}</TableCell>
                      <TableCell>{record.class}</TableCell>
                      <TableCell>{record.timeIn || "—"}</TableCell>
                      <TableCell>
                        <Badge className={cn("gap-1 border", config.className)}>
                          <StatusIcon className="h-3 w-3" />
                          {record.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{record.notes || "—"}</TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Late Policy Info */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium">Attendance Policy</p>
              <p className="text-sm text-muted-foreground">
                3 late arrivals = 1 absence. Late threshold: 15 minutes after class start.
                Parents are automatically notified when a student is marked absent.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
