"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  AlertCircle,
  ArrowRight,
  Banknote,
  CheckCircle2,
  Clock,
  CreditCard,
  Download,
  FileText,
  Mail,
  MessageSquare,
  Phone,
  Receipt,
  RefreshCcw,
  Search,
  ShieldCheck,
  Users,
  Wallet,
} from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

type FinanceChild = {
  id: string
  name: string
  email: string
  admissionNumber: string
  className: string
  classTeacher: string
  academicYear: string
  term: string
  metrics: {
    billed: number
    paid: number
    outstanding: number
    overdue: number
    invoiceCount: number
    paymentCount: number
    unpaidCount: number
  }
}

type Invoice = {
  id: string
  invoiceNumber: string
  childId: string
  childName: string
  admissionNumber: string
  className: string
  totalAmount: number
  amountPaid: number
  outstandingBalance: number
  status: string
  rawStatus: string
  dueDate: string | null
  issuedDate: string | null
  notes: string
  createdAt: string | null
}

type Payment = {
  id: string
  childId: string
  childName: string
  amount: number
  method: string
  reference: string
  provider: string
  status: string
  completedAt: string | null
  failedAt: string | null
  refundedAt: string | null
  createdAt: string | null
}

type ReceiptRow = {
  id: string
  paymentId: string
  childId: string
  childName: string
  amount: number
  currency: string
  method: string
  issuedDate: string | null
  status: string
}

type LedgerRow = {
  id: string
  childId: string
  childName: string
  type: string
  amount: number
  description: string
  reference: string
  balance: number
  createdAt: string | null
}

type FinancePayload = {
  generatedAt: string
  currentUser?: { id: string; name: string; email: string; role: string }
  school?: { id: string; name: string; slug: string; currencyCode: string; currencyName: string }
  metrics?: {
    children: number
    totalBilled: number
    totalPaid: number
    outstanding: number
    overdue: number
    invoiceCount: number
    paymentCount: number
    receiptCount: number
    unpaidCount: number
    collectionRate: number
    nextDueDate: string | null
    nextDueAmount: number
    nextDueInvoice: string
  }
  children: FinanceChild[]
  invoices: Invoice[]
  payments: Payment[]
  receipts: ReceiptRow[]
  ledger: LedgerRow[]
  notes: Array<{ id: string; childId: string; note: string; category: string; recordedBy: string; createdAt: string | null }>
  financeOffice: { email: string; phone: string; paymentInstructions: string }
  paymentReadiness: { onlinePaymentsEnabled: boolean; provider: string; providerMode: string; receiptsAvailable: boolean; productionReady: boolean; warnings: string[] }
}

const tone = {
  good: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300",
  warn: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300",
  danger: "border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300",
  info: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300",
}

function formatDate(value: string | null) {
  if (!value) return "Not dated"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Not dated"
  return new Intl.DateTimeFormat("en", { month: "short", day: "2-digit", year: "numeric" }).format(date)
}

function money(currency: string, amount: number) {
  return `${currency} ${new Intl.NumberFormat("en", { maximumFractionDigits: 2 }).format(amount || 0)}`
}

function downloadFile(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

function FinanceSkeleton() {
  return (
    <div className="w-full space-y-6 p-6 lg:p-8">
      <Skeleton className="h-56 rounded-3xl" />
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-36 rounded-3xl" />)}
      </section>
      <Skeleton className="h-[640px] rounded-3xl" />
    </div>
  )
}

export default function ParentFinancePage() {
  const pathname = usePathname()
  const router = useRouter()
  const [payload, setPayload] = React.useState<FinancePayload | null>(null)
  const [selectedChildId, setSelectedChildId] = React.useState("all")
  const [statusFilter, setStatusFilter] = React.useState("all")
  const [query, setQuery] = React.useState("")
  const [loading, setLoading] = React.useState(true)
  const [refreshing, setRefreshing] = React.useState(false)
  const [error, setError] = React.useState("")
  const [acting, setActing] = React.useState(false)
  const [selectedInvoice, setSelectedInvoice] = React.useState<Invoice | null>(null)
  const [requestOpen, setRequestOpen] = React.useState(false)
  const [noteOpen, setNoteOpen] = React.useState(false)
  const [message, setMessage] = React.useState("")

  const tenantPrefix = React.useMemo(() => {
    const segments = (pathname ?? "").split("/").filter(Boolean)
    return segments[1] === "parent" ? `/${segments[0]}` : ""
  }, [pathname])

  const parentHref = React.useCallback((href: string) => `${tenantPrefix}${href}`, [tenantPrefix])

  const endpoint = React.useCallback(() => {
    const hostTenant = typeof window !== "undefined"
      ? window.location.hostname.split(".")[0]
      : ""
    const tenant = tenantPrefix ? tenantPrefix.slice(1) : hostTenant && !["localhost", "127", "www"].includes(hostTenant) ? hostTenant : ""
    if (!tenant) return "/api/parent/finance"
    return `/api/tenant/parent/finance?tenant=${encodeURIComponent(tenant)}`
  }, [tenantPrefix])

  const loadFinance = React.useCallback(async (notify = false) => {
    setError("")
    setLoading(true)
    const response = await fetch(endpoint(), { cache: "no-store" }).catch(() => null)
    if (!response?.ok) {
      const data = await response?.json().catch(() => ({}))
      const messageText = String(data?.error || "Failed to load parent fees")
      setError(messageText)
      setLoading(false)
      if (notify) toast.error(messageText)
      return
    }
    const data = (await response.json()) as FinancePayload
    setPayload(data)
    setLoading(false)
    if (notify) toast.success("Fees refreshed")
  }, [endpoint])

  React.useEffect(() => {
    void loadFinance()
  }, [loadFinance])

  const currency = payload?.school?.currencyCode || ""
  const children = payload?.children || []
  const invoices = payload?.invoices || []
  const filteredInvoices = invoices.filter((invoice) => {
    const search = query.trim().toLowerCase()
    const childMatch = selectedChildId === "all" || invoice.childId === selectedChildId
    const statusMatch = statusFilter === "all" || invoice.status === statusFilter
    const searchMatch = !search || [invoice.invoiceNumber, invoice.childName, invoice.className, invoice.status, invoice.notes].some((value) => String(value || "").toLowerCase().includes(search))
    return childMatch && statusMatch && searchMatch
  })
  const filteredPayments = (payload?.payments || []).filter((payment) => selectedChildId === "all" || payment.childId === selectedChildId)
  const filteredReceipts = (payload?.receipts || []).filter((receipt) => selectedChildId === "all" || receipt.childId === selectedChildId)
  const filteredLedger = (payload?.ledger || []).filter((entry) => selectedChildId === "all" || entry.childId === selectedChildId)
  const selectedChild = children.find((child) => child.id === selectedChildId) || null
  const clearanceRate = payload?.metrics?.totalBilled ? Math.round(((payload.metrics.totalPaid || 0) / payload.metrics.totalBilled) * 1000) / 10 : 100

  const refresh = () => {
    setRefreshing(true)
    void loadFinance(true).finally(() => setRefreshing(false))
  }

  const runAction = async (action: string, invoice: Invoice | null) => {
    setActing(true)
    const response = await fetch(endpoint(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action,
        childId: invoice?.childId || selectedChild?.id || children[0]?.id,
        invoiceId: invoice?.id,
        invoiceNumber: invoice?.invoiceNumber,
        message,
      }),
    }).catch(() => null)
    setActing(false)
    if (!response?.ok) {
      const data = await response?.json().catch(() => ({}))
      toast.error(String(data?.error || "Finance action failed"))
      return
    }
    toast.success(action === "payment-instructions" ? "Payment instruction request sent" : "Finance note submitted")
    setMessage("")
    setRequestOpen(false)
    setNoteOpen(false)
    void loadFinance()
  }

  const exportFees = () => {
    if (!payload) return
    const rows = [
      ["Parent", payload.currentUser?.name || ""],
      ["School", payload.school?.name || ""],
      ["Total billed", money(currency, payload.metrics?.totalBilled || 0)],
      ["Outstanding", money(currency, payload.metrics?.outstanding || 0)],
      [],
      ["Invoice", "Child", "Class", "Issued", "Due", "Status", "Billed", "Paid", "Outstanding"],
      ...filteredInvoices.map((invoice) => [
        invoice.invoiceNumber,
        invoice.childName,
        invoice.className,
        formatDate(invoice.issuedDate),
        formatDate(invoice.dueDate),
        invoice.status,
        money(currency, invoice.totalAmount),
        money(currency, invoice.amountPaid),
        money(currency, invoice.outstandingBalance),
      ]),
    ]
    const csv = rows.map((row) => row.map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`).join(",")).join("\n")
    downloadFile("parent-fees-report.csv", csv, "text/csv;charset=utf-8")
    toast.success("Fees report downloaded")
  }

  if (loading && !payload) return <FinanceSkeleton />

  if (error && !payload) {
    return (
      <div className="w-full p-6 lg:p-8">
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-3">
              <AlertCircle className="mt-0.5 size-5 text-destructive" />
              <div>
                <p className="font-medium text-destructive">Fees could not be loaded</p>
                <p className="text-sm text-muted-foreground">{error}</p>
              </div>
            </div>
            <Button type="button" variant="outline" onClick={() => void loadFinance(true)}>Retry</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!payload?.currentUser?.id || !children.length) {
    return (
      <div className="w-full p-6 lg:p-8">
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium text-destructive">Linked parent profile is required</p>
              <p className="text-sm text-muted-foreground">Fees only render for a signed-in parent or guardian with linked children.</p>
            </div>
            <Button type="button" variant="outline" onClick={() => router.refresh()}>Refresh session</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="w-full space-y-6 p-6 lg:p-8">
      <section className="overflow-hidden rounded-3xl border bg-card shadow-sm">
        <div className="relative p-6 md:p-8">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(245,158,11,0.18),transparent_34%),linear-gradient(135deg,rgba(20,184,166,0.10),transparent_45%)]" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-4xl space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="bg-background/80">
                  <Users className="mr-1 size-3.5" />
                  {children.length} linked child{children.length === 1 ? "" : "ren"}
                </Badge>
                <Badge variant="outline" className="bg-background/80">{payload.school?.name}</Badge>
                <Badge variant="outline" className="bg-background/80">{payload.metrics?.invoiceCount || 0} invoices</Badge>
              </div>
              <div>
                <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Fees</h1>
                <p className="mt-2 text-muted-foreground">
                  Tenant-synced invoices, payments, receipts, balances, and finance follow-up for the logged-in parent.
                </p>
              </div>
              <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2 lg:grid-cols-4">
                <span>Billed: <strong className="text-foreground">{money(currency, payload.metrics?.totalBilled || 0)}</strong></span>
                <span>Paid: <strong className="text-foreground">{money(currency, payload.metrics?.totalPaid || 0)}</strong></span>
                <span>Outstanding: <strong className="text-foreground">{money(currency, payload.metrics?.outstanding || 0)}</strong></span>
                <span>Collection: <strong className="text-foreground">{payload.metrics?.collectionRate || 0}%</strong></span>
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row lg:flex-col xl:flex-row">
              <Button type="button" variant="outline" onClick={refresh} disabled={refreshing}>
                <RefreshCcw className={cn("size-4", refreshing && "animate-spin")} />
                Refresh
              </Button>
              <Button type="button" onClick={exportFees}>
                <Download className="size-4" />
                Export
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Total Billed", value: money(currency, payload.metrics?.totalBilled || 0), helper: `${payload.metrics?.invoiceCount || 0} invoices`, icon: FileText, toneClass: tone.info },
          { label: "Total Paid", value: money(currency, payload.metrics?.totalPaid || 0), helper: `${payload.metrics?.paymentCount || 0} payments`, icon: CreditCard, toneClass: tone.good },
          { label: "Outstanding", value: money(currency, payload.metrics?.outstanding || 0), helper: `${payload.metrics?.unpaidCount || 0} unpaid invoices`, icon: Wallet, toneClass: (payload.metrics?.outstanding || 0) > 0 ? tone.warn : tone.good },
          { label: "Overdue", value: money(currency, payload.metrics?.overdue || 0), helper: "Past due balances", icon: Clock, toneClass: (payload.metrics?.overdue || 0) > 0 ? tone.danger : tone.good },
        ].map((card) => {
          const Icon = card.icon
          return (
            <Card key={card.label} className="group h-full overflow-hidden rounded-3xl border bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
              <CardContent className="relative flex h-full min-h-36 flex-col justify-between p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-muted-foreground">{card.label}</p>
                    <p className="mt-2 truncate text-2xl font-semibold tracking-tight">{card.value}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{card.helper}</p>
                  </div>
                  <div className={cn("rounded-2xl border p-3", card.toneClass)}>
                    <Icon className="size-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </section>

      <section className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
        <aside className="space-y-6">
          <Card className="rounded-3xl shadow-sm">
            <CardHeader>
              <CardTitle>Child Balances</CardTitle>
              <CardDescription>Click a child to filter invoices and payments.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {children.map((child) => (
                <button
                  key={child.id}
                  type="button"
                  className={cn("w-full rounded-2xl border p-4 text-left transition-colors hover:bg-muted/50", selectedChildId === child.id && "border-primary bg-primary/5")}
                  onClick={() => setSelectedChildId(child.id)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{child.name}</p>
                      <p className="text-sm text-muted-foreground">{child.className} - {child.admissionNumber || "No admission number"}</p>
                    </div>
                    <Badge variant="outline" className={child.metrics.outstanding > 0 ? tone.warn : tone.good}>
                      {money(currency, child.metrics.outstanding)}
                    </Badge>
                  </div>
                  <Progress className="mt-3" value={child.metrics.billed ? Math.round((child.metrics.paid / child.metrics.billed) * 100) : 100} />
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                    <span>{child.metrics.invoiceCount} invoices</span>
                    <span>{child.metrics.paymentCount} payments</span>
                  </div>
                </button>
              ))}
              <Button type="button" variant="outline" className="w-full justify-start" onClick={() => setSelectedChildId("all")}>
                <Users className="size-4" />
                Show all children
              </Button>
            </CardContent>
          </Card>

          <Card className="rounded-3xl shadow-sm">
            <CardHeader>
              <CardTitle>Payment Readiness</CardTitle>
              <CardDescription>Operational finance checks for parent payments.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: "Gateway", ready: payload.paymentReadiness.onlinePaymentsEnabled, helper: `${payload.paymentReadiness.provider} ${payload.paymentReadiness.providerMode}` },
                { label: "Receipts", ready: payload.paymentReadiness.receiptsAvailable, helper: `${payload.metrics?.receiptCount || 0} receipt records` },
                { label: "Production checks", ready: payload.paymentReadiness.productionReady, helper: `${payload.paymentReadiness.warnings.length} warnings` },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between rounded-2xl border p-3 text-sm">
                  <div>
                    <p className="font-medium">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.helper}</p>
                  </div>
                  <Badge variant="outline" className={item.ready ? tone.good : tone.warn}>{item.ready ? "Ready" : "Needs setup"}</Badge>
                </div>
              ))}
              {payload.paymentReadiness.warnings.map((warning) => (
                <p key={warning} className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300">{warning}</p>
              ))}
            </CardContent>
          </Card>
        </aside>

        <div className="space-y-6">
          <Card className="rounded-3xl shadow-sm">
            <CardHeader>
              <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                <div>
                  <CardTitle>Invoices & Payments</CardTitle>
                  <CardDescription>Filter real fee records by child, status, or search text.</CardDescription>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Select value={selectedChildId} onValueChange={setSelectedChildId}>
                    <SelectTrigger className="w-full sm:w-56">
                      <SelectValue placeholder="Child" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All children</SelectItem>
                      {children.map((child) => <SelectItem key={child.id} value={child.id}>{child.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full sm:w-44">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All statuses</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="partial">Partial</SelectItem>
                      <SelectItem value="unpaid">Unpaid</SelectItem>
                      <SelectItem value="overdue">Overdue</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search invoice, child, class, notes..." className="pl-9" />
              </div>

              <Tabs defaultValue="invoices" className="space-y-4">
                <TabsList className="grid w-full grid-cols-2 md:grid-cols-5">
                  <TabsTrigger value="invoices">Invoices</TabsTrigger>
                  <TabsTrigger value="payments">Payments</TabsTrigger>
                  <TabsTrigger value="receipts">Receipts</TabsTrigger>
                  <TabsTrigger value="ledger">Ledger</TabsTrigger>
                  <TabsTrigger value="actions">Actions</TabsTrigger>
                </TabsList>

                <TabsContent value="invoices" className="space-y-3">
                  {filteredInvoices.map((invoice) => (
                    <div key={invoice.id} className="rounded-2xl border p-4">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-medium">{invoice.invoiceNumber}</p>
                            <Badge variant="outline" className={invoice.status === "paid" ? tone.good : invoice.status === "overdue" ? tone.danger : tone.warn}>{invoice.status}</Badge>
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground">{invoice.childName} - {invoice.className}</p>
                          <p className="text-xs text-muted-foreground">Issued {formatDate(invoice.issuedDate)} - Due {formatDate(invoice.dueDate)}</p>
                        </div>
                        <div className="text-left lg:text-right">
                          <p className="text-sm text-muted-foreground">Outstanding</p>
                          <p className="text-xl font-semibold">{money(currency, invoice.outstandingBalance)}</p>
                          <p className="text-xs text-muted-foreground">Paid {money(currency, invoice.amountPaid)} of {money(currency, invoice.totalAmount)}</p>
                        </div>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <Button type="button" variant="outline" size="sm" onClick={() => { setSelectedInvoice(invoice); setRequestOpen(true) }}>
                          <CreditCard className="size-4" />
                          Request payment instructions
                        </Button>
                        <Button type="button" variant="outline" size="sm" onClick={() => { setSelectedInvoice(invoice); setNoteOpen(true) }}>
                          <MessageSquare className="size-4" />
                          Add finance note
                        </Button>
                      </div>
                    </div>
                  ))}
                  {!filteredInvoices.length ? <p className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">No invoices match the current filters.</p> : null}
                </TabsContent>

                <TabsContent value="payments" className="space-y-3">
                  {filteredPayments.map((payment) => (
                    <div key={payment.id} className="flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-medium">{payment.reference}</p>
                        <p className="text-sm text-muted-foreground">{payment.childName} - {payment.method} {payment.provider ? `via ${payment.provider}` : ""}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(payment.completedAt || payment.createdAt)}</p>
                      </div>
                      <div className="text-left sm:text-right">
                        <p className="font-semibold">{money(currency, payment.amount)}</p>
                        <Badge variant="outline" className={payment.status === "completed" ? tone.good : payment.status === "failed" ? tone.danger : tone.warn}>{payment.status}</Badge>
                      </div>
                    </div>
                  ))}
                  {!filteredPayments.length ? <p className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">No payments found for this filter.</p> : null}
                </TabsContent>

                <TabsContent value="receipts" className="space-y-3">
                  {filteredReceipts.map((receipt) => (
                    <div key={receipt.id} className="flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-medium">Receipt {receipt.id}</p>
                        <p className="text-sm text-muted-foreground">{receipt.childName} - {receipt.method || "Payment"}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(receipt.issuedDate)}</p>
                      </div>
                      <div className="text-left sm:text-right">
                        <p className="font-semibold">{money(receipt.currency || currency, receipt.amount)}</p>
                        <Badge variant="outline">{receipt.status}</Badge>
                      </div>
                    </div>
                  ))}
                  {!filteredReceipts.length ? <p className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">No receipts available yet.</p> : null}
                </TabsContent>

                <TabsContent value="ledger" className="space-y-3">
                  {filteredLedger.map((entry) => (
                    <div key={entry.id} className="flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-medium">{entry.description || entry.type}</p>
                        <p className="text-sm text-muted-foreground">{entry.childName} - {entry.reference || "No reference"}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(entry.createdAt)}</p>
                      </div>
                      <div className="text-left sm:text-right">
                        <p className="font-semibold">{money(currency, entry.amount)}</p>
                        <p className="text-xs text-muted-foreground">Balance {money(currency, entry.balance)}</p>
                      </div>
                    </div>
                  ))}
                  {!filteredLedger.length ? <p className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">No ledger activity available yet.</p> : null}
                </TabsContent>

                <TabsContent value="actions" className="grid gap-3 md:grid-cols-2">
                  <Button type="button" variant="outline" className="justify-start" onClick={exportFees}>
                    <Download className="size-4" />
                    Download filtered report
                  </Button>
                  <Button type="button" variant="outline" className="justify-start" asChild>
                    <Link href={parentHref("/parent/messages")}>
                      <MessageSquare className="size-4" />
                      Message school
                    </Link>
                  </Button>
                  <Button type="button" variant="outline" className="justify-start" asChild>
                    <Link href={parentHref("/parent/children")}>
                      <ArrowRight className="size-4" />
                      Open children page
                    </Link>
                  </Button>
                  <Button type="button" variant="outline" className="justify-start" onClick={refresh} disabled={refreshing}>
                    <RefreshCcw className={cn("size-4", refreshing && "animate-spin")} />
                    Refresh fees
                  </Button>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <section className="grid gap-6 lg:grid-cols-2">
            <Card className="rounded-3xl shadow-sm">
              <CardHeader>
                <CardTitle>Finance Office</CardTitle>
                <CardDescription>Payment instructions and contact details.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="rounded-2xl border p-4 text-sm text-muted-foreground">{payload.financeOffice.paymentInstructions}</div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border p-4">
                    <Mail className="mb-2 size-4 text-primary" />
                    <p className="text-sm font-medium">Email</p>
                    <p className="text-sm text-muted-foreground">{payload.financeOffice.email || "Not configured"}</p>
                  </div>
                  <div className="rounded-2xl border p-4">
                    <Phone className="mb-2 size-4 text-primary" />
                    <p className="text-sm font-medium">Phone</p>
                    <p className="text-sm text-muted-foreground">{payload.financeOffice.phone || "Not configured"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-3xl shadow-sm">
              <CardHeader>
                <CardTitle>Clearance Health</CardTitle>
                <CardDescription>Overall family fee clearance status.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-2xl border bg-muted/30 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">Collection rate</p>
                    <Badge variant="outline" className={clearanceRate >= 90 ? tone.good : clearanceRate >= 60 ? tone.warn : tone.danger}>{clearanceRate}%</Badge>
                  </div>
                  <Progress className="mt-3" value={clearanceRate} />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border p-4">
                    <Banknote className="mb-2 size-4 text-primary" />
                    <p className="text-sm font-medium">Next due</p>
                    <p className="text-sm text-muted-foreground">{payload.metrics?.nextDueInvoice || "No pending invoice"}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(payload.metrics?.nextDueDate || null)} - {money(currency, payload.metrics?.nextDueAmount || 0)}</p>
                  </div>
                  <div className="rounded-2xl border p-4">
                    <ShieldCheck className="mb-2 size-4 text-primary" />
                    <p className="text-sm font-medium">Status</p>
                    <p className="text-sm text-muted-foreground">{(payload.metrics?.outstanding || 0) <= 0 ? "Cleared" : "Balance pending"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>
        </div>
      </section>

      <Dialog open={requestOpen} onOpenChange={setRequestOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request payment instructions</DialogTitle>
            <DialogDescription>Finance will receive a tenant-scoped request for {selectedInvoice?.invoiceNumber || "this invoice"}.</DialogDescription>
          </DialogHeader>
          <Textarea value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Optional message to finance" />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setRequestOpen(false)}>Cancel</Button>
            <Button type="button" onClick={() => void runAction("payment-instructions", selectedInvoice)} disabled={acting}>
              <CheckCircle2 className="size-4" />
              Send request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={noteOpen} onOpenChange={setNoteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add finance note</DialogTitle>
            <DialogDescription>Record a finance follow-up note for {selectedInvoice?.childName || selectedChild?.name || "this child"}.</DialogDescription>
          </DialogHeader>
          <Textarea value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Write the finance note" />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setNoteOpen(false)}>Cancel</Button>
            <Button type="button" onClick={() => void runAction("finance-note", selectedInvoice)} disabled={acting}>
              <Receipt className="size-4" />
              Submit note
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
