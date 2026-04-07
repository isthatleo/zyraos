"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
  AreaChart,
  Area,
} from "recharts"
import { TrendingUp, Users, MessageSquare, Send, AlertCircle } from "lucide-react"

interface CommunicationAnalyticsProps {
  schoolName: string
}

export function CommunicationAnalytics({ schoolName }: CommunicationAnalyticsProps) {
  const messageVolumeData = [
    { date: "Mon", messages: 240, broadcasts: 24, sms: 12 },
    { date: "Tue", messages: 280, broadcasts: 35, sms: 18 },
    { date: "Wed", messages: 320, broadcasts: 20, sms: 25 },
    { date: "Thu", messages: 300, broadcasts: 50, sms: 30 },
    { date: "Fri", messages: 400, broadcasts: 40, sms: 22 },
    { date: "Sat", messages: 280, broadcasts: 30, sms: 15 },
    { date: "Sun", messages: 180, broadcasts: 10, sms: 8 },
  ]

  const userActivityData = [
    { time: "00:00", active: 45 },
    { time: "04:00", active: 12 },
    { time: "08:00", active: 150 },
    { time: "12:00", active: 380 },
    { time: "16:00", active: 450 },
    { time: "20:00", active: 380 },
    { time: "23:59", active: 120 },
  ]

  const channelDistributionData = [
    { name: "SMS", value: 45, color: "#3b82f6" },
    { name: "Email", value: 30, color: "#10b981" },
    { name: "In-App", value: 25, color: "#f97316" },
  ]

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Messages</CardTitle>
            <MessageSquare className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2,480</div>
            <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
              <TrendingUp className="h-3 w-3" /> 8% from last week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,240</div>
            <p className="text-xs text-muted-foreground mt-1">
              Online now: 340
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Broadcasts Sent</CardTitle>
            <Send className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">189</div>
            <p className="text-xs text-muted-foreground mt-1">
              This month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Delivery Rate</CardTitle>
            <Badge variant="outline" className="bg-green-50 text-green-700">98.2%</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">98.2%</div>
            <p className="text-xs text-green-600 mt-1">
              All channels
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Message Volume Trend */}
      <Card>
        <CardHeader>
          <CardTitle>Message Volume Trend</CardTitle>
          <CardDescription>Messages, broadcasts, and SMS by day</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={messageVolumeData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Area
                type="monotone"
                dataKey="messages"
                fill="#3b82f6"
                stroke="#3b82f6"
                fillOpacity={0.1}
                name="Direct Messages"
              />
              <Area
                type="monotone"
                dataKey="broadcasts"
                fill="#f97316"
                stroke="#f97316"
                fillOpacity={0.1}
                name="Broadcasts"
              />
              <Area
                type="monotone"
                dataKey="sms"
                fill="#8b5cf6"
                stroke="#8b5cf6"
                fillOpacity={0.1}
                name="SMS"
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* User Activity Heatmap */}
        <Card>
          <CardHeader>
            <CardTitle>User Activity by Time</CardTitle>
            <CardDescription>Average active users per hour</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={userActivityData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="active" fill="#3b82f6" name="Active Users" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Channel Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Communication Channels</CardTitle>
            <CardDescription>Message distribution by channel</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {channelDistributionData.map((channel) => (
                <div key={channel.name}>
                  <div className="flex justify-between items-center mb-1">
                    <p className="text-sm font-medium">{channel.name}</p>
                    <p className="text-sm font-semibold">{channel.value}%</p>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="h-2 rounded-full transition-all"
                      style={{
                        width: `${channel.value}%`,
                        backgroundColor: channel.color,
                      }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Failed Deliveries Alert */}
      <Card className="border-red-200 bg-red-50">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <CardTitle className="text-red-900">Delivery Issues</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p className="text-sm text-red-800">
              45 SMS messages failed delivery due to invalid phone numbers
            </p>
            <p className="text-sm text-red-800">
              12 emails bounced due to invalid email addresses
            </p>
            <Button variant="outline" className="mt-4" size="sm">
              Review Failed Messages
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

