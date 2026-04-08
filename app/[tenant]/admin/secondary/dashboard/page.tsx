'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Users, BookOpen, GraduationCap, TrendingUp, AlertCircle, CheckCircle, Clock, Plus, Trophy, Music } from 'lucide-react';

export default function SecondarySchoolAdminDashboard() {
  const [stats, setStats] = useState({
    totalStudents: 850,
    totalTeachers: 45,
    totalClasses: 32,
    attendanceRate: 91.2,
    activeClubs: 18,
    pendingExams: 5,
    sportsTeams: 12,
    averageScore: 78.5,
  });

  const [performanceData] = useState([
    { class: 'JHS 1', avg: 76, students: 120 },
    { class: 'JHS 2', avg: 79, students: 115 },
    { class: 'JHS 3', avg: 82, students: 110 },
    { class: 'SHS 1', avg: 75, students: 140 },
    { class: 'SHS 2', avg: 78, students: 135 },
    { class: 'SHS 3', avg: 81, students: 130 },
  ]);

  const [subjectPerformance] = useState([
    { subject: 'Mathematics', avg: 74, pass: 88 },
    { subject: 'English', avg: 82, pass: 95 },
    { subject: 'Science', avg: 79, pass: 92 },
    { subject: 'Social Studies', avg: 76, pass: 89 },
    { subject: 'French', avg: 85, pass: 97 },
  ]);

  const [upcomingEvents] = useState([
    { event: 'Mid-term Exams', date: '2024-03-15', type: 'academic' },
    { event: 'Sports Day', date: '2024-03-20', type: 'sports' },
    { event: 'PTA Meeting', date: '2024-03-25', type: 'parent' },
    { event: 'Cultural Festival', date: '2024-04-05', type: 'cultural' },
  ]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-white mb-2">Secondary School Administration</h1>
          <p className="text-slate-400">Managing JHS 1-3 & SHS 1-3 • Ages 12-18</p>
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
                <span className="text-green-400 font-semibold">+25</span> from last year
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
              <p className="text-xs text-slate-400 mt-2">Subject specialists</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium text-slate-200">Average Score</CardTitle>
              <TrendingUp className="h-4 w-4 text-purple-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{stats.averageScore}%</div>
              <p className="text-xs text-slate-400 mt-2">Overall performance</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium text-slate-200">Active Clubs</CardTitle>
              <Music className="h-4 w-4 text-yellow-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{stats.activeClubs}</div>
              <p className="text-xs text-slate-400 mt-2">Extracurricular activities</p>
            </CardContent>
          </Card>
        </div>

        {/* Secondary School Specific Tabs */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="bg-slate-800/50 border border-slate-700 mb-6">
            <TabsTrigger value="overview" className="text-slate-300 data-[state=active]:text-white">
              School Overview
            </TabsTrigger>
            <TabsTrigger value="academics" className="text-slate-300 data-[state=active]:text-white">
              Academic Performance
            </TabsTrigger>
            <TabsTrigger value="examinations" className="text-slate-300 data-[state=active]:text-white">
              Examinations
            </TabsTrigger>
            <TabsTrigger value="clubs" className="text-slate-300 data-[state=active]:text-white">
              Clubs & Activities
            </TabsTrigger>
            <TabsTrigger value="sports" className="text-slate-300 data-[state=active]:text-white">
              Sports & Athletics
            </TabsTrigger>
            <TabsTrigger value="counseling" className="text-slate-300 data-[state=active]:text-white">
              Student Counseling
            </TabsTrigger>
            <TabsTrigger value="alumni" className="text-slate-300 data-[state=active]:text-white">
              Alumni Relations
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Class Performance */}
              <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
                <CardHeader>
                  <CardTitle className="text-white">Class Performance Trends</CardTitle>
                  <CardDescription className="text-slate-400">JHS and SHS performance comparison</CardDescription>
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

              {/* Subject Performance */}
              <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
                <CardHeader>
                  <CardTitle className="text-white">Subject Performance</CardTitle>
                  <CardDescription className="text-slate-400">Core subject analysis</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {subjectPerformance.map((subject, i) => (
                      <div key={i}>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm text-slate-300">{subject.subject}</span>
                          <span className="text-sm font-semibold text-white">{subject.avg}% ({subject.pass}% pass)</span>
                        </div>
                        <div className="w-full bg-slate-700/50 rounded-full h-2">
                          <div className="bg-gradient-to-r from-green-500 to-green-600 h-2 rounded-full" style={{ width: `${subject.avg}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Upcoming Events */}
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Upcoming School Events</CardTitle>
                <CardDescription className="text-slate-400">Important dates and activities</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {upcomingEvents.map((event, i) => (
                    <div key={i} className="p-4 bg-slate-700/30 rounded-lg border border-slate-600/30">
                      <div className="flex items-center gap-3 mb-2">
                        {event.type === 'academic' && <BookOpen className="h-5 w-5 text-blue-400" />}
                        {event.type === 'sports' && <Trophy className="h-5 w-5 text-yellow-400" />}
                        {event.type === 'parent' && <Users className="h-5 w-5 text-green-400" />}
                        {event.type === 'cultural' && <Music className="h-5 w-5 text-purple-400" />}
                        <span className="text-sm font-semibold text-white">{event.event}</span>
                      </div>
                      <p className="text-xs text-slate-400">{event.date}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="academics">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Academic Management</CardTitle>
                <CardDescription className="text-slate-400">Curriculum, assessments, and academic tracking for secondary level</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-slate-400">Secondary school academic management interface will be displayed here</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="examinations">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Examination Management</CardTitle>
                <CardDescription className="text-slate-400">BECE, WASSCE preparation, and internal assessments</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-slate-400">Secondary school examination management interface will be displayed here</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="clubs">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Clubs & Extracurricular Activities</CardTitle>
                <CardDescription className="text-slate-400">Debate club, drama, music, art, and other activities</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-slate-400">Clubs and activities management interface will be displayed here</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sports">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Sports & Athletics</CardTitle>
                <CardDescription className="text-slate-400">Football, basketball, athletics, and inter-school competitions</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-slate-400">Sports and athletics management interface will be displayed here</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="counseling">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Student Counseling</CardTitle>
                <CardDescription className="text-slate-400">Career guidance, academic counseling, and student support</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-slate-400">Student counseling interface will be displayed here</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="alumni">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Alumni Relations</CardTitle>
                <CardDescription className="text-slate-400">Graduated students network and achievements tracking</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-slate-400">Alumni relations interface will be displayed here</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
