/**
 * Secondary Parent Sidebar Navigation
 * Path: src/components/parent/secondary-sidebar-nav.tsx
 */

'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  BookOpen,
  FileText,
  Calendar,
  DollarSign,
  MessageSquare,
  Award,
  LogOut,
  ChevronDown,
} from 'lucide-react';

export function SecondaryParentSidebarNav() {
  const pathname = usePathname();
  const [expandedAcademics, setExpandedAcademics] = useState(false);

  const items = [
    {
      label: 'Parent Dashboard',
      href: '/parent/secondary/dashboard',
      icon: <LayoutDashboard className="h-5 w-5" />,
    },
    {
      label: 'My Children',
      href: '/parent/secondary/children',
      icon: <Users className="h-5 w-5" />,
    },
    {
      label: 'Academics',
      href: '/parent/secondary/academics',
      icon: <BookOpen className="h-5 w-5" />,
      children: [
        { label: 'Subject Grades', href: '/parent/secondary/grades' },
        { label: 'Upcoming Assessments', href: '/parent/secondary/assessments' },
        { label: 'Performance Insights', href: '/parent/secondary/performance' },
      ],
    },
    {
      label: 'Clubs & Activities',
      href: '/parent/secondary/clubs',
      icon: <Award className="h-5 w-5" />,
    },
    {
      label: 'Attendance',
      href: '/parent/secondary/attendance',
      icon: <Calendar className="h-5 w-5" />,
    },
    {
      label: 'Fees & Payments',
      href: '/parent/secondary/fees',
      icon: <DollarSign className="h-5 w-5" />,
    },
    {
      label: 'Teacher Communication',
      href: '/parent/secondary/messages',
      icon: <MessageSquare className="h-5 w-5" />,
    },
    {
      label: 'School Events',
      href: '/parent/secondary/events',
      icon: <Calendar className="h-5 w-5" />,
    },
  ];

  return (
    <div className="w-64 bg-slate-900 border-r border-slate-700 h-screen overflow-y-auto">
      {/* Logo */}
      <div className="p-6 border-b border-slate-700">
        <h1 className="text-xl font-bold text-white">ZyraAI</h1>
        <p className="text-xs text-slate-400">Secondary Parent</p>
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
              PA
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-white">Mr. Thompson</p>
              <p className="text-xs text-slate-400">Parent</p>
            </div>
          </div>
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

