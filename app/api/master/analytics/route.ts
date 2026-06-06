import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, gte, lte, sql } from "drizzle-orm";

import { masterDb } from "@/lib/db";
import {
  accountTable,
  auditLogsTable,
  invoicesTable,
  platformAdminsTable,
  schoolsTable,
  sessionTable,
  subscriptionPlansTable,
  subscriptionsTable,
  tenantModulesTable,
  userTable,
} from "@/lib/db-schema";
import { requireMasterAdmin, writeMasterAudit } from "@/lib/master-audit";
import { getCachedValue, setCachedValue } from "@/lib/server-response-cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ANALYTICS_CACHE_KEY = "master-analytics:overview";
const ANALYTICS_CACHE_TTL_MS = 20_000;

function toNumber(value: unknown) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function monthStart(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function makeMonthSeries(months = 6) {
  const rows: Array<{ key: string; month: string; revenue: number; invoices: number; schools: number; subscriptions: number }> = [];
  const now = monthStart();
  for (let index = months - 1; index >= 0; index -= 1) {
    const date = new Date(now);
    date.setMonth(date.getMonth() - index);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    rows.push({
      key,
      month: date.toLocaleDateString("en", { month: "short", year: "2-digit" }),
      revenue: 0,
      invoices: 0,
      schools: 0,
      subscriptions: 0,
    });
  }
  return rows;
}

function csvEscape(value: unknown) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function analyticsCsv(payload: Record<string, unknown>) {
  const stats = payload.stats as Record<string, unknown>;
  const operations = payload.operations as Record<string, unknown>;
  const rows = [
    ["Section", "Metric", "Value"],
    ...Object.entries(stats || {}).map(([key, value]) => ["Stats", key, value]),
    ...Object.entries(operations || {}).map(([key, value]) => ["Operations", key, value]),
  ];
  return rows.map((row) => row.map(csvEscape).join(",")).join("\n");
}

async function buildAnalyticsPayload(started: number) {
  const now = new Date();
  const thisMonth = monthStart(now);
  const sixMonthsAgo = new Date(thisMonth);
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDaysFromNow = new Date(now);
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

  const [
    schoolRows,
    subscriptionRows,
    invoiceRows,
    adminRows,
    userRows,
    accountRows,
    activeSessionRows,
    moduleRows,
    auditRows30d,
    recentActivityRows,
    planDistributionRows,
    typeDistributionRows,
    schoolStatusRows,
    invoiceStatusRows,
    moduleAdoptionRows,
    topSchoolRevenueRows,
    expiringRows,
    dbStatsRows,
  ] = await Promise.all([
    masterDb.select().from(schoolsTable),
    masterDb
      .select({
        id: subscriptionsTable.id,
        status: subscriptionsTable.status,
        endDate: subscriptionsTable.endDate,
        createdAt: subscriptionsTable.createdAt,
        price: subscriptionPlansTable.price,
        planName: subscriptionPlansTable.name,
      })
      .from(subscriptionsTable)
      .leftJoin(subscriptionPlansTable, eq(subscriptionsTable.planId, subscriptionPlansTable.id)),
    masterDb.select().from(invoicesTable),
    masterDb.select({ count: sql<number>`count(*)` }).from(platformAdminsTable),
    masterDb.select({ count: sql<number>`count(*)` }).from(userTable),
    masterDb.select({ count: sql<number>`count(*)` }).from(accountTable),
    masterDb.select({ count: sql<number>`count(*)` }).from(sessionTable).where(gte(sessionTable.expiresAt, now)),
    masterDb.select().from(tenantModulesTable),
    masterDb
      .select()
      .from(auditLogsTable)
      .where(gte(auditLogsTable.createdAt, thirtyDaysAgo)),
    masterDb
      .select({
        id: auditLogsTable.id,
        action: auditLogsTable.action,
        resource: auditLogsTable.resource,
        status: auditLogsTable.status,
        createdAt: auditLogsTable.createdAt,
        adminName: platformAdminsTable.name,
      })
      .from(auditLogsTable)
      .leftJoin(platformAdminsTable, eq(auditLogsTable.adminId, platformAdminsTable.id))
      .orderBy(desc(auditLogsTable.createdAt))
      .limit(12),
    masterDb
      .select({
        name: subscriptionPlansTable.name,
        value: sql<number>`count(${subscriptionsTable.id})`,
        revenue: sql<string>`coalesce(sum(case when ${subscriptionsTable.status} = 'active' then ${subscriptionPlansTable.price} else 0 end), 0)`,
      })
      .from(subscriptionPlansTable)
      .leftJoin(subscriptionsTable, eq(subscriptionPlansTable.id, subscriptionsTable.planId))
      .groupBy(subscriptionPlansTable.name)
      .orderBy(subscriptionPlansTable.name),
    masterDb
      .select({ type: schoolsTable.type, count: sql<number>`count(${schoolsTable.id})` })
      .from(schoolsTable)
      .groupBy(schoolsTable.type)
      .orderBy(schoolsTable.type),
    masterDb
      .select({ status: schoolsTable.status, count: sql<number>`count(${schoolsTable.id})` })
      .from(schoolsTable)
      .groupBy(schoolsTable.status)
      .orderBy(schoolsTable.status),
    masterDb
      .select({ status: invoicesTable.status, count: sql<number>`count(${invoicesTable.id})`, amount: sql<string>`coalesce(sum(${invoicesTable.amount}), 0)` })
      .from(invoicesTable)
      .groupBy(invoicesTable.status)
      .orderBy(invoicesTable.status),
    masterDb
      .select({
        moduleKey: tenantModulesTable.moduleKey,
        moduleName: tenantModulesTable.moduleName,
        enabledSchools: sql<number>`count(distinct ${tenantModulesTable.schoolId}) filter (where ${tenantModulesTable.isEnabled} = true)`,
      })
      .from(tenantModulesTable)
      .groupBy(tenantModulesTable.moduleKey, tenantModulesTable.moduleName)
      .orderBy(desc(sql`count(distinct ${tenantModulesTable.schoolId}) filter (where ${tenantModulesTable.isEnabled} = true)`))
      .limit(10),
    masterDb
      .select({
        schoolId: schoolsTable.id,
        schoolName: schoolsTable.name,
        schoolSlug: schoolsTable.slug,
        revenue: sql<string>`coalesce(sum(${invoicesTable.amount}) filter (where ${invoicesTable.status} = 'paid'), 0)`,
        outstanding: sql<string>`coalesce(sum(${invoicesTable.amount}) filter (where ${invoicesTable.status} in ('pending', 'overdue')), 0)`,
        invoices: sql<number>`count(${invoicesTable.id})`,
      })
      .from(schoolsTable)
      .leftJoin(invoicesTable, eq(invoicesTable.schoolId, schoolsTable.id))
      .groupBy(schoolsTable.id, schoolsTable.name, schoolsTable.slug)
      .orderBy(desc(sql`coalesce(sum(${invoicesTable.amount}) filter (where ${invoicesTable.status} = 'paid'), 0)`))
      .limit(8),
    masterDb
      .select({
        id: subscriptionsTable.id,
        schoolName: schoolsTable.name,
        planName: subscriptionPlansTable.name,
        status: subscriptionsTable.status,
        endDate: subscriptionsTable.endDate,
      })
      .from(subscriptionsTable)
      .leftJoin(schoolsTable, eq(subscriptionsTable.schoolId, schoolsTable.id))
      .leftJoin(subscriptionPlansTable, eq(subscriptionsTable.planId, subscriptionPlansTable.id))
      .where(and(eq(subscriptionsTable.status, "active"), lte(subscriptionsTable.endDate, thirtyDaysFromNow)))
      .orderBy(subscriptionsTable.endDate)
      .limit(8),
    masterDb.execute(sql`
      select
        pg_database_size(current_database())::bigint as database_bytes,
        pg_size_pretty(pg_database_size(current_database())) as database_size,
        (select count(*) from information_schema.tables where table_schema = 'public')::int as table_count,
        (select coalesce(sum(n_live_tup), 0)::bigint from pg_stat_user_tables) as estimated_rows
    `),
  ]);

  const dbStats = (dbStatsRows.rows?.[0] || {}) as {
    database_bytes?: string | number;
    database_size?: string;
    table_count?: string | number;
    estimated_rows?: string | number;
  };

  const activeSchools = schoolRows.filter((school) => school.status === "active").length;
  const activeSubscriptions = subscriptionRows.filter((subscription) => subscription.status === "active");
  const mrr = activeSubscriptions.reduce((sum, subscription) => sum + toNumber(subscription.price), 0);
  const paidRevenue = invoiceRows.filter((invoice) => invoice.status === "paid").reduce((sum, invoice) => sum + toNumber(invoice.amount), 0);
  const outstanding = invoiceRows.filter((invoice) => ["pending", "overdue"].includes(invoice.status)).reduce((sum, invoice) => sum + toNumber(invoice.amount), 0);
  const overdueInvoices = invoiceRows.filter((invoice) => invoice.status === "overdue" || (invoice.status === "pending" && invoice.dueDate < now)).length;
  const newSchoolsThisMonth = schoolRows.filter((school) => school.createdAt >= thisMonth).length;
  const newSubscriptionsThisMonth = subscriptionRows.filter((subscription) => subscription.createdAt >= thisMonth).length;
  const failedAuditEvents = auditRows30d.filter((event) => event.status !== "success").length;
  const auditFailureRate = auditRows30d.length ? (failedAuditEvents / auditRows30d.length) * 100 : 0;

  const series = makeMonthSeries(6);
  const byKey = new Map(series.map((row) => [row.key, row]));
  for (const invoice of invoiceRows) {
    const date = invoice.issueDate;
    if (!date || date < sixMonthsAgo) continue;
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const row = byKey.get(key);
    if (!row) continue;
    row.invoices += 1;
    if (invoice.status === "paid") row.revenue += toNumber(invoice.amount);
  }
  for (const school of schoolRows) {
    const date = school.createdAt;
    if (!date || date < sixMonthsAgo) continue;
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const row = byKey.get(key);
    if (row) row.schools += 1;
  }
  for (const subscription of subscriptionRows) {
    const date = subscription.createdAt;
    if (!date || date < sixMonthsAgo) continue;
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const row = byKey.get(key);
    if (row) row.subscriptions += 1;
  }

  const enabledModules = moduleRows.filter((module) => module.isEnabled).length;
  const totalModules = moduleRows.length;
  const systemScore = Math.max(0, Math.min(100, 100 - auditFailureRate * 2 - overdueInvoices * 1.5));
  const dbLatencyMs = Date.now() - started;
  const sessionUtilization = toNumber(activeSessionRows[0]?.count);

  return {
    generatedAt: now.toISOString(),
    stats: {
      totalSchools: schoolRows.length,
      activeSchools,
      inactiveSchools: schoolRows.length - activeSchools,
      mrr,
      paidRevenue,
      outstanding,
      totalInvoices: invoiceRows.length,
      overdueInvoices,
      platformAdmins: toNumber(adminRows[0]?.count),
      authUsers: toNumber(userRows[0]?.count),
      credentialAccounts: toNumber(accountRows[0]?.count),
      activeSessions: sessionUtilization,
      activeSubscriptions: activeSubscriptions.length,
      newSchoolsThisMonth,
      newSubscriptionsThisMonth,
      enabledModules,
      totalModules,
      auditEvents30d: auditRows30d.length,
      failedAuditEvents,
      auditFailureRate,
      systemScore,
    },
    operations: {
      databaseSize: dbStats.database_size || "N/A",
      databaseBytes: toNumber(dbStats.database_bytes),
      tableCount: toNumber(dbStats.table_count),
      estimatedRows: toNumber(dbStats.estimated_rows),
      dbQueryLatencyMs: dbLatencyMs,
      connectionSecurity: process.env.DATABASE_URL?.includes("sslmode=require") || process.env.DATABASE_URL?.includes("sslmode=verify")
        ? "SSL required"
        : "SSL not declared",
    },
    revenueTrend: series.map(({ month, revenue, invoices }) => ({ month, amount: revenue, invoices })),
    schoolGrowth: series.map(({ month, schools, subscriptions }) => ({ month, count: schools, subscriptions })),
    recentProvisionings: series.map(({ month, schools }) => ({ month, count: schools })),
    planDistribution: planDistributionRows.map((plan, index) => ({
      name: plan.name || "No Plan",
      value: toNumber(plan.value),
      revenue: toNumber(plan.revenue),
      color: ["#f97316", "#22c55e", "#0ea5e9", "#f59e0b", "#8b5cf6", "#ef4444"][index % 6],
    })),
    schoolTypeDistribution: typeDistributionRows.map((row) => ({ type: row.type || "unspecified", count: toNumber(row.count) })),
    schoolStatusDistribution: schoolStatusRows.map((row) => ({ status: row.status || "unknown", count: toNumber(row.count) })),
    invoiceStatusDistribution: invoiceStatusRows.map((row) => ({ status: row.status || "unknown", count: toNumber(row.count), amount: toNumber(row.amount) })),
    moduleAdoption: moduleAdoptionRows.map((row) => ({
      moduleKey: row.moduleKey,
      moduleName: row.moduleName,
      enabledSchools: toNumber(row.enabledSchools),
    })),
    topSchoolsByRevenue: topSchoolRevenueRows.map((row) => ({
      schoolId: row.schoolId,
      schoolName: row.schoolName,
      schoolSlug: row.schoolSlug,
      revenue: toNumber(row.revenue),
      outstanding: toNumber(row.outstanding),
      invoices: toNumber(row.invoices),
    })),
    expiringSubscriptions: expiringRows.map((row) => ({
      id: row.id,
      schoolName: row.schoolName || "Unknown school",
      planName: row.planName || "No Plan",
      status: row.status,
      endDate: row.endDate,
    })),
    recentActivity: recentActivityRows.map((activity) => ({
      id: activity.id,
      action: activity.action,
      resource: activity.resource,
      status: activity.status,
      createdAt: activity.createdAt,
      adminName: activity.adminName || "System",
    })),
    alerts: [
      overdueInvoices > 0
        ? { severity: "warning", title: `${overdueInvoices} overdue invoices`, description: "Collection follow-up is required.", href: "/master/billing/invoices?status=overdue" }
        : null,
      failedAuditEvents > 0
        ? { severity: "critical", title: `${failedAuditEvents} failed audit events`, description: "Review recent platform activity.", href: "/master/activity" }
        : null,
      expiringRows.length > 0
        ? { severity: "info", title: `${expiringRows.length} subscriptions expiring soon`, description: "Subscriptions ending within 30 days.", href: "/master/schools" }
        : null,
    ].filter(Boolean),
  };
}

export async function GET(request: NextRequest) {
  const started = Date.now();
  try {
    const { admin, response } = await requireMasterAdmin(request);
    if (response) return response;

    const exportFormat = request.nextUrl.searchParams.get("export");
    if (!exportFormat) {
      const cached = getCachedValue<Record<string, unknown>>(ANALYTICS_CACHE_KEY);
      if (cached) {
        return NextResponse.json(cached, { headers: { "Cache-Control": "private, max-age=20" } });
      }
    }

    const payload = await buildAnalyticsPayload(started);

    if (exportFormat === "csv") {
      await writeMasterAudit(request, {
        adminId: admin.adminId,
        action: "System Analytics Exported",
        resource: "system_analytics",
        resourceId: "csv",
        changes: { format: "csv", generatedAt: payload.generatedAt },
      });
      return new NextResponse(analyticsCsv(payload), {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="roxan-system-analytics-${new Date().toISOString().slice(0, 10)}.csv"`,
          "Cache-Control": "no-store",
        },
      });
    }

    if (exportFormat === "json") {
      await writeMasterAudit(request, {
        adminId: admin.adminId,
        action: "System Analytics Exported",
        resource: "system_analytics",
        resourceId: "json",
        changes: { format: "json", generatedAt: payload.generatedAt },
      });
      return NextResponse.json(payload, {
        headers: {
          "Content-Disposition": `attachment; filename="roxan-system-analytics-${new Date().toISOString().slice(0, 10)}.json"`,
          "Cache-Control": "no-store",
        },
      });
    }

    setCachedValue(ANALYTICS_CACHE_KEY, payload, ANALYTICS_CACHE_TTL_MS);
    return NextResponse.json(payload, { headers: { "Cache-Control": "private, max-age=20" } });
  } catch (error) {
    console.error("Failed to fetch analytics:", error);
    return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 });
  }
}
