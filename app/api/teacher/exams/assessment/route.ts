import { NextRequest } from "next/server"

import { GET as tenantGET, POST as tenantPOST } from "@/app/api/tenant/teacher/exams/assessment/route"
import { getTenantSubdomain } from "@/lib/tenant-routing"

function withTenant(request: NextRequest) {
  const url = request.nextUrl.clone()
  if (!url.searchParams.get("tenant")) {
    const tenant = getTenantSubdomain(request.headers.get("host"))
    if (tenant) url.searchParams.set("tenant", tenant)
  }
  return new NextRequest(url, request)
}

export function GET(request: NextRequest) {
  return tenantGET(withTenant(request))
}

export function POST(request: NextRequest) {
  return tenantPOST(withTenant(request))
}

