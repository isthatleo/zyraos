import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Users, FileText, Calendar } from "lucide-react"

const classes = [
  {
    id: "MATH-101",
    name: "Mathematics Grade 10A",
    students: 28,
    subject: "Mathematics",
    nextClass: "Tomorrow 9:00 AM",
  },
  {
    id: "MATH-102",
    name: "Mathematics Grade 10B",
    students: 25,
    subject: "Mathematics",
    nextClass: "Friday 10:30 AM",
  },
  {
    id: "MATH-103",
    name: "Mathematics Grade 11A",
    students: 22,
    subject: "Mathematics",
    nextClass: "Monday 2:00 PM",
  },
  {
    id: "MATH-104",
    name: "Mathematics Grade 11B",
    students: 26,
    subject: "Mathematics",
    nextClass: "Wednesday 11:00 AM",
  },
]

const assignments = [
  {
    title: "Algebra Problem Set",
    class: "Grade 10A",
    dueDate: "2024-01-20",
    submitted: 24,
    total: 28,
    status: "active",
  },
  {
    title: "Geometry Quiz",
    class: "Grade 10B",
    dueDate: "2024-01-18",
    submitted: 22,
    total: 25,
    status: "grading",
  },
  {
    title: "Calculus Introduction",
    class: "Grade 11A",
    dueDate: "2024-01-25",
    submitted: 18,
    total: 22,
    status: "draft",
  },
]

const attendanceData = [
  { class: "Grade 10A", present: 26, absent: 2, percentage: 93 },
  { class: "Grade 10B", present: 23, absent: 2, percentage: 92 },
  { class: "Grade 11A", present: 20, absent: 2, percentage: 91 },
  { class: "Grade 11B", present: 24, absent: 2, percentage: 92 },
]

export function ClassManagement() {
  return (
    <div className="space-y-6">
      <Tabs defaultValue="classes" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="classes">My Classes</TabsTrigger>
          <TabsTrigger value="assignments">Assignments</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
        </TabsList>

        <TabsContent value="classes" className="space-y-4 mt-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Class Overview</h3>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Assignment
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {classes.map((classItem) => (
              <Card key={classItem.id}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{classItem.name}</CardTitle>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    {classItem.students} students
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4" />
                      Next: {classItem.nextClass}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        View Students
                      </Button>
                      <Button variant="outline" size="sm">
                        Mark Attendance
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="assignments" className="space-y-4 mt-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Assignment Management</h3>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Assignment
            </Button>
          </div>
          <div className="space-y-4">
            {assignments.map((assignment, index) => (
              <Card key={index}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium">{assignment.title}</h4>
                      <p className="text-sm text-muted-foreground">
                        {assignment.class} • Due: {assignment.dueDate}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Submitted: {assignment.submitted}/{assignment.total}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          assignment.status === "active"
                            ? "default"
                            : assignment.status === "grading"
                            ? "secondary"
                            : "outline"
                        }
                      >
                        {assignment.status}
                      </Badge>
                      <Button variant="outline" size="sm">
                        {assignment.status === "grading" ? "Grade" : "View"}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="attendance" className="space-y-4 mt-4">
          <h3 className="text-lg font-semibold">Today's Attendance</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {attendanceData.map((data, index) => (
              <Card key={index}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{data.class}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span>Present:</span>
                      <span className="font-medium text-green-600">{data.present}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Absent:</span>
                      <span className="font-medium text-red-600">{data.absent}</span>
                    </div>
                    <div className="flex justify-between text-sm font-medium">
                      <span>Attendance Rate:</span>
                      <span>{data.percentage}%</span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full"
                        style={{ width: `${data.percentage}%` }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
