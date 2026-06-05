import { NextRequest, NextResponse } from "next/server";
import { sql } from "drizzle-orm";

import { getRequiredDashboardUser, isNextResponse, newId } from "@/lib/dashboard-db";
import { db } from "@/lib/db";

type Context = { params: Promise<{ id: string }> };

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(request: NextRequest, context: Context) {
  const currentUser = await getRequiredDashboardUser(request.headers);
  if (isNextResponse(currentUser)) return currentUser;

  const { id } = await context.params;

  await db.execute(sql`
    create table if not exists notification_reads (
      id text primary key,
      notification_id text not null,
      user_id text not null references users(id) on delete cascade,
      read_at timestamp not null default now(),
      unique(notification_id, user_id)
    )
  `);

  if (id.startsWith("msg_")) {
    const messageId = id.slice(4);
    const result = await db.execute(sql`
      select m.id
      from messages m
      join conversation_members cm on cm.conversation_id = m.conversation_id
      where m.id = ${messageId}
        and cm.user_id = ${currentUser.id}
        and cm.left_at is null
      limit 1
    `);

    if (!result.rows[0]) return NextResponse.json({ error: "Notification not found" }, { status: 404 });

    await db.execute(sql`
      insert into message_read_status (id, message_id, user_id, read_at)
      values (${newId("read")}, ${messageId}, ${currentUser.id}, now())
      on conflict (message_id, user_id) do nothing
    `);

    return NextResponse.json({ success: true });
  }

  if (id.startsWith("broadcast_")) {
    const deliveryId = id.slice("broadcast_".length);
    await db.execute(sql`
      update broadcast_deliveries
      set status = 'read', updated_at = now()
      where id = ${deliveryId} and user_id = ${currentUser.id}
    `);
  }

  await db.execute(sql`
    insert into notification_reads (id, notification_id, user_id, read_at)
    values (${newId("nread")}, ${id}, ${currentUser.id}, now())
    on conflict (notification_id, user_id) do nothing
  `);

  return NextResponse.json({ success: true });
}
