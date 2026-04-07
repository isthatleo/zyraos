"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ReceiptBuilder } from "@/components/receipt-builder"
import { ReceiptsManagement } from "@/components/receipts-management"
import { useParams } from "next/navigation"

export default function ReceiptsPage() {
  const params = useParams()
  const tenantSlug = params?.tenant as string
  const [activeTab, setActiveTab] = useState("management")

  // Mock user ID - in real app this would come from auth context
  const userId = "user-123"

  return (
    <div className="container mx-auto p-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="management">Receipts Management</TabsTrigger>
          <TabsTrigger value="builder">Receipt Builder</TabsTrigger>
        </TabsList>

        <TabsContent value="management">
          <ReceiptsManagement tenantSlug={tenantSlug} userId={userId} />
        </TabsContent>

        <TabsContent value="builder">
          <ReceiptBuilder tenantSlug={tenantSlug} userId={userId} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
