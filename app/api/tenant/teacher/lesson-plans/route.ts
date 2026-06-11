import crypto from "node:crypto"

import { sql } from "drizzle-orm"
import { NextRequest, NextResponse } from "next/server"

import {
  arrayValue,
  assertAssignedClass,
  classLabel,
  first,
  getTimetable,
  iso,
  numberValue,
  resolveContext,
  rows,
  text,
  type Row,
} from "@/app/api/tenant/teacher/dashboard/route"

export const dynamic = "force-dynamic"
export const revalidate = 0

const LESSON_PLAN_KEY_PREFIX = "teacher_lesson_plans:"
const VALID_STATUSES = new Set(["draft", "ready", "in-progress", "completed", "archived"])

type LessonPlan = {
  id: string
  title: string
  classId: string
  subjectId: string
  week: string
  date: string | null
  period: string
  durationMinutes: number
  status: string
  objectives: string[]
  materials: string[]
  activities: string[]
  assessments: string[]
  differentiation: string
  homework: string
  standards: string
  notes: string
  reflection: string
  createdAt: string
  updatedAt: string
}

function lessonPlanKey(teacherId: string) {
  return LESSON_PLAN_KEY_PREFIX + teacherId
}

function parseJsonObject(value: unknown): Row {
  if (value && typeof value === "object" && !Array.isArray(value)) return value as Row
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value)
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Row : {}
    } catch {
      return {}
    }
  }
  return {}
}

function stringList(value: unknown) {
  if (Array.isArray(value)) return value.map((item) => text(item)).filter(Boolean)
  if (typeof value === "string") {
    return value
      .split(/\r?\n|,/)
      .map((item) => item.trim())
      .filter(Boolean)
  }
  return []
}

function normalizePlan(raw: Row): LessonPlan {
  const now = new Date().toISOString()
  return {
    id: text(raw.id, `plan_${crypto.randomUUID()}`),
    title: text(raw.title, "Untitled lesson plan"),
    classId: text(raw.classId),
    subjectId: text(raw.subjectId),
    week: text(raw.week),
    date: iso(raw.date),
    period: text(raw.period),
    durationMinutes: numberValue(raw.durationMinutes) || 40,
    status: VALID_STATUSES.has(text(raw.status).toLowerCase()) ? text(raw.status).toLowerCase() : "draft",
    objectives: stringList(raw.objectives),
    materials: stringList(raw.materials),
    activities: stringList(raw.activities),
    assessments: stringList(raw.assessments),
    differentiation: text(raw.differentiation),
    homework: text(raw.homework),
    standards: text(raw.standards),
    notes: text(raw.notes),
    reflection: text(raw.reflection),
    createdAt: iso(raw.createdAt) || now,
    updatedAt: iso(raw.updatedAt) || now,
  }
}

async function readPlans(teacherId: string, tenantDb: Parameters<typeof rows>[0]) {
  const row = await first(tenantDb, sql`select value from system_settings where key = ${lessonPlanKey(teacherId)} limit 1`, "lesson plans")
  return arrayValue(parseJsonObject(row?.value).plans)
    .map(normalizePlan)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
}

async function writePlans(teacherId: string, tenantDb: Parameters<typeof rows>[0], plans: LessonPlan[]) {
  await tenantDb.execute(sql`
    insert into system_settings (id, key, value, category, description, created_at, updated_at)
    values (
      ${crypto.randomUUID()},
      ${lessonPlanKey(teacherId)},
      ${JSON.stringify({ plans })}::jsonb,
      'academic',
      'Teacher lesson plan workspace',
      now(),
      now()
    )
    on conflict (key) do update set value = excluded.value, updated_at = now()
  `)
}

async function getTeacherScope(context: Awaited<ReturnType<typeof resolveContext>> & { response?: never }) {
  const teacherId = context.teacher.id
  const timetableEntries = await getTimetable(context.tenantDb)
  const teacherTimetable = timetableEntries.filter((entry) => text(entry.teacherId) === teacherId || text(entry.teacher_id) === teacherId)
  const timetableClassIds = teacherTimetable.map((entry) => text(entry.classId) || text(entry.class_id)).filter(Boolean)
  const timetableSubjectIds = teacherTimetable.map((entry) => text(entry.subjectId) || text(entry.subject_id)).filter(Boolean)

  const classRows = await rows(context.tenantDb, sql`
    select c.id, c.name, c.grade, c.section, c.teacher_id, c.capacity, c.academic_year_id, ay.name as academic_year,
           count(distinct st.id)::int as students
    from classes c
    left join academic_years ay on ay.id = c.academic_year_id
    left join students st on st.class_id = c.id and lower(coalesce(st.status, 'active')) = 'active'
    where c.teacher_id = ${teacherId}
       or c.id in (select distinct class_id from gradebook where teacher_id = ${teacherId})
       or c.id in (select distinct class_id from assessments where created_by = ${teacherId})
       ${timetableClassIds.length ? sql`or c.id in (${sql.join(timetableClassIds.map((id) => sql`${id}`), sql`, `)})` : sql``}
    group by c.id, ay.name
    order by c.grade asc nulls last, c.name asc, c.section asc
  `, "lesson-plan classes")

  const assignedClassIds = classRows.map((row) => text(row.id)).filter(Boolean)
  const classScope = assignedClassIds.length
    ? sql`in (${sql.join(assignedClassIds.map((id) => sql`${id}`), sql`, `)})`
    : sql`in (${sql`null`})`

  const [subjectRows, assessmentRows] = await Promise.all([
    rows(context.tenantDb, sql`
      select id, name, code, type, description
      from subjects
      where id in (select distinct subject_id from gradebook where teacher_id = ${teacherId})
         or id in (select distinct subject_id from assessments where created_by = ${teacherId} and class_id ${classScope})
         ${timetableSubjectIds.length ? sql`or id in (${sql.join(timetableSubjectIds.map((id) => sql`${id}`), sql`, `)})` : sql``}
      order by name asc
    `, "lesson-plan subjects"),
    rows(context.tenantDb, sql`
      select a.id, a.name, a.class_id, c.name as class_name, c.grade, c.section,
             a.subject_id, s.name as subject_name, s.code as subject_code, a.assessment_type,
             a.due_date, a.status, a.instructions
      from assessments a
      left join classes c on c.id = a.class_id
      left join subjects s on s.id = a.subject_id
      where a.created_by = ${teacherId}
        and a.class_id ${classScope}
      order by coalesce(a.due_date, a.created_at) desc
      limit 80
    `, "lesson-plan assessments"),
  ])

  const classes = classRows.map((row) => ({
    id: text(row.id),
    name: classLabel(row),
    grade: text(row.grade),
    section: text(row.section),
    academicYear: text(row.academic_year),
    students: numberValue(row.students),
  }))

  const subjects = subjectRows.map((row) => ({
    id: text(row.id),
    name: text(row.name),
    code: text(row.code),
    type: text(row.type),
    description: text(row.description),
  }))

  const timetable = teacherTimetable.map((entry) => {
    const classId = text(entry.classId) || text(entry.class_id)
    const subjectId = text(entry.subjectId) || text(entry.subject_id)
    const classRow = classRows.find((row) => text(row.id) === classId)
    const subjectRow = subjectRows.find((row) => text(row.id) === subjectId)
    return {
      id: text(entry.id, crypto.randomUUID()),
      day: text(entry.day, "Monday"),
      period: text(entry.period),
      startTime: text(entry.startTime) || text(entry.start_time),
      endTime: text(entry.endTime) || text(entry.end_time),
      classId,
      className: classRow ? classLabel(classRow) : "Class",
      subjectId,
      subject: text(subjectRow?.name, "Lesson"),
      room: text(entry.room),
      published: entry.published !== false,
    }
  })

  const assessments = assessmentRows.map((row) => ({
    id: text(row.id),
    name: text(row.name),
    classId: text(row.class_id),
    className: classLabel({ name: row.class_name, grade: row.grade, section: row.section }),
    subjectId: text(row.subject_id),
    subject: text(row.subject_name),
    subjectCode: text(row.subject_code),
    type: text(row.assessment_type),
    dueDate: iso(row.due_date),
    status: text(row.status, "draft"),
    instructions: text(row.instructions),
  }))

  return { classes, subjects, timetable, assessments }
}

function enrichPlans(plans: LessonPlan[], scope: Awaited<ReturnType<typeof getTeacherScope>>) {
  return plans.map((plan) => {
    const classRow = scope.classes.find((item) => item.id === plan.classId)
    const subjectRow = scope.subjects.find((item) => item.id === plan.subjectId)
    const relatedAssessments = scope.assessments.filter((item) => item.classId === plan.classId && item.subjectId === plan.subjectId)
    const readinessChecks = [
      Boolean(plan.title),
      plan.objectives.length > 0,
      plan.activities.length > 0,
      plan.assessments.length > 0 || relatedAssessments.length > 0,
      plan.materials.length > 0,
      Boolean(plan.date),
    ]
    const readiness = Math.round((readinessChecks.filter(Boolean).length / readinessChecks.length) * 100)
    return {
      ...plan,
      className: classRow?.name || "Unassigned class",
      subject: subjectRow?.name || "Unassigned subject",
      subjectCode: subjectRow?.code || "",
      relatedAssessments,
      readiness,
      needsAttention: readiness < 70 || plan.status === "draft",
    }
  })
}

function nextWeekValue(date = new Date()) {
  const start = new Date(date)
  start.setDate(start.getDate() - start.getDay() + 1)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  const format = (value: Date) => value.toISOString().slice(0, 10)
  return `${format(start)} to ${format(end)}`
}

export async function GET(request: NextRequest) {
  const context = await resolveContext(request)
  if ("response" in context) return context.response

  const [scope, plans] = await Promise.all([
    getTeacherScope(context),
    readPlans(context.teacher.id, context.tenantDb),
  ])
  const enrichedPlans = enrichPlans(plans, scope)
  const plannedKeys = new Set(plans.map((plan) => `${plan.classId}:${plan.subjectId}:${plan.period}:${plan.week}`))
  const suggestions = scope.timetable
    .filter((lesson) => !plannedKeys.has(`${lesson.classId}:${lesson.subjectId}:${lesson.period}:${nextWeekValue()}`))
    .slice(0, 12)
    .map((lesson) => ({
      ...lesson,
      title: `${lesson.subject} - ${lesson.className}`,
      week: nextWeekValue(),
    }))

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    school: context.school,
    currentUser: context.teacher,
    classes: scope.classes,
    subjects: scope.subjects,
    timetable: scope.timetable,
    assessments: scope.assessments,
    plans: enrichedPlans,
    suggestions,
    metrics: {
      total: plans.length,
      ready: plans.filter((plan) => plan.status === "ready").length,
      inProgress: plans.filter((plan) => plan.status === "in-progress").length,
      completed: plans.filter((plan) => plan.status === "completed").length,
      drafts: plans.filter((plan) => plan.status === "draft").length,
      archived: plans.filter((plan) => plan.status === "archived").length,
      averageReadiness: enrichedPlans.length
        ? Math.round(enrichedPlans.reduce((sum, plan) => sum + plan.readiness, 0) / enrichedPlans.length)
        : 0,
      timetableCoverage: scope.timetable.length
        ? Math.round((new Set(plans.map((plan) => `${plan.classId}:${plan.subjectId}`)).size / new Set(scope.timetable.map((lesson) => `${lesson.classId}:${lesson.subjectId}`)).size) * 100)
        : 0,
    },
  }, { headers: { "Cache-Control": "no-store, max-age=0" } })
}

export async function POST(request: NextRequest) {
  const context = await resolveContext(request)
  if ("response" in context) return context.response

  const body = await request.json().catch(() => ({})) as Row
  const action = text(body.action)
  const plans = await readPlans(context.teacher.id, context.tenantDb)
  const now = new Date().toISOString()

  if (action === "plan.create" || action === "plan.update") {
    const incoming = parseJsonObject(body.plan)
    const classId = text(incoming.classId)
    const subjectId = text(incoming.subjectId)
    const title = text(incoming.title)
    if (!classId || !subjectId || !title) {
      return NextResponse.json({ error: "Title, class, and subject are required" }, { status: 400 })
    }
    const classRow = await assertAssignedClass(context.tenantDb, context.teacher.id, classId)
    if (!classRow) return NextResponse.json({ error: "This class is not assigned to the current teacher" }, { status: 403 })

    const normalized = normalizePlan({
      ...incoming,
      id: action === "plan.update" ? text(incoming.id) : `plan_${crypto.randomUUID()}`,
      createdAt: action === "plan.update" ? plans.find((plan) => plan.id === text(incoming.id))?.createdAt || now : now,
      updatedAt: now,
    })
    const next = action === "plan.update"
      ? plans.map((plan) => plan.id === normalized.id ? normalized : plan)
      : [normalized, ...plans]
    if (action === "plan.update" && !plans.some((plan) => plan.id === normalized.id)) {
      return NextResponse.json({ error: "Lesson plan not found" }, { status: 404 })
    }
    await writePlans(context.teacher.id, context.tenantDb, next)
    return NextResponse.json({ ok: true, plan: normalized })
  }

  if (action === "plan.status") {
    const id = text(body.id)
    const status = text(body.status).toLowerCase()
    if (!VALID_STATUSES.has(status)) return NextResponse.json({ error: "Unsupported lesson plan status" }, { status: 400 })
    let updated: LessonPlan | null = null
    const next = plans.map((plan) => {
      if (plan.id !== id) return plan
      updated = { ...plan, status, updatedAt: now }
      return updated
    })
    if (!updated) return NextResponse.json({ error: "Lesson plan not found" }, { status: 404 })
    await writePlans(context.teacher.id, context.tenantDb, next)
    return NextResponse.json({ ok: true, plan: updated })
  }

  if (action === "plan.duplicate") {
    const source = plans.find((plan) => plan.id === text(body.id))
    if (!source) return NextResponse.json({ error: "Lesson plan not found" }, { status: 404 })
    const copy = { ...source, id: `plan_${crypto.randomUUID()}`, title: `${source.title} copy`, status: "draft", createdAt: now, updatedAt: now }
    await writePlans(context.teacher.id, context.tenantDb, [copy, ...plans])
    return NextResponse.json({ ok: true, plan: copy })
  }

  if (action === "plan.delete") {
    const id = text(body.id)
    const next = plans.filter((plan) => plan.id !== id)
    if (next.length === plans.length) return NextResponse.json({ error: "Lesson plan not found" }, { status: 404 })
    await writePlans(context.teacher.id, context.tenantDb, next)
    return NextResponse.json({ ok: true })
  }

  if (action === "plan.archive-completed") {
    const next = plans.map((plan) => plan.status === "completed" ? { ...plan, status: "archived", updatedAt: now } : plan)
    await writePlans(context.teacher.id, context.tenantDb, next)
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: "Unsupported lesson plan action" }, { status: 400 })
}
