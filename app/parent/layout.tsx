"use client"

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"
import { ParentSidebar } from "@/components/parent-sidebar"
import { ParentTopNav } from "@/components/parent-top-nav"

export default function ParentLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <TooltipProvider>
      <SidebarProvider>
        <ParentSidebar />
        <SidebarInset>
          <ParentTopNav />
          <main className="flex-1 overflow-y-auto">
            {children}
          </main>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  )
}
