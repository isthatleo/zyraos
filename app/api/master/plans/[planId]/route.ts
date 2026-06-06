import { NextRequest, NextResponse } from "next/server";
import { desc, eq, sql } from "drizzle-orm";

import { masterDb } from "@/lib/db";
import { invoicesTable, schoolsTable, subscriptionPlansTable, subscriptionsTable } from "@/lib/db-schema";
import { convertMoney } from "@/lib/currency-conversion";
import { requireMasterAdmin, writeMasterAudit } from "@/lib/master-audit";
import { getPlatformSetting } from "@/lib/platform-settings-server";
import { deleteCachedValue, deleteCachedValuesByPrefix, getCachedValue, setCachedValue } from "@/lib/server-response-cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PLAN_DETAIL_CACHE_TTL_MS = 20_000;
const ALLOWED_PERIODS = new Set(["month", "term", "year"]);
const ALLOWED_COLORS = new Set(["orange", "green", "blue", "purple", "gray", "indigo"]);
const ALLOWED_ICON_KEYS = new Set(["basic", "starter", "standard", "professional", "premium", "enterprise", "custom"]);

function planCacheKey(planId: string) {
  return `master-plan:${planId}`;
}

function invalidatePlansCaches(planId?: string) {
  deleteCachedValue("master-plans:list");
  deleteCachedValue("master-dashboard");
  deleteCachedValue("master-billing-overview");
  if (planId) deleteCachedValue(planCacheKey(planId));
  else deleteCachedValuesByPrefix("master-plan:");
  deleteCachedValuesByPrefix("master-schools:");
}

function normalizeStringArray(value: unknown) {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  if (typeof value === "string") return value.split(/\r?\n|,/).map((item) => item.trim()).filter(Boolean);
  return [];
}

function parseFeatures(raw: unknown) {
  if (Array.isArray(raw)) return { included: normalizeStringArray(raw) };
  if (raw && typeof raw === "object") {
    const value = raw as Record<string, unknown>;
    return {
      included: normalizeStringArray(value.included ?? value.features),
      unavailable: normalizeStringArray(value.unavailable),
      modules: normalizeStringArray(value.modules),
      tagline: typeof value.tagline === "string" ? value.tagline : "",
      label: typeof value.label === "string" ? value.label : "",
      popular: Boolean(value.popular),
      color: typeof value.color === "string" ? value.color : "orange",
      iconKey: typeof value.iconKey === "string" ? value.iconKey : "basic",
      period: typeof value.period === "string" ? value.period : "month",
      currency: typeof value.currency === "string" ? value.currency : "ZAR",
    };
  }
  return { included: [] };
}

function toNumber(value: unknown) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseNullableLimit(value: unknown) {
  if (value === null || value === "") return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return Number.NaN;
  return Math.trunc(parsed);
}

function validatePlanInput(body: Record<string, unknown>) {
  const name = String(body.name || "").trim();
  const price = toNumber(body.price);
  const currency = String(body.currency || "ZAR").trim().toUpperCase();
  const maxStudents = parseNullableLimit(body.maxStudents);
  const maxStaff = parseNullableLimit(body.maxStaff);
  const period = String(body.period || "month").trim().toLowerCase();
  const color = String(body.color || "orange").trim().toLowerCase();
  const iconKey = String(body.iconKey || "basic").trim().toLowerCase();

  if (!name) return { error: "Plan name is required" };
  if (name.length > 120) return { error: "Plan name cannot exceed 120 characters" };
  if (String(body.description || "").length > 1200) return { error: "Plan description cannot exceed 1200 characters" };
  if (price < 0) return { error: "Plan price cannot be negative" };
  if (price > 99_999_999) return { error: "Plan price is too high" };
  if (!/^[A-Z]{3}$/.test(currency)) return { error: "Currency must be a valid 3-letter ISO code" };
  if (Number.isNaN(maxStudents) || Number.isNaN(maxStaff)) return { error: "Student and staff limits must be positive numbers or empty" };
  if (maxStudents !== null && maxStudents > 10_000_000) return { error: "Student limit is too high" };
  if (maxStaff !== null && maxStaff > 1_000_000) return { error: "Staff limit is too high" };
  if (!ALLOWED_PERIODS.has(period)) return { error: "Billing period must be month, term, or year" };
  if (!ALLOWED_COLORS.has(color)) return { error: "Plan color is not supported" };
  if (!ALLOWED_ICON_KEYS.has(iconKey)) return { error: "Plan icon is not supported" };

  return { name, price, maxStudents, maxStaff };
}

function buildFeatureJson(body: Record<string, unknown>) {
  const period = String(body.period || "month").trim().toLowerCase();
  const color = String(body.color || "orange").trim().toLowerCase();
  const iconKey = String(body.iconKey || "basic").trim().toLowerCase();
  return {
    included: normalizeStringArray(body.features).slice(0, 80),
    unavailable: normalizeStringArray(body.unavailableFeatures).slice(0, 80),
    modules: normalizeStringArray(body.modules).slice(0, 80),
    tagline: String(body.tagline || "").trim().slice(0, 180),
    label: String(body.label || "").trim().slice(0, 60),
    popular: Boolean(body.popular),
    color: ALLOWED_COLORS.has(color) ? color : "orange",
    iconKey: ALLOWED_ICON_KEYS.has(iconKey) ? iconKey : "basic",
    period: ALLOWED_PERIODS.has(period) ? period : "month",
    currency: String(body.currency || "ZAR").trim().toUpperCase(),
  };
}

async function planPayload(row: typeof subscriptionPlansTable.$inferSelect, usage?: Record<string, unknown>) {
  const meta = parseFeatures(row.features);
  const price = toNumber(row.price);
  const originalCurrency = meta.currency || "ZAR";
  const displayCurrency = String(await getPlatformSetting("currency") || originalCurrency).toUpperCase();
  const [convertedPrice, convertedRevenue, convertedOutstanding] = await Promise.all([
    convertMoney(price, originalCurrency, displayCurrency),
    convertMoney(toNumber(usage?.revenue), originalCurrency, displayCurrency),
    convertMoney(toNumber(usage?.outstanding), originalCurrency, displayCurrency),
  ]);
  return {
    id: row.id,
    name: row.name,
    tagline: meta.tagline || "",
    description: row.description,
    price,
    priceFormatted: row.price,
    currency: originalCurrency,
    originalPrice: price,
    originalCurrency,
    displayPrice: convertedPrice.displayAmount,
    displayCurrency: convertedPrice.displayCurrency,
    displayPriceFormatted: new Intl.NumberFormat(undefined, { style: "currency", currency: convertedPrice.displayCurrency }).format(convertedPrice.displayAmount),
    exchangeRate: convertedPrice.exchangeRate,
    exchangeRateDate: convertedPrice.exchangeRateDate,
    exchangeRateProvider: convertedPrice.exchangeRateProvider,
    exchangeRateStale: convertedPrice.exchangeRateStale,
    conversionAvailable: convertedPrice.conversionAvailable,
    period: meta.period || "month",
    label: meta.label || "",
    features: meta.included || [],
    unavailableFeatures: meta.unavailable || [],
    modules: meta.modules || [],
    maxStudents: row.maxStudents,
    maxStaff: row.maxStaff,
    isActive: row.isActive,
    popular: Boolean(meta.popular),
    color: meta.color || "orange",
    iconKey: meta.iconKey || "basic",
    activeSubscriptions: Number(usage?.activeSubscriptions || 0),
    totalSubscriptions: Number(usage?.totalSubscriptions || 0),
    schoolCount: Number(usage?.schoolCount || 0),
    revenue: toNumber(usage?.revenue),
    displayRevenue: convertedRevenue.displayAmount,
    displayRevenueCurrency: convertedRevenue.displayCurrency,
    outstanding: toNumber(usage?.outstanding),
    displayOutstanding: convertedOutstanding.displayAmount,
    displayOutstandingCurrency: convertedOutstanding.displayCurrency,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

async function getPlanUsage(planId: string) {
  const usageRows = await masterDb
    .select({
      totalSubscriptions: sql<number>`count(${subscriptionsTable.id})`,
      activeSubscriptions: sql<number>`count(${subscriptionsTable.id}) filter (where ${subscriptionsTable.status} = 'active')`,
      schoolCount: sql<number>`count(distinct ${subscriptionsTable.schoolId})`,
      revenue: sql<string>`coalesce(sum(${invoicesTable.amount}) filter (where ${invoicesTable.status} = 'paid'), 0)`,
      outstanding: sql<string>`coalesce(sum(${invoicesTable.amount}) filter (where ${invoicesTable.status} in ('pending', 'overdue')), 0)`,
    })
    .from(subscriptionsTable)
    .leftJoin(invoicesTable, eq(invoicesTable.subscriptionId, subscriptionsTable.id))
    .where(eq(subscriptionsTable.planId, planId));

  return usageRows[0] || {};
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ planId: string }> }
) {
  try {
    const { response } = await requireMasterAdmin(request);
    if (response) return response;

    const { planId } = await params;
    const cached = getCachedValue<Record<string, unknown>>(planCacheKey(planId));
    if (cached) {
      return NextResponse.json(cached, { headers: { "Cache-Control": "private, max-age=20" } });
    }

    const planRows = await masterDb.select().from(subscriptionPlansTable).where(eq(subscriptionPlansTable.id, planId)).limit(1);
    if (!planRows.length) return NextResponse.json({ error: "Plan not found" }, { status: 404 });

    const [usage, subscriptions, invoices] = await Promise.all([
      getPlanUsage(planId),
      masterDb
        .select({
          id: subscriptionsTable.id,
          status: subscriptionsTable.status,
          startDate: subscriptionsTable.startDate,
          endDate: subscriptionsTable.endDate,
          autoRenew: subscriptionsTable.autoRenew,
          schoolId: schoolsTable.id,
          schoolName: schoolsTable.name,
          schoolSlug: schoolsTable.slug,
          schoolStatus: schoolsTable.status,
        })
        .from(subscriptionsTable)
        .leftJoin(schoolsTable, eq(subscriptionsTable.schoolId, schoolsTable.id))
        .where(eq(subscriptionsTable.planId, planId))
        .orderBy(desc(subscriptionsTable.createdAt)),
      masterDb
        .select({
          id: invoicesTable.id,
          invoiceNumber: invoicesTable.invoiceNumber,
          amount: invoicesTable.amount,
          currency: invoicesTable.currency,
          status: invoicesTable.status,
          dueDate: invoicesTable.dueDate,
          schoolName: schoolsTable.name,
        })
        .from(invoicesTable)
        .innerJoin(subscriptionsTable, eq(invoicesTable.subscriptionId, subscriptionsTable.id))
        .leftJoin(schoolsTable, eq(invoicesTable.schoolId, schoolsTable.id))
        .where(eq(subscriptionsTable.planId, planId))
        .orderBy(desc(invoicesTable.issueDate))
        .limit(12),
    ]);

    const platformCurrency = String(await getPlatformSetting("currency") || "ZAR").toUpperCase();
    const convertedInvoices = await Promise.all(invoices.map(async (invoice) => {
      const converted = await convertMoney(invoice.amount, invoice.currency, platformCurrency);
      return {
        ...invoice,
        amount: toNumber(invoice.amount),
        originalAmount: toNumber(invoice.amount),
        originalCurrency: invoice.currency,
        displayAmount: converted.displayAmount,
        displayCurrency: converted.displayCurrency,
        exchangeRate: converted.exchangeRate,
        exchangeRateDate: converted.exchangeRateDate,
        exchangeRateProvider: converted.exchangeRateProvider,
        exchangeRateStale: converted.exchangeRateStale,
        conversionAvailable: converted.conversionAvailable,
      };
    }));

    const payload = {
      plan: await planPayload(planRows[0], usage),
      subscriptions,
      invoices: convertedInvoices,
      platformCurrency,
    };
    setCachedValue(planCacheKey(planId), payload, PLAN_DETAIL_CACHE_TTL_MS);
    return NextResponse.json(payload, { headers: { "Cache-Control": "private, max-age=20" } });
  } catch (error) {
    console.error("Error fetching plan detail:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ planId: string }> }
) {
  try {
    const { admin, response } = await requireMasterAdmin(request);
    if (response) return response;

    const { planId } = await params;
    const body = await request.json().catch(() => ({}));
    const validation = validatePlanInput(body);
    if ("error" in validation) return NextResponse.json({ error: validation.error }, { status: 400 });
    const { name, price, maxStudents, maxStaff } = validation;

    const [plan] = await masterDb
      .update(subscriptionPlansTable)
      .set({
        name,
        description: body.description ? String(body.description) : null,
        price: price.toFixed(2),
        features: buildFeatureJson(body),
        maxStudents,
        maxStaff,
        isActive: body.isActive !== false,
        updatedAt: new Date(),
      })
      .where(eq(subscriptionPlansTable.id, planId))
      .returning();

    if (!plan) return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    await writeMasterAudit(request, {
      adminId: admin.adminId,
      action: "Subscription Plan Updated",
      resource: "subscription_plans",
      resourceId: plan.id,
      changes: { name: plan.name, price: plan.price, isActive: plan.isActive },
    });
    invalidatePlansCaches(planId);
    return NextResponse.json({ success: true, plan: await planPayload(plan, await getPlanUsage(planId)) });
  } catch (error) {
    console.error("Error updating plan detail:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ planId: string }> }
) {
  try {
    const { admin, response } = await requireMasterAdmin(request);
    if (response) return response;

    const { planId } = await params;
    const usage = await getPlanUsage(planId);
    const totalSubscriptions = Number(usage.totalSubscriptions || 0);

    if (totalSubscriptions > 0) {
      const [plan] = await masterDb
        .update(subscriptionPlansTable)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(subscriptionPlansTable.id, planId))
        .returning();
      if (!plan) return NextResponse.json({ error: "Plan not found" }, { status: 404 });
      await writeMasterAudit(request, {
        adminId: admin.adminId,
        action: "Subscription Plan Archived",
        resource: "subscription_plans",
        resourceId: plan.id,
        changes: { reason: "Plan has existing subscriptions", totalSubscriptions },
      });
      invalidatePlansCaches(planId);
      return NextResponse.json({
        success: true,
        deleted: false,
        archived: true,
        message: totalSubscriptions > 0
          ? "Plan is used by subscriptions, so it was archived to preserve billing history."
          : "Plan archived.",
        plan: await planPayload(plan, usage),
      });
    }

    const [deleted] = await masterDb.delete(subscriptionPlansTable).where(eq(subscriptionPlansTable.id, planId)).returning();
    if (!deleted) return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    await writeMasterAudit(request, {
      adminId: admin.adminId,
      action: "Subscription Plan Deleted",
      resource: "subscription_plans",
      resourceId: deleted.id,
      changes: { name: deleted.name, price: deleted.price },
    });
    invalidatePlansCaches(planId);
    return NextResponse.json({ success: true, deleted: true });
  } catch (error) {
    console.error("Error deleting subscription plan:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
