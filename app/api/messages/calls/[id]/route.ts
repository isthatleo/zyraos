import { NextRequest, NextResponse } from "next/server";

import { getCurrentDashboardUser, getDashboardStore } from "@/lib/dashboard-comm-store";

type Context = { params: Promise<{ id: string }> };

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

  return NextResponse.json({ call: { ...call, calleeId: call.recipientId } }, { headers: { "Cache-Control": "no-store, max-age=0" } });
}
