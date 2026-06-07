import { NextRequest, NextResponse } from "next/server"
import { sql } from "drizzle-orm"
import crypto from "crypto"

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

function objectValue(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Row : {}
}

function arrayValue(value: unknown) {
  return Array.isArray(value) ? value as unknown[] : []
}

function iso(value: unknown) {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(String(value))
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

function displayDate(value: unknown, fallback = "Unscheduled") {
  if (!value) return fallback
  const date = value instanceof Date ? value : new Date(String(value))
  if (Number.isNaN(date.getTime())) return fallback
  return new Intl.DateTimeFormat("en", { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(date)
}

function displayDue(value: unknown) {
  if (!value) return "No due date"
  const date = value instanceof Date ? value : new Date(String(value))
  if (Number.isNaN(date.getTime())) return "No due date"
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)
  const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString()
  const time = new Intl.DateTimeFormat("en", { hour: "2-digit", minute: "2-digit" }).format(date)
  if (sameDay(date, today)) return `Today, ${time}`
  if (sameDay(date, tomorrow)) return `Tomorrow, ${time}`
  return new Intl.DateTimeFormat("en", { month: "short", day: "2-digit" }).format(date)
}

function inferLevel(schoolType: string, grade: string): "primary" | "secondary" | "college" | "university" | "vocational" {
  const normalizedType = schoolType.toLowerCase()
  const normalizedGrade = grade.toLowerCase()
  if (normalizedType.includes("primary")) return "primary"
  if (normalizedType.includes("secondary") || normalizedType.includes("high")) return "secondary"
  if (normalizedType.includes("college")) return "college"
  if (normalizedType.includes("vocational") || normalizedType.includes("training")) return "vocational"
  if (normalizedType.includes("university")) return "university"
  const numericGrade = Number(normalizedGrade.replace(/[^0-9]/g, ""))
  if (Number.isFinite(numericGrade) && numericGrade > 0) return numericGrade <= 7 ? "primary" : "secondary"
  return "university"
}

function termLabel(level: string, termName: string, academicYear: string) {
  if (termName) return termName
  if (academicYear) return academicYear
  if (level === "university" || level === "college") return "Current semester"
  if (level === "vocational") return "Current cycle"
  return "Current term"
}

function gradePoint(average: number) {
  if (!average) return null
  return Math.max(0, Math.min(4, Math.round(((average / 100) * 4) * 100) / 100))
}

function letterGrade(score: number) {
  if (score >= 90) return "A"
  if (score >= 80) return "B+"
  if (score >= 70) return "B"
  if (score >= 60) return "C"
  if (score >= 50) return "D"
  return score > 0 ? "F" : "N/A"
}

function statusFromDue(dueDate: unknown, hasGrade: boolean, assessmentStatus: string) {
  if (hasGrade) return "graded"
  const status = assessmentStatus.toLowerCase()
  if (status === "submitted") return "submitted"
  if (dueDate && new Date(String(dueDate)).getTime() < Date.now()) return "late"
  return "pending"
}

function examStatus(status: string, date: unknown) {
  const normalized = status.toLowerCase()
  if (["completed", "cancelled"].includes(normalized)) return "completed"
  const examTime = date ? new Date(String(date)).getTime() : 0
  if (normalized === "in-progress" || (examTime && examTime <= Date.now() && examTime >= Date.now() - 3 * 60 * 60 * 1000)) return "available"
  return "scheduled"
}

async function rows(db: QueryableDb, query: ReturnType<typeof sql>, label: string) {
  try {
    const result = await db.execute(query)
    return (result.rows || []) as Row[]
  } catch (error) {
    console.warn(`[student-dashboard] ${label} query skipped`, error instanceof Error ? error.message : error)
    return []
  }
}

async function first(db: QueryableDb, query: ReturnType<typeof sql>, label: string) {
  return (await rows(db, query, label))[0] || null
}

function tenantSlugFromRequest(request: NextRequest) {
  const direct = request.nextUrl.searchParams.get("tenant") || request.nextUrl.searchParams.get("slug")
  if (direct) return direct
  const host = request.headers.get("host") || ""
  const subdomain = getTenantSubdomain(host)
  if (subdomain) return subdomain
  const referrer = request.headers.get("referer") || request.headers.get("referrer") || ""
  try {
    const url = referrer ? new URL(referrer) : null
    return resolveTenantSlug(url?.pathname, url?.host)
  } catch {
    return null
  }
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
        s.avatar,
        s.gender,
        s.phone,
        s.address,
        s.emergency_contact,
        s.class_id,
        s.status,
        s.enrollment_date,
        u.name,
        u.email,
        u.image,
        u.role_id,
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
  `, "advisor conversation lookup")
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

async function readDashboardState(db: QueryableDb, studentId: string) {
  const row = await first(db, sql`select value from system_settings where key = ${`student_dashboard:${studentId}`} limit 1`, "dashboard state")
  const value = objectValue(row?.value)
  return {
    savedResources: arrayValue(value.savedResources).map(String),
  }
}

async function writeDashboardState(db: QueryableDb, studentId: string, state: { savedResources: string[] }) {
  await db.execute(sql`
    insert into system_settings (id, key, value, category, description, created_at, updated_at)
    values (${crypto.randomUUID()}, ${`student_dashboard:${studentId}`}, ${JSON.stringify(state)}::jsonb, 'students', ${`Student dashboard state ${studentId}`}, now(), now())
    on conflict (key) do update set value = excluded.value, updated_at = now()
  `)
}

export async function GET(request: NextRequest) {
  const currentUser = await getRequiredDashboardUser(request.headers)
  if (isNextResponse(currentUser)) return currentUser

  const context = await findStudentContext(request, currentUser)
  if (!context) {
    return NextResponse.json(
      {
        error: "Student profile was not found for this account.",
        currentUser,
        generatedAt: new Date().toISOString(),
      },
      { status: 404, headers: { "Cache-Control": "no-store" } }
    )
  }

  const { tenantDb, school, student } = context
  const studentId = text(student.id)
  const classId = text(student.class_id)
  const level = inferLevel(text(school.type), text(student.class_grade, text(student.class_name)))
  const state = await readDashboardState(tenantDb, studentId)

  const [
    gradeRows,
    subjectRows,
    assessmentRows,
    examRows,
    attendanceRows,
    attendanceSummary,
    progressRows,
    invoiceSummary,
    paymentRows,
    unreadMessages,
    announcements,
    classmateSummary,
  ] = await Promise.all([
    rows(tenantDb, sql`
      select
        g.id,
        g.assessment_type,
        g.assessment_name,
        g.score,
        g.max_score,
        coalesce(g.percentage, (g.score / nullif(g.max_score, 0)) * 100) as percentage,
        g.grade,
        g.assessment_date,
        s.id as subject_id,
        s.name as subject_name,
        s.code as subject_code,
        teacher.name as teacher_name
      from gradebook g
      left join subjects s on s.id = g.subject_id
      left join users teacher on teacher.id = g.teacher_id
      where g.student_id = ${studentId}
      order by g.assessment_date desc
      limit 100
    `, "grades"),
    rows(tenantDb, sql`
      select
        s.id,
        s.name,
        s.code,
        s.type,
        teacher.name as teacher_name,
        count(g.id)::int as grade_count,
        avg(coalesce(g.percentage, (g.score / nullif(g.max_score, 0)) * 100))::numeric(8,2) as average,
        max(g.assessment_date) as last_assessment_at
      from subjects s
      left join gradebook g on g.subject_id = s.id and g.student_id = ${studentId}
      left join users teacher on teacher.id = g.teacher_id
      where exists (
        select 1 from assessments a where a.subject_id = s.id and a.class_id = ${classId}
      ) or exists (
        select 1 from gradebook g2 where g2.subject_id = s.id and g2.student_id = ${studentId}
      )
      group by s.id, s.name, s.code, s.type, teacher.name
      order by s.name asc
    `, "subjects"),
    rows(tenantDb, sql`
      select
        a.id,
        a.name,
        a.description,
        a.assessment_type,
        a.total_score,
        a.due_date,
        a.release_date,
        a.status,
        a.instructions,
        a.attachments,
        s.name as subject_name,
        s.code as subject_code,
        g.id as grade_id,
        g.score,
        g.max_score,
        g.percentage
      from assessments a
      left join subjects s on s.id = a.subject_id
      left join gradebook g on g.student_id = ${studentId} and g.assessment_name = a.name and g.subject_id = a.subject_id
      where a.class_id = ${classId}
      order by a.due_date asc nulls last, a.created_at desc
      limit 50
    `, "assessments"),
    rows(tenantDb, sql`
      select id, name, exam_date, start_time, end_time, location, total_marks, duration, exam_type, status, instructions
      from exams
      where class_id = ${classId}
      order by exam_date asc
      limit 20
    `, "exams"),
    rows(tenantDb, sql`
      select attendance_date, status, remarks
      from attendance
      where student_id = ${studentId}
      order by attendance_date desc
      limit 30
    `, "attendance records"),
    first(tenantDb, sql`
      select
        count(*)::int as total,
        count(*) filter (where lower(status) in ('present', 'late', 'excused'))::int as present,
        count(*) filter (where lower(status) = 'late')::int as late,
        count(*) filter (where lower(status) = 'absent')::int as absent
      from attendance
      where student_id = ${studentId}
        and attendance_date >= now() - interval '120 days'
    `, "attendance summary"),
    rows(tenantDb, sql`
      select sp.id, sp.progress_type, sp.progress_value, sp.progress_note, sp.category, sp.is_positive, sp.created_at, u.name as recorded_by_name
      from student_progress sp
      left join users u on u.id = sp.recorded_by
      where sp.student_id = ${studentId}
      order by sp.created_at desc
      limit 10
    `, "progress notes"),
    first(tenantDb, sql`
      select
        count(*)::int as total,
        coalesce(sum(total_amount), 0)::numeric(14,2) as billed,
        coalesce(sum(amount_paid), 0)::numeric(14,2) as paid,
        coalesce(sum(outstanding_balance), 0)::numeric(14,2) as outstanding,
        count(*) filter (where lower(status) in ('overdue', 'unpaid', 'partial'))::int as attention
      from student_invoices
      where student_id = ${studentId}
    `, "invoice summary"),
    rows(tenantDb, sql`
      select amount, payment_method, payment_reference, status, created_at
      from payments
      where student_id = ${studentId}
      order by created_at desc
      limit 5
    `, "payments"),
    first(tenantDb, sql`
      select count(*)::int as unread
      from conversations c
      join conversation_members self on self.conversation_id = c.id and self.user_id = ${text(student.user_id)} and self.left_at is null
      join messages m on m.conversation_id = c.id and m.sender_id <> ${text(student.user_id)}
      where not exists (
        select 1 from message_read_status mrs
        where mrs.message_id = m.id and mrs.user_id = ${text(student.user_id)}
      )
    `, "unread messages"),
    rows(tenantDb, sql`
      select id, title, content, publish_date, created_at
      from announcements
      where is_published = true
        and (expiry_date is null or expiry_date > now())
      order by coalesce(publish_date, created_at) desc
      limit 5
    `, "announcements"),
    first(tenantDb, sql`
      select count(*)::int as total
      from students
      where class_id = ${classId} and lower(status) = 'active'
    `, "classmates"),
  ])

  const validGrades = gradeRows
    .map((row) => numberValue(row.percentage))
    .filter((score) => score > 0)
  const averageGrade = validGrades.length ? Math.round((validGrades.reduce((total, score) => total + score, 0) / validGrades.length) * 10) / 10 : 0
  const attendanceTotal = numberValue(attendanceSummary?.total)
  const attendanceRate = attendanceTotal ? Math.round((numberValue(attendanceSummary?.present) / attendanceTotal) * 1000) / 10 : 0
  const credits = subjectRows.length || new Set(gradeRows.map((row) => text(row.subject_id)).filter(Boolean)).size

  const courses = subjectRows.map((row) => {
    const average = numberValue(row.average)
    return {
      code: text(row.subject_code, text(row.code, "SUBJ")),
      title: text(row.subject_name, text(row.name, "Subject")),
      instructor: text(row.teacher_name, text(student.class_teacher, "Assigned teacher")),
      progress: average || averageGrade || 0,
      grade: letterGrade(average || averageGrade),
      attendance: attendanceRate,
      credits: level === "university" || level === "college" ? 3 : 1,
    }
  })

  const assignments = assessmentRows.map((row) => {
    const hasGrade = Boolean(row.grade_id)
    return {
      id: text(row.id),
      title: text(row.name, "Assessment"),
      course: text(row.subject_code, text(row.subject_name, "Course")),
      due: displayDue(row.due_date),
      dueDate: iso(row.due_date),
      points: numberValue(row.total_score, 100),
      status: statusFromDue(row.due_date, hasGrade, text(row.status)),
      score: hasGrade ? numberValue(row.score) : undefined,
      description: text(row.description),
      instructions: text(row.instructions),
    }
  })

  const exams = examRows.map((row) => ({
    id: text(row.id),
    title: text(row.name, "Exam"),
    course: text(row.exam_type, "Exam"),
    date: displayDate(row.exam_date),
    examDate: iso(row.exam_date),
    duration: row.duration ? `${numberValue(row.duration)} min` : "Scheduled",
    status: examStatus(text(row.status), row.exam_date),
    location: text(row.location, "Exam center"),
    instructions: text(row.instructions),
  }))

  const performanceTrend = Array.from(
    gradeRows.reduce((map, row) => {
      const date = row.assessment_date ? new Date(String(row.assessment_date)) : new Date()
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
      const existing = map.get(key) || { week: new Intl.DateTimeFormat("en", { month: "short" }).format(date), scores: [] as number[], attendance: attendanceRate }
      existing.scores.push(numberValue(row.percentage))
      map.set(key, existing)
      return map
    }, new Map<string, { week: string; scores: number[]; attendance: number }>())
  ).map(([, value]) => ({
    week: value.week,
    score: value.scores.length ? Math.round((value.scores.reduce((sum, score) => sum + score, 0) / value.scores.length) * 10) / 10 : 0,
    attendance: value.attendance,
  })).slice(-6)

  const gradeBreakdown = Array.from(
    gradeRows.reduce((map, row) => {
      const key = text(row.assessment_type, "Assessment")
      const current = map.get(key) || [] as number[]
      current.push(numberValue(row.percentage))
      map.set(key, current)
      return map
    }, new Map<string, number[]>())
  ).map(([name, values]) => ({
    name,
    value: values.length ? Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10 : 0,
  }))

  const resources = assessmentRows
    .filter((row) => text(row.instructions) || row.attachments)
    .slice(0, 6)
    .map((row) => ({
      id: `resource_${text(row.id)}`,
      title: text(row.instructions) ? `${text(row.name, "Assessment")} instructions` : `${text(row.name, "Assessment")} resources`,
      type: row.attachments ? "Attachment" : "Instructions",
      size: row.attachments ? "Course file" : "Read online",
      course: text(row.subject_code, text(row.subject_name, "Course")),
    }))

  const payload = {
    generatedAt: new Date().toISOString(),
    currentUser: {
      id: currentUser.id,
      name: text(student.name, currentUser.name),
      email: text(student.email, currentUser.email),
      role: text(student.role_id, currentUser.role),
      image: text(student.avatar, text(student.image, currentUser.image || "")) || null,
    },
    school: {
      id: text(school.id),
      name: text(school.name, text(school.slug, "School")),
      slug: text(school.slug),
      type: text(school.type),
      status: text(school.status),
      country: text(school.country),
      currencyCode: text(school.currency_code, "ZAR"),
      currencyName: text(school.currency_name, "School currency"),
    },
    student: {
      id: studentId,
      admissionNumber: text(student.admission_number),
      status: text(student.status, "active"),
      level,
      stage: text(student.class_grade, text(student.class_name, level)),
      classId,
      className: text(student.class_name, "Unassigned class"),
      classGrade: text(student.class_grade),
      classSection: text(student.class_section),
      classTeacher: text(student.class_teacher),
      classTeacherId: text(student.class_teacher_id),
      classmates: numberValue(classmateSummary?.total),
      academicYear: text(student.academic_year_name),
      term: termLabel(level, text(student.term_name), text(student.academic_year_name)),
      guardianContact: text(student.emergency_contact),
      phone: text(student.phone),
      address: text(student.address),
      enrollmentDate: iso(student.enrollment_date),
    },
    metrics: {
      courses: courses.length,
      credits,
      averageProgress: averageGrade,
      attendance: attendanceRate,
      attendanceTotal,
      absentDays: numberValue(attendanceSummary?.absent),
      lateDays: numberValue(attendanceSummary?.late),
      pendingAssignments: assignments.filter((assignment) => assignment.status === "pending" || assignment.status === "late").length,
      completedAssignments: assignments.filter((assignment) => assignment.status === "graded" || assignment.status === "submitted").length,
      gpa: gradePoint(averageGrade),
      unreadMessages: numberValue(unreadMessages?.unread),
      outstandingBalance: numberValue(invoiceSummary?.outstanding),
      invoicesNeedingAttention: numberValue(invoiceSummary?.attention),
      savedResources: state.savedResources.length,
    },
    savedResourceIds: state.savedResources,
    courses,
    assignments,
    schedule: exams.slice(0, 3).map((exam) => ({
      time: exam.date,
      course: exam.title,
      type: "Exam",
      room: exam.location,
      instructor: text(student.class_teacher, "Exam office"),
      online: exam.status === "available",
    })),
    exams,
    performanceTrend: performanceTrend.length ? performanceTrend : [{ week: "Now", score: averageGrade, attendance: attendanceRate }],
    gradeBreakdown: gradeBreakdown.length ? gradeBreakdown : [{ name: "Current average", value: averageGrade }],
    resources,
    attendance: attendanceRows.map((row) => ({
      date: iso(row.attendance_date),
      label: displayDate(row.attendance_date, "Attendance"),
      status: text(row.status),
      remarks: text(row.remarks),
    })),
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
    finance: {
      billed: numberValue(invoiceSummary?.billed),
      paid: numberValue(invoiceSummary?.paid),
      outstanding: numberValue(invoiceSummary?.outstanding),
      payments: paymentRows.map((row) => ({
        amount: numberValue(row.amount),
        method: text(row.payment_method),
        reference: text(row.payment_reference),
        status: text(row.status),
        createdAt: iso(row.created_at),
      })),
    },
    announcements: announcements.map((row) => ({
      id: text(row.id),
      title: text(row.title),
      content: text(row.content),
      createdAt: iso(row.publish_date || row.created_at),
    })),
  }

  return NextResponse.json(payload, { headers: { "Cache-Control": "no-store" } })
}

export async function POST(request: NextRequest) {
  const currentUser = await getRequiredDashboardUser(request.headers)
  if (isNextResponse(currentUser)) return currentUser

  const context = await findStudentContext(request, currentUser)
  if (!context) return NextResponse.json({ error: "Student profile was not found for this account." }, { status: 404 })

  const body = await request.json().catch(() => ({}))
  const action = text(body.action)
  const note = text(body.note)
  const { tenantDb, student } = context
  const studentId = text(student.id)

  if (action === "assignment-submission") {
    const assignmentTitle = text(body.assignmentTitle, "Assignment")
    if (!text(student.academic_year_id)) {
      return NextResponse.json({ error: "Student academic year is not configured." }, { status: 400 })
    }
    await tenantDb.execute(sql`
      insert into student_progress (
        id,
        student_id,
        academic_year_id,
        term_id,
        subject_id,
        progress_type,
        progress_date,
        progress_value,
        progress_note,
        recorded_by,
        is_positive,
        category,
        created_at,
        updated_at
      )
      values (
        ${crypto.randomUUID()},
        ${text(student.id)},
        ${text(student.academic_year_id)},
        ${text(student.term_id) || null},
        null,
        'academic',
        now(),
        null,
        ${`Student submitted ${assignmentTitle}${note ? `: ${note}` : ""}`},
        ${text(student.user_id)},
        true,
        'submission',
        now(),
        now()
      )
    `)
    return NextResponse.json({ success: true }, { status: 201, headers: { "Cache-Control": "no-store" } })
  }

  if (action === "advisor-message") {
    const message = text(body.message)
    const receiverId = text(body.receiverId, text(student.class_teacher_id))
    const studentUserId = text(student.user_id)
    if (!message) return NextResponse.json({ error: "Message is required" }, { status: 400 })
    if (!studentUserId || !receiverId) return NextResponse.json({ error: "Advisor is not assigned for this student." }, { status: 400 })

    const advisor = await first(tenantDb, sql`
      select id
      from users
      where id = ${receiverId}
        and is_active = true
      limit 1
    `, "advisor lookup")
    if (!advisor) return NextResponse.json({ error: "Advisor account is not active." }, { status: 404 })

    const conversationId = await findOrCreateDirectConversation(tenantDb, studentUserId, receiverId)
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

  if (["resource.save", "resource.unsave"].includes(action)) {
    const resourceId = text(body.resourceId)
    if (!resourceId) return NextResponse.json({ error: "Resource is required" }, { status: 400 })
    const state = await readDashboardState(tenantDb, studentId)
    if (action === "resource.save") state.savedResources = Array.from(new Set([resourceId, ...state.savedResources])).slice(0, 50)
    if (action === "resource.unsave") state.savedResources = state.savedResources.filter((id) => id !== resourceId)
    await writeDashboardState(tenantDb, studentId, state)
    return NextResponse.json({ success: true, state }, { headers: { "Cache-Control": "no-store" } })
  }

  return NextResponse.json({ error: "Unsupported dashboard action" }, { status: 400 })
}
