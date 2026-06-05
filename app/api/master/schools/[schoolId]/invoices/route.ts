import { NextRequest, NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import crypto from "crypto";

import { masterDb } from "@/lib/db";
import { invoicesTable, schoolsTable, subscriptionPlansTable, subscriptionsTable } from "@/lib/db-schema";
import { requireMasterAdmin, writeMasterAudit } from "@/lib/master-audit";
import { addDays, buildInvoiceNumber, getInvoicePolicy, getPlatformSettings } from "@/lib/platform-settings-server";
import { convertMoney } from "@/lib/currency-conversion";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function toNumber(value: unknown) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getPlanCurrency(features: unknown, fallback: string) {
  if (features && typeof features === "object" && !Array.isArray(features)) {
    const currency = String((features as Record<string, unknown>).currency || "").trim().toUpperCase();
    if (/^[A-Z]{3}$/.test(currency)) return currency;
  }
  return fallback;
}

async function loadSchool(schoolId: string) {
  const [school] = await masterDb.select().from(schoolsTable).where(eq(schoolsTable.id, schoolId)).limit(1);
  return school;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ schoolId: string }> }) {
  try {
    const { response } = await requireMasterAdmin(request);
    if (response) return response;

    const { schoolId } = await params;
    const school = await loadSchool(schoolId);
    if (!school) return NextResponse.json({ error: "School not found" }, { status: 404 });

    const invoices = await masterDb
      .select()
      .from(invoicesTable)
      .where(eq(invoicesTable.schoolId, schoolId))
      .orderBy(desc(invoicesTable.issueDate));

    const convertedInvoices = await Promise.all(
      invoices.map(async (invoice) => {
        const converted = await convertMoney(invoice.amount, invoice.currency, school.currencyCode || invoice.currency);
        return {
          ...invoice,
          amount: toNumber(invoice.amount),
          originalAmount: toNumber(invoice.amount),
          originalCurrency: invoice.currency,
          displayAmount: converted.displayAmount,
          displayCurrency: converted.displayCurrency,
          exchangeRate: converted.exchangeRate,
          exchangeRateDate: converted.exchangeRateDate,
          exchangeRateProvider: converted.exchangeRateProvider,
          exchangeRateStale: converted.exchangeRateStale,
          conversionAvailable: converted.conversionAvailable,
        };
      })
    );

    return NextResponse.json({ school: { id: school.id, name: school.name, currencyCode: school.currencyCode }, invoices: convertedInvoices });
  } catch (error) {
    console.error("Error fetching school invoices:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ schoolId: string }> }) {
  try {
    const { admin, response } = await requireMasterAdmin(request);
    if (response) return response;

    const { schoolId } = await params;
    const body = await request.json();
    const school = await loadSchool(schoolId);
    if (!school) return NextResponse.json({ error: "School not found" }, { status: 404 });

    const [subscription] = await masterDb
      .select({
        id: subscriptionsTable.id,
        planId: subscriptionsTable.planId,
        planName: subscriptionPlansTable.name,
        planPrice: subscriptionPlansTable.price,
        planFeatures: subscriptionPlansTable.features,
      })
      .from(subscriptionsTable)
      .leftJoin(subscriptionPlansTable, eq(subscriptionsTable.planId, subscriptionPlansTable.id))
      .where(eq(subscriptionsTable.schoolId, schoolId))
      .limit(1);

    const settings = await getPlatformSettings();
    const policy = getInvoicePolicy(settings);
    const amount = Number(body.amount || subscription?.planPrice || 0);
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: "Invoice amount must be greater than zero" }, { status: 400 });
    }

    const issueDate = body.issueDate ? new Date(String(body.issueDate)) : new Date();
    const dueDate = body.dueDate ? new Date(String(body.dueDate)) : addDays(issueDate, policy.dueDays);
    if (Number.isNaN(issueDate.getTime()) || Number.isNaN(dueDate.getTime())) {
      return NextResponse.json({ error: "Invalid invoice dates" }, { status: 400 });
    }

    const currency = String(body.currency || getPlanCurrency(subscription?.planFeatures, policy.currency)).trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(currency)) return NextResponse.json({ error: "Currency must be a valid ISO code" }, { status: 400 });

    const [invoice] = await masterDb
      .insert(invoicesTable)
      .values({
        id: crypto.randomUUID(),
        invoiceNumber: buildInvoiceNumber(policy.prefix),
        schoolId,
        subscriptionId: subscription?.id || null,
        amount: amount.toFixed(2),
        currency,
        status: "pending",
        issueDate,
        dueDate,
        description: String(body.description || `Subscription invoice${subscription?.planName ? ` - ${subscription.planName}` : ""}`),
        notes: body.notes ? String(body.notes) : null,
      })
      .returning();

    await writeMasterAudit(request, {
      adminId: admin.adminId,
      action: "School Invoice Created",
      resource: "invoices",
      resourceId: invoice.id,
      changes: { schoolId, invoiceNumber: invoice.invoiceNumber, amount: invoice.amount, currency: invoice.currency },
    });

    return NextResponse.json({ success: true, invoice }, { status: 201 });
  } catch (error) {
    console.error("Error creating school invoice:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
