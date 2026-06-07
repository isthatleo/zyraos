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

function statusFromDue(dueDate: unknown, hasGrade: boolean, hasSubmission: boolean, rawStatus: string) {
  if (hasGrade) return "graded"
  if (hasSubmission) return "submitted"
  const status = rawStatus.toLowerCase()
  if (["closed", "archived"].includes(status)) return "closed"
  if (dueDate && new Date(String(dueDate)).getTime() < Date.now()) return "late"
  return "pending"
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
    console.warn(`[student-assessments] ${label} query skipped`, error instanceof Error ? error.message : error)
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

async function readAssessmentState(db: QueryableDb, studentId: string) {
  const row = await first(db, sql`select value from system_settings where key = ${`student_assessments:${studentId}`} limit 1`, "assessment state")
  const value = objectValue(row?.value)
  return {
    reminders: arrayValue(value.reminders).map(String),
    pinned: arrayValue(value.pinned).map(String),
    reviewed: arrayValue(value.reviewed).map(String),
  }
}

async function writeAssessmentState(db: QueryableDb, studentId: string, state: { reminders: string[]; pinned: string[]; reviewed: string[] }) {
  await db.execute(sql`
    insert into system_settings (id, key, value, category, description, created_at, updated_at)
    values (${crypto.randomUUID()}, ${`student_assessments:${studentId}`}, ${JSON.stringify(state)}::jsonb, 'students', ${`Student assessment state ${studentId}`}, now(), now())
    on conflict (key) do update set value = excluded.value, updated_at = now()
  `)
}

async function buildPayload(request: NextRequest, currentUser: { id: string; name: string; email: string; role: string }) {
  const context = await findStudentContext(request, currentUser)
  if (!context) return { response: NextResponse.json({ error: "Student profile was not found for this account.", currentUser }, { status: 404 }) }

  const { tenantDb, school, student } = context
  const studentId = text(student.id)
  const classId = text(student.class_id)
  const state = await readAssessmentState(tenantDb, studentId)

  const [assessmentRows, gradeRows, submissionRows, subjectRows, progressRows] = await Promise.all([
    rows(tenantDb, sql`
      select
        a.id,
        a.name,
        a.description,
        a.subject_id,
        a.class_id,
        a.assessment_type,
        a.total_score,
        a.due_date,
        a.release_date,
        a.status,
        a.instructions,
        a.attachments,
        a.created_by,
        a.created_at,
        s.name as subject_name,
        s.code as subject_code,
        teacher.name as teacher_name
      from assessments a
      left join subjects s on s.id = a.subject_id
      left join users teacher on teacher.id = a.created_by
      where (${classId} = '' or a.class_id = ${classId})
      order by a.due_date asc nulls last, a.created_at desc
      limit 150
    `, "assessments"),
    rows(tenantDb, sql`
      select
        g.id,
        g.subject_id,
        g.assessment_name,
        g.assessment_type,
        g.score,
        g.max_score,
        coalesce(g.percentage, (g.score / nullif(g.max_score, 0)) * 100) as percentage,
        g.grade,
        g.notes,
        g.assessment_date,
        g.teacher_id
      from gradebook g
      where g.student_id = ${studentId}
      order by g.assessment_date desc nulls last
      limit 200
    `, "grades"),
    rows(tenantDb, sql`
      select id, subject_id, progress_note, category, created_at
      from student_progress
      where student_id = ${studentId}
        and lower(coalesce(category, '')) = 'submission'
      order by created_at desc
      limit 100
    `, "submissions"),
    rows(tenantDb, sql`
      select
        s.id,
        s.name,
        s.code,
        count(a.id)::int as assessment_count,
        count(a.id) filter (where a.due_date >= now() and lower(coalesce(a.status, '')) <> 'closed')::int as upcoming_count,
        avg(coalesce(g.percentage, (g.score / nullif(g.max_score, 0)) * 100))::numeric(8,2) as average
      from subjects s
      left join assessments a on a.subject_id = s.id and a.class_id = ${classId}
      left join gradebook g on g.subject_id = s.id and g.student_id = ${studentId}
      where exists (select 1 from assessments a2 where a2.subject_id = s.id and a2.class_id = ${classId})
        or exists (select 1 from gradebook g2 where g2.subject_id = s.id and g2.student_id = ${studentId})
      group by s.id, s.name, s.code
      order by s.name asc
    `, "subject summary"),
    rows(tenantDb, sql`
      select id, progress_type, progress_value, progress_note, category, is_positive, created_at
      from student_progress
      where student_id = ${studentId}
        and (lower(coalesce(category, '')) in ('submission', 'assessment') or lower(coalesce(progress_type, '')) like '%assessment%')
      order by created_at desc
      limit 25
    `, "assessment progress"),
  ])

  const gradeByAssessment = new Map<string, Row>()
  for (const grade of gradeRows) {
    gradeByAssessment.set(`${text(grade.subject_id)}:${text(grade.assessment_name).toLowerCase()}`, grade)
  }

  const submittedNotes = submissionRows
    .map((row) => text(row.progress_note).toLowerCase())
    .filter(Boolean)

  const assessments = assessmentRows.map((row) => {
    const grade = gradeByAssessment.get(`${text(row.subject_id)}:${text(row.name).toLowerCase()}`) || null
    const submitted = submittedNotes.some((note) => note.includes(`student submitted ${text(row.name).toLowerCase()}`))
    const percentage = numberValue(grade?.percentage)
    return {
      id: text(row.id),
      title: text(row.name, "Assessment"),
      description: text(row.description),
      subjectId: text(row.subject_id),
      subject: text(row.subject_name, "General"),
      subjectCode: text(row.subject_code),
      type: text(row.assessment_type, "assessment"),
      totalScore: numberValue(row.total_score, 100),
      dueDate: iso(row.due_date),
      releaseDate: iso(row.release_date),
      createdAt: iso(row.created_at),
      status: statusFromDue(row.due_date, Boolean(grade), submitted, text(row.status)),
      rawStatus: text(row.status),
      instructions: text(row.instructions),
      attachments: row.attachments,
      teacherId: text(row.created_by, text(student.class_teacher_id)),
      teacher: text(row.teacher_name, text(student.class_teacher, "Assigned teacher")),
      grade: grade ? {
        id: text(grade.id),
        score: numberValue(grade.score),
        maxScore: numberValue(grade.max_score, numberValue(row.total_score, 100)),
        percentage: Math.round(percentage * 10) / 10,
        letter: text(grade.grade, letterGrade(percentage)),
        feedback: text(grade.notes),
        date: iso(grade.assessment_date),
      } : null,
    }
  })

  const validScores = assessments.map((assessment) => assessment.grade?.percentage || 0).filter((score) => score > 0)
  const averageScore = validScores.length ? Math.round((validScores.reduce((total, score) => total + score, 0) / validScores.length) * 10) / 10 : 0

  return {
    payload: {
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
        totalAssessments: assessments.length,
        pending: assessments.filter((item) => item.status === "pending").length,
        submitted: assessments.filter((item) => item.status === "submitted").length,
        late: assessments.filter((item) => item.status === "late").length,
        graded: assessments.filter((item) => item.status === "graded").length,
        closed: assessments.filter((item) => item.status === "closed").length,
        averageScore,
        highestScore: validScores.length ? Math.max(...validScores) : 0,
        nextDue: assessments.filter((item) => ["pending", "late"].includes(item.status)).toSorted((a, b) => new Date(a.dueDate || 0).getTime() - new Date(b.dueDate || 0).getTime())[0] || null,
        reminders: state.reminders.length,
        pinned: state.pinned.length,
        reviewed: state.reviewed.length,
      },
      reminderIds: state.reminders,
      pinnedIds: state.pinned,
      reviewedIds: state.reviewed,
      assessments,
      subjects: subjectRows.map((row) => ({
        id: text(row.id),
        name: text(row.name, "Subject"),
        code: text(row.code),
        assessmentCount: numberValue(row.assessment_count),
        upcomingCount: numberValue(row.upcoming_count),
        average: Math.round(numberValue(row.average) * 10) / 10,
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
    },
    context,
    state,
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
  const assessmentId = text(body.assessmentId)
  const note = text(body.note)
  const assessment = result.payload.assessments.find((item) => item.id === assessmentId)

  if (action === "teacher-message") {
    const message = text(body.message)
    const receiverId = text(body.receiverId, text(result.context.student.class_teacher_id))
    const studentUserId = text(result.context.student.user_id)
    if (!message) return NextResponse.json({ error: "Message is required" }, { status: 400 })
    if (!studentUserId || !receiverId) return NextResponse.json({ error: "Teacher is not assigned for this assessment." }, { status: 400 })

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
    if (!assessment) return NextResponse.json({ error: "Assessment was not found for this student." }, { status: 404 })
    const state = result.state
    if (action === "reminder.add") state.reminders = Array.from(new Set([...state.reminders, assessmentId]))
    if (action === "reminder.remove") state.reminders = state.reminders.filter((id) => id !== assessmentId)
    if (action === "pin") state.pinned = Array.from(new Set([assessmentId, ...state.pinned])).slice(0, 20)
    if (action === "unpin") state.pinned = state.pinned.filter((id) => id !== assessmentId)
    if (action === "reviewed") state.reviewed = Array.from(new Set([...state.reviewed, assessmentId]))
    await writeAssessmentState(result.context.tenantDb, text(result.context.student.id), state)
    return NextResponse.json({ success: true, state }, { headers: { "Cache-Control": "no-store" } })
  }

  if (action !== "assessment-submission") {
    return NextResponse.json({ error: "Unsupported assessment action" }, { status: 400 })
  }
  if (!assessment) {
    return NextResponse.json({ error: "Assessment was not found for this student." }, { status: 404 })
  }
  if (assessment.status === "graded") {
    return NextResponse.json({ error: "This assessment has already been graded." }, { status: 400 })
  }
  if (assessment.status === "closed") {
    return NextResponse.json({ error: "This assessment is closed." }, { status: 400 })
  }

  const { tenantDb, student } = result.context
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
      ${assessment.subjectId || null},
      'academic',
      now(),
      null,
      ${`Student submitted ${assessment.title}${note ? `: ${note}` : ""}`},
      ${text(student.user_id)},
      true,
      'submission',
      now(),
      now()
    )
  `)

  return NextResponse.json({ success: true }, { status: 201, headers: { "Cache-Control": "no-store" } })
}
