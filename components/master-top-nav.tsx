"use client"

import { DashboardNav } from "./dashboard-nav";
import { authClient } from "@/lib/auth-client";

export function MasterTopNav() {
  const { data: session } = authClient.useSession();
  const user = session?.user;

  return (
    <DashboardNav 
      user={{ 
        name: user?.name || "Master Admin", 
        email: user?.email || "master@roxan.app", 
        role: "super_admin",
        image: user?.image || undefined
      }} 
    />
  );
}
