"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { MasterSidebar } from "@/components/master-sidebar"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"
import { MasterTopNav } from "@/components/master-top-nav"
import { authClient } from "@/lib/auth-client"

export default function MasterLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const session = await authClient.getSession()
        if (!session?.data?.session) {
          setIsAuthenticated(false)
          router.replace("/master/login")
        } else {
          setIsAuthenticated(true)
        }
      } catch {
        setIsAuthenticated(false)
        router.replace("/master/login")
      }
    }
    
    if (pathname === "/master/login") {
      setIsAuthenticated(true) // Skip guard for login page itself
    } else {
      checkAuth()
    }
  }, [pathname, router])

  // Login page renders without layout chrome
  if (pathname === "/master/login") {
    return <>{children}</>
  }

  // Always render the same shell on server & client to avoid hydration mismatch.
  // Show/hide content with CSS + opacity instead of conditional returns.
  const showLoading = isAuthenticated === null
  const showContent = isAuthenticated === true

  return (
    <TooltipProvider>
      <SidebarProvider>
        {showContent ? (
          <>
            <MasterSidebar />
            <SidebarInset>
              <MasterTopNav />
              <main className="flex-1 overflow-y-auto">
                {children}
              </main>
            </SidebarInset>
          </>
        ) : (
          <div className="min-h-screen flex items-center justify-center bg-background w-full">
            {showLoading && (
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            )}
          </div>
        )}
      </SidebarProvider>
    </TooltipProvider>
  )
}
