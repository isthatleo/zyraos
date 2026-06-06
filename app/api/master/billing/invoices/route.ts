import { NextRequest, NextResponse } from 'next/server';
import { masterDb } from '@/lib/db';
import { invoicesTable, schoolsTable, subscriptionsTable, subscriptionPlansTable } from '@/lib/db-schema';
import { eq, desc } from 'drizzle-orm';
import crypto from 'node:crypto';
import { addDays, buildInvoiceNumber, getInvoicePolicy, getPlatformSettings } from '@/lib/platform-settings-server';
import { requireMasterAdmin, writeMasterAudit } from '@/lib/master-audit';
import { convertMoney } from '@/lib/currency-conversion';
import { deleteCachedValue, getCachedValue, setCachedValue } from '@/lib/server-response-cache';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const VALID_STATUSES = new Set(['pending', 'paid', 'overdue', 'void']);

function resolveStatus(status?: string | null, dueDate?: Date | null) {
  const normalized = String(status || 'pending').toLowerCase();
  if (normalized === 'pending' && dueDate && dueDate.getTime() < Date.now()) return 'overdue';
  return VALID_STATUSES.has(normalized) ? normalized : 'pending';
}

function toNumber(value: unknown) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatDate(date?: Date | null) {
  return date ? date.toISOString() : null;
}

function invalidateBillingCaches() {
  deleteCachedValue('master-dashboard');
  deleteCachedValue('master-billing-overview');
  for (const status of ['all', 'pending', 'paid', 'overdue', 'void']) {
    deleteCachedValue(`master-billing-invoices:${status}`);
  }
}

export async function GET(request: NextRequest) {
  try {
    const { response } = await requireMasterAdmin(request);
    if (response) return response;
    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get('status') || 'all';
    const cacheKey = `master-billing-invoices:${statusFilter}`;
    const cached = getCachedValue<Record<string, unknown>>(cacheKey);
    if (cached) {
      return NextResponse.json(cached, {
        headers: {
          'Cache-Control': 'private, max-age=30',
          'X-Roxan-Cache': 'HIT',
        },
      });
    }

    const data = await masterDb
      .select({
        id: invoicesTable.id,
        invoiceNumber: invoicesTable.invoiceNumber,
        schoolId: invoicesTable.schoolId,
        subscriptionId: invoicesTable.subscriptionId,
        amount: invoicesTable.amount,
        currency: invoicesTable.currency,
        status: invoicesTable.status,
        issueDate: invoicesTable.issueDate,
        dueDate: invoicesTable.dueDate,
        paidDate: invoicesTable.paidDate,
        description: invoicesTable.description,
        notes: invoicesTable.notes,
        schoolName: schoolsTable.name,
        schoolSlug: schoolsTable.slug,
        schoolCountry: schoolsTable.country,
        schoolCurrencyCode: schoolsTable.currencyCode,
        schoolCurrencyName: schoolsTable.currencyName,
        planName: subscriptionPlansTable.name,
      })
      .from(invoicesTable)
      .leftJoin(schoolsTable, eq(invoicesTable.schoolId, schoolsTable.id))
      .leftJoin(subscriptionsTable, eq(invoicesTable.subscriptionId, subscriptionsTable.id))
      .leftJoin(subscriptionPlansTable, eq(subscriptionsTable.planId, subscriptionPlansTable.id))
      .orderBy(desc(invoicesTable.issueDate));

    const invoices = data
      .map(async (inv) => {
        const status = resolveStatus(inv.status, inv.dueDate);
        const amount = toNumber(inv.amount);
        const converted = await convertMoney(amount, inv.currency || 'ZAR', inv.schoolCurrencyCode || inv.currency || 'ZAR');
        return {
          id: inv.id,
          invoiceNumber: inv.invoiceNumber,
          schoolId: inv.schoolId,
          subscriptionId: inv.subscriptionId,
          school: inv.schoolName || 'Unknown School',
          schoolSlug: inv.schoolSlug,
          schoolCountry: inv.schoolCountry,
          date: inv.issueDate ? new Date(inv.issueDate).toLocaleDateString() : '',
          issueDate: formatDate(inv.issueDate),
          amount,
          currency: inv.currency || 'ZAR',
          originalAmount: converted.originalAmount,
          originalCurrency: converted.originalCurrency,
          displayAmount: converted.displayAmount,
          displayCurrency: converted.displayCurrency,
          schoolCurrency: inv.schoolCurrencyCode || inv.currency || 'ZAR',
          schoolCurrencyName: inv.schoolCurrencyName,
          exchangeRate: converted.exchangeRate,
          exchangeRateDate: converted.exchangeRateDate,
          exchangeRateProvider: converted.exchangeRateProvider,
          exchangeRateStale: converted.exchangeRateStale,
          conversionAvailable: converted.conversionAvailable,
          status,
          dueDate: inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : '',
          dueDateIso: formatDate(inv.dueDate),
          paidDate: formatDate(inv.paidDate),
          description: inv.description,
          notes: inv.notes,
          plan: inv.planName || 'Subscription',
          ageDays: inv.dueDate ? Math.max(0, Math.floor((Date.now() - inv.dueDate.getTime()) / 86400000)) : 0,
        };
      });
    const invoicesWithConversion = await Promise.all(invoices);
    const filteredInvoices = invoicesWithConversion
      .filter((invoice) => statusFilter === 'all' || invoice.status === statusFilter);

    const summary = filteredInvoices.reduce(
      (acc, invoice) => {
        acc.totalInvoiced += invoice.amount;
        acc.byStatus[invoice.status] = (acc.byStatus[invoice.status] || 0) + 1;
        acc.amountByStatus[invoice.status] = (acc.amountByStatus[invoice.status] || 0) + invoice.amount;
        if (invoice.status === 'paid') acc.totalPaid += invoice.amount;
        if (invoice.status === 'pending' || invoice.status === 'overdue') acc.totalOutstanding += invoice.amount;
        if (invoice.status === 'overdue') acc.overdueAmount += invoice.amount;
        return acc;
      },
      {
        totalInvoiced: 0,
        totalPaid: 0,
        totalOutstanding: 0,
        overdueAmount: 0,
        byStatus: {} as Record<string, number>,
        amountByStatus: {} as Record<string, number>,
      }
    );

    const payload = { invoices: filteredInvoices, summary };
    setCachedValue(cacheKey, payload, 30_000);
    return NextResponse.json(payload, {
      headers: {
        'Cache-Control': 'private, max-age=30',
        'X-Roxan-Cache': 'MISS',
      },
    });
  } catch (error) {
    console.error('Error fetching invoices:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { admin, response } = await requireMasterAdmin(request);
    if (response) return response;

    const body = await request.json().catch(() => ({}));
    const settings = await getPlatformSettings();
    const invoicePolicy = getInvoicePolicy(settings);
    const schoolId = String(body.schoolId || '').trim();
    const amount = toNumber(body.amount);
    const currency = String(body.currency || invoicePolicy.currency).trim().toUpperCase();
    const description = String(body.description || 'Platform subscription invoice').trim();
    const notesParts = [body.notes ? String(body.notes).trim() : ''];
    if (invoicePolicy.taxRate > 0) {
      notesParts.push(`${invoicePolicy.taxLabel} policy: ${invoicePolicy.taxRate}% platform tax configured.`);
    }
    const notes = notesParts.filter(Boolean).join('\n') || null;
    const issueDate = body.issueDate ? new Date(body.issueDate) : new Date();
    const dueDate = body.dueDate ? new Date(body.dueDate) : addDays(issueDate, invoicePolicy.dueDays);

    if (!schoolId || amount <= 0) {
      return NextResponse.json({ error: 'School and positive amount are required' }, { status: 400 });
    }
    if (Number.isNaN(issueDate.getTime()) || Number.isNaN(dueDate.getTime())) {
      return NextResponse.json({ error: 'Invalid issue or due date' }, { status: 400 });
    }

    const school = await masterDb
      .select({ id: schoolsTable.id, subscriptionId: schoolsTable.subscriptionId, currencyCode: schoolsTable.currencyCode })
      .from(schoolsTable)
      .where(eq(schoolsTable.id, schoolId))
      .limit(1);
    if (!school.length) {
      return NextResponse.json({ error: 'School not found' }, { status: 404 });
    }

    const invoiceNumber = buildInvoiceNumber(invoicePolicy.prefix);
    const [invoice] = await masterDb
      .insert(invoicesTable)
      .values({
        id: crypto.randomUUID(),
        invoiceNumber,
        schoolId,
        subscriptionId: school[0].subscriptionId || null,
        amount: amount.toFixed(2),
        currency: currency || school[0].currencyCode || invoicePolicy.currency,
        status: 'pending',
        issueDate,
        dueDate,
        description,
        notes,
      })
      .returning();

    await writeMasterAudit(request, {
      adminId: admin.adminId,
      action: 'Invoice Created',
      resource: 'invoices',
      resourceId: invoice.id,
      changes: {
        invoiceNumber: invoice.invoiceNumber,
        schoolId: invoice.schoolId,
        amount: invoice.amount,
        currency: invoice.currency,
        status: invoice.status,
      },
    });
    invalidateBillingCaches();

    return NextResponse.json({ success: true, invoice }, { status: 201 });
  } catch (error) {
    console.error('Error creating invoice:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
