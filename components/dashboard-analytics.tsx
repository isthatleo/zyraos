"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
  Users,
  CreditCard,
  AlertCircle,
  MessageSquare,
  Send,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface DashboardAnalyticsProps {
  schoolName: string
}

const COLORS = ["#f97316", "#8b5cf6", "#3b82f6", "#10b981", "#ef4444"]

export function DashboardAnalytics({ schoolName }: DashboardAnalyticsProps) {
  // Sample data
  const revenueData = [
    { month: "Jan", revenue: 4000, expenses: 2400 },
    { month: "Feb", revenue: 3000, expenses: 1398 },
    { month: "Mar", revenue: 2000, expenses: 9800 },
    { month: "Apr", revenue: 2780, expenses: 3908 },
    { month: "May", revenue: 1890, expenses: 4800 },
    { month: "Jun", revenue: 2390, expenses: 3800 },
  ]

  const paymentStatusData = [
    { name: "Paid", value: 65, color: "#10b981" },
    { name: "Partial", value: 20, color: "#f59e0b" },
    { name: "Unpaid", value: 15, color: "#ef4444" },
  ]

  const messageStats = [
    { date: "Mon", messages: 240, broadcasts: 24 },
    { date: "Tue", messages: 280, broadcasts: 35 },
    { date: "Wed", messages: 320, broadcasts: 20 },
    { date: "Thu", messages: 300, broadcasts: 50 },
    { date: "Fri", messages: 400, broadcasts: 40 },
    { date: "Sat", messages: 280, broadcasts: 30 },
    { date: "Sun", messages: 180, broadcasts: 10 },
  ]

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Collection</CardTitle>
            <CreditCard className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">GHC 125,400</div>
            <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
              <TrendingUp className="h-3 w-3" /> 12% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">GHC 54,000</div>
            <p className="text-xs text-muted-foreground mt-1">
              Current semester
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outstanding Balance</CardTitle>
            <AlertCircle className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">GHC 28,600</div>
            <p className="text-xs text-amber-600 mt-1">
              From 45 students
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,240</div>
            <p className="text-xs text-blue-600 mt-1">
              Online now: 340
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Revenue Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue & Expenses</CardTitle>
            <CardDescription>Monthly trend analysis</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="revenue" fill="#10b981" name="Revenue" />
                <Bar dataKey="expenses" fill="#ef4444" name="Expenses" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Payment Status Pie */}
        <Card>
          <CardHeader>
            <CardTitle>Payment Status Distribution</CardTitle>
            <CardDescription>Current semester fees</CardDescription>
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
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Messages & Broadcasts */}
      <Card>
        <CardHeader>
          <CardTitle>Communication Activity</CardTitle>
          <CardDescription>Messages and broadcasts this week</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={messageStats}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="messages"
                stroke="#3b82f6"
                name="Messages"
                strokeWidth={2}
              />
              <Line
                type="monotone"
                dataKey="broadcasts"
                stroke="#f97316"
                name="Broadcasts"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Transactions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Recent Transactions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                {
                  student: "John Doe",
                  amount: 2000,
                  type: "Tuition",
                  time: "2 hours ago",
                  status: "completed",
                },
                {
                  student: "Jane Smith",
                  amount: 500,
                  type: "Activity Fee",
                  time: "4 hours ago",
                  status: "completed",
                },
                {
                  student: "Mark Johnson",
                  amount: 800,
                  type: "Transport",
                  time: "1 day ago",
                  status: "pending",
                },
              ].map((tx, i) => (
                <div key={i} className="flex justify-between items-center p-2 border-b">
                  <div>
                    <p className="text-sm font-medium">{tx.student}</p>
                    <p className="text-xs text-muted-foreground">{tx.type}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">GHC {tx.amount}</p>
                    <Badge
                      variant="outline"
                      className={`text-xs ${
                        tx.status === "completed"
                          ? "bg-green-50 text-green-700"
                          : "bg-yellow-50 text-yellow-700"
                      }`}
                    >
                      {tx.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Broadcasts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-4 w-4" />
              Recent Broadcasts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                {
                  title: "Exam Schedule",
                  target: "All Students",
                  status: "delivered",
                  count: 245,
                  time: "2 days ago",
                },
                {
                  title: "School Closure Notice",
                  target: "All Parents",
                  status: "sent",
                  count: 180,
                  time: "5 days ago",
                },
                {
                  title: "Staff Meeting",
                  target: "Teachers",
                  status: "delivered",
                  count: 45,
                  time: "1 week ago",
                },
              ].map((bc, i) => (
                <div key={i} className="flex justify-between items-center p-2 border-b">
                  <div>
                    <p className="text-sm font-medium">{bc.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {bc.target} • {bc.count} recipients
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className={`text-xs ${
                      bc.status === "delivered"
                        ? "bg-green-50 text-green-700"
                        : "bg-blue-50 text-blue-700"
                    }`}
                  >
                    {bc.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

