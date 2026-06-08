import crypto from "node:crypto"

import { sql } from "drizzle-orm"
import { NextRequest, NextResponse } from "next/server"

import { getRequiredDashboardUser, isNextResponse } from "@/lib/dashboard-db"
import { getTenantDb, masterDb } from "@/lib/db"
import { getTenantSubdomain, resolveTenantSlug } from "@/lib/tenant-routing"

export const dynamic = "force-dynamic"
export const revalidate = 0

type Row = Record<string, unknown>
type QueryableDb = ReturnType<typeof getTenantDb>

const TIMETABLE_KEY = "admin_timetable"

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

function objectValue(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Row : {}
}

function rowArray(value: unknown) {
  return Array.isArray(value) ? value as Row[] : []
}

function boolValue(value: unknown, fallback = true) {
  if (typeof value === "boolean") return value
  if (typeof value === "string") return !["false", "0", "no"].includes(value.toLowerCase())
  return fallback
}

function letterGrade(score: number) {
  if (score >= 90) return "A"
  if (score >= 80) return "B+"
  if (score >= 70) return "B"
  if (score >= 60) return "C"
  if (score >= 50) return "D"
  return score > 0 ? "F" : "N/A"
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
    console.warn(`[parent-dashboard] ${label} query skipped`, error instanceof Error ? error.message : error)
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
  `, "parent tenant user")
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
  `, "parent tenant user after create")
}

async function findParentContext(request: NextRequest, user: { id: string; name: string; email: string; image?: string | null }) {
  const schools = await loadSchools(tenantSlugFromRequest(request))

  for (const school of schools) {
    const databaseUrl = text(school.database_url)
    if (!databaseUrl) continue
    const tenantDb = getTenantDb(databaseUrl)
    const parentUser = await ensureParentTenantUser(tenantDb, user)
    const children = await rows(tenantDb, sql`
      select
        s.id,
        s.user_id,
        s.admission_number,
        s.avatar,
        s.gender,
        s.phone,
        s.class_id,
        s.status,
        s.enrollment_date,
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

    if (children.length) return { school, tenantDb, parentUser, children }
  }

  return null
}

async function findOrCreateDirectConversation(db: QueryableDb, parentUserId: string, staffUserId: string) {
  const existing = await first(db, sql`
    select c.id
    from conversations c
    join conversation_members parent_member
      on parent_member.conversation_id = c.id
      and parent_member.user_id = ${parentUserId}
      and parent_member.left_at is null
    join conversation_members staff_member
      on staff_member.conversation_id = c.id
      and staff_member.user_id = ${staffUserId}
      and staff_member.left_at is null
    where c.type = 'direct'
      and c.is_archived = false
    limit 1
  `, "parent conversation lookup")
  const existingId = text(existing?.id)
  if (existingId) return existingId

  const conversationId = `conv_${crypto.randomUUID()}`
  await db.execute(sql`
    insert into conversations (id, type, name, created_by, is_archived, created_at, updated_at)
    values (${conversationId}, 'direct', null, ${parentUserId}, false, now(), now())
  `)
  await db.execute(sql`
    insert into conversation_members (id, conversation_id, user_id, role, joined_at)
    values
      (${`cm_${crypto.randomUUID()}`}, ${conversationId}, ${parentUserId}, 'owner', now()),
      (${`cm_${crypto.randomUUID()}`}, ${conversationId}, ${staffUserId}, 'member', now())
    on conflict (conversation_id, user_id) do nothing
  `)
  return conversationId
}

function normalizeLessons(timetableRow: Row | null, subjects: Row[], teachers: Row[], child: Row) {
  const timetable = objectValue(timetableRow?.value)
  const subjectMap = new Map(subjects.map((row) => [text(row.id), row]))
  const teacherMap = new Map(teachers.map((row) => [text(row.id), row]))
  return rowArray(timetable.entries)
    .filter((item) => text(item.classId) === text(child.class_id) && boolValue(item.published, true))
    .map((item) => {
      const subject = subjectMap.get(text(item.subjectId))
      const teacher = teacherMap.get(text(item.teacherId))
      return {
        id: text(item.id, `${text(item.day)}_${text(item.period)}_${text(item.subjectId)}`),
        day: text(item.day, "Monday"),
        period: text(item.period, "1"),
        startTime: text(item.startTime),
        endTime: text(item.endTime),
        subject: text(subject?.name, "Subject"),
        subjectCode: text(subject?.code),
        teacherId: text(item.teacherId),
        teacher: text(teacher?.name, text(child.class_teacher, "Teacher")),
        room: text(item.room, "Classroom"),
      }
    })
    .toSorted((a, b) => `${a.day}-${a.startTime || a.period}`.localeCompare(`${b.day}-${b.startTime || b.period}`))
}

async function buildChildSummary(db: QueryableDb, child: Row, shared: { timetableRow: Row | null; subjects: Row[]; teachers: Row[] }) {
  const childId = text(child.id)
  const classId = text(child.class_id)

  const [gradeRows, attendanceSummary, attendanceRows, invoiceSummary, assessmentRows, examRows, progressRows, reportRows] = await Promise.all([
    rows(db, sql`
      select g.id, g.subject_id, g.assessment_type, g.assessment_name, g.score, g.max_score,
        coalesce(g.percentage, (g.score / nullif(g.max_score, 0)) * 100) as percentage,
        g.grade, g.assessment_date, s.name as subject_name, s.code as subject_code, teacher.name as teacher_name
      from gradebook g
      left join subjects s on s.id = g.subject_id
      left join users teacher on teacher.id = g.teacher_id
      where g.student_id = ${childId}
      order by g.assessment_date desc nulls last, g.created_at desc
      limit 80
    `, `grades ${childId}`),
    first(db, sql`
      select
        count(*)::int as total,
        count(*) filter (where lower(status) in ('present', 'late', 'excused'))::int as present,
        count(*) filter (where lower(status) = 'late')::int as late,
        count(*) filter (where lower(status) = 'absent')::int as absent
      from attendance
      where student_id = ${childId}
        and attendance_date >= now() - interval '120 days'
    `, `attendance summary ${childId}`),
    rows(db, sql`
      select attendance_date, status, remarks
      from attendance
      where student_id = ${childId}
      order by attendance_date desc
      limit 10
    `, `attendance rows ${childId}`),
    first(db, sql`
      select
        count(*)::int as total,
        coalesce(sum(total_amount), 0)::numeric(14,2) as billed,
        coalesce(sum(amount_paid), 0)::numeric(14,2) as paid,
        coalesce(sum(outstanding_balance), 0)::numeric(14,2) as outstanding,
        count(*) filter (where lower(status) in ('overdue', 'unpaid', 'partial'))::int as attention
      from student_invoices
      where student_id = ${childId}
    `, `invoice summary ${childId}`),
    rows(db, sql`
      select a.id, a.name, a.assessment_type, a.total_score, a.due_date, a.status, s.name as subject_name, s.code as subject_code
      from assessments a
      left join subjects s on s.id = a.subject_id
      where a.class_id = ${classId}
      order by a.due_date asc nulls last, a.created_at desc
      limit 10
    `, `assessments ${childId}`),
    rows(db, sql`
      select e.id, e.name, e.exam_date, e.start_time, e.end_time, e.location, e.exam_type, e.status
      from exams e
      where e.class_id = ${classId}
      order by e.exam_date asc
      limit 8
    `, `exams ${childId}`),
    rows(db, sql`
      select sp.id, sp.progress_type, sp.progress_value, sp.progress_note, sp.category, sp.is_positive, sp.created_at, u.name as recorded_by_name
      from student_progress sp
      left join users u on u.id = sp.recorded_by
      where sp.student_id = ${childId}
      order by sp.created_at desc
      limit 8
    `, `progress ${childId}`),
    rows(db, sql`
      select id, report_card_number, overall_grade, overall_percentage, gpa, rank, total_students, status, issued_date, teacher_comments, principal_comments
      from report_cards
      where student_id = ${childId}
      order by issued_date desc
      limit 3
    `, `report cards ${childId}`),
  ])

  const scores = gradeRows.map((row) => numberValue(row.percentage)).filter((score) => score > 0)
  const averageScore = scores.length ? Math.round((scores.reduce((sum, score) => sum + score, 0) / scores.length) * 10) / 10 : 0
  const attendanceTotal = numberValue(attendanceSummary?.total)
  const attendanceRate = attendanceTotal ? Math.round((numberValue(attendanceSummary?.present) / attendanceTotal) * 1000) / 10 : 0
  const pendingAssessments = assessmentRows.filter((row) => {
    const due = row.due_date ? new Date(String(row.due_date)).getTime() : 0
    return !due || due >= Date.now()
  })
  const upcomingExams = examRows.filter((row) => {
    const date = row.exam_date ? new Date(String(row.exam_date)).getTime() : 0
    return !date || date >= Date.now() - 86400000
  })
  const lessons = normalizeLessons(shared.timetableRow, shared.subjects, shared.teachers, child)

  return {
    id: childId,
    userId: text(child.user_id),
    name: text(child.name, "Student"),
    email: text(child.email),
    admissionNumber: text(child.admission_number),
    avatar: text(child.avatar),
    status: text(child.status, "active"),
    classId,
    className: text(child.class_name, "Unassigned class"),
    classGrade: text(child.class_grade),
    classSection: text(child.class_section),
    classTeacher: text(child.class_teacher),
    classTeacherId: text(child.class_teacher_id),
    academicYear: text(child.academic_year_name),
    term: text(child.term_name),
    guardian: {
      id: text(child.guardian_id),
      name: text(child.guardian_name),
      relation: text(child.guardian_relation),
      phone: text(child.guardian_phone),
      email: text(child.guardian_email),
    },
    metrics: {
      averageScore,
      grade: letterGrade(averageScore),
      attendanceRate,
      absentDays: numberValue(attendanceSummary?.absent),
      lateDays: numberValue(attendanceSummary?.late),
      billed: numberValue(invoiceSummary?.billed),
      paid: numberValue(invoiceSummary?.paid),
      outstanding: numberValue(invoiceSummary?.outstanding),
      financeAttention: numberValue(invoiceSummary?.attention),
      pendingAssessments: pendingAssessments.length,
      upcomingExams: upcomingExams.length,
      lessons: lessons.length,
      reports: reportRows.length,
    },
    recentGrades: gradeRows.slice(0, 6).map((row) => ({
      id: text(row.id),
      title: text(row.assessment_name, "Assessment"),
      type: text(row.assessment_type),
      subject: text(row.subject_name, "Subject"),
      subjectCode: text(row.subject_code),
      teacher: text(row.teacher_name, "Teacher"),
      percentage: Math.round(numberValue(row.percentage) * 10) / 10,
      grade: text(row.grade, letterGrade(numberValue(row.percentage))),
      date: iso(row.assessment_date),
    })),
    attendance: attendanceRows.map((row) => ({
      date: iso(row.attendance_date),
      status: text(row.status),
      remarks: text(row.remarks),
    })),
    assessments: pendingAssessments.slice(0, 5).map((row) => ({
      id: text(row.id),
      title: text(row.name, "Assessment"),
      type: text(row.assessment_type),
      subject: text(row.subject_code, text(row.subject_name, "Subject")),
      dueDate: iso(row.due_date),
      status: text(row.status, "published"),
      points: numberValue(row.total_score, 100),
    })),
    exams: upcomingExams.slice(0, 5).map((row) => ({
      id: text(row.id),
      title: text(row.name, "Exam"),
      type: text(row.exam_type),
      date: iso(row.exam_date),
      time: text(row.start_time),
      room: text(row.location, "Exam center"),
      status: text(row.status, "scheduled"),
    })),
    lessons: lessons.slice(0, 6),
    progressNotes: progressRows.map((row) => ({
      id: text(row.id),
      type: text(row.progress_type),
      value: numberValue(row.progress_value),
      note: text(row.progress_note),
      category: text(row.category),
      positive: row.is_positive !== false,
      recordedBy: text(row.recorded_by_name),
      createdAt: iso(row.created_at),
    })),
    reportCards: reportRows.map((row) => ({
      id: text(row.id),
      number: text(row.report_card_number),
      grade: text(row.overall_grade),
      percentage: numberValue(row.overall_percentage),
      gpa: numberValue(row.gpa),
      rank: numberValue(row.rank),
      totalStudents: numberValue(row.total_students),
      status: text(row.status),
      issuedDate: iso(row.issued_date),
      teacherComments: text(row.teacher_comments),
      principalComments: text(row.principal_comments),
    })),
  }
}

export async function GET(request: NextRequest) {
  const currentUser = await getRequiredDashboardUser(request.headers)
  if (isNextResponse(currentUser)) return currentUser

  const context = await findParentContext(request, currentUser)
  if (!context) {
    return NextResponse.json(
      {
        error: "No linked children were found for this parent account.",
        currentUser,
        generatedAt: new Date().toISOString(),
      },
      { status: 404, headers: { "Cache-Control": "no-store" } }
    )
  }

  const { tenantDb, school, parentUser, children } = context
  const [timetableRow, subjectRows, teacherRows, announcements, unreadMessages] = await Promise.all([
    first(tenantDb, sql`select value from system_settings where key = ${TIMETABLE_KEY} limit 1`, "timetable"),
    rows(tenantDb, sql`select id, name, code, type from subjects order by name asc`, "subjects"),
    rows(tenantDb, sql`select id, name, email, role_id from users where is_active = true order by name asc limit 500`, "teachers"),
    rows(tenantDb, sql`
      select id, title, content, publish_date, created_at
      from announcements
      where is_published = true
        and (expiry_date is null or expiry_date > now())
      order by coalesce(publish_date, created_at) desc
      limit 8
    `, "announcements"),
    first(tenantDb, sql`
      select count(*)::int as unread
      from conversations c
      join conversation_members self on self.conversation_id = c.id and self.user_id = ${text(parentUser?.id, currentUser.id)} and self.left_at is null
      join messages m on m.conversation_id = c.id and m.sender_id <> ${text(parentUser?.id, currentUser.id)}
      where not exists (
        select 1 from message_read_status mrs
        where mrs.message_id = m.id and mrs.user_id = ${text(parentUser?.id, currentUser.id)}
      )
    `, "unread messages"),
  ])

  const childSummaries = await Promise.all(children.map((child) => buildChildSummary(tenantDb, child, { timetableRow, subjects: subjectRows, teachers: teacherRows })))
  const allScores = childSummaries.map((child) => child.metrics.averageScore).filter((score) => score > 0)
  const allAttendance = childSummaries.map((child) => child.metrics.attendanceRate).filter((score) => score > 0)
  const totalOutstanding = childSummaries.reduce((sum, child) => sum + child.metrics.outstanding, 0)
  const actionItems = [
    ...childSummaries.filter((child) => child.metrics.financeAttention > 0).map((child) => ({
      id: `finance_${child.id}`,
      type: "finance",
      title: `${child.name} has finance items needing attention`,
      helper: `${text(school.currency_code)} ${child.metrics.outstanding} outstanding`,
      childId: child.id,
      href: "/parent/dashboard?tab=finance",
      severity: "high",
    })),
    ...childSummaries.filter((child) => child.metrics.attendanceRate > 0 && child.metrics.attendanceRate < 90).map((child) => ({
      id: `attendance_${child.id}`,
      type: "attendance",
      title: `${child.name} attendance is below target`,
      helper: `${child.metrics.attendanceRate}% attendance`,
      childId: child.id,
      href: "/parent/attendance",
      severity: "medium",
    })),
    ...childSummaries.flatMap((child) => child.assessments.slice(0, 2).map((assessment) => ({
      id: `assessment_${assessment.id}`,
      type: "assessment",
      title: `${assessment.title} due for ${child.name}`,
      helper: `${assessment.subject} - ${assessment.status}`,
      childId: child.id,
      href: "/parent/progress",
      severity: "normal",
    }))),
  ].slice(0, 8)

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    currentUser: {
      id: currentUser.id,
      name: text(parentUser?.name, currentUser.name),
      email: text(parentUser?.email, currentUser.email),
      role: text(parentUser?.role_id, currentUser.role),
      image: text(parentUser?.image, currentUser.image || "") || null,
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
      averageScore: allScores.length ? Math.round((allScores.reduce((sum, score) => sum + score, 0) / allScores.length) * 10) / 10 : 0,
      attendanceRate: allAttendance.length ? Math.round((allAttendance.reduce((sum, score) => sum + score, 0) / allAttendance.length) * 10) / 10 : 0,
      outstandingBalance: totalOutstanding,
      financeAttention: childSummaries.reduce((sum, child) => sum + child.metrics.financeAttention, 0),
      pendingAssessments: childSummaries.reduce((sum, child) => sum + child.metrics.pendingAssessments, 0),
      upcomingExams: childSummaries.reduce((sum, child) => sum + child.metrics.upcomingExams, 0),
      unreadMessages: numberValue(unreadMessages?.unread),
      actionItems: actionItems.length,
    },
    children: childSummaries,
    actionItems,
    announcements: announcements.map((row) => ({
      id: text(row.id),
      title: text(row.title),
      content: text(row.content),
      createdAt: iso(row.publish_date || row.created_at),
    })),
  }, { headers: { "Cache-Control": "no-store" } })
}

export async function POST(request: NextRequest) {
  const currentUser = await getRequiredDashboardUser(request.headers)
  if (isNextResponse(currentUser)) return currentUser

  const context = await findParentContext(request, currentUser)
  if (!context) return NextResponse.json({ error: "No linked children were found for this parent account." }, { status: 404 })

  const body = await request.json().catch(() => ({}))
  const action = text(body.action)
  const childId = text(body.childId)
  const message = text(body.message)
  const { tenantDb, parentUser, children } = context
  const child = children.find((item) => text(item.id) === childId) || children[0]

  if (action === "teacher-message") {
    const receiverId = text(body.receiverId, text(child?.class_teacher_id))
    const parentUserId = text(parentUser?.id, currentUser.id)
    if (!message) return NextResponse.json({ error: "Message is required." }, { status: 400 })
    if (!receiverId) return NextResponse.json({ error: "Teacher is not assigned for this child." }, { status: 400 })
    const staff = await first(tenantDb, sql`select id from users where id = ${receiverId} and is_active = true limit 1`, "staff lookup")
    if (!staff) return NextResponse.json({ error: "Teacher account is not active." }, { status: 404 })

    const conversationId = await findOrCreateDirectConversation(tenantDb, parentUserId, receiverId)
    const messageId = `msg_${crypto.randomUUID()}`
    await tenantDb.execute(sql`
      insert into messages (id, conversation_id, sender_id, content, attachments, is_edited, created_at)
      values (${messageId}, ${conversationId}, ${parentUserId}, ${message}, '[]'::jsonb, false, now())
    `)
    await tenantDb.execute(sql`
      insert into message_read_status (id, message_id, user_id, read_at)
      values (${`read_${crypto.randomUUID()}`}, ${messageId}, ${parentUserId}, now())
      on conflict (message_id, user_id) do nothing
    `)
    await tenantDb.execute(sql`update conversations set updated_at = now() where id = ${conversationId}`)
    return NextResponse.json({ success: true, conversationId, messageId }, { status: 201, headers: { "Cache-Control": "no-store" } })
  }

  if (action === "guardian-note") {
    if (!message) return NextResponse.json({ error: "Note is required." }, { status: 400 })
    if (!child?.id || !child.academic_year_id) return NextResponse.json({ error: "Child academic context is not configured." }, { status: 400 })
    await tenantDb.execute(sql`
      insert into student_progress (id, student_id, academic_year_id, term_id, subject_id, progress_type, progress_date, progress_value, progress_note, recorded_by, is_positive, category, created_at, updated_at)
      values (${crypto.randomUUID()}, ${text(child.id)}, ${text(child.academic_year_id)}, ${text(child.term_id) || null}, null, 'guardian', now(), null, ${message}, ${text(parentUser?.id, currentUser.id)}, true, 'guardian-note', now(), now())
    `)
    return NextResponse.json({ success: true }, { status: 201, headers: { "Cache-Control": "no-store" } })
  }

  return NextResponse.json({ error: "Unsupported parent dashboard action." }, { status: 400 })
}
