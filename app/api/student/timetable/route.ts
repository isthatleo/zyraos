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

function arrayValue(value: unknown) {
  return Array.isArray(value) ? value as Row[] : []
}

function boolValue(value: unknown, fallback = true) {
  if (typeof value === "boolean") return value
  if (typeof value === "string") return !["false", "0", "no"].includes(value.toLowerCase())
  return fallback
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
    console.warn(`[student-timetable] ${label} query skipped`, error instanceof Error ? error.message : error)
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

async function readScheduleState(db: QueryableDb, studentId: string) {
  const row = await first(db, sql`select value from system_settings where key = ${`student_timetable:${studentId}`} limit 1`, "schedule state")
  const value = objectValue(row?.value)
  return {
    reminders: arrayValue(value.reminders).map(String),
    viewed: arrayValue(value.viewed).map(String),
    checkins: arrayValue(value.checkins).map(String),
  }
}

async function writeScheduleState(db: QueryableDb, studentId: string, state: { reminders: string[]; viewed: string[]; checkins: string[] }) {
  await db.execute(sql`
    insert into system_settings (id, key, value, category, description, created_at, updated_at)
    values (${crypto.randomUUID()}, ${`student_timetable:${studentId}`}, ${JSON.stringify(state)}::jsonb, 'students', ${`Student timetable state ${studentId}`}, now(), now())
    on conflict (key) do update set value = excluded.value, updated_at = now()
  `)
}

async function buildPayload(request: NextRequest, currentUser: { id: string; name: string; email: string; role: string }) {
  const context = await findStudentContext(request, currentUser)
  if (!context) return { response: NextResponse.json({ error: "Student profile was not found for this account.", currentUser }, { status: 404 }) }

  const { tenantDb, school, student } = context
  const studentId = text(student.id)
  const classId = text(student.class_id)

  const [timetableRow, subjectRows, teacherRows, examRows, assessmentRows, attendanceRows] = await Promise.all([
    first(tenantDb, sql`select value from system_settings where key = ${TIMETABLE_KEY} limit 1`, "timetable"),
    rows(tenantDb, sql`select id, name, code, type from subjects order by name asc`, "subjects"),
    rows(tenantDb, sql`select id, name, email from users order by name asc limit 500`, "teachers"),
    rows(tenantDb, sql`
      select id, name, exam_date, start_time, end_time, location, status, exam_type, instructions
      from exams
      where (${classId} = '' or class_id = ${classId})
        and exam_date >= now() - interval '7 days'
      order by exam_date asc nulls last, start_time asc nulls last
      limit 50
    `, "exams"),
    rows(tenantDb, sql`
      select a.id, a.name, a.assessment_type, a.due_date, a.total_score, a.status, a.instructions, s.name as subject_name, s.code as subject_code
      from assessments a
      left join subjects s on s.id = a.subject_id
      where (${classId} = '' or a.class_id = ${classId})
        and a.due_date >= now() - interval '3 days'
      order by a.due_date asc nulls last
      limit 80
    `, "assessments"),
    rows(tenantDb, sql`
      select attendance_date, status, remarks
      from attendance
      where student_id = ${studentId}
      order by attendance_date desc
      limit 30
    `, "attendance"),
  ])

  const state = await readScheduleState(tenantDb, studentId)
  const subjects = new Map(subjectRows.map((row) => [text(row.id), row]))
  const teachers = new Map(teacherRows.map((row) => [text(row.id), row]))
  const timetable = objectValue(timetableRow?.value)
  const settings = objectValue(timetable.settings)
  const rawEntries = arrayValue(timetable.entries)
  const entries = rawEntries
    .filter((item) => text(item.classId) === classId && boolValue(item.published, true))
    .map((item) => {
      const subject = subjects.get(text(item.subjectId))
      const teacher = teachers.get(text(item.teacherId))
      const id = text(item.id, `${text(item.day)}_${text(item.period)}_${text(item.subjectId)}`)
      return {
        id,
        day: text(item.day, "Monday"),
        period: text(item.period, "1"),
        startTime: text(item.startTime),
        endTime: text(item.endTime),
        classId: text(item.classId),
        subjectId: text(item.subjectId),
        subject: text(subject?.name, "Subject"),
        subjectCode: text(subject?.code),
        teacherId: text(item.teacherId),
        teacher: text(teacher?.name, text(student.class_teacher, "Teacher")),
        room: text(item.room, "Classroom"),
        reminder: state.reminders.includes(id),
        viewed: state.viewed.includes(id),
        checkedIn: state.checkins.includes(id),
      }
    })

  const events = [
    ...examRows.map((row) => ({
      id: `exam_${text(row.id)}`,
      type: "exam",
      title: text(row.name, "Exam"),
      date: iso(row.exam_date),
      startTime: text(row.start_time),
      endTime: text(row.end_time),
      location: text(row.location, "Exam center"),
      status: text(row.status, "scheduled"),
      description: text(row.instructions, text(row.exam_type, "Exam")),
      reminder: state.reminders.includes(`exam_${text(row.id)}`),
    })),
    ...assessmentRows.map((row) => ({
      id: `assessment_${text(row.id)}`,
      type: "assessment",
      title: text(row.name, "Assessment"),
      date: iso(row.due_date),
      startTime: "",
      endTime: "",
      location: text(row.subject_name, "Subject"),
      status: text(row.status, "published"),
      description: `${text(row.assessment_type, "Assessment")} - ${numberValue(row.total_score, 100)} marks`,
      reminder: state.reminders.includes(`assessment_${text(row.id)}`),
    })),
  ].toSorted((a, b) => new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime())

  return {
    payload: {
      generatedAt: new Date().toISOString(),
      currentUser: { id: currentUser.id, name: text(student.name, currentUser.name), email: text(student.email, currentUser.email), role: currentUser.role },
      school: { id: text(school.id), name: text(school.name, text(school.slug, "School")), slug: text(school.slug), type: text(school.type) },
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
      settings: {
        periodsPerDay: numberValue(settings.periodsPerDay, 8),
        schoolStart: text(settings.schoolStart, "08:00"),
        schoolEnd: text(settings.schoolEnd, "16:00"),
        breaks: arrayValue(settings.breaks).map((item) => ({
          name: text(item.name, "Break"),
          day: text(item.day, "All days"),
          startTime: text(item.startTime),
          endTime: text(item.endTime),
        })),
      },
      metrics: {
        lessons: entries.length,
        subjects: new Set(entries.map((entry) => entry.subjectId).filter(Boolean)).size,
        reminders: state.reminders.length,
        checkins: state.checkins.length,
        upcomingEvents: events.length,
      },
      entries,
      events,
      attendance: attendanceRows.map((row) => ({ date: iso(row.attendance_date), status: text(row.status), remarks: text(row.remarks) })),
    },
    context,
    state,
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
  const itemId = text(body.itemId)
  if (action === "teacher-message") {
    const message = text(body.message)
    const studentUserId = text(result.context.student.user_id)
    const teacherUserId = text(body.receiverId, text(result.context.student.class_teacher_id))
    if (!message) return NextResponse.json({ error: "Message is required" }, { status: 400 })
    if (!studentUserId || !teacherUserId) {
      return NextResponse.json({ error: "Teacher is not assigned for this schedule item." }, { status: 400 })
    }

    const teacher = await first(result.context.tenantDb, sql`
      select id
      from users
      where id = ${teacherUserId}
        and is_active = true
      limit 1
    `, "teacher lookup")
    if (!teacher) return NextResponse.json({ error: "Teacher account is not active." }, { status: 404 })

    const conversationId = await findOrCreateDirectConversation(result.context.tenantDb, studentUserId, teacherUserId)
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

  if (!itemId || !["reminder.add", "reminder.remove", "view", "checkin"].includes(action)) {
    return NextResponse.json({ error: "Unsupported schedule action" }, { status: 400 })
  }

  const state = result.state
  if (action === "reminder.add" && !state.reminders.includes(itemId)) state.reminders = [...state.reminders, itemId]
  if (action === "reminder.remove") state.reminders = state.reminders.filter((id) => id !== itemId)
  if (action === "view" && !state.viewed.includes(itemId)) state.viewed = [...state.viewed, itemId]
  if (action === "checkin" && !state.checkins.includes(itemId)) {
    state.checkins = [...state.checkins, itemId]
    const { tenantDb, student } = result.context
    await tenantDb.execute(sql`
      insert into student_progress (id, student_id, academic_year_id, term_id, subject_id, progress_type, progress_date, progress_value, progress_note, recorded_by, is_positive, category, created_at, updated_at)
      values (${crypto.randomUUID()}, ${text(student.id)}, ${text(student.academic_year_id) || null}, ${text(student.term_id) || null}, null, 'schedule', now(), null, ${`Student checked in for schedule item ${itemId}`}, ${text(student.user_id)}, true, 'schedule', now(), now())
    `)
  }

  await writeScheduleState(result.context.tenantDb, text(result.context.student.id), state)
  return NextResponse.json({ success: true, state }, { headers: { "Cache-Control": "no-store" } })
}
