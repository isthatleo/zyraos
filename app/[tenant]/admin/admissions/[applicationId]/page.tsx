"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, CalendarCheck, Check, CheckCircle2, FileText, GraduationCap, Loader2, Save, ShieldAlert, Trash2, UserCheck, UserRound, XCircle } from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { getTenantSubdomain } from "@/lib/tenant-routing";
import { cn } from "@/lib/utils";

type Application = {
  id: string;
  applicationId: string;
  admissionNumber: string;
  name: string;
  nationality: string;
  email: string;
  phone: string;
  gender: string;
  dateOfBirth: string | null;
  address: string;
  classId: string;
  className: string;
  status: string;
  pipelineState: string;
  previousSchool: string;
  academicYear: string;
  guardian: { name: string; relationship: string; contact: string; email: string; occupation: string; address: string };
  documents: { birthCertificate: string; passportPhoto: string; previousResults: string; medicalRecords: string };
  notes: { entryExamScore: string; adminNotes: string };
};
type AdmissionClass = { id: string; name: string; section: string };
type ApiData = { application: Application | null; classes: AdmissionClass[]; school: { name: string } };

const pipeline = ["applied", "review", "docs_missing", "interview", "tested", "accepted", "payment", "enrolled"];
const labels: Record<string, string> = {
  applied: "Applied",
  review: "Review",
  docs_missing: "Docs Missing",
  interview: "Interview",
  tested: "Tested",
  accepted: "Accepted",
  payment: "Payment",
  enrolled: "Enrolled",
  waitlisted: "Waitlisted",
  rejected: "Rejected",
};
const pipelineIcons = [FileText, ShieldAlert, FileText, CalendarCheck, CheckCircle2, UserCheck, GraduationCap, Check];

function classLabel(item: AdmissionClass) {
  return [item.name, item.section && !item.name.toLowerCase().includes(item.section.toLowerCase()) ? item.section : ""].filter(Boolean).join(" ");
}

function statusClass(status: string) {
  if (["active", "enrolled", "accepted"].includes(status)) return "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  if (status === "waitlisted") return "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300";
  if (["suspended", "rejected", "docs_missing"].includes(status)) return "border-destructive/25 bg-destructive/10 text-destructive";
  return "border-primary/25 bg-primary/10 text-primary";
}

export default function AdmissionDetailsPage() {
  const router = useRouter();
  const params = useParams<{ tenant?: string; applicationId?: string }>();
  const tenantSlug = String(params?.tenant || "");
  const applicationId = String(params?.applicationId || "");
  const [isTenantSubdomain, setIsTenantSubdomain] = React.useState(false);
  const [data, setData] = React.useState<ApiData | null>(null);
  const [form, setForm] = React.useState<Application | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [pendingPipeline, setPendingPipeline] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => setIsTenantSubdomain(Boolean(getTenantSubdomain(window.location.hostname))), []);
  const tenantHref = React.useCallback((href: string) => {
    if (isTenantSubdomain || !tenantSlug) return href;
    return href.startsWith("/") ? `/${tenantSlug}${href}` : `/${tenantSlug}/${href}`;
  }, [isTenantSubdomain, tenantSlug]);

  const loadApplication = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams({ slug: tenantSlug, applicationId });
      const response = await fetch(`/api/tenant/admin/admissions?${query.toString()}`, { cache: "no-store", credentials: "include" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || "Failed to load application");
      setData(payload as ApiData);
      setForm((payload as ApiData).application);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load application");
    } finally {
      setLoading(false);
    }
  }, [applicationId, tenantSlug]);

  React.useEffect(() => void loadApplication(), [loadApplication]);

  function update<K extends keyof Application>(key: K, value: Application[K]) {
    setForm((current) => current ? { ...current, [key]: value } : current);
  }

  function updateNested(section: "guardian" | "documents" | "notes", key: string, value: string) {
    setForm((current) => current ? { ...current, [section]: { ...current[section], [key]: value } } : current);
  }

  async function saveChanges(nextPipeline = form?.pipelineState || "applied", nextStatus = form?.status || "pending") {
    if (!form) return;
    const previous = form;
    const nextForm = { ...form, pipelineState: nextPipeline, status: nextStatus };
    setForm(nextForm);
    setSaving(true);
    setPendingPipeline(nextPipeline);
    try {
      const response = await fetch(`/api/tenant/admin/admissions?slug=${encodeURIComponent(tenantSlug)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          studentId: nextForm.id,
          applicationId: nextForm.applicationId,
          classId: nextForm.classId,
          status: nextStatus,
          pipelineState: nextPipeline,
          previousSchool: nextForm.previousSchool,
          academicYear: nextForm.academicYear,
          guardian: nextForm.guardian,
          documents: nextForm.documents,
          notes: nextForm.notes,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || "Failed to save application");
      toast.success("Application updated");
    } catch (saveError) {
      setForm(previous);
      toast.error(saveError instanceof Error ? saveError.message : "Failed to save application");
    } finally {
      setSaving(false);
      setPendingPipeline(null);
    }
  }

  function togglePipeline(state: string) {
    if (!form) return;
    const currentIndex = pipeline.indexOf(form.pipelineState);
    const clickedIndex = pipeline.indexOf(state);
    const nextState = clickedIndex <= currentIndex && clickedIndex > 0 ? pipeline[clickedIndex - 1] : state;
    const nextStatus = nextState === "enrolled" ? "active" : nextState === "waitlisted" ? "waitlisted" : form.status === "active" && nextState !== "enrolled" ? "pending" : form.status;
    void saveChanges(nextState, nextStatus);
  }

  if (loading) return <div className="space-y-6"><Skeleton className="h-64 rounded-3xl" /><Skeleton className="h-40 rounded-3xl" /><Skeleton className="h-96 rounded-3xl" /></div>;
  if (error || !form) return <Alert variant="destructive" className="rounded-3xl"><AlertTitle>Application failed to load</AlertTitle><AlertDescription>{error || "Application was not found."}</AlertDescription></Alert>;

  const currentIndex = pipeline.indexOf(form.pipelineState);
  const safeCurrentIndex = currentIndex >= 0 ? currentIndex : 0;
  const isEnrolled = form.pipelineState === "enrolled" || form.status === "active";

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[2rem] border bg-card shadow-sm">
        <div className="bg-gradient-to-br from-orange-500/15 via-card to-emerald-500/10 p-6">
          <Button variant="ghost" className="mb-5 px-0 text-muted-foreground hover:text-foreground" onClick={() => router.push(tenantHref("/admin/admissions"))}>
            <ArrowLeft className="size-4" />
            Back to Admissions
          </Button>
          <div className="grid gap-6 xl:grid-cols-[1fr_340px] xl:items-end">
            <div>
              <div className="flex flex-wrap gap-2">
                <Badge className={cn("rounded-full capitalize", statusClass(form.pipelineState))}>{labels[form.pipelineState] || form.pipelineState}</Badge>
                <Badge variant="outline" className="rounded-full">{form.applicationId}</Badge>
                <Badge variant="outline" className="rounded-full">{form.admissionNumber}</Badge>
              </div>
              <div className="mt-5 flex items-start gap-4">
                <div className="flex size-16 shrink-0 items-center justify-center rounded-3xl bg-orange-600 text-xl font-black text-white shadow-lg">
                  {form.name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "AP"}
                </div>
                <div>
                  <h1 className="text-3xl font-black tracking-tight md:text-5xl">{form.name}</h1>
                  <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                    {data?.school.name} application workspace. Update pipeline, documents, guardian details, interview results, and enrollment decisions without leaving the page.
                  </p>
                </div>
              </div>
            </div>
            <div className="grid gap-3 rounded-3xl border bg-card/80 p-4 backdrop-blur">
              <Button variant="destructive" onClick={() => saveChanges("rejected", "suspended")} disabled={saving}>
                <XCircle className="size-4" />
                Reject Application
              </Button>
              <Button className="bg-orange-600 text-white hover:bg-orange-700 disabled:bg-muted disabled:text-muted-foreground" onClick={() => saveChanges("enrolled", "active")} disabled={saving || isEnrolled}>
                {isEnrolled ? <CheckCircle2 className="size-4" /> : <UserCheck className="size-4" />}
                {isEnrolled ? "Student Enrolled" : "Enroll Student"}
              </Button>
            </div>
          </div>
        </div>
      </section>

      <Card className="border-orange-500/25">
        <CardHeader>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Pipeline Status</CardTitle>
              <CardDescription>Click a stage to check it. Click an already checked stage to roll back one step.</CardDescription>
            </div>
            <Badge className={cn("w-fit rounded-full capitalize", statusClass(form.pipelineState))}>{labels[form.pipelineState] || form.pipelineState}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-4 xl:grid-cols-8">
            {pipeline.map((state, index) => {
              const checked = index <= safeCurrentIndex;
              const active = state === form.pipelineState;
              const Icon = pipelineIcons[index] || Check;
              const busy = pendingPipeline === state;
              return (
                <button
                  key={state}
                  type="button"
                  onClick={() => togglePipeline(state)}
                  disabled={saving}
                  className={cn(
                    "group rounded-2xl border bg-card p-3 text-left transition-all hover:-translate-y-0.5 hover:border-orange-500/50 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-70",
                    checked && "border-orange-500/40 bg-orange-500/10",
                    active && "border-orange-600 bg-orange-600 text-white shadow-lg shadow-orange-500/20"
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className={cn("flex size-9 items-center justify-center rounded-xl border bg-background text-foreground", checked && "border-orange-500 text-orange-600", active && "border-white/30 bg-white/20 text-white")}>
                      {busy ? <Loader2 className="size-4 animate-spin" /> : checked ? <Check className="size-4" /> : <Icon className="size-4" />}
                    </span>
                    <span className="text-xs font-semibold opacity-70">{index + 1}</span>
                  </div>
                  <p className="mt-3 text-sm font-bold">{labels[state]}</p>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <section className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          <DetailsCard title="Student Info" icon={UserRound}>
            <Field label="Applicant"><Input value={form.name} readOnly /></Field>
            <Field label="Gender"><Input value={form.gender} readOnly /></Field>
            <Field label="Nationality"><Input value={form.nationality} readOnly /></Field>
            <Field label="Phone"><Input value={form.phone} readOnly /></Field>
            <Field label="Email"><Input value={form.email} readOnly /></Field>
            <Field label="Home Address" wide><Textarea value={form.address} readOnly /></Field>
          </DetailsCard>

          <DetailsCard title="Academic" icon={GraduationCap}>
            <Field label="Class Applying For">
              <Select value={form.classId || "none"} onValueChange={(value) => update("classId", value === "none" ? "" : value)}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="none">Unassigned</SelectItem>{data?.classes.map((item) => <SelectItem key={item.id} value={item.id}>{classLabel(item)}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Academic Year"><Input value={form.academicYear} onChange={(event) => update("academicYear", event.target.value)} /></Field>
            <Field label="Previous School" wide><Input value={form.previousSchool} onChange={(event) => update("previousSchool", event.target.value)} /></Field>
          </DetailsCard>

          <DetailsCard title="Parent/Guardian" icon={UserCheck}>
            <Field label="Full Name"><Input value={form.guardian.name} onChange={(event) => updateNested("guardian", "name", event.target.value)} /></Field>
            <Field label="Relationship"><Input value={form.guardian.relationship} onChange={(event) => updateNested("guardian", "relationship", event.target.value)} /></Field>
            <Field label="Contact"><Input value={form.guardian.contact} onChange={(event) => updateNested("guardian", "contact", event.target.value)} /></Field>
            <Field label="Email"><Input value={form.guardian.email} onChange={(event) => updateNested("guardian", "email", event.target.value)} /></Field>
            <Field label="Occupation"><Input value={form.guardian.occupation} onChange={(event) => updateNested("guardian", "occupation", event.target.value)} /></Field>
            <Field label="Address"><Input value={form.guardian.address} onChange={(event) => updateNested("guardian", "address", event.target.value)} /></Field>
          </DetailsCard>

          <DetailsCard title="Interview & Exam" icon={CalendarCheck}>
            <Field label="Entry Exam Score"><Input value={form.notes.entryExamScore} onChange={(event) => updateNested("notes", "entryExamScore", event.target.value)} /></Field>
            <Field label="Pipeline State"><Input value={labels[form.pipelineState] || form.pipelineState} readOnly /></Field>
          </DetailsCard>

          <DetailsCard title="Documents" icon={FileText}>
            <Field label="Birth Certificate"><Input value={form.documents.birthCertificate} onChange={(event) => updateNested("documents", "birthCertificate", event.target.value)} /></Field>
            <Field label="Passport Photo"><Input value={form.documents.passportPhoto} onChange={(event) => updateNested("documents", "passportPhoto", event.target.value)} /></Field>
            <Field label="Previous Results"><Input value={form.documents.previousResults} onChange={(event) => updateNested("documents", "previousResults", event.target.value)} /></Field>
            <Field label="Medical Records"><Input value={form.documents.medicalRecords} onChange={(event) => updateNested("documents", "medicalRecords", event.target.value)} /></Field>
          </DetailsCard>

          <DetailsCard title="Admin Notes" icon={Save}>
            <Field label="Notes" wide><Textarea value={form.notes.adminNotes} onChange={(event) => updateNested("notes", "adminNotes", event.target.value)} /></Field>
          </DetailsCard>
        </div>

        <div className="space-y-5 xl:sticky xl:top-6 xl:self-start">
          <Card className="overflow-hidden">
            <CardHeader className="bg-muted/40">
              <CardTitle>Application Info</CardTitle>
              <CardDescription>Core identifiers and current decision state.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 p-4 text-sm">
              <Info label="Application ID" value={form.applicationId} />
              <Info label="Admission No." value={form.admissionNumber} />
              <Info label="Class" value={form.className || "Unassigned"} />
              <Info label="Status" value={form.status} />
            </CardContent>
          </Card>

          <Card className="border-orange-500/25">
            <CardHeader>
              <CardTitle>Pipeline Actions</CardTitle>
              <CardDescription>Interactive actions update the status card immediately.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2">
              <ActionButton label="Under Review" state="review" onClick={togglePipeline} active={form.pipelineState === "review"} saving={saving} />
              <ActionButton label="Docs Missing" state="docs_missing" onClick={togglePipeline} active={form.pipelineState === "docs_missing"} saving={saving} />
              <ActionButton label="Interview Set" state="interview" onClick={togglePipeline} active={form.pipelineState === "interview"} saving={saving} />
              <ActionButton label="Interview Done / Tested" state="tested" onClick={togglePipeline} active={form.pipelineState === "tested"} saving={saving} />
              <ActionButton label="Accepted" state="accepted" onClick={togglePipeline} active={form.pipelineState === "accepted"} saving={saving} />
              <ActionButton label="Payment" state="payment" onClick={togglePipeline} active={form.pipelineState === "payment"} saving={saving} />
              <Button variant="destructive" className="justify-start rounded-2xl" onClick={() => saveChanges("rejected", "suspended")} disabled={saving}>
                <Trash2 className="size-4" />
                Delete / Reject
              </Button>
            </CardContent>
          </Card>

          <Button className="w-full rounded-2xl bg-orange-600 text-white hover:bg-orange-700" onClick={() => saveChanges()} disabled={saving}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            Save All Changes
          </Button>
        </div>
      </section>
    </div>
  );
}

function DetailsCard({ title, icon: Icon, children }: { title: string; icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b bg-muted/30">
        <CardTitle className="flex items-center gap-2">
          <span className="rounded-xl bg-orange-500/10 p-2 text-orange-600"><Icon className="size-4" /></span>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 p-5 md:grid-cols-2">{children}</CardContent>
    </Card>
  );
}

function Field({ label, children, wide }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return <div className={cn("space-y-2", wide && "md:col-span-2")}><Label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</Label>{children}</div>;
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border bg-card p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 font-bold capitalize">{value || "Not set"}</p></div>;
}

function ActionButton({ label, state, active, saving, onClick }: { label: string; state: string; active: boolean; saving: boolean; onClick: (state: string) => void }) {
  return (
    <Button
      variant={active ? "default" : "outline"}
      className={cn("justify-start rounded-2xl", active && "bg-orange-600 text-white hover:bg-orange-700")}
      onClick={() => onClick(state)}
      disabled={saving}
    >
      {active ? <Check className="size-4" /> : <span className="size-4 rounded-full border" />}
      {label}
    </Button>
  );
}
