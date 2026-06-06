"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { Bell, CheckCheck, Clock, MessageSquare } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { connectRealtimeSocket, socket } from "@/lib/socket";
import { useAuthStore } from "@/stores/auth";

type Member = { id: string; name: string; email: string; image?: string | null };
type ConversationPreview = {
  id: string;
  name: string;
  members: Member[];
  lastMessage?: { content: string; createdAt: string; senderId: string } | null;
  unreadCount: number;
};
type NotificationPreview = {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  targetUrl?: string | null;
};

function initials(name?: string | null) {
  return (name || "U")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function relativeTime(value?: string) {
  if (!value) return "";
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.max(1, Math.floor(diff / 60000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function TopbarActivityButtons() {
  const router = useRouter();
  const pathname = usePathname() || "";
  const { user } = useAuthStore();
  const [messages, setMessages] = React.useState<ConversationPreview[]>([]);
  const [notifications, setNotifications] = React.useState<NotificationPreview[]>([]);
  const [messageCount, setMessageCount] = React.useState(0);
  const [notificationCount, setNotificationCount] = React.useState(0);

  const load = React.useCallback(async () => {
    const [messageResponse, notificationResponse] = await Promise.all([
      fetch("/api/messages?type=unread", { cache: "no-store" }).catch(() => null),
      fetch("/api/notifications?unreadOnly=true", { cache: "no-store" }).catch(() => null),
    ]);

    if (messageResponse?.ok) {
      const data = await messageResponse.json().catch(() => ({}));
      if (data.currentUser?.id) {
        void connectRealtimeSocket({ userId: data.currentUser.id, tenantId: data.currentUser.tenantId });
      }
      setMessages(Array.isArray(data.conversations) ? data.conversations : []);
      setMessageCount(Number(data.unreadCount || 0));
    }

    if (notificationResponse?.ok) {
      const data = await notificationResponse.json().catch(() => ({}));
      const next = Array.isArray(data.notifications) ? data.notifications : [];
      setNotifications(next.slice(0, 8));
      setNotificationCount(next.length);
    }
  }, []);

  React.useEffect(() => {
    if (user?.id) {
      void connectRealtimeSocket({ userId: user.id });
    }
    const onNotification = (payload?: { type?: string }) => {
      if (payload?.type === "message.read") {
        void load();
        return;
      }
      setNotificationCount((count) => count + 1);
      void load();
    };
    const onMessage = () => {
      setMessageCount((count) => count + 1);
      void load();
    };
    const onRead = () => void load();
    const notificationEvents = ["notification", "notification:new", "new_notification", "new_broadcast", "broadcast.new", "announcement.new"];
    notificationEvents.forEach((event) => socket.on(event, onNotification));
    socket.on("message:new", onMessage);
    socket.on("message:read", onRead);
    const timeoutId = window.setTimeout(() => void load(), 150);
    const interval = window.setInterval(load, 60000);
    return () => {
      notificationEvents.forEach((event) => socket.off(event, onNotification));
      socket.off("message:new", onMessage);
      socket.off("message:read", onRead);
      window.clearTimeout(timeoutId);
      window.clearInterval(interval);
    };
  }, [load, user?.id]);

  const dashboardRoute = React.useCallback(
    (page: "messages" | "notifications") => {
      const segments = pathname.split("/").filter(Boolean);
      const [first, second] = segments;
      if (first === "master") return `/master/${page}`;

      const rootDashboardSegments = new Set([
        "admin",
        "staff",
        "student",
        "parent",
        "finance",
        "librarian",
        "hr",
        "canteen",
      ]);
      if (first && rootDashboardSegments.has(first)) return `/${first}/${page}`;

      const tenantDashboardSegments = new Set([
        "admin",
        "school_admin",
        "owner",
        "staff",
        "teacher",
        "student",
        "parent",
        "finance",
        "librarian",
        "hr",
        "canteen",
        "health",
        "transport",
        "hostel",
        "security",
        "reception",
        "inventory",
        "wellbeing",
        "alumni",
      ]);
      if (first && second && tenantDashboardSegments.has(second)) return `/${first}/${second}/${page}`;

      const rootSegments = new Set([
        ...rootDashboardSegments,
        "messages",
        "notifications",
        "profile",
        "settings",
      ]);

      if (first && !rootSegments.has(first)) return `/${first}/${page}`;
      return `/${page}`;
    },
    [pathname]
  );

  const openConversation = (conversationId: string) => {
    router.push(`${dashboardRoute("messages")}?conversationId=${encodeURIComponent(conversationId)}`);
  };

  const openNotification = async (notification: NotificationPreview) => {
    setNotifications((current) => current.filter((item) => item.id !== notification.id));
    setNotificationCount((count) => Math.max(0, count - 1));
    await fetch(`/api/notifications/${encodeURIComponent(notification.id)}/read`, { method: "POST" }).catch(() => null);
    router.push(notification.targetUrl || `${dashboardRoute("notifications")}?notificationId=${encodeURIComponent(notification.id)}`);
    void load();
  };

  return (
    <>
      <DropdownMenu onOpenChange={(open) => open && void load()}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="relative" aria-label="Open recent messages">
            <MessageSquare className="size-4" />
            {messageCount > 0 && <Badge className="absolute -right-1 -top-1 size-5 p-0 text-[10px]">{messageCount}</Badge>}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-96">
          <DropdownMenuLabel className="flex items-center justify-between">
            <span>Unread messages</span>
            <Badge variant="secondary">{messageCount}</Badge>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {messages.length ? (
            messages.map((conversation) => {
              const firstMember = conversation.members?.[0];
              return (
                <DropdownMenuItem
                  key={conversation.id}
                  className="items-start gap-3 p-3"
                  onClick={() => openConversation(conversation.id)}
                >
                  <Avatar className="mt-0.5 size-9">
                    <AvatarImage src={firstMember?.image || undefined} />
                    <AvatarFallback>{initials(conversation.name)}</AvatarFallback>
                  </Avatar>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-3">
                      <span className="truncate text-sm font-medium">{conversation.name}</span>
                      <span className="shrink-0 text-[11px] text-muted-foreground">{relativeTime(conversation.lastMessage?.createdAt)}</span>
                    </span>
                    <span className="line-clamp-2 text-xs text-muted-foreground">{conversation.lastMessage?.content || "New message"}</span>
                  </span>
                </DropdownMenuItem>
              );
            })
          ) : (
            <div className="px-3 py-8 text-center text-sm text-muted-foreground">No unread messages.</div>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem className="justify-center font-medium" onClick={() => router.push(dashboardRoute("messages"))}>
            Open messages page
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu onOpenChange={(open) => open && void load()}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="relative" aria-label="Open recent notifications">
            <Bell className="size-4" />
            {notificationCount > 0 && <Badge variant="destructive" className="absolute -right-1 -top-1 size-5 p-0 text-[10px]">{notificationCount}</Badge>}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-96">
          <DropdownMenuLabel className="flex items-center justify-between">
            <span>Notifications</span>
            <Badge variant="secondary">{notificationCount}</Badge>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {notifications.length ? (
            notifications.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className="items-start gap-3 p-3"
                onClick={() => void openNotification(notification)}
              >
                <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  {notification.type === "message" ? <MessageSquare className="size-4" /> : <Bell className="size-4" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-3">
                    <span className="truncate text-sm font-medium">{notification.title}</span>
                    <span className="shrink-0 text-[11px] text-muted-foreground">{relativeTime(notification.createdAt)}</span>
                  </span>
                  <span className="line-clamp-2 text-xs text-muted-foreground">{notification.message}</span>
                </span>
              </DropdownMenuItem>
            ))
          ) : (
            <div className="px-3 py-8 text-center text-sm text-muted-foreground">
              <CheckCheck className="mx-auto mb-2 size-5 text-primary" />
              No unread notifications.
            </div>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem className="justify-center gap-2 font-medium" onClick={() => router.push(dashboardRoute("notifications"))}>
            <Clock className="size-4" />
            Open notifications page
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
