"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  CreditCard,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Clock,
  Download,
} from "lucide-react"
import { toast } from "sonner"

interface FinanceComponentProps {
  studentId: string
  tenantSlug: string
}

interface StudentFee {
  id: string
  name: string
  amount: number
  amountPaid: number
  status: "paid" | "partial" | "unpaid" | "overdue"
  dueDate: Date
}

export function FinanceComponent({ studentId, tenantSlug }: FinanceComponentProps) {
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false)
  const [selectedFee, setSelectedFee] = useState<StudentFee | null>(null)
  const [paymentAmount, setPaymentAmount] = useState("")
  const [paymentMethod, setPaymentMethod] = useState("card")
  const [loading, setLoading] = useState(false)

  const [studentFees, setStudentFees] = useState<StudentFee[]>([
    {
      id: "1",
      name: "Tuition - Semester 1",
      amount: 2000,
      amountPaid: 0,
      status: "unpaid",
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
    {
      id: "2",
      name: "Activity Fee",
      amount: 500,
      amountPaid: 500,
      status: "paid",
      dueDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    },
    {
      id: "3",
      name: "Transport Fee",
      amount: 800,
      amountPaid: 400,
      status: "partial",
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    },
  ])

  const totalFees = studentFees.reduce((sum, fee) => sum + fee.amount, 0)
  const totalPaid = studentFees.reduce((sum, fee) => sum + fee.amountPaid, 0)
  const totalBalance = totalFees - totalPaid
  const overdueFees = studentFees.filter(
    (fee) => fee.status === "overdue" && fee.dueDate < new Date()
  )

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedFee || !paymentAmount) {
      toast.error("Please fill all fields")
      return
    }

    setLoading(true)

    try {
      const response = await fetch(`/api/tenant/payments?tenant=${tenantSlug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId,
          studentFeeId: selectedFee.id,
          amount: parseFloat(paymentAmount),
          paymentMethod,
          provider: paymentMethod === "card" ? "paystack" : undefined,
        }),
      })

      if (!response.ok) throw new Error("Payment failed")

      const data = await response.json()

      if (data.paystack?.authorization_url) {
        // Redirect to Paystack checkout
        window.location.href = data.paystack.authorization_url
      } else {
        toast.success("Payment initiated successfully!")
        setIsPaymentDialogOpen(false)
        setPaymentAmount("")
        setSelectedFee(null)
      }
    } catch (error) {
      toast.error("Failed to process payment")
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      paid: "bg-green-100 text-green-800",
      partial: "bg-blue-100 text-blue-800",
      unpaid: "bg-yellow-100 text-yellow-800",
      overdue: "bg-red-100 text-red-800",
    }
    return variants[status] || "bg-gray-100 text-gray-800"
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "paid":
        return <CheckCircle2 className="h-4 w-4 text-green-600" />
      case "partial":
        return <Clock className="h-4 w-4 text-blue-600" />
      case "unpaid":
      case "overdue":
        return <AlertCircle className="h-4 w-4 text-red-600" />
      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      {/* Finance Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Fees</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">GHC {totalFees.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">For current semester</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Amount Paid</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              GHC {totalPaid.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              {((totalPaid / totalFees) * 100).toFixed(0)}% paid
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outstanding Balance</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              GHC {totalBalance.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">Amount due</p>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {overdueFees.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-red-900 text-sm mb-1">
              You have {overdueFees.length} overdue fee{overdueFees.length > 1 ? "s" : ""}
            </p>
            <p className="text-sm text-red-800">
              Please make payment to avoid penalties
            </p>
          </div>
        </div>
      )}

      {/* Fees Table */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">All Fees</TabsTrigger>
          <TabsTrigger value="unpaid">Unpaid</TabsTrigger>
          <TabsTrigger value="paid">Paid</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <Card>
            <CardHeader>
              <CardTitle>Fee Breakdown</CardTitle>
              <CardDescription>
                View and manage your fees
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {studentFees.map((fee) => (
                  <div
                    key={fee.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <p className="font-medium text-sm">{fee.name}</p>
                        <Badge className={getStatusBadge(fee.status)}>
                          <span className="flex items-center gap-1">
                            {getStatusIcon(fee.status)}
                            {fee.status.charAt(0).toUpperCase() +
                              fee.status.slice(1)}
                          </span>
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Due: {fee.dueDate.toLocaleDateString()}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="font-semibold text-sm">
                        GHC {fee.amountPaid.toFixed(2)} / GHC {fee.amount.toFixed(2)}
                      </p>
                      <div className="w-32 bg-gray-200 rounded-full h-2 mt-2">
                        <div
                          className="bg-green-600 h-2 rounded-full transition-all"
                          style={{
                            width: `${(fee.amountPaid / fee.amount) * 100}%`,
                          }}
                        ></div>
                      </div>
                    </div>

                    {fee.status !== "paid" && (
                      <Dialog open={isPaymentDialogOpen && selectedFee?.id === fee.id}
                        onOpenChange={(open) => {
                          setIsPaymentDialogOpen(open)
                          if (open) setSelectedFee(fee)
                        }}>
                        <DialogTrigger asChild>
                          <Button
                            size="sm"
                            className="ml-4"
                            onClick={() => setSelectedFee(fee)}
                          >
                            Pay Now
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Make Payment</DialogTitle>
                            <DialogDescription>
                              Pay for {selectedFee?.name}
                            </DialogDescription>
                          </DialogHeader>

                          <form onSubmit={handlePayment} className="space-y-4">
                            <div className="space-y-2">
                              <Label>Fee</Label>
                              <p className="text-sm font-medium">
                                {selectedFee?.name}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                Balance: GHC{" "}
                                {(
                                  (selectedFee?.amount || 0) -
                                  (selectedFee?.amountPaid || 0)
                                ).toFixed(2)}
                              </p>
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="amount">Amount (GHS)</Label>
                              <Input
                                id="amount"
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                value={paymentAmount}
                                onChange={(e) =>
                                  setPaymentAmount(e.target.value)
                                }
                                required
                              />
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="method">Payment Method</Label>
                              <Select
                                value={paymentMethod}
                                onValueChange={setPaymentMethod}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="card">
                                    Card (Paystack)
                                  </SelectItem>
                                  <SelectItem value="mobile_money">
                                    Mobile Money
                                  </SelectItem>
                                  <SelectItem value="bank_transfer">
                                    Bank Transfer
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <Button type="submit" className="w-full" disabled={loading}>
                              {loading ? "Processing..." : "Pay"}
                            </Button>
                          </form>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="unpaid">
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                {studentFees
                  .filter((f) => f.status === "unpaid" || f.status === "partial")
                  .map((fee) => (
                    <div key={fee.id} className="p-4 border rounded-lg">
                      <p className="font-medium">{fee.name}</p>
                      <p className="text-sm text-muted-foreground">
                        GHC {((fee.amount || 0) - (fee.amountPaid || 0)).toFixed(2)} outstanding
                      </p>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="paid">
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                {studentFees
                  .filter((f) => f.status === "paid")
                  .map((fee) => (
                    <div key={fee.id} className="p-4 border rounded-lg bg-green-50">
                      <p className="font-medium">{fee.name}</p>
                      <p className="text-sm text-muted-foreground">
                        GHC {fee.amount.toFixed(2)} paid
                      </p>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Download Invoice */}
      <Button variant="outline" className="w-full gap-2">
        <Download className="h-4 w-4" />
        Download Invoice
      </Button>
    </div>
  )
}

