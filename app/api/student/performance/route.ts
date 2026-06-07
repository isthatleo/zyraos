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
    console.warn(`[student-performance] ${label} query skipped`, error instanceof Error ? error.message : error)
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

type PerformanceGoal = {
  id: string
  title: string
  target: number
  dueDate: string | null
  status: string
  createdAt: string
}

async function readPerformanceState(db: QueryableDb, studentId: string) {
  const row = await first(db, sql`select value from system_settings where key = ${`student_performance:${studentId}`} limit 1`, "performance state")
  const value = objectValue(row?.value)
  return {
    watchedSubjects: arrayValue(value.watchedSubjects).map(String),
    goals: arrayValue(value.goals).map((item) => {
      const goal = objectValue(item)
      return {
        id: text(goal.id, `goal_${crypto.randomUUID()}`),
        title: text(goal.title, "Performance goal"),
        target: numberValue(goal.target, 80),
        dueDate: iso(goal.dueDate),
        status: text(goal.status, "active"),
        createdAt: iso(goal.createdAt) || new Date().toISOString(),
      } satisfies PerformanceGoal
    }),
  }
}

async function writePerformanceState(db: QueryableDb, studentId: string, state: { watchedSubjects: string[]; goals: PerformanceGoal[] }) {
  await db.execute(sql`
    insert into system_settings (id, key, value, category, description, created_at, updated_at)
    values (${crypto.randomUUID()}, ${`student_performance:${studentId}`}, ${JSON.stringify(state)}::jsonb, 'students', ${`Student performance state ${studentId}`}, now(), now())
    on conflict (key) do update set value = excluded.value, updated_at = now()
  `)
}

async function buildPayload(request: NextRequest, currentUser: { id: string; name: string; email: string; role: string }) {
  const context = await findStudentContext(request, currentUser)
  if (!context) {
    return { response: NextResponse.json({ error: "Student profile was not found for this account.", currentUser }, { status: 404 }) }
  }

  const { tenantDb, school, student } = context
  const studentId = text(student.id)
  const classId = text(student.class_id)
  const state = await readPerformanceState(tenantDb, studentId)

  const [gradeRows, subjectRows, attendanceRows, attendanceSummary, assessmentSummary, progressRows] = await Promise.all([
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
        s.name as subject_name,
        s.code as subject_code,
        teacher.name as teacher_name
      from gradebook g
      left join subjects s on s.id = g.subject_id
      left join users teacher on teacher.id = g.teacher_id
      where g.student_id = ${studentId}
      order by g.assessment_date desc nulls last, g.created_at desc
      limit 240
    `, "grades"),
    rows(tenantDb, sql`
      select
        s.id,
        s.name,
        s.code,
        s.type,
        count(g.id)::int as grade_count,
        avg(coalesce(g.percentage, (g.score / nullif(g.max_score, 0)) * 100))::numeric(8,2) as average,
        max(coalesce(g.percentage, (g.score / nullif(g.max_score, 0)) * 100))::numeric(8,2) as highest,
        min(coalesce(g.percentage, (g.score / nullif(g.max_score, 0)) * 100))::numeric(8,2) as lowest,
        count(a.id)::int as assessment_count,
        count(a.id) filter (where a.due_date >= now() and lower(coalesce(a.status, '')) <> 'closed')::int as upcoming_assessments
      from subjects s
      left join gradebook g on g.subject_id = s.id and g.student_id = ${studentId}
      left join assessments a on a.subject_id = s.id and a.class_id = ${classId}
      where exists (select 1 from gradebook g2 where g2.subject_id = s.id and g2.student_id = ${studentId})
        or exists (select 1 from assessments a2 where a2.subject_id = s.id and a2.class_id = ${classId})
      group by s.id, s.name, s.code, s.type
      order by average desc nulls last, s.name asc
    `, "subjects"),
    rows(tenantDb, sql`
      select attendance_date, status, remarks
      from attendance
      where student_id = ${studentId}
      order by attendance_date desc
      limit 120
    `, "attendance"),
    first(tenantDb, sql`
      select
        count(*)::int as total,
        count(*) filter (where lower(status) in ('present', 'late', 'excused'))::int as present,
        count(*) filter (where lower(status) = 'late')::int as late,
        count(*) filter (where lower(status) = 'absent')::int as absent
      from attendance
      where student_id = ${studentId}
        and attendance_date >= now() - interval '180 days'
    `, "attendance summary"),
    first(tenantDb, sql`
      select
        count(*)::int as total,
        count(*) filter (where due_date >= now() and lower(coalesce(status, '')) <> 'closed')::int as upcoming,
        count(*) filter (where due_date < now() and lower(coalesce(status, '')) <> 'closed')::int as overdue
      from assessments
      where class_id = ${classId}
    `, "assessment summary"),
    rows(tenantDb, sql`
      select sp.id, sp.progress_type, sp.progress_value, sp.progress_note, sp.category, sp.is_positive, sp.created_at, u.name as recorded_by_name
      from student_progress sp
      left join users u on u.id = sp.recorded_by
      where sp.student_id = ${studentId}
      order by sp.created_at desc
      limit 40
    `, "progress notes"),
  ])

  const validScores = gradeRows.map((row) => numberValue(row.percentage)).filter((score) => score > 0)
  const averageScore = validScores.length ? Math.round((validScores.reduce((sum, score) => sum + score, 0) / validScores.length) * 10) / 10 : 0
  const attendanceTotal = numberValue(attendanceSummary?.total)
  const attendanceRate = attendanceTotal ? Math.round((numberValue(attendanceSummary?.present) / attendanceTotal) * 1000) / 10 : 0

  const trendMap = gradeRows.reduce((map, row) => {
    const date = row.assessment_date ? new Date(String(row.assessment_date)) : new Date()
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
    const existing = map.get(key) || { label: new Intl.DateTimeFormat("en", { month: "short" }).format(date), scores: [] as number[] }
    existing.scores.push(numberValue(row.percentage))
    map.set(key, existing)
    return map
  }, new Map<string, { label: string; scores: number[] }>())

  const performanceTrend = Array.from(trendMap)
    .toSorted(([a], [b]) => a.localeCompare(b))
    .slice(-8)
    .map(([key, value]) => ({
      key,
      label: value.label,
      score: value.scores.length ? Math.round((value.scores.reduce((sum, score) => sum + score, 0) / value.scores.length) * 10) / 10 : 0,
    }))

  const attendanceTrend = attendanceRows
    .slice()
    .reverse()
    .reduce((items, row) => {
      const date = iso(row.attendance_date)
      if (!date) return items
      const status = text(row.status).toLowerCase()
      items.push({
        date,
        label: new Intl.DateTimeFormat("en", { month: "short", day: "2-digit" }).format(new Date(date)),
        present: ["present", "late", "excused"].includes(status) ? 100 : 0,
        status,
      })
      return items
    }, [] as Array<{ date: string; label: string; present: number; status: string }>)
    .slice(-20)

  const subjects = subjectRows.map((row) => {
    const average = numberValue(row.average)
    const gradeCount = numberValue(row.grade_count)
    return {
      id: text(row.id),
      name: text(row.name, "Subject"),
      code: text(row.code),
      type: text(row.type, "core"),
      gradeCount,
      assessmentCount: numberValue(row.assessment_count),
      upcomingAssessments: numberValue(row.upcoming_assessments),
      average: Math.round(average * 10) / 10,
      highest: Math.round(numberValue(row.highest) * 10) / 10,
      lowest: Math.round(numberValue(row.lowest) * 10) / 10,
      grade: letterGrade(average),
      risk: average > 0 && average < 60 ? "high" : average > 0 && average < 70 ? "medium" : "low",
    }
  })

  const strongestSubjects = subjects.filter((subject) => subject.average > 0).toSorted((a, b) => b.average - a.average).slice(0, 3)
  const attentionSubjects = subjects.filter((subject) => subject.average > 0 && subject.average < 70).toSorted((a, b) => a.average - b.average).slice(0, 5)
  const recentGrades = gradeRows.slice(0, 12).map((row) => ({
    id: text(row.id),
    title: text(row.assessment_name, "Assessment"),
    type: text(row.assessment_type),
    subject: text(row.subject_name, "General"),
    subjectCode: text(row.subject_code),
    teacher: text(row.teacher_name, "Teacher"),
    percentage: Math.round(numberValue(row.percentage) * 10) / 10,
    grade: text(row.grade, letterGrade(numberValue(row.percentage))),
    feedback: text(row.notes),
    date: iso(row.assessment_date),
  }))

  const recommendations = [
    attendanceRate && attendanceRate < 90 ? "Improve attendance consistency to protect academic progress." : "",
    attentionSubjects[0] ? `Prioritize ${attentionSubjects[0].name}; it is the lowest current subject average.` : "",
    numberValue(assessmentSummary?.overdue) > 0 ? "Clear overdue assessments before starting new optional work." : "",
    averageScore >= 80 ? "Maintain the current revision cadence and focus on exam readiness." : "",
  ].filter(Boolean)

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
    },
    student: {
      id: studentId,
      userId: text(student.user_id),
      admissionNumber: text(student.admission_number),
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
      averageScore,
      highestScore: validScores.length ? Math.max(...validScores) : 0,
      lowestScore: validScores.length ? Math.min(...validScores) : 0,
      gradeCount: gradeRows.length,
      subjectCount: subjects.length,
      attendanceRate,
      absentDays: numberValue(attendanceSummary?.absent),
      lateDays: numberValue(attendanceSummary?.late),
      upcomingAssessments: numberValue(assessmentSummary?.upcoming),
      overdueAssessments: numberValue(assessmentSummary?.overdue),
      riskSubjects: attentionSubjects.length,
      activeGoals: state.goals.filter((goal) => goal.status === "active").length,
      completedGoals: state.goals.filter((goal) => goal.status === "completed").length,
      strongestSubject: strongestSubjects[0] || null,
    },
    subjects,
    strongestSubjects,
    attentionSubjects,
    recentGrades,
    performanceTrend: performanceTrend.length ? performanceTrend : [{ key: "current", label: "Current", score: averageScore }],
    attendanceTrend,
    recommendations,
      goals: state.goals,
      watchedSubjectIds: state.watchedSubjects,
      progressNotes: progressRows.map((row) => ({
      id: text(row.id),
      type: text(row.progress_type),
      value: numberValue(row.progress_value),
      note: text(row.progress_note),
      category: text(row.category),
      positive: row.is_positive !== false,
      createdAt: iso(row.created_at),
      recordedBy: text(row.recorded_by_name),
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
  const message = text(body.message)
  const { tenantDb, student } = result.context

  if (action === "teacher-message") {
    if (!message) return NextResponse.json({ error: "Message is required" }, { status: 400 })
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

  const state = result.state
  if (action === "watch.subject" || action === "unwatch.subject") {
    const subjectId = text(body.subjectId)
    if (!result.payload.subjects.some((subject) => subject.id === subjectId)) return NextResponse.json({ error: "Subject was not found" }, { status: 404 })
    state.watchedSubjects = action === "watch.subject"
      ? Array.from(new Set([...state.watchedSubjects, subjectId]))
      : state.watchedSubjects.filter((id) => id !== subjectId)
  } else if (action === "goal.add") {
    const title = text(body.title)
    if (!title) return NextResponse.json({ error: "Goal title is required" }, { status: 400 })
    state.goals = [
      {
        id: `goal_${crypto.randomUUID()}`,
        title,
        target: Math.min(100, Math.max(1, numberValue(body.target, 80))),
        dueDate: iso(body.dueDate),
        status: "active",
        createdAt: new Date().toISOString(),
      },
      ...state.goals,
    ].slice(0, 20)
  } else if (action === "goal.complete" || action === "goal.remove") {
    const goalId = text(body.goalId)
    if (!goalId) return NextResponse.json({ error: "Goal id is required" }, { status: 400 })
    state.goals = action === "goal.remove"
      ? state.goals.filter((goal) => goal.id !== goalId)
      : state.goals.map((goal) => goal.id === goalId ? { ...goal, status: "completed" } : goal)
  } else {
    return NextResponse.json({ error: "Unsupported performance action" }, { status: 400 })
  }

  await writePerformanceState(tenantDb, text(student.id), state)
  return NextResponse.json({ success: true, state }, { headers: { "Cache-Control": "no-store" } })
}
