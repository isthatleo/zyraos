"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { 
  Bell, 
  ChevronRight, 
  LogOut, 
  MessageSquare, 
  Moon, 
  Settings, 
  Sun, 
  User,
} from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";

interface DashboardNavProps {
  user?: {
    name: string;
    email: string;
    image?: string;
    role: string;
  };
}

export function DashboardNav({ user }: DashboardNavProps) {
  const pathname = usePathname() || "";
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  const [notifications, setNotifications] = React.useState([
    { id: "1", title: "New school provisioned", time: "2m ago", read: false },
    { id: "2", title: "Payment received", time: "1h ago", read: false },
    { id: "3", title: "System update scheduled", time: "5h ago", read: false },
  ]);

  React.useEffect(() => setMounted(true), []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const clearNotifications = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
    toast.success("Notifications cleared");
  };

  // Determine dashboard base path for "Home" link
  const getDashboardPath = () => {
    if (pathname.startsWith("/master")) return "/master/dashboard";
    // For tenant paths like /tenant/school-name/...
    const tenantMatch = pathname.match(/^\/tenant\/([^/]+)/);
    if (tenantMatch) return `/tenant/${tenantMatch[1]}/dashboard`;
    return "/dashboard";
  };

  // Generate breadcrumbs from pathname
  const pathSegments = pathname.split("/").filter(Boolean);
  const breadcrumbs = pathSegments.map((segment, index) => {
    const href = "/" + pathSegments.slice(0, index + 1).join("/");
    const label = segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, " ");
    const isLast = index === pathSegments.length - 1;
    return { label, href, isLast };
  });

  // Determine profile path
  const getProfilePath = () => {
    if (pathname.startsWith("/master")) return "/master/profile";
    if (pathname.startsWith("/admin")) return "/admin/profile";
    if (pathname.startsWith("/staff")) return "/staff/profile";
    if (pathname.startsWith("/student")) return "/student/profile";
    if (pathname.startsWith("/parent")) return "/parent/profile";
    if (pathname.startsWith("/hr")) return "/hr/profile";
    if (pathname.startsWith("/accountant")) return "/accountant/profile";
    // For tenant paths like /tenant/school-name/...
    const tenantMatch = pathname.match(/^\/tenant\/([^/]+)/);
    if (tenantMatch) return `/tenant/${tenantMatch[1]}/profile`;
    return "/profile";
  };

  const handleLogout = async () => {
    try {
      await authClient.signOut();
      toast.success("Logged out successfully");
      router.push("/master/login");
    } catch {
      toast.info("Logging out...");
      router.push("/login");
    }
  };

  if (!mounted) return null;

  const isStudent = user?.role === "student";

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b bg-background/95 px-6 backdrop-blur supports-[backdrop-filter]:bg-background/60 print:hidden">
      {/* Dynamic Breadcrumbs — Home goes to /dashboard, NOT logout */}
      <Breadcrumb className="hidden md:flex">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href={getDashboardPath()} className="hover:text-primary transition-colors">
              Home
            </BreadcrumbLink>
          </BreadcrumbItem>
          {breadcrumbs.map((crumb) => (
            <React.Fragment key={crumb.href}>
              <BreadcrumbSeparator>
                <ChevronRight className="h-4 w-4" />
              </BreadcrumbSeparator>
              <BreadcrumbItem>
                {crumb.isLast ? (
                  <BreadcrumbPage className="font-semibold text-foreground">
                    {crumb.label}
                  </BreadcrumbPage>
                ) : (
                  <BreadcrumbLink href={crumb.href} className="hover:text-primary transition-colors">
                    {crumb.label}
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </React.Fragment>
          ))}
        </BreadcrumbList>
      </Breadcrumb>

      {/* Mobile Breadcrumb */}
      <div className="md:hidden font-semibold">
        {breadcrumbs[breadcrumbs.length - 1]?.label || "Dashboard"}
      </div>

      <div className="flex items-center gap-2 md:gap-4">
        {/* Theme Toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="rounded-full hover:bg-accent"
        >
          {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          <span className="sr-only">Toggle theme</span>
        </Button>

        {/* Messages */}
        <Button variant="ghost" size="icon" className="rounded-full hover:bg-accent relative">
          <MessageSquare className="h-5 w-5" />
        </Button>

        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full hover:bg-accent relative">
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-[10px] font-bold bg-destructive text-destructive-foreground">
                  {unreadCount}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <div className="flex items-center justify-between p-4 pb-2">
              <DropdownMenuLabel className="p-0 text-base font-bold">Notifications</DropdownMenuLabel>
              {unreadCount > 0 && (
                <Button variant="ghost" size="sm" onClick={clearNotifications} className="h-auto p-0 text-xs text-primary hover:bg-transparent">
                  Mark all as read
                </Button>
              )}
            </div>
            <DropdownMenuSeparator />
            <div className="max-h-80 overflow-y-auto">
              {notifications.map((notif) => (
                <DropdownMenuItem key={notif.id} className={cn("flex flex-col items-start gap-1 p-4 cursor-default", !notif.read && "bg-accent/50")}>
                  <div className="flex w-full items-center justify-between">
                    <span className="font-semibold text-sm">{notif.title}</span>
                    {!notif.read && <div className="h-2 w-2 rounded-full bg-primary" />}
                  </div>
                  <span className="text-xs text-muted-foreground">{notif.time}</span>
                </DropdownMenuItem>
              ))}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Profile Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-10 w-10 rounded-full border border-border/50 hover:bg-accent p-0 overflow-hidden">
              <Avatar className="h-10 w-10">
                <AvatarImage src={user?.image || undefined} alt={user?.name || "User"} />
                <AvatarFallback className="bg-gradient-to-br from-primary to-chart-1 text-primary-foreground font-bold">
                  {(user?.name || "AD").substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-64" align="end" forceMount>
            <DropdownMenuLabel className="font-normal p-4">
              <div className="flex flex-col space-y-2">
                <p className="text-sm font-bold">{user?.name || "System Admin"}</p>
                <p className="text-xs text-muted-foreground">{user?.email || "admin@roxan.app"}</p>
                <Badge variant="outline" className="w-fit text-[10px] uppercase font-bold tracking-wider">
                  {user?.role || "Administrator"}
                </Badge>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup className="p-1">
              <DropdownMenuItem onClick={() => router.push(getProfilePath())} className="gap-3 py-2 cursor-pointer">
                <User className="h-4 w-4" />
                My Profile
              </DropdownMenuItem>
              {!isStudent && (
                <DropdownMenuItem onClick={() => router.push("/settings")} className="gap-3 py-2 cursor-pointer">
                  <Settings className="h-4 w-4" />
                  Settings
                </DropdownMenuItem>
              )}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="gap-3 py-2 text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer">
              <LogOut className="h-4 w-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
