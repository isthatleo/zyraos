"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { BriefcaseBusiness, Download, GraduationCap, Loader2, MailCheck, RefreshCw, RotateCcw, Save, Search, ShieldAlert, Users } from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

type Student = {
  id: string;
  name: string;
  admissionNumber: string;
  email: string;
  phone: string;
  className: string;
  graduationDate: string | null;
  guardian: { name: string; phone: string };
  alumni: { employer: string; occupation: string; destination: string; graduationNotes: string; linkedinUrl: string; currentCity: string; consentToContact: boolean; mentorshipOptIn: boolean; lastContactedAt: string | null };
  engagementScore: number;
};
type Payload = { students: Student[]; summary: { graduated: number; total: number; withDestination: number; consented: number; mentors: number; missingProfiles: number } };

function tenantPath(tenant: string, path: string) {
  return `/${tenant}${path.startsWith("/") ? path : `/${path}`}`;
}

function dateLabel(value: string | null) {
  if (!value) return "Not recorded";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

export default function AdminAlumniPage() {
  const params = useParams<{ tenant: string }>();
  const tenant = params?.tenant || "";
  const [data, setData] = React.useState<Payload | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [busyId, setBusyId] = React.useState("");
  const [error, setError] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [destination, setDestination] = React.useState("");
  const [drafts, setDrafts] = React.useState<Record<string, Student["alumni"]>>({});
  const endpoint = React.useCallback((extra = "") => `/api/tenant/admin/alumni?tenant=${encodeURIComponent(tenant)}${extra}`, [tenant]);

  const loadData = React.useCallback(async () => {
    if (!tenant) return;
    setLoading(true);
    setError("");
    try {
      const query = new URLSearchParams();
      if (search.trim()) query.set("search", search.trim());
      if (destination.trim()) query.set("destination", destination.trim());
      const response = await fetch(endpoint(query.toString() ? `&${query}` : ""), { cache: "no-store", credentials: "include" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Failed to load alumni");
      setData(payload);
      setDrafts(Object.fromEntries((payload.students || []).map((student: Student) => [student.id, student.alumni])));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load alumni");
    } finally {
      setLoading(false);
    }
  }, [destination, endpoint, search, tenant]);

  React.useEffect(() => {
    const timer = window.setTimeout(loadData, 180);
    return () => window.clearTimeout(timer);
  }, [loadData]);

  function updateDraft(studentId: string, key: keyof Student["alumni"], value: string | boolean) {
    setDrafts((prev) => ({ ...prev, [studentId]: { ...prev[studentId], [key]: value } }));
  }

  async function saveAlumni(studentId: string) {
    setBusyId(studentId);
    try {
      const response = await fetch(endpoint(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "alumni.save", studentId, alumni: drafts[studentId] }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Failed to save alumni record");
      toast.success("Alumni record saved");
      await loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save alumni record");
    } finally {
      setBusyId("");
    }
  }

  async function reactivate(studentId: string) {
    setBusyId(studentId);
    try {
      const response = await fetch(endpoint(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "alumni.reactivate", studentId }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Failed to reactivate student");
      toast.success("Alumni record reactivated as student");
      await loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to reactivate student");
    } finally {
      setBusyId("");
    }
  }

  async function markContacted(studentId: string) {
    setBusyId(studentId);
    try {
      const response = await fetch(endpoint(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "alumni.touch", studentId }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Failed to update contact date");
      toast.success("Last contacted updated");
      await loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update contact date");
    } finally {
      setBusyId("");
    }
  }

  function exportAlumni(format: "csv" | "json") {
    const query = new URLSearchParams({ export: format });
    if (search.trim()) query.set("search", search.trim());
    if (destination.trim()) query.set("destination", destination.trim());
    window.open(endpoint(`&${query}`), "_blank", "noopener,noreferrer");
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Badge variant="outline" className="rounded-full">Graduate records</Badge>
            <h1 className="mt-3 text-3xl font-bold tracking-tight">Alumni</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">Maintain graduate records, destinations, employer details, and post-school notes from the same tenant student database.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={loadData} variant="outline" disabled={loading}>{loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}Refresh</Button>
            <Button variant="outline" onClick={() => exportAlumni("csv")}><Download className="mr-2 h-4 w-4" />CSV</Button>
            <Button variant="outline" onClick={() => exportAlumni("json")}><Download className="mr-2 h-4 w-4" />JSON</Button>
          </div>
        </div>
      </section>

      {error ? <Alert variant="destructive"><ShieldAlert className="h-4 w-4" /><AlertTitle>Alumni unavailable</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}

      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Metric icon={GraduationCap} label="Graduates" value={data?.summary.graduated || 0} />
        <Metric icon={BriefcaseBusiness} label="Destinations" value={data?.summary.withDestination || 0} />
        <Metric icon={MailCheck} label="Consented" value={data?.summary.consented || 0} />
        <Metric icon={Users} label="Mentors" value={data?.summary.mentors || 0} />
        <Metric icon={ShieldAlert} label="Missing Profiles" value={data?.summary.missingProfiles || 0} />
        <Metric icon={Users} label="Total Students" value={data?.summary.total || 0} />
      </div>

      <Card className="border-2">
        <CardHeader>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div><CardTitle className="text-2xl">Alumni Register</CardTitle><CardDescription>Graduated students are shown here automatically after promotion/graduation actions.</CardDescription></div>
            <div className="grid w-full gap-2 md:max-w-xl md:grid-cols-2">
              <div className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search alumni..." className="pl-9" /></div>
              <Input value={destination} onChange={(event) => setDestination(event.target.value)} placeholder="Filter employer/city..." />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-56 rounded-3xl" />) : data?.students.length ? data.students.map((student) => {
            const draft = drafts[student.id] || student.alumni;
            return (
              <div key={student.id} className="rounded-3xl border bg-muted/10 p-5">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <h3 className="text-xl font-bold">{student.name}</h3>
                    <p className="text-sm text-muted-foreground">{student.admissionNumber || "No admission number"} · {student.className || "Final class not recorded"} · Graduated {dateLabel(student.graduationDate)}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{student.email || "No email"} · {student.phone || "No phone"}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button asChild variant="outline" size="sm"><Link href={tenantPath(tenant, `/admin/students/${student.id}`)}>View Full Record</Link></Button>
                    <Button variant="outline" size="sm" onClick={() => markContacted(student.id)} disabled={busyId === student.id}><MailCheck className="mr-2 h-4 w-4" />Contacted</Button>
                    <Button variant="outline" size="sm" onClick={() => reactivate(student.id)} disabled={busyId === student.id}><RotateCcw className="mr-2 h-4 w-4" />Reactivate</Button>
                    <Button size="sm" onClick={() => saveAlumni(student.id)} disabled={busyId === student.id} className="bg-orange-600 text-white hover:bg-orange-700">{busyId === student.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}Save</Button>
                  </div>
                </div>
                <div className="mt-5 grid gap-3 lg:grid-cols-3">
                  <Input placeholder="Employer / Institution" value={draft.employer || ""} onChange={(event) => updateDraft(student.id, "employer", event.target.value)} />
                  <Input placeholder="Occupation / Program" value={draft.occupation || ""} onChange={(event) => updateDraft(student.id, "occupation", event.target.value)} />
                  <Input placeholder="Destination / City" value={draft.destination || ""} onChange={(event) => updateDraft(student.id, "destination", event.target.value)} />
                  <Input placeholder="Current city" value={draft.currentCity || ""} onChange={(event) => updateDraft(student.id, "currentCity", event.target.value)} />
                  <Input placeholder="LinkedIn / profile URL" value={draft.linkedinUrl || ""} onChange={(event) => updateDraft(student.id, "linkedinUrl", event.target.value)} />
                  <div className="grid gap-2 md:grid-cols-2">
                    <Toggle label="Contact consent" checked={Boolean(draft.consentToContact)} onChange={(value) => updateDraft(student.id, "consentToContact", value)} />
                    <Toggle label="Mentor opt-in" checked={Boolean(draft.mentorshipOptIn)} onChange={(value) => updateDraft(student.id, "mentorshipOptIn", value)} />
                  </div>
                  <Textarea className="lg:col-span-3" placeholder="Graduation notes, achievements, scholarships, follow-up tasks..." value={draft.graduationNotes || ""} onChange={(event) => updateDraft(student.id, "graduationNotes", event.target.value)} />
                  <p className="text-xs text-muted-foreground lg:col-span-3">Engagement score: {student.engagementScore}/5 · Last contacted: {dateLabel(draft.lastContactedAt || null)}</p>
                </div>
              </div>
            );
          }) : <div className="rounded-2xl border border-dashed p-10 text-center"><GraduationCap className="mx-auto h-10 w-10 text-muted-foreground" /><h3 className="mt-3 text-lg font-semibold">No alumni yet</h3><p className="mt-1 text-sm text-muted-foreground">Graduate students from the promotion page to create alumni records automatically.</p></div>}
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: number }) {
  return <Card className="border-2"><CardContent className="p-5"><Icon className="h-8 w-8 text-orange-500" /><p className="mt-4 text-xs font-bold uppercase text-muted-foreground">{label}</p><p className="text-3xl font-bold">{value}</p></CardContent></Card>;
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return <div className="flex items-center justify-between rounded-xl border bg-card px-3 py-2"><span className="text-xs font-bold">{label}</span><Switch checked={checked} onCheckedChange={onChange} /></div>;
}
