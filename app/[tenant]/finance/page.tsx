'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Plus, Download, TrendingUp, AlertCircle } from 'lucide-react';

export default function FinanceDashboard() {
  const [invoices, setInvoices] = useState([
    { id: '1', student: 'John Doe', amount: 5000, status: 'Paid', dueDate: '2024-01-31', paidDate: '2024-01-25' },
    { id: '2', student: 'Jane Smith', amount: 4500, status: 'Pending', dueDate: '2024-02-28', paidDate: null },
    { id: '3', student: 'Mike Johnson', amount: 5000, status: 'Overdue', dueDate: '2024-01-15', paidDate: null },
  ]);

  const financialData = [
    { month: 'Jan', collected: 45000, expected: 50000, expenses: 12000 },
    { month: 'Feb', collected: 42000, expected: 50000, expenses: 12500 },
    { month: 'Mar', collected: 48000, expected: 50000, expenses: 13000 },
    { month: 'Apr', collected: 51000, expected: 52000, expenses: 12800 },
    { month: 'May', collected: 53000, expected: 52000, expenses: 13200 },
    { month: 'Jun', collected: 55000, expected: 54000, expenses: 13500 },
  ];

  const stats = {
    totalCollected: 294000,
    outstandingFees: 75000,
    paymentsToday: 12500,
    studentsOwing: 24,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Finance & Billing</h1>
            <p className="text-slate-400">Manage payments, invoices, and financial records</p>
          </div>
          <Button className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Create Invoice
          </Button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium text-slate-200">Total Collected</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">GHS {stats.totalCollected.toLocaleString()}</div>
              <p className="text-xs text-slate-400 mt-2">All time total</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium text-slate-200">Outstanding Fees</CardTitle>
              <AlertCircle className="h-4 w-4 text-yellow-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">GHS {stats.outstandingFees.toLocaleString()}</div>
              <p className="text-xs text-slate-400 mt-2">From {stats.studentsOwing} students</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium text-slate-200">Payments Today</CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">GHS {stats.paymentsToday.toLocaleString()}</div>
              <p className="text-xs text-slate-400 mt-2">3 payments received</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium text-slate-200">Collection Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-purple-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">78.6%</div>
              <p className="text-xs text-slate-400 mt-2">
                <span className="text-green-400 font-semibold">+2.3%</span> this month
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList className="bg-slate-800/50 border border-slate-700 mb-6">
            <TabsTrigger value="dashboard" className="text-slate-300 data-[state=active]:text-white">
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="invoices" className="text-slate-300 data-[state=active]:text-white">
              Invoices
            </TabsTrigger>
            <TabsTrigger value="fees" className="text-slate-300 data-[state=active]:text-white">
              Fee Setup
            </TabsTrigger>
            <TabsTrigger value="scholarships" className="text-slate-300 data-[state=active]:text-white">
              Scholarships
            </TabsTrigger>
            <TabsTrigger value="reports" className="text-slate-300 data-[state=active]:text-white">
              Reports
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Revenue & Expenses Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={financialData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                    <XAxis stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }} />
                    <Legend />
                    <Line type="monotone" dataKey="collected" stroke="#10B981" strokeWidth={2} name="Collected" />
                    <Line type="monotone" dataKey="expected" stroke="#3B82F6" strokeWidth={2} name="Expected" />
                    <Line type="monotone" dataKey="expenses" stroke="#EF4444" strokeWidth={2} name="Expenses" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="invoices" className="space-y-6">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-white">Invoice Management</CardTitle>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700" size="sm">
                      <Download className="h-4 w-4 mr-2" /> Export
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Input placeholder="Search invoices..." className="bg-slate-700/50 border-slate-600 text-white" />
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-700">
                          <th className="px-4 py-3 text-left text-slate-300 font-semibold">Invoice #</th>
                          <th className="px-4 py-3 text-left text-slate-300 font-semibold">Student</th>
                          <th className="px-4 py-3 text-left text-slate-300 font-semibold">Amount</th>
                          <th className="px-4 py-3 text-left text-slate-300 font-semibold">Status</th>
                          <th className="px-4 py-3 text-left text-slate-300 font-semibold">Due Date</th>
                          <th className="px-4 py-3 text-right text-slate-300 font-semibold">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {invoices.map((invoice) => (
                          <tr key={invoice.id} className="border-b border-slate-700/50 hover:bg-slate-700/20">
                            <td className="px-4 py-3 text-white font-mono">INV-{String(invoice.id).padStart(4, '0')}</td>
                            <td className="px-4 py-3 text-slate-400">{invoice.student}</td>
                            <td className="px-4 py-3 text-white">GHS {invoice.amount.toLocaleString()}</td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                invoice.status === 'Paid' ? 'bg-green-900/30 text-green-300 border border-green-800/50' :
                                invoice.status === 'Pending' ? 'bg-yellow-900/30 text-yellow-300 border border-yellow-800/50' :
                                'bg-red-900/30 text-red-300 border border-red-800/50'
                              }`}>
                                {invoice.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-slate-400 text-xs">{invoice.dueDate}</td>
                            <td className="px-4 py-3 text-right">
                              <Button size="sm" variant="ghost" className="text-blue-400 hover:bg-blue-900/20">
                                View
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="fees">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Fee Configuration</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-400">Fee setup interface will be displayed here</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="scholarships">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Scholarship Management</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-400">Scholarship management interface will be displayed here</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reports">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Financial Reports</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-400">Financial reports interface will be displayed here</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

