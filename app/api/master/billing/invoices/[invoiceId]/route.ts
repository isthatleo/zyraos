import { NextRequest, NextResponse } from 'next/server';
import { masterDb } from '@/lib/db';
import { invoicesTable, schoolsTable, subscriptionsTable, subscriptionPlansTable } from '@/lib/db-schema';
import { eq } from 'drizzle-orm';

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
      })
      .from(invoicesTable)
      .leftJoin(schoolsTable, eq(invoicesTable.schoolId, schoolsTable.id))
      .where(eq(invoicesTable.id, invoiceId))
      .limit(1);

    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    const row = data[0];
    let planName = null;
    let planPrice = null;

    if (row.invoice.subscriptionId) {
      const planData = await masterDb
        .select({
          name: subscriptionPlansTable.name,
          price: subscriptionPlansTable.price,
        })
        .from(subscriptionsTable)
        .leftJoin(subscriptionPlansTable, eq(subscriptionsTable.planId, subscriptionPlansTable.id))
        .where(eq(subscriptionsTable.id, row.invoice.subscriptionId))
        .limit(1);
      if (planData.length > 0) {
        planName = planData[0].name;
        planPrice = planData[0].price;
      }
    }

    const invoice = {
      id: row.invoice.id,
      invoiceId: row.invoice.invoiceNumber,
      schoolName: row.schoolName || 'Unknown School',
      schoolSlug: row.schoolSlug || '',
      schoolAddress: `${row.schoolCountry || ''}`,
      schoolPhone: '',
      amount: parseFloat(row.invoice.amount || '0'),
      status: row.invoice.status || 'pending',
      issueDate: row.invoice.issueDate,
      dueDate: row.invoice.dueDate,
      plan: planName ? `${planName} Plan` : (row.invoice.description || 'Subscription'),
      billingPeriod: 'Monthly',
      schoolCurrency: row.schoolCurrencyCode || 'ZAR',
      exchangeRate: 1,
    };

    return NextResponse.json({ invoice });
  } catch (error) {
    console.error('Error fetching invoice:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
