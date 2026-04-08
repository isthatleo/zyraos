'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Plus, AlertCircle, CheckCircle } from 'lucide-react';

export default function AttendanceDashboard() {
  const [attendanceData] = useState([
    { day: 'Mon', present: 320, absent: 45, late: 12 },
    { day: 'Tue', present: 325, absent: 38, late: 14 },
    { day: 'Wed', present: 330, absent: 35, late: 10 },
    { day: 'Thu', present: 328, absent: 40, late: 13 },
    { day: 'Fri', present: 335, absent: 25, late: 7 },
  ]);

  const classAttendance = [
    { name: 'Class 10A', attendance: 95 },
    { name: 'Class 10B', attendance: 92 },
    { name: 'Class 9A', attendance: 88 },
    { name: 'Class 9B', attendance: 90 },
    { name: 'Class 11A', attendance: 94 },
  ];

  const COLORS = ['#10B981', '#EF4444', '#F59E0B'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Attendance Management</h1>
            <p className="text-slate-400">Track and manage student attendance records</p>
          </div>
          <Button className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Mark Attendance
          </Button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium text-slate-200">Today's Present</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">335</div>
              <p className="text-xs text-slate-400 mt-2">Out of 377 students</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium text-slate-200">Absent</CardTitle>
              <AlertCircle className="h-4 w-4 text-red-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">25</div>
              <p className="text-xs text-slate-400 mt-2">6.6% absence rate</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium text-slate-200">Late</CardTitle>
              <AlertCircle className="h-4 w-4 text-yellow-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">7</div>
              <p className="text-xs text-slate-400 mt-2">Today only</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium text-slate-200">Attendance Rate</CardTitle>
              <CheckCircle className="h-4 w-4 text-blue-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">92.1%</div>
              <p className="text-xs text-slate-400 mt-2">This week average</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList className="bg-slate-800/50 border border-slate-700 mb-6">
            <TabsTrigger value="dashboard" className="text-slate-300 data-[state=active]:text-white">
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="daily" className="text-slate-300 data-[state=active]:text-white">
              Daily Tracking
            </TabsTrigger>
            <TabsTrigger value="biometric" className="text-slate-300 data-[state=active]:text-white">
              Biometric
            </TabsTrigger>
            <TabsTrigger value="alerts" className="text-slate-300 data-[state=active]:text-white">
              Alerts
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
                <CardHeader>
                  <CardTitle className="text-white">Weekly Attendance Trend</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={attendanceData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                      <XAxis stroke="#94a3b8" />
                      <YAxis stroke="#94a3b8" />
                      <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }} />
                      <Legend />
                      <Bar dataKey="present" fill="#10B981" name="Present" />
                      <Bar dataKey="absent" fill="#EF4444" name="Absent" />
                      <Bar dataKey="late" fill="#F59E0B" name="Late" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
                <CardHeader>
                  <CardTitle className="text-white">Class-wise Attendance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {classAttendance.map((cls, i) => (
                      <div key={i}>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm text-slate-300">{cls.name}</span>
                          <span className="text-sm font-semibold text-white">{cls.attendance}%</span>
                        </div>
                        <div className="w-full bg-slate-700/50 rounded-full h-2">
                          <div
                            className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full"
                            style={{ width: `${cls.attendance}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="daily">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Daily Attendance Records</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-400">Daily attendance interface will be displayed here</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="biometric">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Biometric Integration</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-400">Biometric attendance interface will be displayed here</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="alerts">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Absence Alerts</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-400">Absence alerts and notifications will be displayed here</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

