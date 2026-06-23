// app/[tenant]/teacher/page.tsx
import React from "react";
import DashboardClient from "./components/DashboardClient";
import { cookies } from "next/headers";

type Props = { params: { tenant: string } };

export default async function TeacherDashboardPage({ params }: Props) {
  // Read role from cookie server-side to pass down initial role
  const cookieStore = await cookies();
  const role = cookieStore.get("teacher_role")?.value ?? null;

  // Fetch some initial server-side data (optional)
  // We call our local API route to get preloaded summary data
  // This call is to the local server route (so next/network is fine)
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL ?? ""}/api/teacher/dashboard?tenant=${encodeURIComponent(
      params.tenant
    )}`,
    {
      cache: "no-store",
      headers: { "x-user-role": role ?? "" },
    }
  ).catch(() => null);

  const initialData = (res && (await res.json())) || null;

  return (
    <main>
      {/* Keep existing content if present — if your project already renders some "current dashboard content",
          re-import and render it here. For example:
          import CurrentDashboardContent from "./CurrentDashboardContent";
          <CurrentDashboardContent />
          The below component is additive and won't remove existing content.
      */}
      <h1>Teacher Dashboard — Tenant: {params.tenant}</h1>

      <DashboardClient initialData={initialData} tenant={params.tenant} initialRole={role} />

      {/* If you have more existing widgets, render them below so nothing is removed */}
    </main>
  );
}

