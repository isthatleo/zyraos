/**
 * Admin Dashboard Layout with Sidebar
 * Path: src/app/admin/layout.tsx
 */

import React from 'react';
import { AdminSidebarNav } from '@/components/admin/sidebar-nav';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-slate-900">
      {/* Sidebar */}
      <AdminSidebarNav />

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {/* Top Navigation Bar */}
        <div className="bg-slate-800 border-b border-slate-700 px-8 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">School Administration</h2>
            <div className="flex items-center gap-4">
              <button className="p-2 rounded-lg hover:bg-slate-700">
                <svg className="w-5 h-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                  />
                </svg>
              </button>
              <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">
                AD
              </div>
            </div>
          </div>
        </div>

        {/* Page Content */}
        <div className="p-8">
          {children}
        </div>
      </div>
    </div>
  );
}

2. Teacher Workspace/dashboard
The Teacher dashboard is a focused environment for instructional delivery and student management.
    Sidebar Links & Navigation
• Dashboard: Overview of teaching load.
• Classes:
    • My Classes: List of assigned classrooms.
• Lesson Plans: Curriculum mapping.
• Learning Content: Resource uploads.
• Class Insights: Performance data.
• My Schedule: Personal timetable.
• Grading & Tasks: Assignment and grading management.
• Messaging: Communication with parents/students.
    • My Profile: Personal details.
• Attendance: Mark and track class presence.
• Exams: Results entry and report card generation.
    Core Features & Elements
• Status Overview: Cards for Classes, Students, Today's Periods, and Pending Grading.
• Classroom Management: A grid view of assigned classes (e.g., JHS 1, SHS 3A) showing the subject and student count.
• Student Roster: Within a class view, a list showing each student's name, ID, Attendance %, and Estimated Grade.
• Attendance Marking Flow: A dedicated "Mark Attendance" interface with class/date filters and an Attendance Sheet containing status buttons (Present, Late, Absent).