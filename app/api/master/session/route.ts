import { NextRequest, NextResponse } from "next/server";

import { requireMasterAdmin } from "@/lib/master-audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { admin, response } = await requireMasterAdmin(request);
  if (response) {
    return NextResponse.json({ authenticated: false, role: null }, { status: 401 });
  }

  return NextResponse.json(
    {
      authenticated: true,
      user: {
        id: admin.userId,
        adminId: admin.adminId,
        email: admin.email,
        name: admin.name,
        role: admin.role,
      },
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
