'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Users, BookOpen, GraduationCap, TrendingUp, AlertCircle, CheckCircle, Clock, Plus, Wrench, Award } from 'lucide-react';

export default function VocationalAdminDashboard() {
  const [stats, setStats] = useState({
    totalStudents: 680,
    totalInstructors: 42,
    totalPrograms: 18,
    completionRate: 88.5,
    industryPartners: 67,
    employmentRate: 94.8,
    averageScore: 82.3,
    practicalHours: 480,
  });

  const [tradeData] = useState([
    { trade: 'Electrical Installation', enrolled: 85, employed: 78 },
    { trade: 'Plumbing', enrolled: 72, employed: 68 },
    { trade: 'Welding & Fabrication', enrolled: 65, employed: 62 },
    { trade: 'Automotive Repair', enrolled: 58, employed: 55 },
    { trade: 'Carpentry', enrolled: 52, employed: 49 },
    { trade: 'ICT & Networking', enrolled: 48, employed: 46 },
  ]);

  const [industryPartners] = useState([
    { company: 'Electrical Contractors Ltd', apprentices: 25, graduates: 18 },
    { company: 'Plumbing Masters Inc', apprentices: 20, graduates: 15 },
    { company: 'AutoTech Solutions', apprentices: 18, graduates: 14 },
    { company: 'BuildCorp Construction', apprentices: 22, graduates: 16 },
  ]);

  const [certificationStats] = useState([
    { month: 'Jan', certified: 45, assessed: 52 },
    { month: 'Feb', certified: 48, assessed: 55 },
    { month: 'Mar', certified: 52, assessed: 58 },
    { month: 'Apr', certified: 61, assessed: 67 },
    { month: 'May', certified: 55, assessed: 62 },
    { month: 'Jun', certified: 67, assessed: 72 },
  ]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-white mb-2">Vocational & Technical Education</h1>
          <p className="text-slate-400">Managing Trade Skills & Technical Programs • Ages 16-35</p>
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
              <p className="text-xs text-slate-400 mt-2">
                <span className="text-green-400 font-semibold">+18%</span> from last year
              </p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium text-slate-200">Employment Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{stats.employmentRate}%</div>
              <p className="text-xs text-slate-400 mt-2">Within 3 months</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium text-slate-200">Industry Partners</CardTitle>
              <Wrench className="h-4 w-4 text-purple-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{stats.industryPartners}</div>
              <p className="text-xs text-slate-400 mt-2">Active partnerships</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium text-slate-200">Practical Hours</CardTitle>
              <Clock className="h-4 w-4 text-yellow-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{stats.practicalHours}</div>
              <p className="text-xs text-slate-400 mt-2">Per program</p>
            </CardContent>
          </Card>
        </div>

        {/* Vocational Specific Tabs */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="bg-slate-800/50 border border-slate-700 mb-6">
            <TabsTrigger value="overview" className="text-slate-300 data-[state=active]:text-white">
              Vocational Overview
            </TabsTrigger>
            <TabsTrigger value="trades" className="text-slate-300 data-[state=active]:text-white">
              Trade Programs
            </TabsTrigger>
            <TabsTrigger value="industry" className="text-slate-300 data-[state=active]:text-white">
              Industry Partnerships
            </TabsTrigger>
            <TabsTrigger value="certifications" className="text-slate-300 data-[state=active]:text-white">
              Certifications
            </TabsTrigger>
            <TabsTrigger value="apprenticeships" className="text-slate-300 data-[state=active]:text-white">
              Apprenticeships
            </TabsTrigger>
            <TabsTrigger value="workshops" className="text-slate-300 data-[state=active]:text-white">
              Workshops & Labs
            </TabsTrigger>
            <TabsTrigger value="placements" className="text-slate-300 data-[state=active]:text-white">
              Job Placements
            </TabsTrigger>
            <TabsTrigger value="safety" className="text-slate-300 data-[state=active]:text-white">
              Safety Training
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Trade Performance */}
              <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
                <CardHeader>
                  <CardTitle className="text-white">Trade Program Performance</CardTitle>
                  <CardDescription className="text-slate-400">Enrollment and employment rates by trade</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {tradeData.map((trade, i) => (
                      <div key={i}>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm text-slate-300">{trade.trade}</span>
                          <span className="text-sm font-semibold text-white">
                            {trade.enrolled} enrolled • {trade.employed} employed
                          </span>
                        </div>
                        <div className="w-full bg-slate-700/50 rounded-full h-2">
                          <div
                            className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full"
                            style={{ width: `${(trade.employed/trade.enrolled)*100}%` }}
                          />
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          Employment Rate: {Math.round((trade.employed/trade.enrolled)*100)}%
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Certification Trends */}
              <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
                <CardHeader>
                  <CardTitle className="text-white">Certification Trends</CardTitle>
                  <CardDescription className="text-slate-400">Monthly certification and assessment statistics</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={certificationStats}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                      <XAxis stroke="#94a3b8" dataKey="month" />
                      <YAxis stroke="#94a3b8" />
                      <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }} />
                      <Legend />
                      <Bar dataKey="certified" fill="#10B981" name="Certified" />
                      <Bar dataKey="assessed" fill="#3B82F6" name="Assessed" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Industry Partnerships */}
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Industry Partnership Overview</CardTitle>
                <CardDescription className="text-slate-400">Companies providing apprenticeships and training opportunities</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {industryPartners.map((partner, i) => (
                    <div key={i} className="p-4 bg-slate-700/30 rounded-lg border border-slate-600/30">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="text-sm font-semibold text-white">{partner.company}</h4>
                        <Award className="h-5 w-5 text-yellow-400" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-slate-400">Current Apprentices: {partner.apprentices}</p>
                        <p className="text-xs text-slate-400">Total Graduates: {partner.graduates}</p>
                      </div>
                      <div className="mt-2 w-full bg-slate-600 rounded-full h-1">
                        <div
                          className="bg-green-500 h-1 rounded-full"
                          style={{ width: `${(partner.graduates/(partner.apprentices+partner.graduates))*100}%` }}
                        />
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
                <CardDescription className="text-slate-400">Common vocational education administrative tasks</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white flex flex-col items-center gap-2 h-20">
                    <Plus className="h-6 w-6" />
                    <span className="text-xs">New Enrollment</span>
                  </Button>
                  <Button className="bg-green-600 hover:bg-green-700 text-white flex flex-col items-center gap-2 h-20">
                    <Award className="h-6 w-6" />
                    <span className="text-xs">Issue Certificate</span>
                  </Button>
                  <Button className="bg-purple-600 hover:bg-purple-700 text-white flex flex-col items-center gap-2 h-20">
                    <Wrench className="h-6 w-6" />
                    <span className="text-xs">Schedule Assessment</span>
                  </Button>
                  <Button className="bg-orange-600 hover:bg-orange-700 text-white flex flex-col items-center gap-2 h-20">
                    <Users className="h-6 w-6" />
                    <span className="text-xs">Industry Visit</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="trades">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Trade Program Management</CardTitle>
                <CardDescription className="text-slate-400">Electrical, plumbing, welding, automotive, carpentry, and ICT programs</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-slate-400">Trade program management interface will be displayed here</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="industry">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Industry Partnerships</CardTitle>
                <CardDescription className="text-slate-400">Corporate partnerships, apprenticeships, and industry collaboration</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-slate-400">Industry partnerships management interface will be displayed here</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="certifications">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Certification Management</CardTitle>
                <CardDescription className="text-slate-400">Trade certifications, competency assessments, and industry standards</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-slate-400">Certification management interface will be displayed here</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="apprenticeships">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Apprenticeship Programs</CardTitle>
                <CardDescription className="text-slate-400">Work-based learning, paid apprenticeships, and industry training</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-slate-400">Apprenticeship management interface will be displayed here</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="workshops">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Workshops & Laboratories</CardTitle>
                <CardDescription className="text-slate-400">Equipment maintenance, safety training, and practical facilities</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-slate-400">Workshop and laboratory management interface will be displayed here</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="placements">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Job Placement Services</CardTitle>
                <CardDescription className="text-slate-400">Employment assistance, career counseling, and job matching</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-slate-400">Job placement services interface will be displayed here</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="safety">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Safety Training & Compliance</CardTitle>
                <CardDescription className="text-slate-400">Workplace safety, health regulations, and compliance training</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-slate-400">Safety training and compliance interface will be displayed here</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
