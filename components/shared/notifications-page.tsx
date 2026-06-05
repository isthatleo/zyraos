"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Bell,
  CheckCheck,
  CircleAlert,
  Clock,
  CreditCard,
  Filter,
  Mail,
  Megaphone,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Notification = {
  id: string;
  type: "message" | "academic" | "billing" | "system" | "alert";
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  targetUrl?: string | null;
  metadata?: Record<string, unknown>;
};

const typeMeta = {
  message: { label: "Messages", icon: Mail, tone: "text-blue-500", bg: "bg-blue-500/10" },
  academic: { label: "Academics", icon: Bell, tone: "text-emerald-500", bg: "bg-emerald-500/10" },
  billing: { label: "Billing", icon: CreditCard, tone: "text-amber-500", bg: "bg-amber-500/10" },
  system: { label: "System", icon: ShieldCheck, tone: "text-primary", bg: "bg-primary/10" },
  alert: { label: "Alerts", icon: CircleAlert, tone: "text-destructive", bg: "bg-destructive/10" },
};

function relativeTime(value: string) {
  const diff = Date.now() - Date.parse(value);
  const minutes = Math.max(0, Math.floor(diff / 60000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function NotificationsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [notifications, setNotifications] = React.useState<Notification[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [activeType, setActiveType] = React.useState<"all" | Notification["type"]>("all");
  const [readFilter, setReadFilter] = React.useState<"all" | "unread" | "read">("all");
  const [query, setQuery] = React.useState("");
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  const selected = notifications.find((notification) => notification.id === selectedId) || notifications[0] || null;
  const unread = notifications.filter((item) => !item.read).length;
  const actionable = notifications.filter((item) => item.targetUrl).length;
  const latest = notifications[0] || null;
  const countsByType = React.useMemo(() => {
    return notifications.reduce<Record<string, number>>((acc, notification) => {
      acc[notification.type] = (acc[notification.type] || 0) + 1;
      return acc;
    }, {});
  }, [notifications]);
  const filtered = React.useMemo(() => {
    const text = query.trim().toLowerCase();
    return notifications.filter((notification) => {
      const matchesType = activeType === "all" || notification.type === activeType;
      const matchesRead =
        readFilter === "all" ||
        (readFilter === "unread" && !notification.read) ||
        (readFilter === "read" && notification.read);
      const matchesQuery =
        !text ||
        [notification.title, notification.message, notification.type, JSON.stringify(notification.metadata || {})]
          .join(" ")
          .toLowerCase()
          .includes(text);
      return matchesType && matchesRead && matchesQuery;
    });
  }, [activeType, notifications, query, readFilter]);

  const load = React.useCallback(async () => {
    setLoading(true);
    const response = await fetch("/api/notifications", { cache: "no-store" }).catch(() => null);
    setLoading(false);
    if (!response?.ok) {
      toast.error("Could not load notifications");
      return;
    }
    const data = await response.json().catch(() => ({}));
    const next = data.notifications || [];
    setNotifications(next);
    const requested = searchParams?.get("notificationId");
    setSelectedId((current) => requested || current || next[0]?.id || null);
  }, [searchParams]);

  React.useEffect(() => {
    void load();
  }, [load]);

  React.useEffect(() => {
    const notificationId = searchParams?.get("notificationId");
    if (notificationId) void markRead(notificationId);
  }, [searchParams]);

  const markRead = async (id: string) => {
    await fetch(`/api/notifications/${encodeURIComponent(id)}/read`, { method: "POST" }).catch(() => null);
    setNotifications((items) => items.map((item) => (item.id === id ? { ...item, read: true } : item)));
  };

  const openNotification = async (notification: Notification) => {
    setSelectedId(notification.id);
    await markRead(notification.id);
    if (notification.targetUrl) {
      router.push(notification.targetUrl);
    }
  };

  const markAllRead = async () => {
    const response = await fetch("/api/notifications/mark-all-read", { method: "POST" }).catch(() => null);
    if (!response?.ok) {
      toast.error("Could not mark notifications read");
      return;
    }
    setNotifications((items) => items.map((item) => ({ ...item, read: true })));
    toast.success("All notifications marked read");
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Operations inbox</p>
          <h1 className="text-3xl font-semibold tracking-tight">Notifications</h1>
          <p className="text-muted-foreground">Messages, academic events, billing reminders, audit activity, and system alerts.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => void load()} disabled={loading}>
            {loading ? <RefreshCw className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
            Refresh
          </Button>
          <Button onClick={() => void markAllRead()} disabled={unread === 0}>
            <CheckCheck className="size-4" />
            Mark all read
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{notifications.length}</p>
            <p className="mt-1 text-xs text-muted-foreground">All generated events</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Unread</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-primary">{unread}</p>
            <p className="mt-1 text-xs text-muted-foreground">Needs attention</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Actionable</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{actionable}</p>
            <p className="mt-1 text-xs text-muted-foreground">Linked to pages</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Latest</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="truncate text-sm font-medium">{latest?.title || "No events"}</p>
            <p className="mt-1 text-xs text-muted-foreground">{latest ? relativeTime(latest.createdAt) : "Live API"}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[22rem_1fr]">
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="size-5 text-primary" />
              Filters
            </CardTitle>
            <CardDescription>Focus the inbox by source, status, or keyword.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search notifications..." className="pl-9" />
            </div>

            <Tabs value={readFilter} onValueChange={(value) => setReadFilter(value as typeof readFilter)}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="unread">Unread</TabsTrigger>
                <TabsTrigger value="read">Read</TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setActiveType("all")}
                className={cn(
                  "flex w-full items-center justify-between rounded-xl border p-3 text-left text-sm transition-colors hover:bg-muted/60",
                  activeType === "all" && "border-primary/40 bg-primary/10"
                )}
              >
                <span className="flex items-center gap-2">
                  <Sparkles className="size-4 text-primary" />
                  All notifications
                </span>
                <Badge variant="secondary">{notifications.length}</Badge>
              </button>
              {(Object.keys(typeMeta) as Notification["type"][]).map((type) => {
                const meta = typeMeta[type];
                const Icon = meta.icon;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setActiveType(type)}
                    className={cn(
                      "flex w-full items-center justify-between rounded-xl border p-3 text-left text-sm transition-colors hover:bg-muted/60",
                      activeType === type && "border-primary/40 bg-primary/10"
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <span className={cn("flex size-8 items-center justify-center rounded-lg", meta.bg)}>
                        <Icon className={cn("size-4", meta.tone)} />
                      </span>
                      {meta.label}
                    </span>
                    <Badge variant="secondary">{countsByType[type] || 0}</Badge>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <div className="grid min-h-[42rem] overflow-hidden rounded-3xl border bg-card lg:grid-cols-[1fr_22rem]">
          <section className="min-h-0 border-r">
            <div className="flex items-center justify-between border-b p-4">
              <div>
                <h2 className="font-semibold">Inbox</h2>
                <p className="text-sm text-muted-foreground">{filtered.length} matching events</p>
              </div>
              <Badge variant="outline">Live data</Badge>
            </div>
            <ScrollArea className="h-[38rem]">
              <div className="space-y-2 p-3">
                {loading && <p className="p-6 text-center text-sm text-muted-foreground">Loading notifications...</p>}
                {!loading && filtered.length === 0 && (
                  <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                    <Bell className="mx-auto mb-2 size-8" />
                    No notifications match this view.
                  </div>
                )}
                {filtered.map((notification) => {
                  const meta = typeMeta[notification.type] || typeMeta.system;
                  const Icon = meta.icon;
                  return (
                    <button
                      key={notification.id}
                      onClick={() => setSelectedId(notification.id)}
                      onDoubleClick={() => void openNotification(notification)}
                      className={cn(
                        "flex w-full items-start gap-4 rounded-2xl border p-4 text-left transition-colors hover:bg-muted/50",
                        selectedId === notification.id && "border-primary/50 bg-primary/10",
                        !notification.read && selectedId !== notification.id && "border-primary/30 bg-primary/5"
                      )}
                    >
                      <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-2xl", meta.bg)}>
                        <Icon className={cn("size-5", meta.tone)} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="truncate font-medium">{notification.title}</span>
                          {!notification.read && <Badge>New</Badge>}
                          {notification.targetUrl && <Badge variant="outline">Action</Badge>}
                        </span>
                        <span className="mt-1 line-clamp-2 text-sm text-muted-foreground">{notification.message}</span>
                        <span className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="size-3.5" />
                          {relativeTime(notification.createdAt)}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          </section>

          <aside className="flex min-h-0 flex-col bg-muted/15">
            <div className="border-b p-4">
              <p className="text-sm font-medium text-muted-foreground">Selected notification</p>
              <h2 className="mt-1 text-lg font-semibold">{selected?.title || "No notification selected"}</h2>
            </div>
            {selected ? (
              <div className="flex flex-1 flex-col gap-4 p-4">
                <div className="rounded-2xl border bg-background p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <Badge variant={selected.read ? "secondary" : "default"}>{selected.read ? "Read" : "Unread"}</Badge>
                    <span className="text-xs text-muted-foreground">{formatDate(selected.createdAt)}</span>
                  </div>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{selected.message}</p>
                </div>

                <div className="rounded-2xl border bg-background p-4">
                  <p className="mb-3 text-sm font-medium">Metadata</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between gap-3">
                      <span className="text-muted-foreground">Type</span>
                      <span className="capitalize">{typeMeta[selected.type]?.label || selected.type}</span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-muted-foreground">ID</span>
                      <span className="max-w-40 truncate font-mono text-xs">{selected.id}</span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-muted-foreground">Target</span>
                      <span className="max-w-40 truncate text-xs">{selected.targetUrl || "Notifications page"}</span>
                    </div>
                  </div>
                  {selected.metadata && Object.keys(selected.metadata).length > 0 ? (
                    <>
                      <Separator className="my-3" />
                      <pre className="max-h-32 overflow-auto rounded-xl bg-muted p-3 text-xs">
                        {JSON.stringify(selected.metadata, null, 2)}
                      </pre>
                    </>
                  ) : null}
                </div>

                <div className="mt-auto grid gap-2">
                  <Button onClick={() => void openNotification(selected)}>
                    {selected.targetUrl ? "Open target page" : "Open notifications page"}
                  </Button>
                  {!selected.read && (
                    <Button variant="outline" onClick={() => void markRead(selected.id)}>
                      <CheckCheck className="size-4" />
                      Mark as read
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-muted-foreground">
                Select a notification from the inbox.
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
