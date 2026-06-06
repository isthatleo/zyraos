import { NextRequest, NextResponse } from "next/server";

import {
  getEmailProviderStatus,
  getLmsProviderStatus,
  getNeonBackupStatus,
  getSmsProviderStatus,
  getSsoProviderStatus,
} from "@/lib/platform-integrations";
import { getPlatformSettings, getPublicPlatformSettings, maskPlatformSecrets } from "@/lib/platform-settings-server";
import { requireMasterAdmin } from "@/lib/master-audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { response } = await requireMasterAdmin(request);
    if (response) return response;

    const [settings, email, sms, sso, lms, backups] = await Promise.all([
      getPlatformSettings(),
      getEmailProviderStatus(),
      getSmsProviderStatus(),
      getSsoProviderStatus(),
      getLmsProviderStatus(),
      getNeonBackupStatus(),
    ]);

    return NextResponse.json(
      {
        settings: maskPlatformSecrets(settings),
        publicSettings: getPublicPlatformSettings(settings),
        providers: { email, sms, sso, lms, backups },
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Integration status failed:", error);
    return NextResponse.json({ error: "Integration status failed" }, { status: 500 });
  }
}
