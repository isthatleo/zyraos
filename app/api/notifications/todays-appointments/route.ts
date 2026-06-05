import { NextRequest, NextResponse } from "next/server";

import { getCurrentDashboardUser } from "@/lib/dashboard-comm-store";

export async function GET(request: NextRequest) {
  const currentUser = await getCurrentDashboardUser(request.headers);
  return NextResponse.json({
    currentUser,
    appointments: [],
    notifications: [],
    message: "No appointments scheduled for today.",
  });
}
