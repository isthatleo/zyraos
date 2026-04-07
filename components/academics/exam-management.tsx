"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import {
  Plus, Search, FileText, BarChart3, ClipboardList, Calendar, Clock,
  CheckCircle2, AlertCircle, Eye, Edit, Trash2, MoreVertical, Download, Upload
} from "lucide-react"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface Exam {
  id: string
  name: string
  subject: string
  class: string
  type: "midterm" | "final" | "quiz" | "practical" | "ca"
  date: string
  startTime: string
  duration: number
  totalMarks: number
  passMark: number
  status: "draft" | "scheduled" | "ongoing" | "completed" | "published"
  studentsEnrolled: number
  submissions: number
  avgScore: number | null
}

const examTypes = [
  { value: "ca", label: "Continuous Assessment" },
  { value: "midterm", label: "Mid-Term Exam" },
  { value: "final", label: "Final Exam" },
  { value: "quiz", label: "Quiz / Test" },
  { value: "practical", label: "Practical Exam" },
]

export function ExamManagement() {
  const [search, setSearch] = useState("")
  const [tab, setTab] = useState("all")
  const [exams, setExams] = useState<Exam[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [newExam, setNewExam] = useState({
    name: "", subject: "", class: "", type: "ca" as Exam["type"],
    date: "", startTime: "09:00", duration: 60, totalMarks: 100, passMark: 40
  })

  const filtered = exams.filter(e => {
    const matchSearch = e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.subject.toLowerCase().includes(search.toLowerCase())
    if (tab === "all") return matchSearch
    return matchSearch && e.status === tab
  })

  const statusIcon = (status: string) => {
    switch (status) {
      case "published": return <CheckCircle2 className="h-3.5 w-3.5" />
      case "ongoing": return <Clock className="h-3.5 w-3.5" />
      case "scheduled": return <Calendar className="h-3.5 w-3.5" />
      default: return <AlertCircle className="h-3.5 w-3.5" />
    }
  }

  const statusVariant = (status: string) => {
    switch (status) {
      case "published": return "default"
      case "completed": return "secondary"
      case "ongoing": return "default"
      case "scheduled": return "outline"
      default: return "secondary"
    }
  }

  const handleAdd = () => {
    if (!newExam.name || !newExam.subject) return
    setExams(prev => [...prev, {
      id: crypto.randomUUID(),
      ...newExam,
      status: "draft",
      studentsEnrolled: 0,
      submissions: 0,
      avgScore: null,
    }])
    setNewExam({ name: "", subject: "", class: "", type: "ca", date: "", startTime: "09:00", duration: 60, totalMarks: 100, passMark: 40 })
    setShowAdd(false)
  }

  return (
    <div className="space-y-6">
      {/* KPI */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: "Total Exams", value: exams.length, icon: FileText, color: "primary" },
          { label: "Scheduled", value: exams.filter(e => e.status === "scheduled").length, icon: Calendar, color: "chart-1" },
          { label: "Completed", value: exams.filter(e => e.status === "completed" || e.status === "published").length, icon: CheckCircle2, color: "chart-2" },
          { label: "Avg Pass Rate", value: "—", icon: BarChart3, color: "chart-3" },
        ].map(kpi => (
          <Card key={kpi.label}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className={`h-10 w-10 rounded-xl bg-${kpi.color}/10 flex items-center justify-center`}>
                  <kpi.icon className={`h-5 w-5 text-${kpi.color}`} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{kpi.label}</p>
                  <p className="text-2xl font-bold">{kpi.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search exams..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-2">
          <Button variant="outline"><Download className="h-4 w-4 mr-2" />Export</Button>
          <Dialog open={showAdd} onOpenChange={setShowAdd}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />Create Exam</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Create New Exam</DialogTitle>
                <DialogDescription>Set up examination details</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label>Exam Name</Label>
                  <Input placeholder="e.g. Mathematics Mid-Term Exam" value={newExam.name} onChange={e => setNewExam(p => ({...p, name: e.target.value}))} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Subject</Label>
                    <Input placeholder="Subject" value={newExam.subject} onChange={e => setNewExam(p => ({...p, subject: e.target.value}))} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Class</Label>
                    <Input placeholder="Class" value={newExam.class} onChange={e => setNewExam(p => ({...p, class: e.target.value}))} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Type</Label>
                    <Select value={newExam.type} onValueChange={v => setNewExam(p => ({...p, type: v as Exam["type"]}))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {examTypes.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Date</Label>
                    <Input type="date" value={newExam.date} onChange={e => setNewExam(p => ({...p, date: e.target.value}))} />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="grid gap-2">
                    <Label>Duration (min)</Label>
                    <Input type="number" value={newExam.duration} onChange={e => setNewExam(p => ({...p, duration: parseInt(e.target.value) || 60}))} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Total Marks</Label>
                    <Input type="number" value={newExam.totalMarks} onChange={e => setNewExam(p => ({...p, totalMarks: parseInt(e.target.value) || 100}))} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Pass Mark</Label>
                    <Input type="number" value={newExam.passMark} onChange={e => setNewExam(p => ({...p, passMark: parseInt(e.target.value) || 40}))} />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
                <Button onClick={handleAdd}>Create Exam</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Tabs + Table */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="draft">Draft</TabsTrigger>
          <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
          <TabsTrigger value="ongoing">Ongoing</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="published">Published</TabsTrigger>
        </TabsList>

        <TabsContent value={tab}>
          <Card>
            <CardContent className="pt-6">
              {filtered.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
                  <h3 className="text-lg font-medium text-muted-foreground mb-2">No exams found</h3>
                  <p className="text-sm text-muted-foreground mb-4">Create your first exam to get started</p>
                  <Button onClick={() => setShowAdd(true)}><Plus className="h-4 w-4 mr-2" />Create Exam</Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Exam</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Class</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Marks</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[60px]" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map(exam => (
                      <TableRow key={exam.id}>
                        <TableCell className="font-medium">{exam.name}</TableCell>
                        <TableCell>{exam.subject}</TableCell>
                        <TableCell>{exam.class}</TableCell>
                        <TableCell><Badge variant="outline">{exam.type.toUpperCase()}</Badge></TableCell>
                        <TableCell>{exam.date || "—"}</TableCell>
                        <TableCell>{exam.duration} min</TableCell>
                        <TableCell>{exam.totalMarks}</TableCell>
                        <TableCell>
                          <Badge variant={statusVariant(exam.status) as any} className="gap-1">
                            {statusIcon(exam.status)}
                            {exam.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem><Eye className="h-4 w-4 mr-2" />View</DropdownMenuItem>
                              <DropdownMenuItem><Edit className="h-4 w-4 mr-2" />Edit</DropdownMenuItem>
                              <DropdownMenuItem><ClipboardList className="h-4 w-4 mr-2" />Grade</DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive"><Trash2 className="h-4 w-4 mr-2" />Delete</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
