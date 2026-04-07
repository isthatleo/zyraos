"use client"

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"
import { StaffSidebar } from "@/components/staff-sidebar"
import { StaffTopNav } from "@/components/staff-top-nav"

export default function StaffLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <TooltipProvider>
      <SidebarProvider>
        <StaffSidebar />
        <SidebarInset>
          <StaffTopNav />
          <main className="flex-1 overflow-y-auto">
            {children}
          </main>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  )
}
