"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  MoreVertical, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Download,
  Eye,
  Share2
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface BroadcastReport {
  id: string
  title: string
  channel: string
  targetAudience: string
  status: string
  totalRecipients: number
  sent: number
  delivered: number
  failed: number
  bounced: number
  sentAt: Date
}

export function BroadcastReportsComponent() {
  const [reports] = useState<BroadcastReport[]>([
    {
      id: "1",
      title: "Exam Schedule Announcement",
      channel: "sms",
      targetAudience: "All Students",
      status: "delivered",
      totalRecipients: 450,
      sent: 450,
      delivered: 445,
      failed: 5,
      bounced: 0,
      sentAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    },
    {
      id: "2",
      title: "School Closure Notice",
      channel: "email",
      targetAudience: "All Parents",
      status: "delivered",
      totalRecipients: 320,
      sent: 320,
      delivered: 318,
      failed: 2,
      bounced: 0,
      sentAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    },
    {
      id: "3",
      title: "Teacher Meeting",
      channel: "in-app",
      targetAudience: "Teachers",
      status: "sent",
      totalRecipients: 65,
      sent: 65,
      delivered: 65,
      failed: 0,
      bounced: 0,
      sentAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    },
  ])

  const getDeliveryRate = (report: BroadcastReport) => {
    return ((report.delivered / report.sent) * 100).toFixed(1)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "delivered":
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case "sent":
        return <Clock className="h-4 w-4 text-blue-600" />
      case "failed":
        return <AlertCircle className="h-4 w-4 text-red-600" />
      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold">Broadcast Reports</h2>
          <p className="text-muted-foreground mt-1">Monitor delivery status and analytics</p>
        </div>
        <Input 
          placeholder="Search broadcasts..." 
          className="w-64"
        />
      </div>

      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="sms">SMS</TabsTrigger>
          <TabsTrigger value="email">Email</TabsTrigger>
          <TabsTrigger value="in-app">In-App</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {reports.map((report) => (
            <Card key={report.id}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold">{report.title}</h3>
                      <Badge variant="outline">{report.channel.toUpperCase()}</Badge>
                      <Badge variant="outline" className="flex items-center gap-1">
                        {getStatusIcon(report.status)}
                        {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Target: {report.targetAudience} • Sent: {report.sentAt.toLocaleDateString()}
                    </p>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem className="gap-2">
                        <Eye className="h-4 w-4" />
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem className="gap-2">
                        <Download className="h-4 w-4" />
                        Download Report
                      </DropdownMenuItem>
                      <DropdownMenuItem className="gap-2">
                        <Share2 className="h-4 w-4" />
                        Share
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="grid grid-cols-5 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Total</p>
                    <p className="text-2xl font-bold">{report.totalRecipients}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Sent</p>
                    <p className="text-2xl font-bold text-blue-600">{report.sent}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Delivered</p>
                    <p className="text-2xl font-bold text-green-600">{report.delivered}</p>
                    <p className="text-xs text-green-600">{getDeliveryRate(report)}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Failed</p>
                    <p className="text-2xl font-bold text-red-600">{report.failed}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Bounced</p>
                    <p className="text-2xl font-bold text-orange-600">{report.bounced}</p>
                  </div>
                </div>

                <div className="mt-4 w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-600 h-2 rounded-full transition-all"
                    style={{
                      width: `${getDeliveryRate(report)}%`,
                    }}
                  ></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  )
}

