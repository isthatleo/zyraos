'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Users, BookOpen, GraduationCap, TrendingUp, AlertCircle, CheckCircle, Clock } from 'lucide-react';

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalTeachers: 0,
    totalClasses: 0,
    attendanceRate: 0,
  });

  const [chartData, setChartData] = useState([
    { month: 'Jan', students: 400, teachers: 24, performance: 65 },
    { month: 'Feb', students: 420, teachers: 26, performance: 68 },
    { month: 'Mar', students: 410, teachers: 24, performance: 72 },
    { month: 'Apr', students: 450, teachers: 28, performance: 75 },
    { month: 'May', students: 470, teachers: 30, performance: 78 },
    { month: 'Jun', students: 490, teachers: 32, performance: 82 },
  ]);

  const classDistribution = [
    { name: 'Primary', value: 45 },
    { name: 'JHS', value: 30 },
    { name: 'SHS', value: 20 },
    { name: 'College', value: 5 },
  ];

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444'];

  useEffect(() => {
    // Fetch dashboard stats from API
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      // This would be replaced with actual API call
      setStats({
        totalStudents: 1250,
        totalTeachers: 85,
        totalClasses: 42,
        attendanceRate: 94.5,
      });
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-white mb-2">School Dashboard</h1>
          <p className="text-slate-400">Welcome to your education management system</p>
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
                <span className="text-green-400 font-semibold">+12%</span> from last month
              </p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium text-slate-200">Total Teachers</CardTitle>
              <GraduationCap className="h-4 w-4 text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{stats.totalTeachers}</div>
              <p className="text-xs text-slate-400 mt-2">
                <span className="text-green-400 font-semibold">+5%</span> active
              </p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium text-slate-200">Classes</CardTitle>
              <BookOpen className="h-4 w-4 text-yellow-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{stats.totalClasses}</div>
              <p className="text-xs text-slate-400 mt-2">Across all levels</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium text-slate-200">Attendance Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-purple-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{stats.attendanceRate}%</div>
              <p className="text-xs text-slate-400 mt-2">This week average</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Enrollment Trends */}
          <Card className="lg:col-span-2 bg-slate-800/50 border-slate-700 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-white">Enrollment & Performance Trends</CardTitle>
              <CardDescription className="text-slate-400">Last 6 months</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                  <XAxis stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px' }} />
                  <Legend />
                  <Line type="monotone" dataKey="students" stroke="#3B82F6" strokeWidth={2} name="Students" />
                  <Line type="monotone" dataKey="performance" stroke="#10B981" strokeWidth={2} name="Performance %" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Class Distribution */}
          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-white">Class Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={classDistribution} cx="50%" cy="50%" labelLine={false} label={{ fill: '#94a3b8', fontSize: 12 }} outerRadius={80} fill="#8884d8" dataKey="value">
                    {classDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px' }} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-white">Recent Activities</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { title: 'New student enrolled', desc: 'John Doe in Class 10A', time: '2 hours ago', icon: CheckCircle, color: 'text-green-400' },
                  { title: 'Teacher absence', desc: 'Mr. Smith - Reported absence', time: '4 hours ago', icon: AlertCircle, color: 'text-yellow-400' },
                  { title: 'Grade submitted', desc: 'Midterm results for Class 9B', time: '1 day ago', icon: CheckCircle, color: 'text-green-400' },
                  { title: 'Payment received', desc: 'Fee collection: GHS 5,000', time: '2 days ago', icon: CheckCircle, color: 'text-green-400' },
                ].map((activity, index) => {
                  const Icon = activity.icon;
                  return (
                    <div key={index} className="flex gap-4 pb-4 border-b border-slate-700 last:border-0">
                      <Icon className={`h-5 w-5 ${activity.color} flex-shrink-0 mt-0.5`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white">{activity.title}</p>
                        <p className="text-xs text-slate-400">{activity.desc}</p>
                        <p className="text-xs text-slate-500 mt-1">{activity.time}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-white">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <Button className="bg-blue-600 hover:bg-blue-700 text-white w-full">Enroll Student</Button>
                <Button className="bg-green-600 hover:bg-green-700 text-white w-full">Mark Attendance</Button>
                <Button className="bg-purple-600 hover:bg-purple-700 text-white w-full">View Reports</Button>
                <Button className="bg-orange-600 hover:bg-orange-700 text-white w-full">Finance</Button>
                <Button className="bg-indigo-600 hover:bg-indigo-700 text-white w-full">Messages</Button>
                <Button className="bg-pink-600 hover:bg-pink-700 text-white w-full">Settings</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

