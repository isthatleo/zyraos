"use client"

import * as React from "react"
import { usePathname, useRouter } from "next/navigation"
import {
  AlertCircle,
  ArrowLeft,
  BadgeCheck,
  Banknote,
  CalendarClock,
  CheckCircle2,
  Copy,
  CreditCard,
  Download,
  FileText,
  HelpCircle,
  Loader2,
  MessageSquare,
  Printer,
  Receipt,
  RefreshCcw,
  Search,
  Send,
  ShieldCheck,
  WalletCards,
} from "lucide-react"
import { toast } from "sonner"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

type Invoice = {
  id: string
  invoiceNumber: string
  totalAmount: number
  amountPaid: number
  outstandingBalance: number
  status: string
  rawStatus: string
  dueDate: string | null
  issuedDate: string | null
  notes: string
  createdAt: string | null
  updatedAt: string | null
}

type Payment = {
  id: string
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

type FinancePayload = {
  generatedAt: string
  currentUser?: { id: string; name: string; email: string; role: string }
  school?: { id: string; name: string; slug: string; type: string; country: string; currencyCode: string; currencyName: string }
  student?: {
    id: string
    userId: string
    admissionNumber: string
    status: string
    className: string
    classGrade: string
    classSection: string
    classTeacher: string
    classTeacherId: string
    academicYear: string
    term: string
  }
  metrics?: {
    totalBilled: number
    totalPaid: number
    outstanding: number
    overdue: number
    invoiceCount: number
    paymentCount: number
    unpaidCount: number
    collectionRate: number
    clearanceReady: boolean
    nextDueDate: string | null
    nextDueLabel: string
  }
  invoices: Invoice[]
  payments: Payment[]
  byStatus: Array<{ status: string; count: number; amount: number; outstanding: number }>
  ledger: Array<{ id: string; type: string; amount: number; description: string; reference: string; balance: number; createdAt: string | null }>
  progressNotes: Array<{ id: string; type: string; value: number; note: string; category: string; positive: boolean; createdAt: string | null }>
  financeOffice?: { email: string; phone: string; paymentInstructions: string }
  receipts?: Array<{ id: string; paymentId: string; amount: number; currency: string; method: string; paymentDate: string | null; issuedDate: string | null; status: string; sentAt: string | null; printedAt: string | null }>
  paymentReadiness?: {
    onlinePaymentsEnabled: boolean
    provider: string
    providerMode: string
    publicKeyConfigured: boolean
    receiptsAvailable: boolean
    productionReady: boolean
    warnings: string[]
  }
}

const statusStyles: Record<string, string> = {
  paid: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300",
  partial: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300",
  unpaid: "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900/60 dark:bg-orange-950/40 dark:text-orange-300",
  overdue: "border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300",
  cancelled: "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-300",
  completed: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300",
  pending: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300",
  failed: "border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300",
}

function titleCase(value: string) {
  return value.replace(/-/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function formatDate(value: string | null) {
  if (!value) return "Not dated"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Not dated"
  return new Intl.DateTimeFormat("en", { month: "short", day: "2-digit", year: "numeric" }).format(date)
}

function daysUntil(value: string | null) {
  if (!value) return "No due date"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "No due date"
  const days = Math.ceil((date.getTime() - Date.now()) / 86400000)
  if (days < 0) return `${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} overdue`
  if (days === 0) return "Due today"
  return `Due in ${days} day${days === 1 ? "" : "s"}`
}

function downloadFile(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export default function StudentFinancePage() {
  const router = useRouter()
  const pathname = usePathname()
  const [payload, setPayload] = React.useState<FinancePayload | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [refreshing, setRefreshing] = React.useState(false)
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState("")
  const [query, setQuery] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState("all")
  const [selectedInvoice, setSelectedInvoice] = React.useState<Invoice | null>(null)
  const [selectedPayment, setSelectedPayment] = React.useState<Payment | null>(null)
  const [noteOpen, setNoteOpen] = React.useState(false)
  const [noteMessage, setNoteMessage] = React.useState("")
  const [helpOpen, setHelpOpen] = React.useState(false)
  const [helpMessage, setHelpMessage] = React.useState("")
  const [messageOpen, setMessageOpen] = React.useState(false)
  const [messageBody, setMessageBody] = React.useState("")

  const tenantPrefix = React.useMemo(() => {
    const segments = (pathname ?? "").split("/").filter(Boolean)
    return segments[1] === "student" ? `/${segments[0]}` : ""
  }, [pathname])

  const studentHref = React.useCallback((href: string) => `${tenantPrefix}${href}`, [tenantPrefix])

  const endpoint = React.useCallback(() => {
    const tenant = tenantPrefix ? tenantPrefix.slice(1) : ""
    return tenant ? `/api/tenant/student/finance?tenant=${encodeURIComponent(tenant)}` : "/api/student/finance"
  }, [tenantPrefix])

  const loadFinance = React.useCallback(async (notify = false) => {
    setLoading(true)
    setError("")
    const response = await fetch(endpoint(), { cache: "no-store" }).catch(() => null)
    if (!response?.ok) {
      const data = await response?.json().catch(() => ({}))
      const message = String(data?.error || "Failed to load finance records")
      setError(message)
      setLoading(false)
      if (notify) toast.error(message)
      return
    }
    setPayload((await response.json()) as FinancePayload)
    setLoading(false)
    if (notify) toast.success("Finance records refreshed")
  }, [endpoint])

  React.useEffect(() => {
    void loadFinance()
  }, [loadFinance])

  const currencyCode = payload?.school?.currencyCode || "ZAR"
  const money = React.useCallback((amount: number) => new Intl.NumberFormat("en", { style: "currency", currency: currencyCode }).format(amount || 0), [currencyCode])

  const invoices = payload?.invoices || []
  const payments = payload?.payments || []
  const metrics = payload?.metrics
  const readiness = payload?.paymentReadiness
  const filteredInvoices = invoices.filter((invoice) => {
    const haystack = `${invoice.invoiceNumber} ${invoice.status} ${invoice.notes}`.toLowerCase()
    return (statusFilter === "all" || invoice.status === statusFilter) && haystack.includes(query.toLowerCase())
  })

  const refresh = () => {
    setRefreshing(true)
    void loadFinance(true).finally(() => setRefreshing(false))
  }

  const exportJson = () => {
    if (!payload) return
    downloadFile("student-finance.json", JSON.stringify(payload, null, 2), "application/json")
    toast.success("Finance export downloaded")
  }

  const exportCsv = () => {
    const rows = [
      ["section", "reference", "status", "amount", "date", "details"],
      ...invoices.map((invoice) => ["invoice", invoice.invoiceNumber, invoice.status, String(invoice.outstandingBalance), formatDate(invoice.dueDate), invoice.notes]),
      ...payments.map((payment) => ["payment", payment.reference, payment.status, String(payment.amount), formatDate(payment.completedAt || payment.createdAt), payment.method]),
      ...(payload?.receipts || []).map((receipt) => ["receipt", receipt.id, receipt.status, String(receipt.amount), formatDate(receipt.issuedDate), receipt.method]),
      ...(payload?.ledger || []).map((item) => ["ledger", item.reference || item.id, item.type, String(item.amount), formatDate(item.createdAt), item.description]),
    ]
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n")
    downloadFile("student-finance.csv", csv, "text/csv")
    toast.success("Finance CSV downloaded")
  }

  const copyReference = async (reference: string) => {
    await navigator.clipboard.writeText(reference).catch(() => undefined)
    toast.success("Reference copied")
  }

  const printPage = () => {
    window.print()
    toast.success("Print dialog opened")
  }

  const invoiceText = (invoice: Invoice) => [
    `Invoice: ${invoice.invoiceNumber}`,
    `Student: ${payload?.currentUser?.name || "Student"}`,
    `School: ${payload?.school?.name || "School"}`,
    `Issued: ${formatDate(invoice.issuedDate)}`,
    `Due: ${formatDate(invoice.dueDate)}`,
    `Status: ${titleCase(invoice.status)}`,
    `Total: ${money(invoice.totalAmount)}`,
    `Paid: ${money(invoice.amountPaid)}`,
    `Outstanding: ${money(invoice.outstandingBalance)}`,
    `Notes: ${invoice.notes || "None"}`,
  ].join("\n")

  const paymentText = (payment: Payment) => [
    `Receipt: ${payment.reference}`,
    `Student: ${payload?.currentUser?.name || "Student"}`,
    `School: ${payload?.school?.name || "School"}`,
    `Amount: ${money(payment.amount)}`,
    `Method: ${payment.method}`,
    `Provider: ${payment.provider || "School finance"}`,
    `Status: ${titleCase(payment.status)}`,
    `Date: ${formatDate(payment.completedAt || payment.createdAt)}`,
  ].join("\n")

  const requestPaymentInstructions = async (invoice: Invoice) => {
    setSubmitting(true)
    const response = await fetch(endpoint(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "payment-request", invoiceId: invoice.id, invoiceNumber: invoice.invoiceNumber }),
    }).catch(() => null)
    setSubmitting(false)
    if (!response?.ok) {
      const data = await response?.json().catch(() => ({}))
      toast.error(String(data?.error || "Failed to request payment instructions"))
      return
    }
    toast.success(readiness?.onlinePaymentsEnabled ? "Payment support request sent" : "Payment instruction request sent")
    void loadFinance()
  }

  const submitNote = async () => {
    const message = noteMessage.trim()
    if (!message) {
      toast.error("Add a finance note before submitting")
      return
    }
    setSubmitting(true)
    const response = await fetch(endpoint(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "finance-note", message }),
    }).catch(() => null)
    setSubmitting(false)
    if (!response?.ok) {
      const data = await response?.json().catch(() => ({}))
      toast.error(String(data?.error || "Failed to submit finance note"))
      return
    }
    setNoteMessage("")
    setNoteOpen(false)
    toast.success("Finance note submitted")
    void loadFinance()
  }

  const sendHelpRequest = async () => {
    const message = helpMessage.trim()
    if (!message) {
      toast.error("Describe the finance help you need")
      return
    }
    const response = await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Student finance support request", message, category: "billing", priority: "normal", dashboardArea: "student-finance" }),
    }).catch(() => null)
    if (!response?.ok) {
      const data = await response?.json().catch(() => ({}))
      toast.error(String(data?.error || "Failed to send support request"))
      return
    }
    setHelpMessage("")
    setHelpOpen(false)
    toast.success("Support request sent")
  }

  const sendTeacherMessage = async () => {
    const message = messageBody.trim()
    if (!payload?.student?.classTeacherId) {
      router.push(studentHref("/student/communication"))
      toast.info("Open communication to select a staff member")
      return
    }
    if (!message) {
      toast.error("Message cannot be empty")
      return
    }
    const response = await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ receiverId: payload.student.classTeacherId, message }),
    }).catch(() => null)
    if (!response?.ok) {
      const data = await response?.json().catch(() => ({}))
      toast.error(String(data?.error || "Failed to send message"))
      return
    }
    setMessageBody("")
    setMessageOpen(false)
    toast.success("Message sent")
  }

  if (loading && !payload) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
          Loading finance records...
        </div>
      </div>
    )
  }

  if (error && !payload) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => router.push(studentHref("/student/dashboard"))}>
          <ArrowLeft className="mr-2 size-4" />
          Back to dashboard
        </Button>
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertTitle>Finance records unavailable</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={() => void loadFinance(true)}>
          <RefreshCcw className="mr-2 size-4" />
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-8">
      <Card className="overflow-hidden border-none bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.16),_transparent_35%),linear-gradient(135deg,_hsl(var(--card)),_hsl(var(--muted)))] shadow-sm">
        <CardHeader className="gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-3">
            <Button variant="ghost" className="w-fit px-0" onClick={() => router.push(studentHref("/student/dashboard"))}>
              <ArrowLeft className="mr-2 size-4" />
              Back to dashboard
            </Button>
            <div>
              <CardTitle className="text-3xl font-semibold tracking-tight">Student Finance</CardTitle>
              <CardDescription className="mt-2 max-w-3xl">
                Real-time invoices, payment history, clearance status, and finance support for {payload?.currentUser?.name || "your account"}.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">{payload?.school?.name || "School"}</Badge>
              <Badge variant="outline">{payload?.student?.className || "Class not assigned"}</Badge>
              <Badge variant="outline">{payload?.student?.term || payload?.student?.academicYear || "Current period"}</Badge>
              <Badge variant="outline">{currencyCode}</Badge>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={refresh} disabled={refreshing}>
              {refreshing ? <Loader2 className="mr-2 size-4 animate-spin" /> : <RefreshCcw className="mr-2 size-4" />}
              Refresh
            </Button>
            <Button variant="outline" onClick={exportJson} disabled={!payload}>
              <Download className="mr-2 size-4" />
              Export
            </Button>
            <Button variant="outline" onClick={exportCsv} disabled={!payload}>
              <FileText className="mr-2 size-4" />
              CSV
            </Button>
            <Button variant="outline" onClick={printPage}>
              <Printer className="mr-2 size-4" />
              Print
            </Button>
            <Button onClick={() => setHelpOpen(true)}>
              <HelpCircle className="mr-2 size-4" />
              Request help
            </Button>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
            <WalletCards className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{money(metrics?.outstanding || 0)}</div>
            <p className="text-xs text-muted-foreground">{metrics?.unpaidCount || 0} invoice(s) still open</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paid</CardTitle>
            <BadgeCheck className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{money(metrics?.totalPaid || 0)}</div>
            <p className="text-xs text-muted-foreground">{metrics?.collectionRate || 0}% collection rate</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <AlertCircle className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{money(metrics?.overdue || 0)}</div>
            <p className="text-xs text-muted-foreground">{metrics?.nextDueLabel || "No pending invoice"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clearance</CardTitle>
            <ShieldCheck className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{metrics?.clearanceReady ? "Ready" : "Blocked"}</div>
            <p className="text-xs text-muted-foreground">{metrics?.clearanceReady ? "No outstanding balance" : "Balance must be cleared"}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_0.6fr]">
        <Card>
          <CardHeader>
            <CardTitle>Payment Progress</CardTitle>
            <CardDescription>Total billed {money(metrics?.totalBilled || 0)} across {metrics?.invoiceCount || 0} invoice(s).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Progress value={Math.min(metrics?.collectionRate || 0, 100)} />
            <div className="grid gap-3 md:grid-cols-3">
              {(payload?.byStatus || []).map((item) => (
                <div key={item.status} className="rounded-lg border p-3">
                  <Badge className={cn("mb-2", statusStyles[item.status])}>{titleCase(item.status)}</Badge>
                  <div className="text-sm font-medium">{item.count} invoice(s)</div>
                  <div className="text-xs text-muted-foreground">{money(item.outstanding)} outstanding</div>
                </div>
              ))}
              {!payload?.byStatus?.length ? <p className="text-sm text-muted-foreground">No invoices have been issued yet.</p> : null}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Finance Office</CardTitle>
            <CardDescription>Payment instructions and contact options.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="text-muted-foreground">{payload?.financeOffice?.paymentInstructions}</p>
            <div className="rounded-lg border p-3">
              <div className="font-medium">Email</div>
              <div className="text-muted-foreground">{payload?.financeOffice?.email || "Configured by school office"}</div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="font-medium">Phone</div>
              <div className="text-muted-foreground">{payload?.financeOffice?.phone || "Configured by school office"}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {readiness?.warnings?.length ? (
        <Alert>
          <AlertCircle className="size-4" />
          <AlertTitle>Finance readiness notice</AlertTitle>
          <AlertDescription>{readiness.warnings.join(" ")}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Payment Readiness</CardTitle>
            <CardDescription>Gateway, receipt, and finance configuration status.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {[
              ["Online gateway", readiness?.onlinePaymentsEnabled ? `${titleCase(readiness.provider)} ${readiness.providerMode}` : "Manual only", readiness?.onlinePaymentsEnabled],
              ["Public key", readiness?.publicKeyConfigured ? "Configured" : "Missing", readiness?.publicKeyConfigured],
              ["Receipts", readiness?.receiptsAvailable ? `${payload?.receipts?.length || 0} available` : "No receipts yet", readiness?.receiptsAvailable || !payments.length],
              ["Production state", readiness?.productionReady ? "Ready" : "Needs review", readiness?.productionReady],
            ].map(([label, value, ok]) => (
              <div key={String(label)} className="rounded-lg border p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-medium">{label}</div>
                  <Badge variant={ok ? "default" : "outline"}>{ok ? "Ready" : "Review"}</Badge>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">{value}</div>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Student Payment Controls</CardTitle>
            <CardDescription>Safe payment actions available to students.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="rounded-lg border p-3">
              <div className="font-medium">{readiness?.onlinePaymentsEnabled ? "Online provider configured" : "Manual payment mode"}</div>
              <p className="mt-1 text-muted-foreground">
                {readiness?.onlinePaymentsEnabled
                  ? "The gateway is configured, but this invoice page still requires a finance-generated payment instruction until invoice-to-fee checkout is linked."
                  : "Students can request payment instructions and finance office follow-up. No fake checkout is exposed."}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => setHelpOpen(true)}>
                <HelpCircle className="mr-2 size-4" />
                Ask finance
              </Button>
              <Button variant="outline" onClick={() => router.push(studentHref("/student/refunds"))}>
                <Banknote className="mr-2 size-4" />
                Refunds
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="invoices" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="receipts">Receipts</TabsTrigger>
          <TabsTrigger value="clearance">Clearance</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="invoices" className="space-y-4">
          <Card>
            <CardHeader className="gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <CardTitle>Invoices</CardTitle>
                <CardDescription>Search, inspect, download, and request payment instructions.</CardDescription>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                  <Input className="pl-9" placeholder="Search invoices" value={query} onChange={(event) => setQuery(event.target.value)} />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-44">
                    <SelectValue placeholder="Filter status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="partial">Partial</SelectItem>
                    <SelectItem value="unpaid">Unpaid</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Due</TableHead>
                    <TableHead className="text-right">Outstanding</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell>
                        <div className="font-medium">{invoice.invoiceNumber}</div>
                        <div className="text-xs text-muted-foreground">Issued {formatDate(invoice.issuedDate)}</div>
                      </TableCell>
                      <TableCell>
                        <Badge className={cn(statusStyles[invoice.status])}>{titleCase(invoice.status)}</Badge>
                      </TableCell>
                      <TableCell>
                        <div>{formatDate(invoice.dueDate)}</div>
                        <div className="text-xs text-muted-foreground">{daysUntil(invoice.dueDate)}</div>
                      </TableCell>
                      <TableCell className="text-right font-medium">{money(invoice.outstandingBalance)}</TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="outline" onClick={() => setSelectedInvoice(invoice)}>Details</Button>
                          <Button size="sm" variant="outline" onClick={() => {
                            downloadFile(`${invoice.invoiceNumber}.txt`, invoiceText(invoice), "text/plain")
                            toast.success("Invoice downloaded")
                          }}>
                            <Download className="size-4" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => void copyReference(invoice.invoiceNumber)}>
                            <Copy className="size-4" />
                          </Button>
                          <Button size="sm" onClick={() => void requestPaymentInstructions(invoice)} disabled={submitting || invoice.status === "paid"}>
                            <CreditCard className="mr-2 size-4" />
                            {readiness?.onlinePaymentsEnabled ? "Payment help" : "Instructions"}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!filteredInvoices.length ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">No invoices match the current filters.</TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Payment History</CardTitle>
              <CardDescription>Receipt downloads are generated from live payment records.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3">
                {payments.map((payment) => (
                  <div key={payment.id} className="flex flex-col gap-3 rounded-lg border p-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-start gap-3">
                      <div className="rounded-full bg-muted p-2">
                        <Receipt className="size-4" />
                      </div>
                      <div>
                        <div className="font-medium">{payment.reference}</div>
                        <div className="text-sm text-muted-foreground">{payment.method} - {formatDate(payment.completedAt || payment.createdAt)}</div>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 md:justify-end">
                      <div className="font-semibold">{money(payment.amount)}</div>
                      <Badge className={cn(statusStyles[payment.status])}>{titleCase(payment.status)}</Badge>
                      <Button size="sm" variant="outline" onClick={() => setSelectedPayment(payment)}>Details</Button>
                      <Button size="sm" variant="outline" onClick={() => {
                        downloadFile(`${payment.reference}.txt`, paymentText(payment), "text/plain")
                        toast.success("Receipt downloaded")
                      }}>
                        <Download className="mr-2 size-4" />
                        Receipt
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => void copyReference(payment.reference)}>
                        <Copy className="size-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                {!payments.length ? <p className="rounded-lg border p-6 text-center text-sm text-muted-foreground">No payments have been recorded yet.</p> : null}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="receipts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Official Receipts</CardTitle>
              <CardDescription>Receipt records issued by the finance office.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              {(payload?.receipts || []).map((receipt) => (
                <div key={receipt.id} className="flex flex-col gap-3 rounded-lg border p-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="font-medium">{receipt.id}</div>
                    <div className="text-sm text-muted-foreground">{receipt.method || "Payment"} - issued {formatDate(receipt.issuedDate)}</div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 md:justify-end">
                    <div className="font-semibold">{money(receipt.amount)}</div>
                    <Badge className={cn(statusStyles[receipt.status])}>{titleCase(receipt.status)}</Badge>
                    <Button size="sm" variant="outline" onClick={() => {
                      downloadFile(`${receipt.id}.txt`, [
                        `Receipt: ${receipt.id}`,
                        `Student: ${payload?.currentUser?.name || "Student"}`,
                        `Amount: ${money(receipt.amount)}`,
                        `Status: ${titleCase(receipt.status)}`,
                        `Issued: ${formatDate(receipt.issuedDate)}`,
                        `Payment date: ${formatDate(receipt.paymentDate)}`,
                      ].join("\n"), "text/plain")
                      toast.success("Receipt downloaded")
                    }}>
                      <Download className="mr-2 size-4" />
                      Download
                    </Button>
                  </div>
                </div>
              ))}
              {!payload?.receipts?.length ? <p className="rounded-lg border p-6 text-center text-sm text-muted-foreground">No official receipts have been issued yet.</p> : null}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="clearance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Clearance Status</CardTitle>
              <CardDescription>Clearance is calculated from live outstanding invoice balances.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 lg:grid-cols-2">
              <Alert className={metrics?.clearanceReady ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900/60 dark:bg-emerald-950/40" : "border-amber-200 bg-amber-50 dark:border-amber-900/60 dark:bg-amber-950/40"}>
                {metrics?.clearanceReady ? <CheckCircle2 className="size-4" /> : <CalendarClock className="size-4" />}
                <AlertTitle>{metrics?.clearanceReady ? "Financially clear" : "Clearance pending"}</AlertTitle>
                <AlertDescription>
                  {metrics?.clearanceReady ? "You currently have no outstanding finance balance." : `${money(metrics?.outstanding || 0)} must be cleared before full finance clearance.`}
                </AlertDescription>
              </Alert>
              <div className="rounded-lg border p-4">
                <div className="mb-2 font-medium">Clearance actions</div>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => setHelpOpen(true)}>
                    <HelpCircle className="mr-2 size-4" />
                    Request review
                  </Button>
                  <Button variant="outline" onClick={() => router.push(studentHref("/student/refunds"))}>
                    <Banknote className="mr-2 size-4" />
                    Refunds
                  </Button>
                  <Button variant="outline" onClick={() => setMessageOpen(true)}>
                    <MessageSquare className="mr-2 size-4" />
                    Message teacher
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader className="gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle>Finance Activity</CardTitle>
                <CardDescription>Ledger entries and student finance notes.</CardDescription>
              </div>
              <Button onClick={() => setNoteOpen(true)}>
                <FileText className="mr-2 size-4" />
                Add note
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {[...(payload?.ledger || []), ...(payload?.progressNotes || []).map((note) => ({
                id: note.id,
                type: note.type || "note",
                amount: note.value || 0,
                description: note.note,
                reference: note.category,
                balance: 0,
                createdAt: note.createdAt,
              }))].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()).map((item) => (
                <div key={`${item.type}-${item.id}`} className="flex flex-col gap-2 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="font-medium">{item.description || titleCase(item.type)}</div>
                    <div className="text-sm text-muted-foreground">{formatDate(item.createdAt)} {item.reference ? `- ${item.reference}` : ""}</div>
                  </div>
                  <Badge variant="outline">{titleCase(item.type)}</Badge>
                </div>
              ))}
              {!payload?.ledger?.length && !payload?.progressNotes?.length ? <p className="rounded-lg border p-6 text-center text-sm text-muted-foreground">No finance activity has been recorded yet.</p> : null}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={Boolean(selectedInvoice)} onOpenChange={(open) => !open && setSelectedInvoice(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedInvoice?.invoiceNumber}</DialogTitle>
            <DialogDescription>Invoice details from the school finance ledger.</DialogDescription>
          </DialogHeader>
          {selectedInvoice ? (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border p-3"><div className="text-muted-foreground">Total</div><div className="font-medium">{money(selectedInvoice.totalAmount)}</div></div>
                <div className="rounded-lg border p-3"><div className="text-muted-foreground">Outstanding</div><div className="font-medium">{money(selectedInvoice.outstandingBalance)}</div></div>
              </div>
              <p><span className="font-medium">Due:</span> {formatDate(selectedInvoice.dueDate)} ({daysUntil(selectedInvoice.dueDate)})</p>
              <p><span className="font-medium">Status:</span> {titleCase(selectedInvoice.status)}</p>
              <p><span className="font-medium">Notes:</span> {selectedInvoice.notes || "No notes recorded."}</p>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => selectedInvoice && downloadFile(`${selectedInvoice.invoiceNumber}.txt`, invoiceText(selectedInvoice), "text/plain")}>Download</Button>
            <Button onClick={() => selectedInvoice && void requestPaymentInstructions(selectedInvoice)} disabled={!selectedInvoice || selectedInvoice.status === "paid" || submitting}>Request payment instructions</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(selectedPayment)} onOpenChange={(open) => !open && setSelectedPayment(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedPayment?.reference}</DialogTitle>
            <DialogDescription>Payment receipt details.</DialogDescription>
          </DialogHeader>
          {selectedPayment ? (
            <div className="space-y-3 text-sm">
              <p><span className="font-medium">Amount:</span> {money(selectedPayment.amount)}</p>
              <p><span className="font-medium">Method:</span> {selectedPayment.method}</p>
              <p><span className="font-medium">Provider:</span> {selectedPayment.provider || "School finance"}</p>
              <p><span className="font-medium">Status:</span> {titleCase(selectedPayment.status)}</p>
              <p><span className="font-medium">Date:</span> {formatDate(selectedPayment.completedAt || selectedPayment.createdAt)}</p>
            </div>
          ) : null}
          <DialogFooter>
            <Button onClick={() => selectedPayment && downloadFile(`${selectedPayment.reference}.txt`, paymentText(selectedPayment), "text/plain")}>Download receipt</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={noteOpen} onOpenChange={setNoteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Finance Note</DialogTitle>
            <DialogDescription>Submit a finance note to the student record for follow-up.</DialogDescription>
          </DialogHeader>
          <Textarea value={noteMessage} onChange={(event) => setNoteMessage(event.target.value)} placeholder="Example: Payment was made by bank transfer today. Reference..." />
          <DialogFooter>
            <Button variant="outline" onClick={() => setNoteOpen(false)}>Cancel</Button>
            <Button onClick={submitNote} disabled={submitting}>{submitting ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Send className="mr-2 size-4" />}Submit note</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Finance Help</DialogTitle>
            <DialogDescription>Send a support request to the school team.</DialogDescription>
          </DialogHeader>
          <Textarea value={helpMessage} onChange={(event) => setHelpMessage(event.target.value)} placeholder="Describe the invoice, payment, receipt, or clearance issue." />
          <DialogFooter>
            <Button variant="outline" onClick={() => setHelpOpen(false)}>Cancel</Button>
            <Button onClick={sendHelpRequest}><Send className="mr-2 size-4" />Send request</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={messageOpen} onOpenChange={setMessageOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Message Class Teacher</DialogTitle>
            <DialogDescription>Ask for help coordinating a finance clearance issue.</DialogDescription>
          </DialogHeader>
          <Textarea value={messageBody} onChange={(event) => setMessageBody(event.target.value)} placeholder="Write your message..." />
          <DialogFooter>
            <Button variant="outline" onClick={() => setMessageOpen(false)}>Cancel</Button>
            <Button onClick={sendTeacherMessage}><MessageSquare className="mr-2 size-4" />Send message</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
