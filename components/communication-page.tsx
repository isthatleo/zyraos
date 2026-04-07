"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MessagingSystem } from "@/components/messaging-system"
import { BroadcastComponent } from "@/components/broadcast-component"
import { BroadcastReportsComponent } from "@/components/broadcast-reports-component"
import { CommunicationAnalytics } from "@/components/communication-analytics"
import { Button } from "@/components/ui/button"
import { Plus, Settings } from "lucide-react"

interface CommunicationPageProps {
  params: {
    tenant: string
  }
}

export default function CommunicationPage({ params }: CommunicationPageProps) {
  const { tenant } = params

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold">Communication Hub</h1>
          <p className="text-muted-foreground mt-2">
            Manage messaging, broadcasts, and communication analytics
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </Button>
        </div>
      </div>

      <Tabs defaultValue="messaging" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="messaging">Messaging</TabsTrigger>
          <TabsTrigger value="broadcast">Broadcast</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="messaging">
          <MessagingSystem 
            currentUserId="user-123" 
            currentUserName="Admin User"
            currentUserRole="admin"
          />
        </TabsContent>

        <TabsContent value="broadcast">
          <BroadcastComponent userId="user-123" tenantSlug={tenant} />
        </TabsContent>

        <TabsContent value="reports">
          <BroadcastReportsComponent />
        </TabsContent>

        <TabsContent value="analytics">
          <CommunicationAnalytics schoolName="Your School Name" />
        </TabsContent>
      </Tabs>
    </div>
  )
}

