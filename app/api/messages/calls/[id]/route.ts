import { NextRequest, NextResponse } from "next/server";
import { sql } from "drizzle-orm";

import { getCurrentDashboardUser, getDashboardStore } from "@/lib/dashboard-comm-store";
import { db } from "@/lib/db";
import { newId } from "@/lib/dashboard-db";

type Context = { params: Promise<{ id: string }> };
const CALL_EVENT_PREFIX = "__call_event__:";

async function findOrCreateDirectConversation(firstUserId: string, secondUserId: string) {
  const existing = await db.execute(sql`
    select c.id
    from conversations c
    join conversation_members cm1 on cm1.conversation_id = c.id and cm1.user_id = ${firstUserId} and cm1.left_at is null
    join conversation_members cm2 on cm2.conversation_id = c.id and cm2.user_id = ${secondUserId} and cm2.left_at is null
    where c.type = 'direct'
      and c.is_archived = false
    limit 1
  `);
  const existingId = (existing.rows[0] as { id?: string } | undefined)?.id;
  if (existingId) return existingId;

  const conversationId = newId("conv");
  await db.execute(sql`
    insert into conversations (id, type, name, created_by, is_archived, created_at, updated_at)
    values (${conversationId}, 'direct', null, ${firstUserId}, false, now(), now())
  `);
  await db.execute(sql`
    insert into conversation_members (id, conversation_id, user_id, role, joined_at)
    values
      (${newId("member")}, ${conversationId}, ${firstUserId}, 'owner', now()),
      (${newId("member")}, ${conversationId}, ${secondUserId}, 'member', now())
    on conflict (conversation_id, user_id) do nothing
  `);
  return conversationId;
}

async function createCallEventMessage(call: {
  id: string;
  callerId: string;
  recipientId: string;
  callType: "audio" | "video";
  status: "ringing" | "accepted" | "declined" | "ended";
  createdAt: string;
  acceptedAt?: string;
  endedAt?: string;
  callEventMessageId?: string;
}) {
  if (call.callEventMessageId) return;
  const missed = call.status === "declined" || !call.acceptedAt;
  const acceptedAt = call.acceptedAt || call.createdAt;
  const durationSeconds = missed
    ? 0
    : Math.max(0, Math.round((Date.parse(call.endedAt || new Date().toISOString()) - Date.parse(acceptedAt)) / 1000));
  const callLabel = call.callType === "video" ? "Video call" : "Voice call";
  const message = missed ? `Missed ${callLabel.toLowerCase()}` : `${callLabel} answered`;
  const conversationId = await findOrCreateDirectConversation(call.callerId, call.recipientId);
  const messageId = newId("msg");
  await db.execute(sql`
    insert into messages (id, conversation_id, sender_id, content, attachments, is_edited, created_at)
    values (
      ${messageId},
      ${conversationId},
      ${call.callerId},
      ${`${CALL_EVENT_PREFIX}${JSON.stringify({
        message,
        callType: call.callType,
        callStatus: missed ? "missed" : "answered",
        durationSeconds,
        missed,
      })}`},
      '[]'::jsonb,
      false,
      now()
    )
  `);
  await db.execute(sql`update conversations set updated_at = now() where id = ${conversationId}`);
  call.callEventMessageId = messageId;
}

export async function GET(request: NextRequest, context: Context) {
  const currentUser = await getCurrentDashboardUser(request.headers);
  const { id } = await context.params;
  const call = getDashboardStore().calls.find(
    (item) => item.id === id && (item.callerId === currentUser.id || item.recipientId === currentUser.id)
  );

  if (!call) return NextResponse.json({ error: "Call not found" }, { status: 404 });
  return NextResponse.json({ call: { ...call, calleeId: call.recipientId } }, { headers: { "Cache-Control": "no-store, max-age=0" } });
}

export async function PATCH(request: NextRequest, context: Context) {
  const currentUser = await getCurrentDashboardUser(request.headers);
  const { id } = await context.params;
  const body = await request.json().catch(() => ({}));
  const call = getDashboardStore().calls.find(
    (item) => item.id === id && (item.callerId === currentUser.id || item.recipientId === currentUser.id)
  );

  if (!call) return NextResponse.json({ error: "Call not found" }, { status: 404 });

  const nextStatus = body.status || (body.action === "answer" ? "accepted" : body.action === "reject" ? "declined" : body.action === "end" ? "ended" : undefined);

  if (["accepted", "declined", "ended"].includes(nextStatus)) {
    call.status = nextStatus;
    if (nextStatus === "accepted" && !call.acceptedAt) call.acceptedAt = new Date().toISOString();
    if (nextStatus === "ended") call.endedAt = new Date().toISOString();
  }

  if (body.offer) call.offer = body.offer;
  if (body.answer) call.answer = body.answer;
  if (body.candidate || body.action === "candidate") {
    const candidate = body.candidate;
    if (!candidate) return NextResponse.json({ error: "candidate is required" }, { status: 400 });
    const fromCaller = call.callerId === currentUser.id;
    const key = fromCaller ? "callerCandidates" : "recipientCandidates";
    call[key] = [...(call[key] || []), candidate];
  }

  if (call.status === "declined" || call.status === "ended") {
    await createCallEventMessage(call).catch((error) => {
      console.warn("Failed to persist call event message:", error instanceof Error ? error.message : error);
    });
  }

  return NextResponse.json({ call: { ...call, calleeId: call.recipientId } }, { headers: { "Cache-Control": "no-store, max-age=0" } });
}
