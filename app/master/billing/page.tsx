"use client"

import { useRouter } from "next/navigation"
import { BillingKPICards } from "@/components/billing-kpi-cards"
import { RecentInvoices } from "@/components/recent-invoices"
import { PlanDistributionChart } from "@/components/plan-distribution-chart"
import { Card } from "@/components/ui/card"

export default function BillingPage() {
  const router = useRouter()

  const handleRecentInvoicesClick = () => {
    router.push("/master/billing/invoices")
  }

  return (
    <div className="p-6 lg:p-8 space-y-8">
      {/* Page Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-gray-900">
          Financial Overview
        </h1>
        <p className="text-gray-600">
          Monitor platform revenue, subscriptions, and invoicing status.
        </p>
      </div>

      {/* KPI Cards */}
      <BillingKPICards onPendingClick={handleRecentInvoicesClick} />

      {/* Grid Layout */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Invoices - 2/3 width */}
        <div className="lg:col-span-2"> {/* This div now contains the clickable Card */}
          {/* The RecentInvoices component is wrapped in a clickable Card */}
          <Card
            className="cursor-pointer hover:shadow-lg transition-shadow duration-200"
            onClick={handleRecentInvoicesClick}
          >
            <RecentInvoices />
          </Card>
        </div>

        {/* Plan Distribution - 1/3 width */}
        <div>
          <PlanDistributionChart />
        </div>
      </div>
    </div>
  )
}
