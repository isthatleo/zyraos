"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Check, Loader2, Upload } from "lucide-react";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { getTenantSubdomain } from "@/lib/tenant-routing";
import { cn } from "@/lib/utils";

type AdmissionClass = { id: string; name: string; section: string; academicYear: string; capacity: number; enrolled: number; seatsAvailable: number | null };
type AdmissionsData = { nextApplicationId: string; school: { name: string }; classes: AdmissionClass[] };
type AccessResult = {
  applicationId: string;
  admissionNumber: string;
  student: { email: string; temporaryPassword: string | null; dashboardPath: string };
  parent: { email: string; temporaryPassword: string | null; dashboardPath: string };
};
type FormState = {
  firstName: string; lastName: string; otherNames: string; gender: string; dateOfBirth: string; nationality: string; phone: string; email: string; address: string;
  classId: string; academicYear: string; previousSchool: string;
  guardianName: string; guardianRelationship: string; guardianContact: string; guardianEmail: string; guardianOccupation: string; guardianAddress: string;
  birthCertificate: string; passportPhoto: string; previousResults: string; medicalRecords: string;
  entryExamScore: string; adminNotes: string;
};

const steps = ["Student Info", "Academic", "Parent/Guardian", "Documents", "Notes"];
const nationalities = ["Ugandan", "Ghanaian", "Kenyan", "Tanzanian", "Rwandan", "Nigerian", "South African", "British", "American", "Canadian", "Indian", "Other"];
const emptyForm: FormState = {
  firstName: "", lastName: "", otherNames: "", gender: "female", dateOfBirth: "", nationality: "Ugandan", phone: "", email: "", address: "",
  classId: "", academicYear: "", previousSchool: "",
  guardianName: "", guardianRelationship: "parent", guardianContact: "", guardianEmail: "", guardianOccupation: "", guardianAddress: "",
  birthCertificate: "", passportPhoto: "", previousResults: "", medicalRecords: "",
  entryExamScore: "", adminNotes: "",
};

function classLabel(item: AdmissionClass) {
  return [item.name, item.section && !item.name.toLowerCase().includes(item.section.toLowerCase()) ? item.section : ""].filter(Boolean).join(" ");
}

export default function NewAdmissionPage() {
  const router = useRouter();
  const params = useParams<{ tenant?: string }>();
  const tenantSlug = String(params?.tenant || "");
  const [isTenantSubdomain, setIsTenantSubdomain] = React.useState(false);
  const [data, setData] = React.useState<AdmissionsData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [activeStep, setActiveStep] = React.useState(0);
  const [completedSteps, setCompletedSteps] = React.useState<Set<number>>(new Set());
  const [form, setForm] = React.useState<FormState>(emptyForm);
  const [accessResult, setAccessResult] = React.useState<AccessResult | null>(null);

  React.useEffect(() => setIsTenantSubdomain(Boolean(getTenantSubdomain(window.location.hostname))), []);
  const tenantHref = React.useCallback((href: string) => {
    if (isTenantSubdomain || !tenantSlug) return href;
    return href.startsWith("/") ? `/${tenantSlug}${href}` : `/${tenantSlug}/${href}`;
  }, [isTenantSubdomain, tenantSlug]);

  React.useEffect(() => {
    async function load() {
      setLoading(true);
      const response = await fetch(`/api/tenant/admin/admissions?slug=${encodeURIComponent(tenantSlug)}`, { cache: "no-store", credentials: "include" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        toast.error(payload?.error || "Failed to load admission setup");
      } else {
        const next = payload as AdmissionsData;
        setData(next);
        setForm((current) => ({ ...current, academicYear: next.classes[0]?.academicYear || String(new Date().getFullYear()) }));
      }
      setLoading(false);
    }
    if (tenantSlug) void load();
  }, [tenantSlug]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function validate(step: number) {
    if (step === 0 && (!form.firstName || !form.lastName || !form.dateOfBirth || !form.phone || !form.address)) return "Complete student name, birth date, phone number, and home address.";
    if (step === 1 && (!form.classId || !form.academicYear)) return "Select class applying for and academic year.";
    if (step === 2 && (!form.guardianName || !form.guardianRelationship || !form.guardianContact)) return "Complete parent/guardian name, relationship, and contact.";
    return "";
  }

  function nextStep() {
    const error = validate(activeStep);
    if (error) {
      toast.error(error);
      return;
    }
    setCompletedSteps((current) => new Set([...current, activeStep]));
    setActiveStep((current) => Math.min(current + 1, steps.length - 1));
  }

  async function submitApplication() {
    for (let index = 0; index < 3; index += 1) {
      const error = validate(index);
      if (error) {
        setActiveStep(index);
        toast.error(error);
        return;
      }
    }
    setSaving(true);
    try {
      const response = await fetch(`/api/tenant/admin/admissions?slug=${encodeURIComponent(tenantSlug)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ...form, status: "pending" }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || "Failed to submit application");
      toast.success(`Application submitted: ${payload.applicationId}`);
      setAccessResult({
        applicationId: String(payload.applicationId || ""),
        admissionNumber: String(payload.admissionNumber || ""),
        student: payload.access?.student,
        parent: payload.access?.parent,
      });
      setCompletedSteps(new Set([0, 1, 2, 3, 4]));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to submit application");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="space-y-6"><Skeleton className="h-40 rounded-3xl" /><Skeleton className="h-96 rounded-3xl" /></div>;

  const selectedClass = data?.classes.find((item) => item.id === form.classId);

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border bg-card p-6 shadow-sm">
        <Button variant="ghost" className="mb-3 px-0" onClick={() => router.push(tenantHref("/admin/admissions"))}><ArrowLeft className="size-4" />Back to Admissions</Button>
        <div className="flex flex-wrap gap-2"><Badge className="rounded-full border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-300">New Enrollment</Badge><Badge variant="outline" className="rounded-full">{data?.nextApplicationId}</Badge><Badge variant="outline" className="rounded-full">{data?.school.name}</Badge></div>
        <h1 className="mt-4 text-3xl font-bold tracking-tight md:text-4xl">New Admission Application</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">Complete the five-step enrollment form. Completed tabs turn orange and checked.</p>
      </section>

      {accessResult ? (
        <div
          role="button"
          tabIndex={0}
          onClick={() => router.push(tenantHref(`/admin/admissions/${accessResult.applicationId}`))}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") router.push(tenantHref(`/admin/admissions/${accessResult.applicationId}`));
          }}
          className="rounded-3xl border border-emerald-500/30 bg-emerald-500/5 p-2 outline-none transition-colors hover:bg-emerald-500/10 focus-visible:ring-3 focus-visible:ring-emerald-500/30"
        >
        <Card className="border-emerald-500/30 bg-card" onClick={(event) => event.stopPropagation()}>
          <CardHeader>
            <CardTitle>Application Submitted</CardTitle>
            <CardDescription>
              {accessResult.applicationId} is created. Student and parent dashboard access has been provisioned.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border bg-card p-4">
              <p className="text-sm font-semibold">Student Access</p>
              <p className="mt-2 text-sm text-muted-foreground">Email</p>
              <p className="font-mono text-sm">{accessResult.student.email}</p>
              <p className="mt-2 text-sm text-muted-foreground">Temporary Password</p>
              <p className="font-mono text-sm">{accessResult.student.temporaryPassword || "Existing account password unchanged"}</p>
              <p className="mt-2 text-xs text-muted-foreground">Dashboard: {accessResult.student.dashboardPath}</p>
            </div>
            <div className="rounded-2xl border bg-card p-4">
              <p className="text-sm font-semibold">Parent / Guardian Access</p>
              <p className="mt-2 text-sm text-muted-foreground">Email</p>
              <p className="font-mono text-sm">{accessResult.parent.email}</p>
              <p className="mt-2 text-sm text-muted-foreground">Temporary Password</p>
              <p className="font-mono text-sm">{accessResult.parent.temporaryPassword || "Existing account password unchanged"}</p>
              <p className="mt-2 text-xs text-muted-foreground">Dashboard: {accessResult.parent.dashboardPath}</p>
            </div>
            <div className="flex flex-wrap gap-3 md:col-span-2">
              <Button onClick={() => router.push(tenantHref("/admin/admissions"))}>Open Admissions Records</Button>
              <Button variant="outline" onClick={() => router.push(tenantHref(`/admin/admissions/${accessResult.applicationId}`))}>View Application Details</Button>
            </div>
          </CardContent>
        </Card>
        </div>
      ) : null}

      <Card className="border-orange-500/30">
        <CardHeader><CardTitle>Enrollment Steps</CardTitle><CardDescription>Student info, academic placement, guardian details, documents, and notes.</CardDescription></CardHeader>
        <CardContent className="space-y-5">
          <div className="flex flex-wrap gap-2">
            {steps.map((step, index) => {
              const completed = completedSteps.has(index);
              return (
                <button key={step} type="button" onClick={() => setActiveStep(index)} className={cn("flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-colors", activeStep === index && "border-orange-500 bg-orange-600 text-white", completed && activeStep !== index && "border-orange-500/40 bg-orange-500/10 text-orange-700 dark:text-orange-300")}>
                  <span className="flex size-5 items-center justify-center rounded-full border bg-background text-xs text-foreground">{completed ? <Check className="size-3 text-orange-600" /> : index + 1}</span>
                  {step}
                </button>
              );
            })}
          </div>

          {activeStep === 0 ? (
            <StepCard title="Student Info">
              <Field label="First Name"><Input value={form.firstName} onChange={(e) => update("firstName", e.target.value)} /></Field>
              <Field label="Last Name"><Input value={form.lastName} onChange={(e) => update("lastName", e.target.value)} /></Field>
              <Field label="Other Names"><Input value={form.otherNames} onChange={(e) => update("otherNames", e.target.value)} /></Field>
              <Field label="Gender"><Select value={form.gender} onValueChange={(v) => update("gender", v)}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="female">Female</SelectItem><SelectItem value="male">Male</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent></Select></Field>
              <Field label="Date of Birth"><Input type="date" value={form.dateOfBirth} onChange={(e) => update("dateOfBirth", e.target.value)} /></Field>
              <Field label="Nationality"><Select value={form.nationality} onValueChange={(v) => update("nationality", v)}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent>{nationalities.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></Field>
              <Field label="Phone Number">
                <ThemedPhoneInput value={form.phone} onChange={(value) => update("phone", value)} />
              </Field>
              <Field label="Email"><Input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} /></Field>
              <Field label="Home Address" wide><Textarea value={form.address} onChange={(e) => update("address", e.target.value)} /></Field>
              <StepButtons prevDisabled nextLabel="Continue to Academic" onNext={nextStep} />
            </StepCard>
          ) : null}

          {activeStep === 1 ? (
            <StepCard title="Academic">
              <ClassPicker classes={data?.classes || []} value={form.classId} onChange={(value) => update("classId", value)} />
              <Field label="Academic Year"><Input value={form.academicYear} onChange={(e) => update("academicYear", e.target.value)} /></Field>
              <Field label="Previous School" wide><Input value={form.previousSchool} onChange={(e) => update("previousSchool", e.target.value)} /></Field>
              {selectedClass ? <div className="rounded-2xl border bg-muted/30 p-4 md:col-span-2"><p className="font-semibold">{classLabel(selectedClass)}</p><p className="text-xs text-muted-foreground">{selectedClass.enrolled}/{selectedClass.capacity || "unlimited"} enrolled</p><Progress value={selectedClass.capacity ? Math.min((selectedClass.enrolled / selectedClass.capacity) * 100, 100) : 0} className="mt-3 h-2" /></div> : null}
              <StepButtons nextLabel="Continue to Parent/Guardian" onPrev={() => setActiveStep(0)} onNext={nextStep} />
            </StepCard>
          ) : null}

          {activeStep === 2 ? (
            <StepCard title="Parent/Guardian">
              <Field label="Parent/Guardian Full Name"><Input value={form.guardianName} onChange={(e) => update("guardianName", e.target.value)} /></Field>
              <Field label="Relationship"><Select value={form.guardianRelationship} onValueChange={(v) => update("guardianRelationship", v)}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="parent">Parent</SelectItem><SelectItem value="guardian">Guardian</SelectItem><SelectItem value="father">Father</SelectItem><SelectItem value="mother">Mother</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent></Select></Field>
              <Field label="Parent/Guardian Contact">
                <ThemedPhoneInput value={form.guardianContact} onChange={(value) => update("guardianContact", value)} />
              </Field>
              <Field label="Email"><Input type="email" value={form.guardianEmail} onChange={(e) => update("guardianEmail", e.target.value)} /></Field>
              <Field label="Occupation"><Input value={form.guardianOccupation} onChange={(e) => update("guardianOccupation", e.target.value)} /></Field>
              <Field label="Address"><Input value={form.guardianAddress} onChange={(e) => update("guardianAddress", e.target.value)} /></Field>
              <StepButtons nextLabel="Continue to Documents" onPrev={() => setActiveStep(1)} onNext={nextStep} orange />
            </StepCard>
          ) : null}

          {activeStep === 3 ? (
            <StepCard title="Documents" description="Upload from local device or paste document URLs.">
              <DocumentField label="Birth Certificate" value={form.birthCertificate} onChange={(value) => update("birthCertificate", value)} />
              <DocumentField label="Passport Photo" value={form.passportPhoto} onChange={(value) => update("passportPhoto", value)} />
              <DocumentField label="Previous School Results" value={form.previousResults} onChange={(value) => update("previousResults", value)} />
              <DocumentField label="Medical Records" value={form.medicalRecords} onChange={(value) => update("medicalRecords", value)} />
              <StepButtons nextLabel="Continue to Notes" onPrev={() => setActiveStep(2)} onNext={nextStep} />
            </StepCard>
          ) : null}

          {activeStep === 4 ? (
            <StepCard title="Notes">
              <Field label="Entry Exam Score"><Input value={form.entryExamScore} onChange={(e) => update("entryExamScore", e.target.value)} /></Field>
              <Field label="Admin Notes" wide><Textarea value={form.adminNotes} onChange={(e) => update("adminNotes", e.target.value)} /></Field>
              <div className="flex justify-between gap-3 md:col-span-2"><Button variant="outline" onClick={() => setActiveStep(3)}>Previous Step</Button><Button className="bg-orange-600 text-white hover:bg-orange-700" onClick={submitApplication} disabled={saving}>{saving ? <Loader2 className="size-4 animate-spin" /> : null}{saving ? "Submitting..." : "Submit Application"}</Button></div>
            </StepCard>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

function StepCard({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return <Card><CardHeader><CardTitle>{title}</CardTitle>{description ? <CardDescription>{description}</CardDescription> : null}</CardHeader><CardContent className="grid gap-4 md:grid-cols-2">{children}</CardContent></Card>;
}

function Field({ label, children, wide }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return <div className={cn("space-y-2", wide && "md:col-span-2")}><Label>{label}</Label>{children}</div>;
}

function ClassPicker({ classes, value, onChange }: { classes: AdmissionClass[]; value: string; onChange: (value: string) => void }) {
  return (
    <div className="space-y-3 md:col-span-2">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Label>Grade/Class Applying For</Label>
          <p className="mt-1 text-xs text-muted-foreground">Select one available class. Capacity and seats are shown on each card.</p>
        </div>
        {value ? (
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange("")}>
            Clear selection
          </Button>
        ) : null}
      </div>
      <div className="grid max-h-80 gap-3 overflow-y-auto rounded-2xl border bg-muted/20 p-3 sm:grid-cols-2 xl:grid-cols-3">
        {classes.length ? classes.map((item) => {
          const selected = item.id === value;
          const used = item.capacity ? Math.min((item.enrolled / item.capacity) * 100, 100) : 0;
          const full = item.seatsAvailable !== null && item.seatsAvailable <= 0;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onChange(item.id)}
              className={cn(
                "rounded-2xl border bg-card p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-orange-500/50 hover:shadow-md",
                selected && "border-orange-500 bg-orange-500/10 ring-2 ring-orange-500/20",
                full && !selected && "opacity-70"
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">{classLabel(item)}</p>
                  <p className="mt-1 truncate text-xs text-muted-foreground">{item.academicYear || "No academic year"}</p>
                </div>
                <Badge variant={selected ? "default" : "outline"} className={cn("shrink-0 rounded-full", selected && "bg-orange-600 text-white")}>
                  {selected ? "Selected" : full ? "Full" : "Open"}
                </Badge>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-xl bg-muted/60 p-2">
                  <p className="text-muted-foreground">Enrolled</p>
                  <p className="font-semibold">{item.enrolled}</p>
                </div>
                <div className="rounded-xl bg-muted/60 p-2">
                  <p className="text-muted-foreground">Seats</p>
                  <p className="font-semibold">{item.seatsAvailable === null ? "Open" : item.seatsAvailable}</p>
                </div>
              </div>
              <Progress value={used} className="mt-3 h-1.5" />
            </button>
          );
        }) : (
          <div className="rounded-2xl border border-dashed bg-card p-6 text-center text-sm text-muted-foreground sm:col-span-2 xl:col-span-3">
            No classes are configured yet.
          </div>
        )}
      </div>
    </div>
  );
}

function ThemedPhoneInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <PhoneInput
      international
      defaultCountry="UG"
      value={value || undefined}
      onChange={(nextValue) => onChange(nextValue || "")}
      className={cn(
        "flex h-10 w-full items-center rounded-lg border border-input bg-background px-3 text-sm text-foreground shadow-xs transition-colors",
        "focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50",
        "dark:bg-input/30",
        "[&_.PhoneInputCountry]:mr-2 [&_.PhoneInputCountrySelectArrow]:border-muted-foreground",
        "[&_.PhoneInputInput]:h-8 [&_.PhoneInputInput]:min-w-0 [&_.PhoneInputInput]:flex-1 [&_.PhoneInputInput]:border-0 [&_.PhoneInputInput]:bg-transparent [&_.PhoneInputInput]:text-foreground [&_.PhoneInputInput]:outline-none"
      )}
    />
  );
}

function StepButtons({ nextLabel, onNext, onPrev, prevDisabled, orange }: { nextLabel: string; onNext: () => void; onPrev?: () => void; prevDisabled?: boolean; orange?: boolean }) {
  return <div className="flex justify-between gap-3 md:col-span-2"><Button variant="outline" disabled={prevDisabled} onClick={onPrev}>Previous Step</Button><Button className={orange ? "bg-orange-600 text-white hover:bg-orange-700" : ""} onClick={onNext}>{nextLabel}</Button></div>;
}

function DocumentField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <div className="rounded-2xl border bg-muted/20 p-4">
      <Label>{label}</Label>
      <div className="mt-3 space-y-2">
        <Input value={value} onChange={(event) => onChange(event.target.value)} placeholder="Paste document URL or upload file" />
        <Label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed bg-card p-3 text-sm text-muted-foreground transition-colors hover:border-orange-500/50">
          <Upload className="size-4" />Upload from device
          <Input type="file" className="hidden" onChange={(event) => onChange(event.target.files?.[0]?.name || value)} />
        </Label>
      </div>
    </div>
  );
}
