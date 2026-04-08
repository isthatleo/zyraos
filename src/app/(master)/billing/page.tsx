/**
 * Master Billing & Invoices Management
 * Path: src/app/(master)/billing/page.tsx
 */

'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { DollarSign, TrendingUp, FileText, Download, Print, Eye, Search } from 'lucide-react';

interface Invoice {
  id: string;
  schoolName: string;
  address: string;
  amount: number;
  description: string;
  date: string;
  dueDate: string;
  status: 'pending' | 'paid' | 'overdue';
  subtotal: number;
  tax: number;
}

export default function BillingPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const [metrics] = useState({
    totalRevenue: 2847500,
    activeSubscriptions: 4,
    pendingInvoices: 3,
  });

  const [planDistribution] = useState([
    { name: 'Trial', value: 0, color: '#6B7280' },
    { name: 'Basic', value: 1, color: '#3B82F6' },
    { name: 'Standard', value: 2, color: '#10B981' },
    { name: 'Premium', value: 1, color: '#F59E0B' },
  ]);

  const [invoices] = useState<Invoice[]>([
    {
      id: 'INV001',
      schoolName: 'Academy School',
      address: 'Accra, Ghana',
      amount: 599,
      description: 'Monthly Subscription - Standard Plan',
      date: '2024-03-01',
      dueDate: '2024-03-31',
      status: 'paid',
      subtotal: 550,
      tax: 49,
    },
    {
      id: 'INV002',
      schoolName: 'Mountain Peak Academy',
      address: 'Kumasi, Ghana',
      amount: 1299,
      description: 'Monthly Subscription - Premium Plan',
      date: '2024-03-01',
      dueDate: '2024-03-31',
      status: 'pending',
      subtotal: 1199,
      tax: 100,
    },
    {
      id: 'INV003',
      schoolName: 'Tech Institute',
      address: 'Tema, Ghana',
      amount: 299,
      description: 'Monthly Subscription - Basic Plan',
      date: '2024-03-01',
      dueDate: '2024-03-31',
      status: 'pending',
      subtotal: 275,
      tax: 24,
    },
    {
      id: 'INV004',
      schoolName: 'Global Junior School',
      address: 'Cape Coast, Ghana',
      amount: 599,
      description: 'Monthly Subscription - Standard Plan',
      date: '2024-03-01',
      dueDate: '2024-03-31',
      status: 'overdue',
      subtotal: 550,
      tax: 49,
    },
  ]);

  const filteredInvoices = invoices.filter(
    (invoice) =>
      (filterStatus === 'all' || invoice.status === filterStatus) &&
      (invoice.schoolName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        invoice.id.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-900/30 text-green-300 border-green-800/50';
      case 'pending':
        return 'bg-yellow-900/30 text-yellow-300 border-yellow-800/50';
      case 'overdue':
        return 'bg-red-900/30 text-red-300 border-red-800/50';
      default:
        return 'bg-slate-900/30 text-slate-300 border-slate-800/50';
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Billing & Invoices</h1>
        <p className="text-slate-400">Manage platform revenue and school billing</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-200">Total Revenue</CardTitle>
            <DollarSign className="h-5 w-5 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">GHS {(metrics.totalRevenue / 1000).toFixed(0)}K</div>
            <p className="text-xs text-slate-400 mt-2">Lifetime collected</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-200">Active Subscriptions</CardTitle>
            <TrendingUp className="h-5 w-5 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{metrics.activeSubscriptions}</div>
            <p className="text-xs text-slate-400 mt-2">Active schools</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-200">Pending Invoices</CardTitle>
            <FileText className="h-5 w-5 text-yellow-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{metrics.pendingInvoices}</div>
            <p className="text-xs text-slate-400 mt-2">Awaiting payment</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 space-y-2 text-sm">
              {planDistribution.map((plan) => (
                <div key={plan.name} className="flex items-center justify-between">
                  <span className="text-slate-300">{plan.name}</span>
                  <span className="font-semibold text-white">{plan.value} school{plan.value !== 1 ? 's' : ''}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Monthly Overview */}
        <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-white">Monthly Revenue</CardTitle>
            <CardDescription className="text-slate-400">Recurring subscription revenue</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-slate-700/30 rounded-lg">
                <span className="text-sm text-slate-300">Monthly Recurring Revenue (MRR)</span>
                <span className="text-lg font-bold text-green-400">GHS 2,796</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-slate-700/30 rounded-lg">
                <span className="text-sm text-slate-300">Estimated Annual Revenue</span>
                <span className="text-lg font-bold text-blue-400">GHS 33,552</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-slate-700/30 rounded-lg">
                <span className="text-sm text-slate-300">Average Revenue per School</span>
                <span className="text-lg font-bold text-purple-400">GHS 699</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Invoices Table */}
      <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-white">Invoice History</CardTitle>
          <CardDescription className="text-slate-400">All school subscription invoices</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
              <Input
                placeholder="Search invoices..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-slate-700 border-slate-600 text-white"
              />
            </div>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
            >
              <option value="all">All Status</option>
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
              <option value="overdue">Overdue</option>
            </select>
          </div>

          {/* Invoices Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left px-4 py-3 text-slate-300 font-semibold">Invoice #</th>
                  <th className="text-left px-4 py-3 text-slate-300 font-semibold">School Name</th>
                  <th className="text-left px-4 py-3 text-slate-300 font-semibold">Description</th>
                  <th className="text-left px-4 py-3 text-slate-300 font-semibold">Amount</th>
                  <th className="text-left px-4 py-3 text-slate-300 font-semibold">Date</th>
                  <th className="text-left px-4 py-3 text-slate-300 font-semibold">Due Date</th>
                  <th className="text-left px-4 py-3 text-slate-300 font-semibold">Status</th>
                  <th className="text-left px-4 py-3 text-slate-300 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map((invoice) => (
                  <tr key={invoice.id} className="border-b border-slate-700 hover:bg-slate-700/30">
                    <td className="px-4 py-3 text-slate-300 font-semibold">{invoice.id}</td>
                    <td className="px-4 py-3 text-slate-300">{invoice.schoolName}</td>
                    <td className="px-4 py-3 text-slate-400 text-xs">{invoice.description}</td>
                    <td className="px-4 py-3 text-white font-semibold">GHS {invoice.amount}</td>
                    <td className="px-4 py-3 text-slate-400">{invoice.date}</td>
                    <td className="px-4 py-3 text-slate-400">{invoice.dueDate}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(invoice.status)}`}>
                        {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button className="p-2 rounded-lg hover:bg-slate-600">
                          <Eye className="h-4 w-4 text-slate-300" />
                        </button>
                        <button className="p-2 rounded-lg hover:bg-slate-600">
                          <Download className="h-4 w-4 text-slate-300" />
                        </button>
                        <button className="p-2 rounded-lg hover:bg-slate-600">
                          <Print className="h-4 w-4 text-slate-300" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-white">Invoice Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Button className="bg-green-600 hover:bg-green-700 text-white">Mark as Paid</Button>
            <Button className="bg-yellow-600 hover:bg-yellow-700 text-white">Mark as Pending</Button>
            <Button className="bg-red-600 hover:bg-red-700 text-white">Void Invoice</Button>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2">
              <Download className="h-4 w-4" />
              Export Report
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

