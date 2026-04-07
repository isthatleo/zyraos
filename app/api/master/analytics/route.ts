import { NextResponse } from 'next/server';
import { masterDb } from '@/lib/db';
import { schoolsTable, subscriptionsTable, subscriptionPlansTable, platformAdminsTable, invoicesTable } from '@/lib/db-schema';
import { eq, sql, desc, and, lte, gte } from 'drizzle-orm';

export async function GET() {
  try {
    // 1. KPI Stats
    const totalSchools = await masterDb.select({ count: sql<number>`count(*)` }).from(schoolsTable);
    const activeSchools = await masterDb.select({ count: sql<number>`count(*)` }).from(schoolsTable).where(eq(schoolsTable.status, 'active'));
    
    const activeSubscriptions = await masterDb
      .select({
        price: subscriptionPlansTable.price,
      })
      .from(subscriptionsTable)
      .innerJoin(subscriptionPlansTable, eq(subscriptionsTable.planId, subscriptionPlansTable.id))
      .where(eq(subscriptionsTable.status, 'active'));

    const mrr = activeSubscriptions.reduce((acc, sub) => acc + Number(sub.price), 0);

    const platformAdmins = await masterDb.select({ count: sql<number>`count(*)` }).from(platformAdminsTable);

    // 2. Plan Distribution
    const planDistribution = await masterDb
      .select({
        name: subscriptionPlansTable.name,
        value: sql<number>`count(${subscriptionsTable.id})`,
      })
      .from(subscriptionPlansTable)
      .leftJoin(subscriptionsTable, eq(subscriptionsTable.planId, subscriptionPlansTable.id))
      .groupBy(subscriptionPlansTable.name);

    const colors = ['#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444', '#10B981', '#6366F1'];
    const planDistributionWithColors = planDistribution.map((plan, index) => ({
      ...plan,
      color: colors[index % colors.length],
    }));

    // 3. Recent Provisionings (Last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);

    const recentProvisionings = await masterDb
      .select({
        month: sql<string>`to_char(${schoolsTable.createdAt}, 'Mon')`,
        monthNum: sql<number>`extract(month from ${schoolsTable.createdAt})`,
        year: sql<number>`extract(year from ${schoolsTable.createdAt})`,
        count: sql<number>`count(*)`,
      })
      .from(schoolsTable)
      .where(gte(schoolsTable.createdAt, sixMonthsAgo))
      .groupBy(sql`to_char(${schoolsTable.createdAt}, 'Mon')`, sql`extract(month from ${schoolsTable.createdAt})`, sql`extract(year from ${schoolsTable.createdAt})`)
      .orderBy(sql`extract(year from ${schoolsTable.createdAt})`, sql`extract(month from ${schoolsTable.createdAt})`);

    // 4. Revenue Trend (Last 6 months based on paid invoices)
    const revenueTrend = await masterDb
      .select({
        month: sql<string>`to_char(${invoicesTable.paidDate}, 'Mon')`,
        amount: sql<number>`sum(${invoicesTable.amount})`,
      })
      .from(invoicesTable)
      .where(and(eq(invoicesTable.status, 'paid'), gte(invoicesTable.paidDate, sixMonthsAgo)))
      .groupBy(sql`to_char(${invoicesTable.paidDate}, 'Mon')`, sql`extract(month from ${invoicesTable.paidDate})`, sql`extract(year from ${invoicesTable.paidDate})`)
      .orderBy(sql`extract(year from ${invoicesTable.paidDate})`, sql`extract(month from ${invoicesTable.paidDate})`);

    // 5. School Growth (Cumulative)
    const schoolGrowth = await masterDb
      .select({
        month: sql<string>`to_char(${schoolsTable.createdAt}, 'Mon')`,
        count: sql<number>`count(*)`,
      })
      .from(schoolsTable)
      .where(gte(schoolsTable.createdAt, sixMonthsAgo))
      .groupBy(sql`to_char(${schoolsTable.createdAt}, 'Mon')`, sql`extract(month from ${schoolsTable.createdAt})`, sql`extract(year from ${schoolsTable.createdAt})`)
      .orderBy(sql`extract(year from ${schoolsTable.createdAt})`, sql`extract(month from ${schoolsTable.createdAt})`);

    return NextResponse.json({
      stats: {
        totalSchools: totalSchools[0]?.count || 0,
        activeSchools: activeSchools[0]?.count || 0,
        mrr,
        platformAdmins: platformAdmins[0]?.count || 0,
      },
      planDistribution: planDistributionWithColors,
      recentProvisionings: recentProvisionings.map(p => ({ month: p.month, count: Number(p.count) })),
      revenueTrend: revenueTrend.map(r => ({ month: r.month, amount: Number(r.amount) })),
      schoolGrowth: schoolGrowth.map(s => ({ month: s.month, count: Number(s.count) })),
    });
  } catch (error) {
    console.error('Failed to fetch analytics:', error);
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
  }
}
