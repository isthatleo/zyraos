"use client"

import { useEffect, useMemo, useState, useCallback } from "react"
import { useTheme } from "next-themes"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { 
  Check, Star, Zap, Shield, Users, Crown, Plus, Pencil, Loader2, Trash2,
  Search, Filter, RefreshCcw, Sun, Moon, Laptop 
} from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

type AuditLog = {
  id: string
  timestamp: string | number | Date
  user: string
  action: string
  module: string
  resource: string
}

type Plan = {
  id: string
  name: string
  description: string | null
  price: string
  features: string[] | null
  maxStudents: number | null
  maxStaff: number | null
  isActive: boolean
  tag: string | null
  popular?: boolean
  currency: string
  period: string
  color: string
  iconKey: "basic" | "starter" | "standard" | "professional" | "premium" | "enterprise"
}

const fallbackPlans: Plan[] = [
  {
    id: "starter",
    name: "Starter",
    price: "149",
    currency: "R",
    period: "month",
    description: "Entry-level solution for pilot programs",
    maxStudents: 25,
    maxStaff: 5,
    features: ["Basic modules", "Simple reporting", "Community support", "Mobile app access"],
    isActive: true,
    tag: "Entry",
    popular: false,
    color: "gray",
    iconKey: "starter",
  },
  {
    id: "basic",
    name: "Basic",
    price: "299",
    currency: "R",
    period: "month",
    description: "Perfect for small schools getting started",
    maxStudents: 50,
    maxStaff: 10,
    features: ["Core modules only", "Basic reporting", "Email support", "Mobile app access"],
    isActive: true,
    tag: "Popular",
    popular: false,
    color: "blue",
    iconKey: "basic",
  },
  {
    id: "standard",
    name: "Standard",
    price: "599",
    currency: "R",
    period: "month",
    description: "Ideal for growing educational institutions",
    maxStudents: 200,
    maxStaff: 25,
    features: ["All core modules", "Advanced reporting", "Priority email support", "Parent portal"],
    isActive: true,
    tag: "Recommended",
    popular: true,
    color: "purple",
    iconKey: "standard",
  },
  {
    id: "professional",
    name: "Professional",
    price: "799",
    currency: "R",
    period: "month",
    description: "Advanced features for established schools",
    maxStudents: 500,
    maxStaff: 50,
    features: ["All core modules", "Professional reporting", "Assessment tools", "Custom workflows"],
    isActive: true,
    tag: "Advanced",
    popular: false,
    color: "indigo",
    iconKey: "professional",
  },
  {
    id: "premium",
    name: "Premium",
    price: "999",
    currency: "R",
    period: "month",
    description: "Complete solution for large schools",
    maxStudents: 1000,
    maxStaff: null,
    features: ["All modules", "Advanced analytics", "Custom integrations", "API access"],
    isActive: true,
    tag: "Pro",
    popular: false,
    color: "orange",
    iconKey: "premium",
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "1999",
    currency: "R",
    period: "month",
    description: "Tailored for large educational networks",
    maxStudents: null,
    maxStaff: null,
    features: ["Unlimited students & staff", "Dedicated manager", "On-premise option", "SLA guarantee"],
    isActive: true,
    tag: "Enterprise",
    popular: false,
    color: "green",
    iconKey: "enterprise",
  },
]

const getColorClasses = (color: string) => {
  const colors: Record<string, any> = {
    blue: { card: "border-blue-200 bg-blue-50 hover:bg-blue-100", iconBg: "bg-blue-100", iconText: "text-blue-600", button: "bg-blue-600 hover:bg-blue-700" },
    purple: { card: "border-purple-200 bg-purple-50 hover:bg-purple-100", iconBg: "bg-purple-100", iconText: "text-purple-600", button: "bg-purple-600 hover:bg-purple-700" },
    orange: { card: "border-orange-200 bg-orange-50 hover:bg-orange-100", iconBg: "bg-orange-100", iconText: "text-orange-600", button: "bg-orange-600 hover:bg-orange-700" },
    green: { card: "border-green-200 bg-green-50 hover:bg-green-100", iconBg: "bg-green-100", iconText: "text-green-600", button: "bg-green-600 hover:bg-green-700" },
    gray: { card: "border-gray-200 bg-gray-50 hover:bg-gray-100", iconBg: "bg-gray-100", iconText: "text-gray-600", button: "bg-gray-600 hover:bg-gray-700" },
    indigo: { card: "border-indigo-200 bg-indigo-50 hover:bg-indigo-100", iconBg: "bg-indigo-100", iconText: "text-indigo-600", button: "bg-indigo-600 hover:bg-indigo-700" },
  }
  return colors[color] || colors.gray
}

const iconMap = {
  basic: Shield,
  starter: Zap,
  standard: Users,
  professional: Shield,
  premium: Star,
  enterprise: Crown,
}

function PlanDialog({
                      open,
                      onOpenChange,
                      initialPlan,
                      onSave,
                    }: {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialPlan: Plan | null
  onSave: (plan: Plan) => void
}) {
  const [saving, setSaving] = useState(false)

  const [plan, setPlan] = useState<Plan>(
      initialPlan || {
        id: "",
        name: "",
        description: "",
        price: "",
        features: [],
        maxStudents: null,
        maxStaff: null,
        isActive: true,
        tag: "",
        currency: "R",
        period: "month",
        color: "blue",
        iconKey: "basic",
      }
  )

  useEffect(() => {
    setPlan(
        initialPlan || {
          id: "",
          name: "",
          description: "",
          price: "",
          features: [],
          maxStudents: null,
          maxStaff: null,
          isActive: true,
          tag: "",
          currency: "R",
          period: "month",
          color: "blue",
          iconKey: "basic",
        }
    )
  }, [initialPlan, open])

  const handleInternalSave = async () => {
    setSaving(true)
    try {
      await onSave(plan)
    } finally {
      setSaving(false)
    }
  }

  return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{initialPlan ? "Edit Plan" : "New Plan"}</DialogTitle>
            <DialogDescription>
              Create or update a subscription plan and sync it to the database.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={plan.name || ""} onChange={(e) => setPlan({ ...plan, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Tag</Label>
              <Input value={plan.tag || ""} onChange={(e) => setPlan({ ...plan, tag: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Price (ZAR)</Label>
              <Input value={plan.price || ""} onChange={(e) => setPlan({ ...plan, price: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Max Students</Label>
              <Input
                  type="number"
                  value={plan.maxStudents ?? ""}
                  onChange={(e) => setPlan({ ...plan, maxStudents: e.target.value ? Number(e.target.value) : null })}
              />
            </div>
            <div className="space-y-2">
              <Label>Max Staff</Label>
              <Input
                  type="number"
                  value={plan.maxStaff ?? ""}
                  onChange={(e) => setPlan({ ...plan, maxStaff: e.target.value ? Number(e.target.value) : null })}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Description</Label>
              <Textarea value={plan.description || ""} onChange={(e) => setPlan({ ...plan, description: e.target.value })} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Features (one per line)</Label>
              <Textarea
                  value={(plan.features || []).join("\n")}
                  onChange={(e) =>
                      setPlan({
                        ...plan,
                        features: e.target.value
                            .split("\n")
                            .map((item) => item.trim())
                            .filter(Boolean),
                      })
                  }
                  rows={6}
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="popular"
                checked={!!plan.popular}
                onChange={(e) => setPlan({ ...plan, popular: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              <Label htmlFor="popular">Most Popular Plan</Label>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isActive"
                checked={!!plan.isActive}
                onChange={(e) => setPlan({ ...plan, isActive: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <Label htmlFor="isActive">Active</Label>
            </div>
            <div className="space-y-2">
              <Label>Color Theme</Label>
              <Select value={plan.color} onValueChange={(val) => setPlan({ ...plan, color: val })}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select theme color" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="blue">Blue</SelectItem>
                  <SelectItem value="purple">Purple</SelectItem>
                  <SelectItem value="orange">Orange</SelectItem>
                  <SelectItem value="green">Green</SelectItem>
                  <SelectItem value="gray">Gray</SelectItem>
                  <SelectItem value="indigo">Indigo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Icon</Label>
              <select 
                className="w-full p-2 border rounded-md text-sm"
                value={plan.iconKey}
                onChange={(e) => setPlan({ ...plan, iconKey: e.target.value as any })}
              >
                <option value="basic">Shield</option>
                <option value="starter">Zap</option>
                <option value="standard">Users</option>
                <option value="professional">Shield (Pro)</option>
                <option value="premium">Star</option>
                <option value="enterprise">Crown</option>
              </select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleInternalSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {initialPlan ? "Save Changes" : "Create Plan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
  )
}

export default function AuditLogPage() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [moduleFilter, setModuleFilter] = useState("all")

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/master/activity", { cache: "no-store" })
      const data = await response.json()
      if (response.ok) setLogs(data.logs || [])
    } catch (e) {
      toast.error("Failed to load audit logs")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchLogs()
    setMounted(true)
  }, [fetchLogs])

  const filteredLogs = useMemo(() => {
    return logs.filter(log => 
      (log.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.resource.toLowerCase().includes(searchTerm.toLowerCase())) &&
      (moduleFilter === "all" || log.module === moduleFilter)
    )
  }, [logs, searchTerm, moduleFilter])

  return (
      <div className="p-6 lg:p-8 space-y-6 bg-gray-50/50 min-h-screen">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-gray-900">Activity Log</h1>
            <p className="text-gray-600">Track all system interactions and administrative changes across the platform.</p>
          </div>
          <div className="flex items-center gap-3">
            {mounted && (
              <Select value={theme} onValueChange={setTheme}>
                <SelectTrigger className="w-36 bg-white dark:bg-gray-950">
                  <div className="flex items-center gap-2">
                    {theme === "light" && <Sun className="h-4 w-4" />}
                    {theme === "dark" && <Moon className="h-4 w-4" />}
                    {theme === "system" && <Laptop className="h-4 w-4" />}
                    <span className="capitalize">{theme}</span>
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
            )}
            <Button onClick={fetchLogs} variant="outline" className="gap-2">
              <RefreshCcw className={cn("h-4 w-4", loading && "animate-spin")} />
              Refresh Log
            </Button>
          </div>
        </div>

        <Card className="border-none shadow-sm bg-white overflow-hidden">
          <CardHeader className="border-b border-gray-100 bg-gray-50/30">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input 
                  placeholder="Search by user or action..." 
                  className="pl-9 bg-white border-gray-200"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={moduleFilter} onValueChange={setModuleFilter}>
                <SelectTrigger className="w-48 bg-white">
                  <Filter className="h-4 w-4 mr-2 text-gray-400" />
                  <SelectValue placeholder="All Modules" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Modules</SelectItem>
                  <SelectItem value="billing">Billing</SelectItem>
                  <SelectItem value="schools">Schools</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                  <SelectItem value="plans">Plans</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-gray-50/50 text-gray-500 text-xs font-bold uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4">Timestamp</th>
                    <th className="px-6 py-4">User</th>
                    <th className="px-6 py-4">Action</th>
                    <th className="px-6 py-4">Module</th>
                    <th className="px-6 py-4">Resource</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {loading ? (
                    Array.from({ length: 10 }).map((_, i) => (
                      <tr key={i}>
                        <td colSpan={5} className="px-6 py-4"><Skeleton className="h-6 w-full" /></td>
                      </tr>
                    ))
                  ) : filteredLogs.length > 0 ? (
                    filteredLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4 text-sm text-gray-500">{new Date(log.timestamp).toLocaleString()}</td>
                        <td className="px-6 py-4 text-sm font-bold text-gray-900">{log.user}</td>
                        <td className="px-6 py-4 text-sm text-gray-700">{log.action}</td>
                        <td className="px-6 py-4">
                          <Badge variant="outline" className="capitalize text-[10px]">{log.module}</Badge>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 font-mono">{log.resource}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-gray-500">No activity logs found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
  )
}