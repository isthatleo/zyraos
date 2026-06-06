import {
  BookMarked,
  Briefcase,
  Bus,
  Calculator,
  ClipboardList,
  GraduationCap,
  HandHeart,
  HeartPulse,
  Home,
  PackageSearch,
  Shield,
  ShieldCheck,
  UserCheck,
  Users,
  Utensils,
} from "lucide-react";
import type { ComponentType } from "react";

export const CANONICAL_ROLES = [
  "super_admin",
  "owner",
  "school_admin",
  "teacher",
  "student",
  "parent",
  "finance",
  "librarian",
  "hr",
  "canteen",
  "nurse",
  "transport_manager",
  "hostel_warden",
  "security",
  "receptionist",
  "inventory_manager",
  "counselor",
] as const;

export type CanonicalRole = (typeof CANONICAL_ROLES)[number];
export type EducationLevel = "primary" | "secondary" | "college" | "university" | "vocational";

export type TenantRoleDefinition = {
  id: string;
  canonicalRole: CanonicalRole;
  name: string;
  description: string;
  portal: "admins" | "staff" | "student-parent" | "canteen";
  dashboardPath: string;
  isSystem: boolean;
};

export function normalizeEducationLevel(type?: string | null): EducationLevel {
  const value = String(type || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (["primary", "primary_school", "elementary"].includes(value)) return "primary";
  if (["secondary", "secondary_school", "high_school"].includes(value)) return "secondary";
  if (["college", "tertiary_college"].includes(value)) return "college";
  if (["university"].includes(value)) return "university";
  if (["vocational", "technical", "technical_college", "vocational_technical", "vocational_college"].includes(value)) return "vocational";
  return "secondary";
}

export function normalizeRole(role?: string | null): CanonicalRole {
  const value = String(role || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (value.endsWith("_owner")) return "owner";
  if (value.endsWith("_school_admin") || value.endsWith("_admin") || value.endsWith("_principal") || value.endsWith("_headteacher") || value.endsWith("_head_teacher") || value.endsWith("_rector") || value.endsWith("_dean")) return "school_admin";
  if (value.endsWith("_teacher") || value.endsWith("_lecturer") || value.endsWith("_professor") || value.endsWith("_instructor") || value.endsWith("_trainer") || value.endsWith("_tutor")) return "teacher";
  if (value.endsWith("_student") || value.endsWith("_pupil") || value.endsWith("_learner") || value.endsWith("_trainee")) return "student";
  if (value.endsWith("_parent") || value.endsWith("_guardian")) return "parent";
  if (value.endsWith("_finance") || value.endsWith("_accountant") || value.endsWith("_account") || value.endsWith("_bursar")) return "finance";
  if (value.endsWith("_librarian")) return "librarian";
  if (value.endsWith("_hr")) return "hr";
  if (value.endsWith("_canteen")) return "canteen";
  if (value.endsWith("_nurse") || value.endsWith("_health_officer")) return "nurse";
  if (value.endsWith("_transport_manager")) return "transport_manager";
  if (value.endsWith("_hostel_warden") || value.endsWith("_boarding_warden")) return "hostel_warden";
  if (value.endsWith("_security") || value.endsWith("_gate_officer")) return "security";
  if (value.endsWith("_receptionist") || value.endsWith("_front_desk") || value.endsWith("_front_desk_officer")) return "receptionist";
  if (value.endsWith("_inventory_manager") || value.endsWith("_stores_manager")) return "inventory_manager";
  if (value.endsWith("_counselor") || value.endsWith("_welfare_officer")) return "counselor";
  if (["master", "platform_admin", "superadmin"].includes(value)) return "super_admin";
  if (["admin", "principal", "headteacher", "head_teacher"].includes(value)) return "school_admin";
  if (["lecturer", "professor", "staff", "instructor", "trainer", "tutor"].includes(value)) return "teacher";
  if (["pupil", "learner", "trainee"].includes(value)) return "student";
  if (["guardian"].includes(value)) return "parent";
  if (["accountant", "accounting", "account", "accounts", "bursar"].includes(value)) return "finance";
  if (["library"].includes(value)) return "librarian";
  if (["cafeteria", "kitchen"].includes(value)) return "canteen";
  if (["nurse", "school_nurse", "health_officer"].includes(value)) return "nurse";
  if (["transport", "transport_manager"].includes(value)) return "transport_manager";
  if (["hostel", "hostel_warden", "boarding_warden"].includes(value)) return "hostel_warden";
  if (["security", "gate_officer"].includes(value)) return "security";
  if (["receptionist", "front_desk", "front_desk_officer", "front_office"].includes(value)) return "receptionist";
  if (["inventory", "inventory_manager", "stores_manager"].includes(value)) return "inventory_manager";
  if (["counselor", "counsellor", "welfare_officer", "wellbeing"].includes(value)) return "counselor";
  if ((CANONICAL_ROLES as readonly string[]).includes(value)) return value as CanonicalRole;
  return "student";
}

export const rolePortalGroups = {
  admins: ["owner", "school_admin"],
  staff: [
    "teacher",
    "hr",
    "finance",
    "librarian",
    "canteen",
    "nurse",
    "transport_manager",
    "hostel_warden",
    "security",
    "receptionist",
    "inventory_manager",
    "counselor",
  ],
  studentParent: ["student", "parent"],
} satisfies Record<string, CanonicalRole[]>;

export const roleLabels: Record<CanonicalRole, string> = {
  super_admin: "Super Admin",
  owner: "School Owner",
  school_admin: "School Admin",
  teacher: "Teacher / Lecturer",
  student: "Student",
  parent: "Parent / Guardian",
  finance: "Finance",
  librarian: "Librarian",
  hr: "HR",
  canteen: "Canteen",
  nurse: "School Nurse / Health Officer",
  transport_manager: "Transport Manager",
  hostel_warden: "Hostel / Boarding Warden",
  security: "Security / Gate Officer",
  receptionist: "Receptionist",
  inventory_manager: "Inventory / Stores Manager",
  counselor: "Counselor / Welfare Officer",
};

const universalTenantRoles: TenantRoleDefinition[] = [
  {
    id: "owner",
    canonicalRole: "owner",
    name: "School Owner",
    description: "School ownership, governance, billing, and subscription control",
    portal: "admins",
    dashboardPath: "/owner/dashboard",
    isSystem: true,
  },
  {
    id: "finance",
    canonicalRole: "finance",
    name: "Finance",
    description: "Fees, payments, invoices, receipts, expenses, refunds, and reports",
    portal: "staff",
    dashboardPath: "/finance/dashboard",
    isSystem: true,
  },
  {
    id: "librarian",
    canonicalRole: "librarian",
    name: "Librarian",
    description: "Library catalogue, borrowing, returns, members, and reports",
    portal: "staff",
    dashboardPath: "/librarian/dashboard",
    isSystem: true,
  },
  {
    id: "hr",
    canonicalRole: "hr",
    name: "HR",
    description: "Staff records, attendance, leave, payroll, and documents",
    portal: "staff",
    dashboardPath: "/hr/dashboard",
    isSystem: true,
  },
  {
    id: "canteen",
    canonicalRole: "canteen",
    name: "Canteen",
    description: "Meals, menus, orders, inventory, payments, and reports",
    portal: "canteen",
    dashboardPath: "/canteen/dashboard",
    isSystem: true,
  },
  {
    id: "nurse",
    canonicalRole: "nurse",
    name: "School Nurse / Health Officer",
    description: "Student health records, sick bay visits, medication logs, and health incident reporting",
    portal: "staff",
    dashboardPath: "/health/dashboard",
    isSystem: true,
  },
  {
    id: "transport_manager",
    canonicalRole: "transport_manager",
    name: "Transport Manager",
    description: "Routes, buses, drivers, pickups, drop-offs, incidents, and transport reporting",
    portal: "staff",
    dashboardPath: "/transport/dashboard",
    isSystem: true,
  },
  {
    id: "hostel_warden",
    canonicalRole: "hostel_warden",
    name: "Hostel / Boarding Warden",
    description: "Boarding allocations, room checks, hostel attendance, incidents, and welfare follow-up",
    portal: "staff",
    dashboardPath: "/hostel/dashboard",
    isSystem: true,
  },
  {
    id: "security",
    canonicalRole: "security",
    name: "Security / Gate Officer",
    description: "Visitor logs, gate passes, emergency records, access control, and incident reporting",
    portal: "staff",
    dashboardPath: "/security/dashboard",
    isSystem: true,
  },
  {
    id: "receptionist",
    canonicalRole: "receptionist",
    name: "Receptionist",
    description: "Front desk, visitor reception, call handling, appointments, enquiries, and access handoff",
    portal: "staff",
    dashboardPath: "/reception/dashboard",
    isSystem: true,
  },
  {
    id: "inventory_manager",
    canonicalRole: "inventory_manager",
    name: "Inventory / Stores Manager",
    description: "Stores, stock movement, school assets, inventory alerts, and asset accountability",
    portal: "staff",
    dashboardPath: "/inventory/dashboard",
    isSystem: true,
  },
  {
    id: "counselor",
    canonicalRole: "counselor",
    name: "Counselor / Welfare Officer",
    description: "Student wellbeing, counseling cases, behavior support, safeguarding notes, and referrals",
    portal: "staff",
    dashboardPath: "/wellbeing/dashboard",
    isSystem: true,
  },
];

export const STAFF_CREATION_ROLE_ORDER: CanonicalRole[] = [
  "school_admin",
  "hr",
  "finance",
  "teacher",
  "librarian",
  "canteen",
  "nurse",
  "transport_manager",
  "hostel_warden",
  "security",
  "receptionist",
  "inventory_manager",
  "counselor",
];

const levelSpecificRoles: Record<EducationLevel, TenantRoleDefinition[]> = {
  primary: [
    { id: "primary_school_admin", canonicalRole: "school_admin", name: "Headteacher / Primary School Admin", description: "Primary school administration and operations", portal: "admins", dashboardPath: "/admin/dashboard", isSystem: true },
    { id: "primary_teacher", canonicalRole: "teacher", name: "Primary Teacher", description: "Primary class teaching, attendance, grading, and learning content", portal: "staff", dashboardPath: "/teacher/dashboard", isSystem: true },
    { id: "primary_pupil", canonicalRole: "student", name: "Pupil", description: "Primary learner portal", portal: "student-parent", dashboardPath: "/student/dashboard", isSystem: true },
    { id: "primary_parent", canonicalRole: "parent", name: "Parent / Guardian", description: "Primary pupil parent and guardian portal", portal: "student-parent", dashboardPath: "/parent/dashboard", isSystem: true },
  ],
  secondary: [
    { id: "secondary_school_admin", canonicalRole: "school_admin", name: "Principal / Secondary School Admin", description: "Secondary school administration and operations", portal: "admins", dashboardPath: "/admin/dashboard", isSystem: true },
    { id: "secondary_teacher", canonicalRole: "teacher", name: "Secondary Teacher", description: "Subject teaching, exams, grading, and class operations", portal: "staff", dashboardPath: "/teacher/dashboard", isSystem: true },
    { id: "secondary_student", canonicalRole: "student", name: "Student", description: "Secondary student portal", portal: "student-parent", dashboardPath: "/student/dashboard", isSystem: true },
    { id: "secondary_parent", canonicalRole: "parent", name: "Parent / Guardian", description: "Secondary student parent and guardian portal", portal: "student-parent", dashboardPath: "/parent/dashboard", isSystem: true },
  ],
  college: [
    { id: "college_admin", canonicalRole: "school_admin", name: "College Administrator", description: "College administration and operations", portal: "admins", dashboardPath: "/admin/dashboard", isSystem: true },
    { id: "college_lecturer", canonicalRole: "teacher", name: "Lecturer", description: "College teaching, assessment, grading, and learning resources", portal: "staff", dashboardPath: "/teacher/dashboard", isSystem: true },
    { id: "college_student", canonicalRole: "student", name: "College Student", description: "College student portal", portal: "student-parent", dashboardPath: "/student/dashboard", isSystem: true },
    { id: "college_parent", canonicalRole: "parent", name: "Sponsor / Guardian", description: "College student sponsor or guardian portal", portal: "student-parent", dashboardPath: "/parent/dashboard", isSystem: true },
  ],
  university: [
    { id: "university_admin", canonicalRole: "school_admin", name: "University Administrator", description: "University administration and operations", portal: "admins", dashboardPath: "/admin/dashboard", isSystem: true },
    { id: "university_professor", canonicalRole: "teacher", name: "Professor / Lecturer", description: "University teaching, assessment, results, and academic content", portal: "staff", dashboardPath: "/teacher/dashboard", isSystem: true },
    { id: "university_student", canonicalRole: "student", name: "University Student", description: "University student portal", portal: "student-parent", dashboardPath: "/student/dashboard", isSystem: true },
    { id: "university_guardian", canonicalRole: "parent", name: "Sponsor / Guardian", description: "University sponsor or guardian portal", portal: "student-parent", dashboardPath: "/parent/dashboard", isSystem: true },
  ],
  vocational: [
    { id: "vocational_admin", canonicalRole: "school_admin", name: "Technical College Administrator", description: "Vocational or technical college administration", portal: "admins", dashboardPath: "/admin/dashboard", isSystem: true },
    { id: "vocational_instructor", canonicalRole: "teacher", name: "Instructor / Trainer", description: "Practical training, modules, assessments, and skills tracking", portal: "staff", dashboardPath: "/teacher/dashboard", isSystem: true },
    { id: "vocational_trainee", canonicalRole: "student", name: "Trainee / Learner", description: "Vocational learner portal", portal: "student-parent", dashboardPath: "/student/dashboard", isSystem: true },
    { id: "vocational_guardian", canonicalRole: "parent", name: "Sponsor / Guardian", description: "Trainee sponsor or guardian portal", portal: "student-parent", dashboardPath: "/parent/dashboard", isSystem: true },
  ],
};

export function getTenantRoleDefinitions(type?: string | null): TenantRoleDefinition[] {
  const level = normalizeEducationLevel(type);
  return [...universalTenantRoles, ...levelSpecificRoles[level]];
}

export function getStaffCreationRoleDefinitions(type?: string | null): TenantRoleDefinition[] {
  const roles = getTenantRoleDefinitions(type).filter(
    (role) => !["owner", "student", "parent"].includes(role.canonicalRole)
  );
  return roles.sort((a, b) => {
    const aIndex = STAFF_CREATION_ROLE_ORDER.indexOf(a.canonicalRole);
    const bIndex = STAFF_CREATION_ROLE_ORDER.indexOf(b.canonicalRole);
    return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex) || a.name.localeCompare(b.name);
  });
}

export function getTenantRoleDefinitionById(roleId: string, type?: string | null) {
  const normalizedRole = normalizeRole(roleId);
  return (
    getTenantRoleDefinitions(type).find((role) => role.id === roleId || role.canonicalRole === normalizedRole) ||
    universalTenantRoles.find((role) => role.canonicalRole === normalizedRole) ||
    levelSpecificRoles[normalizeEducationLevel(type)].find((role) => role.canonicalRole === normalizedRole)
  );
}

export const roleLoginMeta = {
  super_admin: {
    title: "Super Admin Login",
    subtitle: "Overall platform control and multi-school operations",
    icon: Shield,
    redirectPath: "/master/dashboard",
  },
  owner: {
    title: "Owner Login",
    subtitle: "School ownership, billing, subscriptions, and governance",
    icon: Shield,
    redirectPath: "/owner/dashboard",
  },
  school_admin: {
    title: "School Admin Login",
    subtitle: "Headteacher/principal administration portal",
    icon: UserCheck,
    redirectPath: "/admin/dashboard",
  },
  teacher: {
    title: "Staff Login",
    subtitle: "Teacher and lecturer classroom operations",
    icon: UserCheck,
    redirectPath: "/teacher/dashboard",
  },
  student: {
    title: "Student Login",
    subtitle: "Academics, timetable, assignments, and results",
    icon: GraduationCap,
    redirectPath: "/student/dashboard",
  },
  parent: {
    title: "Parent / Guardian Login",
    subtitle: "Children, attendance, fees, and communication",
    icon: Users,
    redirectPath: "/parent/dashboard",
  },
  finance: {
    title: "Finance Login",
    subtitle: "Fees, invoices, receipts, expenses, and reports",
    icon: Calculator,
    redirectPath: "/finance/dashboard",
  },
  librarian: {
    title: "Librarian Login",
    subtitle: "Library catalogue, loans, members, and reports",
    icon: BookMarked,
    redirectPath: "/librarian/dashboard",
  },
  hr: {
    title: "HR Login",
    subtitle: "Staff, attendance, leave, payroll, and documents",
    icon: Briefcase,
    redirectPath: "/hr/dashboard",
  },
  canteen: {
    title: "Canteen Login",
    subtitle: "Meals, menus, inventory, payments, and orders",
    icon: Utensils,
    redirectPath: "/canteen/dashboard",
  },
  nurse: {
    title: "Health Login",
    subtitle: "Sick bay, student health records, medication, and incidents",
    icon: HeartPulse,
    redirectPath: "/health/dashboard",
  },
  transport_manager: {
    title: "Transport Login",
    subtitle: "Routes, buses, drivers, pickups, and transport incidents",
    icon: Bus,
    redirectPath: "/transport/dashboard",
  },
  hostel_warden: {
    title: "Hostel Login",
    subtitle: "Boarding, rooms, welfare, hostel attendance, and incidents",
    icon: Home,
    redirectPath: "/hostel/dashboard",
  },
  security: {
    title: "Security Login",
    subtitle: "Gate access, visitors, passes, incidents, and emergency logs",
    icon: Shield,
    redirectPath: "/security/dashboard",
  },
  receptionist: {
    title: "Receptionist Login",
    subtitle: "Front desk, visitors, appointments, calls, and enquiries",
    icon: ClipboardList,
    redirectPath: "/reception/dashboard",
  },
  inventory_manager: {
    title: "Inventory Login",
    subtitle: "Stores, stock movement, assets, and inventory alerts",
    icon: PackageSearch,
    redirectPath: "/inventory/dashboard",
  },
  counselor: {
    title: "Wellbeing Login",
    subtitle: "Counseling, welfare, safeguarding, and behavior support",
    icon: HandHeart,
    redirectPath: "/wellbeing/dashboard",
  },
} satisfies Record<CanonicalRole, { title: string; subtitle: string; icon: ComponentType<{ className?: string }>; redirectPath: string }>;

export const visibleRoleCards: CanonicalRole[] = ["student", "parent", "teacher", "finance", "librarian", "hr", "canteen", "school_admin", "owner"];
