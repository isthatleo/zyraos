import { NextRequest, NextResponse } from 'next/server';
import { masterDb } from '@/lib/db';
import { schoolsTable, subscriptionsTable, subscriptionPlansTable, invoicesTable } from '@/lib/db-schema';
import { eq, and, or } from 'drizzle-orm';
import { convertMoney } from '@/lib/currency-conversion';
import { requireMasterAdmin, writeMasterAudit } from '@/lib/master-audit';

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ schoolId: string, invoiceId: string }> }
) {
  try {
    const { response } = await requireMasterAdmin(request);
    if (response) return response;

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
        or(eq(invoicesTable.id, invoiceId), eq(invoicesTable.invoiceNumber, invoiceId)),
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
    const converted = await convertMoney(
      result.invoice.amount,
      result.invoice.currency || 'ZAR',
      result.school?.currencyCode || result.invoice.currency || 'ZAR'
    );
    result.invoice = {
      ...result.invoice,
      originalAmount: converted.originalAmount,
      originalCurrency: converted.originalCurrency,
      displayAmount: converted.displayAmount,
      displayCurrency: converted.displayCurrency,
      exchangeRate: converted.exchangeRate,
      exchangeRateDate: converted.exchangeRateDate,
      exchangeRateProvider: converted.exchangeRateProvider,
      exchangeRateStale: converted.exchangeRateStale,
      conversionAvailable: converted.conversionAvailable,
    };

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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ schoolId: string; invoiceId: string }> }
) {
  try {
    const { admin, response } = await requireMasterAdmin(request);
    if (response) return response;

    const { schoolId, invoiceId } = await params;
    const body = await request.json();
    const status = String(body.status || "").trim().toLowerCase();
    const allowed = new Set(["pending", "paid", "overdue", "void"]);
    if (!allowed.has(status)) {
      return NextResponse.json({ error: "Invalid invoice status" }, { status: 400 });
    }

    const [existing] = await masterDb
      .select()
      .from(invoicesTable)
      .where(and(or(eq(invoicesTable.id, invoiceId), eq(invoicesTable.invoiceNumber, invoiceId)), eq(invoicesTable.schoolId, schoolId)))
      .limit(1);

    if (!existing) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

    const [invoice] = await masterDb
      .update(invoicesTable)
      .set({
        status,
        paidDate: status === "paid" ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(eq(invoicesTable.id, existing.id))
      .returning();

    await writeMasterAudit(request, {
      adminId: admin.adminId,
      action: "School Invoice Status Updated",
      resource: "invoices",
      resourceId: invoice.id,
      changes: { schoolId, invoiceNumber: invoice.invoiceNumber, before: existing.status, after: invoice.status },
    });

    return NextResponse.json({ success: true, invoice });
  } catch (error) {
    console.error("Error updating invoice:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
