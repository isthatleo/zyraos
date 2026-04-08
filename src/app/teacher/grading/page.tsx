/**
 * Teacher Grading & Tasks Page
 * Path: src/app/teacher/grading/page.tsx
 */

'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertCircle, CheckCircle, Clock, Edit2, Download } from 'lucide-react';

interface Assignment {
  id: string;
  title: string;
  class: string;
  totalStudents: number;
  graded: number;
  dueDate: string;
  priority: 'high' | 'medium' | 'low';
}

interface StudentGrade {
  studentId: string;
  studentName: string;
  submittedDate: string;
  score?: number;
  maxScore: number;
  feedback?: string;
  status: 'submitted' | 'pending' | 'graded';
}

export default function GradingPage() {
  const [selectedAssignment, setSelectedAssignment] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [assignments] = useState<Assignment[]>([
    {
      id: '1',
      title: 'Essay: Shakespeare Analysis',
      class: 'SHS 2 Literature',
      totalStudents: 31,
      graded: 18,
      dueDate: '2024-03-20',
      priority: 'high',
    },
    {
      id: '2',
      title: 'Character Analysis Assignment',
      class: 'JHS 2 English',
      totalStudents: 30,
      graded: 28,
      dueDate: '2024-03-18',
      priority: 'medium',
    },
    {
      id: '3',
      title: 'Reading Comprehension Quiz',
      class: 'JHS 1 English',
      totalStudents: 32,
      graded: 32,
      dueDate: '2024-03-15',
      priority: 'low',
    },
    {
      id: '4',
      title: 'Vocabulary Exercise',
      class: 'SHS 1 Literature',
      totalStudents: 28,
      graded: 15,
      dueDate: '2024-03-22',
      priority: 'high',
    },
  ]);

  const [studentGrades] = useState<StudentGrade[]>([
    {
      studentId: '1',
      studentName: 'Ama Asare',
      submittedDate: '2024-03-19',
      score: 85,
      maxScore: 100,
      feedback: 'Excellent analysis. Well-structured essay.',
      status: 'graded',
    },
    {
      studentId: '2',
      studentName: 'Kwasi Peprah',
      submittedDate: '2024-03-19',
      maxScore: 100,
      status: 'submitted',
    },
    {
      studentId: '3',
      studentName: 'Abena Owusu',
      submittedDate: '2024-03-20',
      maxScore: 100,
      status: 'submitted',
    },
    {
      studentId: '4',
      studentName: 'Kojo Mensah',
      submittedDate: '2024-03-19',
      score: 92,
      maxScore: 100,
      feedback: 'Outstanding work. Critical thinking evident.',
      status: 'graded',
    },
    {
      studentId: '5',
      studentName: 'Yaa Boateng',
      maxScore: 100,
      status: 'pending',
    },
  ]);

  const pendingGrades = assignments.reduce((sum, a) => sum + (a.totalStudents - a.graded), 0);

  const filteredAssignments = assignments.filter((a) =>
    a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.class.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const currentAssignment = assignments.find((a) => a.id === selectedAssignment);
  const filteredStudents = studentGrades.filter((s) =>
    s.studentName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Grading & Tasks</h1>
        <p className="text-slate-400">Manage assignments and student grades</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-200">Total Assignments</CardTitle>
            <CheckCircle className="h-5 w-5 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{assignments.length}</div>
            <p className="text-xs text-slate-400 mt-2">Active assignments</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-200">Pending Grades</CardTitle>
            <AlertCircle className="h-5 w-5 text-red-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{pendingGrades}</div>
            <p className="text-xs text-slate-400 mt-2">Awaiting grading</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-200">Completion Rate</CardTitle>
            <CheckCircle className="h-5 w-5 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {Math.round(
                (assignments.reduce((sum, a) => sum + a.graded, 0) /
                  assignments.reduce((sum, a) => sum + a.totalStudents, 0)) *
                  100
              )}
              %
            </div>
            <p className="text-xs text-slate-400 mt-2">Of all grades</p>
          </CardContent>
        </Card>
      </div>

      {!selectedAssignment ? (
        /* Assignments List */
        <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-white">My Assignments</CardTitle>
            <CardDescription className="text-slate-400">Pending and completed assignments</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Search */}
            <div className="mb-6">
              <Input
                placeholder="Search assignments..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>

            {/* Assignments List */}
            <div className="space-y-3">
              {filteredAssignments.map((assignment) => (
                <div
                  key={assignment.id}
                  className="p-4 bg-slate-700/30 rounded-lg border border-slate-600/30 hover:border-blue-500/50 transition-colors cursor-pointer"
                  onClick={() => setSelectedAssignment(assignment.id)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="text-sm font-semibold text-white">{assignment.title}</h3>
                      <p className="text-xs text-slate-400">{assignment.class}</p>
                    </div>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        assignment.priority === 'high'
                          ? 'bg-red-900/30 text-red-300 border border-red-800/50'
                          : assignment.priority === 'medium'
                          ? 'bg-yellow-900/30 text-yellow-300 border border-yellow-800/50'
                          : 'bg-green-900/30 text-green-300 border border-green-800/50'
                      }`}
                    >
                      {assignment.priority}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="w-full bg-slate-600 rounded-full h-2 mb-1">
                        <div
                          className="bg-blue-500 h-2 rounded-full"
                          style={{ width: `${(assignment.graded / assignment.totalStudents) * 100}%` }}
                        />
                      </div>
                      <p className="text-xs text-slate-400">
                        {assignment.graded} of {assignment.totalStudents} graded
                      </p>
                    </div>
                    <p className="text-xs text-slate-500 ml-4">Due: {assignment.dueDate}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        /* Grading Interface */
        <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-white">{currentAssignment?.title}</CardTitle>
                <CardDescription className="text-slate-400">{currentAssignment?.class}</CardDescription>
              </div>
              <Button
                variant="outline"
                onClick={() => setSelectedAssignment(null)}
                className="border-slate-600 text-slate-300"
              >
                Back
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Student Submissions */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left px-4 py-3 text-slate-300 font-semibold">Student</th>
                    <th className="text-left px-4 py-3 text-slate-300 font-semibold">Submitted</th>
                    <th className="text-left px-4 py-3 text-slate-300 font-semibold">Score</th>
                    <th className="text-left px-4 py-3 text-slate-300 font-semibold">Status</th>
                    <th className="text-left px-4 py-3 text-slate-300 font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map((student) => (
                    <tr key={student.studentId} className="border-b border-slate-700 hover:bg-slate-700/30">
                      <td className="px-4 py-3 text-slate-300">{student.studentName}</td>
                      <td className="px-4 py-3 text-slate-400 text-xs">
                        {student.status === 'pending' ? 'Not submitted' : student.submittedDate}
                      </td>
                      <td className="px-4 py-3">
                        {student.score !== undefined ? (
                          <span className="text-white font-semibold">
                            {student.score}/{student.maxScore}
                          </span>
                        ) : (
                          <span className="text-slate-500">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            student.status === 'graded'
                              ? 'bg-green-900/30 text-green-300 border border-green-800/50'
                              : student.status === 'submitted'
                              ? 'bg-blue-900/30 text-blue-300 border border-blue-800/50'
                              : 'bg-yellow-900/30 text-yellow-300 border border-yellow-800/50'
                          }`}
                        >
                          {student.status === 'graded'
                            ? 'Graded'
                            : student.status === 'submitted'
                            ? 'Submitted'
                            : 'Pending'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1">
                          <Edit2 className="h-3 w-3" />
                          Grade
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

