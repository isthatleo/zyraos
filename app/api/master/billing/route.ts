import { NextRequest, NextResponse } from 'next/server';
import { desc, eq } from 'drizzle-orm';

import { masterDb } from '@/lib/db';
import { invoicesTable, schoolsTable, subscriptionPlansTable, subscriptionsTable } from '@/lib/db-schema';
import { getCachedValue, setCachedValue } from '@/lib/server-response-cache';
import { requireMasterAdmin } from '@/lib/master-audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function toNumber(value: unknown) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function resolveStatus(status?: string | null, dueDate?: Date | null) {
  const normalized = String(status || 'pending').toLowerCase();
  if (normalized === 'pending' && dueDate && dueDate.getTime() < Date.now()) return 'overdue';
  return ['pending', 'paid', 'overdue', 'void'].includes(normalized) ? normalized : 'pending';
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export async function GET(request: NextRequest) {
  try {
    const { response } = await requireMasterAdmin(request);
    if (response) return response;
    const cached = getCachedValue<Record<string, unknown>>('master-billing-overview');
    if (cached) {
      return NextResponse.json(cached, {
        headers: {
          'Cache-Control': 'private, max-age=30',
          'X-Roxan-Cache': 'HIT',
        },
      });
    }

    const invoiceRows = await masterDb
      .select({
        id: invoicesTable.id,
        invoiceNumber: invoicesTable.invoiceNumber,
        amount: invoicesTable.amount,
        currency: invoicesTable.currency,
        status: invoicesTable.status,
        issueDate: invoicesTable.issueDate,
        dueDate: invoicesTable.dueDate,
        schoolName: schoolsTable.name,
        schoolSlug: schoolsTable.slug,
        planName: subscriptionPlansTable.name,
      })
      .from(invoicesTable)
      .leftJoin(schoolsTable, eq(invoicesTable.schoolId, schoolsTable.id))
      .leftJoin(subscriptionsTable, eq(invoicesTable.subscriptionId, subscriptionsTable.id))
      .leftJoin(subscriptionPlansTable, eq(subscriptionsTable.planId, subscriptionPlansTable.id))
      .orderBy(desc(invoicesTable.issueDate));

    const subscriptionRows = await masterDb
      .select({
        id: subscriptionsTable.id,
        status: subscriptionsTable.status,
        endDate: subscriptionsTable.endDate,
        schoolName: schoolsTable.name,
        planName: subscriptionPlansTable.name,
        planPrice: subscriptionPlansTable.price,
      })
      .from(subscriptionsTable)
      .leftJoin(schoolsTable, eq(subscriptionsTable.schoolId, schoolsTable.id))
      .leftJoin(subscriptionPlansTable, eq(subscriptionsTable.planId, subscriptionPlansTable.id));

    const invoices = invoiceRows.map((invoice) => ({
      ...invoice,
      amount: toNumber(invoice.amount),
      status: resolveStatus(invoice.status, invoice.dueDate),
    }));

    const metrics = invoices.reduce(
      (acc, invoice) => {
        acc.totalInvoiced += invoice.amount;
        acc.invoiceCount += 1;
        acc.statusCounts[invoice.status] = (acc.statusCounts[invoice.status] || 0) + 1;
        acc.statusAmounts[invoice.status] = (acc.statusAmounts[invoice.status] || 0) + invoice.amount;
        if (invoice.status === 'paid') acc.totalCollected += invoice.amount;
        if (invoice.status === 'pending' || invoice.status === 'overdue') acc.outstanding += invoice.amount;
        if (invoice.status === 'overdue') acc.overdue += invoice.amount;
        return acc;
      },
      {
        totalInvoiced: 0,
        totalCollected: 0,
        outstanding: 0,
        overdue: 0,
        invoiceCount: 0,
        statusCounts: {} as Record<string, number>,
        statusAmounts: {} as Record<string, number>,
      }
    );

    const activeSubscriptions = subscriptionRows.filter((sub) => sub.status === 'active');
    const mrr = activeSubscriptions.reduce((sum, sub) => sum + toNumber(sub.planPrice), 0);
    const collectionRate = metrics.totalInvoiced > 0 ? (metrics.totalCollected / metrics.totalInvoiced) * 100 : 0;

    const planDistribution = activeSubscriptions.reduce((acc, sub) => {
      const name = sub.planName || 'Unassigned';
      const existing = acc.find((item) => item.name === name);
      if (existing) {
        existing.value += 1;
        existing.revenue += toNumber(sub.planPrice);
      } else {
        acc.push({ name, value: 1, revenue: toNumber(sub.planPrice) });
      }
      return acc;
    }, [] as Array<{ name: string; value: number; revenue: number }>);

    const revenueTrendMap = new Map<string, { month: string; invoiced: number; collected: number }>();
    for (let i = 5; i >= 0; i -= 1) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const key = monthKey(date);
      revenueTrendMap.set(key, { month: key, invoiced: 0, collected: 0 });
    }
    for (const invoice of invoices) {
      if (!invoice.issueDate) continue;
      const key = monthKey(invoice.issueDate);
      const row = revenueTrendMap.get(key);
      if (!row) continue;
      row.invoiced += invoice.amount;
      if (invoice.status === 'paid') row.collected += invoice.amount;
    }

    const agingBuckets = [
      { label: 'Current', amount: 0, count: 0 },
      { label: '1-30 days', amount: 0, count: 0 },
      { label: '31-60 days', amount: 0, count: 0 },
      { label: '60+ days', amount: 0, count: 0 },
    ];
    for (const invoice of invoices.filter((item) => item.status === 'pending' || item.status === 'overdue')) {
      const ageDays = invoice.dueDate ? Math.floor((Date.now() - invoice.dueDate.getTime()) / 86400000) : 0;
      const bucket = ageDays <= 0 ? agingBuckets[0] : ageDays <= 30 ? agingBuckets[1] : ageDays <= 60 ? agingBuckets[2] : agingBuckets[3];
      bucket.amount += invoice.amount;
      bucket.count += 1;
    }

    const payload = {
      metrics: {
        ...metrics,
        mrr,
        activeSubscriptions: activeSubscriptions.length,
        collectionRate,
      },
      recentInvoices: invoices.slice(0, 8).map((invoice) => ({
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        school: invoice.schoolName || 'Unknown School',
        schoolSlug: invoice.schoolSlug,
        amount: invoice.amount,
        currency: invoice.currency || 'ZAR',
        status: invoice.status,
        dueDate: invoice.dueDate,
        issueDate: invoice.issueDate,
        plan: invoice.planName || 'Subscription',
      })),
      planDistribution,
      revenueTrend: Array.from(revenueTrendMap.values()),
      agingBuckets,
      atRiskInvoices: invoices
        .filter((invoice) => invoice.status === 'overdue')
        .slice(0, 6)
        .map((invoice) => ({
          id: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          school: invoice.schoolName || 'Unknown School',
          amount: invoice.amount,
          currency: invoice.currency || 'ZAR',
          dueDate: invoice.dueDate,
        })),
    };
    setCachedValue('master-billing-overview', payload, 30_000);
    return NextResponse.json(payload, {
      headers: {
        'Cache-Control': 'private, max-age=30',
        'X-Roxan-Cache': 'MISS',
      },
    });
  } catch (error) {
    console.error('Error loading billing overview:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
