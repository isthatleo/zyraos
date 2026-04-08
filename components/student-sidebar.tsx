"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { authClient } from "@/lib/auth-client"
import { toast } from "sonner"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  LayoutDashboardIcon, BookOpenIcon, FileTextIcon, BarChart3Icon,
  CalendarIcon, ClipboardList, User, LogOut, GraduationCap, CheckCircle2, // GraduationCap is used in the header
  TrendingUp, FolderIcon, CreditCard, MessageSquare, Settings
} from "lucide-react"

const navigation = [
  {
    title: "Academics",
    items: [
      { name: "Dashboard", href: "/student/dashboard", icon: LayoutDashboardIcon },
      { name: "Subjects", href: "/student/subjects", icon: BookOpenIcon },
      { name: "Exams & Results", href: "/student/exams", icon: BarChart3Icon },
      { name: "Assessments", href: "/student/assessments", icon: ClipboardList },
    ],
  },
  {
    title: "Student Portal",
    items: [
      { name: "Assignments", href: "/student/assignments", icon: FileTextIcon },
      { name: "Performance Insights", href: "/student/performance", icon: TrendingUp },
      { name: "Learning Resources", href: "/student/resources", icon: FolderIcon },
      { name: "My Schedule", href: "/student/schedule", icon: CalendarIcon },
      { name: "Attendance", href: "/student/attendance", icon: CheckCircle2 },
      { name: "Finance", href: "/student/finance", icon: CreditCard },
      { name: "Communication", href: "/student/communication", icon: MessageSquare },
    ],
  },
  {
    title: "Account",
    items: [
      { name: "My Profile", href: "/student/profile", icon: User },
      { name: "Settings", href: "/student/settings", icon: Settings },
    ],
  },
]

export function StudentSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { data: session } = authClient.useSession()
  const user = session?.user

  const handleLogout = async () => {
    try {
      await authClient.signOut()
      toast.success("Logged out successfully")
      router.push("/login")
    } catch { toast.error("Logout failed") }
  }

  const userDisplayName = user?.name || "Student"
  const userEmail = user?.email || "student@roxan.app"
  const userInitials = userDisplayName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)

  return (
    <div className="w-64 min-h-screen bg-sidebar border-r border-sidebar-border flex flex-col print:hidden">
      <div className="h-16 border-b border-sidebar-border px-6 flex items-center">
        <Link href="/student/dashboard" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <GraduationCap className="h-5 w-5 text-primary" />
          </div>
          <span className="text-lg font-semibold text-sidebar-foreground">Student Portal</span>
        </Link>
      </div>

      <nav className="flex-1 space-y-8 px-4 py-6 overflow-y-auto">
        {navigation.map(section => (
          <div key={section.title}>
            <h3 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/60">{section.title}</h3>
            <ul className="space-y-1">
              {section.items.map(item => {
                const isActive = pathname === item.href || pathname?.startsWith(item.href + "/")
                const Icon = item.icon
                return (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 h-10 rounded-lg text-sm font-medium transition-all duration-200",
                        isActive ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                      )}
                    >
                      <Icon className="h-4 w-4 flex-shrink-0" />
                      <span className="flex-1">{item.name}</span>
                      {isActive && <div className="w-1 h-6 bg-primary rounded-r ml-auto" />}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="mt-auto border-t border-sidebar-border p-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="w-full flex items-center gap-3 hover:bg-sidebar-accent/50 rounded-lg p-2 transition-colors">
              <Avatar className="h-8 w-8 flex-shrink-0">
                <AvatarImage src={user?.image || undefined} alt={userDisplayName} />
                <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">{userInitials}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-sm font-medium text-sidebar-foreground truncate">{userDisplayName}</p>
                <p className="text-xs text-sidebar-foreground/60 truncate">{userEmail}</p>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push("/student/profile")}><User className="h-4 w-4 mr-2" />Profile</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive"><LogOut className="h-4 w-4 mr-2" />Log out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
