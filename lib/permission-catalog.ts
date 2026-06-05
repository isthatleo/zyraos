import { normalizeRole, type CanonicalRole } from "@/lib/roles";

export const PERMISSION_GROUPS = [
  {
    id: "general",
    title: "General",
    permissions: [
      { id: "dashboard", label: "Dashboard", resource: "dashboard", permission: "view" },
      { id: "calendar", label: "Calendar", resource: "calendar", permission: "view" },
      { id: "analytics", label: "Analytics", resource: "analytics", permission: "view" },
      { id: "settings", label: "Settings", resource: "settings", permission: "manage" },
      { id: "communication", label: "Communication", resource: "communication", permission: "manage" },
    ],
  },
  {
    id: "student_information",
    title: "Student Information",
    permissions: [
      { id: "student_profiles", label: "Student Profiles", resource: "students", permission: "view" },
      { id: "admissions", label: "Admissions", resource: "admissions", permission: "manage" },
      { id: "documents", label: "Documents", resource: "documents", permission: "manage" },
      { id: "promotion", label: "Promotion", resource: "promotion", permission: "manage" },
      { id: "alumni", label: "Alumni", resource: "alumni", permission: "manage" },
    ],
  },
  {
    id: "academics",
    title: "Academics",
    permissions: [
      { id: "classes", label: "Classes", resource: "classes", permission: "manage" },
      { id: "subjects", label: "Subjects", resource: "subjects", permission: "manage" },
      { id: "timetable", label: "Timetable", resource: "timetable", permission: "manage" },
      { id: "curriculum", label: "Curriculum", resource: "curriculum", permission: "manage" },
      { id: "learning_content", label: "Learning Content", resource: "learning_content", permission: "manage" },
    ],
  },
  {
    id: "staff_management",
    title: "Staff Management",
    permissions: [
      { id: "teachers", label: "Teachers", resource: "teachers", permission: "manage" },
      { id: "hr_management", label: "HR Management", resource: "hr", permission: "manage" },
      { id: "leave_management", label: "Leave Management", resource: "leave", permission: "manage" },
      { id: "payroll", label: "Payroll", resource: "payroll", permission: "manage" },
      { id: "staff_attendance", label: "Staff Attendance", resource: "staff_attendance", permission: "manage" },
    ],
  },
  {
    id: "examinations",
    title: "Examinations",
    permissions: [
      { id: "assessments", label: "Assessments", resource: "assessments", permission: "manage" },
      { id: "results", label: "Results", resource: "results", permission: "manage" },
      { id: "exam_analytics", label: "Exam Analytics", resource: "exam_analytics", permission: "view" },
      { id: "report_cards", label: "Report Cards", resource: "report_cards", permission: "manage" },
    ],
  },
  {
    id: "finance",
    title: "Finance",
    permissions: [
      { id: "payments", label: "Payments", resource: "payments", permission: "manage" },
      { id: "receipts", label: "Receipts", resource: "receipts", permission: "manage" },
      { id: "scholarships", label: "Scholarships", resource: "scholarships", permission: "manage" },
      { id: "finance_setup", label: "Finance Setup", resource: "finance_settings", permission: "manage" },
      { id: "invoices", label: "Invoices", resource: "invoices", permission: "manage" },
      { id: "expenses", label: "Expenses", resource: "expenses", permission: "manage" },
    ],
  },
  {
    id: "facilities",
    title: "Facilities",
    permissions: [
      { id: "attendance", label: "Attendance", resource: "attendance", permission: "manage" },
      { id: "library", label: "Library", resource: "library", permission: "manage" },
      { id: "transport", label: "Transport", resource: "transport", permission: "manage" },
      { id: "hostel", label: "Hostel", resource: "hostel", permission: "manage" },
      { id: "inventory", label: "Inventory", resource: "inventory", permission: "manage" },
      { id: "canteen", label: "Canteen", resource: "canteen", permission: "manage" },
    ],
  },
  {
    id: "governance",
    title: "Governance",
    permissions: [
      { id: "users", label: "Users", resource: "users", permission: "manage" },
      { id: "permissions", label: "Permissions", resource: "permissions", permission: "manage" },
      { id: "audit_logs", label: "Audit Logs", resource: "audit_logs", permission: "view" },
      { id: "school_settings", label: "School Settings", resource: "school_settings", permission: "manage" },
      { id: "platform_billing", label: "Platform Billing", resource: "platform_billing", permission: "manage" },
    ],
  },
] as const;

export type PermissionId = (typeof PERMISSION_GROUPS)[number]["permissions"][number]["id"];

export const ALL_PERMISSION_IDS = PERMISSION_GROUPS.flatMap((group) => group.permissions.map((permission) => permission.id));

export const DEFAULT_ROLE_PERMISSIONS: Record<string, string[]> = {
  owner: ALL_PERMISSION_IDS,
  school_admin: ALL_PERMISSION_IDS.filter((id) => id !== "platform_billing"),
  teacher: ["dashboard", "calendar", "communication", "classes", "subjects", "timetable", "curriculum", "learning_content", "assessments", "results", "report_cards", "attendance", "student_profiles"],
  finance: ["dashboard", "analytics", "communication", "payments", "receipts", "scholarships", "finance_setup", "invoices", "expenses", "platform_billing"],
  hr: ["dashboard", "calendar", "communication", "teachers", "hr_management", "leave_management", "payroll", "staff_attendance", "documents"],
  librarian: ["dashboard", "calendar", "communication", "library", "student_profiles"],
  canteen: ["dashboard", "calendar", "communication", "canteen", "payments", "receipts", "inventory"],
  student: ["dashboard", "calendar", "communication", "assessments", "results", "report_cards", "learning_content"],
  parent: ["dashboard", "calendar", "communication", "payments", "receipts", "student_profiles", "attendance", "results"],
};

export function permissionCatalog() {
  return new Map(PERMISSION_GROUPS.flatMap((group) => group.permissions.map((permission) => [permission.id, permission])));
}

export function permissionIdByResource() {
  return new Map(Array.from(permissionCatalog().values()).map((permission) => [`${permission.resource}:${permission.permission}`, permission.id]));
}

export function defaultPermissionsForRole(roleId: string) {
  const canonical = normalizeRole(roleId);
  return DEFAULT_ROLE_PERMISSIONS[canonical] || DEFAULT_ROLE_PERMISSIONS[roleId] || ["dashboard", "calendar", "communication"];
}

export function requiredPermissionForPath(pathname: string, role?: string | null) {
  const parts = pathname.split("/").filter(Boolean);
  const knownTenantRoot = parts[0] && !["master", "api"].includes(parts[0]) && parts.length > 1 ? parts.slice(1) : parts;
  const first = knownTenantRoot[0] || "";
  const second = knownTenantRoot[1] || "";

  if (["profile", "settings", "messages", "notifications", "complete-access"].includes(first)) return null;
  if (["profile", "settings", "messages", "notifications"].includes(second)) return null;
  if (second === "dashboard" || first === "dashboard") return "dashboard";

  const segment = first === "owner" || first === "admin" ? second : first;
  const map: Record<string, string> = {
    finance: "finance_setup",
    payments: "payments",
    invoices: "invoices",
    receipts: "receipts",
    reports: "analytics",
    billing: "platform_billing",
    users: "users",
    permissions: "permissions",
    staff: "teachers",
    hr: "hr_management",
    leave: "leave_management",
    payroll: "payroll",
    "staff-attendance": "staff_attendance",
    canteen: "canteen",
    attendance: "attendance",
    library: "library",
    transport: "transport",
    hostel: "hostel",
    inventory: "inventory",
    classes: "classes",
    subjects: "subjects",
    timetable: "timetable",
    curriculum: "curriculum",
    exams: "assessments",
    announcements: "communication",
    broadcasts: "communication",
  };

  return map[segment] || (role ? "dashboard" : null);
}

export function permissionLabel(permissionId: string) {
  return Array.from(permissionCatalog().values()).find((permission) => permission.id === permissionId)?.label || permissionId.replace(/_/g, " ");
}

export const PLATFORM_PERMISSION_DEFAULTS_KEY = "platform_permission_defaults";
