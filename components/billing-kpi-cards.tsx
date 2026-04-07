"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { DollarSign, CreditCard, AlertCircle, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface BillingKPICardProps {
  title: string
  value: string | number
  subtitle: string
  icon?: React.ComponentType<{ className?: string }>
  highlight?: boolean
  onClick?: () => void
  loading?: boolean
}

function BillingKPICard({ title, value, subtitle, icon: Icon, highlight, onClick, loading }: BillingKPICardProps) {
  return (
    <Card 
      className={cn(
        "rounded-xl border-border bg-card shadow-sm hover:shadow-md transition-shadow duration-200",
        onClick && "cursor-pointer active:scale-[0.98]"
      )}
      onClick={onClick}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mt-1" />
          ) : (
            <p className={`text-2xl font-bold ${highlight ? 'text-orange-600' : 'text-foreground'}`}>{value}</p>
          )}
        </div>
        {Icon && <Icon className={`h-5 w-5 ${highlight ? 'text-orange-600' : 'text-muted-foreground'}`} />}
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </CardContent>
    </Card>
  )
}

export function BillingKPICards({ onPendingClick }: { onPendingClick?: () => void }) {
  const [loading, setLoading] = useState(true)
  const [totalRevenue, setTotalRevenue] = useState(0)
  const [activeCount, setActiveCount] = useState(0)
  const [pendingCount, setPendingCount] = useState(0)
  const [pendingAmount, setPendingAmount] = useState(0)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/master/billing/invoices")
        const data = await res.json()
        const invoices = data.invoices || []
        const paid = invoices.filter((i: any) => i.status === "paid")
        const pending = invoices.filter((i: any) => i.status === "pending" || i.status === "overdue")
        setTotalRevenue(paid.reduce((s: number, i: any) => s + i.amount, 0))
        setActiveCount(invoices.length)
        setPendingCount(pending.length)
        setPendingAmount(pending.reduce((s: number, i: any) => s + i.amount, 0))
      } catch {
        console.error("Failed to load billing KPIs")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const fmt = (v: number) => `R ${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  return (
    <div className="grid gap-6 md:grid-cols-3">
      <BillingKPICard title="Total Revenue" value={fmt(totalRevenue)} subtitle="Lifetime collected revenue" icon={DollarSign} loading={loading} />
      <BillingKPICard title="Total Invoices" value={activeCount} subtitle="All invoices generated" icon={CreditCard} loading={loading} />
      <BillingKPICard title="Pending Invoices" value={pendingCount} subtitle={`${fmt(pendingAmount)} outstanding`} icon={AlertCircle} highlight onClick={onPendingClick} loading={loading} />
    </div>
  )
}
