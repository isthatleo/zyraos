import { NextRequest, NextResponse } from "next/server";

import {
  deliverPlatformWebhook,
  getEmailProviderStatus,
  getLmsProviderStatus,
  getNeonBackupStatus,
  getSmsProviderStatus,
  getSsoProviderStatus,
  sendPlatformEmail,
  sendPlatformSms,
} from "@/lib/platform-integrations";
import { requireMasterAdmin, writeMasterAudit } from "@/lib/master-audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const { admin, response: denied } = await requireMasterAdmin(request);
    if (denied) return denied;

    const body = await request.json().catch(() => ({}));
    const type = String(body.type || "").toLowerCase();
    let response;

    if (type === "email_status") response = await getEmailProviderStatus();
    if (type === "email_send") {
      response = await sendPlatformEmail({
        to: String(body.to || ""),
        subject: String(body.subject || "Roxan email provider test"),
        html: body.html ? String(body.html) : "<strong>Roxan email provider test</strong>",
        text: body.text ? String(body.text) : "Roxan email provider test",
      });
    }
    if (type === "sms_status") response = await getSmsProviderStatus();
    if (type === "sms_send") response = await sendPlatformSms({ to: String(body.to || ""), body: String(body.message || "Roxan SMS provider test") });
    if (type === "webhook") {
      response = await deliverPlatformWebhook({
        event: "platform.integration.test",
        payload: { source: "master_settings", message: "Roxan webhook delivery test" },
      });
    }
    if (type === "sso") response = await getSsoProviderStatus();
    if (type === "lms") response = await getLmsProviderStatus();
    if (type === "backups") response = await getNeonBackupStatus();

    if (!response) {
      return NextResponse.json({ error: "Unsupported integration test type" }, { status: 400 });
    }

    await writeMasterAudit(request, {
      adminId: admin.adminId,
      action: "Platform Integration Tested",
      resource: "platform_integrations",
      resourceId: "test",
      changes: { type, result: response },
      status: response.ok ? "success" : "warning",
    });
    return NextResponse.json(response, { status: response.ok ? 200 : 400, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Integration test failed:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Integration test failed" }, { status: 500 });
  }
}
