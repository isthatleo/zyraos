"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { teacherDashboardApi } from "@/lib/teacher-api-client"
import {
  AlertCircle,
  AlertTriangle,
  BarChart3,
  Bell,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  FileText,
  Filter,
  Home,
  Info,
  List,
  RefreshCcw,
  Search,
  Settings,
  TrendingDown,
  TrendingUp,
  Users,
  Grid,
  X,
  Zap,
  Activity,
  Shield,
} from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

type Alert = {
  id: string
  type: "attendance" | "biometric" | "system" | "performance" | "device"
  severity: "critical" | "high" | "medium" | "low"
  title: string
  description: string
  studentId?: string
  studentName?: string
  classId?: string
  className?: string
  timestamp: string
  date: string
  time: string
  status: "unresolved" | "acknowledged" | "resolved"
  remarks?: string
  actionable: boolean
}

type AlertInsight = {
  totalAlerts: number
  criticalAlerts: number
  highAlerts: number
  mediumAlerts: number
  lowAlerts: number
  unresolvedCount: number
  acknowledgedCount: number
  resolvedCount: number
  resolutionRate: number
  averageResolutionTime: number
  alertsByType: { [key: string]: number }
  alertsByDate: { [key: string]: number }
  activeAlerts: number
}

const ALERT_TYPES = {
  attendance: { label: "Attendance", icon: Users, color: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400" },
  biometric: { label: "Biometric", icon: Zap, color: "bg-yellow-50 text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-400" },
  system: { label: "System", icon: Shield, color: "bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400" },
  performance: { label: "Performance", icon: Activity, color: "bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-400" },
  device: { label: "Device", icon: AlertCircle, color: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400" },
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

const formatTime = (timeString: string) => {
  try {
    const [hours, minutes] = timeString.split(":")
    const hour = parseInt(hours)
    const ampm = hour >= 12 ? "PM" : "AM"
    const displayHour = hour > 12 ? hour - 12 : hour || 12
    return `${displayHour}:${minutes} ${ampm}`
  } catch {
    return timeString
  }
}

const getSeverityColor = (severity: string) => {
  switch (severity) {
    case "critical":
      return "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-900/50"
    case "high":
      return "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-400 dark:border-orange-900/50"
    case "medium":
      return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/50"
    case "low":
      return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900/50"
    default:
      return "bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-950/40 dark:text-gray-400 dark:border-gray-900/50"
  }
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "unresolved":
      return "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400"
    case "acknowledged":
      return "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
    case "resolved":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
    default:
      return "bg-gray-100 text-gray-700 dark:bg-gray-950/40 dark:text-gray-400"
  }
}

const getAlertInsights = (alerts: Alert[]): AlertInsight => {
  if (alerts.length === 0) {
    return {
      totalAlerts: 0,
      criticalAlerts: 0,
      highAlerts: 0,
      mediumAlerts: 0,
      lowAlerts: 0,
      unresolvedCount: 0,
      acknowledgedCount: 0,
      resolvedCount: 0,
      resolutionRate: 0,
      averageResolutionTime: 0,
      alertsByType: {},
      alertsByDate: {},
      activeAlerts: 0,
    }
  }

  const criticalAlerts = alerts.filter((a) => a.severity === "critical").length
  const highAlerts = alerts.filter((a) => a.severity === "high").length
  const mediumAlerts = alerts.filter((a) => a.severity === "medium").length
  const lowAlerts = alerts.filter((a) => a.severity === "low").length
  const unresolvedCount = alerts.filter((a) => a.status === "unresolved").length
  const acknowledgedCount = alerts.filter((a) => a.status === "acknowledged").length
  const resolvedCount = alerts.filter((a) => a.status === "resolved").length

  const alertsByType: { [key: string]: number } = {}
  const alertsByDate: { [key: string]: number } = {}

  alerts.forEach((alert) => {
    alertsByType[alert.type] = (alertsByType[alert.type] || 0) + 1
    alertsByDate[alert.date] = (alertsByDate[alert.date] || 0) + 1
  })

  const resolutionRate = alerts.length > 0 ? Math.round((resolvedCount / alerts.length) * 100) : 0
  const activeAlerts = unresolvedCount + acknowledgedCount

  return {
    totalAlerts: alerts.length,
    criticalAlerts,
    highAlerts,
    mediumAlerts,
    lowAlerts,
    unresolvedCount,
    acknowledgedCount,
    resolvedCount,
    resolutionRate,
    averageResolutionTime: 3600,
    alertsByType,
    alertsByDate,
    activeAlerts,
  }
}

const teacherHref = (path: string) => {
  const tenant = typeof window !== "undefined" ? window.location.pathname.split("/")[1] : ""
  return `/${tenant}${path}`
}

export default function AlertsPage() {
  const router = useRouter()
  const [tenant, setTenant] = React.useState("")
  const [alerts, setAlerts] = React.useState<Alert[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [activeView, setActiveView] = React.useState<"list" | "grid">("list")
  const [filterSeverity, setFilterSeverity] = React.useState("all")
  const [filterType, setFilterType] = React.useState("all")
  const [filterStatus, setFilterStatus] = React.useState("all")
  const [search, setSearch] = React.useState("")
  const [sortBy, setSortBy] = React.useState("date-desc")
  const [selectedAlert, setSelectedAlert] = React.useState<Alert | null>(null)
  const [detailsDialogOpen, setDetailsDialogOpen] = React.useState(false)
  const [editingAlert, setEditingAlert] = React.useState<Alert | null>(null)
  const [editDialogOpen, setEditDialogOpen] = React.useState(false)

  React.useEffect(() => {
    const tenantSlug = typeof window !== "undefined" ? window.location.pathname.split("/")[1] : ""
    setTenant(tenantSlug)
  }, [])

  React.useEffect(() => {
    if (!tenant) return

    const fetchData = async () => {
      try {
        setLoading(true)
        const res = await fetch(teacherDashboardApi("attendance/alerts"))
        if (!res.ok) throw new Error(`API error: ${res.status}`)
        const data = await res.json()
        setAlerts(data.alerts || [])
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load alerts")
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [tenant])

  const insights = React.useMemo(() => getAlertInsights(alerts), [alerts])

  const filteredAlerts = React.useMemo(() => {
    return alerts
      .filter((a) => filterSeverity === "all" || a.severity === filterSeverity)
      .filter((a) => filterType === "all" || a.type === filterType)
      .filter((a) => filterStatus === "all" || a.status === filterStatus)
      .filter(
        (a) =>
          !search ||
          a.title.toLowerCase().includes(search.toLowerCase()) ||
          a.description.toLowerCase().includes(search.toLowerCase()) ||
          (a.studentName && a.studentName.toLowerCase().includes(search.toLowerCase()))
      )
      .sort((a, b) => {
        if (sortBy === "date-desc") return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        if (sortBy === "date-asc") return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        if (sortBy === "severity") {
          const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
          return (severityOrder[a.severity as keyof typeof severityOrder] || 4) - (severityOrder[b.severity as keyof typeof severityOrder] || 4)
        }
        return 0
      })
  }, [alerts, filterSeverity, filterType, filterStatus, search, sortBy])

  const exportToCSV = () => {
    if (filteredAlerts.length === 0) {
      toast.error("No alerts to export")
      return
    }
    const headers = ["Date", "Time", "Type", "Severity", "Title", "Description", "Status", "Student"]
    const rows = filteredAlerts.map((a) => [
      formatDate(a.date),
      formatTime(a.time),
      a.type.charAt(0).toUpperCase() + a.type.slice(1),
      a.severity.charAt(0).toUpperCase() + a.severity.slice(1),
      a.title,
      a.description,
      a.status.charAt(0).toUpperCase() + a.status.slice(1),
      a.studentName || "-",
    ])
    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `alerts-export-${new Date().toISOString().split("T")[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
    toast.success("Alerts exported successfully")
  }

  const updateAlertStatus = async () => {
    if (!editingAlert || !tenant) return

    try {
      const res = await fetch(teacherDashboardApi("attendance/alerts"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "alert.update",
          alertId: editingAlert.id,
          status: editingAlert.status,
          remarks: editingAlert.remarks,
        }),
      })

      if (!res.ok) throw new Error("Failed to update alert")

      const data = await res.json()
      setAlerts(data.alerts || [])
      setEditDialogOpen(false)
      setEditingAlert(null)
      toast.success("Alert updated successfully")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update alert")
    }
  }

  if (loading) {
    return (
      <div className="w-full space-y-6 p-6 lg:p-8">
        <Skeleton className="h-48 rounded-3xl" />
        <Skeleton className="h-60 rounded-3xl" />
        <Skeleton className="h-96 rounded-3xl" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="w-full p-6 lg:p-8">
        <Card className="rounded-3xl border-destructive/20 bg-destructive/5 shadow-sm dark:bg-red-950/20 dark:border-red-900/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 dark:text-red-300">
              <AlertCircle className="size-5" />
              Unable to Load Alerts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground dark:text-slate-400">{error}</p>
            <Button onClick={() => window.location.reload()} className="dark:bg-blue-600 dark:hover:bg-blue-700">
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="w-full space-y-6 p-6 lg:p-8">
      {/* Hero Section */}
      <section className="overflow-hidden rounded-3xl border bg-card shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="relative p-6 md:p-8">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,197,94,0.18),transparent_34%),linear-gradient(135deg,rgba(14,165,233,0.12),transparent_46%)] dark:bg-[radial-gradient(circle_at_top_right,rgba(34,197,94,0.08),transparent_34%),linear-gradient(135deg,rgba(14,165,233,0.06),transparent_46%)]" />
          <div className="relative flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
            <div className="max-w-4xl space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="bg-background/80 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700">
                  <Bell className="mr-1 size-3.5" />
                  Teacher workspace
                </Badge>
                <Badge variant="outline" className="bg-background/80 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700">
                  Alerts
                </Badge>
              </div>
              <div>
                <h1 className="text-3xl font-semibold tracking-tight md:text-4xl dark:text-white">Alerts & Notifications</h1>
                <p className="mt-2 text-muted-foreground dark:text-slate-400">
                  Monitor attendance, biometric, system, and performance alerts in real-time
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row xl:flex-col 2xl:flex-row">
              <Button variant="outline" onClick={() => window.location.reload()} className="dark:bg-slate-800 dark:border-slate-700 dark:hover:bg-slate-700 dark:text-white">
                <RefreshCcw className="size-4" />
                Refresh
              </Button>
              <Button onClick={exportToCSV} className="dark:bg-emerald-600 dark:hover:bg-emerald-700">
                <Download className="size-4" />
                Export
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Metric Cards */}
      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {[
          { label: "Total Alerts", value: insights.totalAlerts, helper: "All alerts", icon: Bell, color: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400" },
          { label: "Critical", value: insights.criticalAlerts, helper: "Urgent alerts", icon: AlertTriangle, color: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400" },
          { label: "Active", value: insights.activeAlerts, helper: "Pending action", icon: Activity, color: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400" },
          { label: "Resolved", value: insights.resolvedCount, helper: "Fixed issues", icon: CheckCircle2, color: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400" },
          { label: "Resolution Rate", value: `${insights.resolutionRate}%`, helper: "Overall rate", icon: BarChart3, color: "bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400" },
        ].map(({ label, value, helper, icon: Icon, color }, idx) => (
          <Card key={idx} className="rounded-3xl shadow-sm dark:bg-slate-900 dark:border-slate-800">
            <CardContent className="flex min-h-32 items-start justify-between gap-4 p-5">
              <div>
                <p className="text-sm text-muted-foreground dark:text-slate-400">{label}</p>
                <p className="mt-2 text-3xl font-semibold dark:text-white">{value}</p>
                <p className="mt-1 text-xs text-muted-foreground dark:text-slate-500">{helper}</p>
              </div>
              <div className={cn("rounded-2xl p-3", color)}>
                <Icon className="size-5" />
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

      {/* Filters and View Tabs */}
      <section className="space-y-4">
        <div className="flex gap-2 border-b dark:border-slate-700">
          {[
            { id: "list", label: "List View", icon: List },
            { id: "grid", label: "Grid View", icon: Grid },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveView(id as any)}
              className={cn(
                "flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-all",
                activeView === id
                  ? "border-primary text-primary dark:text-blue-400 dark:border-blue-400"
                  : "border-transparent text-muted-foreground dark:text-slate-400 hover:text-foreground dark:hover:text-slate-200"
              )}
            >
              <Icon className="size-4" />
              {label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-3">
          <Input
            placeholder="Search alerts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs dark:bg-slate-800 dark:border-slate-700 dark:text-white dark:placeholder:text-slate-500"
          />
          <Select value={filterSeverity} onValueChange={setFilterSeverity}>
            <SelectTrigger className="w-[140px] dark:bg-slate-800 dark:border-slate-700 dark:text-white">
              <SelectValue placeholder="Severity" />
            </SelectTrigger>
            <SelectContent className="dark:bg-slate-800 dark:border-slate-700">
              <SelectItem value="all" className="dark:text-white">
                All Severity
              </SelectItem>
              <SelectItem value="critical" className="dark:text-white">
                Critical
              </SelectItem>
              <SelectItem value="high" className="dark:text-white">
                High
              </SelectItem>
              <SelectItem value="medium" className="dark:text-white">
                Medium
              </SelectItem>
              <SelectItem value="low" className="dark:text-white">
                Low
              </SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[140px] dark:bg-slate-800 dark:border-slate-700 dark:text-white">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent className="dark:bg-slate-800 dark:border-slate-700">
              <SelectItem value="all" className="dark:text-white">
                All Types
              </SelectItem>
              <SelectItem value="attendance" className="dark:text-white">
                Attendance
              </SelectItem>
              <SelectItem value="biometric" className="dark:text-white">
                Biometric
              </SelectItem>
              <SelectItem value="system" className="dark:text-white">
                System
              </SelectItem>
              <SelectItem value="performance" className="dark:text-white">
                Performance
              </SelectItem>
              <SelectItem value="device" className="dark:text-white">
                Device
              </SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[140px] dark:bg-slate-800 dark:border-slate-700 dark:text-white">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="dark:bg-slate-800 dark:border-slate-700">
              <SelectItem value="all" className="dark:text-white">
                All Status
              </SelectItem>
              <SelectItem value="unresolved" className="dark:text-white">
                Unresolved
              </SelectItem>
              <SelectItem value="acknowledged" className="dark:text-white">
                Acknowledged
              </SelectItem>
              <SelectItem value="resolved" className="dark:text-white">
                Resolved
              </SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[140px] dark:bg-slate-800 dark:border-slate-700 dark:text-white">
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent className="dark:bg-slate-800 dark:border-slate-700">
              <SelectItem value="date-desc" className="dark:text-white">
                Latest First
              </SelectItem>
              <SelectItem value="date-asc" className="dark:text-white">
                Oldest First
              </SelectItem>
              <SelectItem value="severity" className="dark:text-white">
                Most Critical
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </section>

      {/* Main Content */}
      <section className="grid gap-6 lg:grid-cols-4">
        <div className="lg:col-span-3 space-y-4">
          {activeView === "list" && (
            <Card className="rounded-3xl shadow-sm dark:bg-slate-900 dark:border-slate-800">
              <CardHeader>
                <CardTitle className="dark:text-white">Alerts List</CardTitle>
                <CardDescription className="dark:text-slate-400">{filteredAlerts.length} alerts</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {filteredAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    onClick={() => {
                      setSelectedAlert(alert)
                      setDetailsDialogOpen(true)
                    }}
                    className="grid gap-3 rounded-2xl border bg-card hover:bg-muted/50 transition-colors cursor-pointer md:grid-cols-[40px_1fr_100px_80px_100px] md:items-center p-4 dark:bg-slate-800 dark:border-slate-700 dark:hover:bg-slate-700"
                  >
                    <div className="flex items-center justify-center">
                      <Badge className={cn("text-xs font-semibold", getSeverityColor(alert.severity))}>
                        {alert.severity.slice(0, 1).toUpperCase()}
                      </Badge>
                    </div>
                    <div>
                      <p className="font-medium dark:text-white">{alert.title}</p>
                      <p className="text-sm text-muted-foreground dark:text-slate-400">{alert.description}</p>
                    </div>
                    <div className="text-sm">
                      <p className="text-muted-foreground dark:text-slate-400">Time</p>
                      <p className="font-medium text-xs dark:text-white">{formatTime(alert.time)}</p>
                    </div>
                    <div>
                      <Badge className={cn("text-xs", ALERT_TYPES[alert.type as keyof typeof ALERT_TYPES].color)}>
                        {ALERT_TYPES[alert.type as keyof typeof ALERT_TYPES].label}
                      </Badge>
                    </div>
                    <div>
                      <Badge className={cn("text-xs font-semibold", getStatusColor(alert.status))}>
                        {alert.status.charAt(0).toUpperCase() + alert.status.slice(1)}
                      </Badge>
                    </div>
                  </div>
                ))}
                {filteredAlerts.length === 0 && (
                  <p className="text-sm text-muted-foreground dark:text-slate-400 text-center py-8">No alerts match filters</p>
                )}
              </CardContent>
            </Card>
          )}

          {activeView === "grid" && (
            <div className="grid gap-4 md:grid-cols-2">
              {filteredAlerts.map((alert) => (
                <Card
                  key={alert.id}
                  className="rounded-3xl shadow-sm hover:shadow-md transition-shadow cursor-pointer dark:bg-slate-900 dark:border-slate-800"
                  onClick={() => {
                    setSelectedAlert(alert)
                    setDetailsDialogOpen(true)
                  }}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <CardTitle className="line-clamp-2 dark:text-white">{alert.title}</CardTitle>
                        <CardDescription className="dark:text-slate-400">{alert.description}</CardDescription>
                      </div>
                      <Badge className={cn("text-xs font-semibold", getSeverityColor(alert.severity))}>
                        {alert.severity.slice(0, 1).toUpperCase()}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground dark:text-slate-400">Type</p>
                        <Badge className={cn("text-xs mt-1", ALERT_TYPES[alert.type as keyof typeof ALERT_TYPES].color)}>
                          {ALERT_TYPES[alert.type as keyof typeof ALERT_TYPES].label}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-muted-foreground dark:text-slate-400">Status</p>
                        <Badge className={cn("text-xs font-semibold mt-1", getStatusColor(alert.status))}>
                          {alert.status.charAt(0).toUpperCase() + alert.status.slice(1)}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-muted-foreground dark:text-slate-400">Date</p>
                        <p className="font-medium dark:text-white text-xs">{formatDate(alert.date)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground dark:text-slate-400">Time</p>
                        <p className="font-medium dark:text-white text-xs">{formatTime(alert.time)}</p>
                      </div>
                    </div>
                    {alert.studentName && (
                      <div>
                        <p className="text-xs text-muted-foreground dark:text-slate-400">Student</p>
                        <p className="text-sm font-medium dark:text-white">{alert.studentName}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Analytics Cards */}
          <section className="grid gap-6 md:grid-cols-2">
            <Card className="rounded-3xl shadow-sm dark:bg-slate-900 dark:border-slate-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 dark:text-white">
                  <AlertTriangle className="size-5 text-red-500" />
                  Severity Breakdown
                </CardTitle>
                <CardDescription className="dark:text-slate-400">Alert distribution</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { label: "Critical", value: insights.criticalAlerts, color: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400" },
                  { label: "High", value: insights.highAlerts, color: "bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400" },
                  { label: "Medium", value: insights.mediumAlerts, color: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400" },
                  { label: "Low", value: insights.lowAlerts, color: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400" },
                ].map(({ label, value, color }) => (
                  <div key={label} className="flex items-center justify-between">
                    <span className="text-sm font-medium dark:text-white">{label}</span>
                    <Badge className={color}>{value}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="rounded-3xl shadow-sm dark:bg-slate-900 dark:border-slate-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 dark:text-white">
                  <Activity className="size-5 text-blue-500" />
                  Status Overview
                </CardTitle>
                <CardDescription className="dark:text-slate-400">Resolution status</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { label: "Unresolved", value: insights.unresolvedCount, color: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400" },
                  { label: "Acknowledged", value: insights.acknowledgedCount, color: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400" },
                  { label: "Resolved", value: insights.resolvedCount, color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400" },
                ].map(({ label, value, color }) => (
                  <div key={label} className="flex items-center justify-between">
                    <span className="text-sm font-medium dark:text-white">{label}</span>
                    <Badge className={color}>{value}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="rounded-3xl shadow-sm dark:bg-slate-900 dark:border-slate-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 dark:text-white">
                  <Bell className="size-5 text-yellow-500" />
                  Alerts by Type
                </CardTitle>
                <CardDescription className="dark:text-slate-400">Type distribution</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {Object.entries(insights.alertsByType).map(([type, count]) => {
                  const percentage = Math.round((count / insights.totalAlerts) * 100)
                  const alertType = ALERT_TYPES[type as keyof typeof ALERT_TYPES]
                  return (
                    <div key={type}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium dark:text-white">{alertType?.label}</span>
                        <span className="text-muted-foreground dark:text-slate-400">{count} ({percentage}%)</span>
                      </div>
                      <Progress value={percentage} className="h-1.5" />
                    </div>
                  )
                })}
              </CardContent>
            </Card>

            <Card className="rounded-3xl shadow-sm dark:bg-slate-900 dark:border-slate-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 dark:text-white">
                  <TrendingUp className="size-5 text-green-500" />
                  Performance Metrics
                </CardTitle>
                <CardDescription className="dark:text-slate-400">Alert management</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { label: "Resolution Rate", value: insights.resolutionRate, unit: "%" },
                  { label: "Active Alerts", value: insights.activeAlerts, unit: "" },
                  { label: "Avg Resolution Time", value: "1 hour", unit: "" },
                ].map(({ label, value, unit }) => (
                  <div key={label} className="flex items-center justify-between">
                    <span className="text-sm font-medium dark:text-white">{label}</span>
                    <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">{value}{unit}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </section>
        </div>

        {/* Sidebar */}
        <aside className="space-y-6">
          <Card className="rounded-3xl shadow-sm bg-gradient-to-br from-red-50 to-red-50/50 border-red-100/50 dark:from-red-950/40 dark:to-red-950/20 dark:border-red-900/50">
            <CardHeader>
              <CardTitle className="text-red-900 dark:text-red-300">Critical Alerts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {alerts
                .filter((a) => a.severity === "critical")
                .slice(0, 5)
                .map((alert) => (
                  <div
                    key={alert.id}
                    onClick={() => {
                      setSelectedAlert(alert)
                      setDetailsDialogOpen(true)
                    }}
                    className="p-2 rounded-xl bg-white/50 dark:bg-red-950/30 cursor-pointer hover:bg-white/75 dark:hover:bg-red-950/50 transition-colors"
                  >
                    <p className="text-sm font-medium dark:text-red-200 line-clamp-2">{alert.title}</p>
                    <p className="text-xs text-red-700 dark:text-red-400 mt-1">{formatTime(alert.time)}</p>
                  </div>
                ))}
              {alerts.filter((a) => a.severity === "critical").length === 0 && (
                <p className="text-sm text-muted-foreground dark:text-slate-400">No critical alerts</p>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-3xl shadow-sm bg-gradient-to-br from-amber-50 to-amber-50/50 border-amber-100/50 dark:from-amber-950/40 dark:to-amber-950/20 dark:border-amber-900/50">
            <CardHeader>
              <CardTitle className="text-amber-900 dark:text-amber-300">Alert Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: "Total Alerts", value: insights.totalAlerts, icon: Bell },
                { label: "Active", value: insights.activeAlerts, icon: Activity },
                { label: "Resolved Today", value: insights.resolvedCount, icon: CheckCircle2 },
                { label: "Pending", value: insights.unresolvedCount, icon: AlertCircle },
              ].map(({ label, value, icon: Icon }) => (
                <div key={label} className="flex items-center justify-between p-2 rounded-xl bg-white/50 dark:bg-amber-950/30">
                  <div className="flex items-center gap-2">
                    <Icon className="size-4 text-amber-600 dark:text-amber-400" />
                    <span className="text-sm font-medium dark:text-amber-200">{label}</span>
                  </div>
                  <Badge variant="outline" className="text-sm dark:bg-amber-950/50 dark:border-amber-800 dark:text-amber-300">
                    {value}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          <Button className="w-full dark:bg-blue-600 dark:hover:bg-blue-700" onClick={() => router.push(teacherHref("/teacher/dashboard"))}>
            <Home className="mr-2 size-4" />
            Back to Dashboard
          </Button>
        </aside>
      </section>

      {/* Details Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-2xl dark:bg-slate-900 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="dark:text-white">{selectedAlert?.title}</DialogTitle>
            <DialogDescription className="dark:text-slate-400">{selectedAlert?.description}</DialogDescription>
          </DialogHeader>
          {selectedAlert && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground dark:text-slate-400">Date</p>
                  <p className="font-medium dark:text-white">{formatDate(selectedAlert.date)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground dark:text-slate-400">Time</p>
                  <p className="font-medium dark:text-white">{formatTime(selectedAlert.time)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground dark:text-slate-400">Type</p>
                  <Badge className={cn("text-xs", ALERT_TYPES[selectedAlert.type as keyof typeof ALERT_TYPES].color)}>
                    {ALERT_TYPES[selectedAlert.type as keyof typeof ALERT_TYPES].label}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground dark:text-slate-400">Severity</p>
                  <Badge className={cn("text-xs font-semibold", getSeverityColor(selectedAlert.severity))}>
                    {selectedAlert.severity.charAt(0).toUpperCase() + selectedAlert.severity.slice(1)}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground dark:text-slate-400">Status</p>
                  <Badge className={cn("text-xs font-semibold", getStatusColor(selectedAlert.status))}>
                    {selectedAlert.status.charAt(0).toUpperCase() + selectedAlert.status.slice(1)}
                  </Badge>
                </div>
                {selectedAlert.studentName && (
                  <div>
                    <p className="text-sm text-muted-foreground dark:text-slate-400">Student</p>
                    <p className="font-medium dark:text-white">{selectedAlert.studentName}</p>
                  </div>
                )}
              </div>

              {selectedAlert.remarks && (
                <div>
                  <p className="text-sm text-muted-foreground dark:text-slate-400">Remarks</p>
                  <p className="text-sm dark:text-white">{selectedAlert.remarks}</p>
                </div>
              )}

              <DialogFooter>
                <Button variant="outline" onClick={() => setDetailsDialogOpen(false)} className="dark:bg-slate-800 dark:border-slate-700 dark:hover:bg-slate-700 dark:text-white">
                  Close
                </Button>
                <Button
                  onClick={() => {
                    setEditingAlert(selectedAlert)
                    setEditDialogOpen(true)
                    setDetailsDialogOpen(false)
                  }}
                  className="dark:bg-blue-600 dark:hover:bg-blue-700"
                >
                  <Settings className="mr-2 size-4" />
                  Update Status
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl dark:bg-slate-900 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="dark:text-white">Update Alert Status</DialogTitle>
            <DialogDescription className="dark:text-slate-400">Change alert status and add remarks</DialogDescription>
          </DialogHeader>
          {editingAlert && (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground dark:text-slate-400">Alert</p>
                <p className="font-medium dark:text-white">{editingAlert.title}</p>
              </div>

              <div>
                <label className="text-sm font-medium dark:text-white">Status</label>
                <Select
                  value={editingAlert.status}
                  onValueChange={(status) =>
                    setEditingAlert({ ...editingAlert, status: status as any })
                  }
                >
                  <SelectTrigger className="mt-1 dark:bg-slate-800 dark:border-slate-700 dark:text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="dark:bg-slate-800 dark:border-slate-700">
                    <SelectItem value="unresolved" className="dark:text-white">
                      Unresolved
                    </SelectItem>
                    <SelectItem value="acknowledged" className="dark:text-white">
                      Acknowledged
                    </SelectItem>
                    <SelectItem value="resolved" className="dark:text-white">
                      Resolved
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium dark:text-white">Remarks</label>
                <Input
                  value={editingAlert.remarks || ""}
                  onChange={(e) =>
                    setEditingAlert({ ...editingAlert, remarks: e.target.value })
                  }
                  placeholder="Add remarks..."
                  className="mt-1 dark:bg-slate-800 dark:border-slate-700 dark:text-white dark:placeholder:text-slate-500"
                />
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setEditDialogOpen(false)} className="dark:bg-slate-800 dark:border-slate-700 dark:hover:bg-slate-700 dark:text-white">
                  Cancel
                </Button>
                <Button onClick={updateAlertStatus} className="dark:bg-blue-600 dark:hover:bg-blue-700">
                  <CheckCircle2 className="mr-2 size-4" />
                  Update Alert
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
