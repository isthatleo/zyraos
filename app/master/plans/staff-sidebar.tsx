"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { authClient } from "@/lib/auth-client"
import { toast } from "sonner"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  LayoutDashboardIcon,
  UsersIcon,
  BookOpenIcon, // Not explicitly used in new nav, but kept for potential future use
  FileTextIcon,
  BarChart3Icon,
  FolderIcon,
  CalendarIcon,
  User,
  LogOut,
  Settings,
  GraduationCap, // For Grading Hub
  Bell, // For Messages, Alerts
  CheckCircle2, // For Mark Attendance
  Clock, // For Exam Scheduling
  ClipboardList, // For Assessments
  TrendingUp, // For Exam Analytics
} from "lucide-react"

const navigation = [
  {
    title: "Classes",
    items: [
      { name: "My Classes", href: "/staff/classes", icon: LayoutDashboardIcon },
      { name: "Lesson Plans", href: "/staff/lesson-plans", icon: FileTextIcon },
      { name: "Learning Content", href: "/staff/learning-content", icon: FolderIcon },
      { name: "Class Insights", href: "/staff/class-insights", icon: BarChart3Icon },
      { name: "My Schedule", href: "/staff/schedule", icon: CalendarIcon },
    ],
  },
  {
    title: "Grading & Tests",
    items: [
      { name: "Assignments", href: "/staff/assignments", icon: FileTextIcon },
      { name: "Grading Hub", href: "/staff/grading-hub", icon: GraduationCap },
    ],
  },
  {
    title: "Messages",
    items: [
      { name: "Messages", href: "/staff/messages", icon: Bell },
    ],
  },
  {
    title: "Attendance",
    items: [
      { name: "Mark Attendance", href: "/staff/mark-attendance", icon: CheckCircle2 },
      { name: "Biometric Hub", href: "/staff/biometric-hub", icon: UsersIcon },
      { name: "Daily Tracking", href: "/staff/daily-attendance", icon: CalendarIcon },
      { name: "Alerts", href: "/staff/attendance-alerts", icon: Bell },
    ],
  },
  {
    title: "Exams",
    items: [
      { name: "Scheduling", href: "/staff/exam-scheduling", icon: Clock },
      { name: "Assessments", href: "/staff/assessments", icon: ClipboardList },
      { name: "Results", href: "/staff/exam-results", icon: BarChart3Icon },
      { name: "Report Cards", href: "/staff/report-cards", icon: FileTextIcon },
      { name: "Exam Analytics", href: "/staff/exam-analytics", icon: TrendingUp },
    ],
  },
  {
    title: "Personal",
    items: [
      { name: "My Profile", href: "/staff/profile", icon: User },
    ],
  },
]

export default function StaffSidebar() {
  const pathname = usePathname()
  const router = useRouter()

  const { data: session } = authClient.useSession()
  const user = session?.user

  const handleLogout = async () => {
    try {
      await authClient.signOut()
      toast.success("Logged out successfully")
      router.push("/login")
    } catch {
      toast.error("Logout failed")
    }
  }

  const userDisplayName = user?.name || "Jane Doe"
  const userEmail = user?.email || "teacher@zyraos.com"
  const userInitials = userDisplayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  // Determine the base path for the current role
  const getProfilePath = () => {
    return "/staff/profile"; // For the staff portal, profile is directly under /staff
  };

  return (
    <div className="w-64 min-h-screen bg-sidebar border-r border-sidebar-border flex flex-col print:hidden">
      {/* Header */}
      <div className="h-16 border-b border-sidebar-border px-6 flex items-center">
        <Link href="/staff/dashboard" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <GraduationCap className="h-5 w-5 text-primary" />
          </div>
          <span className="text-lg font-semibold text-sidebar-foreground">Staff Portal</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-8 px-4 py-6 overflow-y-auto">
        {navigation.map((section) => (
          <div key={section.title}>
            <h3 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/60">
              {section.title}
            </h3>
            <ul className="space-y-1">
              {section.items.map((item) => {
                const isActive = pathname === item.href || (pathname && pathname.startsWith(item.href + "/"))
                const Icon = item.icon
                return (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 h-10 rounded-lg text-sm font-medium transition-all duration-200",
                        isActive
                          ? "bg-sidebar-accent text-sidebar-accent-foreground"
                          : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                      )}
                    >
                      <Icon className="h-4 w-4 flex-shrink-0" />
                      <span className="flex-1">{item.name}</span>
                      {isActive && (
                        <div className="w-1 h-6 bg-primary rounded-r ml-auto" />
                      )}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* User Profile pinned to bottom */}
      <div className="mt-auto border-t border-sidebar-border p-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="w-full flex items-center gap-3 hover:bg-sidebar-accent/50 rounded-lg p-2 transition-colors">
              <Avatar className="h-8 w-8 flex-shrink-0">
                <AvatarImage src={user?.image || undefined} alt={userDisplayName} />
                <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                  {userInitials}
                </AvatarFallback>
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
            <DropdownMenuItem onClick={() => router.push(getProfilePath())}>
              <User className="h-4 w-4 mr-2" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push("/staff/settings")}> {/* Assuming staff settings page */}
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
              <LogOut className="h-4 w-4 mr-2" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}