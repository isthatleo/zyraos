import { NextRequest, NextResponse } from "next/server"

import {
  GET as getStudentDashboard,
  POST as postStudentDashboard,
} from "@/app/api/student/dashboard/route"

export const dynamic = "force-dynamic"
export const revalidate = 0

function tenantSlug(request: NextRequest) {
  return String(request.nextUrl.searchParams.get("tenant") || "").trim()
}

function validateTenantSlug(request: NextRequest) {
  const tenant = tenantSlug(request)
  if (!tenant) {
    return NextResponse.json(
      {
        error: "Tenant slug is required.",
        expected: "/api/tenant/student/dashboard?tenant=<slug>",
        generatedAt: new Date().toISOString(),
      },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    )
  }
  if (!/^[a-z0-9][a-z0-9-]*$/i.test(tenant)) {
    return NextResponse.json(
      {
        error: "Tenant slug is invalid.",
        expected: "Use letters, numbers, and hyphens only.",
        generatedAt: new Date().toISOString(),
      },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    )
  }
  return null
}

export async function GET(request: NextRequest) {
  const invalid = validateTenantSlug(request)
  if (invalid) return invalid
  return getStudentDashboard(request)
}

export async function POST(request: NextRequest) {
  const invalid = validateTenantSlug(request)
  if (invalid) return invalid
  return postStudentDashboard(request)
}
