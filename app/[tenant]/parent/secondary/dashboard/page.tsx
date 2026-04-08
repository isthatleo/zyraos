'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { User, Calendar, TrendingUp, DollarSign, MessageSquare, Eye, BookOpen, Trophy, Music } from 'lucide-react';

export default function SecondaryParentDashboard() {
  const [parentInfo] = useState({
    name: 'Mr. Thompson',
    relationship: 'Father',
    children: 1,
    primaryChild: 'Alex Thompson',
  });

  const [childInfo] = useState({
    name: 'Alex Thompson',
    class: 'JHS 2A',
    attendance: 92,
    averageScore: 78,
    rank: 8,
    house: 'Blue House',
    counselor: 'Mrs. Johnson',
  });

  const [subjectGrades] = useState([
    { subject: 'Mathematics', grade: 'B+', score: 82, teacher: 'Mr. Johnson', trend: 'up' },
    { subject: 'English', grade: 'A-', score: 88, teacher: 'Mrs. Davis', trend: 'up' },
    { subject: 'Integrated Science', grade: 'B', score: 75, teacher: 'Ms. Brown', trend: 'down' },
    { subject: 'Social Studies', grade: 'A', score: 92, teacher: 'Mr. Wilson', trend: 'up' },
    { subject: 'French', grade: 'B+', score: 85, teacher: 'Mrs. Taylor', trend: 'stable' },
    { subject: 'ICT', grade: 'A', score: 90, teacher: 'Mr. Davis', trend: 'up' },
  ]);

  const [upcomingAssessments] = useState([
    { subject: 'Mathematics', title: 'Algebra Test', date: '2024-03-25', type: 'exam' },
    { subject: 'English', title: 'Literature Essay', date: '2024-03-28', type: 'assignment' },
    { subject: 'Science', title: 'Physics Lab Report', date: '2024-04-02', type: 'project' },
    { subject: 'Social Studies', title: 'History Presentation', date: '2024-04-05', type: 'presentation' },
  ]);

  const [schoolEvents] = useState([
    { event: 'Mid-term Exams', date: '2024-03-25 to 2024-03-29', type: 'academic' },
    { event: 'Inter-House Sports Competition', date: '2024-04-10', type: 'sports' },
    { event: 'PTA Meeting', date: '2024-04-15', type: 'meeting' },
    { event: 'Cultural Festival', date: '2024-04-20', type: 'cultural' },
    { event: 'Career Guidance Workshop', date: '2024-04-25', type: 'workshop' },
  ]);

  const [feePayments] = useState([
    { item: 'Tuition Fee', amount: 4500, dueDate: '2024-03-31', status: 'paid', paidDate: '2024-03-25' },
    { item: 'Examination Fee', amount: 800, dueDate: '2024-03-31', status: 'paid', paidDate: '2024-03-28' },
    { item: 'Activity Fee', amount: 600, dueDate: '2024-04-30', status: 'pending', paidDate: null },
    { item: 'Transportation', amount: 500, dueDate: '2024-04-30', status: 'pending', paidDate: null },
    { item: 'Boarding Fee', amount: 1200, dueDate: '2024-05-31', status: 'pending', paidDate: null },
  ]);

  const [teacherMessages] = useState([
    { from: 'Mr. Johnson (Mathematics)', subject: 'Alex\'s Algebra Performance', date: '2024-03-15', read: true, priority: 'normal' },
    { from: 'Mrs. Davis (English)', subject: 'Literature Assignment Due Soon', date: '2024-03-12', read: true, priority: 'normal' },
    { from: 'School Counselor', subject: 'Career Guidance Session Available', date: '2024-03-10', read: false, priority: 'high' },
    { from: 'Sports Coach', subject: 'Football Team Tryouts', date: '2024-03-08', read: false, priority: 'normal' },
  ]);

  const [clubActivities] = useState([
    { club: 'Debate Club', role: 'Member', meetings: 'Wed 15:00', achievements: 'Regional Finalist' },
    { club: 'Football Team', role: 'Striker', meetings: 'Mon & Wed 16:00', achievements: 'League Champions' },
  ]);

  const [performanceTrend] = useState([
    { month: 'Sep', average: 72 },
    { month: 'Oct', average: 75 },
    { month: 'Nov', average: 78 },
    { month: 'Dec', average: 76 },
    { month: 'Jan', average: 80 },
    { month: 'Feb', average: 82 },
  ]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Parent Portal - {parentInfo.name} 👨‍👦</h1>
            <p className="text-slate-400">Monitoring {childInfo.name}'s progress • {childInfo.class} • {childInfo.house}</p>
          </div>
          <Button className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Contact Counselor
          </Button>
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
              <p className="text-xs text-slate-400 mt-2">Out of 45 students</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium text-slate-200">Club Activities</CardTitle>
              <Music className="h-4 w-4 text-yellow-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{clubActivities.length}</div>
              <p className="text-xs text-slate-400 mt-2">Active memberships</p>
            </CardContent>
          </Card>
        </div>

        {/* Secondary Parent Tabs */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="bg-slate-800/50 border border-slate-700 mb-6">
            <TabsTrigger value="overview" className="text-slate-300 data-[state=active]:text-white">
              Academic Overview
            </TabsTrigger>
            <TabsTrigger value="grades" className="text-slate-300 data-[state=active]:text-white">
              Subject Grades
            </TabsTrigger>
            <TabsTrigger value="assessments" className="text-slate-300 data-[state=active]:text-white">
              Upcoming Assessments
            </TabsTrigger>
            <TabsTrigger value="clubs" className="text-slate-300 data-[state=active]:text-white">
              Clubs & Activities
            </TabsTrigger>
            <TabsTrigger value="fees" className="text-slate-300 data-[state=active]:text-white">
              Fees & Payments
            </TabsTrigger>
            <TabsTrigger value="communication" className="text-slate-300 data-[state=active]:text-white">
              Teacher Communication
            </TabsTrigger>
            <TabsTrigger value="events" className="text-slate-300 data-[state=active]:text-white">
              School Events
            </TabsTrigger>
            <TabsTrigger value="counseling" className="text-slate-300 data-[state=active]:text-white">
              Counseling Support
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Academic Performance Trend */}
              <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
                <CardHeader>
                  <CardTitle className="text-white">Academic Performance Trend</CardTitle>
                  <CardDescription className="text-slate-400">Progress over the past 6 months</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={performanceTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                      <XAxis stroke="#94a3b8" dataKey="month" />
                      <YAxis stroke="#94a3b8" domain={[60, 100]} />
                      <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }} />
                      <Bar dataKey="average" fill="#3B82F6" name="Average Score %" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Child Summary */}
              <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
                <CardHeader>
                  <CardTitle className="text-white">{childInfo.name}'s Summary</CardTitle>
                  <CardDescription className="text-slate-400">Current academic and extracurricular status</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-400">Class Teacher:</span>
                      <span className="text-sm font-semibold text-white">Mr. Johnson</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-400">Counselor:</span>
                      <span className="text-sm font-semibold text-white">{childInfo.counselor}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-400">House:</span>
                      <span className="text-sm font-semibold text-blue-400">{childInfo.house}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-400">Subjects Passed:</span>
                      <span className="text-sm font-semibold text-green-400">6/7</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-400">Extracurricular:</span>
                      <span className="text-sm font-semibold text-purple-400">2 clubs + 1 sport</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-400">Behavioral Rating:</span>
                      <span className="text-sm font-semibold text-green-400">Excellent</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Quick Actions</CardTitle>
                <CardDescription className="text-slate-400">Common parent tasks and requests</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
                    <span className="text-xs">Pay Outstanding Fees</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="grades">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Subject Grades & Performance</CardTitle>
                <CardDescription className="text-slate-400">Detailed breakdown of academic performance by subject</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {subjectGrades.map((subject, i) => (
                    <div key={i} className="p-4 bg-slate-700/30 rounded-lg border border-slate-600/30">
                      <div className="flex justify-between items-center mb-2">
                        <div>
                          <p className="text-sm font-semibold text-white">{subject.subject}</p>
                          <p className="text-xs text-slate-400">Teacher: {subject.teacher}</p>
                        </div>
                        <div className="text-right flex items-center gap-2">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold ${
                            subject.grade.startsWith('A') ? 'bg-green-900/30 text-green-300 border border-green-700/50' :
                            subject.grade.startsWith('B') ? 'bg-blue-900/30 text-blue-300 border border-blue-700/50' :
                            'bg-yellow-900/30 text-yellow-300 border border-yellow-700/50'
                          }`}>
                            {subject.grade}
                          </span>
                          <span className={`text-xs ${
                            subject.trend === 'up' ? 'text-green-400' :
                            subject.trend === 'down' ? 'text-red-400' :
                            'text-gray-400'
                          }`}>
                            {subject.trend === 'up' ? '↗ Improving' : subject.trend === 'down' ? '↘ Needs attention' : '→ Stable'}
                          </span>
                        </div>
                      </div>
                      <div className="w-full bg-slate-600 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full"
                          style={{ width: `${subject.score}%` }}
                        />
                      </div>
                      <p className="text-xs text-slate-500 mt-1">{subject.score}% • Target: 75%</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="assessments">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Upcoming Assessments & Exams</CardTitle>
                <CardDescription className="text-slate-400">Important dates for exams, assignments, and projects</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {upcomingAssessments.map((assessment, i) => (
                    <div key={i} className="p-4 bg-slate-700/30 rounded-lg border border-slate-600/30">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="text-sm font-semibold text-white">{assessment.title}</p>
                          <p className="text-xs text-slate-400">{assessment.subject}</p>
                        </div>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          assessment.type === 'exam' ? 'bg-red-900/30 text-red-300 border border-red-800/50' :
                          assessment.type === 'assignment' ? 'bg-blue-900/30 text-blue-300 border border-blue-800/50' :
                          assessment.type === 'project' ? 'bg-purple-900/30 text-purple-300 border border-purple-800/50' :
                          'bg-green-900/30 text-green-300 border border-green-800/50'
                        }`}>
                          {assessment.type === 'exam' ? '📝 Exam' :
                           assessment.type === 'assignment' ? '📄 Assignment' :
                           assessment.type === 'project' ? '🎯 Project' : '🎤 Presentation'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <p className="text-xs text-slate-400">Due: {assessment.date}</p>
                        <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                          Help Child Prepare
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="clubs">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Clubs & Extracurricular Activities</CardTitle>
                <CardDescription className="text-slate-400">Your child's participation in clubs, sports, and activities</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {clubActivities.map((club, i) => (
                    <div key={i} className="p-4 bg-slate-700/30 rounded-lg border border-slate-600/30">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="text-sm font-semibold text-white">{club.club}</p>
                          <p className="text-xs text-slate-400">Role: {club.role}</p>
                        </div>
                        <Trophy className="h-5 w-5 text-yellow-400" />
                      </div>
                      <p className="text-xs text-slate-400 mb-2">Meetings: {club.meetings}</p>
                      <p className="text-xs text-slate-400 mb-3">Achievements: {club.achievements}</p>
                      <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                        View Activity Details
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="fees">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">School Fees & Payment History</CardTitle>
                <CardDescription className="text-slate-400">Track payments, outstanding fees, and payment schedules</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {feePayments.map((fee, i) => (
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
                      {fee.status === 'pending' && (
                        <Button size="sm" className="bg-blue-600 hover:bg-blue-700 mt-2">
                          Pay Now
                        </Button>
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
                <CardTitle className="text-white">Teacher Communication</CardTitle>
                <CardDescription className="text-slate-400">Messages from teachers, progress updates, and school announcements</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {teacherMessages.map((message, i) => (
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
                          {message.priority === 'high' && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-600 text-white mt-1">
                              High Priority
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                          {message.read ? 'View Message' : 'Read Message'}
                        </Button>
                        <Button size="sm" variant="outline" className="border-slate-600 text-slate-300">
                          Reply
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="events">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">School Events & Activities</CardTitle>
                <CardDescription className="text-slate-400">Upcoming events, PTA meetings, sports competitions, and school activities</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {schoolEvents.map((event, i) => (
                    <div key={i} className="p-4 bg-slate-700/30 rounded-lg border border-slate-600/30">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="text-sm font-semibold text-white">{event.event}</p>
                          <p className="text-xs text-slate-400">{event.date}</p>
                        </div>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          event.type === 'academic' ? 'bg-blue-900/30 text-blue-300 border border-blue-800/50' :
                          event.type === 'sports' ? 'bg-green-900/30 text-green-300 border border-green-800/50' :
                          event.type === 'meeting' ? 'bg-purple-900/30 text-purple-300 border border-purple-800/50' :
                          event.type === 'cultural' ? 'bg-yellow-900/30 text-yellow-300 border border-yellow-800/50' :
                          'bg-orange-900/30 text-orange-300 border border-orange-800/50'
                        }`}>
                          {event.type === 'academic' ? '📚 Academic' :
                           event.type === 'sports' ? '⚽ Sports' :
                           event.type === 'meeting' ? '👥 Meeting' :
                           event.type === 'cultural' ? '🎭 Cultural' : '🎓 Workshop'}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                          RSVP
                        </Button>
                        <Button size="sm" variant="outline" className="border-slate-600 text-slate-300">
                          Add to Calendar
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
                <CardTitle className="text-white">Counseling & Student Support</CardTitle>
                <CardDescription className="text-slate-400">Career guidance, academic counseling, and student support services</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-slate-400">Counseling and support services interface will be displayed here</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
