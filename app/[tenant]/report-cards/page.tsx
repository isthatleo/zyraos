"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ReportCardBuilder } from "@/components/report-card-builder"
import { ReportCardManagement } from "@/components/report-card-management"
import { useParams } from "next/navigation"

export default function ReportCardsPage() {
  const params = useParams()
  const tenantSlug = params?.tenant as string
  const [activeTab, setActiveTab] = useState("management")

  // Mock user ID - in real app this would come from auth context
  const userId = "user-123"

  return (
    <div className="container mx-auto p-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="management">Report Cards Management</TabsTrigger>
          <TabsTrigger value="builder">Report Card Builder</TabsTrigger>
        </TabsList>

        <TabsContent value="management">
          <ReportCardManagement tenantSlug={tenantSlug} />
        </TabsContent>

        <TabsContent value="builder">
          <ReportCardBuilder tenantSlug={tenantSlug} userId={userId} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
