/**
 * Primary Student Sidebar Navigation
 * Path: src/components/student/primary-sidebar-nav.tsx
 */

'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  BookOpen,
  Star,
  Calendar,
  Award,
  MessageSquare,
  LogOut,
} from 'lucide-react';

export function PrimaryStudentSidebarNav() {
  const pathname = usePathname();

  const items = [
    {
      label: 'My Dashboard',
      href: '/student/primary/dashboard',
      icon: <LayoutDashboard className="h-5 w-5" />,
    },
    {
      label: 'My Subjects',
      href: '/student/primary/subjects',
      icon: <BookOpen className="h-5 w-5" />,
    },
    {
      label: 'My Stars ⭐',
      href: '/student/primary/stars',
      icon: <Star className="h-5 w-5" />,
    },
    {
      label: 'Today's Schedule',
      href: '/student/primary/schedule',
      icon: <Calendar className="h-5 w-5" />,
    },
    {
      label: 'My Achievements',
      href: '/student/primary/achievements',
      icon: <Award className="h-5 w-5" />,
    },
    {
      label: 'Messages',
      href: '/student/primary/messages',
      icon: <MessageSquare className="h-5 w-5" />,
    },
  ];

  return (
    <div className="w-64 bg-gradient-to-b from-slate-900 to-slate-800 border-r border-slate-700 h-screen overflow-y-auto">
      {/* Logo */}
      <div className="p-6 border-b border-slate-700">
        <h1 className="text-xl font-bold text-white">ZyraAI</h1>
        <p className="text-xs text-slate-400">Primary Student</p>
      </div>

      {/* Navigation */}
      <nav className="p-4 space-y-2">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-colors ${
              pathname === item.href || pathname.startsWith(item.href + '/')
                ? 'bg-blue-600 text-white shadow-lg'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            {item.icon}
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>

      {/* Fun Footer */}
      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-700 bg-slate-800">
        <div className="text-center mb-3">
          <div className="text-2xl mb-1">🌟</div>
          <p className="text-xs text-slate-400">Keep learning!</p>
        </div>
        <button className="w-full flex items-center justify-between px-4 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-700 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
              ST
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-white">Emma Johnson</p>
              <p className="text-xs text-slate-400">Grade 4</p>
            </div>
          </div>
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

