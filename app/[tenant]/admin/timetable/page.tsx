"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { AlertTriangle, CalendarCheck, Clock, Download, Loader2, Plus, RefreshCw, Save, Trash2, Users } from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";

type ClassRow = { id: string; name: string };
type Subject = { id: string; name: string; code: string };
type Teacher = { id: string; name: string };
type TimetableEntry = { id: string; day: string; period: string; startTime: string; endTime: string; classId: string; subjectId: string; teacherId: string; room: string; published: boolean };
type BreakPeriod = { id: string; name: string; day: string; startTime: string; endTime: string };
type Timetable = { entries: TimetableEntry[]; settings: { periodsPerDay: number; schoolStart: string; schoolEnd: string; autoConflictCheck: boolean; breaks: BreakPeriod[] } };
type Payload = { classes: ClassRow[]; subjects: Subject[]; teachers: Teacher[]; timetable: Timetable; conflicts: Array<{ type: string; day: string; time: string }>; summary: { timetableEntries: number; published: number; draft: number; breaks: number; teachersScheduled: number; classesScheduled: number; conflicts: number } };

const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const emptyEntry: TimetableEntry = { id: "", day: "Monday", period: "1", startTime: "08:00", endTime: "08:40", classId: "", subjectId: "", teacherId: "", room: "", published: false };
const emptyBreak: BreakPeriod = { id: "", name: "Breaktime", day: "All days", startTime: "10:30", endTime: "11:00" };

function timeToMinutes(value: string) {
  const [hours, minutes] = value.split(":").map((part) => Number(part));
  return (Number.isFinite(hours) ? hours : 0) * 60 + (Number.isFinite(minutes) ? minutes : 0);
}

function overlaps(startA: string, endA: string, startB: string, endB: string) {
  return timeToMinutes(startA) < timeToMinutes(endB) && timeToMinutes(startB) < timeToMinutes(endA);
}

function breakAppliesToDay(breakPeriod: BreakPeriod, day: string) {
  return breakPeriod.day === "All days" || breakPeriod.day === day;
}

export default function AdminTimetablePage() {
  const params = useParams<{ tenant: string }>();
  const tenant = params?.tenant || "";
  const [data, setData] = React.useState<Payload | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");
  const [entry, setEntry] = React.useState<TimetableEntry>(emptyEntry);
  const [entries, setEntries] = React.useState<TimetableEntry[]>([]);
  const [settings, setSettings] = React.useState<Timetable["settings"]>({ periodsPerDay: 8, schoolStart: "08:00", schoolEnd: "16:00", autoConflictCheck: true, breaks: [] });
  const [breakDraft, setBreakDraft] = React.useState<BreakPeriod>(emptyBreak);
  const [serverConflicts, setServerConflicts] = React.useState<Payload["conflicts"]>([]);

  const endpoint = React.useCallback((extra = "") => `/api/tenant/admin/timetable?tenant=${encodeURIComponent(tenant)}${extra}`, [tenant]);

  const load = React.useCallback(async () => {
    if (!tenant) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch(endpoint(), { cache: "no-store", credentials: "include" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Failed to load timetable");
      setData(payload);
      setServerConflicts(payload.conflicts || []);
      setEntries(Array.isArray(payload.timetable?.entries) ? payload.timetable.entries : []);
      setSettings({ periodsPerDay: 8, schoolStart: "08:00", schoolEnd: "16:00", autoConflictCheck: true, breaks: [], ...(payload.timetable?.settings || {}) });
      setEntry((current) => ({ ...current, classId: payload.classes?.[0]?.id || "", subjectId: payload.subjects?.[0]?.id || "", teacherId: payload.teachers?.[0]?.id || "" }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load timetable");
    } finally {
      setLoading(false);
    }
  }, [endpoint, tenant]);
  React.useEffect(() => { void load(); }, [load]);

  function conflict(next: TimetableEntry) {
    return entries.some((item) =>
      item.id !== next.id &&
      item.day === next.day &&
      overlaps(next.startTime, next.endTime, item.startTime, item.endTime) &&
      (item.classId === next.classId || item.teacherId === next.teacherId)
    );
  }

  function breakConflict(next: TimetableEntry) {
    return settings.breaks.find((item) => breakAppliesToDay(item, next.day) && overlaps(next.startTime, next.endTime, item.startTime, item.endTime));
  }

  function addEntry() {
    if (!entry.classId || !entry.subjectId || !entry.teacherId) return toast.error("Select class, subject, and teacher");
    if (timeToMinutes(entry.startTime) >= timeToMinutes(entry.endTime)) return toast.error("Lesson end time must be after start time");
    const next = { ...entry, id: entry.id || `tt_${Date.now()}` };
    const blockedBreak = breakConflict(next);
    if (blockedBreak) return toast.error(`Lesson overlaps ${blockedBreak.name} (${blockedBreak.startTime}-${blockedBreak.endTime})`);
    if (settings.autoConflictCheck && conflict(next)) return toast.error("Conflict detected: same class or teacher already has an overlapping lesson");
    setEntries((current) => [next, ...current.filter((item) => item.id !== next.id)]);
    setEntry({ ...emptyEntry, classId: entry.classId, subjectId: entry.subjectId, teacherId: entry.teacherId });
  }

  function addBreakPeriod() {
    if (!breakDraft.name || !breakDraft.startTime || !breakDraft.endTime) return toast.error("Break name, start, and end time are required");
    if (timeToMinutes(breakDraft.startTime) >= timeToMinutes(breakDraft.endTime)) return toast.error("Break end time must be after start time");
    const next = { ...breakDraft, id: breakDraft.id || `break_${Date.now()}` };
    const affectedLesson = entries.find((item) => breakAppliesToDay(next, item.day) && overlaps(next.startTime, next.endTime, item.startTime, item.endTime));
    if (affectedLesson) return toast.error("Break overlaps an existing lesson. Move the lesson before saving this break.");
    setSettings((current) => ({ ...current, breaks: [next, ...current.breaks.filter((item) => item.id !== next.id)] }));
    setBreakDraft(emptyBreak);
  }

  async function saveTimetable(nextEntries = entries) {
    setSaving(true);
    try {
      const invalid = nextEntries.find((item) => settings.breaks.some((breakPeriod) => breakAppliesToDay(breakPeriod, item.day) && overlaps(item.startTime, item.endTime, breakPeriod.startTime, breakPeriod.endTime)));
      if (invalid) {
        toast.error("A lesson overlaps a break period. Fix conflicts before saving.");
        return;
      }
      const response = await fetch(endpoint(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "timetable.save", timetable: { entries: nextEntries, settings } }),
      });
      const payload = await response.json().catch(() => ({}));
      if (response.status === 409 && payload.conflicts) {
        setServerConflicts(payload.conflicts);
        throw new Error(payload.error || "Timetable conflicts detected");
      }
      if (!response.ok) throw new Error(payload.error || "Failed to save timetable");
      setData(payload);
      setServerConflicts(payload.conflicts || []);
      setEntries(payload.timetable.entries || []);
      toast.success("Timetable saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save timetable");
    } finally {
      setSaving(false);
    }
  }

  function exportTimetable(format: "csv" | "json") {
    window.open(endpoint(`&export=${format}`), "_blank", "noopener,noreferrer");
  }

  const label = {
    class: (id: string) => data?.classes.find((item) => item.id === id)?.name || "Class",
    subject: (id: string) => data?.subjects.find((item) => item.id === id)?.name || "Subject",
    teacher: (id: string) => data?.teachers.find((item) => item.id === id)?.name || "Teacher",
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border bg-card p-6 shadow-sm"><Badge variant="outline" className="rounded-full">Academics</Badge><div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><h1 className="text-3xl font-black tracking-tight">Timetable</h1><p className="mt-2 max-w-3xl text-sm text-muted-foreground">Build schedules with server-enforced time-overlap checks. Teachers can teach multiple lessons per day as long as lesson times do not collide, and lessons cannot run during breaks.</p></div><div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => void load()}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button><Button variant="outline" onClick={() => exportTimetable("csv")}><Download className="mr-2 h-4 w-4" />CSV</Button><Button variant="outline" onClick={() => exportTimetable("json")}><Download className="mr-2 h-4 w-4" />JSON</Button><Button onClick={() => saveTimetable()} disabled={saving} className="bg-orange-600 text-white hover:bg-orange-700">{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}Save Timetable</Button></div></div></section>
      {error ? <Alert variant="destructive"><AlertTitle>Timetable unavailable</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}
      {serverConflicts.length ? <Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertTitle>Timetable conflicts detected</AlertTitle><AlertDescription>{serverConflicts.map((item) => `${item.type} conflict on ${item.day} at ${item.time}`).join("; ")}</AlertDescription></Alert> : null}
      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6"><Metric icon={CalendarCheck} label="Lessons" value={data?.summary.timetableEntries || entries.length} /><Metric icon={CalendarCheck} label="Published" value={data?.summary.published || entries.filter((item) => item.published).length} /><Metric icon={CalendarCheck} label="Draft" value={data?.summary.draft || entries.filter((item) => !item.published).length} /><Metric icon={Clock} label="Breaks" value={data?.summary.breaks || settings.breaks.length} /><Metric icon={Users} label="Teachers" value={data?.summary.teachersScheduled || new Set(entries.map((item) => item.teacherId)).size} /><Metric icon={AlertTriangle} label="Conflicts" value={data?.summary.conflicts || serverConflicts.length} /></div>
      <div className="grid gap-4 xl:grid-cols-[420px_1fr]">
        <Card className="border-2">
          <CardHeader><CardTitle className="text-2xl">Add Period</CardTitle><CardDescription>Create a timetable period and save when ready.</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            {loading ? <Skeleton className="h-96 rounded-3xl" /> : <>
              <div className="grid gap-3 md:grid-cols-2"><Field label="Day"><Select value={entry.day} onValueChange={(v) => setEntry((p) => ({ ...p, day: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{days.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent></Select></Field><Field label="Period"><Input value={entry.period} onChange={(e) => setEntry((p) => ({ ...p, period: e.target.value }))} /></Field><Field label="Start"><Input type="time" value={entry.startTime} onChange={(e) => setEntry((p) => ({ ...p, startTime: e.target.value }))} /></Field><Field label="End"><Input type="time" value={entry.endTime} onChange={(e) => setEntry((p) => ({ ...p, endTime: e.target.value }))} /></Field></div>
              <Field label="Class"><Select value={entry.classId || "none"} onValueChange={(v) => setEntry((p) => ({ ...p, classId: v === "none" ? "" : v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Select class</SelectItem>{data?.classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></Field>
              <Field label="Subject"><Select value={entry.subjectId || "none"} onValueChange={(v) => setEntry((p) => ({ ...p, subjectId: v === "none" ? "" : v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Select subject</SelectItem>{data?.subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select></Field>
              <Field label="Teacher"><Select value={entry.teacherId || "none"} onValueChange={(v) => setEntry((p) => ({ ...p, teacherId: v === "none" ? "" : v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Select teacher</SelectItem>{data?.teachers.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent></Select></Field>
              <Field label="Room"><Input value={entry.room} onChange={(e) => setEntry((p) => ({ ...p, room: e.target.value }))} /></Field>
              <div className="flex items-center justify-between rounded-2xl border p-3"><div><p className="font-bold">Published</p><p className="text-xs text-muted-foreground">Visible to dashboards once saved.</p></div><Switch checked={entry.published} onCheckedChange={(v) => setEntry((p) => ({ ...p, published: v }))} /></div>
              <Button onClick={addEntry} className="w-full"><Plus className="mr-2 h-4 w-4" />Add / Update Period</Button>
            </>}
          </CardContent>
        </Card>
        <Card className="border-2">
          <CardHeader><div className="flex items-center justify-between gap-3"><div><CardTitle className="text-2xl">Weekly Schedule</CardTitle><CardDescription>{entries.length} periods configured.</CardDescription></div><div className="flex items-center gap-2 text-sm"><Switch checked={settings.autoConflictCheck} onCheckedChange={(v) => setSettings((p) => ({ ...p, autoConflictCheck: v }))} />Conflict check</div></div></CardHeader>
          <CardContent className="space-y-4">
            {loading ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />) : days.map((day) => (
              <div key={day} className="rounded-3xl border bg-muted/10 p-4"><h3 className="font-black">{day}</h3><div className="mt-3 grid gap-3">{entries.filter((item) => item.day === day).sort((a, b) => Number(a.period) - Number(b.period)).map((item) => <div key={item.id} className="grid gap-3 rounded-2xl border bg-card p-3 md:grid-cols-[90px_1fr_auto] md:items-center"><div className="font-mono text-sm"><Clock className="mb-1 h-4 w-4 text-orange-500" />{item.startTime}-{item.endTime}</div><div><p className="font-bold">P{item.period} · {label.subject(item.subjectId)}</p><p className="text-sm text-muted-foreground">{label.class(item.classId)} · {label.teacher(item.teacherId)} · {item.room || "No room"}</p></div><div className="flex gap-2"><Button variant="outline" size="sm" onClick={() => setEntry(item)}>Edit</Button><Button variant="destructive" size="sm" onClick={() => setEntries((current) => current.filter((row) => row.id !== item.id))}><Trash2 className="h-4 w-4" /></Button></div></div>)}{entries.filter((item) => item.day === day).length === 0 ? <p className="text-sm text-muted-foreground">No periods configured.</p> : null}</div></div>
            ))}
          </CardContent>
        </Card>
      </div>
      <Card className="border-2">
        <CardHeader>
          <CardTitle className="text-2xl">Break & Lunch Periods</CardTitle>
          <CardDescription>Set break windows such as breaktime or lunchtime. Lessons cannot be created or saved inside these windows.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-[1fr_160px_140px_140px_auto]">
            <Field label="Break Name"><Input value={breakDraft.name} onChange={(event) => setBreakDraft((current) => ({ ...current, name: event.target.value }))} placeholder="Breaktime, Lunch..." /></Field>
            <Field label="Day"><Select value={breakDraft.day} onValueChange={(value) => setBreakDraft((current) => ({ ...current, day: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="All days">All days</SelectItem>{days.map((day) => <SelectItem key={day} value={day}>{day}</SelectItem>)}</SelectContent></Select></Field>
            <Field label="Start"><Input type="time" value={breakDraft.startTime} onChange={(event) => setBreakDraft((current) => ({ ...current, startTime: event.target.value }))} /></Field>
            <Field label="End"><Input type="time" value={breakDraft.endTime} onChange={(event) => setBreakDraft((current) => ({ ...current, endTime: event.target.value }))} /></Field>
            <div className="flex items-end"><Button onClick={addBreakPeriod} className="w-full"><Plus className="mr-2 h-4 w-4" />Add Break</Button></div>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {settings.breaks.map((item) => (
              <div key={item.id} className="rounded-2xl border bg-muted/10 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div><p className="font-black">{item.name}</p><p className="text-sm text-muted-foreground">{item.day} · {item.startTime}-{item.endTime}</p></div>
                  <Button variant="destructive" size="sm" onClick={() => setSettings((current) => ({ ...current, breaks: current.breaks.filter((row) => row.id !== item.id) }))}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            ))}
            {settings.breaks.length === 0 ? <p className="text-sm text-muted-foreground">No breaks configured yet.</p> : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <div className="space-y-2"><Label className="text-xs font-black uppercase text-muted-foreground">{label}</Label>{children}</div>; }
function Metric({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: number }) {
  return <Card className="border-2"><CardContent className="p-5"><Icon className="h-7 w-7 text-orange-500" /><p className="mt-3 text-xs font-black uppercase text-muted-foreground">{label}</p><p className="text-3xl font-black">{value}</p></CardContent></Card>;
}
