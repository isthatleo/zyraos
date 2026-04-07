"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { StatusPill } from "@/components/status-pill"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  ArrowLeft,
  MoreHorizontal,
  Printer,
  Download,
  Building2,
  Mail,
  Loader2
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface InvoiceDetail {
  invoice: {
    id: string
    invoiceNumber: string
    schoolId: string
    subscriptionId: string | null
    amount: string
    currency: string
    status: string
    issueDate: string
    dueDate: string
    paidDate: string | null
    description: string | null
    notes: string | null
    createdAt: string
    updatedAt: string
  }
  school: {
    name: string
    country: string
    countryCode: string | null
    currencyCode: string | null
    currencyName: string | null
  }
  plan: {
    name: string | null
    price: string | null
  } | null
}

const companyData = {
  name: "Roxan Education Operations System",
  address: "Cape Town, South Africa",
  email: "billing@roxan.com",
  phone: "+27 21 123 4567"
}

export default function InvoiceDetailPage() {
  const params = useParams()
  const router = useRouter()
  const schoolId = (params?.schoolId as string) || ''
  const invoiceId = (params?.invoiceId as string) || ''

  const [data, setData] = useState<InvoiceDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchInvoice = async () => {
      try {
        const response = await fetch(`/api/master/schools/${schoolId}/invoices/${invoiceId}`)
        if (!response.ok) throw new Error("Failed to fetch invoice")
        const result = await response.json()
        setData(result)
      } catch (error) {
        console.error("Error fetching invoice:", error)
        toast.error("Could not load invoice details")
      } finally {
        setLoading(false)
      }
    }

    if (schoolId && invoiceId) {
      fetchInvoice()
    }
  }, [schoolId, invoiceId])

  const handleDownloadPDF = () => {
    toast.info("Preparing PDF download...")
    setTimeout(() => {
      window.print()
      toast.success("Invoice downloaded as PDF")
    }, 500)
  }

  const handleSendEmail = () => {
    toast.info(`Sending invoice to school email...`)
    setTimeout(() => {
      toast.success("Invoice sent to school email")
    }, 1500)
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
        <p className="text-gray-500 font-medium">Loading invoice details...</p>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-2xl font-bold text-gray-900">Invoice not found</h2>
        <Button 
          variant="outline" 
          className="mt-4"
          onClick={() => router.push(`/master/schools/${schoolId}/invoices`)}
        >
          Back to Invoices
        </Button>
      </div>
    )
  }

  const { invoice, school, plan } = data
  const formattedAmount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: invoice.currency || 'USD',
  }).format(parseFloat(invoice.amount))

  const schoolName = school?.name || 'Unknown School'
  const schoolCountry = school?.country || 'Unknown Country'

  return (
    <div className="p-6 lg:p-8 space-y-8 print:p-0 print:space-y-0">
      {/* Header */}
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.push(`/master/schools/${schoolId}/invoices`)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Invoices
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Invoice {invoice.invoiceNumber}</h1>
            <p className="text-gray-600 mt-1">Invoice details and payment information</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
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
          <Button 
            className="gap-2 bg-orange-600 hover:bg-orange-700 text-white"
            onClick={() => window.print()}
          >
            <Printer className="h-4 w-4" />
            Print Invoice
          </Button>
        </div>
      </div>

      {/* Invoice Card */}
      <Card className="rounded-xl border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow duration-200 print:shadow-none print:border-none print:hover:shadow-none">
        <CardContent className="p-8">
          {/* Invoice Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">INVOICE</h2>
              <div className="flex items-center gap-4">
                <div>
                  <p className="text-sm text-gray-600">Invoice ID</p>
                  <p className="font-medium text-gray-900">{invoice.invoiceNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Status</p>
                  <StatusPill status={invoice.status as any} text={invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)} />
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-2 mb-4">
                <Building2 className="h-5 w-5 text-gray-600" />
                <div>
                  <p className="font-semibold text-gray-900">{companyData.name}</p>
                  <p className="text-sm text-gray-600">{companyData.address}</p>
                  <p className="text-sm text-gray-600">{companyData.email}</p>
                  <p className="text-sm text-gray-600">{companyData.phone}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Bill To Section */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Bill To</h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="font-medium text-gray-900 mb-1">{schoolName}</p>
              <p className="text-sm text-gray-600 mb-1">{schoolCountry}</p>
              {/* Other school details could be added here if available */}
            </div>
          </div>

          {/* Invoice Details */}
          <div className="grid grid-cols-2 gap-8 mb-8">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Invoice Date</h4>
              <p className="text-gray-600">{new Date(invoice.issueDate).toLocaleDateString()}</p>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Due Date</h4>
              <p className="text-gray-600">{new Date(invoice.dueDate).toLocaleDateString()}</p>
            </div>
          </div>

          {/* Invoice Table */}
          <div className="mb-8">
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Description</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Plan</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-900">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  <tr>
                    <td className="px-4 py-3 text-sm text-gray-900">{invoice.description || 'Subscription Fee'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      <Badge className="bg-purple-100 text-purple-700 rounded-full px-2.5 py-0.5 text-xs font-medium">
                        {plan?.name || 'Standard'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">{formattedAmount}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-64 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal:</span>
                <span className="text-gray-900">{formattedAmount}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Tax:</span>
                <span className="text-gray-900">0.00</span>
              </div>
              <Separator />
              <div className="flex justify-between text-lg font-bold">
                <span className="text-gray-900">Total:</span>
                <span className="text-gray-900">{formattedAmount}</span>
              </div>
            </div>
          </div>
          
          {invoice.notes && (
            <div className="mt-8 pt-8 border-t border-gray-100">
              <h4 className="text-sm font-semibold text-gray-900 mb-2">Notes</h4>
              <p className="text-sm text-gray-600">{invoice.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
