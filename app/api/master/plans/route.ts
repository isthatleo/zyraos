import { NextRequest, NextResponse } from "next/server";
import { desc, eq, sql } from "drizzle-orm";
import crypto from "node:crypto";

import { masterDb } from "@/lib/db";
import { invoicesTable, schoolsTable, subscriptionPlansTable, subscriptionsTable } from "@/lib/db-schema";
import { convertMoney } from "@/lib/currency-conversion";
import { requireMasterAdmin, writeMasterAudit } from "@/lib/master-audit";
import { getPlatformSetting } from "@/lib/platform-settings-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PlanFeatureMeta = {
  included?: string[];
  unavailable?: string[];
  modules?: string[];
  tagline?: string;
  label?: string;
  popular?: boolean;
  color?: string;
  iconKey?: string;
  period?: string;
  currency?: string;
};

function normalizeStringArray(value: unknown) {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  if (typeof value === "string") return value.split(/\r?\n|,/).map((item) => item.trim()).filter(Boolean);
  return [];
}

function parseFeatures(raw: unknown): PlanFeatureMeta {
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

function normalizePlanId(value: unknown, fallbackName = "") {
  return String(value || fallbackName)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function parseNullableLimit(value: unknown) {
  if (value === null || value === "") return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return Number.NaN;
  return Math.trunc(parsed);
}

function validatePlanInput(body: Record<string, unknown>, options: { requireId?: boolean } = {}) {
  const name = String(body.name || "").trim();
  const price = toNumber(body.price);
  const id = normalizePlanId(body.id, name);
  const currency = String(body.currency || "ZAR").trim().toUpperCase();
  const maxStudents = parseNullableLimit(body.maxStudents);
  const maxStaff = parseNullableLimit(body.maxStaff);

  if (options.requireId && !id) return { error: "Plan ID is required" };
  if (!name) return { error: "Plan name is required" };
  if (price < 0) return { error: "Plan price cannot be negative" };
  if (!/^[A-Z]{3}$/.test(currency)) return { error: "Currency must be a valid 3-letter ISO code" };
  if (Number.isNaN(maxStudents) || Number.isNaN(maxStaff)) return { error: "Student and staff limits must be positive numbers or empty" };

  return { id, name, price, currency, maxStudents, maxStaff };
}

async function planPayload(row: {
  id: string;
  name: string;
  description: string | null;
  price: string;
  features: unknown;
  maxStudents: number | null;
  maxStaff: number | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  activeSubscriptions?: number | string | null;
  totalSubscriptions?: number | string | null;
  schoolCount?: number | string | null;
  revenue?: number | string | null;
}) {
  const meta = parseFeatures(row.features);
  const price = toNumber(row.price);
  const displayCurrency = String(await getPlatformSetting("currency") || meta.currency || "ZAR").toUpperCase();
  const [convertedPrice, convertedRevenue] = await Promise.all([
    convertMoney(price, meta.currency || "ZAR", displayCurrency),
    convertMoney(toNumber(row.revenue), meta.currency || "ZAR", displayCurrency),
  ]);
  return {
    id: row.id,
    name: row.name,
    tagline: meta.tagline || "",
    description: row.description,
    price,
    priceFormatted: row.price,
    currency: meta.currency || "ZAR",
    originalPrice: price,
    originalCurrency: meta.currency || "ZAR",
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
    activeSubscriptions: Number(row.activeSubscriptions || 0),
    totalSubscriptions: Number(row.totalSubscriptions || 0),
    schoolCount: Number(row.schoolCount || 0),
    revenue: toNumber(row.revenue),
    displayRevenue: convertedRevenue.displayAmount,
    displayRevenueCurrency: convertedRevenue.displayCurrency,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function buildFeatureJson(body: Record<string, unknown>): PlanFeatureMeta {
  return {
    included: normalizeStringArray(body.features),
    unavailable: normalizeStringArray(body.unavailableFeatures),
    modules: normalizeStringArray(body.modules),
    tagline: String(body.tagline || ""),
    label: String(body.label || ""),
    popular: Boolean(body.popular),
    color: String(body.color || "orange"),
    iconKey: String(body.iconKey || "basic"),
    period: String(body.period || "month"),
    currency: String(body.currency || "ZAR").trim().toUpperCase(),
  };
}

async function loadUsageByPlan() {
  const rows = await masterDb
    .select({
      planId: subscriptionsTable.planId,
      totalSubscriptions: sql<number>`count(${subscriptionsTable.id})`,
      activeSubscriptions: sql<number>`count(${subscriptionsTable.id}) filter (where ${subscriptionsTable.status} = 'active')`,
      schoolCount: sql<number>`count(distinct ${subscriptionsTable.schoolId})`,
      revenue: sql<string>`coalesce(sum(${invoicesTable.amount}) filter (where ${invoicesTable.status} = 'paid'), 0)`,
    })
    .from(subscriptionsTable)
    .leftJoin(invoicesTable, eq(invoicesTable.subscriptionId, subscriptionsTable.id))
    .groupBy(subscriptionsTable.planId);

  return new Map(rows.map((row) => [row.planId, row]));
}

export async function GET(request: NextRequest) {
  try {
    const { response } = await requireMasterAdmin(request);
    if (response) return response;

    const [plans, usage] = await Promise.all([
      masterDb.select().from(subscriptionPlansTable).orderBy(desc(subscriptionPlansTable.createdAt)),
      loadUsageByPlan(),
    ]);

    const enriched = await Promise.all(plans.map((plan) => planPayload({ ...plan, ...(usage.get(plan.id) || {}) })));
    const metrics = enriched.reduce(
      (acc, plan) => {
        acc.total += 1;
        if (plan.isActive) acc.active += 1;
        acc.activeSubscriptions += plan.activeSubscriptions;
        acc.mrr += plan.isActive ? plan.activeSubscriptions * plan.displayPrice : 0;
        acc.revenue += plan.displayRevenue;
        return acc;
      },
      { total: 0, active: 0, inactive: 0, activeSubscriptions: 0, mrr: 0, revenue: 0 }
    );
    metrics.inactive = metrics.total - metrics.active;

    const platformCurrency = String(await getPlatformSetting("currency") || "ZAR").toUpperCase();
    return NextResponse.json({ plans: enriched, metrics: { ...metrics, currency: platformCurrency }, platformCurrency }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Error fetching subscription plans:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { admin, response } = await requireMasterAdmin(request);
    if (response) return response;

    const body = await request.json().catch(() => ({}));
    const validation = validatePlanInput(body);
    if ("error" in validation) return NextResponse.json({ error: validation.error }, { status: 400 });
    const { id, name, price, maxStudents, maxStaff } = validation;

    const planId = id || crypto.randomUUID();
    const existing = await masterDb.select({ id: subscriptionPlansTable.id }).from(subscriptionPlansTable).where(eq(subscriptionPlansTable.id, planId)).limit(1);
    if (existing.length) {
      return NextResponse.json({ error: "A plan with this ID already exists" }, { status: 409 });
    }

    const [plan] = await masterDb
      .insert(subscriptionPlansTable)
      .values({
        id: planId,
        name,
        description: body.description ? String(body.description) : null,
        price: price.toFixed(2),
        features: buildFeatureJson(body),
        maxStudents,
        maxStaff,
        isActive: body.isActive !== false,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    await writeMasterAudit(request, {
      adminId: admin.adminId,
      action: "Subscription Plan Created",
      resource: "subscription_plans",
      resourceId: plan.id,
      changes: { name: plan.name, price: plan.price, isActive: plan.isActive },
    });

    return NextResponse.json({ success: true, plan: await planPayload(plan) }, { status: 201 });
  } catch (error) {
    console.error("Error creating subscription plan:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { admin, response } = await requireMasterAdmin(request);
    if (response) return response;

    const body = await request.json().catch(() => ({}));
    const validation = validatePlanInput(body, { requireId: true });
    if ("error" in validation) return NextResponse.json({ error: validation.error }, { status: 400 });
    const { id: planId, name, price, maxStudents, maxStaff } = validation;
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

    if (!plan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    await writeMasterAudit(request, {
      adminId: admin.adminId,
      action: "Subscription Plan Updated",
      resource: "subscription_plans",
      resourceId: plan.id,
      changes: { name: plan.name, price: plan.price, isActive: plan.isActive },
    });

    return NextResponse.json({ success: true, plan: await planPayload(plan) });
  } catch (error) {
    console.error("Error updating subscription plan:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
