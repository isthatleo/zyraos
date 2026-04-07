"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { StatusPill } from "@/components/status-pill"
import { Loader2 } from "lucide-react"

interface Invoice {
  id: string
  invoiceNumber?: string
  school: string
  dueDate: string
  amount: number
  currency: string
  status: "paid" | "pending" | "overdue" | "void"
}

export function RecentInvoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchInvoices() {
      try {
        const res = await fetch("/api/master/billing/invoices")
        const data = await res.json()
        if (data.invoices) {
          setInvoices(data.invoices.slice(0, 5))
        }
      } catch {
        console.error("Failed to fetch invoices")
      } finally {
        setLoading(false)
      }
    }
    fetchInvoices()
  }, [])

  const formatCurrency = (amount: number, currency: string) => {
    const symbols: Record<string, string> = { ZAR: "R", USD: "$", GBP: "£", EUR: "€", GHS: "GH₵", NGN: "₦" }
    return `${symbols[currency] || currency} ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  return (
    <Card className="rounded-xl border-border bg-card shadow-sm hover:shadow-md transition-shadow duration-200">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-foreground">Recent Invoices</CardTitle>
        <p className="text-sm text-muted-foreground">Latest invoices generated across the platform.</p>
      </CardHeader>
      <CardContent className="space-y-0">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : invoices.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No invoices yet.</p>
        ) : (
          invoices.map((invoice, index) => (
            <div
              key={invoice.id}
              className={`flex items-center justify-between py-4 px-0 ${
                index !== invoices.length - 1 ? "border-b border-border" : ""
              } hover:bg-accent/50 transition-colors`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-medium text-foreground truncate">{invoice.school}</h4>
                  <Badge variant="outline" className="rounded-full text-xs px-2 py-0.5 whitespace-nowrap">
                    {invoice.invoiceNumber || invoice.id.slice(0, 13)}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">Due {invoice.dueDate}</p>
              </div>
              <div className="flex items-center gap-3 ml-4">
                <span className="font-medium text-foreground whitespace-nowrap">
                  {formatCurrency(invoice.amount, invoice.currency)}
                </span>
                <StatusPill
                  status={invoice.status}
                  text={invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                />
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}
