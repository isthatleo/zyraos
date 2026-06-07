"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Check, FileUp, GraduationCap, Loader2, Plus, ShieldCheck, UserRound, Users } from "lucide-react";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { getTenantSubdomain } from "@/lib/tenant-routing";
import { cn } from "@/lib/utils";

type AdmissionClass = { id: string; name: string; grade: string; section: string; academicYear: string; capacity: number; enrolled: number; seatsAvailable: number | null };
type AdmissionsData = { nextApplicationId: string; nextAdmissionNumber: string; school: { name: string; slug?: string }; classes: AdmissionClass[] };
type ParentRecord = { id: string; fullName: string; relationship: string; occupation: string; phone: string; email: string; primaryFeePayer: boolean };
type AccessResult = {
  studentId: string;
  applicationId: string;
  admissionNumber: string;
  student: { email: string; temporaryPassword: string | null; dashboardPath: string };
  parent: { email: string; temporaryPassword: string | null; dashboardPath: string };
};
type FormState = {
  photo: string;
  firstName: string;
  middleName: string;
  lastName: string;
  preferredName: string;
  gender: string;
  dateOfBirth: string;
  nationality: string;
  region: string;
  nationalId: string;
  homeAddress: string;
  city: string;
  postalCode: string;
  phone: string;
  schoolEmail: string;
  admissionDate: string;
  academicYear: string;
  previousSchool: string;
  classId: string;
  customGrade: string;
  stream: string;
  reasonForTransfer: string;
  houseHostel: string;
  studentType: string;
  emergencyName: string;
  emergencyRelationship: string;
  emergencyPhone: string;
  parentFullName: string;
  parentRelationship: string;
  parentOccupation: string;
  parentPhone: string;
  parentEmail: string;
  primaryFeePayer: boolean;
  bloodGroup: string;
  allergies: string;
  chronicConditions: string;
  doctorName: string;
  doctorContact: string;
  coreStrengths: string;
  learningChallenges: string;
  transportBoarding: string;
  feePlan: string;
  scholarshipAid: string;
  paymentFrequency: string;
  birthCertificate: string;
  passportCopy: string;
  transferLetter: string;
  medicalHistory: string;
  previousResults: string;
  enrollmentConsent: boolean;
  dataPrivacyConsent: boolean;
  mediaConsent: boolean;
};

const steps = ["Basic Info", "Admission", "Parents", "Health & Academics", "Logistics & Finance", "Documents & Consent"];
const nationalities = ["Ugandan", "Ghanaian", "Kenyan", "Tanzanian", "Rwandan", "Nigerian", "South African", "British", "American", "Canadian", "Indian", "Other"];
const relationships = ["Mother", "Father", "Guardian", "Aunt", "Uncle", "Sibling", "Sponsor", "Other"];
const currentYear = new Date().getFullYear();

const emptyForm: FormState = {
  photo: "",
  firstName: "",
  middleName: "",
  lastName: "",
  preferredName: "",
  gender: "female",
  dateOfBirth: "",
  nationality: "Ugandan",
  region: "",
  nationalId: "",
  homeAddress: "",
  city: "",
  postalCode: "",
  phone: "",
  schoolEmail: "",
  admissionDate: new Date().toISOString().slice(0, 10),
  academicYear: String(currentYear),
  previousSchool: "",
  classId: "",
  customGrade: "",
  stream: "",
  reasonForTransfer: "",
  houseHostel: "",
  studentType: "day_student",
  emergencyName: "",
  emergencyRelationship: "Parent",
  emergencyPhone: "",
  parentFullName: "",
  parentRelationship: "Parent",
  parentOccupation: "",
  parentPhone: "",
  parentEmail: "",
  primaryFeePayer: true,
  bloodGroup: "",
  allergies: "",
  chronicConditions: "",
  doctorName: "",
  doctorContact: "",
  coreStrengths: "",
  learningChallenges: "",
  transportBoarding: "no",
  feePlan: "standard_tuition",
  scholarshipAid: "none",
  paymentFrequency: "per_term",
  birthCertificate: "",
  passportCopy: "",
  transferLetter: "",
  medicalHistory: "",
  previousResults: "",
  enrollmentConsent: false,
  dataPrivacyConsent: false,
  mediaConsent: false,
};

function tenantPath(tenant: string, path: string) {
  return `/${tenant}${path.startsWith("/") ? path : `/${path}`}`;
}

function classLabel(item: AdmissionClass) {
  return [item.name, item.section && !item.name.toLowerCase().includes(item.section.toLowerCase()) ? item.section : ""].filter(Boolean).join(" ");
}

function slugName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ".").replace(/^\.+|\.+$/g, "");
}

function documentFrom(value: string) {
  return {
    url: value.startsWith("http") ? value : "",
    fileName: value.startsWith("http") ? "" : value,
    status: value ? "received" : "missing",
    verified: false,
    notes: "",
  };
}

export default function NewStudentRegistrationPage() {
  const router = useRouter();
  const params = useParams<{ tenant?: string }>();
  const tenant = String(params?.tenant || getTenantSubdomain(typeof window !== "undefined" ? window.location.host : "") || "");
  const [data, setData] = React.useState<AdmissionsData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [activeStep, setActiveStep] = React.useState(0);
  const [form, setForm] = React.useState<FormState>(emptyForm);
  const [parents, setParents] = React.useState<ParentRecord[]>([]);
  const [showParent, setShowParent] = React.useState(false);
  const [customYears, setCustomYears] = React.useState<string[]>([]);
  const [customGrades, setCustomGrades] = React.useState<AdmissionClass[]>([]);
  const [showGradeDialog, setShowGradeDialog] = React.useState(false);
  const [showStreamDialog, setShowStreamDialog] = React.useState(false);
  const [dialogValue, setDialogValue] = React.useState("");
  const [accessResult, setAccessResult] = React.useState<AccessResult | null>(null);

  React.useEffect(() => {
    async function load() {
      setLoading(true);
      const response = await fetch(`/api/tenant/admin/admissions?slug=${encodeURIComponent(tenant)}`, { cache: "no-store", credentials: "include" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        toast.error(payload?.error || "Failed to load registration setup");
      } else {
        const next = payload as AdmissionsData;
        setData(next);
        setForm((current) => ({
          ...current,
          academicYear: next.classes[0]?.academicYear || current.academicYear,
          schoolEmail: current.schoolEmail || `${slugName(current.firstName || "student")}.${slugName(current.lastName || next.nextApplicationId)}@${tenant || "school"}.local`,
        }));
      }
      setLoading(false);
    }
    if (tenant) void load();
  }, [tenant]);

  React.useEffect(() => {
    const first = slugName(form.firstName);
    const last = slugName(form.lastName);
    if (!first || !last) return;
    setForm((current) => {
      if (current.schoolEmail && !current.schoolEmail.endsWith(".local")) return current;
      return { ...current, schoolEmail: `${first}.${last}@${tenant || "school"}.local` };
    });
  }, [form.firstName, form.lastName, tenant]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  const allClasses = [...(data?.classes || []), ...customGrades];
  const yearOptions = Array.from(new Set([String(currentYear), String(currentYear + 1), ...(data?.classes.map((item) => item.academicYear).filter(Boolean) || []), ...customYears]));
  const selectedClass = allClasses.find((item) => item.id === form.classId);
  const studentPreviewId = `STU-${currentYear}-${(data?.nextApplicationId || "APP-000").split("-").at(-1) || "001"}`;

  function addYear() {
    const value = window.prompt("Enter academic year", String(currentYear + 1));
    if (!value?.trim()) return;
    setCustomYears((current) => Array.from(new Set([...current, value.trim()])));
    update("academicYear", value.trim());
  }

  function addGrade() {
    if (!dialogValue.trim()) return;
    const id = `custom_grade_${Date.now()}`;
    const custom = { id, name: dialogValue.trim(), grade: dialogValue.trim(), section: "", academicYear: form.academicYear, capacity: 0, enrolled: 0, seatsAvailable: null };
    setCustomGrades((current) => [...current, custom]);
    update("classId", id);
    setDialogValue("");
    setShowGradeDialog(false);
  }

  function addStream() {
    if (!dialogValue.trim()) return;
    update("stream", dialogValue.trim());
    setDialogValue("");
    setShowStreamDialog(false);
  }

  function saveParentInline() {
    if (!form.parentFullName || !form.parentPhone) {
      toast.error("Parent/guardian name and phone are required");
      return;
    }
    const record = {
      id: `parent_${Date.now()}`,
      fullName: form.parentFullName,
      relationship: form.parentRelationship,
      occupation: form.parentOccupation,
      phone: form.parentPhone,
      email: form.parentEmail,
      primaryFeePayer: form.primaryFeePayer,
    };
    setParents((current) => [...current.filter((item) => !(record.primaryFeePayer && item.primaryFeePayer)), record]);
    setShowParent(false);
    toast.success("Parent/guardian added");
  }

  function stepComplete(step: number) {
    if (step === 0) return Boolean(form.firstName && form.lastName && form.gender && form.dateOfBirth && form.nationality && form.homeAddress && form.city && form.phone && form.schoolEmail);
    if (step === 1) return Boolean(form.admissionDate && form.academicYear && (form.classId || form.customGrade) && form.studentType);
    if (step === 2) return Boolean(form.emergencyName && form.emergencyPhone && (parents.length || (form.parentFullName && form.parentPhone)));
    if (step === 3) return Boolean(form.bloodGroup || form.allergies || form.chronicConditions || form.coreStrengths || form.learningChallenges);
    if (step === 4) return Boolean(form.transportBoarding && form.feePlan && form.scholarshipAid && form.paymentFrequency);
    return Boolean(form.enrollmentConsent && form.dataPrivacyConsent && form.mediaConsent);
  }

  function canProceed(step = activeStep) {
    if (step <= 2 || step === 4 || step === 5) return stepComplete(step);
    return true;
  }

  function nextStep() {
    if (!canProceed()) {
      toast.error("Complete the required fields in this step first");
      return;
    }
    setActiveStep((current) => Math.min(current + 1, steps.length - 1));
  }

  async function submit() {
    for (let index = 0; index < steps.length; index += 1) {
      if (!canProceed(index)) {
        setActiveStep(index);
        toast.error(`Complete ${steps[index]} before enrollment`);
        return;
      }
    }

    setSaving(true);
    try {
      const primaryParent = parents.find((item) => item.primaryFeePayer) || parents[0] || {
        fullName: form.parentFullName,
        relationship: form.parentRelationship,
        occupation: form.parentOccupation,
        phone: form.parentPhone,
        email: form.parentEmail,
      };
      const response = await fetch(`/api/tenant/admin/admissions?slug=${encodeURIComponent(tenant)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          firstName: form.firstName,
          lastName: form.lastName,
          otherNames: form.middleName,
          gender: form.gender,
          dateOfBirth: form.dateOfBirth,
          nationality: form.nationality,
          phone: form.phone,
          email: form.schoolEmail,
          address: [form.homeAddress, form.city, form.region, form.postalCode].filter(Boolean).join(", "),
          emergencyContact: `${form.emergencyName} (${form.emergencyRelationship}) ${form.emergencyPhone}`,
          classId: selectedClass?.id?.startsWith("custom_grade_") ? "" : form.classId,
          academicYear: form.academicYear,
          previousSchool: form.previousSchool,
          guardianName: primaryParent.fullName,
          guardianRelationship: primaryParent.relationship,
          guardianContact: primaryParent.phone,
          guardianEmail: primaryParent.email,
          guardianOccupation: primaryParent.occupation,
          guardianAddress: form.homeAddress,
          birthCertificate: form.birthCertificate,
          passportPhoto: form.photo || form.passportCopy,
          previousResults: form.previousResults,
          medicalRecords: form.medicalHistory,
          adminNotes: form.reasonForTransfer,
          admissionNumber: data?.nextAdmissionNumber,
          status: "pending",
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || "Failed to complete enrollment");

      const profileSections = {
        bio: {
          preferredName: form.preferredName,
          nationality: form.nationality,
          stateRegion: form.region,
          nationalIdPassport: form.nationalId,
          admissionType: form.previousSchool ? "Transfer" : "New",
          language: "",
          religion: "",
          house: form.houseHostel,
        },
        family: {
          primaryContactName: form.emergencyName,
          primaryContactPhone: form.emergencyPhone,
          pickupAuthorization: parents.map((item) => `${item.fullName} (${item.relationship})`).join(", "),
          custodyNotes: "",
          additionalParents: JSON.stringify(parents),
        },
        academic: {
          previousSchool: form.previousSchool,
          customGrade: selectedClass?.id?.startsWith("custom_grade_") ? selectedClass.name : "",
          stream: form.stream,
          reasonForTransfer: form.reasonForTransfer,
          classTeacher: "",
          scholarship: form.scholarshipAid,
          learningSupport: form.learningChallenges,
          academicNotes: form.coreStrengths,
        },
        medical: {
          bloodGroup: form.bloodGroup,
          allergies: form.allergies,
          conditions: form.chronicConditions,
          doctorName: form.doctorName,
          doctorPhone: form.doctorContact,
          medicalNotes: form.medicalHistory,
        },
        logistics: {
          transportMode: form.transportBoarding,
          route: form.transportBoarding === "yes_assigned_route" ? "Assigned route pending" : "",
          hostelStatus: form.studentType,
          dormitory: form.houseHostel,
          mealPlan: form.studentType === "boarding_student" ? "Boarding meals" : "",
        },
        finance: {
          feeCategory: form.feePlan,
          discountPlan: form.scholarshipAid,
          paymentPlan: form.paymentFrequency,
          sponsorName: primaryParent.fullName,
          sponsorPhone: primaryParent.phone,
          billingNotes: `Primary fee payer: ${primaryParent.fullName}`,
        },
        compliance: {
          consentStatus: form.enrollmentConsent ? "Enrollment consent accepted" : "",
          dataPrivacyConsent: form.dataPrivacyConsent ? "Accepted" : "",
          imageConsent: form.mediaConsent ? "Accepted" : "",
          codeOfConduct: "Pending student acknowledgement",
          complianceNotes: "",
        },
      };

      await fetch(`/api/tenant/admin/students?slug=${encodeURIComponent(tenant)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "profileSections", studentId: payload.studentId, profileSections }),
      });
      await fetch(`/api/tenant/admin/students?slug=${encodeURIComponent(tenant)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "documents",
          studentId: payload.studentId,
          documents: {
            birthCertificate: documentFrom(form.birthCertificate),
            passportPhoto: documentFrom(form.photo || form.passportCopy),
            previousResults: documentFrom(form.previousResults),
            medicalRecords: documentFrom(form.medicalHistory),
          },
        }),
      });
      if (form.photo) {
        await fetch(`/api/tenant/admin/students?slug=${encodeURIComponent(tenant)}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "update", studentId: payload.studentId, avatar: form.photo, name: `${form.firstName} ${form.middleName} ${form.lastName}`.replace(/\s+/g, " ").trim(), email: form.schoolEmail, phone: form.phone, address: form.homeAddress, emergencyContact: form.emergencyName, classId: selectedClass?.id?.startsWith("custom_grade_") ? "" : form.classId, status: "pending" }),
        });
      }

      setAccessResult({
        studentId: String(payload.studentId || ""),
        applicationId: String(payload.applicationId || ""),
        admissionNumber: String(payload.admissionNumber || ""),
        student: payload.access?.student,
        parent: payload.access?.parent,
      });
      toast.success("Student enrollment completed");
      router.push(tenantPath(tenant, "/admin/students"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to complete enrollment");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <section className="overflow-hidden rounded-[2rem] border-2 bg-card shadow-sm">
          <div className="bg-[radial-gradient(circle_at_top_left,rgba(249,115,22,0.18),transparent_34%),linear-gradient(135deg,hsl(var(--card)),hsl(var(--muted)/.58))] p-6">
            <Button variant="ghost" className="mb-4 rounded-full px-0 text-muted-foreground hover:text-foreground" onClick={() => router.push(tenantPath(tenant, "/admin/students"))}>
              <ArrowLeft className="mr-2 h-4 w-4" />Back to Student Profiles
            </Button>
            <div className="flex flex-wrap gap-2">
              <Badge className="rounded-full border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-300">New Student Registration</Badge>
              <Badge variant="outline" className="rounded-full">Loading numbers</Badge>
            </div>
            <h1 className="mt-4 text-3xl font-black tracking-tight md:text-5xl">Register New Student</h1>
            <p className="mt-3 max-w-3xl text-sm text-muted-foreground">Loading classes, admission numbers, and registration controls.</p>
          </div>
        </section>
        <Skeleton className="h-96 rounded-3xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[2rem] border-2 bg-card shadow-sm">
        <div className="bg-[radial-gradient(circle_at_top_left,rgba(249,115,22,0.18),transparent_34%),linear-gradient(135deg,hsl(var(--card)),hsl(var(--muted)/.58))] p-6">
          <Button variant="ghost" className="mb-4 rounded-full px-0 text-muted-foreground hover:text-foreground" onClick={() => router.push(tenantPath(tenant, "/admin/students"))}>
            <ArrowLeft className="mr-2 h-4 w-4" />Back to Student Profiles
          </Button>
          <div className="flex flex-wrap gap-2">
            <Badge className="rounded-full border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-300">New Student Registration</Badge>
            <Badge variant="outline" className="rounded-full">Application: {data?.nextApplicationId}</Badge>
            <Badge variant="outline" className="rounded-full">Admission: {data?.nextAdmissionNumber}</Badge>
          </div>
          <h1 className="mt-4 text-3xl font-black tracking-tight md:text-5xl">Register New Student</h1>
          <p className="mt-3 max-w-3xl text-sm text-muted-foreground">Complete the six-step student registration workflow. Step tabs auto-check once their required fields are complete.</p>
        </div>
      </section>

      {accessResult ? (
        <Card className="border-emerald-500/30 bg-emerald-500/5">
          <CardHeader><CardTitle>Enrollment Completed</CardTitle><CardDescription>{accessResult.admissionNumber} has been created and dashboard access was provisioned.</CardDescription></CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <CredentialCard title="Student Access" email={accessResult.student.email} password={accessResult.student.temporaryPassword} dashboard={accessResult.student.dashboardPath} />
            <CredentialCard title="Parent Access" email={accessResult.parent.email} password={accessResult.parent.temporaryPassword} dashboard={accessResult.parent.dashboardPath} />
            <div className="flex flex-wrap gap-2 md:col-span-2">
              <Button onClick={() => router.push(tenantPath(tenant, `/admin/students/${accessResult.studentId}`))}>Open Student Record</Button>
              <Button variant="outline" onClick={() => router.push(tenantPath(tenant, "/admin/students"))}>Back to Student Profiles</Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card className="border-2">
        <CardHeader>
          <CardTitle className="text-2xl font-black">Registration Steps</CardTitle>
          <CardDescription>Complete each section in order. You can return to previous steps any time.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-2 lg:grid-cols-6">
            {steps.map((step, index) => {
              const complete = stepComplete(index);
              const active = activeStep === index;
              return (
                <button
                  key={step}
                  type="button"
                  onClick={() => setActiveStep(index)}
                  className={cn(
                    "flex min-h-16 items-center gap-2 rounded-2xl border px-3 py-2 text-left text-sm font-bold transition-colors",
                    active && "border-orange-600 bg-orange-600 text-white shadow-lg shadow-orange-500/20",
                    complete && !active && "border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-300"
                  )}
                >
                  <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-full border bg-background text-xs text-foreground", active && "border-white/30 bg-white/20 text-white")}>{complete ? <Check className="h-4 w-4" /> : index + 1}</span>
                  <span>{step}</span>
                </button>
              );
            })}
          </div>

          {activeStep === 0 ? (
            <StepCard title="Basic Info" description="Identity, generated identifiers, residential address, and portal email." icon={UserRound}>
              <div className="grid gap-4 xl:grid-cols-[220px_1fr]">
                <div className="rounded-3xl border bg-muted/20 p-4">
                  <div className="flex aspect-square items-center justify-center overflow-hidden rounded-3xl border bg-card">
                    {form.photo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={form.photo} alt="Student preview" className="h-full w-full object-cover" />
                    ) : <FileUp className="h-10 w-10 text-muted-foreground" />}
                  </div>
                  <Label className="mt-4 block text-xs font-bold uppercase text-muted-foreground">Upload Photo / URL</Label>
                  <Input className="mt-2" value={form.photo} onChange={(event) => update("photo", event.target.value)} placeholder="Paste photo URL or choose file" />
                  <Input className="mt-2" type="file" accept="image/*" onChange={(event) => update("photo", event.target.files?.[0]?.name || form.photo)} />
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  <Field label="First Name"><Input value={form.firstName} onChange={(event) => update("firstName", event.target.value)} /></Field>
                  <Field label="Middle Name"><Input value={form.middleName} onChange={(event) => update("middleName", event.target.value)} /></Field>
                  <Field label="Last Name"><Input value={form.lastName} onChange={(event) => update("lastName", event.target.value)} /></Field>
                  <Field label="Preferred Name"><Input value={form.preferredName} onChange={(event) => update("preferredName", event.target.value)} /></Field>
                  <Field label="Gender"><Select value={form.gender} onValueChange={(value) => update("gender", value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="female">Female</SelectItem><SelectItem value="male">Male</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent></Select></Field>
                  <Field label="Date of Birth"><Input type="date" value={form.dateOfBirth} onChange={(event) => update("dateOfBirth", event.target.value)} /></Field>
                  <Field label="Nationality"><Select value={form.nationality} onValueChange={(value) => update("nationality", value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{nationalities.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></Field>
                  <Field label="State / Region"><Input value={form.region} onChange={(event) => update("region", event.target.value)} /></Field>
                  <Field label="National ID / Passport"><Input value={form.nationalId} onChange={(event) => update("nationalId", event.target.value)} /></Field>
                  <ReadOnly label="Student ID" value={studentPreviewId} />
                  <ReadOnly label="Admission Number" value={data?.nextAdmissionNumber || "Auto generated"} />
                  <ReadOnly label="Application ID" value={data?.nextApplicationId || "Auto generated"} />
                </div>
              </div>
              <SubSection title="Residential Address">
                <Field label="Home Address"><Textarea value={form.homeAddress} onChange={(event) => update("homeAddress", event.target.value)} /></Field>
                <Field label="City"><Input value={form.city} onChange={(event) => update("city", event.target.value)} /></Field>
                <Field label="Postal Code"><Input value={form.postalCode} onChange={(event) => update("postalCode", event.target.value)} /></Field>
                <Field label="Phone Number"><ThemedPhoneInput value={form.phone} onChange={(value) => update("phone", value)} /></Field>
                <Field label="School Email"><Input value={form.schoolEmail} onChange={(event) => update("schoolEmail", event.target.value)} /></Field>
              </SubSection>
              <StepButtons previousDisabled nextLabel="Continue to Admissions" onNext={nextStep} />
            </StepCard>
          ) : null}

          {activeStep === 1 ? (
            <StepCard title="Admission" description="Academic year, class placement, stream, transfer reason, and student type." icon={GraduationCap}>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <Field label="Admission Date"><Input type="date" value={form.admissionDate} onChange={(event) => update("admissionDate", event.target.value)} /></Field>
                <Field label="Academic Year"><div className="flex gap-2"><Select value={form.academicYear} onValueChange={(value) => update("academicYear", value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{yearOptions.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select><Button type="button" variant="outline" size="icon" onClick={addYear}><Plus className="h-4 w-4" /></Button></div></Field>
                <Field label="Previous School"><Input value={form.previousSchool} onChange={(event) => update("previousSchool", event.target.value)} /></Field>
                <Field label="Class / Grade"><div className="flex gap-2"><Select value={form.classId || "none"} onValueChange={(value) => update("classId", value === "none" ? "" : value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Select class</SelectItem>{allClasses.map((item) => <SelectItem key={item.id} value={item.id}>{classLabel(item)}</SelectItem>)}</SelectContent></Select><Button type="button" variant="outline" size="icon" onClick={() => setShowGradeDialog(true)}><Plus className="h-4 w-4" /></Button></div></Field>
                <Field label="Section / Stream"><div className="flex gap-2"><Input value={form.stream} onChange={(event) => update("stream", event.target.value)} /><Button type="button" variant="outline" size="icon" onClick={() => setShowStreamDialog(true)}><Plus className="h-4 w-4" /></Button></div></Field>
                <Field label="Student Type"><Select value={form.studentType} onValueChange={(value) => update("studentType", value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="day_student">Day Student</SelectItem><SelectItem value="boarding_student">Boarding Student</SelectItem></SelectContent></Select></Field>
                <Field label="House / Hostel"><Input value={form.houseHostel} onChange={(event) => update("houseHostel", event.target.value)} placeholder="Optional" /></Field>
                <Field label="Reason for Transfer" wide><Textarea value={form.reasonForTransfer} onChange={(event) => update("reasonForTransfer", event.target.value)} /></Field>
              </div>
              {selectedClass ? <div className="rounded-2xl border bg-muted/25 p-4"><p className="font-bold">{classLabel(selectedClass)}</p><p className="text-sm text-muted-foreground">{selectedClass.enrolled}/{selectedClass.capacity || "unlimited"} enrolled</p><Progress value={selectedClass.capacity ? Math.min((selectedClass.enrolled / selectedClass.capacity) * 100, 100) : 0} className="mt-3" /></div> : null}
              <StepButtons nextLabel="Continue to Parents" onPrev={() => setActiveStep(0)} onNext={nextStep} />
            </StepCard>
          ) : null}

          {activeStep === 2 ? (
            <StepCard title="Parents" description="Emergency contact, parent/guardian records, and primary fee payer." icon={Users}>
              <SubSection title="Emergency Contact">
                <Field label="Emergency Contact Name"><Input value={form.emergencyName} onChange={(event) => update("emergencyName", event.target.value)} /></Field>
                <Field label="Relationship"><Select value={form.emergencyRelationship} onValueChange={(value) => update("emergencyRelationship", value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{relationships.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></Field>
                <Field label="Phone Number"><ThemedPhoneInput value={form.emergencyPhone} onChange={(value) => update("emergencyPhone", value)} /></Field>
              </SubSection>
              <SubSection title="Parent / Guardian Info">
                <Field label="Full Name"><Input value={form.parentFullName} onChange={(event) => update("parentFullName", event.target.value)} /></Field>
                <Field label="Relationship"><Select value={form.parentRelationship} onValueChange={(value) => update("parentRelationship", value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{relationships.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></Field>
                <Field label="Occupation"><Input value={form.parentOccupation} onChange={(event) => update("parentOccupation", event.target.value)} /></Field>
                <Field label="Phone"><ThemedPhoneInput value={form.parentPhone} onChange={(value) => update("parentPhone", value)} /></Field>
                <Field label="Email"><Input type="email" value={form.parentEmail} onChange={(event) => update("parentEmail", event.target.value)} /></Field>
                <div className="flex items-center justify-between rounded-2xl border bg-muted/20 p-3"><div><p className="font-bold">Primary Fee Payer</p><p className="text-xs text-muted-foreground">Use this parent for billing defaults.</p></div><Switch checked={form.primaryFeePayer} onCheckedChange={(value) => update("primaryFeePayer", value)} /></div>
              </SubSection>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" onClick={() => setShowParent((current) => !current)}><Plus className="mr-2 h-4 w-4" />Add Parent/Guardian</Button>
                <Button type="button" onClick={saveParentInline} className="bg-orange-600 text-white hover:bg-orange-700">Save Parent to List</Button>
              </div>
              {showParent ? <div className="rounded-3xl border border-orange-500/20 bg-orange-500/10 p-4 text-sm text-muted-foreground">Fill the parent/guardian fields above, then click Save Parent to List. The saved parent will appear below and can be used as the fee payer.</div> : null}
              {parents.length ? <div className="grid gap-3 md:grid-cols-2">{parents.map((parent) => <div key={parent.id} className="rounded-2xl border bg-card p-4"><p className="font-bold">{parent.fullName}</p><p className="text-sm text-muted-foreground">{parent.relationship} · {parent.phone}</p>{parent.primaryFeePayer ? <Badge className="mt-2 rounded-full">Primary fee payer</Badge> : null}</div>)}</div> : null}
              <StepButtons nextLabel="Continue to Health & Academics" onPrev={() => setActiveStep(1)} onNext={nextStep} />
            </StepCard>
          ) : null}

          {activeStep === 3 ? (
            <StepCard title="Health & Academics" description="Medical details, learning strengths, and support notes." icon={ShieldCheck}>
              <SubSection title="Medical Info">
                <Field label="Blood Group"><Input value={form.bloodGroup} onChange={(event) => update("bloodGroup", event.target.value)} /></Field>
                <Field label="Allergies"><Input value={form.allergies} onChange={(event) => update("allergies", event.target.value)} /></Field>
                <Field label="Chronic Conditions / Illnesses"><Textarea value={form.chronicConditions} onChange={(event) => update("chronicConditions", event.target.value)} /></Field>
                <Field label="Family Doctor Name"><Input value={form.doctorName} onChange={(event) => update("doctorName", event.target.value)} /></Field>
                <Field label="Doctor Contact"><ThemedPhoneInput value={form.doctorContact} onChange={(value) => update("doctorContact", value)} /></Field>
              </SubSection>
              <SubSection title="Academic Profile">
                <Field label="Core Strengths"><Textarea value={form.coreStrengths} onChange={(event) => update("coreStrengths", event.target.value)} /></Field>
                <Field label="Learning Challenges / Weaknesses"><Textarea value={form.learningChallenges} onChange={(event) => update("learningChallenges", event.target.value)} /></Field>
              </SubSection>
              <StepButtons nextLabel="Continue to Logistics & Finance" onPrev={() => setActiveStep(2)} onNext={nextStep} />
            </StepCard>
          ) : null}

          {activeStep === 4 ? (
            <StepCard title="Logistics & Finance" description="Transport, boarding, fee plan, scholarship, and payment frequency." icon={GraduationCap}>
              <SubSection title="Transport & Boarding">
                <Field label="Transport / Boarding"><Select value={form.transportBoarding} onValueChange={(value) => update("transportBoarding", value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="no">No</SelectItem><SelectItem value="private_transport">Private Transport</SelectItem><SelectItem value="yes_assigned_route">Yes, Assigned Route</SelectItem></SelectContent></Select></Field>
              </SubSection>
              <SubSection title="Financial Setup">
                <Field label="Fee Plan"><Select value={form.feePlan} onValueChange={(value) => update("feePlan", value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="standard_tuition">Standard Tuition</SelectItem><SelectItem value="international_plan">International Plan</SelectItem><SelectItem value="custom_plan">Custom Plan</SelectItem></SelectContent></Select></Field>
                <Field label="Scholarship / Aid"><Select value={form.scholarshipAid} onValueChange={(value) => update("scholarshipAid", value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">None</SelectItem><SelectItem value="academic_merit_25">Academic Merit (25%)</SelectItem><SelectItem value="sports_merit_50">Sports Merit (50%)</SelectItem><SelectItem value="financial_aid_100">Financial Aid (100%)</SelectItem></SelectContent></Select></Field>
                <Field label="Payment Frequency"><Select value={form.paymentFrequency} onValueChange={(value) => update("paymentFrequency", value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="per_term">Per Term</SelectItem><SelectItem value="per_semester">Per Semester</SelectItem><SelectItem value="per_year">Per Year</SelectItem></SelectContent></Select></Field>
              </SubSection>
              <StepButtons nextLabel="Continue to Documents & Consent" onPrev={() => setActiveStep(3)} onNext={nextStep} />
            </StepCard>
          ) : null}

          {activeStep === 5 ? (
            <StepCard title="Documents & Consent" description="Required documents and compliance consent before enrollment is completed." icon={ShieldCheck}>
              <SubSection title="Required Documents">
                <UploadField label="Birth Certificate" value={form.birthCertificate} onChange={(value) => update("birthCertificate", value)} />
                <UploadField label="Passport / ID Copy" value={form.passportCopy} onChange={(value) => update("passportCopy", value)} />
                <UploadField label="Transfer Letter" value={form.transferLetter} onChange={(value) => update("transferLetter", value)} />
                <UploadField label="Medical History Records" value={form.medicalHistory} onChange={(value) => update("medicalHistory", value)} />
                <UploadField label="Previous Academic Results" value={form.previousResults} onChange={(value) => update("previousResults", value)} />
              </SubSection>
              <SubSection title="Consent & Compliance">
                <ConsentRow label="Parent/Guardian Enrollment Consent" checked={form.enrollmentConsent} onChange={(value) => update("enrollmentConsent", value)} />
                <ConsentRow label="Data Privacy & Protection Agreement" checked={form.dataPrivacyConsent} onChange={(value) => update("dataPrivacyConsent", value)} />
                <ConsentRow label="Media & Photography Consent" checked={form.mediaConsent} onChange={(value) => update("mediaConsent", value)} />
              </SubSection>
              <div className="flex flex-wrap justify-between gap-2 border-t pt-5">
                <Button variant="outline" onClick={() => setActiveStep(4)}>Previous Step</Button>
                <Button onClick={submit} disabled={saving || !stepComplete(5)} className="bg-orange-600 text-white hover:bg-orange-700">
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                  Complete Enrollment
                </Button>
              </div>
            </StepCard>
          ) : null}
        </CardContent>
      </Card>

      <Dialog open={showGradeDialog} onOpenChange={setShowGradeDialog}>
        <DialogContent><DialogHeader><DialogTitle>Add Grade / Class</DialogTitle><DialogDescription>Add a local grade option for this registration. You can configure permanent classes in academic structure later.</DialogDescription></DialogHeader><Input value={dialogValue} onChange={(event) => setDialogValue(event.target.value)} placeholder="e.g. Primary 4 Rhino" /><DialogFooter><Button variant="outline" onClick={() => setShowGradeDialog(false)}>Cancel</Button><Button onClick={addGrade}>Add Grade</Button></DialogFooter></DialogContent>
      </Dialog>
      <Dialog open={showStreamDialog} onOpenChange={setShowStreamDialog}>
        <DialogContent><DialogHeader><DialogTitle>Add Section / Stream</DialogTitle><DialogDescription>Add the stream or section for this student.</DialogDescription></DialogHeader><Input value={dialogValue} onChange={(event) => setDialogValue(event.target.value)} placeholder="e.g. Rhino, Science, A" /><DialogFooter><Button variant="outline" onClick={() => setShowStreamDialog(false)}>Cancel</Button><Button onClick={addStream}>Add Stream</Button></DialogFooter></DialogContent>
      </Dialog>
    </div>
  );
}

function StepCard({ title, description, icon: Icon, children }: { title: string; description?: string; icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <Card className="border-2">
      <CardHeader>
        <div className="flex items-start gap-3">
          <span className="rounded-2xl bg-orange-500/10 p-3 text-orange-600"><Icon className="h-5 w-5" /></span>
          <div><CardTitle className="text-2xl font-black">{title}</CardTitle>{description ? <CardDescription className="mt-1">{description}</CardDescription> : null}</div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">{children}</CardContent>
    </Card>
  );
}

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="rounded-3xl border bg-muted/15 p-4"><h3 className="mb-4 font-black">{title}</h3><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{children}</div></div>;
}

function Field({ label, children, wide }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return <div className={cn("space-y-2", wide && "md:col-span-2 xl:col-span-3")}><Label className="text-xs font-black uppercase tracking-wide text-muted-foreground">{label}</Label>{children}</div>;
}

function ReadOnly({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border bg-muted/20 p-3"><p className="text-xs font-black uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-1 font-mono text-sm font-bold">{value}</p></div>;
}

function StepButtons({ previousDisabled, nextLabel, onPrev, onNext }: { previousDisabled?: boolean; nextLabel: string; onPrev?: () => void; onNext: () => void }) {
  return <div className="flex flex-wrap justify-between gap-2 border-t pt-5"><Button variant="outline" disabled={previousDisabled} onClick={onPrev}>Previous Step</Button><Button onClick={onNext} className="bg-orange-600 text-white hover:bg-orange-700">{nextLabel}</Button></div>;
}

function ThemedPhoneInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return <PhoneInput international defaultCountry="UG" value={value} onChange={(next) => onChange(next || "")} className="rounded-md border bg-background px-3 py-2 text-sm" />;
}

function UploadField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <Field label={label}>
      <Input value={value} onChange={(event) => onChange(event.target.value)} placeholder="Paste URL or choose file" />
      <Input type="file" className="mt-2" onChange={(event) => onChange(event.target.files?.[0]?.name || value)} />
    </Field>
  );
}

function ConsentRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return <div className="flex items-center justify-between rounded-2xl border bg-card p-4"><div><p className="font-bold">{label}</p><p className="text-xs text-muted-foreground">Required before enrollment can be completed.</p></div><Switch checked={checked} onCheckedChange={onChange} /></div>;
}

function CredentialCard({ title, email, password, dashboard }: { title: string; email: string; password: string | null; dashboard: string }) {
  return <div className="rounded-2xl border bg-card p-4"><p className="font-bold">{title}</p><p className="mt-3 text-xs text-muted-foreground">Email</p><p className="font-mono text-sm">{email}</p><p className="mt-3 text-xs text-muted-foreground">Temporary Password</p><p className="font-mono text-sm">{password || "Existing password unchanged"}</p><p className="mt-3 text-xs text-muted-foreground">Dashboard: {dashboard}</p></div>;
}
