import crypto from "crypto";

import { eq, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

import { getTenantDbBySlug, masterDb } from "@/lib/db";
import { rolePermissionsTable, rolesTable, schoolsTable } from "@/lib/db-schema";
import { getTenantRoleDefinitions, normalizeRole } from "@/lib/roles";
import { isTenantAdminResponse, requireTenantAdmin } from "@/lib/tenant-admin-auth";
import { writeTenantAuditLog } from "@/lib/tenant-audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Row = Record<string, unknown>;

const PERMISSION_GROUPS = [
  { id: "general", title: "General", permissions: [
    { id: "dashboard", label: "Dashboard", resource: "dashboard", permission: "view" },
    { id: "calendar", label: "Calendar", resource: "calendar", permission: "view" },
    { id: "analytics", label: "Analytics", resource: "analytics", permission: "view" },
    { id: "settings", label: "Settings", resource: "settings", permission: "manage" },
    { id: "communication", label: "Communication", resource: "communication", permission: "manage" },
  ] },
  { id: "student_information", title: "Student Information", permissions: [
    { id: "student_profiles", label: "Student Profiles", resource: "students", permission: "view" },
    { id: "admissions", label: "Admissions", resource: "admissions", permission: "manage" },
    { id: "documents", label: "Documents", resource: "documents", permission: "manage" },
    { id: "promotion", label: "Promotion", resource: "promotion", permission: "manage" },
    { id: "alumni", label: "Alumni", resource: "alumni", permission: "manage" },
  ] },
  { id: "academics", title: "Academics", permissions: [
    { id: "classes", label: "Classes", resource: "classes", permission: "manage" },
    { id: "subjects", label: "Subjects", resource: "subjects", permission: "manage" },
    { id: "timetable", label: "Timetable", resource: "timetable", permission: "manage" },
    { id: "curriculum", label: "Curriculum", resource: "curriculum", permission: "manage" },
    { id: "learning_content", label: "Learning Content", resource: "learning_content", permission: "manage" },
  ] },
  { id: "staff_management", title: "Staff Management", permissions: [
    { id: "teachers", label: "Teachers", resource: "teachers", permission: "manage" },
    { id: "hr_management", label: "HR Management", resource: "hr", permission: "manage" },
    { id: "leave_management", label: "Leave Management", resource: "leave", permission: "manage" },
    { id: "payroll", label: "Payroll", resource: "payroll", permission: "manage" },
    { id: "staff_attendance", label: "Staff Attendance", resource: "staff_attendance", permission: "manage" },
  ] },
  { id: "finance", title: "Finance", permissions: [
    { id: "payments", label: "Payments", resource: "payments", permission: "manage" },
    { id: "receipts", label: "Receipts", resource: "receipts", permission: "manage" },
    { id: "invoices", label: "Invoices", resource: "invoices", permission: "manage" },
    { id: "expenses", label: "Expenses", resource: "expenses", permission: "manage" },
    { id: "platform_billing", label: "Platform Billing", resource: "platform_billing", permission: "manage" },
  ] },
  { id: "facilities", title: "Facilities", permissions: [
    { id: "attendance", label: "Attendance", resource: "attendance", permission: "manage" },
    { id: "library", label: "Library", resource: "library", permission: "manage" },
    { id: "transport", label: "Transport", resource: "transport", permission: "manage" },
    { id: "hostel", label: "Hostel", resource: "hostel", permission: "manage" },
    { id: "inventory", label: "Inventory", resource: "inventory", permission: "manage" },
    { id: "canteen", label: "Canteen", resource: "canteen", permission: "manage" },
  ] },
  { id: "governance", title: "Governance", permissions: [
    { id: "users", label: "Users", resource: "users", permission: "manage" },
    { id: "permissions", label: "Permissions", resource: "permissions", permission: "manage" },
    { id: "audit_logs", label: "Audit Logs", resource: "audit_logs", permission: "view" },
    { id: "school_settings", label: "School Settings", resource: "school_settings", permission: "manage" },
  ] },
];

const DEFAULT_ROLE_PERMISSIONS: Record<string, string[]> = {
  owner: PERMISSION_GROUPS.flatMap((group) => group.permissions.map((permission) => permission.id)),
  school_admin: PERMISSION_GROUPS.flatMap((group) => group.permissions.map((permission) => permission.id)),
  teacher: ["dashboard", "calendar", "communication", "classes", "subjects", "timetable", "curriculum", "assessments", "student_profiles"],
  finance: ["dashboard", "analytics", "communication", "payments", "receipts", "invoices", "expenses", "platform_billing"],
  hr: ["dashboard", "calendar", "communication", "teachers", "hr_management", "leave_management", "payroll", "staff_attendance"],
  librarian: ["dashboard", "calendar", "communication", "library", "student_profiles"],
  canteen: ["dashboard", "calendar", "communication", "canteen", "inventory"],
  student: ["dashboard", "calendar", "communication", "assessments", "learning_content"],
  parent: ["dashboard", "calendar", "communication", "payments", "student_profiles", "attendance"],
};

const REQUIRED_PERMISSION_IDS = new Set(["dashboard", "communication"]);
const OWNER_ONLY_ROLE_IDS = new Set(["owner"]);
const OWNER_MANAGED_ROLE_IDS = new Set(["owner", "school_admin"]);
const OWNER_ONLY_PERMISSION_IDS = new Set(["permissions", "school_settings", "platform_billing", "payroll"]);

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
    console.warn(`Admin permissions ${label} query skipped:`, error instanceof Error ? error.message : error);
    return [];
  }
}

async function getSchool(slug: string) {
  const [school] = await masterDb.select({ id: schoolsTable.id, name: schoolsTable.name, slug: schoolsTable.slug, type: schoolsTable.type, status: schoolsTable.status }).from(schoolsTable).where(eq(schoolsTable.slug, slug)).limit(1);
  return school;
}

function permissionMap() {
  return new Map(PERMISSION_GROUPS.flatMap((group) => group.permissions.map((permission) => [permission.id, permission])));
}

function defaultPermissionsForRole(roleId: string) {
  const canonical = normalizeRole(roleId);
  return DEFAULT_ROLE_PERMISSIONS[canonical] || DEFAULT_ROLE_PERMISSIONS[roleId] || ["dashboard", "calendar", "communication"];
}

function guardPermissionChange(input: {
  actorRole: "owner" | "school_admin";
  roleId: string;
  selectedPermissions: string[];
}) {
  const errors: string[] = [];
  const role = normalizeRole(input.roleId);
  if (input.actorRole !== "owner" && (OWNER_ONLY_ROLE_IDS.has(input.roleId) || OWNER_ONLY_ROLE_IDS.has(role))) {
    errors.push("Only the tenant owner can edit the owner role");
  }
  if (input.actorRole !== "owner" && (OWNER_MANAGED_ROLE_IDS.has(input.roleId) || OWNER_MANAGED_ROLE_IDS.has(role))) {
    errors.push("Only the tenant owner can edit owner and school admin role permissions");
  }
  const ownerOnly = input.selectedPermissions.filter((id) => OWNER_ONLY_PERMISSION_IDS.has(id));
  if (input.actorRole !== "owner" && ownerOnly.length) {
    errors.push(`Only the tenant owner can grant: ${ownerOnly.join(", ")}`);
  }
  for (const id of REQUIRED_PERMISSION_IDS) {
    if (!input.selectedPermissions.includes(id)) errors.push(`${id} permission is required for every dashboard role`);
  }
  if ((role === "school_admin" || input.roleId === "school_admin") && !input.selectedPermissions.includes("permissions")) {
    errors.push("School admin role must keep permission management access");
  }
  if ((role === "owner" || input.roleId === "owner") && input.selectedPermissions.length < permissionMap().size) {
    errors.push("Owner role must keep all tenant permissions");
  }
  return errors;
}

async function ensureRolesAndDefaults(tenantDb: Awaited<ReturnType<typeof getTenantDbBySlug>>, schoolType: string) {
  const definitions = getTenantRoleDefinitions(schoolType);
  for (const role of definitions) {
    await tenantDb.insert(rolesTable).values({ id: role.id, name: role.name, description: role.description, isSystem: role.isSystem }).onConflictDoNothing();
  }
  const seededRows = await safeRows<Row>(() => tenantDb.execute(sql`select role_id, count(*)::int total from role_permissions group by role_id`), "permission counts");
  const seeded = new Set(seededRows.filter((row) => asNumber(row.total) > 0).map((row) => asString(row.role_id)));
  const catalog = permissionMap();
  for (const role of definitions) {
    if (seeded.has(role.id)) continue;
    for (const id of defaultPermissionsForRole(role.id)) {
      const permission = catalog.get(id);
      if (!permission) continue;
      await tenantDb.insert(rolePermissionsTable).values({ id: crypto.randomUUID(), roleId: role.id, permission: permission.permission, resource: permission.resource }).onConflictDoNothing();
    }
  }
}

async function buildPayload(slug: string, actorRole: "owner" | "school_admin" = "school_admin") {
  const school = await getSchool(slug);
  if (!school) return null;
  const tenantDb = await getTenantDbBySlug(slug);
  await ensureRolesAndDefaults(tenantDb, school.type);
  const [roles, permissionRows, userCounts] = await Promise.all([
    safeRows<typeof rolesTable.$inferSelect>(() => tenantDb.select().from(rolesTable), "roles"),
    safeRows<Row>(() => tenantDb.execute(sql`select id, role_id, permission, resource from role_permissions order by role_id, resource`), "permissions"),
    safeRows<Row>(() => tenantDb.execute(sql`select role_id, count(*)::int total from users group by role_id`), "user counts"),
  ]);
  const catalog = permissionMap();
  const permissionIdsByResource = new Map(Array.from(catalog.values()).map((permission) => [`${permission.resource}:${permission.permission}`, permission.id]));
  const usersByRole = new Map(userCounts.map((row) => [asString(row.role_id), asNumber(row.total)]));
  const state = new Map<string, Set<string>>();
  for (const row of permissionRows) {
    const roleId = asString(row.role_id);
    const id = permissionIdsByResource.get(`${asString(row.resource)}:${asString(row.permission)}`);
    if (!id) continue;
    if (!state.has(roleId)) state.set(roleId, new Set());
    state.get(roleId)!.add(id);
  }
  return {
    school,
    groups: PERMISSION_GROUPS,
    roles: roles.map((role) => {
      const selected = Array.from(state.get(role.id) || []);
      const canonicalRole = normalizeRole(role.id);
      const editable = actorRole === "owner" || (!OWNER_MANAGED_ROLE_IDS.has(role.id) && !OWNER_MANAGED_ROLE_IDS.has(canonicalRole));
      return { id: role.id, name: role.name, description: role.description || "", isSystem: role.isSystem, canonicalRole, userCount: usersByRole.get(role.id) || 0, selectedPermissions: selected, selectedCount: selected.length, editable };
    }),
    summary: { roles: roles.length, permissions: PERMISSION_GROUPS.reduce((sum, group) => sum + group.permissions.length, 0), assignments: permissionRows.length, usersCovered: Array.from(usersByRole.values()).reduce((sum, total) => sum + total, 0) },
    policy: {
      requiredPermissionIds: Array.from(REQUIRED_PERMISSION_IDS),
      ownerOnlyPermissionIds: Array.from(OWNER_ONLY_PERMISSION_IDS),
      ownerManagedRoleIds: Array.from(OWNER_MANAGED_ROLE_IDS),
      actorRole,
    },
    generatedAt: new Date().toISOString(),
  };
}

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("tenant")?.trim().toLowerCase() || "";
  if (!slug) return NextResponse.json({ error: "Tenant slug is required" }, { status: 400 });
  const admin = await requireTenantAdmin(request, slug);
  if (isTenantAdminResponse(admin)) return admin;
  const payload = await buildPayload(slug, admin.role);
  if (!payload) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  return NextResponse.json(payload, { headers: { "Cache-Control": "no-store, max-age=0" } });
}

export async function PATCH(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("tenant")?.trim().toLowerCase() || "";
  if (!slug) return NextResponse.json({ error: "Tenant slug is required" }, { status: 400 });
  const admin = await requireTenantAdmin(request, slug);
  if (isTenantAdminResponse(admin)) return admin;
  const school = await getSchool(slug);
  if (!school) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  const body = await request.json().catch(() => ({}));
  const roleId = asString(body.roleId);
  const selectedPermissions: string[] = Array.isArray(body.selectedPermissions) ? body.selectedPermissions.map(String) : [];
  if (!roleId) return NextResponse.json({ error: "Role id is required" }, { status: 400 });
  const tenantDb = await getTenantDbBySlug(slug);
  await ensureRolesAndDefaults(tenantDb, school.type);
  const [role] = await tenantDb.select({ id: rolesTable.id }).from(rolesTable).where(eq(rolesTable.id, roleId)).limit(1);
  if (!role) return NextResponse.json({ error: "Role not found" }, { status: 404 });
  const catalog = permissionMap();
  const unknown = Array.from(new Set(selectedPermissions)).filter((id) => !catalog.has(id));
  if (unknown.length) return NextResponse.json({ error: `Unknown permissions: ${unknown.join(", ")}` }, { status: 400 });
  const unique: string[] = Array.from(new Set(selectedPermissions));
  const guardErrors = guardPermissionChange({ actorRole: admin.role, roleId, selectedPermissions: unique });
  if (guardErrors.length) return NextResponse.json({ error: guardErrors.join("; "), errors: guardErrors }, { status: 403 });
  const beforeRows = await safeRows<Row>(() => tenantDb.execute(sql`select permission, resource from role_permissions where role_id = ${roleId}`), "existing role permissions");
  const beforeIds = beforeRows.map((row) => Array.from(catalog.values()).find((permission) => permission.resource === asString(row.resource) && permission.permission === asString(row.permission))?.id).filter((id): id is string => Boolean(id));
  await tenantDb.delete(rolePermissionsTable).where(eq(rolePermissionsTable.roleId, roleId));
  for (const id of unique) {
    const permission = catalog.get(id)!;
    await tenantDb.insert(rolePermissionsTable).values({ id: crypto.randomUUID(), roleId, permission: permission.permission, resource: permission.resource });
  }
  await writeTenantAuditLog({ db: tenantDb, request, actorId: admin.userId, action: "admin.role.permissions.updated", resource: "permissions", resourceId: roleId, changes: { before: beforeIds, after: unique, added: unique.filter((id) => !beforeIds.includes(id)), removed: beforeIds.filter((id) => !unique.includes(id)) } }).catch(() => undefined);
  return NextResponse.json(await buildPayload(slug, admin.role), { headers: { "Cache-Control": "no-store, max-age=0" } });
}

export async function POST(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("tenant")?.trim().toLowerCase() || "";
  if (!slug) return NextResponse.json({ error: "Tenant slug is required" }, { status: 400 });
  const admin = await requireTenantAdmin(request, slug);
  if (isTenantAdminResponse(admin)) return admin;
  const school = await getSchool(slug);
  if (!school) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  const body = await request.json().catch(() => ({}));
  const action = asString(body.action);
  const roleId = asString(body.roleId);
  if (action !== "reset_defaults") return NextResponse.json({ error: "Unsupported permissions action" }, { status: 400 });
  if (!roleId) return NextResponse.json({ error: "Role id is required" }, { status: 400 });
  const defaults = defaultPermissionsForRole(roleId);
  const guardErrors = guardPermissionChange({ actorRole: admin.role, roleId, selectedPermissions: defaults });
  if (guardErrors.length) return NextResponse.json({ error: guardErrors.join("; "), errors: guardErrors }, { status: 403 });
  const tenantDb = await getTenantDbBySlug(slug);
  await ensureRolesAndDefaults(tenantDb, school.type);
  const [role] = await tenantDb.select({ id: rolesTable.id }).from(rolesTable).where(eq(rolesTable.id, roleId)).limit(1);
  if (!role) return NextResponse.json({ error: "Role not found" }, { status: 404 });
  const catalog = permissionMap();
  const beforeRows = await safeRows<Row>(() => tenantDb.execute(sql`select permission, resource from role_permissions where role_id = ${roleId}`), "existing role permissions");
  const beforeIds = beforeRows.map((row) => Array.from(catalog.values()).find((permission) => permission.resource === asString(row.resource) && permission.permission === asString(row.permission))?.id).filter((id): id is string => Boolean(id));
  await tenantDb.delete(rolePermissionsTable).where(eq(rolePermissionsTable.roleId, roleId));
  for (const id of defaults) {
    const permission = catalog.get(id);
    if (!permission) continue;
    await tenantDb.insert(rolePermissionsTable).values({ id: crypto.randomUUID(), roleId, permission: permission.permission, resource: permission.resource });
  }
  await writeTenantAuditLog({ db: tenantDb, request, actorId: admin.userId, action: "admin.role.permissions.reset_defaults", resource: "permissions", resourceId: roleId, changes: { before: beforeIds, after: defaults } }).catch(() => undefined);
  return NextResponse.json(await buildPayload(slug, admin.role), { headers: { "Cache-Control": "no-store, max-age=0" } });
}
