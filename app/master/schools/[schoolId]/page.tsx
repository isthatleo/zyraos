"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
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
  ArrowLeft,
  Settings,
  Edit,
  MoreHorizontal,
  Building2,
  User,
  CreditCard,
  Calendar,
  DollarSign,
  Loader2
} from "lucide-react"
import { useParams, useRouter } from "next/navigation"
import { useState, useEffect } from "react"

interface SchoolDetails {
  id: string;
  name: string;
  slug: string;
  country: string;
  type: string;
  status: "active" | "deactivated" | "pending";
  planName?: string;
  planPrice?: number;
  maxStudents?: number;
  maxStaff?: number;
  createdAt: string;
  updatedAt: string;
}

const defaultSchoolData = {
  id: "1",
  name: "Academy School International",
  slug: "academy-school",
  domain: "academyschool.edu",
  country: "Nigeria",
  city: "Lagos",
  timezone: "Africa/Lagos",
  currency: "R",
  status: "active" as const,
  plan: "Standard",
  maxStudents: 200,
  maxStaff: 25,
  owner: {
    name: "Dr. Adebayo Johnson",
    email: "adebayo.johnson@academyschool.edu",
    phone: "+234 801 234 5678",
    address: "123 Education Street, Lagos, Nigeria"
  },
  subscription: {
    status: "active",
    plan: "Standard",
    billingCycle: "monthly",
    nextBilling: "2026-05-01"
  },
  timestamps: {
    created: "2026-02-18T10:30:00Z",
    updated: "2026-04-01T14:20:00Z",
    provisioned: "2026-02-18T11:00:00Z"
  }
}

const invoices = [
  {
    id: "INV-2026-9000",
    date: "2026-04-01",
    amount: "R1,000.00",
    status: "paid" as const,
    dueDate: "2026-04-15"
  },
  {
    id: "INV-2026-8999",
    date: "2026-03-01",
    amount: "R1,000.00",
    status: "paid" as const,
    dueDate: "2026-03-15"
  },
  {
    id: "INV-2026-8998",
    date: "2026-02-01",
    amount: "R1,000.00",
    status: "paid" as const,
    dueDate: "2026-02-15"
  }
]

export default function SchoolDetailPage() {
  const params = useParams()
  const router = useRouter()
  const schoolId = (params?.schoolId as string) || ''
  const [schoolData, setSchoolData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [invoices, setInvoices] = useState<any[]>([])

  useEffect(() => {
    if (!schoolId) return

    const fetchSchool = async () => {
      try {
        setLoading(true)
        const response = await fetch(`/api/master/schools/${schoolId}`)
        if (response.ok) {
          const data = await response.json()
          if (data.school) {
            // Merge with default data to keep the structure
            setSchoolData({
              ...defaultSchoolData,
              id: data.school.id,
              name: data.school.name,
              slug: data.school.slug,
              country: data.school.country,
              countryCode: data.school.countryCode,
              currency: data.school.currencyCode || data.school.currencyName || defaultSchoolData.currency,
              status: data.school.status,
              plan: data.school.planName || defaultSchoolData.plan,
              maxStudents: data.school.maxStudents || defaultSchoolData.maxStudents,
              maxStaff: data.school.maxStaff || defaultSchoolData.maxStaff,
              domain: `${data.school.slug}.roxan.com`,
              subscription: {
                status: data.school.subscriptionStatus || "inactive",
                plan: data.school.planName || "No Plan",
                billingCycle: data.school.subscriptionBillingCycle ? "Annual" : "Monthly",
                nextBilling: data.school.subscriptionEndDate ? new Date(data.school.subscriptionEndDate).toLocaleDateString() : "N/A"
              },
              timestamps: {
                created: data.school.createdAt,
                updated: data.school.updatedAt,
                provisioned: data.school.createdAt,
              }
            })

            if (data.school.invoices) {
              setInvoices(data.school.invoices.map((inv: any) => ({
                id: inv.invoiceNumber,
                date: new Date(inv.issueDate).toLocaleDateString(),
                amount: `${inv.currency} ${inv.amount}`,
                status: inv.status,
                dueDate: new Date(inv.dueDate).toLocaleDateString()
              })))
            }
          }
        }
      } catch (error) {
        console.error("Error fetching school:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchSchool()
  }, [schoolId])

  if (loading) {
    return (
      <div className="p-6 lg:p-8 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
          <p className="text-gray-500">Loading school details...</p>
        </div>
      </div>
    )
  }

  // Fallback if not found or error (though we merged with defaultSchoolData above)
  const displayData = schoolData || defaultSchoolData

  return (
    <div className="p-6 lg:p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.push('/master/schools')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Schools
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-gray-900">{displayData.name}</h1>
              <StatusPill status={displayData.status} text={displayData.status.charAt(0).toUpperCase() + displayData.status.slice(1)} />
            </div>
            <p className="text-gray-600 mt-1">School configuration and management</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2" onClick={() => router.push(`/master/schools/${schoolId}/permissions`)}>
            <Settings className="h-4 w-4" />
            Permissions
          </Button>
          <Button variant="outline" className="gap-2" onClick={() => router.push(`/master/schools/${schoolId}/edit`)}>
            <Edit className="h-4 w-4" />
            Edit School
          </Button>
          <Button variant="outline" size="sm">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Cards Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* School Information */}
        <Card className="rounded-xl border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow duration-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              School Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-600">Name</label>
              <p className="text-gray-900">{displayData.name}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Slug</label>
              <p className="text-gray-900 font-mono text-sm">{displayData.slug}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Domain</label>
              <p className="text-gray-900">{displayData.domain}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Country</label>
              <p className="text-gray-900">{displayData.country} ({displayData.countryCode})</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Currency</label>
              <p className="text-gray-900">{displayData.currency}</p>
            </div>
          </CardContent>
        </Card>

        {/* Owner & Contact */}
        <Card className="rounded-xl border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow duration-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Owner & Contact
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-600">Owner Name</label>
              <p className="text-gray-900">{displayData.owner.name}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Email</label>
              <p className="text-gray-900">{displayData.owner.email}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Phone</label>
              <p className="text-gray-900">{displayData.owner.phone}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Address</label>
              <p className="text-gray-900 text-sm">{displayData.owner.address}</p>
            </div>
          </CardContent>
        </Card>

        {/* Plan & Capacity */}
        <Card className="rounded-xl border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow duration-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Plan & Capacity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-600">Plan</label>
              <div className="flex items-center gap-2 mt-1">
                <Badge className="bg-purple-100 text-purple-700 rounded-full px-2.5 py-0.5 text-xs font-medium">
                  {displayData.plan}
                </Badge>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Max Students</label>
              <p className="text-gray-900">{displayData.maxStudents}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Max Staff</label>
              <p className="text-gray-900">{displayData.maxStaff}</p>
            </div>
          </CardContent>
        </Card>

        {/* Subscription */}
        <Card className="rounded-xl border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow duration-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Subscription
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-600">Status</label>
              <div className="flex items-center gap-2 mt-1">
                <StatusPill status={displayData.subscription.status as "active" | "pending" | "inactive" | "paid" | "overdue" | "trial"} text={displayData.subscription.status.charAt(0).toUpperCase() + displayData.subscription.status.slice(1)} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Plan</label>
              <p className="text-gray-900">{displayData.subscription.plan}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Billing Cycle</label>
              <p className="text-gray-900">{displayData.subscription.billingCycle}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Next Billing</label>
              <p className="text-gray-900">{displayData.subscription.nextBilling}</p>
            </div>
          </CardContent>
        </Card>

        {/* Timestamps */}
        <Card className="rounded-xl border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow duration-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Timestamps
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-600">Created</label>
              <p className="text-gray-900 text-sm">{new Date(displayData.timestamps.created).toLocaleDateString()}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Updated</label>
              <p className="text-gray-900 text-sm">{new Date(displayData.timestamps.updated).toLocaleDateString()}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Provisioned</label>
              <p className="text-gray-900 text-sm">{new Date(displayData.timestamps.provisioned).toLocaleDateString()}</p>
            </div>
          </CardContent>
        </Card>

        {/* Recent Invoices */}
        <Card className="rounded-xl border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow duration-200 lg:col-span-3">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Recent Invoices
            </CardTitle>
            <Button variant="outline" size="sm" onClick={() => router.push(`/master/schools/${schoolId}/invoices`)}>
              View All Invoices
            </Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-gray-200 bg-gray-50">
                    <TableHead className="py-2 px-3 font-semibold text-gray-900">Invoice #</TableHead>
                    <TableHead className="py-2 px-3 font-semibold text-gray-900">Date</TableHead>
                    <TableHead className="py-2 px-3 font-semibold text-gray-900">Amount</TableHead>
                    <TableHead className="py-2 px-3 font-semibold text-gray-900">Status</TableHead>
                    <TableHead className="py-2 px-3 font-semibold text-gray-900">Due Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.length > 0 ? (
                    invoices.map((invoice) => (
                      <TableRow 
                        key={invoice.id} 
                        className="border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer"
                        onClick={() => router.push(`/master/schools/${schoolId}/invoices/${invoice.id}`)}
                      >
                        <TableCell className="py-3 px-3 font-medium">{invoice.id}</TableCell>
                        <TableCell className="py-3 px-3 text-sm">{invoice.date}</TableCell>
                        <TableCell className="py-3 px-3 font-medium">{invoice.amount}</TableCell>
                        <TableCell className="py-3 px-3">
                          <StatusPill status={invoice.status} text={invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)} />
                        </TableCell>
                        <TableCell className="py-3 px-3 text-sm">{invoice.dueDate}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="py-8 text-center text-gray-500">
                        No invoices found for this school.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
