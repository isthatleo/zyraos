import { NextRequest, NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";

import { getTenantDbBySlug, masterDb } from "@/lib/db";
import { rolePermissionsTable, rolesTable, schoolsTable } from "@/lib/db-schema";
import { writeTenantAuditLog } from "@/lib/tenant-audit";
import { isTenantOwnerResponse, requireTenantOwner } from "@/lib/tenant-owner-auth";
import { getTenantRoleDefinitions, normalizeRole } from "@/lib/roles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Row = Record<string, unknown>;

const PERMISSION_GROUPS = [
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
];

const DEFAULT_ROLE_PERMISSIONS: Record<string, string[]> = {
  owner: PERMISSION_GROUPS.flatMap((group) => group.permissions.map((permission) => permission.id)),
  school_admin: PERMISSION_GROUPS.flatMap((group) => group.permissions.map((permission) => permission.id)).filter((id) => !["platform_billing"].includes(id)),
  teacher: ["dashboard", "calendar", "communication", "classes", "subjects", "timetable", "curriculum", "learning_content", "assessments", "results", "report_cards", "attendance", "student_profiles"],
  finance: ["dashboard", "analytics", "communication", "payments", "receipts", "scholarships", "finance_setup", "invoices", "expenses", "platform_billing"],
  hr: ["dashboard", "calendar", "communication", "teachers", "hr_management", "leave_management", "payroll", "staff_attendance", "documents"],
  librarian: ["dashboard", "calendar", "communication", "library", "student_profiles"],
  canteen: ["dashboard", "calendar", "communication", "canteen", "payments", "receipts", "inventory"],
  student: ["dashboard", "calendar", "communication", "assessments", "results", "report_cards", "learning_content"],
  parent: ["dashboard", "calendar", "communication", "payments", "receipts", "student_profiles", "attendance", "results"],
};

function asString(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function asNumber(value: unknown) {
  const next = Number(value || 0);
  return Number.isFinite(next) ? next : 0;
}

async function safeRows<T = Row>(operation: () => Promise<{ rows?: unknown[] } | T[]>, label: string): Promise<T[]> {
  try {
    const result = await operation();
    if (Array.isArray(result)) return result as T[];
    return (result.rows || []) as T[];
  } catch (error) {
    console.warn(`Owner permissions ${label} query skipped:`, error instanceof Error ? error.message : error);
    return [];
  }
}

async function getSchool(slug: string) {
  const [school] = await masterDb
    .select({ id: schoolsTable.id, name: schoolsTable.name, slug: schoolsTable.slug, type: schoolsTable.type, status: schoolsTable.status })
    .from(schoolsTable)
    .where(eq(schoolsTable.slug, slug))
    .limit(1);
  return school;
}

function permissionMap() {
  return new Map(PERMISSION_GROUPS.flatMap((group) => group.permissions.map((permission) => [permission.id, permission])));
}

function defaultPermissionsForRole(roleId: string) {
  const canonical = normalizeRole(roleId);
  return DEFAULT_ROLE_PERMISSIONS[canonical] || DEFAULT_ROLE_PERMISSIONS[roleId] || ["dashboard", "calendar", "communication"];
}

async function ensureRolesAndDefaults(tenantDb: Awaited<ReturnType<typeof import("@/lib/db").getTenantDbBySlug>>, schoolType: string) {
  const definitions = getTenantRoleDefinitions(schoolType);
  for (const role of definitions) {
    await tenantDb
      .insert(rolesTable)
      .values({ id: role.id, name: role.name, description: role.description, isSystem: role.isSystem })
      .onConflictDoNothing();
  }

  const rows = await safeRows<Row>(() => tenantDb.execute(sql`select role_id, count(*)::int total from role_permissions group by role_id`), "permission counts");
  const seeded = new Set(rows.filter((row) => asNumber(row.total) > 0).map((row) => asString(row.role_id)));
  const catalog = permissionMap();

  for (const role of definitions) {
    if (seeded.has(role.id)) continue;
    const defaults = defaultPermissionsForRole(role.id);
    for (const id of defaults) {
      const permission = catalog.get(id);
      if (!permission) continue;
      await tenantDb
        .insert(rolePermissionsTable)
        .values({ id: crypto.randomUUID(), roleId: role.id, permission: permission.permission, resource: permission.resource })
        .onConflictDoNothing();
    }
  }
}

async function buildPayload(slug: string) {
  const school = await getSchool(slug);
  if (!school) return null;
  const tenantDb = await import("@/lib/db").then((mod) => mod.getTenantDbBySlug(slug));
  await ensureRolesAndDefaults(tenantDb, school.type);

  const [roles, permissionRows, userCounts] = await Promise.all([
    safeRows<typeof rolesTable.$inferSelect>(() => tenantDb.select().from(rolesTable), "roles"),
    safeRows<Row>(() => tenantDb.execute(sql`select id, role_id, permission, resource from role_permissions order by role_id, resource`), "permissions"),
    safeRows<Row>(() => tenantDb.execute(sql`select role_id, count(*)::int total from users group by role_id`), "user counts"),
  ]);

  const catalog = permissionMap();
  const permissionIdsByResource = new Map(Array.from(catalog.values()).map((permission) => [`${permission.resource}:${permission.permission}`, permission.id]));
  const usersByRole = new Map(userCounts.map((row) => [asString(row.role_id), asNumber(row.total)]));
  const permissionState = new Map<string, Set<string>>();

  for (const row of permissionRows) {
    const roleId = asString(row.role_id);
    const id = permissionIdsByResource.get(`${asString(row.resource)}:${asString(row.permission)}`);
    if (!id) continue;
    if (!permissionState.has(roleId)) permissionState.set(roleId, new Set());
    permissionState.get(roleId)!.add(id);
  }

  return {
    school,
    groups: PERMISSION_GROUPS,
    roles: roles.map((role) => {
      const selected = Array.from(permissionState.get(role.id) || []);
      return {
        id: role.id,
        name: role.name,
        description: role.description || "",
        isSystem: role.isSystem,
        canonicalRole: normalizeRole(role.id),
        userCount: usersByRole.get(role.id) || 0,
        selectedPermissions: selected,
        selectedCount: selected.length,
      };
    }),
    summary: {
      roles: roles.length,
      permissions: PERMISSION_GROUPS.reduce((sum, group) => sum + group.permissions.length, 0),
      assignments: permissionRows.length,
      usersCovered: Array.from(usersByRole.values()).reduce((sum, total) => sum + total, 0),
    },
    generatedAt: new Date().toISOString(),
  };
}

export async function GET(request: NextRequest) {
  try {
    const slug = request.nextUrl.searchParams.get("tenant")?.trim().toLowerCase();
    if (!slug) return NextResponse.json({ error: "Tenant slug is required" }, { status: 400 });
    const currentUser = await requireTenantOwner(request, slug);
    if (isTenantOwnerResponse(currentUser)) return currentUser;
    const payload = await buildPayload(slug);
    if (!payload) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    return NextResponse.json(payload, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    console.error("Owner permissions GET failed:", error);
    return NextResponse.json({ error: "Failed to load owner permissions" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const slug = request.nextUrl.searchParams.get("tenant")?.trim().toLowerCase();
    if (!slug) return NextResponse.json({ error: "Tenant slug is required" }, { status: 400 });
    const currentUser = await requireTenantOwner(request, slug);
    if (isTenantOwnerResponse(currentUser)) return currentUser;
    const school = await getSchool(slug);
    if (!school) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

    const body = (await request.json().catch(() => ({}))) as Row;
    const roleId = asString(body.roleId);
    const selectedPermissions = Array.isArray(body.selectedPermissions) ? body.selectedPermissions.map(String) : [];
    if (!roleId) return NextResponse.json({ error: "Role id is required" }, { status: 400 });
    if (roleId === "owner" && !selectedPermissions.includes("permissions")) {
      return NextResponse.json({ error: "Owner role must keep permission management access" }, { status: 400 });
    }

    const tenantDb = await import("@/lib/db").then((mod) => mod.getTenantDbBySlug(slug));
    await ensureRolesAndDefaults(tenantDb, school.type);
    const [role] = await tenantDb.select({ id: rolesTable.id }).from(rolesTable).where(eq(rolesTable.id, roleId)).limit(1);
    if (!role) return NextResponse.json({ error: "Role not found" }, { status: 404 });

    const catalog = permissionMap();
    const unique = Array.from(new Set(selectedPermissions)).filter((id) => catalog.has(id));
    const beforeRows = await safeRows<Row>(() => tenantDb.execute(sql`select permission, resource from role_permissions where role_id = ${roleId}`), "existing role permissions");
    const beforePermissionIds = beforeRows
      .map((row) => Array.from(catalog.values()).find((permission) => permission.resource === asString(row.resource) && permission.permission === asString(row.permission))?.id)
      .filter((id): id is string => Boolean(id));
    await tenantDb.delete(rolePermissionsTable).where(eq(rolePermissionsTable.roleId, roleId));
    for (const id of unique) {
      const permission = catalog.get(id)!;
      await tenantDb.insert(rolePermissionsTable).values({
        id: crypto.randomUUID(),
        roleId,
        permission: permission.permission,
        resource: permission.resource,
      });
    }
    await writeTenantAuditLog({
      db: tenantDb,
      request,
      actorId: currentUser.userId,
      action: "Role Permissions Updated",
      resource: "permissions",
      resourceId: roleId,
      changes: {
        roleId,
        before: beforePermissionIds,
        after: unique,
        added: unique.filter((id) => !beforePermissionIds.includes(id)),
        removed: beforePermissionIds.filter((id) => !unique.includes(id)),
      },
      status: "success",
    });

    return NextResponse.json(await buildPayload(slug), { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    console.error("Owner permissions PATCH failed:", error);
    return NextResponse.json({ error: "Failed to update owner permissions" }, { status: 500 });
  }
}
