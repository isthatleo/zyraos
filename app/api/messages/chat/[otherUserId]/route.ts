import { NextRequest, NextResponse } from "next/server";
import { sql } from "drizzle-orm";

import { getRequiredDashboardUser, isNextResponse } from "@/lib/dashboard-db";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Context = { params: Promise<{ otherUserId: string }> };

export async function DELETE(request: NextRequest, context: Context) {
  const currentUser = await getRequiredDashboardUser(request.headers);
  if (isNextResponse(currentUser)) return currentUser;

  const { otherUserId } = await context.params;
  const conversation = await db.execute(sql`
    select c.id
    from conversations c
    join conversation_members cm1 on cm1.conversation_id = c.id and cm1.user_id = ${currentUser.id} and cm1.left_at is null
    join conversation_members cm2 on cm2.conversation_id = c.id and cm2.user_id = ${otherUserId} and cm2.left_at is null
    where c.type = 'direct'
    limit 1
  `);
  const conversationId = (conversation.rows[0] as { id?: string } | undefined)?.id;
  if (!conversationId) return NextResponse.json({ success: true, deletedCount: 0 }, { headers: { "Cache-Control": "no-store, max-age=0" } });

  const result = await db.execute(sql`
    delete from messages
    where conversation_id = ${conversationId}
    returning id
  `);
  await db.execute(sql`update conversations set updated_at = now() where id = ${conversationId}`);

  return NextResponse.json({ success: true, deletedCount: result.rows.length }, { headers: { "Cache-Control": "no-store, max-age=0" } });
}
