import { NextRequest, NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";

import { getTenantDbBySlug, masterDb } from "@/lib/db";
import { schoolsTable } from "@/lib/db-schema";
import { convertMoney } from "@/lib/currency-conversion";
import { getPlatformBillingBranding } from "@/lib/platform-branding-server";
import { deleteCachedValue, getCachedValue, setCachedValue } from "@/lib/server-response-cache";

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
    console.warn(`Owner billing ${label} query skipped:`, error instanceof Error ? error.message : error);
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

function parseFeatures(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((item) => String(item)).filter(Boolean);
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const candidates = record.features || record.included || record.items;
    if (Array.isArray(candidates)) return candidates.map((item) => String(item)).filter(Boolean);
    return Object.entries(record)
      .filter(([, enabled]) => enabled === true)
      .map(([key]) => key.replace(/[_-]/g, " "));
  }
  return [];
}

export async function GET(request: NextRequest) {
  try {
    const slug = request.nextUrl.searchParams.get("tenant")?.trim().toLowerCase();
    if (!slug) return NextResponse.json({ error: "Tenant slug is required" }, { status: 400 });
    const cacheKey = `owner-billing:${slug}`;
    const cached = getCachedValue<Record<string, unknown>>(cacheKey);
    if (cached) {
      return NextResponse.json(cached, {
        headers: {
          "Cache-Control": "private, max-age=30",
          "X-Roxan-Cache": "HIT",
        },
      });
    }

    const school = await getSchool(slug);
    if (!school) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

    const tenantCurrency = school.currencyCode || "ZAR";
    const tenantDb = await getTenantDbBySlug(slug);
    const platformBranding = await getPlatformBillingBranding();

    const [subscriptionRows, invoiceRows, studentRows, userRows, moduleRows, auditRows] = await Promise.all([
      safeRows<Row>(
        () =>
          masterDb.execute(sql`
            select
              sub.id,
              sub.status,
              sub.start_date,
              sub.end_date,
              sub.auto_renew,
              sub.created_at,
              plan.id as plan_id,
              plan.name as plan_name,
              plan.description as plan_description,
              plan.price as plan_price,
              plan.features,
              plan.max_students,
              plan.max_staff,
              plan.is_active as plan_active
            from subscriptions sub
            left join subscription_plans plan on plan.id = sub.plan_id
            where sub.school_id = ${school.id}
            order by sub.created_at desc
            limit 1
          `),
        "subscription"
      ),
      safeRows<Row>(
        () =>
          masterDb.execute(sql`
            select id, invoice_number, subscription_id, amount, currency, status, issue_date, due_date, paid_date, description, notes, created_at, updated_at
            from invoices
            where school_id = ${school.id}
            order by created_at desc
            limit 200
          `),
        "platform invoices"
      ),
      safeRows<Row>(() => tenantDb.execute(sql`select count(*)::int total, count(*) filter (where lower(status) = 'active')::int active from students`), "students"),
      safeRows<Row>(() => tenantDb.execute(sql`select count(*)::int total, count(*) filter (where is_active is true)::int active from users`), "users"),
      safeRows<Row>(() => masterDb.execute(sql`select module_key, is_enabled from tenant_modules where school_id = ${school.id}`), "modules"),
      safeRows<Row>(() => masterDb.execute(sql`select action, resource, status, created_at from audit_logs where resource_id = ${school.id} order by created_at desc limit 8`), "audit"),
    ]);

    const subscriptionRow = subscriptionRows[0];
    const convertedPlanPrice = subscriptionRow
      ? await convertMoney(subscriptionRow.plan_price, "ZAR", tenantCurrency)
      : null;

    const invoices = await Promise.all(
      invoiceRows.map(async (row) => {
        const converted = await convertMoney(row.amount, asString(row.currency, "ZAR"), tenantCurrency);
        const status = asString(row.status, "pending").toLowerCase();
        const daysToDue = daysBetween(row.due_date);
        const age =
          status === "paid" || status === "void"
            ? "closed"
            : daysToDue === null
              ? "unscheduled"
              : daysToDue < 0
                ? "overdue"
                : daysToDue <= 7
                  ? "due_soon"
                  : "current";
        return {
          id: asString(row.id),
          invoiceNumber: asString(row.invoice_number),
          subscriptionId: asString(row.subscription_id),
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
          age,
          daysToDue,
          issueDate: asDate(row.issue_date),
          dueDate: asDate(row.due_date),
          paidDate: asDate(row.paid_date),
          description: asString(row.description),
          notes: asString(row.notes),
          createdAt: asDate(row.created_at),
          updatedAt: asDate(row.updated_at),
        };
      })
    );

    const openInvoices = invoices.filter((item) => !["paid", "void"].includes(item.status));
    const overdueInvoices = invoices.filter((item) => item.age === "overdue");
    const dueSoonInvoices = invoices.filter((item) => item.age === "due_soon");
    const paidInvoices = invoices.filter((item) => item.status === "paid");
    const openAmount = openInvoices.reduce((sum, item) => sum + item.amount, 0);
    const overdueAmount = overdueInvoices.reduce((sum, item) => sum + item.amount, 0);
    const paidAmount = paidInvoices.reduce((sum, item) => sum + item.amount, 0);
    const totalAmount = invoices.reduce((sum, item) => sum + item.amount, 0);

    const statusMap = new Map<string, { name: string; records: number; amount: number }>();
    const ageMap = new Map<string, { name: string; records: number; amount: number }>();
    for (const invoice of invoices) {
      const statusItem = statusMap.get(invoice.status) || { name: invoice.status, records: 0, amount: 0 };
      statusItem.records += 1;
      statusItem.amount += invoice.amount;
      statusMap.set(invoice.status, statusItem);

      const ageItem = ageMap.get(invoice.age) || { name: invoice.age, records: 0, amount: 0 };
      ageItem.records += 1;
      ageItem.amount += invoice.amount;
      ageMap.set(invoice.age, ageItem);
    }

    const studentSummary = studentRows[0] || {};
    const userSummary = userRows[0] || {};
    const maxStudents = subscriptionRow ? asNumber(subscriptionRow.max_students) : 0;
    const maxStaff = subscriptionRow ? asNumber(subscriptionRow.max_staff) : 0;
    const activeStudents = asNumber(studentSummary.active);
    const activeUsers = asNumber(userSummary.active);

    const payload = {
      school: {
        ...school,
        currencyCode: tenantCurrency,
        billingBrandingSource: "platform",
        displayName: platformBranding.name,
        logoUrl: platformBranding.logoUrl,
        schoolSealUrl: platformBranding.logoUrl,
        reportCardWatermarkUrl: null,
        primaryColor: platformBranding.primaryColor,
        secondaryColor: platformBranding.secondaryColor,
        accentColor: platformBranding.accentColor,
        address: platformBranding.address,
        phone: platformBranding.phone,
        email: platformBranding.email,
        website: platformBranding.website,
        motto: platformBranding.subtitle,
        letterhead: platformBranding.letterhead,
      },
      generatedAt: new Date().toISOString(),
      subscription: subscriptionRow
        ? {
            id: asString(subscriptionRow.id),
            status: asString(subscriptionRow.status, "active").toLowerCase(),
            startDate: asDate(subscriptionRow.start_date),
            endDate: asDate(subscriptionRow.end_date),
            autoRenew: subscriptionRow.auto_renew !== false,
            daysToRenewal: daysBetween(subscriptionRow.end_date),
            plan: {
              id: asString(subscriptionRow.plan_id),
              name: asString(subscriptionRow.plan_name, "Subscription plan"),
              description: asString(subscriptionRow.plan_description),
              price: convertedPlanPrice?.displayAmount || asNumber(subscriptionRow.plan_price),
              currency: convertedPlanPrice?.displayCurrency || tenantCurrency,
              originalPrice: convertedPlanPrice?.originalAmount || asNumber(subscriptionRow.plan_price),
              originalCurrency: convertedPlanPrice?.originalCurrency || "ZAR",
              exchangeRate: convertedPlanPrice?.exchangeRate || 1,
              exchangeRateProvider: convertedPlanPrice?.exchangeRateProvider || "native",
              features: parseFeatures(subscriptionRow.features),
              maxStudents,
              maxStaff,
              isActive: subscriptionRow.plan_active !== false,
            },
          }
        : null,
      usage: {
        activeStudents,
        totalStudents: asNumber(studentSummary.total),
        maxStudents,
        studentUsageRate: maxStudents ? Math.round((activeStudents / maxStudents) * 1000) / 10 : 0,
        activeUsers,
        totalUsers: asNumber(userSummary.total),
        maxStaff,
        staffUsageRate: maxStaff ? Math.round((activeUsers / maxStaff) * 1000) / 10 : 0,
        enabledModules: moduleRows.filter((row) => row.is_enabled !== false).length,
        totalModules: moduleRows.length,
      },
      invoices,
      recentAudit: auditRows.map((row) => ({
        action: asString(row.action),
        resource: asString(row.resource),
        status: asString(row.status),
        createdAt: asDate(row.created_at),
      })),
      analytics: {
        byStatus: Array.from(statusMap.values()).sort((a, b) => b.amount - a.amount),
        byAge: Array.from(ageMap.values()).sort((a, b) => b.amount - a.amount),
      },
      summary: {
        invoices: invoices.length,
        openInvoices: openInvoices.length,
        overdueInvoices: overdueInvoices.length,
        dueSoonInvoices: dueSoonInvoices.length,
        openAmount,
        overdueAmount,
        paidAmount,
        totalAmount,
        paymentCompletionRate: totalAmount ? Math.round((paidAmount / totalAmount) * 1000) / 10 : 0,
        nextDueDate: openInvoices
          .filter((item) => item.dueDate)
          .sort((a, b) => new Date(a.dueDate || 0).getTime() - new Date(b.dueDate || 0).getTime())[0]?.dueDate || null,
      },
    };
    setCachedValue(cacheKey, payload, 30_000);
    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": "private, max-age=30",
        "X-Roxan-Cache": "MISS",
      },
    });
  } catch (error) {
    console.error("Owner billing GET failed:", error);
    return NextResponse.json({ error: "Failed to load owner platform billing data" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const slug = request.nextUrl.searchParams.get("tenant")?.trim().toLowerCase();
    if (!slug) return NextResponse.json({ error: "Tenant slug is required" }, { status: 400 });
    const body = (await request.json().catch(() => ({}))) as Row;
    const invoiceId = asString(body.invoiceId);
    const paymentMethod = asString(body.paymentMethod, "manual");
    const paymentReference = asString(body.paymentReference, `ROX-MANUAL-${Date.now()}`);
    if (!invoiceId) return NextResponse.json({ error: "Invoice id is required" }, { status: 400 });
    if (!["manual", "cash", "bank_transfer", "card", "mobile_money", "paystack", "flutterwave", "stripe"].includes(paymentMethod)) {
      return NextResponse.json({ error: "Unsupported payment method" }, { status: 400 });
    }
    if (paymentReference.length < 4 || paymentReference.length > 120) {
      return NextResponse.json({ error: "Payment reference must be between 4 and 120 characters" }, { status: 400 });
    }

    const school = await getSchool(slug);
    if (!school) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

    const invoiceRows = await safeRows<Row>(
      () =>
        masterDb.execute(sql`
          select id, invoice_number, amount, currency, status
          from invoices
          where id = ${invoiceId} and school_id = ${school.id}
          limit 1
        `),
      "pay invoice lookup"
    );
    const invoice = invoiceRows[0];
    if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    if (["paid", "void"].includes(asString(invoice.status).toLowerCase())) {
      return NextResponse.json({ error: "This invoice cannot be paid in its current state" }, { status: 409 });
    }

    const note = `Paid from owner dashboard via ${paymentMethod}. Reference: ${paymentReference}`;
    await masterDb.execute(sql`
      update invoices
      set status = 'paid',
          paid_date = now(),
          notes = trim(coalesce(notes, '') || ${`\n${note}`}),
          updated_at = now()
      where id = ${invoiceId} and school_id = ${school.id}
    `);

    await masterDb.execute(sql`
      insert into audit_logs (id, admin_id, action, resource, resource_id, changes, status, created_at)
      values (
        ${crypto.randomUUID()},
        ${`tenant-owner:${slug}`},
        'platform_invoice_paid',
        'invoice',
        ${invoiceId},
        ${JSON.stringify({
          invoiceNumber: asString(invoice.invoice_number),
          amount: asNumber(invoice.amount),
          currency: asString(invoice.currency),
          paymentMethod,
          paymentReference,
          mode: "manual_gateway_placeholder",
        })}::jsonb,
        'success',
        now()
      )
    `);

    deleteCachedValue(`owner-billing:${slug}`);
    deleteCachedValue(`owner-finance:${slug}`);
    return NextResponse.json({
      success: true,
      invoiceId,
      invoiceNumber: asString(invoice.invoice_number),
      status: "paid",
      paidAt: new Date().toISOString(),
      paymentMethod,
      paymentReference,
      gatewayMode: "manual",
    });
  } catch (error) {
    console.error("Owner billing PATCH failed:", error);
    return NextResponse.json({ error: "Failed to complete platform invoice payment" }, { status: 500 });
  }
}
