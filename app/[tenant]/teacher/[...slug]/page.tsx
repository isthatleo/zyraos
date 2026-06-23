import { redirect } from "next/navigation"

const ROUTE_ALIASES: Record<string, string> = {
  "schedule": "my-schedule",
  "grading": "grades",
  "messaging": "messages",
  "learning-content": "resources",
  "exams": "exams/scheduling",
}

export default async function TeacherModulePage({
  params,
}: {
  params: Promise<{ tenant: string; slug?: string[] }>
}) {
  const { tenant, slug = [] } = await params
  const route = slug.join("/")
  const target = ROUTE_ALIASES[route] || ROUTE_ALIASES[slug[0] || ""] || "dashboard"

  redirect(`/${encodeURIComponent(tenant)}/teacher/${target}`)
}

