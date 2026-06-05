"use client"

import { ProfileForm } from "@/components/profile-form"
import { UniversalDashboardShell } from "@/components/shared/universal-dashboard-shell"

export default function ProfilePage() {
  return (
    <UniversalDashboardShell>
      <div className="mx-auto max-w-6xl space-y-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Profile Settings</h1>
          <p className="text-muted-foreground">
            Manage your account settings and profile information.
          </p>
        </div>

        <ProfileForm />
      </div>
    </UniversalDashboardShell>
  )
}
