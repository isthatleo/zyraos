import { NextRequest, NextResponse } from "next/server";

import { getCurrentDashboardUser, getDashboardStore } from "@/lib/dashboard-comm-store";
import { canDashboardUserMessage } from "@/lib/message-policy";

export async function GET(request: NextRequest) {
  const currentUser = await getCurrentDashboardUser(request.headers);
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || "incoming";
  const otherUserId = searchParams.get("otherUserId");
  const calls = getDashboardStore().calls;

  if (type === "incoming") {
    const call = calls.find((item) => item.recipientId === currentUser.id && item.status === "ringing") || null;
    return NextResponse.json({ call: call ? { ...call, calleeId: call.recipientId } : null }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  }

  if (type === "conversation" && otherUserId) {
    const call =
      calls.find(
        (item) =>
          (item.callerId === currentUser.id && item.recipientId === otherUserId) ||
          (item.callerId === otherUserId && item.recipientId === currentUser.id)
      ) || null;
    return NextResponse.json({ call: call ? { ...call, calleeId: call.recipientId } : null }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  }

  return NextResponse.json(
    { calls: calls.filter((call) => call.callerId === currentUser.id || call.recipientId === currentUser.id).map((call) => ({ ...call, calleeId: call.recipientId })) },
    { headers: { "Cache-Control": "no-store, max-age=0" } }
  );
}

export async function POST(request: NextRequest) {
  const currentUser = await getCurrentDashboardUser(request.headers);
  const body = await request.json().catch(() => ({}));
  const recipientId = String(body.recipientId || body.calleeId || "");
  const callType: "audio" | "video" = body.callType === "video" ? "video" : "audio";
  const requestedCallId = String(body.callId || "");

  if (!recipientId) return NextResponse.json({ error: "recipientId is required" }, { status: 400 });
  if (!(await canDashboardUserMessage(currentUser, recipientId))) {
    return NextResponse.json({ error: "Your role cannot call this user." }, { status: 403 });
  }

  const call = {
    id: requestedCallId.startsWith("call_") ? requestedCallId : `call_${crypto.randomUUID()}`,
    callerId: currentUser.id,
    recipientId,
    callType,
    status: "ringing" as const,
    offer: body.offer,
    callerCandidates: Array.isArray(body.candidates) ? body.candidates : [],
    recipientCandidates: [],
    createdAt: new Date().toISOString(),
  };
  getDashboardStore().calls.unshift(call);
  return NextResponse.json({ call }, { status: 201 });
}
