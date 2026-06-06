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
const OWNER_ROLES = new Set(["owner", "tenant_owner"]);

function stringValue(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function numberValue(value: unknown) {
  const next = Number(value ?? 0);
  return Number.isFinite(next) ? next : 0;
}

function arrayValue(value: unknown) {
  return Array.isArray(value) ? value : [];
}

function isoDate(value: unknown) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

async function rows(db: QueryableDb, query: ReturnType<typeof sql>, fallback: Row[] = []) {
  try {
    const result = await db.execute(query);
    return (result.rows || []) as Row[];
  } catch (error) {
    console.warn("Admin communications query skipped:", error instanceof Error ? error.message : error);
    return fallback;
  }
}

async function first(db: QueryableDb, query: ReturnType<typeof sql>, fallback: Row = {}) {
  const result = await rows(db, query, [fallback]);
  return result[0] || fallback;
}

function resolveSlug(request: NextRequest) {
  return request.nextUrl.searchParams.get("slug")?.trim() || getTenantSubdomain(request.headers.get("host")) || "";
}

async function resolveContext(request: NextRequest) {
  const slug = resolveSlug(request);
  if (!slug) return { response: NextResponse.json({ error: "Tenant slug is required" }, { status: 400 }) };
  const schoolResult = await masterDb.execute(sql`
    select id, name, slug, type, database_url
    from schools
    where slug = ${slug}
    limit 1
  `);
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
  if (!ALLOWED_ROLES.has(role)) return { response: NextResponse.json({ error: "Only owners and school admins can manage communications" }, { status: 403 }) };
  return {
    slug,
    school,
    tenantDb,
    actor: {
      id: stringValue(tenantUser.id, session.user.id),
      name: stringValue(tenantUser.name, session.user.name || session.user.email),
      email: stringValue(tenantUser.email, session.user.email),
      role,
    },
  };
}

async function audit(ctx: { tenantDb: QueryableDb; actor: { id: string; email: string; name: string; role: string } }, request: NextRequest, action: string, resourceId?: string, changes: Row = {}) {
  await writeTenantAuditLog({
    db: ctx.tenantDb,
    request,
    actorId: ctx.actor.id,
    action,
    resource: "communications",
    resourceId,
    changes: { ...changes, actorEmail: ctx.actor.email, actorName: ctx.actor.name, actorRole: ctx.actor.role },
  }).catch(() => undefined);
}

async function ensurePlatformContacts(ctx: { tenantDb: QueryableDb }) {
  const admins = await masterDb.execute(sql`select id, email, name from platform_admins order by created_at asc limit 10`).then((result) => result.rows as Row[]).catch(() => []);
  if (!admins.length) return;
  await ctx.tenantDb.execute(sql`
    insert into roles (id, name, description, is_system, created_at, updated_at)
    values ('platform_admin', 'Platform Admin', 'Platform super administrator contact', true, now(), now())
    on conflict (id) do nothing
  `);
  for (const admin of admins) {
    await ctx.tenantDb.execute(sql`
      insert into users (id, email, email_verified, name, role_id, is_active, created_at, updated_at)
      values (${stringValue(admin.id)}, ${stringValue(admin.email)}, true, ${stringValue(admin.name, stringValue(admin.email))}, 'platform_admin', true, now(), now())
      on conflict (id) do update set email = excluded.email, name = excluded.name, role_id = 'platform_admin', is_active = true, updated_at = now()
    `);
  }
}

async function getUsers(db: QueryableDb, includeOwners = true) {
  const userRows = await rows(db, sql`
    select u.id, u.name, u.email, u.image, u.role_id, u.is_active, r.name as role_name,
      coalesce(s.phone, g.phone, '') as phone
    from users u
    left join roles r on r.id = u.role_id
    left join students s on s.user_id = u.id
    left join guardians g on g.email = u.email
    where u.is_active = true
      and (${includeOwners} = true or lower(u.role_id) not in ('owner', 'tenant_owner'))
    order by lower(u.name) asc
  `);
  return userRows.map((row) => ({
    id: stringValue(row.id),
    name: stringValue(row.name, stringValue(row.email)),
    email: stringValue(row.email),
    phone: stringValue(row.phone),
    role: normalizeRole(stringValue(row.role_id) || stringValue(row.role_name)),
    image: stringValue(row.image),
    isOwner: OWNER_ROLES.has(normalizeRole(stringValue(row.role_id) || stringValue(row.role_name))),
  }));
}

async function buildPayload(ctx: { tenantDb: QueryableDb; school: Row; actor: { id: string } }) {
  await ensurePlatformContacts(ctx);
  const [allUsers, nonOwnerUsers, conversationRows, broadcastRows, announcementRows, deliveryRows] = await Promise.all([
    getUsers(ctx.tenantDb, true),
    getUsers(ctx.tenantDb, false),
    rows(ctx.tenantDb, sql`
      select c.id, c.type, c.name, c.created_by, c.created_at, max(m.created_at) as last_message_at,
        count(m.id)::int as message_count
      from conversations c
      join conversation_members cm on cm.conversation_id = c.id and cm.user_id = ${ctx.actor.id} and cm.left_at is null
      left join messages m on m.conversation_id = c.id
      where c.is_archived = false
      group by c.id
      order by max(m.created_at) desc nulls last, c.created_at desc
      limit 100
    `),
    rows(ctx.tenantDb, sql`
      select b.*, u.name as created_by_name,
        count(d.id)::int as delivery_count,
        count(d.id) filter (where lower(d.status) in ('sent','delivered'))::int as sent_count,
        count(d.id) filter (where lower(d.status) = 'failed')::int as failed_count,
        count(d.id) filter (where lower(d.status) = 'pending')::int as pending_count
      from broadcasts b
      left join users u on u.id = b.created_by
      left join broadcast_deliveries d on d.broadcast_id = b.id
      group by b.id, u.name
      order by b.created_at desc
      limit 200
    `),
    rows(ctx.tenantDb, sql`
      select a.*, u.name as author_name
      from announcements a
      left join users u on u.id = a.author_id
      order by a.created_at desc
      limit 200
    `),
    rows(ctx.tenantDb, sql`
      select d.*, b.title, b.channel, b.created_at as broadcast_created_at, u.name as user_name, u.role_id
      from broadcast_deliveries d
      left join broadcasts b on b.id = d.broadcast_id
      left join users u on u.id = d.user_id
      order by d.created_at desc
      limit 500
    `),
  ]);

  const conversations = await Promise.all(conversationRows.map(async (row) => {
    const members = await rows(ctx.tenantDb, sql`
      select u.id, u.name, u.email, u.role_id from conversation_members cm
      join users u on u.id = cm.user_id
      where cm.conversation_id = ${stringValue(row.id)}
      order by u.name asc
    `);
    const messages = await rows(ctx.tenantDb, sql`
      select m.*, u.name as sender_name
      from messages m
      left join users u on u.id = m.sender_id
      where m.conversation_id = ${stringValue(row.id)}
      order by m.created_at asc
      limit 100
    `);
    return {
      id: stringValue(row.id),
      type: stringValue(row.type),
      name: stringValue(row.name),
      createdAt: isoDate(row.created_at),
      lastMessageAt: isoDate(row.last_message_at),
      messageCount: numberValue(row.message_count),
      members: members.map((m) => ({ id: stringValue(m.id), name: stringValue(m.name), email: stringValue(m.email), role: stringValue(m.role_id) })),
      messages: messages.map((m) => ({ id: stringValue(m.id), senderId: stringValue(m.sender_id), senderName: stringValue(m.sender_name), content: stringValue(m.content), createdAt: isoDate(m.created_at), attachments: arrayValue(m.attachments) })),
    };
  }));

  return {
    generatedAt: new Date().toISOString(),
    school: { id: stringValue(ctx.school.id), name: stringValue(ctx.school.name), slug: stringValue(ctx.school.slug) },
    users: allUsers,
    broadcastRecipients: nonOwnerUsers,
    conversations,
    broadcasts: broadcastRows.map((row) => ({
      id: stringValue(row.id), title: stringValue(row.title), content: stringValue(row.content), channel: stringValue(row.channel),
      targetAudience: stringValue(row.target_audience), status: stringValue(row.status), scheduledAt: isoDate(row.scheduled_at),
      sentAt: isoDate(row.sent_at), createdAt: isoDate(row.created_at), createdByName: stringValue(row.created_by_name),
      deliveryCount: numberValue(row.delivery_count), sentCount: numberValue(row.sent_count), failedCount: numberValue(row.failed_count), pendingCount: numberValue(row.pending_count),
    })),
    announcements: announcementRows.map((row) => ({ id: stringValue(row.id), title: stringValue(row.title), content: stringValue(row.content), authorName: stringValue(row.author_name), targetRoles: arrayValue(row.target_roles), isPublished: Boolean(row.is_published), publishDate: isoDate(row.publish_date), expiryDate: isoDate(row.expiry_date), createdAt: isoDate(row.created_at) })),
    smsReports: deliveryRows.map((row) => ({ id: stringValue(row.id), broadcastId: stringValue(row.broadcast_id), title: stringValue(row.title), channel: stringValue(row.channel), userName: stringValue(row.user_name), role: stringValue(row.role_id), phone: stringValue(row.phone), email: stringValue(row.email), status: stringValue(row.status), error: stringValue(row.delivery_error), deliveredAt: isoDate(row.delivered_at), failedAt: isoDate(row.failed_at), createdAt: isoDate(row.created_at) })),
  };
}

async function resolveRecipients(ctx: { tenantDb: QueryableDb }, audience: string, ids: string[] = []) {
  const users = await getUsers(ctx.tenantDb, false);
  if (audience === "custom" && ids.length) return users.filter((user) => ids.includes(user.id));
  if (audience === "students") return users.filter((u) => ["student", "learner", "pupil"].includes(u.role));
  if (audience === "parents") return users.filter((u) => ["parent", "guardian"].includes(u.role));
  if (audience === "teachers") return users.filter((u) => ["teacher", "lecturer", "professor"].includes(u.role));
  if (audience === "staff") return users.filter((u) => !["student", "learner", "pupil", "parent", "guardian"].includes(u.role));
  return users;
}

export async function GET(request: NextRequest) {
  const context = await resolveContext(request);
  if ("response" in context) return context.response;
  return NextResponse.json(await buildPayload(context));
}

export async function POST(request: NextRequest) {
  const context = await resolveContext(request);
  if ("response" in context) return context.response;
  const body = await request.json().catch(() => ({} as Row));
  const action = stringValue(body.action);

  if (action === "message.send") {
    const recipientIds = arrayValue(body.recipientIds).map((id) => String(id)).filter(Boolean);
    const content = stringValue(body.content);
    if (!recipientIds.length || !content) return NextResponse.json({ error: "Recipient and message are required" }, { status: 400 });
    const conversationId = stringValue(body.conversationId) || `conv_${crypto.randomUUID()}`;
    if (!body.conversationId) {
      await context.tenantDb.execute(sql`insert into conversations (id, type, name, created_by, is_archived, created_at, updated_at) values (${conversationId}, ${recipientIds.length > 1 ? "group" : "direct"}, ${stringValue(body.name) || null}, ${context.actor.id}, false, now(), now())`);
      for (const userId of Array.from(new Set([context.actor.id, ...recipientIds]))) {
        await context.tenantDb.execute(sql`insert into conversation_members (id, conversation_id, user_id, role, joined_at) values (${`cm_${crypto.randomUUID()}`}, ${conversationId}, ${userId}, ${userId === context.actor.id ? "owner" : "member"}, now()) on conflict (conversation_id, user_id) do nothing`);
      }
    }
    const messageId = `msg_${crypto.randomUUID()}`;
    await context.tenantDb.execute(sql`insert into messages (id, conversation_id, sender_id, content, attachments, is_edited, created_at) values (${messageId}, ${conversationId}, ${context.actor.id}, ${content}, ${JSON.stringify(arrayValue(body.attachments))}::jsonb, false, now())`);
    await audit(context, request, "message.send", messageId, { conversationId, recipients: recipientIds.length });
  } else if (action === "broadcast.create") {
    const title = stringValue(body.title);
    const content = stringValue(body.content);
    const channel = stringValue(body.channel, "in-app");
    const targetAudience = stringValue(body.targetAudience, "all");
    if (!title || !content) return NextResponse.json({ error: "Title and content are required" }, { status: 400 });
    const recipients = await resolveRecipients(context, targetAudience, arrayValue(body.targetAudienceIds).map(String));
    const id = `broadcast_${crypto.randomUUID()}`;
    const status = stringValue(body.status, "sent");
    await context.tenantDb.execute(sql`
      insert into broadcasts (id, created_by, title, content, channel, target_audience, target_audience_ids, status, scheduled_at, sent_at, metadata, created_at, updated_at)
      values (${id}, ${context.actor.id}, ${title}, ${content}, ${channel}, ${targetAudience}, ${JSON.stringify(arrayValue(body.targetAudienceIds))}::jsonb, ${status}, ${stringValue(body.scheduledAt) ? new Date(stringValue(body.scheduledAt)) : null}, ${status === "sent" ? new Date() : null}, ${JSON.stringify({ adminScoped: true, excludesOwner: true, recipientCount: recipients.length })}::jsonb, now(), now())
    `);
    for (const user of recipients) {
      await context.tenantDb.execute(sql`insert into broadcast_deliveries (id, broadcast_id, user_id, phone, email, status, delivered_at, metadata, created_at, updated_at) values (${`bd_${crypto.randomUUID()}`}, ${id}, ${user.id}, ${user.phone || null}, ${user.email || null}, ${status === "sent" ? "sent" : "pending"}, ${status === "sent" ? new Date() : null}, ${JSON.stringify({ simulated: true })}::jsonb, now(), now())`);
    }
    await audit(context, request, "broadcast.create", id, { recipients: recipients.length, excludesOwner: true });
  } else if (action === "announcement.create") {
    const title = stringValue(body.title);
    const content = stringValue(body.content);
    if (!title || !content) return NextResponse.json({ error: "Title and content are required" }, { status: 400 });
    const id = `ann_${crypto.randomUUID()}`;
    const roles = arrayValue(body.targetRoles).filter((role) => !OWNER_ROLES.has(normalizeRole(String(role)))).map(String);
    await context.tenantDb.execute(sql`
      insert into announcements (id, title, content, author_id, target_roles, is_published, publish_date, expiry_date, created_at, updated_at)
      values (${id}, ${title}, ${content}, ${context.actor.id}, ${JSON.stringify(roles)}::jsonb, ${Boolean(body.isPublished)}, ${stringValue(body.publishDate) ? new Date(stringValue(body.publishDate)) : null}, ${stringValue(body.expiryDate) ? new Date(stringValue(body.expiryDate)) : null}, now(), now())
    `);
    await audit(context, request, "announcement.create", id, { targetRoles: roles, excludesOwner: true });
  } else {
    return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
  }

  return NextResponse.json({ success: true, ...(await buildPayload(context)) });
}

export async function DELETE(request: NextRequest) {
  const context = await resolveContext(request);
  if ("response" in context) return context.response;
  const type = request.nextUrl.searchParams.get("type") || "";
  const id = request.nextUrl.searchParams.get("id") || "";
  if (!id) return NextResponse.json({ error: "ID is required" }, { status: 400 });
  if (type === "broadcast") await context.tenantDb.execute(sql`delete from broadcasts where id = ${id}`);
  else if (type === "announcement") await context.tenantDb.execute(sql`delete from announcements where id = ${id}`);
  else return NextResponse.json({ error: "Unsupported delete type" }, { status: 400 });
  await audit(context, request, `${type}.delete`, id);
  return NextResponse.json({ success: true, ...(await buildPayload(context)) });
}
