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
    console.warn(`[teacher-resources] ${label} query skipped`, error instanceof Error ? error.message : error)
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

async function findTeacherContext(request: NextRequest, user: { id: string; email: string }) {
  const schools = await loadSchools(tenantSlugFromRequest(request))
  for (const school of schools) {
    const databaseUrl = text(school.database_url)
    if (!databaseUrl) continue
    const tenantDb = getTenantDb(databaseUrl)
    const teacher = await first(tenantDb, sql`
      select
        u.id,
        u.name,
        u.email,
        u.role_id,
        r.name as role_name,
        st.id as staff_id,
        st.employee_id,
        st.position,
        st.qualifications,
        d.name as department_name
      from users u
      left join roles r on r.id = u.role_id
      left join staff st on st.user_id = u.id
      left join departments d on d.id = st.department_id
      where u.id = ${user.id} or lower(u.email) = lower(${user.email})
      limit 1
    `, "teacher lookup")
    if (teacher) return { school, tenantDb, teacher }
  }
  return null
}

async function readResourceCollection(db: QueryableDb, teacherId: string) {
  const row = await first(db, sql`select value from system_settings where key = ${`teacher_resources:${teacherId}`} limit 1`, "resource collection")
  const value = objectValue(row?.value)
  return {
    favorites: arrayValue(value.favorites).map(String),
    shared: arrayValue(value.shared).map(String),
    archived: arrayValue(value.archived).map(String),
  }
}

async function writeResourceCollection(db: QueryableDb, teacherId: string, collection: { favorites: string[]; shared: string[]; archived: string[] }) {
  await db.execute(sql`
    insert into system_settings (id, key, value, category, description, created_at, updated_at)
    values (${crypto.randomUUID()}, ${`teacher_resources:${teacherId}`}, ${JSON.stringify(collection)}::jsonb, 'teachers', ${`Teacher resource collection ${teacherId}`}, now(), now())
    on conflict (key) do update set value = excluded.value, updated_at = now()
  `)
}

async function buildPayload(request: NextRequest, currentUser: { id: string; name: string; email: string; role: string }) {
  const context = await findTeacherContext(request, currentUser)
  if (!context) return { response: NextResponse.json({ error: "Teacher profile was not found for this account.", currentUser }, { status: 404 }) }

  const { tenantDb, school, teacher } = context
  const teacherId = text(teacher.id)

  const [assessmentRows, resourceRows, subjectRows, classRows] = await Promise.all([
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
        a.created_by,
        a.created_at,
        a.updated_at,
        s.name as subject_name,
        s.code as subject_code,
        c.id as class_id,
        c.name as class_name
      from assessments a
      left join subjects s on s.id = a.subject_id
      left join classes c on c.id = a.class_id
      where a.created_by = ${teacherId}
      order by a.created_at desc
      limit 200
    `, "teacher assessments"),
    rows(tenantDb, sql`
      select
        id,
        title,
        description,
        category,
        resource_type,
        file_url,
        file_size,
        created_by,
        created_at,
        updated_at,
        is_public,
        view_count,
        download_count,
        tags,
        metadata
      from resources
      where created_by = ${teacherId}
      order by created_at desc
      limit 200
    `, "teacher resources"),
    rows(tenantDb, sql`
      select id, name, code, type
      from subjects
      order by name asc
    `, "subjects"),
    rows(tenantDb, sql`
      select id, name, grade, section, academic_year
      from classes
      where teacher_id = ${teacherId}
         or exists (select 1 from assessments a where a.class_id = classes.id and a.created_by = ${teacherId})
         or exists (select 1 from gradebook g where g.class_id = classes.id and g.teacher_id = ${teacherId})
      order by name asc
    `, "teacher classes"),
  ])

  const collection = await readResourceCollection(tenantDb, teacherId)
  const normalizeAttachments = (value: unknown) => {
    return arrayValue(value).map((item) => {
      const obj = objectValue(item)
      return {
        title: text(obj.title, text(obj.name, "Attachment")),
        url: text(obj.url, text(obj.href)),
        type: text(obj.type, "file"),
        size: text(obj.size, "Unknown"),
      }
    })
  }

  const resources = [
    ...assessmentRows.flatMap((row) => {
      const attachments = normalizeAttachments(row.attachments)
      const base = {
        sourceId: text(row.id),
        sourceType: "assessment",
        subjectId: text(row.subject_id),
        subject: text(row.subject_name, "General"),
        subjectCode: text(row.subject_code),
        classId: text(row.class_id),
        className: text(row.class_name, "All classes"),
        createdAt: iso(row.created_at),
        updatedAt: iso(row.updated_at),
        assessmentType: text(row.assessment_type),
        tags: ["assessment", text(row.assessment_type)],
        isPublic: false,
        viewCount: 0,
        downloadCount: 0,
      }
      const instructionResource = text(row.instructions) ? [{
        id: `assessment_instructions_${text(row.id)}`,
        title: `${text(row.name, "Assessment")} - Instructions`,
        description: text(row.instructions),
        kind: "instructions",
        category: "Learning Materials",
        url: "",
        size: "Read online",
        fileSize: 0,
        ...base,
      }] : []
      const attachmentResources = attachments.map((attachment, index) => ({
        id: `assessment_attachment_${text(row.id)}_${index}`,
        title: attachment.title,
        description: `${text(row.name, "Assessment")} - ${attachment.type}`,
        kind: attachment.type,
        category: "Learning Materials",
        url: attachment.url,
        size: attachment.size,
        fileSize: 0,
        ...base,
      }))
      return [...instructionResource, ...attachmentResources]
    }),
    ...resourceRows.map((row) => ({
      id: text(row.id),
      title: text(row.title, "Resource"),
      description: text(row.description),
      kind: text(row.resource_type, "document"),
      category: text(row.category, "Learning Materials"),
      url: text(row.file_url),
      size: text(row.file_size, "Unknown"),
      fileSize: numberValue(row.file_size, 0),
      sourceType: "resource",
      sourceId: text(row.id),
      isPublic: row.is_public === true,
      viewCount: numberValue(row.view_count, 0),
      downloadCount: numberValue(row.download_count, 0),
      tags: arrayValue(row.tags).map(String),
      metadata: objectValue(row.metadata),
      createdAt: iso(row.created_at),
      updatedAt: iso(row.updated_at),
    })),
  ]

  const enrichedResources = resources.map((resource) => ({
    ...resource,
    favorited: collection.favorites.includes(resource.id),
    shared: collection.shared.includes(resource.id),
    archived: collection.archived.includes(resource.id),
  }))

  const totalSize = enrichedResources.reduce((sum, r) => sum + (typeof r.fileSize === "number" ? r.fileSize : 0), 0)
  const categories = [...new Set(enrichedResources.map((r) => r.category))]
  const tags = [...new Set(enrichedResources.flatMap((r) => r.tags))]

  return {
    payload: {
      generatedAt: new Date().toISOString(),
      currentUser: { id: currentUser.id, name: text(teacher.name, currentUser.name), email: text(teacher.email, currentUser.email), role: currentUser.role },
      school: { id: text(school.id), name: text(school.name, text(school.slug, "School")), slug: text(school.slug), type: text(school.type) },
      teacher: {
        id: teacherId,
        name: text(teacher.name),
        email: text(teacher.email),
        position: text(teacher.position),
        department: text(teacher.department_name),
        qualifications: text(teacher.qualifications),
        employeeId: text(teacher.employee_id),
      },
      metrics: {
        resources: enrichedResources.length,
        favorited: collection.favorites.length,
        shared: collection.shared.length,
        archived: collection.archived.length,
        totalSize,
        totalViews: enrichedResources.reduce((sum, r) => sum + (typeof r.viewCount === "number" ? r.viewCount : 0), 0),
        totalDownloads: enrichedResources.reduce((sum, r) => sum + (typeof r.downloadCount === "number" ? r.downloadCount : 0), 0),
      },
      subjects: subjectRows.map((row) => ({ id: text(row.id), name: text(row.name), code: text(row.code), type: text(row.type) })),
      classes: classRows.map((row) => ({ id: text(row.id), name: text(row.name), grade: text(row.grade), section: text(row.section), academicYear: text(row.academic_year) })),
      resources: enrichedResources,
      categories,
      tags,
    },
    context,
    collection,
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
  const resourceId = text(body.resourceId)

  if (!resourceId || !["favorite", "unfavorite", "share", "unshare", "archive", "unarchive"].includes(action)) {
    return NextResponse.json({ error: "Unsupported resource action" }, { status: 400 })
  }

  const resourceExists = result.payload.resources.some((resource) => resource.id === resourceId)
  if (!resourceExists) return NextResponse.json({ error: "Resource was not found" }, { status: 404 })

  const collection = result.collection
  const add = (key: keyof typeof collection) => {
    if (!collection[key].includes(resourceId)) collection[key] = [...collection[key], resourceId]
  }
  const remove = (key: keyof typeof collection) => {
    collection[key] = collection[key].filter((id) => id !== resourceId)
  }

  if (action === "favorite") add("favorites")
  if (action === "unfavorite") remove("favorites")
  if (action === "share") add("shared")
  if (action === "unshare") remove("shared")
  if (action === "archive") add("archived")
  if (action === "unarchive") remove("archived")

  await writeResourceCollection(result.context.tenantDb, text(result.context.teacher.id), collection)
  return NextResponse.json({ success: true, collection }, { headers: { "Cache-Control": "no-store" } })
}
