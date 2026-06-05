import { NextResponse } from "next/server";
import { and, asc, desc, eq, gte, lte, sql } from "drizzle-orm";

import { masterDb } from "@/lib/db";
import {
  auditLogsTable,
  invoicesTable,
  platformAdminsTable,
  schoolsTable,
  subscriptionPlansTable,
  subscriptionsTable,
  tenantModulesTable,
} from "@/lib/db-schema";
import { getCachedValue, setCachedValue } from "@/lib/server-response-cache";

const currencyFormatter = new Intl.NumberFormat("en-ZA", {
  style: "currency",
  currency: "ZAR",
  maximumFractionDigits: 0,
});

function toNumber(value: unknown) {
  return Number(value || 0);
}

function formatDate(value: Date | string | null | undefined) {
  if (!value) return "N/A";
  return new Date(value).toLocaleDateString("en", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function monthStart(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export async function GET() {
  try {
    const cached = getCachedValue<Record<string, unknown>>("master-dashboard");
    if (cached) {
      return NextResponse.json(cached, {
        headers: {
          "Cache-Control": "private, max-age=30",
          "X-Roxan-Cache": "HIT",
        },
      });
    }

    const now = new Date();
    const thisMonth = monthStart(now);
    const previousMonth = new Date(thisMonth);
    previousMonth.setMonth(previousMonth.getMonth() - 1);
    const sixMonthsAgo = new Date(thisMonth);
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    const thirtyDaysFromNow = new Date(now);
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const [
      schoolRows,
      subscriptionRows,
      invoiceRows,
      platformAdminRows,
      moduleRows,
      recentSchoolsData,
      recentInvoicesData,
      expiringSubscriptionsData,
      recentActivityData,
      revenueTrendData,
      schoolGrowthData,
      planDistributionData,
      typeDistributionData,
      statusDistributionData,
    ] = await Promise.all([
      masterDb.select().from(schoolsTable),
      masterDb
        .select({
          id: subscriptionsTable.id,
          status: subscriptionsTable.status,
          endDate: subscriptionsTable.endDate,
          price: subscriptionPlansTable.price,
          planName: subscriptionPlansTable.name,
        })
        .from(subscriptionsTable)
        .leftJoin(subscriptionPlansTable, eq(subscriptionsTable.planId, subscriptionPlansTable.id)),
      masterDb.select().from(invoicesTable),
      masterDb.select({ count: sql<number>`count(*)` }).from(platformAdminsTable),
      masterDb.select({ count: sql<number>`count(*)` }).from(tenantModulesTable).where(eq(tenantModulesTable.isEnabled, true)),
      masterDb
        .select({
          id: schoolsTable.id,
          name: schoolsTable.name,
          slug: schoolsTable.slug,
          status: schoolsTable.status,
          type: schoolsTable.type,
          country: schoolsTable.country,
          createdAt: schoolsTable.createdAt,
          subscriptionPlan: subscriptionPlansTable.name,
          subscriptionStatus: subscriptionsTable.status,
        })
        .from(schoolsTable)
        .leftJoin(subscriptionsTable, eq(schoolsTable.id, subscriptionsTable.schoolId))
        .leftJoin(subscriptionPlansTable, eq(subscriptionsTable.planId, subscriptionPlansTable.id))
        .orderBy(desc(schoolsTable.createdAt))
        .limit(8),
      masterDb
        .select({
          id: invoicesTable.id,
          invoiceNumber: invoicesTable.invoiceNumber,
          schoolId: invoicesTable.schoolId,
          schoolName: schoolsTable.name,
          amount: invoicesTable.amount,
          currency: invoicesTable.currency,
          status: invoicesTable.status,
          dueDate: invoicesTable.dueDate,
          issueDate: invoicesTable.issueDate,
        })
        .from(invoicesTable)
        .leftJoin(schoolsTable, eq(invoicesTable.schoolId, schoolsTable.id))
        .orderBy(desc(invoicesTable.createdAt))
        .limit(8),
      masterDb
        .select({
          id: subscriptionsTable.id,
          schoolId: schoolsTable.id,
          schoolName: schoolsTable.name,
          slug: schoolsTable.slug,
          planName: subscriptionPlansTable.name,
          status: subscriptionsTable.status,
          endDate: subscriptionsTable.endDate,
          autoRenew: subscriptionsTable.autoRenew,
        })
        .from(subscriptionsTable)
        .innerJoin(schoolsTable, eq(subscriptionsTable.schoolId, schoolsTable.id))
        .leftJoin(subscriptionPlansTable, eq(subscriptionsTable.planId, subscriptionPlansTable.id))
        .where(and(eq(subscriptionsTable.status, "active"), lte(subscriptionsTable.endDate, thirtyDaysFromNow)))
        .orderBy(asc(subscriptionsTable.endDate))
        .limit(8),
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
        .limit(8),
      masterDb
        .select({
          month: sql<string>`to_char(${invoicesTable.issueDate}, 'Mon YYYY')`,
          monthSort: sql<string>`to_char(${invoicesTable.issueDate}, 'YYYY-MM')`,
          revenue: sql<string>`coalesce(sum(case when ${invoicesTable.status} = 'paid' then ${invoicesTable.amount} else 0 end), 0)`,
          invoices: sql<number>`count(${invoicesTable.id})`,
        })
        .from(invoicesTable)
        .where(gte(invoicesTable.issueDate, sixMonthsAgo))
        .groupBy(sql`to_char(${invoicesTable.issueDate}, 'Mon YYYY')`, sql`to_char(${invoicesTable.issueDate}, 'YYYY-MM')`)
        .orderBy(sql`to_char(${invoicesTable.issueDate}, 'YYYY-MM')`),
      masterDb
        .select({
          month: sql<string>`to_char(${schoolsTable.createdAt}, 'Mon YYYY')`,
          monthSort: sql<string>`to_char(${schoolsTable.createdAt}, 'YYYY-MM')`,
          schools: sql<number>`count(${schoolsTable.id})`,
        })
        .from(schoolsTable)
        .where(gte(schoolsTable.createdAt, sixMonthsAgo))
        .groupBy(sql`to_char(${schoolsTable.createdAt}, 'Mon YYYY')`, sql`to_char(${schoolsTable.createdAt}, 'YYYY-MM')`)
        .orderBy(sql`to_char(${schoolsTable.createdAt}, 'YYYY-MM')`),
      masterDb
        .select({
          name: subscriptionPlansTable.name,
          count: sql<number>`count(${subscriptionsTable.id})`,
          revenue: sql<string>`coalesce(sum(${subscriptionPlansTable.price}), 0)`,
        })
        .from(subscriptionPlansTable)
        .leftJoin(subscriptionsTable, eq(subscriptionPlansTable.id, subscriptionsTable.planId))
        .groupBy(subscriptionPlansTable.name)
        .orderBy(subscriptionPlansTable.name),
      masterDb
        .select({
          type: schoolsTable.type,
          count: sql<number>`count(${schoolsTable.id})`,
        })
        .from(schoolsTable)
        .groupBy(schoolsTable.type)
        .orderBy(schoolsTable.type),
      masterDb
        .select({
          status: schoolsTable.status,
          count: sql<number>`count(${schoolsTable.id})`,
        })
        .from(schoolsTable)
        .groupBy(schoolsTable.status)
        .orderBy(schoolsTable.status),
    ]);

    const totalSchools = schoolRows.length;
    const activeSchools = schoolRows.filter((school) => school.status === "active").length;
    const inactiveSchools = schoolRows.filter((school) => school.status !== "active").length;
    const newSchoolsThisMonth = schoolRows.filter((school) => new Date(school.createdAt) >= thisMonth).length;
    const newSchoolsLastMonth = schoolRows.filter((school) => {
      const createdAt = new Date(school.createdAt);
      return createdAt >= previousMonth && createdAt < thisMonth;
    }).length;

    const activeSubscriptions = subscriptionRows.filter((subscription) => subscription.status === "active");
    const mrr = activeSubscriptions.reduce((total, subscription) => total + toNumber(subscription.price), 0);
    const paidRevenue = invoiceRows
      .filter((invoice) => invoice.status === "paid")
      .reduce((total, invoice) => total + toNumber(invoice.amount), 0);
    const outstandingRevenue = invoiceRows
      .filter((invoice) => ["pending", "overdue"].includes(invoice.status))
      .reduce((total, invoice) => total + toNumber(invoice.amount), 0);
    const pendingInvoices = invoiceRows.filter((invoice) => invoice.status === "pending").length;
    const overdueInvoices = invoiceRows.filter((invoice) => invoice.status === "overdue" || (invoice.status === "pending" && new Date(invoice.dueDate) < now)).length;
    const failedAuditEvents = recentActivityData.filter((event) => event.status !== "success").length;
    const expiringSubscriptions = expiringSubscriptionsData.length;
    const systemStatus = overdueInvoices > 0 || failedAuditEvents > 0 ? "warning" : "healthy";

    const alerts = [
      overdueInvoices > 0
        ? {
            type: "billing",
            severity: "warning",
            title: `${overdueInvoices} overdue invoice${overdueInvoices === 1 ? "" : "s"}`,
            description: "Review billing collections and follow up with affected schools.",
            href: "/master/billing",
          }
        : null,
      expiringSubscriptions > 0
        ? {
            type: "subscription",
            severity: "warning",
            title: `${expiringSubscriptions} subscription${expiringSubscriptions === 1 ? "" : "s"} expiring soon`,
            description: "Subscriptions ending within 30 days need renewal checks.",
            href: "/master/schools",
          }
        : null,
      inactiveSchools > 0
        ? {
            type: "schools",
            severity: "info",
            title: `${inactiveSchools} inactive school${inactiveSchools === 1 ? "" : "s"}`,
            description: "Inspect inactive tenants and confirm their lifecycle state.",
            href: "/master/schools",
          }
        : null,
      failedAuditEvents > 0
        ? {
            type: "audit",
            severity: "critical",
            title: `${failedAuditEvents} failed audit event${failedAuditEvents === 1 ? "" : "s"}`,
            description: "Recent platform actions include failed events.",
            href: "/master/activity",
          }
        : null,
    ].filter(Boolean);

    const payload = {
      generatedAt: now.toISOString(),
      stats: {
        totalSchools,
        activeSchools,
        inactiveSchools,
        newSchoolsThisMonth,
        newSchoolsLastMonth,
        totalRevenue: mrr,
        mrr,
        paidRevenue,
        outstandingRevenue,
        pendingInvoices,
        overdueInvoices,
        activeSubscriptions: activeSubscriptions.length,
        expiringSubscriptions,
        platformAdmins: toNumber(platformAdminRows[0]?.count),
        enabledModules: toNumber(moduleRows[0]?.count),
        systemStatus,
      },
      recentSchools: recentSchoolsData.map((school) => ({
        ...school,
        createdAt: formatDate(school.createdAt),
        subscriptionPlan: school.subscriptionPlan || "No Plan",
        subscriptionStatus: school.subscriptionStatus || "none",
      })),
      revenueTrend: revenueTrendData.map((row) => ({
        month: row.month,
        revenue: toNumber(row.revenue),
        invoices: toNumber(row.invoices),
      })),
      schoolGrowth: schoolGrowthData.map((row) => ({
        month: row.month,
        schools: toNumber(row.schools),
      })),
      planDistribution: planDistributionData.map((row) => ({
        name: row.name || "No Plan",
        count: toNumber(row.count),
        revenue: toNumber(row.revenue),
      })),
      typeDistribution: typeDistributionData.map((row) => ({
        type: row.type || "unspecified",
        count: toNumber(row.count),
      })),
      statusDistribution: statusDistributionData.map((row) => ({
        status: row.status || "unknown",
        count: toNumber(row.count),
      })),
      recentInvoices: recentInvoicesData.map((invoice) => ({
        ...invoice,
        amount: toNumber(invoice.amount),
        amountFormatted: currencyFormatter.format(toNumber(invoice.amount)),
        dueDate: formatDate(invoice.dueDate),
        issueDate: formatDate(invoice.issueDate),
        schoolName: invoice.schoolName || "Unknown school",
      })),
      expiringSubscriptions: expiringSubscriptionsData.map((subscription) => ({
        ...subscription,
        planName: subscription.planName || "No Plan",
        endDate: formatDate(subscription.endDate),
      })),
      recentActivity: recentActivityData.map((activity) => ({
        ...activity,
        adminName: activity.adminName || "System",
        createdAt: formatDate(activity.createdAt),
      })),
      alerts,
    };
    setCachedValue("master-dashboard", payload, 30_000);
    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": "private, max-age=30",
        "X-Roxan-Cache": "MISS",
      },
    });
  } catch (error) {
    console.error("Error fetching master dashboard data:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch dashboard data",
        stats: {
          totalSchools: 0,
          activeSchools: 0,
          inactiveSchools: 0,
          totalRevenue: 0,
          mrr: 0,
          paidRevenue: 0,
          outstandingRevenue: 0,
          pendingInvoices: 0,
          overdueInvoices: 0,
          activeSubscriptions: 0,
          expiringSubscriptions: 0,
          platformAdmins: 0,
          enabledModules: 0,
          systemStatus: "error",
        },
        recentSchools: [],
        revenueTrend: [],
        schoolGrowth: [],
        planDistribution: [],
        typeDistribution: [],
        statusDistribution: [],
        recentInvoices: [],
        expiringSubscriptions: [],
        recentActivity: [],
        alerts: [],
      },
      { status: 500 }
    );
  }
}
