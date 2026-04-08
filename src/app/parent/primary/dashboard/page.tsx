/**
 * Parent Dashboard - Primary School Level
 * Path: src/app/parent/primary/dashboard/page.tsx
 */

'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { User, Calendar, TrendingUp, DollarSign, MessageSquare, Eye, BookOpen, Award } from 'lucide-react';

export default function PrimaryParentDashboard() {
  const [parentInfo] = useState({
    name: 'Sarah Johnson',
    relationship: 'Mother',
    children: 1,
    primaryChild: 'Emma Johnson',
  });

  const [childInfo] = useState({
    name: 'Emma Johnson',
    class: 'Grade 4',
    school: 'Sunshine Primary School',
    attendance: 96,
    averageScore: 87,
    behaviorRating: 'Excellent',
    stars: 245,
  });

  const [subjectGrades] = useState([
    { subject: 'Mathematics', grade: 'A', score: 92, teacher: 'Mrs. Smith', color: '#3B82F6' },
    { subject: 'English', grade: 'A', score: 90, teacher: 'Mr. Johnson', color: '#10B981' },
    { subject: 'Science', grade: 'A-', score: 88, teacher: 'Ms. Brown', color: '#F59E0B' },
    { subject: 'Social Studies', grade: 'A', score: 89, teacher: 'Mrs. Taylor', color: '#8B5CF6' },
    { subject: 'Art', grade: 'A+', score: 95, teacher: 'Mr. Lee', color: '#EC4899' },
  ]);

  const [recentAchievements] = useState([
    { achievement: '🌟 Earned 5 stars for excellent homework', date: 'Today' },
    { achievement: '📚 Top reader in the class this month', date: 'This week' },
    { achievement: '🏆 Perfect attendance for the month', date: 'Last week' },
    { achievement: '🎨 Outstanding art project completion', date: '2 weeks ago' },
  ]);

  const [upcomingEvents] = useState([
    { event: 'Math Quiz', date: '2024-03-20', type: 'Assessment' },
    { event: 'School Field Trip', date: '2024-03-28', type: 'Event' },
    { event: 'Science Fair', date: '2024-04-05', type: 'Event' },
    { event: 'Parent-Teacher Conference', date: '2024-04-12', type: 'Meeting' },
  ]);

  const [teacherMessages] = useState([
    { from: 'Mrs. Smith', subject: 'Emma is doing very well in Math!', date: '2 days ago', read: true },
    { from: 'Mr. Johnson', subject: 'Great reading performance!', date: '4 days ago', read: true },
    { from: 'School', subject: 'Reminder: Field trip next Friday', date: '1 week ago', read: false },
  ]);

  const [feeStatus] = useState([
    { item: 'Tuition Fee', amount: 250, dueDate: '2024-03-31', status: 'paid' },
    { item: 'Activity Fee', amount: 50, dueDate: '2024-04-30', status: 'pending' },
    { item: 'Supplies', amount: 30, dueDate: '2024-05-31', status: 'pending' },
  ]);

  const [performanceData] = useState([
    { month: 'Jan', score: 85 },
    { month: 'Feb', score: 87 },
    { month: 'Mar', score: 87 },
    { month: 'Apr', score: 89 },
  ]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Parent Portal - {parentInfo.name} 👨‍👩‍👧</h1>
            <p className="text-slate-400">Monitoring {childInfo.name}'s progress • {childInfo.class}</p>
          </div>
          <Button className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Message Teacher
          </Button>
        </div>

        {/* Child Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-300">Attendance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-400">{childInfo.attendance}%</div>
              <p className="text-xs text-slate-400">This term</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-300">Average Grade</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-400">{childInfo.averageScore}%</div>
              <p className="text-xs text-slate-400">Performance</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-300">Behavior</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm font-bold text-purple-400">{childInfo.behaviorRating}</div>
              <p className="text-xs text-slate-400">Rating</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-300">⭐ Stars Earned</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-400">{childInfo.stars}</div>
              <p className="text-xs text-slate-400">Reward points</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-300">Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm font-bold text-green-400">On Track</div>
              <p className="text-xs text-slate-400">Excellent</p>
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
              Subject Grades
            </TabsTrigger>
            <TabsTrigger value="achievements" className="text-slate-300 data-[state=active]:text-white">
              Achievements
            </TabsTrigger>
            <TabsTrigger value="messages" className="text-slate-300 data-[state=active]:text-white">
              Teacher Messages
            </TabsTrigger>
            <TabsTrigger value="events" className="text-slate-300 data-[state=active]:text-white">
              Events & Fees
            </TabsTrigger>
          </TabsList>

          {/* Overview */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
                <CardHeader>
                  <CardTitle className="text-white">Performance Trend</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={performanceData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                      <XAxis stroke="#94a3b8" dataKey="month" />
                      <YAxis stroke="#94a3b8" domain={[0, 100]} />
                      <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }} />
                      <Bar dataKey="score" fill="#3B82F6" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
                <CardHeader>
                  <CardTitle className="text-white">Quick Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-slate-700/30 rounded">
                    <span className="text-sm text-slate-300">School:</span>
                    <span className="text-sm font-semibold text-white">{childInfo.school}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-slate-700/30 rounded">
                    <span className="text-sm text-slate-300">Class:</span>
                    <span className="text-sm font-semibold text-white">{childInfo.class}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-slate-700/30 rounded">
                    <span className="text-sm text-slate-300">Overall Status:</span>
                    <span className="text-sm font-semibold text-green-400">Excellent</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Subjects */}
          <TabsContent value="subjects">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">All Subject Grades</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {subjectGrades.map((subject, i) => (
                    <div key={i} className="p-4 bg-slate-700/30 rounded-lg border border-slate-600/30">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-semibold text-white">{subject.subject}</span>
                        <span className={`px-2 py-1 rounded text-xs font-bold text-white`} style={{ backgroundColor: subject.color }}>
                          {subject.grade}
                        </span>
                      </div>
                      <div className="w-full bg-slate-600 rounded-full h-2">
                        <div
                          className="h-2 rounded-full"
                          style={{ width: `${subject.score}%`, backgroundColor: subject.color }}
                        />
                      </div>
                      <p className="text-xs text-slate-400 mt-2">Teacher: {subject.teacher}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Achievements */}
          <TabsContent value="achievements">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Recent Achievements 🏆</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentAchievements.map((achievement, i) => (
                    <div key={i} className="p-4 bg-slate-700/30 rounded-lg border border-slate-600/30">
                      <p className="text-sm text-white mb-1">{achievement.achievement}</p>
                      <p className="text-xs text-slate-400">{achievement.date}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Messages */}
          <TabsContent value="messages">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Teacher Messages</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {teacherMessages.map((message, i) => (
                    <div key={i} className="p-4 bg-slate-700/30 rounded-lg border border-slate-600/30">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="text-sm font-semibold text-white">{message.from}</p>
                          <p className="text-xs text-slate-400">{message.subject}</p>
                        </div>
                        {!message.read && (
                          <span className="px-2 py-1 bg-blue-600 text-white text-xs rounded">New</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500">{message.date}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Events & Fees */}
          <TabsContent value="events" className="space-y-6">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Upcoming Events 📅</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {upcomingEvents.map((event, i) => (
                    <div key={i} className="p-4 bg-slate-700/30 rounded-lg border border-slate-600/30">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-sm font-semibold text-white">{event.event}</p>
                          <p className="text-xs text-slate-400">{event.date} • {event.type}</p>
                        </div>
                        <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                          RSVP
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Fee Status 💰</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {feeStatus.map((fee, i) => (
                    <div key={i} className="p-4 bg-slate-700/30 rounded-lg border border-slate-600/30">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="text-sm font-semibold text-white">{fee.item}</p>
                          <p className="text-xs text-slate-400">Due: {fee.dueDate}</p>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          fee.status === 'paid' ? 'bg-green-900/30 text-green-300' : 'bg-yellow-900/30 text-yellow-300'
                        }`}>
                          {fee.status === 'paid' ? '✓ Paid' : 'Pending'}
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-white">${fee.amount}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

