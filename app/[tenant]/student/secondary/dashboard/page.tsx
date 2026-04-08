'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { BookOpen, Clock, TrendingUp, Award, Calendar, Star, Trophy, Music, Users } from 'lucide-react';

export default function SecondaryStudentDashboard() {
  const [studentInfo] = useState({
    name: 'Alex Thompson',
    class: 'JHS 2A',
    rollNumber: '20241001',
    attendance: 92,
    averageScore: 78,
    rank: 8,
    totalStudents: 45,
    house: 'Blue House',
  });

  const [todaySchedule] = useState([
    { time: '08:00-09:00', subject: 'Mathematics', teacher: 'Mr. Johnson', room: '201', completed: true },
    { time: '09:00-10:00', subject: 'English Literature', teacher: 'Mrs. Davis', room: '202', completed: true },
    { time: '10:30-11:30', subject: 'Integrated Science', teacher: 'Ms. Brown', room: '203', current: true },
    { time: '11:30-12:30', subject: 'Social Studies', teacher: 'Mr. Wilson', room: '204', upcoming: true },
    { time: '14:00-15:00', subject: 'French', teacher: 'Mrs. Taylor', room: '205', upcoming: true },
  ]);

  const [subjectGrades] = useState([
    { subject: 'Mathematics', grade: 'B+', score: 82, teacher: 'Mr. Johnson', trend: 'up' },
    { subject: 'English', grade: 'A-', score: 88, teacher: 'Mrs. Davis', trend: 'up' },
    { subject: 'Integrated Science', grade: 'B', score: 75, teacher: 'Ms. Brown', trend: 'down' },
    { subject: 'Social Studies', grade: 'A', score: 92, teacher: 'Mr. Wilson', trend: 'up' },
    { subject: 'French', grade: 'B+', score: 85, teacher: 'Mrs. Taylor', trend: 'stable' },
    { subject: 'ICT', grade: 'A', score: 90, teacher: 'Mr. Davis', trend: 'up' },
    { subject: 'Physical Education', grade: 'A-', score: 87, teacher: 'Ms. Johnson', trend: 'stable' },
  ]);

  const [upcomingAssessments] = useState([
    { subject: 'Mathematics', title: 'Algebra Test', dueDate: '2024-03-25', type: 'exam', weight: 20 },
    { subject: 'English', title: 'Literature Essay', dueDate: '2024-03-28', type: 'assignment', weight: 15 },
    { subject: 'Science', title: 'Physics Lab Report', dueDate: '2024-04-02', type: 'project', weight: 25 },
    { subject: 'Social Studies', title: 'History Presentation', dueDate: '2024-04-05', type: 'presentation', weight: 15 },
  ]);

  const [clubActivities] = useState([
    { club: 'Debate Club', role: 'Member', meetings: 'Wed 15:00', nextEvent: 'Regional Competition - March 30' },
    { club: 'Football Team', role: 'Striker', meetings: 'Mon & Wed 16:00', nextEvent: 'Inter-school Match - April 5' },
  ]);

  const [achievements] = useState([
    { title: 'Debate Champion', description: 'School Debate Competition 2024', icon: '🏆', date: 'March 2024' },
    { title: 'Math Excellence', description: 'Highest score in Algebra', icon: '⭐', date: 'February 2024' },
    { title: 'Sports Star', description: 'MVP in Football Tournament', icon: '⚽', date: 'January 2024' },
  ]);

  const [performanceData] = useState([
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
            <h1 className="text-4xl font-bold text-white mb-2">Welcome back, {studentInfo.name}! 🎓</h1>
            <p className="text-slate-400">JHS 2A • Roll Number: {studentInfo.rollNumber} • {studentInfo.house}</p>
          </div>
          <Button className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            View Full Schedule
          </Button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium text-slate-200">Attendance</CardTitle>
              <Calendar className="h-4 w-4 text-blue-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{studentInfo.attendance}%</div>
              <p className="text-xs text-slate-400 mt-2">This term</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium text-slate-200">Average Grade</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{studentInfo.averageScore}%</div>
              <p className="text-xs text-slate-400 mt-2">Overall performance</p>
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
              <CardTitle className="text-sm font-medium text-slate-200">Club Activities</CardTitle>
              <Music className="h-4 w-4 text-purple-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{clubActivities.length}</div>
              <p className="text-xs text-slate-400 mt-2">Active memberships</p>
            </CardContent>
          </Card>
        </div>

        {/* Secondary Student Tabs */}
        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList className="bg-slate-800/50 border border-slate-700 mb-6">
            <TabsTrigger value="dashboard" className="text-slate-300 data-[state=active]:text-white">
              My Dashboard
            </TabsTrigger>
            <TabsTrigger value="schedule" className="text-slate-300 data-[state=active]:text-white">
              Today's Schedule
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
            <TabsTrigger value="achievements" className="text-slate-300 data-[state=active]:text-white">
              Achievements
            </TabsTrigger>
            <TabsTrigger value="progress" className="text-slate-300 data-[state=active]:text-white">
              Progress Report
            </TabsTrigger>
            <TabsTrigger value="messages" className="text-slate-300 data-[state=active]:text-white">
              Messages
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Performance Trend */}
              <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
                <CardHeader>
                  <CardTitle className="text-white">Academic Performance Trend</CardTitle>
                  <CardDescription className="text-slate-400">Your progress over the past 6 months</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={performanceData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                      <XAxis stroke="#94a3b8" dataKey="month" />
                      <YAxis stroke="#94a3b8" domain={[60, 100]} />
                      <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }} />
                      <Bar dataKey="average" fill="#3B82F6" name="Average Score %" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Quick Stats */}
              <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
                <CardHeader>
                  <CardTitle className="text-white">Quick Overview</CardTitle>
                  <CardDescription className="text-slate-400">Your current academic status</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-400">Subjects Passed:</span>
                      <span className="text-sm font-semibold text-green-400">6/7</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-400">Assignments Completed:</span>
                      <span className="text-sm font-semibold text-white">24/28</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-400">Club Participation:</span>
                      <span className="text-sm font-semibold text-purple-400">2 clubs</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-400">Behavioral Rating:</span>
                      <span className="text-sm font-semibold text-blue-400">Excellent</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="schedule" className="space-y-6">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Today's Class Schedule</CardTitle>
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
                <CardTitle className="text-white">Subject Grades & Performance</CardTitle>
                <CardDescription className="text-slate-400">Your grades in each subject with trends</CardDescription>
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
                            {subject.trend === 'up' ? '↗' : subject.trend === 'down' ? '↘' : '→'}
                          </span>
                        </div>
                      </div>
                      <div className="w-full bg-slate-600 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full"
                          style={{ width: `${subject.score}%` }}
                        />
                      </div>
                      <p className="text-xs text-slate-500 mt-1">{subject.score}%</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="assessments">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Upcoming Assessments</CardTitle>
                <CardDescription className="text-slate-400">Exams, assignments, and projects coming up</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {upcomingAssessments.map((assessment, i) => (
                    <div key={i} className="p-4 bg-slate-700/30 rounded-lg border border-slate-600/30">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="text-sm font-semibold text-white">{assessment.title}</p>
                          <p className="text-xs text-slate-400">{assessment.subject} • {assessment.weight}% of grade</p>
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
                        <p className="text-xs text-slate-400">Due: {assessment.dueDate}</p>
                        <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                          Prepare
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
                <CardTitle className="text-white">My Clubs & Activities</CardTitle>
                <CardDescription className="text-slate-400">Extracurricular activities and special interests</CardDescription>
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
                      <p className="text-xs text-slate-400">Next: {club.nextEvent}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="achievements">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">My Achievements & Awards 🏆</CardTitle>
                <CardDescription className="text-slate-400">Certificates, awards, and special recognitions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {achievements.map((achievement, i) => (
                    <div key={i} className="p-4 bg-slate-700/30 rounded-lg border border-slate-600/30">
                      <div className="text-3xl mb-2">{achievement.icon}</div>
                      <p className="text-sm font-semibold text-white mb-1">{achievement.title}</p>
                      <p className="text-xs text-slate-400 mb-2">{achievement.description}</p>
                      <p className="text-xs text-slate-500">{achievement.date}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="progress">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Academic Progress Report</CardTitle>
                <CardDescription className="text-slate-400">Detailed analysis of your academic journey</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-slate-400">Progress report interface will be displayed here</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="messages">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Messages & Announcements</CardTitle>
                <CardDescription className="text-slate-400">Important notices from teachers and school administration</CardDescription>
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
