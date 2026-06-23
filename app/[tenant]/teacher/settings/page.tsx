import { redirect } from "next/navigation"

export default async function TeacherSettingsRedirect({
  params,
}: {
  params: Promise<{ tenant: string }>
}) {
  const { tenant } = await params
  redirect(`/${encodeURIComponent(tenant)}/settings?from=teacher`)
}

