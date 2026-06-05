import { NextRequest, NextResponse } from "next/server";
import { sql } from "drizzle-orm";

import { getRequiredDashboardUser, isNextResponse, newId } from "@/lib/dashboard-db";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function audienceWhere(audience: string) {
  if (audience === "owners") return sql`u.role_id in ('owner')`;
  if (audience === "school_admins") return sql`u.role_id in ('admin', 'school_admin', 'owner')`;
  if (audience === "finance") return sql`u.role_id in ('finance', 'accountant')`;
  if (audience === "staff") return sql`u.role_id in ('staff', 'teacher', 'hr')`;
  return sql`u.is_active = true`;
}

export async function GET(request: NextRequest) {
  const currentUser = await getRequiredDashboardUser(request.headers);
  if (isNextResponse(currentUser)) return currentUser;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const channel = searchParams.get("channel");

  const result = await db.execute(sql`
    select
      b.id,
      b.title,
      b.content,
      b.channel,
      b.target_audience as "targetAudience",
      b.status,
      b.scheduled_at as "scheduledAt",
      b.sent_at as "sentAt",
      b.created_at as "createdAt",
      b.updated_at as "updatedAt",
      b.metadata,
      creator.name as "createdByName",
      count(bd.id)::int as "deliveryCount",
      count(bd.id) filter (where bd.status in ('sent', 'delivered', 'read'))::int as "sentCount",
      count(bd.id) filter (where bd.status = 'failed')::int as "failedCount"
    from broadcasts b
    join users creator on creator.id = b.created_by
    left join broadcast_deliveries bd on bd.broadcast_id = b.id
    where (${status}::text is null or b.status = ${status})
      and (${channel}::text is null or b.channel = ${channel})
    group by b.id, creator.name
    order by b.created_at desc
    limit 100
  `);

  return NextResponse.json({ broadcasts: result.rows, currentUser }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  const currentUser = await getRequiredDashboardUser(request.headers);
  if (isNextResponse(currentUser)) return currentUser;

  const body = await request.json().catch(() => ({}));
  const title = String(body.title || "").trim();
  const content = String(body.content || "").trim();
  const channel = String(body.channel || "in-app");
  const targetAudience = String(body.targetAudience || "all_users");
  const category = String(body.category || "updates");
  const priority = String(body.priority || "normal");
  const scheduledAt = body.scheduledAt ? new Date(String(body.scheduledAt)) : null;

  if (!title || !content) {
    return NextResponse.json({ error: "Title and content are required" }, { status: 400 });
  }

  const recipients = await db.execute(sql`
    select u.id, u.email, u.role_id as role
    from users u
    where ${audienceWhere(targetAudience)}
      and u.id <> ${currentUser.id}
      and u.is_active = true
    order by u.created_at desc
  `);

  const broadcastId = newId("broadcast");
  const status = scheduledAt ? "scheduled" : "sent";

  await db.execute(sql`
    insert into broadcasts (
      id, created_by, title, content, channel, target_audience, target_audience_ids,
      status, scheduled_at, sent_at, metadata, created_at, updated_at
    )
    values (
      ${broadcastId},
      ${currentUser.id},
      ${title},
      ${content},
      ${channel},
      ${targetAudience},
      '[]'::jsonb,
      ${status},
      ${scheduledAt},
      ${scheduledAt ? null : new Date()},
      ${JSON.stringify({ category, priority, recipientCount: recipients.rows.length, characterCount: content.length })}::jsonb,
      now(),
      now()
    )
  `);

  for (const row of recipients.rows as Array<{ id: string; email?: string | null; role?: string }>) {
    await db.execute(sql`
      insert into broadcast_deliveries (
        id, broadcast_id, user_id, phone, email, status, delivered_at, metadata, created_at, updated_at
      )
      values (
        ${newId("delivery")},
        ${broadcastId},
        ${row.id},
        ${null},
        ${row.email || null},
        ${scheduledAt ? "pending" : "delivered"},
        ${scheduledAt ? null : new Date()},
        ${JSON.stringify({ role: row.role, category, priority })}::jsonb,
        now(),
        now()
      )
    `);
  }

  return NextResponse.json({ id: broadcastId, recipientCount: recipients.rows.length, status }, { status: 201 });
}
