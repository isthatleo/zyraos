"use client"

import { DashboardNav } from "./dashboard-nav";
import { authClient } from "@/lib/auth-client";

export function StaffTopNav() {
  const { data: session } = authClient.useSession();
  const user = session?.user;
  return (
    <DashboardNav 
      user={{ 
        name: user?.name || "Staff Member", 
        email: user?.email || "staff@school.com", 
        role: "staff",
        image: user?.image || undefined
      }} 
    />
  );
}
