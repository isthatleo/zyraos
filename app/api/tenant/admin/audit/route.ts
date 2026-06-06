import crypto from "crypto";
import { eq, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

import { getTenantDbBySlug, masterDb } from "@/lib/db";
import { schoolsTable } from "@/lib/db-schema";
import { archiveAuditLogs } from "@/lib/platform-integrations";
import { isTenantAdminResponse, requireTenantAdmin } from "@/lib/tenant-admin-auth";
import { writeTenantAuditLog } from "@/lib/tenant-audit";

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

function isValidDateInput(value: string) {
  if (!value) return true;
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(`${value}T00:00:00.000Z`).getTime());
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
  return crypto.createHash("sha256").update(JSON.stringify({
    id: log.id,
    adminId: log.adminId,
    action: log.action,
    resource: log.resource,
    resourceId: log.resourceId,
    changes: log.changes,
    status: log.status,
    createdAt: log.createdAt,
  })).digest("hex");
}

function csvEscape(value: unknown) {
  const text = typeof value === "string" ? value : JSON.stringify(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function logsToCsv(logs: AuditLogPayload[]) {
  const headers = ["id", "createdAt", "severity", "status", "action", "resource", "resourceId", "actorName", "actorEmail", "actorRole", "ipAddress", "userAgent", "integrityHash", "changes"];
  return [headers.join(","), ...logs.map((log) => headers.map((key) => csvEscape(log[key as keyof AuditLogPayload])).join(","))].join("\n");
}

function integritySummary(logs: AuditLogPayload[]) {
  const verified = logs.filter((log) => {
    const { integrityHash: _integrityHash, ...rest } = log;
    return hashLog(rest) === log.integrityHash;
  }).length;
  return {
    checked: logs.length,
    verified,
    failed: logs.length - verified,
    algorithm: "sha256-per-row",
  };
}

async function safeRows<T = Row>(operation: () => Promise<{ rows?: unknown[] } | T[]>, label: string): Promise<T[]> {
  try {
    const result = await operation();
    if (Array.isArray(result)) return result as T[];
    return (result.rows || []) as T[];
  } catch (error) {
    console.warn(`Admin audit ${label} query skipped:`, error instanceof Error ? error.message : error);
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
    const params = request.nextUrl.searchParams;
    const slug = (params.get("tenant") || params.get("slug") || "").trim().toLowerCase();
    if (!slug) return NextResponse.json({ error: "Tenant slug is required" }, { status: 400 });
    const currentUser = await requireTenantAdmin(request, slug);
    if (isTenantAdminResponse(currentUser)) return currentUser;

    const school = await getSchool(slug);
    if (!school) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    const tenantDb = await getTenantDbBySlug(slug);
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
    if (!["", "csv", "json"].includes(exportFormat)) return NextResponse.json({ error: "Unsupported export format" }, { status: 400 });
    if (!isValidDateInput(startDate) || !isValidDateInput(endDate)) return NextResponse.json({ error: "Dates must use YYYY-MM-DD format" }, { status: 400 });
    if (startDate && endDate && new Date(startDate) > new Date(endDate)) return NextResponse.json({ error: "Start date cannot be after end date" }, { status: 400 });

    const [settingsRow] = await safeRows<Row>(() => tenantDb.execute(sql`select value from system_settings where key in (${`tenant_settings:${slug}`}, 'tenant_settings') order by case when key = ${`tenant_settings:${slug}`} then 0 else 1 end limit 1`), "settings");
    const settings = settingsRow?.value && typeof settingsRow.value === "object" ? settingsRow.value as Row : {};
    const retentionDays = Math.max(30, Math.min(3650, Number(settings.auditRetentionDays || 730) || 730));

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
      safeRows<Row>(() => tenantDb.execute(sql`
        select a.id, a.admin_id, a.action, a.resource, a.resource_id, a.changes, a.ip_address, a.user_agent, a.status, a.created_at,
          coalesce(u.name, a.admin_id, 'System') as actor_name,
          coalesce(u.email, '') as actor_email,
          coalesce(r.name, u.role_id, '') as actor_role
        from audit_logs a
        left join users u on u.id = a.admin_id
        left join roles r on r.id = u.role_id
        where ${filteredWhereSql}
        order by a.created_at desc
        ${limitSql}
      `), "logs"),
      safeRows<Row>(() => tenantDb.execute(sql`select count(*)::int total from audit_logs a left join users u on u.id = a.admin_id where ${filteredWhereSql}`), "count"),
      safeRows<Row>(() => tenantDb.execute(sql`
        select count(*)::int total,
          count(*) filter (where lower(a.status) = 'success')::int success,
          count(*) filter (where lower(a.status) in ('failed', 'error'))::int failed,
          count(*) filter (where ${severitySql} in ('critical', 'high'))::int high_risk,
          count(distinct coalesce(a.admin_id, u.email, u.name))::int unique_actors
        from audit_logs a
        left join users u on u.id = a.admin_id
        where ${filteredWhereSql}
      `), "summaries"),
      safeRows<Row>(() => tenantDb.execute(sql`select a.status, count(*)::int total from audit_logs a left join users u on u.id = a.admin_id where ${whereSql} group by a.status order by total desc`), "status summary"),
      safeRows<Row>(() => tenantDb.execute(sql`select a.resource, count(*)::int total from audit_logs a left join users u on u.id = a.admin_id where ${whereSql} group by a.resource order by total desc limit 12`), "resources"),
      safeRows<Row>(() => tenantDb.execute(sql`select coalesce(u.name, a.admin_id) actor, count(*)::int total from audit_logs a left join users u on u.id = a.admin_id where ${whereSql} group by actor order by total desc limit 10`), "actors"),
      safeRows<Row>(() => tenantDb.execute(sql`select date_trunc('day', a.created_at)::date day, count(*)::int total from audit_logs a left join users u on u.id = a.admin_id where a.created_at >= now() - interval '14 days' group by day order by day asc`), "daily"),
    ]);

    const logs = logRows.map((row) => {
      const action = asString(row.action, "Activity");
      const statusValue = asString(row.status, "success");
      const log = {
        id: asString(row.id),
        adminId: asString(row.admin_id),
        action,
        resource: asString(row.resource, "system"),
        resourceId: asString(row.resource_id),
        changes: row.changes || {},
        ipAddress: asString(row.ip_address),
        userAgent: asString(row.user_agent),
        status: statusValue,
        severity: severityFor(action, statusValue),
        createdAt: asDate(row.created_at),
        actorName: asString(row.actor_name, "System"),
        actorEmail: asString(row.actor_email),
        actorRole: asString(row.actor_role),
      };
      return { ...log, integrityHash: hashLog(log) };
    });
    const total = asNumber(countRows[0]?.total);
    const summary = summaryRows[0] || {};
    const integrity = integritySummary(logs);

    if (exportFormat === "json") {
      await writeTenantAuditLog({ db: tenantDb, request, actorId: currentUser.userId, action: "admin.audit.exported", resource: "audit_logs", resourceId: slug, changes: { format: "json", filters: { query, status, severity, resource, actor, startDate, endDate }, rowCount: logs.length } }).catch(() => undefined);
      return NextResponse.json({ school, logs, exportedAt: new Date().toISOString(), filters: { query, status, severity, resource, actor, startDate, endDate } }, {
        headers: { "Cache-Control": "no-store, max-age=0", "Content-Disposition": `attachment; filename="${slug}-admin-audit-logs.json"` },
      });
    }
    if (exportFormat === "csv") {
      await writeTenantAuditLog({ db: tenantDb, request, actorId: currentUser.userId, action: "admin.audit.exported", resource: "audit_logs", resourceId: slug, changes: { format: "csv", filters: { query, status, severity, resource, actor, startDate, endDate }, rowCount: logs.length } }).catch(() => undefined);
      return new NextResponse(logsToCsv(logs), {
        headers: { "Content-Type": "text/csv; charset=utf-8", "Cache-Control": "no-store, max-age=0", "Content-Disposition": `attachment; filename="${slug}-admin-audit-logs.csv"` },
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
      filters: { query, status, severity, resource, actor, startDate, endDate },
      retention: {
        policy: `Tenant audit logs are retained for ${retentionDays} days unless exported or archived externally.`,
        retentionDays,
        immutable: true,
        integrity: "sha256-per-row",
        exportLimit: 5000,
        archiveProvider: asString(settings.auditArchiveProvider, "local"),
      },
      integrity,
      generatedAt: new Date().toISOString(),
    }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    console.error("Admin audit GET failed:", error);
    return NextResponse.json({ error: "Failed to load admin audit logs" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const slug = (params.get("tenant") || params.get("slug") || "").trim().toLowerCase();
    if (!slug) return NextResponse.json({ error: "Tenant slug is required" }, { status: 400 });
    const currentUser = await requireTenantAdmin(request, slug);
    if (isTenantAdminResponse(currentUser)) return currentUser;
    if (currentUser.role !== "owner") return NextResponse.json({ error: "Only the tenant owner can run audit retention actions" }, { status: 403 });

    const body = await request.json().catch(() => ({}));
    const action = asString(body.action);
    const school = await getSchool(slug);
    if (!school) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    const tenantDb = await getTenantDbBySlug(slug);

    if (action === "prune_retention") {
      const [settingsRow] = await safeRows<Row>(() => tenantDb.execute(sql`select value from system_settings where key in (${`tenant_settings:${slug}`}, 'tenant_settings') order by case when key = ${`tenant_settings:${slug}`} then 0 else 1 end limit 1`), "settings");
      const settings = settingsRow?.value && typeof settingsRow.value === "object" ? settingsRow.value as Row : {};
      const retentionDays = Math.max(30, Math.min(3650, Number(settings.auditRetentionDays || 730) || 730));
      const cutoff = new Date(Date.now() - retentionDays * 86400000);
      const deletedRows = await safeRows<Row>(() => tenantDb.execute(sql`delete from audit_logs where created_at < ${cutoff} returning id`), "retention prune");
      await writeTenantAuditLog({ db: tenantDb, request, actorId: currentUser.userId, action: "admin.audit.retention_pruned", resource: "audit_logs", resourceId: slug, changes: { retentionDays, cutoff: cutoff.toISOString(), deleted: deletedRows.length } }).catch(() => undefined);
      return NextResponse.json({ success: true, retentionDays, cutoff: cutoff.toISOString(), deleted: deletedRows.length }, { headers: { "Cache-Control": "no-store, max-age=0" } });
    }

    if (action === "archive_retention") {
      const [settingsRow] = await safeRows<Row>(() => tenantDb.execute(sql`select value from system_settings where key in (${`tenant_settings:${slug}`}, 'tenant_settings') order by case when key = ${`tenant_settings:${slug}`} then 0 else 1 end limit 1`), "settings");
      const settings = settingsRow?.value && typeof settingsRow.value === "object" ? settingsRow.value as Row : {};
      const retentionDays = Math.max(30, Math.min(3650, Number(settings.auditRetentionDays || 730) || 730));
      const cutoff = new Date(Date.now() - retentionDays * 86400000);
      const rows = await safeRows<Row>(() => tenantDb.execute(sql`
        select a.id, a.admin_id, a.action, a.resource, a.resource_id, a.changes, a.ip_address, a.user_agent, a.status, a.created_at,
          coalesce(u.name, a.admin_id, 'System') as actor_name,
          coalesce(u.email, '') as actor_email,
          coalesce(r.name, u.role_id, '') as actor_role
        from audit_logs a
        left join users u on u.id = a.admin_id
        left join roles r on r.id = u.role_id
        where a.created_at < ${cutoff}
        order by a.created_at asc
        limit 5000
      `), "archive retention logs");
      const logs = rows.map((row) => {
        const actionValue = asString(row.action, "Activity");
        const statusValue = asString(row.status, "success");
        const log = {
          id: asString(row.id),
          adminId: asString(row.admin_id),
          action: actionValue,
          resource: asString(row.resource, "system"),
          resourceId: asString(row.resource_id),
          changes: row.changes || {},
          ipAddress: asString(row.ip_address),
          userAgent: asString(row.user_agent),
          status: statusValue,
          severity: severityFor(actionValue, statusValue),
          createdAt: asDate(row.created_at),
          actorName: asString(row.actor_name, "System"),
          actorEmail: asString(row.actor_email),
          actorRole: asString(row.actor_role),
        };
        return { ...log, integrityHash: hashLog(log) };
      });
      if (!logs.length) {
        return NextResponse.json({ success: true, archived: 0, message: "No logs are older than the retention cutoff." }, { headers: { "Cache-Control": "no-store, max-age=0" } });
      }
      const exportedAt = new Date().toISOString();
      const archiveBody = JSON.stringify({ school, tenant: slug, exportedAt, cutoff: cutoff.toISOString(), retentionDays, integrity: integritySummary(logs), logs }, null, 2);
      const archive = await archiveAuditLogs({
        tenant: slug,
        filename: `${slug}-audit-${new Date().toISOString().slice(0, 10)}-${Date.now()}.json`,
        contentType: "application/json; charset=utf-8",
        body: archiveBody,
        retentionDays,
        metadata: { cutoff: cutoff.toISOString(), rowCount: logs.length },
      });
      await writeTenantAuditLog({ db: tenantDb, request, actorId: currentUser.userId, action: "admin.audit.retention_archived", resource: "audit_logs", resourceId: slug, changes: { retentionDays, cutoff: cutoff.toISOString(), archived: logs.length, archive } }).catch(() => undefined);
      return NextResponse.json({ success: archive.ok, archived: logs.length, archive, cutoff: cutoff.toISOString(), retentionDays }, { status: archive.ok ? 200 : 502, headers: { "Cache-Control": "no-store, max-age=0" } });
    }

    if (action === "verify_integrity") {
      const rows = await safeRows<Row>(() => tenantDb.execute(sql`
        select a.id, a.admin_id, a.action, a.resource, a.resource_id, a.changes, a.ip_address, a.user_agent, a.status, a.created_at,
          coalesce(u.name, a.admin_id, 'System') as actor_name,
          coalesce(u.email, '') as actor_email,
          coalesce(r.name, u.role_id, '') as actor_role
        from audit_logs a
        left join users u on u.id = a.admin_id
        left join roles r on r.id = u.role_id
        order by a.created_at desc
        limit 5000
      `), "integrity verify");
      const logs = rows.map((row) => {
        const actionValue = asString(row.action, "Activity");
        const statusValue = asString(row.status, "success");
        const log = {
          id: asString(row.id),
          adminId: asString(row.admin_id),
          action: actionValue,
          resource: asString(row.resource, "system"),
          resourceId: asString(row.resource_id),
          changes: row.changes || {},
          ipAddress: asString(row.ip_address),
          userAgent: asString(row.user_agent),
          status: statusValue,
          severity: severityFor(actionValue, statusValue),
          createdAt: asDate(row.created_at),
          actorName: asString(row.actor_name, "System"),
          actorEmail: asString(row.actor_email),
          actorRole: asString(row.actor_role),
        };
        return { ...log, integrityHash: hashLog(log) };
      });
      const integrity = integritySummary(logs);
      await writeTenantAuditLog({ db: tenantDb, request, actorId: currentUser.userId, action: "admin.audit.integrity_verified", resource: "audit_logs", resourceId: slug, changes: integrity }).catch(() => undefined);
      return NextResponse.json({ success: true, integrity }, { headers: { "Cache-Control": "no-store, max-age=0" } });
    }

    return NextResponse.json({ error: "Unsupported audit action" }, { status: 400 });
  } catch (error) {
    console.error("Admin audit POST failed:", error);
    return NextResponse.json({ error: "Failed to run audit action" }, { status: 500 });
  }
}
