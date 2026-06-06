import { NextRequest, NextResponse } from 'next/server';
import { masterDb } from '@/lib/db';
import { schoolsTable, subscriptionsTable, subscriptionPlansTable, tenantModulesTable, invoicesTable, userTable, passwordSecurityTable } from '@/lib/db-schema';
import { eq, and, desc } from 'drizzle-orm';
import { requireMasterAdmin, writeMasterAudit } from '@/lib/master-audit';
import { convertMoney } from '@/lib/currency-conversion';
import { getPlatformSetting } from '@/lib/platform-settings-server';
import { getTenantPortalUrl } from '@/lib/tenant-url';
import { deleteCachedValue } from '@/lib/server-response-cache';

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

function invalidateSchoolsCaches() {
  deleteCachedValue("master-dashboard");
  for (const status of ["all", "active", "inactive", "trial", "deactivated"]) {
    for (const limit of [25, 50, 100]) {
      deleteCachedValue(`master-schools:${status === "all" ? "all" : status}:${limit}:0`);
    }
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ schoolId: string }> }
) {
  try {
    const { response } = await requireMasterAdmin(request);
    if (response) return response;

    const { schoolId } = await params;
    const platformCurrency = String(await getPlatformSetting("currency") || "ZAR").toUpperCase();

    // Get school details with subscription and modules
    const schoolData = await masterDb
      .select({
        id: schoolsTable.id,
        name: schoolsTable.name,
        slug: schoolsTable.slug,
        country: schoolsTable.country,
        countryCode: schoolsTable.countryCode,
        currencyCode: schoolsTable.currencyCode,
        currencyName: schoolsTable.currencyName,
        type: schoolsTable.type,
        status: schoolsTable.status,
        databaseUrl: schoolsTable.databaseUrl,
        subscriptionId: schoolsTable.subscriptionId,
        createdAt: schoolsTable.createdAt,
        updatedAt: schoolsTable.updatedAt,
        // Subscription info
        subscriptionStatus: subscriptionsTable.status,
        subscriptionStartDate: subscriptionsTable.startDate,
        subscriptionEndDate: subscriptionsTable.endDate,
        subscriptionBillingCycle: subscriptionsTable.autoRenew, // Not exactly billing cycle but used as proxy or can be extended
        // Plan info
        planName: subscriptionPlansTable.name,
        planPrice: subscriptionPlansTable.price,
        planFeatures: subscriptionPlansTable.features,
        maxStudents: subscriptionPlansTable.maxStudents,
        maxStaff: subscriptionPlansTable.maxStaff,
      })
      .from(schoolsTable)
      .leftJoin(subscriptionsTable, eq(schoolsTable.subscriptionId, subscriptionsTable.id))
      .leftJoin(subscriptionPlansTable, eq(subscriptionsTable.planId, subscriptionPlansTable.id))
      .where(eq(schoolsTable.id, schoolId))
      .limit(1);

    if (schoolData.length === 0) {
      return NextResponse.json(
        { error: 'School not found' },
        { status: 404 }
      );
    }

    // Get enabled modules for this school
    const modules = await masterDb
      .select({
        id: tenantModulesTable.id,
        moduleName: tenantModulesTable.moduleName,
        moduleKey: tenantModulesTable.moduleKey,
        isEnabled: tenantModulesTable.isEnabled,
      })
      .from(tenantModulesTable)
      .where(and(
        eq(tenantModulesTable.schoolId, schoolId),
        eq(tenantModulesTable.isEnabled, true)
      ));

    // Get all invoices for this school (including provisioning ones)
    const invoices = await masterDb
      .select()
      .from(invoicesTable)
      .where(eq(invoicesTable.schoolId, schoolId))
      .orderBy(desc(invoicesTable.issueDate));

    const school = schoolData[0];
    const planCurrency = getPlanCurrency(school.planFeatures, school.currencyCode || platformCurrency);
    const convertedPlan = await convertMoney(school.planPrice || 0, planCurrency, platformCurrency);
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

    const [owner] = await masterDb
      .select({
        id: userTable.id,
        name: userTable.name,
        email: userTable.email,
        image: userTable.image,
        roleName: userTable.role,
        temporaryAccess: passwordSecurityTable.forcePasswordChange,
        temporaryPasswordIssuedAt: passwordSecurityTable.temporaryPasswordIssuedAt,
      })
      .from(userTable)
      .innerJoin(passwordSecurityTable, eq(passwordSecurityTable.userId, userTable.id))
      .where(and(eq(passwordSecurityTable.tenantSlug, school.slug), eq(userTable.role, 'owner')))
      .limit(1);

    return NextResponse.json({
      school: {
        ...school,
        portalUrl: getTenantPortalUrl(school.slug, request),
        planPrice: toNumber(school.planPrice),
        planCurrency,
        displayPlanPrice: convertedPlan.displayAmount,
        displayCurrency: convertedPlan.displayCurrency,
        exchangeRateProvider: convertedPlan.exchangeRateProvider,
        owner: owner || null,
        modules,
        invoices: convertedInvoices,
      }
    });
  } catch (error) {
    console.error('Error fetching school:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ schoolId: string }> }
) {
  try {
    const { admin, response } = await requireMasterAdmin(request);
    if (response) return response;

    const { schoolId } = await params;
    const body = await request.json().catch(() => ({}));
    const {
      name,
      slug,
      country,
      countryCode,
      currencyCode,
      currencyName,
      type,
      status,
    } = body;

    // Check if school exists
    const existingSchool = await masterDb
      .select()
      .from(schoolsTable)
      .where(eq(schoolsTable.id, schoolId))
      .limit(1);

    if (existingSchool.length === 0) {
      return NextResponse.json(
        { error: 'School not found' },
        { status: 404 }
      );
    }

    const nextSlug = typeof slug === "string" ? slug.trim().toLowerCase() : undefined;
    if (nextSlug !== undefined) {
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(nextSlug)) {
        return NextResponse.json({ error: "Slug can only contain lowercase letters, numbers, and hyphens" }, { status: 400 });
      }
      const duplicate = await masterDb
        .select({ id: schoolsTable.id })
        .from(schoolsTable)
        .where(eq(schoolsTable.slug, nextSlug))
        .limit(1);
      if (duplicate.length && duplicate[0].id !== schoolId) {
        return NextResponse.json({ error: "Another school already uses this slug" }, { status: 409 });
      }
    }

    const updateData: any = {
      updatedAt: new Date(),
    };

    if (name !== undefined) updateData.name = String(name).trim();
    if (nextSlug !== undefined) updateData.slug = nextSlug;
    if (country !== undefined) updateData.country = String(country).trim();
    if (countryCode !== undefined) updateData.countryCode = String(countryCode || "").trim().toUpperCase() || null;
    if (currencyCode !== undefined) updateData.currencyCode = String(currencyCode || "").trim().toUpperCase() || null;
    if (currencyName !== undefined) updateData.currencyName = String(currencyName || "").trim() || null;
    if (type !== undefined) updateData.type = String(type).trim();
    if (status !== undefined) updateData.status = String(status).trim();

    const updatedSchool = await masterDb
      .update(schoolsTable)
      .set(updateData)
      .where(eq(schoolsTable.id, schoolId))
      .returning();

    if (nextSlug && nextSlug !== existingSchool[0].slug) {
      await masterDb
        .update(passwordSecurityTable)
        .set({ tenantSlug: nextSlug, updatedAt: new Date() })
        .where(eq(passwordSecurityTable.tenantSlug, existingSchool[0].slug));
    }

    await writeMasterAudit(request, {
      adminId: admin.adminId,
      action: 'School Updated',
      resource: 'schools',
      resourceId: schoolId,
      changes: {
        before: {
          name: existingSchool[0].name,
          slug: existingSchool[0].slug,
          country: existingSchool[0].country,
          countryCode: existingSchool[0].countryCode,
          currencyCode: existingSchool[0].currencyCode,
          currencyName: existingSchool[0].currencyName,
          type: existingSchool[0].type,
          status: existingSchool[0].status,
        },
        after: {
          name: updatedSchool[0].name,
          slug: updatedSchool[0].slug,
          country: updatedSchool[0].country,
          countryCode: updatedSchool[0].countryCode,
          currencyCode: updatedSchool[0].currencyCode,
          currencyName: updatedSchool[0].currencyName,
          type: updatedSchool[0].type,
          status: updatedSchool[0].status,
        },
      },
    });
    invalidateSchoolsCaches();

    return NextResponse.json({
      success: true,
      school: updatedSchool[0],
      message: 'School updated successfully'
    });
  } catch (error) {
    console.error('Error updating school:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ schoolId: string }> }
) {
  try {
    const { admin, response } = await requireMasterAdmin(request);
    if (response) return response;

    const { schoolId } = await params;

    // Check if school exists
    const existingSchool = await masterDb
      .select()
      .from(schoolsTable)
      .where(eq(schoolsTable.id, schoolId))
      .limit(1);

    if (existingSchool.length === 0) {
      return NextResponse.json(
        { error: 'School not found' },
        { status: 404 }
      );
    }

    // Soft delete by setting status to 'deactivated'
    // In production, you might want to actually delete or archive
    const updatedSchool = await masterDb
      .update(schoolsTable)
      .set({
        status: 'deactivated',
        updatedAt: new Date(),
      })
      .where(eq(schoolsTable.id, schoolId))
      .returning();

    await writeMasterAudit(request, {
      adminId: admin.adminId,
      action: 'School Deactivated',
      resource: 'schools',
      resourceId: schoolId,
      changes: {
        name: existingSchool[0].name,
        previousStatus: existingSchool[0].status,
        status: updatedSchool[0].status,
      },
    });
    invalidateSchoolsCaches();

    return NextResponse.json({
      success: true,
      school: updatedSchool[0],
      message: 'School deactivated successfully'
    });
  } catch (error) {
    console.error('Error deactivating school:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
