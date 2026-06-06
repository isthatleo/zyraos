import { NextRequest, NextResponse } from "next/server";
import { sql } from "drizzle-orm";

import { getRequiredDashboardUser, isNextResponse } from "@/lib/dashboard-db";
import { db } from "@/lib/db";
import { getCurrentMasterAdmin } from "@/lib/master-audit";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type NotificationRow = {
  id: string;
  type: "message" | "academic" | "billing" | "system" | "alert";
  title: string;
  message: string;
  read: boolean;
  createdAt: string | Date;
  targetUrl?: string | null;
  metadata?: Record<string, unknown>;
};

function normalize(row: NotificationRow) {
  return {
    ...row,
    createdAt: new Date(row.createdAt).toISOString(),
    metadata: row.metadata || {},
  };
}

async function ensureFeedbackNotificationTables() {
  await db.execute(sql`
    create table if not exists notification_reads (
      id text primary key,
      notification_id text not null,
      user_id text not null references users(id) on delete cascade,
      read_at timestamp not null default now(),
      unique(notification_id, user_id)
    )
  `);
  await db.execute(sql`
    create table if not exists user_feedback (
      id text primary key,
      user_id text not null references users(id) on delete cascade,
      title text not null,
      message text not null,
      category text not null default 'feature',
      priority text not null default 'normal',
      status text not null default 'open',
      dashboard_area text,
      metadata jsonb,
      created_at timestamp not null default now(),
      updated_at timestamp not null default now()
    )
  `);
  await db.execute(sql`
    create table if not exists feedback_updates (
      id text primary key,
      feedback_id text not null references user_feedback(id) on delete cascade,
      user_id text not null references users(id) on delete cascade,
      type text not null,
      message text not null,
      state text,
      created_at timestamp not null default now()
    )
  `);
}

export async function GET(request: NextRequest) {
  const currentUser = await getRequiredDashboardUser(request.headers);
  if (isNextResponse(currentUser)) {
    const masterAdmin = await getCurrentMasterAdmin(request);
    if (!masterAdmin) return currentUser;
    const masterUser = {
      id: masterAdmin.adminId,
      name: masterAdmin.name,
      email: masterAdmin.email,
      role: "super_admin",
      image: null,
    };
    const { searchParams } = new URL(request.url);
    if (searchParams.get("countOnly") === "true") {
      return NextResponse.json({ unreadCount: 0, latestNotification: null, currentUser: masterUser }, { headers: { "Cache-Control": "no-store" } });
    }
    return NextResponse.json({ notifications: [], currentUser: masterUser }, { headers: { "Cache-Control": "no-store" } });
  }
  await ensureFeedbackNotificationTables();

  const { searchParams } = new URL(request.url);
  const countOnly = searchParams.get("countOnly") === "true";
  const unreadOnly = searchParams.get("unreadOnly") === "true";

  const result = await db.execute(sql`
    with message_notifications as (
      select
        'msg_' || m.id as id,
        'message' as type,
        'New message from ' || coalesce(sender.name, sender.email) as title,
        m.content as message,
        exists (
          select 1 from message_read_status mrs
          where mrs.message_id = m.id and mrs.user_id = ${currentUser.id}
        ) as read,
        m.created_at as "createdAt",
        '/messages?conversationId=' || m.conversation_id as "targetUrl",
        jsonb_build_object('conversationId', m.conversation_id, 'messageId', m.id) as metadata
      from messages m
      join conversation_members cm on cm.conversation_id = m.conversation_id
      join users sender on sender.id = m.sender_id
      where cm.user_id = ${currentUser.id}
        and cm.left_at is null
        and m.sender_id <> ${currentUser.id}
    ),
    broadcast_notifications as (
      select
        'broadcast_' || bd.id as id,
        case when b.channel = 'sms' then 'alert' else 'system' end as type,
        b.title,
        b.content as message,
        bd.status in ('read') or exists (
          select 1 from notification_reads nr
          where nr.notification_id = 'broadcast_' || bd.id and nr.user_id = ${currentUser.id}
        ) as read,
        coalesce(b.sent_at, b.scheduled_at, b.created_at) as "createdAt",
        null::text as "targetUrl",
        jsonb_build_object('broadcastId', b.id, 'deliveryId', bd.id, 'channel', b.channel) as metadata
      from broadcast_deliveries bd
      join broadcasts b on b.id = bd.broadcast_id
      where bd.user_id = ${currentUser.id}
    ),
    announcement_notifications as (
      select
        'announcement_' || a.id as id,
        'academic' as type,
        a.title,
        a.content as message,
        true as read,
        coalesce(a.publish_date, a.created_at) as "createdAt",
        '/admin/announcements' as "targetUrl",
        jsonb_build_object('announcementId', a.id) as metadata
      from announcements a
      where a.is_published = true
        and (a.expiry_date is null or a.expiry_date > now())
        and (
          a.target_roles is null
          or a.target_roles = '[]'::jsonb
          or a.target_roles ? ${currentUser.role}
        )
    ),
    audit_notifications as (
      select
        'audit_' || al.id as id,
        case when al.status = 'success' then 'system' else 'alert' end as type,
        initcap(replace(al.action, '_', ' ')) as title,
        al.resource || coalesce(' #' || al.resource_id, '') as message,
        true as read,
        al.created_at as "createdAt",
        '/master/activity' as "targetUrl",
        jsonb_build_object('auditLogId', al.id, 'resource', al.resource, 'status', al.status) as metadata
      from audit_logs al
      where al.admin_id = ${currentUser.id}
    ),
    feedback_notifications as (
      select
        'feedback_' || fu.id as id,
        'system' as type,
        case when fu.type = 'reply' then 'Feedback reply: ' || f.title else 'Feedback status: ' || f.title end as title,
        fu.message,
        exists (
          select 1 from notification_reads nr
          where nr.notification_id = 'feedback_' || fu.id and nr.user_id = ${currentUser.id}
        ) as read,
        fu.created_at as "createdAt",
        '/messages?tab=feedback' as "targetUrl",
        jsonb_build_object('feedbackId', f.id, 'feedbackUpdateId', fu.id, 'state', fu.state) as metadata
      from feedback_updates fu
      join user_feedback f on f.id = fu.feedback_id
      where f.user_id = ${currentUser.id}
        and fu.user_id <> ${currentUser.id}
    )
    select * from message_notifications
    union all select * from broadcast_notifications
    union all select * from announcement_notifications
    union all select * from audit_notifications
    union all select * from feedback_notifications
    order by "createdAt" desc
    limit 100
  `);

  const notifications = (result.rows as NotificationRow[]).map(normalize);
  const filtered = unreadOnly ? notifications.filter((notification) => !notification.read) : notifications;
  const unread = notifications.filter((notification) => !notification.read);

  if (countOnly) {
    return NextResponse.json({
      unreadCount: unread.length,
      latestNotification: unread[0] || null,
      currentUser,
    });
  }

  return NextResponse.json({ notifications: filtered, currentUser }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST() {
  return NextResponse.json(
    { error: "Notifications are generated from real system events. Create messages, broadcasts, announcements, or audit logs instead." },
    { status: 405 }
  );
}
