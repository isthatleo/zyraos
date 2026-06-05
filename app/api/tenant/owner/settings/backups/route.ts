import crypto from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { sql } from "drizzle-orm";

import { getTenantDbBySlug } from "@/lib/db";
import { deleteCachedValue } from "@/lib/server-response-cache";
import { isTenantOwnerResponse, requireTenantOwner } from "@/lib/tenant-owner-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Row = Record<string, unknown>;

function backupDir(slug: string) {
  return path.join(process.cwd(), ".roxan-backups", "tenants", slug);
}

async function readCurrentPayload(slug: string) {
  const tenantDb = await getTenantDbBySlug(slug);
  const settingsKey = `tenant_settings:${slug}`;
  const vaultKey = `tenant_settings_vault:${slug}`;
  const automationKey = `tenant_automation_jobs:${slug}`;
  const [settingsRow] = (await tenantDb.execute(sql`select value from system_settings where key = ${settingsKey} limit 1`)).rows as Row[];
  const [vaultRow] = (await tenantDb.execute(sql`select value from system_settings where key = ${vaultKey} limit 1`)).rows as Row[];
  const [automationRow] = (await tenantDb.execute(sql`select value from system_settings where key = ${automationKey} limit 1`)).rows as Row[];
  return { tenantDb, settings: settingsRow?.value || {}, vault: vaultRow?.value || {}, automation: automationRow?.value || {} };
}

export async function POST(request: NextRequest) {
  try {
    const slug = request.nextUrl.searchParams.get("tenant")?.trim().toLowerCase();
    if (!slug) return NextResponse.json({ error: "Tenant slug is required" }, { status: 400 });
    const currentUser = await requireTenantOwner(request, slug);
    if (isTenantOwnerResponse(currentUser)) return currentUser;
    const { tenantDb, settings, vault, automation } = await readCurrentPayload(slug);
    const backupId = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
    const payload = {
      id: backupId,
      slug,
      createdAt: new Date().toISOString(),
      createdBy: currentUser.userId,
      settings,
      vault,
      automation,
    };
    const serialized = JSON.stringify(payload, null, 2);
    const dir = backupDir(slug);
    await mkdir(dir, { recursive: true });
    const filePath = path.join(dir, `${backupId}.json`);
    await writeFile(filePath, serialized, "utf8");
    await tenantDb.execute(sql`
      insert into system_settings (id, key, value, category, description, created_at, updated_at)
      values (${crypto.randomUUID()}, ${`tenant_settings_backup:${slug}:${backupId}`}, ${JSON.stringify({ id: backupId, createdAt: payload.createdAt, createdBy: currentUser.userId, filePath, size: Buffer.byteLength(serialized) })}::jsonb, 'settings_backup', ${`Tenant settings backup for ${slug}`}, now(), now())
      on conflict (key) do update set value = excluded.value, updated_at = now()
    `);
    await tenantDb.execute(sql`
      insert into audit_logs (id, admin_id, action, resource, resource_id, changes, ip_address, user_agent, status, created_at)
      values (${crypto.randomUUID()}, ${currentUser.userId}, 'School Settings Backup Created', 'tenant_settings_backup', ${backupId}, ${JSON.stringify({ backupId, size: Buffer.byteLength(serialized) })}::jsonb, ${request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || null}, ${request.headers.get("user-agent")}, 'success', now())
    `);
    return NextResponse.json({ success: true, backup: { id: backupId, createdAt: payload.createdAt, size: Buffer.byteLength(serialized) } });
  } catch (error) {
    console.error("Tenant settings backup failed:", error);
    return NextResponse.json({ error: "Failed to create settings backup" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const slug = request.nextUrl.searchParams.get("tenant")?.trim().toLowerCase();
    if (!slug) return NextResponse.json({ error: "Tenant slug is required" }, { status: 400 });
    const currentUser = await requireTenantOwner(request, slug);
    if (isTenantOwnerResponse(currentUser)) return currentUser;
    const body = await request.json().catch(() => ({}));
    const backupId = String(body.backupId || "").trim();
    if (!backupId) return NextResponse.json({ error: "Backup id is required" }, { status: 400 });
    const tenantDb = await getTenantDbBySlug(slug);
    const [backupRow] = (await tenantDb.execute(sql`select value from system_settings where key = ${`tenant_settings_backup:${slug}:${backupId}`} limit 1`)).rows as Row[];
    const metadata = backupRow?.value && typeof backupRow.value === "object" ? backupRow.value as Row : null;
    if (!metadata?.filePath) return NextResponse.json({ error: "Backup not found" }, { status: 404 });
    const payload = JSON.parse(await readFile(String(metadata.filePath), "utf8")) as Row;
    if (payload.slug !== slug) return NextResponse.json({ error: "Backup belongs to another tenant" }, { status: 409 });
    await tenantDb.execute(sql`
      insert into system_settings (id, key, value, category, description, created_at, updated_at)
      values (${crypto.randomUUID()}, ${`tenant_settings:${slug}`}, ${JSON.stringify(payload.settings || {})}::jsonb, 'school', ${`Restored tenant settings for ${slug}`}, now(), now())
      on conflict (key) do update set value = excluded.value, updated_at = now()
    `);
    await tenantDb.execute(sql`
      insert into system_settings (id, key, value, category, description, created_at, updated_at)
      values (${crypto.randomUUID()}, ${`tenant_settings_vault:${slug}`}, ${JSON.stringify(payload.vault || {})}::jsonb, 'secret_vault', ${`Restored tenant settings vault for ${slug}`}, now(), now())
      on conflict (key) do update set value = excluded.value, updated_at = now()
    `);
    await tenantDb.execute(sql`
      insert into system_settings (id, key, value, category, description, created_at, updated_at)
      values (${crypto.randomUUID()}, ${`tenant_automation_jobs:${slug}`}, ${JSON.stringify(payload.automation || {})}::jsonb, 'automation', ${`Restored tenant automation bindings for ${slug}`}, now(), now())
      on conflict (key) do update set value = excluded.value, updated_at = now()
    `);
    await tenantDb.execute(sql`
      insert into audit_logs (id, admin_id, action, resource, resource_id, changes, ip_address, user_agent, status, created_at)
      values (${crypto.randomUUID()}, ${currentUser.userId}, 'School Settings Backup Restored', 'tenant_settings_backup', ${backupId}, ${JSON.stringify({ backupId })}::jsonb, ${request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || null}, ${request.headers.get("user-agent")}, 'success', now())
    `);
    deleteCachedValue(`tenant-dashboard:${slug}`);
    deleteCachedValue(`owner-finance:${slug}`);
    return NextResponse.json({ success: true, restoredBackupId: backupId });
  } catch (error) {
    console.error("Tenant settings restore failed:", error);
    return NextResponse.json({ error: "Failed to restore settings backup" }, { status: 500 });
  }
}
