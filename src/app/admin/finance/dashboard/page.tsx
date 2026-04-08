/**
 * Finance Dashboard Page
 * Path: src/app/admin/finance/dashboard/page.tsx
 */

'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { DollarSign, TrendingUp, AlertCircle, Users, Plus, FileText, Download, Settings } from 'lucide-react';

export default function FinanceDashboard() {
  const [metrics] = useState({
    totalCollected: 450250,
    outstandingFees: 125000,
    paymentsToday: 12500,
    studentsOwing: 87,
  });

  const [revenueData] = useState([
    { month: 'Jan', revenue: 42000 },
    { month: 'Feb', revenue: 48000 },
    { month: 'Mar', revenue: 52000 },
    { month: 'Apr', revenue: 61000 },
    { month: 'May', revenue: 55000 },
    { month: 'Jun', revenue: 67000 },
  ]);

  const [feeItems] = useState([
    { name: 'Tuition Fee', amount: 280000, percentage: 62.2 },
    { name: 'Examination Fee', amount: 85000, percentage: 18.9 },
    { name: 'Activity Fee', amount: 45000, percentage: 10.0 },
    { name: 'Transport Fee', amount: 40250, percentage: 8.9 },
  ]);

  const [financialInsights] = useState({
    fullyPaid: 413,
    owing: 87,
    averagePayment: 5234,
    topPaymentMethod: 'Mobile Money',
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Finance Dashboard</h1>
          <p className="text-slate-400">School financial overview and management</p>
        </div>
        <div className="flex gap-2">
          <Button className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Record Payment
          </Button>
          <Button className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Create Invoice
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Collected */}
        <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-200">Total Collected</CardTitle>
            <DollarSign className="h-5 w-5 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">GHS {(metrics.totalCollected / 1000).toFixed(0)}K</div>
            <p className="text-xs text-slate-400 mt-2">Lifetime revenue</p>
          </CardContent>
        </Card>

        {/* Outstanding Fees */}
        <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-200">Outstanding Fees</CardTitle>
            <AlertCircle className="h-5 w-5 text-red-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">GHS {(metrics.outstandingFees / 1000).toFixed(0)}K</div>
            <p className="text-xs text-slate-400 mt-2">Pending payments</p>
          </CardContent>
        </Card>

        {/* Payments Today */}
        <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-200">Payments Today</CardTitle>
            <TrendingUp className="h-5 w-5 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">GHS {(metrics.paymentsToday / 1000).toFixed(0)}K</div>
            <p className="text-xs text-slate-400 mt-2">Today's intake</p>
          </CardContent>
        </Card>

        {/* Students Owing */}
        <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-200">Students Owing</CardTitle>
            <Users className="h-5 w-5 text-yellow-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{metrics.studentsOwing}</div>
            <p className="text-xs text-slate-400 mt-2">Outstanding balances</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Trend */}
        <Card className="lg:col-span-2 bg-slate-800/50 border-slate-700 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-white">Revenue Trend</CardTitle>
            <CardDescription className="text-slate-400">Monthly financial intake</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                <XAxis stroke="#94a3b8" dataKey="month" />
                <YAxis stroke="#94a3b8" />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }} />
                <Bar dataKey="revenue" fill="#3B82F6" name="Revenue (GHS)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Fee Distribution */}
        <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-white">Financial Insights</CardTitle>
            <CardDescription className="text-slate-400">Key metrics</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 bg-slate-700/30 rounded-lg border border-slate-600/30">
              <p className="text-sm text-slate-400 mb-1">Students Fully Paid</p>
              <p className="text-2xl font-bold text-green-400">{financialInsights.fullyPaid}</p>
            </div>

            <div className="p-3 bg-slate-700/30 rounded-lg border border-slate-600/30">
              <p className="text-sm text-slate-400 mb-1">Students Owing</p>
              <p className="text-2xl font-bold text-red-400">{financialInsights.owing}</p>
            </div>

            <div className="p-3 bg-slate-700/30 rounded-lg border border-slate-600/30">
              <p className="text-sm text-slate-400 mb-1">Avg. Payment</p>
              <p className="text-2xl font-bold text-blue-400">GHS {financialInsights.averagePayment}</p>
            </div>

            <div className="p-3 bg-slate-700/30 rounded-lg border border-slate-600/30">
              <p className="text-sm text-slate-400 mb-1">Top Payment Method</p>
              <p className="text-lg font-bold text-white">{financialInsights.topPaymentMethod}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Fee Items Table */}
      <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-white">Fee Items Breakdown</CardTitle>
          <CardDescription className="text-slate-400">Revenue by fee type</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {feeItems.map((item) => (
              <div key={item.name} className="p-4 bg-slate-700/30 rounded-lg border border-slate-600/30">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold text-white">{item.name}</p>
                  <span className="text-sm font-bold text-blue-400">GHS {(item.amount / 1000).toFixed(0)}K</span>
                </div>
                <div className="w-full bg-slate-600 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full"
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
                <p className="text-xs text-slate-400 mt-1">{item.percentage}% of total revenue</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Button className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Record Payment
        </Button>
        <Button className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Create Invoice
        </Button>
        <Button className="bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-2">
          <Download className="h-4 w-4" />
          Export Report
        </Button>
        <Button className="bg-orange-600 hover:bg-orange-700 text-white flex items-center gap-2">
          <Settings className="h-4 w-4" />
          Fee Settings
        </Button>
      </div>
    </div>
  );
}

