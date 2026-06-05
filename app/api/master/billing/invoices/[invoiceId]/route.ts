import { NextRequest, NextResponse } from 'next/server';
import { masterDb } from '@/lib/db';
import { invoicesTable, schoolsTable, subscriptionsTable, subscriptionPlansTable } from '@/lib/db-schema';
import { eq } from 'drizzle-orm';
import { requireMasterAdmin, writeMasterAudit } from '@/lib/master-audit';
import { convertMoney } from '@/lib/currency-conversion';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const VALID_STATUSES = new Set(['pending', 'paid', 'overdue', 'void']);

function resolveStatus(status?: string | null, dueDate?: Date | null) {
  const normalized = String(status || 'pending').toLowerCase();
  if (normalized === 'pending' && dueDate && dueDate.getTime() < Date.now()) return 'overdue';
  return VALID_STATUSES.has(normalized) ? normalized : 'pending';
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ invoiceId: string }> }
) {
  try {
    const { invoiceId } = await params;

    const data = await masterDb
      .select({
        invoice: invoicesTable,
        schoolName: schoolsTable.name,
        schoolSlug: schoolsTable.slug,
        schoolCountry: schoolsTable.country,
        schoolCurrencyCode: schoolsTable.currencyCode,
      schoolCurrencyName: schoolsTable.currencyName,
      subscriptionStatus: subscriptionsTable.status,
      subscriptionStartDate: subscriptionsTable.startDate,
      subscriptionEndDate: subscriptionsTable.endDate,
      planName: subscriptionPlansTable.name,
      planPrice: subscriptionPlansTable.price,
    })
    .from(invoicesTable)
    .leftJoin(schoolsTable, eq(invoicesTable.schoolId, schoolsTable.id))
    .leftJoin(subscriptionsTable, eq(invoicesTable.subscriptionId, subscriptionsTable.id))
    .leftJoin(subscriptionPlansTable, eq(subscriptionsTable.planId, subscriptionPlansTable.id))
    .where(eq(invoicesTable.id, invoiceId))
    .limit(1);

    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    const row = data[0];
    const converted = await convertMoney(
      row.invoice.amount,
      row.invoice.currency || 'ZAR',
      row.schoolCurrencyCode || row.invoice.currency || 'ZAR'
    );
    const invoice = {
      id: row.invoice.id,
      invoiceId: row.invoice.invoiceNumber,
      invoiceNumber: row.invoice.invoiceNumber,
      schoolId: row.invoice.schoolId,
      subscriptionId: row.invoice.subscriptionId,
      schoolName: row.schoolName || 'Unknown School',
      schoolSlug: row.schoolSlug || '',
      schoolAddress: `${row.schoolCountry || ''}`,
      schoolPhone: '',
      amount: converted.displayAmount,
      currency: row.invoice.currency || 'ZAR',
      originalAmount: converted.originalAmount,
      originalCurrency: converted.originalCurrency,
      displayAmount: converted.displayAmount,
      displayCurrency: converted.displayCurrency,
      status: resolveStatus(row.invoice.status, row.invoice.dueDate),
      issueDate: row.invoice.issueDate,
      dueDate: row.invoice.dueDate,
      paidDate: row.invoice.paidDate,
      description: row.invoice.description,
      notes: row.invoice.notes,
      plan: row.planName ? `${row.planName} Plan` : (row.invoice.description || 'Subscription'),
      planPrice: row.planPrice ? parseFloat(row.planPrice) : null,
      billingPeriod: row.subscriptionStartDate && row.subscriptionEndDate
        ? `${new Date(row.subscriptionStartDate).toLocaleDateString()} - ${new Date(row.subscriptionEndDate).toLocaleDateString()}`
        : 'Subscription period',
      subscriptionStatus: row.subscriptionStatus,
      schoolCurrency: row.schoolCurrencyCode || 'ZAR',
      schoolCurrencyName: row.schoolCurrencyName || '',
      exchangeRate: converted.exchangeRate,
      exchangeRateDate: converted.exchangeRateDate,
      exchangeRateProvider: converted.exchangeRateProvider,
      exchangeRateStale: converted.exchangeRateStale,
      conversionAvailable: converted.conversionAvailable,
    };

    return NextResponse.json({ invoice });
  } catch (error) {
    console.error('Error fetching invoice:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ invoiceId: string }> }
) {
  try {
    const { admin, response } = await requireMasterAdmin(request);
    if (response) return response;

    const { invoiceId } = await params;
    const body = await request.json().catch(() => ({}));
    const status = String(body.status || '').toLowerCase();
    const notes = typeof body.notes === 'string' ? body.notes : undefined;

    if (!VALID_STATUSES.has(status)) {
      return NextResponse.json({ error: 'Invalid invoice status' }, { status: 400 });
    }

    const [invoice] = await masterDb
      .update(invoicesTable)
      .set({
        status,
        paidDate: status === 'paid' ? new Date() : null,
        notes,
        updatedAt: new Date(),
      })
      .where(eq(invoicesTable.id, invoiceId))
      .returning();

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    await writeMasterAudit(request, {
      adminId: admin.adminId,
      action: 'Invoice Updated',
      resource: 'invoices',
      resourceId: invoice.id,
      changes: {
        invoiceNumber: invoice.invoiceNumber,
        status: invoice.status,
        paidDate: invoice.paidDate?.toISOString() || null,
      },
    });

    return NextResponse.json({ success: true, invoice });
  } catch (error) {
    console.error('Error updating invoice:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
