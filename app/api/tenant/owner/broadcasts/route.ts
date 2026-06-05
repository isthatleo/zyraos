import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { sql } from "drizzle-orm";

import { getRequiredDashboardUser, isNextResponse } from "@/lib/dashboard-db";
import { getTenantDbBySlug, masterDb } from "@/lib/db";
import { schoolsTable } from "@/lib/db-schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Row = Record<string, unknown>;

const STAFF_AUDIENCE: Record<string, string[]> = {
  all_staff: ["owner", "school_admin", "admin", "teacher", "lecturer", "professor", "accountant", "finance", "librarian", "hr", "canteen", "registrar", "admissions_officer", "exam_officer", "department_head", "class_teacher", "nurse", "transport_manager", "hostel_warden", "security", "procurement", "inventory_manager", "counselor"],
  school_leadership: ["owner", "school_admin", "admin", "registrar", "department_head"],
  teachers: ["teacher", "lecturer", "professor", "class_teacher", "department_head"],
  finance_hr: ["accountant", "finance", "hr"],
  support_staff: ["librarian", "canteen", "nurse", "transport_manager", "hostel_warden", "security", "procurement", "inventory_manager", "counselor"],
};

function asString(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value : fallback;
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

async function safeRows<T = Row>(operation: () => Promise<{ rows?: unknown[] } | T[]>, label: string): Promise<T[]> {
  try {
    const result = await operation();
    if (Array.isArray(result)) return result as T[];
    return (result.rows || []) as T[];
  } catch (error) {
    console.warn(`Owner broadcasts ${label} query skipped:`, error instanceof Error ? error.message : error);
    return [];
  }
}

async function getSchool(slug: string) {
  const [school] = await masterDb
    .select({ id: schoolsTable.id, name: schoolsTable.name, slug: schoolsTable.slug, type: schoolsTable.type, status: schoolsTable.status })
    .from(schoolsTable)
    .where(eq(schoolsTable.slug, slug))
    .limit(1);
  return school;
}

function normalizeAudience(value: unknown) {
  const audience = asString(value, "all_staff");
  return STAFF_AUDIENCE[audience] ? audience : "all_staff";
}

async function ensureTenantUser(tenantDb: Awaited<ReturnType<typeof getTenantDbBySlug>>, user: { id: string; email: string; name: string; role: string; image?: string | null }) {
  await tenantDb.execute(sql`
    insert into roles (id, name, description, is_system, created_at, updated_at)
    values (${user.role}, ${user.role.replace(/_/g, " ")}, ${"Auto-created role for owner broadcasts"}, true, now(), now())
    on conflict (id) do nothing
  `);
  await tenantDb.execute(sql`
    insert into users (id, email, email_verified, name, image, role_id, is_active, created_at, updated_at)
    values (${user.id}, ${user.email}, true, ${user.name}, ${user.image || null}, ${user.role}, true, now(), now())
    on conflict (id) do update set name = excluded.name, image = excluded.image, role_id = excluded.role_id, updated_at = now()
  `);
}

async function getRecipients(tenantDb: Awaited<ReturnType<typeof getTenantDbBySlug>>, audience: string) {
  const roles = STAFF_AUDIENCE[audience] || STAFF_AUDIENCE.all_staff;
  return safeRows<Row>(
    () =>
      tenantDb.execute(sql`
        select id, name, email, role_id, image
        from users
        where is_active = true
          and role_id = any(${roles}::text[])
        order by name asc
      `),
    "recipients"
  );
}

async function buildPayload(slug: string) {
  const school = await getSchool(slug);
  if (!school) return null;
  const tenantDb = await getTenantDbBySlug(slug);

  const [broadcastRows, recipientRows] = await Promise.all([
    safeRows<Row>(
      () =>
        tenantDb.execute(sql`
          select
            b.id,
            b.created_by,
            b.title,
            b.content,
            b.channel,
            b.target_audience,
            b.status,
            b.scheduled_at,
            b.sent_at,
            b.failed_at,
            b.metadata,
            b.created_at,
            b.updated_at,
            u.name as created_by_name,
            count(d.id)::int as delivery_count,
            count(d.id) filter (where lower(d.status) in ('sent', 'delivered'))::int as sent_count,
            count(d.id) filter (where lower(d.status) = 'failed')::int as failed_count,
            count(d.id) filter (where lower(d.status) = 'pending')::int as pending_count
          from broadcasts b
          left join users u on u.id = b.created_by
          left join broadcast_deliveries d on d.broadcast_id = b.id
          where coalesce((b.metadata->>'ownerScoped')::boolean, false) = true
          group by b.id, u.name
          order by b.created_at desc
          limit 200
        `),
      "broadcasts"
    ),
    safeRows<Row>(
      () =>
        tenantDb.execute(sql`
          select role_id, count(*)::int total
          from users
          where is_active = true
            and role_id <> all(${["student", "pupil", "learner", "parent", "guardian"]}::text[])
          group by role_id
          order by total desc
        `),
      "recipient summary"
    ),
  ]);

  const broadcasts = broadcastRows.map((row) => ({
    id: asString(row.id),
    title: asString(row.title),
    content: asString(row.content),
    channel: asString(row.channel, "in-app"),
    targetAudience: asString(row.target_audience, "all_staff"),
    status: asString(row.status, "draft").toLowerCase(),
    scheduledAt: asDate(row.scheduled_at),
    sentAt: asDate(row.sent_at),
    failedAt: asDate(row.failed_at),
    createdAt: asDate(row.created_at),
    updatedAt: asDate(row.updated_at),
    createdByName: asString(row.created_by_name, "Owner"),
    deliveryCount: asNumber(row.delivery_count),
    sentCount: asNumber(row.sent_count),
    failedCount: asNumber(row.failed_count),
    pendingCount: asNumber(row.pending_count),
    metadata: row.metadata || {},
  }));

  return {
    school,
    generatedAt: new Date().toISOString(),
    broadcasts,
    recipientSummary: recipientRows.map((row) => ({ role: asString(row.role_id), total: asNumber(row.total) })),
    summary: {
      total: broadcasts.length,
      sent: broadcasts.filter((item) => item.status === "sent").length,
      scheduled: broadcasts.filter((item) => item.status === "scheduled").length,
      failed: broadcasts.filter((item) => item.status === "failed").length,
      recipients: broadcasts.reduce((sum, item) => sum + item.deliveryCount, 0),
      delivered: broadcasts.reduce((sum, item) => sum + item.sentCount, 0),
      pending: broadcasts.reduce((sum, item) => sum + item.pendingCount, 0),
    },
  };
}

export async function GET(request: NextRequest) {
  try {
    const slug = request.nextUrl.searchParams.get("tenant")?.trim().toLowerCase();
    if (!slug) return NextResponse.json({ error: "Tenant slug is required" }, { status: 400 });
    const payload = await buildPayload(slug);
    if (!payload) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    return NextResponse.json(payload, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    console.error("Owner broadcasts GET failed:", error);
    return NextResponse.json({ error: "Failed to load owner broadcasts" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getRequiredDashboardUser(request.headers);
    if (isNextResponse(currentUser)) return currentUser;
    if (currentUser.role !== "owner") return NextResponse.json({ error: "Only owners can create owner broadcasts" }, { status: 403 });

    const slug = request.nextUrl.searchParams.get("tenant")?.trim().toLowerCase();
    if (!slug) return NextResponse.json({ error: "Tenant slug is required" }, { status: 400 });
    const school = await getSchool(slug);
    if (!school) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

    const body = (await request.json().catch(() => ({}))) as Row;
    const title = asString(body.title).slice(0, 160);
    const content = asString(body.content).slice(0, 5000);
    const channel = ["in-app", "email", "sms"].includes(asString(body.channel)) ? asString(body.channel) : "in-app";
    const targetAudience = normalizeAudience(body.targetAudience);
    const category = asString(body.category, "memo").slice(0, 60);
    const priority = ["low", "normal", "high", "urgent"].includes(asString(body.priority)) ? asString(body.priority) : "normal";
    const scheduledAt = asString(body.scheduledAt);

    if (!title || !content) return NextResponse.json({ error: "Title and message are required" }, { status: 400 });

    const tenantDb = await getTenantDbBySlug(slug);
    await ensureTenantUser(tenantDb, currentUser);
    const recipients = await getRecipients(tenantDb, targetAudience);
    if (!recipients.length) return NextResponse.json({ error: "No staff recipients matched this audience" }, { status: 400 });

    const broadcastId = crypto.randomUUID();
    const status = scheduledAt ? "scheduled" : "sent";
    const sentAt = scheduledAt ? null : new Date();
    await tenantDb.execute(sql`
      insert into broadcasts (id, created_by, title, content, channel, target_audience, target_audience_ids, status, scheduled_at, sent_at, metadata, created_at, updated_at)
      values (
        ${broadcastId},
        ${currentUser.id},
        ${title},
        ${content},
        ${channel},
        ${targetAudience},
        ${JSON.stringify(recipients.map((row) => asString(row.id)))}::jsonb,
        ${status},
        ${scheduledAt ? new Date(scheduledAt) : null},
        ${sentAt},
        ${JSON.stringify({ ownerScoped: true, category, priority, recipientCount: recipients.length, characterCount: content.length, smsCount: Math.ceil(content.length / 160) })}::jsonb,
        now(),
        now()
      )
    `);

    for (const recipient of recipients) {
      await tenantDb.execute(sql`
        insert into broadcast_deliveries (id, broadcast_id, user_id, email, status, delivered_at, metadata, created_at, updated_at)
        values (
          ${crypto.randomUUID()},
          ${broadcastId},
          ${asString(recipient.id)},
          ${asString(recipient.email) || null},
          ${scheduledAt ? "pending" : "sent"},
          ${scheduledAt ? null : new Date()},
          ${JSON.stringify({ channel, role: asString(recipient.role_id), ownerScoped: true })}::jsonb,
          now(),
          now()
        )
      `);
    }

    const payload = await buildPayload(slug);
    return NextResponse.json({ broadcastId, recipientCount: recipients.length, payload }, { status: 201 });
  } catch (error) {
    console.error("Owner broadcasts POST failed:", error);
    return NextResponse.json({ error: "Failed to create owner broadcast" }, { status: 500 });
  }
}
