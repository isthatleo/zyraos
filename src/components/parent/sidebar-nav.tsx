/**
 * Parent Sidebar Navigation
 * Path: src/components/parent/sidebar-nav.tsx
 */

'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Calendar,
  DollarSign,
  MessageSquare,
  LogOut,
} from 'lucide-react';

export function ParentSidebarNav() {
  const pathname = usePathname();

  const items = [
    {
      label: 'Dashboard',
      href: '/parent/dashboard',
      icon: <LayoutDashboard className="h-5 w-5" />,
    },
    {
      label: 'My Children',
      href: '/parent/children',
      icon: <Users className="h-5 w-5" />,
    },
    {
      label: 'Attendance',
      href: '/parent/attendance',
      icon: <Calendar className="h-5 w-5" />,
    },
    {
      label: 'Fees & Payments',
      href: '/parent/fees',
      icon: <DollarSign className="h-5 w-5" />,
    },
    {
      label: 'Communication',
      href: '/parent/communication',
      icon: <MessageSquare className="h-5 w-5" />,
    },
  ];

  return (
    <div className="w-64 bg-slate-900 border-r border-slate-700 h-screen overflow-y-auto">
      {/* Logo */}
      <div className="p-6 border-b border-slate-700">
        <h1 className="text-xl font-bold text-white">ZyraAI</h1>
        <p className="text-xs text-slate-400">Parent Portal</p>
      </div>

      {/* Navigation */}
      <nav className="p-4 space-y-2">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 px-4 py-2 rounded-lg text-sm transition-colors ${
              pathname === item.href || pathname.startsWith(item.href + '/')
                ? 'bg-blue-600 text-white'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            {item.icon}
            <span>{item.label}</span>
          </Link>
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

