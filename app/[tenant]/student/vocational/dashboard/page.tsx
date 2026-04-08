'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components.ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { BookOpen, Clock, TrendingUp, Award, Calendar, Star, Briefcase, Users, Wrench, Shield } from 'lucide-react';

export default function VocationalStudentDashboard() {
  const [studentInfo] = useState({
    name: 'Michael Asante',
    trade: 'Electrical Installation',
    level: 'Intermediate',
    studentId: 'ELC2023008',
    completionRate: 75,
    safetyScore: 95,
    practicalHours: 240,
    expectedCompletion: 'December 2024',
  });

  const [currentModules] = useState([
    { module: 'Circuit Design & Installation', progress: 85, status: 'completed', grade: 'A' },
    { module: 'Electrical Safety & Regulations', progress: 78, status: 'in-progress', grade: 'A-' },
    { module: 'Advanced Wiring Techniques', progress: 65, status: 'in-progress', grade: 'B+' },
    { module: 'Troubleshooting & Maintenance', progress: 45, status: 'upcoming', grade: '-' },
  ]);

  const [upcomingAssessments] = useState([
    { assessment: 'Practical Wiring Assessment', date: '2024-03-25', type: 'practical', weight: 40 },
    { assessment: 'Safety Certification Test', date: '2024-03-28', type: 'theory', weight: 30 },
    { assessment: 'Final Project Presentation', date: '2024-04-05', type: 'project', weight: 30 },
  ]);

  const [jobPlacements] = useState([
    { company: 'Electrical Contractors Ltd', position: 'Apprentice Electrician', status: 'Applied', appliedDate: '2024-02-15' },
    { company: 'Tech Maintenance Services', position: 'Electrical Technician', status: 'Interview Scheduled', appliedDate: '2024-02-20' },
  ]);

  const [safetyRecords] = useState([
    { date: '2024-03-15', incident: 'None', score: 98, notes: 'Excellent safety practices' },
    { date: '2024-03-08', incident: 'Minor equipment handling', score: 92, notes: 'Improved with training' },
    { date: '2024-03-01', incident: 'None', score: 100, notes: 'Perfect safety record' },
  ]);

  const [achievements] = useState([
    { title: 'Safety Excellence Award', description: 'Perfect safety record for 2 months', icon: '🛡️', date: 'March 2024' },
    { title: 'Best Practical Project', description: 'Circuit design competition winner', icon: '⚡', date: 'February 2024' },
    { title: 'Workshop Leadership', description: 'Led team project successfully', icon: '👑', date: 'January 2024' },
  ]);

  const [progressTrend] = useState([
    { month: 'Oct', practical: 65, theory: 70 },
    { month: 'Nov', practical: 72, theory: 75 },
    { month: 'Dec', practical: 78, theory: 80 },
    { month: 'Jan', practical: 82, theory: 85 },
    { month: 'Feb', practical: 85, theory: 88 },
  ]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Welcome, {studentInfo.name}! 🔧</h1>
            <p className="text-slate-400">{studentInfo.trade} • {studentInfo.level} Level • ID: {studentInfo.studentId}</p>
          </div>
          <Button className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2">
            <Wrench className="h-4 w-4" />
            Workshop Schedule
          </Button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium text-slate-200">Completion Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{studentInfo.completionRate}%</div>
              <p className="text-xs text-slate-400 mt-2">Program progress</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium text-slate-200">Safety Score</CardTitle>
              <Shield className="h-4 w-4 text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{studentInfo.safetyScore}%</div>
              <p className="text-xs text-slate-400 mt-2">Workshop safety rating</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium text-slate-200">Practical Hours</CardTitle>
              <Clock className="h-4 w-4 text-purple-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{studentInfo.practicalHours}</div>
              <p className="text-xs text-slate-400 mt-2">Hours completed</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium text-slate-200">Job Applications</CardTitle>
              <Briefcase className="h-4 w-4 text-yellow-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{jobPlacements.length}</div>
              <p className="text-xs text-slate-400 mt-2">Active applications</p>
            </CardContent>
          </Card>
        </div>

        {/* Vocational Student Tabs */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="bg-slate-800/50 border border-slate-700 mb-6">
            <TabsTrigger value="overview" className="text-slate-300 data-[state=active]:text-white">
              Training Overview
            </TabsTrigger>
            <TabsTrigger value="modules" className="text-slate-300 data-[state=active]:text-white">
              Module Progress
            </TabsTrigger>
            <TabsTrigger value="assessments" className="text-slate-300 data-[state=active]:text-white">
              Assessments
            </TabsTrigger>
            <TabsTrigger value="safety" className="text-slate-300 data-[state=active]:text-white">
              Safety Records
            </TabsTrigger>
            <TabsTrigger value="jobs" className="text-slate-300 data-[state=active]:text-white">
              Job Opportunities
            </TabsTrigger>
            <TabsTrigger value="achievements" className="text-slate-300 data-[state=active]:text-white">
              Achievements
            </TabsTrigger>
            <TabsTrigger value="resources" className="text-slate-300 data-[state=active]:text-white">
              Training Resources
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Progress Trend */}
              <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
                <CardHeader>
                  <CardTitle className="text-white">Skill Development Trend</CardTitle>
                  <CardDescription className="text-slate-400">Practical and theoretical progress over time</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={progressTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                      <XAxis stroke="#94a3b8" dataKey="month" />
                      <YAxis stroke="#94a3b8" domain={[0, 100]} />
                      <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }} />
                      <Legend />
                      <Bar dataKey="practical" fill="#10B981" name="Practical Skills" />
                      <Bar dataKey="theory" fill="#3B82F6" name="Theory" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Training Status */}
              <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
                <CardHeader>
                  <CardTitle className="text-white">Training Status</CardTitle>
                  <CardDescription className="text-slate-400">Your current training progress and status</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-400">Trade:</span>
                      <span className="text-sm font-semibold text-white">{studentInfo.trade}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-400">Level:</span>
                      <span className="text-sm font-semibold text-blue-400">{studentInfo.level}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-400">Expected Completion:</span>
                      <span className="text-sm font-semibold text-green-400">{studentInfo.expectedCompletion}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-400">Workshop Attendance:</span>
                      <span className="text-sm font-semibold text-white">95%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-400">Certification Progress:</span>
                      <span className="text-sm font-semibold text-purple-400">75%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-400">Industry Ready:</span>
                      <span className="text-sm font-semibold text-yellow-400">High Potential</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="modules" className="space-y-6">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Module Progress</CardTitle>
                <CardDescription className="text-slate-400">Your progress through training modules</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {currentModules.map((module, i) => (
                    <div key={i} className="p-4 bg-slate-700/30 rounded-lg border border-slate-600/30">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="text-sm font-semibold text-white">{module.module}</p>
                          <p className="text-xs text-slate-400">Progress: {module.progress}%</p>
                        </div>
                        <div className="text-right">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mb-2 ${
                            module.status === 'completed' ? 'bg-green-900/30 text-green-300 border border-green-800/50' :
                            module.status === 'in-progress' ? 'bg-blue-900/30 text-blue-300 border border-blue-800/50' :
                            'bg-gray-900/30 text-gray-300 border border-gray-800/50'
                          }`}>
                            {module.status === 'completed' ? '✓ Completed' :
                             module.status === 'in-progress' ? 'In Progress' : 'Upcoming'}
                          </span>
                          <p className="text-sm font-semibold text-white">{module.grade}</p>
                        </div>
                      </div>
                      <div className="w-full bg-slate-600 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full"
                          style={{ width: `${module.progress}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="assessments" className="space-y-6">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Upcoming Assessments</CardTitle>
                <CardDescription className="text-slate-400">Practical tests, theory exams, and certification assessments</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {upcomingAssessments.map((assessment, i) => (
                    <div key={i} className="p-4 bg-slate-700/30 rounded-lg border border-slate-600/30">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="text-sm font-semibold text-white">{assessment.assessment}</p>
                          <p className="text-xs text-slate-400">Weight: {assessment.weight}% • Date: {assessment.date}</p>
                        </div>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          assessment.type === 'practical' ? 'bg-orange-900/30 text-orange-300 border border-orange-800/50' :
                          assessment.type === 'theory' ? 'bg-blue-900/30 text-blue-300 border border-blue-800/50' :
                          'bg-purple-900/30 text-purple-300 border border-purple-800/50'
                        }`}>
                          {assessment.type === 'practical' ? '🔧 Practical' :
                           assessment.type === 'theory' ? '📚 Theory' : '🎯 Project'}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="border-slate-600 text-slate-300">
                          Study Materials
                        </Button>
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

          <TabsContent value="safety" className="space-y-6">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Safety Records & Training</CardTitle>
                <CardDescription className="text-slate-400">Your safety performance and training records</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {safetyRecords.map((record, i) => (
                    <div key={i} className="p-4 bg-slate-700/30 rounded-lg border border-slate-600/30">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="text-sm font-semibold text-white">{record.date}</p>
                          <p className="text-xs text-slate-400">Safety Score: {record.score}%</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-slate-400">Incident: {record.incident}</p>
                          <div className="w-16 bg-slate-600 rounded-full h-1 mt-1">
                            <div
                              className="bg-green-500 h-1 rounded-full"
                              style={{ width: `${record.score}%` }}
                            />
                          </div>
                        </div>
                      </div>
                      <p className="text-xs text-slate-400">{record.notes}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="jobs" className="space-y-6">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Job Opportunities & Applications</CardTitle>
                <CardDescription className="text-slate-400">Apprenticeships, job openings, and your applications</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {jobPlacements.map((job, i) => (
                    <div key={i} className="p-4 bg-slate-700/30 rounded-lg border border-slate-600/30">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="text-sm font-semibold text-white">{job.position}</p>
                          <p className="text-xs text-slate-400">{job.company} • Applied: {job.appliedDate}</p>
                        </div>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          job.status === 'Applied' ? 'bg-blue-900/30 text-blue-300 border border-blue-800/50' :
                          job.status === 'Interview Scheduled' ? 'bg-yellow-900/30 text-yellow-300 border border-yellow-800/50' :
                          'bg-green-900/30 text-green-300 border border-green-800/50'
                        }`}>
                          {job.status}
                        </span>
                      </div>
                      <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                        View Application
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="achievements" className="space-y-6">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Training Achievements & Awards 🏆</CardTitle>
                <CardDescription className="text-slate-400">Your accomplishments and safety recognitions</CardDescription>
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

          <TabsContent value="resources" className="space-y-6">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Training Resources & Materials</CardTitle>
                <CardDescription className="text-slate-400">Access manuals, safety guides, and training materials</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-slate-400">Training resources interface will be displayed here</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
