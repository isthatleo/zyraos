'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Users, BookOpen, Clock, TrendingUp, Plus, CheckCircle, AlertCircle, Calendar, Trophy, Music } from 'lucide-react';

export default function SecondaryTeacherDashboard() {
  const [stats, setStats] = useState({
    totalStudents: 145,
    classesToday: 5,
    pendingAssignments: 12,
    attendanceMarked: 92,
    averageScore: 75,
    upcomingExams: 3,
    clubActivities: 2,
  });

  const [todaySchedule] = useState([
    { time: '08:00-09:00', subject: 'Mathematics', class: 'JHS 2A', room: '201', status: 'completed' },
    { time: '09:00-10:00', subject: 'English Literature', class: 'JHS 2A', room: '201', status: 'in-progress' },
    { time: '10:30-11:30', subject: 'Integrated Science', class: 'JHS 2B', room: '202', status: 'upcoming' },
    { time: '11:30-12:30', subject: 'Social Studies', class: 'JHS 2B', room: '202', status: 'upcoming' },
    { time: '14:00-15:00', subject: 'French', class: 'JHS 2C', room: '203', status: 'upcoming' },
  ]);

  const [classPerformance] = useState([
    { class: 'JHS 2A', average: 78, highest: 95, lowest: 65, attendance: 94 },
    { class: 'JHS 2B', average: 82, highest: 98, lowest: 68, attendance: 91 },
    { class: 'JHS 2C', average: 75, highest: 92, lowest: 62, attendance: 89 },
  ]);

  const [upcomingAssessments] = useState([
    { subject: 'Mathematics', title: 'Algebra Mid-term', date: '2024-03-25', class: 'JHS 2A', type: 'exam' },
    { subject: 'English', title: 'Literature Essay', date: '2024-03-28', class: 'JHS 2B', type: 'assignment' },
    { subject: 'Science', title: 'Physics Lab Report', date: '2024-04-02', class: 'JHS 2C', type: 'project' },
  ]);

  const [clubActivities] = useState([
    { club: 'Debate Club', time: 'Wed 15:00', students: 18, nextEvent: 'Regional Competition' },
    { club: 'Science Club', time: 'Fri 14:00', students: 22, nextEvent: 'Science Fair Prep' },
  ]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Secondary Teacher Workspace</h1>
            <p className="text-slate-400">JHS 1-3 & SHS 1-3 • Middle & High School Education</p>
          </div>
          <Button className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Create Assessment
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
              <p className="text-xs text-slate-400 mt-2">Assessments to grade</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium text-slate-200">Club Activities</CardTitle>
              <Music className="h-4 w-4 text-purple-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{stats.clubActivities}</div>
              <p className="text-xs text-slate-400 mt-2">Active clubs</p>
            </CardContent>
          </Card>
        </div>

        {/* Secondary Teacher Tabs */}
        <Tabs defaultValue="schedule" className="w-full">
          <TabsList className="bg-slate-800/50 border border-slate-700 mb-6">
            <TabsTrigger value="schedule" className="text-slate-300 data-[state=active]:text-white">
              Daily Schedule
            </TabsTrigger>
            <TabsTrigger value="classes" className="text-slate-300 data-[state=active]:text-white">
              My Classes
            </TabsTrigger>
            <TabsTrigger value="assessments" className="text-slate-300 data-[state=active]:text-white">
              Assessments & Exams
            </TabsTrigger>
            <TabsTrigger value="performance" className="text-slate-300 data-[state=active]:text-white">
              Class Performance
            </TabsTrigger>
            <TabsTrigger value="clubs" className="text-slate-300 data-[state=active]:text-white">
              Club Activities
            </TabsTrigger>
            <TabsTrigger value="counseling" className="text-slate-300 data-[state=active]:text-white">
              Student Counseling
            </TabsTrigger>
            <TabsTrigger value="resources" className="text-slate-300 data-[state=active]:text-white">
              Teaching Resources
            </TabsTrigger>
          </TabsList>

          <TabsContent value="schedule" className="space-y-6">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Today's Teaching Schedule</CardTitle>
                <CardDescription className="text-slate-400">Your classes, assessments, and activities for today</CardDescription>
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
                      <div className="flex-shrink-0 flex gap-2">
                        {session.status === 'upcoming' && (
                          <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                            Start Class
                          </Button>
                        )}
                        {session.status === 'in-progress' && (
                          <>
                            <Button size="sm" className="bg-green-600 hover:bg-green-700">
                              Mark Attendance
                            </Button>
                            <Button size="sm" variant="outline" className="border-slate-600 text-slate-300">
                              Take Notes
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="classes">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">My Classes Overview</CardTitle>
                <CardDescription className="text-slate-400">Performance summary for all your classes</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {classPerformance.map((cls, i) => (
                    <div key={i} className="p-4 bg-slate-700/30 rounded-lg border border-slate-600/30">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="text-sm font-semibold text-white">{cls.class}</p>
                          <p className="text-xs text-slate-400">Mathematics Teacher</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-slate-400">Attendance</p>
                          <p className="text-sm font-semibold text-white">{cls.attendance}%</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                          <p className="text-xs text-slate-400">Class Average</p>
                          <p className="text-sm font-semibold text-white">{cls.average}%</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-400">Highest Score</p>
                          <p className="text-sm font-semibold text-green-400">{cls.highest}%</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-400">Lowest Score</p>
                          <p className="text-sm font-semibold text-red-400">{cls.lowest}%</p>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-3">
                        <Button size="sm" variant="outline" className="border-slate-600 text-slate-300">
                          View Students
                        </Button>
                        <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                          Grade Book
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="assessments">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Upcoming Assessments</CardTitle>
                <CardDescription className="text-slate-400">Exams, assignments, and projects that need attention</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {upcomingAssessments.map((assessment, i) => (
                    <div key={i} className="p-4 bg-slate-700/30 rounded-lg border border-slate-600/30">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="text-sm font-semibold text-white">{assessment.title}</p>
                          <p className="text-xs text-slate-400">{assessment.subject} • {assessment.class}</p>
                        </div>
                        <div className="text-right">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            assessment.type === 'exam' ? 'bg-red-900/30 text-red-300 border border-red-800/50' :
                            assessment.type === 'assignment' ? 'bg-blue-900/30 text-blue-300 border border-blue-800/50' :
                            'bg-purple-900/30 text-purple-300 border border-purple-800/50'
                          }`}>
                            {assessment.type === 'exam' ? '📝 Exam' :
                             assessment.type === 'assignment' ? '📄 Assignment' : '🎯 Project'}
                          </span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <p className="text-xs text-slate-400">Due: {assessment.date}</p>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" className="border-slate-600 text-slate-300">
                            View Details
                          </Button>
                          <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                            Prepare
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="performance">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Class Performance Analytics</CardTitle>
                <CardDescription className="text-slate-400">Detailed performance tracking and student progress analysis</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-slate-400">Class performance analytics interface will be displayed here</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="clubs">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Club Activities</CardTitle>
                <CardDescription className="text-slate-400">Debate club, science club, sports teams, and extracurricular activities</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {clubActivities.map((club, i) => (
                    <div key={i} className="p-4 bg-slate-700/30 rounded-lg border border-slate-600/30">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="text-sm font-semibold text-white">{club.club}</p>
                          <p className="text-xs text-slate-400">{club.time} • {club.students} students</p>
                        </div>
                        <Trophy className="h-5 w-5 text-yellow-400" />
                      </div>
                      <p className="text-xs text-slate-400 mb-3">Next: {club.nextEvent}</p>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="border-slate-600 text-slate-300">
                          View Members
                        </Button>
                        <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                          Plan Activity
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="counseling">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Student Counseling</CardTitle>
                <CardDescription className="text-slate-400">Career guidance, academic counseling, and student support services</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-slate-400">Student counseling interface will be displayed here</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="resources">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Teaching Resources</CardTitle>
                <CardDescription className="text-slate-400">Lesson plans, worksheets, multimedia content, and educational materials</CardDescription>
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
