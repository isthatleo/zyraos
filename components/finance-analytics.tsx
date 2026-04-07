"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts"
import {
  TrendingUp,
  TrendingDown,
  CreditCard,
  AlertCircle,
  CheckCircle2,
  Clock,
  Eye,
} from "lucide-react"

interface FinanceAnalyticsProps {
  schoolName: string
}

const COLORS = ["#10b981", "#f59e0b", "#ef4444", "#8b5cf6"]

export function FinanceAnalytics({ schoolName }: FinanceAnalyticsProps) {
  const collectionData = [
    { month: "Jan", collection: 45000, target: 50000, expenses: 28000 },
    { month: "Feb", collection: 52000, target: 50000, expenses: 32000 },
    { month: "Mar", collection: 48000, target: 50000, expenses: 30000 },
    { month: "Apr", collection: 61000, target: 55000, expenses: 35000 },
    { month: "May", collection: 58000, target: 55000, expenses: 33000 },
    { month: "Jun", collection: 65000, target: 60000, expenses: 38000 },
  ]

  const paymentStatusData = [
    { name: "Paid", value: 65, students: 325 },
    { name: "Partial", value: 20, students: 100 },
    { name: "Unpaid", value: 10, students: 50 },
    { name: "Overdue", value: 5, students: 25 },
  ]

  const topDebtorsData = [
    { id: 1, name: "Student A", owed: 5200, status: "overdue" },
    { id: 2, name: "Student B", owed: 4800, status: "overdue" },
    { id: 3, name: "Student C", owed: 3600, status: "unpaid" },
    { id: 4, name: "Student D", owed: 2400, status: "unpaid" },
    { id: 5, name: "Student E", owed: 1800, status: "unpaid" },
  ]

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Collection</CardTitle>
            <CreditCard className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">GHC 329,000</div>
            <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
              <TrendingUp className="h-3 w-3" /> 15% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outstanding Balance</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">GHC 45,600</div>
            <p className="text-xs text-red-600 mt-1">
              From 250 students
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <TrendingDown className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">GHC 196,000</div>
            <p className="text-xs text-muted-foreground mt-1">
              Current semester
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">GHC 133,000</div>
            <p className="text-xs text-green-600 mt-1">
              YTD profit
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue vs Target */}
      <Card>
        <CardHeader>
          <CardTitle>Collection Performance</CardTitle>
          <CardDescription>Revenue collection vs target and expenses</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={collectionData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value) => `GHC ${(value as number)?.toLocaleString?.() || value}`} />
              <Legend />
              <Bar dataKey="collection" fill="#10b981" name="Collection" />
              <Bar dataKey="target" fill="#8b5cf6" name="Target" />
              <Bar dataKey="expenses" fill="#ef4444" name="Expenses" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Payment Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Fee Payment Status</CardTitle>
            <CardDescription>Distribution of student payments</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={paymentStatusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {paymentStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `${value}%`} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Debtors */}
        <Card>
          <CardHeader>
            <CardTitle>Outstanding Fees</CardTitle>
            <CardDescription>Students with highest outstanding balance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topDebtorsData.map((student) => (
                <div key={student.id} className="flex justify-between items-center p-3 border rounded-lg">
                  <div>
                    <p className="font-medium text-sm">{student.name}</p>
                    <Badge
                      variant="outline"
                      className={`text-xs mt-1 ${
                        student.status === "overdue"
                          ? "bg-red-50 text-red-700"
                          : "bg-yellow-50 text-yellow-700"
                      }`}
                    >
                      {student.status}
                    </Badge>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-sm">GHC {student.owed.toLocaleString()}</p>
                    <Button variant="ghost" size="sm" className="mt-1">
                      <Eye className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment Methods */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Methods Analysis</CardTitle>
          <CardDescription>Breakdown of payment methods used</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">Card Payments</p>
              <p className="text-2xl font-bold text-blue-600">GHC 156,200</p>
              <p className="text-xs text-muted-foreground">47% of total</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Mobile Money</p>
              <p className="text-2xl font-bold text-green-600">GHC 128,400</p>
              <p className="text-xs text-muted-foreground">39% of total</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Bank Transfer</p>
              <p className="text-2xl font-bold text-purple-600">GHC 44,400</p>
              <p className="text-xs text-muted-foreground">14% of total</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

