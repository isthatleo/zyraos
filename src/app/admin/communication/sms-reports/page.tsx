/**
 * SMS Reports Page
 * Path: src/app/admin/communication/sms-reports/page.tsx
 */

'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Download, Filter, Search, CheckCircle, AlertCircle, Clock, TrendingUp } from 'lucide-react';

interface SMSLog {
  id: string;
  phoneNumber: string;
  status: 'sent' | 'failed' | 'pending';
  provider: string;
  senderId: string;
  dateTime: string;
  messagePreview: string;
}

export default function SMSReportsPage() {
  const [filterStatus, setFilterStatus] = useState<'all' | 'sent' | 'failed' | 'pending'>('all');
  const [filterProvider, setFilterProvider] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [smsLogs] = useState<SMSLog[]>([
    {
      id: '1',
      phoneNumber: '+233501234567',
      status: 'sent',
      provider: 'mNotify',
      senderId: 'ZYRAAI',
      dateTime: '2024-03-15 14:32:15',
      messagePreview: 'Parent-Teacher Conference on March 20...',
    },
    {
      id: '2',
      phoneNumber: '+233502345678',
      status: 'sent',
      provider: 'mNotify',
      senderId: 'ZYRAAI',
      dateTime: '2024-03-15 14:32:15',
      messagePreview: 'Attendance reminder for today...',
    },
    {
      id: '3',
      phoneNumber: '+233503456789',
      status: 'failed',
      provider: 'Hubtel',
      senderId: 'SCHOOL',
      dateTime: '2024-03-15 14:30:45',
      messagePreview: 'Invalid phone number format',
    },
    {
      id: '4',
      phoneNumber: '+233504567890',
      status: 'sent',
      provider: 'Arkesel',
      senderId: 'ZYRAAI',
      dateTime: '2024-03-15 14:28:30',
      messagePreview: 'Exam schedule notification...',
    },
    {
      id: '5',
      phoneNumber: '+233505678901',
      status: 'pending',
      provider: 'Termii',
      senderId: 'ZYRAAI',
      dateTime: '2024-03-15 14:25:00',
      messagePreview: 'Fee payment reminder...',
    },
  ]);

  const [deliveryStats] = useState([
    { date: 'Mar 1', sent: 245, failed: 5, pending: 2 },
    { date: 'Mar 5', sent: 310, failed: 8, pending: 3 },
    { date: 'Mar 10', sent: 485, failed: 12, pending: 5 },
    { date: 'Mar 15', sent: 248, failed: 2, pending: 1 },
  ]);

  const [statusDistribution] = useState([
    { name: 'Sent', value: 1288 },
    { name: 'Failed', value: 27 },
    { name: 'Pending', value: 9 },
  ]);

  const [metrics] = useState({
    totalSMS: 1324,
    successRate: 97.2,
    averageDeliveryTime: '2.3s',
    topProvider: 'mNotify',
  });

  const COLORS = ['#10B981', '#EF4444', '#F59E0B'];

  const filteredLogs = smsLogs.filter((log) => {
    const matchesStatus = filterStatus === 'all' || log.status === filterStatus;
    const matchesProvider = filterProvider === 'all' || log.provider === filterProvider;
    const matchesSearch =
      log.phoneNumber.includes(searchQuery) || log.messagePreview.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesProvider && matchesSearch;
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">SMS Reports</h1>
        <p className="text-slate-400">Monitor and analyze SMS delivery metrics</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-200">Total SMS</CardTitle>
            <TrendingUp className="h-5 w-5 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{metrics.totalSMS}</div>
            <p className="text-xs text-slate-400 mt-2">All time</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-200">Success Rate</CardTitle>
            <CheckCircle className="h-5 w-5 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{metrics.successRate}%</div>
            <p className="text-xs text-slate-400 mt-2">Delivery success</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-200">Avg Delivery Time</CardTitle>
            <Clock className="h-5 w-5 text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{metrics.averageDeliveryTime}</div>
            <p className="text-xs text-slate-400 mt-2">Per message</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-200">Top Provider</CardTitle>
            <TrendingUp className="h-5 w-5 text-yellow-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{metrics.topProvider}</div>
            <p className="text-xs text-slate-400 mt-2">Most used</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Delivery Trend */}
        <Card className="lg:col-span-2 bg-slate-800/50 border-slate-700 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-white">Delivery Trend</CardTitle>
            <CardDescription className="text-slate-400">SMS status over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={deliveryStats}>
                <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                <XAxis stroke="#94a3b8" dataKey="date" />
                <YAxis stroke="#94a3b8" />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }} />
                <Legend />
                <Bar dataKey="sent" fill="#10B981" name="Sent" />
                <Bar dataKey="failed" fill="#EF4444" name="Failed" />
                <Bar dataKey="pending" fill="#F59E0B" name="Pending" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Status Distribution */}
        <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-white">Status Distribution</CardTitle>
            <CardDescription className="text-slate-400">Overall SMS status</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Logs */}
      <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-white">SMS Delivery Logs</CardTitle>
          <CardDescription className="text-slate-400">Detailed view of all SMS messages</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="mb-6 space-y-4">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
              <Input
                placeholder="Search by phone number or message..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-slate-700 border-slate-600 text-white"
              />
            </div>

            {/* Filter Controls */}
            <div className="flex gap-4 flex-wrap">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Status</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as any)}
                  className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
                >
                  <option value="all">All Status</option>
                  <option value="sent">Sent</option>
                  <option value="failed">Failed</option>
                  <option value="pending">Pending</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-400 mb-1 block">Provider</label>
                <select
                  value={filterProvider}
                  onChange={(e) => setFilterProvider(e.target.value)}
                  className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
                >
                  <option value="all">All Providers</option>
                  <option value="mNotify">mNotify</option>
                  <option value="Hubtel">Hubtel</option>
                  <option value="Arkesel">Arkesel</option>
                  <option value="Termii">Termii</option>
                </select>
              </div>

              <Button className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 mt-6">
                <Download className="h-4 w-4" />
                Export Report
              </Button>
            </div>
          </div>

          {/* Logs Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left px-4 py-3 text-slate-300 font-semibold">Phone Number</th>
                  <th className="text-left px-4 py-3 text-slate-300 font-semibold">Status</th>
                  <th className="text-left px-4 py-3 text-slate-300 font-semibold">Provider</th>
                  <th className="text-left px-4 py-3 text-slate-300 font-semibold">Sender ID</th>
                  <th className="text-left px-4 py-3 text-slate-300 font-semibold">Date & Time</th>
                  <th className="text-left px-4 py-3 text-slate-300 font-semibold">Message Preview</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="border-b border-slate-700 hover:bg-slate-700/30">
                    <td className="px-4 py-3 text-slate-300">{log.phoneNumber}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          log.status === 'sent'
                            ? 'bg-green-900/30 text-green-300 border border-green-800/50'
                            : log.status === 'failed'
                            ? 'bg-red-900/30 text-red-300 border border-red-800/50'
                            : 'bg-yellow-900/30 text-yellow-300 border border-yellow-800/50'
                        }`}
                      >
                        {log.status === 'sent' && <CheckCircle className="h-3 w-3 mr-1" />}
                        {log.status === 'failed' && <AlertCircle className="h-3 w-3 mr-1" />}
                        {log.status === 'pending' && <Clock className="h-3 w-3 mr-1" />}
                        {log.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-300">{log.provider}</td>
                    <td className="px-4 py-3 text-slate-300">{log.senderId}</td>
                    <td className="px-4 py-3 text-slate-300 text-xs">{log.dateTime}</td>
                    <td className="px-4 py-3 text-slate-400 truncate">{log.messagePreview}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

