import crypto from "node:crypto"

import { sql } from "drizzle-orm"
import { NextRequest, NextResponse } from "next/server"

import { auth } from "@/lib/auth"
import { getTenantDb, masterDb } from "@/lib/db"
import { normalizeRole } from "@/lib/roles"
import { getTenantSubdomain } from "@/lib/tenant-routing"

export const dynamic = "force-dynamic"
export const revalidate = 0

export type Db = ReturnType<typeof getTenantDb>
export type Row = Record<string, unknown>

const TIMETABLE_KEY = "admin_timetable"
const NOTE_KEY_PREFIX = "teacher_dashboard_notes:"
const TEACHER_ROLES = new Set(["teacher", "staff"])

export function text(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback
}

export function numberValue(value: unknown) {
  const next = Number(value ?? 0)
  return Number.isFinite(next) ? next : 0
}

export function iso(value: unknown) {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(String(value))
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

export function objectValue(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Row : {}
}

export function arrayValue(value: unknown) {
  return Array.isArray(value) ? value as Row[] : []
}

export async function rows(db: Db, query: ReturnType<typeof sql>, label: string) {
  try {
    const result = await db.execute(query)
    return (result.rows || []) as Row[]
  } catch (error) {
    console.warn(`Teacher dashboard ${label} query skipped:`, error instanceof Error ? error.message : error)
    return []
  }
}

export async function first(db: Db, query: ReturnType<typeof sql>, label: string) {
  const result = await rows(db, query, label)
  return result[0] || null
}

function resolveTenant(request: NextRequest) {
  return (
    request.nextUrl.searchParams.get("tenant")?.trim().toLowerCase() ||
    request.nextUrl.searchParams.get("slug")?.trim().toLowerCase() ||
    getTenantSubdomain(request.headers.get("host")) ||
    ""
  )
}

export async function resolveContext(request: NextRequest) {
  const tenant = resolveTenant(request)
  if (!tenant) return { response: NextResponse.json({ error: "Tenant slug is required" }, { status: 400 }) }

  const schoolRow = (await masterDb.execute(sql`
    select id, name, slug, type, database_url
    from schools
    where slug = ${tenant}
    limit 1
  `).catch(() => ({ rows: [] as Row[] }))).rows[0] as Row | undefined

  if (!schoolRow) return { response: NextResponse.json({ error: "School not found" }, { status: 404 }) }

  const session = await auth.api.getSession({ headers: request.headers }).catch(() => null)
  if (!session?.user?.id || !session.user.email) return { response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }

  const tenantDb = getTenantDb(text(schoolRow.database_url))
  const tenantUser = await first(tenantDb, sql`
    select u.id, u.email, u.name, u.image, u.role_id, u.is_active, r.name as role_name,
           st.id as staff_id, st.employee_id, st.position, st.qualifications, d.name as department_name
    from users u
    left join roles r on r.id = u.role_id
    left join staff st on st.user_id = u.id
    left join departments d on d.id = st.department_id
    where u.id = ${session.user.id} or lower(u.email) = lower(${session.user.email})
    limit 1
  `, "teacher user")

  if (!tenantUser) return { response: NextResponse.json({ error: "Account does not belong to this tenant" }, { status: 403 }) }
  if (tenantUser.is_active === false) return { response: NextResponse.json({ error: "This tenant account is inactive" }, { status: 403 }) }

  const role = normalizeRole(text(tenantUser.role_id) || text(tenantUser.role_name))
  if (!TEACHER_ROLES.has(role)) {
    return { response: NextResponse.json({ error: "Only teachers and lecturers can access this dashboard" }, { status: 403 }) }
  }

  return {
    tenant,
    tenantDb,
    school: {
      id: text(schoolRow.id),
      name: text(schoolRow.name),
      slug: text(schoolRow.slug),
      type: text(schoolRow.type),
    },
    teacher: {
      id: text(tenantUser.id, session.user.id),
      name: text(tenantUser.name, session.user.name || session.user.email),
      email: text(tenantUser.email, session.user.email),
      image: text(tenantUser.image) || null,
      role,
      roleId: text(tenantUser.role_id),
      staffId: text(tenantUser.staff_id),
      employeeId: text(tenantUser.employee_id),
      position: text(tenantUser.position, role === "teacher" ? "Teacher / Lecturer" : "Staff"),
      qualifications: text(tenantUser.qualifications),
      department: text(tenantUser.department_name),
    },
  }
}

export async function getTimetable(db: Db) {
  const row = await first(db, sql`select value from system_settings where key = ${TIMETABLE_KEY} limit 1`, "timetable")
  const value = objectValue(row?.value)
  return arrayValue(value.entries)
}

async function getTeacherNotes(db: Db, teacherId: string) {
  const row = await first(db, sql`select value from system_settings where key = ${NOTE_KEY_PREFIX + teacherId} limit 1`, "teacher notes")
  return arrayValue(objectValue(row?.value).notes).slice(0, 12)
}

export function classLabel(row: Row) {
  return [text(row.name), text(row.grade), text(row.section)].filter(Boolean).join(" - ") || "Class"
}

export async function assertAssignedClass(db: Db, teacherId: string, classId: string) {
  if (!classId) return null
  const timetableClassIds = (await getTimetable(db))
    .filter((entry) => text(entry.teacherId) === teacherId || text(entry.teacher_id) === teacherId)
    .map((entry) => text(entry.classId) || text(entry.class_id))
    .filter(Boolean)

  return first(db, sql`
    select c.id, c.academic_year_id
    from classes c
    where c.id = ${classId}
      and (
        c.teacher_id = ${teacherId}
        or c.id in (select distinct class_id from gradebook where teacher_id = ${teacherId})
        or c.id in (select distinct class_id from assessments where created_by = ${teacherId})
        ${timetableClassIds.length ? sql`or c.id in (${sql.join(timetableClassIds.map((id) => sql`${id}`), sql`, `)})` : sql``}
      )
    limit 1
  `, "assigned class guard")
}

export async function GET(request: NextRequest) {
  const context = await resolveContext(request)
  if ("response" in context) return context.response

  const teacherId = context.teacher.id
  const timetableEntries = await getTimetable(context.tenantDb)
  const teacherTimetable = timetableEntries.filter((entry) => text(entry.teacherId) === teacherId || text(entry.teacher_id) === teacherId)
  const timetableClassIds = teacherTimetable.map((entry) => text(entry.classId) || text(entry.class_id)).filter(Boolean)
  const timetableSubjectIds = teacherTimetable.map((entry) => text(entry.subjectId) || text(entry.subject_id)).filter(Boolean)

  const classRows = await rows(context.tenantDb, sql`
      select c.id, c.name, c.grade, c.section, c.teacher_id, c.capacity, c.academic_year_id, ay.name as academic_year,
             count(distinct s.id)::int as students
      from classes c
      left join academic_years ay on ay.id = c.academic_year_id
      left join students s on s.class_id = c.id and lower(coalesce(s.status, 'active')) = 'active'
      where c.teacher_id = ${teacherId}
         or c.id in (select distinct class_id from gradebook where teacher_id = ${teacherId})
         or c.id in (select distinct class_id from assessments where created_by = ${teacherId})
         ${timetableClassIds.length ? sql`or c.id in (${sql.join(timetableClassIds.map((id) => sql`${id}`), sql`, `)})` : sql``}
      group by c.id, ay.name
      order by c.grade asc nulls last, c.name asc, c.section asc
    `, "classes")

  const assignedClassIds = classRows.map((row) => text(row.id)).filter(Boolean)
  const classScope = assignedClassIds.length
    ? sql`in (${sql.join(assignedClassIds.map((id) => sql`${id}`), sql`, `)})`
    : sql`in (${sql`null`})`

  const [learnerRows, gradeRows, assessmentRows, attendanceRows, examRows, subjectRows, announcementRows, noteRows] = await Promise.all([
    rows(context.tenantDb, sql`
      select st.id, st.user_id, u.name, u.email, st.admission_number, st.class_id, c.name as class_name, c.grade, c.section,
             count(g.id)::int as grade_count,
             round(avg(g.percentage)::numeric, 1) as average_score,
             count(a.id)::int as attendance_count,
             count(a.id) filter (where lower(a.status) in ('present','late','excused'))::int as attended_count
      from students st
      left join users u on u.id = st.user_id
      left join classes c on c.id = st.class_id
      left join gradebook g on g.student_id = st.id and g.teacher_id = ${teacherId}
      left join attendance a on a.student_id = st.id and a.class_id = st.class_id
      where st.class_id ${classScope}
        and lower(coalesce(st.status, 'active')) = 'active'
      group by st.id, u.name, u.email, c.name, c.grade, c.section
      order by c.grade asc nulls last, c.name asc, u.name asc
      limit 250
    `, "assigned learners"),
    rows(context.tenantDb, sql`
      select g.id, g.student_id, u.name as student_name, g.class_id, c.name as class_name, c.grade, c.section,
             g.subject_id, s.name as subject_name, s.code as subject_code, g.assessment_type, g.assessment_name,
             g.score, g.max_score, g.percentage, g.grade as grade_value, g.assessment_date, g.created_at
      from gradebook g
      left join students st on st.id = g.student_id
      left join users u on u.id = st.user_id
      left join classes c on c.id = g.class_id
      left join subjects s on s.id = g.subject_id
      where g.teacher_id = ${teacherId}
        and g.class_id ${classScope}
      order by g.assessment_date desc
      limit 80
    `, "gradebook"),
    rows(context.tenantDb, sql`
      select a.id, a.name, a.description, a.class_id, c.name as class_name, c.grade, c.section,
             a.subject_id, s.name as subject_name, s.code as subject_code, a.assessment_type,
             a.total_score, a.passing_score, a.due_date, a.release_date, a.status, a.instructions,
             count(g.id)::int as graded_count,
             count(distinct st.id)::int as class_students
      from assessments a
      left join classes c on c.id = a.class_id
      left join subjects s on s.id = a.subject_id
      left join students st on st.class_id = a.class_id and lower(coalesce(st.status, 'active')) = 'active'
      left join gradebook g on g.assessment_name = a.name and g.class_id = a.class_id and g.subject_id = a.subject_id
      where a.created_by = ${teacherId}
        and a.class_id ${classScope}
      group by a.id, c.name, c.grade, c.section, s.name, s.code
      order by coalesce(a.due_date, a.created_at) desc
      limit 60
    `, "assessments"),
    rows(context.tenantDb, sql`
      select a.id, a.class_id, c.name as class_name, c.grade, c.section, a.attendance_date, a.status, a.remarks, u.name as student_name
      from attendance a
      left join classes c on c.id = a.class_id
      left join students st on st.id = a.student_id
      left join users u on u.id = st.user_id
      where a.class_id ${classScope}
      order by a.attendance_date desc
      limit 120
    `, "attendance"),
    rows(context.tenantDb, sql`
      select e.id, e.name, e.class_id, c.name as class_name, c.grade, c.section,
             e.exam_date, e.start_time, e.end_time, e.location, e.exam_type, e.status, e.total_marks
      from exams e
      left join classes c on c.id = e.class_id
      where e.class_id ${classScope}
      order by e.exam_date asc
      limit 40
    `, "exams"),
    rows(context.tenantDb, sql`
      select id, name, code, type, description
      from subjects
      where id in (select distinct subject_id from gradebook where teacher_id = ${teacherId})
         or id in (select distinct subject_id from assessments where created_by = ${teacherId} and class_id ${classScope})
         ${timetableSubjectIds.length ? sql`or id in (${sql.join(timetableSubjectIds.map((id) => sql`${id}`), sql`, `)})` : sql``}
      order by name asc
    `, "subjects"),
    rows(context.tenantDb, sql`
      select id, title, content, target_roles, publish_date, created_at
      from announcements
      where is_published = true
        and (target_roles is null or target_roles::text ilike '%teacher%' or target_roles::text ilike '%staff%' or target_roles::text ilike '%all%')
      order by coalesce(publish_date, created_at) desc
      limit 8
    `, "announcements"),
    getTeacherNotes(context.tenantDb, teacherId),
  ])

  const classes = classRows.map((row) => {
    const id = text(row.id)
    const grades = gradeRows.filter((grade) => text(grade.class_id) === id)
    const assessments = assessmentRows.filter((assessment) => text(assessment.class_id) === id)
    const attendance = attendanceRows.filter((record) => text(record.class_id) === id)
    const present = attendance.filter((record) => ["present", "late", "excused"].includes(text(record.status).toLowerCase())).length
    const scoreValues = grades.map((grade) => numberValue(grade.percentage)).filter((score) => score > 0)
    return {
      id,
      name: classLabel(row),
      grade: text(row.grade),
      section: text(row.section),
      academicYear: text(row.academic_year),
      students: numberValue(row.students),
      capacity: numberValue(row.capacity),
      timetableEntries: teacherTimetable.filter((entry) => text(entry.classId) === id || text(entry.class_id) === id).length,
      averageScore: scoreValues.length ? Math.round((scoreValues.reduce((sum, score) => sum + score, 0) / scoreValues.length) * 10) / 10 : 0,
      attendanceRate: attendance.length ? Math.round((present / attendance.length) * 1000) / 10 : 0,
      pendingAssessments: assessments.filter((assessment) => ["draft", "published"].includes(text(assessment.status).toLowerCase())).length,
    }
  })

  const assessments = assessmentRows.map((row) => {
    const classStudents = numberValue(row.class_students)
    const graded = numberValue(row.graded_count)
    return {
      id: text(row.id),
      name: text(row.name),
      description: text(row.description),
      classId: text(row.class_id),
      className: classLabel({ name: row.class_name, grade: row.grade, section: row.section }),
      subjectId: text(row.subject_id),
      subject: text(row.subject_name),
      subjectCode: text(row.subject_code),
      type: text(row.assessment_type),
      totalScore: numberValue(row.total_score),
      passingScore: numberValue(row.passing_score),
      dueDate: iso(row.due_date),
      releaseDate: iso(row.release_date),
      status: text(row.status, "draft"),
      graded,
      classStudents,
      gradingProgress: classStudents ? Math.round((graded / classStudents) * 1000) / 10 : 0,
      instructions: text(row.instructions),
    }
  })

  const grades = gradeRows.map((row) => ({
    id: text(row.id),
    studentId: text(row.student_id),
    studentName: text(row.student_name, "Student"),
    classId: text(row.class_id),
    className: classLabel({ name: row.class_name, grade: row.grade, section: row.section }),
    subjectId: text(row.subject_id),
    subject: text(row.subject_name),
    subjectCode: text(row.subject_code),
    type: text(row.assessment_type),
    assessment: text(row.assessment_name),
    score: numberValue(row.score),
    maxScore: numberValue(row.max_score),
    percentage: numberValue(row.percentage),
    grade: text(row.grade_value),
    date: iso(row.assessment_date),
  }))

  const timetable = teacherTimetable.map((entry) => {
    const classRow = classRows.find((row) => text(row.id) === (text(entry.classId) || text(entry.class_id)))
    const subjectRow = subjectRows.find((row) => text(row.id) === (text(entry.subjectId) || text(entry.subject_id)))
    return {
      id: text(entry.id, crypto.randomUUID()),
      day: text(entry.day, "Monday"),
      period: text(entry.period),
      startTime: text(entry.startTime) || text(entry.start_time),
      endTime: text(entry.endTime) || text(entry.end_time),
      classId: text(entry.classId) || text(entry.class_id),
      className: classRow ? classLabel(classRow) : "Class",
      subjectId: text(entry.subjectId) || text(entry.subject_id),
      subject: text(subjectRow?.name, "Lesson"),
      subjectCode: text(subjectRow?.code),
      room: text(entry.room),
      published: entry.published !== false,
    }
  })

  const attendance = attendanceRows.map((row) => ({
    id: text(row.id),
    classId: text(row.class_id),
    className: classLabel({ name: row.class_name, grade: row.grade, section: row.section }),
    studentName: text(row.student_name, "Student"),
    date: iso(row.attendance_date),
    status: text(row.status),
    remarks: text(row.remarks),
  }))

  const exams = examRows.map((row) => ({
    id: text(row.id),
    name: text(row.name),
    classId: text(row.class_id),
    className: classLabel({ name: row.class_name, grade: row.grade, section: row.section }),
    date: iso(row.exam_date),
    startTime: text(row.start_time),
    endTime: text(row.end_time),
    room: text(row.location),
    type: text(row.exam_type),
    status: text(row.status),
    totalMarks: numberValue(row.total_marks),
  }))

  const subjects = subjectRows.map((row) => ({
    id: text(row.id),
    name: text(row.name),
    code: text(row.code),
    type: text(row.type),
    description: text(row.description),
    classes: new Set([
      ...gradeRows.filter((grade) => text(grade.subject_id) === text(row.id)).map((grade) => text(grade.class_id)),
      ...assessmentRows.filter((assessment) => text(assessment.subject_id) === text(row.id)).map((assessment) => text(assessment.class_id)),
    ].filter(Boolean)).size,
  }))

  const scoreValues = grades.map((grade) => grade.percentage).filter((score) => score > 0)
  const presentRecords = attendance.filter((record) => ["present", "late", "excused"].includes(record.status.toLowerCase())).length
  const pendingGrading = assessments.reduce((sum, assessment) => sum + Math.max(0, assessment.classStudents - assessment.graded), 0)
  const today = new Date().toLocaleDateString("en", { weekday: "long" })
  const todaysLessons = timetable.filter((lesson) => lesson.day.toLowerCase() === today.toLowerCase())

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    school: context.school,
    currentUser: context.teacher,
    metrics: {
      classes: classes.length,
      students: learnerRows.length,
      subjects: subjects.length,
      assessments: assessments.length,
      pendingGrading,
      averageScore: scoreValues.length ? Math.round((scoreValues.reduce((sum, score) => sum + score, 0) / scoreValues.length) * 10) / 10 : 0,
      attendanceRate: attendance.length ? Math.round((presentRecords / attendance.length) * 1000) / 10 : 0,
      lessonsToday: todaysLessons.length,
      timetableEntries: timetable.length,
      upcomingExams: exams.filter((exam) => exam.date && new Date(exam.date).getTime() >= Date.now()).length,
    },
    classes,
    learners: learnerRows.map((row) => {
      const attended = numberValue(row.attended_count)
      const attendanceTotal = numberValue(row.attendance_count)
      return {
        id: text(row.id),
        name: text(row.name, "Learner"),
        email: text(row.email),
        admissionNumber: text(row.admission_number),
        classId: text(row.class_id),
        className: classLabel({ name: row.class_name, grade: row.grade, section: row.section }),
        gradebookEntries: numberValue(row.grade_count),
        averageScore: numberValue(row.average_score),
        attendanceRate: attendanceTotal ? Math.round((attended / attendanceTotal) * 1000) / 10 : 0,
      }
    }),
    subjects,
    assessments,
    grades,
    timetable,
    todaysLessons,
    attendance,
    exams,
    notes: noteRows,
    announcements: announcementRows.map((row) => ({ id: text(row.id), title: text(row.title), content: text(row.content), createdAt: iso(row.publish_date || row.created_at) })),
  }, { headers: { "Cache-Control": "no-store, max-age=0" } })
}

export async function POST(request: NextRequest) {
  const context = await resolveContext(request)
  if ("response" in context) return context.response

  const body = await request.json().catch(() => ({})) as Row
  const action = text(body.action)

  if (action === "assessment.create") {
    const classId = text(body.classId)
    const subjectId = text(body.subjectId)
    const name = text(body.name) || text(body.title)
    if (!classId || !subjectId || !name) return NextResponse.json({ error: "Class, subject, and title are required" }, { status: 400 })

    const classRow = await assertAssignedClass(context.tenantDb, context.teacher.id, classId)
    if (!classRow) return NextResponse.json({ error: "This class is not assigned to the current teacher" }, { status: 403 })

    const termRow = await first(context.tenantDb, sql`
      select id from terms
      where academic_year_id = ${text(classRow?.academic_year_id)}
      order by case when status = 'active' then 0 else 1 end, start_date desc
      limit 1
    `, "assessment term")

    await context.tenantDb.execute(sql`
      insert into assessments (id, name, description, subject_id, class_id, academic_year_id, term_id, assessment_type, total_score, passing_score, due_date, release_date, created_by, status, instructions, created_at, updated_at)
      values (${`assessment_${crypto.randomUUID()}`}, ${name}, ${text(body.description)}, ${subjectId}, ${classId}, ${text(classRow?.academic_year_id)}, ${text(termRow?.id)}, ${text(body.type, "assignment")}, ${String(numberValue(body.totalScore) || 100)}, ${String(numberValue(body.passingScore) || 50)}, ${text(body.dueDate) ? new Date(text(body.dueDate)) : null}, now(), ${context.teacher.id}, 'published', ${text(body.instructions)}, now(), now())
    `)

    return NextResponse.json({ ok: true, message: "Assessment created" })
  }

  if (action === "class-note") {
    const classId = text(body.classId)
    if (classId) {
      const classRow = await assertAssignedClass(context.tenantDb, context.teacher.id, classId)
      if (!classRow) return NextResponse.json({ error: "This class is not assigned to the current teacher" }, { status: 403 })
    }
    const note = {
      id: `note_${crypto.randomUUID()}`,
      classId,
      title: text(body.title, "Teacher note"),
      note: text(body.note),
      createdAt: new Date().toISOString(),
    }
    if (!note.note) return NextResponse.json({ error: "Note is required" }, { status: 400 })
    const key = NOTE_KEY_PREFIX + context.teacher.id
    const current = await getTeacherNotes(context.tenantDb, context.teacher.id)
    await context.tenantDb.execute(sql`
      insert into system_settings (id, key, value, category, description, created_at, updated_at)
      values (${crypto.randomUUID()}, ${key}, ${JSON.stringify({ notes: [note, ...current].slice(0, 25) })}::jsonb, 'academic', 'Teacher dashboard notes', now(), now())
      on conflict (key) do update set value = excluded.value, updated_at = now()
    `)
    return NextResponse.json({ ok: true, note })
  }

  return NextResponse.json({ error: "Unsupported teacher dashboard action" }, { status: 400 })
}
