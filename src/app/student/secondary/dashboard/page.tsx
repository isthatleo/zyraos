/**
 * Student Dashboard - Secondary/High School Level
 * Path: src/app/student/secondary/dashboard/page.tsx
 */

'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { BookOpen, TrendingUp, Award, Users, Calendar, FileText, Clock } from 'lucide-react';

export default function SecondaryStudentDashboard() {
  const [studentData] = useState({
    name: 'Alex Thompson',
    class: 'Grade 10A',
    school: 'Metropolitan High School',
    gpa: 3.85,
    attendance: 94,
    averageScore: 85,
    rank: 8,
    totalSubjects: 7,
    submittedAssignments: 34,
  });

  const [subjectsData] = useState([
    { subject: 'Mathematics', grade: 'A', score: 88, teacher: 'Mr. Johnson', nextAssessment: '2 days' },
    { subject: 'English Literature', grade: 'A-', score: 85, teacher: 'Mrs. Davis', nextAssessment: '5 days' },
    { subject: 'Physics', grade: 'B+', score: 82, teacher: 'Mr. Wilson', nextAssessment: '3 days' },
    { subject: 'Chemistry', grade: 'A', score: 87, teacher: 'Ms. Brown', nextAssessment: '1 week' },
    { subject: 'History', grade: 'A-', score: 86, teacher: 'Mrs. Taylor', nextAssessment: '4 days' },
    { subject: 'Geography', grade: 'B+', score: 81, teacher: 'Mr. Lee', nextAssessment: '6 days' },
    { subject: 'Computer Science', grade: 'A', score: 89, teacher: 'Mr. Zhang', nextAssessment: 'Tomorrow' },
  ]);

  const [assignmentsData] = useState([
    { subject: 'Mathematics', title: 'Algebra Problem Set', dueDate: '2024-03-20', status: 'submitted', score: '18/20' },
    { subject: 'English', title: 'Essay on Shakespeare', dueDate: '2024-03-25', status: 'submitted', score: '17/20' },
    { subject: 'Physics', title: 'Lab Report', dueDate: '2024-03-22', status: 'submitted', score: '16/20' },
    { subject: 'History', title: 'Research Project', dueDate: '2024-03-28', status: 'in-progress', score: '-' },
  ]);

  const [performanceData] = useState([
    { month: 'Jan', average: 82 },
    { month: 'Feb', average: 84 },
    { month: 'Mar', average: 85 },
    { month: 'Apr', average: 83 },
    { month: 'May', average: 87 },
    { month: 'Jun', average: 85 },
  ]);

  const [upcomingExams] = useState([
    { subject: 'Mathematics', date: '2024-03-25', type: 'Midterm Exam', duration: '3 hours' },
    { subject: 'Physics', date: '2024-03-27', type: 'Unit Test', duration: '1.5 hours' },
    { subject: 'English', date: '2024-04-01', type: 'Essay Exam', duration: '2 hours' },
    { subject: 'Chemistry', date: '2024-04-03', type: 'Practical Exam', duration: '2 hours' },
  ]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Welcome, {studentData.name}! 📚</h1>
            <p className="text-slate-400">{studentData.class} • {studentData.school}</p>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-300">GPA</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-400">{studentData.gpa}</div>
              <p className="text-xs text-slate-400 mt-1">Out of 4.0</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-300">Attendance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-400">{studentData.attendance}%</div>
              <p className="text-xs text-slate-400 mt-1">This semester</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-300">Average Score</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-400">{studentData.averageScore}%</div>
              <p className="text-xs text-slate-400 mt-1">Overall performance</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-300">Class Rank</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-400">#{studentData.rank}</div>
              <p className="text-xs text-slate-400 mt-1">Out of 45 students</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="subjects" className="w-full">
          <TabsList className="bg-slate-800/50 border border-slate-700 mb-6">
            <TabsTrigger value="subjects" className="text-slate-300 data-[state=active]:text-white">
              All Subjects
            </TabsTrigger>
            <TabsTrigger value="assignments" className="text-slate-300 data-[state=active]:text-white">
              Assignments
            </TabsTrigger>
            <TabsTrigger value="exams" className="text-slate-300 data-[state=active]:text-white">
              Upcoming Exams
            </TabsTrigger>
            <TabsTrigger value="performance" className="text-slate-300 data-[state=active]:text-white">
              Performance
            </TabsTrigger>
          </TabsList>

          {/* Subjects */}
          <TabsContent value="subjects" className="space-y-6">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Subject Grades & Performance</CardTitle>
                <CardDescription className="text-slate-400">{studentData.totalSubjects} Subjects</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {subjectsData.map((subject, i) => (
                    <div key={i} className="p-4 bg-slate-700/30 rounded-lg border border-slate-600/30">
                      <div className="flex justify-between items-center mb-3">
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-white">{subject.subject}</p>
                          <p className="text-xs text-slate-400">Teacher: {subject.teacher}</p>
                        </div>
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold ${
                          subject.grade.startsWith('A') ? 'bg-green-900/30 text-green-300 border border-green-700/50' :
                          subject.grade.startsWith('B') ? 'bg-blue-900/30 text-blue-300 border border-blue-700/50' :
                          'bg-yellow-900/30 text-yellow-300 border border-yellow-700/50'
                        }`}>
                          {subject.grade}
                        </span>
                      </div>
                      <div className="flex justify-between items-center mb-2">
                        <div className="flex-1 mr-4">
                          <div className="w-full bg-slate-600 rounded-full h-2">
                            <div
                              className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full"
                              style={{ width: `${subject.score}%` }}
                            />
                          </div>
                        </div>
                        <p className="text-sm font-semibold text-white w-12">{subject.score}%</p>
                      </div>
                      <p className="text-xs text-slate-500">Next Assessment: {subject.nextAssessment}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Assignments */}
          <TabsContent value="assignments">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Recent Assignments</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {assignmentsData.map((assignment, i) => (
                    <div key={i} className="p-4 bg-slate-700/30 rounded-lg border border-slate-600/30">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-white">{assignment.title}</p>
                          <p className="text-xs text-slate-400">{assignment.subject}</p>
                        </div>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          assignment.status === 'submitted' ? 'bg-green-900/30 text-green-300 border border-green-800/50' :
                          'bg-yellow-900/30 text-yellow-300 border border-yellow-800/50'
                        }`}>
                          {assignment.status === 'submitted' ? '✓ Submitted' : 'In Progress'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <p className="text-xs text-slate-400">Due: {assignment.dueDate}</p>
                        {assignment.score !== '-' && (
                          <p className="text-xs font-semibold text-blue-400">Score: {assignment.score}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Exams */}
          <TabsContent value="exams">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Upcoming Exams</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {upcomingExams.map((exam, i) => (
                    <div key={i} className="p-4 bg-slate-700/30 rounded-lg border border-slate-600/30">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="text-sm font-semibold text-white">{exam.subject}</p>
                          <p className="text-xs text-slate-400">{exam.type}</p>
                        </div>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-900/30 text-orange-300 border border-orange-800/50">
                          📅 {exam.date}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">Duration: {exam.duration}</p>
                      <div className="mt-3 flex gap-2">
                        <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                          Study Guide
                        </Button>
                        <Button size="sm" variant="outline" className="border-slate-600 text-slate-300">
                          Schedule Review
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Performance */}
          <TabsContent value="performance">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Performance Trend</CardTitle>
                <CardDescription className="text-slate-400">Monthly average scores</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={performanceData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                    <XAxis stroke="#94a3b8" dataKey="month" />
                    <YAxis stroke="#94a3b8" domain={[70, 95]} />
                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }} />
                    <Legend />
                    <Line type="monotone" dataKey="average" stroke="#3B82F6" strokeWidth={2} dot={{ fill: '#3B82F6' }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

