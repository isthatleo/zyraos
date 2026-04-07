import { NextRequest, NextResponse } from 'next/server';
import { masterDb } from '@/lib/db';
import { schoolsTable, subscriptionsTable, subscriptionPlansTable, invoicesTable } from '@/lib/db-schema';
import { eq, and } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ schoolId: string, invoiceId: string }> }
) {
  try {
    const { schoolId, invoiceId } = await params;

    if (!schoolId || !invoiceId) {
      return NextResponse.json(
        { error: 'Invalid parameters' },
        { status: 400 }
      );
    }

    // Get invoice details with school and subscription/plan info
    const data = await masterDb
      .select({
        invoice: invoicesTable,
        school: {
          name: schoolsTable.name,
          country: schoolsTable.country,
          countryCode: schoolsTable.countryCode,
          currencyCode: schoolsTable.currencyCode,
          currencyName: schoolsTable.currencyName,
        }
      })
      .from(invoicesTable)
      .leftJoin(schoolsTable, eq(invoicesTable.schoolId, schoolsTable.id))
      .where(and(
        eq(invoicesTable.id, invoiceId),
        eq(invoicesTable.schoolId, schoolId)
      ))
      .limit(1);

    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    const result: any = { ...data[0] };

    // Separately fetch plan info if subscription exists
    if (result.invoice.subscriptionId) {
      const planData = await masterDb
        .select({
          name: subscriptionPlansTable.name,
          price: subscriptionPlansTable.price,
        })
        .from(subscriptionsTable)
        .leftJoin(subscriptionPlansTable, eq(subscriptionsTable.planId, subscriptionPlansTable.id))
        .where(eq(subscriptionsTable.id, result.invoice.subscriptionId))
        .limit(1);
      
      if (planData.length > 0) {
        result.plan = planData[0];
      } else {
        result.plan = null;
      }
    } else {
      result.plan = null;
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching invoice:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
