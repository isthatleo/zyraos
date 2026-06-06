"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { AlertTriangle, BarChart3, CalendarDays, CheckCircle2, ClipboardCheck, Copy, Download, Edit3, Loader2, Play, Plus, RefreshCw, Search, Trash2, XCircle } from "lucide-react";
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

type ClassRow = { id: string; name: string; academicYearId: string; academicYear: string };
type Year = { id: string; name: string };
type Term = { id: string; name: string; academicYearId: string };
type Assessment = { id: string; name: string; classId: string; academicYearId: string; termId: string; type: string; status: string };
type Exam = {
  id: string;
  name: string;
  description: string;
  assessmentId: string;
  assessmentName: string;
  classId: string;
  className: string;
  academicYearId: string;
  academicYear: string;
  termId: string;
  termName: string;
  examDate: string | null;
  startTime: string;
  endTime: string;
  location: string;
  invigilator: string;
  totalMarks: number;
  passingMarks: number;
  duration: number;
  examType: string;
  status: string;
  instructions: string;
  results: { entries: number; average: number; highest: number; lowest: number };
};
type Conflict = { type: string; examId: string; examName: string; className: string; date: string; time: string; invigilator: string };
type Payload = {
  classes: ClassRow[];
  academicYears: Year[];
  terms: Term[];
  teachers: Array<{ id: string; name: string; email: string }>;
  assessments: Assessment[];
  exams: Exam[];
  conflicts: Conflict[];
  summary: { exams: number; scheduled: number; inProgress: number; completed: number; cancelled: number; upcoming: number; conflicts: number };
};

const emptyForm = {
  id: "",
  name: "",
  description: "",
  assessmentId: "",
  classId: "",
  academicYearId: "",
  termId: "",
  examDate: new Date().toISOString().slice(0, 10),
  startTime: "09:00",
  endTime: "11:00",
  location: "",
  invigilator: "",
  totalMarks: "100",
  passingMarks: "50",
  duration: "120",
  examType: "midterm",
  status: "scheduled",
  instructions: "",
};

export default function AdminExamsPage() {
  const params = useParams<{ tenant: string }>();
  const tenant = params?.tenant || "";
  const [data, setData] = React.useState<Payload | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState("");
  const [error, setError] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState(emptyForm);
  const [status, setStatus] = React.useState("all");
  const [classId, setClassId] = React.useState("all");
  const [termId, setTermId] = React.useState("all");
  const [query, setQuery] = React.useState("");
  const [conflicts, setConflicts] = React.useState<Conflict[]>([]);

  const endpoint = React.useCallback((extra = "") => `/api/tenant/admin/exams?tenant=${encodeURIComponent(tenant)}${extra}`, [tenant]);

  const load = React.useCallback(async () => {
    if (!tenant) return;
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (status !== "all") params.set("status", status);
      if (classId !== "all") params.set("classId", classId);
      if (termId !== "all") params.set("termId", termId);
      if (query.trim()) params.set("query", query.trim());
      const suffix = params.toString() ? `&${params}` : "";
      const response = await fetch(endpoint(suffix), { cache: "no-store", credentials: "include" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Failed to load exams");
      setData(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load exams");
    } finally {
      setLoading(false);
    }
  }, [classId, endpoint, query, status, tenant, termId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  function startCreate() {
    const cls = data?.classes[0];
    const year = data?.academicYears[0];
    const term = data?.terms.find((item) => item.academicYearId === (cls?.academicYearId || year?.id)) || data?.terms[0];
    setConflicts([]);
    setForm({ ...emptyForm, classId: cls?.id || "", academicYearId: cls?.academicYearId || year?.id || "", termId: term?.id || "" });
    setOpen(true);
  }

  function startEdit(exam: Exam) {
    setConflicts([]);
    setForm({ ...emptyForm, ...exam, assessmentId: exam.assessmentId || "", examDate: exam.examDate ? exam.examDate.slice(0, 10) : emptyForm.examDate, totalMarks: String(exam.totalMarks), passingMarks: String(exam.passingMarks), duration: String(exam.duration) });
    setOpen(true);
  }

  async function mutate(body: Record<string, unknown>, success: string) {
    setBusy(String(body.action || "save"));
    try {
      const response = await fetch(endpoint(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const payload = await response.json().catch(() => ({}));
      if (response.status === 409 && payload.conflicts) {
        setConflicts(payload.conflicts);
        toast.error(payload.error || "Exam schedule conflict detected");
        return false;
      }
      if (!response.ok) throw new Error(payload.error || "Exam action failed");
      setData(payload);
      setConflicts([]);
      toast.success(success);
      return true;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Exam action failed");
      return false;
    } finally {
      setBusy("");
    }
  }

  async function saveExam(allowConflicts = false) {
    const ok = await mutate({ action: "exam.upsert", ...form, allowConflicts }, form.id ? "Exam updated" : "Exam created");
    if (ok) setOpen(false);
  }

  async function deleteExam(exam: Exam) {
    if (!window.confirm(`Delete ${exam.name}? Completed exams are protected.`)) return;
    setBusy(`delete:${exam.id}`);
    try {
      const response = await fetch(endpoint(`&id=${encodeURIComponent(exam.id)}`), { method: "DELETE", credentials: "include" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Failed to delete exam");
      setData(payload);
      toast.success("Exam deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete exam");
    } finally {
      setBusy("");
    }
  }

  function exportExams(format: "csv" | "json") {
    window.open(endpoint(`&export=${format}`), "_blank", "noopener,noreferrer");
  }

  const exams = data?.exams || [];
  const filteredAssessments = (data?.assessments || []).filter((item) => (!form.classId || item.classId === form.classId) && (!form.termId || item.termId === form.termId));

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Badge variant="outline" className="rounded-full">Assessment Control</Badge>
            <h1 className="mt-3 text-3xl font-black tracking-tight">Exams</h1>
            <p className="mt-2 max-w-3xl text-sm text-muted-foreground">Tenant-scoped exam scheduling, conflict detection, publishing workflow, result analytics, exports, and audit-logged operations.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => void load()}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>
            <Button variant="outline" onClick={() => exportExams("csv")}><Download className="mr-2 h-4 w-4" />CSV</Button>
            <Button variant="outline" onClick={() => exportExams("json")}><Download className="mr-2 h-4 w-4" />JSON</Button>
            <Button onClick={startCreate} className="bg-orange-600 text-white hover:bg-orange-700"><Plus className="mr-2 h-4 w-4" />Add Exam</Button>
          </div>
        </div>
      </section>

      {error ? <Alert variant="destructive"><AlertTitle>Exams unavailable</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}
      {data?.conflicts?.length ? <Alert><AlertTriangle className="h-4 w-4" /><AlertTitle>Schedule conflicts detected</AlertTitle><AlertDescription>{data.conflicts.length} conflict risk exists in the current exam timetable. Review class and invigilator overlaps before publishing.</AlertDescription></Alert> : null}

      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Metric label="Total" value={data?.summary.exams || 0} />
        <Metric label="Scheduled" value={data?.summary.scheduled || 0} />
        <Metric label="In Progress" value={data?.summary.inProgress || 0} />
        <Metric label="Completed" value={data?.summary.completed || 0} />
        <Metric label="Upcoming" value={data?.summary.upcoming || 0} />
        <Metric label="Conflicts" value={data?.summary.conflicts || 0} tone={data?.summary.conflicts ? "danger" : "normal"} />
      </div>

      <Card className="border-2">
        <CardHeader>
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <CardTitle className="text-2xl font-black">Exam Schedule</CardTitle>
              <CardDescription>Filter, manage workflow states, clone exams, and protect completed records.</CardDescription>
            </div>
            <div className="grid gap-2 md:grid-cols-4 xl:w-[780px]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search exams..." className="pl-9" />
              </div>
              <Select value={status} onValueChange={setStatus}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All statuses</SelectItem><SelectItem value="scheduled">Scheduled</SelectItem><SelectItem value="in-progress">In Progress</SelectItem><SelectItem value="completed">Completed</SelectItem><SelectItem value="cancelled">Cancelled</SelectItem></SelectContent></Select>
              <Select value={classId} onValueChange={setClassId}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All classes</SelectItem>{data?.classes.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select>
              <Select value={termId} onValueChange={setTermId}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All terms</SelectItem>{data?.terms.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-2">
          {loading ? Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-64 rounded-3xl" />) : exams.map((exam) => (
            <div key={exam.id} className="rounded-3xl border-2 bg-muted/10 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-xl font-black">{exam.name}</h3>
                  <p className="text-sm text-muted-foreground">{exam.className || "No class"} · {exam.termName || "No term"} · {exam.examType}</p>
                </div>
                <Badge variant={exam.status === "cancelled" ? "destructive" : "outline"} className="rounded-full capitalize">{exam.status}</Badge>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <Info icon={CalendarDays} label="Date" value={exam.examDate ? exam.examDate.slice(0, 10) : "Not set"} />
                <Info icon={CalendarDays} label="Time" value={`${exam.startTime || "?"} - ${exam.endTime || "?"}`} />
                <Info icon={ClipboardCheck} label="Marks" value={`${exam.totalMarks} / pass ${exam.passingMarks || "-"}`} />
                <Info icon={BarChart3} label="Results" value={exam.results.entries ? `${exam.results.entries} entries · avg ${exam.results.average}%` : "No entries"} />
              </div>
              <p className="mt-4 text-sm text-muted-foreground">{exam.instructions || exam.description || "No instructions configured."}</p>
              <div className="mt-5 flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => startEdit(exam)}><Edit3 className="mr-2 h-4 w-4" />Edit</Button>
                <Button size="sm" variant="outline" disabled={busy === "exam.clone"} onClick={() => mutate({ action: "exam.clone", id: exam.id }, "Exam cloned")}><Copy className="mr-2 h-4 w-4" />Clone</Button>
                {exam.status === "scheduled" ? <Button size="sm" variant="outline" onClick={() => mutate({ action: "exam.status", id: exam.id, status: "in-progress" }, "Exam started")}><Play className="mr-2 h-4 w-4" />Start</Button> : null}
                {exam.status !== "completed" ? <Button size="sm" variant="outline" onClick={() => mutate({ action: "exam.status", id: exam.id, status: "completed" }, "Exam completed")}><CheckCircle2 className="mr-2 h-4 w-4" />Complete</Button> : null}
                {exam.status !== "cancelled" ? <Button size="sm" variant="outline" onClick={() => mutate({ action: "exam.status", id: exam.id, status: "cancelled" }, "Exam cancelled")}><XCircle className="mr-2 h-4 w-4" />Cancel</Button> : null}
                <Button size="sm" variant="destructive" disabled={exam.status === "completed" || busy === `delete:${exam.id}`} onClick={() => deleteExam(exam)}><Trash2 className="mr-2 h-4 w-4" />Delete</Button>
              </div>
            </div>
          ))}
          {!loading && !exams.length ? <div className="rounded-3xl border border-dashed p-8 text-center text-sm text-muted-foreground lg:col-span-2">No exams match the current filters.</div> : null}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          <DialogHeader><DialogTitle className="text-2xl font-black">{form.id ? "Edit Exam" : "Add Exam"}</DialogTitle></DialogHeader>
          {conflicts.length ? (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Conflict requires confirmation</AlertTitle>
              <AlertDescription>{conflicts.map((item) => `${item.type}: ${item.examName} (${item.className}) ${item.date} ${item.time}`).join("; ")}</AlertDescription>
            </Alert>
          ) : null}
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Name"><Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} /></Field>
            <Field label="Class"><Select value={form.classId || "none"} onValueChange={(v) => { const cls = data?.classes.find((c) => c.id === v); setForm((p) => ({ ...p, classId: v === "none" ? "" : v, academicYearId: cls?.academicYearId || p.academicYearId, assessmentId: "" })); }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Select class</SelectItem>{data?.classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></Field>
            <Field label="Academic Year"><Select value={form.academicYearId || "none"} onValueChange={(v) => setForm((p) => ({ ...p, academicYearId: v === "none" ? "" : v, termId: "", assessmentId: "" }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Select year</SelectItem>{data?.academicYears.map((y) => <SelectItem key={y.id} value={y.id}>{y.name}</SelectItem>)}</SelectContent></Select></Field>
            <Field label="Term"><Select value={form.termId || "none"} onValueChange={(v) => setForm((p) => ({ ...p, termId: v === "none" ? "" : v, assessmentId: "" }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Select term</SelectItem>{data?.terms.filter((t) => !form.academicYearId || t.academicYearId === form.academicYearId).map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent></Select></Field>
            <Field label="Assessment Link"><Select value={form.assessmentId || "none"} onValueChange={(v) => setForm((p) => ({ ...p, assessmentId: v === "none" ? "" : v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">No linked assessment</SelectItem>{filteredAssessments.map((a) => <SelectItem key={a.id} value={a.id}>{a.name} · {a.type}</SelectItem>)}</SelectContent></Select></Field>
            <Field label="Exam Date"><Input type="date" value={form.examDate} onChange={(e) => setForm((p) => ({ ...p, examDate: e.target.value }))} /></Field>
            <Field label="Start / End"><div className="grid grid-cols-2 gap-2"><Input type="time" value={form.startTime} onChange={(e) => setForm((p) => ({ ...p, startTime: e.target.value }))} /><Input type="time" value={form.endTime} onChange={(e) => setForm((p) => ({ ...p, endTime: e.target.value }))} /></div></Field>
            <Field label="Location"><Input value={form.location} onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))} /></Field>
            <Field label="Invigilator"><Input value={form.invigilator} list="exam-invigilators" onChange={(e) => setForm((p) => ({ ...p, invigilator: e.target.value }))} /><datalist id="exam-invigilators">{data?.teachers.map((teacher) => <option key={teacher.id} value={teacher.name} />)}</datalist></Field>
            <Field label="Total / Passing Marks"><div className="grid grid-cols-2 gap-2"><Input type="number" min={1} value={form.totalMarks} onChange={(e) => setForm((p) => ({ ...p, totalMarks: e.target.value }))} /><Input type="number" min={0} value={form.passingMarks} onChange={(e) => setForm((p) => ({ ...p, passingMarks: e.target.value }))} /></div></Field>
            <Field label="Duration Minutes"><Input type="number" min={0} value={form.duration} onChange={(e) => setForm((p) => ({ ...p, duration: e.target.value }))} /></Field>
            <Field label="Type"><Select value={form.examType} onValueChange={(v) => setForm((p) => ({ ...p, examType: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="midterm">Midterm</SelectItem><SelectItem value="final">Final</SelectItem><SelectItem value="mock">Mock</SelectItem><SelectItem value="practical">Practical</SelectItem><SelectItem value="quiz">Quiz</SelectItem><SelectItem value="placement">Placement</SelectItem></SelectContent></Select></Field>
            <Field label="Status"><Select value={form.status} onValueChange={(v) => setForm((p) => ({ ...p, status: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="scheduled">Scheduled</SelectItem><SelectItem value="in-progress">In Progress</SelectItem><SelectItem value="completed">Completed</SelectItem><SelectItem value="cancelled">Cancelled</SelectItem></SelectContent></Select></Field>
            <Field label="Description"><Textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} /></Field>
            <Field label="Instructions"><Textarea value={form.instructions} onChange={(e) => setForm((p) => ({ ...p, instructions: e.target.value }))} /></Field>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            {conflicts.length ? <Button variant="destructive" disabled={busy === "exam.upsert"} onClick={() => saveExam(true)}>Save With Conflict Override</Button> : null}
            <Button onClick={() => saveExam(false)} disabled={busy === "exam.upsert"}>{busy === "exam.upsert" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Save Exam</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Metric({ label, value, tone = "normal" }: { label: string; value: number; tone?: "normal" | "danger" }) {
  return <Card className={`border-2 ${tone === "danger" ? "border-red-300" : ""}`}><CardContent className="p-5"><ClipboardCheck className={`h-7 w-7 ${tone === "danger" ? "text-red-500" : "text-orange-500"}`} /><p className="mt-3 text-xs font-black uppercase text-muted-foreground">{label}</p><p className="text-3xl font-black">{value}</p></CardContent></Card>;
}

function Info({ label, value, icon: Icon }: { label: string; value: string; icon: React.ComponentType<{ className?: string }> }) {
  return <div className="rounded-2xl border bg-card p-3"><Icon className="h-4 w-4 text-orange-500" /><p className="mt-2 text-xs font-black uppercase text-muted-foreground">{label}</p><p className="font-bold">{value}</p></div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-2"><Label className="text-xs font-black uppercase text-muted-foreground">{label}</Label>{children}</div>;
}
