/**
 * Master Dashboard - Platform Level
 * Path: src/app/(master)/dashboard/page.tsx
 */

'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Building2, TrendingUp, DollarSign, Activity, Plus, Eye, Settings } from 'lucide-react';

export default function MasterDashboard() {
  const [metrics] = useState({
    totalSchools: 4,
    activeEcosystem: 4,
    monthlyRevenue: 125000,
    systemStatus: 'Operational',
  });

  const [recentSchools] = useState([
    { id: '1', name: 'Academy School', slug: 'academy-school', plan: 'Standard', status: 'Active', createdDate: '2024-01-15' },
    { id: '2', name: 'Mountain Peak Academy', slug: 'mountain-peak', plan: 'Premium', status: 'Active', createdDate: '2024-02-10' },
    { id: '3', name: 'Tech Institute', slug: 'tech-institute', plan: 'Basic', status: 'Active', createdDate: '2024-03-05' },
    { id: '4', name: 'Global Junior School', slug: 'global-junior', plan: 'Standard', status: 'Active', createdDate: '2024-03-10' },
  ]);

  const [planDistribution] = useState([
    { name: 'Basic', value: 1 },
    { name: 'Standard', value: 2 },
    { name: 'Premium', value: 1 },
  ]);

  const [revenueData] = useState([
    { month: 'Jan', revenue: 85000 },
    { month: 'Feb', revenue: 105000 },
    { month: 'Mar', revenue: 125000 },
  ]);

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B'];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2">Master Dashboard</h1>
          <p className="text-slate-400">Platform-level overview and management</p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Provision New School
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-200">Total Schools</CardTitle>
            <Building2 className="h-5 w-5 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{metrics.totalSchools}</div>
            <p className="text-xs text-slate-400 mt-2">Onboarded institutions</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-200">Active Ecosystem</CardTitle>
            <Activity className="h-5 w-5 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{metrics.activeEcosystem}</div>
            <p className="text-xs text-slate-400 mt-2">Active environments</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-200">Monthly Revenue</CardTitle>
            <DollarSign className="h-5 w-5 text-yellow-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">GHS {(metrics.monthlyRevenue / 1000).toFixed(0)}K</div>
            <p className="text-xs text-slate-400 mt-2">Estimated MRR</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-200">System Status</CardTitle>
            <TrendingUp className="h-5 w-5 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">Operational</div>
            <p className="text-xs text-slate-400 mt-2">All systems normal</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Trend */}
        <Card className="lg:col-span-2 bg-slate-800/50 border-slate-700 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-white">Revenue Trend</CardTitle>
            <CardDescription className="text-slate-400">Monthly platform revenue</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                <XAxis stroke="#94a3b8" dataKey="month" />
                <YAxis stroke="#94a3b8" />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }} />
                <Line type="monotone" dataKey="revenue" stroke="#3B82F6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Plan Distribution */}
        <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-white">Plan Distribution</CardTitle>
            <CardDescription className="text-slate-400">Schools by subscription tier</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={planDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {planDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent School Provisioning */}
      <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-white">Recent School Provisioning</CardTitle>
          <CardDescription className="text-slate-400">Recently onboarded institutions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentSchools.map((school) => (
              <div key={school.id} className="p-4 bg-slate-700/30 rounded-lg border border-slate-600/30 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-white">{school.name}</p>
                  <p className="text-xs text-slate-400">{school.slug}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-900/30 text-blue-300 border border-blue-800/50">
                    {school.plan}
                  </span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-900/30 text-green-300 border border-green-800/50">
                    {school.status}
                  </span>
                  <div className="flex gap-2">
                    <button className="p-2 rounded-lg hover:bg-slate-600 transition-colors">
                      <Eye className="h-4 w-4 text-slate-300" />
                    </button>
                    <button className="p-2 rounded-lg hover:bg-slate-600 transition-colors">
                      <Settings className="h-4 w-4 text-slate-300" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

