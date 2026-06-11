import { headers } from "next/headers"
import { redirect } from "next/navigation"

export default async function StaffLoginPage() {
  const headersList = await headers()
  const host = headersList.get("host")

  // Redirect to the staff portal page
  redirect("/staff")
}
