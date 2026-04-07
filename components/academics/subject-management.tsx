"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Plus, Search, Edit, Trash2, BookOpen, MoreVertical, Layers } from "lucide-react"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface SubjectData {
  id: string
  code: string
  name: string
  department: string
  type: "core" | "elective" | "lab" | "practical"
  creditHours: number
  assignedTeacher: string
  levels: string[]
  status: "active" | "inactive"
}

const departments = ["Science", "Mathematics", "Languages", "Humanities", "Arts", "Technology", "Physical Education", "Business"]
const subjectTypes = [
  { value: "core", label: "Core" },
  { value: "elective", label: "Elective" },
  { value: "lab", label: "Laboratory" },
  { value: "practical", label: "Practical" },
]

export function SubjectManagement() {
  const [search, setSearch] = useState("")
  const [subjects, setSubjects] = useState<SubjectData[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [newSubject, setNewSubject] = useState({
    code: "", name: "", department: "", type: "core" as SubjectData["type"],
    creditHours: 3, assignedTeacher: "", levels: [] as string[]
  })

  const filtered = subjects.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.code.toLowerCase().includes(search.toLowerCase()) ||
    s.department.toLowerCase().includes(search.toLowerCase())
  )

  const handleAdd = () => {
    if (!newSubject.code || !newSubject.name) return
    setSubjects(prev => [...prev, {
      id: crypto.randomUUID(),
      ...newSubject,
      status: "active"
    }])
    setNewSubject({ code: "", name: "", department: "", type: "core", creditHours: 3, assignedTeacher: "", levels: [] })
    setShowAdd(false)
  }

  const typeColor = (type: string) => {
    switch (type) {
      case "core": return "default"
      case "elective": return "secondary"
      case "lab": return "outline"
      default: return "secondary"
    }
  }

  return (
    <div className="space-y-6">
      {/* KPI */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <BookOpen className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Subjects</p>
                <p className="text-2xl font-bold">{subjects.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-chart-1/10 flex items-center justify-center">
                <Layers className="h-5 w-5 text-chart-1" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Core Subjects</p>
                <p className="text-2xl font-bold">{subjects.filter(s => s.type === "core").length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-chart-2/10 flex items-center justify-center">
                <BookOpen className="h-5 w-5 text-chart-2" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Electives</p>
                <p className="text-2xl font-bold">{subjects.filter(s => s.type === "elective").length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-chart-3/10 flex items-center justify-center">
                <Layers className="h-5 w-5 text-chart-3" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Departments</p>
                <p className="text-2xl font-bold">{new Set(subjects.map(s => s.department)).size}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search subjects..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Add Subject</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Add New Subject</DialogTitle>
              <DialogDescription>Add a subject to the curriculum</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Subject Code</Label>
                  <Input placeholder="e.g. MAT101" value={newSubject.code} onChange={e => setNewSubject(p => ({...p, code: e.target.value}))} />
                </div>
                <div className="grid gap-2">
                  <Label>Subject Name</Label>
                  <Input placeholder="e.g. Mathematics" value={newSubject.name} onChange={e => setNewSubject(p => ({...p, name: e.target.value}))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Department</Label>
                  <Select value={newSubject.department} onValueChange={v => setNewSubject(p => ({...p, department: v}))}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Type</Label>
                  <Select value={newSubject.type} onValueChange={v => setNewSubject(p => ({...p, type: v as SubjectData["type"]}))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {subjectTypes.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Credit Hours</Label>
                  <Input type="number" value={newSubject.creditHours} onChange={e => setNewSubject(p => ({...p, creditHours: parseInt(e.target.value) || 0}))} />
                </div>
                <div className="grid gap-2">
                  <Label>Assigned Teacher</Label>
                  <Input placeholder="Teacher name" value={newSubject.assignedTeacher} onChange={e => setNewSubject(p => ({...p, assignedTeacher: e.target.value}))} />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
              <Button onClick={handleAdd}>Add Subject</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Subjects</CardTitle>
          <CardDescription>Curriculum subjects with assignments</CardDescription>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground mb-2">No subjects yet</h3>
              <p className="text-sm text-muted-foreground mb-4">Add subjects to your curriculum</p>
              <Button onClick={() => setShowAdd(true)}><Plus className="h-4 w-4 mr-2" />Add Subject</Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Credits</TableHead>
                  <TableHead>Teacher</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[60px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(s => (
                  <TableRow key={s.id}>
                    <TableCell className="font-mono text-sm">{s.code}</TableCell>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell>{s.department}</TableCell>
                    <TableCell><Badge variant={typeColor(s.type) as any}>{s.type}</Badge></TableCell>
                    <TableCell>{s.creditHours}</TableCell>
                    <TableCell>{s.assignedTeacher || "—"}</TableCell>
                    <TableCell><Badge variant={s.status === "active" ? "default" : "secondary"}>{s.status}</Badge></TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
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
