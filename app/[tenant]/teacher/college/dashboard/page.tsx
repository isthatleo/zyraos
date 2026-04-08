'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Users, BookOpen, Clock, TrendingUp, Plus, CheckCircle, AlertCircle, Calendar, Briefcase, Award } from 'lucide-react';

export default function CollegeTeacherDashboard() {
  const [stats, setStats] = useState({
    totalStudents: 95,
    coursesThisSemester: 3,
    pendingAssignments: 28,
    averageScore: 76,
    internshipPlacements: 12,
    projectSubmissions: 18,
  });

  const [currentSemester] = useState([
    { course: 'Business Administration', code: 'BUS301', enrolled: 45, schedule: 'MWF 09:00-10:30', type: 'lecture' },
    { course: 'IT & Computing', code: 'ITC205', enrolled: 35, schedule: 'TTh 11:00-12:30', type: 'practical' },
    { course: 'Project Management', code: 'PMT401', enrolled: 25, schedule: 'MWF 14:00-15:30', type: 'seminar' },
  ]);

  const [upcomingDeadlines] = useState([
    { course: 'BUS301', assignment: 'Business Plan Project', due: '2024-03-25', submissions: 32, total: 45 },
    { course: 'ITC205', assignment: 'Database Design Assignment', due: '2024-03-28', submissions: 28, total: 35 },
    { course: 'PMT401', assignment: 'Final Project Presentation', due: '2024-04-05', submissions: 18, total: 25 },
  ]);

  const [internshipSupervision] = useState([
    { student: 'John Mensah', company: 'Tech Solutions Ltd', progress: 75, nextCheck: '2024-03-20' },
    { student: 'Sarah Addo', company: 'Business Corp', progress: 60, nextCheck: '2024-03-22' },
    { student: 'Michael Osei', company: 'IT Services Inc', progress: 85, nextCheck: '2024-03-25' },
  ]);

  const [industryVisits] = useState([
    { company: 'Tech Solutions Ltd', date: '2024-03-28', students: 15, purpose: 'Industry Exposure' },
    { company: 'Business Corp', date: '2024-04-10', students: 20, purpose: 'Guest Lecture' },
  ]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">College Faculty Dashboard</h1>
            <p className="text-slate-400">Diploma & Certificate Programs • Business & Technology</p>
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
              <p className="text-xs text-slate-400 mt-2">Across all courses</p>
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
              <CardTitle className="text-sm font-medium text-slate-200">Pending Grading</CardTitle>
              <Clock className="h-4 w-4 text-yellow-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{stats.pendingAssignments}</div>
              <p className="text-xs text-slate-400 mt-2">Assignments to grade</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium text-slate-200">Internship Placements</CardTitle>
              <Briefcase className="h-4 w-4 text-purple-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{stats.internshipPlacements}</div>
              <p className="text-xs text-slate-400 mt-2">Students placed</p>
            </CardContent>
          </Card>
        </div>

        {/* College Teacher Tabs */}
        <Tabs defaultValue="courses" className="w-full">
          <TabsList className="bg-slate-800/50 border border-slate-700 mb-6">
            <TabsTrigger value="courses" className="text-slate-300 data-[state=active]:text-white">
              My Courses
            </TabsTrigger>
            <TabsTrigger value="grading" className="text-slate-300 data-[state=active]:text-white">
              Grading & Assessment
            </TabsTrigger>
            <TabsTrigger value="internships" className="text-slate-300 data-[state=active]:text-white">
              Internship Supervision
            </TabsTrigger>
            <TabsTrigger value="industry" className="text-slate-300 data-[state=active]:text-white">
              Industry Partnerships
            </TabsTrigger>
            <TabsTrigger value="projects" className="text-slate-300 data-[state=active]:text-white">
              Student Projects
            </TabsTrigger>
            <TabsTrigger value="placements" className="text-slate-300 data-[state=active]:text-white">
              Career Services
            </TabsTrigger>
            <TabsTrigger value="resources" className="text-slate-300 data-[state=active]:text-white">
              Teaching Resources
            </TabsTrigger>
          </TabsList>

          <TabsContent value="courses" className="space-y-6">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Current Semester Courses</CardTitle>
                <CardDescription className="text-slate-400">Your courses and enrollment numbers</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {currentSemester.map((course, i) => (
                    <div key={i} className="p-4 bg-slate-700/30 rounded-lg border border-slate-600/30">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="text-sm font-semibold text-white">{course.course}</p>
                          <p className="text-xs text-slate-400">{course.code} • {course.enrolled} students</p>
                        </div>
                        <div className="text-right">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            course.type === 'lecture' ? 'bg-blue-900/30 text-blue-300 border border-blue-800/50' :
                            course.type === 'practical' ? 'bg-green-900/30 text-green-300 border border-green-800/50' :
                            'bg-purple-900/30 text-purple-300 border border-purple-800/50'
                          }`}>
                            {course.type === 'lecture' ? '📚 Lecture' :
                             course.type === 'practical' ? '🔧 Practical' : '💬 Seminar'}
                          </span>
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
                <CardDescription className="text-slate-400">Track submissions, deadlines, and grading progress</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {upcomingDeadlines.map((deadline, i) => (
                    <div key={i} className="p-4 bg-slate-700/30 rounded-lg border border-slate-600/30">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="text-sm font-semibold text-white">{deadline.assignment}</p>
                          <p className="text-xs text-slate-400">{deadline.course} • Due: {deadline.due}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-white">{deadline.submissions}/{deadline.total}</p>
                          <p className="text-xs text-slate-400">submitted</p>
                        </div>
                      </div>
                      <div className="w-full bg-slate-600 rounded-full h-2 mb-3">
                        <div
                          className="bg-blue-500 h-2 rounded-full"
                          style={{ width: `${(deadline.submissions/deadline.total)*100}%` }}
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="border-slate-600 text-slate-300">
                          View Submissions
                        </Button>
                        <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                          Grade All
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="internships">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Internship Supervision</CardTitle>
                <CardDescription className="text-slate-400">Monitor student internships and provide guidance</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {internshipSupervision.map((internship, i) => (
                    <div key={i} className="p-4 bg-slate-700/30 rounded-lg border border-slate-600/30">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="text-sm font-semibold text-white">{internship.student}</p>
                          <p className="text-xs text-slate-400">{internship.company}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-slate-400">Progress</p>
                          <p className="text-sm font-semibold text-white">{internship.progress}%</p>
                        </div>
                      </div>
                      <div className="w-full bg-slate-600 rounded-full h-2 mb-3">
                        <div
                          className="bg-blue-500 h-2 rounded-full"
                          style={{ width: `${internship.progress}%` }}
                        />
                      </div>
                      <p className="text-xs text-slate-400 mb-3">Next check-in: {internship.nextCheck}</p>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="border-slate-600 text-slate-300">
                          View Report
                        </Button>
                        <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                          Schedule Meeting
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="industry">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Industry Partnerships & Visits</CardTitle>
                <CardDescription className="text-slate-400">Coordinate industry visits, guest lectures, and partnerships</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {industryVisits.map((visit, i) => (
                    <div key={i} className="p-4 bg-slate-700/30 rounded-lg border border-slate-600/30">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="text-sm font-semibold text-white">{visit.company}</p>
                          <p className="text-xs text-slate-400">{visit.purpose} • {visit.students} students</p>
                        </div>
                        <Calendar className="h-5 w-5 text-blue-400" />
                      </div>
                      <p className="text-xs text-slate-400 mb-3">Date: {visit.date}</p>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="border-slate-600 text-slate-300">
                          View Details
                        </Button>
                        <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                          Manage Attendance
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="projects">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Student Projects & Capstone Work</CardTitle>
                <CardDescription className="text-slate-400">Monitor project progress and provide feedback</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-slate-400">Student projects management interface will be displayed here</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="placements">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Career Services & Job Placements</CardTitle>
                <CardDescription className="text-slate-400">Support students with career guidance and job placement</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-slate-400">Career services interface will be displayed here</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="resources">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Teaching Resources & Materials</CardTitle>
                <CardDescription className="text-slate-400">Access course materials, industry resources, and teaching aids</CardDescription>
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
