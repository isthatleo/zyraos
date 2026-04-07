"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import {
  Search,
  Filter,
  Download,
  Printer,
  Mail,
  Eye,
  MoreHorizontal,
  Calendar,
  DollarSign,
  User,
  FileText,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface Receipt {
  id: string
  receiptNumber: string
  studentId: string
  studentName: string
  paymentType: string
  amount: number
  currency: string
  paymentDate: Date
  issuedDate: Date
  status: 'issued' | 'sent' | 'printed' | 'voided'
  recipientEmail?: string
  recipientPhone?: string
}

interface ReceiptsManagementProps {
  tenantSlug: string
  userId: string
}

export function ReceiptsManagement({ tenantSlug, userId }: ReceiptsManagementProps) {
  const [receipts, setReceipts] = useState<Receipt[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [dateFilter, setDateFilter] = useState<string>("all")
  const [selectedReceipts, setSelectedReceipts] = useState<string[]>([])
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null)
  const [showReceiptDialog, setShowReceiptDialog] = useState(false)

  useEffect(() => {
    fetchReceipts()
  }, [tenantSlug])

  const fetchReceipts = async () => {
    try {
      const response = await fetch(`/api/tenant/receipts?tenant=${tenantSlug}`)
      if (!response.ok) throw new Error('Failed to fetch receipts')
      const data = await response.json()
      setReceipts(data)
    } catch (error) {
      toast.error('Failed to load receipts')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const filteredReceipts = receipts.filter(receipt => {
    const matchesSearch = receipt.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         receipt.receiptNumber.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || receipt.status === statusFilter
    const matchesDate = dateFilter === "all" || checkDateFilter(receipt.issuedDate, dateFilter)

    return matchesSearch && matchesStatus && matchesDate
  })

  const checkDateFilter = (date: Date, filter: string) => {
    const receiptDate = new Date(date)
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const thisYear = new Date(now.getFullYear(), 0, 1)

    switch (filter) {
      case "today":
        return receiptDate >= today
      case "this_month":
        return receiptDate >= thisMonth
      case "this_year":
        return receiptDate >= thisYear
      default:
        return true
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedReceipts(filteredReceipts.map(r => r.id))
    } else {
      setSelectedReceipts([])
    }
  }

  const handleSelectReceipt = (receiptId: string, checked: boolean) => {
    if (checked) {
      setSelectedReceipts(prev => [...prev, receiptId])
    } else {
      setSelectedReceipts(prev => prev.filter(id => id !== receiptId))
    }
  }

  const bulkEmail = async () => {
    if (selectedReceipts.length === 0) return

    try {
      const response = await fetch(`/api/tenant/receipts/bulk-email?tenant=${tenantSlug}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receiptIds: selectedReceipts }),
      })

      if (!response.ok) throw new Error('Failed to send emails')

      toast.success(`Emails sent to ${selectedReceipts.length} recipients`)
      setSelectedReceipts([])
      fetchReceipts()
    } catch (error) {
      toast.error('Failed to send emails')
      console.error(error)
    }
  }

  const bulkPrint = async () => {
    if (selectedReceipts.length === 0) return

    try {
      const response = await fetch(`/api/tenant/receipts/bulk-print?tenant=${tenantSlug}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receiptIds: selectedReceipts }),
      })

      if (!response.ok) throw new Error('Failed to generate print files')

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'receipts.pdf'
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast.success('Print files generated successfully')
    } catch (error) {
      toast.error('Failed to generate print files')
      console.error(error)
    }
  }

  const viewReceipt = (receipt: Receipt) => {
    setSelectedReceipt(receipt)
    setShowReceiptDialog(true)
  }

  const printReceipt = async (receiptId: string) => {
    try {
      const response = await fetch(`/api/tenant/receipts/${receiptId}/print?tenant=${tenantSlug}`)
      if (!response.ok) throw new Error('Failed to generate receipt')

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `receipt-${receiptId}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      toast.error('Failed to print receipt')
      console.error(error)
    }
  }

  const resendEmail = async (receiptId: string) => {
    try {
      const response = await fetch(`/api/tenant/receipts/${receiptId}/email?tenant=${tenantSlug}`, {
        method: 'POST',
      })

      if (!response.ok) throw new Error('Failed to resend email')

      toast.success('Email sent successfully')
      fetchReceipts()
    } catch (error) {
      toast.error('Failed to resend email')
      console.error(error)
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      issued: "bg-blue-100 text-blue-800",
      sent: "bg-green-100 text-green-800",
      printed: "bg-purple-100 text-purple-800",
      voided: "bg-red-100 text-red-800",
    }
    return variants[status] || "bg-gray-100 text-gray-800"
  }

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: currency,
    }).format(amount)
  }

  if (loading) {
    return <div className="flex justify-center p-8">Loading receipts...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Receipts Management</h1>
          <p className="text-muted-foreground">Manage and distribute payment receipts</p>
        </div>
        <div className="flex gap-2">
          {selectedReceipts.length > 0 && (
            <>
              <Button variant="outline" onClick={bulkEmail}>
                <Mail className="h-4 w-4 mr-2" />
                Email ({selectedReceipts.length})
              </Button>
              <Button variant="outline" onClick={bulkPrint}>
                <Printer className="h-4 w-4 mr-2" />
                Print ({selectedReceipts.length})
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by student or receipt number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="issued">Issued</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="printed">Printed</SelectItem>
                <SelectItem value="voided">Voided</SelectItem>
              </SelectContent>
            </Select>

            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by date" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Dates</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="this_month">This Month</SelectItem>
                <SelectItem value="this_year">This Year</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" onClick={() => {
              setSearchTerm("")
              setStatusFilter("all")
              setDateFilter("all")
            }}>
              <Filter className="h-4 w-4 mr-2" />
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Receipts Table */}
      <Card>
        <CardHeader>
          <CardTitle>Receipts ({filteredReceipts.length})</CardTitle>
          <CardDescription>
            {selectedReceipts.length > 0 && `${selectedReceipts.length} selected`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedReceipts.length === filteredReceipts.length && filteredReceipts.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead>Receipt Number</TableHead>
                <TableHead>Student Name</TableHead>
                <TableHead>Payment Type</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Issue Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredReceipts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No receipts found
                  </TableCell>
                </TableRow>
              ) : (
                filteredReceipts.map((receipt) => (
                  <TableRow key={receipt.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedReceipts.includes(receipt.id)}
                        onCheckedChange={(checked) => handleSelectReceipt(receipt.id, checked as boolean)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{receipt.receiptNumber}</TableCell>
                    <TableCell>{receipt.studentName}</TableCell>
                    <TableCell>{receipt.paymentType}</TableCell>
                    <TableCell>{formatCurrency(receipt.amount, receipt.currency)}</TableCell>
                    <TableCell>{new Date(receipt.issuedDate).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Badge className={getStatusBadge(receipt.status)}>
                        {receipt.status.charAt(0).toUpperCase() + receipt.status.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => viewReceipt(receipt)}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => printReceipt(receipt.id)}>
                            <Printer className="h-4 w-4 mr-2" />
                            Print Receipt
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => resendEmail(receipt.id)}>
                            <Mail className="h-4 w-4 mr-2" />
                            Resend Email
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Receipt Viewer Dialog */}
      <Dialog open={showReceiptDialog} onOpenChange={setShowReceiptDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Receipt Details</DialogTitle>
            <DialogDescription>
              {selectedReceipt?.receiptNumber}
            </DialogDescription>
          </DialogHeader>
          {selectedReceipt && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Receipt Number</Label>
                  <p className="text-sm">{selectedReceipt.receiptNumber}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Issue Date</Label>
                  <p className="text-sm">{new Date(selectedReceipt.issuedDate).toLocaleDateString()}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Student</Label>
                  <p className="text-sm">{selectedReceipt.studentName}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Amount</Label>
                  <p className="text-sm font-semibold">{formatCurrency(selectedReceipt.amount, selectedReceipt.currency)}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Payment Type</Label>
                  <p className="text-sm">{selectedReceipt.paymentType}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Status</Label>
                  <Badge className={getStatusBadge(selectedReceipt.status)}>
                    {selectedReceipt.status.charAt(0).toUpperCase() + selectedReceipt.status.slice(1)}
                  </Badge>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button onClick={() => printReceipt(selectedReceipt.id)}>
                  <Printer className="h-4 w-4 mr-2" />
                  Print
                </Button>
                <Button variant="outline" onClick={() => resendEmail(selectedReceipt.id)}>
                  <Mail className="h-4 w-4 mr-2" />
                  Email
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
