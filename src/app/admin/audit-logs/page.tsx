/**
 * Audit & Logs Page
 * Path: src/app/admin/audit-logs/page.tsx
 */

'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search, Filter, Download, Eye, AlertCircle, CheckCircle, Info } from 'lucide-react';

interface AuditLog {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  resource: string;
  resourceId?: string;
  status: 'success' | 'failure';
  ipAddress: string;
  details?: string;
}

export default function AuditLogsPage() {
  const [filterAction, setFilterAction] = useState('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'success' | 'failure'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [auditLogs] = useState<AuditLog[]>([
    {
      id: '1',
      timestamp: '2024-03-15 15:45:23',
      user: 'admin@school.com',
      action: 'student.create',
      resource: 'Student',
      resourceId: 'STU001245',
      status: 'success',
      ipAddress: '192.168.1.100',
      details: 'Created new student profile',
    },
    {
      id: '2',
      timestamp: '2024-03-15 15:42:15',
      user: 'finance@school.com',
      action: 'payment.record',
      resource: 'Payment',
      resourceId: 'PAY000987',
      status: 'success',
      ipAddress: '192.168.1.105',
      details: 'Recorded GHS 5,000 payment',
    },
    {
      id: '3',
      timestamp: '2024-03-15 15:38:00',
      user: 'teacher@school.com',
      action: 'grade.update',
      resource: 'Grade',
      resourceId: 'GRD000654',
      status: 'success',
      ipAddress: '192.168.1.110',
      details: 'Updated student grade',
    },
    {
      id: '4',
      timestamp: '2024-03-15 15:35:42',
      user: 'admin@school.com',
      action: 'user.delete',
      resource: 'User',
      resourceId: 'USR000123',
      status: 'failure',
      ipAddress: '192.168.1.100',
      details: 'Insufficient permissions to delete user',
    },
    {
      id: '5',
      timestamp: '2024-03-15 15:30:15',
      user: 'admin@school.com',
      action: 'settings.update',
      resource: 'Settings',
      status: 'success',
      ipAddress: '192.168.1.100',
      details: 'Updated school settings',
    },
    {
      id: '6',
      timestamp: '2024-03-15 15:25:00',
      user: 'librarian@school.com',
      action: 'book.checkout',
      resource: 'Book',
      resourceId: 'BK000456',
      status: 'success',
      ipAddress: '192.168.1.115',
      details: 'Checked out book to student',
    },
  ]);

  const filteredLogs = auditLogs.filter((log) => {
    const matchesAction = filterAction === 'all' || log.action === filterAction;
    const matchesStatus = filterStatus === 'all' || log.status === filterStatus;
    const matchesSearch =
      log.user.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.resource.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesAction && matchesStatus && matchesSearch;
  });

  const actionTypes = Array.from(new Set(auditLogs.map((log) => log.action)));

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Audit & Activity Logs</h1>
        <p className="text-slate-400">Track all system actions and changes for compliance</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-200">Total Events</CardTitle>
            <Info className="h-5 w-5 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{auditLogs.length}</div>
            <p className="text-xs text-slate-400 mt-2">Today</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-200">Successful</CardTitle>
            <CheckCircle className="h-5 w-5 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {auditLogs.filter((l) => l.status === 'success').length}
            </div>
            <p className="text-xs text-slate-400 mt-2">Actions completed</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-200">Failed</CardTitle>
            <AlertCircle className="h-5 w-5 text-red-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {auditLogs.filter((l) => l.status === 'failure').length}
            </div>
            <p className="text-xs text-slate-400 mt-2">Actions failed</p>
          </CardContent>
        </Card>
      </div>

      {/* Logs Table */}
      <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-white">Activity Log</CardTitle>
          <CardDescription className="text-slate-400">Detailed audit trail of all system activities</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="mb-6 space-y-4">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
              <Input
                placeholder="Search by user, action, or resource..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-slate-700 border-slate-600 text-white"
              />
            </div>

            {/* Filter Controls */}
            <div className="flex gap-4 flex-wrap">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Action Type</label>
                <select
                  value={filterAction}
                  onChange={(e) => setFilterAction(e.target.value)}
                  className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
                >
                  <option value="all">All Actions</option>
                  {actionTypes.map((action) => (
                    <option key={action} value={action}>
                      {action}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-400 mb-1 block">Status</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as any)}
                  className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
                >
                  <option value="all">All Status</option>
                  <option value="success">Success</option>
                  <option value="failure">Failure</option>
                </select>
              </div>
            </div>
          </div>

          {/* Logs Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left px-4 py-3 text-slate-300 font-semibold">Timestamp</th>
                  <th className="text-left px-4 py-3 text-slate-300 font-semibold">User</th>
                  <th className="text-left px-4 py-3 text-slate-300 font-semibold">Action</th>
                  <th className="text-left px-4 py-3 text-slate-300 font-semibold">Resource</th>
                  <th className="text-left px-4 py-3 text-slate-300 font-semibold">Status</th>
                  <th className="text-left px-4 py-3 text-slate-300 font-semibold">IP Address</th>
                  <th className="text-left px-4 py-3 text-slate-300 font-semibold">Details</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="border-b border-slate-700 hover:bg-slate-700/30">
                    <td className="px-4 py-3 text-slate-300 text-xs">{log.timestamp}</td>
                    <td className="px-4 py-3 text-slate-300">{log.user}</td>
                    <td className="px-4 py-3 text-slate-300">
                      <code className="bg-slate-700/50 px-2 py-1 rounded text-xs">{log.action}</code>
                    </td>
                    <td className="px-4 py-3 text-slate-300">
                      {log.resource} {log.resourceId && <span className="text-xs text-slate-500">({log.resourceId})</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          log.status === 'success'
                            ? 'bg-green-900/30 text-green-300 border border-green-800/50'
                            : 'bg-red-900/30 text-red-300 border border-red-800/50'
                        }`}
                      >
                        {log.status === 'success' && <CheckCircle className="h-3 w-3 mr-1" />}
                        {log.status === 'failure' && <AlertCircle className="h-3 w-3 mr-1" />}
                        {log.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-xs">{log.ipAddress}</td>
                    <td className="px-4 py-3 text-slate-400 text-xs truncate">{log.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-700">
            <p className="text-sm text-slate-400">
              Showing {filteredLogs.length} of {auditLogs.length} events
            </p>
            <div className="flex gap-2">
              <button className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm">
                Previous
              </button>
              <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm">
                Next
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

