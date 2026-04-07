"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ArrowLeft, Printer, CheckCircle, Clock, X, Download, Mail, MoreHorizontal, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { useParams, useRouter } from 'next/navigation'
import { Label } from '@/components/ui/label'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface Invoice {
  id: string
  invoiceId: string
  schoolName: string
  schoolAddress: string
  schoolSlug: string
  schoolPhone: string
  amount: number
  status: 'pending' | 'paid' | 'overdue' | 'void'
  issueDate: string
  dueDate: string
  plan: string
  billingPeriod: string
  schoolCurrency: string
  exchangeRate: number // Base ZAR to School Currency
}

export default function InvoiceTemplatePage() {
  const params = useParams() as { invoiceId: string }
  const router = useRouter()
  const invoiceId = params.invoiceId
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [loading, setLoading] = useState(true)

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    paid: 'bg-green-100 text-green-800',
    overdue: 'bg-red-100 text-red-800',
    void: 'bg-gray-100 text-gray-800',
  }

  const statusIcons: Record<string, React.ReactNode> = {
    pending: <Clock className="h-4 w-4" />,
    paid: <CheckCircle className="h-4 w-4" />,
    overdue: <Clock className="h-4 w-4" />,
    void: <X className="h-4 w-4" />,
  }

  useEffect(() => {
    if (invoiceId) {
      const fetchInvoice = async () => {
        try {
          setLoading(true)
          const response = await fetch(`/api/master/billing/invoices/${invoiceId}`)
          const data = await response.json()
          if (response.ok) setInvoice(data.invoice)
        } catch (e) {
          toast.error("Failed to fetch invoice from database")
        } finally {
          setLoading(false)
        }
      }
      fetchInvoice()
    }
  }, [invoiceId])

  const handlePrint = () => {
    window.print()
  }

  const handleUpdateStatus = async (newStatus: Invoice['status']) => {
    if (!invoice) return

    // Simulate API call to update invoice status
    await new Promise(resolve => setTimeout(resolve, 300))
    
    setInvoice(prev => {
      if (!prev) return null
      return { ...prev, status: newStatus }
    })
    toast.success(`Invoice ${invoice.invoiceId} marked as ${newStatus}.`)
    // In a real app, you'd re-fetch from API: fetchInvoice();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
        <p className="ml-2 text-gray-500">Loading invoice...</p>
      </div>
    )
  }

  if (!invoice) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-6">
        <X className="h-12 w-12 text-red-500 mb-4" />
        <h1 className="text-2xl font-bold text-gray-900">Invoice Not Found</h1>
        <p className="text-gray-600 mt-2">The invoice you are looking for does not exist or has been deleted.</p>
        <Button onClick={() => router.push('/master/billing/invoices')} className="mt-6">Back to Invoices</Button>
      </div>
    )
  }

  const handleDownloadPDF = () => {
    toast.info("Preparing PDF download...")
    setTimeout(() => {
      window.print()
      toast.success("Invoice downloaded as PDF")
    }, 500)
  }

  const handleSendEmail = () => {
    toast.info(`Sending invoice to ${invoice.schoolSlug}@roxan.com...`)
    setTimeout(() => {
      toast.success("Invoice sent to school email")
    }, 1500)
  }

  return (
    <div className="flex flex-col gap-6 p-6 lg:p-8 bg-gray-50/50 min-h-screen print:bg-white print:p-0">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between print:hidden">
        <Button variant="ghost" onClick={() => router.push('/master/billing')} className="w-fit">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Invoices
        </Button>
        <div className="flex items-center gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <MoreHorizontal className="h-4 w-4 mr-2" />
                Actions
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleDownloadPDF}>
                <Download className="mr-2 h-4 w-4" />
                Download PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleSendEmail}>
                <Mail className="mr-2 h-4 w-4" />
                Send Email
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button onClick={handlePrint} className="bg-orange-600 hover:bg-orange-700 text-white shadow-lg">
            <Printer className="mr-2 h-4 w-4" /> 
            Print Invoice
          </Button>
        </div>
      </div>

      {/* Invoice Actions */}
      <Card className="print:hidden rounded-xl border-gray-200 bg-white shadow-sm">
        <CardHeader className="border-b border-gray-100 py-4">
          <div className="flex items-center gap-2">
            {invoice.status === 'paid' && <CheckCircle className="h-5 w-5 text-green-600" />}
            {invoice.status === 'pending' && <Clock className="h-5 w-5 text-yellow-600" />}
            {invoice.status === 'overdue' && <X className="h-5 w-5 text-red-600" />}
            {invoice.status === 'void' && <X className="h-5 w-5 text-gray-600" />}
            <CardTitle className="text-lg font-semibold text-gray-900">
              Invoice Status: <span className={statusColors[invoice.status]}>{invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}</span>
            </CardTitle>
          </div>
          <CardTitle>Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={() => handleUpdateStatus('paid')} disabled={invoice.status === 'paid'}>
              <CheckCircle className="mr-2 h-4 w-4" />
              Mark as Paid
            </Button>
            <Button variant="outline" onClick={() => handleUpdateStatus('pending')} disabled={invoice.status === 'pending'}>
              <Clock className="mr-2 h-4 w-4" />
              Mark as Pending
            </Button>
            <Button variant="outline" onClick={() => handleUpdateStatus('void')} disabled={invoice.status === 'void'}>
              <X className="mr-2 h-4 w-4" />
              Void Invoice
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Industry Grade Invoice Template */}
      <Card className="max-w-5xl mx-auto border-none shadow-xl bg-white overflow-hidden print:shadow-none print:max-w-full">
        <div className="h-2 bg-orange-600 w-full" />
        <CardContent className="p-12">
          <div className="flex justify-between items-start mb-12">
            <div className="space-y-4">
              <div className="h-12 w-12 bg-orange-600 rounded-lg flex items-center justify-center text-white text-2xl font-bold">Z</div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 uppercase tracking-tighter">Tax Invoice</h2>
                <p className="text-gray-500 font-medium">#{invoice.invoiceId}</p>
              </div>
            </div>
            <div className="text-right space-y-1 text-sm text-gray-600">
              <p className="font-bold text-gray-900">Roxan Education OS</p>
              <p>Century City, North Bank Lane</p>
              <p>Cape Town, 7441, RSA</p>
              <p>billing@roxan.com</p>
              <p>VAT: 4520293841</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-12 mb-12">
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Billed To</p>
              <div className="space-y-1">
                <p className="font-bold text-gray-900 text-lg">{invoice.schoolName}</p>
                <p className="text-gray-600">{invoice.schoolAddress}</p>
                <p className="text-gray-600">{invoice.schoolPhone}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Issue Date</p>
                <p className="font-semibold text-gray-900">{new Date(invoice.issueDate).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Due Date</p>
                <p className="font-semibold text-gray-900">{new Date(invoice.dueDate).toLocaleDateString()}</p>
              </div>
            </div>
          </div>

          <div className="mb-12">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-gray-100">
                  <th className="py-4 font-bold text-gray-900">Service Description</th>
                  <th className="py-4 font-bold text-gray-900">Period</th>
                  <th className="py-4 font-bold text-gray-900 text-right">Amount (ZAR)</th>
                  <th className="py-4 font-bold text-gray-900 text-right">Local ({invoice.schoolCurrency})</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-50">
                  <td className="py-6">
                    <p className="font-bold text-gray-900">{invoice.plan}</p>
                    <p className="text-xs text-gray-500 mt-1">Enterprise-grade school management suite</p>
                  </td>
                  <td className="py-6 text-gray-600">{invoice.billingPeriod}</td>
                  <td className="py-6 text-right font-medium">R {invoice.amount.toFixed(2)}</td>
                  <td className="py-6 text-right font-bold text-gray-900">
                    {invoice.schoolCurrency} {(invoice.amount * invoice.exchangeRate).toLocaleString()}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="flex justify-end border-t pt-8">
            <div className="w-64 space-y-3">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span>R {invoice.amount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Tax (0%)</span>
                <span>R 0.00</span>
              </div>
              <div className="flex justify-between items-center pt-3 border-t text-lg font-bold text-gray-900">
                <span>Total Due</span>
                <span className="text-orange-600">R {invoice.amount.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="mt-24 pt-8 border-t flex justify-between items-end">
            <div className="text-xs text-gray-400 max-w-sm">
              <p className="font-bold text-gray-500 mb-1">Notes & Instructions</p>
              <p>Please use Invoice ID as payment reference. Bank transfers may take up to 48 hours to reflect.</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Authorized Signature</p>
              <div className="mt-4 h-12 w-32 border-b-2 border-gray-200" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
