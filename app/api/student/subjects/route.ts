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

function letterGrade(score: number) {
  if (score >= 90) return "A"
  if (score >= 80) return "B+"
  if (score >= 70) return "B"
  if (score >= 60) return "C"
  if (score >= 50) return "D"
  return score > 0 ? "F" : "N/A"
}

function statusFromDue(dueDate: unknown, hasGrade: boolean, rawStatus: string) {
  if (hasGrade) return "graded"
  if (rawStatus.toLowerCase() === "submitted") return "submitted"
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
    console.warn(`[student-subjects] ${label} query skipped`, error instanceof Error ? error.message : error)
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

async function readSubjectState(db: QueryableDb, studentId: string) {
  const row = await first(db, sql`select value from system_settings where key = ${`student_subjects:${studentId}`} limit 1`, "subject state")
  const value = objectValue(row?.value)
  return {
    saved: arrayValue(value.saved).map(String),
  }
}

async function writeSubjectState(db: QueryableDb, studentId: string, state: { saved: string[] }) {
  await db.execute(sql`
    insert into system_settings (id, key, value, category, description, created_at, updated_at)
    values (${crypto.randomUUID()}, ${`student_subjects:${studentId}`}, ${JSON.stringify(state)}::jsonb, 'students', ${`Student subject state ${studentId}`}, now(), now())
    on conflict (key) do update set value = excluded.value, updated_at = now()
  `)
}

async function findStudentSubject(db: QueryableDb, studentId: string, classId: string, subjectId: string) {
  if (!subjectId) return null
  return first(db, sql`
    select s.id
    from subjects s
    where s.id = ${subjectId}
      and (
        exists (select 1 from gradebook g where g.subject_id = s.id and g.student_id = ${studentId})
        or exists (select 1 from assessments a where a.subject_id = s.id and a.class_id = ${classId})
      )
    limit 1
  `, "student subject lookup")
}

export async function GET(request: NextRequest) {
  const currentUser = await getRequiredDashboardUser(request.headers)
  if (isNextResponse(currentUser)) return currentUser

  const context = await findStudentContext(request, currentUser)
  if (!context) {
    return NextResponse.json({ error: "Student profile was not found for this account.", currentUser }, { status: 404 })
  }

  const { tenantDb, school, student } = context
  const studentId = text(student.id)
  const classId = text(student.class_id)
  const state = await readSubjectState(tenantDb, studentId)

  const [subjectRows, gradeRows, assessmentRows, progressRows] = await Promise.all([
    rows(tenantDb, sql`
      select
        s.id,
        s.name,
        s.code,
        s.description,
        s.type,
        teacher.id as teacher_id,
        teacher.name as teacher_name,
        count(g.id)::int as grade_count,
        avg(coalesce(g.percentage, (g.score / nullif(g.max_score, 0)) * 100))::numeric(8,2) as average,
        max(g.assessment_date) as last_assessment_at,
        count(a.id)::int as assessment_count,
        count(a.id) filter (where a.due_date >= now() and lower(a.status) <> 'closed')::int as upcoming_assessments
      from subjects s
      left join gradebook g on g.subject_id = s.id and g.student_id = ${studentId}
      left join assessments a on a.subject_id = s.id and a.class_id = ${classId}
      left join users teacher on teacher.id = coalesce(g.teacher_id, a.created_by)
      where exists (select 1 from gradebook g2 where g2.subject_id = s.id and g2.student_id = ${studentId})
        or exists (select 1 from assessments a2 where a2.subject_id = s.id and a2.class_id = ${classId})
      group by s.id, s.name, s.code, s.description, s.type, teacher.id, teacher.name
      order by s.name asc
    `, "subjects"),
    rows(tenantDb, sql`
      select
        g.id,
        g.subject_id,
        g.assessment_type,
        g.assessment_name,
        g.score,
        g.max_score,
        coalesce(g.percentage, (g.score / nullif(g.max_score, 0)) * 100) as percentage,
        g.grade,
        g.notes,
        g.assessment_date,
        teacher.name as teacher_name
      from gradebook g
      left join users teacher on teacher.id = g.teacher_id
      where g.student_id = ${studentId}
      order by g.assessment_date desc
      limit 150
    `, "grades"),
    rows(tenantDb, sql`
      select
        a.id,
        a.subject_id,
        a.name,
        a.description,
        a.assessment_type,
        a.total_score,
        a.due_date,
        a.status,
        a.instructions,
        a.attachments,
        g.id as grade_id,
        g.score,
        g.percentage
      from assessments a
      left join gradebook g on g.student_id = ${studentId} and g.subject_id = a.subject_id and g.assessment_name = a.name
      where a.class_id = ${classId}
      order by a.due_date asc nulls last, a.created_at desc
      limit 100
    `, "assessments"),
    rows(tenantDb, sql`
      select id, subject_id, progress_type, progress_value, progress_note, category, is_positive, created_at
      from student_progress
      where student_id = ${studentId}
      order by created_at desc
      limit 50
    `, "progress"),
  ])

  const gradesBySubject = new Map<string, Row[]>()
  for (const grade of gradeRows) {
    const subjectId = text(grade.subject_id)
    gradesBySubject.set(subjectId, [...(gradesBySubject.get(subjectId) || []), grade])
  }

  const assessmentsBySubject = new Map<string, Row[]>()
  for (const assessment of assessmentRows) {
    const subjectId = text(assessment.subject_id)
    assessmentsBySubject.set(subjectId, [...(assessmentsBySubject.get(subjectId) || []), assessment])
  }

  const progressBySubject = new Map<string, Row[]>()
  for (const note of progressRows) {
    const subjectId = text(note.subject_id, "overall")
    progressBySubject.set(subjectId, [...(progressBySubject.get(subjectId) || []), note])
  }

  const subjects = subjectRows.map((row) => {
    const subjectId = text(row.id)
    const grades = gradesBySubject.get(subjectId) || []
    const assessments = assessmentsBySubject.get(subjectId) || []
    const average = numberValue(row.average)
    const lastGrade = grades[0]
    const pendingAssessments = assessments.filter((assessment) => statusFromDue(assessment.due_date, Boolean(assessment.grade_id), text(assessment.status)) !== "graded")
    return {
      id: subjectId,
      name: text(row.name, "Subject"),
      code: text(row.code, "SUBJ"),
      description: text(row.description),
      type: text(row.type, "core"),
      teacherId: text(row.teacher_id, text(student.class_teacher_id)),
      teacher: text(row.teacher_name, text(student.class_teacher, "Assigned teacher")),
      progress: Math.round((average || 0) * 10) / 10,
      grade: text(lastGrade?.grade, letterGrade(average)),
      lastAssessmentAt: iso(row.last_assessment_at),
      gradeCount: numberValue(row.grade_count),
      assessmentCount: numberValue(row.assessment_count),
      pendingAssessments: pendingAssessments.length,
      upcomingAssessments: numberValue(row.upcoming_assessments),
      recentGrades: grades.slice(0, 6).map((grade) => ({
        id: text(grade.id),
        title: text(grade.assessment_name, "Assessment"),
        type: text(grade.assessment_type),
        score: numberValue(grade.score),
        maxScore: numberValue(grade.max_score),
        percentage: numberValue(grade.percentage),
        grade: text(grade.grade, letterGrade(numberValue(grade.percentage))),
        notes: text(grade.notes),
        date: iso(grade.assessment_date),
      })),
      assessments: assessments.slice(0, 8).map((assessment) => ({
        id: text(assessment.id),
        title: text(assessment.name, "Assessment"),
        description: text(assessment.description),
        type: text(assessment.assessment_type),
        dueDate: iso(assessment.due_date),
        totalScore: numberValue(assessment.total_score),
        status: statusFromDue(assessment.due_date, Boolean(assessment.grade_id), text(assessment.status)),
        instructions: text(assessment.instructions),
        hasResources: Boolean(assessment.attachments || text(assessment.instructions)),
      })),
      progressNotes: (progressBySubject.get(subjectId) || progressBySubject.get("overall") || []).slice(0, 4).map((note) => ({
        id: text(note.id),
        type: text(note.progress_type),
        value: numberValue(note.progress_value),
        note: text(note.progress_note),
        category: text(note.category),
        positive: note.is_positive !== false,
        createdAt: iso(note.created_at),
      })),
    }
  })

  const totalProgress = subjects.length
    ? Math.round((subjects.reduce((total, subject) => total + subject.progress, 0) / subjects.length) * 10) / 10
    : 0
  const totalPending = subjects.reduce((total, subject) => total + subject.pendingAssessments, 0)

  return NextResponse.json({
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
      currencyCode: text(school.currency_code),
    },
    student: {
      id: studentId,
      admissionNumber: text(student.admission_number),
      className: text(student.class_name, "Unassigned class"),
      classGrade: text(student.class_grade),
      classSection: text(student.class_section),
      classTeacher: text(student.class_teacher),
      term: text(student.term_name),
      academicYear: text(student.academic_year_name),
    },
    metrics: {
      totalSubjects: subjects.length,
      averageProgress: totalProgress,
      totalAssessments: subjects.reduce((total, subject) => total + subject.assessmentCount, 0),
      pendingAssessments: totalPending,
      savedSubjects: state.saved.length,
      strongestSubject: subjects.toSorted((a, b) => b.progress - a.progress)[0] || null,
      needsAttention: subjects.filter((subject) => subject.progress > 0 && subject.progress < 60).length,
    },
    savedSubjectIds: state.saved,
    subjects,
  }, { headers: { "Cache-Control": "no-store" } })
}

export async function POST(request: NextRequest) {
  const currentUser = await getRequiredDashboardUser(request.headers)
  if (isNextResponse(currentUser)) return currentUser

  const context = await findStudentContext(request, currentUser)
  if (!context) {
    return NextResponse.json({ error: "Student profile was not found for this account.", currentUser }, { status: 404 })
  }

  const body = await request.json().catch(() => ({}))
  const action = text(body.action)
  const { tenantDb, student } = context
  const studentId = text(student.id)
  const classId = text(student.class_id)

  if (action === "teacher-message") {
    const message = text(body.message)
    const receiverId = text(body.receiverId, text(student.class_teacher_id))
    const studentUserId = text(student.user_id)
    if (!message) return NextResponse.json({ error: "Message is required" }, { status: 400 })
    if (!studentUserId || !receiverId) return NextResponse.json({ error: "Teacher is not assigned for this subject." }, { status: 400 })

    const teacher = await first(tenantDb, sql`
      select id
      from users
      where id = ${receiverId}
        and is_active = true
      limit 1
    `, "teacher lookup")
    if (!teacher) return NextResponse.json({ error: "Teacher account is not active." }, { status: 404 })

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

  if (["subject.save", "subject.unsave"].includes(action)) {
    const subjectId = text(body.subjectId)
    const subject = await findStudentSubject(tenantDb, studentId, classId, subjectId)
    if (!subject) return NextResponse.json({ error: "Subject was not found for this student." }, { status: 404 })

    const state = await readSubjectState(tenantDb, studentId)
    if (action === "subject.save") state.saved = Array.from(new Set([subjectId, ...state.saved])).slice(0, 30)
    if (action === "subject.unsave") state.saved = state.saved.filter((id) => id !== subjectId)
    await writeSubjectState(tenantDb, studentId, state)
    return NextResponse.json({ success: true, state }, { headers: { "Cache-Control": "no-store" } })
  }

  return NextResponse.json({ error: "Unsupported subject action" }, { status: 400 })
}
