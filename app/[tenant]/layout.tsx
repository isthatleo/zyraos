"use client";

import * as React from "react";
import { useParams, usePathname } from "next/navigation";

import { DashboardShell, type DashboardRole } from "@/components/shared/dashboard-shell";
import { authClient } from "@/lib/auth-client";
import { getTenantSubdomain } from "@/lib/tenant-routing";

const portalEntryPages = new Set(["login", "admins", "staff", "student-parent", "canteen"]);

const dashboardRoles = new Set<DashboardRole>([
  "master",
  "super_admin",
  "admin",
  "school_admin",
  "owner",
  "staff",
  "teacher",
  "student",
  "parent",
  "guardian",
  "finance",
  "accountant",
  "librarian",
  "hr",
  "canteen",
  "lecturer",
  "admissions_officer",
  "registrar",
  "exam_officer",
  "department_head",
  "class_teacher",
  "nurse",
  "transport_manager",
  "hostel_warden",
  "security",
  "procurement",
  "inventory_manager",
  "counselor",
  "alumni_officer",
]);

function isDashboardRole(role: string): role is DashboardRole {
  return dashboardRoles.has(role as DashboardRole);
}

const dashboardRoleAliases: Record<string, DashboardRole> = {
  admin: "school_admin",
  principal: "school_admin",
  headteacher: "school_admin",
  head_teacher: "school_admin",
  rector: "school_admin",
  dean: "school_admin",
  lecturer: "teacher",
  professor: "teacher",
  instructor: "teacher",
  trainer: "teacher",
  tutor: "teacher",
  pupil: "student",
  learner: "student",
  trainee: "student",
  guardian: "parent",
  parent_guardian: "parent",
  sponsor: "parent",
  bursar: "finance",
  cafeteria: "canteen",
  kitchen: "canteen",
  library: "librarian",
  transport: "transport_manager",
  hostel: "hostel_warden",
  boarding_warden: "hostel_warden",
  gate_officer: "security",
  admissions: "admissions_officer",
  admission_officer: "admissions_officer",
  academic_registrar: "registrar",
  exams_officer: "exam_officer",
  examination_officer: "exam_officer",
  faculty_head: "department_head",
  hod: "department_head",
  head_of_department: "department_head",
  form_teacher: "class_teacher",
  school_nurse: "nurse",
  health_officer: "nurse",
  counsellor: "counselor",
  welfare_officer: "counselor",
  wellbeing: "counselor",
  alumni: "alumni_officer",
};

function resolveSessionDashboardRole(role?: string | null): DashboardRole | null {
  const value = String(role || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (!value || value === "super_admin") return null;

  if (dashboardRoleAliases[value]) return dashboardRoleAliases[value];
  if (isDashboardRole(value)) return value;

  const suffixAlias = Object.entries(dashboardRoleAliases).find(([alias]) => value.endsWith(`_${alias}`));
  if (suffixAlias) return suffixAlias[1];

  const exactSuffix = Array.from(dashboardRoles).find((dashboardRole) => value.endsWith(`_${dashboardRole}`));
  return exactSuffix || null;
}

const routeFallbackRoles: Record<string, DashboardRole> = {
  owner: "owner",
  admin: "school_admin",
  staff: "teacher",
  teacher: "teacher",
  student: "student",
  parent: "parent",
  finance: "finance",
  librarian: "librarian",
  hr: "hr",
  canteen: "canteen",
  health: "nurse",
  transport: "transport_manager",
  hostel: "hostel_warden",
  security: "security",
  procurement: "procurement",
  inventory: "inventory_manager",
  wellbeing: "counselor",
  alumni: "alumni_officer",
};

function resolveDashboardRole(pathname: string, tenantSlug: string, userRole?: string | null): DashboardRole {
  const parts = pathname.split("/").filter(Boolean);
  const routeParts = parts[0] === tenantSlug ? parts.slice(1) : parts;
  const first = routeParts[0] || "";
  const userCanonical = resolveSessionDashboardRole(userRole);

  if (first === "owner") return "owner";
  if (routeFallbackRoles[first]) return routeFallbackRoles[first];

  if (userCanonical) {
    return userCanonical;
  }

  return routeFallbackRoles[first] || "student";
}

export default function TenantLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "";
  const params = useParams<{ tenant?: string }>();
  const tenantSlug = params?.tenant || pathname.split("/").filter(Boolean)[0] || "";
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const [isTenantSubdomain, setIsTenantSubdomain] = React.useState(false);

  const routeParts = pathname.split("/").filter(Boolean);
  const tenantRouteParts = routeParts[0] === tenantSlug ? routeParts.slice(1) : routeParts;
  const firstSegment = tenantRouteParts[0] || "";
  const isPortalEntryPage = tenantRouteParts.length === 1 && portalEntryPages.has(firstSegment);

  React.useEffect(() => {
    setIsTenantSubdomain(Boolean(getTenantSubdomain(window.location.hostname)));
  }, []);

  if (isPortalEntryPage) return <>{children}</>;

  return (
    <DashboardShell
      role={resolveDashboardRole(pathname, tenantSlug, sessionPending ? null : (session?.user as { role?: string } | undefined)?.role)}
      tenantSlug={tenantSlug}
      tenantSubdomain={isTenantSubdomain}
    >
      {children}
    </DashboardShell>
  );
}
