"use client"

import { ParentPageLayout } from "@/components/parent-page-layout"
import { ProfileForm } from "@/components/profile-form"

export default function ParentProfilePage() {
  return (
    <ParentPageLayout title="My Profile" description="View and update your personal account information.">
      <ProfileForm />
    </ParentPageLayout>
  )
}