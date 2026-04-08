/**
 * System Analytics & Ecosystem Monitoring
 * Path: src/app/(master)/analytics/page.tsx
 */

'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, Users, Building2, DollarSign } from 'lucide-react';

export default function AnalyticsPage() {
  const [metrics] = useState({
    mrrEstimated: 2796,
    totalEnvironments: 4,
    schoolsThisMonth: 2,
    platformAdmins: 1,
  });

  const [schoolGrowth] = useState([
    { month: 'Jan', schools: 1 },
    { month: 'Feb', schools: 2 },
    { month: 'Mar', schools: 4 },
  ]);

  const [revenueData] = useState([
    { month: 'Jan', revenue: 300 },
    { month: 'Feb', revenue: 900 },
    { month: 'Mar', revenue: 2796 },
  ]);

  const [platformStats] = useState([
    {
      label: 'Total Students',
      value: 1536,
      growth: '+12%',
      icon: <Users className="h-5 w-5 text-blue-400" />,
    },
    {
      label: 'Total Staff',
      value: 208,
      growth: '+8%',
      icon: <Users className="h-5 w-5 text-green-400" />,
    },
    {
      label: 'Active Schools',
      value: 4,
      growth: '+100%',
      icon: <Building2 className="h-5 w-5 text-purple-400" />,
    },
    {
      label: 'Monthly Revenue',
      value: 'GHS 2,796',
      growth: '+250%',
      icon: <DollarSign className="h-5 w-5 text-yellow-400" />,
    },
  ]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">System Analytics</h1>
        <p className="text-slate-400">Platform-wide ecosystem monitoring and analytics</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-200">Estimated MRR</CardTitle>
            <DollarSign className="h-5 w-5 text-yellow-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">GHS {metrics.mrrEstimated}</div>
            <p className="text-xs text-slate-400 mt-2">Monthly recurring revenue</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-200">Total Environments</CardTitle>
            <Building2 className="h-5 w-5 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{metrics.totalEnvironments}</div>
            <p className="text-xs text-slate-400 mt-2">Active school instances</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-200">New Schools (This Month)</CardTitle>
            <TrendingUp className="h-5 w-5 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{metrics.schoolsThisMonth}</div>
            <p className="text-xs text-slate-400 mt-2">Newly provisioned</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-200">Platform Admins</CardTitle>
            <Users className="h-5 w-5 text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{metrics.platformAdmins}</div>
            <p className="text-xs text-slate-400 mt-2">System administrators</p>
          </CardContent>
        </Card>
      </div>

      {/* Platform Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {platformStats.map((stat) => (
          <Card key={stat.label} className="bg-slate-800/50 border-slate-700 backdrop-blur">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400 mb-1">{stat.label}</p>
                  <p className="text-2xl font-bold text-white">{stat.value}</p>
                  <p className="text-xs text-green-400 mt-2">{stat.growth}</p>
                </div>
                {stat.icon}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* School Growth */}
        <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-white">School Growth</CardTitle>
            <CardDescription className="text-slate-400">Cumulative schools provisioned over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={schoolGrowth}>
                <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                <XAxis stroke="#94a3b8" dataKey="month" />
                <YAxis stroke="#94a3b8" />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }} />
                <Line type="monotone" dataKey="schools" stroke="#3B82F6" strokeWidth={2} dot={{ fill: '#3B82F6' }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Revenue Projection */}
        <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-white">Revenue Growth</CardTitle>
            <CardDescription className="text-slate-400">Monthly recurring revenue trend</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                <XAxis stroke="#94a3b8" dataKey="month" />
                <YAxis stroke="#94a3b8" />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }} />
                <Bar dataKey="revenue" fill="#10B981" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* System Health */}
      <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-white">System Health</CardTitle>
          <CardDescription className="text-slate-400">Real-time platform status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { component: 'Database (Master)', status: 'Operational', uptime: '99.98%' },
              { component: 'Authentication Service', status: 'Operational', uptime: '99.99%' },
              { component: 'Email Service', status: 'Operational', uptime: '99.95%' },
              { component: 'SMS Gateway', status: 'Operational', uptime: '99.90%' },
              { component: 'File Storage', status: 'Operational', uptime: '99.97%' },
            ].map((item) => (
              <div key={item.component} className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg border border-slate-600/30">
                <div>
                  <p className="text-sm font-semibold text-white">{item.component}</p>
                  <p className="text-xs text-slate-400">Status: {item.status}</p>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    <span className="text-sm font-semibold text-green-400">{item.uptime} uptime</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Ecosystem Overview */}
      <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-white">Ecosystem Overview</CardTitle>
          <CardDescription className="text-slate-400">High-level platform metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              {
                title: 'Data Distribution',
                stats: [
                  { label: 'Students', value: 1536, color: 'text-blue-400' },
                  { label: 'Staff Members', value: 208, color: 'text-green-400' },
                  { label: 'Users Total', value: 1744, color: 'text-purple-400' },
                ],
              },
              {
                title: 'Feature Adoption',
                stats: [
                  { label: 'SIS Module', value: '100%', color: 'text-green-400' },
                  { label: 'Attendance Module', value: '75%', color: 'text-yellow-400' },
                  { label: 'Finance Module', value: '100%', color: 'text-green-400' },
                ],
              },
            ].map((section) => (
              <div key={section.title}>
                <h3 className="text-sm font-semibold text-white mb-3">{section.title}</h3>
                <div className="space-y-2">
                  {section.stats.map((stat) => (
                    <div key={stat.label} className="flex items-center justify-between p-2 bg-slate-700/20 rounded">
                      <span className="text-sm text-slate-300">{stat.label}</span>
                      <span className={`font-semibold ${stat.color}`}>{stat.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

