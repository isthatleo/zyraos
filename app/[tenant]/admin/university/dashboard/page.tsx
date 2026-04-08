'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Users, BookOpen, GraduationCap, TrendingUp, AlertCircle, CheckCircle, Clock, Plus, Award, Microscope } from 'lucide-react';

export default function UniversityAdminDashboard() {
  const [stats, setStats] = useState({
    totalStudents: 2500,
    totalFaculty: 180,
    totalPrograms: 45,
    graduationRate: 89.5,
    researchProjects: 67,
    internationalStudents: 320,
    averageGPA: 3.2,
    employmentRate: 94.2,
  });

  const [enrollmentData] = useState([
    { program: 'Computer Science', enrolled: 180, capacity: 200 },
    { program: 'Business Admin', enrolled: 220, capacity: 250 },
    { program: 'Engineering', enrolled: 150, capacity: 180 },
    { program: 'Medicine', enrolled: 80, capacity: 100 },
    { program: 'Law', enrolled: 120, capacity: 150 },
    { program: 'Arts & Humanities', enrolled: 95, capacity: 120 },
  ]);

  const [researchStats] = useState([
    { faculty: 'Dr. Johnson', publications: 12, grants: 250000 },
    { faculty: 'Prof. Smith', publications: 8, grants: 180000 },
    { faculty: 'Dr. Williams', publications: 15, grants: 320000 },
    { faculty: 'Prof. Brown', publications: 10, grants: 200000 },
  ]);

  const [departmentPerformance] = useState([
    { department: 'Science & Tech', avgGPA: 3.4, satisfaction: 92 },
    { department: 'Business', avgGPA: 3.1, satisfaction: 88 },
    { department: 'Humanities', avgGPA: 3.3, satisfaction: 90 },
    { department: 'Health Sciences', avgGPA: 3.5, satisfaction: 95 },
  ]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-white mb-2">University Administration</h1>
          <p className="text-slate-400">Managing Undergraduate & Graduate Programs • Ages 18+</p>
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
                <span className="text-green-400 font-semibold">+8%</span> from last year
              </p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium text-slate-200">Faculty Members</CardTitle>
              <GraduationCap className="h-4 w-4 text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{stats.totalFaculty}</div>
              <p className="text-xs text-slate-400 mt-2">Professors & lecturers</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium text-slate-200">Graduation Rate</CardTitle>
              <Award className="h-4 w-4 text-yellow-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{stats.graduationRate}%</div>
              <p className="text-xs text-slate-400 mt-2">4-year completion</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium text-slate-200">Research Projects</CardTitle>
              <Microscope className="h-4 w-4 text-purple-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{stats.researchProjects}</div>
              <p className="text-xs text-slate-400 mt-2">Active this year</p>
            </CardContent>
          </Card>
        </div>

        {/* University Specific Tabs */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="bg-slate-800/50 border border-slate-700 mb-6">
            <TabsTrigger value="overview" className="text-slate-300 data-[state=active]:text-white">
              University Overview
            </TabsTrigger>
            <TabsTrigger value="academics" className="text-slate-300 data-[state=active]:text-white">
              Academic Programs
            </TabsTrigger>
            <TabsTrigger value="research" className="text-slate-300 data-[state=active]:text-white">
              Research & Innovation
            </TabsTrigger>
            <TabsTrigger value="faculty" className="text-slate-300 data-[state=active]:text-white">
              Faculty Management
            </TabsTrigger>
            <TabsTrigger value="students" className="text-slate-300 data-[state=active]:text-white">
              Student Affairs
            </TabsTrigger>
            <TabsTrigger value="international" className="text-slate-300 data-[state=active]:text-white">
              International Programs
            </TabsTrigger>
            <TabsTrigger value="alumni" className="text-slate-300 data-[state=active]:text-white">
              Alumni & Career Services
            </TabsTrigger>
            <TabsTrigger value="facilities" className="text-slate-300 data-[state=active]:text-white">
              Campus Facilities
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Program Enrollment */}
              <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
                <CardHeader>
                  <CardTitle className="text-white">Program Enrollment</CardTitle>
                  <CardDescription className="text-slate-400">Current enrollment vs capacity</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {enrollmentData.map((program, i) => (
                      <div key={i}>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm text-slate-300">{program.program}</span>
                          <span className="text-sm font-semibold text-white">
                            {program.enrolled}/{program.capacity} ({Math.round((program.enrolled/program.capacity)*100)}%)
                          </span>
                        </div>
                        <div className="w-full bg-slate-700/50 rounded-full h-2">
                          <div
                            className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full"
                            style={{ width: `${(program.enrolled/program.capacity)*100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Department Performance */}
              <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
                <CardHeader>
                  <CardTitle className="text-white">Department Performance</CardTitle>
                  <CardDescription className="text-slate-400">GPA and satisfaction ratings</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {departmentPerformance.map((dept, i) => (
                      <div key={i} className="p-3 bg-slate-700/30 rounded-lg border border-slate-600/30">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-semibold text-white">{dept.department}</span>
                          <span className="text-xs text-slate-400">GPA: {dept.avgGPA}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-slate-400">Satisfaction: {dept.satisfaction}%</span>
                          <div className="w-16 bg-slate-600 rounded-full h-1">
                            <div
                              className="bg-green-500 h-1 rounded-full"
                              style={{ width: `${dept.satisfaction}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
                <CardHeader>
                  <CardTitle className="text-white">Student Demographics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-400">Undergraduate:</span>
                      <span className="text-sm font-semibold text-white">2,100</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-400">Graduate:</span>
                      <span className="text-sm font-semibold text-white">400</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-400">International:</span>
                      <span className="text-sm font-semibold text-white">{stats.internationalStudents}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
                <CardHeader>
                  <CardTitle className="text-white">Academic Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-400">Average GPA:</span>
                      <span className="text-sm font-semibold text-white">{stats.averageGPA}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-400">Retention Rate:</span>
                      <span className="text-sm font-semibold text-white">87%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-400">Employment Rate:</span>
                      <span className="text-sm font-semibold text-white">{stats.employmentRate}%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
                <CardHeader>
                  <CardTitle className="text-white">Research Output</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-400">Publications:</span>
                      <span className="text-sm font-semibold text-white">245</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-400">Grants Awarded:</span>
                      <span className="text-sm font-semibold text-white">GHS 2.1M</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-400">Patents Filed:</span>
                      <span className="text-sm font-semibold text-white">12</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="academics">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Academic Programs Management</CardTitle>
                <CardDescription className="text-slate-400">Degree programs, curriculum, and course offerings</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-slate-400">University academic programs management interface will be displayed here</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="research">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Research & Innovation</CardTitle>
                <CardDescription className="text-slate-400">Research centers, grants, publications, and innovation initiatives</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {researchStats.map((researcher, i) => (
                    <div key={i} className="p-4 bg-slate-700/30 rounded-lg border border-slate-600/30">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="text-sm font-semibold text-white">{researcher.faculty}</p>
                          <p className="text-xs text-slate-400">Publications: {researcher.publications}</p>
                        </div>
                        <span className="text-sm font-semibold text-green-400">
                          GHS {researcher.grants.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="faculty">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Faculty Management</CardTitle>
                <CardDescription className="text-slate-400">Professors, lecturers, research staff, and academic administration</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-slate-400">University faculty management interface will be displayed here</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="students">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Student Affairs</CardTitle>
                <CardDescription className="text-slate-400">Housing, dining, counseling, and student life services</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-slate-400">University student affairs interface will be displayed here</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="international">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">International Programs</CardTitle>
                <CardDescription className="text-slate-400">Exchange programs, international admissions, and global partnerships</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-slate-400">International programs management interface will be displayed here</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="alumni">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Alumni & Career Services</CardTitle>
                <CardDescription className="text-slate-400">Career counseling, job placement, alumni network, and lifelong learning</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-slate-400">Alumni and career services interface will be displayed here</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="facilities">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Campus Facilities</CardTitle>
                <CardDescription className="text-slate-400">Libraries, laboratories, sports facilities, and infrastructure management</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-slate-400">Campus facilities management interface will be displayed here</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
