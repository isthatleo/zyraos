/**
 * School Admin SIS Sidebar Navigation
 * Path: src/components/admin/sis-sidebar-nav.tsx
 */

'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, FileText, ArrowRight, UserGraduate, ChevronDown } from 'lucide-react';
import { useState } from 'react';

export function SisSidebarNav() {
  const pathname = usePathname();
  const [expandedSIS, setExpandedSIS] = useState(true);

  const sisItems = [
    { label: 'Dashboard', href: '/admin/dashboard', icon: <LayoutDashboard className="h-5 w-5" /> },
    {
      label: 'SIS (Student Information)',
      href: '/admin/sis',
      icon: <Users className="h-5 w-5" />,
      children: [
        { label: 'Admissions', href: '/admin/sis/admissions' },
        { label: 'Student Profiles', href: '/admin/sis/profiles' },
        { label: 'Documents', href: '/admin/sis/documents' },
        { label: 'Promotion', href: '/admin/sis/promotion' },
        { label: 'Alumni', href: '/admin/sis/alumni' },
      ],
    },
    { label: 'User Management', href: '/admin/users', icon: <Users className="h-5 w-5" /> },
    { label: 'Settings', href: '/admin/settings', icon: <FileText className="h-5 w-5" /> },
    { label: 'Billing', href: '/admin/finance/billing', icon: <FileText className="h-5 w-5" /> },
  ];

  return (
    <nav className="p-4 space-y-2">
      {sisItems.map((item) => (
        <div key={item.href}>
          <button
            onClick={() => item.children && setExpandedSIS(!expandedSIS)}
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
                className={`h-4 w-4 transition-transform ${expandedSIS && item.label.includes('SIS') ? 'rotate-180' : ''}`}
              />
            )}
          </button>

          {/* SIS Submenu */}
          {item.children && expandedSIS && item.label.includes('SIS') && (
            <div className="ml-4 mt-1 space-y-1">
              {item.children.map((child) => (
                <Link
                  key={child.href}
                  href={child.href}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs transition-colors ${
                    pathname === child.href
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  <ArrowRight className="h-3 w-3" />
                  {child.label}
                </Link>
              ))}
            </div>
          )}
        </div>
      ))}
    </nav>
  );
}

