"use client"

import { ProfileForm } from "@/components/profile-form"

export default function ProfilePage() {
  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Parent Profile</h1>
        <p className="text-muted-foreground">
          View and manage your parent account and profile information.
        </p>
      </div>

      <ProfileForm />
    </div>
  )
}