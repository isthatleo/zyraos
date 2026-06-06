import crypto from "node:crypto";

import { sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

import { getTenantDbBySlug } from "@/lib/db";
import { isTenantAdminResponse, requireTenantAdmin } from "@/lib/tenant-admin-auth";
import { writeTenantAuditLog } from "@/lib/tenant-audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Row = Record<string, unknown>;

const OWNER_ROLES = new Set(["owner", "tenant_owner", "master", "super_admin", "platform_admin"]);
const ALLOWED_ROLES = ["all", "student", "parent", "teacher", "school_admin", "hr", "finance", "librarian", "canteen", "receptionist", "staff"];

function asString(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function asNumber(value: unknown) {
  const next = Number(value || 0);
  return Number.isFinite(next) ? next : 0;
}

function asDate(value: unknown) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function asPositiveInt(value: string | null, fallback: number, max: number) {
  const next = Number(value || fallback);
  if (!Number.isFinite(next) || next < 1) return fallback;
  return Math.min(Math.floor(next), max);
}

function isDateInput(value: string) {
  if (!value) return true;
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(`${value}T00:00:00.000Z`).getTime());
}

function arrayValue(value: unknown) {
  return Array.isArray(value) ? value.map(String) : [];
}

function sanitizeRoles(input: unknown) {
  const roles = arrayValue(input).map((role) => role.trim().toLowerCase()).filter(Boolean);
  const cleaned = Array.from(new Set(roles.filter((role) => ALLOWED_ROLES.includes(role) && !OWNER_ROLES.has(role))));
  return cleaned.length ? cleaned : ["all"];
}

function validateAnnouncement(input: { title: string; content: string; publishDate: string; expiryDate: string; targetRoles: string[] }) {
  const errors: string[] = [];
  if (!input.title || input.title.length < 3) errors.push("Title must be at least 3 characters");
  if (input.title.length > 160) errors.push("Title must be 160 characters or fewer");
  if (!input.content || input.content.length < 10) errors.push("Content must be at least 10 characters");
  if (input.content.length > 5000) errors.push("Content must be 5000 characters or fewer");
  if (!input.targetRoles.length) errors.push("At least one target audience is required");
  if (!isDateInput(input.publishDate) || !isDateInput(input.expiryDate)) errors.push("Dates must use YYYY-MM-DD format");
  if (input.publishDate && input.expiryDate && new Date(input.publishDate) > new Date(input.expiryDate)) errors.push("Publish date cannot be after expiry date");
  return errors;
}

async function safeRows<T = Row>(operation: () => Promise<{ rows?: unknown[] } | T[]>, label: string): Promise<T[]> {
  try {
    const result = await operation();
    if (Array.isArray(result)) return result as T[];
    return (result.rows || []) as T[];
  } catch (error) {
    console.warn(`Admin announcements ${label} query skipped:`, error instanceof Error ? error.message : error);
    return [];
  }
}

function csvEscape(value: unknown) {
  const text = typeof value === "string" ? value : JSON.stringify(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function toCsv(rows: Row[]) {
  const headers = ["id", "title", "authorName", "targetRoles", "isPublished", "publishDate", "expiryDate", "createdAt", "updatedAt"];
  return [headers.join(","), ...rows.map((row) => headers.map((key) => csvEscape(row[key])).join(","))].join("\n");
}

function normalize(row: Row) {
  const publishDate = asDate(row.publish_date);
  const expiryDate = asDate(row.expiry_date);
  const now = Date.now();
  const isPublished = row.is_published === true;
  const starts = publishDate ? new Date(publishDate).getTime() : 0;
  const ends = expiryDate ? new Date(expiryDate).getTime() : Infinity;
  const lifecycle = !isPublished ? "draft" : starts > now ? "scheduled" : ends < now ? "expired" : "active";
  return {
    id: asString(row.id),
    title: asString(row.title),
    content: asString(row.content),
    authorId: asString(row.author_id),
    authorName: asString(row.author_name, "System"),
    targetRoles: arrayValue(row.target_roles).filter((role) => !OWNER_ROLES.has(role)),
    isPublished,
    lifecycle,
    publishDate,
    expiryDate,
    createdAt: asDate(row.created_at),
    updatedAt: asDate(row.updated_at),
  };
}

async function audiencePreview(tenantDb: Awaited<ReturnType<typeof getTenantDbBySlug>>, targetRoles: string[]) {
  const rows = await safeRows<Row>(() => tenantDb.execute(sql`
    select role_id, count(*)::int total
    from users
    where is_active = true
      and lower(role_id) not in ('owner', 'tenant_owner')
    group by role_id
  `), "audience preview");
  const byRole = rows.map((row) => ({ role: asString(row.role_id, "unknown"), total: asNumber(row.total) }));
  const total = byRole.filter((item) => targetRoles.includes("all") || targetRoles.includes(item.role)).reduce((sum, item) => sum + item.total, 0);
  return { total, byRole };
}

async function buildPayload(request: NextRequest, slug: string) {
  const admin = await requireTenantAdmin(request, slug);
  if (isTenantAdminResponse(admin)) return admin;
  const tenantDb = await getTenantDbBySlug(slug);
  const params = request.nextUrl.searchParams;
  const page = asPositiveInt(params.get("page"), 1, 10_000);
  const pageSize = asPositiveInt(params.get("pageSize"), 20, 100);
  const offset = (page - 1) * pageSize;
  const query = params.get("query")?.trim() || "";
  const status = params.get("status")?.trim().toLowerCase() || "all";
  const role = params.get("role")?.trim().toLowerCase() || "all";
  const exportFormat = params.get("export")?.trim().toLowerCase() || "";
  if (!["", "csv", "json"].includes(exportFormat)) return NextResponse.json({ error: "Unsupported export format" }, { status: 400 });

  const whereParts = [sql`1 = 1`];
  if (query) {
    const pattern = `%${query}%`;
    whereParts.push(sql`(a.title ilike ${pattern} or a.content ilike ${pattern} or coalesce(u.name, '') ilike ${pattern})`);
  }
  if (role !== "all") whereParts.push(sql`a.target_roles::text ilike ${`%${role}%`}`);
  if (status === "published") whereParts.push(sql`a.is_published = true`);
  if (status === "draft") whereParts.push(sql`a.is_published = false`);
  if (status === "active") whereParts.push(sql`a.is_published = true and (a.publish_date is null or a.publish_date <= now()) and (a.expiry_date is null or a.expiry_date >= now())`);
  if (status === "scheduled") whereParts.push(sql`a.is_published = true and a.publish_date > now()`);
  if (status === "expired") whereParts.push(sql`a.is_published = true and a.expiry_date < now()`);
  const whereSql = sql.join(whereParts, sql` and `);
  const limitSql = exportFormat ? sql`limit 5000` : sql`limit ${pageSize} offset ${offset}`;

  const [announcementRows, countRows, summaryRows, audience] = await Promise.all([
    safeRows<Row>(() => tenantDb.execute(sql`
      select a.*, u.name as author_name
      from announcements a
      left join users u on u.id = a.author_id
      where ${whereSql}
      order by a.created_at desc
      ${limitSql}
    `), "announcements"),
    safeRows<Row>(() => tenantDb.execute(sql`select count(*)::int total from announcements a left join users u on u.id = a.author_id where ${whereSql}`), "count"),
    safeRows<Row>(() => tenantDb.execute(sql`
      select count(*)::int total,
        count(*) filter (where is_published = false)::int drafts,
        count(*) filter (where is_published = true and (publish_date is null or publish_date <= now()) and (expiry_date is null or expiry_date >= now()))::int active,
        count(*) filter (where is_published = true and publish_date > now())::int scheduled,
        count(*) filter (where is_published = true and expiry_date < now())::int expired
      from announcements a
      where ${whereSql}
    `), "summary"),
    audiencePreview(tenantDb, ["all"]),
  ]);
  const announcements = announcementRows.map(normalize);
  const total = asNumber(countRows[0]?.total);
  const summary = summaryRows[0] || {};
  const payload = {
    announcements,
    audience,
    summaries: {
      total,
      drafts: asNumber(summary.drafts),
      active: asNumber(summary.active),
      scheduled: asNumber(summary.scheduled),
      expired: asNumber(summary.expired),
    },
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
      hasNextPage: page * pageSize < total,
      hasPreviousPage: page > 1,
    },
    filters: { query, status, role },
    generatedAt: new Date().toISOString(),
  };
  if (exportFormat === "json") {
    await writeTenantAuditLog({ db: tenantDb, request, actorId: admin.userId, action: "admin.announcements.exported", resource: "announcements", resourceId: slug, changes: { format: "json", filters: payload.filters, rowCount: announcements.length } }).catch(() => undefined);
    return NextResponse.json({ ...payload, exportedAt: new Date().toISOString() }, { headers: { "Cache-Control": "no-store, max-age=0", "Content-Disposition": `attachment; filename="${slug}-announcements.json"` } });
  }
  if (exportFormat === "csv") {
    await writeTenantAuditLog({ db: tenantDb, request, actorId: admin.userId, action: "admin.announcements.exported", resource: "announcements", resourceId: slug, changes: { format: "csv", filters: payload.filters, rowCount: announcements.length } }).catch(() => undefined);
    return new NextResponse(toCsv(announcements as unknown as Row[]), { headers: { "Content-Type": "text/csv; charset=utf-8", "Cache-Control": "no-store, max-age=0", "Content-Disposition": `attachment; filename="${slug}-announcements.csv"` } });
  }
  return NextResponse.json(payload, { headers: { "Cache-Control": "no-store, max-age=0" } });
}

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("tenant")?.trim().toLowerCase() || request.nextUrl.searchParams.get("slug")?.trim().toLowerCase() || "";
  if (!slug) return NextResponse.json({ error: "Tenant slug is required" }, { status: 400 });
  return buildPayload(request, slug);
}

export async function POST(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("tenant")?.trim().toLowerCase() || request.nextUrl.searchParams.get("slug")?.trim().toLowerCase() || "";
  if (!slug) return NextResponse.json({ error: "Tenant slug is required" }, { status: 400 });
  const admin = await requireTenantAdmin(request, slug);
  if (isTenantAdminResponse(admin)) return admin;
  const tenantDb = await getTenantDbBySlug(slug);
  const body = await request.json().catch(() => ({}));
  const title = asString(body.title);
  const content = asString(body.content);
  const publishDate = asString(body.publishDate);
  const expiryDate = asString(body.expiryDate);
  const targetRoles = sanitizeRoles(body.targetRoles);
  const errors = validateAnnouncement({ title, content, publishDate, expiryDate, targetRoles });
  if (errors.length) return NextResponse.json({ error: errors.join("; "), errors }, { status: 400 });
  const id = `ann_${crypto.randomUUID()}`;
  await tenantDb.execute(sql`
    insert into announcements (id, title, content, author_id, target_roles, is_published, publish_date, expiry_date, created_at, updated_at)
    values (${id}, ${title}, ${content}, ${admin.userId}, ${JSON.stringify(targetRoles)}::jsonb, ${body.isPublished === true}, ${publishDate ? new Date(publishDate) : null}, ${expiryDate ? new Date(expiryDate) : null}, now(), now())
  `);
  const audience = await audiencePreview(tenantDb, targetRoles);
  await writeTenantAuditLog({ db: tenantDb, request, actorId: admin.userId, action: "admin.announcement.created", resource: "announcements", resourceId: id, changes: { title, targetRoles, isPublished: body.isPublished === true, audience: audience.total } }).catch(() => undefined);
  return NextResponse.json(await buildPayload(request, slug), { headers: { "Cache-Control": "no-store, max-age=0" } });
}

export async function PATCH(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("tenant")?.trim().toLowerCase() || request.nextUrl.searchParams.get("slug")?.trim().toLowerCase() || "";
  if (!slug) return NextResponse.json({ error: "Tenant slug is required" }, { status: 400 });
  const admin = await requireTenantAdmin(request, slug);
  if (isTenantAdminResponse(admin)) return admin;
  const tenantDb = await getTenantDbBySlug(slug);
  const body = await request.json().catch(() => ({}));
  const id = asString(body.id);
  if (!id) return NextResponse.json({ error: "Announcement ID is required" }, { status: 400 });
  const [current] = await safeRows<Row>(() => tenantDb.execute(sql`select * from announcements where id = ${id} limit 1`), "current announcement");
  if (!current) return NextResponse.json({ error: "Announcement not found" }, { status: 404 });
  const title = asString(body.title, asString(current.title));
  const content = asString(body.content, asString(current.content));
  const publishDate = asString(body.publishDate, asDate(current.publish_date)?.slice(0, 10) || "");
  const expiryDate = asString(body.expiryDate, asDate(current.expiry_date)?.slice(0, 10) || "");
  const targetRoles = sanitizeRoles(body.targetRoles || current.target_roles);
  const errors = validateAnnouncement({ title, content, publishDate, expiryDate, targetRoles });
  if (errors.length) return NextResponse.json({ error: errors.join("; "), errors }, { status: 400 });
  const isPublished = typeof body.isPublished === "boolean" ? body.isPublished : current.is_published === true;
  await tenantDb.execute(sql`
    update announcements
    set title = ${title}, content = ${content}, target_roles = ${JSON.stringify(targetRoles)}::jsonb, is_published = ${isPublished},
      publish_date = ${publishDate ? new Date(publishDate) : null}, expiry_date = ${expiryDate ? new Date(expiryDate) : null}, updated_at = now()
    where id = ${id}
  `);
  await writeTenantAuditLog({ db: tenantDb, request, actorId: admin.userId, action: "admin.announcement.updated", resource: "announcements", resourceId: id, changes: { before: normalize(current), after: { title, content, targetRoles, isPublished, publishDate, expiryDate } } }).catch(() => undefined);
  return NextResponse.json(await buildPayload(request, slug), { headers: { "Cache-Control": "no-store, max-age=0" } });
}

export async function DELETE(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("tenant")?.trim().toLowerCase() || "";
  const id = request.nextUrl.searchParams.get("id")?.trim() || "";
  if (!slug) return NextResponse.json({ error: "Tenant slug is required" }, { status: 400 });
  if (!id) return NextResponse.json({ error: "Announcement ID is required" }, { status: 400 });
  const admin = await requireTenantAdmin(request, slug);
  if (isTenantAdminResponse(admin)) return admin;
  const tenantDb = await getTenantDbBySlug(slug);
  const [current] = await safeRows<Row>(() => tenantDb.execute(sql`select * from announcements where id = ${id} limit 1`), "delete announcement");
  if (!current) return NextResponse.json({ error: "Announcement not found" }, { status: 404 });
  await tenantDb.execute(sql`delete from announcements where id = ${id}`);
  await writeTenantAuditLog({ db: tenantDb, request, actorId: admin.userId, action: "admin.announcement.deleted", resource: "announcements", resourceId: id, changes: normalize(current) }).catch(() => undefined);
  return NextResponse.json(await buildPayload(request, slug), { headers: { "Cache-Control": "no-store, max-age=0" } });
}
