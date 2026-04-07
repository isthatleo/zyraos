"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { StatusPill } from "@/components/status-pill"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
import {
  ArrowLeft,
  Plus,
  MoreHorizontal,
  Eye,
  CheckCircle,
  Clock,
  X,
  Loader2
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const initialInvoices = [
  {
    id: "INV-2026-9000",
    date: "2026-04-01",
    amount: "R1,000.00",
    status: "paid" as "paid" | "pending" | "void" | "overdue",
    dueDate: "2026-04-15",
    description: "Monthly subscription - Standard Plan"
  },
  {
    id: "INV-2026-8999",
    date: "2026-03-01",
    amount: "R1,000.00",
    status: "paid" as "paid" | "pending" | "void" | "overdue",
    dueDate: "2026-03-15",
    description: "Monthly subscription - Standard Plan"
  },
  {
    id: "INV-2026-8998",
    date: "2026-02-01",
    amount: "R1,000.00",
    status: "paid" as "paid" | "pending" | "void" | "overdue",
    dueDate: "2026-02-15",
    description: "Monthly subscription - Standard Plan"
  },
  {
    id: "INV-2026-8997",
    date: "2026-01-01",
    amount: "R1,000.00",
    status: "paid" as "paid" | "pending" | "void" | "overdue",
    dueDate: "2026-01-15",
    description: "Monthly subscription - Standard Plan"
  },
  {
    id: "INV-2026-8996",
    date: "2025-12-01",
    amount: "R1,000.00",
    status: "paid" as "paid" | "pending" | "void" | "overdue",
    dueDate: "2025-12-15",
    description: "Monthly subscription - Standard Plan"
  }
]

export default function SchoolInvoicesPage() {
  const params = useParams()
  const router = useRouter()
  const schoolId = params?.schoolId as string
  const [invoices, setInvoices] = useState<any[]>([])
  const [schoolName, setSchoolName] = useState("School")
  const [loading, setLoading] = useState(true)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!schoolId) return

    const fetchInvoices = async () => {
      try {
        setLoading(true)
        const response = await fetch(`/api/master/schools/${schoolId}`)
        if (response.ok) {
          const data = await response.json()
          if (data.school) {
            setSchoolName(data.school.name)
            if (data.school.invoices) {
              setInvoices(data.school.invoices.map((inv: any) => ({
                id: inv.invoiceNumber,
                date: new Date(inv.issueDate).toLocaleDateString(),
                amount: `${inv.currency} ${inv.amount}`,
                status: inv.status,
                dueDate: new Date(inv.dueDate).toLocaleDateString(),
                description: inv.description || "School Subscription"
              })))
            }
          }
        }
      } catch (error) {
        console.error("Error fetching invoices:", error)
        toast.error("Failed to load invoices")
      } finally {
        setLoading(false)
      }
    }

    fetchInvoices()
  }, [schoolId])
  
  // Form state
  const [formData, setFormData] = useState({
    plan: 'standard',
    dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    description: ''
  })

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    const plans: Record<string, { name: string, price: string }> = {
      starter: { name: 'Starter', price: 'R149.00' },
      basic: { name: 'Basic', price: 'R299.00' },
      standard: { name: 'Standard', price: 'R599.00' },
      professional: { name: 'Professional', price: 'R799.00' },
      premium: { name: 'Premium', price: 'R999.00' },
      enterprise: { name: 'Enterprise', price: 'R1999.00' },
    }

    const selectedPlan = plans[formData.plan] || plans.standard

    const newInvoice = {
      id: `INV-2026-${9001 + (invoices.length - initialInvoices.length)}`,
      date: new Date().toISOString().split('T')[0],
      amount: selectedPlan.price,
      status: "pending" as const,
      dueDate: formData.dueDate,
      description: formData.description || `Monthly subscription - ${selectedPlan.name} Plan`
    }

    setInvoices([newInvoice, ...invoices])
    toast.success("Invoice created successfully")
    setIsCreateDialogOpen(false)
    setIsSubmitting(false)
    setFormData({
      plan: 'standard',
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      description: ''
    })
  }

  const handleAction = (action: 'paid' | 'pending' | 'void', id: string) => {
    setInvoices(prevInvoices => 
      prevInvoices.map(inv => 
        inv.id === id ? { ...inv, status: action } : inv
      )
    )
    toast.success(`Invoice ${id} marked as ${action}`)
  }

  return (
    <div className="p-6 lg:p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.push(`/master/schools/${schoolId}`)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to School
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Invoices</h1>
            <p className="text-gray-600 mt-1">Manage billing records for {schoolName}</p>
          </div>
        </div>
        <Button 
          className="gap-2 bg-orange-600 hover:bg-orange-700 text-white"
          onClick={() => setIsCreateDialogOpen(true)}
        >
          <Plus className="h-4 w-4" />
          Create Invoice
        </Button>
      </div>

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={handleCreateInvoice}>
            <DialogHeader>
              <DialogTitle>Create New Invoice</DialogTitle>
              <DialogDescription>
                Generate a new invoice for {schoolName}.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="plan">Subscription Plan</Label>
                <Select 
                  value={formData.plan} 
                  onValueChange={(value) => setFormData({ ...formData, plan: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a plan" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="starter">Starter (R149)</SelectItem>
                    <SelectItem value="basic">Basic (R299)</SelectItem>
                    <SelectItem value="standard">Standard (R599)</SelectItem>
                    <SelectItem value="professional">Professional (R799)</SelectItem>
                    <SelectItem value="premium">Premium (R999)</SelectItem>
                    <SelectItem value="enterprise">Enterprise (R1999)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="dueDate">Due Date</Label>
                <Input 
                  id="dueDate" 
                  type="date" 
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Input 
                  id="description" 
                  placeholder="Monthly subscription - April 2026" 
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-orange-600 hover:bg-orange-700 text-white" disabled={isSubmitting}>
                {isSubmitting ? "Creating..." : "Create Invoice"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Invoice History Card */}
      <Card className="rounded-xl border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow duration-200">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900">
            Invoice History
          </CardTitle>
          <p className="text-sm text-gray-600">
            All invoices generated for this school
          </p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-gray-200 bg-gray-50">
                  <TableHead className="py-3 px-4 font-semibold text-gray-900">Invoice #</TableHead>
                  <TableHead className="py-3 px-4 font-semibold text-gray-900">Date</TableHead>
                  <TableHead className="py-3 px-4 font-semibold text-gray-900">Description</TableHead>
                  <TableHead className="py-3 px-4 font-semibold text-gray-900">Amount</TableHead>
                  <TableHead className="py-3 px-4 font-semibold text-gray-900">Status</TableHead>
                  <TableHead className="py-3 px-4 font-semibold text-gray-900">Due Date</TableHead>
                  <TableHead className="py-3 px-4 font-semibold text-gray-900 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-gray-500">
                      <Loader2 className="h-5 w-5 animate-spin mx-auto inline-block mr-2" />
                      Loading invoices...
                    </TableCell>
                  </TableRow>
                ) : invoices.length > 0 ? (
                  invoices.map((invoice) => (
                    <TableRow key={invoice.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <TableCell className="py-4 px-4 font-medium">{invoice.id}</TableCell>
                      <TableCell className="py-4 px-4 text-sm">{invoice.date}</TableCell>
                      <TableCell className="py-4 px-4 text-sm text-gray-600 max-w-xs truncate">
                        {invoice.description}
                      </TableCell>
                      <TableCell className="py-4 px-4 font-medium">{invoice.amount}</TableCell>
                      <TableCell className="py-4 px-4">
                        <StatusPill status={invoice.status} text={invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)} />
                      </TableCell>
                      <TableCell className="py-4 px-4 text-sm">{invoice.dueDate}</TableCell>
                      <TableCell className="py-4 px-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => router.push(`/master/schools/${schoolId}/invoices/${invoice.id}`)}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Invoice
                            </DropdownMenuItem>
                            {(invoice.status as string) !== 'paid' && (
                              <DropdownMenuItem onClick={() => handleAction('paid', invoice.id)}>
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Mark as Paid
                              </DropdownMenuItem>
                            )}
                            {(invoice.status as string) !== 'pending' && (
                              <DropdownMenuItem onClick={() => handleAction('pending', invoice.id)}>
                                <Clock className="mr-2 h-4 w-4" />
                                Mark as Pending
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem className="text-red-600" onClick={() => handleAction('void', invoice.id)}>
                              <X className="mr-2 h-4 w-4" />
                              Void Invoice
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-gray-500">
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
  )
}
