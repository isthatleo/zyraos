"use client"

export function currentTenantSlug() {
  if (typeof window === "undefined") return ""
  const [, tenant, area] = window.location.pathname.split("/")
  return area === "teacher" ? decodeURIComponent(tenant || "").trim() : ""
}

export function teacherDashboardApi(section = "dashboard") {
  const tenant = currentTenantSlug()
  const normalizedSection = section.replace(/^\/+|\/+$/g, "") || "dashboard"
  // Prefer top-level teacher API endpoints and pass tenant as query param when a tenant slug is present
  return tenant
    ? `/api/teacher/${normalizedSection}?tenant=${encodeURIComponent(tenant)}`
    : `/api/teacher/${normalizedSection}`
}

export function teacherApi(section: string) {
  return teacherDashboardApi(section)
}
