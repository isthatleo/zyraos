import crypto from "crypto";
import { NextRequest } from "next/server";
import { sql } from "drizzle-orm";

type TenantAuditDb = {
  execute: (query: ReturnType<typeof sql>) => Promise<unknown>;
};

type TenantAuditInput = {
  db: TenantAuditDb;
  request?: NextRequest;
  actorId: string;
  action: string;
  resource: string;
  resourceId?: string | null;
  changes?: unknown;
  status?: "success" | "failed" | "error" | "warning" | string;
};

function clientIp(request?: NextRequest) {
  if (!request) return null;
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || null;
}

export async function writeTenantAuditLog(input: TenantAuditInput) {
  await input.db.execute(sql`
    insert into audit_logs (id, admin_id, action, resource, resource_id, changes, ip_address, user_agent, status, created_at)
    values (
      ${crypto.randomUUID()},
      ${input.actorId},
      ${input.action},
      ${input.resource},
      ${input.resourceId || null},
      ${JSON.stringify(input.changes || {})}::jsonb,
      ${clientIp(input.request)},
      ${input.request?.headers.get("user-agent") || null},
      ${input.status || "success"},
      now()
    )
  `);
}
