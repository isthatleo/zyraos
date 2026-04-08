'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Users, BookOpen, Clock, TrendingUp, Plus, CheckCircle, AlertCircle, Calendar, Wrench, Award, Shield } from 'lucide-react';

export default function VocationalTeacherDashboard() {
  const [stats, setStats] = useState({
    totalStudents: 68,
    tradesTeaching: 2,
    pendingAssessments: 15,
    averageScore: 82,
    certificationsIssued: 8,
    safetyIncidents: 0,
  });

  const [currentTrades] = useState([
    { trade: 'Electrical Installation', enrolled: 25, level: 'Intermediate', schedule: 'MWF 08:00-12:00', room: 'Workshop A' },
    { trade: 'Plumbing', enrolled: 22, level: 'Advanced', schedule: 'TTh 08:00-12:00', room: 'Workshop B' },
  ]);

  const [upcomingAssessments] = useState([
    { trade: 'Electrical Installation', assessment: 'Wiring Competency Test', date: '2024-03-25', students: 25, type: 'practical' },
    { trade: 'Plumbing', assessment: 'Pipe Fitting Assessment', date: '2024-03-28', students: 22, type: 'practical' },
    { trade: 'Electrical Installation', assessment: 'Safety Certification', date: '2024-04-02', students: 25, type: 'theory' },
  ]);

  const [equipmentStatus] = useState([
    { item: 'Multimeter Set', status: 'available', lastMaintenance: '2024-03-01', nextMaintenance: '2024-06-01' },
    { item: 'Pipe Threading Machine', status: 'in-maintenance', lastMaintenance: '2024-03-15', nextMaintenance: '2024-03-20' },
    { item: 'Welding Equipment', status: 'available', lastMaintenance: '2024-02-28', nextMaintenance: '2024-05-28' },
  ]);

  const [studentProgress] = useState([
    { student: 'Kwame Asante', trade: 'Electrical', progress: 85, safetyScore: 95, nextMilestone: 'Circuit Design' },
    { student: 'Ama Boateng', trade: 'Plumbing', progress: 78, safetyScore: 98, nextMilestone: 'Advanced Fittings' },
    { student: 'Kofi Mensah', trade: 'Electrical', progress: 92, safetyScore: 100, nextMilestone: 'Final Assessment' },
  ]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Vocational Instructor Dashboard</h1>
            <p className="text-slate-400">Trade Skills Training • Electrical & Plumbing</p>
          </div>
          <Button className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Schedule Assessment
          </Button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium text-slate-200">Total Students</CardTitle>
              <Users className="h-4 w-4 text-blue-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{stats.totalStudents}</div>
              <p className="text-xs text-slate-400 mt-2">Across all trades</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium text-slate-200">Trades Teaching</CardTitle>
              <Wrench className="h-4 w-4 text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{stats.tradesTeaching}</div>
              <p className="text-xs text-slate-400 mt-2">Active programs</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium text-slate-200">Average Score</CardTitle>
              <TrendingUp className="h-4 w-4 text-yellow-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{stats.averageScore}%</div>
              <p className="text-xs text-slate-400 mt-2">Practical assessments</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium text-slate-200">Safety Rating</CardTitle>
              <Shield className="h-4 w-4 text-purple-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">98%</div>
              <p className="text-xs text-slate-400 mt-2">Workshop safety</p>
            </CardContent>
          </Card>
        </div>

        {/* Vocational Teacher Tabs */}
        <Tabs defaultValue="trades" className="w-full">
          <TabsList className="bg-slate-800/50 border border-slate-700 mb-6">
            <TabsTrigger value="trades" className="text-slate-300 data-[state=active]:text-white">
              My Trades
            </TabsTrigger>
            <TabsTrigger value="assessments" className="text-slate-300 data-[state=active]:text-white">
              Assessments & Testing
            </TabsTrigger>
            <TabsTrigger value="students" className="text-slate-300 data-[state=active]:text-white">
              Student Progress
            </TabsTrigger>
            <TabsTrigger value="equipment" className="text-slate-300 data-[state=active]:text-white">
              Equipment & Safety
            </TabsTrigger>
            <TabsTrigger value="certifications" className="text-slate-300 data-[state=active]:text-white">
              Certifications
            </TabsTrigger>
            <TabsTrigger value="industry" className="text-slate-300 data-[state=active]:text-white">
              Industry Connections
            </TabsTrigger>
            <TabsTrigger value="workshops" className="text-slate-300 data-[state=active]:text-white">
              Workshop Management
            </TabsTrigger>
          </TabsList>

          <TabsContent value="trades" className="space-y-6">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Current Trade Programs</CardTitle>
                <CardDescription className="text-slate-400">Your active vocational training programs</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {currentTrades.map((trade, i) => (
                    <div key={i} className="p-4 bg-slate-700/30 rounded-lg border border-slate-600/30">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="text-sm font-semibold text-white">{trade.trade}</p>
                          <p className="text-xs text-slate-400">{trade.level} Level • {trade.enrolled} students</p>
                        </div>
                        <div className="text-right">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            trade.level === 'Beginner' ? 'bg-green-900/30 text-green-300 border border-green-800/50' :
                            trade.level === 'Intermediate' ? 'bg-blue-900/30 text-blue-300 border border-blue-800/50' :
                            'bg-purple-900/30 text-purple-300 border border-purple-800/50'
                          }`}>
                            {trade.level}
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-slate-400 mb-3">Schedule: {trade.schedule} • Room: {trade.room}</p>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="border-slate-600 text-slate-300">
                          Lesson Plan
                        </Button>
                        <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                          Student Progress
                        </Button>
                        <Button size="sm" variant="outline" className="border-slate-600 text-slate-300">
                          Safety Checklist
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="assessments">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Practical Assessments & Testing</CardTitle>
                <CardDescription className="text-slate-400">Schedule and manage practical skill assessments</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {upcomingAssessments.map((assessment, i) => (
                    <div key={i} className="p-4 bg-slate-700/30 rounded-lg border border-slate-600/30">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="text-sm font-semibold text-white">{assessment.assessment}</p>
                          <p className="text-xs text-slate-400">{assessment.trade} • {assessment.students} students</p>
                        </div>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          assessment.type === 'practical' ? 'bg-orange-900/30 text-orange-300 border border-orange-800/50' :
                          'bg-blue-900/30 text-blue-300 border border-blue-800/50'
                        }`}>
                          {assessment.type === 'practical' ? '🔧 Practical' : '📚 Theory'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <p className="text-xs text-slate-400">Date: {assessment.date}</p>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" className="border-slate-600 text-slate-300">
                            Assessment Criteria
                          </Button>
                          <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                            Grade Results
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="students">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Student Progress Tracking</CardTitle>
                <CardDescription className="text-slate-400">Monitor individual student development and skill acquisition</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {studentProgress.map((student, i) => (
                    <div key={i} className="p-4 bg-slate-700/30 rounded-lg border border-slate-600/30">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="text-sm font-semibold text-white">{student.student}</p>
                          <p className="text-xs text-slate-400">{student.trade} • Next: {student.nextMilestone}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-slate-400">Progress</p>
                          <p className="text-sm font-semibold text-white">{student.progress}%</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 mb-3">
                        <div>
                          <p className="text-xs text-slate-400">Skill Progress</p>
                          <div className="w-full bg-slate-600 rounded-full h-2">
                            <div
                              className="bg-blue-500 h-2 rounded-full"
                              style={{ width: `${student.progress}%` }}
                            />
                          </div>
                        </div>
                        <div>
                          <p className="text-xs text-slate-400">Safety Score</p>
                          <div className="w-full bg-slate-600 rounded-full h-2">
                            <div
                              className="bg-green-500 h-2 rounded-full"
                              style={{ width: `${student.safetyScore}%` }}
                            />
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="border-slate-600 text-slate-300">
                          Detailed Report
                        </Button>
                        <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                          Provide Feedback
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="equipment">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Equipment Status & Maintenance</CardTitle>
                <CardDescription className="text-slate-400">Monitor workshop equipment and safety compliance</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {equipmentStatus.map((equipment, i) => (
                    <div key={i} className="p-4 bg-slate-700/30 rounded-lg border border-slate-600/30">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="text-sm font-semibold text-white">{equipment.item}</p>
                          <p className="text-xs text-slate-400">Last maintenance: {equipment.lastMaintenance}</p>
                        </div>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          equipment.status === 'available' ? 'bg-green-900/30 text-green-300 border border-green-800/50' :
                          equipment.status === 'in-maintenance' ? 'bg-yellow-900/30 text-yellow-300 border border-yellow-800/50' :
                          'bg-red-900/30 text-red-300 border border-red-800/50'
                        }`}>
                          {equipment.status === 'available' ? '✓ Available' :
                           equipment.status === 'in-maintenance' ? '🔧 Maintenance' : '❌ Out of Service'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">Next maintenance: {equipment.nextMaintenance}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="certifications">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Trade Certifications & Licensing</CardTitle>
                <CardDescription className="text-slate-400">Issue certificates and track professional qualifications</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-slate-400">Certification management interface will be displayed here</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="industry">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Industry Partnerships & Apprenticeships</CardTitle>
                <CardDescription className="text-slate-400">Connect students with industry opportunities and apprenticeships</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-slate-400">Industry connections interface will be displayed here</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="workshops">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Workshop Management</CardTitle>
                <CardDescription className="text-slate-400">Manage workshop schedules, resources, and safety protocols</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-slate-400">Workshop management interface will be displayed here</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
