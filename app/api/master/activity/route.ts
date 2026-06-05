import { NextRequest, NextResponse } from "next/server";
import { desc, eq, lt, sql } from "drizzle-orm";
import type { SQL } from "drizzle-orm";

import { masterDb } from "@/lib/db";
import { auditLogsTable, platformAdminsTable } from "@/lib/db-schema";
import { asNumber, getPlatformSettings } from "@/lib/platform-settings-server";
import { requireMasterAdmin, writeMasterAudit } from "@/lib/master-audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_LIMIT = 100;
const MAX_EXPORT_LIMIT = 5000;

function toNumber(value: unknown) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function clean(value: string | null) {
  const next = value?.trim();
  return next && next !== "all" ? next : null;
}

function parseLimit(value: string | null) {
  const parsed = Number(value || 25);
  if (!Number.isFinite(parsed)) return 25;
  return Math.max(1, Math.min(MAX_LIMIT, Math.trunc(parsed)));
}

function parseOffset(value: string | null) {
  const parsed = Number(value || 0);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.trunc(parsed));
}

function parseDate(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function summarizeDevice(userAgent: string | null) {
  if (!userAgent) return "Unknown device";
  const browser = userAgent.includes("Edg/")
    ? "Edge"
    : userAgent.includes("Chrome/")
      ? "Chrome"
      : userAgent.includes("Firefox/")
        ? "Firefox"
        : userAgent.includes("Safari/")
          ? "Safari"
          : "Browser";
  const os = userAgent.includes("Windows")
    ? "Windows"
    : userAgent.includes("Mac OS")
      ? "macOS"
      : userAgent.includes("Android")
        ? "Android"
        : userAgent.includes("iPhone") || userAgent.includes("iPad")
          ? "iOS"
          : "Unknown OS";
  return `${browser} on ${os}`;
}

function csvEscape(value: unknown) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function auditCsv(logs: Array<{
  createdAt: string | null;
  user: string;
  adminEmail: string | null;
  action: string;
  resource: string;
  resourceId: string | null;
  status: string;
  ip: string;
  device: string;
  details: string;
}>) {
  const header = ["Timestamp", "User", "Email", "Action", "Resource", "Resource ID", "Status", "IP Address", "Device", "Details"];
  const rows = logs.map((log) => [
    log.createdAt,
    log.user,
    log.adminEmail || "",
    log.action,
    log.resource,
    log.resourceId || "",
    log.status,
    log.ip,
    log.device,
    log.details,
  ]);
  return [header, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n");
}

function buildWhere(searchParams: URLSearchParams) {
  const q = clean(searchParams.get("q"));
  const status = clean(searchParams.get("status"));
  const resource = clean(searchParams.get("resource"));
  const action = clean(searchParams.get("action"));
  const adminId = clean(searchParams.get("adminId"));
  const from = parseDate(searchParams.get("from"));
  const to = parseDate(searchParams.get("to"));
  const clauses: SQL[] = [sql`true`];

  if (q) {
    const term = `%${q}%`;
    clauses.push(sql`(
      ${auditLogsTable.action} ilike ${term}
      or ${auditLogsTable.resource} ilike ${term}
      or coalesce(${auditLogsTable.resourceId}, '') ilike ${term}
      or coalesce(${auditLogsTable.ipAddress}, '') ilike ${term}
      or coalesce(${platformAdminsTable.name}, '') ilike ${term}
      or coalesce(${platformAdminsTable.email}, '') ilike ${term}
    )`);
  }

  if (status) clauses.push(sql`${auditLogsTable.status} = ${status}`);
  if (resource) clauses.push(sql`${auditLogsTable.resource} = ${resource}`);
  if (action) clauses.push(sql`${auditLogsTable.action} = ${action}`);
  if (adminId) clauses.push(sql`${auditLogsTable.adminId} = ${adminId}`);
  if (from) clauses.push(sql`${auditLogsTable.createdAt} >= ${from}`);
  if (to) clauses.push(sql`${auditLogsTable.createdAt} <= ${to}`);

  return sql.join(clauses, sql` and `);
}

export async function GET(request: NextRequest) {
  try {
    const { response } = await requireMasterAdmin(request);
    if (response) return response;

    const { searchParams } = new URL(request.url);
    const exportFormat = clean(searchParams.get("export"));
    const limit = exportFormat ? MAX_EXPORT_LIMIT : parseLimit(searchParams.get("limit"));
    const offset = parseOffset(searchParams.get("offset"));
    const where = buildWhere(searchParams);
    const now = new Date();
    const last24h = new Date(now);
    last24h.setHours(last24h.getHours() - 24);
    const timelineStart = new Date(now);
    timelineStart.setDate(timelineStart.getDate() - 13);
    timelineStart.setHours(0, 0, 0, 0);

    const [
      logRows,
      summaryRows,
      statusRows,
      resourceRows,
      actionRows,
      adminRows,
      timelineRows,
      riskRows,
    ] = await Promise.all([
      masterDb
        .select({
          id: auditLogsTable.id,
          createdAt: auditLogsTable.createdAt,
          adminId: auditLogsTable.adminId,
          adminName: platformAdminsTable.name,
          adminEmail: platformAdminsTable.email,
          adminRole: platformAdminsTable.role,
          action: auditLogsTable.action,
          resource: auditLogsTable.resource,
          resourceId: auditLogsTable.resourceId,
          ipAddress: auditLogsTable.ipAddress,
          userAgent: auditLogsTable.userAgent,
          status: auditLogsTable.status,
          changes: auditLogsTable.changes,
        })
        .from(auditLogsTable)
        .leftJoin(platformAdminsTable, eq(auditLogsTable.adminId, platformAdminsTable.id))
        .where(where)
        .orderBy(desc(auditLogsTable.createdAt))
        .limit(limit)
        .offset(offset),
      masterDb
        .select({
          total: sql<number>`count(*)::int`,
          success: sql<number>`count(*) filter (where ${auditLogsTable.status} = 'success')::int`,
          failed: sql<number>`count(*) filter (where ${auditLogsTable.status} <> 'success')::int`,
          last24h: sql<number>`count(*) filter (where ${auditLogsTable.createdAt} >= ${last24h})::int`,
          uniqueAdmins: sql<number>`count(distinct ${auditLogsTable.adminId})::int`,
        })
        .from(auditLogsTable)
        .leftJoin(platformAdminsTable, eq(auditLogsTable.adminId, platformAdminsTable.id))
        .where(where),
      masterDb
        .select({ status: auditLogsTable.status, count: sql<number>`count(*)::int` })
        .from(auditLogsTable)
        .groupBy(auditLogsTable.status)
        .orderBy(auditLogsTable.status),
      masterDb
        .select({ resource: auditLogsTable.resource, count: sql<number>`count(*)::int` })
        .from(auditLogsTable)
        .groupBy(auditLogsTable.resource)
        .orderBy(desc(sql`count(*)`))
        .limit(30),
      masterDb
        .select({ action: auditLogsTable.action, count: sql<number>`count(*)::int` })
        .from(auditLogsTable)
        .groupBy(auditLogsTable.action)
        .orderBy(desc(sql`count(*)`))
        .limit(50),
      masterDb
        .select({
          id: platformAdminsTable.id,
          name: platformAdminsTable.name,
          email: platformAdminsTable.email,
          count: sql<number>`count(${auditLogsTable.id})::int`,
        })
        .from(platformAdminsTable)
        .leftJoin(auditLogsTable, eq(auditLogsTable.adminId, platformAdminsTable.id))
        .groupBy(platformAdminsTable.id, platformAdminsTable.name, platformAdminsTable.email)
        .orderBy(desc(sql`count(${auditLogsTable.id})`)),
      masterDb
        .select({
          date: sql<string>`to_char(${auditLogsTable.createdAt}, 'YYYY-MM-DD')`,
          success: sql<number>`count(*) filter (where ${auditLogsTable.status} = 'success')::int`,
          failed: sql<number>`count(*) filter (where ${auditLogsTable.status} <> 'success')::int`,
          total: sql<number>`count(*)::int`,
        })
        .from(auditLogsTable)
        .leftJoin(platformAdminsTable, eq(auditLogsTable.adminId, platformAdminsTable.id))
        .where(sql`${where} and ${auditLogsTable.createdAt} >= ${timelineStart}`)
        .groupBy(sql`to_char(${auditLogsTable.createdAt}, 'YYYY-MM-DD')`)
        .orderBy(sql`to_char(${auditLogsTable.createdAt}, 'YYYY-MM-DD')`),
      masterDb
        .select({
          id: auditLogsTable.id,
          createdAt: auditLogsTable.createdAt,
          action: auditLogsTable.action,
          resource: auditLogsTable.resource,
          status: auditLogsTable.status,
          adminName: platformAdminsTable.name,
          adminEmail: platformAdminsTable.email,
          ipAddress: auditLogsTable.ipAddress,
        })
        .from(auditLogsTable)
        .leftJoin(platformAdminsTable, eq(auditLogsTable.adminId, platformAdminsTable.id))
        .where(sql`${where} and ${auditLogsTable.status} <> 'success'`)
        .orderBy(desc(auditLogsTable.createdAt))
        .limit(8),
    ]);

    const summary = summaryRows[0] || { total: 0, success: 0, failed: 0, last24h: 0, uniqueAdmins: 0 };
    const total = toNumber(summary.total);
    const success = toNumber(summary.success);
    const failed = toNumber(summary.failed);
    const failureRate = total ? (failed / total) * 100 : 0;

    const logs = logRows.map((log) => ({
      ...log,
      createdAt: log.createdAt?.toISOString() || null,
      timestamp: log.createdAt ? log.createdAt.toISOString().replace("T", " ").substring(0, 19) : "N/A",
      user: log.adminName || log.adminEmail || "System",
      ip: log.ipAddress || "N/A",
      details: typeof log.changes === "string" ? log.changes : JSON.stringify(log.changes || {}, null, 2),
      device: summarizeDevice(log.userAgent),
    }));

    if (exportFormat === "csv") {
      return new NextResponse(auditCsv(logs), {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="roxan-activity-log-${now.toISOString().slice(0, 10)}.csv"`,
          "Cache-Control": "no-store",
        },
      });
    }

    const payload = {
      generatedAt: now.toISOString(),
      logs,
      summary: {
        total,
        success,
        failed,
        last24h: toNumber(summary.last24h),
        uniqueAdmins: toNumber(summary.uniqueAdmins),
        successRate: total ? (success / total) * 100 : 0,
        failureRate,
      },
      facets: {
        statuses: statusRows.map((row) => ({ value: row.status, count: toNumber(row.count) })),
        resources: resourceRows.map((row) => ({ value: row.resource, count: toNumber(row.count) })),
        actions: actionRows.map((row) => ({ value: row.action, count: toNumber(row.count) })),
        admins: adminRows.map((row) => ({ ...row, count: toNumber(row.count) })),
      },
      timeline: timelineRows.map((row) => ({
        date: row.date,
        label: new Date(`${row.date}T00:00:00`).toLocaleDateString("en", { month: "short", day: "numeric" }),
        success: toNumber(row.success),
        failed: toNumber(row.failed),
        total: toNumber(row.total),
      })),
      riskEvents: riskRows.map((row) => ({
        ...row,
        createdAt: row.createdAt?.toISOString() || null,
        adminName: row.adminName || row.adminEmail || "System",
        ipAddress: row.ipAddress || "N/A",
      })),
      pagination: {
        limit,
        offset,
        total,
        hasMore: offset + limit < total,
      },
    };

    if (exportFormat === "json") {
      return NextResponse.json(payload, {
        headers: {
          "Content-Disposition": `attachment; filename="roxan-activity-log-${now.toISOString().slice(0, 10)}.json"`,
          "Cache-Control": "no-store",
        },
      });
    }

    return NextResponse.json(payload);
  } catch (error) {
    console.error("Error fetching activity logs:", error);
    return NextResponse.json(
      { logs: [], error: "Failed to fetch activity logs" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { admin, response } = await requireMasterAdmin(request);
    if (response) return response;

    const settings = await getPlatformSettings();
    const retentionDays = Math.max(1, asNumber(settings.auditRetentionDays, 365));
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - retentionDays);

    const deleted = await masterDb
      .delete(auditLogsTable)
      .where(lt(auditLogsTable.createdAt, cutoff))
      .returning({ id: auditLogsTable.id });

    await writeMasterAudit(request, {
      adminId: admin.adminId,
      action: "Audit Logs Retention Purged",
      resource: "audit_logs",
      resourceId: "retention",
      changes: { retentionDays, cutoff: cutoff.toISOString(), deletedCount: deleted.length },
    });

    return NextResponse.json({
      success: true,
      retentionDays,
      cutoff: cutoff.toISOString(),
      deletedCount: deleted.length,
    });
  } catch (error) {
    console.error("Error purging activity logs:", error);
    return NextResponse.json({ error: "Failed to purge activity logs" }, { status: 500 });
  }
}
