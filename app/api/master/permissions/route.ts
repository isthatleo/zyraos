import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { sql } from "drizzle-orm";

import { getTenantDb, masterDb } from "@/lib/db";
import { schoolsTable, systemSettingsTable } from "@/lib/db-schema";
import { requireMasterAdmin, writeMasterAudit } from "@/lib/master-audit";
import {
  ALL_PERMISSION_IDS,
  DEFAULT_ROLE_PERMISSIONS,
  PERMISSION_GROUPS,
  PLATFORM_PERMISSION_DEFAULTS_KEY,
  defaultPermissionsForRole,
  permissionCatalog,
} from "@/lib/permission-catalog";
import { CANONICAL_ROLES, getTenantRoleDefinitions, normalizeRole } from "@/lib/roles";
import { deleteCachedValue, getCachedValue, setCachedValue } from "@/lib/server-response-cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Row = Record<string, unknown>;
type PlatformDefaults = Record<string, string[]>;

const PLATFORM_MANAGED_ROLES = CANONICAL_ROLES.filter((role) => role !== "super_admin") as string[];
const PERMISSIONS_CACHE_KEY = "master-permissions:overview";
const PERMISSIONS_CACHE_TTL_MS = 20_000;

function asString(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function hasPermissionId(catalog: ReturnType<typeof permissionCatalog>, id: string) {
  return catalog.has(id as never);
}

function getPermission(catalog: ReturnType<typeof permissionCatalog>, id: string) {
  return catalog.get(id as never);
}

async function safeRows<T = Row>(operation: () => Promise<{ rows?: unknown[] } | T[]>, label: string): Promise<T[]> {
  try {
    const result = await operation();
    if (Array.isArray(result)) return result as T[];
    return (result.rows || []) as T[];
  } catch (error) {
    console.warn(`Master permissions ${label} query skipped:`, error instanceof Error ? error.message : error);
    return [];
  }
}

function normalizeDefaults(value: unknown): PlatformDefaults {
  const raw = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const catalog = permissionCatalog();
  const defaults: PlatformDefaults = {};
  for (const role of PLATFORM_MANAGED_ROLES) {
    const source = Array.isArray(raw[role]) ? raw[role] as unknown[] : DEFAULT_ROLE_PERMISSIONS[role] || defaultPermissionsForRole(role);
    defaults[role] = Array.from(new Set(source.map(String).filter((id) => hasPermissionId(catalog, id))));
  }
  return defaults;
}

async function readDefaults() {
  const rows = await masterDb.select().from(systemSettingsTable).where(sql`${systemSettingsTable.key} = ${PLATFORM_PERMISSION_DEFAULTS_KEY}`).limit(1);
  return normalizeDefaults(rows[0]?.value);
}

async function writeDefaults(defaults: PlatformDefaults) {
  await masterDb
    .insert(systemSettingsTable)
    .values({
      id: crypto.randomUUID(),
      key: PLATFORM_PERMISSION_DEFAULTS_KEY,
      value: defaults,
      category: "permissions",
      description: "Platform-wide default tenant role permissions",
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: systemSettingsTable.key,
      set: {
        value: defaults,
        category: "permissions",
        description: "Platform-wide default tenant role permissions",
        updatedAt: new Date(),
      },
    });
}

async function applyDefaultsToTenant(school: { slug: string; type: string; databaseUrl: string }, defaults: PlatformDefaults, canonicalRole?: string) {
  const tenantDb = getTenantDb(school.databaseUrl);
  const definitions = getTenantRoleDefinitions(school.type);
  for (const role of definitions) {
    await tenantDb.execute(sql`
      insert into roles (id, name, description, is_system, created_at, updated_at)
      values (${role.id}, ${role.name}, ${role.description}, ${role.isSystem}, now(), now())
      on conflict (id) do update set name = excluded.name, description = excluded.description, updated_at = now()
    `);
  }

  const roleRows = await safeRows<Row>(() => tenantDb.execute(sql`select id from roles`), `${school.slug} roles`);
  const catalog = permissionCatalog();
  let touched = 0;
  for (const row of roleRows) {
    const roleId = asString(row.id);
    const normalized = normalizeRole(roleId);
    if (canonicalRole && normalized !== canonicalRole) continue;
    const selected = defaults[normalized] || defaultPermissionsForRole(roleId);
    await tenantDb.execute(sql`delete from role_permissions where role_id = ${roleId}`);
    for (const permissionId of selected) {
      const permission = getPermission(catalog, permissionId);
      if (!permission) continue;
      await tenantDb.execute(sql`
        insert into role_permissions (id, role_id, permission, resource, created_at)
        values (${crypto.randomUUID()}, ${roleId}, ${permission.permission}, ${permission.resource}, now())
      `);
    }
    touched += 1;
  }
  return touched;
}

async function buildPayload() {
  const defaults = await readDefaults();
  const schools = await masterDb.select({ id: schoolsTable.id, name: schoolsTable.name, slug: schoolsTable.slug, type: schoolsTable.type, status: schoolsTable.status, databaseUrl: schoolsTable.databaseUrl }).from(schoolsTable);
  const tenantRoleRows = await Promise.all(
    schools.map(async (school) => {
      const tenantDb = getTenantDb(school.databaseUrl);
      const rows = await safeRows<Row>(() => tenantDb.execute(sql`select role_id, count(*)::int total from users group by role_id`), `${school.slug} user counts`);
      return rows.map((row) => ({ schoolId: school.id, role: normalizeRole(asString(row.role_id)), total: Number(row.total || 0) }));
    })
  );
  const usersByRole = tenantRoleRows.flat().reduce<Record<string, number>>((acc, row) => {
    acc[row.role] = (acc[row.role] || 0) + row.total;
    return acc;
  }, {});

  return {
    groups: PERMISSION_GROUPS,
    roles: PLATFORM_MANAGED_ROLES.map((role) => ({
      id: role,
      name: role.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase()),
      description: role === "owner" ? "School ownership, tenant governance, billing, and user control" : `Default permissions for ${role.replace(/_/g, " ")} roles across all tenants`,
      isSystem: true,
      canonicalRole: role,
      userCount: usersByRole[role] || 0,
      selectedPermissions: defaults[role] || defaultPermissionsForRole(role),
      selectedCount: (defaults[role] || defaultPermissionsForRole(role)).length,
    })),
    summary: {
      tenants: schools.length,
      activeTenants: schools.filter((school) => school.status === "active").length,
      roles: PLATFORM_MANAGED_ROLES.length,
      permissions: ALL_PERMISSION_IDS.length,
      assignments: Object.values(defaults).reduce((sum, items) => sum + items.length, 0),
      usersCovered: Object.values(usersByRole).reduce((sum, total) => sum + total, 0),
    },
    generatedAt: new Date().toISOString(),
  };
}

export async function GET(request: NextRequest) {
  try {
    const { response } = await requireMasterAdmin(request);
    if (response) return response;

    const cached = getCachedValue<Record<string, unknown>>(PERMISSIONS_CACHE_KEY);
    if (cached) return NextResponse.json(cached, { headers: { "Cache-Control": "private, max-age=20" } });

    const payload = await buildPayload();
    setCachedValue(PERMISSIONS_CACHE_KEY, payload, PERMISSIONS_CACHE_TTL_MS);
    return NextResponse.json(payload, { headers: { "Cache-Control": "private, max-age=20" } });
  } catch (error) {
    console.error("Master permissions GET failed:", error);
    return NextResponse.json({ error: "Failed to load platform permissions" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { admin, response } = await requireMasterAdmin(request);
    if (response) return response;
    const body = (await request.json().catch(() => ({}))) as Row;
    const roleId = normalizeRole(asString(body.roleId));
    if (!PLATFORM_MANAGED_ROLES.includes(roleId)) return NextResponse.json({ error: "Unsupported role" }, { status: 400 });
    const selectedPermissions = Array.isArray(body.selectedPermissions) ? body.selectedPermissions.map(String) : [];
    if (selectedPermissions.length > ALL_PERMISSION_IDS.length) {
      return NextResponse.json({ error: "Too many permissions supplied" }, { status: 400 });
    }
    const catalog = permissionCatalog();
    const unknownPermissions = selectedPermissions.filter((id) => !hasPermissionId(catalog, id));
    if (unknownPermissions.length) {
      return NextResponse.json({ error: "Unknown permission IDs supplied", unknownPermissions }, { status: 400 });
    }
    if (roleId === "owner" && !selectedPermissions.includes("permissions")) {
      return NextResponse.json({ error: "Owner defaults must retain permission management access" }, { status: 400 });
    }

    const defaults = await readDefaults();
    defaults[roleId] = Array.from(new Set(selectedPermissions.filter((id) => hasPermissionId(catalog, id))));
    await writeDefaults(defaults);

    const schools = await masterDb.select({ slug: schoolsTable.slug, type: schoolsTable.type, databaseUrl: schoolsTable.databaseUrl }).from(schoolsTable);
    let touchedRoles = 0;
    const failedTenants: Array<{ slug: string; error: string }> = [];
    for (const school of schools) {
      try {
        touchedRoles += await applyDefaultsToTenant(school, defaults, roleId);
      } catch (error) {
        failedTenants.push({
          slug: school.slug,
          error: error instanceof Error ? error.message : "Unknown propagation error",
        });
      }
    }

    await writeMasterAudit(request, {
      adminId: admin?.adminId,
      action: "Platform Permissions Updated",
      resource: "permissions",
      resourceId: roleId,
      changes: { roleId, permissionCount: defaults[roleId].length, tenantCount: schools.length, touchedRoles, failedTenants },
    });

    deleteCachedValue(PERMISSIONS_CACHE_KEY);
    const status = failedTenants.length ? 207 : 200;
    return NextResponse.json({ ...(await buildPayload()), propagated: { tenantCount: schools.length, touchedRoles, failedTenants } }, { status, headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    console.error("Master permissions PATCH failed:", error);
    return NextResponse.json({ error: "Failed to update platform permissions" }, { status: 500 });
  }
}
