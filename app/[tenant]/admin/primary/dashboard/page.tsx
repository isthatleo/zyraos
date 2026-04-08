'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Users, BookOpen, GraduationCap, TrendingUp, AlertCircle, CheckCircle, Clock, Plus } from 'lucide-react';

export default function PrimarySchoolAdminDashboard() {
  const [stats, setStats] = useState({
    totalStudents: 450,
    totalTeachers: 28,
    totalClasses: 18,
    attendanceRate: 94.5,
    activePrograms: 12,
    pendingAdmissions: 8,
  });

  const [performanceData] = useState([
    { class: 'Grade 1', avg: 82, students: 25 },
    { class: 'Grade 2', avg: 79, students: 24 },
    { class: 'Grade 3', avg: 85, students: 26 },
    { class: 'Grade 4', avg: 81, students: 23 },
    { class: 'Grade 5', avg: 83, students: 22 },
    { class: 'Grade 6', avg: 87, students: 20 },
  ]);

  const [classDistribution] = useState([
    { name: 'Grade 1-2', value: 49, color: '#3B82F6' },
    { name: 'Grade 3-4', value: 49, color: '#10B981' },
    { name: 'Grade 5-6', value: 42, color: '#F59E0B' },
  ]);

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-white mb-2">Primary School Administration</h1>
          <p className="text-slate-400">Managing Grades 1-6 • Ages 5-12</p>
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
              <p className="text-xs text-slate-400 mt-2">
                <span className="text-green-400 font-semibold">+12</span> from last term
              </p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium text-slate-200">Teaching Staff</CardTitle>
              <GraduationCap className="h-4 w-4 text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{stats.totalTeachers}</div>
              <p className="text-xs text-slate-400 mt-2">Class teachers + specialists</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium text-slate-200">Classes</CardTitle>
              <BookOpen className="h-4 w-4 text-yellow-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{stats.totalClasses}</div>
              <p className="text-xs text-slate-400 mt-2">Across all grades</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium text-slate-200">Attendance Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-purple-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{stats.attendanceRate}%</div>
              <p className="text-xs text-slate-400 mt-2">This term average</p>
            </CardContent>
          </Card>
        </div>

        {/* Primary School Specific Tabs */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="bg-slate-800/50 border border-slate-700 mb-6">
            <TabsTrigger value="overview" className="text-slate-300 data-[state=active]:text-white">
              School Overview
            </TabsTrigger>
            <TabsTrigger value="students" className="text-slate-300 data-[state=active]:text-white">
              Student Management
            </TabsTrigger>
            <TabsTrigger value="academics" className="text-slate-300 data-[state=active]:text-white">
              Academics
            </TabsTrigger>
            <TabsTrigger value="activities" className="text-slate-300 data-[state=active]:text-white">
              Activities & Programs
            </TabsTrigger>
            <TabsTrigger value="parents" className="text-slate-300 data-[state=active]:text-white">
              Parent Communication
            </TabsTrigger>
            <TabsTrigger value="reports" className="text-slate-300 data-[state=active]:text-white">
              Reports
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Grade Performance */}
              <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
                <CardHeader>
                  <CardTitle className="text-white">Grade-wise Performance</CardTitle>
                  <CardDescription className="text-slate-400">Average scores by grade level</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={performanceData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                      <XAxis stroke="#94a3b8" dataKey="class" />
                      <YAxis stroke="#94a3b8" />
                      <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }} />
                      <Bar dataKey="avg" fill="#3B82F6" name="Average Score %" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Class Distribution */}
              <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
                <CardHeader>
                  <CardTitle className="text-white">Student Distribution</CardTitle>
                  <CardDescription className="text-slate-400">By grade level groups</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {classDistribution.map((grade, i) => (
                      <div key={i}>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm text-slate-300">{grade.name}</span>
                          <span className="text-sm font-semibold text-white">{grade.value} students</span>
                        </div>
                        <div className="w-full bg-slate-700/50 rounded-full h-2">
                          <div
                            className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full"
                            style={{ width: `${(grade.value / stats.totalStudents) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions for Primary School */}
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Quick Actions</CardTitle>
                <CardDescription className="text-slate-400">Common primary school administrative tasks</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white flex flex-col items-center gap-2 h-20">
                    <Plus className="h-6 w-6" />
                    <span className="text-xs">New Admission</span>
                  </Button>
                  <Button className="bg-green-600 hover:bg-green-700 text-white flex flex-col items-center gap-2 h-20">
                    <CheckCircle className="h-6 w-6" />
                    <span className="text-xs">Mark Attendance</span>
                  </Button>
                  <Button className="bg-purple-600 hover:bg-purple-700 text-white flex flex-col items-center gap-2 h-20">
                    <BookOpen className="h-6 w-6" />
                    <span className="text-xs">View Reports</span>
                  </Button>
                  <Button className="bg-orange-600 hover:bg-orange-700 text-white flex flex-col items-center gap-2 h-20">
                    <Users className="h-6 w-6" />
                    <span className="text-xs">Parent Meeting</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="students">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Student Management</CardTitle>
                <CardDescription className="text-slate-400">Primary school student administration</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-slate-400">Primary school student management interface will be displayed here</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="academics">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Academic Management</CardTitle>
                <CardDescription className="text-slate-400">Curriculum, assessments, and academic tracking</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-slate-400">Primary school academic management interface will be displayed here</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activities">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Activities & Programs</CardTitle>
                <CardDescription className="text-slate-400">Sports, arts, and extracurricular activities</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-slate-400">Primary school activities management interface will be displayed here</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="parents">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Parent Communication</CardTitle>
                <CardDescription className="text-slate-400">PTA meetings, newsletters, and parent-teacher conferences</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-slate-400">Parent communication interface will be displayed here</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reports">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Reports & Analytics</CardTitle>
                <CardDescription className="text-slate-400">Academic reports, attendance reports, and school performance</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-slate-400">Primary school reporting interface will be displayed here</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
