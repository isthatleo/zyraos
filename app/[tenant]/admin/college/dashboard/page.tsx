'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Users, BookOpen, GraduationCap, TrendingUp, AlertCircle, CheckCircle, Clock, Plus, Briefcase, Building } from 'lucide-react';

export default function CollegeAdminDashboard() {
  const [stats, setStats] = useState({
    totalStudents: 1200,
    totalFaculty: 85,
    totalPrograms: 28,
    completionRate: 82.5,
    industryPartners: 45,
    placementRate: 91.2,
    averageScore: 76.8,
    internshipHours: 320,
  });

  const [programData] = useState([
    { program: 'Business Admin', enrolled: 180, graduates: 45 },
    { program: 'IT & Computing', enrolled: 220, graduates: 52 },
    { program: 'Healthcare', enrolled: 150, graduates: 38 },
    { program: 'Engineering Tech', enrolled: 120, graduates: 31 },
    { program: 'Hospitality', enrolled: 95, graduates: 24 },
    { program: 'Design & Media', enrolled: 80, graduates: 19 },
  ]);

  const [industryStats] = useState([
    { company: 'Tech Solutions Ltd', placements: 25, internships: 45 },
    { company: 'Healthcare Corp', placements: 18, internships: 32 },
    { company: 'Business Services Inc', placements: 22, internships: 38 },
    { company: 'Manufacturing Co', placements: 15, internships: 28 },
  ]);

  const [placementTrends] = useState([
    { month: 'Jan', placements: 45, internships: 78 },
    { month: 'Feb', placements: 52, internships: 85 },
    { month: 'Mar', placements: 48, internships: 92 },
    { month: 'Apr', placements: 61, internships: 105 },
    { month: 'May', placements: 55, internships: 98 },
    { month: 'Jun', placements: 67, internships: 112 },
  ]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-white mb-2">College Administration</h1>
          <p className="text-slate-400">Managing Diploma & Certificate Programs • Ages 18-25</p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium text-slate-200">Total Students</CardTitle>
              <Users className="h-4 w-4 text-blue-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{stats.totalStudents.toLocaleString()}</div>
              <p className="text-xs text-slate-400 mt-2">
                <span className="text-green-400 font-semibold">+15%</span> from last year
              </p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium text-slate-200">Completion Rate</CardTitle>
              <GraduationCap className="h-4 w-4 text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{stats.completionRate}%</div>
              <p className="text-xs text-slate-400 mt-2">Program completion</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium text-slate-200">Placement Rate</CardTitle>
              <Briefcase className="h-4 w-4 text-purple-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{stats.placementRate}%</div>
              <p className="text-xs text-slate-400 mt-2">Job placement success</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium text-slate-200">Industry Partners</CardTitle>
              <Building className="h-4 w-4 text-yellow-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{stats.industryPartners}</div>
              <p className="text-xs text-slate-400 mt-2">Active partnerships</p>
            </CardContent>
          </Card>
        </div>

        {/* College Specific Tabs */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="bg-slate-800/50 border border-slate-700 mb-6">
            <TabsTrigger value="overview" className="text-slate-300 data-[state=active]:text-white">
              College Overview
            </TabsTrigger>
            <TabsTrigger value="programs" className="text-slate-300 data-[state=active]:text-white">
              Program Management
            </TabsTrigger>
            <TabsTrigger value="industry" className="text-slate-300 data-[state=active]:text-white">
              Industry Partnerships
            </TabsTrigger>
            <TabsTrigger value="placements" className="text-slate-300 data-[state=active]:text-white">
              Career Services
            </TabsTrigger>
            <TabsTrigger value="internships" className="text-slate-300 data-[state=active]:text-white">
              Internship Program
            </TabsTrigger>
            <TabsTrigger value="certifications" className="text-slate-300 data-[state=active]:text-white">
              Certifications
            </TabsTrigger>
            <TabsTrigger value="facilities" className="text-slate-300 data-[state=active]:text-white">
              Facilities
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Program Performance */}
              <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
                <CardHeader>
                  <CardTitle className="text-white">Program Enrollment & Completion</CardTitle>
                  <CardDescription className="text-slate-400">Current enrollment and graduation rates</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {programData.map((program, i) => (
                      <div key={i}>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm text-slate-300">{program.program}</span>
                          <span className="text-sm font-semibold text-white">
                            {program.enrolled} enrolled • {program.graduates} graduates
                          </span>
                        </div>
                        <div className="w-full bg-slate-700/50 rounded-full h-2">
                          <div
                            className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full"
                            style={{ width: `${(program.graduates/program.enrolled)*100}%` }}
                          />
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          Completion Rate: {Math.round((program.graduates/program.enrolled)*100)}%
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Placement Trends */}
              <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
                <CardHeader>
                  <CardTitle className="text-white">Placement & Internship Trends</CardTitle>
                  <CardDescription className="text-slate-400">Monthly placement and internship statistics</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={placementTrends}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                      <XAxis stroke="#94a3b8" dataKey="month" />
                      <YAxis stroke="#94a3b8" />
                      <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }} />
                      <Legend />
                      <Line type="monotone" dataKey="placements" stroke="#10B981" strokeWidth={2} name="Placements" />
                      <Line type="monotone" dataKey="internships" stroke="#3B82F6" strokeWidth={2} name="Internships" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Industry Partnerships */}
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Top Industry Partners</CardTitle>
                <CardDescription className="text-slate-400">Companies providing internships and job placements</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {industryStats.map((company, i) => (
                    <div key={i} className="p-4 bg-slate-700/30 rounded-lg border border-slate-600/30">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="text-sm font-semibold text-white">{company.company}</h4>
                        <div className="text-right">
                          <p className="text-xs text-slate-400">Placements: {company.placements}</p>
                          <p className="text-xs text-slate-400">Internships: {company.internships}</p>
                        </div>
                      </div>
                      <div className="w-full bg-slate-600 rounded-full h-1">
                        <div
                          className="bg-blue-500 h-1 rounded-full"
                          style={{ width: `${(company.placements/(company.placements+company.internships))*100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="programs">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Program Management</CardTitle>
                <CardDescription className="text-slate-400">Diploma and certificate programs, curriculum, and course offerings</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-slate-400">College program management interface will be displayed here</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="industry">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Industry Partnerships</CardTitle>
                <CardDescription className="text-slate-400">Corporate partnerships, guest lectures, and industry collaboration</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-slate-400">Industry partnerships management interface will be displayed here</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="placements">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Career Services & Placements</CardTitle>
                <CardDescription className="text-slate-400">Job placement assistance, career counseling, and alumni network</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-slate-400">Career services interface will be displayed here</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="internships">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Internship Coordination</CardTitle>
                <CardDescription className="text-slate-400">Internship placements, supervision, and industry training programs</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-slate-400">Internship management interface will be displayed here</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="certifications">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Certification Programs</CardTitle>
                <CardDescription className="text-slate-400">Professional certifications, industry-recognized credentials</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-slate-400">Certification management interface will be displayed here</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="facilities">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Facilities Management</CardTitle>
                <CardDescription className="text-slate-400">Computer labs, workshops, training equipment, and campus facilities</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-slate-400">Facilities management interface will be displayed here</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
