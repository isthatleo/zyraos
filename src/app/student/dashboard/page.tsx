/**
 * Student Dashboard Page
 * Path: src/app/student/dashboard/page.tsx
 */

'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, TrendingUp, Calendar, AlertCircle, Award, BarChart3 } from 'lucide-react';

export default function StudentDashboard() {
  const [metrics] = useState({
    attendance: 92,
    averageScore: 78,
    assignmentsSubmitted: 22,
    totalAssignments: 24,
  });

  const [todaySchedule] = useState([
    { time: '08:00 - 09:00', subject: 'Mathematics', teacher: 'Mr. Smith', room: '101' },
    { time: '09:30 - 10:30', subject: 'English', teacher: 'Ms. Johnson', room: '102' },
    { time: '11:00 - 12:00', subject: 'Science', teacher: 'Mr. Brown', room: '103' },
  ]);

  const [recentGrades] = useState([
    { subject: 'Mathematics', type: 'Assignment', score: 18, maxScore: 20, date: '2024-03-15' },
    { subject: 'English', type: 'Quiz', score: 88, maxScore: 100, date: '2024-03-12' },
    { subject: 'Science', type: 'Project', score: 92, maxScore: 100, date: '2024-03-10' },
  ]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Welcome, Alex Thompson!</h1>
        <p className="text-slate-400">JHS 2A - Academic Dashboard</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-200">Attendance</CardTitle>
            <Calendar className="h-5 w-5 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{metrics.attendance}%</div>
            <p className="text-xs text-slate-400 mt-2">This term</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-200">Average Score</CardTitle>
            <TrendingUp className="h-5 w-5 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{metrics.averageScore}%</div>
            <p className="text-xs text-slate-400 mt-2">Overall GPA</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-200">Assignments</CardTitle>
            <BookOpen className="h-5 w-5 text-yellow-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {metrics.assignmentsSubmitted}/{metrics.totalAssignments}
            </div>
            <p className="text-xs text-slate-400 mt-2">Completed</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-200">Status</CardTitle>
            <AlertCircle className="h-5 w-5 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">On Track</div>
            <p className="text-xs text-slate-400 mt-2">Good standing</p>
          </CardContent>
        </Card>
      </div>

      {/* Today's Schedule & Recent Grades */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Schedule */}
        <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-white">Today's Schedule</CardTitle>
            <CardDescription className="text-slate-400">Classes for today</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {todaySchedule.map((period, i) => (
                <div key={i} className="p-3 bg-slate-700/30 rounded-lg border border-slate-600/30">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-white">{period.time}</p>
                      <p className="text-xs text-slate-400">{period.subject}</p>
                    </div>
                    <div className="text-right text-xs text-slate-400">
                      <p>{period.teacher}</p>
                      <p>Room {period.room}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Grades */}
        <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-white">Recent Grades</CardTitle>
            <CardDescription className="text-slate-400">Latest assessment results</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentGrades.map((grade, i) => (
                <div key={i} className="p-3 bg-slate-700/30 rounded-lg border border-slate-600/30">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-sm font-semibold text-white">{grade.subject}</p>
                      <p className="text-xs text-slate-400">{grade.type}</p>
                    </div>
                    <span className="text-lg font-bold text-blue-400">
                      {grade.score}/{grade.maxScore}
                    </span>
                  </div>
                  <div className="w-full bg-slate-600 rounded-full h-1.5">
                    <div
                      className="bg-blue-500 h-1.5 rounded-full"
                      style={{ width: `${(grade.score / grade.maxScore) * 100}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{grade.date}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Subject Performance */}
      <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-white">Subject Performance</CardTitle>
          <CardDescription className="text-slate-400">Current grades by subject</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { name: 'Mathematics', score: 85 },
              { name: 'English', score: 88 },
              { name: 'Science', score: 76 },
              { name: 'History', score: 79 },
              { name: 'Geography', score: 82 },
            ].map((subject) => (
              <div key={subject.name}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm text-slate-300">{subject.name}</span>
                  <span className="text-sm font-semibold text-white">{subject.score}%</span>
                </div>
                <div className="w-full bg-slate-600 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full"
                    style={{ width: `${subject.score}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

