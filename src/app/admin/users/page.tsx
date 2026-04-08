/**
 * User Management Page
 * Path: src/app/admin/users/page.tsx
 */

'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Plus, Edit2, Trash2, CheckCircle, Clock } from 'lucide-react';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  status: 'active' | 'inactive';
  joinedDate: string;
}

interface AddUserModalState {
  isOpen: boolean;
  fullName: string;
  email: string;
  password: string;
  role: string;
  autoGeneratePassword: boolean;
}

export default function UsersPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [users] = useState<User[]>([
    {
      id: '1',
      name: 'John Smith',
      email: 'john.smith@school.edu',
      role: 'Administrator',
      status: 'active',
      joinedDate: '2023-01-15',
    },
    {
      id: '2',
      name: 'Sarah Johnson',
      email: 'sarah.johnson@school.edu',
      role: 'Teacher',
      status: 'active',
      joinedDate: '2023-02-20',
    },
    {
      id: '3',
      name: 'Michael Brown',
      email: 'michael.brown@school.edu',
      role: 'Finance Officer',
      status: 'active',
      joinedDate: '2023-03-10',
    },
    {
      id: '4',
      name: 'Emily Davis',
      email: 'emily.davis@school.edu',
      role: 'Librarian',
      status: 'inactive',
      joinedDate: '2023-04-05',
    },
    {
      id: '5',
      name: 'James Wilson',
      email: 'james.wilson@school.edu',
      role: 'HR Manager',
      status: 'active',
      joinedDate: '2023-05-12',
    },
  ]);

  const [modalState, setModalState] = useState<AddUserModalState>({
    isOpen: false,
    fullName: '',
    email: '',
    password: '',
    role: 'teacher',
    autoGeneratePassword: true,
  });

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = filterRole === 'all' || user.role.toLowerCase() === filterRole.toLowerCase();
    return matchesSearch && matchesRole;
  });

  const handleAddUser = () => {
    // API call to add user
    console.log('Adding user:', modalState);
    setModalState({
      isOpen: false,
      fullName: '',
      email: '',
      password: '',
      role: 'teacher',
      autoGeneratePassword: true,
    });
  };

  const roles = Array.from(new Set(users.map((u) => u.role)));

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">User Management</h1>
          <p className="text-slate-400">Manage staff and administrator accounts</p>
        </div>
        <Button
          onClick={() => setModalState({ ...modalState, isOpen: true })}
          className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add User
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-200">Total Users</CardTitle>
            <CheckCircle className="h-5 w-5 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{users.length}</div>
            <p className="text-xs text-slate-400 mt-2">Accounts created</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-200">Active</CardTitle>
            <CheckCircle className="h-5 w-5 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {users.filter((u) => u.status === 'active').length}
            </div>
            <p className="text-xs text-slate-400 mt-2">Currently active</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-200">Inactive</CardTitle>
            <Clock className="h-5 w-5 text-yellow-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {users.filter((u) => u.status === 'inactive').length}
            </div>
            <p className="text-xs text-slate-400 mt-2">Deactivated accounts</p>
          </CardContent>
        </Card>
      </div>

      {/* Users Table */}
      <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-white">All Users</CardTitle>
          <CardDescription className="text-slate-400">Manage system users and permissions</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="mb-6 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
              <Input
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-slate-700 border-slate-600 text-white"
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 mb-1 block">Filter by Role</label>
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
              >
                <option value="all">All Roles</option>
                {roles.map((role) => (
                  <option key={role} value={role.toLowerCase()}>
                    {role}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Users Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left px-4 py-3 text-slate-300 font-semibold">Name</th>
                  <th className="text-left px-4 py-3 text-slate-300 font-semibold">Email</th>
                  <th className="text-left px-4 py-3 text-slate-300 font-semibold">Role</th>
                  <th className="text-left px-4 py-3 text-slate-300 font-semibold">Status</th>
                  <th className="text-left px-4 py-3 text-slate-300 font-semibold">Joined</th>
                  <th className="text-left px-4 py-3 text-slate-300 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="border-b border-slate-700 hover:bg-slate-700/30">
                    <td className="px-4 py-3 text-slate-300">{user.name}</td>
                    <td className="px-4 py-3 text-slate-400 text-xs">{user.email}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-900/30 text-blue-300 border border-blue-800/50">
                        {user.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          user.status === 'active'
                            ? 'bg-green-900/30 text-green-300 border border-green-800/50'
                            : 'bg-yellow-900/30 text-yellow-300 border border-yellow-800/50'
                        }`}
                      >
                        {user.status === 'active' ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-xs">{user.joinedDate}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button className="p-2 rounded-lg hover:bg-slate-700 transition-colors">
                          <Edit2 className="h-4 w-4 text-slate-400" />
                        </button>
                        <button className="p-2 rounded-lg hover:bg-slate-700 transition-colors">
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

      {/* Add User Modal */}
      {modalState.isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="bg-slate-800 border-slate-700 w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-white">Add New User</CardTitle>
              <CardDescription className="text-slate-400">Create a new staff or administrator account</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm text-slate-300 mb-2">Full Name</label>
                <Input
                  value={modalState.fullName}
                  onChange={(e) => setModalState({ ...modalState, fullName: e.target.value })}
                  placeholder="Enter full name"
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-300 mb-2">Email</label>
                <Input
                  type="email"
                  value={modalState.email}
                  onChange={(e) => setModalState({ ...modalState, email: e.target.value })}
                  placeholder="Enter email address"
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-300 mb-2">Role</label>
                <select
                  value={modalState.role}
                  onChange={(e) => setModalState({ ...modalState, role: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                >
                  <option value="teacher">Teacher</option>
                  <option value="admin">Administrator</option>
                  <option value="finance">Finance Officer</option>
                  <option value="librarian">Librarian</option>
                  <option value="hr">HR Manager</option>
                  <option value="reception">Reception</option>
                </select>
              </div>

              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={modalState.autoGeneratePassword}
                    onChange={(e) => setModalState({ ...modalState, autoGeneratePassword: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-slate-300">Auto-generate password</span>
                </label>
              </div>

              {!modalState.autoGeneratePassword && (
                <div>
                  <label className="block text-sm text-slate-300 mb-2">Password</label>
                  <Input
                    type="password"
                    value={modalState.password}
                    onChange={(e) => setModalState({ ...modalState, password: e.target.value })}
                    placeholder="Enter password"
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
              )}

              <div className="flex gap-3 mt-6 pt-4 border-t border-slate-700">
                <Button
                  onClick={handleAddUser}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Create User
                </Button>
                <Button
                  onClick={() => setModalState({ ...modalState, isOpen: false })}
                  variant="outline"
                  className="flex-1 border-slate-600 text-slate-300"
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

