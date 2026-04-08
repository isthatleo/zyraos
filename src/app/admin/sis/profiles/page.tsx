 /**
 * Student Profiles Directory
 * Path: src/app/admin/sis/profiles/page.tsx
 */

'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Download, Upload, Eye, Edit2, Trash2, FileDown } from 'lucide-react';

interface Student {
  id: string;
  name: string;
  admission: string;
  class: string;
  gender: string;
  dateOfBirth: string;
  status: 'active' | 'inactive' | 'graduated';
  enrollmentDate: string;
  photo?: string;
}

export default function StudentProfilesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterClass, setFilterClass] = useState('all');

  const [students] = useState<Student[]>([
    {
      id: 'STU001',
      name: 'Ama Asare',
      admission: 'APP001',
      class: 'JHS 2A',
      gender: 'Female',
      dateOfBirth: '2009-05-15',
      status: 'active',
      enrollmentDate: '2023-09-01',
    },
    {
      id: 'STU002',
      name: 'Kwasi Peprah',
      admission: 'APP002',
      class: 'SHS 1B',
      gender: 'Male',
      dateOfBirth: '2007-08-22',
      status: 'active',
      enrollmentDate: '2023-09-01',
    },
    {
      id: 'STU003',
      name: 'Abena Owusu',
      admission: 'APP003',
      class: 'Primary 5',
      gender: 'Female',
      dateOfBirth: '2011-03-18',
      status: 'active',
      enrollmentDate: '2023-09-01',
    },
    {
      id: 'STU004',
      name: 'Kojo Mensah',
      admission: 'APP004',
      class: 'JHS 1C',
      gender: 'Male',
      dateOfBirth: '2010-12-07',
      status: 'active',
      enrollmentDate: '2024-01-15',
    },
    {
      id: 'STU005',
      name: 'Yaa Boateng',
      admission: 'APP005',
      class: 'SHS 2A',
      gender: 'Female',
      dateOfBirth: '2006-07-30',
      status: 'active',
      enrollmentDate: '2023-09-01',
    },
  ]);

  const stats = {
    total: students.length,
    active: students.filter((s) => s.status === 'active').length,
    inactive: students.filter((s) => s.status === 'inactive').length,
    male: students.filter((s) => s.gender === 'Male').length,
    female: students.filter((s) => s.gender === 'Female').length,
  };

  const filteredStudents = students.filter((student) => {
    const matchesSearch = student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || student.status === filterStatus;
    const matchesClass = filterClass === 'all' || student.class === filterClass;
    return matchesSearch && matchesStatus && matchesClass;
  });

  const classes = Array.from(new Set(students.map((s) => s.class)));

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Student Profiles</h1>
          <p className="text-slate-400">Directory of all enrolled students</p>
        </div>
        <div className="flex gap-2">
          <Button className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2">
            <Download className="h-4 w-4" />
            Export Excel
          </Button>
          <Button className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Import Bulk
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-200">Total Students</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.total}</div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-200">Active</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-400">{stats.active}</div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-200">Inactive</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-400">{stats.inactive}</div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-200">Male</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-400">{stats.male}</div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-200">Female</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-pink-400">{stats.female}</div>
          </CardContent>
        </Card>
      </div>

      {/* Students Table */}
      <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-white">Student Directory</CardTitle>
          <CardDescription className="text-slate-400">All enrolled students with profiles</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
              <Input
                placeholder="Search by name or ID..."
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
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="graduated">Graduated</option>
            </select>

            <select
              value={filterClass}
              onChange={(e) => setFilterClass(e.target.value)}
              className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
            >
              <option value="all">All Classes</option>
              {classes.map((cls) => (
                <option key={cls} value={cls}>
                  {cls}
                </option>
              ))}
            </select>
          </div>

          {/* Students Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left px-4 py-3 text-slate-300 font-semibold">Student ID</th>
                  <th className="text-left px-4 py-3 text-slate-300 font-semibold">Name</th>
                  <th className="text-left px-4 py-3 text-slate-300 font-semibold">Class</th>
                  <th className="text-left px-4 py-3 text-slate-300 font-semibold">Gender</th>
                  <th className="text-left px-4 py-3 text-slate-300 font-semibold">DOB</th>
                  <th className="text-left px-4 py-3 text-slate-300 font-semibold">Status</th>
                  <th className="text-left px-4 py-3 text-slate-300 font-semibold">Enrolled</th>
                  <th className="text-left px-4 py-3 text-slate-300 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((student) => (
                  <tr key={student.id} className="border-b border-slate-700 hover:bg-slate-700/30">
                    <td className="px-4 py-3 text-slate-300 font-semibold">{student.id}</td>
                    <td className="px-4 py-3 text-slate-300">{student.name}</td>
                    <td className="px-4 py-3 text-slate-400">{student.class}</td>
                    <td className="px-4 py-3 text-slate-400">{student.gender}</td>
                    <td className="px-4 py-3 text-slate-400">{student.dateOfBirth}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                          student.status === 'active'
                            ? 'bg-green-900/30 text-green-300 border-green-800/50'
                            : student.status === 'inactive'
                            ? 'bg-yellow-900/30 text-yellow-300 border-yellow-800/50'
                            : 'bg-slate-900/30 text-slate-300 border-slate-800/50'
                        }`}
                      >
                        {student.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-400">{student.enrollmentDate}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button className="p-2 rounded-lg hover:bg-slate-600 transition-colors">
                          <Eye className="h-4 w-4 text-slate-300" />
                        </button>
                        <button className="p-2 rounded-lg hover:bg-slate-600 transition-colors">
                          <Edit2 className="h-4 w-4 text-slate-300" />
                        </button>
                        <button className="p-2 rounded-lg hover:bg-slate-600 transition-colors">
                          <FileDown className="h-4 w-4 text-slate-300" />
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

      {/* Bulk Actions */}
      <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-white">Bulk Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white">
              Change Status
            </Button>
            <Button className="bg-green-600 hover:bg-green-700 text-white">
              Send Email
            </Button>
            <Button className="bg-purple-600 hover:bg-purple-700 text-white">
              Send SMS
            </Button>
            <Button className="bg-orange-600 hover:bg-orange-700 text-white">
              Export Report
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

