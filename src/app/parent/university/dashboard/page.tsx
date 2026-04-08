/**
 * Parent Dashboard - University/College Level
 * Path: src/app/parent/university/dashboard/page.tsx
 */

'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { User, Calendar, TrendingUp, DollarSign, MessageSquare, Eye, BookOpen, Trophy } from 'lucide-react';

export default function UniversityParentDashboard() {
  const [parentInfo] = useState({
    name: 'Mr. & Mrs. Williams',
    relationship: 'Parents',
    children: 1,
    primaryChild: 'Jordan Williams',
  });

  const [childInfo] = useState({
    name: 'Jordan Williams',
    studentId: 'STU2024001234',
    degree: 'Bachelor of Computer Science',
    university: 'State University',
    semester: 'Semester 5',
    cgpa: 3.78,
    currentGPA: 3.82,
    creditsCompleted: 78,
    totalCredits: 120,
  });

  const [coursesData] = useState([
    { name: 'Data Structures & Algorithms', code: 'CS301', grade: 'A', score: 88, status: 'active' },
    { name: 'Database Management', code: 'CS302', grade: 'A-', score: 85, status: 'active' },
    { name: 'Web Development', code: 'CS303', grade: 'A+', score: 92, status: 'active' },
    { name: 'Operating Systems', code: 'CS304', grade: 'B+', score: 80, status: 'active' },
    { name: 'Software Engineering', code: 'CS305', grade: 'A-', score: 87, status: 'active' },
  ]);

  const [gpaData] = useState([
    { semester: 'Year 1 Sem 1', gpa: 3.65 },
    { semester: 'Year 1 Sem 2', gpa: 3.72 },
    { semester: 'Year 2 Sem 1', gpa: 3.75 },
    { semester: 'Year 2 Sem 2', gpa: 3.80 },
    { semester: 'Year 3 Sem 1', gpa: 3.82 },
  ]);

  const [communication] = useState([
    { from: 'Academic Advisor', subject: 'Mid-semester academic progress', date: '3 days ago', read: true },
    { from: 'Registrar', subject: 'Course registration for next semester', date: '1 week ago', read: true },
    { from: 'International Office', subject: 'Study abroad opportunity information', date: '2 weeks ago', read: false },
    { from: 'Finance Office', subject: 'Scholarship renewal status', date: '3 weeks ago', read: true },
  ]);

  const [financialStatus] = useState([
    { item: 'Tuition Fee (Semester 5)', amount: 12000, dueDate: '2024-01-15', status: 'paid' },
    { item: 'Housing (On-Campus)', amount: 3000, dueDate: '2024-02-15', status: 'paid' },
    { item: 'Books & Supplies', amount: 800, dueDate: '2024-03-15', status: 'pending' },
    { item: 'Student Activities', amount: 250, dueDate: '2024-04-15', status: 'pending' },
  ]);

  const [careerProgress] = useState([
    { activity: 'Completed internship at Tech Corp', date: 'Summer 2023' },
    { activity: 'Applied to 3 graduate programs', date: '2 months ago' },
    { activity: 'Attended career fair and networking events', date: 'Last month' },
    { activity: 'GPA maintained above 3.8', date: 'Current semester' },
  ]);

  const [academicInformation] = useState([
    { label: 'Dean\'s List', value: 'Current Semester' },
    { label: 'Scholarships', value: 'Merit-Based (Active)' },
    { label: 'Study Plan', value: 'On Track for Graduation' },
    { label: 'Graduation Date', value: 'Expected: May 2025' },
  ]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Parent Portal - {parentInfo.name} 👨‍👩‍👦</h1>
            <p className="text-slate-400">Monitoring {childInfo.name}'s Academic Progress • {childInfo.university}</p>
          </div>
          <Button className="bg-blue-600 hover:bg-blue-700 text-white">
            <MessageSquare className="h-4 w-4 mr-2" />
            Contact Advisor
          </Button>
        </div>

        {/* Student Info & Academic Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Student Information Card */}
          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-white">{childInfo.name}</CardTitle>
              <CardDescription className="text-slate-400">{childInfo.studentId}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-slate-700/30 rounded">
                <span className="text-sm text-slate-300">Degree:</span>
                <span className="text-sm font-semibold text-white">{childInfo.degree}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-slate-700/30 rounded">
                <span className="text-sm text-slate-300">Semester:</span>
                <span className="text-sm font-semibold text-white">{childInfo.semester}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-slate-700/30 rounded">
                <span className="text-sm text-slate-300">Progress:</span>
                <span className="text-sm font-semibold text-green-400">{Math.round((childInfo.creditsCompleted / childInfo.totalCredits) * 100)}% Complete</span>
              </div>
            </CardContent>
          </Card>

          {/* Academic Stats */}
          <div className="grid grid-cols-2 gap-4">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-slate-300">CGPA</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-400">{childInfo.cgpa}</div>
                <p className="text-xs text-slate-400 mt-1">Cumulative</p>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-slate-300">Current GPA</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-400">{childInfo.currentGPA}</div>
                <p className="text-xs text-slate-400 mt-1">This semester</p>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-slate-300">Credits</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-400">{childInfo.creditsCompleted}</div>
                <p className="text-xs text-slate-400 mt-1">of {childInfo.totalCredits}</p>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-slate-300">Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm font-bold text-yellow-400">Dean's List</div>
                <p className="text-xs text-slate-400 mt-1">Current</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="courses" className="w-full">
          <TabsList className="bg-slate-800/50 border border-slate-700 mb-6">
            <TabsTrigger value="courses" className="text-slate-300 data-[state=active]:text-white">
              Current Courses
            </TabsTrigger>
            <TabsTrigger value="academic" className="text-slate-300 data-[state=active]:text-white">
              Academic Trends
            </TabsTrigger>
            <TabsTrigger value="career" className="text-slate-300 data-[state=active]:text-white">
              Career Progress
            </TabsTrigger>
            <TabsTrigger value="financial" className="text-slate-300 data-[state=active]:text-white">
              Finances
            </TabsTrigger>
            <TabsTrigger value="communication" className="text-slate-300 data-[state=active]:text-white">
              Messages
            </TabsTrigger>
          </TabsList>

          {/* Courses Tab */}
          <TabsContent value="courses" className="space-y-4">
            {coursesData.map((course, i) => (
              <Card key={i} className="bg-slate-800/50 border-slate-700 backdrop-blur">
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-white">{course.name}</p>
                      <p className="text-xs text-slate-400">{course.code}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                      course.grade.startsWith('A') ? 'bg-green-900/30 text-green-300 border border-green-700/50' :
                      'bg-blue-900/30 text-blue-300 border border-blue-700/50'
                    }`}>
                      {course.grade}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex-1 mr-4">
                      <div className="w-full bg-slate-600 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full"
                          style={{ width: `${course.score}%` }}
                        />
                      </div>
                    </div>
                    <p className="text-sm font-semibold text-white">{course.score}%</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* Academic Trends */}
          <TabsContent value="academic">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">GPA Progression</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={gpaData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                    <XAxis stroke="#94a3b8" dataKey="semester" />
                    <YAxis stroke="#94a3b8" domain={[3.5, 4.0]} />
                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }} />
                    <Line type="monotone" dataKey="gpa" stroke="#3B82F6" strokeWidth={2} dot={{ fill: '#3B82F6' }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur mt-6">
              <CardHeader>
                <CardTitle className="text-white">Academic Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {academicInformation.map((info, i) => (
                    <div key={i} className="p-4 bg-slate-700/30 rounded-lg border border-slate-600/30">
                      <p className="text-xs text-slate-400 mb-1">{info.label}</p>
                      <p className="text-sm font-semibold text-white">{info.value}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Career Tab */}
          <TabsContent value="career">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Career Development & Milestones 🚀</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {careerProgress.map((item, i) => (
                    <div key={i} className="p-4 bg-slate-700/30 rounded-lg border border-slate-600/30 flex gap-4">
                      <div className="flex-shrink-0 w-3 h-3 mt-2 rounded-full bg-blue-500"></div>
                      <div className="flex-grow">
                        <p className="text-sm font-semibold text-white">{item.activity}</p>
                        <p className="text-xs text-slate-400">{item.date}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Financial Tab */}
          <TabsContent value="financial">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Financial Status 💰</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {financialStatus.map((fee, i) => (
                    <div key={i} className="p-4 bg-slate-700/30 rounded-lg border border-slate-600/30">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-white">{fee.item}</p>
                          <p className="text-xs text-slate-400">Due: {fee.dueDate}</p>
                        </div>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          fee.status === 'paid' ? 'bg-green-900/30 text-green-300 border border-green-800/50' :
                          'bg-yellow-900/30 text-yellow-300 border border-yellow-800/50'
                        }`}>
                          {fee.status === 'paid' ? '✓ Paid' : 'Pending'}
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-white">${fee.amount.toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Communication Tab */}
          <TabsContent value="communication">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Messages from University</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {communication.map((msg, i) => (
                    <div key={i} className={`p-4 rounded-lg border ${
                      msg.read ? 'bg-slate-700/30 border-slate-600/30' :
                      'bg-blue-900/20 border-blue-700/50'
                    }`}>
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-white">{msg.from}</p>
                          <p className="text-xs text-slate-400">{msg.subject}</p>
                        </div>
                        {!msg.read && (
                          <span className="px-2 py-1 bg-blue-600 text-white text-xs rounded">New</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500">{msg.date}</p>
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

