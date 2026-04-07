"use client";

import { DashboardNav } from "./dashboard-nav";
import { authClient } from "@/lib/auth-client";

export function StudentTopNav() {
  const { data: session } = authClient.useSession();
  const user = session?.user;
  return (
    <DashboardNav 
      user={{ 
        name: user?.name || "Student", 
        email: user?.email || "student@school.com", 
        role: "student",
        image: user?.image || undefined
      }} 
    />
  );
}
