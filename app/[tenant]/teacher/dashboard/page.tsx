'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Users, BookOpen, Clock, TrendingUp, Plus } from 'lucide-react';

export default function TeacherDashboard() {
  const [classes] = useState([
    { id: '1', name: 'Class 10A', subject: 'Mathematics', students: 42, periods: 4 },
    { id: '2', name: 'Class 10B', subject: 'Mathematics', students: 40, periods: 4 },
    { id: '3', name: 'Class 9A', subject: 'Mathematics', students: 38, periods: 3 },
  ]);

  const [studentPerformance] = useState([
    { name: 'John Doe', score: 85, attendance: 95, assignments: '22/24' },
    { name: 'Jane Smith', score: 92, attendance: 100, assignments: '24/24' },
    { name: 'Mike Johnson', score: 78, attendance: 88, assignments: '20/24' },
    { name: 'Sarah Lee', score: 88, attendance: 96, assignments: '23/24' },
  ]);

  const [classPerformance] = useState([
    { class: '10A', avg: 82, passed: 40, failed: 2 },
    { class: '10B', avg: 79, passed: 38, failed: 2 },
    { class: '9A', avg: 76, passed: 35, failed: 3 },
  ]);

  const [upcomingClasses] = useState([
    { time: '09:00', class: 'Class 10A', subject: 'Algebra', room: '101' },
    { time: '10:00', class: 'Class 10B', subject: 'Geometry', room: '102' },
    { time: '11:30', class: 'Class 9A', subject: 'Basics', room: '103' },
  ]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Teacher Workspace</h1>
            <p className="text-slate-400">Manage classes, grades, and student progress</p>
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
              <CardTitle className="text-sm font-medium text-slate-200">Classes</CardTitle>
              <BookOpen className="h-4 w-4 text-blue-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{classes.length}</div>
              <p className="text-xs text-slate-400 mt-2">Total classes</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium text-slate-200">Students</CardTitle>
              <Users className="h-4 w-4 text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">120</div>
              <p className="text-xs text-slate-400 mt-2">Total students</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium text-slate-200">Average Score</CardTitle>
              <TrendingUp className="h-4 w-4 text-purple-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">81.3%</div>
              <p className="text-xs text-slate-400 mt-2">Across all classes</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium text-slate-200">Pending Grading</CardTitle>
              <Clock className="h-4 w-4 text-yellow-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">12</div>
              <p className="text-xs text-slate-400 mt-2">Assignments</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="classes" className="w-full">
          <TabsList className="bg-slate-800/50 border border-slate-700 mb-6">
            <TabsTrigger value="classes" className="text-slate-300 data-[state=active]:text-white">
              My Classes
            </TabsTrigger>
            <TabsTrigger value="performance" className="text-slate-300 data-[state=active]:text-white">
              Performance
            </TabsTrigger>
            <TabsTrigger value="grading" className="text-slate-300 data-[state=active]:text-white">
              Grading
            </TabsTrigger>
            <TabsTrigger value="schedule" className="text-slate-300 data-[state=active]:text-white">
              Schedule
            </TabsTrigger>
            <TabsTrigger value="resources" className="text-slate-300 data-[state=active]:text-white">
              Resources
            </TabsTrigger>
          </TabsList>

          <TabsContent value="classes" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {classes.map((cls) => (
                <Card key={cls.id} className="bg-slate-800/50 border-slate-700 backdrop-blur">
                  <CardHeader>
                    <CardTitle className="text-white">{cls.name}</CardTitle>
                    <CardDescription className="text-slate-400">{cls.subject}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-slate-400">Students:</span>
                        <span className="text-sm font-semibold text-white">{cls.students}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-slate-400">Periods/Week:</span>
                        <span className="text-sm font-semibold text-white">{cls.periods}</span>
                      </div>
                    </div>
                    <div className="mt-4 flex gap-2">
                      <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white flex-1">
                        View Details
                      </Button>
                      <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white flex-1">
                        Grade Book
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="performance">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Class Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={classPerformance}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                    <XAxis stroke="#94a3b8" dataKey="class" />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }} />
                    <Legend />
                    <Bar dataKey="avg" fill="#3B82F6" name="Average Score" />
                    <Bar dataKey="passed" fill="#10B981" name="Passed" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="grading">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Student Grades (Class 10A)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-700">
                        <th className="px-4 py-3 text-left text-slate-300 font-semibold">Student</th>
                        <th className="px-4 py-3 text-left text-slate-300 font-semibold">Score</th>
                        <th className="px-4 py-3 text-left text-slate-300 font-semibold">Attendance</th>
                        <th className="px-4 py-3 text-left text-slate-300 font-semibold">Assignments</th>
                      </tr>
                    </thead>
                    <tbody>
                      {studentPerformance.map((student, i) => (
                        <tr key={i} className="border-b border-slate-700/50 hover:bg-slate-700/20">
                          <td className="px-4 py-3 text-white">{student.name}</td>
                          <td className="px-4 py-3 text-slate-400">{student.score}%</td>
                          <td className="px-4 py-3 text-slate-400">{student.attendance}%</td>
                          <td className="px-4 py-3 text-slate-400">{student.assignments}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="schedule">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Today's Classes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {upcomingClasses.map((cls, i) => (
                    <div key={i} className="p-4 bg-slate-700/30 rounded-lg border border-slate-600/30 flex gap-4">
                      <div className="flex-shrink-0">
                        <p className="text-sm font-semibold text-blue-400">{cls.time}</p>
                      </div>
                      <div className="flex-grow">
                        <p className="text-sm font-semibold text-white">{cls.class} - {cls.subject}</p>
                        <p className="text-xs text-slate-400">Room {cls.room}</p>
                      </div>
                      <Button size="sm" className="bg-blue-600 hover:bg-blue-700">Mark Attendance</Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="resources">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Teaching Resources</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-400">Resource management interface will be displayed here</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

