import { NextRequest, NextResponse } from "next/server";

import { createNeonSnapshot, getNeonBackupStatus, updateNeonBackupSchedule } from "@/lib/platform-integrations";
import { requireMasterAdmin, writeMasterAudit } from "@/lib/master-audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { response } = await requireMasterAdmin(request);
    if (response) return response;

    return NextResponse.json(await getNeonBackupStatus(), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Backup status failed:", error);
    return NextResponse.json({ error: "Backup status failed" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { admin, response: denied } = await requireMasterAdmin(request);
    if (denied) return denied;

    const body = await request.json().catch(() => ({}));
    const action = String(body.action || "snapshot");
    const response = action === "schedule" ? await updateNeonBackupSchedule() : await createNeonSnapshot(body.name ? String(body.name) : undefined);
    await writeMasterAudit(request, {
      adminId: admin.adminId,
      action: action === "schedule" ? "Neon Backup Schedule Updated" : "Neon Snapshot Created",
      resource: "platform_backups",
      resourceId: "neon",
      changes: { action, result: response },
      status: response.ok ? "success" : "warning",
    });
    return NextResponse.json(response, { status: response.ok ? 200 : 400, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Backup operation failed:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Backup operation failed" }, { status: 500 });
  }
}
