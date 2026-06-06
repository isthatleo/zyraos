"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Activity,
  ArrowLeft,
  BadgeCheck,
  Bus,
  CalendarDays,
  Camera,
  CheckCircle2,
  ClipboardCheck,
  CreditCard,
  FileCheck2,
  FileText,
  GraduationCap,
  HeartPulse,
  Home,
  IdCard,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Save,
  ShieldAlert,
  Stethoscope,
  User,
  Users,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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

type ClassOption = { id: string; name: string; grade: string; section: string; enrolled: number; capacity: number; seatsAvailable?: number | null };
type DocumentRecord = { url: string; fileName: string; status: string; verified: boolean; notes: string };
type StudentProfileSections = {
  bio: Record<string, string>;
  family: Record<string, string>;
  academic: Record<string, string>;
  medical: Record<string, string>;
  logistics: Record<string, string>;
  finance: Record<string, string>;
  compliance: Record<string, string>;
  updatedAt?: string | null;
};
type Student = {
  id: string;
  userId: string;
  applicationId: string;
  admissionNumber: string;
  name: string;
  email: string;
  avatar: string;
  phone: string;
  address: string;
  emergencyContact: string;
  gender: string;
  dateOfBirth: string | null;
  status: string;
  classId: string;
  className: string;
  grade: string;
  section: string;
  academicYear: string;
  enrollmentDate: string | null;
  graduationDate: string | null;
  guardian: { name: string; relationship: string; phone: string; email: string; address: string };
  documents: Record<"birthCertificate" | "passportPhoto" | "previousResults" | "medicalRecords", DocumentRecord>;
  profileSections: StudentProfileSections;
  academics: { attendanceRate: number; performanceAverage: number; gradesCount: number; reportCardsCount: number; invoicesCount: number; paidAmount: number };
};
type Payload = { student: Student | null; classes: ClassOption[]; school: { name: string; slug: string; currencyCode: string } };

const statuses = ["active", "pending", "suspended", "graduated", "withdrawn"];
const documentLabels: Record<keyof Student["documents"], string> = {
  birthCertificate: "Birth Certificate",
  passportPhoto: "Passport Photo",
  previousResults: "Previous School Results",
  medicalRecords: "Medical Records",
};

const emptySections: StudentProfileSections = {
  bio: {
    preferredName: "",
    religion: "",
    nationality: "",
    language: "",
    house: "",
    admissionType: "",
  },
  family: {
    primaryContactName: "",
    primaryContactPhone: "",
    secondaryContactName: "",
    secondaryContactPhone: "",
    pickupAuthorization: "",
    custodyNotes: "",
  },
  academic: {
    previousSchool: "",
    learningSupport: "",
    classTeacher: "",
    stream: "",
    scholarship: "",
    academicNotes: "",
  },
  medical: {
    bloodGroup: "",
    genotype: "",
    allergies: "",
    conditions: "",
    medication: "",
    doctorName: "",
    doctorPhone: "",
    insuranceProvider: "",
    medicalNotes: "",
  },
  logistics: {
    transportMode: "",
    route: "",
    pickupPoint: "",
    dropoffPoint: "",
    hostelStatus: "",
    dormitory: "",
    lockerNumber: "",
    mealPlan: "",
  },
  finance: {
    billingAccount: "",
    sponsorName: "",
    sponsorPhone: "",
    feeCategory: "",
    discountPlan: "",
    paymentPlan: "",
    billingNotes: "",
  },
  compliance: {
    consentStatus: "",
    dataPrivacyConsent: "",
    imageConsent: "",
    codeOfConduct: "",
    complianceNotes: "",
  },
};

function tenantPath(tenant: string, path: string) {
  return `/${tenant}${path.startsWith("/") ? path : `/${path}`}`;
}

function statusClass(status: string) {
  if (status === "active") return "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  if (status === "graduated") return "border-blue-500/25 bg-blue-500/10 text-blue-700 dark:text-blue-300";
  if (status === "pending") return "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300";
  if (["suspended", "withdrawn"].includes(status)) return "border-destructive/25 bg-destructive/10 text-destructive";
  return "border-border bg-muted";
}

function dateLabel(value: string | null) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

function money(value: number, currency = "USD") {
  return new Intl.NumberFormat("en", { style: "currency", currency: currency || "USD", maximumFractionDigits: 0 }).format(value || 0);
}

function mergeSections(input?: StudentProfileSections | null): StudentProfileSections {
  return {
    bio: { ...emptySections.bio, ...(input?.bio || {}) },
    family: { ...emptySections.family, ...(input?.family || {}) },
    academic: { ...emptySections.academic, ...(input?.academic || {}) },
    medical: { ...emptySections.medical, ...(input?.medical || {}) },
    logistics: { ...emptySections.logistics, ...(input?.logistics || {}) },
    finance: { ...emptySections.finance, ...(input?.finance || {}) },
    compliance: { ...emptySections.compliance, ...(input?.compliance || {}) },
    updatedAt: input?.updatedAt || null,
  };
}

function isPlainRecord(value: unknown): value is Record<string, string> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export default function StudentDetailsPage() {
  const params = useParams<{ tenant: string; studentId: string }>();
  const router = useRouter();
  const tenant = params?.tenant || getTenantSubdomain(typeof window !== "undefined" ? window.location.host : "") || "";
  const studentId = params?.studentId || "";
  const [data, setData] = React.useState<Payload | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");
  const [profile, setProfile] = React.useState({ name: "", email: "", avatar: "", phone: "", address: "", emergencyContact: "", classId: "", status: "" });
  const [sections, setSections] = React.useState<StudentProfileSections>(emptySections);
  const [documents, setDocuments] = React.useState<Student["documents"] | null>(null);

  const loadStudent = React.useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const query = new URLSearchParams({ slug: tenant, studentId });
      const response = await fetch(`/api/tenant/admin/students?${query.toString()}`, { cache: "no-store" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Failed to load student record");
      setData(payload);
      if (payload.student) {
        setProfile({
          name: payload.student.name,
          email: payload.student.email,
          avatar: payload.student.avatar,
          phone: payload.student.phone,
          address: payload.student.address,
          emergencyContact: payload.student.emergencyContact,
          classId: payload.student.classId,
          status: payload.student.status,
        });
        setSections(mergeSections(payload.student.profileSections));
        setDocuments(payload.student.documents);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load student record");
    } finally {
      setLoading(false);
    }
  }, [studentId, tenant]);

  React.useEffect(() => {
    loadStudent();
  }, [loadStudent]);

  async function save(body: Record<string, unknown>, message: string) {
    setBusy(true);
    try {
      const response = await fetch(`/api/tenant/admin/students?slug=${encodeURIComponent(tenant)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, ...body }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Save failed");
      toast.success(message);
      await loadStudent();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  function updateSection(section: keyof Omit<StudentProfileSections, "updatedAt">, key: string, value: string) {
    setSections((current) => ({ ...current, [section]: { ...current[section], [key]: value } }));
  }

  const student = data?.student;
  const docsComplete = documents ? Object.values(documents).filter((item) => item.status === "received" || item.verified).length : 0;
  const sectionCompletion = sections
    ? Object.values(sections).filter(isPlainRecord).reduce((sum, section) => sum + Object.values(section).filter(Boolean).length, 0)
    : 0;
  const sectionTotal = Object.values(emptySections).filter(isPlainRecord).reduce((sum, section) => sum + Object.keys(section).length, 0);
  const profileHealth = student
    ? Math.round(([
      student.name,
      student.email,
      student.phone,
      student.classId,
      student.guardian.name,
      student.guardian.phone,
      docsComplete >= 2,
      sectionCompletion >= 8,
    ].filter(Boolean).length / 8) * 100)
    : 0;
  const profilePhoto = profile.avatar || documents?.passportPhoto?.url || student?.avatar || "";

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[2rem] border-2 bg-card shadow-sm">
        <div className="relative bg-[radial-gradient(circle_at_top_left,rgba(249,115,22,0.24),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.16),transparent_28%),linear-gradient(135deg,hsl(var(--card)),hsl(var(--muted)/.62))] p-5 md:p-6">
          <div className="pointer-events-none absolute right-8 top-8 hidden h-28 w-28 rounded-full border border-orange-500/20 bg-orange-500/5 blur-sm xl:block" />
          <Button variant="ghost" size="sm" className="-ml-2 mb-5 rounded-full text-muted-foreground hover:text-foreground" onClick={() => router.push(tenantPath(tenant, "/admin/students"))}>
            <ArrowLeft className="mr-2 h-4 w-4" />Back to students
          </Button>
          {loading ? (
            <div className="space-y-3"><Skeleton className="h-8 w-64" /><Skeleton className="h-5 w-96" /></div>
          ) : student ? (
            <div className="grid gap-5 xl:grid-cols-[340px_1fr]">
              <Card className="overflow-hidden border-2 bg-card/95 shadow-xl shadow-black/5">
                <div className="h-20 bg-[linear-gradient(135deg,rgba(249,115,22,0.9),rgba(234,88,12,0.55)),radial-gradient(circle_at_top_right,rgba(255,255,255,0.45),transparent_35%)]" />
                <CardContent className="-mt-14 p-5 pt-0">
                  <div className="relative mx-auto size-40 overflow-hidden rounded-[2rem] border-[6px] border-card bg-muted shadow-xl">
                    {profilePhoto ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={profilePhoto} alt={`${student.name} profile`} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-orange-500/10 text-4xl font-black text-orange-600">
                        {student.name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "ST"}
                      </div>
                    )}
                    <div className="absolute bottom-2 right-2 rounded-full border bg-card p-2 text-orange-600 shadow-sm">
                      <Camera className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="mt-4 text-center">
                    <Badge variant="outline" className={cn("rounded-full capitalize", statusClass(student.status))}>{student.status}</Badge>
                    <h1 className="mt-3 text-2xl font-black leading-tight tracking-tight">{student.name || "Unnamed student"}</h1>
                    <p className="mt-1 text-sm text-muted-foreground">{student.admissionNumber || "No admission number"}</p>
                  </div>
                  <div className="mt-5 grid grid-cols-2 gap-2 text-sm">
                    <InfoLine icon={GraduationCap} label="Class" value={student.className || "Unassigned"} />
                    <InfoLine icon={Mail} label="Email" value={student.email || "Not set"} />
                    <InfoLine icon={Phone} label="Phone" value={student.phone || "Not set"} />
                    <InfoLine icon={CalendarDays} label="Enrolled" value={dateLabel(student.enrollmentDate)} />
                  </div>
                  <div className="mt-5 grid grid-cols-2 gap-2">
                    <Button asChild variant="outline" className="rounded-2xl">
                      <Link href={`mailto:${student.email || ""}`}><Mail className="mr-2 h-4 w-4" />Email</Link>
                    </Button>
                    <Button asChild variant="outline" className="rounded-2xl">
                      <Link href={`tel:${student.phone || ""}`}><Phone className="mr-2 h-4 w-4" />Call</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <div className="relative overflow-hidden rounded-[2rem] border-2 bg-card/92 p-5 shadow-xl shadow-black/5 backdrop-blur">
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-orange-500 via-amber-400 to-emerald-500" />
                <div className="flex min-h-full flex-col justify-between gap-6">
                  <div>
                    <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="rounded-full">{data?.school.name}</Badge>
                    <Badge variant="outline" className="rounded-full">{student.gender || "Gender not set"}</Badge>
                    <Badge variant="outline" className="rounded-full">{student.academicYear || "Academic year not set"}</Badge>
                  </div>
                    <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_260px] lg:items-start">
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.24em] text-orange-600">Student Full Record</p>
                        <h2 className="mt-2 text-3xl font-black tracking-tight md:text-5xl">{student.name || "Student record"}</h2>
                        <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
                          Complete tenant student file covering admission, family contacts, academics, medical, logistics, finance, documentation, and compliance.
                        </p>
                      </div>
                      <div className="rounded-3xl border bg-muted/25 p-4">
                        <p className="text-xs font-black uppercase tracking-wide text-muted-foreground">Record Completion</p>
                        <div className="mt-3 flex items-end justify-between gap-3">
                          <span className="text-4xl font-black">{profileHealth}%</span>
                          <Badge variant="outline" className="rounded-full">{sectionCompletion}/{sectionTotal} fields</Badge>
                        </div>
                        <Progress value={profileHealth} className="mt-4 h-2" />
                      </div>
                    </div>
                    <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                      <DetailPill icon={IdCard} label="Admission No." value={student.admissionNumber || "Not set"} />
                      <DetailPill icon={Home} label="Address" value={student.address || "Not set"} />
                      <DetailPill icon={Users} label="Guardian" value={student.guardian.name || "Not set"} />
                      <DetailPill icon={MapPin} label="Stream" value={[student.grade, student.section].filter(Boolean).join(" ") || "Not set"} />
                    </div>
                  </div>
                  <div className="grid gap-3 md:grid-cols-4">
                    <MetricCard icon={User} label="Profile" value={`${profileHealth}%`} progress={profileHealth} tone="orange" />
                    <MetricCard icon={Activity} label="Attendance" value={`${student.academics.attendanceRate.toFixed(0)}%`} progress={student.academics.attendanceRate} tone="emerald" />
                    <MetricCard icon={GraduationCap} label="Average" value={`${student.academics.performanceAverage}%`} progress={student.academics.performanceAverage} tone="blue" />
                    <MetricCard icon={FileCheck2} label="Docs" value={`${docsComplete}/4`} progress={(docsComplete / 4) * 100} tone="purple" />
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </section>

      {error ? (
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Student record unavailable</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {loading ? (
        <div className="grid gap-4 xl:grid-cols-3">{Array.from({ length: 9 }).map((_, index) => <Skeleton key={index} className="h-64 rounded-3xl" />)}</div>
      ) : student ? (
        <>
          <div className="grid gap-6 xl:grid-cols-2">
            <SectionCard title="Bio & Admission" description="Identity, portal access, admission metadata, and class placement." icon={IdCard}>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Full Name"><Input value={profile.name} onChange={(event) => setProfile((prev) => ({ ...prev, name: event.target.value }))} /></Field>
                <Field label="Preferred Name"><Input value={sections.bio.preferredName} onChange={(event) => updateSection("bio", "preferredName", event.target.value)} /></Field>
                <Field label="Email"><Input value={profile.email} onChange={(event) => setProfile((prev) => ({ ...prev, email: event.target.value }))} /></Field>
                <Field label="Phone"><Input value={profile.phone} onChange={(event) => setProfile((prev) => ({ ...prev, phone: event.target.value }))} /></Field>
                <Field label="Profile Photo URL"><Input value={profile.avatar} onChange={(event) => setProfile((prev) => ({ ...prev, avatar: event.target.value }))} placeholder="https://..." /></Field>
                <Field label="Nationality"><Input value={sections.bio.nationality} onChange={(event) => updateSection("bio", "nationality", event.target.value)} /></Field>
                <Field label="Language"><Input value={sections.bio.language} onChange={(event) => updateSection("bio", "language", event.target.value)} /></Field>
                <Field label="Religion"><Input value={sections.bio.religion} onChange={(event) => updateSection("bio", "religion", event.target.value)} /></Field>
                <Field label="School House"><Input value={sections.bio.house} onChange={(event) => updateSection("bio", "house", event.target.value)} /></Field>
                <Field label="Admission Type"><Input value={sections.bio.admissionType} onChange={(event) => updateSection("bio", "admissionType", event.target.value)} placeholder="New, transfer, returning..." /></Field>
                <Field label="Class">
                  <Select value={profile.classId || "none"} onValueChange={(value) => setProfile((prev) => ({ ...prev, classId: value === "none" ? "" : value }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="none">Unassigned</SelectItem>{data?.classes.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <Field label="Status">
                  <Select value={profile.status} onValueChange={(value) => setProfile((prev) => ({ ...prev, status: value }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{statuses.map((item) => <SelectItem key={item} value={item} className="capitalize">{item}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <Field label="Home Address" wide><Textarea value={profile.address} onChange={(event) => setProfile((prev) => ({ ...prev, address: event.target.value }))} /></Field>
              </div>
              <CardActions>
                <Button className="bg-orange-600 text-white hover:bg-orange-700" disabled={busy} onClick={() => save({ action: "update", ...profile }, "Bio and admission saved")}><Save className="mr-2 h-4 w-4" />Save Bio</Button>
                <Button variant="outline" disabled={busy} onClick={() => save({ action: "profileSections", profileSections: sections }, "Profile sections saved")}><Save className="mr-2 h-4 w-4" />Save Section Data</Button>
              </CardActions>
            </SectionCard>

            <SectionCard title="Family & Contact" description="Guardian, emergency contact, pickup authorization, and custody notes." icon={Users}>
              <div className="grid gap-4 md:grid-cols-2">
                <ReadOnly label="Primary Guardian" value={student.guardian.name || "Not provided"} />
                <ReadOnly label="Relationship" value={student.guardian.relationship || "Guardian"} />
                <ReadOnly label="Guardian Phone" value={student.guardian.phone || "Not set"} />
                <ReadOnly label="Guardian Email" value={student.guardian.email || "Not set"} />
                <Field label="Emergency Contact"><Input value={profile.emergencyContact} onChange={(event) => setProfile((prev) => ({ ...prev, emergencyContact: event.target.value }))} /></Field>
                <Field label="Primary Pickup Contact"><Input value={sections.family.primaryContactName} onChange={(event) => updateSection("family", "primaryContactName", event.target.value)} /></Field>
                <Field label="Primary Pickup Phone"><Input value={sections.family.primaryContactPhone} onChange={(event) => updateSection("family", "primaryContactPhone", event.target.value)} /></Field>
                <Field label="Secondary Contact"><Input value={sections.family.secondaryContactName} onChange={(event) => updateSection("family", "secondaryContactName", event.target.value)} /></Field>
                <Field label="Secondary Phone"><Input value={sections.family.secondaryContactPhone} onChange={(event) => updateSection("family", "secondaryContactPhone", event.target.value)} /></Field>
                <Field label="Pickup Authorization"><Input value={sections.family.pickupAuthorization} onChange={(event) => updateSection("family", "pickupAuthorization", event.target.value)} placeholder="Authorized names or rules" /></Field>
                <Field label="Custody / Contact Notes" wide><Textarea value={sections.family.custodyNotes} onChange={(event) => updateSection("family", "custodyNotes", event.target.value)} /></Field>
              </div>
              <CardActions><Button className="bg-orange-600 text-white hover:bg-orange-700" disabled={busy} onClick={() => save({ action: "profileSections", profileSections: sections }, "Family and contact saved")}><Save className="mr-2 h-4 w-4" />Save Family & Contact</Button></CardActions>
            </SectionCard>
          </div>

          <div className="grid gap-6 xl:grid-cols-3">
            <SectionCard title="Academics" description="Class, learning support, academic progress, and report history." icon={GraduationCap}>
              <div className="grid gap-3">
                <InfoTile label="Current Class" value={student.className || "Unassigned"} />
                <InfoTile label="Performance Average" value={`${student.academics.performanceAverage}%`} />
                <InfoTile label="Attendance Rate" value={`${student.academics.attendanceRate.toFixed(0)}%`} />
                <InfoTile label="Grades / Reports" value={`${student.academics.gradesCount} grades, ${student.academics.reportCardsCount} reports`} />
                <Field label="Previous School"><Input value={sections.academic.previousSchool} onChange={(event) => updateSection("academic", "previousSchool", event.target.value)} /></Field>
                <Field label="Class Teacher"><Input value={sections.academic.classTeacher} onChange={(event) => updateSection("academic", "classTeacher", event.target.value)} /></Field>
                <Field label="Stream / Section"><Input value={sections.academic.stream} onChange={(event) => updateSection("academic", "stream", event.target.value)} /></Field>
                <Field label="Scholarship"><Input value={sections.academic.scholarship} onChange={(event) => updateSection("academic", "scholarship", event.target.value)} /></Field>
                <Field label="Learning Support / Academic Notes"><Textarea value={sections.academic.learningSupport || sections.academic.academicNotes} onChange={(event) => { updateSection("academic", "learningSupport", event.target.value); updateSection("academic", "academicNotes", event.target.value); }} /></Field>
              </div>
              <CardActions><Button disabled={busy} onClick={() => save({ action: "profileSections", profileSections: sections }, "Academic profile saved")}><Save className="mr-2 h-4 w-4" />Save Academics</Button></CardActions>
            </SectionCard>

            <SectionCard title="Medical" description="Health profile, medication, emergency notes, and medical compliance." icon={HeartPulse}>
              <div className="grid gap-4">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Blood Group"><Input value={sections.medical.bloodGroup} onChange={(event) => updateSection("medical", "bloodGroup", event.target.value)} /></Field>
                  <Field label="Genotype"><Input value={sections.medical.genotype} onChange={(event) => updateSection("medical", "genotype", event.target.value)} /></Field>
                </div>
                <Field label="Allergies"><Textarea value={sections.medical.allergies} onChange={(event) => updateSection("medical", "allergies", event.target.value)} /></Field>
                <Field label="Medical Conditions"><Textarea value={sections.medical.conditions} onChange={(event) => updateSection("medical", "conditions", event.target.value)} /></Field>
                <Field label="Medication"><Input value={sections.medical.medication} onChange={(event) => updateSection("medical", "medication", event.target.value)} /></Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Doctor Name"><Input value={sections.medical.doctorName} onChange={(event) => updateSection("medical", "doctorName", event.target.value)} /></Field>
                  <Field label="Doctor Phone"><Input value={sections.medical.doctorPhone} onChange={(event) => updateSection("medical", "doctorPhone", event.target.value)} /></Field>
                </div>
                <Field label="Insurance Provider"><Input value={sections.medical.insuranceProvider} onChange={(event) => updateSection("medical", "insuranceProvider", event.target.value)} /></Field>
                <Field label="Medical Notes"><Textarea value={sections.medical.medicalNotes} onChange={(event) => updateSection("medical", "medicalNotes", event.target.value)} /></Field>
              </div>
              <CardActions><Button disabled={busy} onClick={() => save({ action: "profileSections", profileSections: sections }, "Medical profile saved")}><Stethoscope className="mr-2 h-4 w-4" />Save Medical</Button></CardActions>
            </SectionCard>

            <SectionCard title="Logistics" description="Transport, hostel, meals, lockers, and campus movement details." icon={Bus}>
              <div className="grid gap-4">
                <Field label="Transport Mode">
                  <Select value={sections.logistics.transportMode || "none"} onValueChange={(value) => updateSection("logistics", "transportMode", value === "none" ? "" : value)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="none">Not set</SelectItem><SelectItem value="school_bus">School bus</SelectItem><SelectItem value="private">Private transport</SelectItem><SelectItem value="walking">Walking</SelectItem><SelectItem value="boarding">Boarding</SelectItem></SelectContent>
                  </Select>
                </Field>
                <Field label="Route"><Input value={sections.logistics.route} onChange={(event) => updateSection("logistics", "route", event.target.value)} /></Field>
                <Field label="Pickup Point"><Input value={sections.logistics.pickupPoint} onChange={(event) => updateSection("logistics", "pickupPoint", event.target.value)} /></Field>
                <Field label="Dropoff Point"><Input value={sections.logistics.dropoffPoint} onChange={(event) => updateSection("logistics", "dropoffPoint", event.target.value)} /></Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Hostel Status"><Input value={sections.logistics.hostelStatus} onChange={(event) => updateSection("logistics", "hostelStatus", event.target.value)} /></Field>
                  <Field label="Dormitory"><Input value={sections.logistics.dormitory} onChange={(event) => updateSection("logistics", "dormitory", event.target.value)} /></Field>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Locker"><Input value={sections.logistics.lockerNumber} onChange={(event) => updateSection("logistics", "lockerNumber", event.target.value)} /></Field>
                  <Field label="Meal Plan"><Input value={sections.logistics.mealPlan} onChange={(event) => updateSection("logistics", "mealPlan", event.target.value)} /></Field>
                </div>
              </div>
              <CardActions><Button disabled={busy} onClick={() => save({ action: "profileSections", profileSections: sections }, "Logistics saved")}><Bus className="mr-2 h-4 w-4" />Save Logistics</Button></CardActions>
            </SectionCard>
          </div>

          <div className="grid gap-6 xl:grid-cols-[.9fr_1.1fr]">
            <SectionCard title="Finance" description="Billing account, sponsor, discounts, payment plan, and fee activity." icon={Wallet}>
              <div className="grid gap-4 md:grid-cols-2">
                <InfoTile label="Invoices" value={String(student.academics.invoicesCount)} />
                <InfoTile label="Payments Recorded" value={money(student.academics.paidAmount, data?.school.currencyCode)} />
                <Field label="Billing Account"><Input value={sections.finance.billingAccount} onChange={(event) => updateSection("finance", "billingAccount", event.target.value)} /></Field>
                <Field label="Fee Category"><Input value={sections.finance.feeCategory} onChange={(event) => updateSection("finance", "feeCategory", event.target.value)} /></Field>
                <Field label="Sponsor Name"><Input value={sections.finance.sponsorName} onChange={(event) => updateSection("finance", "sponsorName", event.target.value)} /></Field>
                <Field label="Sponsor Phone"><Input value={sections.finance.sponsorPhone} onChange={(event) => updateSection("finance", "sponsorPhone", event.target.value)} /></Field>
                <Field label="Discount Plan"><Input value={sections.finance.discountPlan} onChange={(event) => updateSection("finance", "discountPlan", event.target.value)} /></Field>
                <Field label="Payment Plan"><Input value={sections.finance.paymentPlan} onChange={(event) => updateSection("finance", "paymentPlan", event.target.value)} /></Field>
                <Field label="Billing Notes" wide><Textarea value={sections.finance.billingNotes} onChange={(event) => updateSection("finance", "billingNotes", event.target.value)} /></Field>
              </div>
              <CardActions><Button disabled={busy} onClick={() => save({ action: "profileSections", profileSections: sections }, "Finance profile saved")}><CreditCard className="mr-2 h-4 w-4" />Save Finance</Button></CardActions>
            </SectionCard>

            <SectionCard title="Docs & Compliance" description="Required documents, consent records, verification, and policy acceptance." icon={ClipboardCheck}>
              <div className="grid gap-4 lg:grid-cols-2">
                {documents && (Object.keys(documentLabels) as Array<keyof Student["documents"]>).map((key) => (
                  <div key={key} className="rounded-2xl border bg-muted/20 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="font-semibold">{documentLabels[key]}</h3>
                      <Badge variant="outline" className={cn("rounded-full capitalize", documents[key].verified ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-700" : "")}>{documents[key].verified ? "verified" : documents[key].status}</Badge>
                    </div>
                    <div className="mt-4 grid gap-3">
                      <Input placeholder="Document URL" value={documents[key].url} onChange={(event) => setDocuments((prev) => prev && ({ ...prev, [key]: { ...prev[key], url: event.target.value, status: event.target.value ? "received" : prev[key].status } }))} />
                      <Input placeholder="File name" value={documents[key].fileName} onChange={(event) => setDocuments((prev) => prev && ({ ...prev, [key]: { ...prev[key], fileName: event.target.value } }))} />
                      <div className="grid grid-cols-[1fr_auto] gap-2">
                        <Select value={documents[key].status} onValueChange={(value) => setDocuments((prev) => prev && ({ ...prev, [key]: { ...prev[key], status: value } }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent><SelectItem value="missing">Missing</SelectItem><SelectItem value="received">Received</SelectItem><SelectItem value="rejected">Rejected</SelectItem></SelectContent>
                        </Select>
                        <Button variant={documents[key].verified ? "default" : "outline"} onClick={() => setDocuments((prev) => prev && ({ ...prev, [key]: { ...prev[key], verified: !prev[key].verified } }))}>{documents[key].verified ? "Verified" : "Verify"}</Button>
                      </div>
                    </div>
                  </div>
                ))}
                <Field label="Consent Status"><Input value={sections.compliance.consentStatus} onChange={(event) => updateSection("compliance", "consentStatus", event.target.value)} /></Field>
                <Field label="Data Privacy Consent"><Input value={sections.compliance.dataPrivacyConsent} onChange={(event) => updateSection("compliance", "dataPrivacyConsent", event.target.value)} /></Field>
                <Field label="Image Consent"><Input value={sections.compliance.imageConsent} onChange={(event) => updateSection("compliance", "imageConsent", event.target.value)} /></Field>
                <Field label="Code of Conduct"><Input value={sections.compliance.codeOfConduct} onChange={(event) => updateSection("compliance", "codeOfConduct", event.target.value)} /></Field>
                <Field label="Compliance Notes" wide><Textarea value={sections.compliance.complianceNotes} onChange={(event) => updateSection("compliance", "complianceNotes", event.target.value)} /></Field>
              </div>
              <CardActions>
                <Button disabled={busy || !documents} onClick={() => save({ action: "documents", documents }, "Documentation saved")} className="bg-orange-600 text-white hover:bg-orange-700">
                  {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}Save Documents
                </Button>
                <Button variant="outline" disabled={busy} onClick={() => save({ action: "profileSections", profileSections: sections }, "Compliance saved")}><BadgeCheck className="mr-2 h-4 w-4" />Save Compliance</Button>
              </CardActions>
            </SectionCard>
          </div>

          <Card className="border-2">
            <CardHeader>
              <CardTitle className="text-2xl">Record Actions</CardTitle>
              <CardDescription>Quick status controls for the student account and portal access.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {statuses.map((item) => (
                <Button key={item} variant={student.status === item ? "default" : "outline"} className="capitalize" onClick={() => save({ action: "status", status: item }, `Student marked ${item}`)} disabled={busy}>
                  {student.status === item ? <CheckCircle2 className="mr-2 h-4 w-4" /> : null}{item}
                </Button>
              ))}
              {student.applicationId ? <Button asChild variant="outline"><Link href={tenantPath(tenant, `/admin/admissions/${student.applicationId}`)}>Open Admission File</Link></Button> : null}
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, progress, tone = "orange" }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; progress: number; tone?: "orange" | "emerald" | "blue" | "purple" }) {
  const toneClass = {
    orange: "text-orange-500 bg-orange-500/10 border-orange-500/15",
    emerald: "text-emerald-500 bg-emerald-500/10 border-emerald-500/15",
    blue: "text-blue-500 bg-blue-500/10 border-blue-500/15",
    purple: "text-purple-500 bg-purple-500/10 border-purple-500/15",
  }[tone];
  return (
    <Card className="border bg-card/90 shadow-sm">
      <CardContent className="p-4">
        <span className={cn("inline-flex rounded-2xl border p-2", toneClass)}><Icon className="h-5 w-5" /></span>
        <p className="mt-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-black">{value}</p>
        <Progress value={Math.min(Math.max(progress || 0, 0), 100)} className="mt-3" />
      </CardContent>
    </Card>
  );
}

function DetailPill({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-2xl border bg-background/70 p-3 shadow-sm">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-orange-500/10 text-orange-600">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="text-[10px] font-black uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-bold">{value || "Not set"}</p>
      </div>
    </div>
  );
}

function SectionCard({ title, description, icon: Icon, children }: { title: string; description: string; icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <Card className="border-2 shadow-sm">
      <CardHeader>
        <div className="flex items-start gap-3">
          <span className="rounded-2xl bg-orange-500/10 p-3 text-orange-600"><Icon className="h-5 w-5" /></span>
          <div>
            <CardTitle className="text-2xl font-black">{title}</CardTitle>
            <CardDescription className="mt-1">{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">{children}</CardContent>
    </Card>
  );
}

function Field({ label, children, wide }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return <div className={cn("space-y-2", wide && "md:col-span-2")}><Label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</Label>{children}</div>;
}

function ReadOnly({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border bg-muted/20 p-3"><p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-1 font-semibold">{value || "Not set"}</p></div>;
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border bg-muted/20 p-3"><p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-1 text-lg font-black">{value || "Not set"}</p></div>;
}

function InfoLine({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-2xl border bg-muted/20 p-3">
      <Icon className="h-4 w-4 shrink-0 text-orange-500" />
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="truncate font-semibold">{value || "Not set"}</p>
      </div>
    </div>
  );
}

function CardActions({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap gap-2 border-t pt-5">{children}</div>;
}
