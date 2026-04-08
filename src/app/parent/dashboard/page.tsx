/**
 * Parent Dashboard Page
 * Path: src/app/parent/dashboard/page.tsx
 */

'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, TrendingUp, DollarSign, Eye, Download, Phone } from 'lucide-react';

export default function ParentDashboard() {
  const [children] = useState([
    {
      id: '1',
      name: 'Alex Thompson',
      class: 'JHS 2A',
      grade: 'English',
      attendance: 92,
      averageScore: 78,
      outstandingBalance: 2000,
    },
    {
      id: '2',
      name: 'Emma Thompson',
      class: 'Primary 4',
      grade: 'General',
      attendance: 95,
      averageScore: 85,
      outstandingBalance: 1500,
    },
  ]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Parent Dashboard</h1>
          <p className="text-slate-400">Monitor your children's academic progress</p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2">
          <Phone className="h-4 w-4" />
          Contact School
        </Button>
      </div>

      {/* Children Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {children.map((child) => (
          <Card key={child.id} className="bg-slate-800/50 border-slate-700 backdrop-blur">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-white">{child.name}</CardTitle>
                  <CardDescription className="text-slate-400">{child.class}</CardDescription>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-400 mb-1">Outstanding Balance</p>
                  <p className="text-lg font-bold text-red-400">GHS {child.outstandingBalance}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Quick Metrics */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-700/30 rounded-lg border border-slate-600/30">
                  <p className="text-xs text-slate-400 mb-1">Attendance Rate</p>
                  <p className="text-2xl font-bold text-blue-400">{child.attendance}%</p>
                </div>
                <div className="p-3 bg-slate-700/30 rounded-lg border border-slate-600/30">
                  <p className="text-xs text-slate-400 mb-1">Average Score</p>
                  <p className="text-2xl font-bold text-green-400">{child.averageScore}%</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-600/30">
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1 justify-center">
                  <Eye className="h-3 w-3" />
                  <span className="text-xs">Report Card</span>
                </Button>
                <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-1 justify-center">
                  <Calendar className="h-3 w-3" />
                  <span className="text-xs">Attendance</span>
                </Button>
                <Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-1 justify-center">
                  <DollarSign className="h-3 w-3" />
                  <span className="text-xs">Fees</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-white">Total Outstanding Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-400 mb-4">
              GHS {children.reduce((sum, c) => sum + c.outstandingBalance, 0)}
            </div>
            <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
              Make Payment
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-white">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white justify-start">
              View Report Cards
            </Button>
            <Button className="w-full bg-green-600 hover:bg-green-700 text-white justify-start">
              Check Attendance
            </Button>
            <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white justify-start">
              Message Teacher
            </Button>
            <Button className="w-full bg-orange-600 hover:bg-orange-700 text-white justify-start flex items-center gap-2">
              <Download className="h-4 w-4" />
              Download Documents
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

