import { NextRequest, NextResponse } from "next/server";
import { sql } from "drizzle-orm";

import { getRequiredDashboardUser, isNextResponse } from "@/lib/dashboard-db";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Context = { params: Promise<{ id: string }> };

export async function DELETE(request: NextRequest, context: Context) {
  const currentUser = await getRequiredDashboardUser(request.headers);
  if (isNextResponse(currentUser)) return currentUser;

  const { id } = await context.params;
  const result = await db.execute(sql`
    delete from messages
    where id = ${id}
      and sender_id = ${currentUser.id}
    returning id
  `);

  if (!result.rows.length) return NextResponse.json({ error: "Message not found" }, { status: 404 });
  return NextResponse.json({ success: true, messageId: id }, { headers: { "Cache-Control": "no-store, max-age=0" } });
}
