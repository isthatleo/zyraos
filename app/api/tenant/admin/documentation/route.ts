import crypto from "node:crypto";

import { sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { getTenantDb, masterDb } from "@/lib/db";
import { normalizeRole } from "@/lib/roles";
import { writeTenantAuditLog } from "@/lib/tenant-audit";
import { getTenantSubdomain } from "@/lib/tenant-routing";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type QueryableDb = ReturnType<typeof getTenantDb>;
type Row = Record<string, unknown>;

const ALLOWED_ROLES = new Set(["owner", "school_admin"]);
const DOCUMENT_KEYS = ["birthCertificate", "passportPhoto", "previousResults", "medicalRecords"] as const;

function stringValue(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function boolValue(value: unknown) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value.toLowerCase() === "true";
  return Boolean(value);
}

function numberValue(value: unknown) {
  const next = Number(value ?? 0);
  return Number.isFinite(next) ? next : 0;
}

function objectValue(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Row : {};
}

function csvEscape(value: unknown) {
  const text = typeof value === "string" ? value : JSON.stringify(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function toCsv(rows: Row[]) {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  return [headers.join(","), ...rows.map((row) => headers.map((key) => csvEscape(row[key])).join(","))].join("\n");
}

async function rows(db: QueryableDb, query: ReturnType<typeof sql>, fallback: Row[] = []) {
  try {
    const result = await db.execute(query);
    return (result.rows || []) as Row[];
  } catch (error) {
    console.warn("Admin documentation query skipped:", error instanceof Error ? error.message : error);
    return fallback;
  }
}

async function first(db: QueryableDb, query: ReturnType<typeof sql>, fallback: Row = {}) {
  const result = await rows(db, query, [fallback]);
  return result[0] || fallback;
}

function resolveSlug(request: NextRequest) {
  return request.nextUrl.searchParams.get("tenant")?.trim() || request.nextUrl.searchParams.get("slug")?.trim() || getTenantSubdomain(request.headers.get("host")) || "";
}

async function resolveContext(request: NextRequest) {
  const slug = resolveSlug(request);
  if (!slug) return { response: NextResponse.json({ error: "Tenant slug is required" }, { status: 400 }) };
  const schoolResult = await masterDb.execute(sql`select id, name, slug, database_url from schools where slug = ${slug} limit 1`);
  const school = schoolResult.rows[0] as Row | undefined;
  if (!school) return { response: NextResponse.json({ error: "School not found" }, { status: 404 }) };
  const session = await auth.api.getSession({ headers: request.headers }).catch(() => null);
  if (!session?.user?.id || !session.user.email) return { response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  const tenantDb = getTenantDb(String(school.database_url || ""));
  const [tenantUser] = await rows(tenantDb, sql`
    select u.id, u.email, u.name, u.role_id, u.is_active, r.name as role_name
    from users u
    left join roles r on r.id = u.role_id
    where u.id = ${session.user.id} or lower(u.email) = lower(${session.user.email})
    limit 1
  `);
  if (!tenantUser) return { response: NextResponse.json({ error: "Signed-in account does not belong to this tenant" }, { status: 403 }) };
  if (tenantUser.is_active === false) return { response: NextResponse.json({ error: "This tenant account is inactive" }, { status: 403 }) };
  const role = normalizeRole(stringValue(tenantUser.role_id) || stringValue(tenantUser.role_name));
  if (!ALLOWED_ROLES.has(role)) return { response: NextResponse.json({ error: "Only owners and school admins can manage documentation" }, { status: 403 }) };
  return { slug, school, tenantDb, actor: { id: stringValue(tenantUser.id, session.user.id), email: stringValue(tenantUser.email, session.user.email), name: stringValue(tenantUser.name, session.user.name || session.user.email), role } };
}

async function audit(ctx: { tenantDb: QueryableDb; actor: { id: string; email: string; name: string; role: string } }, request: NextRequest, action: string, resourceId?: string, changes: Row = {}) {
  await writeTenantAuditLog({ db: ctx.tenantDb, request, actorId: ctx.actor.id, action, resource: "student_documentation", resourceId, changes: { ...changes, actorEmail: ctx.actor.email, actorName: ctx.actor.name, actorRole: ctx.actor.role } }).catch(() => undefined);
}

function documentPayload(value: unknown) {
  const doc = objectValue(value);
  return {
    url: stringValue(doc.url),
    fileName: stringValue(doc.fileName),
    status: stringValue(doc.status, "missing"),
    verified: boolValue(doc.verified),
    uploadedAt: stringValue(doc.uploadedAt),
    verifiedAt: stringValue(doc.verifiedAt),
    verifiedBy: stringValue(doc.verifiedBy),
    notes: stringValue(doc.notes),
    mimeType: stringValue(doc.mimeType),
    size: numberValue(doc.size),
    dataUrl: stringValue(doc.dataUrl),
  };
}

function normalizeDocuments(value: unknown, actorId = "") {
  const docs = objectValue(value);
  return Object.fromEntries(DOCUMENT_KEYS.map((key) => {
    const doc = documentPayload(docs[key]);
    const verified = doc.verified || doc.status === "verified";
    return [key, {
      ...doc,
      status: verified ? "received" : stringValue(doc.status, "missing"),
      verified,
      verifiedAt: verified ? stringValue(doc.verifiedAt, new Date().toISOString()) : "",
      verifiedBy: verified ? stringValue(doc.verifiedBy, actorId) : "",
      uploadedAt: stringValue(doc.uploadedAt, doc.url || doc.fileName || doc.dataUrl ? new Date().toISOString() : ""),
    }];
  }));
}

function completion(documents: Row) {
  return Object.values(documents).filter((item) => {
    const doc = objectValue(item);
    return boolValue(doc.verified) || stringValue(doc.status) === "received";
  }).length;
}

async function getDocumentMetadata(db: QueryableDb) {
  const settings = await rows(db, sql`select key, value from system_settings where key like 'student_documents:%'`);
  const map = new Map<string, Row>();
  for (const row of settings) {
    const key = stringValue(row.key);
    if (key.startsWith("student_documents:")) map.set(key.replace("student_documents:", ""), objectValue(objectValue(row.value).documents || row.value));
  }
  return map;
}

async function buildPayload(db: QueryableDb, school: Row, filters: { search?: string; status?: string; classId?: string } = {}) {
  const searchTerm = filters.search || "";
  const search = `%${searchTerm}%`;
  const classId = filters.classId && filters.classId !== "all" ? filters.classId : "";
  const students = await rows(db, sql`
    select s.id, s.admission_number, s.status, s.class_id, u.name, u.email, c.name as class_name, c.grade, c.section
    from students s
    left join users u on u.id = s.user_id
    left join classes c on c.id = s.class_id
    where (${classId} = '' or s.class_id = ${classId})
      and (${searchTerm} = '' or u.name ilike ${search} or u.email ilike ${search} or s.admission_number ilike ${search} or c.name ilike ${search})
    order by c.grade asc nulls last, c.name asc nulls last, u.name asc nulls last
    limit 2000
  `);
  const classes = await rows(db, sql`select id, name, grade, section from classes order by grade asc nulls last, name asc`);
  const metadata = await getDocumentMetadata(db);
  const payloadStudents = students.map((student) => {
    const id = stringValue(student.id);
    const documents = normalizeDocuments(metadata.get(id));
    const complete = completion(documents);
    return {
      id,
      name: stringValue(student.name, "Unnamed student"),
      email: stringValue(student.email),
      admissionNumber: stringValue(student.admission_number),
      classId: stringValue(student.class_id),
      className: stringValue(student.class_name),
      grade: stringValue(student.grade),
      section: stringValue(student.section),
      status: stringValue(student.status, "pending"),
      documents,
      completion: { complete, total: DOCUMENT_KEYS.length, percent: Math.round((complete / DOCUMENT_KEYS.length) * 100) },
    };
  });
  const filtered = payloadStudents.filter((student) => {
    if (filters.status === "complete") return student.completion.complete === DOCUMENT_KEYS.length;
    if (filters.status === "missing") return student.completion.complete < DOCUMENT_KEYS.length;
    return true;
  });
  return {
    generatedAt: new Date().toISOString(),
    school: { id: stringValue(school.id), name: stringValue(school.name), slug: stringValue(school.slug) },
    requiredDocuments: DOCUMENT_KEYS,
    classes: classes.map((item) => ({ id: stringValue(item.id), name: stringValue(item.name), grade: stringValue(item.grade), section: stringValue(item.section) })),
    summary: {
      total: payloadStudents.length,
      completeFiles: payloadStudents.filter((student) => student.completion.complete === DOCUMENT_KEYS.length).length,
      incompleteFiles: payloadStudents.filter((student) => student.completion.complete < DOCUMENT_KEYS.length).length,
      missingItems: payloadStudents.reduce((sum, student) => sum + (DOCUMENT_KEYS.length - student.completion.complete), 0),
      verifiedItems: payloadStudents.reduce((sum, student) => sum + student.completion.complete, 0),
    },
    students: filtered,
  };
}

function exportRows(payload: Awaited<ReturnType<typeof buildPayload>>) {
  return payload.students.map((student) => ({
    admissionNumber: student.admissionNumber,
    name: student.name,
    className: student.className,
    status: student.status,
    complete: student.completion.complete,
    total: student.completion.total,
    percent: student.completion.percent,
    birthCertificate: stringValue(objectValue(student.documents.birthCertificate).status),
    passportPhoto: stringValue(objectValue(student.documents.passportPhoto).status),
    previousResults: stringValue(objectValue(student.documents.previousResults).status),
    medicalRecords: stringValue(objectValue(student.documents.medicalRecords).status),
  }));
}

export async function GET(request: NextRequest) {
  const context = await resolveContext(request);
  if ("response" in context) return context.response;
  const payload = await buildPayload(context.tenantDb, context.school, {
    search: request.nextUrl.searchParams.get("search") || undefined,
    status: request.nextUrl.searchParams.get("status") || undefined,
    classId: request.nextUrl.searchParams.get("classId") || undefined,
  });
  const exportFormat = request.nextUrl.searchParams.get("export")?.trim().toLowerCase() || "";
  if (exportFormat === "csv") {
    await audit(context, request, "admin.documentation.exported", context.slug, { format: "csv", rowCount: payload.students.length });
    return new NextResponse(toCsv(exportRows(payload)), {
      headers: { "Content-Type": "text/csv; charset=utf-8", "Cache-Control": "no-store, max-age=0", "Content-Disposition": `attachment; filename="${context.slug}-student-documentation.csv"` },
    });
  }
  if (exportFormat === "json") {
    await audit(context, request, "admin.documentation.exported", context.slug, { format: "json", rowCount: payload.students.length });
    return NextResponse.json({ ...payload, exportedAt: new Date().toISOString() }, { headers: { "Cache-Control": "no-store, max-age=0", "Content-Disposition": `attachment; filename="${context.slug}-student-documentation.json"` } });
  }
  return NextResponse.json(payload, { headers: { "Cache-Control": "no-store, max-age=0" } });
}

export async function PUT(request: NextRequest) {
  const context = await resolveContext(request);
  if ("response" in context) return context.response;
  const body = await request.json().catch(() => ({} as Row));
  const studentId = stringValue(body.studentId);
  if (!studentId) return NextResponse.json({ error: "Student ID is required" }, { status: 400 });
  const student = await first(context.tenantDb, sql`select id from students where id = ${studentId} limit 1`);
  if (!student.id) return NextResponse.json({ error: "Student not found" }, { status: 404 });
  const documents = normalizeDocuments(body.documents, context.actor.id);
  await context.tenantDb.execute(sql`
    insert into system_settings (id, key, value, category, description, created_at, updated_at)
    values (${crypto.randomUUID()}, ${`student_documents:${studentId}`}, ${JSON.stringify({ studentId, documents, updatedAt: new Date().toISOString(), updatedBy: context.actor.id })}::jsonb, 'students', ${`Student documentation ${studentId}`}, now(), now())
    on conflict (key) do update set value = excluded.value, updated_at = now()
  `);
  await audit(context, request, "admin.documentation.updated", studentId, { studentId, completion: completion(documents), documents });
  return NextResponse.json({ success: true, ...(await buildPayload(context.tenantDb, context.school)) }, { headers: { "Cache-Control": "no-store, max-age=0" } });
}
