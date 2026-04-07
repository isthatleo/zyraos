"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Save, Mail, Shield, Database, Bell, Globe, Key, AlertTriangle, Loader2, ChevronRight, Check } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const SECTIONS = [
  { id: 'general', title: 'General', icon: Globe },
  { id: 'email', title: 'Email', icon: Mail },
  { id: 'security', title: 'Security', icon: Shield },
  { id: 'database', title: 'Database', icon: Database },
  { id: 'notifications', title: 'Notifications', icon: Bell },
]

export default function SettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeSection, setActiveSection] = useState('general')
  const [settings, setSettings] = useState({
    // General Settings
    companyName: 'Roxan Education Operations System',
    companyEmail: 'hello@roxan.com',
    companyPhone: '+27 21 123 4567',
    companyAddress: 'Cape Town, South Africa',
    timezone: 'Africa/Johannesburg',
    currency: 'ZAR',

    // Email Settings
    smtpHost: 'smtp.gmail.com',
    smtpPort: '587',
    smtpUsername: '',
    smtpPassword: '',
    emailFrom: 'noreply@roxan.com',
    emailNotifications: true,

    // Security Settings
    sessionTimeout: '60',
    passwordMinLength: '8',
    twoFactorRequired: false,
    ipWhitelist: '',
    maintenanceMode: false,

    // Database Settings
    backupFrequency: 'daily',
    retentionPeriod: '30',
    autoOptimize: true,

    // Notification Settings
    emailAlerts: true,
    smsAlerts: false,
    webhookUrl: '',
  })

  useEffect(() => {
    async function fetchSettings() {
      try {
        const response = await fetch('/api/master/settings')
        if (response.ok) {
          const data = await response.json()
          if (Object.keys(data).length > 0) {
            setSettings(prev => ({ ...prev, ...data }))
          }
        }
      } catch (error) {
        console.error('Failed to fetch settings:', error)
        toast.error('Failed to load settings')
      } finally {
        setLoading(false)
      }
    }
    fetchSettings()
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      const keys = Object.keys(settings) as Array<keyof typeof settings>
      
      const savePromises = keys.map(key => {
        let category = 'general'
        if (['smtpHost', 'smtpPort', 'smtpUsername', 'smtpPassword', 'emailFrom', 'emailNotifications'].includes(key)) category = 'email'
        if (['sessionTimeout', 'passwordMinLength', 'twoFactorRequired', 'ipWhitelist', 'maintenanceMode'].includes(key)) category = 'security'
        if (['backupFrequency', 'retentionPeriod', 'autoOptimize'].includes(key)) category = 'database'
        if (['emailAlerts', 'smsAlerts', 'webhookUrl'].includes(key)) category = 'notifications'

        return fetch('/api/master/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            key,
            value: settings[key],
            category,
          })
        })
      })

      await Promise.all(savePromises)
      toast.success('Settings saved successfully')
    } catch (error) {
      console.error('Save failed:', error)
      toast.error('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const handleInputChange = (field: string, value: string | boolean) => {
    setSettings((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const scrollToSection = (id: string) => {
    setActiveSection(id)
    const element = document.getElementById(id)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  if (loading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8 p-6 lg:p-10 max-w-7xl mx-auto h-full">
      {/* Header with Save Button */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-0 z-20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 py-4 px-6 border-b -mx-6 lg:-mx-10 mb-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">System Settings</h1>
          <p className="text-muted-foreground mt-1 text-sm md:text-base">
            Global configuration for the entire Roxan platform.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => window.location.reload()}>Discard</Button>
          <Button onClick={handleSave} disabled={saving} className="min-w-[120px]">
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-10 flex-1 overflow-hidden">
        {/* Navigation Sidebar */}
        <aside className="lg:w-64 shrink-0 h-fit sticky top-4 hidden lg:block">
          <nav className="flex flex-col gap-1">
            {SECTIONS.map((section) => {
              const Icon = section.icon
              return (
                <button
                  key={section.id}
                  onClick={() => scrollToSection(section.id)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 text-left",
                    activeSection === section.id
                      ? "bg-primary/10 text-primary shadow-sm"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {section.title}
                  {activeSection === section.id && <ChevronRight className="ml-auto h-4 w-4" />}
                </button>
              )
            })}
          </nav>
        </aside>

        {/* Settings Content */}
        <div className="flex-1 space-y-12 pb-24 h-full overflow-y-auto pr-4 -mr-4 no-scrollbar scroll-smooth">
          {/* General Section */}
          <section id="general" className="space-y-6 scroll-mt-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Globe className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-xl font-semibold uppercase tracking-wider text-muted-foreground/80 text-sm">General Configuration</h2>
            </div>

            <Card className="overflow-hidden border-none shadow-md bg-card/50 backdrop-blur-sm ring-1 ring-border">
              <CardHeader className="bg-muted/30 pb-4">
                <CardTitle>Company Identity</CardTitle>
                <CardDescription>How your platform appears to users and in communications.</CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="companyName">Platform Name</Label>
                    <Input
                      id="companyName"
                      value={settings.companyName}
                      onChange={(e) => handleInputChange('companyName', e.target.value)}
                      placeholder="e.g. Roxan"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="companyEmail">Support Email Address</Label>
                    <Input
                      id="companyEmail"
                      type="email"
                      value={settings.companyEmail}
                      onChange={(e) => handleInputChange('companyEmail', e.target.value)}
                      placeholder="support@roxan.com"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="companyPhone">Official Phone Number</Label>
                    <Input
                      id="companyPhone"
                      value={settings.companyPhone}
                      onChange={(e) => handleInputChange('companyPhone', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="timezone">System Timezone</Label>
                    <Select value={settings.timezone} onValueChange={(value) => handleInputChange('timezone', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Africa/Johannesburg">Africa/Johannesburg (SAST)</SelectItem>
                        <SelectItem value="UTC">UTC (Universal Time)</SelectItem>
                        <SelectItem value="America/New_York">America/New_York (EST)</SelectItem>
                        <SelectItem value="Europe/London">Europe/London (GMT)</SelectItem>
                        <SelectItem value="Asia/Dubai">Asia/Dubai (GST)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="companyAddress">Physical Address</Label>
                  <Textarea
                    id="companyAddress"
                    value={settings.companyAddress}
                    onChange={(e) => handleInputChange('companyAddress', e.target.value)}
                    rows={3}
                    placeholder="Enter full address..."
                  />
                </div>

                <div className="space-y-2 max-w-xs">
                  <Label htmlFor="currency">Global Default Currency</Label>
                  <Select value={settings.currency} onValueChange={(value) => handleInputChange('currency', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ZAR">ZAR - South African Rand</SelectItem>
                      <SelectItem value="USD">USD - US Dollar</SelectItem>
                      <SelectItem value="GBP">GBP - British Pound</SelectItem>
                      <SelectItem value="EUR">EUR - Euro</SelectItem>
                      <SelectItem value="NGN">NGN - Nigerian Naira</SelectItem>
                      <SelectItem value="KES">KES - Kenyan Shilling</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-[12px] text-muted-foreground">This sets the default for all new school provisions.</p>
                </div>
              </CardContent>
            </Card>
          </section>

          <Separator className="my-8" />

          {/* Email Section */}
          <section id="email" className="space-y-6 scroll-mt-32">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Mail className="h-5 w-5 text-blue-500" />
              </div>
              <h2 className="text-xl font-semibold uppercase tracking-wider text-muted-foreground/80 text-sm">Communications Infrastructure</h2>
            </div>

            <Card className="overflow-hidden border-none shadow-md bg-card/50 backdrop-blur-sm ring-1 ring-border">
              <CardHeader className="bg-muted/30 pb-4">
                <CardTitle>SMTP Service</CardTitle>
                <CardDescription>Configure how the system delivers automated transactional emails.</CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="smtpHost">Hostname / Server</Label>
                    <Input
                      id="smtpHost"
                      value={settings.smtpHost}
                      onChange={(e) => handleInputChange('smtpHost', e.target.value)}
                      placeholder="smtp.provider.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="smtpPort">Port</Label>
                    <Input
                      id="smtpPort"
                      value={settings.smtpPort}
                      onChange={(e) => handleInputChange('smtpPort', e.target.value)}
                      placeholder="587"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="smtpUsername">Username</Label>
                    <Input
                      id="smtpUsername"
                      value={settings.smtpUsername}
                      onChange={(e) => handleInputChange('smtpUsername', e.target.value)}
                      placeholder="apikey"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="smtpPassword">Password / Secret</Label>
                    <Input
                      id="smtpPassword"
                      type="password"
                      value={settings.smtpPassword}
                      onChange={(e) => handleInputChange('smtpPassword', e.target.value)}
                      placeholder="••••••••••••"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="emailFrom">Default "From" Address</Label>
                  <Input
                    id="emailFrom"
                    type="email"
                    value={settings.emailFrom}
                    onChange={(e) => handleInputChange('emailFrom', e.target.value)}
                  />
                  <p className="text-[12px] text-muted-foreground">Emails will appear to come from this address.</p>
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border border-border">
                  <div className="space-y-0.5">
                    <Label className="text-base">System Notifications</Label>
                    <p className="text-sm text-muted-foreground">Allow the system to send automated status updates.</p>
                  </div>
                  <Switch
                    checked={settings.emailNotifications}
                    onCheckedChange={(checked) => handleInputChange('emailNotifications', checked)}
                  />
                </div>
              </CardContent>
            </Card>
          </section>

          <Separator className="my-8" />

          {/* Security Section */}
          <section id="security" className="space-y-6 scroll-mt-32">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-orange-500/10 rounded-lg">
                <Shield className="h-5 w-5 text-orange-500" />
              </div>
              <h2 className="text-xl font-semibold uppercase tracking-wider text-muted-foreground/80 text-sm">Security & Access Control</h2>
            </div>

            <Card className="overflow-hidden border-none shadow-md bg-card/50 backdrop-blur-sm ring-1 ring-border">
              <CardHeader className="bg-muted/30 pb-4">
                <CardTitle>System Policies</CardTitle>
                <CardDescription>Strict security measures to protect sensitive educational data.</CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="sessionTimeout">Session Lifetime (minutes)</Label>
                    <Input
                      id="sessionTimeout"
                      type="number"
                      value={settings.sessionTimeout}
                      onChange={(e) => handleInputChange('sessionTimeout', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="passwordMinLength">Min Password Strength</Label>
                    <Input
                      id="passwordMinLength"
                      type="number"
                      value={settings.passwordMinLength}
                      onChange={(e) => handleInputChange('passwordMinLength', e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border border-border">
                  <div className="space-y-0.5">
                    <Label className="text-base">Multi-Factor Authentication (MFA)</Label>
                    <p className="text-sm text-muted-foreground">Enforce 2FA for all administrative accounts.</p>
                  </div>
                  <Switch
                    checked={settings.twoFactorRequired}
                    onCheckedChange={(checked) => handleInputChange('twoFactorRequired', checked)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ipWhitelist">IP Whitelisting (CIDR)</Label>
                  <Textarea
                    id="ipWhitelist"
                    placeholder="e.g. 192.168.1.0/24, 10.0.0.1"
                    value={settings.ipWhitelist}
                    onChange={(e) => handleInputChange('ipWhitelist', e.target.value)}
                    rows={3}
                  />
                  <p className="text-[12px] text-muted-foreground">Restrict master dashboard access to these IP ranges.</p>
                </div>

                <Separator />

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                    <div className="space-y-0.5">
                      <Label className="text-base text-destructive">Maintenance Mode</Label>
                      <p className="text-sm text-destructive/80">Immediately disable all platform access for updates.</p>
                    </div>
                    <Switch
                      checked={settings.maintenanceMode}
                      onCheckedChange={(checked) => handleInputChange('maintenanceMode', checked)}
                    />
                  </div>

                  {settings.maintenanceMode && (
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        CRITICAL: Maintenance mode is currently active. All users except platform admins are locked out.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </CardContent>
            </Card>
          </section>

          <Separator className="my-8" />

          {/* Database Section */}
          <section id="database" className="space-y-6 scroll-mt-32">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-emerald-500/10 rounded-lg">
                <Database className="h-5 w-5 text-emerald-500" />
              </div>
              <h2 className="text-xl font-semibold uppercase tracking-wider text-muted-foreground/80 text-sm">Data Persistence & Backups</h2>
            </div>

            <Card className="overflow-hidden border-none shadow-md bg-card/50 backdrop-blur-sm ring-1 ring-border">
              <CardHeader className="bg-muted/30 pb-4">
                <CardTitle>Storage Management</CardTitle>
                <CardDescription>Automated maintenance and backup schedules for the master database.</CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="backupFrequency">Backup Schedule</Label>
                    <Select value={settings.backupFrequency} onValueChange={(value) => handleInputChange('backupFrequency', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hourly">Every Hour</SelectItem>
                        <SelectItem value="daily">Every 24 Hours</SelectItem>
                        <SelectItem value="weekly">Every 7 Days</SelectItem>
                        <SelectItem value="monthly">Every 30 Days</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="retentionPeriod">Data Retention (Days)</Label>
                    <Input
                      id="retentionPeriod"
                      type="number"
                      value={settings.retentionPeriod}
                      onChange={(e) => handleInputChange('retentionPeriod', e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border border-border">
                  <div className="space-y-0.5">
                    <Label className="text-base">Automatic Index Optimization</Label>
                    <p className="text-sm text-muted-foreground">Background tasks to re-index and vacuum tables.</p>
                  </div>
                  <Switch
                    checked={settings.autoOptimize}
                    onCheckedChange={(checked) => handleInputChange('autoOptimize', checked)}
                  />
                </div>
              </CardContent>
            </Card>
          </section>

          <Separator className="my-8" />

          {/* Notifications Section */}
          <section id="notifications" className="space-y-6 scroll-mt-32">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <Bell className="h-5 w-5 text-purple-500" />
              </div>
              <h2 className="text-xl font-semibold uppercase tracking-wider text-muted-foreground/80 text-sm">Alerting & Connectivity</h2>
            </div>

            <Card className="overflow-hidden border-none shadow-md bg-card/50 backdrop-blur-sm ring-1 ring-border">
              <CardHeader className="bg-muted/30 pb-4">
                <CardTitle>Operational Alerts</CardTitle>
                <CardDescription>How platform administrators are notified of system health events.</CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border border-border">
                    <div className="space-y-0.5">
                      <Label className="text-base">Critical System Alerts</Label>
                      <p className="text-sm text-muted-foreground">Notify admins via email for server failures or data breaches.</p>
                    </div>
                    <Switch
                      checked={settings.emailAlerts}
                      onCheckedChange={(checked) => handleInputChange('emailAlerts', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border border-border">
                    <div className="space-y-0.5">
                      <Label className="text-base">SMS Security Alerts</Label>
                      <p className="text-sm text-muted-foreground">Emergency SMS for high-severity security breaches.</p>
                    </div>
                    <Switch
                      checked={settings.smsAlerts}
                      onCheckedChange={(checked) => handleInputChange('smsAlerts', checked)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="webhookUrl">External Webhook Integration</Label>
                  <Input
                    id="webhookUrl"
                    placeholder="https://hooks.slack.com/services/..."
                    value={settings.webhookUrl}
                    onChange={(e) => handleInputChange('webhookUrl', e.target.value)}
                  />
                  <p className="text-[12px] text-muted-foreground">Stream operational logs to external platforms (Slack, Discord, etc.)</p>
                </div>
              </CardContent>
            </Card>
          </section>
        </div>
      </div>
    </div>
  )
}
