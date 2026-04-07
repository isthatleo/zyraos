import { NextRequest, NextResponse } from 'next/server';
import { masterDb } from '@/lib/db';
import { schoolsTable, subscriptionPlansTable, subscriptionsTable, tenantModulesTable } from '@/lib/db-schema';
import { eq, desc, sql } from 'drizzle-orm';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
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

    // For now, use the same database URL (in production, this would create a new database)
    const databaseUrl = process.env.DATABASE_URL!;

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
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const schools = await masterDb
      .select({
        id: schoolsTable.id,
        name: schoolsTable.name,
        slug: schoolsTable.slug,
        country: schoolsTable.country,
        type: schoolsTable.type,
        status: schoolsTable.status,
        subscriptionId: schoolsTable.subscriptionId,
        createdAt: schoolsTable.createdAt,
        // Join with subscription and plan info
        planName: subscriptionPlansTable.name,
        planPrice: subscriptionPlansTable.price,
      })
      .from(schoolsTable)
      .leftJoin(subscriptionsTable, eq(schoolsTable.subscriptionId, subscriptionsTable.id))
      .leftJoin(subscriptionPlansTable, eq(subscriptionsTable.planId, subscriptionPlansTable.id))
      .where(status ? eq(schoolsTable.status, status) : undefined)
      .orderBy(desc(schoolsTable.createdAt))
      .limit(limit)
      .offset(offset);

    // Get total count
    const totalResult = await masterDb
      .select({ count: sql<number>`count(*)` })
      .from(schoolsTable)
      .where(status ? eq(schoolsTable.status, status) : undefined);

    const total = totalResult[0].count;

    return NextResponse.json({
      schools,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      }
    });
  } catch (error) {
    console.error('Error fetching schools:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
