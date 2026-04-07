"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Search, Edit, Trash2, Users, BookOpen, GraduationCap, MoreVertical } from "lucide-react"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface ClassData {
  id: string
  name: string
  level: string
  section: string
  capacity: number
  enrolled: number
  classTeacher: string
  subjects: number
  status: "active" | "archived"
}

export function ClassManagementFull() {
  const [search, setSearch] = useState("")
  const [classes, setClasses] = useState<ClassData[]>([])
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [newClass, setNewClass] = useState({
    name: "", level: "", section: "", capacity: 30, classTeacher: ""
  })
  const [loading, setLoading] = useState(false)

  const filteredClasses = classes.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.level.toLowerCase().includes(search.toLowerCase())
  )

  const totalStudents = classes.reduce((sum, c) => sum + c.enrolled, 0)
  const totalCapacity = classes.reduce((sum, c) => sum + c.capacity, 0)
  const avgOccupancy = totalCapacity > 0 ? Math.round((totalStudents / totalCapacity) * 100) : 0

  const handleAddClass = () => {
    if (!newClass.name || !newClass.level) return
    setClasses(prev => [...prev, {
      id: crypto.randomUUID(),
      name: newClass.name,
      level: newClass.level,
      section: newClass.section || "A",
      capacity: newClass.capacity,
      enrolled: 0,
      classTeacher: newClass.classTeacher,
      subjects: 0,
      status: "active"
    }])
    setNewClass({ name: "", level: "", section: "", capacity: 30, classTeacher: "" })
    setShowAddDialog(false)
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Classes</p>
                <p className="text-2xl font-bold">{classes.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-chart-1/10 flex items-center justify-center">
                <GraduationCap className="h-5 w-5 text-chart-1" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Students</p>
                <p className="text-2xl font-bold">{totalStudents}</p>
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
                <p className="text-sm text-muted-foreground">Total Capacity</p>
                <p className="text-2xl font-bold">{totalCapacity}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col gap-2">
              <p className="text-sm text-muted-foreground">Avg Occupancy</p>
              <p className="text-2xl font-bold">{avgOccupancy}%</p>
              <Progress value={avgOccupancy} className="h-2" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Header + Actions */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search classes..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Add Class</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Class</DialogTitle>
              <DialogDescription>Create a new class for the academic year</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Class Name</Label>
                <Input placeholder="e.g. Grade 1A" value={newClass.name} onChange={e => setNewClass(p => ({...p, name: e.target.value}))} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Level</Label>
                  <Select value={newClass.level} onValueChange={v => setNewClass(p => ({...p, level: v}))}>
                    <SelectTrigger><SelectValue placeholder="Select level" /></SelectTrigger>
                    <SelectContent>
                      {["Nursery","Pre-Primary","Primary 1","Primary 2","Primary 3","Primary 4","Primary 5","Primary 6",
                        "JSS 1","JSS 2","JSS 3","SS 1","SS 2","SS 3",
                        "Year 1","Year 2","Year 3","Year 4","100 Level","200 Level","300 Level","400 Level","500 Level"
                      ].map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Section</Label>
                  <Select value={newClass.section} onValueChange={v => setNewClass(p => ({...p, section: v}))}>
                    <SelectTrigger><SelectValue placeholder="Section" /></SelectTrigger>
                    <SelectContent>
                      {["A","B","C","D","E","F"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Capacity</Label>
                <Input type="number" value={newClass.capacity} onChange={e => setNewClass(p => ({...p, capacity: parseInt(e.target.value) || 30}))} />
              </div>
              <div className="grid gap-2">
                <Label>Class Teacher</Label>
                <Input placeholder="Teacher name" value={newClass.classTeacher} onChange={e => setNewClass(p => ({...p, classTeacher: e.target.value}))} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
              <Button onClick={handleAddClass}>Create Class</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Classes Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Classes</CardTitle>
          <CardDescription>Manage classes, sections, and enrollment</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredClasses.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground mb-2">No classes yet</h3>
              <p className="text-sm text-muted-foreground mb-4">Get started by creating your first class</p>
              <Button onClick={() => setShowAddDialog(true)}><Plus className="h-4 w-4 mr-2" />Add Class</Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Class</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead>Section</TableHead>
                  <TableHead>Enrolled / Capacity</TableHead>
                  <TableHead>Class Teacher</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[60px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClasses.map(cls => (
                  <TableRow key={cls.id}>
                    <TableCell className="font-medium">{cls.name}</TableCell>
                    <TableCell>{cls.level}</TableCell>
                    <TableCell>{cls.section}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{cls.enrolled}/{cls.capacity}</span>
                        <Progress value={(cls.enrolled / cls.capacity) * 100} className="h-1.5 w-16" />
                      </div>
                    </TableCell>
                    <TableCell>{cls.classTeacher || "—"}</TableCell>
                    <TableCell>
                      <Badge variant={cls.status === "active" ? "default" : "secondary"}>
                        {cls.status}
                      </Badge>
                    </TableCell>
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
