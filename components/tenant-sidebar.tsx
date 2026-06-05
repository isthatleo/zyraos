"use client"

import * as React from "react"
import Link from "next/link"
import { useParams, usePathname } from "next/navigation"
import {
  Activity,
  Archive,
  BarChart3,
  Bell,
  BookMarked,
  BookOpen,
  Briefcase,
  Bus,
  CalendarCheck,
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
  Megaphone,
  MessageSquare,
  PackageSearch,
  Receipt,
  Settings,
  Shield,
  ShoppingCart,
  UserCheck,
  Users,
  Utensils,
  Wallet,
} from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { readCachedUserProfile, USER_PROFILE_CACHE_KEY, USER_PROFILE_UPDATED_EVENT, type UserProfileUpdateDetail } from "@/components/profile-form"
import { authClient } from "@/lib/auth-client"
import {
  PLATFORM_SETTINGS_CHANNEL,
  PLATFORM_SETTINGS_STORAGE_KEY,
  PLATFORM_SETTINGS_SYNC_EVENT,
  type PublicPlatformSettings,
  readCachedPlatformSettings,
} from "@/lib/platform-settings-sync"
import { normalizeRole } from "@/lib/roles"
import { getTenantSubdomain } from "@/lib/tenant-routing"
import { cn } from "@/lib/utils"

type TenantRole =
  | "admin"
  | "school_admin"
  | "owner"
  | "finance"
  | "hr"
  | "parent"
  | "student"
  | "teacher"
  | "librarian"
  | "canteen"
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
  | "alumni_officer"

type NavItem = {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  children?: NavItem[]
}

type NavSection = {
  title: string
  items: NavItem[]
}

type RoleConfig = {
  label: string
  home: string
  icon: NavItem["icon"]
  sections: NavSection[]
}

type TenantBranding = {
  name: string
  defaultName: string
  logoUrl: string | null
  isDefault: boolean
}

export const TENANT_BRANDING_EVENT = "roxan:tenant-branding-updated"

const adminSections: NavSection[] = [
  {
    title: "Operations",
    items: [
      { name: "Dashboard", href: "/admin/dashboard", icon: Home },
      { name: "Canteen", href: "/canteen/dashboard", icon: Utensils },
    ],
  },
  {
    title: "Academics",
    items: [
      {
        name: "SIS",
        href: "/admin/sis",
        icon: GraduationCap,
        children: [
          { name: "Admissions", href: "/admin/sis/admissions", icon: ClipboardList },
          { name: "Student Profiles", href: "/admin/sis/student-profiles", icon: Users },
          { name: "Documentation", href: "/admin/sis/documentation", icon: FileText },
          { name: "Promotion", href: "/admin/sis/promotion", icon: Activity },
          { name: "Alumni", href: "/admin/sis/alumni", icon: GraduationCap },
        ],
      },
      {
        name: "Academics",
        href: "/admin/academics",
        icon: BookOpen,
        children: [
          { name: "Classes", href: "/admin/academics/classes", icon: Users },
          { name: "Subjects", href: "/admin/academics/subjects", icon: BookOpen },
          { name: "Timetable", href: "/admin/academics/timetable", icon: CalendarCheck },
          { name: "Curriculum", href: "/admin/academics/curriculum", icon: ClipboardList },
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
      { name: "Dashboard", href: "/finance/dashboard", icon: BarChart3 },
      { name: "Payments", href: "/finance/payments", icon: CreditCard },
      { name: "Invoices", href: "/finance/invoices", icon: FileText },
      { name: "Receipts", href: "/finance/receipts", icon: Receipt },
      { name: "Refunds", href: "/finance/refunds", icon: Wallet },
      { name: "Expenses", href: "/finance/expenses", icon: DollarSign },
      { name: "Scholarships", href: "/finance/scholarships", icon: GraduationCap },
      { name: "Reports", href: "/finance/reports", icon: BarChart3 },
      { name: "Settings", href: "/finance/settings", icon: Settings },
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
      { name: "Staff", href: "/hr/staff", icon: Users },
      { name: "Staff Attendance", href: "/hr/attendance", icon: CalendarCheck },
      { name: "Leave", href: "/hr/leave", icon: ClipboardList },
      { name: "Payroll", href: "/hr/payroll", icon: CreditCard },
      { name: "Documents", href: "/hr/documents", icon: FileText },
      { name: "Reports", href: "/hr/reports", icon: BarChart3 },
      { name: "Settings", href: "/hr/settings", icon: Settings },
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
          { name: "Permissions", href: "/admin/permissions", icon: Shield },
        ],
      },
      { name: "Audit & Logs", href: "/admin/audit", icon: Archive },
      { name: "Settings", href: "/admin/settings", icon: Settings },
    ],
  },
]

const teacherSections: NavSection[] = [
  {
    title: "School Operations",
    items: [
      {
        name: "Classes",
        href: "/teacher/classes",
        icon: Users,
        children: [
          { name: "My Classes", href: "/teacher/classes", icon: Users },
          { name: "Lesson Plans", href: "/teacher/lesson-plans", icon: ClipboardList },
          { name: "Learning Content", href: "/teacher/learning-content", icon: BookOpen },
          { name: "Class Insights", href: "/teacher/class-insights", icon: BarChart3 },
          { name: "My Schedule", href: "/teacher/schedule", icon: CalendarCheck },
        ],
      },
      {
        name: "Grading & Tasks",
        href: "/teacher/assignments",
        icon: ClipboardCheck,
        children: [
          { name: "Assignments", href: "/teacher/assignments", icon: ClipboardList },
          { name: "Grading Hub", href: "/teacher/grading-hub", icon: BarChart3 },
        ],
      },
      { name: "Messages", href: "/teacher/messages", icon: MessageSquare },
      { name: "My Profile", href: "/teacher/profile", icon: Users },
      {
        name: "Attendance",
        href: "/teacher/attendance",
        icon: CalendarCheck,
        children: [
          { name: "Mark Attendance", href: "/teacher/attendance/mark", icon: CalendarCheck },
          { name: "Daily Tracking", href: "/teacher/attendance/daily-tracking", icon: Activity },
          { name: "Biometric Hub", href: "/teacher/attendance/biometric-hub", icon: Shield },
          { name: "Alerts", href: "/teacher/attendance/alerts", icon: Bell },
        ],
      },
      {
        name: "Exams",
        href: "/teacher/exams",
        icon: ClipboardCheck,
        children: [
          { name: "Scheduling", href: "/teacher/exams/scheduling", icon: CalendarCheck },
          { name: "Assessments", href: "/teacher/exams/assessments", icon: ClipboardList },
          { name: "Results", href: "/teacher/exams/results", icon: BarChart3 },
          { name: "Report Cards", href: "/teacher/exams/report-cards", icon: FileText },
          { name: "Exam Analytics", href: "/teacher/exams/analytics", icon: BarChart3 },
        ],
      },
    ],
  },
]

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
  { title: "Communication", items: [{ name: "Messages", href: "/messages", icon: MessageSquare }] },
]

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
  { title: "Communication", items: [{ name: "Messages", href: "/messages", icon: MessageSquare }] },
]

const admissionsSections: NavSection[] = [
  {
    title: "Admissions",
    items: [
      { name: "Dashboard", href: "/admin/dashboard", icon: Home },
      { name: "Applications", href: "/admin/sis/admissions", icon: ClipboardList },
      { name: "Student Profiles", href: "/admin/sis/student-profiles", icon: Users },
      { name: "Documentation", href: "/admin/sis/documentation", icon: FileText },
      { name: "Promotion", href: "/admin/sis/promotion", icon: Activity },
    ],
  },
  { title: "Communication", items: [{ name: "Messages", href: "/messages", icon: MessageSquare }] },
]

const registrarSections: NavSection[] = [
  {
    title: "Registry",
    items: [
      { name: "Dashboard", href: "/admin/dashboard", icon: Home },
      { name: "Student Profiles", href: "/admin/sis/student-profiles", icon: Users },
      { name: "Documentation", href: "/admin/sis/documentation", icon: FileText },
      { name: "Promotion", href: "/admin/sis/promotion", icon: Activity },
      { name: "Alumni", href: "/admin/sis/alumni", icon: GraduationCap },
    ],
  },
  { title: "Communication", items: [{ name: "Messages", href: "/messages", icon: MessageSquare }] },
]

const examOfficerSections: NavSection[] = [
  {
    title: "Examinations",
    items: [
      { name: "Dashboard", href: "/admin/dashboard", icon: Home },
      { name: "Exams", href: "/admin/exams", icon: ClipboardCheck },
      { name: "Assessments", href: "/teacher/exams/assessments", icon: ClipboardList },
      { name: "Results", href: "/teacher/exams/results", icon: BarChart3 },
      { name: "Report Cards", href: "/teacher/exams/report-cards", icon: FileText },
      { name: "Exam Analytics", href: "/teacher/exams/analytics", icon: BarChart3 },
    ],
  },
  { title: "Communication", items: [{ name: "Messages", href: "/messages", icon: MessageSquare }] },
]

const healthSections: NavSection[] = [
  {
    title: "Health",
    items: [
      { name: "Health Dashboard", href: "/health/dashboard", icon: Home },
      { name: "Sick Bay Visits", href: "/health/visits", icon: HeartPulse },
      { name: "Student Health Records", href: "/health/records", icon: FileText },
      { name: "Medication Logs", href: "/health/medication", icon: ClipboardList },
      { name: "Incidents", href: "/health/incidents", icon: Shield },
      { name: "Reports", href: "/health/reports", icon: BarChart3 },
    ],
  },
  { title: "Communication", items: [{ name: "Messages", href: "/messages", icon: MessageSquare }] },
]

const transportSections: NavSection[] = [
  {
    title: "Transport",
    items: [
      { name: "Transport Dashboard", href: "/transport/dashboard", icon: Home },
      { name: "Routes", href: "/transport/routes", icon: Bus },
      { name: "Vehicles", href: "/transport/vehicles", icon: Archive },
      { name: "Drivers", href: "/transport/drivers", icon: Users },
      { name: "Pickup Tracking", href: "/transport/tracking", icon: Activity },
      { name: "Incidents", href: "/transport/incidents", icon: Shield },
      { name: "Reports", href: "/transport/reports", icon: BarChart3 },
    ],
  },
  { title: "Communication", items: [{ name: "Messages", href: "/messages", icon: MessageSquare }] },
]

const hostelSections: NavSection[] = [
  {
    title: "Hostel",
    items: [
      { name: "Hostel Dashboard", href: "/hostel/dashboard", icon: Home },
      { name: "Rooms", href: "/hostel/rooms", icon: Archive },
      { name: "Boarders", href: "/hostel/boarders", icon: Users },
      { name: "Attendance", href: "/hostel/attendance", icon: CalendarCheck },
      { name: "Incidents", href: "/hostel/incidents", icon: Shield },
      { name: "Welfare Notes", href: "/hostel/welfare", icon: HandHeart },
      { name: "Reports", href: "/hostel/reports", icon: BarChart3 },
    ],
  },
  { title: "Communication", items: [{ name: "Messages", href: "/messages", icon: MessageSquare }] },
]

const securitySections: NavSection[] = [
  {
    title: "Security",
    items: [
      { name: "Security Dashboard", href: "/security/dashboard", icon: Home },
      { name: "Visitor Logs", href: "/security/visitors", icon: Users },
      { name: "Gate Passes", href: "/security/gate-passes", icon: Shield },
      { name: "Incidents", href: "/security/incidents", icon: ClipboardList },
      { name: "Emergency Logs", href: "/security/emergency", icon: Bell },
      { name: "Reports", href: "/security/reports", icon: BarChart3 },
    ],
  },
  { title: "Communication", items: [{ name: "Messages", href: "/messages", icon: MessageSquare }] },
]

const procurementSections: NavSection[] = [
  {
    title: "Procurement",
    items: [
      { name: "Procurement Dashboard", href: "/procurement/dashboard", icon: Home },
      { name: "Purchase Requests", href: "/procurement/requests", icon: ClipboardList },
      { name: "Suppliers", href: "/procurement/suppliers", icon: Users },
      { name: "Purchase Orders", href: "/procurement/orders", icon: ShoppingCart },
      { name: "Approvals", href: "/procurement/approvals", icon: Shield },
      { name: "Reports", href: "/procurement/reports", icon: BarChart3 },
    ],
  },
  { title: "Communication", items: [{ name: "Messages", href: "/messages", icon: MessageSquare }] },
]

const inventorySections: NavSection[] = [
  {
    title: "Inventory",
    items: [
      { name: "Inventory Dashboard", href: "/inventory/dashboard", icon: Home },
      { name: "Stock", href: "/inventory/stock", icon: PackageSearch },
      { name: "Assets", href: "/inventory/assets", icon: Archive },
      { name: "Movements", href: "/inventory/movements", icon: Activity },
      { name: "Requests", href: "/inventory/requests", icon: ClipboardList },
      { name: "Reports", href: "/inventory/reports", icon: BarChart3 },
    ],
  },
  { title: "Communication", items: [{ name: "Messages", href: "/messages", icon: MessageSquare }] },
]

const wellbeingSections: NavSection[] = [
  {
    title: "Wellbeing",
    items: [
      { name: "Wellbeing Dashboard", href: "/wellbeing/dashboard", icon: Home },
      { name: "Counseling Cases", href: "/wellbeing/cases", icon: HandHeart },
      { name: "Behavior Support", href: "/wellbeing/behavior", icon: ClipboardList },
      { name: "Safeguarding", href: "/wellbeing/safeguarding", icon: Shield },
      { name: "Referrals", href: "/wellbeing/referrals", icon: Users },
      { name: "Reports", href: "/wellbeing/reports", icon: BarChart3 },
    ],
  },
  { title: "Communication", items: [{ name: "Messages", href: "/messages", icon: MessageSquare }] },
]

const alumniSections: NavSection[] = [
  {
    title: "Alumni",
    items: [
      { name: "Alumni Dashboard", href: "/alumni/dashboard", icon: Home },
      { name: "Alumni Records", href: "/alumni/records", icon: GraduationCap },
      { name: "Events", href: "/alumni/events", icon: CalendarCheck },
      { name: "Campaigns", href: "/alumni/campaigns", icon: Megaphone },
      { name: "Engagement", href: "/alumni/engagement", icon: Activity },
      { name: "Reports", href: "/alumni/reports", icon: BarChart3 },
    ],
  },
  { title: "Communication", items: [{ name: "Messages", href: "/messages", icon: MessageSquare }] },
]

const roleConfig: Record<TenantRole, RoleConfig> = {
  admin: {
    label: "School Admin",
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
    home: "/admin/dashboard",
    icon: Shield,
    sections: adminSections,
  },
  finance: {
    label: "Finance Portal",
    home: "/finance/dashboard",
    icon: Wallet,
    sections: [
      {
        title: "Finance",
        items: [
          { name: "Dashboard", href: "/finance/dashboard", icon: Home },
          { name: "Finance", href: "/finance", icon: Wallet },
        ],
      },
      {
        title: "Communication",
        items: [{ name: "Messages & Broadcasts", href: "/finance/messages", icon: MessageSquare }],
      },
    ],
  },
  hr: {
    label: "HR Portal",
    home: "/hr/dashboard",
    icon: Briefcase,
    sections: [
      {
        title: "HR",
        items: [
          { name: "HR Dashboard", href: "/hr/dashboard", icon: Home },
          { name: "Staff", href: "/hr/staff", icon: Users },
          { name: "Staff Attendance", href: "/hr/attendance", icon: CalendarCheck },
          { name: "Leave", href: "/hr/leave", icon: ClipboardList },
          { name: "Payroll", href: "/hr/payroll", icon: CreditCard },
          { name: "Documents", href: "/hr/documents", icon: FileText },
          { name: "Reports", href: "/hr/reports", icon: BarChart3 },
          { name: "Settings", href: "/hr/settings", icon: Settings },
        ],
      },
    ],
  },
  parent: {
    label: "Parent Portal",
    home: "/parent/dashboard",
    icon: Users,
    sections: [
      {
        title: "Parent Portal",
        items: [
          { name: "Parent Dashboard", href: "/parent/dashboard", icon: Home },
          { name: "Children", href: "/parent/children", icon: Users },
          { name: "Attendance", href: "/parent/attendance", icon: CalendarCheck },
          { name: "Fees", href: "/parent/fees", icon: CreditCard },
          { name: "Communication", href: "/parent/communication", icon: MessageSquare },
          { name: "My Profile", href: "/parent/profile", icon: Users },
          { name: "Settings", href: "/parent/settings", icon: Settings },
        ],
      },
    ],
  },
  student: {
    label: "Student Portal",
    home: "/student/dashboard",
    icon: GraduationCap,
    sections: [
      {
        title: "Dashboard",
        items: [{ name: "My Dashboard", href: "/student/dashboard", icon: Home }],
      },
      {
        title: "Academics",
        items: [
          {
            name: "Academics",
            href: "/student/academics",
            icon: BookOpen,
            children: [
              { name: "Subjects", href: "/student/subjects", icon: BookOpen },
              { name: "Exams & Results", href: "/student/exams-results", icon: BarChart3 },
              { name: "Assessments", href: "/student/assessments", icon: ClipboardList },
            ],
          },
          { name: "Assignments", href: "/student/assignments", icon: ClipboardList },
          { name: "Performance Insights", href: "/student/performance-insights", icon: BarChart3 },
          { name: "Learning Resources", href: "/student/learning-resources", icon: Library },
        ],
      },
      {
        title: "Schedule & Attendance",
        items: [
          { name: "My Schedule", href: "/student/schedule", icon: CalendarCheck },
          { name: "Attendance", href: "/student/attendance", icon: ClipboardCheck },
        ],
      },
      {
        title: "Finance & Communication",
        items: [
          { name: "Finance", href: "/student/finance", icon: Wallet },
          { name: "My Refunds", href: "/student/refunds", icon: Receipt },
          { name: "Communication/Messages", href: "/student/messages", icon: MessageSquare },
        ],
      },
      {
        title: "Account",
        items: [
          { name: "My Profile", href: "/student/profile", icon: Users },
          { name: "Settings", href: "/student/settings", icon: Settings },
        ],
      },
    ],
  },
  teacher: {
    label: "Teacher Portal",
    home: "/teacher/dashboard",
    icon: Users,
    sections: teacherSections,
  },
  librarian: {
    label: "Library Portal",
    home: "/librarian/dashboard",
    icon: BookMarked,
    sections: librarianSections,
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
    home: "/teacher/dashboard",
    icon: Briefcase,
    sections: teacherSections,
  },
  class_teacher: {
    label: "Class Teacher Portal",
    home: "/teacher/dashboard",
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
}

function getTenantContext(pathname: string, tenantParam?: string | null, userRole?: string | null) {
  const pathParts = pathname.split("/").filter(Boolean)
  const tenantSlug = tenantParam || pathParts[0] || ""
  const routeParts = pathParts[0] === tenantSlug ? pathParts.slice(1) : pathParts
  const roleSegment = routeParts[0] || ""
  const routeRoleAliases: Record<string, TenantRole> = {
    admin: "school_admin",
    health: "nurse",
    transport: "transport_manager",
    hostel: "hostel_warden",
    security: "security",
    procurement: "procurement",
    inventory: "inventory_manager",
    wellbeing: "counselor",
    alumni: "alumni_officer",
  }
  const universalSegments = new Set(["messages", "notifications", "profile", "settings", "complete-access"])
  const normalized = universalSegments.has(roleSegment)
    ? normalizeRole(userRole)
    : routeRoleAliases[roleSegment] || normalizeRole(roleSegment)
  const role = (String(normalized) === "super_admin" ? "admin" : normalized) as TenantRole
  return {
    tenantSlug,
    role: role in roleConfig ? role : "student",
  }
}

function initials(name?: string) {
  return (name || "User")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

function fallbackTenantName(slug: string) {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ") || "School"
}

export default function TenantSidebar({
  collapsed = false,
  onToggleCollapsed,
}: {
  collapsed?: boolean
  onToggleCollapsed?: () => void
}) {
  const pathname = usePathname() || ""
  const params = useParams<{ tenant?: string }>()
  const { data: session } = authClient.useSession()
  const user = session?.user
  const [profileOverride, setProfileOverride] = React.useState<UserProfileUpdateDetail>({})
  const { tenantSlug, role } = getTenantContext(pathname, params?.tenant, (user as { role?: string } | undefined)?.role)
  const config = roleConfig[role]
  const Icon = config.icon
  const [isTenantSubdomain, setIsTenantSubdomain] = React.useState(false)
  const [branding, setBranding] = React.useState<TenantBranding>(() => ({
    name: fallbackTenantName(tenantSlug),
    defaultName: fallbackTenantName(tenantSlug),
    logoUrl: null,
    isDefault: true,
  }))
  const [platformSettings, setPlatformSettings] = React.useState<PublicPlatformSettings>(() => ({
    platformName: "Roxan Education System",
  }))

  const getTenantPath = (href: string) => (isTenantSubdomain ? href : `/${tenantSlug}${href}`)

  const userDisplayName = profileOverride.name || user?.name || config.label
  const userImage =
    profileOverride.image !== undefined
      ? profileOverride.image || undefined
      : user?.image
        ? `/api/profile/avatar?v=${profileOverride.avatarVersion || "session"}`
        : undefined
  const userEmail = user?.email || `${role}@roxan.app`

  React.useEffect(() => {
    setIsTenantSubdomain(Boolean(getTenantSubdomain(window.location.hostname)))
  }, [])

  React.useEffect(() => {
    if (!tenantSlug) return

    const storageKey = `roxan:tenant-branding:${tenantSlug}`

    const applyBranding = (next: Partial<TenantBranding>) => {
      setBranding((current) => {
        const defaultName = next.defaultName || current.defaultName || fallbackTenantName(tenantSlug)
        const name = next.name || defaultName
        const logoUrl = Object.prototype.hasOwnProperty.call(next, "logoUrl") ? next.logoUrl || null : current.logoUrl
        const merged = {
          ...current,
          ...next,
          name,
          defaultName,
          logoUrl,
          isDefault: Boolean(next.isDefault ?? (!logoUrl && name === defaultName)),
        }
        const serialized = JSON.stringify(merged)
        sessionStorage.setItem(storageKey, serialized)
        localStorage.setItem(storageKey, serialized)
        return merged
      })
    }

    const cached = sessionStorage.getItem(storageKey) || localStorage.getItem(storageKey)
    if (cached) {
      try {
        applyBranding(JSON.parse(cached))
      } catch {
        sessionStorage.removeItem(storageKey)
      }
    }

    const loadBranding = async () => {
      const response = await fetch(`/api/tenant/branding?slug=${encodeURIComponent(tenantSlug)}`, {
        cache: "no-store",
      }).catch(() => null)
      if (!response?.ok) return
      const data = await response.json()
      applyBranding({
        name: data.name,
        defaultName: data.defaultName,
        logoUrl: data.logoUrl || null,
        isDefault: Boolean(data.isDefault),
      })
    }

    const handleBrandingEvent = (event: Event) => {
      const detail = (event as CustomEvent<Partial<TenantBranding> & { slug?: string }>).detail
      if (detail?.slug && detail.slug !== tenantSlug) return
      applyBranding(detail || {})
    }

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== storageKey || !event.newValue) return
      try {
        applyBranding(JSON.parse(event.newValue))
      } catch {}
    }

    window.addEventListener(TENANT_BRANDING_EVENT, handleBrandingEvent as EventListener)
    window.addEventListener("storage", handleStorage)
    void loadBranding()

    return () => {
      window.removeEventListener(TENANT_BRANDING_EVENT, handleBrandingEvent as EventListener)
      window.removeEventListener("storage", handleStorage)
    }
  }, [tenantSlug])

  React.useEffect(() => {
    const applySettings = (settings: PublicPlatformSettings | null) => {
      if (!settings) return
      setPlatformSettings((current) => ({ ...current, ...settings }))
    }

    applySettings(readCachedPlatformSettings())

    const loadSettings = async () => {
      const response = await fetch("/api/master/settings?scope=public", { cache: "no-store" }).catch(() => null)
      if (!response?.ok) return
      const settings = (await response.json()) as PublicPlatformSettings
      window.localStorage.setItem(PLATFORM_SETTINGS_STORAGE_KEY, JSON.stringify(settings))
      applySettings(settings)
    }

    const handleEvent = (event: Event) => {
      applySettings((event as CustomEvent<PublicPlatformSettings>).detail || null)
    }

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== PLATFORM_SETTINGS_STORAGE_KEY || !event.newValue) return
      try {
        applySettings(JSON.parse(event.newValue) as PublicPlatformSettings)
      } catch {}
    }

    const channel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel(PLATFORM_SETTINGS_CHANNEL) : null
    const handleChannel = (event: MessageEvent<PublicPlatformSettings>) => applySettings(event.data)

    window.addEventListener(PLATFORM_SETTINGS_SYNC_EVENT, handleEvent as EventListener)
    window.addEventListener("storage", handleStorage)
    channel?.addEventListener("message", handleChannel)
    void loadSettings()

    return () => {
      window.removeEventListener(PLATFORM_SETTINGS_SYNC_EVENT, handleEvent as EventListener)
      window.removeEventListener("storage", handleStorage)
      channel?.removeEventListener("message", handleChannel)
      channel?.close()
    }
  }, [])

  React.useEffect(() => {
    const cached = readCachedUserProfile()
    if (cached) setProfileOverride((current) => ({ ...current, ...cached }))

    const handleProfileUpdate = (event: Event) => {
      const detail = (event as CustomEvent<UserProfileUpdateDetail>).detail || {}
      setProfileOverride((current) => ({ ...current, ...detail }))
    }
    const handleProfileStorage = (event: StorageEvent) => {
      if (event.key !== USER_PROFILE_CACHE_KEY || !event.newValue) return
      const raw = event.newValue
      try {
        setProfileOverride((current) => ({ ...current, ...JSON.parse(raw) }))
      } catch {}
    }
    window.addEventListener(USER_PROFILE_UPDATED_EVENT, handleProfileUpdate as EventListener)
    window.addEventListener("storage", handleProfileStorage)
    return () => {
      window.removeEventListener(USER_PROFILE_UPDATED_EVENT, handleProfileUpdate as EventListener)
      window.removeEventListener("storage", handleProfileStorage)
    }
  }, [])

  return (
    <div
      className={cn(
        "min-h-screen bg-sidebar border-r border-sidebar-border flex flex-col print:hidden transition-[width] duration-200",
        collapsed ? "w-20" : "w-64"
      )}
    >
      <div className={cn("h-16 border-b border-sidebar-border px-4 flex items-center", collapsed && "justify-center px-2")}>
        <Link href={getTenantPath(config.home)} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          {branding.logoUrl ? (
            <img
              src={branding.logoUrl}
              alt={`${branding.name} logo`}
              className="h-8 w-8 rounded-lg border border-sidebar-border object-cover"
            />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Icon className="h-5 w-5 text-primary" />
            </div>
          )}
          {!collapsed && (
            <span className="min-w-0">
              <span className="block truncate text-base font-semibold uppercase leading-tight tracking-wide text-sidebar-foreground">
                {branding.name}
              </span>
              <span className="block truncate text-[11px] font-medium uppercase tracking-wide text-sidebar-foreground/55">
                {platformSettings.platformName || "Roxan Education System"}
              </span>
            </span>
          )}
        </Link>
      </div>

      <nav className={cn("flex-1 space-y-6 py-4 overflow-y-auto", collapsed ? "px-2" : "px-3")}>
        {config.sections.map((section) => (
          <div key={section.title}>
            {!collapsed && (
              <h3 className="mb-2 px-3 text-[10px] font-medium uppercase tracking-[0.18em] text-sidebar-foreground/35">
                {section.title}
              </h3>
            )}
            <ul className="space-y-1">
              {section.items.map((item) => {
                const href = getTenantPath(item.href)
                const childActive = item.children?.some((child) => {
                  const childHref = getTenantPath(child.href)
                  return pathname === childHref || pathname.startsWith(`${childHref}/`)
                })
                const isActive = pathname === href || pathname.startsWith(`${href}/`) || childActive
                const ItemIcon = item.icon

                return (
                  <li key={item.href}>
                    <Link
                      href={href}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 h-10 rounded-lg text-sm font-medium transition-all duration-200",
                        collapsed && "justify-center px-0",
                        isActive
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                      )}
                      title={collapsed ? item.name : undefined}
                    >
                      <ItemIcon className="h-4 w-4 flex-shrink-0" />
                      {!collapsed && <span className="flex-1">{item.name}</span>}
                      {!collapsed && isActive && <div className="w-1 h-6 bg-primary rounded-r ml-auto" />}
                    </Link>
                    {!collapsed && item.children?.length ? (
                      <div className="ml-5 mt-1 space-y-1 border-l border-sidebar-border pl-2">
                        {item.children.map((child) => {
                          const childHref = getTenantPath(child.href)
                          const childIsActive = pathname === childHref || pathname.startsWith(`${childHref}/`)
                          const ChildIcon = child.icon
                          return (
                            <Link
                              key={child.href}
                              href={childHref}
                              className={cn(
                                "flex h-9 items-center gap-2 rounded-lg px-3 text-xs font-medium transition-colors",
                                childIsActive
                                  ? "bg-primary text-primary-foreground shadow-sm"
                                  : "text-sidebar-foreground/75 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                              )}
                            >
                              <ChildIcon className="h-3.5 w-3.5 flex-shrink-0" />
                              <span className="flex-1">{child.name}</span>
                            </Link>
                          )
                        })}
                      </div>
                    ) : null}
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="mt-auto border-t border-sidebar-border p-2">
        <button
          type="button"
          onClick={onToggleCollapsed}
          className={cn(
            "mb-2 flex h-10 w-full items-center gap-2 rounded-lg px-3 text-sm font-medium hover:bg-sidebar-accent/50",
            collapsed && "justify-center px-0"
          )}
        >
          <Activity className="h-4 w-4" />
          {!collapsed && "Collapse"}
        </button>
        <div className={cn("flex items-center gap-3 rounded-lg p-2", collapsed && "justify-center px-0")}>
          <Avatar className="h-8 w-8 flex-shrink-0">
            <AvatarImage src={userImage || undefined} alt={userDisplayName} />
            <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
              {initials(userDisplayName)}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex-1 min-w-0 text-left">
              <p className="text-sm font-medium text-sidebar-foreground truncate">{userDisplayName}</p>
              <p className="text-xs text-sidebar-foreground/60 truncate">{userEmail}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
