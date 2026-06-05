import { NextRequest, NextResponse } from "next/server";
import { sql } from "drizzle-orm";

import { getRequiredDashboardUser, isNextResponse, newId } from "@/lib/dashboard-db";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(request: NextRequest) {
  const currentUser = await getRequiredDashboardUser(request.headers);
  if (isNextResponse(currentUser)) return currentUser;

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

  const result = await db.execute(sql`
    select m.id
    from messages m
    join conversation_members cm on cm.conversation_id = m.conversation_id
    where cm.user_id = ${currentUser.id}
      and cm.left_at is null
      and m.sender_id <> ${currentUser.id}
      and not exists (
        select 1 from message_read_status mrs
        where mrs.message_id = m.id and mrs.user_id = ${currentUser.id}
      )
  `);

  for (const row of result.rows as Array<{ id: string }>) {
    await db.execute(sql`
      insert into message_read_status (id, message_id, user_id, read_at)
      values (${newId("read")}, ${row.id}, ${currentUser.id}, now())
      on conflict (message_id, user_id) do nothing
    `);
  }

  await db.execute(sql`
    update broadcast_deliveries
    set status = 'read', updated_at = now()
    where user_id = ${currentUser.id}
  `);

  const derived = await db.execute(sql`
    select 'broadcast_' || id as id from broadcast_deliveries where user_id = ${currentUser.id}
    union all
    select 'feedback_' || fu.id as id
    from feedback_updates fu
    join user_feedback f on f.id = fu.feedback_id
    where f.user_id = ${currentUser.id} and fu.user_id <> ${currentUser.id}
  `);

  for (const row of derived.rows as Array<{ id: string }>) {
    await db.execute(sql`
      insert into notification_reads (id, notification_id, user_id, read_at)
      values (${newId("nread")}, ${row.id}, ${currentUser.id}, now())
      on conflict (notification_id, user_id) do nothing
    `);
  }

  return NextResponse.json({ success: true, updatedCount: result.rows.length + derived.rows.length });
}
