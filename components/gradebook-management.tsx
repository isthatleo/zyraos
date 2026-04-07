"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Edit, Trash2, Save, X } from "lucide-react"
import { toast } from "sonner"

interface GradebookManagementProps {
  tenantSlug: string
}

interface Grade {
  id: string
  studentId: string
  subjectId: string
  classId: string
  termId: string
  academicYearId: string
  assessmentType: string
  assessmentName: string
  score: number | null
  maxScore: number | null
  percentage: number | null
  grade: string | null
  weight: number
  assessmentDate: string
  teacherId: string
  notes: string | null
  isExcused: boolean
}

export function GradebookManagement({ tenantSlug }: GradebookManagementProps) {
  const [grades, setGrades] = useState<Grade[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedClass, setSelectedClass] = useState("")
  const [selectedSubject, setSelectedSubject] = useState("")
  const [selectedTerm, setSelectedTerm] = useState("")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingGrade, setEditingGrade] = useState<Grade | null>(null)

  const [newGrade, setNewGrade] = useState({
    studentId: "",
    subjectId: "",
    assessmentType: "exam",
    assessmentName: "",
    score: "",
    maxScore: "",
    weight: "1",
    assessmentDate: new Date().toISOString().split('T')[0],
    notes: "",
    isExcused: false,
  })

  useEffect(() => {
    fetchGrades()
  }, [selectedClass, selectedSubject, selectedTerm])

  const fetchGrades = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (selectedClass) params.append("classId", selectedClass)
      if (selectedSubject) params.append("subjectId", selectedSubject)
      if (selectedTerm) params.append("termId", selectedTerm)

      const response = await fetch(`/api/${tenantSlug}/grades?${params}`)
      const data = await response.json()
      setGrades(data.grades || [])
    } catch (error) {
      console.error("Error fetching grades:", error)
      toast.error("Failed to fetch grades")
    } finally {
      setLoading(false)
    }
  }

  const handleAddGrade = async () => {
    try {
      const response = await fetch(`/api/${tenantSlug}/grades`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...newGrade,
          classId: selectedClass,
          termId: selectedTerm,
          academicYearId: "current-year", // This should be dynamic
          score: newGrade.score ? parseFloat(newGrade.score) : null,
          maxScore: newGrade.maxScore ? parseFloat(newGrade.maxScore) : null,
          weight: parseFloat(newGrade.weight),
        }),
      })

      if (response.ok) {
        toast.success("Grade added successfully")
        setIsAddDialogOpen(false)
        setNewGrade({
          studentId: "",
          subjectId: "",
          assessmentType: "exam",
          assessmentName: "",
          score: "",
          maxScore: "",
          weight: "1",
          assessmentDate: new Date().toISOString().split('T')[0],
          notes: "",
          isExcused: false,
        })
        fetchGrades()
      } else {
        throw new Error("Failed to add grade")
      }
    } catch (error) {
      console.error("Error adding grade:", error)
      toast.error("Failed to add grade")
    }
  }

  const handleUpdateGrade = async (gradeId: string, updates: Partial<Grade>) => {
    try {
      const response = await fetch(`/api/${tenantSlug}/grades/${gradeId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updates),
      })

      if (response.ok) {
        toast.success("Grade updated successfully")
        setEditingGrade(null)
        fetchGrades()
      } else {
        throw new Error("Failed to update grade")
      }
    } catch (error) {
      console.error("Error updating grade:", error)
      toast.error("Failed to update grade")
    }
  }

  const handleDeleteGrade = async (gradeId: string) => {
    if (!confirm("Are you sure you want to delete this grade?")) return

    try {
      const response = await fetch(`/api/${tenantSlug}/grades/${gradeId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        toast.success("Grade deleted successfully")
        fetchGrades()
      } else {
        throw new Error("Failed to delete grade")
      }
    } catch (error) {
      console.error("Error deleting grade:", error)
      toast.error("Failed to delete grade")
    }
  }

  return (
    <div className="space-y-6">
      {/* Filters and Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Gradebook Management</CardTitle>
          <CardDescription>
            Manage student grades and assessments
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <div className="flex-1">
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
            <div className="flex-1">
              <Label>Subject</Label>
              <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                <SelectTrigger>
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="math">Mathematics</SelectItem>
                  <SelectItem value="english">English</SelectItem>
                  <SelectItem value="science">Science</SelectItem>
                  <SelectItem value="history">History</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
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
          </div>

          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Grade
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Add New Grade</DialogTitle>
                <DialogDescription>
                  Enter the details for the new grade entry.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="studentId">Student ID</Label>
                  <Input
                    id="studentId"
                    value={newGrade.studentId}
                    onChange={(e) => setNewGrade({ ...newGrade, studentId: e.target.value })}
                    placeholder="Enter student ID"
                  />
                </div>
                <div>
                  <Label htmlFor="assessmentType">Assessment Type</Label>
                  <Select
                    value={newGrade.assessmentType}
                    onValueChange={(value) => setNewGrade({ ...newGrade, assessmentType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="exam">Exam</SelectItem>
                      <SelectItem value="test">Test</SelectItem>
                      <SelectItem value="assignment">Assignment</SelectItem>
                      <SelectItem value="project">Project</SelectItem>
                      <SelectItem value="participation">Participation</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="assessmentName">Assessment Name</Label>
                  <Input
                    id="assessmentName"
                    value={newGrade.assessmentName}
                    onChange={(e) => setNewGrade({ ...newGrade, assessmentName: e.target.value })}
                    placeholder="e.g., Mid-term Exam"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor="score">Score</Label>
                    <Input
                      id="score"
                      type="number"
                      value={newGrade.score}
                      onChange={(e) => setNewGrade({ ...newGrade, score: e.target.value })}
                      placeholder="85"
                    />
                  </div>
                  <div>
                    <Label htmlFor="maxScore">Max Score</Label>
                    <Input
                      id="maxScore"
                      type="number"
                      value={newGrade.maxScore}
                      onChange={(e) => setNewGrade({ ...newGrade, maxScore: e.target.value })}
                      placeholder="100"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="weight">Weight</Label>
                  <Input
                    id="weight"
                    type="number"
                    step="0.1"
                    value={newGrade.weight}
                    onChange={(e) => setNewGrade({ ...newGrade, weight: e.target.value })}
                    placeholder="1.0"
                  />
                </div>
                <div>
                  <Label htmlFor="assessmentDate">Assessment Date</Label>
                  <Input
                    id="assessmentDate"
                    type="date"
                    value={newGrade.assessmentDate}
                    onChange={(e) => setNewGrade({ ...newGrade, assessmentDate: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={newGrade.notes}
                    onChange={(e) => setNewGrade({ ...newGrade, notes: e.target.value })}
                    placeholder="Optional notes"
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddGrade}>Add Grade</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      {/* Grades Table */}
      <Card>
        <CardHeader>
          <CardTitle>Grades</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-4">Loading grades...</div>
          ) : grades.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              No grades found. Select filters or add a new grade.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Assessment</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Grade</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {grades.map((grade) => (
                  <TableRow key={grade.id}>
                    <TableCell>{grade.studentId}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{grade.assessmentName}</div>
                        <div className="text-sm text-muted-foreground capitalize">
                          {grade.assessmentType}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {grade.score !== null && grade.maxScore !== null
                        ? `${grade.score}/${grade.maxScore}`
                        : "N/A"
                      }
                      {grade.percentage !== null && (
                        <div className="text-sm text-muted-foreground">
                          {grade.percentage.toFixed(1)}%
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={grade.grade === "A" ? "default" : grade.grade === "F" ? "destructive" : "secondary"}>
                        {grade.grade || "N/A"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(grade.assessmentDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingGrade(grade)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteGrade(grade.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Grade Dialog */}
      {editingGrade && (
        <Dialog open={!!editingGrade} onOpenChange={() => setEditingGrade(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Grade</DialogTitle>
              <DialogDescription>
                Update the grade details.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="edit-score">Score</Label>
                  <Input
                    id="edit-score"
                    type="number"
                    defaultValue={editingGrade.score || ""}
                    onChange={(e) => {
                      const updatedGrade = { ...editingGrade, score: e.target.value ? parseFloat(e.target.value) : null }
                      setEditingGrade(updatedGrade)
                    }}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-maxScore">Max Score</Label>
                  <Input
                    id="edit-maxScore"
                    type="number"
                    defaultValue={editingGrade.maxScore || ""}
                    onChange={(e) => {
                      const updatedGrade = { ...editingGrade, maxScore: e.target.value ? parseFloat(e.target.value) : null }
                      setEditingGrade(updatedGrade)
                    }}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="edit-weight">Weight</Label>
                <Input
                  id="edit-weight"
                  type="number"
                  step="0.1"
                  defaultValue={editingGrade.weight}
                  onChange={(e) => {
                    const updatedGrade = { ...editingGrade, weight: parseFloat(e.target.value) }
                    setEditingGrade(updatedGrade)
                  }}
                />
              </div>
              <div>
                <Label htmlFor="edit-notes">Notes</Label>
                <Textarea
                  id="edit-notes"
                  defaultValue={editingGrade.notes || ""}
                  onChange={(e) => {
                    const updatedGrade = { ...editingGrade, notes: e.target.value }
                    setEditingGrade(updatedGrade)
                  }}
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setEditingGrade(null)}>
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button onClick={() => handleUpdateGrade(editingGrade.id, editingGrade)}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
