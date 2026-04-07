"use client"

import { ProfileForm } from "@/components/profile-form"

export default function MasterProfilePage() {
  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Master Admin Profile</h1>
        <p className="text-muted-foreground">
          Manage your master administrator account and profile information.
        </p>
      </div>

      <ProfileForm />
    </div>
  )
}