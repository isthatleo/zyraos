import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const subjects = [
  {
    name: "Mathematics",
    teacher: "Mr. Johnson",
    progress: 78,
  },
  {
    name: "English",
    teacher: "Ms. Davis",
    progress: 92,
  },
  {
    name: "Science",
    teacher: "Dr. Wilson",
    progress: 85,
  },
  {
    name: "History",
    teacher: "Mrs. Brown",
    progress: 88,
  },
]

const assessments = [
  { subject: "Math", assessment: "Algebra Test", type: "Assignment", score: 78 },
  { subject: "English", assessment: "Essay Writing", type: "Midterm", score: 92 },
  { subject: "Science", assessment: "Lab Report", type: "Assignment", score: 85 },
  { subject: "History", assessment: "World War II Quiz", type: "Midterm", score: 88 },
]

const recentGrades = [
  { subject: "Mathematics", exam: "Algebra Test", type: "Assignment", score: 78 },
  { subject: "English", exam: "Essay Writing", type: "Midterm", score: 92 },
  { subject: "Science", exam: "Lab Report", type: "Assignment", score: 85 },
  { subject: "History", exam: "World War II Quiz", type: "Midterm", score: 88 },
]

export function RecentGrades() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Academic Overview</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="subjects" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="subjects">My Subjects</TabsTrigger>
            <TabsTrigger value="assessments">Assessments</TabsTrigger>
          </TabsList>

          <TabsContent value="subjects" className="space-y-4 mt-4">
            {subjects.map((subject, index) => (
              <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <h4 className="font-medium">{subject.name}</h4>
                  <p className="text-sm text-muted-foreground">{subject.teacher}</p>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium">{subject.progress}%</div>
                  <div className="w-20 bg-secondary rounded-full h-2 mt-1">
                    <div
                      className="bg-primary h-2 rounded-full"
                      style={{ width: `${subject.progress}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="assessments" className="mt-4">
            <div className="space-y-4">
              {assessments.map((assessment, index) => (
                <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-medium">{assessment.subject}</h4>
                    <p className="text-sm text-muted-foreground">{assessment.assessment}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={assessment.type === "Assignment" ? "secondary" : "outline"}>
                      {assessment.type}
                    </Badge>
                    <span className="font-medium">{assessment.score}%</span>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
