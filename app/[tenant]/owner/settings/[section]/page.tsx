"use client";

import { useParams } from "next/navigation";

import { OwnerSettingsWorkspace } from "@/components/owner-settings-workspace";

export default function OwnerSettingsSectionPage() {
  const params = useParams<{ section?: string }>();
  const section = params?.section || "";

  return <OwnerSettingsWorkspace sectionId={section} />;
}
