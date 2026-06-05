"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { MessageSquare, Megaphone, MessageSquareReply } from "lucide-react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { BroadcastsPage } from "@/components/shared/broadcasts-page";
import { FeedbackPage } from "@/components/shared/feedback-page";
import { MessagesPage } from "@/components/shared/messages-page";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

function CommunicationsPageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab = searchParams?.get("tab") || "chat";
  const activeTab = ["chat", "broadcasts", "feedback"].includes(tab) ? tab : "chat";
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

  const updateTab = (value: string) => {
    const params = new URLSearchParams(searchParams?.toString());
    if (value === "chat") params.delete("tab");
    else params.set("tab", value);
    const query = params.toString();
    const currentPath = pathname || "/messages";
    router.replace(query ? `${currentPath}?${query}` : currentPath, { scroll: false });
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <p className="text-sm font-medium text-muted-foreground">Platform communication suite</p>
        <h1 className="text-3xl font-semibold tracking-tight">Messages, Broadcasts & Feedback</h1>
        <p className="text-muted-foreground">Internal chat, system-wide announcements, and feedback management from one place.</p>
      </div>
      <Tabs value={activeTab} onValueChange={updateTab} className="space-y-4">
        <div className="flex justify-center">
          <TabsList className="h-12 w-full justify-center gap-1 overflow-x-auto rounded-full border bg-card/80 p-1 shadow-sm backdrop-blur md:w-fit">
            <TabsTrigger
              value="chat"
              className="rounded-full px-5 py-2.5 text-muted-foreground transition-all data-active:!bg-primary data-active:!text-primary-foreground data-active:shadow-sm dark:data-active:!bg-primary dark:data-active:!text-primary-foreground"
            >
              <MessageSquare className="size-4" />
              Internal Chat
            </TabsTrigger>
            <TabsTrigger
              value="broadcasts"
              className="rounded-full px-5 py-2.5 text-muted-foreground transition-all data-active:!bg-primary data-active:!text-primary-foreground data-active:shadow-sm dark:data-active:!bg-primary dark:data-active:!text-primary-foreground"
            >
              <Megaphone className="size-4" />
              Broadcasts
            </TabsTrigger>
            <TabsTrigger
              value="feedback"
              className="rounded-full px-5 py-2.5 text-muted-foreground transition-all data-active:!bg-primary data-active:!text-primary-foreground data-active:shadow-sm dark:data-active:!bg-primary dark:data-active:!text-primary-foreground"
            >
              <MessageSquareReply className="size-4" />
              Feedback
            </TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="chat">
          <QueryClientProvider client={queryClient}>
            <MessagesPage />
          </QueryClientProvider>
        </TabsContent>
        <TabsContent value="broadcasts">
          <BroadcastsPage />
        </TabsContent>
        <TabsContent value="feedback">
          <FeedbackPage />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export function CommunicationsPage() {
  return (
    <React.Suspense fallback={<div className="rounded-3xl border bg-card p-8 text-sm text-muted-foreground">Loading communications...</div>}>
      <CommunicationsPageContent />
    </React.Suspense>
  );
}
