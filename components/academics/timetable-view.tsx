"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { Clock, Plus, Calendar, ChevronLeft, ChevronRight } from "lucide-react"

const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
const timeSlots = [
  "07:30", "08:15", "09:00", "09:45", "10:30", "11:15", "12:00", "13:00", "13:45", "14:30", "15:15"
]

const colorPalette = [
  "bg-primary/10 text-primary border-primary/20",
  "bg-chart-1/10 text-chart-1 border-chart-1/20",
  "bg-chart-2/10 text-chart-2 border-chart-2/20",
  "bg-chart-3/10 text-chart-3 border-chart-3/20",
  "bg-chart-4/10 text-chart-4 border-chart-4/20",
  "bg-chart-5/10 text-chart-5 border-chart-5/20",
  "bg-destructive/10 text-destructive border-destructive/20",
]

interface TimetableEntry {
  id: string
  day: string
  startTime: string
  endTime: string
  subject: string
  teacher: string
  room: string
  colorIndex: number
}

export function TimetableView() {
  const [selectedClass, setSelectedClass] = useState("")
  const [entries, setEntries] = useState<TimetableEntry[]>([])
  const [viewMode, setViewMode] = useState<"week" | "day">("week")
  const [selectedDay, setSelectedDay] = useState(0)

  const getEntryForSlot = (day: string, time: string) => {
    return entries.find(e => e.day === day && e.startTime === time)
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Select value={selectedClass} onValueChange={setSelectedClass}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select class" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Classes</SelectItem>
              <SelectItem value="grade-1a">Grade 1A</SelectItem>
              <SelectItem value="grade-2a">Grade 2A</SelectItem>
              <SelectItem value="grade-3a">Grade 3A</SelectItem>
              <SelectItem value="jss-1a">JSS 1A</SelectItem>
              <SelectItem value="ss-1a">SS 1A</SelectItem>
              <SelectItem value="100-level">100 Level</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center rounded-lg border border-border overflow-hidden">
            <Button
              variant={viewMode === "week" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("week")}
              className="rounded-none"
            >
              Week
            </Button>
            <Button
              variant={viewMode === "day" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("day")}
              className="rounded-none"
            >
              Day
            </Button>
          </div>
        </div>
        <Button><Plus className="h-4 w-4 mr-2" />Add Period</Button>
      </div>

      {/* Day Navigation (Day View) */}
      {viewMode === "day" && (
        <div className="flex items-center justify-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setSelectedDay(Math.max(0, selectedDay - 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h3 className="text-lg font-semibold min-w-[120px] text-center">{days[selectedDay]}</h3>
          <Button variant="ghost" size="icon" onClick={() => setSelectedDay(Math.min(4, selectedDay + 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Timetable Grid */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="w-20 p-3 text-left text-xs font-medium text-muted-foreground border-b border-r border-border bg-muted/30">
                    <Clock className="h-4 w-4" />
                  </th>
                  {(viewMode === "week" ? days : [days[selectedDay]]).map(day => (
                    <th key={day} className="p-3 text-center text-sm font-semibold border-b border-border bg-muted/30 min-w-[140px]">
                      {day}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {timeSlots.map((time, idx) => (
                  <tr key={time} className={cn(time === "12:00" && "bg-muted/20")}>
                    <td className="p-2 text-xs font-mono text-muted-foreground border-r border-b border-border text-center whitespace-nowrap">
                      {time}
                    </td>
                    {(viewMode === "week" ? days : [days[selectedDay]]).map(day => {
                      const entry = getEntryForSlot(day, time)
                      if (time === "12:00") {
                        return (
                          <td key={day} className="p-2 border-b border-border text-center">
                            <span className="text-xs text-muted-foreground italic">Break</span>
                          </td>
                        )
                      }
                      return (
                        <td key={day} className="p-1.5 border-b border-border align-top h-16">
                          {entry ? (
                            <div className={cn(
                              "rounded-lg border p-2 h-full cursor-pointer hover:shadow-sm transition-shadow",
                              colorPalette[entry.colorIndex % colorPalette.length]
                            )}>
                              <p className="text-xs font-semibold truncate">{entry.subject}</p>
                              <p className="text-[10px] opacity-70 truncate">{entry.teacher}</p>
                              <p className="text-[10px] opacity-60">{entry.room}</p>
                            </div>
                          ) : (
                            <div className="h-full rounded-lg border border-dashed border-border/50 hover:border-primary/30 hover:bg-primary/5 transition-colors cursor-pointer flex items-center justify-center group">
                              <Plus className="h-3 w-3 text-muted-foreground/30 group-hover:text-primary/50 transition-colors" />
                            </div>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-3">
            {["Mathematics", "English", "Science", "History", "Arts", "PE", "Technology"].map((subj, i) => (
              <div key={subj} className={cn("flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border", colorPalette[i % colorPalette.length])}>
                <div className="h-2 w-2 rounded-full bg-current" />
                {subj}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
