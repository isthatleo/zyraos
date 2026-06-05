import { NextRequest, NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";

import { masterDb } from "@/lib/db";
import { invoicesTable, schoolsTable, subscriptionsTable, subscriptionPlansTable } from "@/lib/db-schema";
import { convertMoney } from "@/lib/currency-conversion";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_STATUSES = new Set(["pending", "paid", "overdue", "void"]);

function resolveStatus(status?: string | null, dueDate?: Date | null) {
  const normalized = String(status || "pending").toLowerCase();
  if (normalized === "pending" && dueDate && dueDate.getTime() < Date.now()) return "overdue";
  return VALID_STATUSES.has(normalized) ? normalized : "pending";
}

function formatDate(date?: Date | null) {
  return date ? date.toISOString() : null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const statusFilter = request.nextUrl.searchParams.get("status");
    if (!slug) return NextResponse.json({ error: "Tenant slug is required" }, { status: 400 });

    const [school] = await masterDb
      .select({
        id: schoolsTable.id,
        name: schoolsTable.name,
        slug: schoolsTable.slug,
        currencyCode: schoolsTable.currencyCode,
        currencyName: schoolsTable.currencyName,
      })
      .from(schoolsTable)
      .where(eq(schoolsTable.slug, slug))
      .limit(1);

    if (!school) return NextResponse.json({ error: "School not found" }, { status: 404 });

    const rows = await masterDb
      .select({
        id: invoicesTable.id,
        invoiceNumber: invoicesTable.invoiceNumber,
        subscriptionId: invoicesTable.subscriptionId,
        amount: invoicesTable.amount,
        currency: invoicesTable.currency,
        status: invoicesTable.status,
        issueDate: invoicesTable.issueDate,
        dueDate: invoicesTable.dueDate,
        paidDate: invoicesTable.paidDate,
        description: invoicesTable.description,
        notes: invoicesTable.notes,
        planName: subscriptionPlansTable.name,
      })
      .from(invoicesTable)
      .leftJoin(subscriptionsTable, eq(invoicesTable.subscriptionId, subscriptionsTable.id))
      .leftJoin(subscriptionPlansTable, eq(subscriptionsTable.planId, subscriptionPlansTable.id))
      .where(eq(invoicesTable.schoolId, school.id))
      .orderBy(desc(invoicesTable.issueDate));

    const invoices = await Promise.all(
      rows.map(async (invoice) => {
        const converted = await convertMoney(invoice.amount, invoice.currency || "ZAR", school.currencyCode || invoice.currency || "ZAR");
        const status = resolveStatus(invoice.status, invoice.dueDate);
        return {
          id: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          subscriptionId: invoice.subscriptionId,
          amount: converted.displayAmount,
          currency: converted.displayCurrency,
          originalAmount: converted.originalAmount,
          originalCurrency: converted.originalCurrency,
          displayAmount: converted.displayAmount,
          displayCurrency: converted.displayCurrency,
          exchangeRate: converted.exchangeRate,
          exchangeRateDate: converted.exchangeRateDate,
          exchangeRateProvider: converted.exchangeRateProvider,
          exchangeRateStale: converted.exchangeRateStale,
          conversionAvailable: converted.conversionAvailable,
          status,
          issueDate: formatDate(invoice.issueDate),
          dueDate: formatDate(invoice.dueDate),
          paidDate: formatDate(invoice.paidDate),
          description: invoice.description,
          notes: invoice.notes,
          plan: invoice.planName || "Subscription",
        };
      })
    );

    const filtered = invoices.filter((invoice) => !statusFilter || statusFilter === "all" || invoice.status === statusFilter);
    const summary = filtered.reduce(
      (acc, invoice) => {
        acc.total += invoice.displayAmount;
        acc.byStatus[invoice.status] = (acc.byStatus[invoice.status] || 0) + 1;
        acc.amountByStatus[invoice.status] = (acc.amountByStatus[invoice.status] || 0) + invoice.displayAmount;
        if (invoice.status === "paid") acc.paid += invoice.displayAmount;
        if (invoice.status === "pending" || invoice.status === "overdue") acc.outstanding += invoice.displayAmount;
        return acc;
      },
      {
        currency: school.currencyCode || filtered[0]?.displayCurrency || "ZAR",
        total: 0,
        paid: 0,
        outstanding: 0,
        byStatus: {} as Record<string, number>,
        amountByStatus: {} as Record<string, number>,
      }
    );

    return NextResponse.json({
      school,
      invoices: filtered,
      summary,
      generatedAt: new Date().toISOString(),
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Failed to load tenant platform invoices:", error);
    return NextResponse.json({ error: "Failed to load platform invoices" }, { status: 500 });
  }
}
