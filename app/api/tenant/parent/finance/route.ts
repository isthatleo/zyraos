import crypto from "node:crypto"

import { sql } from "drizzle-orm"
import { NextRequest, NextResponse } from "next/server"

import { getRequiredDashboardUser, isNextResponse } from "@/lib/dashboard-db"
import { getTenantDb, masterDb } from "@/lib/db"

export const dynamic = "force-dynamic"
export const revalidate = 0

type Row = Record<string, unknown>
type QueryableDb = ReturnType<typeof getTenantDb>
type DashboardUser = { id: string; name: string; email: string; image?: string | null; role: string }
type ParentFinanceContext = { tenantDb: QueryableDb; school: Row; parentUser: Row | null; children: Row[] }
type ParentFinanceResult = { response: NextResponse } | { context: ParentFinanceContext; payload: Record<string, unknown> }

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
  const tenant = String(request.nextUrl.searchParams.get("tenant") || "").trim()
  if (!tenant) return null
  if (!/^[a-z0-9][a-z0-9-]*$/i.test(tenant)) {
    return NextResponse.json(
      { error: "Tenant slug is invalid.", expected: "Use letters, numbers, and hyphens only.", generatedAt: new Date().toISOString() },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    )
  }
  return tenant
}

async function rows(db: QueryableDb, query: ReturnType<typeof sql>, label: string) {
  try {
    const result = await db.execute(query)
    return (result.rows || []) as Row[]
  } catch (error) {
    console.warn(`[parent-finance] ${label} query skipped`, error instanceof Error ? error.message : error)
    return []
  }
}

async function first(db: QueryableDb, query: ReturnType<typeof sql>, label: string) {
  return (await rows(db, query, label))[0] || null
}

function invoiceStatus(row: Row) {
  const status = text(row.status, "unpaid").toLowerCase()
  const dueDate = row.due_date ? new Date(String(row.due_date)) : null
  if (!["paid", "cancelled", "void"].includes(status) && dueDate && dueDate.getTime() < Date.now()) return "overdue"
  return status
}

async function ensureParentTenantUser(db: QueryableDb, user: { id: string; name: string; email: string; image?: string | null }) {
  await db.execute(sql`
    insert into roles (id, name, description, is_system, created_at, updated_at)
    values ('parent', 'Parent / Guardian', 'Parent and guardian portal access', true, now(), now())
    on conflict (id) do nothing
  `).catch(() => undefined)

  const existing = await first(db, sql`
    select id, name, email, role_id, image
    from users
    where id = ${user.id} or lower(email) = lower(${user.email})
    limit 1
  `, "parent user")
  if (existing?.id) return existing

  await db.execute(sql`
    insert into users (id, email, email_verified, name, image, role_id, is_active, created_at, updated_at)
    values (${user.id}, ${user.email}, true, ${user.name || user.email}, ${user.image || null}, 'parent', true, now(), now())
    on conflict (id) do nothing
  `).catch(() => undefined)

  return first(db, sql`
    select id, name, email, role_id, image
    from users
    where id = ${user.id} or lower(email) = lower(${user.email})
    limit 1
  `, "parent user after create")
}

async function buildContext(request: NextRequest, user: DashboardUser): Promise<{ response: NextResponse } | ParentFinanceContext> {
  const tenant = tenantSlugFromRequest(request)
  if (tenant instanceof NextResponse) return { response: tenant }

  const schoolsResult = tenant
    ? await masterDb.execute(sql`
        select id, name, slug, type, status, country, currency_code, currency_name, database_url
        from schools
        where slug = ${tenant}
        limit 1
      `)
    : await masterDb.execute(sql`
        select id, name, slug, type, status, country, currency_code, currency_name, database_url
        from schools
        where status = 'active'
        order by updated_at desc
        limit 50
      `)
  const schools = (schoolsResult.rows || []) as Row[]
  if (tenant && !schools.length) return { response: NextResponse.json({ error: "Tenant school was not found." }, { status: 404 }) }

  for (const school of schools) {
    if (!school?.database_url) continue
    const tenantDb = getTenantDb(text(school.database_url))
    const parentUser = await ensureParentTenantUser(tenantDb, user)
    const children = await rows(tenantDb, sql`
      select
        s.id,
        s.user_id,
        s.admission_number,
        s.class_id,
        s.status,
        student_user.name,
        student_user.email,
        c.name as class_name,
        c.grade as class_grade,
        c.section as class_section,
        c.academic_year_id,
        c.teacher_id as class_teacher_id,
        teacher.name as class_teacher,
        ay.name as academic_year_name,
        t.id as term_id,
        t.name as term_name,
        g.id as guardian_id,
        g.name as guardian_name,
        g.relation as guardian_relation,
        g.phone as guardian_phone,
        g.email as guardian_email
      from guardians g
      join students s on s.id = g.student_id
      join users student_user on student_user.id = s.user_id
      left join classes c on c.id = s.class_id
      left join users teacher on teacher.id = c.teacher_id
      left join academic_years ay on ay.id = c.academic_year_id
      left join terms t on t.academic_year_id = c.academic_year_id and lower(t.status) = 'active'
      where lower(coalesce(g.email, '')) = lower(${user.email})
         or lower(coalesce(g.phone, '')) = lower(${user.email})
      order by student_user.name asc, t.start_date desc nulls last
    `, "guardian children")

    if (children.length) return { tenantDb, school, parentUser, children }
  }

  return { response: NextResponse.json({ error: "No linked children were found for this parent account.", currentUser: user }, { status: 404 }) }
}

async function buildPayload(request: NextRequest, currentUser: DashboardUser): Promise<ParentFinanceResult> {
  const context = await buildContext(request, currentUser)
  if ("response" in context) return context

  const { tenantDb, school, parentUser, children } = context
  const childIds = children.map((child) => text(child.id)).filter(Boolean)
  const childIdList = sql.join(childIds.map((id) => sql`${id}`), sql`, `)

  const [invoiceRows, paymentRows, receiptRows, ledgerRows, settings, paystackRows, progressRows] = await Promise.all([
    rows(tenantDb, sql`
      select i.id, i.invoice_number, i.student_id, i.total_amount, i.amount_paid, i.outstanding_balance,
        i.due_date, i.issued_date, i.status, i.notes, i.created_at, i.updated_at,
        u.name as student_name, u.email as student_email, s.admission_number, c.name as class_name
      from student_invoices i
      left join students s on s.id = i.student_id
      left join users u on u.id = s.user_id
      left join classes c on c.id = s.class_id
      where i.student_id in (${childIdList})
      order by i.due_date asc nulls last, i.created_at desc
      limit 500
    `, "invoices"),
    rows(tenantDb, sql`
      select p.id, p.student_id, p.student_fee_id, p.amount, p.payment_method, p.payment_reference,
        p.provider, p.status, p.completed_at, p.failed_at, p.refunded_at, p.created_at, p.updated_at,
        u.name as student_name, s.admission_number
      from payments p
      left join students s on s.id = p.student_id
      left join users u on u.id = s.user_id
      where p.student_id in (${childIdList})
      order by p.created_at desc
      limit 500
    `, "payments"),
    rows(tenantDb, sql`
      select r.id, r.payment_id, r.student_id, r.amount, r.currency, r.payment_method, r.payment_date,
        r.issued_date, r.status, r.sent_at, r.printed_at, u.name as student_name
      from receipts r
      left join students s on s.id = r.student_id
      left join users u on u.id = s.user_id
      where r.student_id in (${childIdList})
      order by r.issued_date desc nulls last, r.created_at desc
      limit 500
    `, "receipts"),
    rows(tenantDb, sql`
      select tl.id, tl.payment_id, tl.student_id, tl.type, tl.amount, tl.description, tl.reference, tl.balance, tl.created_at,
        u.name as student_name
      from transaction_ledger tl
      left join students s on s.id = tl.student_id
      left join users u on u.id = s.user_id
      where tl.student_id in (${childIdList})
      order by tl.created_at desc
      limit 200
    `, "ledger"),
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
      select sp.id, sp.student_id, sp.progress_type, sp.progress_value, sp.progress_note, sp.category, sp.is_positive, sp.created_at, u.name as recorded_by_name
      from student_progress sp
      left join users u on u.id = sp.recorded_by
      where sp.student_id in (${childIdList})
        and (lower(coalesce(sp.category, '')) like '%finance%' or lower(coalesce(sp.progress_type, '')) like '%finance%' or lower(coalesce(sp.category, '')) = 'guardian-note')
      order by sp.created_at desc
      limit 100
    `, "finance notes"),
  ])

  const invoices = invoiceRows.map((row) => {
    const totalAmount = numberValue(row.total_amount)
    const amountPaid = numberValue(row.amount_paid)
    const outstandingBalance = numberValue(row.outstanding_balance, Math.max(totalAmount - amountPaid, 0))
    return {
      id: text(row.id),
      invoiceNumber: text(row.invoice_number, text(row.id, "Invoice")),
      childId: text(row.student_id),
      childName: text(row.student_name, "Student"),
      childEmail: text(row.student_email),
      admissionNumber: text(row.admission_number),
      className: text(row.class_name, "Class"),
      totalAmount,
      amountPaid,
      outstandingBalance,
      status: invoiceStatus(row),
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
    childId: text(row.student_id),
    childName: text(row.student_name, "Student"),
    admissionNumber: text(row.admission_number),
    studentFeeId: text(row.student_fee_id),
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

  const receipts = receiptRows.map((row) => ({
    id: text(row.id),
    paymentId: text(row.payment_id),
    childId: text(row.student_id),
    childName: text(row.student_name, "Student"),
    amount: numberValue(row.amount),
    currency: text(row.currency, text(school.currency_code, "ZAR")),
    method: text(row.payment_method),
    paymentDate: iso(row.payment_date),
    issuedDate: iso(row.issued_date),
    status: text(row.status, "issued").toLowerCase(),
    sentAt: iso(row.sent_at),
    printedAt: iso(row.printed_at),
  }))

  const ledger = ledgerRows.map((row) => ({
    id: text(row.id),
    paymentId: text(row.payment_id),
    childId: text(row.student_id),
    childName: text(row.student_name, "Student"),
    type: text(row.type, "activity").toLowerCase(),
    amount: numberValue(row.amount),
    description: text(row.description),
    reference: text(row.reference),
    balance: numberValue(row.balance),
    createdAt: iso(row.created_at),
  }))

  const totalBilled = invoices.reduce((sum, invoice) => sum + invoice.totalAmount, 0)
  const totalPaid = invoices.reduce((sum, invoice) => sum + invoice.amountPaid, 0)
  const outstanding = invoices.reduce((sum, invoice) => sum + invoice.outstandingBalance, 0)
  const overdue = invoices.filter((invoice) => invoice.status === "overdue").reduce((sum, invoice) => sum + invoice.outstandingBalance, 0)
  const unpaidInvoices = invoices.filter((invoice) => !["paid", "cancelled", "void"].includes(invoice.status))
  const nextDue = unpaidInvoices.filter((invoice) => invoice.dueDate).sort((a, b) => new Date(a.dueDate || 0).getTime() - new Date(b.dueDate || 0).getTime())[0] || unpaidInvoices[0] || null
  const paystack = paystackRows[0]
  const onlinePaymentsEnabled = Boolean(paystack?.id && paystack?.public_key)
  const warnings = [
    onlinePaymentsEnabled ? "" : "Online payment gateway is not fully configured. Parents can still request payment instructions.",
    receipts.length || !payments.length ? "" : "Payments exist without generated receipt records.",
    text(settings?.payment_instructions) ? "" : "Payment instructions are not configured.",
    text(settings?.finance_email) || text(settings?.finance_phone) ? "" : "Finance contact details are not configured.",
  ].filter(Boolean)

  const childSummaries = children.map((child) => {
    const childId = text(child.id)
    const childInvoices = invoices.filter((invoice) => invoice.childId === childId)
    const childPayments = payments.filter((payment) => payment.childId === childId)
    return {
      id: childId,
      name: text(child.name, "Student"),
      email: text(child.email),
      admissionNumber: text(child.admission_number),
      className: text(child.class_name, "Class"),
      classTeacher: text(child.class_teacher),
      academicYear: text(child.academic_year_name),
      term: text(child.term_name),
      guardian: {
        name: text(child.guardian_name),
        relation: text(child.guardian_relation),
        phone: text(child.guardian_phone),
        email: text(child.guardian_email),
      },
      metrics: {
        billed: childInvoices.reduce((sum, invoice) => sum + invoice.totalAmount, 0),
        paid: childInvoices.reduce((sum, invoice) => sum + invoice.amountPaid, 0),
        outstanding: childInvoices.reduce((sum, invoice) => sum + invoice.outstandingBalance, 0),
        overdue: childInvoices.filter((invoice) => invoice.status === "overdue").reduce((sum, invoice) => sum + invoice.outstandingBalance, 0),
        invoiceCount: childInvoices.length,
        paymentCount: childPayments.length,
        unpaidCount: childInvoices.filter((invoice) => !["paid", "cancelled", "void"].includes(invoice.status)).length,
      },
    }
  })

  return {
    context,
    payload: {
      generatedAt: new Date().toISOString(),
      currentUser: {
        id: currentUser.id,
        name: text(parentUser?.name, currentUser.name),
        email: text(parentUser?.email, currentUser.email),
        role: text(parentUser?.role_id, currentUser.role),
      },
      school: {
        id: text(school.id),
        name: text(school.name, text(school.slug, "School")),
        slug: text(school.slug),
        type: text(school.type),
        country: text(school.country),
        currencyCode: text(school.currency_code, "ZAR"),
        currencyName: text(school.currency_name, "School currency"),
      },
      metrics: {
        children: childSummaries.length,
        totalBilled,
        totalPaid,
        outstanding,
        overdue,
        invoiceCount: invoices.length,
        paymentCount: payments.length,
        receiptCount: receipts.length,
        unpaidCount: unpaidInvoices.length,
        collectionRate: totalBilled ? Math.round((totalPaid / totalBilled) * 1000) / 10 : 100,
        nextDueDate: nextDue?.dueDate || null,
        nextDueAmount: nextDue?.outstandingBalance || 0,
        nextDueInvoice: nextDue?.invoiceNumber || "",
      },
      children: childSummaries,
      invoices,
      payments,
      receipts,
      ledger,
      notes: progressRows.map((row) => ({
        id: text(row.id),
        childId: text(row.student_id),
        type: text(row.progress_type),
        value: numberValue(row.progress_value),
        note: text(row.progress_note),
        category: text(row.category),
        positive: row.is_positive !== false,
        recordedBy: text(row.recorded_by_name),
        createdAt: iso(row.created_at),
      })),
      financeOffice: {
        email: text(settings?.finance_email),
        phone: text(settings?.finance_phone),
        paymentInstructions: text(settings?.payment_instructions, "Use the invoice number as your payment reference and confirm any payment with the finance office."),
      },
      paymentReadiness: {
        onlinePaymentsEnabled,
        provider: onlinePaymentsEnabled ? "paystack" : "manual",
        providerMode: paystack ? (paystack.test_mode === false ? "live" : "test") : "manual",
        publicKeyConfigured: Boolean(paystack?.public_key),
        receiptsAvailable: receipts.length > 0,
        productionReady: warnings.length === 0,
        warnings,
      },
    },
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
  const childId = text(body.childId)
  const invoiceId = text(body.invoiceId)
  const invoiceNumber = text(body.invoiceNumber, "selected invoice")
  const message = text(body.message)
  const { tenantDb, parentUser, children } = result.context
  const child = children.find((item: Row) => text(item.id) === childId) || children[0]

  if (!child?.id) return NextResponse.json({ error: "Linked child was not found." }, { status: 404 })

  if (action === "payment-instructions" || action === "finance-note") {
    if (action === "finance-note" && !message) return NextResponse.json({ error: "Finance note message is required." }, { status: 400 })
    const note = action === "payment-instructions"
      ? `Parent requested payment instructions for ${invoiceNumber}${message ? `: ${message}` : ""}`
      : message
    await tenantDb.execute(sql`
      insert into student_progress (id, student_id, academic_year_id, term_id, subject_id, progress_type, progress_date, progress_value, progress_note, recorded_by, is_positive, category, created_at, updated_at)
      values (${crypto.randomUUID()}, ${text(child.id)}, ${text(child.academic_year_id) || null}, ${text(child.term_id) || null}, null, 'finance', now(), null, ${note}, ${text(parentUser?.id, currentUser.id)}, true, 'finance', now(), now())
    `)
    return NextResponse.json({ success: true, action, childId: text(child.id), invoiceId }, { status: 201, headers: { "Cache-Control": "no-store" } })
  }

  return NextResponse.json({ error: "Unsupported parent finance action." }, { status: 400 })
}
