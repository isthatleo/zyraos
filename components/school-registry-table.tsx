"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowUpDown,
  Building2,
  CreditCard,
  Eye,
  RefreshCw,
  Search,
  Settings,
  SlidersHorizontal,
  TrendingUp,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PLATFORM_SETTINGS_CHANNEL, PLATFORM_SETTINGS_SYNC_EVENT } from "@/lib/platform-settings-sync";
import { cn } from "@/lib/utils";

interface School {
  id: string;
  name: string;
  slug: string;
  country: string;
  type: string;
  status: string;
  currencyCode?: string | null;
  portalUrl?: string;
  createdAt: string;
  planName?: string | null;
  planPrice?: number | string | null;
  planCurrency?: string | null;
  displayPlanPrice?: number | string | null;
  displayCurrency?: string | null;
  conversionAvailable?: boolean;
}

type RegistryStats = {
  total: number;
  active: number;
  inactive: number;
  newThisMonth: number;
  mrr: number;
  currency: string;
  byType: Array<{ type: string; count: number }>;
};

const planColors: Record<string, string> = {
  Free: "bg-muted text-muted-foreground",
  Basic: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  Standard: "bg-primary/10 text-primary",
  Premium: "bg-orange-500/10 text-orange-700 dark:text-orange-300",
};

const statusColors: Record<string, string> = {
  active: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  inactive: "bg-muted text-muted-foreground",
  trial: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
};

function safeCurrency(currency?: string | null) {
  return /^[A-Z]{3}$/.test(String(currency || "")) ? String(currency).toUpperCase() : "ZAR";
}

function formatCurrency(value: number | string | null | undefined, currency?: string | null) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: safeCurrency(currency),
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  sub: string;
}) {
  return (
    <Card className="bg-card/85 backdrop-blur">
      <CardContent className="flex items-start gap-3 p-4">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Icon className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{sub}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export function SchoolRegistryTable() {
  const router = useRouter();
  const [schools, setSchools] = useState<School[]>([]);
  const [stats, setStats] = useState<RegistryStats>({ total: 0, active: 0, inactive: 0, newThisMonth: 0, mrr: 0, currency: "ZAR", byType: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [sortKey, setSortKey] = useState<keyof School>("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const fetchSchools = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (statusFilter !== "all") params.append("status", statusFilter);

      const response = await fetch(`/api/master/schools?${params}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to fetch schools");

      setSchools(data.schools || []);
      setStats({ total: 0, active: 0, inactive: 0, newThisMonth: 0, mrr: 0, currency: "ZAR", byType: [], ...(data.stats || {}) });
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      console.error("Error fetching schools:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchSchools();
  }, [statusFilter]);

  useEffect(() => {
    const refresh = () => void fetchSchools();
    window.addEventListener(PLATFORM_SETTINGS_SYNC_EVENT, refresh);
    const channel = "BroadcastChannel" in window ? new BroadcastChannel(PLATFORM_SETTINGS_CHANNEL) : null;
    channel?.addEventListener("message", refresh);
    return () => {
      window.removeEventListener(PLATFORM_SETTINGS_SYNC_EVENT, refresh);
      channel?.close();
    };
  }, [statusFilter]);

  const schoolTypes = useMemo(() => Array.from(new Set(schools.map((school) => school.type).filter(Boolean))).sort(), [schools]);

  const filteredSchools = useMemo(() => {
    const search = searchTerm.toLowerCase();
    return schools
      .filter((school) => {
        const matchesSearch =
          school.name.toLowerCase().includes(search) ||
          school.slug.toLowerCase().includes(search) ||
          school.country.toLowerCase().includes(search);
        const matchesType = typeFilter === "all" || school.type === typeFilter;
        return matchesSearch && matchesType;
      })
      .sort((a, b) => {
        const left = String(a[sortKey] || "");
        const right = String(b[sortKey] || "");
        const result = sortKey === "createdAt" ? new Date(left).getTime() - new Date(right).getTime() : left.localeCompare(right);
        return sortDir === "asc" ? result : -result;
      });
  }, [schools, searchTerm, typeFilter, sortKey, sortDir]);

  const toggleSort = (key: keyof School) => {
    if (sortKey === key) {
      setSortDir((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDir("asc");
  };

  if (error) {
    return (
      <Card className="border-destructive/30 bg-destructive/10">
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <div>
              <h3 className="text-sm font-medium text-destructive">Error loading schools</h3>
              <p className="mt-1 text-sm text-muted-foreground">{error}</p>
            </div>
          </div>
          <Button onClick={() => void fetchSchools()} variant="outline" size="sm" className="mt-4">
            <RefreshCw className="mr-2 h-4 w-4" />
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Building2} label="Total Schools" value={loading ? "..." : stats.total} sub={`${stats.active} active tenants`} />
        <StatCard icon={TrendingUp} label="New This Month" value={loading ? "..." : stats.newThisMonth} sub="Provisioned in current month" />
        <StatCard icon={CreditCard} label="Estimated MRR" value={loading ? "..." : formatCurrency(stats.mrr, stats.currency)} sub={`Active subscription value in ${safeCurrency(stats.currency)}`} />
        <StatCard icon={SlidersHorizontal} label="School Types" value={loading ? "..." : stats.byType.length} sub="Education levels represented" />
      </div>

      <Card className="bg-card/85 shadow-sm backdrop-blur">
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle>School Registry</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">Search, filter, review, and manage every provisioned tenant.</p>
            </div>
            <Badge variant="outline" className="w-fit rounded-full">
              {loading ? "Loading..." : `${filteredSchools.length} shown / ${stats.total} total`}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="min-w-64 flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search schools, slug, or country..."
                  className="rounded-full pl-10"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                />
              </div>
            </div>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="h-10 rounded-full border border-input bg-background px-3 text-sm"
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="trial">Trial</option>
            </select>

            <select
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value)}
              className="h-10 rounded-full border border-input bg-background px-3 text-sm"
            >
              <option value="all">All types</option>
              {schoolTypes.map((type) => (
                <option key={type} value={type}>{type.replace(/_/g, " ")}</option>
              ))}
            </select>

            <Button variant="outline" size="sm" onClick={() => void fetchSchools()} disabled={loading}>
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
              Refresh
            </Button>
          </div>

          <div className="overflow-x-auto rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="min-w-56">
                    <button className="inline-flex items-center gap-1 font-semibold" onClick={() => toggleSort("name")}>
                      School Name <ArrowUpDown className="size-3" />
                    </button>
                  </TableHead>
                  <TableHead>Domain</TableHead>
                  <TableHead>
                    <button className="inline-flex items-center gap-1 font-semibold" onClick={() => toggleSort("type")}>
                      Type <ArrowUpDown className="size-3" />
                    </button>
                  </TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>
                    <button className="inline-flex items-center gap-1 font-semibold" onClick={() => toggleSort("createdAt")}>
                      Created <ArrowUpDown className="size-3" />
                    </button>
                  </TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  [1, 2, 3, 4].map((row) => (
                    <TableRow key={row}>
                      <TableCell colSpan={7}><Skeleton className="h-10 w-full" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredSchools.length > 0 ? (
                  filteredSchools.map((school) => (
                    <TableRow key={school.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{school.name}</p>
                          <p className="text-xs text-muted-foreground">{school.country}{school.currencyCode ? ` / ${school.currencyCode}` : ""}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="rounded bg-muted px-2 py-1 text-xs text-muted-foreground">{school.portalUrl || school.slug}</code>
                      </TableCell>
                      <TableCell className="capitalize">{school.type?.replace(/_/g, " ")}</TableCell>
                      <TableCell>
                        {school.planName ? (
                          <Badge className={cn("rounded-full", planColors[school.planName] || "bg-muted text-muted-foreground")}>
                            {school.planName}
                            {Number(school.displayPlanPrice ?? school.planPrice ?? 0) > 0
                              ? ` - ${formatCurrency(school.displayPlanPrice ?? school.planPrice, school.displayCurrency ?? school.planCurrency)}`
                              : ""}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="rounded-full">No Plan</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={cn("rounded-full capitalize", statusColors[school.status] || statusColors.inactive)}>{school.status}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{new Date(school.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => window.open(school.portalUrl || `/master/schools/${school.id}`, "_blank", "noopener,noreferrer")}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm" className="gap-2" onClick={() => router.push(`/master/schools/${school.id}`)}>
                            <Settings className="h-4 w-4" />
                            Manage
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                      {searchTerm ? "No schools found matching your search." : "No schools found."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
