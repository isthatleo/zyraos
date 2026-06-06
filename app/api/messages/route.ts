import { NextRequest, NextResponse } from "next/server";
import { sql } from "drizzle-orm";

import { getRequiredDashboardUser, isNextResponse, newId, type DashboardDbUser } from "@/lib/dashboard-db";
import { db } from "@/lib/db";
import { getCurrentMasterAdmin } from "@/lib/master-audit";
import { allowedMessagingRolesFor, canDashboardUserMessage, isPlatformMessagingAdmin } from "@/lib/message-policy";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type DbUser = { id: string; fullName: string; email: string; role: string; avatar?: string | null };
type JoanMessage = {
  id: string;
  message: string;
  createdAt: string;
  read: boolean;
  senderId: string;
  type?: string;
  callType?: "audio" | "video";
  callStatus?: string;
  durationSeconds?: number;
  missed?: boolean;
  sender: DbUser;
  receiver: DbUser;
};

const CALL_EVENT_PREFIX = "__call_event__:";
type ParsedMessageContent = Pick<JoanMessage, "message" | "type" | "callType" | "callStatus" | "durationSeconds" | "missed">;

function parseMessageContent(content: unknown): ParsedMessageContent {
  const raw = String(content || "");
  if (!raw.startsWith(CALL_EVENT_PREFIX)) {
    return { message: raw, type: "direct" };
  }

  try {
    const payload = JSON.parse(raw.slice(CALL_EVENT_PREFIX.length)) as {
      message?: string;
      callType?: "audio" | "video";
      callStatus?: string;
      durationSeconds?: number;
      missed?: boolean;
    };
    return {
      message: payload.message || "Call",
      type: "call_event",
      callType: payload.callType === "video" ? "video" : "audio" as "audio",
      callStatus: payload.callStatus || "answered",
      durationSeconds: Number.isFinite(Number(payload.durationSeconds)) ? Number(payload.durationSeconds) : 0,
      missed: Boolean(payload.missed),
    };
  } catch {
    return { message: "Call", type: "call_event", callType: "audio", callStatus: "unknown" };
  }
}

function toJoanUser(row: { id: string; name: string; email: string; role: string; image?: string | null }): DbUser {
  return {
    id: row.id,
    fullName: row.name,
    email: row.email,
    role: row.role,
    avatar: row.image || null,
  };
}

async function ensurePlatformContact(userId: string) {
  const result = await db.execute(sql`
    select id, coalesce(name, email) as name, email, coalesce(role, 'super_admin') as role, image
    from "user"
    where id = ${userId}
      and coalesce(role, '') in ('master', 'super_admin')
    limit 1
  `).catch(() => ({ rows: [] as unknown[] }));
  const row = result.rows[0] as { id?: string; name?: string; email?: string; role?: string; image?: string | null } | undefined;
  if (!row?.id || !row.email) return null;
  const role = row.role || "super_admin";
  await db.execute(sql`
    insert into roles (id, name, description, is_system, created_at, updated_at)
    values (${role}, ${role.replace(/_/g, " ")}, 'Platform messaging contact', true, now(), now())
    on conflict (id) do nothing
  `).catch(() => undefined);
  await db.execute(sql`
    insert into users (id, email, email_verified, name, image, role_id, is_active, created_at, updated_at)
    values (${row.id}, ${row.email}, true, ${row.name || row.email}, ${row.image || null}, ${role}, true, now(), now())
    on conflict (id) do update set email = excluded.email, name = excluded.name, image = excluded.image, role_id = excluded.role_id, is_active = true, updated_at = now()
  `).catch(() => undefined);
  return toJoanUser({ id: row.id, name: row.name || row.email, email: row.email, role, image: row.image });
}

async function ensurePlatformContactsForRole(role: string) {
  if (!["school_admin", "owner"].includes(role)) return;
  const admins = await safeExecute<{ id: string; name: string | null; email: string; role: string | null; image?: string | null }>(sql`
    select id, coalesce(name, email) as name, email, coalesce(role, 'super_admin') as role, image
    from "user"
    where coalesce(role, '') in ('master', 'super_admin')
    order by email asc
    limit 25
  `, "platform contacts");
  for (const admin of admins) {
    await ensurePlatformContact(admin.id);
  }
}

async function writeMessageAudit(actorId: string, action: string, resourceId: string, changes: Record<string, unknown> = {}) {
  await db.execute(sql`
    insert into audit_logs (id, admin_id, action, resource, resource_id, changes, status, created_at)
    values (${newId("audit")}, ${actorId}, ${action}, 'messages', ${resourceId}, ${JSON.stringify(changes)}::jsonb, 'success', now())
  `).catch(() => undefined);
}

function roleInSql(column: ReturnType<typeof sql>, roles: string[]) {
  if (!roles.length) return sql`true`;
  return sql`${column} in (${sql.join(roles.map((role) => sql`${role}`), sql`, `)})`;
}

async function canMessageUser(currentUser: DashboardDbUser, otherUserId: string) {
  return canDashboardUserMessage(currentUser, otherUserId);
}

async function safeExecute<T = Record<string, unknown>>(query: ReturnType<typeof sql>, label: string): Promise<T[]> {
  try {
    const result = await db.execute(query);
    return (result.rows || []) as T[];
  } catch (error) {
    console.warn(`Messages ${label} query skipped:`, error instanceof Error ? error.message : error);
    return [];
  }
}

async function getUser(userId: string) {
  const result = await db.execute(sql`
    select id, name, email, role_id as role, image
    from users
    where id = ${userId}
      and is_active = true
    limit 1
  `);
  const row = result.rows[0] as { id: string; name: string; email: string; role: string; image?: string | null } | undefined;
  return row ? toJoanUser(row) : ensurePlatformContact(userId);
}

async function findOrCreateDirectConversation(currentUserId: string, otherUserId: string) {
  const existing = await db.execute(sql`
    select c.id
    from conversations c
    join conversation_members cm1 on cm1.conversation_id = c.id and cm1.user_id = ${currentUserId} and cm1.left_at is null
    join conversation_members cm2 on cm2.conversation_id = c.id and cm2.user_id = ${otherUserId} and cm2.left_at is null
    where c.type = 'direct'
      and c.is_archived = false
    limit 1
  `);

  const existingId = (existing.rows[0] as { id?: string } | undefined)?.id;
  if (existingId) return existingId;

  const conversationId = newId("conv");
  await db.execute(sql`
    insert into conversations (id, type, name, created_by, is_archived, created_at, updated_at)
    values (${conversationId}, 'direct', null, ${currentUserId}, false, now(), now())
  `);
  await db.execute(sql`
    insert into conversation_members (id, conversation_id, user_id, role, joined_at)
    values
      (${newId("member")}, ${conversationId}, ${currentUserId}, 'owner', now()),
      (${newId("member")}, ${conversationId}, ${otherUserId}, 'member', now())
    on conflict (conversation_id, user_id) do nothing
  `);

  return conversationId;
}

async function getPairMessages(currentUserId: string, otherUserId: string) {
  const conversationId = await findOrCreateDirectConversation(currentUserId, otherUserId);
  const result = await db.execute(sql`
    select
      m.id,
      m.sender_id as "senderId",
      m.content as message,
      m.created_at as "createdAt",
      sender.id as "senderUserId",
      sender.name as "senderName",
      sender.email as "senderEmail",
      sender.role_id as "senderRole",
      sender.image as "senderImage",
      receiver.id as "receiverUserId",
      receiver.name as "receiverName",
      receiver.email as "receiverEmail",
      receiver.role_id as "receiverRole",
      receiver.image as "receiverImage",
      exists (
        select 1 from message_read_status mrs
        where mrs.message_id = m.id and mrs.user_id = ${currentUserId}
      ) as read
    from messages m
    join conversation_members receiver_member
      on receiver_member.conversation_id = m.conversation_id
      and receiver_member.user_id <> m.sender_id
      and receiver_member.left_at is null
    join users sender on sender.id = m.sender_id
    join users receiver on receiver.id = receiver_member.user_id
    where m.conversation_id = ${conversationId}
    order by m.created_at asc
  `);

  const messages = result.rows.map((row) => {
    const item = row as Record<string, unknown>;
    const parsedContent = parseMessageContent(item.message);
    return {
      id: String(item.id),
      ...parsedContent,
      createdAt: new Date(String(item.createdAt)).toISOString(),
      read: Boolean(item.read),
      senderId: String(item.senderId),
      sender: {
        id: String(item.senderUserId),
        fullName: String(item.senderName || item.senderEmail || "User"),
        email: String(item.senderEmail || ""),
        role: String(item.senderRole || "user"),
        avatar: (item.senderImage as string | null) || null,
      },
      receiver: {
        id: String(item.receiverUserId),
        fullName: String(item.receiverName || item.receiverEmail || "User"),
        email: String(item.receiverEmail || ""),
        role: String(item.receiverRole || "user"),
        avatar: (item.receiverImage as string | null) || null,
      },
    } satisfies JoanMessage;
  });

  return { conversationId, messages };
}

async function getConversations(currentUser: DashboardDbUser) {
  const allowedRoles = allowedMessagingRolesFor(currentUser.role);
  const result = await db.execute(sql`
    select distinct on (other_user.id)
      c.id as "conversationId",
      c.updated_at as "conversationUpdatedAt",
      other_user.id as "otherUserId",
      other_user.name as "otherName",
      other_user.email as "otherEmail",
      other_user.role_id as "otherRole",
      other_user.image as "otherImage",
      last_message.id as "lastMessageId",
      last_message.content as "lastMessageContent",
      last_message.sender_id as "lastMessageSenderId",
      last_message.created_at as "lastMessageCreatedAt",
      exists (
        select 1 from message_read_status mrs
        where mrs.message_id = last_message.id and mrs.user_id = ${currentUser.id}
      ) as "lastMessageRead",
      (
        select count(*)::int
        from messages unread_message
        where unread_message.conversation_id = c.id
          and unread_message.sender_id <> ${currentUser.id}
          and not exists (
            select 1 from message_read_status unread_read
            where unread_read.message_id = unread_message.id and unread_read.user_id = ${currentUser.id}
          )
      ) as "unreadCount"
    from conversations c
    join conversation_members self_member on self_member.conversation_id = c.id and self_member.user_id = ${currentUser.id} and self_member.left_at is null
    join conversation_members other_member on other_member.conversation_id = c.id and other_member.user_id <> ${currentUser.id} and other_member.left_at is null
    join users other_user on other_user.id = other_member.user_id
    left join lateral (
      select id, content, sender_id, created_at
      from messages m
      where m.conversation_id = c.id
      order by m.created_at desc
      limit 1
    ) last_message on true
    where c.type = 'direct'
      and c.is_archived = false
      and (
        ${!isPlatformMessagingAdmin(currentUser.role)}
        or ${roleInSql(sql`other_user.role_id`, allowedRoles)}
      )
      and (
        ${currentUser.role !== "owner"}
        or ${roleInSql(sql`other_user.role_id`, allowedRoles)}
      )
    order by other_user.id, c.updated_at desc
  `);

  return result.rows
    .map((row) => {
      const item = row as Record<string, unknown>;
      const user = {
        id: String(item.otherUserId),
        fullName: String(item.otherName || item.otherEmail || "User"),
        email: String(item.otherEmail || ""),
        role: String(item.otherRole || "user"),
        avatar: (item.otherImage as string | null) || null,
      };
      const lastMessage = item.lastMessageId
        ? (() => {
            const parsedContent = parseMessageContent(item.lastMessageContent);
            return {
            id: String(item.lastMessageId),
            ...parsedContent,
            content: parsedContent.message,
            createdAt: new Date(String(item.lastMessageCreatedAt)).toISOString(),
            read: Boolean(item.lastMessageRead),
            senderId: String(item.lastMessageSenderId),
            };
          })()
        : {
            id: String(item.conversationId),
            message: "No messages yet",
            content: "No messages yet",
            createdAt: new Date(String(item.conversationUpdatedAt)).toISOString(),
            read: true,
            senderId: currentUser.id,
            type: "direct",
          };

      return {
        id: user.id,
        name: user.fullName || user.email,
        members: [{ id: user.id, name: user.fullName || user.email, email: user.email, image: user.avatar }],
        user,
        lastMessage,
        unreadCount: Number(item.unreadCount || 0),
      };
    })
    .sort((a, b) => new Date(b.lastMessage.createdAt).getTime() - new Date(a.lastMessage.createdAt).getTime());
}

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getRequiredDashboardUser(request.headers);
    if (isNextResponse(currentUser)) {
      const masterAdmin = await getCurrentMasterAdmin(request);
      if (!masterAdmin) return currentUser;
      const { searchParams } = new URL(request.url);
      const type = searchParams.get("type") || "conversations";
      const masterUser = {
        id: masterAdmin.adminId,
        tenantId: null,
        fullName: masterAdmin.name,
        email: masterAdmin.email,
        role: "super_admin",
        avatar: null,
      };
      if (type === "unread") return NextResponse.json({ unreadCount: 0, latestConversationId: null, conversations: [], currentUser: masterUser }, { headers: { "Cache-Control": "no-store, max-age=0" } });
      if (type === "self") return NextResponse.json({ currentUser: masterUser }, { headers: { "Cache-Control": "no-store, max-age=0" } });
      if (type === "available-users") return NextResponse.json({ users: [], currentUser: masterUser }, { headers: { "Cache-Control": "no-store, max-age=0" } });
      return NextResponse.json({ conversations: [], currentUser: masterUser }, { headers: { "Cache-Control": "no-store, max-age=0" } });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "conversations";

    if (type === "self") {
      return NextResponse.json(
        { currentUser: { id: currentUser.id, tenantId: null, fullName: currentUser.name, email: currentUser.email, role: currentUser.role, avatar: currentUser.image } },
        { headers: { "Cache-Control": "no-store, max-age=0" } }
      );
    }

    if (type === "available-users") {
      await ensurePlatformContactsForRole(currentUser.role);
      const search = `%${(searchParams.get("search") || "").toLowerCase()}%`;
      const allowedRoles = allowedMessagingRolesFor(currentUser.role);
      const tenantUsers = await safeExecute<{ id: string; name: string; email: string; role: string; image?: string | null }>(sql`
        select id, name, email, role_id as role, image
        from users
        where id <> ${currentUser.id}
          and is_active = true
          and ${roleInSql(sql`role_id`, allowedRoles)}
          and (lower(coalesce(name, '')) like ${search} or lower(coalesce(email, '')) like ${search})
        order by name asc
        limit 50
      `, "tenant available users");
      const authUsers = await safeExecute<{ id: string; name: string | null; email: string; role: string | null; image?: string | null }>(sql`
        select id, coalesce(name, email) as name, email, role, image
        from "user"
        where id <> ${currentUser.id}
          and coalesce(role, 'user') <> 'user'
          and ${roleInSql(sql`coalesce(role, 'user')`, allowedRoles)}
          and (lower(coalesce(name, '')) like ${search} or lower(coalesce(email, '')) like ${search})
        order by name asc
        limit 50
      `, "auth available users");
      const byId = new Map<string, DbUser>();
      for (const row of [...tenantUsers, ...authUsers]) {
        byId.set(row.id, toJoanUser({ id: row.id, name: row.name || row.email, email: row.email, role: row.role || "user", image: row.image }));
      }
      return NextResponse.json({ users: Array.from(byId.values()), currentUser }, { headers: { "Cache-Control": "no-store, max-age=0" } });
    }

    if (type === "unread") {
      const conversations = (await getConversations(currentUser)).filter((conversation) => conversation.unreadCount > 0).slice(0, 8);
      return NextResponse.json(
        {
          unreadCount: conversations.reduce((total, conversation) => total + conversation.unreadCount, 0),
          latestConversationId: conversations[0]?.id,
          conversations,
          currentUser,
        },
        { headers: { "Cache-Control": "no-store, max-age=0" } }
      );
    }

    if (type === "chat") {
      const otherUserId = searchParams.get("otherUserId") || searchParams.get("userId");
      if (!otherUserId) return NextResponse.json({ error: "otherUserId is required" }, { status: 400 });
      if (!(await canMessageUser(currentUser, otherUserId))) {
        return NextResponse.json({ error: "Your role cannot message this user." }, { status: 403 });
      }
      const otherUser = await getUser(otherUserId);
      if (!otherUser) return NextResponse.json({ error: "User not found" }, { status: 404 });
      const { messages } = await getPairMessages(currentUser.id, otherUserId);
      return NextResponse.json({ messages, otherUser, currentUser }, { headers: { "Cache-Control": "no-store, max-age=0" } });
    }

    const conversations = await getConversations(currentUser);
    return NextResponse.json({ conversations, currentUser }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    console.error("Messages GET failed:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to load messages" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const currentUser = await getRequiredDashboardUser(request.headers);
  if (isNextResponse(currentUser)) return currentUser;

  const body = await request.json().catch(() => ({}));
  const receiverId = String(body.receiverId || body.otherUserId || "");
  const content = String(body.message || body.content || "").trim();

  if (!receiverId) return NextResponse.json({ error: "Receiver is required" }, { status: 400 });
  if (!content) return NextResponse.json({ error: "Message cannot be empty" }, { status: 400 });
  if (!(await canMessageUser(currentUser, receiverId))) {
    return NextResponse.json({ error: "Your role cannot message this user." }, { status: 403 });
  }

  const receiver = await getUser(receiverId);
  if (!receiver) return NextResponse.json({ error: "Receiver not found" }, { status: 404 });

  const conversationId = await findOrCreateDirectConversation(currentUser.id, receiverId);
  const messageId = newId("msg");
  await db.execute(sql`
    insert into messages (id, conversation_id, sender_id, content, attachments, is_edited, created_at)
    values (${messageId}, ${conversationId}, ${currentUser.id}, ${content}, '[]'::jsonb, false, now())
  `);
  await db.execute(sql`
    insert into message_read_status (id, message_id, user_id, read_at)
    values (${newId("read")}, ${messageId}, ${currentUser.id}, now())
    on conflict (message_id, user_id) do nothing
  `);
  await db.execute(sql`update conversations set updated_at = now() where id = ${conversationId}`);
  await writeMessageAudit(currentUser.id, "admin.message.sent", messageId, { receiverId, conversationId, role: currentUser.role });

  const sender = { id: currentUser.id, fullName: currentUser.name, email: currentUser.email, role: currentUser.role, avatar: currentUser.image || null };
  return NextResponse.json(
    {
      message: {
        id: messageId,
        message: content,
        createdAt: new Date().toISOString(),
        read: false,
        senderId: currentUser.id,
        type: "direct",
        sender,
        receiver,
      },
    },
    { status: 201, headers: { "Cache-Control": "no-store, max-age=0" } }
  );
}
