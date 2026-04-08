/**
 * Permissions Management Page
 * Path: src/app/admin/permissions/page.tsx
 */

'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Save } from 'lucide-react';

interface PermissionCategory {
  name: string;
  permissions: string[];
}

interface RolePermissions {
  role: string;
  permissions: Record<string, boolean>;
}

export default function PermissionsPage() {
  const [selectedRole, setSelectedRole] = useState('teacher');
  const [searchQuery, setSearchQuery] = useState('');

  const permissionCategories: PermissionCategory[] = [
    {
      name: 'General & System',
      permissions: ['Dashboard', 'Calendar', 'Analytics', 'Settings', 'Communication', 'User Management', 'Audit & Logs', 'Billing'],
    },
    {
      name: 'Student Information',
      permissions: ['Student Profiles', 'Admissions', 'Documents', 'Promotion', 'Alumni'],
    },
    {
      name: 'Academics',
      permissions: ['Classes', 'Subjects', 'Timetable', 'Curriculum'],
    },
    {
      name: 'Examinations',
      permissions: ['Assessments', 'Results', 'Exam Analytics'],
    },
    {
      name: 'Finance',
      permissions: ['Payments', 'Receipts', 'Scholarships', 'Finance Setup'],
    },
    {
      name: 'Facilities',
      permissions: ['Student Attendance', 'Library', 'Transport', 'Hostel', 'Inventory'],
    },
    {
      name: 'HR & Staff',
      permissions: [
        'Staff Directory',
        'Staff Attendance',
        'Leave Management',
        'Payroll Processing',
        'HR Documents',
        'HR Reports',
        'HR Settings',
      ],
    },
  ];

  const roleDefaults: Record<string, string[]> = {
    teacher: ['Dashboard', 'Classes', 'Subjects', 'Student Profiles', 'Assessments', 'Results', 'Timetable'],
    admin: [
      'Dashboard',
      'Calendar',
      'Analytics',
      'Settings',
      'Communication',
      'User Management',
      'Audit & Logs',
      'Student Profiles',
      'Admissions',
      'Classes',
      'Subjects',
      'Timetable',
      'Assessments',
      'Results',
      'Payments',
      'Receipts',
      'Staff Directory',
      'Leave Management',
    ],
    finance: ['Dashboard', 'Payments', 'Receipts', 'Scholarships', 'Finance Setup', 'Analytics'],
    librarian: ['Dashboard', 'Student Profiles', 'Library', 'Student Attendance'],
    hr: ['Dashboard', 'Staff Directory', 'Staff Attendance', 'Leave Management', 'Payroll Processing', 'HR Documents', 'HR Reports', 'HR Settings'],
  };

  const [permissions, setPermissions] = useState<RolePermissions>(() => {
    const allPermissions: Record<string, boolean> = {};
    permissionCategories.forEach((cat) => {
      cat.permissions.forEach((perm) => {
        allPermissions[perm] = (roleDefaults[selectedRole] || []).includes(perm);
      });
    });
    return { role: selectedRole, permissions: allPermissions };
  });

  const handlePermissionChange = (permission: string) => {
    setPermissions((prev) => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [permission]: !prev.permissions[permission],
      },
    }));
  };

  const handleSelectAll = (category: string) => {
    const categoryPermissions = permissionCategories.find((c) => c.name === category)?.permissions || [];
    const allChecked = categoryPermissions.every((p) => permissions.permissions[p]);

    setPermissions((prev) => {
      const newPerms = { ...prev.permissions };
      categoryPermissions.forEach((p) => {
        newPerms[p] = !allChecked;
      });
      return { ...prev, permissions: newPerms };
    });
  };

  const handleRoleChange = (role: string) => {
    setSelectedRole(role);
    const newPerms: Record<string, boolean> = {};
    permissionCategories.forEach((cat) => {
      cat.permissions.forEach((perm) => {
        newPerms[perm] = (roleDefaults[role] || []).includes(perm);
      });
    });
    setPermissions({ role, permissions: newPerms });
  };

  const filteredCategories = permissionCategories.map((cat) => ({
    ...cat,
    permissions: cat.permissions.filter((p) =>
      p.toLowerCase().includes(searchQuery.toLowerCase())
    ),
  }));

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Permissions Management</h1>
        <p className="text-slate-400">Configure role-based access control (RBAC)</p>
      </div>

      {/* Role Selection */}
      <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-white">Select Role</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {Object.keys(roleDefaults).map((role) => (
              <button
                key={role}
                onClick={() => handleRoleChange(role)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedRole === role
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                {role.charAt(0).toUpperCase() + role.slice(1)}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Permissions Grid */}
      <div className="space-y-6">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
          <Input
            placeholder="Search permissions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-slate-700 border-slate-600 text-white"
          />
        </div>

        {/* Permission Categories */}
        {filteredCategories.map((category) => (
          category.permissions.length > 0 && (
            <Card key={category.name} className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white text-lg">{category.name}</CardTitle>
                  <button
                    onClick={() => handleSelectAll(category.name)}
                    className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    {permissionCategories
                      .find((c) => c.name === category.name)
                      ?.permissions.every((p) => permissions.permissions[p])
                      ? 'Deselect All'
                      : 'Select All'}
                  </button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {category.permissions.map((permission) => (
                    <label
                      key={permission}
                      className="flex items-center gap-3 p-3 bg-slate-700/30 rounded-lg border border-slate-600/30 hover:border-blue-500/50 transition-colors cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={permissions.permissions[permission] || false}
                        onChange={() => handlePermissionChange(permission)}
                        className="w-4 h-4"
                      />
                      <span className="text-sm text-slate-300">{permission}</span>
                    </label>
                  ))}
                </div>
              </CardContent>
            </Card>
          )
        ))}
      </div>

      {/* Summary & Actions */}
      <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-white">Permission Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 bg-slate-700/30 rounded-lg border border-slate-600/30">
              <p className="text-sm text-slate-300 mb-2">
                <span className="font-semibold text-white">
                  {Object.values(permissions.permissions).filter(Boolean).length}
                </span>
                {' permissions granted out of '}
                <span className="font-semibold text-white">
                  {Object.keys(permissions.permissions).length}
                </span>
              </p>
              <div className="w-full bg-slate-600 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all"
                  style={{
                    width: `${
                      (Object.values(permissions.permissions).filter(Boolean).length /
                        Object.keys(permissions.permissions).length) *
                      100
                    }%`,
                  }}
                />
              </div>
            </div>

            <div className="flex gap-3">
              <Button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-2">
                <Save className="h-4 w-4" />
                Save Permissions
              </Button>
              <Button variant="outline" className="flex-1 border-slate-600 text-slate-300">
                Reset to Default
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

