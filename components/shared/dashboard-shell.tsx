"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  Activity,
  Archive,
  BarChart3,
  Bell,
  BookMarked,
  BookOpen,
  Briefcase,
  Building2,
  Bus,
  CalendarCheck,
  ChevronRight,
  ClipboardCheck,
  ClipboardList,
  CreditCard,
  DollarSign,
  FileText,
  GraduationCap,
  HandHeart,
  HeartPulse,
  Home,
  Library,
  LogOut,
  Megaphone,
  Menu,
  MessageSquare,
  Moon,
  PackageSearch,
  Receipt,
  Settings,
  Shield,
  ShoppingCart,
  Sun,
  UserCheck,
  Users,
  Utensils,
  Wallet,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { authClient } from "@/lib/auth-client";
import { TopbarActivityButtons } from "@/components/shared/topbar-activity";
import { DashboardGreeting } from "@/components/shared/dashboard-greeting";
import { readCachedUserProfile, USER_PROFILE_CACHE_KEY, USER_PROFILE_UPDATED_EVENT, type UserProfileUpdateDetail } from "@/components/profile-form";
import { ForcePasswordChangeGuard } from "@/components/force-password-change-guard";
import {
  PLATFORM_SETTINGS_CHANNEL,
  PLATFORM_SETTINGS_STORAGE_KEY,
  PLATFORM_SETTINGS_SYNC_EVENT,
  type PublicPlatformSettings,
  readCachedPlatformSettings,
} from "@/lib/platform-settings-sync";

export type DashboardRole =
  | "master"
  | "super_admin"
  | "admin"
  | "school_admin"
  | "owner"
  | "staff"
  | "teacher"
  | "student"
  | "parent"
  | "guardian"
  | "finance"
  | "accountant"
  | "librarian"
  | "hr"
  | "canteen"
  | "lecturer"
  | "admissions_officer"
  | "registrar"
  | "exam_officer"
  | "department_head"
  | "class_teacher"
  | "nurse"
  | "transport_manager"
  | "hostel_warden"
  | "security"
  | "procurement"
  | "inventory_manager"
  | "counselor"
  | "alumni_officer";

type NavItem = {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  children?: NavItem[];
};

type NavSection = {
  title: string;
  items: NavItem[];
};

const adminSections: NavSection[] = [
  {
    title: "Operations",
    items: [
      { name: "Dashboard", href: "/admin/dashboard", icon: Home },
    ],
  },
  {
    title: "Academics",
    items: [
      {
        name: "SIS",
        href: "/admin/admissions",
        icon: GraduationCap,
        children: [
          { name: "Admissions", href: "/admin/admissions", icon: ClipboardList },
          { name: "Student Profiles", href: "/admin/students", icon: Users },
          { name: "Documentation", href: "/admin/documentation", icon: FileText },
          { name: "Promotion", href: "/admin/promotion", icon: Activity },
          { name: "Alumni", href: "/admin/alumni", icon: GraduationCap },
        ],
      },
      {
        name: "Academics",
        href: "/admin/classes",
        icon: BookOpen,
        children: [
          { name: "Classes", href: "/admin/classes", icon: Users },
          { name: "Subjects", href: "/admin/subjects", icon: BookOpen },
          { name: "Timetable", href: "/admin/timetable", icon: CalendarCheck },
          { name: "Curriculum", href: "/admin/curriculum", icon: ClipboardList },
        ],
      },
      { name: "Student Attendance", href: "/admin/attendance", icon: CalendarCheck },
      { name: "Exams", href: "/admin/exams", icon: ClipboardCheck },
      { name: "Library", href: "/admin/library", icon: Library },
    ],
  },
  {
    title: "Finance",
    items: [
      { name: "Dashboard", href: "/admin/finance/dashboard", icon: BarChart3 },
      { name: "Payments", href: "/admin/finance/payments", icon: CreditCard },
      { name: "Invoices", href: "/admin/finance/invoices", icon: FileText },
      { name: "Receipts", href: "/admin/finance/receipts", icon: Receipt },
      { name: "Refunds", href: "/admin/finance/refunds", icon: Wallet },
      { name: "Expenses", href: "/admin/finance/expenses", icon: DollarSign },
      { name: "Scholarships", href: "/admin/finance/scholarships", icon: GraduationCap },
      { name: "Reports", href: "/admin/finance/reports", icon: BarChart3 },
      { name: "Settings", href: "/admin/finance/settings", icon: Settings },
    ],
  },
  {
    title: "Communication",
    items: [
      { name: "Messages", href: "/messages", icon: MessageSquare },
      { name: "Broadcasts", href: "/broadcasts", icon: Megaphone },
      { name: "Announcements", href: "/admin/announcements", icon: Bell },
      { name: "SMS Reports", href: "/admin/sms-reports", icon: FileText },
    ],
  },
  {
    title: "HR",
    items: [
      { name: "HR Dashboard", href: "/hr/dashboard", icon: Briefcase },
      { name: "Staff", href: "/admin/staff", icon: Users },
      { name: "Staff Attendance", href: "/hr/attendance", icon: CalendarCheck },
      { name: "Leave", href: "/hr/leave", icon: ClipboardList },
      { name: "Payroll", href: "/hr/payroll", icon: CreditCard },
      { name: "Documents", href: "/hr/documents", icon: FileText },
      { name: "Reports", href: "/hr/reports", icon: BarChart3 },
      { name: "Settings", href: "/hr/settings", icon: Settings },
    ],
  },
  {
    title: "Canteen",
    items: [
      { name: "Canteen Dashboard", href: "/canteen/dashboard", icon: Utensils },
    ],
  },
  {
    title: "System",
    items: [
      {
        name: "User Management",
        href: "/admin/users",
        icon: Users,
        children: [
          { name: "Users", href: "/admin/users", icon: Users },
          { name: "Permissions", href: "/admin/roles", icon: Shield },
        ],
      },
      { name: "Billing", href: "/admin/billing", icon: CreditCard },
      { name: "Audit & Logs", href: "/admin/audit", icon: Archive },
      { name: "Settings", href: "/admin/settings", icon: Settings },
    ],
  },
];

const ownerSections: NavSection[] = [
  {
    title: "Owner Centre",
    items: [
      { name: "Dashboard", href: "/owner/dashboard", icon: Home },
    ],
  },
  {
    title: "People",
    items: [
      { name: "Staff", href: "/owner/staff", icon: Users },
      { name: "HR Dashboard", href: "/owner/hr", icon: Briefcase },
      { name: "Staff Attendance", href: "/owner/staff-attendance", icon: CalendarCheck },
      { name: "Leave", href: "/owner/leave", icon: ClipboardList },
      { name: "Payroll", href: "/owner/payroll", icon: CreditCard },
    ],
  },
  {
    title: "Finance",
    items: [
      { name: "Finance Overview", href: "/owner/finance", icon: Wallet },
      { name: "Payments", href: "/owner/payments", icon: CreditCard },
      { name: "Invoices", href: "/owner/invoices", icon: FileText },
      { name: "Reports", href: "/owner/reports", icon: BarChart3 },
      { name: "Platform Billing", href: "/owner/billing", icon: Receipt },
    ],
  },
  {
    title: "Communication",
    items: [
      { name: "Messages", href: "/owner/messages", icon: MessageSquare },
      { name: "Broadcasts", href: "/owner/broadcasts", icon: Megaphone },
      { name: "Announcements", href: "/owner/announcements", icon: Bell },
    ],
  },
  {
    title: "Canteen",
    items: [
      { name: "Canteen Dashboard", href: "/owner/canteen", icon: Utensils },
    ],
  },
  {
    title: "Governance",
    items: [
      {
        name: "User Management",
        href: "/owner/users",
        icon: Users,
        children: [
          { name: "Users", href: "/owner/users", icon: Users },
          { name: "Permissions", href: "/owner/permissions", icon: Shield },
        ],
      },
      { name: "Audit & Logs", href: "/owner/audit", icon: Archive },
      { name: "School Settings", href: "/owner/settings", icon: Settings },
    ],
  },
];

const teacherSections: NavSection[] = [
  {
    title: "School Operations",
    items: [
      {
        name: "Classes",
        href: "/staff/classes",
        icon: Users,
        children: [
          { name: "My Classes", href: "/staff/classes", icon: Users },
          { name: "Lesson Plans", href: "/staff/lesson-plans", icon: ClipboardList },
          { name: "Learning Content", href: "/staff/resources", icon: BookOpen },
          { name: "Class Insights", href: "/staff/class-insights", icon: BarChart3 },
          { name: "My Schedule", href: "/staff/timetable", icon: CalendarCheck },
        ],
      },
      {
        name: "Grading & Tasks",
        href: "/staff/assignments",
        icon: ClipboardCheck,
        children: [
          { name: "Assignments", href: "/staff/assignments", icon: ClipboardList },
          { name: "Grading Hub", href: "/staff/grades", icon: BarChart3 },
        ],
      },
      { name: "Messages", href: "/staff/messages", icon: MessageSquare },
      { name: "My Profile", href: "/staff/profile", icon: Users },
      {
        name: "Attendance",
        href: "/staff/attendance",
        icon: CalendarCheck,
        children: [
          { name: "Mark Attendance", href: "/staff/attendance", icon: CalendarCheck },
          { name: "Daily Tracking", href: "/staff/attendance/daily", icon: Activity },
          { name: "Biometric Hub", href: "/staff/attendance/biometric", icon: Shield },
          { name: "Alerts", href: "/staff/attendance/alerts", icon: Bell },
        ],
      },
      {
        name: "Exams",
        href: "/staff/exams",
        icon: ClipboardCheck,
        children: [
          { name: "Scheduling", href: "/staff/exams/scheduling", icon: CalendarCheck },
          { name: "Assessments", href: "/staff/exams/assessments", icon: ClipboardList },
          { name: "Results", href: "/staff/exams/results", icon: BarChart3 },
          { name: "Report Cards", href: "/staff/exams/report-cards", icon: FileText },
          { name: "Exam Analytics", href: "/staff/exams/analytics", icon: BarChart3 },
        ],
      },
    ],
  },
];

const librarianSections: NavSection[] = [
  {
    title: "Library",
    items: [
      { name: "Library Dashboard", href: "/librarian/dashboard", icon: Home },
      { name: "Catalogue", href: "/librarian/catalogue", icon: BookMarked },
      { name: "Borrowing & Returns", href: "/librarian/loans", icon: ClipboardList },
      { name: "Members", href: "/librarian/members", icon: Users },
      { name: "Reports", href: "/librarian/reports", icon: BarChart3 },
    ],
  },
  {
    title: "Communication",
    items: [{ name: "Messages", href: "/messages", icon: MessageSquare }],
  },
];

const canteenSections: NavSection[] = [
  {
    title: "Canteen",
    items: [
      { name: "Canteen Dashboard", href: "/canteen/dashboard", icon: Home },
      { name: "Menus", href: "/canteen/menus", icon: Utensils },
      { name: "Orders", href: "/canteen/orders", icon: ClipboardList },
      { name: "Inventory", href: "/canteen/inventory", icon: Archive },
      { name: "Payments", href: "/canteen/payments", icon: Wallet },
      { name: "Reports", href: "/canteen/reports", icon: BarChart3 },
    ],
  },
  {
    title: "Communication",
    items: [{ name: "Messages", href: "/messages", icon: MessageSquare }],
  },
];

const admissionsSections: NavSection[] = [
  {
    title: "Admissions",
    items: [
      { name: "Dashboard", href: "/admin/dashboard", icon: Home },
      { name: "Applications", href: "/admin/admissions", icon: ClipboardList },
      { name: "Student Profiles", href: "/admin/students", icon: Users },
      { name: "Documentation", href: "/admin/documentation", icon: FileText },
      { name: "Promotion", href: "/admin/promotion", icon: Activity },
    ],
  },
  { title: "Communication", items: [{ name: "Messages", href: "/messages", icon: MessageSquare }] },
];

const registrarSections: NavSection[] = [
  {
    title: "Registry",
    items: [
      { name: "Dashboard", href: "/admin/dashboard", icon: Home },
      { name: "Student Records", href: "/admin/students", icon: Users },
      { name: "Documentation", href: "/admin/documentation", icon: FileText },
      { name: "Promotion", href: "/admin/promotion", icon: Activity },
      { name: "Alumni", href: "/admin/alumni", icon: GraduationCap },
    ],
  },
  { title: "Communication", items: [{ name: "Messages", href: "/messages", icon: MessageSquare }] },
];

const examOfficerSections: NavSection[] = [
  {
    title: "Examinations",
    items: [
      { name: "Dashboard", href: "/admin/dashboard", icon: Home },
      { name: "Exams", href: "/admin/exams", icon: ClipboardCheck },
      { name: "Assessments", href: "/staff/exams/assessments", icon: ClipboardList },
      { name: "Results", href: "/staff/exams/results", icon: BarChart3 },
      { name: "Report Cards", href: "/staff/exams/report-cards", icon: FileText },
    ],
  },
  { title: "Communication", items: [{ name: "Messages", href: "/messages", icon: MessageSquare }] },
];

const healthSections: NavSection[] = [
  {
    title: "Health",
    items: [
      { name: "Health Dashboard", href: "/health/dashboard", icon: Home },
      { name: "Sick Bay Visits", href: "/health/visits", icon: HeartPulse },
      { name: "Health Records", href: "/health/records", icon: FileText },
      { name: "Medication Logs", href: "/health/medication", icon: ClipboardList },
      { name: "Incidents", href: "/health/incidents", icon: Shield },
      { name: "Reports", href: "/health/reports", icon: BarChart3 },
    ],
  },
  { title: "Communication", items: [{ name: "Messages", href: "/messages", icon: MessageSquare }] },
];

const transportSections: NavSection[] = [
  {
    title: "Transport",
    items: [
      { name: "Transport Dashboard", href: "/transport/dashboard", icon: Home },
      { name: "Routes", href: "/transport/routes", icon: Bus },
      { name: "Vehicles", href: "/transport/vehicles", icon: Archive },
      { name: "Drivers", href: "/transport/drivers", icon: Users },
      { name: "Tracking", href: "/transport/tracking", icon: Activity },
      { name: "Reports", href: "/transport/reports", icon: BarChart3 },
    ],
  },
  { title: "Communication", items: [{ name: "Messages", href: "/messages", icon: MessageSquare }] },
];

const hostelSections: NavSection[] = [
  {
    title: "Hostel",
    items: [
      { name: "Hostel Dashboard", href: "/hostel/dashboard", icon: Home },
      { name: "Rooms", href: "/hostel/rooms", icon: Archive },
      { name: "Boarders", href: "/hostel/boarders", icon: Users },
      { name: "Attendance", href: "/hostel/attendance", icon: CalendarCheck },
      { name: "Welfare Notes", href: "/hostel/welfare", icon: HandHeart },
      { name: "Reports", href: "/hostel/reports", icon: BarChart3 },
    ],
  },
  { title: "Communication", items: [{ name: "Messages", href: "/messages", icon: MessageSquare }] },
];

const securitySections: NavSection[] = [
  {
    title: "Security",
    items: [
      { name: "Security Dashboard", href: "/security/dashboard", icon: Home },
      { name: "Visitor Logs", href: "/security/visitors", icon: Users },
      { name: "Gate Passes", href: "/security/gate-passes", icon: Shield },
      { name: "Incidents", href: "/security/incidents", icon: ClipboardList },
      { name: "Reports", href: "/security/reports", icon: BarChart3 },
    ],
  },
  { title: "Communication", items: [{ name: "Messages", href: "/messages", icon: MessageSquare }] },
];

const procurementSections: NavSection[] = [
  {
    title: "Procurement",
    items: [
      { name: "Procurement Dashboard", href: "/procurement/dashboard", icon: Home },
      { name: "Purchase Requests", href: "/procurement/requests", icon: ClipboardList },
      { name: "Suppliers", href: "/procurement/suppliers", icon: Users },
      { name: "Orders", href: "/procurement/orders", icon: ShoppingCart },
      { name: "Reports", href: "/procurement/reports", icon: BarChart3 },
    ],
  },
  { title: "Communication", items: [{ name: "Messages", href: "/messages", icon: MessageSquare }] },
];

const inventorySections: NavSection[] = [
  {
    title: "Inventory",
    items: [
      { name: "Inventory Dashboard", href: "/inventory/dashboard", icon: Home },
      { name: "Stock", href: "/inventory/stock", icon: PackageSearch },
      { name: "Assets", href: "/inventory/assets", icon: Archive },
      { name: "Movements", href: "/inventory/movements", icon: Activity },
      { name: "Reports", href: "/inventory/reports", icon: BarChart3 },
    ],
  },
  { title: "Communication", items: [{ name: "Messages", href: "/messages", icon: MessageSquare }] },
];

const wellbeingSections: NavSection[] = [
  {
    title: "Wellbeing",
    items: [
      { name: "Wellbeing Dashboard", href: "/wellbeing/dashboard", icon: Home },
      { name: "Counseling Cases", href: "/wellbeing/cases", icon: HandHeart },
      { name: "Behavior Support", href: "/wellbeing/behavior", icon: ClipboardList },
      { name: "Safeguarding", href: "/wellbeing/safeguarding", icon: Shield },
      { name: "Reports", href: "/wellbeing/reports", icon: BarChart3 },
    ],
  },
  { title: "Communication", items: [{ name: "Messages", href: "/messages", icon: MessageSquare }] },
];

const alumniSections: NavSection[] = [
  {
    title: "Alumni",
    items: [
      { name: "Alumni Dashboard", href: "/alumni/dashboard", icon: Home },
      { name: "Alumni Records", href: "/alumni/records", icon: GraduationCap },
      { name: "Events", href: "/alumni/events", icon: CalendarCheck },
      { name: "Campaigns", href: "/alumni/campaigns", icon: Megaphone },
      { name: "Reports", href: "/alumni/reports", icon: BarChart3 },
    ],
  },
  { title: "Communication", items: [{ name: "Messages", href: "/messages", icon: MessageSquare }] },
];

const roleConfig: Record<DashboardRole, { label: string; home: string; icon: NavItem["icon"]; sections: NavSection[] }> = {
  master: {
    label: "Roxan Control",
    home: "/master/dashboard",
    icon: Building2,
    sections: [
      { title: "Control Centre", items: [
        { name: "Master Dashboard", href: "/master/dashboard", icon: Home },
        { name: "Schools", href: "/master/schools", icon: Building2 },
        { name: "Billing", href: "/master/billing", icon: CreditCard },
        { name: "Subscription Plans", href: "/master/plans", icon: BarChart3 },
        { name: "System Analytics", href: "/master/analytics", icon: BarChart3 },
      ] },
      { title: "System", items: [
        { name: "Activity Log", href: "/master/activity", icon: Activity },
        { name: "Permissions", href: "/master/permissions", icon: Shield },
        { name: "Settings", href: "/master/settings", icon: Settings },
      ] },
    ],
  },
  super_admin: {
    label: "Roxan Control",
    home: "/master/dashboard",
    icon: Building2,
    sections: [],
  },
  admin: {
    label: "Admin Control",
    home: "/admin/dashboard",
    icon: Shield,
    sections: adminSections,
  },
  school_admin: {
    label: "School Admin",
    home: "/admin/dashboard",
    icon: Shield,
    sections: adminSections,
  },
  owner: {
    label: "School Owner",
    home: "/owner/dashboard",
    icon: Shield,
    sections: ownerSections,
  },
  staff: {
    label: "Teacher Portal",
    home: "/staff/dashboard",
    icon: Users,
    sections: teacherSections,
  },
  teacher: {
    label: "Teacher Portal",
    home: "/staff/dashboard",
    icon: Users,
    sections: teacherSections,
  },
  lecturer: {
    label: "Teacher Portal",
    home: "/staff/dashboard",
    icon: Users,
    sections: teacherSections,
  },
  student: {
    label: "Student Portal",
    home: "/student/dashboard",
    icon: GraduationCap,
    sections: [
      { title: "Dashboard", items: [
        { name: "My Dashboard", href: "/student/dashboard", icon: Home },
      ] },
      { title: "Academics", items: [
        {
          name: "Academics",
          href: "/student/subjects",
          icon: BookOpen,
          children: [
            { name: "Subjects", href: "/student/subjects", icon: BookOpen },
            { name: "Exams & Results", href: "/student/exams", icon: BarChart3 },
            { name: "Assessments", href: "/student/assessments", icon: ClipboardList },
          ],
        },
        { name: "Assignments", href: "/student/assignments", icon: ClipboardList },
        { name: "Performance Insights", href: "/student/performance", icon: BarChart3 },
        { name: "Learning Resources", href: "/student/resources", icon: Library },
      ] },
      { title: "Schedule & Attendance", items: [
        { name: "My Schedule", href: "/student/timetable", icon: CalendarCheck },
        { name: "Attendance", href: "/student/attendance", icon: ClipboardCheck },
      ] },
      { title: "Finance & Communication", items: [
        { name: "Finance", href: "/student/finance", icon: Wallet },
        { name: "My Refunds", href: "/student/refunds", icon: Receipt },
        { name: "Communication/Messages", href: "/student/communication", icon: MessageSquare },
      ] },
      { title: "Account", items: [
        { name: "My Profile", href: "/student/profile", icon: Users },
        { name: "Settings", href: "/student/settings", icon: Settings },
      ] },
    ],
  },
  parent: {
    label: "Parent Portal",
    home: "/parent/dashboard",
    icon: Users,
    sections: [
      { title: "Parent Portal", items: [
        { name: "Parent Dashboard", href: "/parent/dashboard", icon: Home },
        { name: "Children", href: "/parent/progress", icon: Users },
        { name: "Attendance", href: "/parent/attendance", icon: CalendarCheck },
        { name: "Fees", href: "/parent/finance", icon: CreditCard },
        { name: "Communication", href: "/parent/communication", icon: MessageSquare },
        { name: "My Profile", href: "/parent/profile", icon: Users },
        { name: "Settings", href: "/parent/settings", icon: Settings },
      ] },
    ],
  },
  guardian: {
    label: "Parent Portal",
    home: "/parent/dashboard",
    icon: Users,
    sections: [
      { title: "Parent Portal", items: [
        { name: "Parent Dashboard", href: "/parent/dashboard", icon: Home },
        { name: "Children", href: "/parent/progress", icon: Users },
        { name: "Attendance", href: "/parent/attendance", icon: CalendarCheck },
        { name: "Fees", href: "/parent/finance", icon: CreditCard },
        { name: "Communication", href: "/parent/communication", icon: MessageSquare },
        { name: "My Profile", href: "/parent/profile", icon: Users },
        { name: "Settings", href: "/parent/settings", icon: Settings },
      ] },
    ],
  },
  finance: {
    label: "Finance Portal",
    home: "/finance/dashboard",
    icon: Wallet,
    sections: [
      { title: "Finance", items: [
        { name: "Dashboard", href: "/finance/dashboard", icon: Home },
        { name: "Finance", href: "/finance", icon: Wallet },
      ] },
      { title: "Communication", items: [
        { name: "Messages & Broadcasts", href: "/finance/messages", icon: MessageSquare },
      ] },
    ],
  },
  accountant: {
    label: "Finance Portal",
    home: "/finance/dashboard",
    icon: Wallet,
    sections: [
      { title: "Finance", items: [
        { name: "Dashboard", href: "/finance/dashboard", icon: Home },
        { name: "Finance", href: "/finance", icon: Wallet },
      ] },
      { title: "Communication", items: [
        { name: "Messages & Broadcasts", href: "/finance/messages", icon: MessageSquare },
      ] },
    ],
  },
  librarian: {
    label: "Library Portal",
    home: "/librarian/dashboard",
    icon: BookMarked,
    sections: librarianSections,
  },
  hr: {
    label: "HR Portal",
    home: "/hr/dashboard",
    icon: Users,
    sections: [
      { title: "HR", items: [
        { name: "HR Dashboard", href: "/hr/dashboard", icon: Home },
        { name: "Staff", href: "/hr/staff", icon: Users },
        { name: "Staff Attendance", href: "/hr/attendance", icon: CalendarCheck },
        { name: "Leave", href: "/hr/leave", icon: ClipboardList },
        { name: "Payroll", href: "/hr/payroll", icon: CreditCard },
        { name: "Documents", href: "/hr/documents", icon: FileText },
        { name: "Reports", href: "/hr/reports", icon: BarChart3 },
        { name: "Settings", href: "/hr/settings", icon: Settings },
      ] },
    ],
  },
  canteen: {
    label: "Canteen Portal",
    home: "/canteen/dashboard",
    icon: Utensils,
    sections: canteenSections,
  },
  admissions_officer: {
    label: "Admissions Portal",
    home: "/admin/dashboard",
    icon: UserCheck,
    sections: admissionsSections,
  },
  registrar: {
    label: "Registrar Portal",
    home: "/admin/dashboard",
    icon: ClipboardList,
    sections: registrarSections,
  },
  exam_officer: {
    label: "Exam Officer Portal",
    home: "/admin/dashboard",
    icon: ClipboardCheck,
    sections: examOfficerSections,
  },
  department_head: {
    label: "Department Head Portal",
    home: "/staff/dashboard",
    icon: Briefcase,
    sections: teacherSections,
  },
  class_teacher: {
    label: "Class Teacher Portal",
    home: "/staff/dashboard",
    icon: Users,
    sections: teacherSections,
  },
  nurse: {
    label: "Health Portal",
    home: "/health/dashboard",
    icon: HeartPulse,
    sections: healthSections,
  },
  transport_manager: {
    label: "Transport Portal",
    home: "/transport/dashboard",
    icon: Bus,
    sections: transportSections,
  },
  hostel_warden: {
    label: "Hostel Portal",
    home: "/hostel/dashboard",
    icon: Home,
    sections: hostelSections,
  },
  security: {
    label: "Security Portal",
    home: "/security/dashboard",
    icon: Shield,
    sections: securitySections,
  },
  procurement: {
    label: "Procurement Portal",
    home: "/procurement/dashboard",
    icon: ShoppingCart,
    sections: procurementSections,
  },
  inventory_manager: {
    label: "Inventory Portal",
    home: "/inventory/dashboard",
    icon: PackageSearch,
    sections: inventorySections,
  },
  counselor: {
    label: "Wellbeing Portal",
    home: "/wellbeing/dashboard",
    icon: HandHeart,
    sections: wellbeingSections,
  },
  alumni_officer: {
    label: "Alumni Portal",
    home: "/alumni/dashboard",
    icon: GraduationCap,
    sections: alumniSections,
  },
};

roleConfig.super_admin.sections = roleConfig.master.sections;

function initials(name?: string) {
  return (name || "User")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function fallbackTenantName(slug?: string) {
  return String(slug || "")
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ") || "School";
}

export function DashboardShell({
  role,
  children,
  tenantSlug,
  tenantSubdomain = false,
}: {
  role: DashboardRole;
  children: React.ReactNode;
  tenantSlug?: string;
  tenantSubdomain?: boolean;
}) {
  const config = roleConfig[role];
  const pathname = usePathname() || "";
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const { data: session } = authClient.useSession();
  const user = session?.user;
  const [verifiedMasterUser, setVerifiedMasterUser] = React.useState<{
    id: string;
    email: string;
    name: string;
    role: string;
  } | null>(null);
  const [profileOverride, setProfileOverride] = React.useState<UserProfileUpdateDetail>({});
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [collapsed, setCollapsed] = React.useState(false);
  const [openSidebarItems, setOpenSidebarItems] = React.useState<Record<string, boolean>>({});
  const [mounted, setMounted] = React.useState(false);
  const [platformSettings, setPlatformSettings] = React.useState<PublicPlatformSettings>(() => ({
    platformShortName: "Roxan",
    platformSubtitle: "Education System",
    platformName: "Roxan Education System",
  }));
  const [tenantBranding, setTenantBranding] = React.useState<{ name: string; logoUrl: string | null }>(() => ({
    name: fallbackTenantName(tenantSlug),
    logoUrl: null,
  }));
  const isTenantShell = Boolean(tenantSlug) && role !== "master" && role !== "super_admin";
  const tenantBasePath = isTenantShell && !tenantSubdomain ? `/${tenantSlug}` : "";
  const withTenantPath = React.useCallback(
    (href: string) => {
      if (!isTenantShell || tenantSubdomain) return href;
      return href.startsWith("/") ? `${tenantBasePath}${href}` : `${tenantBasePath}/${href}`;
    },
    [isTenantShell, tenantBasePath, tenantSubdomain]
  );

  const breadcrumbs = pathname.split("/").filter(Boolean);
  const routeBreadcrumbs = isTenantShell && breadcrumbs[0] === tenantSlug ? breadcrumbs.slice(1) : breadcrumbs;
  const roleRootSegments = new Set(["master", "admin", "owner", "staff", "teacher", "student", "parent"]);
  const breadcrumbItems = routeBreadcrumbs.reduce<Array<{ label: string; href: string; current: boolean }>>((items, crumb, index) => {
    const isRoleRoot = index === 0 && roleRootSegments.has(crumb);
    const isDashboardSegment = crumb === "dashboard";
    const nextSegments = routeBreadcrumbs.slice(0, index + 1);
    const href = isRoleRoot ? withTenantPath(config.home) : withTenantPath(`/${nextSegments.join("/")}`);
    const hasOnlyDashboardAfterRoot = routeBreadcrumbs.length === 2 && routeBreadcrumbs[1] === "dashboard";

    if (isRoleRoot) {
      if (routeBreadcrumbs.length === 1 || hasOnlyDashboardAfterRoot) {
        items.push({
          label: crumb.replace(/-/g, " "),
          href,
          current: true,
        });
      }
      return items;
    }

    if (isDashboardSegment) return items;

    items.push({
      label: crumb.replace(/-/g, " "),
      href,
      current: index === routeBreadcrumbs.length - 1,
    });
    return items;
  }, []);
  const effectiveTheme = mounted ? resolvedTheme : "light";
  const isPlatformBrand = role === "master" || role === "super_admin";
  const accountUser = isPlatformBrand && verifiedMasterUser ? verifiedMasterUser : user;
  const displayRole = String((accountUser as { role?: string } | undefined)?.role || role).replace(/_/g, " ");
  const brandTitle = isPlatformBrand ? platformSettings.platformShortName || "Roxan" : tenantBranding.name;
  const brandSubtitle = isPlatformBrand ? platformSettings.platformSubtitle || "Education System" : "Roxan Education System";
  const scopedAccountPath = (page: "profile" | "settings") => {
    const first = routeBreadcrumbs[0];
    if (first === "master") return `/master/${page}`;
    if (first === "owner") return withTenantPath(page === "settings" ? "/owner/user-settings" : "/owner/profile");
    if (
      [
        "admin",
        "staff",
        "student",
        "parent",
        "finance",
        "librarian",
        "hr",
        "canteen",
        "health",
        "hostel",
        "transport",
        "security",
        "procurement",
        "inventory",
        "wellbeing",
        "alumni",
      ].includes(first)
    ) {
      return withTenantPath(`/${first}/${page}`);
    }
    return withTenantPath(`/${page}`);
  };
  const profilePath = scopedAccountPath("profile");
  const settingsPath = scopedAccountPath("settings");
  const displayName = profileOverride.name || accountUser?.name || (isPlatformBrand ? "Super Admin" : config.label);
  const displayImage =
    profileOverride.image !== undefined
      ? profileOverride.image || undefined
      : user?.image
        ? `/api/profile/avatar?v=${profileOverride.avatarVersion || "session"}`
        : undefined;
  const displayEmail = accountUser?.email || "";
  const showDashboardGreeting = pathname === withTenantPath(config.home) || pathname.endsWith("/dashboard");
  const maintenanceActive = Boolean(platformSettings.maintenanceMode && !isPlatformBrand);
  const announcementBanner = String(platformSettings.announcementBanner || "").trim();

  React.useEffect(() => {
    setMounted(true);
    setCollapsed(window.localStorage.getItem("zyra-dashboard-sidebar-collapsed") === "1");
  }, []);

  React.useEffect(() => {
    if (!isPlatformBrand) {
      setVerifiedMasterUser(null);
      return;
    }

    let cancelled = false;
    const loadMasterUser = async () => {
      const response = await fetch("/api/master/session", {
        cache: "no-store",
        credentials: "include",
      }).catch(() => null);
      if (!response?.ok || cancelled) return;
      const payload = await response.json().catch(() => ({}));
      if (payload?.authenticated && payload?.user?.role === "super_admin") {
        setVerifiedMasterUser({
          id: String(payload.user.id || payload.user.userId || ""),
          email: String(payload.user.email || ""),
          name: String(payload.user.name || payload.user.email || "Super Admin"),
          role: String(payload.user.role || "super_admin"),
        });
      }
    };

    void loadMasterUser();
    return () => {
      cancelled = true;
    };
  }, [isPlatformBrand]);

  React.useEffect(() => {
    const applySettings = (settings: PublicPlatformSettings | null) => {
      if (!settings) return;
      setPlatformSettings((current) => ({ ...current, ...settings }));
    };

    applySettings(readCachedPlatformSettings());

    const loadSettings = async () => {
      const response = await fetch("/api/master/settings?scope=public", { cache: "no-store" }).catch(() => null);
      if (!response?.ok) return;
      const settings = (await response.json()) as PublicPlatformSettings;
      window.localStorage.setItem(PLATFORM_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
      applySettings(settings);
    };

    const handleEvent = (event: Event) => {
      applySettings((event as CustomEvent<PublicPlatformSettings>).detail || null);
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== PLATFORM_SETTINGS_STORAGE_KEY || !event.newValue) return;
      try {
        applySettings(JSON.parse(event.newValue) as PublicPlatformSettings);
      } catch {}
    };

    const channel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel(PLATFORM_SETTINGS_CHANNEL) : null;
    const handleChannel = (event: MessageEvent<PublicPlatformSettings>) => applySettings(event.data);

    window.addEventListener(PLATFORM_SETTINGS_SYNC_EVENT, handleEvent as EventListener);
    window.addEventListener("storage", handleStorage);
    channel?.addEventListener("message", handleChannel);
    void loadSettings();

    return () => {
      window.removeEventListener(PLATFORM_SETTINGS_SYNC_EVENT, handleEvent as EventListener);
      window.removeEventListener("storage", handleStorage);
      channel?.removeEventListener("message", handleChannel);
      channel?.close();
    };
  }, []);

  React.useEffect(() => {
    if (!isTenantShell || !tenantSlug) return;

    const storageKey = `roxan:tenant-branding:${tenantSlug}`;
    const applyBranding = (updates: { name?: string | null; defaultName?: string | null; logoUrl?: string | null }) => {
      const fallbackName = updates.defaultName || fallbackTenantName(tenantSlug);
      const next = {
        name: updates.name || fallbackName,
        logoUrl: updates.logoUrl || null,
      };
      setTenantBranding(next);
      try {
        const serialized = JSON.stringify(next);
        sessionStorage.setItem(storageKey, serialized);
        localStorage.setItem(storageKey, serialized);
      } catch {}
    };

    try {
      const cached = sessionStorage.getItem(storageKey) || localStorage.getItem(storageKey);
      if (cached) {
        const parsed = JSON.parse(cached) as { name?: string; logoUrl?: string | null };
        if (parsed?.name) setTenantBranding({ name: parsed.name, logoUrl: parsed.logoUrl || null });
      }
    } catch {}

    let cancelled = false;
    const loadBranding = async () => {
      const response = await fetch(`/api/tenant/branding?slug=${encodeURIComponent(tenantSlug)}`, { cache: "no-store" }).catch(() => null);
      if (!response?.ok || cancelled) return;
      const data = await response.json().catch(() => ({}));
      if (!cancelled) {
        applyBranding({
          name: data.name,
          defaultName: data.defaultName,
          logoUrl: data.logoUrl,
        });
      }
    };

    const handleBrandingStorage = (event: StorageEvent) => {
      if (event.key !== storageKey || !event.newValue) return;
      try {
        const parsed = JSON.parse(event.newValue) as { name?: string | null; logoUrl?: string | null };
        applyBranding(parsed);
      } catch {}
    };

    const handleBrandingEvent = (event: Event) => {
      const detail = (event as CustomEvent<{ name?: string | null; logoUrl?: string | null }>).detail || {};
      applyBranding(detail);
    };

    window.addEventListener("storage", handleBrandingStorage);
    window.addEventListener("roxan:tenant-branding-updated", handleBrandingEvent as EventListener);
    void loadBranding();
    return () => {
      cancelled = true;
      window.removeEventListener("storage", handleBrandingStorage);
      window.removeEventListener("roxan:tenant-branding-updated", handleBrandingEvent as EventListener);
    };
  }, [isTenantShell, tenantSlug]);

  React.useEffect(() => {
    const cached = readCachedUserProfile();
    if (cached) setProfileOverride((current) => ({ ...current, ...cached }));

    const handleProfileUpdate = (event: Event) => {
      const detail = (event as CustomEvent<UserProfileUpdateDetail>).detail || {};
      setProfileOverride((current) => ({ ...current, ...detail }));
    };
    const handleProfileStorage = (event: StorageEvent) => {
      if (event.key !== USER_PROFILE_CACHE_KEY || !event.newValue) return;
      const raw = event.newValue;
      try {
        setProfileOverride((current) => ({ ...current, ...JSON.parse(raw) }));
      } catch {}
    };
    window.addEventListener(USER_PROFILE_UPDATED_EVENT, handleProfileUpdate as EventListener);
    window.addEventListener("storage", handleProfileStorage);
    return () => {
      window.removeEventListener(USER_PROFILE_UPDATED_EVENT, handleProfileUpdate as EventListener);
      window.removeEventListener("storage", handleProfileStorage);
    };
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((current) => {
      const next = !current;
      window.localStorage.setItem("zyra-dashboard-sidebar-collapsed", next ? "1" : "0");
      return next;
    });
  };

  const toggleTheme = () => {
    const nextTheme = effectiveTheme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    window.localStorage.setItem("theme", nextTheme);
    document.documentElement.classList.toggle("dark", nextTheme === "dark");
  };

  const toggleSidebarItem = (key: string) => {
    setOpenSidebarItems((current) => ({
      ...current,
      [key]: !current[key],
    }));
  };

  const handleLogout = async () => {
    await authClient.signOut().catch(() => undefined);
    toast.success("Logged out");
    router.push(role === "master" ? "/master/login" : isTenantShell ? withTenantPath("/staff") : "/login");
  };

  const sidebar = (
    <aside
      className={cn(
        "flex h-full shrink-0 flex-col border-r border-border bg-card/90 text-foreground shadow-sm backdrop-blur-xl transition-[width] duration-200",
        collapsed ? "w-20" : "w-64"
      )}
    >
      <div className={cn("flex h-16 items-center gap-3 border-b border-border px-4", collapsed && "justify-center px-2")}>
        {isTenantShell && tenantBranding.logoUrl ? (
          <img
            src={tenantBranding.logoUrl}
            alt={`${tenantBranding.name} logo`}
            className="size-8 rounded-xl border border-border object-cover"
          />
        ) : (
          <div className="flex size-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <config.icon className="size-5" />
          </div>
        )}
        <Link href={withTenantPath(config.home)} className={cn("min-w-0", collapsed && "sr-only")}>
          <span className="block truncate text-base font-semibold uppercase leading-tight tracking-wide">{brandTitle}</span>
          <span className="block truncate text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{brandSubtitle}</span>
        </Link>
      </div>
      <nav className={cn("scrollbar-hide flex-1 space-y-5 overflow-y-auto py-4", collapsed ? "px-2" : "px-3")}>
        {config.sections.map((section) => (
          <div key={section.title}>
            {!collapsed && (
              <p className="mb-2 px-3 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground/70">
                {section.title}
              </p>
            )}
            <div className="space-y-1">
              {section.items.map((item) => {
                const itemHref = withTenantPath(item.href);
                const hasChildren = Boolean(item.children?.length);
                const childActive = item.children?.some((child) => {
                  const childHref = withTenantPath(child.href);
                  return pathname === childHref || pathname.startsWith(`${childHref}/`);
                });
                const active = pathname === itemHref || pathname.startsWith(`${itemHref}/`) || childActive;
                const Icon = item.icon;
                const itemKey = `${section.title}:${item.href}`;
                const childrenOpen = !collapsed && hasChildren && (openSidebarItems[itemKey] ?? Boolean(active));
                const navItemClass = cn(
                  "flex h-10 w-full items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors",
                  collapsed && "justify-center px-0",
                  active ? "bg-primary text-primary-foreground shadow-sm" : "text-foreground hover:bg-muted/70"
                );
                return (
                  <div key={item.href}>
                    {hasChildren ? (
                      <button
                        type="button"
                        onClick={() => toggleSidebarItem(itemKey)}
                        className={navItemClass}
                        title={collapsed ? item.name : undefined}
                        aria-expanded={childrenOpen}
                      >
                        <Icon className="size-4 shrink-0" />
                        {!collapsed && <span className="min-w-0 flex-1 truncate text-left">{item.name}</span>}
                        {!collapsed && (
                          <ChevronRight className={cn("size-4 shrink-0 transition-transform", childrenOpen && "rotate-90")} />
                        )}
                      </button>
                    ) : (
                      <Link
                        href={itemHref}
                        onClick={() => setMobileOpen(false)}
                        className={navItemClass}
                        title={collapsed ? item.name : undefined}
                      >
                        <Icon className="size-4 shrink-0" />
                        {!collapsed && <span className="min-w-0 flex-1 truncate">{item.name}</span>}
                      </Link>
                    )}
                    {childrenOpen ? (
                      <div className="ml-5 mt-1 space-y-1 border-l border-border pl-2">
                        {(item.children || []).map((child) => {
                          const ChildIcon = child.icon;
                          const childHref = withTenantPath(child.href);
                          const childIsActive = pathname === childHref || pathname.startsWith(`${childHref}/`);
                          return (
                            <Link
                              key={child.href}
                              href={childHref}
                              onClick={() => setMobileOpen(false)}
                              className={cn(
                                "flex h-9 items-center gap-2 rounded-lg px-3 text-xs font-medium transition-colors",
                                childIsActive
                                  ? "bg-primary text-primary-foreground shadow-sm"
                                  : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                              )}
                            >
                              <ChildIcon className="size-3.5" />
                              <span className="flex-1">{child.name}</span>
                            </Link>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
      <div className="border-t border-border p-2">
        <Button
          type="button"
          variant="ghost"
          className={cn("mb-2 w-full justify-start gap-2", collapsed && "justify-center px-0")}
          onClick={toggleCollapsed}
        >
          <ChevronRight className={cn("size-4 transition-transform", !collapsed && "rotate-180")} />
          {!collapsed && <span>Collapse</span>}
        </Button>
        <div className={cn("flex items-center gap-3 rounded-xl bg-muted/50 p-2", collapsed && "justify-center")}>
          <Avatar className="size-9">
            <AvatarImage src={displayImage || undefined} />
            <AvatarFallback>{initials(displayName)}</AvatarFallback>
          </Avatar>
          {!collapsed && <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{displayName}</p>
            <p className="truncate text-xs text-muted-foreground">{displayEmail || "Verified platform account"}</p>
          </div>}
        </div>
      </div>
    </aside>
  );

  return (
    <div className="relative min-h-screen overflow-hidden bg-card">
      <ForcePasswordChangeGuard />
      <div className="pointer-events-none fixed inset-0 bg-card/80 backdrop-blur-sm" />
      <div className="fixed inset-y-0 left-0 z-40 hidden lg:block">{sidebar}</div>
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button className="absolute inset-0 bg-background/70 backdrop-blur-sm" onClick={() => setMobileOpen(false)} aria-label="Close navigation" />
          <div className="relative h-full">{sidebar}</div>
        </div>
      )}
      <div className={cn("relative z-10 transition-[padding] duration-200", collapsed ? "lg:pl-20" : "lg:pl-64")}>
        <header
          className={cn(
            "fixed left-0 right-0 top-0 z-30 flex h-16 items-center gap-3 border-b bg-card/45 px-4 backdrop-blur-xl md:px-6",
            collapsed ? "lg:left-20" : "lg:left-64"
          )}
        >
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileOpen(true)}>
            {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </Button>
          <div className="hidden min-w-0 flex-1 items-center gap-2 md:flex">
            <Link href={withTenantPath(config.home)} className="text-sm font-medium text-muted-foreground hover:text-foreground">
              Home
            </Link>
            {breadcrumbItems.map((crumb, index) => (
              <React.Fragment key={`${crumb}-${index}`}>
                <ChevronRight className="size-4 text-muted-foreground" />
                {crumb.current ? (
                  <span className="truncate text-sm font-medium capitalize">{crumb.label}</span>
                ) : (
                  <Link href={crumb.href} className="truncate text-sm font-medium capitalize text-muted-foreground hover:text-foreground">
                    {crumb.label}
                  </Link>
                )}
              </React.Fragment>
            ))}
          </div>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Toggle theme"
            onClick={toggleTheme}
          >
            {effectiveTheme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </Button>
          <TopbarActivityButtons />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-10 gap-3 px-2">
                <Avatar className="size-8">
                  <AvatarImage src={displayImage || undefined} />
                  <AvatarFallback>{initials(displayName)}</AvatarFallback>
                </Avatar>
                <span className="hidden min-w-0 text-left md:block">
                  <span className="block max-w-36 truncate text-sm font-medium">{displayName}</span>
                  <span className="block max-w-36 truncate text-xs capitalize text-muted-foreground">{displayRole}</span>
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel>
                <span className="block truncate">{displayName}</span>
                <span className="block truncate text-xs font-normal text-muted-foreground">{displayEmail || "Verified platform account"}</span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push(profilePath)}>
                <Users className="size-4" />
                My Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push(settingsPath)}>
                <Settings className="size-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={handleLogout}>
                <LogOut className="size-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        <main className="min-h-screen p-4 pt-20 md:p-6 md:pt-24">
          <div className="space-y-6">
            {announcementBanner ? (
              <div className="rounded-2xl border border-primary/20 bg-primary/10 px-4 py-3 text-sm font-medium text-foreground">
                {announcementBanner}
              </div>
            ) : null}
            {showDashboardGreeting ? (
              <DashboardGreeting displayName={displayName} roleLabel={config.label} />
            ) : null}
            {maintenanceActive ? (
              <section className="rounded-3xl border bg-card p-8 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary">Platform maintenance</p>
                <h1 className="mt-3 text-2xl font-semibold">This dashboard is temporarily paused</h1>
                <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                  Maintenance mode is active from the Roxan control center. Navigation remains loaded, but tenant workflows are locked until maintenance mode is disabled.
                </p>
                {platformSettings.supportEmail ? (
                  <p className="mt-5 text-sm text-muted-foreground">
                    Support: <span className="font-medium text-foreground">{platformSettings.supportEmail}</span>
                  </p>
                ) : null}
              </section>
            ) : children}
          </div>
        </main>
      </div>
    </div>
  );
}
