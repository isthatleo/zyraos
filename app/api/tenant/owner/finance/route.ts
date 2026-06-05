import { NextRequest, NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";

import { getTenantDbBySlug, masterDb } from "@/lib/db";
import { schoolsTable } from "@/lib/db-schema";
import { convertMoney } from "@/lib/currency-conversion";
import { getCachedValue, setCachedValue } from "@/lib/server-response-cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Row = Record<string, unknown>;

function asString(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function asNumber(value: unknown) {
  const next = Number(value || 0);
  return Number.isFinite(next) ? next : 0;
}

function asDate(value: unknown) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

async function safeRows<T = Row>(operation: () => Promise<{ rows?: unknown[] } | T[]>, label: string): Promise<T[]> {
  try {
    const result = await operation();
    if (Array.isArray(result)) return result as T[];
    return (result.rows || []) as T[];
  } catch (error) {
    console.warn(`Owner finance ${label} query skipped:`, error instanceof Error ? error.message : error);
    return [];
  }
}

async function getSchool(slug: string) {
  const [school] = await masterDb
    .select({
      id: schoolsTable.id,
      name: schoolsTable.name,
      type: schoolsTable.type,
      slug: schoolsTable.slug,
      status: schoolsTable.status,
      currencyCode: schoolsTable.currencyCode,
    })
    .from(schoolsTable)
    .where(eq(schoolsTable.slug, slug))
    .limit(1);
  return school;
}

export async function GET(request: NextRequest) {
  try {
    const slug = request.nextUrl.searchParams.get("tenant")?.trim().toLowerCase();
    if (!slug) return NextResponse.json({ error: "Tenant slug is required" }, { status: 400 });

    const cacheKey = `owner-finance:${slug}`;
    const cached = getCachedValue<Record<string, unknown>>(cacheKey);
    if (cached) {
      return NextResponse.json(cached, {
        headers: {
          "Cache-Control": "private, max-age=30",
          "X-Roxan-Cache": "HIT",
        },
      });
    }

    const school = await getSchool(slug);
    if (!school) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

    const tenantDb = await getTenantDbBySlug(slug);
    const [feeRows, studentFeeRows, paymentRows, invoiceRows, ledgerRows, platformInvoiceRows] = await Promise.all([
      safeRows<Row>(
        () =>
          tenantDb.execute(sql`
            select
              f.id,
              f.fee_type,
              f.name,
              f.description,
              f.amount,
              f.semester,
              f.academic_year_id,
              f.due_date,
              f.created_at,
              ay.name as academic_year
            from fees f
            left join academic_years ay on ay.id = f.academic_year_id
            order by f.created_at desc
            limit 200
          `),
        "fees"
      ),
      safeRows<Row>(
        () =>
          tenantDb.execute(sql`
            select
              sf.id,
              sf.student_id,
              sf.fee_id,
              sf.total_amount,
              sf.amount_paid,
              sf.outstanding_balance,
              sf.status,
              sf.due_date,
              sf.created_at,
              f.name as fee_name,
              f.fee_type,
              u.name as student_name,
              u.email as student_email,
              s.admission_number
            from student_fees sf
            left join fees f on f.id = sf.fee_id
            left join students s on s.id = sf.student_id
            left join users u on u.id = s.user_id
            order by sf.created_at desc
            limit 300
          `),
        "student fees"
      ),
      safeRows<Row>(
        () =>
          tenantDb.execute(sql`
            select
              p.id,
              p.student_id,
              p.student_fee_id,
              p.amount,
              p.payment_method,
              p.payment_reference,
              p.provider,
              p.status,
              p.completed_at,
              p.failed_at,
              p.refunded_at,
              p.created_at,
              u.name as student_name,
              u.email as student_email,
              s.admission_number
            from payments p
            left join students s on s.id = p.student_id
            left join users u on u.id = s.user_id
            order by p.created_at desc
            limit 300
          `),
        "payments"
      ),
      safeRows<Row>(
        () =>
          tenantDb.execute(sql`
            select
              i.id,
              i.invoice_number,
              i.student_id,
              i.total_amount,
              i.amount_paid,
              i.outstanding_balance,
              i.due_date,
              i.issued_date,
              i.status,
              i.notes,
              i.created_at,
              u.name as student_name,
              u.email as student_email,
              s.admission_number
            from student_invoices i
            left join students s on s.id = i.student_id
            left join users u on u.id = s.user_id
            order by i.created_at desc
            limit 300
          `),
        "student invoices"
      ),
      safeRows<Row>(
        () =>
          tenantDb.execute(sql`
            select
              tl.id,
              tl.payment_id,
              tl.student_id,
              tl.type,
              tl.amount,
              tl.description,
              tl.reference,
              tl.balance,
              tl.created_at,
              u.name as student_name,
              s.admission_number
            from transaction_ledger tl
            left join students s on s.id = tl.student_id
            left join users u on u.id = s.user_id
            order by tl.created_at desc
            limit 150
          `),
        "ledger"
      ),
      safeRows<Row>(
        () =>
          masterDb.execute(sql`
            select id, invoice_number, amount, currency, status, issue_date, due_date, paid_date, description, notes, created_at
            from invoices
            where school_id = ${school.id}
            order by created_at desc
            limit 50
          `),
        "platform invoices"
      ),
    ]);

    const fees = feeRows.map((row) => ({
      id: asString(row.id),
      name: asString(row.name, "Fee"),
      feeType: asString(row.fee_type, "other"),
      description: asString(row.description),
      amount: asNumber(row.amount),
      semester: asString(row.semester),
      academicYear: asString(row.academic_year),
      dueDate: asDate(row.due_date),
      createdAt: asDate(row.created_at),
    }));

    const studentFees = studentFeeRows.map((row) => ({
      id: asString(row.id),
      studentId: asString(row.student_id),
      studentName: asString(row.student_name, "Student"),
      studentEmail: asString(row.student_email),
      admissionNumber: asString(row.admission_number),
      feeName: asString(row.fee_name, "Fee"),
      feeType: asString(row.fee_type, "other"),
      totalAmount: asNumber(row.total_amount),
      amountPaid: asNumber(row.amount_paid),
      outstandingBalance: asNumber(row.outstanding_balance),
      status: asString(row.status, "unpaid").toLowerCase(),
      dueDate: asDate(row.due_date),
      createdAt: asDate(row.created_at),
    }));

    const payments = paymentRows.map((row) => ({
      id: asString(row.id),
      studentId: asString(row.student_id),
      studentName: asString(row.student_name, "Student"),
      studentEmail: asString(row.student_email),
      admissionNumber: asString(row.admission_number),
      amount: asNumber(row.amount),
      paymentMethod: asString(row.payment_method, "unknown"),
      paymentReference: asString(row.payment_reference),
      provider: asString(row.provider),
      status: asString(row.status, "pending").toLowerCase(),
      completedAt: asDate(row.completed_at),
      failedAt: asDate(row.failed_at),
      refundedAt: asDate(row.refunded_at),
      createdAt: asDate(row.created_at),
    }));

    const invoices = invoiceRows.map((row) => ({
      id: asString(row.id),
      invoiceNumber: asString(row.invoice_number),
      studentId: asString(row.student_id),
      studentName: asString(row.student_name, "Student"),
      studentEmail: asString(row.student_email),
      admissionNumber: asString(row.admission_number),
      totalAmount: asNumber(row.total_amount),
      amountPaid: asNumber(row.amount_paid),
      outstandingBalance: asNumber(row.outstanding_balance),
      status: asString(row.status, "unpaid").toLowerCase(),
      dueDate: asDate(row.due_date),
      issuedDate: asDate(row.issued_date),
      notes: asString(row.notes),
      createdAt: asDate(row.created_at),
    }));

    const ledger = ledgerRows.map((row) => ({
      id: asString(row.id),
      paymentId: asString(row.payment_id),
      studentId: asString(row.student_id),
      studentName: asString(row.student_name, "Student"),
      admissionNumber: asString(row.admission_number),
      type: asString(row.type, "payment").toLowerCase(),
      amount: asNumber(row.amount),
      description: asString(row.description),
      reference: asString(row.reference),
      balance: asNumber(row.balance),
      createdAt: asDate(row.created_at),
    }));

    const platformInvoices = await Promise.all(
      platformInvoiceRows.map(async (row) => {
        const converted = await convertMoney(row.amount, asString(row.currency, "ZAR"), school.currencyCode || asString(row.currency, "ZAR"));
        return {
          id: asString(row.id),
          invoiceNumber: asString(row.invoice_number),
          amount: converted.displayAmount,
          currency: converted.displayCurrency,
          originalAmount: converted.originalAmount,
          originalCurrency: converted.originalCurrency,
          exchangeRate: converted.exchangeRate,
          exchangeRateDate: converted.exchangeRateDate,
          exchangeRateProvider: converted.exchangeRateProvider,
          exchangeRateStale: converted.exchangeRateStale,
          conversionAvailable: converted.conversionAvailable,
          status: asString(row.status, "pending").toLowerCase(),
          issueDate: asDate(row.issue_date),
          dueDate: asDate(row.due_date),
          paidDate: asDate(row.paid_date),
          description: asString(row.description),
          notes: asString(row.notes),
          createdAt: asDate(row.created_at),
        };
      })
    );

    const studentFeeTotal = studentFees.reduce((sum, item) => sum + item.totalAmount, 0);
    const studentFeePaid = studentFees.reduce((sum, item) => sum + item.amountPaid, 0);
    const studentOutstanding = studentFees.reduce((sum, item) => sum + item.outstandingBalance, 0);
    const completedPayments = payments.filter((item) => item.status === "completed");
    const failedPayments = payments.filter((item) => item.status === "failed");
    const refundedPayments = payments.filter((item) => item.status === "refunded");
    const completedPaymentAmount = completedPayments.reduce((sum, item) => sum + item.amount, 0);
    const invoiceOutstanding = invoices.reduce((sum, item) => sum + item.outstandingBalance, 0);
    const invoiceTotal = invoices.reduce((sum, item) => sum + item.totalAmount, 0);
    const platformOutstanding = platformInvoices.filter((item) => item.status !== "paid" && item.status !== "void").reduce((sum, item) => sum + item.amount, 0);

    const byFeeType = new Map<string, { name: string; billed: number; paid: number; outstanding: number; records: number }>();
    for (const item of studentFees) {
      const current = byFeeType.get(item.feeType) || { name: item.feeType, billed: 0, paid: 0, outstanding: 0, records: 0 };
      current.billed += item.totalAmount;
      current.paid += item.amountPaid;
      current.outstanding += item.outstandingBalance;
      current.records += 1;
      byFeeType.set(item.feeType, current);
    }

    const byPaymentMethod = new Map<string, { name: string; amount: number; records: number }>();
    for (const item of payments) {
      const current = byPaymentMethod.get(item.paymentMethod) || { name: item.paymentMethod, amount: 0, records: 0 };
      current.records += 1;
      if (item.status === "completed") current.amount += item.amount;
      byPaymentMethod.set(item.paymentMethod, current);
    }

    const byInvoiceStatus = new Map<string, { name: string; amount: number; records: number }>();
    for (const item of invoices) {
      const current = byInvoiceStatus.get(item.status) || { name: item.status, amount: 0, records: 0 };
      current.records += 1;
      current.amount += item.totalAmount;
      byInvoiceStatus.set(item.status, current);
    }

    const payload = {
      school,
      generatedAt: new Date().toISOString(),
      fees,
      studentFees,
      payments,
      invoices,
      ledger,
      platformInvoices,
      analytics: {
        byFeeType: Array.from(byFeeType.values()).sort((a, b) => b.billed - a.billed),
        byPaymentMethod: Array.from(byPaymentMethod.values()).sort((a, b) => b.amount - a.amount),
        byInvoiceStatus: Array.from(byInvoiceStatus.values()),
        recentLedger: ledger.slice(0, 12),
      },
      summary: {
        feeCatalogValue: fees.reduce((sum, item) => sum + item.amount, 0),
        studentFeeTotal,
        studentFeePaid,
        studentOutstanding,
        collectionRate: studentFeeTotal ? Math.round((studentFeePaid / studentFeeTotal) * 1000) / 10 : 0,
        completedPaymentAmount,
        pendingPayments: payments.filter((item) => item.status === "pending").length,
        failedPayments: failedPayments.length,
        refundedPayments: refundedPayments.length,
        invoiceTotal,
        invoiceOutstanding,
        unpaidInvoices: invoices.filter((item) => ["unpaid", "partial", "overdue"].includes(item.status)).length,
        overdueInvoices: invoices.filter((item) => item.status === "overdue").length,
        platformOutstanding,
        platformInvoicesDue: platformInvoices.filter((item) => item.status !== "paid" && item.status !== "void").length,
      },
    };
    setCachedValue(cacheKey, payload, 30_000);
    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": "private, max-age=30",
        "X-Roxan-Cache": "MISS",
      },
    });
  } catch (error) {
    console.error("Owner finance GET failed:", error);
    return NextResponse.json({ error: "Failed to load owner finance data" }, { status: 500 });
  }
}
