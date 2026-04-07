"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Edit, Download, MoreHorizontal, Trash2 } from "lucide-react"
import { toast } from "sonner"

interface ReportCardManagementProps {
  tenantSlug: string
}

interface ReportCard {
  id: string
  reportCardNumber: string
  studentId: string
  classId: string
  termId: string | null
  academicYearId: string
  reportType: string
  overallGrade: string | null
  overallPercentage: number | null
  gpa: number | null
  rank: number | null
  totalStudents: number | null
  attendanceDays: number
  totalDays: number
  attendancePercentage: number | null
  teacherComments: string | null
  principalComments: string | null
  parentComments: string | null
  issuedDate: string
  issuedBy: string
  status: string
}

export function ReportCardManagement({ tenantSlug }: ReportCardManagementProps) {
  const [reportCards, setReportCards] = useState<ReportCard[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedClass, setSelectedClass] = useState("")
  const [selectedTerm, setSelectedTerm] = useState("")
  const [selectedYear, setSelectedYear] = useState("")
  const [isGenerateDialogOpen, setIsGenerateDialogOpen] = useState(false)
  const [editingCard, setEditingCard] = useState<ReportCard | null>(null)

  const [newReportCard, setNewReportCard] = useState({
    studentId: "",
    classId: "",
    termId: "",
    academicYearId: "",
    reportType: "termly",
    teacherComments: "",
    principalComments: "",
    parentComments: "",
  })

  useEffect(() => {
    fetchReportCards()
  }, [selectedClass, selectedTerm, selectedYear])

  const fetchReportCards = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (selectedClass) params.append("classId", selectedClass)
      if (selectedTerm) params.append("termId", selectedTerm)
      if (selectedYear) params.append("academicYearId", selectedYear)

      const response = await fetch(`/api/${tenantSlug}/report-cards?${params}`)
      const data = await response.json()
      setReportCards(data.reportCards || [])
    } catch (error) {
      console.error("Error fetching report cards:", error)
      toast.error("Failed to fetch report cards")
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateReportCard = async () => {
    try {
      const response = await fetch(`/api/${tenantSlug}/report-cards`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newReportCard),
      })

      if (response.ok) {
        toast.success("Report card generated successfully")
        setIsGenerateDialogOpen(false)
        setNewReportCard({
          studentId: "",
          classId: "",
          termId: "",
          academicYearId: "",
          reportType: "termly",
          teacherComments: "",
          principalComments: "",
          parentComments: "",
        })
        fetchReportCards()
      } else {
        throw new Error("Failed to generate report card")
      }
    } catch (error) {
      console.error("Error generating report card:", error)
      toast.error("Failed to generate report card")
    }
  }

  const handleUpdateReportCard = async (cardId: string, updates: Partial<ReportCard>) => {
    try {
      const response = await fetch(`/api/${tenantSlug}/report-cards/${cardId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updates),
      })

      if (response.ok) {
        toast.success("Report card updated successfully")
        setEditingCard(null)
        fetchReportCards()
      } else {
        throw new Error("Failed to update report card")
      }
    } catch (error) {
      console.error("Error updating report card:", error)
      toast.error("Failed to update report card")
    }
  }

  const handleDeleteReportCard = async (cardId: string) => {
    if (!confirm("Are you sure you want to delete this report card?")) return

    try {
      const response = await fetch(`/api/${tenantSlug}/report-cards/${cardId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        toast.success("Report card deleted successfully")
        fetchReportCards()
      } else {
        throw new Error("Failed to delete report card")
      }
    } catch (error) {
      console.error("Error deleting report card:", error)
      toast.error("Failed to delete report card")
    }
  }

  const handleDownloadReportCard = async (cardId: string) => {
    try {
      // This would trigger PDF generation and download
      toast.info("Report card PDF is being generated")
    } catch (error) {
      console.error("Error downloading report card:", error)
      toast.error("Failed to download report card")
    }
  }

  return (
    <div className="space-y-6">
      {/* Filters and Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Report Card Management</CardTitle>
          <CardDescription>
            Generate, manage, and distribute student report cards
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
            <div className="flex-1">
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

          <Dialog open={isGenerateDialogOpen} onOpenChange={setIsGenerateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Generate Report Card
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Generate Report Card</DialogTitle>
                <DialogDescription>
                  Create a new report card for a student.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="studentId">Student ID</Label>
                  <Input
                    id="studentId"
                    value={newReportCard.studentId}
                    onChange={(e) => setNewReportCard({ ...newReportCard, studentId: e.target.value })}
                    placeholder="Enter student ID"
                  />
                </div>
                <div>
                  <Label htmlFor="reportType">Report Type</Label>
                  <Select
                    value={newReportCard.reportType}
                    onValueChange={(value) => setNewReportCard({ ...newReportCard, reportType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="termly">Termly</SelectItem>
                      <SelectItem value="yearly">Yearly</SelectItem>
                      <SelectItem value="final">Final</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="teacherComments">Teacher Comments</Label>
                  <Textarea
                    id="teacherComments"
                    value={newReportCard.teacherComments}
                    onChange={(e) => setNewReportCard({ ...newReportCard, teacherComments: e.target.value })}
                    placeholder="Teacher's comments"
                  />
                </div>
                <div>
                  <Label htmlFor="principalComments">Principal Comments</Label>
                  <Textarea
                    id="principalComments"
                    value={newReportCard.principalComments}
                    onChange={(e) => setNewReportCard({ ...newReportCard, principalComments: e.target.value })}
                    placeholder="Principal's comments"
                  />
                </div>
                <div>
                  <Label htmlFor="parentComments">Parent Comments</Label>
                  <Textarea
                    id="parentComments"
                    value={newReportCard.parentComments}
                    onChange={(e) => setNewReportCard({ ...newReportCard, parentComments: e.target.value })}
                    placeholder="Parent's comments"
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setIsGenerateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleGenerateReportCard}>Generate</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      {/* Report Cards Table */}
      <Card>
        <CardHeader>
          <CardTitle>Report Cards</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-4">Loading report cards...</div>
          ) : reportCards.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              No report cards found. Select filters or generate a new report card.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Report Card #</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Grade</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Issued Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportCards.map((card) => (
                  <TableRow key={card.id}>
                    <TableCell className="font-mono">{card.reportCardNumber}</TableCell>
                    <TableCell>{card.studentId}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {card.reportType}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Badge variant={card.overallGrade === "A" ? "default" : card.overallGrade === "F" ? "destructive" : "secondary"}>
                          {card.overallGrade || "N/A"}
                        </Badge>
                        {card.overallPercentage && (
                          <span className="text-sm text-muted-foreground">
                            {card.overallPercentage.toFixed(1)}%
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          card.status === "issued" ? "default" :
                          card.status === "sent" ? "secondary" :
                          card.status === "printed" ? "outline" : "secondary"
                        }
                        className="capitalize"
                      >
                        {card.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(card.issuedDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownloadReportCard(card.id)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingCard(card)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteReportCard(card.id)}
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
    </div>
  )
}
