import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { eq, sql } from "drizzle-orm";

import { getTenantDbBySlug, masterDb } from "@/lib/db";
import { schoolsTable } from "@/lib/db-schema";
import { isTenantOwnerResponse, requireTenantOwner } from "@/lib/tenant-owner-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Row = Record<string, unknown>;
type AuditLogPayload = {
  id: string;
  adminId: string;
  action: string;
  resource: string;
  resourceId: string;
  changes: unknown;
  ipAddress: string;
  userAgent: string;
  status: string;
  severity: string;
  createdAt: string | null;
  actorName: string;
  actorEmail: string;
  actorRole: string;
  integrityHash: string;
};

function asString(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function asNumber(value: unknown) {
  const next = Number(value || 0);
  return Number.isFinite(next) ? next : 0;
}

function asDate(value: unknown) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function asPositiveInt(value: string | null, fallback: number, max: number) {
  const next = Number(value || fallback);
  if (!Number.isFinite(next) || next < 1) return fallback;
  return Math.min(Math.floor(next), max);
}

function severityFor(action: string, status: string) {
  const normalizedAction = action.toLowerCase();
  const normalizedStatus = status.toLowerCase();
  if (["failed", "error"].includes(normalizedStatus)) return "critical";
  if (normalizedAction.includes("delete") || normalizedAction.includes("permission") || normalizedAction.includes("security")) return "high";
  if (normalizedAction.includes("update") || normalizedAction.includes("change") || normalizedAction.includes("create")) return "medium";
  return "low";
}

function hashLog(log: Omit<AuditLogPayload, "integrityHash">) {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify({
      id: log.id,
      adminId: log.adminId,
      action: log.action,
      resource: log.resource,
      resourceId: log.resourceId,
      changes: log.changes,
      status: log.status,
      createdAt: log.createdAt,
    }))
    .digest("hex");
}

function csvEscape(value: unknown) {
  const text = typeof value === "string" ? value : JSON.stringify(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function logsToCsv(logs: AuditLogPayload[]) {
  const headers = ["id", "createdAt", "severity", "status", "action", "resource", "resourceId", "actorName", "actorEmail", "actorRole", "ipAddress", "userAgent", "integrityHash", "changes"];
  return [
    headers.join(","),
    ...logs.map((log) => headers.map((key) => csvEscape(log[key as keyof AuditLogPayload])).join(",")),
  ].join("\n");
}

async function safeRows<T = Row>(operation: () => Promise<{ rows?: unknown[] } | T[]>, label: string): Promise<T[]> {
  try {
    const result = await operation();
    if (Array.isArray(result)) return result as T[];
    return (result.rows || []) as T[];
  } catch (error) {
    console.warn(`Owner audit ${label} query skipped:`, error instanceof Error ? error.message : error);
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

export async function GET(request: NextRequest) {
  try {
    const slug = request.nextUrl.searchParams.get("tenant")?.trim().toLowerCase();
    if (!slug) return NextResponse.json({ error: "Tenant slug is required" }, { status: 400 });
    const currentUser = await requireTenantOwner(request, slug);
    if (isTenantOwnerResponse(currentUser)) return currentUser;

    const school = await getSchool(slug);
    if (!school) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    const tenantDb = await getTenantDbBySlug(slug);
    const params = request.nextUrl.searchParams;
    const page = asPositiveInt(params.get("page"), 1, 10_000);
    const pageSize = asPositiveInt(params.get("pageSize"), 25, 100);
    const offset = (page - 1) * pageSize;
    const query = params.get("query")?.trim() || "";
    const status = params.get("status")?.trim().toLowerCase() || "all";
    const severity = params.get("severity")?.trim().toLowerCase() || "all";
    const resource = params.get("resource")?.trim() || "all";
    const actor = params.get("actor")?.trim() || "";
    const startDate = params.get("startDate")?.trim() || "";
    const endDate = params.get("endDate")?.trim() || "";
    const exportFormat = params.get("export")?.trim().toLowerCase() || "";

    const whereParts = [sql`1 = 1`];
    if (query) {
      const pattern = `%${query}%`;
      whereParts.push(sql`(
        a.action ilike ${pattern}
        or a.resource ilike ${pattern}
        or coalesce(a.resource_id, '') ilike ${pattern}
        or coalesce(a.ip_address, '') ilike ${pattern}
        or coalesce(a.user_agent, '') ilike ${pattern}
        or coalesce(u.name, '') ilike ${pattern}
        or coalesce(u.email, '') ilike ${pattern}
        or coalesce(a.admin_id, '') ilike ${pattern}
      )`);
    }
    if (status !== "all") whereParts.push(sql`lower(a.status) = ${status}`);
    if (resource !== "all") whereParts.push(sql`a.resource = ${resource}`);
    if (actor) {
      const actorPattern = `%${actor}%`;
      whereParts.push(sql`(coalesce(u.name, '') ilike ${actorPattern} or coalesce(u.email, '') ilike ${actorPattern} or coalesce(a.admin_id, '') ilike ${actorPattern})`);
    }
    if (startDate) whereParts.push(sql`a.created_at >= ${new Date(startDate)}`);
    if (endDate) whereParts.push(sql`a.created_at <= ${new Date(`${endDate}T23:59:59.999Z`)}`);
    const whereSql = sql.join(whereParts, sql` and `);
    const severitySql = sql`
      case
        when lower(a.status) in ('failed', 'error') then 'critical'
        when lower(a.action) like '%delete%' or lower(a.action) like '%permission%' or lower(a.action) like '%security%' then 'high'
        when lower(a.action) like '%update%' or lower(a.action) like '%change%' or lower(a.action) like '%create%' then 'medium'
        else 'low'
      end
    `;
    const filteredWhereSql = severity === "all" ? whereSql : sql`${whereSql} and ${severitySql} = ${severity}`;
    const limitSql = exportFormat ? sql`limit 5000` : sql`limit ${pageSize} offset ${offset}`;

    const [logRows, countRows, summaryRows, statusRows, resourceRows, actorRows, dailyRows] = await Promise.all([
      safeRows<Row>(
        () =>
          tenantDb.execute(sql`
            select
              a.id,
              a.admin_id,
              a.action,
              a.resource,
              a.resource_id,
              a.changes,
              a.ip_address,
              a.user_agent,
              a.status,
              a.created_at,
              coalesce(u.name, a.admin_id, 'System') as actor_name,
              coalesce(u.email, '') as actor_email,
              coalesce(r.name, u.role_id, '') as actor_role
            from audit_logs a
            left join users u on u.id = a.admin_id
            left join roles r on r.id = u.role_id
            where ${filteredWhereSql}
            order by a.created_at desc
            ${limitSql}
          `),
        "logs"
      ),
      safeRows<Row>(() => tenantDb.execute(sql`select count(*)::int total from audit_logs a left join users u on u.id = a.admin_id where ${filteredWhereSql}`), "count"),
      safeRows<Row>(() => tenantDb.execute(sql`
        select
          count(*)::int total,
          count(*) filter (where lower(a.status) = 'success')::int success,
          count(*) filter (where lower(a.status) in ('failed', 'error'))::int failed,
          count(*) filter (where ${severitySql} in ('critical', 'high'))::int high_risk,
          count(distinct coalesce(a.admin_id, u.email, u.name))::int unique_actors
        from audit_logs a
        left join users u on u.id = a.admin_id
        where ${filteredWhereSql}
      `), "summaries"),
      safeRows<Row>(() => tenantDb.execute(sql`
        select a.status, count(*)::int total
        from audit_logs a
        left join users u on u.id = a.admin_id
        where ${whereSql}
        group by a.status
        order by total desc
      `), "status summary"),
      safeRows<Row>(() => tenantDb.execute(sql`
        select a.resource, count(*)::int total
        from audit_logs a
        left join users u on u.id = a.admin_id
        where ${whereSql}
        group by a.resource
        order by total desc
        limit 12
      `), "resources"),
      safeRows<Row>(() => tenantDb.execute(sql`
        select coalesce(u.name, a.admin_id) actor, count(*)::int total
        from audit_logs a
        left join users u on u.id = a.admin_id
        where ${whereSql}
        group by actor
        order by total desc
        limit 10
      `), "actors"),
      safeRows<Row>(() => tenantDb.execute(sql`
        select date_trunc('day', a.created_at)::date day, count(*)::int total
        from audit_logs a
        left join users u on u.id = a.admin_id
        where a.created_at >= now() - interval '14 days'
        group by day
        order by day asc
      `), "daily"),
    ]);

    const logs = logRows.map((row) => {
      const action = asString(row.action, "Activity");
      const status = asString(row.status, "success");
      const log = {
        id: asString(row.id),
        adminId: asString(row.admin_id),
        action,
        resource: asString(row.resource, "system"),
        resourceId: asString(row.resource_id),
        changes: row.changes || {},
        ipAddress: asString(row.ip_address),
        userAgent: asString(row.user_agent),
        status,
        severity: severityFor(action, status),
        createdAt: asDate(row.created_at),
        actorName: asString(row.actor_name, "System"),
        actorEmail: asString(row.actor_email),
        actorRole: asString(row.actor_role),
      };
      return { ...log, integrityHash: hashLog(log) };
    });
    const total = asNumber(countRows[0]?.total);
    const summary = summaryRows[0] || {};

    if (exportFormat === "json") {
      return NextResponse.json({ school, logs, exportedAt: new Date().toISOString(), filters: { query, status, severity, resource, actor, startDate, endDate } }, {
        headers: {
          "Cache-Control": "no-store, max-age=0",
          "Content-Disposition": `attachment; filename="${slug}-audit-logs.json"`,
        },
      });
    }
    if (exportFormat === "csv") {
      return new NextResponse(logsToCsv(logs), {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Cache-Control": "no-store, max-age=0",
          "Content-Disposition": `attachment; filename="${slug}-audit-logs.csv"`,
        },
      });
    }

    return NextResponse.json({
      school,
      logs,
      summaries: {
        total,
        success: asNumber(summary.success),
        failed: asNumber(summary.failed),
        highRisk: asNumber(summary.high_risk),
        uniqueActors: asNumber(summary.unique_actors),
      },
      analytics: {
        byStatus: statusRows.map((row) => ({ name: asString(row.status, "unknown"), total: asNumber(row.total) })),
        byResource: resourceRows.map((row) => ({ name: asString(row.resource, "system"), total: asNumber(row.total) })),
        byActor: actorRows.map((row) => ({ name: asString(row.actor, "System"), total: asNumber(row.total) })),
        daily: dailyRows.map((row) => ({ date: asDate(row.day), total: asNumber(row.total) })),
      },
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
        hasNextPage: page * pageSize < total,
        hasPreviousPage: page > 1,
      },
      filters: {
        query,
        status,
        severity,
        resource,
        actor,
        startDate,
        endDate,
      },
      retention: {
        policy: "Tenant audit logs are retained for a minimum of 2 years unless a stricter tenant policy is configured.",
        immutable: true,
        integrity: "sha256-per-row",
        exportLimit: 5000,
      },
      generatedAt: new Date().toISOString(),
    }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    console.error("Owner audit GET failed:", error);
    return NextResponse.json({ error: "Failed to load owner audit logs" }, { status: 500 });
  }
}
