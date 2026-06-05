import { NextRequest, NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";

import { getTenantDbBySlug, masterDb } from "@/lib/db";
import { schoolsTable } from "@/lib/db-schema";
import { convertMoney } from "@/lib/currency-conversion";
import { getTenantBranding } from "@/lib/tenant-branding-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Row = Record<string, unknown>;

function asString(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value : fallback;
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

function daysBetween(value: unknown) {
  const date = value instanceof Date ? value : value ? new Date(String(value)) : null;
  if (!date || Number.isNaN(date.getTime())) return null;
  return Math.ceil((date.getTime() - Date.now()) / 86_400_000);
}

async function safeRows<T = Row>(operation: () => Promise<{ rows?: unknown[] } | T[]>, label: string): Promise<T[]> {
  try {
    const result = await operation();
    if (Array.isArray(result)) return result as T[];
    return (result.rows || []) as T[];
  } catch (error) {
    console.warn(`Owner billing detail ${label} query skipped:`, error instanceof Error ? error.message : error);
    return [];
  }
}

async function getSchool(slug: string) {
  const [school] = await masterDb
    .select({
      id: schoolsTable.id,
      name: schoolsTable.name,
      slug: schoolsTable.slug,
      type: schoolsTable.type,
      status: schoolsTable.status,
      country: schoolsTable.country,
      currencyCode: schoolsTable.currencyCode,
      subscriptionId: schoolsTable.subscriptionId,
      createdAt: schoolsTable.createdAt,
    })
    .from(schoolsTable)
    .where(eq(schoolsTable.slug, slug))
    .limit(1);
  return school;
}

function ageFor(status: string, dueDate: unknown) {
  const daysToDue = daysBetween(dueDate);
  if (status === "paid" || status === "void") return { age: "closed", daysToDue };
  if (daysToDue === null) return { age: "unscheduled", daysToDue };
  if (daysToDue < 0) return { age: "overdue", daysToDue };
  if (daysToDue <= 7) return { age: "due_soon", daysToDue };
  return { age: "current", daysToDue };
}

async function buildPayload(slug: string, invoiceId: string) {
  const school = await getSchool(slug);
  if (!school) return null;
  const tenantCurrency = school.currencyCode || "ZAR";
  const tenantDb = await getTenantDbBySlug(slug);
  const branding = await getTenantBranding(slug, school.name);

  const [invoiceRow] = await safeRows<Row>(
    () =>
      masterDb.execute(sql`
        select
          i.id,
          i.invoice_number,
          i.subscription_id,
          i.amount,
          i.currency,
          i.status,
          i.issue_date,
          i.due_date,
          i.paid_date,
          i.description,
          i.notes,
          i.created_at,
          i.updated_at,
          sub.status as subscription_status,
          sub.start_date,
          sub.end_date,
          sub.auto_renew,
          plan.id as plan_id,
          plan.name as plan_name,
          plan.description as plan_description,
          plan.price as plan_price,
          plan.features,
          plan.max_students,
          plan.max_staff
        from invoices i
        left join subscriptions sub on sub.id = i.subscription_id
        left join subscription_plans plan on plan.id = sub.plan_id
        where i.id = ${invoiceId} and i.school_id = ${school.id}
        limit 1
      `),
    "invoice"
  );

  if (!invoiceRow) return { school, missing: true };

  const [studentRows, userRows, moduleRows, auditRows] = await Promise.all([
    safeRows<Row>(() => tenantDb.execute(sql`select count(*)::int total, count(*) filter (where lower(status) = 'active')::int active from students`), "students"),
    safeRows<Row>(() => tenantDb.execute(sql`select count(*)::int total, count(*) filter (where is_active is true)::int active from users`), "users"),
    safeRows<Row>(() => masterDb.execute(sql`select module_key, is_enabled from tenant_modules where school_id = ${school.id} order by module_key asc`), "modules"),
    safeRows<Row>(
      () =>
        masterDb.execute(sql`
          select action, resource, resource_id, changes, status, created_at
          from audit_logs
          where resource_id in (${invoiceId}, ${school.id})
          order by created_at desc
          limit 20
        `),
      "audit"
    ),
  ]);

  const converted = await convertMoney(invoiceRow.amount, asString(invoiceRow.currency, "ZAR"), tenantCurrency);
  const status = asString(invoiceRow.status, "pending").toLowerCase();
  const aging = ageFor(status, invoiceRow.due_date);
  const planConverted = await convertMoney(invoiceRow.plan_price, "ZAR", tenantCurrency);
  const studentSummary = studentRows[0] || {};
  const userSummary = userRows[0] || {};

  return {
    school: {
      ...school,
      currencyCode: tenantCurrency,
      displayName: branding.name || school.name,
      logoUrl: branding.logoUrl,
      schoolSealUrl: branding.schoolSealUrl,
      reportCardWatermarkUrl: branding.reportCardWatermarkUrl,
      primaryColor: branding.primaryColor,
      secondaryColor: branding.secondaryColor,
      accentColor: branding.accentColor,
      address: branding.address,
      phone: branding.phone,
      email: branding.email,
      website: branding.website,
      motto: branding.motto,
    },
    generatedAt: new Date().toISOString(),
    invoice: {
      id: asString(invoiceRow.id),
      invoiceNumber: asString(invoiceRow.invoice_number),
      subscriptionId: asString(invoiceRow.subscription_id),
      amount: converted.displayAmount,
      currency: converted.displayCurrency,
      originalAmount: converted.originalAmount,
      originalCurrency: converted.originalCurrency,
      exchangeRate: converted.exchangeRate,
      exchangeRateDate: converted.exchangeRateDate,
      exchangeRateProvider: converted.exchangeRateProvider,
      exchangeRateStale: converted.exchangeRateStale,
      conversionAvailable: converted.conversionAvailable,
      status,
      age: aging.age,
      daysToDue: aging.daysToDue,
      issueDate: asDate(invoiceRow.issue_date),
      dueDate: asDate(invoiceRow.due_date),
      paidDate: asDate(invoiceRow.paid_date),
      description: asString(invoiceRow.description),
      notes: asString(invoiceRow.notes),
      createdAt: asDate(invoiceRow.created_at),
      updatedAt: asDate(invoiceRow.updated_at),
    },
    subscription: {
      id: asString(invoiceRow.subscription_id),
      status: asString(invoiceRow.subscription_status, "unassigned").toLowerCase(),
      startDate: asDate(invoiceRow.start_date),
      endDate: asDate(invoiceRow.end_date),
      autoRenew: invoiceRow.auto_renew !== false,
      plan: {
        id: asString(invoiceRow.plan_id),
        name: asString(invoiceRow.plan_name, "Subscription plan"),
        description: asString(invoiceRow.plan_description),
        price: planConverted.displayAmount,
        currency: planConverted.displayCurrency,
        maxStudents: asNumber(invoiceRow.max_students),
        maxStaff: asNumber(invoiceRow.max_staff),
      },
    },
    usage: {
      activeStudents: asNumber(studentSummary.active),
      totalStudents: asNumber(studentSummary.total),
      activeUsers: asNumber(userSummary.active),
      totalUsers: asNumber(userSummary.total),
      enabledModules: moduleRows.filter((row) => row.is_enabled !== false).length,
      totalModules: moduleRows.length,
    },
    modules: moduleRows.map((row) => ({
      moduleKey: asString(row.module_key),
      enabled: row.is_enabled !== false,
    })),
    audit: auditRows.map((row) => ({
      action: asString(row.action),
      resource: asString(row.resource),
      resourceId: asString(row.resource_id),
      changes: row.changes || null,
      status: asString(row.status),
      createdAt: asDate(row.created_at),
    })),
  };
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ invoiceId: string }> }) {
  try {
    const slug = request.nextUrl.searchParams.get("tenant")?.trim().toLowerCase();
    const { invoiceId } = await params;
    if (!slug) return NextResponse.json({ error: "Tenant slug is required" }, { status: 400 });
    if (!invoiceId) return NextResponse.json({ error: "Invoice id is required" }, { status: 400 });
    const payload = await buildPayload(slug, invoiceId);
    if (!payload) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    if ("missing" in payload) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    return NextResponse.json(payload);
  } catch (error) {
    console.error("Owner billing detail GET failed:", error);
    return NextResponse.json({ error: "Failed to load platform invoice details" }, { status: 500 });
  }
}
