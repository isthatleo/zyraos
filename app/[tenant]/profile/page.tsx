"use client";

import { ProfileForm } from "@/components/profile-form";

export default function TenantProfilePage() {
  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">My Profile</h1>
        <p className="text-muted-foreground">
          Manage your identity, contact details, emergency information, and school profile.
        </p>
      </div>

      <ProfileForm />
    </div>
  );
}
