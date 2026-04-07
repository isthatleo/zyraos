"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FinanceComponent } from "@/components/finance-component"
import { FinanceAnalytics } from "@/components/finance-analytics"
import { Button } from "@/components/ui/button"
import { Plus, Settings, Download } from "lucide-react"

interface FinancePageProps {
  params: {
    tenant: string
  }
}

export default function FinancePage({ params }: FinancePageProps) {
  const { tenant } = params

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold">Finance & Fees Management</h1>
          <p className="text-muted-foreground mt-2">
            Track student fees, payments, and financial analytics
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <Download className="h-4 w-4" />
            Export Report
          </Button>
          <Button variant="outline" size="sm" className="gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </Button>
        </div>
      </div>

      <Tabs defaultValue="student" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="student">Student Fees</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="student">
          <FinanceComponent 
            studentId="student-123" 
            tenantSlug={tenant}
          />
        </TabsContent>

        <TabsContent value="analytics">
          <FinanceAnalytics schoolName="Your School Name" />
        </TabsContent>

        <TabsContent value="reports">
          <div className="text-center py-12">
            <p className="text-muted-foreground">Reports coming soon</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

