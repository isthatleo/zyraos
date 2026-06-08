import { NextRequest, NextResponse } from "next/server"

import {
  GET as getTenantParentFinance,
  POST as postTenantParentFinance,
} from "@/app/api/tenant/parent/finance/route"
import { getTenantSubdomain, resolveTenantSlug } from "@/lib/tenant-routing"

export const dynamic = "force-dynamic"
export const revalidate = 0

function withResolvedTenant(request: NextRequest) {
  const url = request.nextUrl.clone()
  const existing = url.searchParams.get("tenant")
  if (existing) return new NextRequest(url, request)

  const subdomain = getTenantSubdomain(request.headers.get("host"))
  const referrer = request.headers.get("referer") || request.headers.get("referrer") || ""
  let referrerTenant: string | null = null
  try {
    const parsed = referrer ? new URL(referrer) : null
    referrerTenant = resolveTenantSlug(parsed?.pathname, parsed?.host)
  } catch {
    referrerTenant = null
  }

  const tenant = subdomain || referrerTenant
  if (!tenant) return null
  url.searchParams.set("tenant", tenant)
  return new NextRequest(url, request)
}

export async function GET(request: NextRequest) {
  const nextRequest = withResolvedTenant(request)
  return getTenantParentFinance(nextRequest || request)
}

export async function POST(request: NextRequest) {
  const nextRequest = withResolvedTenant(request)
  return postTenantParentFinance(nextRequest || request)
}
