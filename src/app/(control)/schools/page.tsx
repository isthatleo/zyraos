/**
 * School Registry Management
 * Path: src/app/(master)/schools/page.tsx
 */

'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Plus, Settings, Eye, Trash2 } from 'lucide-react';

interface School {
  id: string;
  name: string;
  slug: string;
  plan: 'trial' | 'basic' | 'standard' | 'premium';
  status: 'active' | 'inactive' | 'suspended';
  createdDate: string;
  maxStudents: number;
  maxStaff: number;
  currentStudents: number;
  currentStaff: number;
}

export default function SchoolRegistryPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPlan, setFilterPlan] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  const [schools] = useState<School[]>([
    {
      id: 'SCH001',
      name: 'Academy School',
      slug: 'academy-school',
      plan: 'standard',
      status: 'active',
      createdDate: '2024-01-15',
      maxStudents: 500,
      maxStaff: 50,
      currentStudents: 342,
      currentStaff: 38,
    },
    {
      id: 'SCH002',
      name: 'Mountain Peak Academy',
      slug: 'mountain-peak',
      plan: 'premium',
      status: 'active',
      createdDate: '2024-02-10',
      maxStudents: 1000,
      maxStaff: 100,
      currentStudents: 751,
      currentStaff: 72,
    },
    {
      id: 'SCH003',
      name: 'Tech Institute',
      slug: 'tech-institute',
      plan: 'basic',
      status: 'active',
      createdDate: '2024-03-05',
      maxStudents: 200,
      maxStaff: 20,
      currentStudents: 145,
      currentStaff: 18,
    },
    {
      id: 'SCH004',
      name: 'Global Junior School',
      slug: 'global-junior',
      plan: 'standard',
      status: 'active',
      createdDate: '2024-03-10',
      maxStudents: 500,
      maxStaff: 50,
      currentStudents: 298,
      currentStaff: 32,
    },
  ]);

  const filteredSchools = schools.filter((school) => {
    const matchesSearch =
      school.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      school.slug.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPlan = filterPlan === 'all' || school.plan === filterPlan;
    const matchesStatus = filterStatus === 'all' || school.status === filterStatus;
    return matchesSearch && matchesPlan && matchesStatus;
  });

  const getPlanColor = (plan: string) => {
    switch (plan) {
      case 'trial':
        return 'bg-gray-900/30 text-gray-300 border-gray-800/50';
      case 'basic':
        return 'bg-blue-900/30 text-blue-300 border-blue-800/50';
      case 'standard':
        return 'bg-green-900/30 text-green-300 border-green-800/50';
      case 'premium':
        return 'bg-yellow-900/30 text-yellow-300 border-yellow-800/50';
      default:
        return 'bg-slate-900/30 text-slate-300 border-slate-800/50';
    }
  };

  const stats = {
    total: schools.length,
    active: schools.filter((s) => s.status === 'active').length,
    inactive: schools.filter((s) => s.status === 'inactive').length,
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">School Registry</h1>
          <p className="text-slate-400">Manage all onboarded institutions</p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Provision New School
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-300">Total Schools</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-white">{stats.total}</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-300">Active</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-400">{stats.active}</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-300">Inactive</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-yellow-400">{stats.inactive}</p>
          </CardContent>
        </Card>
      </div>

      {/* Schools Table */}
      <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-white">All Schools</CardTitle>
          <CardDescription className="text-slate-400">Complete list of onboarded schools</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
              <Input
                placeholder="Search schools..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-slate-700 border-slate-600 text-white"
              />
            </div>

            <select
              value={filterPlan}
              onChange={(e) => setFilterPlan(e.target.value)}
              className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
            >
              <option value="all">All Plans</option>
              <option value="trial">Trial</option>
              <option value="basic">Basic</option>
              <option value="standard">Standard</option>
              <option value="premium">Premium</option>
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>

          {/* Schools Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left px-4 py-3 text-slate-300 font-semibold">School Name</th>
                  <th className="text-left px-4 py-3 text-slate-300 font-semibold">Slug (URL)</th>
                  <th className="text-left px-4 py-3 text-slate-300 font-semibold">Plan</th>
                  <th className="text-left px-4 py-3 text-slate-300 font-semibold">Status</th>
                  <th className="text-left px-4 py-3 text-slate-300 font-semibold">Capacity</th>
                  <th className="text-left px-4 py-3 text-slate-300 font-semibold">Created</th>
                  <th className="text-left px-4 py-3 text-slate-300 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSchools.map((school) => (
                  <tr key={school.id} className="border-b border-slate-700 hover:bg-slate-700/30">
                    <td className="px-4 py-3 text-slate-300 font-semibold">{school.name}</td>
                    <td className="px-4 py-3 text-slate-400 text-xs">{school.slug}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getPlanColor(school.plan)}`}>
                        {school.plan.charAt(0).toUpperCase() + school.plan.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                          school.status === 'active'
                            ? 'bg-green-900/30 text-green-300 border-green-800/50'
                            : school.status === 'inactive'
                            ? 'bg-yellow-900/30 text-yellow-300 border-yellow-800/50'
                            : 'bg-red-900/30 text-red-300 border-red-800/50'
                        }`}
                      >
                        {school.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-xs">
                      <div className="space-y-1">
                        <p>Students: {school.currentStudents}/{school.maxStudents}</p>
                        <p>Staff: {school.currentStaff}/{school.maxStaff}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-400">{school.createdDate}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button className="p-2 rounded-lg hover:bg-slate-600 transition-colors">
                          <Eye className="h-4 w-4 text-slate-300" />
                        </button>
                        <button className="p-2 rounded-lg hover:bg-slate-600 transition-colors">
                          <Settings className="h-4 w-4 text-slate-300" />
                        </button>
                        <button className="p-2 rounded-lg hover:bg-slate-600 transition-colors">
                          <Trash2 className="h-4 w-4 text-red-400" />
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
    </div>
  );
}

