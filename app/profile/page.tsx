"use client"

import { ProfileForm } from "@/components/profile-form"

export default function ProfilePage() {
  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-8 pt-16 md:pt-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Profile Settings</h1>
        <p className="text-muted-foreground">
          Manage your account settings and profile information.
        </p>
      </div>

      <ProfileForm />
    </div>
  )
}
