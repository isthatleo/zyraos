/**
 * Vocational Parent Sidebar Navigation
 * Path: src/components/parent/vocational-sidebar-nav.tsx
 */

'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Wrench,
  Shield,
  Briefcase,
  Calendar,
  Award,
  DollarSign,
  MessageSquare,
  LogOut,
  ChevronDown,
} from 'lucide-react';

export function VocationalParentSidebarNav() {
  const pathname = usePathname();
  const [expandedTraining, setExpandedTraining] = useState(false);

  const items = [
    {
      label: 'Parent Dashboard',
      href: '/parent/vocational/dashboard',
      icon: <LayoutDashboard className="h-5 w-5" />,
    },
    {
      label: 'My Children',
      href: '/parent/vocational/children',
      icon: <Users className="h-5 w-5" />,
    },
    {
      label: 'Training Progress',
      href: '/parent/vocational/training',
      icon: <Wrench className="h-5 w-5" />,
      children: [
        { label: 'Module Progress', href: '/parent/vocational/modules' },
        { label: 'Safety Records', href: '/parent/vocational/safety' },
        { label: 'Practical Hours', href: '/parent/vocational/hours' },
        { label: 'Certification Status', href: '/parent/vocational/certification' },
      ],
    },
    {
      label: 'Job Opportunities',
      href: '/parent/vocational/jobs',
      icon: <Briefcase className="h-5 w-5" />,
      children: [
        { label: 'Job Applications', href: '/parent/vocational/applications' },
        { label: 'Interviews', href: '/parent/vocational/interviews' },
        { label: 'Career Support', href: '/parent/vocational/career' },
      ],
    },
    {
      label: 'Workshop Events',
      href: '/parent/vocational/events',
      icon: <Calendar className="h-5 w-5" />,
    },
    {
      label: 'Achievements',
      href: '/parent/vocational/achievements',
      icon: <Award className="h-5 w-5" />,
    },
    {
      label: 'Training Fees',
      href: '/parent/vocational/fees',
      icon: <DollarSign className="h-5 w-5" />,
    },
    {
      label: 'Workshop Messages',
      href: '/parent/vocational/messages',
      icon: <MessageSquare className="h-5 w-5" />,
    },
  ];

  return (
    <div className="w-64 bg-slate-900 border-r border-slate-700 h-screen overflow-y-auto">
      {/* Logo */}
      <div className="p-6 border-b border-slate-700">
        <h1 className="text-xl font-bold text-white">ZyraAI</h1>
        <p className="text-xs text-slate-400">Vocational Parent</p>
      </div>

      {/* Navigation */}
      <nav className="p-4 space-y-2">
        {items.map((item) => (
          <div key={item.href}>
            <button
              onClick={() => item.children && setExpandedTraining(!expandedTraining)}
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
                  className={`h-4 w-4 transition-transform ${expandedTraining ? 'rotate-180' : ''}`}
                />
              )}
            </button>

            {/* Submenu */}
            {item.children && expandedTraining && (
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
              <p className="text-sm font-semibold text-white">Mr. Asante</p>
              <p className="text-xs text-slate-400">Parent</p>
            </div>
          </div>
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

