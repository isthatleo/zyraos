"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { AlertCircle, ArrowLeft, CalendarDays, ClipboardList, Download, Loader2, MoreHorizontal, Plus, RefreshCw, Search, ShieldAlert, UserCheck, Users } from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { getTenantSubdomain } from "@/lib/tenant-routing";
import { cn } from "@/lib/utils";

type AdmissionClass = {
  id: string;
  name: string;
  grade: string;
  section: string;
  academicYear: string;
  capacity: number;
  enrolled: number;
  seatsAvailable: number | null;
};

type AdmissionStudent = {
  id: string;
  applicationId: string;
  admissionNumber: string;
  name: string;
  email: string;
  phone: string;
  classId: string;
  className: string;
  academicYear: string;
  status: string;
  pipelineState: string;
  createdAt: string | null;
  enrollmentDate: string | null;
  guardian: { name: string; relationship: string; contact: string; email: string };
};

type AdmissionsData = {
  generatedAt: string;
  nextApplicationId: string;
  nextAdmissionNumber: string;
  school: { id: string; name: string; slug: string; type: string; country: string; currencyCode: string };
  settings: { schoolCode: string; admissionNumberFormat: string };
  summary: { total: number; active: number; pending: number; waitlisted: number; suspended: number; thisMonth: number };
  classes: AdmissionClass[];
  students: AdmissionStudent[];
};

function compactNumber(value: number) {
  return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(value || 0);
}

function formatDate(value: string | null) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

function statusClass(status: string) {
  const value = status.toLowerCase();
  if (["active", "enrolled"].includes(value)) return "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  if (["waitlisted"].includes(value)) return "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300";
  if (["suspended", "rejected"].includes(value)) return "border-destructive/25 bg-destructive/10 text-destructive";
  return "border-primary/25 bg-primary/10 text-primary";
}

function classLabel(item: AdmissionClass) {
  return [item.name, item.section && !item.name.toLowerCase().includes(item.section.toLowerCase()) ? item.section : ""].filter(Boolean).join(" ");
}

function AdmissionsShellHeader({ onRefresh, refreshing }: { onRefresh?: () => void; refreshing?: boolean }) {
  return (
    <section className="overflow-hidden rounded-3xl border bg-card shadow-sm">
      <div className="p-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className="rounded-full border-primary/25 bg-primary/10 text-primary">School Admin</Badge>
          <Badge variant="outline" className="rounded-full">Admissions pipeline</Badge>
        </div>
        <h1 className="mt-4 text-3xl font-bold tracking-tight md:text-4xl">Admissions</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          Loading applicant records, class capacity, admission numbers, and enrollment workflow controls.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Button onClick={() => {}} disabled>
            New Admission
            <Plus className="size-4" />
          </Button>
          <Button variant="ghost" onClick={onRefresh} disabled={!onRefresh || refreshing}>
            {refreshing ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
            Refresh
          </Button>
        </div>
      </div>
    </section>
  );
}

function LoadingAdmissions({ onRefresh, refreshing }: { onRefresh?: () => void; refreshing?: boolean }) {
  return (
    <div className="space-y-6">
      <AdmissionsShellHeader onRefresh={onRefresh} refreshing={refreshing} />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} className="h-32 rounded-3xl" />)}
      </div>
      <Skeleton className="h-96 rounded-3xl" />
    </div>
  );
}

export default function AdminAdmissionsPage() {
  const router = useRouter();
  const params = useParams<{ tenant?: string }>();
  const tenantSlug = String(params?.tenant || "");
  const [isTenantSubdomain, setIsTenantSubdomain] = React.useState(false);
  const [data, setData] = React.useState<AdmissionsData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");
  const [status, setStatus] = React.useState("all");
  const [classId, setClassId] = React.useState("all");

  React.useEffect(() => {
    setIsTenantSubdomain(Boolean(getTenantSubdomain(window.location.hostname)));
  }, []);

  const tenantHref = React.useCallback((href: string) => {
    if (isTenantSubdomain || !tenantSlug) return href;
    return href.startsWith("/") ? `/${tenantSlug}${href}` : `/${tenantSlug}/${href}`;
  }, [isTenantSubdomain, tenantSlug]);

  const loadAdmissions = React.useCallback(async (mode: "initial" | "refresh" = "initial") => {
    if (!tenantSlug) return;
    if (mode === "refresh") setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams({ slug: tenantSlug, status, classId, search });
      const response = await fetch(`/api/tenant/admin/admissions?${query.toString()}`, { cache: "no-store", credentials: "include" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || "Failed to load admissions.");
      setData(payload as AdmissionsData);
      if (mode === "refresh") toast.success("Admissions refreshed");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load admissions.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [classId, search, status, tenantSlug]);

  React.useEffect(() => {
    const handle = window.setTimeout(() => void loadAdmissions(), 250);
    return () => window.clearTimeout(handle);
  }, [loadAdmissions]);

  function openNewAdmissionPage() {
    router.push(tenantHref("/admin/admissions/new"));
  }

  async function updatePipeline(student: AdmissionStudent, pipelineState: string, nextStatus = student.status) {
    setSaving(true);
    try {
      const response = await fetch(`/api/tenant/admin/admissions?slug=${encodeURIComponent(tenantSlug)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ studentId: student.id, applicationId: student.applicationId, status: nextStatus, classId: student.classId, pipelineState }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || "Failed to update pipeline");
      toast.success("Application pipeline updated");
      await loadAdmissions("refresh");
    } catch (pipelineError) {
      toast.error(pipelineError instanceof Error ? pipelineError.message : "Failed to update pipeline");
    } finally {
      setSaving(false);
    }
  }

  function exportCsv() {
    if (!data?.students.length) {
      toast.info("No admissions to export");
      return;
    }
    const headers = ["Application ID", "Admission Number", "Applicant", "Email", "Phone", "Class", "Parent/Guardian", "Date", "Status"];
    const lines = data.students.map((student) => [
      student.applicationId || "",
      student.admissionNumber,
      student.name,
      student.email,
      student.phone,
      student.className || "Unassigned",
      student.guardian?.name || "",
      formatDate(student.createdAt),
      student.pipelineState || student.status,
    ]);
    const csv = [headers, ...lines].map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${tenantSlug}-admissions.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  if (loading) return <LoadingAdmissions onRefresh={() => loadAdmissions()} refreshing={refreshing} />;

  if (error || !data) {
    return (
      <div className="space-y-6">
        <AdmissionsShellHeader onRefresh={() => loadAdmissions()} refreshing={refreshing} />
        <Alert variant="destructive" className="rounded-3xl">
          <AlertCircle className="size-4" />
          <AlertTitle>Admissions failed to load</AlertTitle>
          <AlertDescription className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <span>{error || "No admissions data was returned."}</span>
            <Button variant="secondary" onClick={() => loadAdmissions()}>Retry</Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const summaryCards = [
    { title: "Applications", value: data.summary.total, icon: Users, tone: "text-primary" },
    { title: "Accepted/Active", value: data.summary.active, icon: UserCheck, tone: "text-emerald-600" },
    { title: "Pending Review", value: data.summary.pending, icon: ClipboardList, tone: "text-primary" },
    { title: "Waitlisted", value: data.summary.waitlisted, icon: ShieldAlert, tone: "text-amber-600" },
    { title: "This Month", value: data.summary.thisMonth, icon: CalendarDays, tone: "text-primary" },
  ];

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-3xl border bg-card shadow-sm">
        <div className="grid gap-6 p-6 xl:grid-cols-[1fr_360px]">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="rounded-full border-primary/25 bg-primary/10 text-primary">School Admin</Badge>
              <Badge variant="outline" className="rounded-full">{data.school.name}</Badge>
              <Badge variant="outline" className="rounded-full">Code {data.settings.schoolCode}</Badge>
              <Badge variant="outline" className="rounded-full">Next {data.nextApplicationId}</Badge>
            </div>
            <h1 className="mt-4 text-3xl font-bold tracking-tight md:text-4xl">Admissions</h1>
            <p className="mt-2 max-w-3xl text-sm text-muted-foreground">Manage applications, parent/guardian records, pipeline status, class assignment, and enrollment decisions for this tenant.</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Button onClick={openNewAdmissionPage}><Plus className="size-4" />New Admission</Button>
              <Button variant="outline" onClick={() => router.push(tenantHref("/admin/dashboard"))}><ArrowLeft className="size-4" />Dashboard</Button>
              <Button variant="ghost" onClick={() => loadAdmissions("refresh")} disabled={refreshing}>{refreshing ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}Refresh</Button>
            </div>
          </div>

          <Card className="border-primary/20 bg-primary/5">
            <CardHeader><CardTitle className="text-base">Admission Numbering</CardTitle><CardDescription>Driven by school settings and tenant school code.</CardDescription></CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-2xl border bg-card p-4"><p className="text-xs text-muted-foreground">Next application ID</p><p className="mt-1 break-all text-lg font-bold">{data.nextApplicationId}</p></div>
              <div className="rounded-2xl border bg-card p-4"><p className="text-xs text-muted-foreground">Next admission number</p><p className="mt-1 break-all text-lg font-bold">{data.nextAdmissionNumber}</p></div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return <Card key={card.title}><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3"><CardTitle className="text-sm font-semibold text-muted-foreground">{card.title}</CardTitle><Icon className={cn("size-5", card.tone)} /></CardHeader><CardContent><p className="text-3xl font-bold">{compactNumber(card.value)}</p></CardContent></Card>;
        })}
      </section>

      <section className="grid gap-5 xl:grid-cols-[1fr_340px]">
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div><CardTitle>Admissions Records</CardTitle><CardDescription>Application ID, applicant, grade, parent/guardian, date, status, and actions.</CardDescription></div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={exportCsv}><Download className="size-4" />Export CSV</Button>
                <Button onClick={openNewAdmissionPage}><Plus className="size-4" />New Admission</Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-[1fr_180px_220px]">
              <div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search app ID, name, email, phone..." className="pl-9" /></div>
              <Select value={status} onValueChange={setStatus}><SelectTrigger className="w-full"><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="all">All statuses</SelectItem><SelectItem value="pending">Pending</SelectItem><SelectItem value="active">Active</SelectItem><SelectItem value="waitlisted">Waitlisted</SelectItem><SelectItem value="suspended">Suspended</SelectItem></SelectContent></Select>
              <Select value={classId} onValueChange={setClassId}><SelectTrigger className="w-full"><SelectValue placeholder="Class" /></SelectTrigger><SelectContent><SelectItem value="all">All classes</SelectItem>{data.classes.map((item) => <SelectItem key={item.id} value={item.id}>{classLabel(item)}</SelectItem>)}</SelectContent></Select>
            </div>

            <div className="space-y-3">
              {data.students.length ? data.students.map((student) => (
                <div key={student.id} className="grid gap-3 rounded-3xl border bg-card p-4 transition-colors hover:border-primary/40 xl:grid-cols-[150px_1.2fr_1fr_1fr_130px_130px_56px] xl:items-center">
                  <div><p className="font-bold">{student.applicationId || "Legacy"}</p><p className="text-xs text-muted-foreground">{student.admissionNumber}</p></div>
                  <div className="min-w-0"><p className="truncate text-base font-bold">{student.name}</p><p className="truncate text-xs text-muted-foreground">{student.email || student.phone || "No contact"}</p></div>
                  <div><p className="font-medium">{student.className || "Unassigned"}</p><p className="text-xs text-muted-foreground">{student.academicYear || "No academic year"}</p></div>
                  <div><p className="font-medium">{student.guardian?.name || "No parent/guardian"}</p><p className="text-xs capitalize text-muted-foreground">{student.guardian?.relationship || "guardian"}</p></div>
                  <p className="text-xs text-muted-foreground">{formatDate(student.createdAt)}</p>
                  <Badge className={cn("w-fit rounded-full capitalize", statusClass(student.pipelineState || student.status))}>{student.pipelineState || student.status}</Badge>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" disabled={saving}><MoreHorizontal className="size-4" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => router.push(tenantHref(`/admin/admissions/${student.applicationId || student.id}`))}>View Details</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => updatePipeline(student, "review")}>Under Review</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => updatePipeline(student, "docs_missing")}>Docs Missing</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => updatePipeline(student, "interview")}>Interview Set</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => updatePipeline(student, "tested")}>Interview Done / Tested</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => updatePipeline(student, "accepted")}>Accepted</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => updatePipeline(student, "payment")}>Payment</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => updatePipeline(student, "enrolled", "active")}>Enroll Student</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => updatePipeline(student, "waitlisted", "waitlisted")}>Waitlist</DropdownMenuItem>
                      <DropdownMenuItem variant="destructive" onClick={() => updatePipeline(student, "rejected", "suspended")}>Rejected / Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )) : (
                <div className="flex min-h-72 flex-col items-center justify-center rounded-3xl border border-dashed bg-muted/30 p-8 text-center">
                  <Users className="mb-3 size-10 text-primary" />
                  <p className="text-lg font-bold">No admissions found</p>
                  <p className="mt-1 max-w-md text-sm text-muted-foreground">Create the first admission application or adjust your search and filters.</p>
                  <Button className="mt-4" onClick={openNewAdmissionPage}><Plus className="size-4" />New Admission</Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Class Capacity</CardTitle><CardDescription>Current active enrollment by class.</CardDescription></CardHeader>
          <CardContent className="space-y-3">
            {data.classes.length ? data.classes.map((item) => {
              const used = item.capacity ? Math.round((item.enrolled / item.capacity) * 100) : 0;
              return (
                <button key={item.id} type="button" onClick={() => setClassId(item.id)} className="w-full rounded-2xl border bg-card p-4 text-left transition-colors hover:border-primary/40">
                  <div className="flex items-center justify-between gap-3"><div><p className="font-semibold">{classLabel(item)}</p><p className="text-xs text-muted-foreground">{item.academicYear || "Academic year not set"}</p></div><Badge variant="outline" className="rounded-full">{item.enrolled}/{item.capacity || "∞"}</Badge></div>
                  <Progress value={Math.min(used, 100)} className="mt-3 h-2" />
                  <p className="mt-2 text-xs text-muted-foreground">{item.seatsAvailable === null ? "Unlimited capacity" : `${item.seatsAvailable} seats available`}</p>
                </button>
              );
            }) : (
              <Alert className="rounded-2xl"><AlertCircle className="size-4" /><AlertTitle>No classes configured</AlertTitle><AlertDescription>Create classes before assigning admitted students.</AlertDescription></Alert>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
