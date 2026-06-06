import { NextRequest, NextResponse } from 'next/server';
import { masterDb } from '@/lib/db';
import { schoolsTable, subscriptionPlansTable, subscriptionsTable, tenantModulesTable } from '@/lib/db-schema';
import { eq, desc, sql } from 'drizzle-orm';
import crypto from 'crypto';
import { requireMasterAdmin, writeMasterAudit } from '@/lib/master-audit';
import { convertMoney } from '@/lib/currency-conversion';
import { getPlatformSetting } from '@/lib/platform-settings-server';
import { getTenantPortalUrl, resolveTenantDatabaseUrl } from '@/lib/tenant-url';
import { deleteCachedValue, getCachedValue, setCachedValue } from '@/lib/server-response-cache';

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function toNumber(value: unknown) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getPlanCurrency(features: unknown, fallback: string) {
  if (features && typeof features === "object" && !Array.isArray(features)) {
    const currency = String((features as Record<string, unknown>).currency || "").trim().toUpperCase();
    if (/^[A-Z]{3}$/.test(currency)) return currency;
  }
  return fallback;
}

function schoolsCacheKey(input: { status: string | null; limit: number; offset: number }) {
  return `master-schools:${input.status || "all"}:${input.limit}:${input.offset}`;
}

function invalidateSchoolsCaches() {
  deleteCachedValue("master-dashboard");
  for (const status of ["all", "active", "inactive", "trial", "deactivated"]) {
    for (const limit of [25, 50, 100]) {
      deleteCachedValue(schoolsCacheKey({ status: status === "all" ? null : status, limit, offset: 0 }));
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const { admin, response } = await requireMasterAdmin(request);
    if (response) return response;

    const body = await request.json();
    const { name, slug, country, type, planId } = body;

    // Validate required fields
    if (!name || !slug || !country || !type) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if slug is already taken
    const existingSchool = await masterDb
      .select()
      .from(schoolsTable)
      .where(eq(schoolsTable.slug, slug))
      .limit(1);

    if (existingSchool.length > 0) {
      return NextResponse.json(
        { error: 'School slug already exists' },
        { status: 409 }
      );
    }

    const databaseUrl = resolveTenantDatabaseUrl(slug);

    // Get the selected plan if provided
    let subscriptionId = null;
    if (planId) {
      const plan = await masterDb
        .select()
        .from(subscriptionPlansTable)
        .where(eq(subscriptionPlansTable.id, planId))
        .limit(1);

      if (plan.length > 0) {
        // Create subscription record
        const subId = crypto.randomUUID();
        const startDate = new Date();
        const endDate = new Date();
        endDate.setFullYear(endDate.getFullYear() + 1);

        await masterDb
          .insert(subscriptionsTable)
          .values({
            id: subId,
            schoolId: '', // Will be updated after school creation
            planId,
            status: 'active',
            startDate,
            endDate,
            autoRenew: true,
          });

        subscriptionId = subId;
      }
    }

    // Create the school record
    const newSchool = await masterDb
      .insert(schoolsTable)
      .values({
        id: crypto.randomUUID(),
        name,
        slug,
        country,
        type,
        databaseUrl,
        subscriptionId,
      })
      .returning();

    // Update subscription with school ID if it was created
    if (subscriptionId) {
      await masterDb
        .update(subscriptionsTable)
        .set({ schoolId: newSchool[0].id })
        .where(eq(subscriptionsTable.id, subscriptionId));
    }

    await writeMasterAudit(request, {
      adminId: admin.adminId,
      action: 'School Created',
      resource: 'schools',
      resourceId: newSchool[0].id,
      changes: {
        name: newSchool[0].name,
        slug: newSchool[0].slug,
        country: newSchool[0].country,
        type: newSchool[0].type,
        subscriptionId,
      },
    });
    invalidateSchoolsCaches();

    return NextResponse.json({
      success: true,
      school: newSchool[0],
      message: 'School created successfully'
    });

  } catch (error) {
    console.error('Error creating school:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { response } = await requireMasterAdmin(request);
    if (response) return response;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10) || 50));
    const offset = Math.max(0, parseInt(searchParams.get('offset') || '0', 10) || 0);
    const cacheKey = schoolsCacheKey({ status, limit, offset });
    const cached = getCachedValue<Record<string, unknown>>(cacheKey);
    if (cached) {
      return NextResponse.json(cached, {
        headers: {
          "Cache-Control": "private, max-age=30",
          "X-Roxan-Cache": "HIT",
        },
      });
    }

    const platformCurrency = String(await getPlatformSetting("currency") || "ZAR").toUpperCase();

    const schools = await masterDb
      .select({
        id: schoolsTable.id,
        name: schoolsTable.name,
        slug: schoolsTable.slug,
        country: schoolsTable.country,
        type: schoolsTable.type,
        status: schoolsTable.status,
        currencyCode: schoolsTable.currencyCode,
        subscriptionId: schoolsTable.subscriptionId,
        createdAt: schoolsTable.createdAt,
        // Join with subscription and plan info
        planName: subscriptionPlansTable.name,
        planPrice: subscriptionPlansTable.price,
        planFeatures: subscriptionPlansTable.features,
      })
      .from(schoolsTable)
      .leftJoin(subscriptionsTable, eq(schoolsTable.subscriptionId, subscriptionsTable.id))
      .leftJoin(subscriptionPlansTable, eq(subscriptionsTable.planId, subscriptionPlansTable.id))
      .where(status ? eq(schoolsTable.status, status) : undefined)
      .orderBy(desc(schoolsTable.createdAt))
      .limit(limit)
      .offset(offset);

    const convertedSchools = await Promise.all(schools.map(async (school) => {
      const planCurrency = getPlanCurrency(school.planFeatures, school.currencyCode || platformCurrency);
      const convertedPlan = await convertMoney(school.planPrice || 0, planCurrency, platformCurrency);
      return {
        ...school,
        portalUrl: getTenantPortalUrl(school.slug, request),
        planPrice: toNumber(school.planPrice),
        planCurrency,
        displayPlanPrice: convertedPlan.displayAmount,
        displayCurrency: convertedPlan.displayCurrency,
        exchangeRateProvider: convertedPlan.exchangeRateProvider,
        conversionAvailable: convertedPlan.conversionAvailable,
      };
    }));

    // Get total count
    const totalResult = await masterDb
      .select({ count: sql<number>`count(*)` })
      .from(schoolsTable)
      .where(status ? eq(schoolsTable.status, status) : undefined);

    const total = Number(totalResult[0].count || 0);
    const statsRows = await masterDb
      .select({
        status: schoolsTable.status,
        count: sql<number>`count(*)`,
      })
      .from(schoolsTable)
      .groupBy(schoolsTable.status);

    const typeRows = await masterDb
      .select({
        type: schoolsTable.type,
        count: sql<number>`count(*)`,
      })
      .from(schoolsTable)
      .groupBy(schoolsTable.type);

    const mrrRows = await masterDb
      .select({
        price: subscriptionPlansTable.price,
        currencyCode: schoolsTable.currencyCode,
        planFeatures: subscriptionPlansTable.features,
      })
      .from(subscriptionsTable)
      .innerJoin(subscriptionPlansTable, eq(subscriptionsTable.planId, subscriptionPlansTable.id))
      .innerJoin(schoolsTable, eq(subscriptionsTable.schoolId, schoolsTable.id))
      .where(eq(subscriptionsTable.status, 'active'));

    const convertedMrrRows = await Promise.all(
      mrrRows.map((row) => convertMoney(row.price, getPlanCurrency(row.planFeatures, row.currencyCode || platformCurrency), platformCurrency))
    );
    const mrr = convertedMrrRows.reduce((sum, row) => sum + row.displayAmount, 0);

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const newThisMonth = schools.filter((school) => new Date(school.createdAt) >= monthStart).length;

    const payload = {
      schools: convertedSchools,
      stats: {
        total,
        active: Number(statsRows.find((row) => row.status === 'active')?.count || 0),
        inactive: Number(total) - Number(statsRows.find((row) => row.status === 'active')?.count || 0),
        newThisMonth,
        mrr,
        currency: platformCurrency,
        byType: typeRows.map((row) => ({ type: row.type, count: Number(row.count || 0) })),
      },
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      }
    };
    setCachedValue(cacheKey, payload, 30_000);
    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": "private, max-age=30",
        "X-Roxan-Cache": "MISS",
      },
    });
  } catch (error) {
    console.error('Error fetching schools:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
