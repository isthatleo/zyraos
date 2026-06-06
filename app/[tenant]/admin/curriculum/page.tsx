"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { BookOpenCheck, CheckCircle2, Download, Layers3, Loader2, Plus, RefreshCw, Save, Target, Trash2 } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";

type ClassRow = { id: string; name: string; grade: string };
type Subject = { id: string; name: string; code: string; type: string };
type CurriculumTrack = { id: string; name: string; level: string; description: string; active: boolean };
type CurriculumMap = { id: string; classId: string; subjectId: string; hoursPerWeek: string; mandatory: boolean };
type Outcome = { id: string; title: string; classId: string; subjectId: string; mastery: string; notes: string };
type Curriculum = {
  tracks: CurriculumTrack[];
  maps: CurriculumMap[];
  outcomes: Outcome[];
  policies: { framework: string; gradingApproach: string; promotionLinked: boolean; transcriptLinked: boolean; reportCardLinked: boolean; lessonPlanRequired: boolean; reviewCycle: string; notes: string };
};
type Payload = {
  classes: ClassRow[];
  subjects: Subject[];
  curriculum: Curriculum;
  coverage: Array<{ classId: string; className: string; subjects: number; hours: number; mandatory: number }>;
  summary: { tracks: number; activeTracks: number; maps: number; mandatory: number; optional: number; outcomes: number; totalHours: number; classes: number; subjects: number };
};

const emptyTrack: CurriculumTrack = { id: "", name: "", level: "primary", description: "", active: true };
const emptyMap: CurriculumMap = { id: "", classId: "", subjectId: "", hoursPerWeek: "4", mandatory: true };
const emptyOutcome: Outcome = { id: "", title: "", classId: "", subjectId: "", mastery: "developing", notes: "" };
const defaultPolicies: Curriculum["policies"] = { framework: "local_national", gradingApproach: "percentage", promotionLinked: true, transcriptLinked: true, reportCardLinked: true, lessonPlanRequired: true, reviewCycle: "termly", notes: "" };

export default function AdminCurriculumPage() {
  const params = useParams<{ tenant: string }>();
  const tenant = params?.tenant || "";
  const [data, setData] = React.useState<Payload | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");
  const [tracks, setTracks] = React.useState<CurriculumTrack[]>([]);
  const [maps, setMaps] = React.useState<CurriculumMap[]>([]);
  const [outcomes, setOutcomes] = React.useState<Outcome[]>([]);
  const [policies, setPolicies] = React.useState<Curriculum["policies"]>(defaultPolicies);
  const [track, setTrack] = React.useState<CurriculumTrack>(emptyTrack);
  const [map, setMap] = React.useState<CurriculumMap>(emptyMap);
  const [outcome, setOutcome] = React.useState<Outcome>(emptyOutcome);

  const endpoint = React.useCallback((extra = "") => `/api/tenant/admin/curriculum?tenant=${encodeURIComponent(tenant)}${extra}`, [tenant]);

  const load = React.useCallback(async () => {
    if (!tenant) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch(endpoint(), { cache: "no-store", credentials: "include" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Failed to load curriculum");
      setData(payload);
      setTracks(Array.isArray(payload.curriculum?.tracks) ? payload.curriculum.tracks : []);
      setMaps(Array.isArray(payload.curriculum?.maps) ? payload.curriculum.maps : []);
      setOutcomes(Array.isArray(payload.curriculum?.outcomes) ? payload.curriculum.outcomes : []);
      setPolicies({ ...defaultPolicies, ...(payload.curriculum?.policies || {}) });
      setMap((current) => ({ ...current, classId: payload.classes?.[0]?.id || "", subjectId: payload.subjects?.[0]?.id || "" }));
      setOutcome((current) => ({ ...current, classId: payload.classes?.[0]?.id || "", subjectId: payload.subjects?.[0]?.id || "" }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load curriculum");
    } finally {
      setLoading(false);
    }
  }, [endpoint, tenant]);

  React.useEffect(() => {
    void load();
  }, [load]);

  function addTrack() {
    if (!track.name.trim()) return toast.error("Track name is required");
    const next = { ...track, id: track.id || `track_${cryptoRandom()}` };
    setTracks((current) => [next, ...current.filter((item) => item.id !== next.id)]);
    setTrack(emptyTrack);
  }

  function addMap() {
    if (!map.classId || !map.subjectId) return toast.error("Select class and subject");
    if (Number(map.hoursPerWeek) <= 0) return toast.error("Hours per week must be greater than zero");
    const next = { ...map, id: map.id || `map_${cryptoRandom()}` };
    setMaps((current) => [next, ...current.filter((item) => item.id !== next.id)]);
    setMap({ ...emptyMap, classId: map.classId, subjectId: map.subjectId });
  }

  function addOutcome() {
    if (!outcome.title.trim()) return toast.error("Outcome title is required");
    if (!outcome.classId || !outcome.subjectId) return toast.error("Select class and subject");
    const next = { ...outcome, id: outcome.id || `outcome_${cryptoRandom()}` };
    setOutcomes((current) => [next, ...current.filter((item) => item.id !== next.id)]);
    setOutcome({ ...emptyOutcome, classId: outcome.classId, subjectId: outcome.subjectId });
  }

  async function saveCurriculum() {
    setSaving(true);
    try {
      const response = await fetch(endpoint(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "curriculum.save", curriculum: { tracks, maps, outcomes, policies } }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Failed to save curriculum");
      setData(payload);
      toast.success("Curriculum saved");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save curriculum");
    } finally {
      setSaving(false);
    }
  }

  function exportCurriculum(format: "csv" | "json") {
    window.open(endpoint(`&export=${format}`), "_blank", "noopener,noreferrer");
  }

  const className = (id: string) => data?.classes.find((item) => item.id === id)?.name || "Class";
  const subjectName = (id: string) => data?.subjects.find((item) => item.id === id)?.name || "Subject";

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Badge variant="outline" className="rounded-full">Academics</Badge>
            <h1 className="mt-3 text-3xl font-black tracking-tight">Curriculum</h1>
            <p className="mt-2 max-w-3xl text-sm text-muted-foreground">Curriculum frameworks, tracks, class-subject requirements, learning outcomes, policy links, exports, coverage checks, and audit-logged changes.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => void load()}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>
            <Button variant="outline" onClick={() => exportCurriculum("csv")}><Download className="mr-2 h-4 w-4" />Coverage CSV</Button>
            <Button variant="outline" onClick={() => exportCurriculum("json")}><Download className="mr-2 h-4 w-4" />JSON</Button>
            <Button onClick={saveCurriculum} disabled={saving} className="bg-orange-600 text-white hover:bg-orange-700">{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}Save Curriculum</Button>
          </div>
        </div>
      </section>
      {error ? <Alert variant="destructive"><AlertTitle>Curriculum unavailable</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}
      {loading ? <div className="grid gap-4 xl:grid-cols-2"><Skeleton className="h-96 rounded-3xl" /><Skeleton className="h-96 rounded-3xl" /></div> : (
        <>
          <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
            <Metric icon={Layers3} label="Tracks" value={data?.summary.tracks || tracks.length} />
            <Metric icon={CheckCircle2} label="Active" value={data?.summary.activeTracks || tracks.filter((item) => item.active).length} />
            <Metric icon={BookOpenCheck} label="Maps" value={data?.summary.maps || maps.length} />
            <Metric icon={Target} label="Outcomes" value={data?.summary.outcomes || outcomes.length} />
            <Metric icon={BookOpenCheck} label="Hours" value={data?.summary.totalHours || maps.reduce((sum, item) => sum + Number(item.hoursPerWeek || 0), 0)} />
            <Metric icon={Layers3} label="Classes" value={data?.summary.classes || 0} />
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            <Card className="border-2">
              <CardHeader><CardTitle className="text-2xl font-black">Curriculum Policy</CardTitle><CardDescription>Global behavior used by reports, progression, and transcripts.</CardDescription></CardHeader>
              <CardContent className="space-y-4">
                <Field label="Framework"><Select value={policies.framework} onValueChange={(v) => setPolicies((p) => ({ ...p, framework: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="local_national">Local / National</SelectItem><SelectItem value="british">British</SelectItem><SelectItem value="cambridge">Cambridge</SelectItem><SelectItem value="ib">International Baccalaureate</SelectItem><SelectItem value="american">American</SelectItem><SelectItem value="hybrid">Hybrid</SelectItem></SelectContent></Select></Field>
                <Field label="Grading Approach"><Select value={policies.gradingApproach} onValueChange={(v) => setPolicies((p) => ({ ...p, gradingApproach: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="percentage">Percentage</SelectItem><SelectItem value="letter_grades">Letter Grades</SelectItem><SelectItem value="competency">Competency Based</SelectItem><SelectItem value="credits">Credit Based</SelectItem></SelectContent></Select></Field>
                <Field label="Review Cycle"><Select value={policies.reviewCycle} onValueChange={(v) => setPolicies((p) => ({ ...p, reviewCycle: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="termly">Termly</SelectItem><SelectItem value="semester">Semester</SelectItem><SelectItem value="annual">Annual</SelectItem><SelectItem value="continuous">Continuous</SelectItem></SelectContent></Select></Field>
                <Toggle label="Promotion linked" checked={policies.promotionLinked} onChange={(v) => setPolicies((p) => ({ ...p, promotionLinked: v }))} />
                <Toggle label="Transcript linked" checked={policies.transcriptLinked} onChange={(v) => setPolicies((p) => ({ ...p, transcriptLinked: v }))} />
                <Toggle label="Report card linked" checked={policies.reportCardLinked} onChange={(v) => setPolicies((p) => ({ ...p, reportCardLinked: v }))} />
                <Toggle label="Lesson plans required" checked={policies.lessonPlanRequired} onChange={(v) => setPolicies((p) => ({ ...p, lessonPlanRequired: v }))} />
                <Field label="Policy Notes"><Textarea value={policies.notes} onChange={(e) => setPolicies((p) => ({ ...p, notes: e.target.value }))} /></Field>
              </CardContent>
            </Card>

            <Card className="border-2 xl:col-span-2">
              <CardHeader><CardTitle className="text-2xl font-black">Curriculum Tracks</CardTitle><CardDescription>Create stages/tracks and activate only those the school uses.</CardDescription></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 md:grid-cols-[1fr_180px_auto]"><Input value={track.name} onChange={(e) => setTrack((p) => ({ ...p, name: e.target.value }))} placeholder="Track name e.g. Primary Curriculum" /><Select value={track.level} onValueChange={(v) => setTrack((p) => ({ ...p, level: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="nursery">Nursery</SelectItem><SelectItem value="primary">Primary</SelectItem><SelectItem value="jhs">JHS</SelectItem><SelectItem value="shs">SHS</SelectItem><SelectItem value="university">University</SelectItem><SelectItem value="custom">Custom</SelectItem></SelectContent></Select><Button onClick={addTrack}><Plus className="mr-2 h-4 w-4" />Add</Button></div>
                <Textarea value={track.description} onChange={(e) => setTrack((p) => ({ ...p, description: e.target.value }))} placeholder="Track description, outcomes, notes..." />
                <div className="grid gap-3 md:grid-cols-2">{tracks.map((item) => <div key={item.id} className="rounded-2xl border-2 bg-muted/10 p-4"><div className="flex justify-between gap-3"><div><p className="font-black">{item.name}</p><p className="text-sm text-muted-foreground capitalize">{item.level}</p></div><Switch checked={item.active} onCheckedChange={(v) => setTracks((current) => current.map((row) => row.id === item.id ? { ...row, active: v } : row))} /></div><p className="mt-2 text-sm text-muted-foreground">{item.description || "No description"}</p><div className="mt-3 flex gap-2"><Button size="sm" variant="outline" onClick={() => setTrack(item)}>Edit</Button><Button size="sm" variant="destructive" onClick={() => setTracks((current) => current.filter((row) => row.id !== item.id))}><Trash2 className="h-4 w-4" /></Button></div></div>)}</div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-2">
            <CardHeader><CardTitle className="text-2xl font-black">Subject Assignment Map</CardTitle><CardDescription>Map subjects to classes with weekly hours and mandatory flags. These mappings drive curriculum coverage checks.</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-[1fr_1fr_120px_140px_auto]"><Select value={map.classId || "none"} onValueChange={(v) => setMap((p) => ({ ...p, classId: v === "none" ? "" : v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Select class</SelectItem>{data?.classes.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select><Select value={map.subjectId || "none"} onValueChange={(v) => setMap((p) => ({ ...p, subjectId: v === "none" ? "" : v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Select subject</SelectItem>{data?.subjects.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select><Input type="number" min={1} value={map.hoursPerWeek} onChange={(e) => setMap((p) => ({ ...p, hoursPerWeek: e.target.value }))} placeholder="Hours" /><Toggle label="Mandatory" checked={map.mandatory} onChange={(v) => setMap((p) => ({ ...p, mandatory: v }))} compact /><Button onClick={addMap}><Plus className="mr-2 h-4 w-4" />Map</Button></div>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{maps.map((item) => <div key={item.id} className="rounded-2xl border-2 bg-muted/10 p-4"><p className="font-black">{className(item.classId)}</p><p className="text-sm text-muted-foreground">{subjectName(item.subjectId)} · {item.hoursPerWeek} hrs/week</p><Badge variant="outline" className="mt-2 rounded-full">{item.mandatory ? "Mandatory" : "Optional"}</Badge><div className="mt-3 flex gap-2"><Button size="sm" variant="outline" onClick={() => setMap(item)}>Edit</Button><Button size="sm" variant="destructive" onClick={() => setMaps((current) => current.filter((row) => row.id !== item.id))}><Trash2 className="h-4 w-4" /></Button></div></div>)}</div>
            </CardContent>
          </Card>

          <div className="grid gap-4 xl:grid-cols-2">
            <Card className="border-2">
              <CardHeader><CardTitle className="text-2xl font-black">Learning Outcomes</CardTitle><CardDescription>Define class-subject outcomes and mastery expectations.</CardDescription></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 md:grid-cols-2"><Input value={outcome.title} onChange={(e) => setOutcome((p) => ({ ...p, title: e.target.value }))} placeholder="Outcome title" /><Select value={outcome.mastery} onValueChange={(v) => setOutcome((p) => ({ ...p, mastery: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="introductory">Introductory</SelectItem><SelectItem value="developing">Developing</SelectItem><SelectItem value="proficient">Proficient</SelectItem><SelectItem value="advanced">Advanced</SelectItem></SelectContent></Select><Select value={outcome.classId || "none"} onValueChange={(v) => setOutcome((p) => ({ ...p, classId: v === "none" ? "" : v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Select class</SelectItem>{data?.classes.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select><Select value={outcome.subjectId || "none"} onValueChange={(v) => setOutcome((p) => ({ ...p, subjectId: v === "none" ? "" : v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Select subject</SelectItem>{data?.subjects.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select></div>
                <Textarea value={outcome.notes} onChange={(e) => setOutcome((p) => ({ ...p, notes: e.target.value }))} placeholder="Outcome evidence, lesson expectations, resources..." />
                <Button onClick={addOutcome}><Plus className="mr-2 h-4 w-4" />Add Outcome</Button>
                <div className="space-y-3">{outcomes.map((item) => <div key={item.id} className="rounded-2xl border-2 bg-muted/10 p-4"><div className="flex justify-between gap-3"><div><p className="font-black">{item.title}</p><p className="text-sm text-muted-foreground">{className(item.classId)} · {subjectName(item.subjectId)} · {item.mastery}</p></div><Button size="sm" variant="destructive" onClick={() => setOutcomes((current) => current.filter((row) => row.id !== item.id))}><Trash2 className="h-4 w-4" /></Button></div><p className="mt-2 text-sm text-muted-foreground">{item.notes || "No notes"}</p></div>)}</div>
              </CardContent>
            </Card>
            <Card className="border-2">
              <CardHeader><CardTitle className="text-2xl font-black">Coverage Preview</CardTitle><CardDescription>Class-level coverage generated from the subject assignment map.</CardDescription></CardHeader>
              <CardContent className="space-y-3">{(data?.coverage || []).map((item) => <div key={item.classId} className="rounded-2xl border bg-muted/10 p-4"><div className="flex items-center justify-between"><p className="font-black">{item.className}</p><Badge variant={item.subjects ? "outline" : "destructive"} className="rounded-full">{item.subjects} subjects</Badge></div><p className="mt-2 text-sm text-muted-foreground">{item.hours} weekly hours · {item.mandatory} mandatory subjects</p></div>)}</CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

function cryptoRandom() {
  return globalThis.crypto?.randomUUID?.() || `${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-2"><Label className="text-xs font-black uppercase text-muted-foreground">{label}</Label>{children}</div>;
}

function Toggle({ label, checked, onChange, compact }: { label: string; checked: boolean; onChange: (value: boolean) => void; compact?: boolean }) {
  return <div className="flex items-center justify-between rounded-2xl border bg-muted/10 p-3"><span className={compact ? "text-sm font-bold" : "font-bold"}>{label}</span><Switch checked={checked} onCheckedChange={onChange} /></div>;
}

function Metric({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: number }) {
  return <Card className="border-2"><CardContent className="p-5"><Icon className="h-7 w-7 text-orange-500" /><p className="mt-3 text-xs font-black uppercase text-muted-foreground">{label}</p><p className="text-3xl font-black">{value}</p></CardContent></Card>;
}
