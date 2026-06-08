"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import {
  Bell,
  BookOpen,
  MessageSquare,
  RefreshCcw,
  ShieldCheck,
  Users,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { MessagesPage } from "@/components/shared/messages-page"

function ParentMessagesContent() {
  const pathname = usePathname() || ""
  const searchParams = useSearchParams()
  const [queryClient] = React.useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  }))

  const tenantPrefix = React.useMemo(() => {
    const segments = pathname.split("/").filter(Boolean)
    return segments[1] === "parent" ? `/${segments[0]}` : ""
  }, [pathname])

  const parentHref = React.useCallback((href: string) => `${tenantPrefix}${href}`, [tenantPrefix])

  return (
    <div className="w-full space-y-6 p-6 lg:p-8">
      <section className="overflow-hidden rounded-3xl border bg-card shadow-sm">
        <div className="relative p-6 md:p-8">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(20,184,166,0.18),transparent_34%),linear-gradient(135deg,rgba(59,130,246,0.10),transparent_45%)]" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-4xl space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="bg-background/80">
                  <MessageSquare className="mr-1 size-3.5" />
                  Parent messages
                </Badge>
                <Badge variant="outline" className="bg-background/80">Real-time chat</Badge>
                {searchParams?.get("conversationId") ? <Badge variant="outline" className="bg-background/80">Conversation selected</Badge> : null}
              </div>
              <div>
                <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Messages</h1>
                <p className="mt-2 text-muted-foreground">
                  Tenant-aware parent communication with teachers, school staff, and finance teams using the real messaging API.
                </p>
              </div>
              <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2 lg:grid-cols-4">
                <span>Scope: <strong className="text-foreground">{tenantPrefix ? "Tenant parent portal" : "Parent portal"}</strong></span>
                <span>Inbox: <strong className="text-foreground">Conversation API</strong></span>
                <span>Realtime: <strong className="text-foreground">Socket enabled</strong></span>
                <span>Topbar: <strong className="text-foreground">Routes here</strong></span>
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row lg:flex-col xl:flex-row">
              <Button type="button" variant="outline" onClick={() => queryClient.invalidateQueries()}>
                <RefreshCcw className="size-4" />
                Refresh
              </Button>
              <Button type="button" asChild>
                <Link href={parentHref("/parent/children")}>
                  <Users className="size-4" />
                  Children
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Teacher Chat", helper: "Message class teachers from parent context", icon: BookOpen },
          { label: "Finance Follow-up", helper: "Continue fee conversations from finance actions", icon: ShieldCheck },
          { label: "School Notices", helper: "Open message notifications from the topbar", icon: Bell },
          { label: "Linked Children", helper: "Keep conversations tied to real guardian records", icon: Users },
        ].map((card) => {
          const Icon = card.icon
          return (
            <Card key={card.label} className="rounded-3xl shadow-sm">
              <CardContent className="flex min-h-32 items-start justify-between gap-4 p-5">
                <div>
                  <p className="text-sm text-muted-foreground">{card.label}</p>
                  <p className="mt-2 text-sm font-medium">{card.helper}</p>
                </div>
                <div className="rounded-2xl bg-primary/10 p-3 text-primary">
                  <Icon className="size-5" />
                </div>
              </CardContent>
            </Card>
          )
        })}
      </section>

      <Card className="rounded-3xl shadow-sm">
        <CardHeader>
          <CardTitle>Parent Inbox</CardTitle>
          <CardDescription>All buttons and conversations below use the live tenant messaging endpoints.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <QueryClientProvider client={queryClient}>
            <MessagesPage />
          </QueryClientProvider>
        </CardContent>
      </Card>
    </div>
  )
}

export default function ParentMessagesPage() {
  return (
    <React.Suspense fallback={<div className="w-full space-y-6 p-6 lg:p-8"><Skeleton className="h-56 rounded-3xl" /><Skeleton className="h-[640px] rounded-3xl" /></div>}>
      <ParentMessagesContent />
    </React.Suspense>
  )
}
