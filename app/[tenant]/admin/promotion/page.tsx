"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowRight, CheckCircle2, Download, FileJson, GraduationCap, Loader2, Search, ShieldAlert, TrendingUp, Users } from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { getTenantSubdomain } from "@/lib/tenant-routing";

type ClassOption = { id: string; name: string; grade: string; section: string; enrolled: number; capacity: number; seatsAvailable: number | null };
type Student = {
  id: string;
  name: string;
  admissionNumber: string;
  status: string;
  classId: string;
  className: string;
  grade: string;
  guardian: { name: string; phone: string };
  academics: { attendanceRate: number; performanceAverage: number; gradesCount: number; attendanceCount: number };
  readiness: { eligible: boolean; warnings: string[] };
};
type Payload = {
  generatedAt: string;
  students: Student[];
  classes: ClassOption[];
  policy: { attendanceThreshold: number; performanceThreshold: number; capacityEnforced: boolean; overrideWarningsAllowed: boolean };
  summary: { candidates: number; eligible: number; review: number; active: number; graduated: number; pending: number; suspended: number };
};

function tenantPath(tenant: string, path: string) {
  return `/${tenant}${path.startsWith("/") ? path : `/${path}`}`;
}

export default function AdminPromotionPage() {
  const params = useParams<{ tenant: string }>();
  const tenant = params?.tenant || getTenantSubdomain(typeof window !== "undefined" ? window.location.host : "") || "";
  const [data, setData] = React.useState<Payload | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [fromClass, setFromClass] = React.useState("all");
  const [targetClass, setTargetClass] = React.useState("");
  const [selected, setSelected] = React.useState<string[]>([]);
  const [overrideWarnings, setOverrideWarnings] = React.useState(false);
  const [effectiveDate, setEffectiveDate] = React.useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = React.useState("");

  const loadData = React.useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const query = new URLSearchParams({ tenant });
      if (search.trim()) query.set("search", search.trim());
      if (fromClass !== "all") query.set("classId", fromClass);
      const response = await fetch(`/api/tenant/admin/promotion?${query.toString()}`, { cache: "no-store" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Failed to load promotion data");
      setData(payload);
      setSelected((prev) => prev.filter((id) => payload.students?.some((student: Student) => student.id === id)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load promotion data");
    } finally {
      setLoading(false);
    }
  }, [fromClass, search, tenant]);

  React.useEffect(() => {
    const timer = window.setTimeout(loadData, 180);
    return () => window.clearTimeout(timer);
  }, [loadData]);

  const candidates = (data?.students || []).filter((student) => student.status !== "graduated" && student.status !== "withdrawn");
  const eligible = candidates.filter((student) => student.readiness.eligible);
  const selectedStudents = candidates.filter((student) => selected.includes(student.id));
  const target = data?.classes.find((item) => item.id === targetClass);

  function toggleStudent(id: string) {
    setSelected((prev) => prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]);
  }

  async function runPromotion(graduate = false) {
    if (!selected.length) {
      toast.error("Select at least one student");
      return;
    }
    if (!graduate && !targetClass) {
      toast.error("Select the target class");
      return;
    }
    setBusy(true);
    try {
      const response = await fetch(`/api/tenant/admin/promotion?tenant=${encodeURIComponent(tenant)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentIds: selected, targetClassId: targetClass, graduate, overrideWarnings, effectiveDate, notes }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Promotion failed");
      toast.success(graduate ? "Selected students graduated" : "Selected students promoted");
      setSelected([]);
      await loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Promotion failed");
    } finally {
      setBusy(false);
    }
  }

  async function exportData(format: "csv" | "json") {
    try {
      const query = new URLSearchParams({ tenant, export: format });
      if (search.trim()) query.set("search", search.trim());
      if (fromClass !== "all") query.set("classId", fromClass);
      const response = await fetch(`/api/tenant/admin/promotion?${query.toString()}`, { cache: "no-store" });
      const blob = await response.blob();
      if (!response.ok) throw new Error(await blob.text().catch(() => "Export failed"));
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${tenant}-promotion-candidates.${format}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast.success(`Promotion ${format.toUpperCase()} exported`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Export failed");
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Badge variant="outline" className="rounded-full">Academic progression</Badge>
            <h1 className="mt-3 text-3xl font-bold tracking-tight">Promotion</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">Review promotion readiness, move students to the next class, or graduate final-year students with audited progression records.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => exportData("csv")} disabled={loading}><Download className="mr-2 h-4 w-4" />CSV</Button>
            <Button variant="outline" onClick={() => exportData("json")} disabled={loading}><FileJson className="mr-2 h-4 w-4" />JSON</Button>
            <Button variant="outline" onClick={loadData} disabled={loading}>{loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Refresh</Button>
          </div>
        </div>
      </section>

      {error ? <Alert variant="destructive"><ShieldAlert className="h-4 w-4" /><AlertTitle>Promotion data unavailable</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}

      <div className="grid gap-3 md:grid-cols-4">
        <Card className="border-2"><CardContent className="p-5"><Users className="h-8 w-8 text-orange-500" /><p className="mt-4 text-xs font-bold uppercase text-muted-foreground">Candidates</p><p className="text-3xl font-bold">{data?.summary.candidates ?? candidates.length}</p></CardContent></Card>
        <Card className="border-2"><CardContent className="p-5"><CheckCircle2 className="h-8 w-8 text-emerald-500" /><p className="mt-4 text-xs font-bold uppercase text-muted-foreground">Eligible</p><p className="text-3xl font-bold">{data?.summary.eligible ?? eligible.length}</p></CardContent></Card>
        <Card className="border-2"><CardContent className="p-5"><GraduationCap className="h-8 w-8 text-blue-500" /><p className="mt-4 text-xs font-bold uppercase text-muted-foreground">Graduated</p><p className="text-3xl font-bold">{data?.summary.graduated || 0}</p></CardContent></Card>
        <Card className="border-2"><CardContent className="p-5"><TrendingUp className="h-8 w-8 text-purple-500" /><p className="mt-4 text-xs font-bold uppercase text-muted-foreground">Selected</p><p className="text-3xl font-bold">{selected.length}</p></CardContent></Card>
      </div>

      <Card className="border-2">
        <CardHeader>
          <CardTitle className="text-2xl">Promotion Controls</CardTitle>
          <CardDescription>Capacity is enforced server-side. Students below attendance or performance policy require an explicit override.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-[1fr_180px_220px]">
          <div>
            <p className="text-xs font-bold uppercase text-muted-foreground">Operation notes</p>
            <Input value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Promotion reason, policy reference, or graduation notes" className="mt-2" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase text-muted-foreground">Effective date</p>
            <Input type="date" value={effectiveDate} onChange={(event) => setEffectiveDate(event.target.value)} className="mt-2" />
          </div>
          <label className="flex items-center gap-3 rounded-2xl border p-4 text-sm">
            <Checkbox checked={overrideWarnings} onCheckedChange={(value) => setOverrideWarnings(Boolean(value))} />
            <span><span className="font-semibold">Override warnings</span><span className="block text-xs text-muted-foreground">Required for attendance/performance exceptions.</span></span>
          </label>
        </CardContent>
      </Card>

      <Card className="border-2">
        <CardHeader>
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div><CardTitle className="text-2xl">Promotion Workspace</CardTitle><CardDescription>Select learners, choose a target class, then promote or graduate them.</CardDescription></div>
            <div className="grid gap-2 md:grid-cols-[220px_200px_260px]">
              <div className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search..." className="pl-9" /></div>
              <Select value={fromClass} onValueChange={setFromClass}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All source classes</SelectItem>{data?.classes.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select>
              <Select value={targetClass || "none"} onValueChange={(value) => setTargetClass(value === "none" ? "" : value)}><SelectTrigger><SelectValue placeholder="Target class" /></SelectTrigger><SelectContent><SelectItem value="none">Select target</SelectItem>{data?.classes.map((item) => <SelectItem key={item.id} value={item.id}>{item.name} {item.seatsAvailable === null ? "" : `(${item.seatsAvailable} seats)`}</SelectItem>)}</SelectContent></Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-2xl border bg-muted/30 p-4 text-sm text-muted-foreground">
            {selected.length ? `${selected.length} selected. ${selectedStudents.filter((student) => !student.readiness.eligible).length} need override review.` : "Select students to run a promotion or graduation operation."}
            {target ? ` Target: ${target.name}${target.seatsAvailable === null ? "" : `, ${target.seatsAvailable} seats available`}.` : ""}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setSelected(eligible.map((student) => student.id))} variant="outline">Select Eligible</Button>
            <Button onClick={() => setSelected(candidates.map((student) => student.id))} variant="outline">Select All Filtered</Button>
            <Button onClick={() => setSelected([])} variant="outline">Clear</Button>
            <Button onClick={() => runPromotion(false)} disabled={busy || !selected.length} className="bg-orange-600 text-white hover:bg-orange-700">{busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRight className="mr-2 h-4 w-4" />}Promote Selected</Button>
            <Button onClick={() => runPromotion(true)} disabled={busy || !selected.length} variant="secondary"><GraduationCap className="mr-2 h-4 w-4" />Graduate Selected</Button>
          </div>
          {loading ? Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} className="h-24 rounded-2xl" />) : candidates.length ? candidates.map((student) => {
            const isEligible = student.readiness.eligible;
            return (
              <div key={student.id} className="grid gap-4 rounded-2xl border p-4 lg:grid-cols-[32px_1fr_220px_220px_150px] lg:items-center">
                <Checkbox checked={selected.includes(student.id)} onCheckedChange={() => toggleStudent(student.id)} />
                <div>
                  <h3 className="font-bold">{student.name}</h3>
                  <p className="text-sm text-muted-foreground">{student.admissionNumber || "No admission number"} - {student.className || "Unassigned"} - {student.guardian.name || "No guardian"}</p>
                  {student.readiness.warnings.length ? <p className="mt-1 text-xs font-medium text-amber-700">{student.readiness.warnings.join("; ")}</p> : null}
                </div>
                <div><p className="text-xs font-bold uppercase text-muted-foreground">Performance</p><Progress value={student.academics.performanceAverage} className="mt-2" /><p className="mt-1 text-xs text-muted-foreground">{student.academics.performanceAverage}% average</p></div>
                <div><p className="text-xs font-bold uppercase text-muted-foreground">Attendance</p><Progress value={student.academics.attendanceRate} className="mt-2" /><p className="mt-1 text-xs text-muted-foreground">{student.academics.attendanceRate.toFixed(0)}% attendance</p></div>
                <div className="flex gap-2 lg:justify-end"><Badge variant="outline" className={isEligible ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-700" : "border-amber-500/25 bg-amber-500/10 text-amber-700"}>{isEligible ? "Eligible" : "Review"}</Badge><Button asChild size="sm" variant="ghost"><Link href={tenantPath(tenant, `/admin/students/${student.id}`)}>View</Link></Button></div>
              </div>
            );
          }) : <div className="rounded-2xl border border-dashed p-10 text-center text-sm text-muted-foreground">No promotion candidates found.</div>}
        </CardContent>
      </Card>
    </div>
  );
}
