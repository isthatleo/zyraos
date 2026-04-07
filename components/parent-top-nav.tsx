"use client";

import { DashboardNav } from "./dashboard-nav";
import { authClient } from "@/lib/auth-client";

export function ParentTopNav() {
  const { data: session } = authClient.useSession();
  const user = session?.user;
  return (
    <DashboardNav 
      user={{ 
        name: user?.name || "Parent", 
        email: user?.email || "parent@school.com", 
        role: "parent",
        image: user?.image || undefined
      }} 
    />
  );
}
