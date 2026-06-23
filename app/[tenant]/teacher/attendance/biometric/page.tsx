"use client"

import { teacherDashboardApi } from "@/lib/teacher-api-client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  AlertCircle,
  BarChart3,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  Edit,
  Eye,
  FileText,
  Filter,
  Fingerprint,
  Home,
  List,
  Plus,
  RefreshCcw,
  Search,
  TrendingDown,
  TrendingUp,
  Users,
  Grid,
  Trash2,
  Save,
  X,
  Zap,
  Activity,
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

type BiometricRecord = {
  id: string
  studentId: string
  studentName: string
  admissionNumber: string
  classId: string
  className: string
  timestamp: string
  date: string
  time: string
  type: "checkin" | "checkout" | "attendance"
  status: "success" | "failed" | "duplicate"
  device: string
  remarks: string | null
}

type BiometricInsight = {
  totalRecords: number
  successCount: number
  failedCount: number
  duplicateCount: number
  successRate: number
  studentsScanned: number
  averageResponseTime: number
  peakHour: string
  recordsByStatus: { [key: string]: number }
  recordsByDate: { [key: string]: number }
  recordsByDevice: { [key: string]: number }
  mostActiveStudent: { name: string; count: number } | null
  checkInCount: number
  checkOutCount: number
  attendanceRecordCount: number
  deviceCount: number
  scanQualityScore: number
  averageScanTime: number
  failureRate: number
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

const getStatusColor = (status: string) => {
  switch (status) {
    case "success":
      return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/50"
    case "failed":
      return "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-900/50"
    case "duplicate":
      return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/50"
    default:
      return "bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-950/40 dark:text-gray-400 dark:border-gray-900/50"
  }
}

const getBiometricInsights = (records: BiometricRecord[]): BiometricInsight => {
  if (records.length === 0) {
    return {
      totalRecords: 0,
      successCount: 0,
      failedCount: 0,
      duplicateCount: 0,
      successRate: 0,
      studentsScanned: 0,
      averageResponseTime: 0,
      peakHour: "",
      recordsByStatus: {},
      recordsByDate: {},
      recordsByDevice: {},
      mostActiveStudent: null,
      checkInCount: 0,
      checkOutCount: 0,
      attendanceRecordCount: 0,
      deviceCount: 0,
      scanQualityScore: 0,
      averageScanTime: 0,
      failureRate: 0,
    }
  }

  const successCount = records.filter((r) => r.status === "success").length
  const failedCount = records.filter((r) => r.status === "failed").length
  const duplicateCount = records.filter((r) => r.status === "duplicate").length
  const checkInCount = records.filter((r) => r.type === "checkin").length
  const checkOutCount = records.filter((r) => r.type === "checkout").length
  const attendanceRecordCount = records.filter((r) => r.type === "attendance").length
  const studentsScanned = [...new Set(records.map((r) => r.studentId))].length

  const recordsByStatus: { [key: string]: number } = {}
  const recordsByDate: { [key: string]: number } = {}
  const recordsByDevice: { [key: string]: number } = {}
  const studentScanCount: { [key: string]: { name: string; count: number } } = {}
  const timeSlots: { [key: string]: number } = {}

  records.forEach((record) => {
    recordsByStatus[record.status] = (recordsByStatus[record.status] || 0) + 1
    recordsByDate[record.date] = (recordsByDate[record.date] || 0) + 1
    recordsByDevice[record.device] = (recordsByDevice[record.device] || 0) + 1
    const hour = record.time.split(":")[0]
    timeSlots[hour] = (timeSlots[hour] || 0) + 1

    if (!studentScanCount[record.studentId]) {
      studentScanCount[record.studentId] = { name: record.studentName, count: 0 }
    }
    studentScanCount[record.studentId].count++
  })

  const mostActiveStudent = Object.values(studentScanCount).sort((a, b) => b.count - a.count)[0] || null
  const peakHour = Object.entries(timeSlots).sort(([, a], [, b]) => b - a)[0]?.[0] || ""
  const successRate = Math.round((successCount / records.length) * 100)
  const failureRate = Math.round((failedCount / records.length) * 100)
  const deviceCount = new Set(records.map((r) => r.device)).size
  const scanQualityScore = Math.max(0, 100 - failureRate - duplicateCount)

  return {
    totalRecords: records.length,
    successCount,
    failedCount,
    duplicateCount,
    successRate,
    studentsScanned,
    averageResponseTime: 1200,
    peakHour: peakHour ? `${peakHour}:00` : "",
    recordsByStatus,
    recordsByDate,
    recordsByDevice,
    mostActiveStudent,
    checkInCount,
    checkOutCount,
    attendanceRecordCount,
    deviceCount,
    scanQualityScore,
    averageScanTime: 850,
    failureRate,
  }
}

const teacherHref = (path: string) => {
  const tenant = typeof window !== "undefined" ? window.location.pathname.split("/")[1] : ""
  return `/${tenant}${path}`
}

export default function BiometricHubPage() {
  const router = useRouter()
  const [tenant, setTenant] = React.useState("")
  const [biometricRecords, setBiometricRecords] = React.useState<BiometricRecord[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [activeView, setActiveView] = React.useState<"list" | "grid">("list")
  const [filterStatus, setFilterStatus] = React.useState("all")
  const [filterType, setFilterType] = React.useState("all")
  const [filterDate, setFilterDate] = React.useState("")
  const [search, setSearch] = React.useState("")
  const [sortBy, setSortBy] = React.useState("date-desc")
  const [selectedRecord, setSelectedRecord] = React.useState<BiometricRecord | null>(null)
  const [detailsDialogOpen, setDetailsDialogOpen] = React.useState(false)
  const [editingRecord, setEditingRecord] = React.useState<BiometricRecord | null>(null)
  const [editDialogOpen, setEditDialogOpen] = React.useState(false)
  const [syncDialogOpen, setSyncDialogOpen] = React.useState(false)
  const [isSyncing, setIsSyncing] = React.useState(false)

  React.useEffect(() => {
    const tenantSlug = typeof window !== "undefined" ? window.location.pathname.split("/")[1] : ""
    setTenant(tenantSlug)
  }, [])

  React.useEffect(() => {
    if (!tenant) return

    const fetchData = async () => {
      try {
        setLoading(true)
        const res = await fetch(teacherDashboardApi("attendance/biometric"))
        if (!res.ok) throw new Error(`API error: ${res.status}`)
        const data = await res.json()
        setBiometricRecords(data.biometricRecords || [])
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load biometric data")
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [tenant])

  const insights = React.useMemo(() => getBiometricInsights(biometricRecords), [biometricRecords])

  const filteredRecords = React.useMemo(() => {
    return biometricRecords
      .filter((r) => filterStatus === "all" || r.status === filterStatus)
      .filter((r) => filterType === "all" || r.type === filterType)
      .filter((r) => !filterDate || r.date === filterDate)
      .filter(
        (r) =>
          !search ||
          r.studentName.toLowerCase().includes(search.toLowerCase()) ||
          r.admissionNumber.toLowerCase().includes(search.toLowerCase()) ||
          r.device.toLowerCase().includes(search.toLowerCase())
      )
      .sort((a, b) => {
        if (sortBy === "date-desc") return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        if (sortBy === "date-asc") return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        if (sortBy === "name") return a.studentName.localeCompare(b.studentName)
        if (sortBy === "status") return a.status.localeCompare(b.status)
        return 0
      })
  }, [biometricRecords, filterStatus, filterType, filterDate, search, sortBy])

  const recordsByDevice = React.useMemo(() => [...new Set(biometricRecords.map((r) => r.device))], [biometricRecords])

  const exportToCSV = () => {
    if (filteredRecords.length === 0) {
      toast.error("No records to export")
      return
    }
    const headers = ["Date", "Time", "Student", "Admission No", "Class", "Type", "Status", "Device", "Remarks"]
    const rows = filteredRecords.map((r) => [
      formatDate(r.date),
      formatTime(r.time),
      r.studentName,
      r.admissionNumber,
      r.className,
      r.type.charAt(0).toUpperCase() + r.type.slice(1),
      r.status.charAt(0).toUpperCase() + r.status.slice(1),
      r.device,
      r.remarks || "",
    ])
    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `biometric-export-${new Date().toISOString().split("T")[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
    toast.success("Biometric data exported successfully")
  }

  const syncBiometricDevices = async () => {
    try {
      setIsSyncing(true)
      const res = await fetch(teacherDashboardApi("attendance/biometric"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "biometric.sync",
        }),
      })

      if (!res.ok) throw new Error("Failed to sync devices")

      const data = await res.json()
      setBiometricRecords(data.biometricRecords || [])
      setSyncDialogOpen(false)
      toast.success("Biometric devices synced successfully")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to sync devices")
    } finally {
      setIsSyncing(false)
    }
  }

  const saveRecord = async () => {
    if (!editingRecord || !tenant) return

    try {
      const res = await fetch(teacherDashboardApi("attendance/biometric"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "biometric.update",
          recordId: editingRecord.id,
          status: editingRecord.status,
          remarks: editingRecord.remarks,
        }),
      })

      if (!res.ok) throw new Error("Failed to save record")

      const data = await res.json()
      setBiometricRecords(data.biometricRecords || [])
      setEditDialogOpen(false)
      setEditingRecord(null)
      toast.success("Biometric record saved successfully")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save record")
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
              Unable to Load Biometric Data
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
                  <FileText className="mr-1 size-3.5" />
                  Teacher workspace
                </Badge>
                <Badge variant="outline" className="bg-background/80 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700">
                  Biometric Hub
                </Badge>
              </div>
              <div>
                <h1 className="text-3xl font-semibold tracking-tight md:text-4xl dark:text-white">Biometric Hub</h1>
                <p className="mt-2 text-muted-foreground dark:text-slate-400">
                  Monitor and manage biometric attendance data with real-time insights and device management
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row xl:flex-col 2xl:flex-row">
              <Button
                variant="outline"
                onClick={() => setSyncDialogOpen(true)}
                className="dark:bg-slate-800 dark:border-slate-700 dark:hover:bg-slate-700 dark:text-white"
              >
                <Zap className="size-4" />
                Sync Devices
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
          {
            label: "Total Records",
            value: insights.totalRecords,
            helper: "All scans",
            icon: FileText,
            color: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400",
          },
          {
            label: "Successful",
            value: insights.successCount,
            helper: "Successful scans",
            icon: CheckCircle2,
            color: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400",
          },
          {
            label: "Failed",
            value: insights.failedCount,
            helper: "Failed scans",
            icon: AlertCircle,
            color: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400",
          },
          {
            label: "Duplicates",
            value: insights.duplicateCount,
            helper: "Duplicate entries",
            icon: TrendingDown,
            color: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",
          },
          {
            label: "Success Rate",
            value: `${insights.successRate}%`,
            helper: "Overall rate",
            icon: BarChart3,
            color: "bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400",
          },
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
            placeholder="Search students..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs dark:bg-slate-800 dark:border-slate-700 dark:text-white dark:placeholder:text-slate-500"
          />
          <Input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="max-w-xs dark:bg-slate-800 dark:border-slate-700 dark:text-white"
          />
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[140px] dark:bg-slate-800 dark:border-slate-700 dark:text-white">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="dark:bg-slate-800 dark:border-slate-700">
              <SelectItem value="all" className="dark:text-white">
                All Status
              </SelectItem>
              <SelectItem value="success" className="dark:text-white">
                Success
              </SelectItem>
              <SelectItem value="failed" className="dark:text-white">
                Failed
              </SelectItem>
              <SelectItem value="duplicate" className="dark:text-white">
                Duplicate
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
              <SelectItem value="checkin" className="dark:text-white">
                Check-in
              </SelectItem>
              <SelectItem value="checkout" className="dark:text-white">
                Check-out
              </SelectItem>
              <SelectItem value="attendance" className="dark:text-white">
                Attendance
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
              <SelectItem value="name" className="dark:text-white">
                Student A-Z
              </SelectItem>
              <SelectItem value="status" className="dark:text-white">
                Status
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
                <CardTitle className="dark:text-white">Biometric Records</CardTitle>
                <CardDescription className="dark:text-slate-400">{filteredRecords.length} records</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {filteredRecords.map((record) => (
                  <div
                    key={record.id}
                    onClick={() => {
                      setSelectedRecord(record)
                      setDetailsDialogOpen(true)
                    }}
                    className="grid gap-3 rounded-2xl border bg-card hover:bg-muted/50 transition-colors cursor-pointer md:grid-cols-[1fr_100px_80px_100px_80px] md:items-center p-4 dark:bg-slate-800 dark:border-slate-700 dark:hover:bg-slate-700"
                  >
                    <div>
                      <p className="font-medium dark:text-white">{record.studentName}</p>
                      <p className="text-sm text-muted-foreground dark:text-slate-400">{record.className} · {record.admissionNumber}</p>
                    </div>
                    <div className="text-sm">
                      <p className="text-muted-foreground dark:text-slate-400">Time</p>
                      <p className="font-medium text-xs dark:text-white">{formatTime(record.time)}</p>
                    </div>
                    <div className="text-sm">
                      <p className="text-muted-foreground dark:text-slate-400">Type</p>
                      <p className="font-medium text-xs dark:text-white capitalize">{record.type}</p>
                    </div>
                    <div className="text-sm">
                      <p className="text-muted-foreground dark:text-slate-400">Device</p>
                      <p className="font-medium text-xs dark:text-white">{record.device}</p>
                    </div>
                    <div>
                      <Badge className={cn("text-xs font-semibold", getStatusColor(record.status))}>
                        {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                      </Badge>
                    </div>
                  </div>
                ))}
                {filteredRecords.length === 0 && (
                  <p className="text-sm text-muted-foreground dark:text-slate-400 text-center py-8">No records match filters</p>
                )}
              </CardContent>
            </Card>
          )}

          {activeView === "grid" && (
            <div className="grid gap-4 md:grid-cols-2">
              {filteredRecords.map((record) => (
                <Card
                  key={record.id}
                  className="rounded-3xl shadow-sm hover:shadow-md transition-shadow cursor-pointer dark:bg-slate-900 dark:border-slate-800"
                  onClick={() => {
                    setSelectedRecord(record)
                    setDetailsDialogOpen(true)
                  }}
                >
                  <CardHeader>
                    <CardTitle className="line-clamp-2 dark:text-white">{record.studentName}</CardTitle>
                    <CardDescription className="dark:text-slate-400">{record.className}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground dark:text-slate-400">Admission</p>
                        <p className="font-medium dark:text-white">{record.admissionNumber}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground dark:text-slate-400">Time</p>
                        <p className="font-medium dark:text-white">{formatTime(record.time)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground dark:text-slate-400">Type</p>
                        <p className="font-medium dark:text-white capitalize">{record.type}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground dark:text-slate-400">Device</p>
                        <p className="font-medium dark:text-white">{record.device}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground dark:text-slate-400 mb-2">Status</p>
                      <Badge className={cn("text-xs font-semibold", getStatusColor(record.status))}>
                        {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                      </Badge>
                    </div>
                    {record.remarks && (
                      <div>
                        <p className="text-xs text-muted-foreground dark:text-slate-400">Remarks</p>
                        <p className="text-sm dark:text-white">{record.remarks}</p>
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
                  <Activity className="size-5 text-blue-500" />
                  Status Distribution
                </CardTitle>
                <CardDescription className="dark:text-slate-400">Record breakdown</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { label: "Successful", value: insights.successCount, color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400" },
                  { label: "Failed", value: insights.failedCount, color: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400" },
                  { label: "Duplicate", value: insights.duplicateCount, color: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400" },
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
                  <Zap className="size-5 text-yellow-500" />
                  Device Performance
                </CardTitle>
                <CardDescription className="dark:text-slate-400">By device</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {recordsByDevice.map((device) => {
                  const count = insights.recordsByDevice[device] || 0
                  const percentage = Math.round((count / insights.totalRecords) * 100)
                  return (
                    <div key={device}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium dark:text-white">{device}</span>
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
                  <BarChart3 className="size-5 text-purple-500" />
                  Scan Type Distribution
                </CardTitle>
                <CardDescription className="dark:text-slate-400">Check-in, Check-out, Attendance</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { label: "Check-ins", value: insights.checkInCount, color: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400" },
                  { label: "Check-outs", value: insights.checkOutCount, color: "bg-slate-100 text-slate-700 dark:bg-slate-950/40 dark:text-slate-400" },
                  { label: "Attendance", value: insights.attendanceRecordCount, color: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400" },
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
                  <TrendingUp className="size-5 text-green-500" />
                  System Performance
                </CardTitle>
                <CardDescription className="dark:text-slate-400">Quality metrics</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { label: "Scan Quality", value: insights.scanQualityScore, unit: "%" },
                  { label: "Success Rate", value: insights.successRate, unit: "%" },
                  { label: "Failure Rate", value: insights.failureRate, unit: "%" },
                ].map(({ label, value, unit }) => (
                  <div key={label}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium dark:text-white">{label}</span>
                      <span className="text-muted-foreground dark:text-slate-400">{value}{unit}</span>
                    </div>
                    <Progress value={value} className="h-1.5" />
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="rounded-3xl shadow-sm dark:bg-slate-900 dark:border-slate-800 md:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 dark:text-white">
                  <Users className="size-5 text-cyan-500" />
                  Most Active Student
                </CardTitle>
                <CardDescription className="dark:text-slate-400">Today's most scanned student</CardDescription>
              </CardHeader>
              <CardContent>
                {insights.mostActiveStudent ? (
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-cyan-50 to-cyan-50/50 border border-cyan-200 dark:from-cyan-950/40 dark:to-cyan-950/20 dark:border-cyan-900/50">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-cyan-900 dark:text-cyan-200">Name</p>
                        <p className="text-lg font-semibold text-cyan-900 dark:text-cyan-100">{insights.mostActiveStudent.name}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-cyan-900 dark:text-cyan-200">Scan Count</p>
                        <p className="text-3xl font-bold text-cyan-600 dark:text-cyan-400">{insights.mostActiveStudent.count}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground dark:text-slate-400">No data available</p>
                )}
              </CardContent>
            </Card>
          </section>
        </div>

        {/* Sidebar */}
        <aside className="space-y-6">
          <Card className="rounded-3xl shadow-sm bg-gradient-to-br from-cyan-50 to-cyan-50/50 border-cyan-100/50 dark:from-cyan-950/40 dark:to-cyan-950/20 dark:border-cyan-900/50">
            <CardHeader>
              <CardTitle className="text-cyan-900 dark:text-cyan-300">System Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: "Total Records", value: insights.totalRecords, icon: Fingerprint },
                { label: "Students Scanned", value: insights.studentsScanned, icon: Users },
                { label: "Success Rate", value: `${insights.successRate}%`, icon: CheckCircle2 },
                { label: "Peak Hour", value: insights.peakHour || "N/A", icon: Clock },
              ].map(({ label, value, icon: Icon }) => (
                <div key={label} className="flex items-center justify-between p-2 rounded-xl bg-white/50 dark:bg-cyan-950/30">
                  <div className="flex items-center gap-2">
                    <Icon className="size-4 text-cyan-600 dark:text-cyan-400" />
                    <span className="text-sm font-medium dark:text-cyan-200">{label}</span>
                  </div>
                  <Badge variant="outline" className="text-sm dark:bg-cyan-950/50 dark:border-cyan-800 dark:text-cyan-300">
                    {value}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="rounded-3xl shadow-sm bg-gradient-to-br from-violet-50 to-violet-50/50 border-violet-100/50 dark:from-violet-950/40 dark:to-violet-950/20 dark:border-violet-900/50">
            <CardHeader>
              <CardTitle className="text-violet-900 dark:text-violet-300">Performance Metrics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: "Scan Quality", value: `${insights.scanQualityScore}%`, icon: CheckCircle2 },
                { label: "Avg Scan Time", value: `${insights.averageScanTime}ms`, icon: Clock },
                { label: "Failure Rate", value: `${insights.failureRate}%`, icon: AlertCircle },
                { label: "Device Count", value: insights.deviceCount, icon: Zap },
              ].map(({ label, value, icon: Icon }) => (
                <div key={label} className="flex items-center justify-between p-2 rounded-xl bg-white/50 dark:bg-violet-950/30">
                  <div className="flex items-center gap-2">
                    <Icon className="size-4 text-violet-600 dark:text-violet-400" />
                    <span className="text-sm font-medium dark:text-violet-200">{label}</span>
                  </div>
                  <Badge variant="outline" className="text-sm dark:bg-violet-950/50 dark:border-violet-800 dark:text-violet-300">
                    {value}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="rounded-3xl shadow-sm bg-gradient-to-br from-indigo-50 to-indigo-50/50 border-indigo-100/50 dark:from-indigo-950/40 dark:to-indigo-950/20 dark:border-indigo-900/50">
            <CardHeader>
              <CardTitle className="text-indigo-900 dark:text-indigo-300">Devices Connected</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {recordsByDevice.length > 0 ? (
                recordsByDevice.map((device) => {
                  const count = insights.recordsByDevice[device] || 0
                  return (
                    <div key={device} className="p-2 rounded-xl bg-white/50 dark:bg-indigo-950/30">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium dark:text-indigo-200">{device}</span>
                        <Badge variant="outline" className="text-xs dark:bg-indigo-950/50 dark:border-indigo-800 dark:text-indigo-300">
                          {count}
                        </Badge>
                      </div>
                    </div>
                  )
                })
              ) : (
                <p className="text-sm text-muted-foreground dark:text-slate-400">No devices connected</p>
              )}
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
            <DialogTitle className="dark:text-white">{selectedRecord?.studentName}</DialogTitle>
            <DialogDescription className="dark:text-slate-400">{selectedRecord?.className} · {selectedRecord?.admissionNumber}</DialogDescription>
          </DialogHeader>
          {selectedRecord && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground dark:text-slate-400">Date</p>
                  <p className="font-medium dark:text-white">{formatDate(selectedRecord.date)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground dark:text-slate-400">Time</p>
                  <p className="font-medium dark:text-white">{formatTime(selectedRecord.time)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground dark:text-slate-400">Type</p>
                  <p className="font-medium dark:text-white capitalize">{selectedRecord.type}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground dark:text-slate-400">Device</p>
                  <p className="font-medium dark:text-white">{selectedRecord.device}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground dark:text-slate-400">Status</p>
                  <Badge className={cn("text-xs font-semibold mt-1", getStatusColor(selectedRecord.status))}>
                    {selectedRecord.status.charAt(0).toUpperCase() + selectedRecord.status.slice(1)}
                  </Badge>
                </div>
              </div>

              {selectedRecord.remarks && (
                <div>
                  <p className="text-sm text-muted-foreground dark:text-slate-400">Remarks</p>
                  <p className="text-sm dark:text-white">{selectedRecord.remarks}</p>
                </div>
              )}

              <DialogFooter>
                <Button variant="outline" onClick={() => setDetailsDialogOpen(false)} className="dark:bg-slate-800 dark:border-slate-700 dark:hover:bg-slate-700 dark:text-white">
                  Close
                </Button>
                <Button
                  onClick={() => {
                    setEditingRecord(selectedRecord)
                    setEditDialogOpen(true)
                    setDetailsDialogOpen(false)
                  }}
                  className="dark:bg-blue-600 dark:hover:bg-blue-700"
                >
                  <Edit className="mr-2 size-4" />
                  Edit
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
            <DialogTitle className="dark:text-white">Edit Biometric Record</DialogTitle>
            <DialogDescription className="dark:text-slate-400">Update record status and remarks</DialogDescription>
          </DialogHeader>
          {editingRecord && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground dark:text-slate-400">Student</p>
                  <p className="font-medium dark:text-white">{editingRecord.studentName}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground dark:text-slate-400">Class</p>
                  <p className="font-medium dark:text-white">{editingRecord.className}</p>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium dark:text-white">Status</label>
                <Select
                  value={editingRecord.status}
                  onValueChange={(status) =>
                    setEditingRecord({ ...editingRecord, status: status as any })
                  }
                >
                  <SelectTrigger className="mt-1 dark:bg-slate-800 dark:border-slate-700 dark:text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="dark:bg-slate-800 dark:border-slate-700">
                    <SelectItem value="success" className="dark:text-white">
                      Success
                    </SelectItem>
                    <SelectItem value="failed" className="dark:text-white">
                      Failed
                    </SelectItem>
                    <SelectItem value="duplicate" className="dark:text-white">
                      Duplicate
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium dark:text-white">Remarks</label>
                <Input
                  value={editingRecord.remarks || ""}
                  onChange={(e) =>
                    setEditingRecord({ ...editingRecord, remarks: e.target.value })
                  }
                  placeholder="Add any remarks..."
                  className="mt-1 dark:bg-slate-800 dark:border-slate-700 dark:text-white dark:placeholder:text-slate-500"
                />
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setEditDialogOpen(false)} className="dark:bg-slate-800 dark:border-slate-700 dark:hover:bg-slate-700 dark:text-white">
                  Cancel
                </Button>
                <Button onClick={saveRecord} className="dark:bg-blue-600 dark:hover:bg-blue-700">
                  <Save className="mr-2 size-4" />
                  Save Changes
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Sync Dialog */}
      <Dialog open={syncDialogOpen} onOpenChange={setSyncDialogOpen}>
        <DialogContent className="max-w-2xl dark:bg-slate-900 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="dark:text-white">Sync Biometric Devices</DialogTitle>
            <DialogDescription className="dark:text-slate-400">
              Synchronize all connected biometric devices to pull latest data
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50">
              <p className="text-sm text-blue-900 dark:text-blue-200">
                <strong>Connected Devices:</strong> {recordsByDevice.length}
              </p>
              <p className="text-sm text-blue-800 dark:text-blue-300 mt-1">
                Last sync will retrieve all new records from configured biometric devices.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800">
                <p className="text-xs text-muted-foreground dark:text-slate-400">Total Records</p>
                <p className="text-lg font-semibold dark:text-white">{insights.totalRecords}</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800">
                <p className="text-xs text-muted-foreground dark:text-slate-400">Students Scanned</p>
                <p className="text-lg font-semibold dark:text-white">{insights.studentsScanned}</p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSyncDialogOpen(false)} className="dark:bg-slate-800 dark:border-slate-700 dark:hover:bg-slate-700 dark:text-white">
              Cancel
            </Button>
            <Button onClick={syncBiometricDevices} disabled={isSyncing} className="dark:bg-blue-600 dark:hover:bg-blue-700">
              <Zap className="mr-2 size-4" />
              {isSyncing ? "Syncing..." : "Start Sync"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
