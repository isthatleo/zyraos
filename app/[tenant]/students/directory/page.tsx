"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { AddUserDialog } from "@/components/add-user-dialog"
import { DataTable } from "@/components/data-table"
import { Plus, Search, Users, UserCheck, UserX, GraduationCap } from "lucide-react"
import { useState } from "react"

interface Student {
  id: string
  admissionNumber: string
  name: string
  email: string
  class: string
  status: string
  enrolled: string
  avatar?: string
}

const mockStudents: Student[] = [
  {
    id: "1",
    admissionNumber: "S001",
    name: "John Doe",
    email: "john@school.com",
    class: "Grade 3A",
    status: "Active",
    enrolled: "2024-01-15",
  },
  {
    id: "2",
    admissionNumber: "S002",
    name: "Jane Smith",
    email: "jane@school.com",
    class: "Grade 3A",
    status: "Active",
    enrolled: "2024-01-15",
  },
  {
    id: "3",
    admissionNumber: "S003",
    name: "Mike Johnson",
    email: "mike@school.com",
    class: "Grade 2B",
    status: "Active",
    enrolled: "2024-02-01",
  },
  {
    id: "4",
    admissionNumber: "S004",
    name: "Sarah Wilson",
    email: "sarah@school.com",
    class: "Grade 1A",
    status: "Inactive",
    enrolled: "2023-09-01",
  },
]

export default function StudentsDirectoryPage() {
  const [searchTerm, setSearchTerm] = useState("")

  const filteredStudents = mockStudents.filter(student =>
    student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.admissionNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const totalStudents = mockStudents.length
  const activeStudents = mockStudents.filter(s => s.status === "Active").length
  const inactiveStudents = mockStudents.filter(s => s.status === "Inactive").length

  return (
    <div className="space-y-8 p-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Students Directory</h1>
          <p className="text-muted-foreground">Complete student management and enrollment overview</p>
        </div>
        <AddUserDialog />
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStudents}</div>
            <p className="text-xs text-muted-foreground">Enrolled students</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Students</CardTitle>
            <UserCheck className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeStudents}</div>
            <p className="text-xs text-muted-foreground">Currently active</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inactive Students</CardTitle>
            <UserX className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inactiveStudents}</div>
            <p className="text-xs text-muted-foreground">Not currently active</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Graduation Rate</CardTitle>
            <GraduationCap className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">95%</div>
            <p className="text-xs text-muted-foreground">This academic year</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search students by name, admission number, or email..."
          className="pl-9"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Students Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Students</CardTitle>
          <CardDescription>Complete student directory with management actions</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Admission #</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Enrolled</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStudents.map((student) => (
                <TableRow key={student.id}>
                  <TableCell className="font-medium">{student.admissionNumber}</TableCell>
                  <TableCell>{student.name}</TableCell>
                  <TableCell>{student.email}</TableCell>
                  <TableCell>{student.class}</TableCell>
                  <TableCell>
                    <Badge className={student.status === "Active" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                      {student.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{new Date(student.enrolled).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm">
                        View
                      </Button>
                      <Button variant="ghost" size="sm">
                        Edit
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
