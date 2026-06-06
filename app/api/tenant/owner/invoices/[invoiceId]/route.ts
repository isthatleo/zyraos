import { NextRequest, NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";

import { getTenantDbBySlug, masterDb } from "@/lib/db";
import { schoolsTable, studentInvoicesTable } from "@/lib/db-schema";
import { deleteCachedValue } from "@/lib/server-response-cache";
import { getTenantBranding } from "@/lib/tenant-branding-server";

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
    console.warn(`Owner invoice detail ${label} query skipped:`, error instanceof Error ? error.message : error);
    return [];
  }
}

async function getSchool(slug: string) {
  const [school] = await masterDb
    .select({ id: schoolsTable.id, name: schoolsTable.name, slug: schoolsTable.slug, type: schoolsTable.type, currencyCode: schoolsTable.currencyCode })
    .from(schoolsTable)
    .where(eq(schoolsTable.slug, slug))
    .limit(1);
  return school;
}

async function buildPayload(slug: string, invoiceId: string) {
  const school = await getSchool(slug);
  if (!school) return null;
  const tenantDb = await getTenantDbBySlug(slug);
  const branding = await getTenantBranding(slug, school.name);

  const [invoiceRow] = await safeRows<Row>(
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
          i.updated_at,
          u.name as student_name,
          u.email as student_email,
          s.admission_number,
          s.gender,
          s.phone,
          s.address,
          s.status as student_status,
          c.name as class_name,
          c.grade,
          c.section
        from student_invoices i
        left join students s on s.id = i.student_id
        left join users u on u.id = s.user_id
        left join classes c on c.id = s.class_id
        where i.id = ${invoiceId}
        limit 1
      `),
    "invoice"
  );

  if (!invoiceRow) return { school, missing: true };

  const [feeRows, paymentRows, ledgerRows] = await Promise.all([
    safeRows<Row>(
      () =>
        tenantDb.execute(sql`
          select
            sf.id,
            sf.fee_id,
            sf.total_amount,
            sf.amount_paid,
            sf.outstanding_balance,
            sf.status,
            sf.due_date,
            f.name,
            f.fee_type,
            f.description,
            f.semester
          from student_fees sf
          left join fees f on f.id = sf.fee_id
          where sf.student_id = ${invoiceRow.student_id}
          order by sf.created_at desc
        `),
      "student fees"
    ),
    safeRows<Row>(
      () =>
        tenantDb.execute(sql`
          select id, amount, payment_method, payment_reference, provider, status, completed_at, failed_at, refunded_at, created_at
          from payments
          where student_id = ${invoiceRow.student_id}
          order by created_at desc
          limit 100
        `),
      "payments"
    ),
    safeRows<Row>(
      () =>
        tenantDb.execute(sql`
          select id, type, amount, description, reference, balance, created_at
          from transaction_ledger
          where student_id = ${invoiceRow.student_id}
          order by created_at desc
          limit 100
        `),
      "ledger"
    ),
  ]);

  const status = asString(invoiceRow.status, "unpaid").toLowerCase();
  const dueDate = invoiceRow.due_date ? new Date(String(invoiceRow.due_date)) : null;
  const resolvedStatus = ["unpaid", "partial"].includes(status) && dueDate && dueDate.getTime() < Date.now() ? "overdue" : status;

  return {
    school: {
      ...school,
      displayName: branding.name || school.name,
      logoUrl: branding.logoUrl,
      schoolSealUrl: branding.schoolSealUrl,
      reportCardWatermarkUrl: branding.reportCardWatermarkUrl,
      primaryColor: branding.primaryColor,
      secondaryColor: branding.secondaryColor,
      accentColor: branding.accentColor,
      address: branding.address,
      phone: branding.phone,
      email: branding.email,
      website: branding.website,
      motto: branding.motto,
    },
    invoice: {
      id: asString(invoiceRow.id),
      invoiceNumber: asString(invoiceRow.invoice_number),
      studentId: asString(invoiceRow.student_id),
      totalAmount: asNumber(invoiceRow.total_amount),
      amountPaid: asNumber(invoiceRow.amount_paid),
      outstandingBalance: asNumber(invoiceRow.outstanding_balance),
      status: resolvedStatus,
      rawStatus: status,
      dueDate: asDate(invoiceRow.due_date),
      issuedDate: asDate(invoiceRow.issued_date),
      notes: asString(invoiceRow.notes),
      createdAt: asDate(invoiceRow.created_at),
      updatedAt: asDate(invoiceRow.updated_at),
    },
    student: {
      id: asString(invoiceRow.student_id),
      name: asString(invoiceRow.student_name, "Student"),
      email: asString(invoiceRow.student_email),
      admissionNumber: asString(invoiceRow.admission_number),
      gender: asString(invoiceRow.gender),
      phone: asString(invoiceRow.phone),
      address: asString(invoiceRow.address),
      status: asString(invoiceRow.student_status, "active"),
      className: asString(invoiceRow.class_name),
      grade: asString(invoiceRow.grade),
      section: asString(invoiceRow.section),
    },
    fees: feeRows.map((row) => ({
      id: asString(row.id),
      feeId: asString(row.fee_id),
      name: asString(row.name, "Fee"),
      feeType: asString(row.fee_type, "other"),
      description: asString(row.description),
      semester: asString(row.semester),
      totalAmount: asNumber(row.total_amount),
      amountPaid: asNumber(row.amount_paid),
      outstandingBalance: asNumber(row.outstanding_balance),
      status: asString(row.status, "unpaid").toLowerCase(),
      dueDate: asDate(row.due_date),
    })),
    payments: paymentRows.map((row) => ({
      id: asString(row.id),
      amount: asNumber(row.amount),
      paymentMethod: asString(row.payment_method, "cash"),
      paymentReference: asString(row.payment_reference),
      provider: asString(row.provider),
      status: asString(row.status, "pending").toLowerCase(),
      completedAt: asDate(row.completed_at),
      failedAt: asDate(row.failed_at),
      refundedAt: asDate(row.refunded_at),
      createdAt: asDate(row.created_at),
    })),
    ledger: ledgerRows.map((row) => ({
      id: asString(row.id),
      type: asString(row.type, "payment").toLowerCase(),
      amount: asNumber(row.amount),
      description: asString(row.description),
      reference: asString(row.reference),
      balance: asNumber(row.balance),
      createdAt: asDate(row.created_at),
    })),
    generatedAt: new Date().toISOString(),
  };
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ invoiceId: string }> }) {
  try {
    const slug = request.nextUrl.searchParams.get("tenant")?.trim().toLowerCase();
    const { invoiceId } = await params;
    if (!slug) return NextResponse.json({ error: "Tenant slug is required" }, { status: 400 });
    if (!invoiceId) return NextResponse.json({ error: "Invoice id is required" }, { status: 400 });
    const payload = await buildPayload(slug, invoiceId);
    if (!payload) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    if ("missing" in payload) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    return NextResponse.json(payload);
  } catch (error) {
    console.error("Owner invoice detail GET failed:", error);
    return NextResponse.json({ error: "Failed to load invoice details" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ invoiceId: string }> }) {
  try {
    const slug = request.nextUrl.searchParams.get("tenant")?.trim().toLowerCase();
    const { invoiceId } = await params;
    if (!slug) return NextResponse.json({ error: "Tenant slug is required" }, { status: 400 });
    const school = await getSchool(slug);
    if (!school) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    const body = await request.json().catch(() => ({}));
    const status = asString(body.status).toLowerCase();
    const notes = body.notes === undefined ? undefined : asString(body.notes);
    if (!["unpaid", "partial", "paid", "overdue", "cancelled"].includes(status)) {
      return NextResponse.json({ error: "Valid invoice status is required" }, { status: 400 });
    }
    const tenantDb = await getTenantDbBySlug(slug);
    await tenantDb.update(studentInvoicesTable).set({ status, notes, updatedAt: new Date() }).where(eq(studentInvoicesTable.id, invoiceId));
    deleteCachedValue(`owner-invoices:${slug}`);
    deleteCachedValue(`owner-finance:${slug}`);
    return NextResponse.json({ success: true, message: "Invoice updated" });
  } catch (error) {
    console.error("Owner invoice detail PATCH failed:", error);
    return NextResponse.json({ error: "Failed to update invoice" }, { status: 500 });
  }
}
