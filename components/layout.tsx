import { AccountantSidebar } from "@/components/accountant-sidebar"
import { DashboardNav } from "@/components/dashboard-nav"

export default function AccountantLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AccountantSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <DashboardNav user={{ 
          name: "Chief Accountant", 
          email: "finance@school.edu", 
          role: "Finance" 
        }} />
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}