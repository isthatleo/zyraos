import { NextRequest, NextResponse } from "next/server";

import { getRequiredDashboardUser, isNextResponse } from "@/lib/dashboard-db";
import { getDashboardStore } from "@/lib/dashboard-comm-store";
import { canDashboardUserMessage } from "@/lib/message-policy";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function pairKey(userA: string, userB: string) {
  return [userA, userB].sort().join(":");
}

export async function GET(request: NextRequest) {
  const currentUser = await getRequiredDashboardUser(request.headers);
  if (isNextResponse(currentUser)) return currentUser;

  const otherUserId = new URL(request.url).searchParams.get("otherUserId") || "";
  if (otherUserId && !(await canDashboardUserMessage(currentUser, otherUserId))) {
    return NextResponse.json({ error: "Your role cannot view typing state for this user." }, { status: 403 });
  }
  const key = otherUserId ? pairKey(currentUser.id, otherUserId) : "";
  const typingUserIds = key ? getDashboardStore().typing[key] || [] : [];
  return NextResponse.json({ typingUserIds }, { headers: { "Cache-Control": "no-store, max-age=0" } });
}

export async function POST(request: NextRequest) {
  const currentUser = await getRequiredDashboardUser(request.headers);
  if (isNextResponse(currentUser)) return currentUser;

  const body = await request.json().catch(() => ({}));
  const receiverId = String(body.receiverId || "");
  const isTyping = Boolean(body.isTyping);

  if (!receiverId) return NextResponse.json({ error: "receiverId is required" }, { status: 400 });
  if (!(await canDashboardUserMessage(currentUser, receiverId))) {
    return NextResponse.json({ error: "Your role cannot send typing state to this user." }, { status: 403 });
  }

  const key = pairKey(currentUser.id, receiverId);
  const store = getDashboardStore();
  const users = new Set(store.typing[key] || []);
  if (isTyping) users.add(currentUser.id);
  else users.delete(currentUser.id);
  store.typing[key] = Array.from(users);

  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store, max-age=0" } });
}
