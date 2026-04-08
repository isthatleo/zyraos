'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { User, Calendar, TrendingUp, DollarSign, MessageSquare, Eye, BookOpen, Heart } from 'lucide-react';

export default function PrimaryParentDashboard() {
  const [parentInfo] = useState({
    name: 'Mrs. Johnson',
    relationship: 'Mother',
    children: 1,
    primaryChild: 'Sarah Johnson',
  });

  const [childInfo] = useState({
    name: 'Sarah Johnson',
    class: 'Grade 2A',
    attendance: 95,
    averageScore: 85,
    rank: 3,
    teacher: 'Mrs. Davis',
    behavior: 'Excellent',
  });

  const [academicProgress] = useState([
    { subject: 'Mathematics', grade: 'A', score: 88, teacher: 'Mrs. Davis' },
    { subject: 'English', grade: 'A-', score: 85, teacher: 'Mr. Wilson' },
    { subject: 'Science', grade: 'B+', score: 82, teacher: 'Ms. Brown' },
    { subject: 'Social Studies', grade: 'A', score: 90, teacher: 'Mrs. Taylor' },
    { subject: 'Art', grade: 'A', score: 92, teacher: 'Ms. Johnson' },
  ]);

  const [upcomingEvents] = useState([
    { event: 'Parent-Teacher Conference', date: 'March 20, 2024', time: '2:00 PM', type: 'meeting' },
    { event: 'School Sports Day', date: 'March 25, 2024', time: '9:00 AM', type: 'event' },
    { event: 'PTA Meeting', date: 'April 5, 2024', time: '6:00 PM', type: 'meeting' },
    { event: 'School Picnic', date: 'April 15, 2024', time: '10:00 AM', type: 'event' },
  ]);

  const [feeStatus] = useState([
    { item: 'Tuition Fee', amount: 2500, dueDate: '2024-03-31', status: 'paid', paidDate: '2024-03-25' },
    { item: 'Activity Fee', amount: 300, dueDate: '2024-03-31', status: 'paid', paidDate: '2024-03-28' },
    { item: 'Transportation', amount: 400, dueDate: '2024-04-30', status: 'pending', paidDate: null },
    { item: 'Lunch Program', amount: 200, dueDate: '2024-04-30', status: 'pending', paidDate: null },
  ]);

  const [messages] = useState([
    { from: 'Mrs. Davis', subject: 'Sarah\'s Progress Report', date: '2024-03-15', read: true, priority: 'normal' },
    { from: 'School Administration', subject: 'Upcoming School Holiday', date: '2024-03-12', read: true, priority: 'normal' },
    { from: 'Mrs. Davis', subject: 'Parent-Teacher Conference Reminder', date: '2024-03-10', read: false, priority: 'high' },
  ]);

  const [behaviorReport] = useState([
    { aspect: 'Class Participation', rating: 9, comment: 'Very active and engaged' },
    { aspect: 'Homework Completion', rating: 8, comment: 'Consistently completes assignments' },
    { aspect: 'Social Skills', rating: 9, comment: 'Makes friends easily, respectful' },
    { aspect: 'Focus & Attention', rating: 8, comment: 'Good concentration in class' },
    { aspect: 'Following Rules', rating: 9, comment: 'Excellent behavior' },
  ]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Parent Portal - {parentInfo.name} 👨‍👩‍👧</h1>
          <p className="text-slate-400">Monitoring {childInfo.name}'s progress • {childInfo.class}</p>
        </div>

        {/* Child Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium text-slate-200">Attendance</CardTitle>
              <Calendar className="h-4 w-4 text-blue-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{childInfo.attendance}%</div>
              <p className="text-xs text-slate-400 mt-2">This term</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium text-slate-200">Average Grade</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{childInfo.averageScore}%</div>
              <p className="text-xs text-slate-400 mt-2">Overall performance</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium text-slate-200">Class Rank</CardTitle>
              <User className="h-4 w-4 text-purple-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">#{childInfo.rank}</div>
              <p className="text-xs text-slate-400 mt-2">Out of 25 students</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium text-slate-200">Behavior</CardTitle>
              <Heart className="h-4 w-4 text-pink-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{childInfo.behavior}</div>
              <p className="text-xs text-slate-400 mt-2">Teacher assessment</p>
            </CardContent>
          </Card>
        </div>

        {/* Primary Parent Tabs */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="bg-slate-800/50 border border-slate-700 mb-6">
            <TabsTrigger value="overview" className="text-slate-300 data-[state=active]:text-white">
              Child Overview
            </TabsTrigger>
            <TabsTrigger value="academics" className="text-slate-300 data-[state=active]:text-white">
              Academic Progress
            </TabsTrigger>
            <TabsTrigger value="behavior" className="text-slate-300 data-[state=active]:text-white">
              Behavior & Social
            </TabsTrigger>
            <TabsTrigger value="fees" className="text-slate-300 data-[state=active]:text-white">
              Fees & Payments
            </TabsTrigger>
            <TabsTrigger value="communication" className="text-slate-300 data-[state=active]:text-white">
              School Communication
            </TabsTrigger>
            <TabsTrigger value="events" className="text-slate-300 data-[state=active]:text-white">
              School Events
            </TabsTrigger>
            <TabsTrigger value="resources" className="text-slate-300 data-[state=active]:text-white">
              Parent Resources
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Child Summary */}
              <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
                <CardHeader>
                  <CardTitle className="text-white">{childInfo.name}'s Summary</CardTitle>
                  <CardDescription className="text-slate-400">Current academic and behavioral status</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-400">Class Teacher:</span>
                      <span className="text-sm font-semibold text-white">{childInfo.teacher}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-400">Current Term:</span>
                      <span className="text-sm font-semibold text-white">Second Term 2023/2024</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-400">Days Present:</span>
                      <span className="text-sm font-semibold text-white">57/60 days</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-400">Homework Completion:</span>
                      <span className="text-sm font-semibold text-green-400">95%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-400">Extracurricular:</span>
                      <span className="text-sm font-semibold text-blue-400">Art Club</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
                <CardHeader>
                  <CardTitle className="text-white">Quick Actions</CardTitle>
                  <CardDescription className="text-slate-400">Common parent tasks and requests</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3">
                    <Button className="bg-blue-600 hover:bg-blue-700 text-white flex flex-col items-center gap-2 h-20">
                      <MessageSquare className="h-5 w-5" />
                      <span className="text-xs">Message Teacher</span>
                    </Button>
                    <Button className="bg-green-600 hover:bg-green-700 text-white flex flex-col items-center gap-2 h-20">
                      <Eye className="h-5 w-5" />
                      <span className="text-xs">View Report Card</span>
                    </Button>
                    <Button className="bg-purple-600 hover:bg-purple-700 text-white flex flex-col items-center gap-2 h-20">
                      <Calendar className="h-5 w-5" />
                      <span className="text-xs">Schedule Meeting</span>
                    </Button>
                    <Button className="bg-orange-600 hover:bg-orange-700 text-white flex flex-col items-center gap-2 h-20">
                      <DollarSign className="h-5 w-5" />
                      <span className="text-xs">Pay Fees</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="academics">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Academic Performance</CardTitle>
                <CardDescription className="text-slate-400">Subject-wise grades and progress reports</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {academicProgress.map((subject, i) => (
                    <div key={i} className="p-4 bg-slate-700/30 rounded-lg border border-slate-600/30">
                      <div className="flex justify-between items-center mb-2">
                        <div>
                          <p className="text-sm font-semibold text-white">{subject.subject}</p>
                          <p className="text-xs text-slate-400">Teacher: {subject.teacher}</p>
                        </div>
                        <div className="text-right">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold ${
                            subject.grade.startsWith('A') ? 'bg-green-900/30 text-green-300 border border-green-700/50' :
                            subject.grade.startsWith('B') ? 'bg-blue-900/30 text-blue-300 border border-blue-700/50' :
                            'bg-yellow-900/30 text-yellow-300 border border-yellow-700/50'
                          }`}>
                            {subject.grade}
                          </span>
                          <p className="text-xs text-slate-400 mt-1">{subject.score}%</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="behavior">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Behavior & Social Development</CardTitle>
                <CardDescription className="text-slate-400">Teacher assessments of social skills and behavior</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {behaviorReport.map((aspect, i) => (
                    <div key={i} className="p-4 bg-slate-700/30 rounded-lg border border-slate-600/30">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-semibold text-white">{aspect.aspect}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-white">{aspect.rating}/10</span>
                          <div className="w-16 bg-slate-600 rounded-full h-2">
                            <div
                              className="bg-blue-500 h-2 rounded-full"
                              style={{ width: `${aspect.rating * 10}%` }}
                            />
                          </div>
                        </div>
                      </div>
                      <p className="text-xs text-slate-400">{aspect.comment}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="fees">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">School Fees & Payments</CardTitle>
                <CardDescription className="text-slate-400">Fee status, payment history, and outstanding balances</CardDescription>
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
                        <div className="text-right">
                          <p className="text-sm font-semibold text-white">GHS {fee.amount}</p>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-1 ${
                            fee.status === 'paid' ? 'bg-green-900/30 text-green-300 border border-green-800/50' :
                            'bg-yellow-900/30 text-yellow-300 border border-yellow-800/50'
                          }`}>
                            {fee.status === 'paid' ? '✓ Paid' : 'Pending'}
                          </span>
                        </div>
                      </div>
                      {fee.paidDate && (
                        <p className="text-xs text-slate-500">Paid on: {fee.paidDate}</p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="communication">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">School Communication</CardTitle>
                <CardDescription className="text-slate-400">Messages from teachers, announcements, and school updates</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {messages.map((message, i) => (
                    <div key={i} className={`p-4 rounded-lg border ${
                      message.read ? 'bg-slate-700/30 border-slate-600/30' :
                      'bg-blue-900/20 border-blue-700/50'
                    }`}>
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="text-sm font-semibold text-white">{message.subject}</p>
                          <p className="text-xs text-slate-400">From: {message.from}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-slate-400">{message.date}</p>
                          {!message.read && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-600 text-white mt-1">
                              New
                            </span>
                          )}
                        </div>
                      </div>
                      <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                        {message.read ? 'View Message' : 'Read Message'}
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="events">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Upcoming School Events</CardTitle>
                <CardDescription className="text-slate-400">PTA meetings, sports days, cultural events, and school activities</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {upcomingEvents.map((event, i) => (
                    <div key={i} className="p-4 bg-slate-700/30 rounded-lg border border-slate-600/30">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="text-sm font-semibold text-white">{event.event}</p>
                          <p className="text-xs text-slate-400">{event.date} at {event.time}</p>
                        </div>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          event.type === 'meeting' ? 'bg-blue-900/30 text-blue-300 border border-blue-800/50' :
                          'bg-green-900/30 text-green-300 border border-green-800/50'
                        }`}>
                          {event.type === 'meeting' ? '👥 Meeting' : '🎪 Event'}
                        </span>
                      </div>
                      <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                        RSVP
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="resources">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Parent Resources & Support</CardTitle>
                <CardDescription className="text-slate-400">Guides, workshops, and resources for parents</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-slate-400">Parent resources interface will be displayed here</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
