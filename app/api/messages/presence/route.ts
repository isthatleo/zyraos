import { NextRequest, NextResponse } from "next/server";

import { getRequiredDashboardUser, isNextResponse } from "@/lib/dashboard-db";
import { getDashboardStore } from "@/lib/dashboard-comm-store";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const currentUser = await getRequiredDashboardUser(request.headers);
  if (isNextResponse(currentUser)) return currentUser;

  const userIds = (new URL(request.url).searchParams.get("userIds") || "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  const presence = getDashboardStore().presence;
  const onlineUserIds = userIds.filter((id) => presence[id]?.status === "online");

  return NextResponse.json({ onlineUserIds, currentUserId: currentUser.id }, { headers: { "Cache-Control": "no-store, max-age=0" } });
}

export async function POST(request: NextRequest) {
  const currentUser = await getRequiredDashboardUser(request.headers);
  if (isNextResponse(currentUser)) return currentUser;

  getDashboardStore().presence[currentUser.id] = { status: "online", updatedAt: new Date().toISOString() };
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store, max-age=0" } });
}
