import { NextRequest, NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";

import { getTenantDbBySlug, masterDb } from "@/lib/db";
import { paymentsTable, schoolsTable } from "@/lib/db-schema";

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
    console.warn(`Owner payments ${label} query skipped:`, error instanceof Error ? error.message : error);
    return [];
  }
}

async function getSchool(slug: string) {
  const [school] = await masterDb
    .select({
      id: schoolsTable.id,
      name: schoolsTable.name,
      slug: schoolsTable.slug,
      type: schoolsTable.type,
      status: schoolsTable.status,
      currencyCode: schoolsTable.currencyCode,
    })
    .from(schoolsTable)
    .where(eq(schoolsTable.slug, slug))
    .limit(1);
  return school;
}

async function refreshStudentFeeBalance(tenantDb: Awaited<ReturnType<typeof getTenantDbBySlug>>, studentFeeId: string) {
  await tenantDb.execute(sql`
    update student_fees sf
    set
      amount_paid = coalesce((
        select sum(p.amount)
        from payments p
        where p.student_fee_id = ${studentFeeId}
          and lower(p.status) in ('completed', 'paid', 'success')
      ), 0),
      outstanding_balance = greatest(sf.total_amount - coalesce((
        select sum(p.amount)
        from payments p
        where p.student_fee_id = ${studentFeeId}
          and lower(p.status) in ('completed', 'paid', 'success')
      ), 0), 0),
      status = case
        when greatest(sf.total_amount - coalesce((
          select sum(p.amount)
          from payments p
          where p.student_fee_id = ${studentFeeId}
            and lower(p.status) in ('completed', 'paid', 'success')
        ), 0), 0) <= 0 then 'paid'
        when coalesce((
          select sum(p.amount)
          from payments p
          where p.student_fee_id = ${studentFeeId}
            and lower(p.status) in ('completed', 'paid', 'success')
        ), 0) > 0 then 'partial'
        when sf.due_date is not null and sf.due_date < now() then 'overdue'
        else 'unpaid'
      end,
      updated_at = now()
    where sf.id = ${studentFeeId}
  `);
}

async function buildPayload(slug: string) {
  const school = await getSchool(slug);
  if (!school) return null;
  const tenantDb = await getTenantDbBySlug(slug);

  const [paymentRows, studentFeeRows] = await Promise.all([
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
            p.updated_at,
            u.name as student_name,
            u.email as student_email,
            s.admission_number,
            f.name as fee_name,
            f.fee_type,
            sf.total_amount,
            sf.amount_paid,
            sf.outstanding_balance
          from payments p
          left join students s on s.id = p.student_id
          left join users u on u.id = s.user_id
          left join student_fees sf on sf.id = p.student_fee_id
          left join fees f on f.id = sf.fee_id
          order by p.created_at desc
          limit 400
        `),
      "payments"
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
            u.name as student_name,
            u.email as student_email,
            s.admission_number,
            f.name as fee_name,
            f.fee_type
          from student_fees sf
          left join students s on s.id = sf.student_id
          left join users u on u.id = s.user_id
          left join fees f on f.id = sf.fee_id
          where sf.outstanding_balance > 0
          order by sf.due_date asc nulls last, u.name asc
          limit 250
        `),
      "student fees"
    ),
  ]);

  const payments = paymentRows.map((row) => ({
    id: asString(row.id),
    studentId: asString(row.student_id),
    studentFeeId: asString(row.student_fee_id),
    studentName: asString(row.student_name, "Student"),
    studentEmail: asString(row.student_email),
    admissionNumber: asString(row.admission_number),
    feeName: asString(row.fee_name, "Fee"),
    feeType: asString(row.fee_type, "other"),
    amount: asNumber(row.amount),
    paymentMethod: asString(row.payment_method, "cash"),
    paymentReference: asString(row.payment_reference),
    provider: asString(row.provider),
    status: asString(row.status, "pending").toLowerCase(),
    completedAt: asDate(row.completed_at),
    failedAt: asDate(row.failed_at),
    refundedAt: asDate(row.refunded_at),
    createdAt: asDate(row.created_at),
    updatedAt: asDate(row.updated_at),
    studentFee: {
      totalAmount: asNumber(row.total_amount),
      amountPaid: asNumber(row.amount_paid),
      outstandingBalance: asNumber(row.outstanding_balance),
    },
  }));

  const payableFees = studentFeeRows.map((row) => ({
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
  }));

  const byStatus = new Map<string, { name: string; records: number; amount: number }>();
  const byMethod = new Map<string, { name: string; records: number; amount: number }>();
  const byFeeType = new Map<string, { name: string; records: number; amount: number }>();
  const byMonth = new Map<string, { name: string; amount: number; records: number }>();

  for (const payment of payments) {
    const statusCurrent = byStatus.get(payment.status) || { name: payment.status, records: 0, amount: 0 };
    statusCurrent.records += 1;
    statusCurrent.amount += payment.amount;
    byStatus.set(payment.status, statusCurrent);

    const methodCurrent = byMethod.get(payment.paymentMethod) || { name: payment.paymentMethod, records: 0, amount: 0 };
    methodCurrent.records += 1;
    if (["completed", "paid", "success"].includes(payment.status)) methodCurrent.amount += payment.amount;
    byMethod.set(payment.paymentMethod, methodCurrent);

    const typeCurrent = byFeeType.get(payment.feeType) || { name: payment.feeType, records: 0, amount: 0 };
    typeCurrent.records += 1;
    if (["completed", "paid", "success"].includes(payment.status)) typeCurrent.amount += payment.amount;
    byFeeType.set(payment.feeType, typeCurrent);

    const date = payment.completedAt || payment.createdAt;
    const month = date ? new Intl.DateTimeFormat("en", { month: "short", year: "numeric" }).format(new Date(date)) : "Unscheduled";
    const monthCurrent = byMonth.get(month) || { name: month, amount: 0, records: 0 };
    monthCurrent.records += 1;
    if (["completed", "paid", "success"].includes(payment.status)) monthCurrent.amount += payment.amount;
    byMonth.set(month, monthCurrent);
  }

  const completedAmount = payments.filter((item) => ["completed", "paid", "success"].includes(item.status)).reduce((sum, item) => sum + item.amount, 0);
  const pendingAmount = payments.filter((item) => item.status === "pending").reduce((sum, item) => sum + item.amount, 0);
  const failedAmount = payments.filter((item) => item.status === "failed").reduce((sum, item) => sum + item.amount, 0);
  const refundedAmount = payments.filter((item) => item.status === "refunded").reduce((sum, item) => sum + item.amount, 0);
  const receivableOutstanding = payableFees.reduce((sum, item) => sum + item.outstandingBalance, 0);

  return {
    school,
    generatedAt: new Date().toISOString(),
    payments,
    payableFees,
    analytics: {
      byStatus: Array.from(byStatus.values()),
      byMethod: Array.from(byMethod.values()).sort((a, b) => b.amount - a.amount),
      byFeeType: Array.from(byFeeType.values()).sort((a, b) => b.amount - a.amount),
      byMonth: Array.from(byMonth.values()).reverse().slice(0, 8).reverse(),
    },
    summary: {
      records: payments.length,
      completedRecords: payments.filter((item) => ["completed", "paid", "success"].includes(item.status)).length,
      pendingRecords: payments.filter((item) => item.status === "pending").length,
      failedRecords: payments.filter((item) => item.status === "failed").length,
      refundedRecords: payments.filter((item) => item.status === "refunded").length,
      completedAmount,
      pendingAmount,
      failedAmount,
      refundedAmount,
      receivableOutstanding,
      collectionEfficiency: completedAmount + receivableOutstanding ? Math.round((completedAmount / (completedAmount + receivableOutstanding)) * 1000) / 10 : 0,
    },
  };
}

export async function GET(request: NextRequest) {
  try {
    const slug = request.nextUrl.searchParams.get("tenant")?.trim().toLowerCase();
    if (!slug) return NextResponse.json({ error: "Tenant slug is required" }, { status: 400 });
    const payload = await buildPayload(slug);
    if (!payload) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    return NextResponse.json(payload);
  } catch (error) {
    console.error("Owner payments GET failed:", error);
    return NextResponse.json({ error: "Failed to load owner payments data" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const slug = request.nextUrl.searchParams.get("tenant")?.trim().toLowerCase();
    if (!slug) return NextResponse.json({ error: "Tenant slug is required" }, { status: 400 });
    const school = await getSchool(slug);
    if (!school) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

    const body = await request.json().catch(() => ({}));
    const studentFeeId = asString(body.studentFeeId);
    const studentId = asString(body.studentId);
    const amount = asNumber(body.amount);
    const paymentMethod = asString(body.paymentMethod, "cash").toLowerCase();
    const provider = asString(body.provider, paymentMethod === "cash" ? "manual" : paymentMethod);
    const status = asString(body.status, "completed").toLowerCase();

    if (!studentFeeId || !studentId || amount <= 0) {
      return NextResponse.json({ error: "Student fee, student, and valid amount are required" }, { status: 400 });
    }
    if (!["cash", "card", "mobile_money", "bank_transfer", "paystack", "other"].includes(paymentMethod)) {
      return NextResponse.json({ error: "Invalid payment method" }, { status: 400 });
    }
    if (!["pending", "completed"].includes(status)) {
      return NextResponse.json({ error: "New owner payments can only be pending or completed" }, { status: 400 });
    }

    const tenantDb = await getTenantDbBySlug(slug);
    const id = crypto.randomUUID();
    const reference = asString(body.paymentReference, `PAY-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`);
    await tenantDb.insert(paymentsTable).values({
      id,
      studentId,
      studentFeeId,
      amount: String(amount),
      paymentMethod,
      paymentReference: reference,
      provider,
      status,
      completedAt: status === "completed" ? new Date() : null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await refreshStudentFeeBalance(tenantDb, studentFeeId);
    return NextResponse.json({ success: true, id, paymentReference: reference }, { status: 201 });
  } catch (error) {
    console.error("Owner payments POST failed:", error);
    return NextResponse.json({ error: "Failed to create payment" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const slug = request.nextUrl.searchParams.get("tenant")?.trim().toLowerCase();
    if (!slug) return NextResponse.json({ error: "Tenant slug is required" }, { status: 400 });
    const school = await getSchool(slug);
    if (!school) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

    const body = await request.json().catch(() => ({}));
    const id = asString(body.id);
    const status = asString(body.status).toLowerCase();
    if (!id || !["pending", "completed", "failed", "refunded"].includes(status)) {
      return NextResponse.json({ error: "Valid payment id and status are required" }, { status: 400 });
    }

    const tenantDb = await getTenantDbBySlug(slug);
    const [payment] = await tenantDb.select().from(paymentsTable).where(eq(paymentsTable.id, id)).limit(1);
    if (!payment) return NextResponse.json({ error: "Payment not found" }, { status: 404 });

    await tenantDb
      .update(paymentsTable)
      .set({
        status,
        completedAt: status === "completed" ? new Date() : payment.completedAt,
        failedAt: status === "failed" ? new Date() : payment.failedAt,
        refundedAt: status === "refunded" ? new Date() : payment.refundedAt,
        updatedAt: new Date(),
      })
      .where(eq(paymentsTable.id, id));
    await refreshStudentFeeBalance(tenantDb, payment.studentFeeId);
    return NextResponse.json({ success: true, message: "Payment status updated" });
  } catch (error) {
    console.error("Owner payments PATCH failed:", error);
    return NextResponse.json({ error: "Failed to update payment status" }, { status: 500 });
  }
}
