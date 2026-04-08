'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { BookOpen, Clock, AlertCircle, TrendingUp, Download } from 'lucide-react';

export default function StudentDashboard() {
  const [studentData] = useState({
    name: 'John Doe',
    class: '10A',
    attendance: 94,
    averageScore: 78,
    totalAssignments: 24,
    submittedAssignments: 22,
  });

  const [performanceData] = useState([
    { subject: 'Mathematics', score: 85, previous: 78 },
    { subject: 'English', score: 88, previous: 82 },
    { subject: 'Science', score: 76, previous: 73 },
    { subject: 'History', score: 79, previous: 75 },
    { subject: 'Geography', score: 82, previous: 79 },
  ]);

  const [recentAssignments] = useState([
    { id: '1', subject: 'Mathematics', title: 'Chapter 5 Exercise', dueDate: '2024-03-20', status: 'Submitted', score: '18/20' },
    { id: '2', subject: 'English', title: 'Essay Writing', dueDate: '2024-03-22', status: 'Pending', score: '-' },
    { id: '3', subject: 'Science', title: 'Lab Report', dueDate: '2024-03-18', status: 'Submitted', score: '15/20' },
  ]);

  const schedule = [
    { time: '08:00-09:00', subject: 'Mathematics', teacher: 'Mr. Smith', room: '101' },
    { time: '09:00-10:00', subject: 'English', teacher: 'Ms. Johnson', room: '102' },
    { time: '10:30-11:30', subject: 'Science', teacher: 'Mr. Brown', room: '103' },
    { time: '11:30-12:30', subject: 'History', teacher: 'Ms. Davis', room: '104' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Welcome, {studentData.name}!</h1>
          <p className="text-slate-400">Class {studentData.class} - Academic Dashboard</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium text-slate-200">Attendance</CardTitle>
              <BookOpen className="h-4 w-4 text-blue-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{studentData.attendance}%</div>
              <p className="text-xs text-slate-400 mt-2">This term</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium text-slate-200">Average Score</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{studentData.averageScore}%</div>
              <p className="text-xs text-slate-400 mt-2">Overall GPA</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium text-slate-200">Assignments</CardTitle>
              <Clock className="h-4 w-4 text-yellow-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{studentData.submittedAssignments}/{studentData.totalAssignments}</div>
              <p className="text-xs text-slate-400 mt-2">Completed</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium text-slate-200">Status</CardTitle>
              <AlertCircle className="h-4 w-4 text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">On Track</div>
              <p className="text-xs text-slate-400 mt-2">Good standing</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="performance" className="w-full">
          <TabsList className="bg-slate-800/50 border border-slate-700 mb-6">
            <TabsTrigger value="performance" className="text-slate-300 data-[state=active]:text-white">
              Performance
            </TabsTrigger>
            <TabsTrigger value="assignments" className="text-slate-300 data-[state=active]:text-white">
              Assignments
            </TabsTrigger>
            <TabsTrigger value="schedule" className="text-slate-300 data-[state=active]:text-white">
              Schedule
            </TabsTrigger>
            <TabsTrigger value="resources" className="text-slate-300 data-[state=active]:text-white">
              Resources
            </TabsTrigger>
          </TabsList>

          <TabsContent value="performance" className="space-y-6">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Subject-wise Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {performanceData.map((item, i) => (
                    <div key={i}>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-slate-300">{item.subject}</span>
                        <span className="text-sm font-semibold text-white">{item.score}%</span>
                      </div>
                      <div className="w-full bg-slate-700/50 rounded-full h-2">
                        <div className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full" style={{ width: `${item.score}%` }} />
                      </div>
                      <p className="text-xs text-slate-500 mt-1">Previous: {item.previous}%</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="assignments">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Recent Assignments</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentAssignments.map((assignment) => (
                    <div key={assignment.id} className="p-4 bg-slate-700/30 rounded-lg border border-slate-600/30">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="text-sm font-semibold text-white">{assignment.title}</p>
                          <p className="text-xs text-slate-400">{assignment.subject}</p>
                        </div>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          assignment.status === 'Submitted' ? 'bg-green-900/30 text-green-300 border border-green-800/50' :
                          'bg-yellow-900/30 text-yellow-300 border border-yellow-800/50'
                        }`}>
                          {assignment.status}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <p className="text-xs text-slate-400">Due: {assignment.dueDate}</p>
                        <p className="text-xs font-semibold text-blue-400">{assignment.score}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="schedule">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Today's Schedule</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {schedule.map((item, i) => (
                    <div key={i} className="p-4 bg-slate-700/30 rounded-lg border border-slate-600/30 flex gap-4">
                      <div className="flex-shrink-0">
                        <p className="text-sm font-semibold text-blue-400">{item.time}</p>
                      </div>
                      <div className="flex-grow">
                        <p className="text-sm font-semibold text-white">{item.subject}</p>
                        <p className="text-xs text-slate-400">{item.teacher} - Room {item.room}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="resources">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Learning Resources</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-400">Learning resources interface will be displayed here</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

