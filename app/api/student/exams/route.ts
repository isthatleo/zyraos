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

function iso(value: unknown) {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(String(value))
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

function objectValue(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Row : {}
}

function arrayValue(value: unknown) {
  return Array.isArray(value) ? value as unknown[] : []
}

function letterGrade(score: number) {
  if (score >= 90) return "A"
  if (score >= 80) return "B+"
  if (score >= 70) return "B"
  if (score >= 60) return "C"
  if (score >= 50) return "D"
  return score > 0 ? "F" : "N/A"
}

function displayDate(value: unknown, fallback = "Not scheduled") {
  const date = iso(value)
  if (!date) return fallback
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(date))
}

function statusFromExam(status: string, examDate: unknown, hasResult: boolean) {
  const normalized = status.toLowerCase()
  if (hasResult || normalized === "completed") return "completed"
  if (normalized === "cancelled") return "cancelled"
  const scheduledAt = examDate ? new Date(String(examDate)).getTime() : 0
  if (normalized === "in-progress" || (scheduledAt && scheduledAt <= Date.now() && scheduledAt >= Date.now() - 4 * 60 * 60 * 1000)) {
    return "available"
  }
  if (scheduledAt && scheduledAt < Date.now()) return "pending-results"
  return "scheduled"
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
    console.warn(`[student-exams] ${label} query skipped`, error instanceof Error ? error.message : error)
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

function resultPayload(row: Row) {
  const percentage = numberValue(row.percentage)
  return {
    id: text(row.id),
    title: text(row.assessment_name, "Exam result"),
    type: text(row.assessment_type, "exam"),
    subjectId: text(row.subject_id),
    subject: text(row.subject_name, "General"),
    subjectCode: text(row.subject_code),
    teacherId: text(row.teacher_id),
    teacher: text(row.teacher_name, "Exam office"),
    score: numberValue(row.score),
    maxScore: numberValue(row.max_score, 100),
    percentage: Math.round(percentage * 10) / 10,
    grade: text(row.grade, letterGrade(percentage)),
    feedback: text(row.notes),
    date: iso(row.assessment_date),
    displayDate: displayDate(row.assessment_date, "Awaiting date"),
    excused: row.is_excused === true,
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

async function readExamState(db: QueryableDb, studentId: string) {
  const row = await first(db, sql`select value from system_settings where key = ${`student_exams:${studentId}`} limit 1`, "exam state")
  const value = objectValue(row?.value)
  return {
    reminders: arrayValue(value.reminders).map(String),
    pinned: arrayValue(value.pinned).map(String),
    reviewed: arrayValue(value.reviewed).map(String),
  }
}

async function writeExamState(db: QueryableDb, studentId: string, state: { reminders: string[]; pinned: string[]; reviewed: string[] }) {
  await db.execute(sql`
    insert into system_settings (id, key, value, category, description, created_at, updated_at)
    values (${crypto.randomUUID()}, ${`student_exams:${studentId}`}, ${JSON.stringify(state)}::jsonb, 'students', ${`Student exam state ${studentId}`}, now(), now())
    on conflict (key) do update set value = excluded.value, updated_at = now()
  `)
}

async function buildPayload(request: NextRequest, currentUser: { id: string; name: string; email: string; role: string }) {
  const context = await findStudentContext(request, currentUser)
  if (!context) {
    return {
      response: NextResponse.json(
      { error: "Student profile was not found for this account.", currentUser, generatedAt: new Date().toISOString() },
      { status: 404, headers: { "Cache-Control": "no-store" } }
      ),
    }
  }

  const { tenantDb, school, student } = context
  const studentId = text(student.id)
  const classId = text(student.class_id)
  const termId = text(student.term_id)
  const state = await readExamState(tenantDb, studentId)

  const [examRows, gradeRows, subjectRows, progressRows] = await Promise.all([
    rows(tenantDb, sql`
      select
        e.id,
        e.name,
        e.description,
        e.assessment_id,
        e.class_id,
        e.academic_year_id,
        e.term_id,
        e.exam_date,
        e.start_time,
        e.end_time,
        e.location,
        e.invigilator,
        e.total_marks,
        e.passing_marks,
        e.duration,
        e.exam_type,
        e.status,
        e.instructions,
        e.rules,
        asm.name as assessment_name,
        asm.subject_id,
        subj.name as subject_name,
        subj.code as subject_code
      from exams e
      left join assessments asm on asm.id = e.assessment_id
      left join subjects subj on subj.id = asm.subject_id
      where (${classId} = '' or e.class_id = ${classId})
        and (${termId} = '' or e.term_id is null or e.term_id = ${termId})
      order by e.exam_date asc nulls last, e.start_time asc nulls last, e.name asc
      limit 100
    `, "exams"),
    rows(tenantDb, sql`
      select
        g.id,
        g.subject_id,
        g.class_id,
        g.term_id,
        g.assessment_type,
        g.assessment_name,
        g.score,
        g.max_score,
        coalesce(g.percentage, (g.score / nullif(g.max_score, 0)) * 100) as percentage,
        g.grade,
        g.notes,
        g.assessment_date,
        g.teacher_id,
        g.is_excused,
        s.name as subject_name,
        s.code as subject_code,
        teacher.name as teacher_name
      from gradebook g
      left join subjects s on s.id = g.subject_id
      left join users teacher on teacher.id = g.teacher_id
      where g.student_id = ${studentId}
        and (
          lower(coalesce(g.assessment_type, '')) in ('exam', 'midterm', 'final', 'mock', 'practical', 'placement')
          or lower(coalesce(g.assessment_name, '')) like '%exam%'
          or lower(coalesce(g.assessment_name, '')) like '%midterm%'
          or lower(coalesce(g.assessment_name, '')) like '%final%'
        )
      order by g.assessment_date desc nulls last, g.created_at desc
      limit 150
    `, "exam results"),
    rows(tenantDb, sql`
      select
        s.id,
        s.name,
        s.code,
        s.type,
        count(g.id)::int as entries,
        avg(coalesce(g.percentage, (g.score / nullif(g.max_score, 0)) * 100))::numeric(8,2) as average,
        max(coalesce(g.percentage, (g.score / nullif(g.max_score, 0)) * 100))::numeric(8,2) as highest,
        min(coalesce(g.percentage, (g.score / nullif(g.max_score, 0)) * 100))::numeric(8,2) as lowest
      from subjects s
      join gradebook g on g.subject_id = s.id and g.student_id = ${studentId}
      where lower(coalesce(g.assessment_type, '')) in ('exam', 'midterm', 'final', 'mock', 'practical', 'placement')
        or lower(coalesce(g.assessment_name, '')) like '%exam%'
        or lower(coalesce(g.assessment_name, '')) like '%midterm%'
        or lower(coalesce(g.assessment_name, '')) like '%final%'
      group by s.id, s.name, s.code, s.type
      order by average desc nulls last, s.name asc
    `, "subject exam performance"),
    rows(tenantDb, sql`
      select id, progress_type, progress_value, progress_note, category, is_positive, created_at
      from student_progress
      where student_id = ${studentId}
        and (lower(coalesce(category, '')) like '%exam%' or lower(coalesce(progress_type, '')) like '%exam%')
      order by created_at desc
      limit 25
    `, "exam progress notes"),
  ])

  const results = gradeRows.map(resultPayload)
  const resultsByName = new Map(results.map((result) => [result.title.toLowerCase(), result]))
  const resultsBySubject = new Map<string, typeof results>()
  for (const result of results) {
    resultsBySubject.set(result.subjectId, [...(resultsBySubject.get(result.subjectId) || []), result])
  }

  const exams = examRows.map((row) => {
    const subjectId = text(row.subject_id)
    const matchedResult = resultsByName.get(text(row.name).toLowerCase()) || resultsByName.get(text(row.assessment_name).toLowerCase()) || null
    const status = statusFromExam(text(row.status, "scheduled"), row.exam_date, Boolean(matchedResult))
    return {
      id: text(row.id),
      title: text(row.name, "Exam"),
      description: text(row.description),
      assessmentId: text(row.assessment_id),
      assessmentName: text(row.assessment_name),
      subjectId,
      subject: text(row.subject_name, text(row.exam_type, "General")),
      subjectCode: text(row.subject_code),
      examDate: iso(row.exam_date),
      displayDate: displayDate(row.exam_date),
      startTime: text(row.start_time),
      endTime: text(row.end_time),
      location: text(row.location, "Exam center"),
      invigilator: text(row.invigilator, text(student.class_teacher, "Exam office")),
      invigilatorId: text(student.class_teacher_id),
      totalMarks: numberValue(row.total_marks, 100),
      passingMarks: numberValue(row.passing_marks, 50),
      duration: numberValue(row.duration),
      examType: text(row.exam_type, "exam"),
      status,
      rawStatus: text(row.status, "scheduled"),
      instructions: text(row.instructions),
      rules: objectValue(row.rules),
      result: matchedResult,
      subjectResults: subjectId ? (resultsBySubject.get(subjectId) || []).slice(0, 3) : [],
    }
  })

  const validScores = results.map((result) => result.percentage).filter((score) => score > 0)
  const averageScore = validScores.length ? Math.round((validScores.reduce((total, score) => total + score, 0) / validScores.length) * 10) / 10 : 0
  const upcoming = exams.filter((exam) => exam.status === "scheduled" || exam.status === "available")
  const completed = exams.filter((exam) => exam.status === "completed").length || results.length

  const subjectPerformance = subjectRows.map((row) => {
    const average = numberValue(row.average)
    return {
      id: text(row.id),
      name: text(row.name, "Subject"),
      code: text(row.code),
      type: text(row.type, "core"),
      entries: numberValue(row.entries),
      average: Math.round(average * 10) / 10,
      highest: Math.round(numberValue(row.highest) * 10) / 10,
      lowest: Math.round(numberValue(row.lowest) * 10) / 10,
      grade: letterGrade(average),
    }
  })

  const payload = {
    generatedAt: new Date().toISOString(),
    currentUser: {
      id: currentUser.id,
      name: text(student.name, currentUser.name),
      email: text(student.email, currentUser.email),
      role: currentUser.role,
    },
    school: {
      id: text(school.id),
      name: text(school.name, text(school.slug, "School")),
      slug: text(school.slug),
      type: text(school.type),
      country: text(school.country),
      currencyCode: text(school.currency_code),
    },
    student: {
      id: studentId,
      userId: text(student.user_id),
      admissionNumber: text(student.admission_number),
      status: text(student.status, "active"),
      classId,
      className: text(student.class_name, "Unassigned class"),
      classGrade: text(student.class_grade),
      classSection: text(student.class_section),
      classTeacher: text(student.class_teacher),
      classTeacherId: text(student.class_teacher_id),
      academicYear: text(student.academic_year_name),
      term: text(student.term_name),
    },
    metrics: {
      totalExams: exams.length,
      scheduled: exams.filter((exam) => exam.status === "scheduled").length,
      available: exams.filter((exam) => exam.status === "available").length,
      pendingResults: exams.filter((exam) => exam.status === "pending-results").length,
      completed,
      results: results.length,
      averageScore,
      highestScore: validScores.length ? Math.max(...validScores) : 0,
      lowestScore: validScores.length ? Math.min(...validScores) : 0,
      passingResults: results.filter((result) => result.percentage >= 50).length,
      reminders: state.reminders.length,
      pinned: state.pinned.length,
      reviewed: state.reviewed.length,
      nextExam: upcoming.toSorted((a, b) => new Date(a.examDate || 0).getTime() - new Date(b.examDate || 0).getTime())[0] || null,
      strongestSubject: subjectPerformance[0] || null,
      needsAttention: subjectPerformance.filter((subject) => subject.average > 0 && subject.average < 60).length,
    },
    reminderIds: state.reminders,
    pinnedIds: state.pinned,
    reviewedIds: state.reviewed,
    exams,
    results,
    subjectPerformance,
    progressNotes: progressRows.map((row) => ({
      id: text(row.id),
      type: text(row.progress_type),
      value: numberValue(row.progress_value),
      note: text(row.progress_note),
      category: text(row.category),
      positive: row.is_positive !== false,
      createdAt: iso(row.created_at),
    })),
  }

  return { payload, context, state }
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
  const examId = text(body.examId)
  const exam = result.payload.exams.find((item) => item.id === examId)

  if (action === "teacher-message") {
    const message = text(body.message)
    const receiverId = text(body.receiverId, text(result.context.student.class_teacher_id))
    const studentUserId = text(result.context.student.user_id)
    if (!message) return NextResponse.json({ error: "Message is required" }, { status: 400 })
    if (!studentUserId || !receiverId) return NextResponse.json({ error: "Teacher is not assigned for this student." }, { status: 400 })

    const teacher = await first(result.context.tenantDb, sql`
      select id
      from users
      where id = ${receiverId}
        and is_active = true
      limit 1
    `, "teacher lookup")
    if (!teacher) return NextResponse.json({ error: "Teacher account is not active." }, { status: 404 })

    const conversationId = await findOrCreateDirectConversation(result.context.tenantDb, studentUserId, receiverId)
    const messageId = `msg_${crypto.randomUUID()}`
    await result.context.tenantDb.execute(sql`
      insert into messages (id, conversation_id, sender_id, content, attachments, is_edited, created_at)
      values (${messageId}, ${conversationId}, ${studentUserId}, ${message}, '[]'::jsonb, false, now())
    `)
    await result.context.tenantDb.execute(sql`
      insert into message_read_status (id, message_id, user_id, read_at)
      values (${`read_${crypto.randomUUID()}`}, ${messageId}, ${studentUserId}, now())
      on conflict (message_id, user_id) do nothing
    `)
    await result.context.tenantDb.execute(sql`update conversations set updated_at = now() where id = ${conversationId}`)
    return NextResponse.json({ success: true, conversationId, messageId }, { status: 201, headers: { "Cache-Control": "no-store" } })
  }

  if (["reminder.add", "reminder.remove", "pin", "unpin", "reviewed"].includes(action)) {
    if (!exam) return NextResponse.json({ error: "Exam was not found for this student." }, { status: 404 })
    const state = result.state
    if (action === "reminder.add") state.reminders = Array.from(new Set([...state.reminders, examId]))
    if (action === "reminder.remove") state.reminders = state.reminders.filter((id) => id !== examId)
    if (action === "pin") state.pinned = Array.from(new Set([examId, ...state.pinned])).slice(0, 20)
    if (action === "unpin") state.pinned = state.pinned.filter((id) => id !== examId)
    if (action === "reviewed") state.reviewed = Array.from(new Set([...state.reviewed, examId]))
    await writeExamState(result.context.tenantDb, text(result.context.student.id), state)
    return NextResponse.json({ success: true, state }, { headers: { "Cache-Control": "no-store" } })
  }

  return NextResponse.json({ error: "Unsupported exam action" }, { status: 400 })
}
