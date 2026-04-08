/**
 * SIS Documents Management Page
 * Path: src/app/admin/sis/documents/page.tsx
 */

'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FileText, Download, Trash2, Upload, Search, Eye } from 'lucide-react';

interface Document {
  id: string;
  studentName: string;
  studentId: string;
  documentType: string;
  uploadedBy: string;
  uploadDate: string;
  fileSize: string;
  status: 'verified' | 'pending' | 'rejected';
}

export default function DocumentsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [documents] = useState<Document[]>([
    {
      id: 'DOC001',
      studentName: 'Ama Asare',
      studentId: 'STU001',
      documentType: 'Birth Certificate',
      uploadedBy: 'Admin Staff',
      uploadDate: '2023-08-20',
      fileSize: '2.3 MB',
      status: 'verified',
    },
    {
      id: 'DOC002',
      studentName: 'Ama Asare',
      studentId: 'STU001',
      documentType: 'Passport',
      uploadedBy: 'Admin Staff',
      uploadDate: '2023-08-20',
      fileSize: '1.8 MB',
      status: 'verified',
    },
    {
      id: 'DOC003',
      studentName: 'Kwasi Peprah',
      studentId: 'STU002',
      documentType: 'Birth Certificate',
      uploadedBy: 'Admin Staff',
      uploadDate: '2023-08-25',
      fileSize: '2.1 MB',
      status: 'pending',
    },
    {
      id: 'DOC004',
      studentName: 'Abena Owusu',
      studentId: 'STU003',
      documentType: 'Medical Records',
      uploadedBy: 'Admin Staff',
      uploadDate: '2023-09-01',
      fileSize: '3.5 MB',
      status: 'verified',
    },
  ]);

  const filteredDocuments = documents.filter(
    (doc) =>
      doc.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.studentId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.documentType.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const stats = {
    total: documents.length,
    verified: documents.filter((d) => d.status === 'verified').length,
    pending: documents.filter((d) => d.status === 'pending').length,
    rejected: documents.filter((d) => d.status === 'rejected').length,
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Document Management</h1>
          <p className="text-slate-400">Manage student documents and certifications</p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2">
          <Upload className="h-4 w-4" />
          Upload Document
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-300">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-white">{stats.total}</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-300">Verified</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-400">{stats.verified}</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-300">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-yellow-400">{stats.pending}</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-300">Rejected</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-400">{stats.rejected}</p>
          </CardContent>
        </Card>
      </div>

      {/* Documents Table */}
      <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-white">All Documents</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Search */}
          <div className="mb-6 relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
            <Input
              placeholder="Search by student name or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-slate-700 border-slate-600 text-white"
            />
          </div>

          {/* Documents Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left px-4 py-3 text-slate-300 font-semibold">Student</th>
                  <th className="text-left px-4 py-3 text-slate-300 font-semibold">Student ID</th>
                  <th className="text-left px-4 py-3 text-slate-300 font-semibold">Document Type</th>
                  <th className="text-left px-4 py-3 text-slate-300 font-semibold">Uploaded By</th>
                  <th className="text-left px-4 py-3 text-slate-300 font-semibold">Date</th>
                  <th className="text-left px-4 py-3 text-slate-300 font-semibold">Size</th>
                  <th className="text-left px-4 py-3 text-slate-300 font-semibold">Status</th>
                  <th className="text-left px-4 py-3 text-slate-300 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDocuments.map((doc) => (
                  <tr key={doc.id} className="border-b border-slate-700 hover:bg-slate-700/30">
                    <td className="px-4 py-3 text-slate-300 font-semibold">{doc.studentName}</td>
                    <td className="px-4 py-3 text-slate-400">{doc.studentId}</td>
                    <td className="px-4 py-3 text-slate-400 flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      {doc.documentType}
                    </td>
                    <td className="px-4 py-3 text-slate-400">{doc.uploadedBy}</td>
                    <td className="px-4 py-3 text-slate-400">{doc.uploadDate}</td>
                    <td className="px-4 py-3 text-slate-400">{doc.fileSize}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                          doc.status === 'verified'
                            ? 'bg-green-900/30 text-green-300 border-green-800/50'
                            : doc.status === 'pending'
                            ? 'bg-yellow-900/30 text-yellow-300 border-yellow-800/50'
                            : 'bg-red-900/30 text-red-300 border-red-800/50'
                        }`}
                      >
                        {doc.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button className="p-2 rounded-lg hover:bg-slate-600 transition-colors">
                          <Eye className="h-4 w-4 text-slate-300" />
                        </button>
                        <button className="p-2 rounded-lg hover:bg-slate-600 transition-colors">
                          <Download className="h-4 w-4 text-slate-300" />
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

