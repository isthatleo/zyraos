import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { sql } from "drizzle-orm";

import { getTenantDbBySlug } from "@/lib/db";
import { deleteCachedValue } from "@/lib/server-response-cache";
import { isTenantOwnerResponse, requireTenantOwner } from "@/lib/tenant-owner-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Row = Record<string, unknown>;

export async function POST(request: NextRequest) {
  try {
    const slug = request.nextUrl.searchParams.get("tenant")?.trim().toLowerCase();
    if (!slug) return NextResponse.json({ error: "Tenant slug is required" }, { status: 400 });
    const currentUser = await requireTenantOwner(request, slug);
    if (isTenantOwnerResponse(currentUser)) return currentUser;
    const body = await request.json().catch(() => ({}));
    const versionId = String(body.versionId || "").trim();
    if (!versionId) return NextResponse.json({ error: "Version id is required" }, { status: 400 });
    const tenantDb = await getTenantDbBySlug(slug);
    const versionKey = `tenant_settings_version:${slug}:${versionId}`;
    const [versionRow] = (await tenantDb.execute(sql`select value from system_settings where key = ${versionKey} limit 1`)).rows as Row[];
    const version = versionRow?.value && typeof versionRow.value === "object" ? versionRow.value as Row : null;
    const settings = version?.settings && typeof version.settings === "object" ? version.settings as Row : null;
    if (!settings) return NextResponse.json({ error: "Settings version not found" }, { status: 404 });
    const currentKey = `tenant_settings:${slug}`;
    const [currentRow] = (await tenantDb.execute(sql`select value from system_settings where key = ${currentKey} limit 1`)).rows as Row[];
    const rollbackVersionId = `rollback-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
    if (currentRow?.value) {
      await tenantDb.execute(sql`
        insert into system_settings (id, key, value, category, description, created_at, updated_at)
        values (${crypto.randomUUID()}, ${`tenant_settings_version:${slug}:${rollbackVersionId}`}, ${JSON.stringify({ id: rollbackVersionId, settings: currentRow.value, createdAt: new Date().toISOString(), actorId: currentUser.userId, changedKeys: ["rollback_snapshot"] })}::jsonb, 'school_settings_version', ${`Rollback safety snapshot for ${slug}`}, now(), now())
        on conflict (key) do update set value = excluded.value, updated_at = now()
      `);
    }
    await tenantDb.execute(sql`
      insert into system_settings (id, key, value, category, description, created_at, updated_at)
      values (${crypto.randomUUID()}, ${currentKey}, ${JSON.stringify(settings)}::jsonb, 'school', ${`Owner tenant settings for ${slug}`}, now(), now())
      on conflict (key) do update set value = excluded.value, updated_at = now()
    `);
    await tenantDb.execute(sql`
      insert into audit_logs (id, admin_id, action, resource, resource_id, changes, ip_address, user_agent, status, created_at)
      values (${crypto.randomUUID()}, ${currentUser.userId}, 'School Settings Rolled Back', 'tenant_settings_version', ${versionId}, ${JSON.stringify({ restoredVersionId: versionId, safetyVersionId: rollbackVersionId })}::jsonb, ${request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || null}, ${request.headers.get("user-agent")}, 'success', now())
    `);
    deleteCachedValue(`tenant-dashboard:${slug}`);
    deleteCachedValue(`owner-finance:${slug}`);
    return NextResponse.json({ success: true, restoredVersionId: versionId, safetyVersionId: rollbackVersionId });
  } catch (error) {
    console.error("Tenant settings rollback failed:", error);
    return NextResponse.json({ error: "Failed to rollback settings" }, { status: 500 });
  }
}
