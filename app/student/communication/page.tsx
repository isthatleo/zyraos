"use client"

import * as React from "react"
import { usePathname, useRouter } from "next/navigation"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import {
  AlertCircle,
  ArrowLeft,
  Bell,
  Download,
  HelpCircle,
  Loader2,
  Megaphone,
  MessageSquare,
  RefreshCcw,
  Search,
  Send,
  Users,
} from "lucide-react"
import { toast } from "sonner"

import { MessagesPage } from "@/components/shared/messages-page"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

type User = { id: string; fullName?: string; name?: string; email: string; role?: string; avatar?: string | null }
type Conversation = {
  id?: string
  user?: User
  lastMessage?: { message?: string; content?: string; createdAt?: string; read?: boolean; senderId?: string }
  unreadCount?: number
}
type Notification = { id: string; type: string; title: string; message: string; read: boolean; createdAt: string; targetUrl?: string | null; metadata?: Record<string, unknown> }
type Feedback = { id: string; title: string; message: string; category: string; priority: string; status: string; createdAt: string; updatedAt: string }
type CommunicationHealth = {
  productionReady: boolean
  warnings: string[]
  messaging: { endpoint: string; authenticated: boolean; role: string }
  realtime: { configured: boolean; mode: string; path: string }
  webRtc: { stunEnabled: boolean; turnConfigured: boolean; turnServerCount: number; turnCredentialsConfigured: boolean }
}

type CommunicationPayload = {
  currentUser?: { id: string; name?: string; fullName?: string; email: string; role: string }
  conversations: Conversation[]
  users: User[]
  unreadCount: number
  notifications: Notification[]
  feedback: Feedback[]
  partialErrors: string[]
  health: CommunicationHealth | null
}

function formatDate(value?: string | null) {
  if (!value) return "Not dated"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Not dated"
  return new Intl.DateTimeFormat("en", { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(date)
}

function displayName(user?: User | null) {
  return user?.fullName || user?.name || user?.email || "User"
}

function downloadFile(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export default function StudentCommunicationPage() {
  const router = useRouter()
  const pathname = usePathname()
  const [queryClient] = React.useState(() => new QueryClient({ defaultOptions: { queries: { refetchOnWindowFocus: false, retry: 1 } } }))
  const [payload, setPayload] = React.useState<CommunicationPayload | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [refreshing, setRefreshing] = React.useState(false)
  const [error, setError] = React.useState("")
  const [partialErrors, setPartialErrors] = React.useState<string[]>([])
  const [health, setHealth] = React.useState<CommunicationHealth | null>(null)
  const [query, setQuery] = React.useState("")
  const [composeOpen, setComposeOpen] = React.useState(false)
  const [supportOpen, setSupportOpen] = React.useState(false)
  const [selectedUserId, setSelectedUserId] = React.useState("")
  const [messageBody, setMessageBody] = React.useState("")
  const [supportTitle, setSupportTitle] = React.useState("")
  const [supportMessage, setSupportMessage] = React.useState("")
  const [supportPriority, setSupportPriority] = React.useState("normal")
  const [submitting, setSubmitting] = React.useState(false)

  const tenantPrefix = React.useMemo(() => {
    const segments = (pathname ?? "").split("/").filter(Boolean)
    return segments[1] === "student" ? `/${segments[0]}` : ""
  }, [pathname])

  const tenantSlug = tenantPrefix ? tenantPrefix.slice(1) : ""
  const studentHref = React.useCallback((href: string) => `${tenantPrefix}${href}`, [tenantPrefix])
  const messagesApiBase = tenantSlug ? `/api/tenant/${tenantSlug}/messages` : "/api/messages"
  const healthEndpoint = tenantSlug ? `/api/tenant/student/communication/health?tenant=${encodeURIComponent(tenantSlug)}` : "/api/student/communication/health"
  const communicationHref = React.useCallback((params = "") => `${studentHref("/student/communication")}${params}`, [studentHref])

  const normalizeNotificationTarget = React.useCallback((notification: Notification) => {
    if (notification.type === "message") return communicationHref()
    if (notification.targetUrl?.startsWith("/messages")) return communicationHref(notification.targetUrl.includes("?") ? notification.targetUrl.slice(notification.targetUrl.indexOf("?")) : "")
    if (notification.targetUrl?.includes("tab=feedback")) return communicationHref("?tab=support")
    if (!notification.targetUrl) return communicationHref(`?notificationId=${encodeURIComponent(notification.id)}`)
    if (tenantPrefix && notification.targetUrl.startsWith("/") && !notification.targetUrl.startsWith(tenantPrefix)) return `${tenantPrefix}${notification.targetUrl}`
    return notification.targetUrl
  }, [communicationHref, tenantPrefix])

  const loadCommunication = React.useCallback(async (notify = false) => {
    setLoading(true)
    setError("")
    setPartialErrors([])
    const [conversationResponse, usersResponse, unreadResponse, notificationsResponse, feedbackResponse, healthResponse] = await Promise.all([
      fetch(`${messagesApiBase}?type=conversations`, { cache: "no-store", credentials: "include" }).catch(() => null),
      fetch(`${messagesApiBase}?type=available-users&search=`, { cache: "no-store", credentials: "include" }).catch(() => null),
      fetch(`${messagesApiBase}?type=unread`, { cache: "no-store", credentials: "include" }).catch(() => null),
      fetch("/api/notifications?unreadOnly=false", { cache: "no-store", credentials: "include" }).catch(() => null),
      fetch("/api/feedback?scope=mine", { cache: "no-store", credentials: "include" }).catch(() => null),
      fetch(healthEndpoint, { cache: "no-store", credentials: "include" }).catch(() => null),
    ])

    const conversationsData = conversationResponse?.ok ? await conversationResponse.json().catch(() => ({})) : {}
    const usersData = usersResponse?.ok ? await usersResponse.json().catch(() => ({})) : {}
    const unreadData = unreadResponse?.ok ? await unreadResponse.json().catch(() => ({})) : {}
    const notificationsData = notificationsResponse?.ok ? await notificationsResponse.json().catch(() => ({})) : {}
    const feedbackData = feedbackResponse?.ok ? await feedbackResponse.json().catch(() => ({})) : {}
    const healthData = healthResponse?.ok ? ((await healthResponse.json().catch(() => null)) as CommunicationHealth | null) : null
    const nextPartialErrors = [
      conversationResponse?.ok ? "" : "Conversation threads are temporarily unavailable.",
      usersResponse?.ok ? "" : "Contact directory is temporarily unavailable.",
      unreadResponse?.ok ? "" : "Unread message count is temporarily unavailable.",
      notificationsResponse?.ok ? "" : "Notifications are temporarily unavailable.",
      feedbackResponse?.ok ? "" : "Support request history is temporarily unavailable.",
      healthResponse?.ok ? "" : "Communication readiness checks are temporarily unavailable.",
      ...(healthData?.warnings || []),
    ].filter(Boolean)

    const nextPayload = {
      currentUser: conversationsData.currentUser || usersData.currentUser,
      conversations: conversationsData.conversations || [],
      users: usersData.users || [],
      unreadCount: Number(unreadData.unreadCount || 0),
      notifications: notificationsData.notifications || [],
      feedback: feedbackData.feedback || [],
      partialErrors: nextPartialErrors,
      health: healthData,
    }
    setPayload(nextPayload)
    setHealth(healthData)
    setPartialErrors(nextPartialErrors)
    setLoading(false)
    if (notify) {
      if (nextPartialErrors.length) toast.warning("Communications refreshed with partial data")
      else toast.success("Communications refreshed")
    }
  }, [healthEndpoint, messagesApiBase])

  React.useEffect(() => {
    void loadCommunication()
  }, [loadCommunication])

  const filteredUsers = (payload?.users || []).filter((user) => `${displayName(user)} ${user.email} ${user.role || ""}`.toLowerCase().includes(query.toLowerCase()))
  const activeFeedback = (payload?.feedback || []).filter((item) => !["closed", "resolved"].includes(String(item.status).toLowerCase()))
  const recentConversations = (payload?.conversations || []).slice(0, 6)
  const unreadNotifications = (payload?.notifications || []).filter((notification) => !notification.read)

  const refresh = () => {
    setRefreshing(true)
    queryClient.invalidateQueries()
    void loadCommunication(true).finally(() => setRefreshing(false))
  }

  const exportSummary = () => {
    if (!payload) return
    downloadFile("student-communications.json", JSON.stringify(payload, null, 2), "application/json")
    toast.success("Communication summary downloaded")
  }

  const exportCsv = () => {
    const rows = [
      ["section", "title", "detail", "status", "date"],
      ...(payload?.conversations || []).map((conversation) => [
        "conversation",
        displayName(conversation.user),
        conversation.lastMessage?.content || conversation.lastMessage?.message || "",
        String(conversation.unreadCount || 0),
        formatDate(conversation.lastMessage?.createdAt),
      ]),
      ...(payload?.notifications || []).map((notification) => [
        "notification",
        notification.title,
        notification.message,
        notification.read ? "read" : "unread",
        formatDate(notification.createdAt),
      ]),
      ...(payload?.feedback || []).map((item) => [
        "support",
        item.title,
        item.message,
        item.status,
        formatDate(item.updatedAt || item.createdAt),
      ]),
    ]
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n")
    downloadFile("student-communications.csv", csv, "text/csv")
    toast.success("Communication CSV downloaded")
  }

  const sendQuickMessage = async () => {
    const message = messageBody.trim()
    if (!selectedUserId) {
      toast.error("Select a recipient")
      return
    }
    if (!message) {
      toast.error("Message cannot be empty")
      return
    }
    setSubmitting(true)
    const response = await fetch(messagesApiBase, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ receiverId: selectedUserId, message }),
    }).catch(() => null)
    setSubmitting(false)
    if (!response?.ok) {
      const data = await response?.json().catch(() => ({}))
      toast.error(String(data?.error || "Failed to send message"))
      return
    }
    setMessageBody("")
    setSelectedUserId("")
    setComposeOpen(false)
    toast.success("Message sent")
    void loadCommunication()
    queryClient.invalidateQueries()
  }

  const openConversation = (conversation: Conversation) => {
    const userId = conversation.user?.id || conversation.id
    if (!userId) {
      toast.error("Conversation target is unavailable")
      return
    }
    router.push(communicationHref(`?userId=${encodeURIComponent(userId)}`))
  }

  const openNotification = async (notification: Notification) => {
    await fetch(`/api/notifications/${encodeURIComponent(notification.id)}/read`, { method: "POST", credentials: "include" }).catch(() => null)
    router.push(normalizeNotificationTarget(notification))
  }

  const sendSupportRequest = async () => {
    const title = supportTitle.trim()
    const message = supportMessage.trim()
    if (!title || !message) {
      toast.error("Title and message are required")
      return
    }
    setSubmitting(true)
    const response = await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ title, message, category: "support", priority: supportPriority, dashboardArea: "student-communication" }),
    }).catch(() => null)
    setSubmitting(false)
    if (!response?.ok) {
      const data = await response?.json().catch(() => ({}))
      toast.error(String(data?.error || "Failed to send support request"))
      return
    }
    setSupportTitle("")
    setSupportMessage("")
    setSupportPriority("normal")
    setSupportOpen(false)
    toast.success("Support request submitted")
    void loadCommunication()
  }

  if (loading && !payload) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
          Loading communications...
        </div>
      </div>
    )
  }

  if (error && !payload) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => router.push(studentHref("/student/dashboard"))}>
          <ArrowLeft className="mr-2 size-4" />
          Back to dashboard
        </Button>
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertTitle>Communications unavailable</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={() => void loadCommunication(true)}>
          <RefreshCcw className="mr-2 size-4" />
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-8">
      <Card className="overflow-hidden border-none bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.16),_transparent_35%),linear-gradient(135deg,_hsl(var(--card)),_hsl(var(--muted)))] shadow-sm">
        <CardHeader className="gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-3">
            <Button variant="ghost" className="w-fit px-0" onClick={() => router.push(studentHref("/student/dashboard"))}>
              <ArrowLeft className="mr-2 size-4" />
              Back to dashboard
            </Button>
            <div>
              <CardTitle className="text-3xl font-semibold tracking-tight">Student Communication</CardTitle>
              <CardDescription className="mt-2 max-w-3xl">
                Universal messages, class communication, unread alerts, support requests, and live chat in one student-aware page.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">{payload?.currentUser?.name || payload?.currentUser?.fullName || "Student"}</Badge>
              <Badge variant="outline">{payload?.currentUser?.role || "student"}</Badge>
              <Badge variant="outline">{tenantSlug || "root"}</Badge>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={refresh} disabled={refreshing}>
              {refreshing ? <Loader2 className="mr-2 size-4 animate-spin" /> : <RefreshCcw className="mr-2 size-4" />}
              Refresh
            </Button>
            <Button variant="outline" onClick={exportSummary} disabled={!payload}>
              <Download className="mr-2 size-4" />
              Export
            </Button>
            <Button variant="outline" onClick={exportCsv} disabled={!payload}>
              <Download className="mr-2 size-4" />
              CSV
            </Button>
            <Button variant="outline" onClick={() => setSupportOpen(true)}>
              <HelpCircle className="mr-2 size-4" />
              Support
            </Button>
            <Button onClick={() => setComposeOpen(true)}>
              <Send className="mr-2 size-4" />
              Quick message
            </Button>
          </div>
        </CardHeader>
      </Card>

      {partialErrors.length ? (
        <Alert>
          <AlertCircle className="size-4" />
          <AlertTitle>Partial communication data</AlertTitle>
          <AlertDescription>{partialErrors.join(" ")}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversations</CardTitle>
            <MessageSquare className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{payload?.conversations.length || 0}</div>
            <p className="text-xs text-muted-foreground">Universal message threads</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unread</CardTitle>
            <Bell className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{payload?.unreadCount || 0}</div>
            <p className="text-xs text-muted-foreground">{unreadNotifications.length} unread notification(s)</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Contacts</CardTitle>
            <Users className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{payload?.users.length || 0}</div>
            <p className="text-xs text-muted-foreground">Available school contacts</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Support</CardTitle>
            <HelpCircle className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{activeFeedback.length}</div>
            <p className="text-xs text-muted-foreground">Open feedback request(s)</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle>Recent Conversations</CardTitle>
            <CardDescription>Fast access to your latest universal message threads.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {recentConversations.map((conversation) => (
              <button
                key={conversation.id || conversation.user?.id}
                type="button"
                onClick={() => openConversation(conversation)}
                className="rounded-lg border p-4 text-left transition-colors hover:bg-muted/60"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate font-medium">{displayName(conversation.user)}</div>
                    <div className="line-clamp-1 text-sm text-muted-foreground">{conversation.lastMessage?.content || conversation.lastMessage?.message || "No messages yet"}</div>
                  </div>
                  <div className="shrink-0 text-right text-xs text-muted-foreground">
                    <div>{formatDate(conversation.lastMessage?.createdAt)}</div>
                    {(conversation.unreadCount || 0) > 0 ? <Badge className="mt-1">{conversation.unreadCount}</Badge> : null}
                  </div>
                </div>
              </button>
            ))}
            {!recentConversations.length ? <p className="rounded-lg border p-6 text-center text-sm text-muted-foreground">No conversations yet. Start one from the directory or quick message action.</p> : null}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Production Health</CardTitle>
            <CardDescription>Live endpoint coverage for this page.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {[
              ["Universal messages", Boolean(payload?.conversations)],
              ["Contact directory", !partialErrors.some((item) => item.includes("Contact"))],
              ["Notifications", !partialErrors.some((item) => item.includes("Notifications"))],
              ["Support tickets", !partialErrors.some((item) => item.includes("Support"))],
              ["Realtime socket", Boolean(health?.realtime?.configured) || health?.realtime?.mode === "app-fallback"],
              ["TURN for calls", Boolean(health?.webRtc?.turnConfigured)],
            ].map(([label, ok]) => (
              <div key={String(label)} className="flex items-center justify-between rounded-lg border p-3">
                <span>{label}</span>
                <Badge variant={ok ? "default" : "outline"}>{ok ? "Online" : "Degraded"}</Badge>
              </div>
            ))}
            {health ? (
              <div className="rounded-lg border p-3 text-xs text-muted-foreground">
                <div>Messages API: {health.messaging.endpoint}</div>
                <div>Socket: {health.realtime.mode} ({health.realtime.path})</div>
                <div>WebRTC: STUN enabled, {health.webRtc.turnServerCount} TURN server(s)</div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="chat" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="chat">Live Chat</TabsTrigger>
          <TabsTrigger value="directory">Directory</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
          <TabsTrigger value="support">Support</TabsTrigger>
        </TabsList>
        <TabsContent value="chat">
          <QueryClientProvider client={queryClient}>
            <MessagesPage apiBaseOverride={messagesApiBase} heading="Student Messages" />
          </QueryClientProvider>
        </TabsContent>
        <TabsContent value="directory" className="space-y-4">
          <Card>
            <CardHeader className="gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle>Message Directory</CardTitle>
                <CardDescription>Start a universal message with an allowed school contact.</CardDescription>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                <Input className="pl-9" placeholder="Search contacts" value={query} onChange={(event) => setQuery(event.target.value)} />
              </div>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {filteredUsers.map((user) => (
                <div key={user.id} className="rounded-lg border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate font-medium">{displayName(user)}</div>
                      <div className="truncate text-sm text-muted-foreground">{user.email}</div>
                      <Badge className="mt-2" variant="outline">{user.role || "user"}</Badge>
                    </div>
                    <Button size="sm" onClick={() => {
                      setSelectedUserId(user.id)
                      setComposeOpen(true)
                    }}>Message</Button>
                  </div>
                </div>
              ))}
              {!filteredUsers.length ? <p className="col-span-full rounded-lg border p-6 text-center text-sm text-muted-foreground">No contacts match the current search.</p> : null}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Universal Alerts</CardTitle>
              <CardDescription>Messages, broadcasts, announcements, and feedback updates loaded from notifications.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {(payload?.notifications || []).map((notification) => (
                <div key={notification.id} className={cn("rounded-lg border p-4", !notification.read && "border-blue-200 bg-blue-50 dark:border-blue-900/60 dark:bg-blue-950/40")}>
                  <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="font-medium">{notification.title}</div>
                        <Badge variant={notification.read ? "outline" : "default"}>{notification.read ? "Read" : "Unread"}</Badge>
                        <Badge variant="outline">{notification.type}</Badge>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{notification.message}</p>
                      <p className="mt-2 text-xs text-muted-foreground">{formatDate(notification.createdAt)}</p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => void openNotification(notification)}>Open</Button>
                  </div>
                </div>
              ))}
              {!payload?.notifications?.length ? <p className="rounded-lg border p-6 text-center text-sm text-muted-foreground">No alerts are currently available.</p> : null}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="support" className="space-y-4">
          <Card>
            <CardHeader className="gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle>Support Requests</CardTitle>
                <CardDescription>Your communication-related feedback and support tickets.</CardDescription>
              </div>
              <Button onClick={() => setSupportOpen(true)}>
                <HelpCircle className="mr-2 size-4" />
                New support request
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {(payload?.feedback || []).map((item) => (
                <div key={item.id} className="rounded-lg border p-4">
                  <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="font-medium">{item.title}</div>
                      <p className="text-sm text-muted-foreground">{item.message}</p>
                      <p className="mt-2 text-xs text-muted-foreground">Updated {formatDate(item.updatedAt || item.createdAt)}</p>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant="outline">{item.priority}</Badge>
                      <Badge>{item.status}</Badge>
                    </div>
                  </div>
                </div>
              ))}
              {!payload?.feedback?.length ? <p className="rounded-lg border p-6 text-center text-sm text-muted-foreground">No support requests yet.</p> : null}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Quick Message</DialogTitle>
            <DialogDescription>Send a message through the universal messages endpoint.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger>
                <SelectValue placeholder="Select recipient" />
              </SelectTrigger>
              <SelectContent>
                {(payload?.users || []).map((user) => (
                  <SelectItem key={user.id} value={user.id}>{displayName(user)} - {user.role || "user"}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Textarea value={messageBody} onChange={(event) => setMessageBody(event.target.value)} placeholder="Write your message..." />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setComposeOpen(false)}>Cancel</Button>
            <Button onClick={sendQuickMessage} disabled={submitting}>
              {submitting ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Send className="mr-2 size-4" />}
              Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={supportOpen} onOpenChange={setSupportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Support Request</DialogTitle>
            <DialogDescription>Create a student communication support request.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input value={supportTitle} onChange={(event) => setSupportTitle(event.target.value)} placeholder="Request title" />
            <Select value={supportPriority} onValueChange={setSupportPriority}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
            <Textarea value={supportMessage} onChange={(event) => setSupportMessage(event.target.value)} placeholder="Describe the communication issue or request." />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSupportOpen(false)}>Cancel</Button>
            <Button onClick={sendSupportRequest} disabled={submitting}>
              {submitting ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Megaphone className="mr-2 size-4" />}
              Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
