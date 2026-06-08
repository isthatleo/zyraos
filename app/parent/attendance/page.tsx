"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  AlertCircle,
  ArrowRight,
  CalendarCheck,
  CheckCircle2,
  Clock,
  Download,
  FileText,
  MessageSquare,
  RefreshCcw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Users,
} from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { fetchParentDashboardJson } from "@/lib/parent-dashboard-fetch"
import { cn } from "@/lib/utils"

type AttendanceChild = {
  id: string
  name: string
  className: string
  classTeacher: string
  term: string
  metrics: {
    attendanceRate: number
    absentDays: number
    lateDays: number
    averageScore: number
  }
  attendance: Array<{ date: string | null; status: string; remarks: string }>
}

type AttendancePayload = {
  generatedAt: string
  currentUser?: { id: string; name: string; email: string }
  school?: { name: string; slug: string }
  metrics?: { children: number; attendanceRate: number; actionItems: number }
  children: AttendanceChild[]
  attendance: Array<{ childId: string; childName: string; className: string; date: string | null; status: string; remarks: string }>
  error?: string
}

const tone = {
  good: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300",
  warn: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300",
  danger: "border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300",
  info: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300",
}

function formatDate(value: string | null) {
  if (!value) return "Not dated"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Not dated"
  return new Intl.DateTimeFormat("en", { month: "short", day: "2-digit", year: "numeric" }).format(date)
}

function downloadFile(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

function AttendanceSkeleton() {
  return (
    <div className="w-full space-y-6 p-6 lg:p-8">
      <Skeleton className="h-56 rounded-3xl" />
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-36 rounded-3xl" />)}
      </section>
      <Skeleton className="h-[620px] rounded-3xl" />
    </div>
  )
}

export default function ParentAttendancePage() {
  const pathname = usePathname()
  const router = useRouter()
  const [payload, setPayload] = React.useState<AttendancePayload | null>(null)
  const [selectedChildId, setSelectedChildId] = React.useState("all")
  const [statusFilter, setStatusFilter] = React.useState("all")
  const [query, setQuery] = React.useState("")
  const [loading, setLoading] = React.useState(true)
  const [refreshing, setRefreshing] = React.useState(false)
  const [error, setError] = React.useState("")

  const tenantPrefix = React.useMemo(() => {
    const segments = (pathname ?? "").split("/").filter(Boolean)
    return segments[1] === "parent" ? `/${segments[0]}` : ""
  }, [pathname])

  const parentHref = React.useCallback((href: string) => `${tenantPrefix}${href}`, [tenantPrefix])

  const endpoint = React.useCallback(() => {
    const hostTenant = typeof window !== "undefined" ? window.location.hostname.split(".")[0] : ""
    const tenant = tenantPrefix ? tenantPrefix.slice(1) : hostTenant && !["localhost", "127", "www"].includes(hostTenant) ? hostTenant : ""
    return tenant ? `/api/tenant/parent/attendance?tenant=${encodeURIComponent(tenant)}` : "/api/parent/attendance"
  }, [tenantPrefix])

  const loadAttendance = React.useCallback(async (notify = false) => {
    setError("")
    setLoading(true)
    const result = await fetchParentDashboardJson<AttendancePayload>(endpoint(), "Failed to load attendance")
    if (result.error) {
      setError(result.error)
      setLoading(false)
      if (notify) toast.error(result.error)
      return
    }
    setPayload(result.data)
    setLoading(false)
    if (notify) toast.success("Attendance refreshed")
  }, [endpoint])

  React.useEffect(() => {
    void loadAttendance()
  }, [loadAttendance])

  const children = payload?.children || []
  const allRecords = payload?.attendance || []
  const filteredRecords = allRecords.filter((record) => {
    const search = query.trim().toLowerCase()
    const matchesChild = selectedChildId === "all" || record.childId === selectedChildId
    const matchesStatus = statusFilter === "all" || record.status.toLowerCase() === statusFilter
    const matchesSearch = !search || [record.childName, record.className, record.status, record.remarks].some((value) => String(value || "").toLowerCase().includes(search))
    return matchesChild && matchesStatus && matchesSearch
  })
  const selectedChild = children.find((child) => child.id === selectedChildId) || null
  const absences = children.reduce((sum, child) => sum + child.metrics.absentDays, 0)
  const lateDays = children.reduce((sum, child) => sum + child.metrics.lateDays, 0)
  const riskChildren = children.filter((child) => child.metrics.attendanceRate > 0 && child.metrics.attendanceRate < 90)
  const presentRecords = allRecords.filter((record) => ["present", "late", "excused"].includes(record.status.toLowerCase())).length
  const recordRate = allRecords.length ? Math.round((presentRecords / allRecords.length) * 1000) / 10 : 0
  const statusCounts = allRecords.reduce<Record<string, number>>((counts, record) => {
    const status = record.status.toLowerCase() || "recorded"
    counts[status] = (counts[status] || 0) + 1
    return counts
  }, {})
  const attendanceProfiles = children.map((child) => {
    const flags = child.metrics.absentDays + child.metrics.lateDays
    const riskScore = Math.max(0, Math.min(100, Math.round(((100 - child.metrics.attendanceRate) * 0.7) + (flags * 6))))
    const latestRecord = child.attendance.toSorted((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime())[0]
    const priority = child.metrics.attendanceRate >= 95
      ? "Excellent"
      : child.metrics.attendanceRate >= 90
        ? "Monitor"
        : child.metrics.absentDays > 0
          ? "Absence follow-up"
          : "Late follow-up"
    return { child, flags, riskScore, latestRecord, priority }
  }).toSorted((a, b) => b.riskScore - a.riskScore)
  const highestRisk = attendanceProfiles[0] || null
  const selectedProfile = selectedChild ? attendanceProfiles.find((profile) => profile.child.id === selectedChild.id) || null : highestRisk
  const recoveryPlan = [
    {
      label: "Absence recovery",
      value: absences,
      helper: absences ? "Review absent records and contact school where needed." : "No absence recovery action needed.",
      icon: ShieldAlert,
      toneClass: absences ? tone.warn : tone.good,
      action: () => setStatusFilter("absent"),
    },
    {
      label: "Late arrival control",
      value: lateDays,
      helper: lateDays ? "Review late records and morning routine patterns." : "Late arrival pattern is currently clear.",
      icon: Clock,
      toneClass: lateDays ? tone.warn : tone.good,
      action: () => setStatusFilter("late"),
    },
    {
      label: "Child priority",
      value: highestRisk?.child.name || "None",
      helper: highestRisk ? `${highestRisk.priority} - ${highestRisk.child.metrics.attendanceRate}% attendance` : "No linked child risk data.",
      icon: Users,
      toneClass: highestRisk?.riskScore ? tone.warn : tone.good,
      action: () => {
        if (highestRisk) setSelectedChildId(highestRisk.child.id)
      },
    },
    {
      label: "School contact",
      value: riskChildren.length,
      helper: riskChildren.length ? "Open messages for attendance follow-up." : "No school follow-up required.",
      icon: MessageSquare,
      toneClass: riskChildren.length ? tone.warn : tone.good,
      action: () => router.push(parentHref("/parent/messages")),
    },
  ]
  const attendanceReadiness = [
    { label: "Children linked", value: children.length, ready: children.length > 0 },
    { label: "Records loaded", value: allRecords.length, ready: allRecords.length > 0 },
    { label: "Present records", value: statusCounts.present || 0, ready: (statusCounts.present || 0) > 0 },
    { label: "Risk clear", value: riskChildren.length, ready: riskChildren.length === 0 },
    { label: "Teacher coverage", value: children.filter((child) => child.classTeacher).length, ready: children.every((child) => child.classTeacher) },
    { label: "Latest sync", value: formatDate(payload?.generatedAt || null), ready: Boolean(payload?.generatedAt) },
  ]
  const weekdayCounts = allRecords.reduce<Record<string, { total: number; flags: number }>>((counts, record) => {
    const date = record.date ? new Date(record.date) : null
    const day = date && !Number.isNaN(date.getTime()) ? new Intl.DateTimeFormat("en", { weekday: "short" }).format(date) : "No date"
    const status = record.status.toLowerCase()
    const current = counts[day] || { total: 0, flags: 0 }
    current.total += 1
    if (status === "absent" || status === "late") current.flags += 1
    counts[day] = current
    return counts
  }, {})
  const highestFlagDay = Object.entries(weekdayCounts)
    .map(([day, value]) => ({ day, ...value, rate: value.total ? Math.round((value.flags / value.total) * 1000) / 10 : 0 }))
    .toSorted((a, b) => b.flags - a.flags)[0]
  const statusDistribution = ["present", "late", "absent", "excused"].map((status) => {
    const count = statusCounts[status] || 0
    return { status, count, percent: allRecords.length ? Math.round((count / allRecords.length) * 1000) / 10 : 0 }
  })
  const currentFilteredRate = filteredRecords.length
    ? Math.round((filteredRecords.filter((record) => ["present", "late", "excused"].includes(record.status.toLowerCase())).length / filteredRecords.length) * 1000) / 10
    : 0
  const attendanceChecklist = [
    {
      label: "Review absences",
      helper: absences ? `${absences} absence record${absences === 1 ? "" : "s"} need review.` : "No absence records need review.",
      done: absences === 0,
      action: () => setStatusFilter("absent"),
    },
    {
      label: "Review late records",
      helper: lateDays ? `${lateDays} late record${lateDays === 1 ? "" : "s"} need pattern review.` : "No late records need review.",
      done: lateDays === 0,
      action: () => setStatusFilter("late"),
    },
    {
      label: "Contact school",
      helper: riskChildren.length ? "Open messages for below-target attendance follow-up." : "No attendance contact needed right now.",
      done: riskChildren.length === 0,
      action: () => router.push(parentHref("/parent/messages")),
    },
    {
      label: "Download report",
      helper: "Export the current filtered attendance records for parent review.",
      done: filteredRecords.length > 0,
      action: exportAttendance,
    },
  ]

  const refresh = () => {
    setRefreshing(true)
    void loadAttendance(true).finally(() => setRefreshing(false))
  }

  function exportAttendance() {
    if (!payload) return
    const rows = [
      ["Parent", payload.currentUser?.name || ""],
      ["School", payload.school?.name || ""],
      ["Average attendance", `${payload.metrics?.attendanceRate ?? 0}%`],
      ["Filtered attendance rate", `${currentFilteredRate}%`],
      ["Absences", String(absences)],
      ["Late days", String(lateDays)],
      ["At-risk children", String(riskChildren.length)],
      [],
      ["Child", "Class", "Date", "Status", "Remarks"],
      ...filteredRecords.map((record) => [record.childName, record.className, formatDate(record.date), record.status, record.remarks]),
    ]
    const csv = rows.map((row) => row.map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`).join(",")).join("\n")
    downloadFile("parent-attendance-report.csv", csv, "text/csv;charset=utf-8")
    toast.success("Attendance report downloaded")
  }

  if (loading && !payload) return <AttendanceSkeleton />

  if (error && !payload) {
    return (
      <div className="w-full p-6 lg:p-8">
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-3">
              <AlertCircle className="mt-0.5 size-5 text-destructive" />
              <div>
                <p className="font-medium text-destructive">Attendance could not be loaded</p>
                <p className="text-sm text-muted-foreground">{error}</p>
              </div>
            </div>
            <Button type="button" variant="outline" onClick={() => void loadAttendance(true)}>Retry</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!payload?.currentUser?.id || !children.length) {
    return (
      <div className="w-full p-6 lg:p-8">
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium text-destructive">Linked parent profile is required</p>
              <p className="text-sm text-muted-foreground">Attendance only renders for a signed-in parent or guardian with linked children.</p>
            </div>
            <Button type="button" variant="outline" onClick={() => router.refresh()}>Refresh session</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="w-full space-y-6 p-6 lg:p-8">
      <section className="overflow-hidden rounded-3xl border bg-card shadow-sm">
        <div className="relative p-6 md:p-8">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(20,184,166,0.18),transparent_34%),linear-gradient(135deg,rgba(59,130,246,0.10),transparent_45%)]" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-4xl space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="bg-background/80">
                  <Users className="mr-1 size-3.5" />
                  {children.length} linked child{children.length === 1 ? "" : "ren"}
                </Badge>
                <Badge variant="outline" className="bg-background/80">{payload.school?.name}</Badge>
                <Badge variant="outline" className="bg-background/80">{allRecords.length} attendance records</Badge>
              </div>
              <div>
                <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Attendance</h1>
                <p className="mt-2 text-muted-foreground">
                  Tenant-synced attendance monitoring for the logged-in parent, including child risk indicators and recent attendance events.
                </p>
              </div>
              <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2 lg:grid-cols-4">
                <span>Average: <strong className="text-foreground">{payload.metrics?.attendanceRate ?? 0}%</strong></span>
                <span>Absences: <strong className="text-foreground">{absences}</strong></span>
                <span>Late records: <strong className="text-foreground">{lateDays}</strong></span>
                <span>At risk: <strong className="text-foreground">{riskChildren.length}</strong></span>
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row lg:flex-col xl:flex-row">
              <Button type="button" variant="outline" onClick={refresh} disabled={refreshing}>
                <RefreshCcw className={cn("size-4", refreshing && "animate-spin")} />
                Refresh
              </Button>
              <Button type="button" onClick={exportAttendance}>
                <Download className="size-4" />
                Export
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Family Attendance", value: `${payload.metrics?.attendanceRate ?? 0}%`, helper: "Tenant calculated child average", icon: ShieldCheck, progress: payload.metrics?.attendanceRate ?? 0, toneClass: tone.good },
          { label: "Record Rate", value: `${recordRate}%`, helper: "Present, late, or excused records", icon: CalendarCheck, progress: recordRate, toneClass: tone.info },
          { label: "Absences", value: absences, helper: "Across linked children", icon: ShieldAlert, toneClass: absences ? tone.warn : tone.good },
          { label: "Late Days", value: lateDays, helper: "Recent late attendance records", icon: Clock, toneClass: lateDays ? tone.warn : tone.good },
        ].map((card) => {
          const Icon = card.icon
          return (
            <Card key={card.label} className="group h-full overflow-hidden rounded-3xl border bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
              <CardContent className="relative flex h-full min-h-36 flex-col justify-between p-5">
                <div className="relative flex items-start justify-between gap-3">
                  <div className="min-w-0 text-left">
                    <p className="text-sm font-medium text-muted-foreground">{card.label}</p>
                    <p className="mt-2 truncate text-2xl font-semibold tracking-tight">{card.value}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{card.helper}</p>
                  </div>
                  <div className={cn("rounded-2xl border p-3", card.toneClass)}>
                    <Icon className="size-5" />
                  </div>
                </div>
                {"progress" in card ? <Progress className="relative mt-4" value={Number(card.progress || 0)} /> : null}
              </CardContent>
            </Card>
          )
        })}
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <Card className="rounded-3xl shadow-sm">
          <CardHeader>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle>Attendance Recovery Plan</CardTitle>
                <CardDescription>Actionable parent follow-up based on absences, late records, and linked-child risk.</CardDescription>
              </div>
              <Badge variant="outline" className={riskChildren.length ? tone.warn : tone.good}>
                {riskChildren.length ? `${riskChildren.length} below target` : "Target protected"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {recoveryPlan.map((item) => {
              const Icon = item.icon
              return (
                <button
                  key={item.label}
                  type="button"
                  className="min-h-32 rounded-2xl border bg-background/60 p-4 text-left transition-colors hover:bg-muted/50"
                  onClick={item.action}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">{item.label}</p>
                      <p className="mt-1 truncate text-xl font-semibold">{item.value}</p>
                    </div>
                    <div className={cn("rounded-xl border p-2", item.toneClass)}>
                      <Icon className="size-4" />
                    </div>
                  </div>
                  <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{item.helper}</p>
                </button>
              )
            })}
          </CardContent>
        </Card>

        <Card className="rounded-3xl shadow-sm">
          <CardHeader>
            <CardTitle>Highest Priority</CardTitle>
            <CardDescription>Child with the strongest attendance follow-up signal.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <button
              type="button"
              className="w-full rounded-2xl border p-4 text-left transition-colors hover:bg-muted/50"
              onClick={() => {
                if (highestRisk) setSelectedChildId(highestRisk.child.id)
              }}
            >
              <p className="text-xs text-muted-foreground">Priority child</p>
              <p className="mt-1 font-semibold">{highestRisk?.child.name || "No child selected"}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {highestRisk ? `${highestRisk.priority} - ${highestRisk.flags} attendance flags` : "No attendance risk data available"}
              </p>
            </button>
            <Button type="button" variant="outline" className="w-full justify-start" asChild>
              <Link href={parentHref("/parent/messages")}>
                <MessageSquare className="size-4" />
                Message school
              </Link>
            </Button>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <Card className="rounded-3xl shadow-sm">
          <CardHeader>
            <CardTitle>Child Attendance Matrix</CardTitle>
            <CardDescription>Compare attendance rates, risk scores, latest records, and follow-up priority.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {attendanceProfiles.map((profile) => (
              <button
                key={profile.child.id}
                type="button"
                className={cn("rounded-2xl border p-4 text-left transition-colors hover:bg-muted/50", selectedChildId === profile.child.id && "border-primary bg-primary/5")}
                onClick={() => setSelectedChildId(profile.child.id)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{profile.child.name}</p>
                    <p className="truncate text-sm text-muted-foreground">{profile.child.className} - {profile.child.classTeacher || "No teacher assigned"}</p>
                  </div>
                  <Badge variant="outline" className={profile.child.metrics.attendanceRate >= 95 ? tone.good : profile.child.metrics.attendanceRate >= 90 ? tone.info : tone.warn}>
                    {profile.child.metrics.attendanceRate}%
                  </Badge>
                </div>
                <Progress className="mt-3" value={profile.child.metrics.attendanceRate} />
                <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Flags</p>
                    <p className="font-semibold">{profile.flags}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Risk</p>
                    <p className="font-semibold">{profile.riskScore}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Latest</p>
                    <p className="truncate font-semibold">{profile.latestRecord?.status || "None"}</p>
                  </div>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">{profile.priority}</p>
              </button>
            ))}
          </CardContent>
        </Card>

        <Card className="rounded-3xl shadow-sm">
          <CardHeader>
            <CardTitle>Attendance Data Health</CardTitle>
            <CardDescription>Checks for reliable parent attendance operations.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {attendanceReadiness.map((item) => (
              <div key={item.label} className="flex items-center justify-between gap-3 rounded-2xl border p-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="truncate text-xs text-muted-foreground">{item.value}</p>
                </div>
                <Badge variant="outline" className={item.ready ? tone.good : tone.warn}>{item.ready ? "Ready" : "Needs data"}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      {selectedProfile ? (
        <section>
          <Card className="rounded-3xl shadow-sm">
            <CardHeader>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <CardTitle>{selectedProfile.child.name} Attendance Snapshot</CardTitle>
                  <CardDescription>Selected child attendance context and follow-up details.</CardDescription>
                </div>
                <Badge variant="outline" className={selectedProfile.child.metrics.attendanceRate >= 90 ? tone.good : tone.warn}>{selectedProfile.priority}</Badge>
              </div>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {[
                { label: "Attendance rate", value: `${selectedProfile.child.metrics.attendanceRate}%`, helper: "Current child attendance", icon: ShieldCheck },
                { label: "Absences", value: selectedProfile.child.metrics.absentDays, helper: "Recorded absent days", icon: ShieldAlert },
                { label: "Late days", value: selectedProfile.child.metrics.lateDays, helper: "Recorded late arrivals", icon: Clock },
                { label: "Latest record", value: selectedProfile.latestRecord?.status || "None", helper: formatDate(selectedProfile.latestRecord?.date || null), icon: FileText },
              ].map((item) => {
                const Icon = item.icon
                return (
                  <div key={item.label} className="rounded-2xl border bg-background/60 p-4">
                    <Icon className="mb-3 size-4 text-primary" />
                    <p className="text-xs text-muted-foreground">{item.label}</p>
                    <p className="mt-1 truncate text-lg font-semibold">{item.value}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{item.helper}</p>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        </section>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <Card className="rounded-3xl shadow-sm">
          <CardHeader>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle>Attendance Pattern Insights</CardTitle>
                <CardDescription>Status distribution, filtered attendance rate, and weekday risk pattern.</CardDescription>
              </div>
              <Badge variant="outline" className={currentFilteredRate >= 90 ? tone.good : tone.warn}>
                {currentFilteredRate}% filtered rate
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {statusDistribution.map((item) => (
              <button
                key={item.status}
                type="button"
                className="rounded-2xl border bg-background/60 p-4 text-left transition-colors hover:bg-muted/50"
                onClick={() => setStatusFilter(item.status)}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="capitalize text-sm font-medium">{item.status}</p>
                  <Badge variant="outline" className={item.status === "absent" ? tone.danger : item.status === "late" ? tone.warn : tone.good}>
                    {item.percent}%
                  </Badge>
                </div>
                <p className="mt-2 text-2xl font-semibold">{item.count}</p>
                <Progress className="mt-3" value={item.percent} />
              </button>
            ))}
          </CardContent>
        </Card>

        <Card className="rounded-3xl shadow-sm">
          <CardHeader>
            <CardTitle>Weekday Risk</CardTitle>
            <CardDescription>Day with the most absent or late records.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl border p-4">
              <p className="text-xs text-muted-foreground">Highest flag day</p>
              <p className="mt-1 text-2xl font-semibold">{highestFlagDay?.day || "No data"}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {highestFlagDay ? `${highestFlagDay.flags} flags across ${highestFlagDay.total} records (${highestFlagDay.rate}%)` : "No dated attendance records available."}
              </p>
            </div>
            <Button type="button" variant="outline" className="w-full justify-start" onClick={() => setStatusFilter("late")}>
              <Clock className="size-4" />
              Review late pattern
            </Button>
          </CardContent>
        </Card>
      </section>

      <section>
        <Card className="rounded-3xl shadow-sm">
          <CardHeader>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle>Parent Attendance Checklist</CardTitle>
                <CardDescription>Operational tasks parents can complete from this page.</CardDescription>
              </div>
              <Badge variant="outline">{attendanceChecklist.filter((item) => item.done).length}/{attendanceChecklist.length} complete</Badge>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {attendanceChecklist.map((item) => (
              <button
                key={item.label}
                type="button"
                className="rounded-2xl border p-4 text-left transition-colors hover:bg-muted/50"
                onClick={item.action}
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="font-medium">{item.label}</p>
                  <Badge variant="outline" className={item.done ? tone.good : tone.warn}>{item.done ? "Done" : "Review"}</Badge>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{item.helper}</p>
              </button>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
        <Card className="rounded-3xl shadow-sm">
          <CardHeader>
            <CardTitle>Child Attendance Health</CardTitle>
            <CardDescription>Click a child to filter records and inspect risk.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {children.map((child) => (
              <button
                key={child.id}
                type="button"
                className={cn("w-full rounded-2xl border p-4 text-left transition-colors hover:bg-muted/50", selectedChildId === child.id && "border-primary bg-primary/5")}
                onClick={() => setSelectedChildId(child.id)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{child.name}</p>
                    <p className="text-sm text-muted-foreground">{child.className} - {child.classTeacher || "No teacher assigned"}</p>
                  </div>
                  <Badge variant="outline" className={child.metrics.attendanceRate >= 95 ? tone.good : child.metrics.attendanceRate >= 90 ? tone.info : tone.warn}>{child.metrics.attendanceRate}%</Badge>
                </div>
                <Progress className="mt-3" value={child.metrics.attendanceRate} />
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <span>{child.metrics.absentDays} absences</span>
                  <span>{child.metrics.lateDays} late</span>
                </div>
              </button>
            ))}
            <Button type="button" variant="outline" className="w-full justify-start" onClick={() => setSelectedChildId("all")}>
              <Users className="size-4" />
              Show all children
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="rounded-3xl shadow-sm">
            <CardHeader>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <CardTitle>Attendance Records</CardTitle>
                  <CardDescription>Filter real attendance data by child, status, or search terms.</CardDescription>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Select value={selectedChildId} onValueChange={setSelectedChildId}>
                    <SelectTrigger className="w-full sm:w-56">
                      <SelectValue placeholder="Child" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All children</SelectItem>
                      {children.map((child) => <SelectItem key={child.id} value={child.id}>{child.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full sm:w-44">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All statuses</SelectItem>
                      <SelectItem value="present">Present</SelectItem>
                      <SelectItem value="late">Late</SelectItem>
                      <SelectItem value="absent">Absent</SelectItem>
                      <SelectItem value="excused">Excused</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search child, class, status, remarks..." className="pl-9" />
              </div>

              <Tabs defaultValue="records" className="space-y-4">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="records">Records</TabsTrigger>
                  <TabsTrigger value="risk">Risk</TabsTrigger>
                  <TabsTrigger value="actions">Actions</TabsTrigger>
                </TabsList>
                <TabsContent value="records" className="space-y-3">
                  {filteredRecords.map((record, index) => (
                    <div key={`${record.childId}_${record.date}_${record.status}_${index}`} className="flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-medium">{record.childName}</p>
                        <p className="text-sm text-muted-foreground">{record.className} - {formatDate(record.date)}</p>
                        {record.remarks ? <p className="mt-1 text-xs text-muted-foreground">{record.remarks}</p> : null}
                      </div>
                      <Badge variant="outline" className={record.status.toLowerCase() === "absent" ? tone.danger : record.status.toLowerCase() === "late" ? tone.warn : tone.good}>
                        {record.status || "Recorded"}
                      </Badge>
                    </div>
                  ))}
                  {!filteredRecords.length ? <p className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">No attendance records match the current filters.</p> : null}
                </TabsContent>
                <TabsContent value="risk" className="grid gap-3 md:grid-cols-2">
                  {riskChildren.map((child) => (
                    <div key={child.id} className="rounded-2xl border p-4">
                      <div className="flex items-center justify-between">
                        <p className="font-medium">{child.name}</p>
                        <Badge variant="outline" className={tone.warn}>Below target</Badge>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{child.metrics.attendanceRate}% attendance - {child.className}</p>
                      <Progress className="mt-3" value={child.metrics.attendanceRate} />
                    </div>
                  ))}
                  {!riskChildren.length ? <p className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground md:col-span-2">No child is below the 90% attendance target.</p> : null}
                </TabsContent>
                <TabsContent value="actions" className="grid gap-3 md:grid-cols-2">
                  <Button type="button" variant="outline" className="justify-start" asChild>
                    <Link href={parentHref("/parent/children")}>
                      <ArrowRight className="size-4" />
                      Open children page
                    </Link>
                  </Button>
                  <Button type="button" variant="outline" className="justify-start" asChild>
                    <Link href={parentHref("/parent/messages")}>
                      <MessageSquare className="size-4" />
                      Message school
                    </Link>
                  </Button>
                  <Button type="button" variant="outline" className="justify-start" onClick={exportAttendance}>
                    <Download className="size-4" />
                    Download filtered report
                  </Button>
                  <Button type="button" variant="outline" className="justify-start" onClick={refresh} disabled={refreshing}>
                    <RefreshCcw className={cn("size-4", refreshing && "animate-spin")} />
                    Refresh attendance
                  </Button>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  )
}
