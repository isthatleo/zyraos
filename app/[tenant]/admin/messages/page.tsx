"use client";

import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MessageSquare, ShieldCheck, Users } from "lucide-react";
import { useParams } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { MessagesPage } from "@/components/shared/messages-page";

export default function AdminMessagesRoutePage() {
  const params = useParams<{ tenant?: string }>();
  const tenant = params?.tenant || "";
  const [queryClient] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      })
  );

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-border/70 bg-card/80 shadow-sm backdrop-blur">
        <CardContent className="p-0">
          <div className="relative isolate p-6 md:p-8">
            <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_right,hsl(var(--primary)/0.16),transparent_38%),linear-gradient(135deg,hsl(var(--muted)/0.45),transparent)]" />
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-3xl">
                <Badge className="mb-3 rounded-full bg-primary/10 text-primary hover:bg-primary/10">
                  <MessageSquare className="mr-1 h-3.5 w-3.5" />
                  School admin messages
                </Badge>
                <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Messages</h1>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Tenant-scoped chat with realtime messaging, typing state, presence, read receipts, voice calls, and video calls.
                </p>
              </div>
              <div className="grid gap-2 text-sm sm:grid-cols-2">
                <div className="rounded-2xl border bg-card/70 p-3">
                  <ShieldCheck className="mb-2 h-4 w-4 text-primary" />
                  <p className="font-medium">Allowed contacts</p>
                  <p className="text-xs text-muted-foreground">All active tenant users and platform admins.</p>
                </div>
                <div className="rounded-2xl border bg-card/70 p-3">
                  <Users className="mb-2 h-4 w-4 text-primary" />
                  <p className="font-medium">Admin scoped</p>
                  <p className="text-xs text-muted-foreground">This page remains inside the school admin dashboard shell.</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <QueryClientProvider client={queryClient}>
        <MessagesPage apiBaseOverride={tenant ? `/api/tenant/${tenant}/messages` : "/api/messages"} heading="School Admin Messages" />
      </QueryClientProvider>
    </div>
  );
}
