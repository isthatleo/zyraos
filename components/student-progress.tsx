"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import {
  TrendingUp,
  TrendingDown,
  Users,
  BookOpen,
  Calendar,
  Award,
  AlertTriangle,
  CheckCircle,
  BarChart3,
  LineChart,
  PieChart
} from "lucide-react"
import { toast } from "sonner"

interface StudentProgressProps {
  tenantSlug: string
}

interface Student {
  id: string
  name: string
  studentNumber: string
  classId: string
  className: string
}

interface GradeEntry {
  id: string
  subjectId: string
  subjectName: string
  assessmentType: string
  assessmentName: string
  score: number | null
  maxScore: number | null
  percentage: number | null
  grade: string | null
  assessmentDate: string
  teacherName: string
}

interface ProgressNote {
  id: string
  category: 'academic' | 'behavioral' | 'attendance'
  note: string
  isPositive: boolean
  createdAt: string
  createdBy: string
}

interface StudentProgressData {
  student: Student
  grades: GradeEntry[]
  progressNotes: ProgressNote[]
  attendance: {
    totalDays: number
    presentDays: number
    percentage: number
  }
  overallStats: {
    averageGrade: number
    gpa: number
    rank: number
    totalStudents: number
  }
}

export function StudentProgress({ tenantSlug }: StudentProgressProps) {
  const [students, setStudents] = useState<Student[]>([])
  const [selectedStudentId, setSelectedStudentId] = useState("")
  const [selectedClass, setSelectedClass] = useState("")
  const [selectedTerm, setSelectedTerm] = useState("")
  const [selectedYear, setSelectedYear] = useState("")
  const [progressData, setProgressData] = useState<StudentProgressData | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchStudents()
  }, [selectedClass])

  useEffect(() => {
    if (selectedStudentId) {
      fetchStudentProgress()
    }
  }, [selectedStudentId, selectedTerm, selectedYear])

  const fetchStudents = async () => {
    try {
      const params = new URLSearchParams()
      if (selectedClass) params.append("classId", selectedClass)

      const response = await fetch(`/api/${tenantSlug}/students?${params}`)
      const data = await response.json()
      setStudents(data.students || [])
    } catch (error) {
      console.error("Error fetching students:", error)
      toast.error("Failed to fetch students")
    }
  }

  const fetchStudentProgress = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (selectedTerm) params.append("termId", selectedTerm)
      if (selectedYear) params.append("academicYearId", selectedYear)

      const response = await fetch(`/api/${tenantSlug}/students/${selectedStudentId}/progress?${params}`)
      const data = await response.json()
      setProgressData(data)
    } catch (error) {
      console.error("Error fetching student progress:", error)
      toast.error("Failed to fetch student progress")
    } finally {
      setLoading(false)
    }
  }

  const getGradeColor = (grade: string | null) => {
    if (!grade) return "secondary"
    const upperGrade = grade.toUpperCase()
    if (upperGrade === 'A' || upperGrade === 'A+') return "default"
    if (upperGrade === 'B' || upperGrade === 'B+') return "secondary"
    if (upperGrade === 'C' || upperGrade === 'C+') return "outline"
    if (upperGrade === 'D' || upperGrade === 'D+') return "destructive"
    if (upperGrade === 'F') return "destructive"
    return "secondary"
  }

  const getProgressIcon = (isPositive: boolean) => {
    return isPositive ? (
      <CheckCircle className="h-4 w-4 text-green-500" />
    ) : (
      <AlertTriangle className="h-4 w-4 text-yellow-500" />
    )
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Student Progress Tracking</CardTitle>
          <CardDescription>
            Monitor individual student performance, grades, and progress over time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label>Class/Grade</Label>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger>
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="form1">Form 1</SelectItem>
                  <SelectItem value="form2">Form 2</SelectItem>
                  <SelectItem value="form3">Form 3</SelectItem>
                  <SelectItem value="form4">Form 4</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Student</Label>
              <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select student" />
                </SelectTrigger>
                <SelectContent>
                  {students.map((student) => (
                    <SelectItem key={student.id} value={student.id}>
                      {student.name} ({student.studentNumber})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Term</Label>
              <Select value={selectedTerm} onValueChange={setSelectedTerm}>
                <SelectTrigger>
                  <SelectValue placeholder="Select term" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="term1">Term 1</SelectItem>
                  <SelectItem value="term2">Term 2</SelectItem>
                  <SelectItem value="term3">Term 3</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Academic Year</Label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger>
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2024">2024</SelectItem>
                  <SelectItem value="2025">2025</SelectItem>
                  <SelectItem value="2026">2026</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="text-center py-8">Loading student progress...</div>
      ) : progressData ? (
        <div className="space-y-6">
          {/* Student Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{progressData.student.name}</span>
                <Badge variant="outline">
                  {progressData.student.className}
                </Badge>
              </CardTitle>
              <CardDescription>
                Student Number: {progressData.student.studentNumber}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {progressData.overallStats.averageGrade.toFixed(1)}%
                  </div>
                  <div className="text-sm text-muted-foreground">Average Grade</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {progressData.overallStats.gpa.toFixed(2)}
                  </div>
                  <div className="text-sm text-muted-foreground">GPA</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    #{progressData.overallStats.rank}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    of {progressData.overallStats.totalStudents} students
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {progressData.attendance.percentage.toFixed(1)}%
                  </div>
                  <div className="text-sm text-muted-foreground">Attendance</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Detailed Progress */}
          <Tabs defaultValue="grades" className="space-y-4">
            <TabsList>
              <TabsTrigger value="grades">Grades</TabsTrigger>
              <TabsTrigger value="progress">Progress Notes</TabsTrigger>
              <TabsTrigger value="attendance">Attendance</TabsTrigger>
            </TabsList>

            <TabsContent value="grades">
              <Card>
                <CardHeader>
                  <CardTitle>Subject Grades</CardTitle>
                  <CardDescription>
                    Detailed breakdown of grades by subject and assessment
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Subject</TableHead>
                        <TableHead>Assessment</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Score</TableHead>
                        <TableHead>Grade</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Teacher</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {progressData.grades.map((grade) => (
                        <TableRow key={grade.id}>
                          <TableCell className="font-medium">
                            {grade.subjectName}
                          </TableCell>
                          <TableCell>{grade.assessmentName}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">
                              {grade.assessmentType}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {grade.score !== null && grade.maxScore !== null
                              ? `${grade.score}/${grade.maxScore}`
                              : 'N/A'
                            }
                          </TableCell>
                          <TableCell>
                            <Badge variant={getGradeColor(grade.grade)}>
                              {grade.grade || 'N/A'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {new Date(grade.assessmentDate).toLocaleDateString()}
                          </TableCell>
                          <TableCell>{grade.teacherName}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="progress">
              <Card>
                <CardHeader>
                  <CardTitle>Progress Notes</CardTitle>
                  <CardDescription>
                    Teacher observations and progress tracking notes
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {progressData.progressNotes.map((note) => (
                      <div key={note.id} className="flex items-start space-x-3 p-4 border rounded-lg">
                        {getProgressIcon(note.isPositive)}
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <Badge variant="outline" className="capitalize">
                              {note.category}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {new Date(note.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-sm">{note.note}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            By: {note.createdBy}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="attendance">
              <Card>
                <CardHeader>
                  <CardTitle>Attendance Overview</CardTitle>
                  <CardDescription>
                    Attendance record and statistics
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="text-center p-4 border rounded-lg">
                        <div className="text-2xl font-bold">
                          {progressData.attendance.presentDays}
                        </div>
                        <div className="text-sm text-muted-foreground">Days Present</div>
                      </div>
                      <div className="text-center p-4 border rounded-lg">
                        <div className="text-2xl font-bold">
                          {progressData.attendance.totalDays - progressData.attendance.presentDays}
                        </div>
                        <div className="text-sm text-muted-foreground">Days Absent</div>
                      </div>
                      <div className="text-center p-4 border rounded-lg">
                        <div className="text-2xl font-bold">
                          {progressData.attendance.totalDays}
                        </div>
                        <div className="text-sm text-muted-foreground">Total Days</div>
                      </div>
                    </div>
                    <div>
                      <Label>Attendance Rate</Label>
                      <Progress
                        value={progressData.attendance.percentage}
                        className="mt-2"
                      />
                      <div className="text-sm text-muted-foreground mt-1">
                        {progressData.attendance.percentage.toFixed(1)}% attendance rate
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      ) : (
        <Card>
          <CardContent className="text-center py-8">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Select a Student</h3>
            <p className="text-muted-foreground">
              Choose a class and student to view their progress tracking information.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
