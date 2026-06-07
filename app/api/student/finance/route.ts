import crypto from "node:crypto"

import { NextRequest, NextResponse } from "next/server"
import { sql } from "drizzle-orm"

import { getRequiredDashboardUser, isNextResponse } from "@/lib/dashboard-db"
import { getTenantDb, masterDb } from "@/lib/db"
import { getTenantSubdomain, resolveTenantSlug } from "@/lib/tenant-routing"

export const dynamic = "force-dynamic"
export const revalidate = 0

type Row = Record<string, unknown>
type QueryableDb = ReturnType<typeof getTenantDb>

function text(value: unknown, fallback = "") {
  const next = String(value ?? "").trim()
  return next || fallback
}

function numberValue(value: unknown, fallback = 0) {
  const next = Number(value ?? fallback)
  return Number.isFinite(next) ? next : fallback
}

function iso(value: unknown) {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(String(value))
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

function tenantSlugFromRequest(request: NextRequest) {
  const direct = request.nextUrl.searchParams.get("tenant") || request.nextUrl.searchParams.get("slug")
  if (direct) return direct
  const subdomain = getTenantSubdomain(request.headers.get("host"))
  if (subdomain) return subdomain
  const referrer = request.headers.get("referer") || request.headers.get("referrer") || ""
  try {
    const url = referrer ? new URL(referrer) : null
    return resolveTenantSlug(url?.pathname, url?.host)
  } catch {
    return null
  }
}

async function rows(db: QueryableDb, query: ReturnType<typeof sql>, label: string) {
  try {
    const result = await db.execute(query)
    return (result.rows || []) as Row[]
  } catch (error) {
    console.warn(`[student-finance] ${label} query skipped`, error instanceof Error ? error.message : error)
    return []
  }
}

async function first(db: QueryableDb, query: ReturnType<typeof sql>, label: string) {
  return (await rows(db, query, label))[0] || null
}

async function loadSchools(slug: string | null) {
  if (slug) {
    const result = await masterDb.execute(sql`
      select id, name, slug, type, status, country, currency_code, currency_name, database_url
      from schools
      where slug = ${slug}
      limit 1
    `)
    return (result.rows || []) as Row[]
  }

  const result = await masterDb.execute(sql`
    select id, name, slug, type, status, country, currency_code, currency_name, database_url
    from schools
    where status = 'active'
    order by updated_at desc
    limit 25
  `)
  return (result.rows || []) as Row[]
}

async function findStudentContext(request: NextRequest, user: { id: string; email: string }) {
  const schools = await loadSchools(tenantSlugFromRequest(request))
  for (const school of schools) {
    const databaseUrl = text(school.database_url)
    if (!databaseUrl) continue
    const tenantDb = getTenantDb(databaseUrl)
    const student = await first(tenantDb, sql`
      select
        s.id,
        s.user_id,
        s.admission_number,
        s.class_id,
        s.status,
        u.name,
        u.email,
        c.name as class_name,
        c.grade as class_grade,
        c.section as class_section,
        c.academic_year_id,
        c.teacher_id as class_teacher_id,
        teacher.name as class_teacher,
        ay.name as academic_year_name,
        t.id as term_id,
        t.name as term_name
      from students s
      join users u on u.id = s.user_id
      left join classes c on c.id = s.class_id
      left join users teacher on teacher.id = c.teacher_id
      left join academic_years ay on ay.id = c.academic_year_id
      left join terms t on t.academic_year_id = c.academic_year_id and lower(t.status) = 'active'
      where s.user_id = ${user.id} or lower(u.email) = lower(${user.email})
      order by t.start_date desc nulls last
      limit 1
    `, "student lookup")
    if (student) return { school, tenantDb, student }
  }
  return null
}

function resolveInvoiceStatus(row: Row) {
  const status = text(row.status, "unpaid").toLowerCase()
  const dueDate = row.due_date ? new Date(String(row.due_date)) : null
  if (status !== "paid" && status !== "cancelled" && dueDate && dueDate.getTime() < Date.now()) return "overdue"
  return status
}

function dateLabel(value: unknown, fallback = "Not dated") {
  const date = iso(value)
  if (!date) return fallback
  return new Intl.DateTimeFormat("en", { month: "short", day: "2-digit", year: "numeric" }).format(new Date(date))
}

async function buildPayload(request: NextRequest, currentUser: { id: string; name: string; email: string; role: string }) {
  const context = await findStudentContext(request, currentUser)
  if (!context) return { response: NextResponse.json({ error: "Student profile was not found for this account.", currentUser }, { status: 404 }) }

  const { tenantDb, school, student } = context
  const studentId = text(student.id)

  const [invoiceRows, paymentRows, ledgerRows, progressRows, settings, paystackRows, receiptRows] = await Promise.all([
    rows(tenantDb, sql`
      select id, invoice_number, student_id, total_amount, amount_paid, outstanding_balance, due_date, issued_date, status, notes, created_at, updated_at
      from student_invoices
      where student_id = ${studentId}
      order by due_date asc nulls last, created_at desc
      limit 150
    `, "invoices"),
    rows(tenantDb, sql`
      select id, student_id, student_fee_id, amount, payment_method, payment_reference, provider, status, completed_at, failed_at, refunded_at, created_at, updated_at
      from payments
      where student_id = ${studentId}
      order by created_at desc
      limit 150
    `, "payments"),
    rows(tenantDb, sql`
      select id, payment_id, student_id, type, amount, description, reference, balance, created_at
      from transaction_ledger
      where student_id = ${studentId}
      order by created_at desc
      limit 80
    `, "ledger"),
    rows(tenantDb, sql`
      select id, progress_type, progress_value, progress_note, category, is_positive, created_at
      from student_progress
      where student_id = ${studentId}
        and (lower(coalesce(category, '')) like '%finance%' or lower(coalesce(progress_type, '')) like '%finance%')
      order by created_at desc
      limit 30
    `, "progress notes"),
    first(tenantDb, sql`
      select
        max(value) filter (where key = 'finance_contact_email') as finance_email,
        max(value) filter (where key = 'finance_contact_phone') as finance_phone,
        max(value) filter (where key = 'payment_instructions') as payment_instructions
      from system_settings
      where key in ('finance_contact_email', 'finance_contact_phone', 'payment_instructions')
    `, "finance settings"),
    rows(tenantDb, sql`
      select id, public_key, is_active, test_mode, updated_at
      from paystack_config
      where is_active = true
      order by updated_at desc
      limit 1
    `, "paystack config"),
    rows(tenantDb, sql`
      select id, payment_id, amount, currency, payment_method, payment_date, issued_date, status, sent_at, printed_at
      from receipts
      where student_id = ${studentId}
      order by issued_date desc
      limit 150
    `, "receipts"),
  ])

  const invoices = invoiceRows.map((row) => {
    const totalAmount = numberValue(row.total_amount)
    const amountPaid = numberValue(row.amount_paid)
    const outstandingBalance = numberValue(row.outstanding_balance, Math.max(totalAmount - amountPaid, 0))
    return {
      id: text(row.id),
      invoiceNumber: text(row.invoice_number, text(row.id, "Invoice")),
      totalAmount,
      amountPaid,
      outstandingBalance,
      status: resolveInvoiceStatus(row),
      rawStatus: text(row.status, "unpaid").toLowerCase(),
      dueDate: iso(row.due_date),
      issuedDate: iso(row.issued_date),
      notes: text(row.notes),
      createdAt: iso(row.created_at),
      updatedAt: iso(row.updated_at),
    }
  })

  const payments = paymentRows.map((row) => ({
    id: text(row.id),
    amount: numberValue(row.amount),
    method: text(row.payment_method, "Payment"),
    reference: text(row.payment_reference, text(row.id, "Receipt")),
    provider: text(row.provider),
    status: text(row.status, "pending").toLowerCase(),
    completedAt: iso(row.completed_at),
    failedAt: iso(row.failed_at),
    refundedAt: iso(row.refunded_at),
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
  }))

  const totalBilled = invoices.reduce((sum, invoice) => sum + invoice.totalAmount, 0)
  const totalPaid = invoices.reduce((sum, invoice) => sum + invoice.amountPaid, 0)
  const outstanding = invoices.reduce((sum, invoice) => sum + invoice.outstandingBalance, 0)
  const overdue = invoices.filter((invoice) => invoice.status === "overdue").reduce((sum, invoice) => sum + invoice.outstandingBalance, 0)
  const unpaidInvoices = invoices.filter((invoice) => invoice.status !== "paid" && invoice.status !== "cancelled")
  const nextDue = unpaidInvoices
    .filter((invoice) => invoice.dueDate)
    .sort((a, b) => new Date(a.dueDate || 0).getTime() - new Date(b.dueDate || 0).getTime())[0] || unpaidInvoices[0] || null

  const byStatus = Array.from(invoices.reduce((map, invoice) => {
    const current = map.get(invoice.status) || { status: invoice.status, count: 0, amount: 0, outstanding: 0 }
    current.count += 1
    current.amount += invoice.totalAmount
    current.outstanding += invoice.outstandingBalance
    map.set(invoice.status, current)
    return map
  }, new Map<string, { status: string; count: number; amount: number; outstanding: number }>()).values())
  const paystack = paystackRows[0]
  const hasActiveGateway = Boolean(paystack?.id && paystack?.public_key)
  const financeWarnings = [
    hasActiveGateway ? "" : "Online payment gateway is not fully configured. Students can still request payment instructions for finance follow-up.",
    receiptRows.length || !payments.length ? "" : "Payments exist without generated receipt records.",
    text(settings?.payment_instructions) ? "" : "Payment instructions are using the default fallback text.",
    text(settings?.finance_email) || text(settings?.finance_phone) ? "" : "Finance office contact details are not configured.",
  ].filter(Boolean)

  return {
    payload: {
      generatedAt: new Date().toISOString(),
      currentUser: { id: currentUser.id, name: text(student.name, currentUser.name), email: text(student.email, currentUser.email), role: currentUser.role },
      school: {
        id: text(school.id),
        name: text(school.name, text(school.slug, "School")),
        slug: text(school.slug),
        type: text(school.type),
        country: text(school.country),
        currencyCode: text(school.currency_code, "ZAR"),
        currencyName: text(school.currency_name, "School currency"),
      },
      student: {
        id: studentId,
        userId: text(student.user_id),
        admissionNumber: text(student.admission_number),
        status: text(student.status, "active"),
        classId: text(student.class_id),
        className: text(student.class_name, "Unassigned class"),
        classGrade: text(student.class_grade),
        classSection: text(student.class_section),
        classTeacher: text(student.class_teacher),
        classTeacherId: text(student.class_teacher_id),
        academicYear: text(student.academic_year_name),
        term: text(student.term_name),
      },
      metrics: {
        totalBilled,
        totalPaid,
        outstanding,
        overdue,
        invoiceCount: invoices.length,
        paymentCount: payments.length,
        unpaidCount: unpaidInvoices.length,
        collectionRate: totalBilled ? Math.round((totalPaid / totalBilled) * 1000) / 10 : 100,
        clearanceReady: outstanding <= 0,
        nextDueDate: nextDue?.dueDate || null,
        nextDueLabel: nextDue ? dateLabel(nextDue.dueDate) : "No pending invoice",
      },
      invoices,
      payments,
      byStatus,
      ledger: ledgerRows.map((row) => ({
        id: text(row.id),
        paymentId: text(row.payment_id),
        type: text(row.type, "activity"),
        amount: numberValue(row.amount),
        description: text(row.description),
        reference: text(row.reference),
        balance: numberValue(row.balance),
        createdAt: iso(row.created_at),
      })),
      progressNotes: progressRows.map((row) => ({
        id: text(row.id),
        type: text(row.progress_type),
        value: numberValue(row.progress_value),
        note: text(row.progress_note),
        category: text(row.category),
        positive: row.is_positive !== false,
        createdAt: iso(row.created_at),
      })),
      financeOffice: {
        email: text(settings?.finance_email),
        phone: text(settings?.finance_phone),
        paymentInstructions: text(settings?.payment_instructions, "Use the invoice number as your payment reference and confirm any payment with the finance office."),
      },
      receipts: receiptRows.map((row) => ({
        id: text(row.id),
        paymentId: text(row.payment_id),
        amount: numberValue(row.amount),
        currency: text(row.currency, text(school.currency_code, "ZAR")),
        method: text(row.payment_method),
        paymentDate: iso(row.payment_date),
        issuedDate: iso(row.issued_date),
        status: text(row.status, "issued").toLowerCase(),
        sentAt: iso(row.sent_at),
        printedAt: iso(row.printed_at),
      })),
      paymentReadiness: {
        onlinePaymentsEnabled: hasActiveGateway,
        provider: hasActiveGateway ? "paystack" : "manual",
        providerMode: paystack ? (paystack.test_mode === false ? "live" : "test") : "manual",
        publicKeyConfigured: Boolean(paystack?.public_key),
        receiptsAvailable: receiptRows.length > 0,
        productionReady: financeWarnings.length === 0,
        warnings: financeWarnings,
      },
    },
    context,
  }
}

export async function GET(request: NextRequest) {
  const currentUser = await getRequiredDashboardUser(request.headers)
  if (isNextResponse(currentUser)) return currentUser
  const result = await buildPayload(request, currentUser)
  if ("response" in result) return result.response
  return NextResponse.json(result.payload, { headers: { "Cache-Control": "no-store" } })
}

export async function POST(request: NextRequest) {
  const currentUser = await getRequiredDashboardUser(request.headers)
  if (isNextResponse(currentUser)) return currentUser
  const result = await buildPayload(request, currentUser)
  if ("response" in result) return result.response

  const body = await request.json().catch(() => ({}))
  const action = text(body.action)
  const message = text(body.message)
  const invoiceId = text(body.invoiceId)
  const invoiceNumber = text(body.invoiceNumber, "selected invoice")
  const { tenantDb, student } = result.context

  if (action === "payment-request") {
    const note = `Student requested payment instructions for ${invoiceNumber}${message ? `: ${message}` : ""}`
    await tenantDb.execute(sql`
      insert into student_progress (id, student_id, academic_year_id, term_id, subject_id, progress_type, progress_date, progress_value, progress_note, recorded_by, is_positive, category, created_at, updated_at)
      values (${crypto.randomUUID()}, ${text(student.id)}, ${text(student.academic_year_id) || null}, ${text(student.term_id) || null}, null, 'finance', now(), null, ${note}, ${text(student.user_id)}, true, 'finance', now(), now())
    `)
    return NextResponse.json({ success: true, invoiceId }, { status: 201, headers: { "Cache-Control": "no-store" } })
  }

  if (action === "finance-note") {
    if (!message) return NextResponse.json({ error: "Finance note message is required" }, { status: 400 })
    await tenantDb.execute(sql`
      insert into student_progress (id, student_id, academic_year_id, term_id, subject_id, progress_type, progress_date, progress_value, progress_note, recorded_by, is_positive, category, created_at, updated_at)
      values (${crypto.randomUUID()}, ${text(student.id)}, ${text(student.academic_year_id) || null}, ${text(student.term_id) || null}, null, 'finance', now(), null, ${message}, ${text(student.user_id)}, true, 'finance', now(), now())
    `)
    return NextResponse.json({ success: true }, { status: 201, headers: { "Cache-Control": "no-store" } })
  }

  return NextResponse.json({ error: "Unsupported finance action" }, { status: 400 })
}
