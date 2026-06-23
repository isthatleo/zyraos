import { redirect } from "next/navigation"

export default async function TeacherProfileRedirect({
  params,
}: {
  params: Promise<{ tenant: string }>
}) {
  const { tenant } = await params
  redirect(`/${encodeURIComponent(tenant)}/profile?from=teacher`)
}

