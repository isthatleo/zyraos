/**
 * Master Admin Sidebar Navigation
 * Path: src/components/master/sidebar-nav.tsx
 */

'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Building2, DollarSign, BarChart3, Settings, LogOut } from 'lucide-react';

export function MasterSidebarNav() {
  const pathname = usePathname();

  const masterItems = [
    {
      label: 'Master Dashboard',
      href: '/(master)/dashboard',
      icon: <LayoutDashboard className="h-5 w-5" />,
    },
    {
      label: 'Schools',
      href: '/(master)/schools',
      icon: <Building2 className="h-5 w-5" />,
    },
    {
      label: 'Billing',
      href: '/(master)/billing',
      icon: <DollarSign className="h-5 w-5" />,
    },
    {
      label: 'Analytics',
      href: '/(master)/analytics',
      icon: <BarChart3 className="h-5 w-5" />,
    },
    {
      label: 'Settings',
      href: '/(master)/settings',
      icon: <Settings className="h-5 w-5" />,
    },
  ];

  return (
    <div className="w-64 bg-slate-800 border-r border-slate-700 flex flex-col h-screen">
      {/* Logo */}
      <div className="p-6 border-b border-slate-700">
        <h2 className="text-xl font-bold text-white">ZyraAI</h2>
        <p className="text-xs text-slate-400 mt-1">Master Control Panel</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-2">
        {masterItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 px-4 py-2 rounded-lg text-sm transition-colors ${
              pathname === item.href || pathname.startsWith(item.href + '/')
                ? 'bg-blue-600 text-white'
                : 'text-slate-300 hover:bg-slate-700'
            }`}
          >
            {item.icon}
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-slate-700">
        <button className="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-700 transition-colors">
          <LogOut className="h-5 w-5" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
}

