/**
 * Teacher Dashboard Main Page
 * Path: src/app/teacher/dashboard/page.tsx
 */

'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Clock, CheckCircle, AlertCircle, BookOpen, TrendingUp } from 'lucide-react';

export default function TeacherDashboard() {
  const [stats] = useState({
    totalClasses: 5,
    totalStudents: 145,
    todayPeriods: 3,
    pendingGrading: 12,
  });

  const [myClasses] = useState([
    {
      id: '1',
      name: 'JHS 1 English',
      subject: 'English Language',
      students: 32,
      room: '101',
      nextClass: '09:00 AM',
    },
    {
      id: '2',
      name: 'JHS 2 English',
      subject: 'English Language',
      students: 30,
      room: '102',
      nextClass: '10:30 AM',
    },
    {
      id: '3',
      name: 'SHS 1 Literature',
      subject: 'Literature in English',
      students: 28,
      room: '201',
      nextClass: '02:00 PM',
    },
    {
      id: '4',
      name: 'SHS 2 Literature',
      subject: 'Literature in English',
      students: 31,
      room: '202',
      nextClass: '03:30 PM',
    },
    {
      id: '5',
      name: 'SHS 3 Literature',
      subject: 'Literature in English',
      students: 24,
      room: '203',
      nextClass: 'No class today',
    },
  ]);

  const [todaySchedule] = useState([
    {
      time: '08:00 - 09:00',
      class: 'JHS 1 English',
      room: '101',
      students: 32,
    },
    {
      time: '09:30 - 10:30',
      class: 'JHS 2 English',
      room: '102',
      students: 30,
    },
    {
      time: '10:45 - 11:45',
      class: 'Break',
      room: '-',
      students: 0,
    },
    {
      time: '02:00 - 03:00',
      class: 'SHS 1 Literature',
      room: '201',
      students: 28,
    },
    {
      time: '03:30 - 04:30',
      class: 'SHS 2 Literature',
      room: '202',
      students: 31,
    },
  ]);

  const [pendingTasks] = useState([
    {
      id: '1',
      title: 'Grade JHS 1 Assignments',
      count: 32,
      dueDate: 'Today',
      priority: 'high',
    },
    {
      id: '2',
      title: 'Review SHS 2 Essays',
      count: 15,
      dueDate: 'Tomorrow',
      priority: 'medium',
    },
    {
      id: '3',
      title: 'Update Attendance Records',
      count: 0,
      dueDate: 'This Week',
      priority: 'low',
    },
  ]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Teacher Dashboard</h1>
        <p className="text-slate-400">Welcome back, Ms. Johnson! Here's your teaching overview.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-200">My Classes</CardTitle>
            <BookOpen className="h-5 w-5 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.totalClasses}</div>
            <p className="text-xs text-slate-400 mt-2">Classes assigned</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-200">Total Students</CardTitle>
            <Users className="h-5 w-5 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.totalStudents}</div>
            <p className="text-xs text-slate-400 mt-2">Across all classes</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-200">Today's Periods</CardTitle>
            <Clock className="h-5 w-5 text-yellow-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.todayPeriods}</div>
            <p className="text-xs text-slate-400 mt-2">Classes scheduled</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-200">Pending Grading</CardTitle>
            <AlertCircle className="h-5 w-5 text-red-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.pendingGrading}</div>
            <p className="text-xs text-slate-400 mt-2">Assignments to grade</p>
          </CardContent>
        </Card>
      </div>

      {/* Today's Schedule & My Classes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Schedule */}
        <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-white">Today's Schedule</CardTitle>
            <CardDescription className="text-slate-400">Classes and periods for today</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {todaySchedule.map((period, i) => (
                <div
                  key={i}
                  className="p-3 bg-slate-700/30 rounded-lg border border-slate-600/30 flex items-center gap-3"
                >
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-white">{period.time}</p>
                    <p className="text-xs text-slate-400">{period.class}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-semibold text-slate-300">Room {period.room}</p>
                    {period.students > 0 && (
                      <p className="text-xs text-slate-500">{period.students} students</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Pending Tasks */}
        <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-white">Pending Tasks</CardTitle>
            <CardDescription className="text-slate-400">Items awaiting attention</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingTasks.map((task) => (
                <div
                  key={task.id}
                  className={`p-3 bg-slate-700/30 rounded-lg border ${
                    task.priority === 'high'
                      ? 'border-red-600/30'
                      : task.priority === 'medium'
                      ? 'border-yellow-600/30'
                      : 'border-slate-600/30'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-white">{task.title}</p>
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        task.priority === 'high'
                          ? 'bg-red-900/30 text-red-300'
                          : task.priority === 'medium'
                          ? 'bg-yellow-900/30 text-yellow-300'
                          : 'bg-green-900/30 text-green-300'
                      }`}
                    >
                      {task.priority}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-400">
                      {task.count > 0 ? `${task.count} items` : 'View details'}
                    </span>
                    <span className="text-xs text-slate-500">Due: {task.dueDate}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* My Classes Grid */}
      <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-white">My Classes</CardTitle>
          <CardDescription className="text-slate-400">All assigned classes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {myClasses.map((cls) => (
              <div
                key={cls.id}
                className="p-4 bg-gradient-to-br from-slate-700/50 to-slate-800/50 rounded-lg border border-slate-600/30 hover:border-blue-500/50 transition-colors cursor-pointer"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-sm font-semibold text-white">{cls.name}</h3>
                    <p className="text-xs text-slate-400">{cls.subject}</p>
                  </div>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-900/30 text-blue-300 border border-blue-800/50">
                    Room {cls.room}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-slate-600/30">
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <Users className="h-4 w-4" />
                    <span>{cls.students} students</span>
                  </div>
                  <p className="text-xs font-semibold text-slate-300">{cls.nextClass}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-white">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white">
              Mark Attendance
            </Button>
            <Button className="bg-green-600 hover:bg-green-700 text-white">
              Enter Grades
            </Button>
            <Button className="bg-purple-600 hover:bg-purple-700 text-white">
              View Analytics
            </Button>
            <Button className="bg-orange-600 hover:bg-orange-700 text-white">
              Message Parents
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

