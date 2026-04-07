import { NextRequest, NextResponse } from 'next/server';
import { masterDb } from '@/lib/db';
import { schoolsTable, subscriptionsTable, subscriptionPlansTable, tenantModulesTable, invoicesTable } from '@/lib/db-schema';
import { eq, and, desc } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ schoolId: string }> }
) {
  try {
    const { schoolId } = await params;

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

    return NextResponse.json({
      school: {
        ...school,
        modules,
        invoices,
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
    const { schoolId } = await params;
    const body = await request.json();
    const { name, country, type, status } = body;

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

    // Update school
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (name !== undefined) updateData.name = name;
    if (country !== undefined) updateData.country = country;
    if (type !== undefined) updateData.type = type;
    if (status !== undefined) updateData.status = status;

    const updatedSchool = await masterDb
      .update(schoolsTable)
      .set(updateData)
      .where(eq(schoolsTable.id, schoolId))
      .returning();

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
