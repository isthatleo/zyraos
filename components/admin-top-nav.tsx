"use client"

import { DashboardNav } from "./dashboard-nav";
import { authClient } from "@/lib/auth-client";

export function AdminTopNav() {
  const { data: session } = authClient.useSession();
  const user = session?.user;
  return (
    <DashboardNav 
      user={{ 
        name: user?.name || "School Admin", 
        email: user?.email || "admin@school.com", 
        role: "school_admin",
        image: user?.image || undefined
      }} 
    />
  );
}
