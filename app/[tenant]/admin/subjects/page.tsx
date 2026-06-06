"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { BookOpen, Download, Edit3, FileText, Loader2, Plus, RefreshCw, Search, ShieldCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";

type Subject = { id: string; name: string; code: string; description: string; type: string; gradeCount: number; assessmentCount: number; curriculumMaps: number; outcomes: number; timetableEntries: number; locked: boolean };
type Payload = { summary: { subjects: number; core: number; elective: number; extraCurricular: number; mapped: number; inTimetable: number; locked: number }; subjects: Subject[]; school: { name: string } };

const emptyForm = { id: "", name: "", code: "", type: "core", description: "" };
const types = ["core", "elective", "extra_curricular", "language", "practical", "custom"];

export default function AdminSubjectsPage() {
  const params = useParams<{ tenant: string }>();
  const tenant = params?.tenant || "";
  const [data, setData] = React.useState<Payload | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [type, setType] = React.useState("all");
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState(emptyForm);
  const endpoint = React.useCallback((extra = "") => `/api/tenant/admin/subjects?tenant=${encodeURIComponent(tenant)}${extra}`, [tenant]);

  const load = React.useCallback(async () => {
    if (!tenant) return;
    setLoading(true);
    setError("");
    try {
      const query = new URLSearchParams();
      if (type !== "all") query.set("type", type);
      if (search.trim()) query.set("query", search.trim());
      const response = await fetch(endpoint(query.toString() ? `&${query}` : ""), { cache: "no-store", credentials: "include" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Failed to load subjects");
      setData(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load subjects");
    } finally {
      setLoading(false);
    }
  }, [endpoint, search, tenant, type]);
  React.useEffect(() => { void load(); }, [load]);

  function startCreate() { setForm(emptyForm); setOpen(true); }
  function startEdit(subject: Subject) { setForm({ id: subject.id, name: subject.name, code: subject.code, type: subject.type, description: subject.description }); setOpen(true); }

  async function saveSubject() {
    setSaving(true);
    try {
      const response = await fetch(endpoint(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "subject.upsert", ...form }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Failed to save subject");
      setData(payload);
      setOpen(false);
      toast.success(form.id ? "Subject updated" : "Subject created");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save subject");
    } finally {
      setSaving(false);
    }
  }

  async function deleteSubject(subject: Subject) {
    if (!window.confirm(`Delete ${subject.name}? Subjects in use cannot be deleted.`)) return;
    const response = await fetch(endpoint(`&id=${encodeURIComponent(subject.id)}`), { method: "DELETE", credentials: "include" });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) return toast.error(payload.error || "Failed to delete subject");
    setData(payload);
    toast.success("Subject deleted");
  }

  function exportSubjects(format: "csv" | "json") {
    const query = new URLSearchParams({ export: format });
    if (type !== "all") query.set("type", type);
    if (search.trim()) query.set("query", search.trim());
    window.open(endpoint(`&${query}`), "_blank", "noopener,noreferrer");
  }

  const subjects = (data?.subjects || []).filter((subject) => {
    const matchesSearch = [subject.name, subject.code, subject.description].join(" ").toLowerCase().includes(search.toLowerCase());
    return matchesSearch && (type === "all" || subject.type === type);
  });

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border bg-card p-6 shadow-sm">
        <Badge variant="outline" className="rounded-full">Academics</Badge>
        <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><h1 className="text-3xl font-black tracking-tight">Subjects</h1><p className="mt-2 max-w-3xl text-sm text-muted-foreground">Manage subject catalog, subject type, unique codes, curriculum/timetable usage, assessment usage, exports, and report-card readiness.</p></div><div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => void load()}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button><Button variant="outline" onClick={() => exportSubjects("csv")}><Download className="mr-2 h-4 w-4" />CSV</Button><Button variant="outline" onClick={() => exportSubjects("json")}><Download className="mr-2 h-4 w-4" />JSON</Button><Button onClick={startCreate} className="bg-orange-600 text-white hover:bg-orange-700"><Plus className="mr-2 h-4 w-4" />Add Subject</Button></div></div>
      </section>
      {error ? <Alert variant="destructive"><AlertTitle>Subjects unavailable</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}
      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6"><Metric label="All" value={data?.summary.subjects || 0} /><Metric label="Core" value={data?.summary.core || 0} /><Metric label="Elective" value={data?.summary.elective || 0} /><Metric label="Mapped" value={data?.summary.mapped || 0} /><Metric label="Timetable" value={data?.summary.inTimetable || 0} /><Metric label="Locked" value={data?.summary.locked || 0} /></div>
      <Card className="border-2">
        <CardHeader><div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"><div><CardTitle className="text-2xl">Subject Catalog</CardTitle><CardDescription>Real subject records from the tenant subjects table.</CardDescription></div><div className="grid gap-2 md:grid-cols-[240px_180px]"><div className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." className="pl-9" /></div><Select value={type} onValueChange={setType}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All types</SelectItem>{types.map((item) => <SelectItem key={item} value={item} className="capitalize">{item.replace(/_/g, " ")}</SelectItem>)}</SelectContent></Select></div></div></CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-2">
          {loading ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-44 rounded-3xl" />) : subjects.map((subject) => (
            <div key={subject.id} className="rounded-3xl border bg-muted/10 p-5">
              <div className="flex items-start justify-between gap-3"><div><h3 className="text-xl font-black">{subject.name}</h3><p className="text-sm text-muted-foreground">{subject.code} · {subject.description || "No description"}</p></div><Badge variant="outline" className="rounded-full capitalize">{subject.type.replace(/_/g, " ")}</Badge></div>
              <div className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-4"><Info label="Grades" value={subject.gradeCount} /><Info label="Assessments" value={subject.assessmentCount} /><Info label="Curriculum" value={subject.curriculumMaps} /><Info label="Timetable" value={subject.timetableEntries} /></div>
              <div className="mt-5 flex flex-wrap gap-2"><Button variant="outline" onClick={() => startEdit(subject)}><Edit3 className="mr-2 h-4 w-4" />Edit</Button><Button variant="destructive" disabled={subject.locked} onClick={() => deleteSubject(subject)}>{subject.locked ? <ShieldCheck className="mr-2 h-4 w-4" /> : <Trash2 className="mr-2 h-4 w-4" />}{subject.locked ? "Protected" : "Delete"}</Button></div>
            </div>
          ))}
        </CardContent>
      </Card>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl"><DialogHeader><DialogTitle>{form.id ? "Edit Subject" : "Add Subject"}</DialogTitle></DialogHeader>
          <div className="grid gap-4 md:grid-cols-2"><Field label="Name"><Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} /></Field><Field label="Code"><Input value={form.code} onChange={(e) => setForm((p) => ({ ...p, code: e.target.value.toUpperCase() }))} /></Field><Field label="Type"><Select value={form.type} onValueChange={(value) => setForm((p) => ({ ...p, type: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{types.map((item) => <SelectItem key={item} value={item}>{item.replace(/_/g, " ")}</SelectItem>)}</SelectContent></Select></Field><Field label="Description"><Textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} /></Field></div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={saveSubject} disabled={saving}>{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Save Subject</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) { return <Card className="border-2"><CardContent className="p-5"><BookOpen className="h-7 w-7 text-orange-500" /><p className="mt-3 text-xs font-black uppercase text-muted-foreground">{label}</p><p className="text-3xl font-black">{value}</p></CardContent></Card>; }
function Info({ label, value }: { label: string; value: number }) { return <div className="rounded-2xl border bg-card p-3"><FileText className="h-4 w-4 text-orange-500" /><p className="mt-2 text-xs font-black uppercase text-muted-foreground">{label}</p><p className="text-xl font-black">{value}</p></div>; }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <div className="space-y-2"><Label className="text-xs font-black uppercase text-muted-foreground">{label}</Label>{children}</div>; }
