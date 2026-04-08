/**
 * Admin Dashboard Main Page
 * Path: src/app/admin/dashboard/page.tsx
 */

'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Users, BookOpen, DollarSign, TrendingUp, AlertCircle, CheckCircle, Clock } from 'lucide-react';

export default function AdminDashboard() {
  const [studentStats] = useState({
    total: 1250,
    active: 1200,
    newThisMonth: 45,
    attendance: 92.5,
  });

  const [staffStats] = useState({
    total: 85,
    teachers: 65,
    admin: 20,
    attendance: 96.2,
  });

  const [financeStats] = useState({
    totalCollected: 450250,
    outstanding: 125000,
    pendingInvoices: 35,
    monthlyRevenue: 125000,
  });

  const [systemMetrics] = useState([
    { month: 'Jan', students: 1100, staff: 80, attendance: 88 },
    { month: 'Feb', students: 1150, staff: 82, attendance: 90 },
    { month: 'Mar', students: 1200, staff: 85, attendance: 92 },
  ]);

  const [classDistribution] = useState([
    { name: 'Primary', value: 450 },
    { name: 'Secondary', value: 480 },
    { name: 'Senior', value: 320 },
  ]);

  const [recentActivities] = useState([
    {
      id: '1',
      type: 'student_enrollment',
      description: '5 new students enrolled',
      timestamp: '2 hours ago',
      icon: '📝',
    },
    {
      id: '2',
      type: 'payment_received',
      description: 'GHS 5,000 payment received',
      timestamp: '4 hours ago',
      icon: '💳',
    },
    {
      id: '3',
      type: 'staff_leave',
      description: '3 teachers on leave',
      timestamp: '6 hours ago',
      icon: '🏖️',
    },
    {
      id: '4',
      type: 'exam_scheduled',
      description: 'Mid-term exams scheduled',
      timestamp: '1 day ago',
      icon: '📚',
    },
  ]);

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B'];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">School Dashboard</h1>
        <p className="text-slate-400">Overview of your school's operations and metrics</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Students */}
        <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-200">Total Students</CardTitle>
            <Users className="h-5 w-5 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{studentStats.total}</div>
            <p className="text-xs text-slate-400 mt-2">
              <span className="text-green-400">+{studentStats.newThisMonth}</span> this month
            </p>
          </CardContent>
        </Card>

        {/* Staff */}
        <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-200">Total Staff</CardTitle>
            <Users className="h-5 w-5 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{staffStats.total}</div>
            <p className="text-xs text-slate-400 mt-2">
              {staffStats.teachers} teachers, {staffStats.admin} admin
            </p>
          </CardContent>
        </Card>

        {/* Finance */}
        <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-200">Total Collected</CardTitle>
            <DollarSign className="h-5 w-5 text-yellow-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">GHS {(financeStats.totalCollected / 1000).toFixed(0)}K</div>
            <p className="text-xs text-slate-400 mt-2">
              Outstanding: GHS {(financeStats.outstanding / 1000).toFixed(0)}K
            </p>
          </CardContent>
        </Card>

        {/* Attendance */}
        <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-200">Avg Attendance</CardTitle>
            <TrendingUp className="h-5 w-5 text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{studentStats.attendance}%</div>
            <p className="text-xs text-slate-400 mt-2">This week</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* System Metrics Trend */}
        <Card className="lg:col-span-2 bg-slate-800/50 border-slate-700 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-white">System Metrics</CardTitle>
            <CardDescription className="text-slate-400">Student & Staff trends over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={systemMetrics}>
                <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                <XAxis stroke="#94a3b8" dataKey="month" />
                <YAxis stroke="#94a3b8" />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }} />
                <Legend />
                <Line type="monotone" dataKey="students" stroke="#3B82F6" strokeWidth={2} name="Students" />
                <Line type="monotone" dataKey="staff" stroke="#10B981" strokeWidth={2} name="Staff" />
                <Line type="monotone" dataKey="attendance" stroke="#F59E0B" strokeWidth={2} name="Attendance %" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Class Distribution */}
        <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-white">Student Distribution</CardTitle>
            <CardDescription className="text-slate-400">By education level</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={classDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {classDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* System Health & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* System Health */}
        <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-white">System Health</CardTitle>
            <CardDescription className="text-slate-400">Current status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-green-900/20 rounded-lg border border-green-800/50">
              <span className="text-sm text-slate-300">Database</span>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-400" />
                <span className="text-sm text-green-400">Operational</span>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-green-900/20 rounded-lg border border-green-800/50">
              <span className="text-sm text-slate-300">API Server</span>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-400" />
                <span className="text-sm text-green-400">Operational</span>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-green-900/20 rounded-lg border border-green-800/50">
              <span className="text-sm text-slate-300">SMS Gateway</span>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-400" />
                <span className="text-sm text-green-400">Online</span>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-blue-900/20 rounded-lg border border-blue-800/50">
              <span className="text-sm text-slate-300">Email Service</span>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-400" />
                <span className="text-sm text-blue-400">95% uptime</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activities */}
        <Card className="lg:col-span-2 bg-slate-800/50 border-slate-700 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-white">Recent Activities</CardTitle>
            <CardDescription className="text-slate-400">Latest events in your school</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3 p-3 bg-slate-700/30 rounded-lg border border-slate-600/30">
                  <div className="text-xl">{activity.icon}</div>
                  <div className="flex-1">
                    <p className="text-sm text-white font-medium">{activity.description}</p>
                    <p className="text-xs text-slate-400">{activity.timestamp}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-white">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white">
              Add Student
            </Button>
            <Button className="bg-green-600 hover:bg-green-700 text-white">
              Send Broadcast
            </Button>
            <Button className="bg-purple-600 hover:bg-purple-700 text-white">
              View Reports
            </Button>
            <Button className="bg-orange-600 hover:bg-orange-700 text-white">
              Manage Users
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

