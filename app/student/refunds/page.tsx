"use client"

import * as React from "react"
import { usePathname, useRouter } from "next/navigation"
import {
  AlertCircle,
  ArrowLeft,
  Banknote,
  CheckCircle2,
  Clock,
  Copy,
  Download,
  FileText,
  HelpCircle,
  Loader2,
  MessageSquare,
  Printer,
  RefreshCcw,
  Search,
  Send,
  ShieldCheck,
  Wallet,
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

type EligiblePayment = {
  id: string
  amount: number
  method: string
  reference: string
  provider: string
  status: string
  completedAt: string | null
  createdAt: string | null
}

type RefundRecord = {
  id: string
  paymentId?: string
  reference: string
  amount: number
  description?: string
  reason?: string
  status: string
  method?: string
  note?: string
  createdAt: string | null
}

type RefundPayload = {
  generatedAt: string
  currentUser?: { id: string; name: string; email: string; role: string }
  school?: { id: string; name: string; slug: string; type: string; country: string; currencyCode: string; currencyName: string }
  student?: { id: string; userId: string; admissionNumber: string; className: string; classTeacher: string; classTeacherId: string; academicYear: string; term: string }
  metrics?: {
    completedAmount: number
    pendingAmount: number
    eligibleAmount: number
    completedCount: number
    pendingCount: number
    eligiblePaymentCount: number
    averageProcessingDays: number
  }
  eligiblePayments: EligiblePayment[]
  completedRefunds: RefundRecord[]
  requests: RefundRecord[]
  refundPolicy: string
  financeOffice?: { email: string }
}

const statusStyles: Record<string, string> = {
  completed: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300",
  submitted: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300",
  pending: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300",
  rejected: "border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300",
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

function downloadFile(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export default function StudentRefundsPage() {
  const router = useRouter()
  const pathname = usePathname()
  const [payload, setPayload] = React.useState<RefundPayload | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [refreshing, setRefreshing] = React.useState(false)
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState("")
  const [query, setQuery] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState("all")
  const [requestOpen, setRequestOpen] = React.useState(false)
  const [selectedPaymentId, setSelectedPaymentId] = React.useState("")
  const [refundAmount, setRefundAmount] = React.useState("")
  const [refundReason, setRefundReason] = React.useState("")
  const [selectedRecord, setSelectedRecord] = React.useState<RefundRecord | null>(null)
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
    return tenant ? `/api/tenant/student/refunds?tenant=${encodeURIComponent(tenant)}` : "/api/student/refunds"
  }, [tenantPrefix])

  const loadRefunds = React.useCallback(async (notify = false) => {
    setLoading(true)
    setError("")
    const response = await fetch(endpoint(), { cache: "no-store" }).catch(() => null)
    if (!response?.ok) {
      const data = await response?.json().catch(() => ({}))
      const message = String(data?.error || "Failed to load refunds")
      setError(message)
      setLoading(false)
      if (notify) toast.error(message)
      return
    }
    setPayload((await response.json()) as RefundPayload)
    setLoading(false)
    if (notify) toast.success("Refunds refreshed")
  }, [endpoint])

  React.useEffect(() => {
    void loadRefunds()
  }, [loadRefunds])

  const currencyCode = payload?.school?.currencyCode || "ZAR"
  const money = React.useCallback((amount: number) => new Intl.NumberFormat("en", { style: "currency", currency: currencyCode }).format(amount || 0), [currencyCode])
  const metrics = payload?.metrics
  const selectedPayment = (payload?.eligiblePayments || []).find((payment) => payment.id === selectedPaymentId)

  const allRecords = [...(payload?.requests || []), ...(payload?.completedRefunds || [])]
  const filteredRecords = allRecords.filter((record) => {
    const haystack = `${record.reference} ${record.status} ${record.reason || ""} ${record.description || ""}`.toLowerCase()
    return (statusFilter === "all" || record.status === statusFilter) && haystack.includes(query.toLowerCase())
  })

  const refresh = () => {
    setRefreshing(true)
    void loadRefunds(true).finally(() => setRefreshing(false))
  }

  const exportJson = () => {
    if (!payload) return
    downloadFile("student-refunds.json", JSON.stringify(payload, null, 2), "application/json")
    toast.success("Refund export downloaded")
  }

  const exportCsv = () => {
    const rows = [
      ["reference", "status", "amount", "date", "details"],
      ...allRecords.map((record) => [
        record.reference,
        record.status,
        String(record.amount),
        formatDate(record.createdAt),
        record.reason || record.description || record.note || "",
      ]),
    ]
    const csv = rows.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",")).join("\n")
    downloadFile("student-refunds.csv", csv, "text/csv")
    toast.success("Refund CSV downloaded")
  }

  const refundText = (record: RefundRecord) => [
    `Refund reference: ${record.reference}`,
    `Student: ${payload?.currentUser?.name || "Student"}`,
    `School: ${payload?.school?.name || "School"}`,
    `Amount: ${money(record.amount)}`,
    `Status: ${titleCase(record.status)}`,
    `Date: ${formatDate(record.createdAt)}`,
    `Details: ${record.reason || record.description || record.note || "No details recorded."}`,
  ].join("\n")

  const openRequest = (payment?: EligiblePayment) => {
    setSelectedPaymentId(payment?.id || "")
    setRefundAmount(payment ? String(payment.amount) : "")
    setRefundReason("")
    setRequestOpen(true)
  }

  const submitRefundRequest = async () => {
    const amount = Number(refundAmount)
    const reason = refundReason.trim()
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Enter a valid refund amount")
      return
    }
    if (selectedPayment && amount > selectedPayment.amount) {
      toast.error("Refund amount cannot exceed the selected payment")
      return
    }
    if (!reason) {
      toast.error("Refund reason is required")
      return
    }

    setSubmitting(true)
    const response = await fetch(endpoint(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "refund-request",
        amount,
        reason,
        paymentReference: selectedPayment?.reference || "manual",
      }),
    }).catch(() => null)
    setSubmitting(false)
    if (!response?.ok) {
      const data = await response?.json().catch(() => ({}))
      toast.error(String(data?.error || "Failed to submit refund request"))
      return
    }
    setRequestOpen(false)
    setSelectedPaymentId("")
    setRefundAmount("")
    setRefundReason("")
    toast.success("Refund request submitted")
    void loadRefunds()
  }

  const copyReference = async (reference: string) => {
    await navigator.clipboard.writeText(reference).catch(() => undefined)
    toast.success("Reference copied")
  }

  const requestStatusUpdate = async (record: RefundRecord) => {
    const response = await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: `Refund status update: ${record.reference}`,
        message: `Please provide a status update for refund ${record.reference} (${money(record.amount)}).`,
        category: "billing",
        priority: "normal",
        dashboardArea: "student-refunds",
      }),
    }).catch(() => null)
    if (!response?.ok) {
      const data = await response?.json().catch(() => ({}))
      toast.error(String(data?.error || "Failed to request status update"))
      return
    }
    toast.success("Status update request sent")
  }

  const sendHelpRequest = async () => {
    const message = helpMessage.trim()
    if (!message) {
      toast.error("Describe the refund help you need")
      return
    }
    const response = await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Student refund support request", message, category: "billing", priority: "normal", dashboardArea: "student-refunds" }),
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
          Loading refunds...
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
          <AlertTitle>Refunds unavailable</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={() => void loadRefunds(true)}>
          <RefreshCcw className="mr-2 size-4" />
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-8">
      <Card className="overflow-hidden border-none bg-[radial-gradient(circle_at_top_left,_rgba(34,197,94,0.16),_transparent_35%),linear-gradient(135deg,_hsl(var(--card)),_hsl(var(--muted)))] shadow-sm">
        <CardHeader className="gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-3">
            <Button variant="ghost" className="w-fit px-0" onClick={() => router.push(studentHref("/student/finance"))}>
              <ArrowLeft className="mr-2 size-4" />
              Back to finance
            </Button>
            <div>
              <CardTitle className="text-3xl font-semibold tracking-tight">My Refunds</CardTitle>
              <CardDescription className="mt-2 max-w-3xl">
                Request refunds, track approval progress, review completed refunds, and download refund confirmations.
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
            <Button variant="outline" onClick={() => {
              window.print()
              toast.success("Print dialog opened")
            }}>
              <Printer className="mr-2 size-4" />
              Print
            </Button>
            <Button onClick={() => openRequest()}>
              <Banknote className="mr-2 size-4" />
              New request
            </Button>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Refunds</CardTitle>
            <CheckCircle2 className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{money(metrics?.completedAmount || 0)}</div>
            <p className="text-xs text-muted-foreground">{metrics?.completedCount || 0} completed refund(s)</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Submitted</CardTitle>
            <Clock className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{money(metrics?.pendingAmount || 0)}</div>
            <p className="text-xs text-muted-foreground">{metrics?.pendingCount || 0} request(s) under review</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Eligible Payments</CardTitle>
            <Wallet className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{money(metrics?.eligibleAmount || 0)}</div>
            <p className="text-xs text-muted-foreground">{metrics?.eligiblePaymentCount || 0} completed payment(s)</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Review Target</CardTitle>
            <ShieldCheck className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{metrics?.averageProcessingDays || 0} days</div>
            <p className="text-xs text-muted-foreground">Finance office processing estimate</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle>Refund Readiness</CardTitle>
            <CardDescription>Operational checklist before finance can approve a refund.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Progress value={Math.min(100, ((metrics?.completedCount || 0) + (metrics?.pendingCount || 0) + (metrics?.eligiblePaymentCount || 0)) ? 75 : 25)} />
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-lg border p-3">
                <CheckCircle2 className="mb-2 size-4 text-emerald-600" />
                <div className="font-medium">Payment verified</div>
                <p className="text-xs text-muted-foreground">{metrics?.eligiblePaymentCount || 0} completed payment(s) available.</p>
              </div>
              <div className="rounded-lg border p-3">
                <FileText className="mb-2 size-4 text-blue-600" />
                <div className="font-medium">Reason captured</div>
                <p className="text-xs text-muted-foreground">Requests require a clear reason and amount.</p>
              </div>
              <div className="rounded-lg border p-3">
                <ShieldCheck className="mb-2 size-4 text-amber-600" />
                <div className="font-medium">Finance review</div>
                <p className="text-xs text-muted-foreground">Average target is {metrics?.averageProcessingDays || 0} day(s).</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common refund workflows.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            <Button onClick={() => openRequest()}>
              <Banknote className="mr-2 size-4" />
              Start manual refund review
            </Button>
            <Button variant="outline" onClick={() => setHelpOpen(true)}>
              <HelpCircle className="mr-2 size-4" />
              Ask finance a question
            </Button>
            <Button variant="outline" onClick={() => router.push(studentHref("/student/finance"))}>
              <Wallet className="mr-2 size-4" />
              Open finance page
            </Button>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="requests" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="requests">Requests</TabsTrigger>
          <TabsTrigger value="eligible">Eligible</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="policy">Policy</TabsTrigger>
        </TabsList>

        <TabsContent value="requests" className="space-y-4">
          <Card>
            <CardHeader className="gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <CardTitle>Refund Requests</CardTitle>
                <CardDescription>Submitted requests are stored against your student finance record.</CardDescription>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                  <Input className="pl-9" placeholder="Search refunds" value={query} onChange={(event) => setQuery(event.target.value)} />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-44">
                    <SelectValue placeholder="Filter status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="submitted">Submitted</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reference</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecords.map((record) => (
                    <TableRow key={`${record.status}-${record.id}`}>
                      <TableCell>
                        <div className="font-medium">{record.reference}</div>
                        <div className="text-xs text-muted-foreground">{record.reason || record.description || "Refund record"}</div>
                      </TableCell>
                      <TableCell>
                        <Badge className={cn(statusStyles[record.status])}>{titleCase(record.status)}</Badge>
                      </TableCell>
                      <TableCell>{formatDate(record.createdAt)}</TableCell>
                      <TableCell className="text-right font-medium">{money(record.amount)}</TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="outline" onClick={() => setSelectedRecord(record)}>Details</Button>
                          <Button size="sm" variant="outline" onClick={() => void copyReference(record.reference)}>
                            <Copy className="size-4" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => void requestStatusUpdate(record)}>
                            <HelpCircle className="size-4" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => {
                            downloadFile(`${record.reference || record.id}.txt`, refundText(record), "text/plain")
                            toast.success("Refund confirmation downloaded")
                          }}>
                            <Download className="size-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!filteredRecords.length ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">No refund records match the current filters.</TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="eligible" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Eligible Payments</CardTitle>
              <CardDescription>Use completed payments as the source for a refund request.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              {(payload?.eligiblePayments || []).map((payment) => (
                <div key={payment.id} className="flex flex-col gap-3 rounded-lg border p-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="font-medium">{payment.reference}</div>
                    <div className="text-sm text-muted-foreground">{payment.method} - {formatDate(payment.completedAt || payment.createdAt)}</div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 md:justify-end">
                    <div className="font-semibold">{money(payment.amount)}</div>
                    <Badge className={cn(statusStyles.completed)}>Completed</Badge>
                    <Button size="sm" onClick={() => openRequest(payment)}>Request refund</Button>
                  </div>
                </div>
              ))}
              {!payload?.eligiblePayments?.length ? <p className="rounded-lg border p-6 text-center text-sm text-muted-foreground">No completed payments are currently eligible for a refund request.</p> : null}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Completed Refunds</CardTitle>
              <CardDescription>Refunds recorded from payment status and ledger entries.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              {(payload?.completedRefunds || []).map((refund) => (
                <div key={refund.id} className="flex flex-col gap-3 rounded-lg border p-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="font-medium">{refund.reference}</div>
                    <div className="text-sm text-muted-foreground">{refund.description || "Refund processed"} - {formatDate(refund.createdAt)}</div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 md:justify-end">
                    <div className="font-semibold">{money(refund.amount)}</div>
                    <Badge className={cn(statusStyles.completed)}>Completed</Badge>
                    <Button size="sm" variant="outline" onClick={() => {
                      downloadFile(`${refund.reference || refund.id}.txt`, refundText(refund), "text/plain")
                      toast.success("Refund confirmation downloaded")
                    }}>Download</Button>
                  </div>
                </div>
              ))}
              {!payload?.completedRefunds?.length ? <p className="rounded-lg border p-6 text-center text-sm text-muted-foreground">No completed refunds have been recorded yet.</p> : null}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="timeline" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Processing Timeline</CardTitle>
              <CardDescription>How refund requests move from submission to completion.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-4">
              {["Submitted", "Finance review", "Verification", "Paid out"].map((step, index) => (
                <div key={step} className="rounded-lg border p-4">
                  <div className="mb-2 flex size-8 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">{index + 1}</div>
                  <div className="font-medium">{step}</div>
                  <p className="text-xs text-muted-foreground">
                    {index === 0 ? "Request is stored on your student record." : index === 1 ? "Finance checks payment and policy." : index === 2 ? "Bank or ledger details are verified." : "Refund is recorded in payment history."}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="policy" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Refund Policy</CardTitle>
              <CardDescription>School-configured refund guidance and support actions.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 lg:grid-cols-2">
              <Alert>
                <FileText className="size-4" />
                <AlertTitle>Policy</AlertTitle>
                <AlertDescription>{payload?.refundPolicy}</AlertDescription>
              </Alert>
              <div className="rounded-lg border p-4">
                <div className="mb-2 font-medium">Need help?</div>
                <p className="mb-4 text-sm text-muted-foreground">Finance email: {payload?.financeOffice?.email || "Configured by school office"}</p>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => setHelpOpen(true)}>
                    <HelpCircle className="mr-2 size-4" />
                    Request help
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
      </Tabs>

      <Dialog open={requestOpen} onOpenChange={setRequestOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Refund Request</DialogTitle>
            <DialogDescription>Select a completed payment, enter the amount, and provide a reason for finance review.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Select value={selectedPaymentId || "manual"} onValueChange={(value) => {
              if (value === "manual") {
                setSelectedPaymentId("")
                return
              }
              const payment = payload?.eligiblePayments.find((item) => item.id === value)
              setSelectedPaymentId(value)
              setRefundAmount(payment ? String(payment.amount) : refundAmount)
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Select payment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">Manual review request</SelectItem>
                {(payload?.eligiblePayments || []).map((payment) => (
                  <SelectItem key={payment.id} value={payment.id}>{payment.reference} - {money(payment.amount)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input type="number" min="0" step="0.01" value={refundAmount} onChange={(event) => setRefundAmount(event.target.value)} placeholder="Refund amount" />
            <Textarea value={refundReason} onChange={(event) => setRefundReason(event.target.value)} placeholder="Why are you requesting this refund?" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRequestOpen(false)}>Cancel</Button>
            <Button onClick={submitRefundRequest} disabled={submitting}>
              {submitting ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Send className="mr-2 size-4" />}
              Submit request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(selectedRecord)} onOpenChange={(open) => !open && setSelectedRecord(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedRecord?.reference}</DialogTitle>
            <DialogDescription>Refund record details.</DialogDescription>
          </DialogHeader>
          {selectedRecord ? (
            <div className="space-y-3 text-sm">
              <p><span className="font-medium">Amount:</span> {money(selectedRecord.amount)}</p>
              <p><span className="font-medium">Status:</span> {titleCase(selectedRecord.status)}</p>
              <p><span className="font-medium">Date:</span> {formatDate(selectedRecord.createdAt)}</p>
              <p><span className="font-medium">Details:</span> {selectedRecord.reason || selectedRecord.description || selectedRecord.note || "No details recorded."}</p>
            </div>
          ) : null}
          <DialogFooter>
            <Button onClick={() => selectedRecord && downloadFile(`${selectedRecord.reference || selectedRecord.id}.txt`, refundText(selectedRecord), "text/plain")}>Download confirmation</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Refund Help</DialogTitle>
            <DialogDescription>Send a refund support request to the school team.</DialogDescription>
          </DialogHeader>
          <Textarea value={helpMessage} onChange={(event) => setHelpMessage(event.target.value)} placeholder="Describe the refund issue or question." />
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
            <DialogDescription>Ask for help coordinating a refund issue.</DialogDescription>
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
