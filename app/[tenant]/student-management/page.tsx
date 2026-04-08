'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Search, Upload, Download, Edit, Trash2, Eye } from 'lucide-react';

export default function StudentManagement() {
  const [students, setStudents] = useState([
    { id: '1', name: 'John Doe', email: 'john@example.com', class: '10A', status: 'Active', enrollmentDate: '2024-01-15' },
    { id: '2', name: 'Jane Smith', email: 'jane@example.com', class: '10B', status: 'Active', enrollmentDate: '2024-02-10' },
    { id: '3', name: 'Mike Johnson', email: 'mike@example.com', class: '9A', status: 'Active', enrollmentDate: '2024-03-05' },
  ]);

  const [searchTerm, setSearchTerm] = useState('');
  const [showEnrollmentForm, setShowEnrollmentForm] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Student Information System</h1>
            <p className="text-slate-400">Manage student records, admissions, and documents</p>
          </div>
          <Button className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Enroll Student
          </Button>
        </div>

        {/* Navigation Tabs */}
        <Tabs defaultValue="profiles" className="w-full mb-8">
          <TabsList className="bg-slate-800/50 border border-slate-700">
            <TabsTrigger value="profiles" className="text-slate-300 data-[state=active]:text-white">
              Profiles
            </TabsTrigger>
            <TabsTrigger value="admissions" className="text-slate-300 data-[state=active]:text-white">
              Admissions
            </TabsTrigger>
            <TabsTrigger value="documents" className="text-slate-300 data-[state=active]:text-white">
              Documents
            </TabsTrigger>
            <TabsTrigger value="promotion" className="text-slate-300 data-[state=active]:text-white">
              Promotion
            </TabsTrigger>
            <TabsTrigger value="alumni" className="text-slate-300 data-[state=active]:text-white">
              Alumni
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profiles" className="mt-6">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-white">Student Directory</CardTitle>
                    <CardDescription className="text-slate-400">View and manage all enrolled students</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700" size="sm">
                      <Upload className="h-4 w-4 mr-2" /> Import
                    </Button>
                    <Button variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700" size="sm">
                      <Download className="h-4 w-4 mr-2" /> Export
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Search Bar */}
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                    <Input
                      placeholder="Search students by name, email, or ID..."
                      className="pl-10 bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>

                  {/* Students Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-700">
                          <th className="px-4 py-3 text-left text-slate-300 font-semibold">Name</th>
                          <th className="px-4 py-3 text-left text-slate-300 font-semibold">Email</th>
                          <th className="px-4 py-3 text-left text-slate-300 font-semibold">Class</th>
                          <th className="px-4 py-3 text-left text-slate-300 font-semibold">Status</th>
                          <th className="px-4 py-3 text-left text-slate-300 font-semibold">Enrolled</th>
                          <th className="px-4 py-3 text-right text-slate-300 font-semibold">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {students.map((student) => (
                          <tr key={student.id} className="border-b border-slate-700/50 hover:bg-slate-700/20 transition-colors">
                            <td className="px-4 py-3 text-white">{student.name}</td>
                            <td className="px-4 py-3 text-slate-400">{student.email}</td>
                            <td className="px-4 py-3 text-slate-400">{student.class}</td>
                            <td className="px-4 py-3">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-900/30 text-green-300 border border-green-800/50">
                                {student.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-slate-400 text-xs">{student.enrollmentDate}</td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex justify-end gap-2">
                                <Button size="sm" variant="ghost" className="text-blue-400 hover:bg-blue-900/20">
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button size="sm" variant="ghost" className="text-yellow-400 hover:bg-yellow-900/20">
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button size="sm" variant="ghost" className="text-red-400 hover:bg-red-900/20">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  <div className="flex justify-between items-center mt-4 pt-4 border-t border-slate-700">
                    <p className="text-sm text-slate-400">Showing 1 to 10 of {students.length} students</p>
                    <div className="flex gap-2">
                      <Button variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700" size="sm">
                        Previous
                      </Button>
                      <Button variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700" size="sm">
                        Next
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="admissions" className="mt-6">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Admissions Pipeline</CardTitle>
                <CardDescription className="text-slate-400">Manage new applications and admissions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-4 gap-4 mb-8">
                    {[
                      { label: 'New Applications', count: 24, color: 'blue' },
                      { label: 'In Review', count: 12, color: 'yellow' },
                      { label: 'Interviews', count: 8, color: 'purple' },
                      { label: 'Accepted', count: 18, color: 'green' },
                    ].map((item, i) => (
                      <div key={i} className={`p-4 rounded-lg border border-${item.color}-800/50 bg-${item.color}-900/10`}>
                        <p className="text-xs text-slate-400">{item.label}</p>
                        <p className={`text-2xl font-bold text-${item.color}-400 mt-2`}>{item.count}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documents" className="mt-6">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Student Documents</CardTitle>
                <CardDescription className="text-slate-400">Manage student documents and certificates</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-slate-400">Document management interface will be displayed here</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="promotion" className="mt-6">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Promotion Management</CardTitle>
                <CardDescription className="text-slate-400">Handle student promotions and progressions</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-slate-400">Promotion management interface will be displayed here</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="alumni" className="mt-6">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Alumni Portal</CardTitle>
                <CardDescription className="text-slate-400">Manage graduated students and alumni network</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-slate-400">Alumni management interface will be displayed here</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

