/**
 * School Admissions Dashboard
 * Path: src/app/admin/sis/admissions/page.tsx
 */

'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FileUp, Plus, Search, Eye, CheckCircle, Clock, AlertCircle } from 'lucide-react';

interface Applicant {
  id: string;
  name: string;
  grade: string;
  guardian: string;
  applicationDate: string;
  status: 'applied' | 'reviewing' | 'interview' | 'accepted' | 'enrolled' | 'rejected';
  missingDocs?: number;
}

export default function AdmissionsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const [applicants] = useState<Applicant[]>([
    { id: 'APP001', name: 'Sarah Mensah', grade: 'JHS 1', guardian: 'Mr. Mensah', applicationDate: '2024-02-15', status: 'reviewing' },
    { id: 'APP002', name: 'Kwame Owusu', grade: 'SHS 1', guardian: 'Mrs. Owusu', applicationDate: '2024-02-20', status: 'interview' },
    { id: 'APP003', name: 'Ama Boateng', grade: 'Primary 5', guardian: 'Mr. Boateng', applicationDate: '2024-02-10', status: 'accepted' },
    { id: 'APP004', name: 'Kofi Asare', grade: 'JHS 2', guardian: 'Mrs. Asare', applicationDate: '2024-03-01', status: 'applied' },
    { id: 'APP005', name: 'Yaa Poku', grade: 'SHS 2', guardian: 'Mr. Poku', applicationDate: '2024-03-05', status: 'reviewing', missingDocs: 2 },
  ]);

  const stats = {
    newApplications: applicants.filter((a) => a.status === 'applied').length,
    inReview: applicants.filter((a) => a.status === 'reviewing' || a.status === 'interview').length,
    interviews: applicants.filter((a) => a.status === 'interview').length,
    accepted: applicants.filter((a) => a.status === 'accepted').length,
    successRate: Math.round((applicants.filter((a) => a.status === 'enrolled').length / applicants.length) * 100),
  };

  const statusColor = (status: string) => {
    switch (status) {
      case 'applied':
        return 'bg-blue-900/30 text-blue-300 border-blue-800/50';
      case 'reviewing':
        return 'bg-yellow-900/30 text-yellow-300 border-yellow-800/50';
      case 'interview':
        return 'bg-purple-900/30 text-purple-300 border-purple-800/50';
      case 'accepted':
        return 'bg-green-900/30 text-green-300 border-green-800/50';
      case 'enrolled':
        return 'bg-green-900/30 text-green-300 border-green-800/50';
      case 'rejected':
        return 'bg-red-900/30 text-red-300 border-red-800/50';
      default:
        return 'bg-slate-900/30 text-slate-300 border-slate-800/50';
    }
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case 'accepted':
      case 'enrolled':
        return <CheckCircle className="h-4 w-4" />;
      case 'interview':
      case 'reviewing':
        return <Clock className="h-4 w-4" />;
      case 'applied':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Admissions Management</h1>
          <p className="text-slate-400">Manage applicant pipeline and enrollments</p>
        </div>
        <div className="flex gap-2">
          <Button className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2">
            <FileUp className="h-4 w-4" />
            Import Excel
          </Button>
          <Button className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Start New Admission
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-200">New Applications</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.newApplications}</div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-200">In Review</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.inReview}</div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-200">Interviews</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.interviews}</div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-200">Accepted</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.accepted}</div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-200">Success Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.successRate}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Progress Bar */}
      <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-white">Pipeline Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end justify-between gap-2 h-32">
            {['applied', 'reviewing', 'interview', 'accepted', 'enrolled'].map((status) => {
              const count = applicants.filter((a) => a.status === status).length;
              const percentage = (count / applicants.length) * 100;
              return (
                <div key={status} className="flex-1 flex flex-col items-center">
                  <div className="w-full bg-slate-600 rounded-t-lg flex items-end justify-center" style={{ minHeight: '120px' }}>
                    <div
                      className={`w-3/4 rounded-t-lg transition-all ${
                        status === 'applied'
                          ? 'bg-blue-500'
                          : status === 'reviewing'
                          ? 'bg-yellow-500'
                          : status === 'interview'
                          ? 'bg-purple-500'
                          : 'bg-green-500'
                      }`}
                      style={{ height: `${Math.max(percentage * 3, 10)}px` }}
                    />
                  </div>
                  <p className="text-xs text-slate-400 mt-2 capitalize">{status}</p>
                  <p className="text-sm font-semibold text-white">{count}</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Applicants Table */}
      <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-white">Applicant Pipeline</CardTitle>
          <CardDescription className="text-slate-400">All applications and their status</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="mb-6 flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
              <Input
                placeholder="Search applicants..."
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
              <option value="applied">Applied</option>
              <option value="reviewing">In Review</option>
              <option value="interview">Interview</option>
              <option value="accepted">Accepted</option>
              <option value="enrolled">Enrolled</option>
            </select>
          </div>

          {/* Applicants List */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left px-4 py-3 text-slate-300 font-semibold">App ID</th>
                  <th className="text-left px-4 py-3 text-slate-300 font-semibold">Applicant Name</th>
                  <th className="text-left px-4 py-3 text-slate-300 font-semibold">Grade</th>
                  <th className="text-left px-4 py-3 text-slate-300 font-semibold">Guardian</th>
                  <th className="text-left px-4 py-3 text-slate-300 font-semibold">Date</th>
                  <th className="text-left px-4 py-3 text-slate-300 font-semibold">Status</th>
                  <th className="text-left px-4 py-3 text-slate-300 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {applicants
                  .filter((a) => filterStatus === 'all' || a.status === filterStatus)
                  .filter((a) => a.name.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((applicant) => (
                    <tr key={applicant.id} className="border-b border-slate-700 hover:bg-slate-700/30">
                      <td className="px-4 py-3 text-slate-300 font-semibold">{applicant.id}</td>
                      <td className="px-4 py-3 text-slate-300">{applicant.name}</td>
                      <td className="px-4 py-3 text-slate-400">{applicant.grade}</td>
                      <td className="px-4 py-3 text-slate-400">{applicant.guardian}</td>
                      <td className="px-4 py-3 text-slate-400">{applicant.applicationDate}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusColor(applicant.status)}`}>
                          {statusIcon(applicant.status)}
                          {applicant.status === 'reviewing' && applicant.missingDocs ? `Review (${applicant.missingDocs} docs missing)` : applicant.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          <span className="text-xs">View</span>
                        </Button>
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

