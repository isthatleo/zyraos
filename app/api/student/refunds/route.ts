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
    console.warn(`[student-refunds] ${label} query skipped`, error instanceof Error ? error.message : error)
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

function parseRequestNote(row: Row) {
  const note = text(row.progress_note)
  const match = note.match(/Refund request\s+([^:]+):\s*([0-9.]+)\s*-\s*(.*)/i)
  return {
    reference: match?.[1]?.trim() || text(row.id),
    amount: match ? numberValue(match[2]) : numberValue(row.progress_value),
    reason: match?.[3]?.trim() || note,
  }
}

async function buildPayload(request: NextRequest, currentUser: { id: string; name: string; email: string; role: string }) {
  const context = await findStudentContext(request, currentUser)
  if (!context) return { response: NextResponse.json({ error: "Student profile was not found for this account.", currentUser }, { status: 404 }) }

  const { tenantDb, school, student } = context
  const studentId = text(student.id)

  const [paymentRows, refundLedgerRows, requestRows, settings] = await Promise.all([
    rows(tenantDb, sql`
      select id, student_id, student_fee_id, amount, payment_method, payment_reference, provider, status, completed_at, refunded_at, created_at, updated_at
      from payments
      where student_id = ${studentId}
      order by created_at desc
      limit 150
    `, "payments"),
    rows(tenantDb, sql`
      select id, payment_id, student_id, type, amount, description, reference, balance, created_at
      from transaction_ledger
      where student_id = ${studentId}
        and lower(type) = 'refund'
      order by created_at desc
      limit 100
    `, "refund ledger"),
    rows(tenantDb, sql`
      select id, progress_type, progress_value, progress_note, category, is_positive, created_at
      from student_progress
      where student_id = ${studentId}
        and (lower(coalesce(category, '')) like '%refund%' or lower(coalesce(progress_type, '')) like '%refund%')
      order by created_at desc
      limit 80
    `, "refund requests"),
    first(tenantDb, sql`
      select
        max(value) filter (where key = 'finance_contact_email') as finance_email,
        max(value) filter (where key = 'refund_policy') as refund_policy
      from system_settings
      where key in ('finance_contact_email', 'refund_policy')
    `, "refund settings"),
  ])

  const eligiblePayments = paymentRows
    .filter((row) => text(row.status).toLowerCase() === "completed")
    .map((row) => ({
      id: text(row.id),
      amount: numberValue(row.amount),
      method: text(row.payment_method, "Payment"),
      reference: text(row.payment_reference),
      provider: text(row.provider),
      status: text(row.status, "completed").toLowerCase(),
      completedAt: iso(row.completed_at),
      createdAt: iso(row.created_at),
    }))

  const completedRefunds = [
    ...paymentRows.filter((row) => text(row.status).toLowerCase() === "refunded" || row.refunded_at).map((row) => ({
      id: text(row.id),
      paymentId: text(row.id),
      reference: text(row.payment_reference, "Refund"),
      amount: numberValue(row.amount),
      description: `Refund for payment ${text(row.payment_reference)}`,
      status: "completed",
      method: text(row.payment_method, "Payment"),
      createdAt: iso(row.refunded_at || row.updated_at || row.created_at),
    })),
    ...refundLedgerRows.map((row) => ({
      id: text(row.id),
      paymentId: text(row.payment_id),
      reference: text(row.reference, text(row.id, "Refund")),
      amount: numberValue(row.amount),
      description: text(row.description, "Refund ledger entry"),
      status: "completed",
      method: "Ledger",
      createdAt: iso(row.created_at),
    })),
  ]

  const requests = requestRows.map((row) => {
    const parsed = parseRequestNote(row)
    return {
      id: text(row.id),
      reference: parsed.reference,
      amount: parsed.amount,
      reason: parsed.reason,
      status: "submitted",
      note: text(row.progress_note),
      createdAt: iso(row.created_at),
    }
  })

  const completedAmount = completedRefunds.reduce((sum, refund) => sum + refund.amount, 0)
  const pendingAmount = requests.reduce((sum, refund) => sum + refund.amount, 0)
  const eligibleAmount = eligiblePayments.reduce((sum, payment) => sum + payment.amount, 0)

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
        className: text(student.class_name, "Unassigned class"),
        classGrade: text(student.class_grade),
        classSection: text(student.class_section),
        classTeacher: text(student.class_teacher),
        classTeacherId: text(student.class_teacher_id),
        academicYear: text(student.academic_year_name),
        term: text(student.term_name),
      },
      metrics: {
        completedAmount,
        pendingAmount,
        eligibleAmount,
        completedCount: completedRefunds.length,
        pendingCount: requests.length,
        eligiblePaymentCount: eligiblePayments.length,
        averageProcessingDays: requests.length ? 7 : 0,
      },
      eligiblePayments,
      completedRefunds,
      requests,
      refundPolicy: text(settings?.refund_policy, "Refunds are reviewed by the finance office and processed against verified payments only."),
      financeOffice: { email: text(settings?.finance_email) },
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
  const amount = numberValue(body.amount)
  const paymentReference = text(body.paymentReference, "manual")
  const reason = text(body.reason)
  const message = text(body.message)
  const { tenantDb, student } = result.context

  if (action === "refund-note") {
    if (!message) return NextResponse.json({ error: "Refund note message is required" }, { status: 400 })
    await tenantDb.execute(sql`
      insert into student_progress (id, student_id, academic_year_id, term_id, subject_id, progress_type, progress_date, progress_value, progress_note, recorded_by, is_positive, category, created_at, updated_at)
      values (${crypto.randomUUID()}, ${text(student.id)}, ${text(student.academic_year_id) || null}, ${text(student.term_id) || null}, null, 'refund', now(), null, ${message}, ${text(student.user_id)}, true, 'refund', now(), now())
    `)
    return NextResponse.json({ success: true }, { status: 201, headers: { "Cache-Control": "no-store" } })
  }

  if (action !== "refund-request" || amount <= 0 || !reason) {
    return NextResponse.json({ error: "Refund amount and reason are required" }, { status: 400 })
  }

  const note = `Refund request ${paymentReference}: ${amount} - ${reason}`
  await tenantDb.execute(sql`
    insert into student_progress (id, student_id, academic_year_id, term_id, subject_id, progress_type, progress_date, progress_value, progress_note, recorded_by, is_positive, category, created_at, updated_at)
    values (${crypto.randomUUID()}, ${text(student.id)}, ${text(student.academic_year_id) || null}, ${text(student.term_id) || null}, null, 'refund', now(), ${amount}, ${note}, ${text(student.user_id)}, true, 'refund', now(), now())
  `)

  return NextResponse.json({ success: true }, { status: 201, headers: { "Cache-Control": "no-store" } })
}
