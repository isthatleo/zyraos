/**
 * University Student Sidebar Navigation
 * Path: src/components/student/university-sidebar-nav.tsx
 */

'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  BookOpen,
  FileText,
  Briefcase,
  TrendingUp,
  DollarSign,
  MessageSquare,
  LogOut,
  ChevronDown,
} from 'lucide-react';

export function UniversityStudentSidebarNav() {
  const pathname = usePathname();
  const [expandedAcademics, setExpandedAcademics] = useState(false);

  const items = [
    {
      label: 'My Dashboard',
      href: '/student/university/dashboard',
      icon: <LayoutDashboard className="h-5 w-5" />,
    },
    {
      label: 'Academics',
      href: '/student/university/academics',
      icon: <BookOpen className="h-5 w-5" />,
      children: [
        { label: 'Current Courses', href: '/student/university/courses' },
        { label: 'Projects', href: '/student/university/projects' },
        { label: 'Academic Trends', href: '/student/university/trends' },
        { label: 'Grade Reports', href: '/student/university/grades' },
      ],
    },
    {
      label: 'Career Development',
      href: '/student/university/career',
      icon: <Briefcase className="h-5 w-5" />,
      children: [
        { label: 'Internships', href: '/student/university/internships' },
        { label: 'Job Applications', href: '/student/university/jobs' },
        { label: 'Career Counseling', href: '/student/university/counseling' },
      ],
    },
    {
      label: 'Financial Aid',
      href: '/student/university/finance',
      icon: <DollarSign className="h-5 w-5" />,
    },
    {
      label: 'Academic Resources',
      href: '/student/university/resources',
      icon: <FileText className="h-5 w-5" />,
    },
    {
      label: 'Communications',
      href: '/student/university/messages',
      icon: <MessageSquare className="h-5 w-5" />,
    },
  ];

  return (
    <div className="w-64 bg-slate-900 border-r border-slate-700 h-screen overflow-y-auto">
      {/* Logo */}
      <div className="p-6 border-b border-slate-700">
        <h1 className="text-xl font-bold text-white">ZyraAI</h1>
        <p className="text-xs text-slate-400">University Student</p>
      </div>

      {/* Navigation */}
      <nav className="p-4 space-y-2">
        {items.map((item) => (
          <div key={item.href}>
            <button
              onClick={() => item.children && setExpandedAcademics(!expandedAcademics)}
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
                  className={`h-4 w-4 transition-transform ${expandedAcademics ? 'rotate-180' : ''}`}
                />
              )}
            </button>

            {/* Submenu */}
            {item.children && expandedAcademics && (
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
      </nav>

      {/* User Profile */}
      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-700 bg-slate-800">
        <button className="w-full flex items-center justify-between px-4 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-700 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
              ST
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-white">Jordan Williams</p>
              <p className="text-xs text-slate-400">Computer Science</p>
            </div>
          </div>
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

