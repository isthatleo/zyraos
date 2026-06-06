import crypto from "node:crypto";

import { sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

import { getTenantDbBySlug } from "@/lib/db";
import { sendPlatformEmail, sendPlatformSms } from "@/lib/platform-integrations";
import { isTenantAdminResponse, requireTenantAdmin } from "@/lib/tenant-admin-auth";
import { writeTenantAuditLog } from "@/lib/tenant-audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Row = Record<string, unknown>;

const OWNER_ROLES = new Set(["owner", "tenant_owner", "master", "super_admin", "platform_admin"]);
const CHANNELS = new Set(["in-app", "sms", "email"]);
const AUDIENCES = new Set(["all", "students", "parents", "teachers", "staff", "custom"]);

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

function arrayValue(value: unknown) {
  return Array.isArray(value) ? value.map(String) : [];
}

function smsCount(content: string) {
  return Math.max(1, Math.ceil(content.length / 160));
}

function isDateTime(value: string) {
  if (!value) return true;
  return !Number.isNaN(new Date(value).getTime());
}

async function safeRows<T = Row>(operation: () => Promise<{ rows?: unknown[] } | T[]>, label: string): Promise<T[]> {
  try {
    const result = await operation();
    if (Array.isArray(result)) return result as T[];
    return (result.rows || []) as T[];
  } catch (error) {
    console.warn(`Admin broadcasts ${label} query skipped:`, error instanceof Error ? error.message : error);
    return [];
  }
}

function csvEscape(value: unknown) {
  const text = typeof value === "string" ? value : JSON.stringify(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function toCsv(rows: Row[]) {
  const headers = ["id", "title", "channel", "targetAudience", "status", "deliveryCount", "sentCount", "failedCount", "pendingCount", "scheduledAt", "sentAt", "createdAt"];
  return [headers.join(","), ...rows.map((row) => headers.map((key) => csvEscape(row[key])).join(","))].join("\n");
}

function normalizeBroadcast(row: Row) {
  return {
    id: asString(row.id),
    title: asString(row.title),
    content: asString(row.content),
    channel: asString(row.channel),
    targetAudience: asString(row.target_audience),
    targetAudienceIds: arrayValue(row.target_audience_ids),
    status: asString(row.status),
    scheduledAt: asDate(row.scheduled_at),
    sentAt: asDate(row.sent_at),
    failedAt: asDate(row.failed_at),
    createdAt: asDate(row.created_at),
    updatedAt: asDate(row.updated_at),
    createdByName: asString(row.created_by_name, "System"),
    deliveryCount: asNumber(row.delivery_count),
    sentCount: asNumber(row.sent_count),
    deliveredCount: asNumber(row.delivered_count),
    failedCount: asNumber(row.failed_count),
    pendingCount: asNumber(row.pending_count),
    smsCount: smsCount(asString(row.content)),
  };
}

async function recipients(tenantDb: Awaited<ReturnType<typeof getTenantDbBySlug>>, audience: string, ids: string[] = []) {
  const userRows = await safeRows<Row>(() => tenantDb.execute(sql`
    select u.id, u.name, u.email, u.role_id, u.is_active,
      coalesce(s.phone, g.phone, '') as phone
    from users u
    left join students s on s.user_id = u.id
    left join guardians g on lower(g.email) = lower(u.email)
    where u.is_active = true
      and lower(u.role_id) not in ('owner', 'tenant_owner')
    order by lower(u.name) asc
  `), "recipients");
  const users = userRows.map((row) => ({
    id: asString(row.id),
    name: asString(row.name, asString(row.email)),
    email: asString(row.email),
    phone: asString(row.phone),
    role: asString(row.role_id).toLowerCase(),
  })).filter((user) => !OWNER_ROLES.has(user.role));
  if (audience === "custom" && ids.length) return users.filter((user) => ids.includes(user.id));
  if (audience === "students") return users.filter((user) => ["student", "learner", "pupil"].includes(user.role));
  if (audience === "parents") return users.filter((user) => ["parent", "guardian"].includes(user.role));
  if (audience === "teachers") return users.filter((user) => ["teacher", "lecturer", "professor"].includes(user.role));
  if (audience === "staff") return users.filter((user) => !["student", "learner", "pupil", "parent", "guardian"].includes(user.role));
  return users;
}

async function createDeliveries(tenantDb: Awaited<ReturnType<typeof getTenantDbBySlug>>, broadcastId: string, users: Awaited<ReturnType<typeof recipients>>, channel: string, status: string, content: string) {
  for (const user of users) {
    let deliveryStatus = status === "sent" ? "sent" : "pending";
    let error = "";
    let externalReference = "";
    let deliveredAt: Date | null = status === "sent" && channel === "in-app" ? new Date() : null;
    if (status === "sent" && channel === "sms") {
      if (!user.phone) {
        deliveryStatus = "failed";
        error = "Missing phone number for SMS delivery";
      } else {
        const result = await sendPlatformSms({ to: user.phone, body: content }).catch((err) => ({ ok: false, message: err instanceof Error ? err.message : "SMS failed", data: {} }));
        deliveryStatus = result.ok ? "sent" : "failed";
        error = result.ok ? "" : asString(result.message, "SMS failed");
        externalReference = asString((result.data as Row | undefined)?.sid);
        deliveredAt = result.ok ? new Date() : null;
      }
    }
    if (status === "sent" && channel === "email") {
      if (!user.email) {
        deliveryStatus = "failed";
        error = "Missing email address for email delivery";
      } else {
        const result = await sendPlatformEmail({ to: user.email, subject: "School broadcast", text: content, html: `<p>${content.replace(/\n/g, "<br />")}</p>` }).catch((err) => ({ ok: false, message: err instanceof Error ? err.message : "Email failed", data: {} }));
        deliveryStatus = result.ok ? "sent" : "failed";
        error = result.ok ? "" : asString(result.message, "Email failed");
        externalReference = asString((result.data as Row | undefined)?.id);
        deliveredAt = result.ok ? new Date() : null;
      }
    }
    await tenantDb.execute(sql`
      insert into broadcast_deliveries (id, broadcast_id, user_id, phone, email, status, delivery_error, delivered_at, failed_at, external_reference, metadata, created_at, updated_at)
      values (${`bd_${crypto.randomUUID()}`}, ${broadcastId}, ${user.id}, ${user.phone || null}, ${user.email || null}, ${deliveryStatus}, ${error || null}, ${deliveredAt}, ${deliveryStatus === "failed" ? new Date() : null}, ${externalReference || null}, ${JSON.stringify({ channel, role: user.role })}::jsonb, now(), now())
    `);
  }
}

function validateBroadcast(input: { title: string; content: string; channel: string; audience: string; status: string; scheduledAt: string }) {
  const errors: string[] = [];
  if (!input.title || input.title.length < 3) errors.push("Title must be at least 3 characters");
  if (input.title.length > 160) errors.push("Title must be 160 characters or fewer");
  if (!input.content || input.content.length < 5) errors.push("Message content is required");
  if (input.content.length > 5000) errors.push("Message content must be 5000 characters or fewer");
  if (!CHANNELS.has(input.channel)) errors.push("Unsupported broadcast channel");
  if (!AUDIENCES.has(input.audience)) errors.push("Unsupported target audience");
  if (!["draft", "scheduled", "sent"].includes(input.status)) errors.push("Unsupported broadcast status");
  if (input.status === "scheduled" && !input.scheduledAt) errors.push("Scheduled broadcasts require a scheduled date/time");
  if (!isDateTime(input.scheduledAt)) errors.push("Scheduled date/time is invalid");
  return errors;
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
  const channel = params.get("channel")?.trim().toLowerCase() || "all";
  const exportFormat = params.get("export")?.trim().toLowerCase() || "";
  if (!["", "csv", "json"].includes(exportFormat)) return NextResponse.json({ error: "Unsupported export format" }, { status: 400 });

  const whereParts = [sql`1 = 1`];
  if (query) {
    const pattern = `%${query}%`;
    whereParts.push(sql`(b.title ilike ${pattern} or b.content ilike ${pattern} or coalesce(u.name, '') ilike ${pattern})`);
  }
  if (status !== "all") whereParts.push(sql`lower(b.status) = ${status}`);
  if (channel !== "all") whereParts.push(sql`lower(b.channel) = ${channel}`);
  const whereSql = sql.join(whereParts, sql` and `);
  const limitSql = exportFormat ? sql`limit 5000` : sql`limit ${pageSize} offset ${offset}`;

  const [broadcastRows, countRows, summaryRows, allRecipients] = await Promise.all([
    safeRows<Row>(() => tenantDb.execute(sql`
      select b.*, u.name as created_by_name,
        count(d.id)::int as delivery_count,
        count(d.id) filter (where lower(d.status) in ('sent','delivered'))::int sent_count,
        count(d.id) filter (where lower(d.status) = 'delivered')::int delivered_count,
        count(d.id) filter (where lower(d.status) in ('failed','bounced'))::int failed_count,
        count(d.id) filter (where lower(d.status) = 'pending')::int pending_count
      from broadcasts b
      left join users u on u.id = b.created_by
      left join broadcast_deliveries d on d.broadcast_id = b.id
      where ${whereSql}
      group by b.id, u.name
      order by b.created_at desc
      ${limitSql}
    `), "broadcasts"),
    safeRows<Row>(() => tenantDb.execute(sql`select count(*)::int total from broadcasts b left join users u on u.id = b.created_by where ${whereSql}`), "count"),
    safeRows<Row>(() => tenantDb.execute(sql`
      select count(*)::int total,
        count(*) filter (where lower(status) = 'draft')::int drafts,
        count(*) filter (where lower(status) = 'scheduled')::int scheduled,
        count(*) filter (where lower(status) = 'sent')::int sent,
        count(*) filter (where lower(channel) = 'sms')::int sms,
        count(*) filter (where lower(channel) = 'email')::int email,
        count(*) filter (where lower(channel) = 'in-app')::int in_app
      from broadcasts b
      where ${whereSql}
    `), "summary"),
    recipients(tenantDb, "all"),
  ]);
  const broadcasts = broadcastRows.map(normalizeBroadcast);
  const total = asNumber(countRows[0]?.total);
  const summary = summaryRows[0] || {};
  const payload = {
    broadcasts,
    audience: {
      total: allRecipients.length,
      withPhone: allRecipients.filter((user) => user.phone).length,
      withEmail: allRecipients.filter((user) => user.email).length,
      byRole: Object.entries(allRecipients.reduce<Record<string, number>>((acc, user) => {
        acc[user.role] = (acc[user.role] || 0) + 1;
        return acc;
      }, {})).map(([roleName, count]) => ({ role: roleName, total: count })),
    },
    summaries: {
      total,
      drafts: asNumber(summary.drafts),
      scheduled: asNumber(summary.scheduled),
      sent: asNumber(summary.sent),
      sms: asNumber(summary.sms),
      email: asNumber(summary.email),
      inApp: asNumber(summary.in_app),
    },
    pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)), hasNextPage: page * pageSize < total, hasPreviousPage: page > 1 },
    filters: { query, status, channel },
    generatedAt: new Date().toISOString(),
  };
  if (exportFormat === "json") {
    await writeTenantAuditLog({ db: tenantDb, request, actorId: admin.userId, action: "admin.broadcasts.exported", resource: "broadcasts", resourceId: slug, changes: { format: "json", filters: payload.filters, rowCount: broadcasts.length } }).catch(() => undefined);
    return NextResponse.json({ ...payload, exportedAt: new Date().toISOString() }, { headers: { "Cache-Control": "no-store, max-age=0", "Content-Disposition": `attachment; filename="${slug}-broadcasts.json"` } });
  }
  if (exportFormat === "csv") {
    await writeTenantAuditLog({ db: tenantDb, request, actorId: admin.userId, action: "admin.broadcasts.exported", resource: "broadcasts", resourceId: slug, changes: { format: "csv", filters: payload.filters, rowCount: broadcasts.length } }).catch(() => undefined);
    return new NextResponse(toCsv(broadcasts as unknown as Row[]), { headers: { "Content-Type": "text/csv; charset=utf-8", "Cache-Control": "no-store, max-age=0", "Content-Disposition": `attachment; filename="${slug}-broadcasts.csv"` } });
  }
  return NextResponse.json(payload, { headers: { "Cache-Control": "no-store, max-age=0" } });
}

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("tenant")?.trim().toLowerCase() || request.nextUrl.searchParams.get("slug")?.trim().toLowerCase() || "";
  if (!slug) return NextResponse.json({ error: "Tenant slug is required" }, { status: 400 });
  return buildPayload(request, slug);
}

export async function POST(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("tenant")?.trim().toLowerCase() || "";
  if (!slug) return NextResponse.json({ error: "Tenant slug is required" }, { status: 400 });
  const admin = await requireTenantAdmin(request, slug);
  if (isTenantAdminResponse(admin)) return admin;
  const tenantDb = await getTenantDbBySlug(slug);
  const body = await request.json().catch(() => ({}));
  const title = asString(body.title);
  const content = asString(body.content);
  const channel = asString(body.channel, "in-app");
  const audience = asString(body.targetAudience, "all");
  const status = asString(body.status, "draft");
  const scheduledAt = asString(body.scheduledAt);
  const audienceIds = arrayValue(body.targetAudienceIds);
  const errors = validateBroadcast({ title, content, channel, audience, status, scheduledAt });
  if (errors.length) return NextResponse.json({ error: errors.join("; "), errors }, { status: 400 });
  const selectedRecipients = await recipients(tenantDb, audience, audienceIds);
  if (!selectedRecipients.length && status !== "draft") return NextResponse.json({ error: "No eligible recipients found for this audience" }, { status: 400 });
  const id = `broadcast_${crypto.randomUUID()}`;
  await tenantDb.execute(sql`
    insert into broadcasts (id, created_by, title, content, channel, target_audience, target_audience_ids, status, scheduled_at, sent_at, metadata, created_at, updated_at)
    values (${id}, ${admin.userId}, ${title}, ${content}, ${channel}, ${audience}, ${JSON.stringify(audienceIds)}::jsonb, ${status}, ${scheduledAt ? new Date(scheduledAt) : null}, ${status === "sent" ? new Date() : null}, ${JSON.stringify({ adminScoped: true, excludesOwner: true, recipientCount: selectedRecipients.length, smsCount: smsCount(content) })}::jsonb, now(), now())
  `);
  await createDeliveries(tenantDb, id, selectedRecipients, channel, status, content);
  await writeTenantAuditLog({ db: tenantDb, request, actorId: admin.userId, action: "admin.broadcast.created", resource: "broadcasts", resourceId: id, changes: { title, channel, audience, status, recipients: selectedRecipients.length, excludesOwner: true } }).catch(() => undefined);
  return NextResponse.json(await buildPayload(request, slug), { headers: { "Cache-Control": "no-store, max-age=0" } });
}

export async function PATCH(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("tenant")?.trim().toLowerCase() || "";
  if (!slug) return NextResponse.json({ error: "Tenant slug is required" }, { status: 400 });
  const admin = await requireTenantAdmin(request, slug);
  if (isTenantAdminResponse(admin)) return admin;
  const tenantDb = await getTenantDbBySlug(slug);
  const body = await request.json().catch(() => ({}));
  const id = asString(body.id);
  const action = asString(body.action);
  if (!id) return NextResponse.json({ error: "Broadcast ID is required" }, { status: 400 });
  const [current] = await safeRows<Row>(() => tenantDb.execute(sql`select * from broadcasts where id = ${id} limit 1`), "current broadcast");
  if (!current) return NextResponse.json({ error: "Broadcast not found" }, { status: 404 });
  if (action === "send_now") {
    if (asString(current.status) === "sent") return NextResponse.json({ error: "Broadcast has already been sent" }, { status: 400 });
    const selectedRecipients = await recipients(tenantDb, asString(current.target_audience, "all"), arrayValue(current.target_audience_ids));
    await tenantDb.execute(sql`delete from broadcast_deliveries where broadcast_id = ${id}`);
    await createDeliveries(tenantDb, id, selectedRecipients, asString(current.channel), "sent", asString(current.content));
    await tenantDb.execute(sql`update broadcasts set status = 'sent', sent_at = now(), updated_at = now() where id = ${id}`);
    await writeTenantAuditLog({ db: tenantDb, request, actorId: admin.userId, action: "admin.broadcast.sent", resource: "broadcasts", resourceId: id, changes: { recipients: selectedRecipients.length } }).catch(() => undefined);
    return NextResponse.json(await buildPayload(request, slug), { headers: { "Cache-Control": "no-store, max-age=0" } });
  }
  return NextResponse.json({ error: "Unsupported broadcast action" }, { status: 400 });
}

export async function DELETE(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("tenant")?.trim().toLowerCase() || "";
  const id = request.nextUrl.searchParams.get("id")?.trim() || "";
  if (!slug) return NextResponse.json({ error: "Tenant slug is required" }, { status: 400 });
  if (!id) return NextResponse.json({ error: "Broadcast ID is required" }, { status: 400 });
  const admin = await requireTenantAdmin(request, slug);
  if (isTenantAdminResponse(admin)) return admin;
  const tenantDb = await getTenantDbBySlug(slug);
  const [current] = await safeRows<Row>(() => tenantDb.execute(sql`select * from broadcasts where id = ${id} limit 1`), "delete broadcast");
  if (!current) return NextResponse.json({ error: "Broadcast not found" }, { status: 404 });
  await tenantDb.execute(sql`delete from broadcasts where id = ${id}`);
  await writeTenantAuditLog({ db: tenantDb, request, actorId: admin.userId, action: "admin.broadcast.deleted", resource: "broadcasts", resourceId: id, changes: normalizeBroadcast(current) }).catch(() => undefined);
  return NextResponse.json(await buildPayload(request, slug), { headers: { "Cache-Control": "no-store, max-age=0" } });
}
