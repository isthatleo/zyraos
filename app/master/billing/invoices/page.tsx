"use client"

import { useState, useEffect, useMemo, Suspense } from "react"
import { useTheme } from "next-themes"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { StatusPill } from "@/components/status-pill"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Search, Plus, MoreHorizontal, FileText, DollarSign, Clock, CheckCircle, ArrowLeft, Loader2, Filter, Download, TrendingUp, Sun, Moon, Laptop } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

interface Invoice {
  id: string
  school: string
  date: string
  amount: number 
  status: "paid" | "pending" | "void" | "overdue"
  dueDate: string
  currency: string
}

export default function InvoicesPage() {
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")

  useEffect(() => {
    fetchInvoices()
    setMounted(true)
  }, [])

  const fetchInvoices = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/master/billing/invoices")
      const data = await response.json()
      if (response.ok) setInvoices(data.invoices || [])
    } catch (error) {
      toast.error("Error loading system invoices")
    } finally {
      setLoading(false)
    }
  }

  const handleAction = async (invoiceId: string, newStatus: Invoice['status']) => {
    // Simulate API call to update invoice status
    await new Promise(resolve => setTimeout(resolve, 300))
    
    setInvoices(prevInvoices => 
      prevInvoices.map(inv => 
        inv.id === invoiceId ? { ...inv, status: newStatus } : inv
      )
    )
    toast.success(`Invoice ${invoiceId} marked as ${newStatus}.`)
  }

  const filteredInvoices = useMemo(() => {
    return invoices.filter(invoice => 
      (invoice.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.school.toLowerCase().includes(searchTerm.toLowerCase())) &&
      (statusFilter === "all" || invoice.status === statusFilter)
    )
  }, [invoices, searchTerm, statusFilter])

  const totalInvoiced = useMemo(() => 
    invoices.reduce((sum, inv) => sum + inv.amount, 0), [invoices]
  )

  const totalPaid = useMemo(() => 
    invoices.filter(inv => inv.status === "paid").reduce((sum, inv) => sum + inv.amount, 0), [invoices]
  )

  const totalOutstanding = useMemo(() => 
    invoices.filter(inv => inv.status === "pending" || inv.status === "overdue").reduce((sum, inv) => sum + inv.amount, 0), [invoices]
  )

  return (
    <div className="p-6 lg:p-8 space-y-8 bg-gray-50/50 min-h-screen">
      {/* Header with Back Button */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => router.push('/master/billing')} 
            className="hover:bg-white shadow-none"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Overview
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Platform Invoices</h1>
            <p className="text-gray-600 mt-1">Review and manage billing history across all institutions</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {mounted && (
            <Select value={theme} onValueChange={setTheme}>
              <SelectTrigger className="w-36 bg-white dark:bg-gray-950 border-gray-200">
                <div className="flex items-center gap-2">
                  {theme === "light" && <Sun className="h-4 w-4" />}
                  {theme === "dark" && <Moon className="h-4 w-4" />}
                  {theme === "system" && <Laptop className="h-4 w-4" />}
                  <span className="capitalize">{theme}</span>
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
                <SelectItem value="system">System</SelectItem>
              </SelectContent>
            </Select>
          )}
          <Button 
            className="bg-orange-600 hover:bg-orange-700 text-white shadow-md gap-2"
            onClick={() => toast.info("New Invoice creation coming soon!")} 
          >
            <Plus className="h-4 w-4" />
            New Invoice
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <SummaryCard title="Total Invoiced" value={totalInvoiced} icon={DollarSign} color="blue" subtitle="Lifetime revenue" />
        <SummaryCard title="Paid Amount" value={totalPaid} icon={CheckCircle} color="green" subtitle="Successfully collected" />
        <SummaryCard title="Outstanding" value={totalOutstanding} icon={Clock} color="orange" subtitle="Pending payments" highlight />
        <SummaryCard title="Monthly MRR" value={totalInvoiced * 0.8} icon={TrendingUp} color="purple" subtitle="Projected monthly" />
      </div>

      {/* Filters and Table */}
      <Card className="rounded-xl border-none shadow-sm bg-white overflow-hidden">
        <CardHeader className="border-b border-gray-100 py-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <CardTitle className="text-lg font-bold text-gray-900">Invoice History</CardTitle>
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input 
                  placeholder="Search invoices..." 
                  className="pl-9 bg-gray-50/50 border-gray-200"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40 bg-gray-50/50">
                  <Filter className="h-4 w-4 mr-2 text-gray-400" />
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                  <SelectItem value="void">Void</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" className="bg-gray-50/50">
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/50 hover:bg-gray-50/50 border-b border-gray-100">
                  <TableHead className="py-4 px-6 font-semibold text-gray-700">Invoice #</TableHead>
                  <TableHead className="py-4 px-6 font-semibold text-gray-700">Institution</TableHead>
                  <TableHead className="py-4 px-6 font-semibold text-gray-700">Date</TableHead>
                  <TableHead className="py-4 px-6 font-semibold text-gray-700">Amount</TableHead>
                  <TableHead className="py-4 px-6 font-semibold text-gray-700">Status</TableHead>
                  <TableHead className="py-4 px-6 font-semibold text-gray-700">Due Date</TableHead>
                  <TableHead className="py-4 px-6 font-semibold text-gray-700 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="bg-white">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={7} className="p-4">
                        <Skeleton className="h-8 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : filteredInvoices.length > 0 ? (
                  filteredInvoices.map((invoice) => (
                    <TableRow 
                      key={invoice.id} 
                      className="border-b border-gray-100/80 hover:bg-gray-50 transition-colors group"
                      onClick={() => router.push(`/master/billing/invoices/${invoice.id}`)}
                    >
                      <TableCell className="py-4 px-6 font-bold text-gray-900">{invoice.id}</TableCell>
                      <TableCell className="py-4 px-6">
                        <span className="font-medium text-gray-700">{invoice.school}</span>
                      </TableCell>
                      <TableCell className="py-4 px-6 text-sm text-gray-600">{invoice.date}</TableCell>
                      <TableCell className="py-4 px-6 font-bold text-gray-900">R {invoice.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                      <TableCell className="py-4 px-6">
                        <StatusPill
                          status={invoice.status}
                          text={invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                        />
                      </TableCell>
                      <TableCell className="py-4 px-6 text-sm text-gray-600">{invoice.dueDate}</TableCell>
                      <TableCell className="py-4 px-6 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button 
                              variant="ghost" 
                              className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => e.stopPropagation()} // Prevent row click from triggering
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem 
                              className="cursor-pointer" 
                              onClick={() => router.push(`/master/billing/invoices/${invoice.id}`)}
                            >
                              <FileText className="h-4 w-4 mr-2" />
                              View Invoice
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="cursor-pointer" 
                              onClick={() => handleAction(invoice.id, 'paid')}
                              disabled={invoice.status === 'paid'}
                            >Mark as Paid</DropdownMenuItem>
                            <DropdownMenuItem 
                              className="cursor-pointer" 
                              onClick={() => handleAction(invoice.id, 'pending')}
                              disabled={invoice.status === 'pending'}
                            >Mark as Pending</DropdownMenuItem>
                            <DropdownMenuItem 
                              className="text-red-600 cursor-pointer" 
                              onClick={() => handleAction(invoice.id, 'void')}
                              disabled={invoice.status === 'void'}
                            >Void Invoice</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-gray-500">
                      No invoices found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function SummaryCard({ title, value, icon: Icon, color, subtitle, highlight }: any) {
  const colors: any = {
    blue: "text-blue-500",
    green: "text-green-500",
    orange: "text-orange-500",
    purple: "text-purple-500"
  }
  return (
    <Card className={cn("border-none shadow-sm bg-white p-4", highlight && "border-l-4 border-l-orange-500")}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-xs font-medium text-gray-500 uppercase tracking-wider">{title}</CardTitle>
        <Icon className={cn("h-4 w-4", colors[color])} />
      </CardHeader>
      <CardContent>
        <div className={cn("text-2xl font-bold", highlight ? "text-orange-600" : "text-gray-900")}>
          R {value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
        <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
      </CardContent>
    </Card>
  )
}
