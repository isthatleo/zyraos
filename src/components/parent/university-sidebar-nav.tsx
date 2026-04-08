/**
 * University Parent Sidebar Navigation
 * Path: src/components/parent/university-sidebar-nav.tsx
 */

'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  BookOpen,
  Briefcase,
  TrendingUp,
  DollarSign,
  MessageSquare,
  LogOut,
  ChevronDown,
} from 'lucide-react';

export function UniversityParentSidebarNav() {
  const pathname = usePathname();
  const [expandedAcademics, setExpandedAcademics] = useState(false);
  const [expandedCareer, setExpandedCareer] = useState(false);

  const items = [
    {
      label: 'Parent Dashboard',
      href: '/parent/university/dashboard',
      icon: <LayoutDashboard className="h-5 w-5" />,
    },
    {
      label: 'My Children',
      href: '/parent/university/children',
      icon: <Users className="h-5 w-5" />,
    },
    {
      label: 'Academics',
      href: '/parent/university/academics',
      icon: <BookOpen className="h-5 w-5" />,
      children: [
        { label: 'Current Courses', href: '/parent/university/courses' },
        { label: 'Academic Trends', href: '/parent/university/trends' },
        { label: 'Grade Reports', href: '/parent/university/grades' },
      ],
    },
    {
      label: 'Career Development',
      href: '/parent/university/career',
      icon: <Briefcase className="h-5 w-5" />,
      children: [
        { label: 'Internships', href: '/parent/university/internships' },
        { label: 'Job Applications', href: '/parent/university/jobs' },
        { label: 'Career Counseling', href: '/parent/university/counseling' },
      ],
    },
    {
      label: 'Financial Overview',
      href: '/parent/university/finance',
      icon: <DollarSign className="h-5 w-5" />,
    },
    {
      label: 'University Messages',
      href: '/parent/university/messages',
      icon: <MessageSquare className="h-5 w-5" />,
    },
  ];

  return (
    <div className="w-64 bg-slate-900 border-r border-slate-700 h-screen overflow-y-auto">
      {/* Logo */}
      <div className="p-6 border-b border-slate-700">
        <h1 className="text-xl font-bold text-white">ZyraAI</h1>
        <p className="text-xs text-slate-400">University Parent</p>
      </div>

      {/* Navigation */}
      <nav className="p-4 space-y-2">
        {items.map((item) => (
          <div key={item.href}>
            <button
              onClick={() => {
                if (item.children) {
                  if (item.label === 'Academics') setExpandedAcademics(!expandedAcademics);
                  if (item.label === 'Career Development') setExpandedCareer(!expandedCareer);
                }
              }}
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
                    (item.label === 'Academics' && expandedAcademics) ||
                    (item.label === 'Career Development' && expandedCareer)
                      ? 'rotate-180'
                      : ''
                  }`}
                />
              )}
            </button>

            {/* Submenu */}
            {item.children && (
              <div className={`ml-4 mt-1 space-y-1 ${
                (item.label === 'Academics' && expandedAcademics) ||
                (item.label === 'Career Development' && expandedCareer)
                  ? 'block'
                  : 'hidden'
              }`}>
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
              <p className="text-sm font-semibold text-white">Mr. & Mrs. Williams</p>
              <p className="text-xs text-slate-400">Parents</p>
            </div>
          </div>
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

