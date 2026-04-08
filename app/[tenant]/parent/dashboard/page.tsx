'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { User, AlertCircle, TrendingUp, DollarSign, Eye } from 'lucide-react';

export default function ParentDashboard() {
  const [children] = useState([
    { id: '1', name: 'John Doe', class: '10A', attendance: 94, avgScore: 78, status: 'Good Standing' },
    { id: '2', name: 'Jane Doe', class: '8B', attendance: 91, avgScore: 82, status: 'Good Standing' },
  ]);

  const [childPerformance] = useState([
    { subject: 'Mathematics', score: 85, term1: 78, term2: 82 },
    { subject: 'English', score: 88, term1: 84, term2: 86 },
    { subject: 'Science', score: 76, term1: 73, term2: 75 },
    { subject: 'History', score: 79, term1: 76, term2: 78 },
  ]);

  const [fees] = useState([
    { id: '1', description: 'Tuition Fee', amount: 5000, dueDate: '2024-03-31', status: 'Paid', paidDate: '2024-03-25' },
    { id: '2', description: 'Academic Fee', amount: 1500, dueDate: '2024-03-31', status: 'Paid', paidDate: '2024-03-28' },
    { id: '3', description: 'Sports Fee', amount: 500, dueDate: '2024-04-30', status: 'Pending', paidDate: null },
  ]);

  const [selectedChild, setSelectedChild] = useState(children[0]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Parent Portal</h1>
          <p className="text-slate-400">Monitor your children's progress and manage fees</p>
        </div>

        {/* Child Selection */}
        <div className="mb-8 flex gap-4">
          {children.map((child) => (
            <button
              key={child.id}
              onClick={() => setSelectedChild(child)}
              className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
                selectedChild.id === child.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800/50 text-slate-300 hover:bg-slate-700/50 border border-slate-700'
              }`}
            >
              {child.name} - {child.class}
            </button>
          ))}
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium text-slate-200">Attendance</CardTitle>
              <Eye className="h-4 w-4 text-blue-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{selectedChild.attendance}%</div>
              <p className="text-xs text-slate-400 mt-2">This term</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium text-slate-200">Average Score</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{selectedChild.avgScore}%</div>
              <p className="text-xs text-slate-400 mt-2">Current average</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium text-slate-200">Outstanding Fees</CardTitle>
              <DollarSign className="h-4 w-4 text-yellow-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">GHS 500</div>
              <p className="text-xs text-slate-400 mt-2">Due next month</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium text-slate-200">Status</CardTitle>
              <AlertCircle className="h-4 w-4 text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{selectedChild.status}</div>
              <p className="text-xs text-slate-400 mt-2">Overall performance</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="performance" className="w-full">
          <TabsList className="bg-slate-800/50 border border-slate-700 mb-6">
            <TabsTrigger value="performance" className="text-slate-300 data-[state=active]:text-white">
              Performance
            </TabsTrigger>
            <TabsTrigger value="attendance" className="text-slate-300 data-[state=active]:text-white">
              Attendance
            </TabsTrigger>
            <TabsTrigger value="fees" className="text-slate-300 data-[state=active]:text-white">
              Fees & Payments
            </TabsTrigger>
            <TabsTrigger value="communication" className="text-slate-300 data-[state=active]:text-white">
              Messages
            </TabsTrigger>
          </TabsList>

          <TabsContent value="performance" className="space-y-6">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Subject Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {childPerformance.map((item, i) => (
                    <div key={i}>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-slate-300">{item.subject}</span>
                        <span className="text-sm font-semibold text-white">{item.score}%</span>
                      </div>
                      <div className="w-full bg-slate-700/50 rounded-full h-2">
                        <div className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full" style={{ width: `${item.score}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="attendance">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Attendance Records</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-400">Detailed attendance records will be displayed here</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="fees" className="space-y-6">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Fee Payments</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {fees.map((fee) => (
                    <div key={fee.id} className="p-4 bg-slate-700/30 rounded-lg border border-slate-600/30 flex justify-between items-center">
                      <div>
                        <p className="text-sm font-semibold text-white">{fee.description}</p>
                        <p className="text-xs text-slate-400">Due: {fee.dueDate}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-white">GHS {fee.amount}</p>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          fee.status === 'Paid' ? 'bg-green-900/30 text-green-300 border border-green-800/50' :
                          'bg-yellow-900/30 text-yellow-300 border border-yellow-800/50'
                        }`}>
                          {fee.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="communication">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Messages from School</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-400">Messages interface will be displayed here</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

