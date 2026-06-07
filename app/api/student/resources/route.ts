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

const LIBRARY_KEY = "admin_library"

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
    console.warn(`[student-resources] ${label} query skipped`, error instanceof Error ? error.message : error)
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

function normalizeAttachment(value: unknown) {
  const item = objectValue(value)
  const title = text(item.title, text(item.name, text(item.filename, "Attachment")))
  const url = text(item.url, text(item.href, text(item.path)))
  return { title, url, type: text(item.type, "Attachment"), size: text(item.size, "Course file") }
}

async function readResourceState(db: QueryableDb, studentId: string) {
  const row = await first(db, sql`select value from system_settings where key = ${`student_resources:${studentId}`} limit 1`, "resource state")
  const value = objectValue(row?.value)
  return {
    saved: arrayValue(value.saved).map(String),
    viewed: arrayValue(value.viewed).map(String),
    downloaded: arrayValue(value.downloaded).map(String),
    reservations: arrayValue(value.reservations).map(String),
  }
}

async function writeResourceState(db: QueryableDb, studentId: string, state: { saved: string[]; viewed: string[]; downloaded: string[]; reservations: string[] }) {
  await db.execute(sql`
    insert into system_settings (id, key, value, category, description, created_at, updated_at)
    values (${crypto.randomUUID()}, ${`student_resources:${studentId}`}, ${JSON.stringify(state)}::jsonb, 'students', ${`Student resource state ${studentId}`}, now(), now())
    on conflict (key) do update set value = excluded.value, updated_at = now()
  `)
}

async function buildPayload(request: NextRequest, currentUser: { id: string; name: string; email: string; role: string }) {
  const context = await findStudentContext(request, currentUser)
  if (!context) return { response: NextResponse.json({ error: "Student profile was not found for this account.", currentUser }, { status: 404 }) }

  const { tenantDb, school, student } = context
  const studentId = text(student.id)
  const classId = text(student.class_id)

  const [assessmentRows, subjectRows, progressRows, libraryRow] = await Promise.all([
    rows(tenantDb, sql`
      select
        a.id,
        a.name,
        a.description,
        a.subject_id,
        a.assessment_type,
        a.instructions,
        a.attachments,
        a.due_date,
        a.created_at,
        s.name as subject_name,
        s.code as subject_code,
        teacher.name as teacher_name
      from assessments a
      left join subjects s on s.id = a.subject_id
      left join users teacher on teacher.id = a.created_by
      where (${classId} = '' or a.class_id = ${classId})
        and (a.attachments is not null or coalesce(a.instructions, '') <> '' or coalesce(a.description, '') <> '')
      order by a.created_at desc
      limit 120
    `, "assessment resources"),
    rows(tenantDb, sql`
      select s.id, s.name, s.code, s.type
      from subjects s
      where exists (select 1 from assessments a where a.subject_id = s.id and a.class_id = ${classId})
      order by s.name asc
    `, "subjects"),
    rows(tenantDb, sql`
      select id, subject_id, progress_type, progress_value, progress_note, category, is_positive, created_at
      from student_progress
      where student_id = ${studentId}
        and lower(coalesce(category, '')) in ('resource', 'submission')
      order by created_at desc
      limit 30
    `, "resource progress"),
    first(tenantDb, sql`select value from system_settings where key = ${LIBRARY_KEY} limit 1`, "library"),
  ])

  const state = await readResourceState(tenantDb, studentId)
  const resources = assessmentRows.flatMap((row) => {
    const attachments = arrayValue(row.attachments).map(normalizeAttachment)
    const base = {
      sourceId: text(row.id),
      subjectId: text(row.subject_id),
      subject: text(row.subject_name, "General"),
      subjectCode: text(row.subject_code),
      teacher: text(row.teacher_name, "Teacher"),
      createdAt: iso(row.created_at),
      dueDate: iso(row.due_date),
      assessmentType: text(row.assessment_type),
    }
    const instruction = text(row.instructions, text(row.description))
    const instructionResource = instruction ? [{
      id: `instructions_${text(row.id)}`,
      title: `${text(row.name, "Assessment")} instructions`,
      description: instruction,
      kind: "instructions",
      url: "",
      size: "Read online",
      ...base,
    }] : []
    const attachmentResources = attachments.map((attachment, index) => ({
      id: `attachment_${text(row.id)}_${index}`,
      title: attachment.title,
      description: `${text(row.name, "Assessment")} resource`,
      kind: attachment.type,
      url: attachment.url,
      size: attachment.size,
      ...base,
    }))
    return [...instructionResource, ...attachmentResources]
  })

  const library = objectValue(libraryRow?.value)
  const books = arrayValue(library.books).map((item) => {
    const book = objectValue(item)
    const id = text(book.id, `book_${text(book.title)}`)
    return {
      id,
      title: text(book.title, "Library book"),
      author: text(book.author),
      category: text(book.category, "Library"),
      shelf: text(book.shelf),
      isbn: text(book.isbn),
      copies: numberValue(book.copies, 1),
      available: numberValue(book.available, numberValue(book.copies, 1)),
      status: text(book.status, "active"),
      notes: text(book.notes),
    }
  }).filter((book) => book.status !== "deleted")

  const enrichedResources = resources.map((resource) => ({
    ...resource,
    saved: state.saved.includes(resource.id),
    viewed: state.viewed.includes(resource.id),
    downloaded: state.downloaded.includes(resource.id),
  }))
  const enrichedBooks = books.map((book) => ({
    ...book,
    saved: state.saved.includes(book.id),
    reserved: state.reservations.includes(book.id),
  }))

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
      metrics: {
        resources: enrichedResources.length,
        books: enrichedBooks.length,
        saved: state.saved.length,
        viewed: state.viewed.length,
        downloaded: state.downloaded.length,
        availableBooks: enrichedBooks.filter((book) => book.available > 0).length,
      },
      subjects: subjectRows.map((row) => ({ id: text(row.id), name: text(row.name), code: text(row.code), type: text(row.type) })),
      resources: enrichedResources,
      books: enrichedBooks,
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
  const resourceId = text(body.resourceId)
  if (action === "teacher-message") {
    const message = text(body.message)
    const studentUserId = text(result.context.student.user_id)
    const teacherUserId = text(result.context.student.class_teacher_id)
    if (!message) return NextResponse.json({ error: "Message is required" }, { status: 400 })
    if (!studentUserId || !teacherUserId) {
      return NextResponse.json({ error: "Class teacher is not assigned for this student." }, { status: 400 })
    }

    const teacher = await first(result.context.tenantDb, sql`
      select id
      from users
      where id = ${teacherUserId}
        and is_active = true
      limit 1
    `, "teacher lookup")
    if (!teacher) return NextResponse.json({ error: "Class teacher account is not active." }, { status: 404 })

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

  if (!resourceId || !["save", "unsave", "view", "download", "reserve", "unreserve"].includes(action)) {
    return NextResponse.json({ error: "Unsupported resource action" }, { status: 400 })
  }

  const resourceExists = result.payload.resources.some((resource) => resource.id === resourceId)
  const book = result.payload.books.find((item) => item.id === resourceId)
  if (!resourceExists && !book) return NextResponse.json({ error: "Resource was not found" }, { status: 404 })
  if (action === "reserve" && (!book || book.available <= 0)) {
    return NextResponse.json({ error: "This book is not currently available for reservation" }, { status: 409 })
  }

  const state = result.state
  const add = (key: keyof typeof state) => {
    if (!state[key].includes(resourceId)) state[key] = [...state[key], resourceId]
  }
  const remove = (key: keyof typeof state) => {
    state[key] = state[key].filter((id) => id !== resourceId)
  }
  if (action === "save") add("saved")
  if (action === "unsave") remove("saved")
  if (action === "view") add("viewed")
  if (action === "download") add("downloaded")
  if (action === "reserve") add("reservations")
  if (action === "unreserve") remove("reservations")

  await writeResourceState(result.context.tenantDb, text(result.context.student.id), state)
  return NextResponse.json({ success: true, state }, { headers: { "Cache-Control": "no-store" } })
}
