import { NextRequest, NextResponse } from "next/server";

import { getPlatformSettings, getPublicPlatformSettings, asBoolean, asString, maskPlatformSecrets } from "@/lib/platform-settings-server";
import { getEmailProviderStatus, getLmsProviderStatus, getNeonBackupStatus, getSmsProviderStatus, getSsoProviderStatus } from "@/lib/platform-integrations";
import { requireMasterAdmin } from "@/lib/master-audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { response } = await requireMasterAdmin(request);
    if (response) return response;

    const settings = await getPlatformSettings();
    const ssoProvider = asString(settings.ssoProvider, "disabled");
    const lmsMode = asString(settings.lmsIntegrationMode, "disabled");
    const ssoIssuerUrl = asString(settings.ssoIssuerUrl) || process.env.SSO_ISSUER_URL || "";
    const ssoClientId = asString(settings.ssoClientId) || process.env.SSO_CLIENT_ID || "";
    const savedSsoClientSecret = asString(settings.ssoClientSecret);
    const ssoClientSecret = savedSsoClientSecret && savedSsoClientSecret !== "********" ? savedSsoClientSecret : process.env.SSO_CLIENT_SECRET || "";
    const lmsApiUrl = asString(settings.lmsApiUrl) || process.env.LMS_API_URL || "";
    const savedLmsApiKey = asString(settings.lmsApiKey);
    const lmsApiKey = savedLmsApiKey && savedLmsApiKey !== "********" ? savedLmsApiKey : process.env.LMS_API_KEY || "";
    const [email, sms, ssoStatus, lmsStatus, backups] = await Promise.all([
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
        capabilities: {
          apiAccess: {
            enabled: asBoolean(settings.apiAccessEnabled, true),
            status: asBoolean(settings.apiAccessEnabled, true) ? "available" : "disabled",
          },
          webhooks: {
            enabled: Boolean(asString(settings.webhookUrl)) || asBoolean(settings.webhookSigningEnabled, true),
            signingEnabled: asBoolean(settings.webhookSigningEnabled, true),
            allowedDomains: asString(settings.allowedWebhookDomains)
              .split(",")
              .map((domain) => domain.trim())
              .filter(Boolean),
            status: asString(settings.webhookUrl) ? "configured" : "awaiting_webhook_url",
          },
          sso: {
            provider: ssoProvider,
            configured:
              ssoProvider !== "disabled" &&
              Boolean(ssoIssuerUrl && ssoClientId && ssoClientSecret),
            status:
              ssoProvider === "disabled"
                ? "disabled"
                : ssoIssuerUrl && ssoClientId && ssoClientSecret
                  ? "configured"
                  : "missing_provider_credentials",
          },
          lms: {
            mode: lmsMode,
            configured: lmsMode !== "disabled" && Boolean(lmsApiUrl && lmsApiKey),
            status:
              lmsMode === "disabled"
                ? "disabled"
                : lmsApiUrl && lmsApiKey
                  ? "configured"
                  : "missing_provider_credentials",
          },
          providers: { email, sms, sso: ssoStatus, lms: lmsStatus, backups },
        },
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Failed to load effective platform settings:", error);
    return NextResponse.json({ error: "Failed to load effective platform settings" }, { status: 500 });
  }
}
