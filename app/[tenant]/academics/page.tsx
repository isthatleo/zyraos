'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Plus, TrendingUp } from 'lucide-react';

export default function AcademicsDashboard() {
  const [performanceData] = useState([
    { class: '10A', avg: 78, students: 42 },
    { class: '10B', avg: 75, students: 40 },
    { class: '9A', avg: 72, students: 38 },
    { class: '9B', avg: 76, students: 39 },
    { class: '11A', avg: 81, students: 35 },
  ]);

  const subjectPerformance = [
    { subject: 'Mathematics', avg: 76, pass: 95 },
    { subject: 'English', avg: 78, pass: 98 },
    { subject: 'Science', avg: 74, pass: 92 },
    { subject: 'History', avg: 79, pass: 97 },
    { subject: 'Geography', avg: 75, pass: 93 },
  ];

  const exams = [
    { name: 'Midterm Exam', date: '2024-03-15', status: 'Completed', classes: 5 },
    { name: 'Term 2 Assessment', date: '2024-04-20', status: 'Ongoing', classes: 3 },
    { name: 'Final Exam', date: '2024-06-10', status: 'Scheduled', classes: 8 },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Academics & Exams</h1>
            <p className="text-slate-400">Manage classes, subjects, and assessments</p>
          </div>
          <Button className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2">
            <Plus className="h-4 w-4" />
            New Exam
          </Button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium text-slate-200">Total Classes</CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">42</div>
              <p className="text-xs text-slate-400 mt-2">Across all levels</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium text-slate-200">Average Performance</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">76.4%</div>
              <p className="text-xs text-slate-400 mt-2">
                <span className="text-green-400 font-semibold">+3.2%</span> improvement
              </p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium text-slate-200">Pass Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-purple-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">94.8%</div>
              <p className="text-xs text-slate-400 mt-2">Overall pass rate</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium text-slate-200">Active Exams</CardTitle>
              <TrendingUp className="h-4 w-4 text-yellow-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">3</div>
              <p className="text-xs text-slate-400 mt-2">This term</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="classes" className="w-full">
          <TabsList className="bg-slate-800/50 border border-slate-700 mb-6">
            <TabsTrigger value="classes" className="text-slate-300 data-[state=active]:text-white">
              Classes
            </TabsTrigger>
            <TabsTrigger value="subjects" className="text-slate-300 data-[state=active]:text-white">
              Subjects
            </TabsTrigger>
            <TabsTrigger value="timetable" className="text-slate-300 data-[state=active]:text-white">
              Timetable
            </TabsTrigger>
            <TabsTrigger value="exams" className="text-slate-300 data-[state=active]:text-white">
              Exams
            </TabsTrigger>
            <TabsTrigger value="results" className="text-slate-300 data-[state=active]:text-white">
              Results
            </TabsTrigger>
          </TabsList>

          <TabsContent value="classes" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
                <CardHeader>
                  <CardTitle className="text-white">Class Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={performanceData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                      <XAxis stroke="#94a3b8" dataKey="class" />
                      <YAxis stroke="#94a3b8" />
                      <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }} />
                      <Bar dataKey="avg" fill="#3B82F6" name="Average Score" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
                <CardHeader>
                  <CardTitle className="text-white">All Classes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {performanceData.map((cls, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg border border-slate-600/30">
                        <div>
                          <p className="text-sm font-semibold text-white">{cls.class}</p>
                          <p className="text-xs text-slate-400">{cls.students} students</p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-blue-400">{cls.avg}%</p>
                          <p className="text-xs text-slate-400">Average</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="subjects" className="space-y-6">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Subject Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {subjectPerformance.map((subj, i) => (
                    <div key={i}>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-slate-300 font-semibold">{subj.subject}</span>
                        <span className="text-sm text-slate-300">Avg: {subj.avg}% | Pass: {subj.pass}%</span>
                      </div>
                      <div className="w-full bg-slate-700/50 rounded-full h-3">
                        <div
                          className="bg-gradient-to-r from-green-500 to-green-600 h-3 rounded-full"
                          style={{ width: `${subj.avg}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="timetable">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Timetable Management</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-400">Timetable interface will be displayed here</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="exams">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Exam Schedule</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {exams.map((exam, i) => (
                    <div key={i} className="p-4 bg-slate-700/30 rounded-lg border border-slate-600/30 flex justify-between items-center">
                      <div>
                        <p className="text-sm font-semibold text-white">{exam.name}</p>
                        <p className="text-xs text-slate-400">Date: {exam.date} | Classes: {exam.classes}</p>
                      </div>
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                        exam.status === 'Completed' ? 'bg-green-900/30 text-green-300 border border-green-800/50' :
                        exam.status === 'Ongoing' ? 'bg-yellow-900/30 text-yellow-300 border border-yellow-800/50' :
                        'bg-blue-900/30 text-blue-300 border border-blue-800/50'
                      }`}>
                        {exam.status}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="results">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Results & Report Cards</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-400">Results management interface will be displayed here</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

