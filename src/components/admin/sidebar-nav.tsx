/**
 * Admin Sidebar Navigation
 * Path: src/components/admin/sidebar-nav.tsx
 */

'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  BookOpen,
  Users,
  GraduationCap,
  Calendar,
  FileText,
  Library,
  DollarSign,
  MessageSquare,
  Settings,
  LogOut,
  ChevronDown,
  BarChart3,
} from 'lucide-react';

interface NavSection {
  title: string;
  items: Array<{
    label: string;
    href: string;
    icon: React.ReactNode;
    children?: Array<{ label: string; href: string }>;
  }>;
}

export function AdminSidebarNav() {
  const pathname = usePathname();
  const [expandedSections, setExpandedSections] = useState<string[]>(['school-operations']);

  const sections: NavSection[] = [
    {
      title: 'School Operations',
      items: [
        {
          label: 'Dashboard',
          href: '/admin/dashboard',
          icon: <LayoutDashboard className="h-5 w-5" />,
        },
        {
          label: 'Classes',
          href: '/admin/classes',
          icon: <BookOpen className="h-5 w-5" />,
        },
        {
          label: 'Academics',
          href: '/admin/academics',
          icon: <GraduationCap className="h-5 w-5" />,
        },
        {
          label: 'SIS',
          href: '/admin/sis',
          icon: <Users className="h-5 w-5" />,
          children: [
            { label: 'Student Profiles', href: '/admin/sis/profiles' },
            { label: 'Admissions', href: '/admin/sis/admissions' },
            { label: 'Documents', href: '/admin/sis/documents' },
            { label: 'Promotions', href: '/admin/sis/promotions' },
            { label: 'Alumni', href: '/admin/sis/alumni' },
          ],
        },
        {
          label: 'Attendance',
          href: '/admin/attendance',
          icon: <Calendar className="h-5 w-5" />,
        },
        {
          label: 'Exams',
          href: '/admin/exams',
          icon: <FileText className="h-5 w-5" />,
        },
        {
          label: 'Library',
          href: '/admin/library',
          icon: <Library className="h-5 w-5" />,
        },
      ],
    },
    {
      title: 'Finance',
      items: [
        {
          label: 'Dashboard',
          href: '/admin/finance/dashboard',
          icon: <BarChart3 className="h-5 w-5" />,
        },
        {
          label: 'Finance',
          href: '/admin/finance',
          icon: <DollarSign className="h-5 w-5" />,
        },
        {
          label: 'Billing',
          href: '/admin/finance/billing',
          icon: <FileText className="h-5 w-5" />,
        },
      ],
    },
    {
      title: 'Communication',
      items: [
        {
          label: 'Messaging & Broadcasts',
          href: '/admin/communication/broadcasts',
          icon: <MessageSquare className="h-5 w-5" />,
        },
        {
          label: 'SMS Reports',
          href: '/admin/communication/sms-reports',
          icon: <BarChart3 className="h-5 w-5" />,
        },
      ],
    },
    {
      title: 'User Management',
      items: [
        {
          label: 'Users',
          href: '/admin/users',
          icon: <Users className="h-5 w-5" />,
        },
        {
          label: 'Permissions',
          href: '/admin/permissions',
          icon: <Settings className="h-5 w-5" />,
        },
      ],
    },
    {
      title: 'System',
      items: [
        {
          label: 'Settings',
          href: '/admin/settings',
          icon: <Settings className="h-5 w-5" />,
        },
        {
          label: 'Audit & Logs',
          href: '/admin/audit-logs',
          icon: <BarChart3 className="h-5 w-5" />,
        },
      ],
    },
  ];

  const toggleSection = (title: string) => {
    setExpandedSections((prev) =>
      prev.includes(title) ? prev.filter((t) => t !== title) : [...prev, title]
    );
  };

  return (
    <div className="w-64 bg-slate-900 border-r border-slate-700 h-screen overflow-y-auto">
      {/* Logo */}
      <div className="p-6 border-b border-slate-700">
        <h1 className="text-xl font-bold text-white">ZyraAI</h1>
        <p className="text-xs text-slate-400">School Management</p>
      </div>

      {/* Navigation */}
      <nav className="p-4 space-y-6">
        {sections.map((section) => (
          <div key={section.title}>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 px-2">
              {section.title}
            </h3>
            <div className="space-y-1">
              {section.items.map((item) => (
                <div key={item.href}>
                  <button
                    onClick={() => item.children && toggleSection(item.label)}
                    className={`w-full flex items-center justify-between px-4 py-2 rounded-lg text-sm transition-colors ${
                      pathname === item.href || pathname.startsWith(item.href + '/')
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <Link href={item.href} className="flex items-center gap-3 flex-1">
                      {item.icon}
                      <span>{item.label}</span>
                    </Link>
                    {item.children && (
                      <ChevronDown
                        className={`h-4 w-4 transition-transform ${
                          expandedSections.includes(item.label) ? 'rotate-180' : ''
                        }`}
                      />
                    )}
                  </button>

                  {/* Submenu */}
                  {item.children && expandedSections.includes(item.label) && (
                    <div className="ml-4 mt-1 space-y-1">
                      {item.children.map((child) => (
                        <Link
                          key={child.href}
                          href={child.href}
                          className={`block px-4 py-2 rounded-lg text-xs transition-colors ${
                            pathname === child.href
                              ? 'bg-blue-600 text-white'
                              : 'text-slate-400 hover:bg-slate-800'
                          }`}
                        >
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* User Profile */}
      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-700 bg-slate-800">
        <button className="w-full flex items-center justify-between px-4 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-700 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
              AD
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-white">Admin User</p>
              <p className="text-xs text-slate-400">Administrator</p>
            </div>
          </div>
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

