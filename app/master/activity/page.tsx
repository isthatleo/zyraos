"use client";

import * as React from "react";
import {
  Activity,
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Database,
  Download,
  Eye,
  Filter,
  Loader2,
  Mail,
  RefreshCw,
  Search,
  Settings,
  Shield,
  Trash2,
  User,
  X,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

type ActivityLog = {
  id: string;
  createdAt: string | null;
  timestamp: string;
  user: string;
  adminId: string;
  adminName: string | null;
  adminEmail: string | null;
  adminRole: string | null;
  action: string;
  resource: string;
  resourceId: string | null;
  ip: string;
  ipAddress: string | null;
  userAgent: string | null;
  device: string;
  status: string;
  changes: unknown;
  details: string;
};

type ActivityData = {
  generatedAt: string;
  logs: ActivityLog[];
  summary: {
    total: number;
    success: number;
    failed: number;
    last24h: number;
    uniqueAdmins: number;
    successRate: number;
    failureRate: number;
  };
  facets: {
    statuses: Array<{ value: string; count: number }>;
    resources: Array<{ value: string; count: number }>;
    actions: Array<{ value: string; count: number }>;
    admins: Array<{ id: string; name: string; email: string; count: number }>;
  };
  timeline: Array<{ date: string; label: string; success: number; failed: number; total: number }>;
  riskEvents: Array<{
    id: string;
    createdAt: string | null;
    action: string;
    resource: string;
    status: string;
    adminName: string;
    ipAddress: string;
  }>;
  pagination: {
    limit: number;
    offset: number;
    total: number;
    hasMore: boolean;
  };
};

const DEFAULT_DATA: ActivityData = {
  generatedAt: new Date(0).toISOString(),
  logs: [],
  summary: {
    total: 0,
    success: 0,
    failed: 0,
    last24h: 0,
    uniqueAdmins: 0,
    successRate: 0,
    failureRate: 0,
  },
  facets: { statuses: [], resources: [], actions: [], admins: [] },
  timeline: [],
  riskEvents: [],
  pagination: { limit: 25, offset: 0, total: 0, hasMore: false },
};

function compact(value: number) {
  return new Intl.NumberFormat(undefined, { notation: value >= 10000 ? "compact" : "standard" }).format(Number(value || 0));
}

function percent(value: number) {
  return `${Number(value || 0).toFixed(1)}%`;
}

function dateLabel(value?: string | null) {
  return value ? new Date(value).toLocaleString() : "N/A";
}

function getActionIcon(action: string) {
  const normalizedAction = action.toLowerCase();
  if (normalizedAction.includes("school")) return Database;
  if (normalizedAction.includes("login")) return User;
  if (normalizedAction.includes("settings")) return Settings;
  if (normalizedAction.includes("invoice")) return Mail;
  if (normalizedAction.includes("backup")) return Database;
  if (normalizedAction.includes("security")) return Shield;
  return Settings;
}

function getSeverity(action: string, status: string): "low" | "medium" | "high" | "critical" {
  const normalizedAction = action.toLowerCase();
  const normalizedStatus = status.toLowerCase();
  if (normalizedStatus === "failed" || normalizedStatus === "error") return "critical";
  if (normalizedAction.includes("delete") || normalizedAction.includes("security") || normalizedAction.includes("permission")) return "high";
  if (normalizedAction.includes("update") || normalizedAction.includes("change") || normalizedAction.includes("plan")) return "medium";
  return "low";
}

function statusClass(status: string) {
  const normalized = status.toLowerCase();
  if (normalized === "success") return "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  if (normalized === "warning") return "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300";
  if (normalized === "failed" || normalized === "error") return "border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-300";
  return "border-muted bg-muted text-muted-foreground";
}

function severityClass(severity: string) {
  if (severity === "critical") return "border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-300";
  if (severity === "high") return "border-orange-500/20 bg-orange-500/10 text-orange-700 dark:text-orange-300";
  if (severity === "medium") return "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300";
  return "border-sky-500/20 bg-sky-500/10 text-sky-700 dark:text-sky-300";
}

function downloadFile(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function MetricCard({
  title,
  value,
  description,
  icon: Icon,
  tone = "default",
}: {
  title: string;
  value: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "default" | "success" | "warning" | "danger";
}) {
  const tones = {
    default: "bg-primary/10 text-primary",
    success: "bg-emerald-500/10 text-emerald-600",
    warning: "bg-amber-500/10 text-amber-600",
    danger: "bg-red-500/10 text-red-600",
  };

  return (
    <Card className="border-border/70 bg-card/95 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className={cn("rounded-full p-2", tones[tone])}>
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tracking-tight">{value}</div>
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

export default function ActivityLogPage() {
  const [data, setData] = React.useState<ActivityData>(DEFAULT_DATA);
  const [loading, setLoading] = React.useState(true);
  const [query, setQuery] = React.useState("");
  const deferredQuery = React.useDeferredValue(query);
  const [status, setStatus] = React.useState("all");
  const [resource, setResource] = React.useState("all");
  const [action, setAction] = React.useState("all");
  const [adminId, setAdminId] = React.useState("all");
  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");
  const [offset, setOffset] = React.useState(0);
  const [selectedLog, setSelectedLog] = React.useState<ActivityLog | null>(null);

  const buildParams = React.useCallback(
    (options?: { includeOffset?: boolean; exportFormat?: "csv" | "json" }) => {
      const params = new URLSearchParams({
        limit: "25",
      });
      if (options?.includeOffset !== false) params.set("offset", String(offset));
      if (options?.exportFormat) params.set("export", options.exportFormat);
      if (deferredQuery.trim()) params.set("q", deferredQuery.trim());
      if (status !== "all") params.set("status", status);
      if (resource !== "all") params.set("resource", resource);
      if (action !== "all") params.set("action", action);
      if (adminId !== "all") params.set("adminId", adminId);
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      return params;
    },
    [action, adminId, deferredQuery, from, offset, resource, status, to]
  );

  const fetchLogs = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = buildParams();
      const response = await fetch(`/api/master/activity?${params.toString()}`, {
        cache: "no-store",
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || "Failed to fetch activity logs");
      setData({ ...DEFAULT_DATA, ...payload });
    } catch (error) {
      console.error("Failed to fetch activity logs:", error);
      toast.error(error instanceof Error ? error.message : "Failed to fetch activity logs");
      setData(DEFAULT_DATA);
    } finally {
      setLoading(false);
    }
  }, [buildParams]);

  React.useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  React.useEffect(() => {
    setOffset(0);
  }, [deferredQuery, status, resource, action, adminId, from, to]);

  const resetFilters = () => {
    setQuery("");
    setStatus("all");
    setResource("all");
    setAction("all");
    setAdminId("all");
    setFrom("");
    setTo("");
    setOffset(0);
  };

  const exportFromServer = async (format: "csv" | "json") => {
    try {
      const response = await fetch(`/api/master/activity?${buildParams({ includeOffset: false, exportFormat: format }).toString()}`, {
        cache: "no-store",
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error || `Failed to export ${format.toUpperCase()}`);
      }
      const content = await response.text();
      downloadFile(
        `roxan-activity-log-${new Date().toISOString().slice(0, 10)}.${format}`,
        content,
        format === "csv" ? "text/csv" : "application/json"
      );
      toast.success(`Full filtered ${format.toUpperCase()} export generated`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Export failed");
    }
  };

  const purgeRetainedLogs = async () => {
    if (!window.confirm("Purge audit records older than the configured retention window? This cannot be undone.")) return;
    setLoading(true);
    try {
      const response = await fetch("/api/master/activity", { method: "DELETE" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || "Failed to purge old audit logs");
      toast.success(`${payload.deletedCount || 0} old audit records purged`);
      setOffset(0);
      await fetchLogs();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to purge old audit logs");
      setLoading(false);
    }
  };

  const activeFilters = [deferredQuery, status !== "all", resource !== "all", action !== "all", adminId !== "all", from, to].filter(Boolean).length;
  const currentStart = data.pagination.total === 0 ? 0 : data.pagination.offset + 1;
  const currentEnd = Math.min(data.pagination.offset + data.pagination.limit, data.pagination.total);

  return (
    <div className="space-y-8 p-6 lg:p-8">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <Activity className="h-3.5 w-3.5" />
            Super Admin System
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Activity Log</h1>
          <p className="max-w-3xl text-muted-foreground">
            Monitor platform audit events, administrator actions, security signals, and operational changes across Roxan.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" className="gap-2 rounded-full" onClick={fetchLogs} disabled={loading}>
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            Refresh
          </Button>
          <Button variant="outline" className="gap-2 rounded-full" onClick={() => exportFromServer("csv")} disabled={loading || !data.logs.length}>
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
          <Button variant="outline" className="gap-2 rounded-full" onClick={() => exportFromServer("json")} disabled={loading || !data.logs.length}>
            <Download className="h-4 w-4" />
            Export JSON
          </Button>
          <Button className="gap-2 rounded-full" onClick={purgeRetainedLogs} disabled={loading}>
            <Trash2 className="h-4 w-4" />
            Apply Retention
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard title="Total Events" value={compact(data.summary.total)} description={`${compact(data.summary.last24h)} in the last 24 hours`} icon={CalendarClock} />
        <MetricCard title="Success Rate" value={percent(data.summary.successRate)} description={`${compact(data.summary.success)} successful events`} icon={CheckCircle2} tone="success" />
        <MetricCard title="Risk Events" value={compact(data.summary.failed)} description={`${percent(data.summary.failureRate)} of filtered events`} icon={AlertTriangle} tone={data.summary.failed ? "danger" : "success"} />
        <MetricCard title="Active Admins" value={compact(data.summary.uniqueAdmins)} description="Admins represented in this view" icon={User} />
        <MetricCard title="Filtered Rows" value={`${currentStart}-${currentEnd}`} description={`${compact(data.pagination.total)} matching audit records`} icon={Filter} tone="warning" />
      </div>

      <Card className="border-border/70 bg-card/95 shadow-sm">
        <CardHeader>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle>Audit Filters</CardTitle>
              <CardDescription>Filter by actor, action, resource, status, IP, resource ID, and date range.</CardDescription>
            </div>
            {activeFilters > 0 ? (
              <Button variant="ghost" size="sm" className="gap-2 self-start text-muted-foreground lg:self-auto" onClick={resetFilters}>
                <X className="h-4 w-4" />
                Clear {activeFilters} filter{activeFilters === 1 ? "" : "s"}
              </Button>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 lg:grid-cols-[minmax(260px,1.4fr)_repeat(4,minmax(150px,1fr))]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search users, action, resource, resource ID, or IP..."
                className="rounded-full pl-10"
              />
              {query ? (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            </div>

            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="rounded-full">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {data.facets.statuses.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.value} ({item.count})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={resource} onValueChange={setResource}>
              <SelectTrigger className="rounded-full">
                <SelectValue placeholder="Resource" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All resources</SelectItem>
                {data.facets.resources.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.value} ({item.count})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={action} onValueChange={setAction}>
              <SelectTrigger className="rounded-full">
                <SelectValue placeholder="Action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All actions</SelectItem>
                {data.facets.actions.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.value} ({item.count})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={adminId} onValueChange={setAdminId}>
              <SelectTrigger className="rounded-full">
                <SelectValue placeholder="Admin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All admins</SelectItem>
                {data.facets.admins.map((admin) => (
                  <SelectItem key={admin.id} value={admin.id}>
                    {admin.name} ({admin.count})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:max-w-xl">
            <div className="space-y-2">
              <Label htmlFor="activity-from">From</Label>
              <Input id="activity-from" type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="activity-to">To</Label>
              <Input id="activity-to" type="date" value={to} onChange={(event) => setTo(event.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <Card className="border-border/70 bg-card/95 shadow-sm">
          <CardHeader>
            <CardTitle>Activity Timeline</CardTitle>
            <CardDescription>Successful and failed audit events over the last 14 days.</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            {loading ? (
              <div className="flex h-full items-center justify-center gap-2 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                Loading timeline...
              </div>
            ) : data.timeline.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.timeline}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
                  <YAxis tickLine={false} axisLine={false} fontSize={12} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid hsl(var(--border))",
                      background: "hsl(var(--card))",
                      color: "hsl(var(--card-foreground))",
                    }}
                  />
                  <Area type="monotone" dataKey="success" stackId="1" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.25} />
                  <Area type="monotone" dataKey="failed" stackId="1" stroke="#ef4444" fill="#ef4444" fillOpacity={0.22} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center rounded-2xl border border-dashed text-sm text-muted-foreground">
                No timeline data for the selected filters.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/95 shadow-sm">
          <CardHeader>
            <CardTitle>Risk Watch</CardTitle>
            <CardDescription>Latest failed or non-success audit events.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <div className="flex h-48 items-center justify-center gap-2 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                Loading risk events...
              </div>
            ) : data.riskEvents.length ? (
              data.riskEvents.map((event) => (
                <div key={event.id} className="rounded-2xl border bg-background/60 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{event.action}</p>
                      <p className="text-xs text-muted-foreground">{event.resource} by {event.adminName}</p>
                    </div>
                    <Badge className={cn("shrink-0 rounded-full border", statusClass(event.status))}>{event.status}</Badge>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                    <span className="font-mono">{event.ipAddress}</span>
                    <span>{dateLabel(event.createdAt)}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex h-48 items-center justify-center rounded-2xl border border-dashed text-center text-sm text-muted-foreground">
                No failed events for the selected filters.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/70 bg-card/95 shadow-sm">
        <CardHeader>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle>Recent Activities</CardTitle>
              <CardDescription>
                {loading ? "Loading activities..." : `${compact(data.pagination.total)} matching records, showing ${currentStart}-${currentEnd}.`}
              </CardDescription>
            </div>
            <div className="h-36 w-full lg:h-20 lg:w-72">
              {data.facets.resources.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.facets.resources.slice(0, 6)}>
                    <XAxis dataKey="value" hide />
                    <YAxis hide />
                    <Tooltip
                      contentStyle={{
                        borderRadius: 12,
                        border: "1px solid hsl(var(--border))",
                        background: "hsl(var(--card))",
                        color: "hsl(var(--card-foreground))",
                      }}
                    />
                    <Bar dataKey="count" radius={[8, 8, 0, 0]} fill="hsl(var(--primary))" />
                  </BarChart>
                </ResponsiveContainer>
              ) : null}
            </div>
          </div>
        </CardHeader>
        <Separator />
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Resource</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>IP Address</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-32 text-center">
                      <div className="flex items-center justify-center gap-2 text-muted-foreground">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Loading activity logs...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : data.logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                      No activity logs match the selected filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  data.logs.map((log) => {
                    const Icon = getActionIcon(log.action);
                    const severity = getSeverity(log.action, log.status);
                    return (
                      <TableRow key={log.id}>
                        <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{dateLabel(log.createdAt)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted">
                              {log.user === "System" ? <Settings className="h-4 w-4" /> : <User className="h-4 w-4" />}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium">{log.user}</p>
                              <p className="truncate text-xs text-muted-foreground">{log.adminEmail || log.adminRole || "System event"}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex min-w-52 items-center gap-2">
                            <Icon className="h-4 w-4 text-primary" />
                            <span className="text-sm font-medium">{log.action}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <code className="rounded-md bg-muted px-2 py-1 text-xs">{log.resource}</code>
                            {log.resourceId ? <p className="text-xs text-muted-foreground">ID: {log.resourceId}</p> : null}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={cn("rounded-full border", statusClass(log.status))}>{log.status}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={cn("rounded-full border capitalize", severityClass(severity))}>{severity}</Badge>
                        </TableCell>
                        <TableCell className="font-mono text-sm text-muted-foreground">{log.ip}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" className="gap-2" onClick={() => setSelectedLog(log)}>
                            <Eye className="h-4 w-4" />
                            Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
          <div className="flex flex-col gap-3 border-t p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {currentStart}-{currentEnd} of {compact(data.pagination.total)} audit records.
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="rounded-full"
                disabled={loading || data.pagination.offset === 0}
                onClick={() => setOffset(Math.max(0, offset - data.pagination.limit))}
              >
                Previous
              </Button>
              <Button
                size="sm"
                className="rounded-full"
                disabled={loading || !data.pagination.hasMore}
                onClick={() => setOffset(offset + data.pagination.limit)}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={Boolean(selectedLog)} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          {selectedLog ? (
            <>
              <DialogHeader>
                <DialogTitle>Audit Event Details</DialogTitle>
                <DialogDescription>
                  {selectedLog.action} on {selectedLog.resource} at {dateLabel(selectedLog.createdAt)}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border bg-muted/30 p-4">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">Actor</p>
                  <p className="mt-1 font-semibold">{selectedLog.user}</p>
                  <p className="text-sm text-muted-foreground">{selectedLog.adminEmail || selectedLog.adminRole || "System"}</p>
                </div>
                <div className="rounded-2xl border bg-muted/30 p-4">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">Request Context</p>
                  <p className="mt-1 font-mono text-sm">{selectedLog.ip}</p>
                  <p className="text-sm text-muted-foreground">{selectedLog.device}</p>
                </div>
                <div className="rounded-2xl border bg-muted/30 p-4">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">Resource</p>
                  <p className="mt-1 font-semibold">{selectedLog.resource}</p>
                  <p className="break-all text-sm text-muted-foreground">{selectedLog.resourceId || "No resource ID captured"}</p>
                </div>
                <div className="rounded-2xl border bg-muted/30 p-4">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">State</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Badge className={cn("rounded-full border", statusClass(selectedLog.status))}>{selectedLog.status}</Badge>
                    <Badge className={cn("rounded-full border capitalize", severityClass(getSeverity(selectedLog.action, selectedLog.status)))}>
                      {getSeverity(selectedLog.action, selectedLog.status)}
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Changes / Event Payload</Label>
                <pre className="max-h-80 overflow-auto rounded-2xl border bg-muted/40 p-4 text-xs leading-relaxed">
                  {selectedLog.details || "{}"}
                </pre>
              </div>
              <div className="space-y-2">
                <Label>User Agent</Label>
                <p className="break-all rounded-2xl border bg-muted/30 p-4 text-xs text-muted-foreground">
                  {selectedLog.userAgent || "No user agent captured"}
                </p>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
