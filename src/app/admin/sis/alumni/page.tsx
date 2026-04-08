/**
 * Alumni Management Page
 * Path: src/app/admin/sis/alumni/page.tsx
 */

'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Mail, Download, Plus } from 'lucide-react';

interface Alumni {
  id: string;
  name: string;
  graduationYear: number;
  lastClass: string;
  email: string;
  phone: string;
  currentOccupation: string;
  status: 'verified' | 'unverified';
}

export default function AlumniPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [alumni] = useState<Alumni[]>([
    {
      id: 'ALM001',
      name: 'John Asare',
      graduationYear: 2020,
      lastClass: 'SHS 3A',
      email: 'john.asare@email.com',
      phone: '+233501234567',
      currentOccupation: 'Software Engineer',
      status: 'verified',
    },
    {
      id: 'ALM002',
      name: 'Grace Mensah',
      graduationYear: 2021,
      lastClass: 'SHS 3B',
      email: 'grace.mensah@email.com',
      phone: '+233502345678',
      currentOccupation: 'Doctor',
      status: 'verified',
    },
    {
      id: 'ALM003',
      name: 'David Owusu',
      graduationYear: 2019,
      lastClass: 'SHS 3C',
      email: 'david.owusu@email.com',
      phone: '+233503456789',
      currentOccupation: 'Lawyer',
      status: 'unverified',
    },
  ]);

  const filteredAlumni = alumni.filter(
    (a) =>
      a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Alumni Management</h1>
          <p className="text-slate-400">Track and manage school alumni</p>
        </div>
        <div className="flex gap-2">
          <Button className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Newsletter
          </Button>
          <Button className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Alumni
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-300">Total Alumni</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-white">{alumni.length}</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-300">Verified Profiles</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-400">
              {alumni.filter((a) => a.status === 'verified').length}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-300">Unverified</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-yellow-400">
              {alumni.filter((a) => a.status === 'unverified').length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Alumni Directory */}
      <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-white">Alumni Directory</CardTitle>
          <CardDescription className="text-slate-400">Complete list of graduated students</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Search */}
          <div className="mb-6 relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
            <Input
              placeholder="Search alumni..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-slate-700 border-slate-600 text-white"
            />
          </div>

          {/* Alumni Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left px-4 py-3 text-slate-300 font-semibold">Name</th>
                  <th className="text-left px-4 py-3 text-slate-300 font-semibold">Graduation Year</th>
                  <th className="text-left px-4 py-3 text-slate-300 font-semibold">Last Class</th>
                  <th className="text-left px-4 py-3 text-slate-300 font-semibold">Email</th>
                  <th className="text-left px-4 py-3 text-slate-300 font-semibold">Phone</th>
                  <th className="text-left px-4 py-3 text-slate-300 font-semibold">Occupation</th>
                  <th className="text-left px-4 py-3 text-slate-300 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredAlumni.map((person) => (
                  <tr key={person.id} className="border-b border-slate-700 hover:bg-slate-700/30">
                    <td className="px-4 py-3 text-slate-300 font-semibold">{person.name}</td>
                    <td className="px-4 py-3 text-slate-400">{person.graduationYear}</td>
                    <td className="px-4 py-3 text-slate-400">{person.lastClass}</td>
                    <td className="px-4 py-3 text-slate-400">{person.email}</td>
                    <td className="px-4 py-3 text-slate-400">{person.phone}</td>
                    <td className="px-4 py-3 text-slate-400">{person.currentOccupation}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                          person.status === 'verified'
                            ? 'bg-green-900/30 text-green-300 border-green-800/50'
                            : 'bg-yellow-900/30 text-yellow-300 border-yellow-800/50'
                        }`}
                      >
                        {person.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Alumni Networks */}
      <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-white">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white">
              Send Newsletter
            </Button>
            <Button className="bg-green-600 hover:bg-green-700 text-white">
              Schedule Reunion
            </Button>
            <Button className="bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-2">
              <Download className="h-4 w-4" />
              Export List
            </Button>
            <Button className="bg-orange-600 hover:bg-orange-700 text-white">
              Alumni Stories
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

