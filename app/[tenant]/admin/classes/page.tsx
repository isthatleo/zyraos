"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { BookOpen, Download, Edit3, Loader2, Plus, RefreshCw, Search, ShieldCheck, Trash2, Users } from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

type ClassRow = { id: string; name: string; grade: string; section: string; academicYearId: string; academicYear: string; teacherId: string; teacherName: string; capacity: number; enrolled: number; seatsAvailable: number | null; curriculumMaps: number; timetableEntries: number; locked: boolean; capacityUsed: number };
type Teacher = { id: string; name: string; email: string; employeeId: string; position: string };
type Year = { id: string; name: string; isCurrent: boolean };
type Payload = { summary: { classes: number; capacity: number; enrolled: number; available: number; assignedTeachers: number; timetableLinked: number; curriculumLinked: number; locked: number }; classes: ClassRow[]; teachers: Teacher[]; academicYears: Year[]; school: { name: string } };

const emptyForm = { id: "", name: "", grade: "", section: "", academicYearId: "", academicYear: "", teacherId: "", capacity: "" };

export default function AdminClassesPage() {
  const params = useParams<{ tenant: string }>();
  const tenant = params?.tenant || "";
  const [data, setData] = React.useState<Payload | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [yearId, setYearId] = React.useState("all");
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState(emptyForm);
  const endpoint = React.useCallback((extra = "") => `/api/tenant/admin/classes?tenant=${encodeURIComponent(tenant)}${extra}`, [tenant]);

  const load = React.useCallback(async () => {
    if (!tenant) return;
    setLoading(true);
    setError("");
    try {
      const query = new URLSearchParams();
      if (yearId !== "all") query.set("yearId", yearId);
      if (search.trim()) query.set("query", search.trim());
      const response = await fetch(endpoint(query.toString() ? `&${query}` : ""), { cache: "no-store", credentials: "include" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Failed to load classes");
      setData(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load classes");
    } finally {
      setLoading(false);
    }
  }, [endpoint, search, tenant, yearId]);

  React.useEffect(() => { void load(); }, [load]);

  function startCreate() {
    setForm({ ...emptyForm, academicYearId: data?.academicYears[0]?.id || "", academicYear: data?.academicYears[0]?.name || String(new Date().getFullYear()) });
    setOpen(true);
  }

  function startEdit(row: ClassRow) {
    setForm({ id: row.id, name: row.name, grade: row.grade, section: row.section, academicYearId: row.academicYearId, academicYear: row.academicYear, teacherId: row.teacherId, capacity: String(row.capacity || "") });
    setOpen(true);
  }

  async function saveClass() {
    setSaving(true);
    try {
      const response = await fetch(endpoint(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "class.upsert", ...form, capacity: Number(form.capacity || 0) }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Failed to save class");
      setData(payload);
      setOpen(false);
      toast.success(form.id ? "Class updated" : "Class created");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save class");
    } finally {
      setSaving(false);
    }
  }

  async function deleteClass(row: ClassRow) {
    if (!window.confirm(`Delete ${row.name}? Classes in use cannot be deleted.`)) return;
    const response = await fetch(endpoint(`&id=${encodeURIComponent(row.id)}`), { method: "DELETE", credentials: "include" });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) return toast.error(payload.error || "Failed to delete class");
    setData(payload);
    toast.success("Class deleted");
  }

  function exportClasses(format: "csv" | "json") {
    const query = new URLSearchParams({ export: format });
    if (yearId !== "all") query.set("yearId", yearId);
    if (search.trim()) query.set("query", search.trim());
    window.open(endpoint(`&${query}`), "_blank", "noopener,noreferrer");
  }

  const classes = (data?.classes || []).filter((item) => [item.name, item.grade, item.section, item.teacherName].join(" ").toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border bg-card p-6 shadow-sm">
        <Badge variant="outline" className="rounded-full">Academics</Badge>
        <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div><h1 className="text-3xl font-black tracking-tight">Classes</h1><p className="mt-2 text-sm text-muted-foreground">Create classes, assign class teachers, manage capacity, and track enrollment.</p></div>
          <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => void load()}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button><Button variant="outline" onClick={() => exportClasses("csv")}><Download className="mr-2 h-4 w-4" />CSV</Button><Button variant="outline" onClick={() => exportClasses("json")}><Download className="mr-2 h-4 w-4" />JSON</Button><Button onClick={startCreate} className="bg-orange-600 text-white hover:bg-orange-700"><Plus className="mr-2 h-4 w-4" />Add Class</Button></div>
        </div>
      </section>
      {error ? <Alert variant="destructive"><AlertTitle>Classes unavailable</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}
      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Metric icon={BookOpen} label="Classes" value={data?.summary.classes || 0} />
        <Metric icon={Users} label="Students" value={data?.summary.enrolled || 0} />
        <Metric icon={Users} label="Capacity" value={data?.summary.capacity || 0} />
        <Metric icon={Users} label="Available" value={data?.summary.available || 0} />
        <Metric icon={Users} label="Teachers" value={data?.summary.assignedTeachers || 0} />
        <Metric icon={ShieldCheck} label="Protected" value={data?.summary.locked || 0} />
      </div>
      <Card className="border-2">
        <CardHeader><div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"><div><CardTitle className="text-2xl">Class Register</CardTitle><CardDescription>Tenant classes loaded from the real classes table.</CardDescription></div><div className="grid gap-2 md:grid-cols-[220px_260px]"><Select value={yearId} onValueChange={setYearId}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All academic years</SelectItem>{data?.academicYears.map((year) => <SelectItem key={year.id} value={year.id}>{year.name}</SelectItem>)}</SelectContent></Select><div className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search classes..." className="pl-9" /></div></div></div></CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-2">
          {loading ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-3xl" />) : classes.map((row) => (
            <div key={row.id} className="rounded-3xl border bg-muted/10 p-5">
              <div className="flex items-start justify-between gap-3"><div><h3 className="text-xl font-black">{row.name}</h3><p className="text-sm text-muted-foreground">{row.grade} {row.section} · {row.academicYear}</p></div><Badge variant="outline" className="rounded-full">{row.enrolled}/{row.capacity || "∞"}</Badge></div>
              <div className="mt-4"><Progress value={row.capacity ? Math.min((row.enrolled / row.capacity) * 100, 100) : 0} /><p className="mt-2 text-sm text-muted-foreground">Class teacher: {row.teacherName || "Unassigned"} · Curriculum maps {row.curriculumMaps} · Timetable periods {row.timetableEntries}</p></div>
              <div className="mt-5 flex flex-wrap gap-2"><Button variant="outline" onClick={() => startEdit(row)}><Edit3 className="mr-2 h-4 w-4" />Edit</Button><Button variant="destructive" disabled={row.locked} onClick={() => deleteClass(row)}>{row.locked ? <ShieldCheck className="mr-2 h-4 w-4" /> : <Trash2 className="mr-2 h-4 w-4" />}{row.locked ? "Protected" : "Delete"}</Button></div>
            </div>
          ))}
        </CardContent>
      </Card>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>{form.id ? "Edit Class" : "Add Class"}</DialogTitle></DialogHeader>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Class Name"><Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} /></Field>
            <Field label="Grade"><Input value={form.grade} onChange={(e) => setForm((p) => ({ ...p, grade: e.target.value }))} /></Field>
            <Field label="Section / Stream"><Input value={form.section} onChange={(e) => setForm((p) => ({ ...p, section: e.target.value }))} /></Field>
            <Field label="Capacity"><Input type="number" value={form.capacity} onChange={(e) => setForm((p) => ({ ...p, capacity: e.target.value }))} /></Field>
            <Field label="Academic Year"><Select value={form.academicYearId || "new"} onValueChange={(value) => setForm((p) => ({ ...p, academicYearId: value === "new" ? "" : value, academicYear: data?.academicYears.find((y) => y.id === value)?.name || p.academicYear }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="new">Create/use typed year</SelectItem>{data?.academicYears.map((y) => <SelectItem key={y.id} value={y.id}>{y.name}</SelectItem>)}</SelectContent></Select><Input className="mt-2" value={form.academicYear} onChange={(e) => setForm((p) => ({ ...p, academicYear: e.target.value, academicYearId: "" }))} /></Field>
            <Field label="Class Teacher"><Select value={form.teacherId || "none"} onValueChange={(value) => setForm((p) => ({ ...p, teacherId: value === "none" ? "" : value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Unassigned</SelectItem>{data?.teachers.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent></Select></Field>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={saveClass} disabled={saving}>{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Save Class</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Metric({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: number }) {
  return <Card className="border-2"><CardContent className="p-5"><Icon className="h-7 w-7 text-orange-500" /><p className="mt-3 text-xs font-black uppercase text-muted-foreground">{label}</p><p className="text-3xl font-black">{value}</p></CardContent></Card>;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-2"><Label className="text-xs font-black uppercase text-muted-foreground">{label}</Label>{children}</div>;
}
