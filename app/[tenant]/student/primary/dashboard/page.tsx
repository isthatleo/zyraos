'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { BookOpen, Clock, TrendingUp, Award, Calendar, Star, Home, Users } from 'lucide-react';

export default function PrimaryStudentDashboard() {
  const [studentInfo] = useState({
    name: 'Sarah Johnson',
    class: 'Grade 2A',
    rollNumber: '2024001',
    attendance: 95,
    averageScore: 85,
    rank: 3,
    totalStudents: 25,
  });

  const [todaySchedule] = useState([
    { time: '08:00-09:00', subject: 'Mathematics', teacher: 'Mrs. Davis', room: '101', completed: true },
    { time: '09:00-10:00', subject: 'English', teacher: 'Mr. Wilson', room: '102', completed: true },
    { time: '10:30-11:30', subject: 'Science', teacher: 'Ms. Brown', room: '103', current: true },
    { time: '11:30-12:30', subject: 'Social Studies', teacher: 'Mrs. Taylor', room: '104', upcoming: true },
  ]);

  const [subjectGrades] = useState([
    { subject: 'Mathematics', grade: 'A', score: 88, teacher: 'Mrs. Davis' },
    { subject: 'English', grade: 'A-', score: 85, teacher: 'Mr. Wilson' },
    { subject: 'Science', grade: 'B+', score: 82, teacher: 'Ms. Brown' },
    { subject: 'Social Studies', grade: 'A', score: 90, teacher: 'Mrs. Taylor' },
    { subject: 'Art', grade: 'A', score: 92, teacher: 'Ms. Johnson' },
    { subject: 'Physical Education', grade: 'B+', score: 87, teacher: 'Mr. Davis' },
  ]);

  const [upcomingAssignments] = useState([
    { subject: 'Mathematics', title: 'Addition Practice', dueDate: '2024-03-20', status: 'pending' },
    { subject: 'English', title: 'Reading Homework', dueDate: '2024-03-22', status: 'pending' },
    { subject: 'Science', title: 'Plant Observation', dueDate: '2024-03-18', status: 'completed' },
  ]);

  const [achievements] = useState([
    { title: 'Perfect Attendance', description: 'March 2024', icon: '🏆' },
    { title: 'Math Star', description: 'Highest score in class', icon: '⭐' },
    { title: 'Reading Champion', description: 'Advanced reader level', icon: '📚' },
  ]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Welcome, {studentInfo.name}! 🌟</h1>
          <p className="text-slate-400">Grade 2A • Roll Number: {studentInfo.rollNumber}</p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium text-slate-200">My Attendance</CardTitle>
              <Calendar className="h-4 w-4 text-blue-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{studentInfo.attendance}%</div>
              <p className="text-xs text-slate-400 mt-2">This term</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium text-slate-200">Average Score</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{studentInfo.averageScore}%</div>
              <p className="text-xs text-slate-400 mt-2">Overall grade</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium text-slate-200">Class Rank</CardTitle>
              <Award className="h-4 w-4 text-yellow-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">#{studentInfo.rank}</div>
              <p className="text-xs text-slate-400 mt-2">Out of {studentInfo.totalStudents} students</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium text-slate-200">Assignments</CardTitle>
              <BookOpen className="h-4 w-4 text-purple-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">8/10</div>
              <p className="text-xs text-slate-400 mt-2">Completed this week</p>
            </CardContent>
          </Card>
        </div>

        {/* Primary Student Tabs */}
        <Tabs defaultValue="today" className="w-full">
          <TabsList className="bg-slate-800/50 border border-slate-700 mb-6">
            <TabsTrigger value="today" className="text-slate-300 data-[state=active]:text-white">
              Today's Classes
            </TabsTrigger>
            <TabsTrigger value="grades" className="text-slate-300 data-[state=active]:text-white">
              My Grades
            </TabsTrigger>
            <TabsTrigger value="assignments" className="text-slate-300 data-[state=active]:text-white">
              Assignments
            </TabsTrigger>
            <TabsTrigger value="achievements" className="text-slate-300 data-[state=active]:text-white">
              Achievements
            </TabsTrigger>
            <TabsTrigger value="activities" className="text-slate-300 data-[state=active]:text-white">
              Activities
            </TabsTrigger>
            <TabsTrigger value="messages" className="text-slate-300 data-[state=active]:text-white">
              Messages
            </TabsTrigger>
          </TabsList>

          <TabsContent value="today" className="space-y-6">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Today's Schedule</CardTitle>
                <CardDescription className="text-slate-400">Your classes and activities for today</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {todaySchedule.map((session, i) => (
                    <div key={i} className={`p-4 rounded-lg border ${
                      session.completed ? 'bg-green-900/20 border-green-700/50' :
                      session.current ? 'bg-blue-900/20 border-blue-700/50' :
                      'bg-slate-700/30 border-slate-600/30'
                    }`}>
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="text-sm font-semibold text-white">{session.subject}</p>
                          <p className="text-xs text-slate-400">{session.teacher} • Room {session.room}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-blue-400">{session.time}</p>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium mt-1 ${
                            session.completed ? 'bg-green-900/30 text-green-300' :
                            session.current ? 'bg-blue-900/30 text-blue-300' :
                            'bg-gray-900/30 text-gray-300'
                          }`}>
                            {session.completed ? '✓ Completed' :
                             session.current ? 'In Progress' : 'Upcoming'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="grades">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">My Subject Grades</CardTitle>
                <CardDescription className="text-slate-400">Your performance in each subject</CardDescription>
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

          <TabsContent value="assignments">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">My Assignments</CardTitle>
                <CardDescription className="text-slate-400">Homework and assignments to complete</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {upcomingAssignments.map((assignment, i) => (
                    <div key={i} className="p-4 bg-slate-700/30 rounded-lg border border-slate-600/30">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="text-sm font-semibold text-white">{assignment.title}</p>
                          <p className="text-xs text-slate-400">{assignment.subject}</p>
                        </div>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          assignment.status === 'completed' ? 'bg-green-900/30 text-green-300 border border-green-800/50' :
                          'bg-yellow-900/30 text-yellow-300 border border-yellow-800/50'
                        }`}>
                          {assignment.status === 'completed' ? '✓ Completed' : 'Pending'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <p className="text-xs text-slate-400">Due: {assignment.dueDate}</p>
                        {assignment.status === 'pending' && (
                          <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                            Start Assignment
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="achievements">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">My Achievements 🏆</CardTitle>
                <CardDescription className="text-slate-400">Awards, certificates, and special recognitions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {achievements.map((achievement, i) => (
                    <div key={i} className="p-4 bg-slate-700/30 rounded-lg border border-slate-600/30 text-center">
                      <div className="text-3xl mb-2">{achievement.icon}</div>
                      <p className="text-sm font-semibold text-white mb-1">{achievement.title}</p>
                      <p className="text-xs text-slate-400">{achievement.description}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activities">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">School Activities</CardTitle>
                <CardDescription className="text-slate-400">Sports, arts, clubs, and extracurricular activities</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-slate-400">School activities interface will be displayed here</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="messages">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Messages from Teachers</CardTitle>
                <CardDescription className="text-slate-400">Important notices and communications</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-slate-400">Messages interface will be displayed here</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
