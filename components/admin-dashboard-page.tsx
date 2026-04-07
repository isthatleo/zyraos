"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DashboardAnalytics } from "@/components/dashboard-analytics"
import { Button } from "@/components/ui/button"
import { Plus, Settings } from "lucide-react"

interface AdminDashboardPageProps {
  params: {
    tenant: string
  }
}

export default function AdminDashboardPage({ params }: AdminDashboardPageProps) {
  const { tenant } = params

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            School overview and key metrics
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="finance">Finance</TabsTrigger>
          <TabsTrigger value="communication">Communication</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <DashboardAnalytics schoolName="Your School Name" />
        </TabsContent>

        <TabsContent value="finance">
          <div className="text-center py-12">
            <p className="text-muted-foreground">Finance dashboard coming soon</p>
          </div>
        </TabsContent>

        <TabsContent value="communication">
          <div className="text-center py-12">
            <p className="text-muted-foreground">Communication dashboard coming soon</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

