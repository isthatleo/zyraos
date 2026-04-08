'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Users, BookOpen, Clock, TrendingUp, Plus, CheckCircle, AlertCircle, Calendar } from 'lucide-react';

export default function PrimaryTeacherDashboard() {
  const [stats, setStats] = useState({
    totalStudents: 42,
    classesToday: 4,
    pendingAssignments: 8,
    attendanceMarked: 95,
    averageScore: 78,
    parentMessages: 3,
  });

  const [todaySchedule] = useState([
    { time: '08:00-09:00', subject: 'Mathematics', class: 'Grade 2A', room: '101', status: 'completed' },
    { time: '09:00-10:00', subject: 'English', class: 'Grade 2A', room: '101', status: 'in-progress' },
    { time: '10:30-11:30', subject: 'Science', class: 'Grade 2B', room: '102', status: 'upcoming' },
    { time: '11:30-12:30', subject: 'Social Studies', class: 'Grade 2B', room: '102', status: 'upcoming' },
  ]);

  const [studentPerformance] = useState([
    { name: 'Sarah Johnson', math: 85, english: 88, science: 82, attendance: 95 },
    { name: 'Michael Brown', math: 78, english: 85, science: 79, attendance: 92 },
    { name: 'Emily Davis', math: 92, english: 89, science: 88, attendance: 98 },
    { name: 'James Wilson', math: 76, english: 82, science: 75, attendance: 88 },
  ]);

  const [assignments] = useState([
    { subject: 'Mathematics', title: 'Addition & Subtraction', dueDate: '2024-03-20', submitted: 38, total: 42 },
    { subject: 'English', title: 'Reading Comprehension', dueDate: '2024-03-22', submitted: 35, total: 42 },
    { subject: 'Science', title: 'Plants & Animals', dueDate: '2024-03-18', submitted: 42, total: 42 },
  ]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Primary Teacher Workspace</h1>
            <p className="text-slate-400">Grades 1-6 • Elementary Education</p>
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
              <CardTitle className="text-sm font-medium text-slate-200">My Students</CardTitle>
              <Users className="h-4 w-4 text-blue-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{stats.totalStudents}</div>
              <p className="text-xs text-slate-400 mt-2">Across all classes</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium text-slate-200">Classes Today</CardTitle>
              <BookOpen className="h-4 w-4 text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{stats.classesToday}</div>
              <p className="text-xs text-slate-400 mt-2">Scheduled periods</p>
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
              <CardTitle className="text-sm font-medium text-slate-200">Class Average</CardTitle>
              <TrendingUp className="h-4 w-4 text-purple-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{stats.averageScore}%</div>
              <p className="text-xs text-slate-400 mt-2">Overall performance</p>
            </CardContent>
          </Card>
        </div>

        {/* Primary Teacher Tabs */}
        <Tabs defaultValue="today" className="w-full">
          <TabsList className="bg-slate-800/50 border border-slate-700 mb-6">
            <TabsTrigger value="today" className="text-slate-300 data-[state=active]:text-white">
              Today's Schedule
            </TabsTrigger>
            <TabsTrigger value="students" className="text-slate-300 data-[state=active]:text-white">
              My Students
            </TabsTrigger>
            <TabsTrigger value="assignments" className="text-slate-300 data-[state=active]:text-white">
              Assignments
            </TabsTrigger>
            <TabsTrigger value="progress" className="text-slate-300 data-[state=active]:text-white">
              Student Progress
            </TabsTrigger>
            <TabsTrigger value="communication" className="text-slate-300 data-[state=active]:text-white">
              Parent Communication
            </TabsTrigger>
            <TabsTrigger value="resources" className="text-slate-300 data-[state=active]:text-white">
              Teaching Resources
            </TabsTrigger>
          </TabsList>

          <TabsContent value="today" className="space-y-6">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Today's Teaching Schedule</CardTitle>
                <CardDescription className="text-slate-400">Your classes and activities for today</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {todaySchedule.map((session, i) => (
                    <div key={i} className="p-4 bg-slate-700/30 rounded-lg border border-slate-600/30 flex gap-4">
                      <div className="flex-shrink-0">
                        <p className="text-sm font-semibold text-blue-400">{session.time}</p>
                        <div className={`mt-2 px-2 py-1 rounded-full text-xs font-medium ${
                          session.status === 'completed' ? 'bg-green-900/30 text-green-300' :
                          session.status === 'in-progress' ? 'bg-blue-900/30 text-blue-300' :
                          'bg-gray-900/30 text-gray-300'
                        }`}>
                          {session.status === 'completed' ? '✓ Completed' :
                           session.status === 'in-progress' ? 'In Progress' : 'Upcoming'}
                        </div>
                      </div>
                      <div className="flex-grow">
                        <p className="text-sm font-semibold text-white">{session.subject}</p>
                        <p className="text-xs text-slate-400">{session.class} • Room {session.room}</p>
                      </div>
                      <div className="flex-shrink-0">
                        {session.status === 'upcoming' && (
                          <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                            Start Class
                          </Button>
                        )}
                        {session.status === 'in-progress' && (
                          <Button size="sm" className="bg-green-600 hover:bg-green-700">
                            Mark Attendance
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="students">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">My Students</CardTitle>
                <CardDescription className="text-slate-400">Student roster with quick access to profiles</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {studentPerformance.map((student, i) => (
                    <div key={i} className="p-4 bg-slate-700/30 rounded-lg border border-slate-600/30">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="text-sm font-semibold text-white">{student.name}</p>
                          <p className="text-xs text-slate-400">Grade 2A</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-slate-400">Attendance</p>
                          <p className="text-sm font-semibold text-white">{student.attendance}%</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                          <p className="text-xs text-slate-400">Math</p>
                          <p className="text-sm font-semibold text-white">{student.math}%</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-400">English</p>
                          <p className="text-sm font-semibold text-white">{student.english}%</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-400">Science</p>
                          <p className="text-sm font-semibold text-white">{student.science}%</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="assignments">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Assignment Management</CardTitle>
                <CardDescription className="text-slate-400">Create, track, and grade assignments</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {assignments.map((assignment, i) => (
                    <div key={i} className="p-4 bg-slate-700/30 rounded-lg border border-slate-600/30">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="text-sm font-semibold text-white">{assignment.title}</p>
                          <p className="text-xs text-slate-400">{assignment.subject} • Due: {assignment.dueDate}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-white">{assignment.submitted}/{assignment.total}</p>
                          <p className="text-xs text-slate-400">submitted</p>
                        </div>
                      </div>
                      <div className="w-full bg-slate-600 rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full"
                          style={{ width: `${(assignment.submitted/assignment.total)*100}%` }}
                        />
                      </div>
                      <div className="flex gap-2 mt-3">
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

          <TabsContent value="progress">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Student Progress Tracking</CardTitle>
                <CardDescription className="text-slate-400">Monitor individual student development and learning outcomes</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-slate-400">Student progress tracking interface will be displayed here</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="communication">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Parent Communication</CardTitle>
                <CardDescription className="text-slate-400">PTA meetings, progress reports, and parent-teacher conferences</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-slate-400">Parent communication interface will be displayed here</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="resources">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Teaching Resources</CardTitle>
                <CardDescription className="text-slate-400">Lesson plans, worksheets, educational materials, and teaching aids</CardDescription>
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
