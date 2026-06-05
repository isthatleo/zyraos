import { NextRequest, NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";

import { getTenantDbBySlug, masterDb } from "@/lib/db";
import { schoolsTable, studentInvoicesTable } from "@/lib/db-schema";
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
    console.warn(`Owner invoices ${label} query skipped:`, error instanceof Error ? error.message : error);
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

async function buildPayload(slug: string) {
  const school = await getSchool(slug);
  if (!school) return null;
  const tenantDb = await getTenantDbBySlug(slug);
  const branding = await getTenantBranding(slug, school.name);

  const [invoiceRows, studentRows] = await Promise.all([
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
            i.updated_at,
            u.name as student_name,
            u.email as student_email,
            s.admission_number,
            s.status as student_status
          from student_invoices i
          left join students s on s.id = i.student_id
          left join users u on u.id = s.user_id
          order by i.created_at desc
          limit 400
        `),
      "invoices"
    ),
    safeRows<Row>(
      () =>
        tenantDb.execute(sql`
          select s.id, s.admission_number, u.name, u.email
          from students s
          left join users u on u.id = s.user_id
          order by u.name asc
          limit 500
        `),
      "students"
    ),
  ]);

  const invoices = invoiceRows.map((row) => {
    const status = asString(row.status, "unpaid").toLowerCase();
    const dueDate = row.due_date ? new Date(String(row.due_date)) : null;
    const resolvedStatus = ["unpaid", "partial"].includes(status) && dueDate && dueDate.getTime() < Date.now() ? "overdue" : status;
    return {
      id: asString(row.id),
      invoiceNumber: asString(row.invoice_number),
      studentId: asString(row.student_id),
      studentName: asString(row.student_name, "Student"),
      studentEmail: asString(row.student_email),
      admissionNumber: asString(row.admission_number),
      studentStatus: asString(row.student_status, "active"),
      totalAmount: asNumber(row.total_amount),
      amountPaid: asNumber(row.amount_paid),
      outstandingBalance: asNumber(row.outstanding_balance),
      status: resolvedStatus,
      rawStatus: status,
      dueDate: asDate(row.due_date),
      issuedDate: asDate(row.issued_date),
      notes: asString(row.notes),
      createdAt: asDate(row.created_at),
      updatedAt: asDate(row.updated_at),
    };
  });

  const byStatus = new Map<string, { name: string; records: number; amount: number; outstanding: number }>();
  const byMonth = new Map<string, { name: string; billed: number; paid: number; outstanding: number; records: number }>();
  for (const invoice of invoices) {
    const statusCurrent = byStatus.get(invoice.status) || { name: invoice.status, records: 0, amount: 0, outstanding: 0 };
    statusCurrent.records += 1;
    statusCurrent.amount += invoice.totalAmount;
    statusCurrent.outstanding += invoice.outstandingBalance;
    byStatus.set(invoice.status, statusCurrent);

    const date = invoice.issuedDate || invoice.createdAt;
    const month = date ? new Intl.DateTimeFormat("en", { month: "short", year: "numeric" }).format(new Date(date)) : "Unissued";
    const monthCurrent = byMonth.get(month) || { name: month, billed: 0, paid: 0, outstanding: 0, records: 0 };
    monthCurrent.records += 1;
    monthCurrent.billed += invoice.totalAmount;
    monthCurrent.paid += invoice.amountPaid;
    monthCurrent.outstanding += invoice.outstandingBalance;
    byMonth.set(month, monthCurrent);
  }

  const totalAmount = invoices.reduce((sum, invoice) => sum + invoice.totalAmount, 0);
  const paidAmount = invoices.reduce((sum, invoice) => sum + invoice.amountPaid, 0);
  const outstandingAmount = invoices.reduce((sum, invoice) => sum + invoice.outstandingBalance, 0);
  const overdueAmount = invoices.filter((invoice) => invoice.status === "overdue").reduce((sum, invoice) => sum + invoice.outstandingBalance, 0);

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
    generatedAt: new Date().toISOString(),
    invoices,
    students: studentRows.map((row) => ({
      id: asString(row.id),
      name: asString(row.name, "Student"),
      email: asString(row.email),
      admissionNumber: asString(row.admission_number),
    })),
    analytics: {
      byStatus: Array.from(byStatus.values()),
      byMonth: Array.from(byMonth.values()).reverse().slice(0, 8).reverse(),
    },
    summary: {
      records: invoices.length,
      totalAmount,
      paidAmount,
      outstandingAmount,
      overdueAmount,
      paidRecords: invoices.filter((invoice) => invoice.status === "paid").length,
      partialRecords: invoices.filter((invoice) => invoice.status === "partial").length,
      unpaidRecords: invoices.filter((invoice) => invoice.status === "unpaid").length,
      overdueRecords: invoices.filter((invoice) => invoice.status === "overdue").length,
      cancelledRecords: invoices.filter((invoice) => invoice.status === "cancelled").length,
      collectionRate: totalAmount ? Math.round((paidAmount / totalAmount) * 1000) / 10 : 0,
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
    console.error("Owner invoices GET failed:", error);
    return NextResponse.json({ error: "Failed to load owner invoices data" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const slug = request.nextUrl.searchParams.get("tenant")?.trim().toLowerCase();
    if (!slug) return NextResponse.json({ error: "Tenant slug is required" }, { status: 400 });
    const school = await getSchool(slug);
    if (!school) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

    const body = await request.json().catch(() => ({}));
    const studentId = asString(body.studentId);
    const totalAmount = asNumber(body.totalAmount);
    const amountPaid = asNumber(body.amountPaid);
    const dueDate = asString(body.dueDate);
    const notes = asString(body.notes);
    if (!studentId || totalAmount <= 0 || !dueDate) {
      return NextResponse.json({ error: "Student, total amount, and due date are required" }, { status: 400 });
    }

    const outstandingBalance = Math.max(0, totalAmount - amountPaid);
    const status = outstandingBalance <= 0 ? "paid" : amountPaid > 0 ? "partial" : "unpaid";
    const tenantDb = await getTenantDbBySlug(slug);
    const id = crypto.randomUUID();
    const invoiceNumber = asString(body.invoiceNumber, `INV-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`);
    await tenantDb.insert(studentInvoicesTable).values({
      id,
      invoiceNumber,
      studentId,
      totalAmount: String(totalAmount),
      amountPaid: String(amountPaid),
      outstandingBalance: String(outstandingBalance),
      dueDate: new Date(dueDate),
      issuedDate: new Date(),
      status,
      notes: notes || null,
      updatedAt: new Date(),
    });

    return NextResponse.json({ success: true, id, invoiceNumber }, { status: 201 });
  } catch (error) {
    console.error("Owner invoices POST failed:", error);
    return NextResponse.json({ error: "Failed to create invoice" }, { status: 500 });
  }
}
