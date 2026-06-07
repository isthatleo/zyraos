import { NextRequest, NextResponse } from "next/server"

import { getRequiredDashboardUser, isNextResponse } from "@/lib/dashboard-db"
import { getTenantSubdomain, resolveTenantSlug } from "@/lib/tenant-routing"

export const dynamic = "force-dynamic"
export const revalidate = 0

function tenantSlugFromRequest(request: NextRequest) {
  const direct = request.nextUrl.searchParams.get("tenant") || request.nextUrl.searchParams.get("slug")
  if (direct) return direct
  const subdomain = getTenantSubdomain(request.headers.get("host"))
  if (subdomain) return subdomain
  const referrer = request.headers.get("referer") || request.headers.get("referrer") || ""
  try {
    const url = referrer ? new URL(referrer) : null
    return resolveTenantSlug(url?.pathname, url?.host)
  } catch {
    return null
  }
}

export async function GET(request: NextRequest) {
  const currentUser = await getRequiredDashboardUser(request.headers)
  if (isNextResponse(currentUser)) return currentUser

  const tenant = tenantSlugFromRequest(request)
  const configuredSocketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || ""
  const configuredSocketPath = process.env.NEXT_PUBLIC_SOCKET_PATH || ""
  const turnUrls = (process.env.NEXT_PUBLIC_TURN_URLS || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
  const hasTurnCredentials = Boolean(process.env.NEXT_PUBLIC_TURN_USERNAME && process.env.NEXT_PUBLIC_TURN_CREDENTIAL)
  const warnings = [
    configuredSocketUrl ? "" : "Realtime socket uses the app-host fallback. Configure NEXT_PUBLIC_SOCKET_URL for a dedicated realtime server when deploying separately.",
    turnUrls.length ? "" : "TURN servers are not configured. Audio/video calls can work on open networks but may fail behind strict NATs or firewalls.",
    turnUrls.length && !hasTurnCredentials ? "TURN URLs are configured without public TURN credentials. Verify the server allows credential-less access or add credentials." : "",
  ].filter(Boolean)

  return NextResponse.json(
    {
      generatedAt: new Date().toISOString(),
      currentUser: {
        id: currentUser.id,
        email: currentUser.email,
        role: currentUser.role,
      },
      tenant: tenant || null,
      messaging: {
        endpoint: tenant ? `/api/tenant/${tenant}/messages` : "/api/messages",
        authenticated: true,
        role: currentUser.role,
      },
      realtime: {
        configured: Boolean(configuredSocketUrl),
        mode: configuredSocketUrl ? "dedicated" : "app-fallback",
        path: configuredSocketPath || (configuredSocketUrl ? "/socket.io" : "/api/socket"),
      },
      webRtc: {
        stunEnabled: true,
        turnConfigured: turnUrls.length > 0,
        turnServerCount: turnUrls.length,
        turnCredentialsConfigured: hasTurnCredentials,
      },
      productionReady: warnings.length === 0,
      warnings,
    },
    { headers: { "Cache-Control": "no-store" } }
  )
}
