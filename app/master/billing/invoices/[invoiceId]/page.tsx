"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { StatusPill } from "@/components/status-pill"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import {
  ArrowLeft, Printer, Download, Mail, MoreHorizontal, Building2, Loader2,
  CheckCircle, Clock, X
} from "lucide-react"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface Invoice {
  id: string
  invoiceId: string
  schoolName: string
  schoolSlug: string
  schoolAddress: string
  amount: number
  status: string
  issueDate: string
  dueDate: string
  plan: string
  billingPeriod: string
  schoolCurrency: string
  exchangeRate: number
}

export default function InvoiceDetailPage() {
  const params = useParams()
  const router = useRouter()
  const invoiceId = params?.invoiceId as string
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!invoiceId) return
    const fetchInvoice = async () => {
      try {
        const res = await fetch(`/api/master/billing/invoices/${invoiceId}`)
        if (!res.ok) throw new Error("Not found")
        const data = await res.json()
        setInvoice(data.invoice)
      } catch {
        toast.error("Could not load invoice")
      } finally {
        setLoading(false)
      }
    }
    fetchInvoice()
  }, [invoiceId])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="ml-2 text-muted-foreground">Loading invoice...</p>
      </div>
    )
  }

  if (!invoice) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-6">
        <X className="h-12 w-12 text-destructive mb-4" />
        <h1 className="text-2xl font-bold text-foreground">Invoice Not Found</h1>
        <p className="text-muted-foreground mt-2">The invoice does not exist or has been deleted.</p>
        <Button onClick={() => router.push("/master/billing/invoices")} className="mt-6">Back to Invoices</Button>
      </div>
    )
  }

  const formatted = `R ${invoice.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`

  return (
    <div className="flex flex-col gap-6 p-6 lg:p-8 min-h-screen print:bg-white print:p-0">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between print:hidden">
        <Button variant="ghost" onClick={() => router.push("/master/billing/invoices")} className="w-fit">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Invoices
        </Button>
        <div className="flex items-center gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <MoreHorizontal className="h-4 w-4 mr-2" /> Actions
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => { window.print(); toast.success("PDF generated") }}>
                <Download className="mr-2 h-4 w-4" /> Download PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => toast.success("Invoice sent to school email")}>
                <Mail className="mr-2 h-4 w-4" /> Send Email
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button onClick={() => window.print()} className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg">
            <Printer className="mr-2 h-4 w-4" /> Print Invoice
          </Button>
        </div>
      </div>

      {/* Status Actions */}
      <Card className="print:hidden rounded-xl bg-card shadow-sm">
        <CardHeader className="border-b py-4">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg font-semibold">
              Status: <StatusPill status={invoice.status as any} text={invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)} />
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 pt-4">
            <Button variant="outline" disabled={invoice.status === "paid"} onClick={() => { setInvoice(p => p ? { ...p, status: "paid" } : p); toast.success("Marked as Paid") }}>
              <CheckCircle className="mr-2 h-4 w-4" /> Mark as Paid
            </Button>
            <Button variant="outline" disabled={invoice.status === "pending"} onClick={() => { setInvoice(p => p ? { ...p, status: "pending" } : p); toast.success("Marked as Pending") }}>
              <Clock className="mr-2 h-4 w-4" /> Mark as Pending
            </Button>
            <Button variant="outline" disabled={invoice.status === "void"} onClick={() => { setInvoice(p => p ? { ...p, status: "void" } : p); toast.success("Voided") }}>
              <X className="mr-2 h-4 w-4" /> Void
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Invoice Template */}
      <Card className="max-w-5xl mx-auto border-none shadow-xl bg-card overflow-hidden print:shadow-none print:max-w-full">
        <div className="h-2 bg-primary w-full" />
        <CardContent className="p-12">
          <div className="flex justify-between items-start mb-12">
            <div className="space-y-4">
              <div className="h-12 w-12 bg-primary rounded-lg flex items-center justify-center text-primary-foreground text-2xl font-bold">R</div>
              <div>
                <h2 className="text-2xl font-bold text-foreground uppercase tracking-tighter">Tax Invoice</h2>
                <p className="text-muted-foreground font-medium">#{invoice.invoiceId}</p>
              </div>
            </div>
            <div className="text-right space-y-1 text-sm text-muted-foreground">
              <p className="font-bold text-foreground">Roxan Education OS</p>
              <p>Century City, North Bank Lane</p>
              <p>Cape Town, 7441, RSA</p>
              <p>billing@roxan.com</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-12 mb-12">
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">Billed To</p>
              <p className="font-bold text-foreground text-lg">{invoice.schoolName}</p>
              <p className="text-muted-foreground">{invoice.schoolAddress}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Issue Date</p>
                <p className="font-semibold text-foreground">{invoice.issueDate ? new Date(invoice.issueDate).toLocaleDateString() : "—"}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Due Date</p>
                <p className="font-semibold text-foreground">{invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : "—"}</p>
              </div>
            </div>
          </div>

          <div className="mb-12">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-border">
                  <th className="py-4 font-bold text-foreground">Description</th>
                  <th className="py-4 font-bold text-foreground">Period</th>
                  <th className="py-4 font-bold text-foreground text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border/50">
                  <td className="py-6">
                    <p className="font-bold text-foreground">{invoice.plan}</p>
                    <p className="text-xs text-muted-foreground mt-1">School management subscription</p>
                  </td>
                  <td className="py-6 text-muted-foreground">{invoice.billingPeriod}</td>
                  <td className="py-6 text-right font-bold text-foreground">{formatted}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="flex justify-end border-t pt-8">
            <div className="w-64 space-y-3">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span>{formatted}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Tax (0%)</span>
                <span>R 0.00</span>
              </div>
              <Separator />
              <div className="flex justify-between items-center text-lg font-bold text-foreground">
                <span>Total Due</span>
                <span className="text-primary">{formatted}</span>
              </div>
            </div>
          </div>

          <div className="mt-24 pt-8 border-t flex justify-between items-end">
            <div className="text-xs text-muted-foreground max-w-sm">
              <p className="font-bold mb-1">Notes</p>
              <p>Please use Invoice ID as payment reference.</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Authorized Signature</p>
              <div className="mt-4 h-12 w-32 border-b-2 border-border" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
