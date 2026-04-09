'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Plus, Users, DollarSign, Calendar } from 'lucide-react';

export default function HRDashboard() {
  const [staffCount] = useState({
    total: 85,
    teachers: 52,
    admin: 18,
    support: 15,
  });

  const [payrollData] = useState([
    { month: 'Jan', paid: 85000, pending: 5000 },
    { month: 'Feb', paid: 85000, pending: 0 },
    { month: 'Mar', paid: 87000, pending: 8000 },
    { month: 'Apr', paid: 87000, pending: 0 },
    { month: 'May', paid: 90000, pending: 12000 },
  ]);

  const staffList = [
    { id: '1', name: 'Mr. John Smith', position: 'Mathematics Teacher', status: 'Active', joinDate: '2022-01-15' },
    { id: '2', name: 'Ms. Sarah Johnson', position: 'English Teacher', status: 'Active', joinDate: '2021-06-10' },
    { id: '3', name: 'Mr. Peter Brown', position: 'Principal', status: 'Active', joinDate: '2018-08-01' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">HR & Staff Management</h1>
            <p className="text-slate-400">Manage staff, payroll, and leave requests</p>
          </div>
          <Button className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Staff
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium text-slate-200">Total Staff</CardTitle>
              <Users className="h-4 w-4 text-blue-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{staffCount.total}</div>
              <p className="text-xs text-slate-400 mt-2">{staffCount.teachers} teachers</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium text-slate-200">Monthly Payroll</CardTitle>
              <DollarSign className="h-4 w-4 text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">GHS 87,000</div>
              <p className="text-xs text-slate-400 mt-2">This month</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium text-slate-200">Leave Requests</CardTitle>
              <Calendar className="h-4 w-4 text-yellow-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">5</div>
              <p className="text-xs text-slate-400 mt-2">Pending approval</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium text-slate-200">On Leave</CardTitle>
              <Calendar className="h-4 w-4 text-purple-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">3</div>
              <p className="text-xs text-slate-400 mt-2">This week</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="staff" className="w-full">
          <TabsList className="bg-slate-800/50 border border-slate-700 mb-6">
            <TabsTrigger value="staff" className="text-slate-300 data-[state=active]:text-white">
              Staff Directory
            </TabsTrigger>
            <TabsTrigger value="payroll" className="text-slate-300 data-[state=active]:text-white">
              Payroll
            </TabsTrigger>
            <TabsTrigger value="leave" className="text-slate-300 data-[state=active]:text-white">
              Leave Management
            </TabsTrigger>
            <TabsTrigger value="performance" className="text-slate-300 data-[state=active]:text-white">
              Performance
            </TabsTrigger>
          </TabsList>

          <TabsContent value="staff">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardContent className="pt-6">
                <div className="space-y-3">
                  {staffList.map((staff) => (
                    <div key={staff.id} className="p-4 bg-slate-700/30 rounded-lg border border-slate-600/30 flex justify-between items-center">
                      <div>
                        <p className="text-sm font-semibold text-white">{staff.name}</p>
                        <p className="text-xs text-slate-400">{staff.position} | Joined: {staff.joinDate}</p>
                      </div>
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-900/30 text-green-300 border border-green-800/50">
                        {staff.status}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payroll">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardContent className="pt-6">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={payrollData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                    <XAxis stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }} />
                    <Legend />
                    <Bar dataKey="paid" fill="#10B981" name="Paid" />
                    <Bar dataKey="pending" fill="#F59E0B" name="Pending" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="leave">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Leave Requests</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-400">Leave management interface will be displayed here</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="performance">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Performance Reviews</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-400">Performance review interface will be displayed here</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

