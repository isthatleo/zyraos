import { NextRequest, NextResponse } from "next/server";
import { sql } from "drizzle-orm";

import { getRequiredDashboardUser, isNextResponse, newId } from "@/lib/dashboard-db";
import { db } from "@/lib/db";
import { canDashboardUserMessage } from "@/lib/message-policy";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(request: NextRequest) {
  const currentUser = await getRequiredDashboardUser(request.headers);
  if (isNextResponse(currentUser)) return currentUser;

  const body = await request.json().catch(() => ({}));
  const otherUserId = String(body.otherUserId || "");
  const messageIds = Array.isArray(body.messageIds) ? body.messageIds.map(String) : [];

  if (!otherUserId) return NextResponse.json({ error: "otherUserId is required" }, { status: 400 });
  if (!(await canDashboardUserMessage(currentUser, otherUserId))) {
    return NextResponse.json({ error: "Your role cannot mark messages from this user." }, { status: 403 });
  }

  const conversation = await db.execute(sql`
    select c.id
    from conversations c
    join conversation_members cm1 on cm1.conversation_id = c.id and cm1.user_id = ${currentUser.id} and cm1.left_at is null
    join conversation_members cm2 on cm2.conversation_id = c.id and cm2.user_id = ${otherUserId} and cm2.left_at is null
    where c.type = 'direct'
    limit 1
  `);
  const conversationId = (conversation.rows[0] as { id?: string } | undefined)?.id;
  if (!conversationId) return NextResponse.json({ updatedCount: 0 }, { headers: { "Cache-Control": "no-store, max-age=0" } });

  const result = messageIds.length
    ? await db.execute(sql`
        select id
        from messages
        where conversation_id = ${conversationId}
          and sender_id = ${otherUserId}
          and id = any(${messageIds}::text[])
      `)
    : await db.execute(sql`
        select id
        from messages
        where conversation_id = ${conversationId}
          and sender_id = ${otherUserId}
      `);

  let updatedCount = 0;
  for (const row of result.rows as Array<{ id: string }>) {
    await db.execute(sql`
      insert into message_read_status (id, message_id, user_id, read_at)
      values (${newId("read")}, ${row.id}, ${currentUser.id}, now())
      on conflict (message_id, user_id) do nothing
    `);
    updatedCount += 1;
  }

  return NextResponse.json({ updatedCount }, { headers: { "Cache-Control": "no-store, max-age=0" } });
}
