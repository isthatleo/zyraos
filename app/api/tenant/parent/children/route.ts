import { NextRequest, NextResponse } from "next/server"

import {
  GET as getParentDashboard,
  POST as postParentDashboard,
} from "@/app/api/parent/dashboard/route"

export const dynamic = "force-dynamic"
export const revalidate = 0

function validateTenantSlug(request: NextRequest) {
  const tenant = String(request.nextUrl.searchParams.get("tenant") || "").trim()
  if (!tenant) {
    return NextResponse.json(
      { error: "Tenant slug is required.", expected: "/api/tenant/parent/children?tenant=<slug>", generatedAt: new Date().toISOString() },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    )
  }
  if (!/^[a-z0-9][a-z0-9-]*$/i.test(tenant)) {
    return NextResponse.json(
      { error: "Tenant slug is invalid.", expected: "Use letters, numbers, and hyphens only.", generatedAt: new Date().toISOString() },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    )
  }
  return null
}

export async function GET(request: NextRequest) {
  const invalid = validateTenantSlug(request)
  if (invalid) return invalid

  const response = await getParentDashboard(request)
  const data = await response.json().catch(() => ({}))
  return NextResponse.json(
    {
      generatedAt: data.generatedAt || new Date().toISOString(),
      currentUser: data.currentUser,
      school: data.school,
      metrics: data.metrics,
      children: Array.isArray(data.children) ? data.children : [],
      actionItems: Array.isArray(data.actionItems) ? data.actionItems : [],
      announcements: Array.isArray(data.announcements) ? data.announcements : [],
      error: data.error,
    },
    { status: response.status, headers: { "Cache-Control": "no-store" } }
  )
}

export async function POST(request: NextRequest) {
  const invalid = validateTenantSlug(request)
  if (invalid) return invalid
  return postParentDashboard(request)
}
