/**
 * Teacher Sidebar Navigation
 * Path: src/components/teacher/sidebar-nav.tsx
 */

'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  BookOpen,
  Calendar,
  BarChart3,
  ClipboardList,
  MessageSquare,
  User,
  LogOut,
  ChevronDown,
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

export function TeacherSidebarNav() {
  const pathname = usePathname();
  const [expandedSections, setExpandedSections] = useState<string[]>(['classes']);

  const sections: NavSection[] = [
    {
      title: 'Teaching',
      items: [
        {
          label: 'Dashboard',
          href: '/teacher/dashboard',
          icon: <LayoutDashboard className="h-5 w-5" />,
        },
        {
          label: 'Classes',
          href: '/teacher/classes',
          icon: <BookOpen className="h-5 w-5" />,
          children: [
            { label: 'My Classes', href: '/teacher/classes' },
            { label: 'Lesson Plans', href: '/teacher/lesson-plans' },
            { label: 'Learning Content', href: '/teacher/learning-content' },
            { label: 'Class Insights', href: '/teacher/class-insights' },
          ],
        },
        {
          label: 'My Schedule',
          href: '/teacher/schedule',
          icon: <Calendar className="h-5 w-5" />,
        },
        {
          label: 'Grading & Tasks',
          href: '/teacher/grading',
          icon: <ClipboardList className="h-5 w-5" />,
        },
      ],
    },
    {
      title: 'Operations',
      items: [
        {
          label: 'Attendance',
          href: '/teacher/attendance',
          icon: <BarChart3 className="h-5 w-5" />,
        },
        {
          label: 'Exams',
          href: '/teacher/exams',
          icon: <ClipboardList className="h-5 w-5" />,
        },
        {
          label: 'Messaging',
          href: '/teacher/messaging',
          icon: <MessageSquare className="h-5 w-5" />,
        },
      ],
    },
    {
      title: 'Account',
      items: [
        {
          label: 'My Profile',
          href: '/teacher/profile',
          icon: <User className="h-5 w-5" />,
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
        <p className="text-xs text-slate-400">Teacher Portal</p>
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
              TH
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-white">Ms. Johnson</p>
              <p className="text-xs text-slate-400">Teacher</p>
            </div>
          </div>
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

