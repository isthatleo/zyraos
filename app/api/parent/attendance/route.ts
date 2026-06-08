import { NextRequest, NextResponse } from "next/server"

import { GET as getParentDashboard } from "@/app/api/parent/dashboard/route"

export const dynamic = "force-dynamic"
export const revalidate = 0

export async function GET(request: NextRequest) {
  const response = await getParentDashboard(request)
  const data = await response.json().catch(() => ({}))
  const children = (Array.isArray(data.children) ? data.children : []) as Array<Record<string, unknown>>

  return NextResponse.json(
    {
      generatedAt: data.generatedAt || new Date().toISOString(),
      currentUser: data.currentUser,
      school: data.school,
      metrics: data.metrics,
      children,
      attendance: children.flatMap((child) => {
        const attendance = child.attendance
        return Array.isArray(attendance)
          ? attendance.map((item: Record<string, unknown>) => ({
            ...item,
            childId: child.id,
            childName: child.name,
            className: child.className,
          }))
          : []
      }),
      error: data.error,
    },
    { status: response.status, headers: { "Cache-Control": "no-store" } }
  )
}
