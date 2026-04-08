/**
 * Student Dashboard - Primary School Level
 * Path: src/app/student/primary/dashboard/page.tsx
 */

'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { BookOpen, Clock, AlertCircle, TrendingUp, Star, Users, Award, Calendar } from 'lucide-react';

export default function PrimaryStudentDashboard() {
  const [studentData] = useState({
    name: 'Emma Johnson',
    class: 'Grade 4',
    school: 'Sunshine Primary School',
    attendance: 96,
    averageScore: 87,
    totalAssignments: 18,
    submittedAssignments: 18,
    stars: 245, // Reward system for primary
    nextEvent: 'Math Quiz - Friday',
  });

  const [subjectsData] = useState([
    { subject: 'Mathematics', grade: 'A', score: 92, color: '#3B82F6' },
    { subject: 'English', grade: 'A', score: 90, color: '#10B981' },
    { subject: 'Science', grade: 'A-', score: 88, color: '#F59E0B' },
    { subject: 'Social Studies', grade: 'A', score: 89, color: '#8B5CF6' },
    { subject: 'Art', grade: 'A+', score: 95, color: '#EC4899' },
  ]);

  const [recentActivities] = useState([
    { activity: '⭐ Received 5 stars for excellent homework', date: 'Today' },
    { activity: '✅ Completed Math assignment', date: 'Yesterday' },
    { activity: '🎯 Perfect attendance this week', date: '2 days ago' },
    { activity: '🏆 Top performer in reading group', date: '3 days ago' },
  ]);

  const [scheduleData] = useState([
    { time: '09:00-10:00', subject: 'Mathematics', teacher: 'Mrs. Smith', room: 'Room 101' },
    { time: '10:00-10:30', subject: 'Recess', teacher: '-', room: 'Playground' },
    { time: '10:30-11:30', subject: 'English', teacher: 'Mr. Johnson', room: 'Room 102' },
    { time: '11:30-12:30', subject: 'Science', teacher: 'Ms. Brown', room: 'Lab' },
    { time: '12:30-13:00', subject: 'Lunch Break', teacher: '-', room: 'Cafeteria' },
  ]);

  const [performanceData] = useState([
    { week: 'Week 1', score: 85 },
    { week: 'Week 2', score: 87 },
    { week: 'Week 3', score: 89 },
    { week: 'Week 4', score: 87 },
    { week: 'Week 5', score: 92 },
  ]);

  const [upcomingEvents] = useState([
    { event: 'Math Quiz', date: 'Friday', icon: '📝' },
    { event: 'School Field Trip', date: 'Next Monday', icon: '🚌' },
    { event: 'Science Fair', date: 'Next Week', icon: '🔬' },
    { event: 'Sports Day', date: 'In 2 weeks', icon: '🏃' },
  ]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header with Welcome */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            Welcome, {studentData.name}! 👋
          </h1>
          <p className="text-slate-400">{studentData.class} • {studentData.school}</p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-300">Attendance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-400">{studentData.attendance}%</div>
              <p className="text-xs text-slate-400 mt-1">Great job! 🌟</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-300">Average Score</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-400">{studentData.averageScore}%</div>
              <p className="text-xs text-slate-400 mt-1">Keep it up!</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-300">Assignments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-400">
                {studentData.submittedAssignments}/{studentData.totalAssignments}
              </div>
              <p className="text-xs text-slate-400 mt-1">All completed!</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-300">⭐ Stars</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-400">{studentData.stars}</div>
              <p className="text-xs text-slate-400 mt-1">Reward points</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-300">Next Event</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm font-bold text-orange-400 truncate">{studentData.nextEvent}</div>
              <p className="text-xs text-slate-400 mt-1">Stay ready!</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="bg-slate-800/50 border border-slate-700 mb-6">
            <TabsTrigger value="overview" className="text-slate-300 data-[state=active]:text-white">
              Overview
            </TabsTrigger>
            <TabsTrigger value="subjects" className="text-slate-300 data-[state=active]:text-white">
              My Subjects
            </TabsTrigger>
            <TabsTrigger value="schedule" className="text-slate-300 data-[state=active]:text-white">
              Today's Schedule
            </TabsTrigger>
            <TabsTrigger value="activities" className="text-slate-300 data-[state=active]:text-white">
              Recent Activities
            </TabsTrigger>
            <TabsTrigger value="events" className="text-slate-300 data-[state=active]:text-white">
              Upcoming Events
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Performance Trend */}
              <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
                <CardHeader>
                  <CardTitle className="text-white">Weekly Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={performanceData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                      <XAxis stroke="#94a3b8" dataKey="week" />
                      <YAxis stroke="#94a3b8" domain={[0, 100]} />
                      <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }} />
                      <Line type="monotone" dataKey="score" stroke="#3B82F6" strokeWidth={2} dot={{ fill: '#3B82F6' }} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Subject Distribution */}
              <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
                <CardHeader>
                  <CardTitle className="text-white">Subject Grades</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={subjectsData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ subject, grade }) => `${subject}: ${grade}`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="score"
                      >
                        {subjectsData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Subjects Tab */}
          <TabsContent value="subjects">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">All Subjects & Grades</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {subjectsData.map((subject, i) => (
                    <div key={i} className="p-4 bg-slate-700/30 rounded-lg border border-slate-600/30">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-semibold text-white">{subject.subject}</span>
                        <span className={`text-lg font-bold ${
                          subject.grade.startsWith('A') ? 'text-green-400' : 'text-blue-400'
                        }`}>
                          {subject.grade}
                        </span>
                      </div>
                      <div className="w-full bg-slate-600 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r h-2 rounded-full"
                          style={{ width: `${subject.score}%`, background: subject.color }}
                        />
                      </div>
                      <p className="text-xs text-slate-500 mt-1">{subject.score}%</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Schedule Tab */}
          <TabsContent value="schedule">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Today's Schedule</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {scheduleData.map((item, i) => (
                    <div key={i} className="p-4 bg-slate-700/30 rounded-lg border border-slate-600/30 flex gap-4">
                      <div className="flex-shrink-0">
                        <p className="text-sm font-semibold text-blue-400">{item.time}</p>
                      </div>
                      <div className="flex-grow">
                        <p className="text-sm font-semibold text-white">{item.subject}</p>
                        <p className="text-xs text-slate-400">{item.teacher} • {item.room}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Activities Tab */}
          <TabsContent value="activities">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Recent Activities</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentActivities.map((activity, i) => (
                    <div key={i} className="p-4 bg-slate-700/30 rounded-lg border border-slate-600/30">
                      <p className="text-sm text-white mb-1">{activity.activity}</p>
                      <p className="text-xs text-slate-400">{activity.date}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Events Tab */}
          <TabsContent value="events">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Upcoming Events 📅</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {upcomingEvents.map((event, i) => (
                    <div key={i} className="p-4 bg-slate-700/30 rounded-lg border border-slate-600/30">
                      <div className="text-2xl mb-2">{event.icon}</div>
                      <p className="text-sm font-semibold text-white">{event.event}</p>
                      <p className="text-xs text-slate-400 mt-1">{event.date}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Quick Actions */}
        <Card className="bg-slate-800/50 border-slate-700 backdrop-blur mt-8">
          <CardHeader>
            <CardTitle className="text-white">Quick Links</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white h-12">
                📚 My Resources
              </Button>
              <Button className="bg-green-600 hover:bg-green-700 text-white h-12">
                💬 Messages
              </Button>
              <Button className="bg-purple-600 hover:bg-purple-700 text-white h-12">
                🎓 My Grades
              </Button>
              <Button className="bg-orange-600 hover:bg-orange-700 text-white h-12">
                👨‍👩‍👧 My Family
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

