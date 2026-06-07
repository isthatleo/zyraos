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
    console.warn(`[student-attendance] ${label} query skipped`, error instanceof Error ? error.message : error)
    return []
  }
}

async function first(db: QueryableDb, query: ReturnType<typeof sql>, label: string) {
  return (await rows(db, query, label))[0] || null
}

async function loadSchools(slug: string | null) {
  if (slug) {
    const result = await masterDb.execute(sql`
      select id, name, slug, type, status, country, currency_code, database_url
      from schools
      where slug = ${slug}
      limit 1
    `)
    return (result.rows || []) as Row[]
  }

  const result = await masterDb.execute(sql`
    select id, name, slug, type, status, country, currency_code, database_url
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

async function buildPayload(request: NextRequest, currentUser: { id: string; name: string; email: string; role: string }) {
  const context = await findStudentContext(request, currentUser)
  if (!context) return { response: NextResponse.json({ error: "Student profile was not found for this account.", currentUser }, { status: 404 }) }

  const { tenantDb, school, student } = context
  const studentId = text(student.id)

  const [attendanceRows, summary, trendRows, progressRows] = await Promise.all([
    rows(tenantDb, sql`
      select a.id, a.attendance_date, a.status, a.remarks, a.recorded_by, u.name as recorded_by_name
      from attendance a
      left join users u on u.id = a.recorded_by
      where a.student_id = ${studentId}
      order by a.attendance_date desc
      limit 180
    `, "records"),
    first(tenantDb, sql`
      select
        count(*)::int as total,
        count(*) filter (where lower(status) = 'present')::int as present,
        count(*) filter (where lower(status) = 'absent')::int as absent,
        count(*) filter (where lower(status) = 'late')::int as late,
        count(*) filter (where lower(status) = 'excused')::int as excused
      from attendance
      where student_id = ${studentId}
        and attendance_date >= now() - interval '180 days'
    `, "summary"),
    rows(tenantDb, sql`
      select attendance_date::date as date,
        count(*)::int as total,
        count(*) filter (where lower(status) in ('present', 'late', 'excused'))::int as present
      from attendance
      where student_id = ${studentId}
        and attendance_date >= now() - interval '60 days'
      group by attendance_date::date
      order by attendance_date::date asc
    `, "trend"),
    rows(tenantDb, sql`
      select id, progress_type, progress_value, progress_note, category, is_positive, created_at
      from student_progress
      where student_id = ${studentId}
        and (lower(coalesce(category, '')) like '%attendance%' or lower(coalesce(progress_type, '')) like '%attendance%')
      order by created_at desc
      limit 30
    `, "progress notes"),
  ])

  const total = numberValue(summary?.total)
  const present = numberValue(summary?.present)
  const late = numberValue(summary?.late)
  const excused = numberValue(summary?.excused)
  const attendanceRate = total ? Math.round(((present + late + excused) / total) * 1000) / 10 : 0

  return {
    payload: {
      generatedAt: new Date().toISOString(),
      currentUser: { id: currentUser.id, name: text(student.name, currentUser.name), email: text(student.email, currentUser.email), role: currentUser.role },
      school: { id: text(school.id), name: text(school.name, text(school.slug, "School")), slug: text(school.slug), type: text(school.type) },
      student: {
        id: studentId,
        userId: text(student.user_id),
        admissionNumber: text(student.admission_number),
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
        total,
        present,
        absent: numberValue(summary?.absent),
        late,
        excused,
        attendanceRate,
        riskLevel: attendanceRate >= 90 ? "low" : attendanceRate >= 75 ? "medium" : "high",
      },
      records: attendanceRows.map((row) => ({
        id: text(row.id),
        date: iso(row.attendance_date),
        status: text(row.status),
        remarks: text(row.remarks),
        recordedBy: text(row.recorded_by_name),
      })),
      trend: trendRows.map((row) => {
        const dayTotal = numberValue(row.total)
        return {
          date: iso(row.date),
          label: row.date ? new Intl.DateTimeFormat("en", { month: "short", day: "2-digit" }).format(new Date(String(row.date))) : "Day",
          rate: dayTotal ? Math.round((numberValue(row.present) / dayTotal) * 1000) / 10 : 0,
        }
      }),
      progressNotes: progressRows.map((row) => ({
        id: text(row.id),
        type: text(row.progress_type),
        value: numberValue(row.progress_value),
        note: text(row.progress_note),
        category: text(row.category),
        positive: row.is_positive !== false,
        createdAt: iso(row.created_at),
      })),
    },
    context,
  }
}

async function findOrCreateDirectConversation(db: QueryableDb, studentUserId: string, teacherUserId: string) {
  const existing = await first(db, sql`
    select c.id
    from conversations c
    join conversation_members student_member
      on student_member.conversation_id = c.id
      and student_member.user_id = ${studentUserId}
      and student_member.left_at is null
    join conversation_members teacher_member
      on teacher_member.conversation_id = c.id
      and teacher_member.user_id = ${teacherUserId}
      and teacher_member.left_at is null
    where c.type = 'direct'
      and c.is_archived = false
    limit 1
  `, "teacher conversation lookup")
  const existingId = text(existing?.id)
  if (existingId) return existingId

  const conversationId = `conv_${crypto.randomUUID()}`
  await db.execute(sql`
    insert into conversations (id, type, name, created_by, is_archived, created_at, updated_at)
    values (${conversationId}, 'direct', null, ${studentUserId}, false, now(), now())
  `)
  await db.execute(sql`
    insert into conversation_members (id, conversation_id, user_id, role, joined_at)
    values
      (${`cm_${crypto.randomUUID()}`}, ${conversationId}, ${studentUserId}, 'owner', now()),
      (${`cm_${crypto.randomUUID()}`}, ${conversationId}, ${teacherUserId}, 'member', now())
    on conflict (conversation_id, user_id) do nothing
  `)
  return conversationId
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
  if (!message) return NextResponse.json({ error: "Message is required" }, { status: 400 })

  const { tenantDb, student } = result.context
  if (action === "teacher-message") {
    const studentUserId = text(student.user_id)
    const teacherUserId = text(student.class_teacher_id)
    if (!studentUserId || !teacherUserId) {
      return NextResponse.json({ error: "Class teacher is not assigned for this student." }, { status: 400 })
    }

    const teacher = await first(tenantDb, sql`
      select id
      from users
      where id = ${teacherUserId}
        and is_active = true
      limit 1
    `, "teacher lookup")
    if (!teacher) return NextResponse.json({ error: "Class teacher account is not active." }, { status: 404 })

    const conversationId = await findOrCreateDirectConversation(tenantDb, studentUserId, teacherUserId)
    const messageId = `msg_${crypto.randomUUID()}`
    await tenantDb.execute(sql`
      insert into messages (id, conversation_id, sender_id, content, attachments, is_edited, created_at)
      values (${messageId}, ${conversationId}, ${studentUserId}, ${message}, '[]'::jsonb, false, now())
    `)
    await tenantDb.execute(sql`
      insert into message_read_status (id, message_id, user_id, read_at)
      values (${`read_${crypto.randomUUID()}`}, ${messageId}, ${studentUserId}, now())
      on conflict (message_id, user_id) do nothing
    `)
    await tenantDb.execute(sql`update conversations set updated_at = now() where id = ${conversationId}`)
    return NextResponse.json({ success: true, conversationId, messageId }, { status: 201, headers: { "Cache-Control": "no-store" } })
  }

  if (action !== "attendance-note") {
    return NextResponse.json({ error: "Unsupported attendance action" }, { status: 400 })
  }

  await tenantDb.execute(sql`
    insert into student_progress (id, student_id, academic_year_id, term_id, subject_id, progress_type, progress_date, progress_value, progress_note, recorded_by, is_positive, category, created_at, updated_at)
    values (${crypto.randomUUID()}, ${text(student.id)}, ${text(student.academic_year_id) || null}, ${text(student.term_id) || null}, null, 'attendance', now(), null, ${message}, ${text(student.user_id)}, true, 'attendance', now(), now())
  `)
  return NextResponse.json({ success: true }, { status: 201, headers: { "Cache-Control": "no-store" } })
}
