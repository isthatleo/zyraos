/**
 * Teacher Attendance Marking Page
 * Path: src/app/teacher/attendance/page.tsx
 */

'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CheckCircle, Clock, XCircle, Save, Download } from 'lucide-react';

interface StudentAttendance {
  id: string;
  name: string;
  admissionNumber: string;
  status: 'present' | 'absent' | 'late' | null;
}

export default function AttendancePage() {
  const [selectedClass, setSelectedClass] = useState('JHS 1 English');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceData, setAttendanceData] = useState<StudentAttendance[]>([
    { id: '1', name: 'Ama Asare', admissionNumber: 'STU001', status: null },
    { id: '2', name: 'Kwasi Peprah', admissionNumber: 'STU002', status: null },
    { id: '3', name: 'Abena Owusu', admissionNumber: 'STU003', status: null },
    { id: '4', name: 'Kojo Mensah', admissionNumber: 'STU004', status: null },
    { id: '5', name: 'Yaa Boateng', admissionNumber: 'STU005', status: null },
    { id: '6', name: 'Osei Akufo', admissionNumber: 'STU006', status: null },
    { id: '7', name: 'Esi Nyarko', admissionNumber: 'STU007', status: null },
    { id: '8', name: 'Kofi Adu', admissionNumber: 'STU008', status: null },
  ]);

  const [searchQuery, setSearchQuery] = useState('');

  const updateAttendance = (id: string, status: 'present' | 'absent' | 'late') => {
    setAttendanceData((prev) =>
      prev.map((student) =>
        student.id === id ? { ...student, status } : student
      )
    );
  };

  const filteredStudents = attendanceData.filter((student) =>
    student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.admissionNumber.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const stats = {
    present: attendanceData.filter((s) => s.status === 'present').length,
    absent: attendanceData.filter((s) => s.status === 'absent').length,
    late: attendanceData.filter((s) => s.status === 'late').length,
    unmarked: attendanceData.filter((s) => s.status === null).length,
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Attendance Marking</h1>
        <p className="text-slate-400">Mark attendance for your classes</p>
      </div>

      {/* Class & Date Selection */}
      <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-white">Select Class & Date</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-300 mb-2">Class</label>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
              >
                <option value="JHS 1 English">JHS 1 English</option>
                <option value="JHS 2 English">JHS 2 English</option>
                <option value="SHS 1 Literature">SHS 1 Literature</option>
                <option value="SHS 2 Literature">SHS 2 Literature</option>
                <option value="SHS 3 Literature">SHS 3 Literature</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-slate-300 mb-2">Date</label>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Attendance Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-200">Present</CardTitle>
            <CheckCircle className="h-5 w-5 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.present}</div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-200">Absent</CardTitle>
            <XCircle className="h-5 w-5 text-red-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.absent}</div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-200">Late</CardTitle>
            <Clock className="h-5 w-5 text-yellow-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.late}</div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-200">Unmarked</CardTitle>
            <Clock className="h-5 w-5 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.unmarked}</div>
          </CardContent>
        </Card>
      </div>

      {/* Attendance Sheet */}
      <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-white">Attendance Sheet</CardTitle>
          <CardDescription className="text-slate-400">
            {selectedClass} - {new Date(selectedDate).toLocaleDateString()}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Search Bar */}
          <div className="mb-6">
            <Input
              placeholder="Search student name or admission number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-slate-700 border-slate-600 text-white"
            />
          </div>

          {/* Attendance Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left px-4 py-3 text-slate-300 font-semibold">#</th>
                  <th className="text-left px-4 py-3 text-slate-300 font-semibold">Student Name</th>
                  <th className="text-left px-4 py-3 text-slate-300 font-semibold">Admission No</th>
                  <th className="text-left px-4 py-3 text-slate-300 font-semibold">Status</th>
                  <th className="text-left px-4 py-3 text-slate-300 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((student, index) => (
                  <tr key={student.id} className="border-b border-slate-700 hover:bg-slate-700/30">
                    <td className="px-4 py-3 text-slate-300">{index + 1}</td>
                    <td className="px-4 py-3 text-slate-300">{student.name}</td>
                    <td className="px-4 py-3 text-slate-400 text-xs">{student.admissionNumber}</td>
                    <td className="px-4 py-3">
                      {student.status ? (
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            student.status === 'present'
                              ? 'bg-green-900/30 text-green-300 border border-green-800/50'
                              : student.status === 'absent'
                              ? 'bg-red-900/30 text-red-300 border border-red-800/50'
                              : 'bg-yellow-900/30 text-yellow-300 border border-yellow-800/50'
                          }`}
                        >
                          {student.status === 'present'
                            ? 'Present'
                            : student.status === 'absent'
                            ? 'Absent'
                            : 'Late'}
                        </span>
                      ) : (
                        <span className="text-slate-500 text-xs">Not marked</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button
                          onClick={() => updateAttendance(student.id, 'present')}
                          className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                            student.status === 'present'
                              ? 'bg-green-600 text-white'
                              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                          }`}
                        >
                          ✓
                        </button>
                        <button
                          onClick={() => updateAttendance(student.id, 'late')}
                          className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                            student.status === 'late'
                              ? 'bg-yellow-600 text-white'
                              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                          }`}
                        >
                          ≈
                        </button>
                        <button
                          onClick={() => updateAttendance(student.id, 'absent')}
                          className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                            student.status === 'absent'
                              ? 'bg-red-600 text-white'
                              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                          }`}
                        >
                          ✗
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 mt-6 pt-4 border-t border-slate-700">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2">
              <Save className="h-4 w-4" />
              Save Attendance
            </Button>
            <Button variant="outline" className="border-slate-600 text-slate-300 flex items-center gap-2">
              <Download className="h-4 w-4" />
              Export Report
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

