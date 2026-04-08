'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Users, BookOpen, Clock, TrendingUp, Plus, CheckCircle, AlertCircle, Calendar, Award, Microscope, FileText } from 'lucide-react';

export default function UniversityTeacherDashboard() {
  const [stats, setStats] = useState({
    totalStudents: 180,
    coursesThisSemester: 3,
    researchProjects: 2,
    publicationsThisYear: 5,
    averageGradeGPA: 3.2,
    officeHours: 12,
    pendingGrading: 45,
  });

  const [currentSemester] = useState([
    { course: 'Data Structures & Algorithms', code: 'CS301', enrolled: 85, credits: 3, schedule: 'MWF 10:00-11:30' },
    { course: 'Database Systems', code: 'CS305', enrolled: 72, credits: 3, schedule: 'TTh 13:00-14:30' },
    { course: 'Software Engineering', code: 'CS401', enrolled: 65, credits: 4, schedule: 'MWF 14:00-15:30' },
  ]);

  const [researchProjects] = useState([
    { title: 'AI in Healthcare', status: 'active', funding: 150000, deadline: '2024-12-31', team: 4 },
    { title: 'Blockchain Security', status: 'review', funding: 80000, deadline: '2024-08-15', team: 3 },
  ]);

  const [upcomingDeadlines] = useState([
    { type: 'assignment', course: 'CS301', title: 'Algorithm Analysis', due: '2024-03-25', submissions: 72 },
    { type: 'exam', course: 'CS305', title: 'Mid-term Exam', due: '2024-04-02', students: 72 },
    { type: 'project', course: 'CS401', title: 'Software Design Project', due: '2024-04-15', submissions: 58 },
    { type: 'research', title: 'Conference Paper Submission', due: '2024-03-30', status: 'draft' },
  ]);

  const [studentPerformance] = useState([
    { course: 'CS301', average: 78, highest: 95, lowest: 62, passRate: 88 },
    { course: 'CS305', average: 82, highest: 98, lowest: 68, passRate: 92 },
    { course: 'CS401', average: 75, highest: 92, lowest: 58, passRate: 85 },
  ]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">University Faculty Dashboard</h1>
            <p className="text-slate-400">Professor • Computer Science Department</p>
          </div>
          <Button className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Create Assignment
          </Button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium text-slate-200">Total Students</CardTitle>
              <Users className="h-4 w-4 text-blue-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{stats.totalStudents}</div>
              <p className="text-xs text-slate-400 mt-2">This semester</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium text-slate-200">Courses Teaching</CardTitle>
              <BookOpen className="h-4 w-4 text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{stats.coursesThisSemester}</div>
              <p className="text-xs text-slate-400 mt-2">This semester</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium text-slate-200">Research Projects</CardTitle>
              <Microscope className="h-4 w-4 text-purple-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{stats.researchProjects}</div>
              <p className="text-xs text-slate-400 mt-2">Active projects</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium text-slate-200">Publications</CardTitle>
              <FileText className="h-4 w-4 text-yellow-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{stats.publicationsThisYear}</div>
              <p className="text-xs text-slate-400 mt-2">This year</p>
            </CardContent>
          </Card>
        </div>

        {/* University Teacher Tabs */}
        <Tabs defaultValue="courses" className="w-full">
          <TabsList className="bg-slate-800/50 border border-slate-700 mb-6">
            <TabsTrigger value="courses" className="text-slate-300 data-[state=active]:text-white">
              My Courses
            </TabsTrigger>
            <TabsTrigger value="grading" className="text-slate-300 data-[state=active]:text-white">
              Grading & Assessment
            </TabsTrigger>
            <TabsTrigger value="research" className="text-slate-300 data-[state=active]:text-white">
              Research & Publications
            </TabsTrigger>
            <TabsTrigger value="schedule" className="text-slate-300 data-[state=active]:text-white">
              Office Hours & Schedule
            </TabsTrigger>
            <TabsTrigger value="students" className="text-slate-300 data-[state=active]:text-white">
              Student Advising
            </TabsTrigger>
            <TabsTrigger value="conferences" className="text-slate-300 data-[state=active]:text-white">
              Conferences & Events
            </TabsTrigger>
            <TabsTrigger value="resources" className="text-slate-300 data-[state=active]:text-white">
              Teaching Resources
            </TabsTrigger>
          </TabsList>

          <TabsContent value="courses" className="space-y-6">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Current Semester Courses</CardTitle>
                <CardDescription className="text-slate-400">Courses you're teaching this semester</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {currentSemester.map((course, i) => (
                    <div key={i} className="p-4 bg-slate-700/30 rounded-lg border border-slate-600/30">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="text-sm font-semibold text-white">{course.course}</p>
                          <p className="text-xs text-slate-400">{course.code} • {course.credits} credits</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-slate-400">Enrolled</p>
                          <p className="text-sm font-semibold text-white">{course.enrolled} students</p>
                        </div>
                      </div>
                      <p className="text-xs text-slate-400 mb-3">Schedule: {course.schedule}</p>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="border-slate-600 text-slate-300">
                          Course Materials
                        </Button>
                        <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                          Grade Book
                        </Button>
                        <Button size="sm" variant="outline" className="border-slate-600 text-slate-300">
                          Student List
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="grading">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Grading & Assessment Management</CardTitle>
                <CardDescription className="text-slate-400">Assignments, exams, projects, and grade management</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {upcomingDeadlines.map((deadline, i) => (
                    <div key={i} className="p-4 bg-slate-700/30 rounded-lg border border-slate-600/30">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="text-sm font-semibold text-white">{deadline.title}</p>
                          <p className="text-xs text-slate-400">
                            {deadline.course && `${deadline.course} • `}
                            Due: {deadline.due}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            deadline.type === 'exam' ? 'bg-red-900/30 text-red-300 border border-red-800/50' :
                            deadline.type === 'assignment' ? 'bg-blue-900/30 text-blue-300 border border-blue-800/50' :
                            deadline.type === 'project' ? 'bg-purple-900/30 text-purple-300 border border-purple-800/50' :
                            'bg-green-900/30 text-green-300 border border-green-800/50'
                          }`}>
                            {deadline.type === 'exam' ? '📝 Exam' :
                             deadline.type === 'assignment' ? '📄 Assignment' :
                             deadline.type === 'project' ? '🎯 Project' : '📚 Research'}
                          </span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <p className="text-xs text-slate-400">
                          {deadline.submissions ? `${deadline.submissions} submissions` :
                           deadline.students ? `${deadline.students} students` :
                           deadline.status}
                        </p>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" className="border-slate-600 text-slate-300">
                            View Submissions
                          </Button>
                          <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                            Grade
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="research">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Research Projects & Publications</CardTitle>
                <CardDescription className="text-slate-400">Active research, publications, and academic contributions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {researchProjects.map((project, i) => (
                    <div key={i} className="p-4 bg-slate-700/30 rounded-lg border border-slate-600/30">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="text-sm font-semibold text-white">{project.title}</p>
                          <p className="text-xs text-slate-400">Team: {project.team} members • Deadline: {project.deadline}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-slate-400">Funding</p>
                          <p className="text-sm font-semibold text-green-400">GHS {project.funding.toLocaleString()}</p>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          project.status === 'active' ? 'bg-green-900/30 text-green-300 border border-green-800/50' :
                          'bg-yellow-900/30 text-yellow-300 border border-yellow-800/50'
                        }`}>
                          {project.status === 'active' ? 'Active' : 'Under Review'}
                        </span>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" className="border-slate-600 text-slate-300">
                            View Details
                          </Button>
                          <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                            Update Progress
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="schedule">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Office Hours & Schedule</CardTitle>
                <CardDescription className="text-slate-400">Teaching schedule, office hours, and academic commitments</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-slate-400">Office hours and schedule management interface will be displayed here</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="students">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Student Advising & Mentoring</CardTitle>
                <CardDescription className="text-slate-400">Academic advising, career counseling, and student support</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-slate-400">Student advising interface will be displayed here</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="conferences">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Conferences & Academic Events</CardTitle>
                <CardDescription className="text-slate-400">Conference presentations, workshops, and academic networking</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-slate-400">Conferences and events interface will be displayed here</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="resources">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Teaching Resources & Materials</CardTitle>
                <CardDescription className="text-slate-400">Lecture notes, presentations, assignments, and educational content</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-slate-400">Teaching resources interface will be displayed here</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
