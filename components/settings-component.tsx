"use client"

import { useState } from "react"
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
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AlertCircle, CheckCircle2, Loader } from "lucide-react"
import { toast } from "sonner"

interface SettingsComponentProps {
  tenantSlug: string
}

export function SettingsComponent({ tenantSlug }: SettingsComponentProps) {
  const [loading, setLoading] = useState(false)
  const [testingProvider, setTestingProvider] = useState<string | null>(null)

  const [smsConfig, setSmsConfig] = useState({
    provider: "twilio",
    apiKey: "",
    accountSid: "",
    senderName: "School",
    status: "inactive" as "active" | "inactive" | "error",
  })

  const [emailConfig, setEmailConfig] = useState({
    provider: "sendgrid",
    apiKey: "",
    senderEmail: "noreply@school.edu",
    senderName: "School Management System",
    status: "inactive" as "active" | "inactive" | "error",
  })

  const [paystackConfig, setPaystackConfig] = useState({
    publicKey: "",
    secretKey: "",
    testMode: true,
  })

  const handleSaveSettings = async (type: string) => {
    setLoading(true)
    try {
      const endpoint = `/api/tenant/settings?tenant=${tenantSlug}&type=${type}`

      let payload = {}
      if (type === "sms") {
        payload = smsConfig
      } else if (type === "email") {
        payload = emailConfig
      } else if (type === "paystack") {
        payload = paystackConfig
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!response.ok) throw new Error("Failed to save settings")

      toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} settings saved!`)
    } catch (error) {
      toast.error("Failed to save settings")
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleTestProvider = async (type: string) => {
    setTestingProvider(type)
    try {
      const endpoint = `/api/tenant/settings/test?tenant=${tenantSlug}&type=${type}`
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          type === "sms" ? smsConfig : type === "email" ? emailConfig : paystackConfig
        ),
      })

      if (!response.ok) throw new Error("Test failed")

      const data = await response.json()
      if (data.success) {
        toast.success("Connection test successful!")
        if (type === "sms") {
          setSmsConfig({ ...smsConfig, status: "active" })
        } else if (type === "email") {
          setEmailConfig({ ...emailConfig, status: "active" })
        }
      } else {
        toast.error("Connection test failed: " + data.error)
        if (type === "sms") {
          setSmsConfig({ ...smsConfig, status: "error" })
        } else if (type === "email") {
          setEmailConfig({ ...emailConfig, status: "error" })
        }
      }
    } catch (error) {
      toast.error("Test connection failed")
      console.error(error)
    } finally {
      setTestingProvider(null)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return (
          <Badge className="gap-1 bg-green-100 text-green-800">
            <CheckCircle2 className="h-3 w-3" /> Active
          </Badge>
        )
      case "error":
        return (
          <Badge className="gap-1 bg-red-100 text-red-800">
            <AlertCircle className="h-3 w-3" /> Error
          </Badge>
        )
      default:
        return (
          <Badge className="gap-1 bg-gray-100 text-gray-800">
            <AlertCircle className="h-3 w-3" /> Inactive
          </Badge>
        )
    }
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="email" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="email">Email Settings</TabsTrigger>
          <TabsTrigger value="sms">SMS Settings</TabsTrigger>
          <TabsTrigger value="payment">Payment Gateway</TabsTrigger>
        </TabsList>

        {/* Email Settings */}
        <TabsContent value="email">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>Email Configuration</CardTitle>
                  <CardDescription>
                    Configure email provider for system notifications
                  </CardDescription>
                </div>
                {getStatusBadge(emailConfig.status)}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email-provider">Provider</Label>
                <Select value={emailConfig.provider} onValueChange={(value) =>
                  setEmailConfig({ ...emailConfig, provider: value })
                }>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sendgrid">SendGrid</SelectItem>
                    <SelectItem value="mailgun">Mailgun</SelectItem>
                    <SelectItem value="brevo">Brevo (Sendinblue)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email-apikey">API Key</Label>
                <Input
                  id="email-apikey"
                  type="password"
                  placeholder="Enter your API key"
                  value={emailConfig.apiKey}
                  onChange={(e) =>
                    setEmailConfig({ ...emailConfig, apiKey: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email-sender">Sender Email Address</Label>
                <Input
                  id="email-sender"
                  type="email"
                  placeholder="noreply@school.edu"
                  value={emailConfig.senderEmail}
                  onChange={(e) =>
                    setEmailConfig({ ...emailConfig, senderEmail: e.target.value })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  This address will appear as the "From" address in emails
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email-name">Sender Name</Label>
                <Input
                  id="email-name"
                  placeholder="School Management System"
                  value={emailConfig.senderName}
                  onChange={(e) =>
                    setEmailConfig({ ...emailConfig, senderName: e.target.value })
                  }
                />
              </div>

              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  disabled={testingProvider === "email" || !emailConfig.apiKey}
                  onClick={() => handleTestProvider("email")}
                >
                  {testingProvider === "email" ? (
                    <>
                      <Loader className="h-4 w-4 mr-2 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    "Test Connection"
                  )}
                </Button>
                <Button onClick={() => handleSaveSettings("email")} disabled={loading}>
                  Save Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SMS Settings */}
        <TabsContent value="sms">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>SMS Provider Configuration</CardTitle>
                  <CardDescription>
                    Set up SMS gateway for broadcasts and alerts
                  </CardDescription>
                </div>
                {getStatusBadge(smsConfig.status)}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="sms-provider">SMS Provider</Label>
                <Select value={smsConfig.provider} onValueChange={(value) =>
                  setSmsConfig({ ...smsConfig, provider: value })
                }>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="twilio">Twilio</SelectItem>
                    <SelectItem value="infobip">Infobip</SelectItem>
                    <SelectItem value="africas_talking">Africa's Talking</SelectItem>
                    <SelectItem value="nexmo">Nexmo (Vonage)</SelectItem>
                    <SelectItem value="termii">Termii</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="sms-apikey">API Key</Label>
                <Input
                  id="sms-apikey"
                  type="password"
                  placeholder="Enter your API key"
                  value={smsConfig.apiKey}
                  onChange={(e) =>
                    setSmsConfig({ ...smsConfig, apiKey: e.target.value })
                  }
                />
              </div>

              {smsConfig.provider === "twilio" && (
                <div className="space-y-2">
                  <Label htmlFor="account-sid">Account SID</Label>
                  <Input
                    id="account-sid"
                    type="password"
                    placeholder="Your Twilio Account SID"
                    value={smsConfig.accountSid}
                    onChange={(e) =>
                      setSmsConfig({ ...smsConfig, accountSid: e.target.value })
                    }
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="sender-name">Sender Name</Label>
                <Input
                  id="sender-name"
                  placeholder="School"
                  value={smsConfig.senderName}
                  onChange={(e) =>
                    setSmsConfig({ ...smsConfig, senderName: e.target.value })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Maximum 11 characters for SMS sender ID
                </p>
              </div>

              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  disabled={testingProvider === "sms" || !smsConfig.apiKey}
                  onClick={() => handleTestProvider("sms")}
                >
                  {testingProvider === "sms" ? (
                    <>
                      <Loader className="h-4 w-4 mr-2 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    "Test Connection"
                  )}
                </Button>
                <Button onClick={() => handleSaveSettings("sms")} disabled={loading}>
                  Save Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payment Gateway */}
        <TabsContent value="payment">
          <Card>
            <CardHeader>
              <CardTitle>Payment Gateway - Paystack</CardTitle>
              <CardDescription>
                Configure Paystack for online fee payments
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-900">
                  Get your Paystack keys from{" "}
                  <a
                    href="https://dashboard.paystack.co"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline font-semibold"
                  >
                    dashboard.paystack.co
                  </a>
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="public-key">Public Key</Label>
                <Input
                  id="public-key"
                  type="password"
                  placeholder="pk_live_..."
                  value={paystackConfig.publicKey}
                  onChange={(e) =>
                    setPaystackConfig({
                      ...paystackConfig,
                      publicKey: e.target.value,
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="secret-key">Secret Key</Label>
                <Input
                  id="secret-key"
                  type="password"
                  placeholder="sk_live_..."
                  value={paystackConfig.secretKey}
                  onChange={(e) =>
                    setPaystackConfig({
                      ...paystackConfig,
                      secretKey: e.target.value,
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={paystackConfig.testMode}
                    onChange={(e) =>
                      setPaystackConfig({
                        ...paystackConfig,
                        testMode: e.target.checked,
                      })
                    }
                    className="rounded"
                  />
                  <span>Test Mode</span>
                </Label>
                <p className="text-xs text-muted-foreground">
                  Use test keys for development. Switch to live keys for production.
                </p>
              </div>

              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  disabled={testingProvider === "paystack" || !paystackConfig.publicKey}
                  onClick={() => handleTestProvider("paystack")}
                >
                  {testingProvider === "paystack" ? (
                    <>
                      <Loader className="h-4 w-4 mr-2 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    "Test Connection"
                  )}
                </Button>
                <Button onClick={() => handleSaveSettings("paystack")} disabled={loading}>
                  Save Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

