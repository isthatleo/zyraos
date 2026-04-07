"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Search, FileText, Calendar, Clock, Upload, MoreVertical, Eye, Edit, Trash2 } from "lucide-react"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface Assignment {
  id: string
  title: string
  subject: string
  class: string
  type: "homework" | "project" | "essay" | "lab-report" | "presentation"
  dueDate: string
  totalMarks: number
  status: "draft" | "published" | "closed" | "graded"
  submissions: number
  totalStudents: number
}

export default function StaffAssignmentsPage() {
  const [search, setSearch] = useState("")
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [newAssignment, setNewAssignment] = useState({
    title: "", subject: "", class: "", type: "homework" as Assignment["type"],
    dueDate: "", totalMarks: 100, description: ""
  })

  const handleAdd = () => {
    if (!newAssignment.title) return
    setAssignments(prev => [...prev, {
      id: crypto.randomUUID(),
      title: newAssignment.title,
      subject: newAssignment.subject,
      class: newAssignment.class,
      type: newAssignment.type,
      dueDate: newAssignment.dueDate,
      totalMarks: newAssignment.totalMarks,
      status: "draft",
      submissions: 0,
      totalStudents: 0,
    }])
    setNewAssignment({ title: "", subject: "", class: "", type: "homework", dueDate: "", totalMarks: 100, description: "" })
    setShowAdd(false)
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Assignments</h1>
          <p className="text-muted-foreground">Create and manage class assignments</p>
        </div>
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Create Assignment</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Assignment</DialogTitle>
              <DialogDescription>Set up a new assignment for your class</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Title</Label>
                <Input placeholder="Assignment title" value={newAssignment.title} onChange={e => setNewAssignment(p => ({...p, title: e.target.value}))} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Subject</Label>
                  <Input placeholder="Subject" value={newAssignment.subject} onChange={e => setNewAssignment(p => ({...p, subject: e.target.value}))} />
                </div>
                <div className="grid gap-2">
                  <Label>Class</Label>
                  <Input placeholder="Class" value={newAssignment.class} onChange={e => setNewAssignment(p => ({...p, class: e.target.value}))} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <Label>Type</Label>
                  <Select value={newAssignment.type} onValueChange={v => setNewAssignment(p => ({...p, type: v as Assignment["type"]}))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="homework">Homework</SelectItem>
                      <SelectItem value="project">Project</SelectItem>
                      <SelectItem value="essay">Essay</SelectItem>
                      <SelectItem value="lab-report">Lab Report</SelectItem>
                      <SelectItem value="presentation">Presentation</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Due Date</Label>
                  <Input type="date" value={newAssignment.dueDate} onChange={e => setNewAssignment(p => ({...p, dueDate: e.target.value}))} />
                </div>
                <div className="grid gap-2">
                  <Label>Total Marks</Label>
                  <Input type="number" value={newAssignment.totalMarks} onChange={e => setNewAssignment(p => ({...p, totalMarks: parseInt(e.target.value) || 0}))} />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Description</Label>
                <Textarea placeholder="Assignment instructions..." value={newAssignment.description} onChange={e => setNewAssignment(p => ({...p, description: e.target.value}))} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
              <Button onClick={handleAdd}>Create</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search assignments..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <Card>
        <CardContent className="pt-6">
          {assignments.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground mb-2">No assignments yet</h3>
              <p className="text-sm text-muted-foreground mb-4">Create your first assignment</p>
              <Button onClick={() => setShowAdd(true)}><Plus className="h-4 w-4 mr-2" />Create Assignment</Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Submissions</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[60px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignments.filter(a => a.title.toLowerCase().includes(search.toLowerCase())).map(a => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.title}</TableCell>
                    <TableCell>{a.subject}</TableCell>
                    <TableCell>{a.class}</TableCell>
                    <TableCell><Badge variant="outline">{a.type}</Badge></TableCell>
                    <TableCell>{a.dueDate || "—"}</TableCell>
                    <TableCell>{a.submissions}/{a.totalStudents}</TableCell>
                    <TableCell><Badge variant={a.status === "published" ? "default" : "secondary"}>{a.status}</Badge></TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem><Eye className="h-4 w-4 mr-2" />View</DropdownMenuItem>
                          <DropdownMenuItem><Edit className="h-4 w-4 mr-2" />Edit</DropdownMenuItem>
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
    </div>
  )
}
