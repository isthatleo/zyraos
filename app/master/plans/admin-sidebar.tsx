"use client";

import Link from "next/link"; // Keep Link
import { LayoutDashboard, Users, Settings, Shield, BookOpen, CalendarCheck, FileText, BarChart, ScrollText, MessageSquare, Megaphone } from "lucide-react"; // Removed unused GraduationCap
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function AdminSidebar() {
  const pathname = usePathname();

  const navItems = [
    {
      title: "Dashboard",
      href: "/admin/dashboard",
      icon: LayoutDashboard,
    },
    {
      title: "Users",
      href: "/admin/students", // Assuming /admin/students and /admin/staff are under a common 'Users' section
      icon: Users,
      subItems: [
        { title: "Students", href: "/admin/students" },
        { title: "Staff", href: "/admin/staff" },
      ],
    },
    {
      title: "Academics",
      href: "/admin/subjects",
      icon: BookOpen,
      subItems: [
        { title: "Subjects", href: "/admin/subjects" },
        { title: "Classes", href: "/admin/classes" },
        { title: "Assignments", href: "/admin/assignments" },
        { title: "Exams & Results", href: "/admin/exams" },
      ],
    },
    {
      title: "Attendance",
      href: "/admin/attendance",
      icon: CalendarCheck,
    },
    {
      title: "Communication",
      href: "/admin/communication", // Link to the new communication page
      icon: MessageSquare,
      subItems: [
        { title: "Messages", href: "/admin/communication?tab=messages" },
        { title: "Broadcasts", href: "/admin/communication?tab=broadcasts" },
      ],
    },
    {
      title: "Roles & Permissions",
      href: "/admin/roles",
      icon: Shield,
    },
    {
      title: "Analytics",
      href: "/admin/analytics",
      icon: BarChart,
    },
    {
      title: "Audit Logs",
      href: "/admin/audit",
      icon: ScrollText,
    },
    {
      title: "Settings",
      href: "/admin/settings",
      icon: Settings,
    },
  ];

  return (
    <aside className="w-64 bg-background border-r h-full flex flex-col p-4">
      <div className="flex items-center gap-2 px-2 py-4 border-b">
        {/* School Logo/Name */}
        <span className="font-bold text-lg">Admin Panel</span>
      </div>
      <nav className="flex-1 mt-4 space-y-1">
        {navItems.map((item) => (
          <div key={item.title}>
            <Link
              href={item.href}
              className={cn(
                "flex items-center gap-2 px-2 py-2 rounded-md text-sm font-medium hover:bg-muted transition-colors",
                pathname.startsWith(item.href) ? "bg-primary text-primary-foreground" : "text-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.title}
            </Link>
            {item.subItems && (
              <div className="ml-6 mt-1 space-y-1">
                {item.subItems.map((subItem) => (
                  <Link
                    key={subItem.title}
                    href={subItem.href}
                    className={cn(
                      "flex items-center gap-2 px-2 py-1 rounded-md text-xs text-muted-foreground hover:bg-muted transition-colors",
                      pathname.startsWith(subItem.href) ? "bg-primary/10 text-primary" : ""
                    )}
                  >
                    {subItem.title}
                  </Link>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>
    </aside>
  );
}
