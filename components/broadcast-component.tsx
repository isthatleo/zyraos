"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { getSocket, connectSocket, disconnectSocket } from "@/lib/socket"
import {
  AlertCircle,
  Send,
  Clock,
  Users,
  CheckCircle,
  XCircle,
} from "lucide-react"

interface BroadcastFormProps {
  userId: string
  tenantSlug: string
}

export function BroadcastComponent({ userId, tenantSlug }: BroadcastFormProps) {
  const [activeTab, setActiveTab] = useState("create")
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    channel: "sms",
    targetAudience: "students",
    targetAudienceIds: [] as string[],
    scheduledAt: "",
  })

  const [broadcasts, setBroadcasts] = useState([
    {
      id: "1",
      title: "Exam Schedule",
      status: "sent",
      channel: "sms",
      targetAudience: "all",
      sentAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      deliveryStats: { sent: 245, delivered: 240, failed: 5 },
    },
  ])

  const characterCount = formData.content.length
  const smsCount = Math.ceil(characterCount / 160)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch(`/api/tenant/broadcasts?tenant=${tenantSlug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          createdBy: userId,
          scheduledAt: formData.scheduledAt
            ? new Date(formData.scheduledAt)
            : undefined,
        }),
      })

      if (!response.ok) throw new Error("Failed to create broadcast")

      const broadcast = await response.json()
      toast.success("Broadcast created successfully!")
      setFormData({
        title: "",
        content: "",
        channel: "sms",
        targetAudience: "students",
        targetAudienceIds: [],
        scheduledAt: "",
      })
      setBroadcasts([broadcast, ...broadcasts])

      // Emit real-time broadcast notification
      const socket = getSocket()
      socket.emit('sendBroadcast', { broadcast })
    } catch (error) {
      toast.error("Failed to create broadcast")
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "sent":
        return "bg-green-100 text-green-800"
      case "scheduled":
        return "bg-blue-100 text-blue-800"
      case "draft":
        return "bg-gray-100 text-gray-800"
      case "failed":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  // Socket.io real-time updates
  useEffect(() => {
    const socket = getSocket()

    const handleNewBroadcast = (broadcast: any) => {
      setBroadcasts((prev) => [broadcast, ...prev])
      toast.success(`New broadcast received: ${broadcast.title}`)
    }

    socket.on("new_broadcast", handleNewBroadcast)

    return () => {
      socket.off("new_broadcast", handleNewBroadcast)
    }
  }, [])

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="create">Create Broadcast</TabsTrigger>
          <TabsTrigger value="history">Broadcast History</TabsTrigger>
        </TabsList>

        {/* Create Broadcast Tab */}
        <TabsContent value="create">
          <Card>
            <CardHeader>
              <CardTitle>Create Broadcast</CardTitle>
              <CardDescription>
                Send messages to students, teachers, parents, or specific groups
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Title */}
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    placeholder="e.g., Exam Schedule Announcement"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    required
                  />
                </div>

                {/* Channel Selection */}
                <div className="space-y-2">
                  <Label>Channel</Label>
                  <div className="flex gap-3">
                    {["sms", "email", "in-app"].map((ch) => (
                      <Button
                        key={ch}
                        type="button"
                        variant={formData.channel === ch ? "default" : "outline"}
                        onClick={() => setFormData({ ...formData, channel: ch })}
                        className="flex-1"
                      >
                        {ch.toUpperCase()}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Target Audience */}
                <div className="space-y-2">
                  <Label htmlFor="audience">Target Audience</Label>
                  <Select
                    value={formData.targetAudience}
                    onValueChange={(value) =>
                      setFormData({ ...formData, targetAudience: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Entire School</SelectItem>
                      <SelectItem value="students">Students</SelectItem>
                      <SelectItem value="teachers">Teachers</SelectItem>
                      <SelectItem value="parents">Parents</SelectItem>
                      <SelectItem value="staff">Staff</SelectItem>
                      <SelectItem value="class">Specific Class</SelectItem>
                      <SelectItem value="department">Department</SelectItem>
                      <SelectItem value="custom">Custom Group</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Message Content */}
                <div className="space-y-2">
                  <Label htmlFor="content">Message Content</Label>
                  <Textarea
                    id="content"
                    placeholder={
                      formData.channel === "sms"
                        ? "Type your SMS message here... (160 characters per SMS)"
                        : "Type your message here..."
                    }
                    value={formData.content}
                    onChange={(e) =>
                      setFormData({ ...formData, content: e.target.value })
                    }
                    className="min-h-32 resize-none"
                    required
                  />
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">
                      Characters: {characterCount}
                      {formData.channel === "sms" && ` | SMS Count: ${smsCount}`}
                    </span>
                  </div>
                </div>

                {/* Schedule Option */}
                <div className="space-y-2">
                  <Label htmlFor="scheduledAt">Schedule for Later (Optional)</Label>
                  <Input
                    id="scheduledAt"
                    type="datetime-local"
                    value={formData.scheduledAt}
                    onChange={(e) =>
                      setFormData({ ...formData, scheduledAt: e.target.value })
                    }
                  />
                </div>

                {/* SMS Info */}
                {formData.channel === "sms" && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
                    <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-800">
                      <p className="font-medium mb-1">SMS Pricing</p>
                      <p>This broadcast will cost approximately {smsCount} SMS credits per recipient</p>
                    </div>
                  </div>
                )}

                {/* Submit Button */}
                <div className="flex gap-3 justify-end">
                  <Button type="button" variant="outline">
                    Save as Draft
                  </Button>
                  <Button type="submit" disabled={loading} className="gap-2">
                    {formData.scheduledAt ? (
                      <>
                        <Clock className="h-4 w-4" />
                        Schedule Broadcast
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        Send Now
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Broadcast History Tab */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Recent Broadcasts</CardTitle>
              <CardDescription>
                View and manage your past broadcasts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {broadcasts.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No broadcasts yet
                  </p>
                ) : (
                  broadcasts.map((broadcast) => (
                    <div
                      key={broadcast.id}
                      className="border rounded-lg p-4 space-y-3"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="font-medium">{broadcast.title}</h4>
                          <p className="text-sm text-muted-foreground">
                            Target: {broadcast.targetAudience} • Channel:{" "}
                            {broadcast.channel.toUpperCase()}
                          </p>
                        </div>
                        <Badge className={getStatusColor(broadcast.status)}>
                          {broadcast.status.charAt(0).toUpperCase() +
                            broadcast.status.slice(1)}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span>
                            Sent: {broadcast.deliveryStats.sent}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-blue-600" />
                          <span>
                            Delivered: {broadcast.deliveryStats.delivered}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <XCircle className="h-4 w-4 text-red-600" />
                          <span>
                            Failed: {broadcast.deliveryStats.failed}
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-2 text-sm">
                        <Button variant="ghost" size="sm">
                          View Report
                        </Button>
                        <Button variant="ghost" size="sm">
                          Duplicate
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

