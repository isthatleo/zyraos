import { NextResponse } from 'next/server';
import { masterDb } from '@/lib/db';
import { schoolsTable, subscriptionsTable, subscriptionPlansTable } from '@/lib/db-schema';
import { desc, eq, sql } from 'drizzle-orm';

export async function GET() {
  try {
    // Get schools count
    const allSchools = await masterDb.select().from(schoolsTable);
    const activeSchools = allSchools.filter(s => s.status === 'active').length;

    // Get total revenue (sum of paid invoices or based on active subscriptions)
    // For now, let's sum the prices of active subscriptions
    const revenueData = await masterDb
      .select({
        totalRevenue: sql<number>`sum(${subscriptionPlansTable.price})`
      })
      .from(subscriptionsTable)
      .innerJoin(subscriptionPlansTable, eq(subscriptionsTable.planId, subscriptionPlansTable.id))
      .where(eq(subscriptionsTable.status, 'active'));

    const totalRevenue = Number(revenueData[0]?.totalRevenue || 0);

    // Get recent schools with their subscription plans
    const recentSchoolsData = await masterDb
      .select({
        id: schoolsTable.id,
        name: schoolsTable.name,
        slug: schoolsTable.slug,
        status: schoolsTable.status,
        createdAt: schoolsTable.createdAt,
        subscriptionPlan: subscriptionPlansTable.name,
      })
      .from(schoolsTable)
      .leftJoin(subscriptionsTable, eq(schoolsTable.id, subscriptionsTable.schoolId))
      .leftJoin(subscriptionPlansTable, eq(subscriptionsTable.planId, subscriptionPlansTable.id))
      .orderBy(desc(schoolsTable.createdAt))
      .limit(5);

    const stats = {
      totalSchools: allSchools.length,
      activeSchools,
      totalRevenue,
      systemStatus: 'healthy' as const
    };

    const recentSchools = recentSchoolsData.map(school => ({
      ...school,
      createdAt: new Date(school.createdAt).toLocaleDateString(),
      subscriptionPlan: school.subscriptionPlan || 'No Plan'
    }));

    return NextResponse.json({ stats, recentSchools });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return NextResponse.json(
      {
        stats: {
          totalSchools: 0,
          activeSchools: 0,
          totalRevenue: 0,
          systemStatus: 'error' as const
        },
        recentSchools: []
      },
      { status: 500 }
    );
  }
}
