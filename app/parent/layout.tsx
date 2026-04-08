import { ParentSidebar } from "@/components/parent-sidebar"
import { ParentTopNav } from "@/components/parent-top-nav"

export default function ParentLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <ParentSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <ParentTopNav />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}