"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { BookOpen, CheckCircle2, Download, Edit3, Eye, FileSpreadsheet, GraduationCap, Loader2, MoreHorizontal, Search, ShieldAlert, Trash2, Upload, UserCheck, Users, XCircle } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { getTenantSubdomain } from "@/lib/tenant-routing";
import { cn } from "@/lib/utils";

type ClassOption = { id: string; name: string; grade: string; section: string; enrolled: number; capacity: number; seatsAvailable: number | null };
type Student = {
  id: string;
  admissionNumber: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  emergencyContact: string;
  status: string;
  classId: string;
  className: string;
  grade: string;
  section: string;
  guardian: { name: string; relationship: string; phone: string; email: string };
  academics: { attendanceRate: number; performanceAverage: number; reportCardsCount: number };
};
type StudentsPayload = {
  school: { name: string; slug: string };
  summary: { total: number; active: number; pending: number; suspended: number; graduated: number; withdrawn: number; newThisMonth: number };
  classes: ClassOption[];
  students: Student[];
};
type ImportMode = "import" | "export";
type ImportStudentRow = {
  firstName: string;
  middleName: string;
  lastName: string;
  gender: string;
  dateOfBirth: string;
  nationality: string;
  phone: string;
  email: string;
  address: string;
  classId: string;
  className: string;
  academicYear: string;
  guardianName: string;
  guardianRelationship: string;
  guardianPhone: string;
  guardianEmail: string;
};
type ImportResult = {
  name: string;
  status: "success" | "failed";
  detail: string;
};

const statuses = ["active", "pending", "suspended", "graduated", "withdrawn"];
const importHeaders = [
  "First Name",
  "Middle Name",
  "Last Name",
  "Gender",
  "Date Of Birth",
  "Nationality",
  "Phone",
  "Email",
  "Home Address",
  "Class Name",
  "Class ID",
  "Academic Year",
  "Guardian Name",
  "Guardian Relationship",
  "Guardian Phone",
  "Guardian Email",
];

function statusClass(status: string) {
  if (status === "active") return "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  if (status === "pending") return "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300";
  if (status === "graduated") return "border-blue-500/25 bg-blue-500/10 text-blue-700 dark:text-blue-300";
  if (status === "suspended" || status === "withdrawn") return "border-destructive/25 bg-destructive/10 text-destructive";
  return "border-border bg-muted text-muted-foreground";
}

function tenantPath(tenant: string, path: string) {
  const clean = path.startsWith("/") ? path : `/${path}`;
  return `/${tenant}${clean}`;
}

function downloadSpreadsheet(filename: string, rows: unknown[][], sheetName = "Students") {
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  worksheet["!cols"] = rows[0]?.map((header) => ({ wch: Math.max(14, String(header || "").length + 4) })) || [];
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, filename);
}

function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  const clean = text.replace(/^\uFEFF/, "");
  for (let index = 0; index < clean.length; index += 1) {
    const char = clean[index];
    const next = clean[index + 1];
    if (char === '"' && quoted && next === '"') {
      cell += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(cell.trim());
      cell = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(cell.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }
  row.push(cell.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

function normalizeHeader(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function rowValue(row: Record<string, string>, aliases: string[]) {
  for (const alias of aliases) {
    const value = row[normalizeHeader(alias)];
    if (value) return value.trim();
  }
  return "";
}

function rowsFromGrid(parsed: string[][], classes: ClassOption[]): ImportStudentRow[] {
  if (parsed.length < 2) return [];
  const headers = parsed[0].map(normalizeHeader);
  return parsed.slice(1).map((cells) => {
    const raw = headers.reduce<Record<string, string>>((acc, header, index) => {
      acc[header] = cells[index] || "";
      return acc;
    }, {});
    const fullName = rowValue(raw, ["Name", "Student Name", "Full Name"]);
    const [fallbackFirst = "", ...fallbackRest] = fullName.split(/\s+/).filter(Boolean);
    const className = rowValue(raw, ["Class Name", "Class", "Grade"]);
    const classId = rowValue(raw, ["Class ID", "ClassId"]) || classes.find((item) => item.name.toLowerCase() === className.toLowerCase())?.id || "";
    return {
      firstName: rowValue(raw, ["First Name", "FirstName"]) || fallbackFirst,
      middleName: rowValue(raw, ["Middle Name", "MiddleName", "Other Names"]),
      lastName: rowValue(raw, ["Last Name", "LastName", "Surname"]) || fallbackRest.join(" "),
      gender: rowValue(raw, ["Gender"]),
      dateOfBirth: rowValue(raw, ["Date Of Birth", "Date of Birth", "DOB"]),
      nationality: rowValue(raw, ["Nationality"]),
      phone: rowValue(raw, ["Phone", "Phone Number", "Student Phone"]),
      email: rowValue(raw, ["Email", "Student Email", "School Email"]),
      address: rowValue(raw, ["Home Address", "Address", "Residential Address"]),
      classId,
      className,
      academicYear: rowValue(raw, ["Academic Year", "Year"]),
      guardianName: rowValue(raw, ["Guardian Name", "Parent Name", "Parent/Guardian Name"]),
      guardianRelationship: rowValue(raw, ["Guardian Relationship", "Relationship"]),
      guardianPhone: rowValue(raw, ["Guardian Phone", "Parent Phone", "Parent/Guardian Phone"]),
      guardianEmail: rowValue(raw, ["Guardian Email", "Parent Email", "Parent/Guardian Email"]),
    };
  }).filter((row) => row.firstName || row.lastName || row.email);
}

function readFileAsText(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Could not read selected file"));
    reader.readAsText(file);
  });
}

async function readSpreadsheetRows(file: File) {
  const name = file.name.toLowerCase();
  let workbook: XLSX.WorkBook;
  if (name.endsWith(".csv")) {
    workbook = XLSX.read(await readFileAsText(file), { type: "string" });
  } else {
    workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
  }
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return [];
  const sheet = workbook.Sheets[sheetName];
  return XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, defval: "", blankrows: false }).map((row) => row.map((cell) => String(cell ?? "").trim()));
}

function isSpreadsheetFile(file: File) {
  return /\.(xlsx|xls|csv)$/i.test(file.name);
}

export default function AdminStudentsPage() {
  const params = useParams<{ tenant: string }>();
  const tenant = params?.tenant || getTenantSubdomain(typeof window !== "undefined" ? window.location.host : "") || "";
  const [data, setData] = React.useState<StudentsPayload | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [busyId, setBusyId] = React.useState("");
  const [error, setError] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [status, setStatus] = React.useState("all");
  const [classId, setClassId] = React.useState("all");
  const [editing, setEditing] = React.useState<Student | null>(null);
  const [editForm, setEditForm] = React.useState({ name: "", email: "", phone: "", address: "", emergencyContact: "", classId: "", status: "" });
  const [bulkOpen, setBulkOpen] = React.useState(false);
  const [bulkMode, setBulkMode] = React.useState<ImportMode>("import");
  const [importFile, setImportFile] = React.useState<File | null>(null);
  const [importing, setImporting] = React.useState(false);
  const [importProgress, setImportProgress] = React.useState(0);
  const [importResults, setImportResults] = React.useState<ImportResult[]>([]);

  const loadStudents = React.useCallback(async () => {
    setLoading(true);
    setError("");
    const query = new URLSearchParams({ slug: tenant });
    if (search.trim()) query.set("search", search.trim());
    if (status !== "all") query.set("status", status);
    if (classId !== "all") query.set("classId", classId);
    try {
      const response = await fetch(`/api/tenant/admin/students?${query.toString()}`, { cache: "no-store" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Failed to load students");
      setData(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load students");
    } finally {
      setLoading(false);
    }
  }, [classId, search, status, tenant]);

  React.useEffect(() => {
    const timer = window.setTimeout(loadStudents, 180);
    return () => window.clearTimeout(timer);
  }, [loadStudents]);

  function openEdit(student: Student) {
    setEditing(student);
    setEditForm({
      name: student.name,
      email: student.email,
      phone: student.phone,
      address: student.address,
      emergencyContact: student.emergencyContact,
      classId: student.classId,
      status: student.status,
    });
  }

  async function mutateStudent(studentId: string, body: Record<string, unknown>, success: string) {
    setBusyId(studentId);
    try {
      const response = await fetch(`/api/tenant/admin/students?slug=${encodeURIComponent(tenant)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, ...body }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Student update failed");
      toast.success(success);
      await loadStudents();
      setEditing(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Student update failed");
    } finally {
      setBusyId("");
    }
  }

  async function deleteStudent(student: Student) {
    if (!window.confirm(`Remove ${student.name} from active student records? This keeps audit history and marks the student withdrawn.`)) return;
    setBusyId(student.id);
    try {
      const response = await fetch(`/api/tenant/admin/students?slug=${encodeURIComponent(tenant)}&studentId=${encodeURIComponent(student.id)}`, { method: "DELETE" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Failed to delete student");
      toast.success("Student removed from active records");
      await loadStudents();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete student");
    } finally {
      setBusyId("");
    }
  }

  function downloadTemplate() {
    downloadSpreadsheet("student-import-template.xlsx", [
      importHeaders,
      ["Ama", "", "Mensah", "Female", "2018-01-15", "Ghanaian", "+233501234567", "ama.mensah@example.com", "12 School Road", data?.classes[0]?.name || "Primary 1 Giraffe", data?.classes[0]?.id || "", "2026/2027", "Kwame Mensah", "Father", "+233501234568", "kwame.mensah@example.com"],
    ], "Import Template");
  }

  function exportStudents() {
    const students = data?.students || [];
    if (!students.length) {
      toast.error("No students available to export");
      return;
    }
    downloadSpreadsheet(`students-${tenant || "tenant"}-${new Date().toISOString().slice(0, 10)}.xlsx`, [
      ["Admission Number", "Name", "Email", "Phone", "Home Address", "Class Name", "Class ID", "Grade", "Section", "Guardian Name", "Guardian Relationship", "Guardian Phone", "Guardian Email", "Status", "Attendance Rate", "Performance Average"],
      ...students.map((student) => [
        student.admissionNumber,
        student.name,
        student.email,
        student.phone,
        student.address,
        student.className,
        student.classId,
        student.grade,
        student.section,
        student.guardian.name,
        student.guardian.relationship,
        student.guardian.phone,
        student.guardian.email,
        student.status,
        student.academics.attendanceRate,
        student.academics.performanceAverage,
      ]),
    ], "Student Records");
    toast.success(`${students.length} students exported`);
  }

  async function importStudents() {
    if (!importFile) {
      toast.error("Select a CSV spreadsheet first");
      return;
    }
    if (!isSpreadsheetFile(importFile)) {
      toast.error("Upload an .xlsx, .xls, or .csv spreadsheet");
      return;
    }
    setImporting(true);
    setImportProgress(0);
    setImportResults([]);
    try {
      const grid = await readSpreadsheetRows(importFile);
      const rows = rowsFromGrid(grid, data?.classes || []);
      if (!rows.length) throw new Error("No importable student rows found");
      for (let index = 0; index < rows.length; index += 1) {
        const row = rows[index];
        const name = [row.firstName, row.middleName, row.lastName].filter(Boolean).join(" ") || row.email || `Row ${index + 2}`;
        try {
          if (!row.firstName || !row.lastName) throw new Error("First name and last name are required");
          const response = await fetch(`/api/tenant/admin/admissions?slug=${encodeURIComponent(tenant)}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              firstName: row.firstName,
              lastName: row.lastName,
              otherNames: row.middleName,
              gender: row.gender,
              dateOfBirth: row.dateOfBirth,
              nationality: row.nationality,
              phone: row.phone,
              email: row.email,
              address: row.address,
              classId: row.classId,
              academicYear: row.academicYear,
              guardianName: row.guardianName,
              guardianRelationship: row.guardianRelationship || "guardian",
              guardianContact: row.guardianPhone,
              guardianEmail: row.guardianEmail,
              adminNotes: "Bulk imported from student profiles spreadsheet.",
              status: "pending",
            }),
          });
          const payload = await response.json().catch(() => ({}));
          if (!response.ok) throw new Error(payload.error || "Import failed");
          setImportResults((prev) => [{ name, status: "success", detail: payload.admissionNumber || payload.applicationId || "Imported" }, ...prev]);
        } catch (err) {
          setImportResults((prev) => [{ name, status: "failed", detail: err instanceof Error ? err.message : "Import failed" }, ...prev]);
        } finally {
          setImportProgress(Math.round(((index + 1) / rows.length) * 100));
        }
      }
      await loadStudents();
      toast.success("Bulk import completed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Bulk import failed");
    } finally {
      setImporting(false);
    }
  }

  const stats = data?.summary;

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-3xl border bg-card shadow-sm">
        <div className="bg-[radial-gradient(circle_at_top_left,rgba(249,115,22,0.16),transparent_34%),linear-gradient(135deg,hsl(var(--card)),hsl(var(--muted)/.55))] p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <Badge variant="outline" className="rounded-full">School administration</Badge>
              <h1 className="mt-3 text-3xl font-bold tracking-tight">Student Profiles</h1>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                Manage tenant-scoped student records, guardians, enrollment status, class placement, documentation readiness, and profile actions.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={loadStudents} disabled={loading}><Loader2 className={cn("mr-2 h-4 w-4", loading ? "animate-spin" : "hidden")} />Refresh</Button>
              <Button variant="outline" onClick={() => { setBulkMode("import"); setBulkOpen(true); }}><Upload className="mr-2 h-4 w-4" />Bulk Import</Button>
              <Button variant="outline" onClick={() => { setBulkMode("export"); setBulkOpen(true); }}><Download className="mr-2 h-4 w-4" />Export</Button>
              <Button asChild className="bg-orange-600 text-white hover:bg-orange-700"><Link href={tenantPath(tenant, "/admin/students/new")}>New Admission</Link></Button>
            </div>
          </div>
        </div>
      </section>

      {error ? (
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Could not load student profiles</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {[
          { label: "Total Students", value: stats?.total, icon: Users },
          { label: "Active", value: stats?.active, icon: UserCheck },
          { label: "Pending", value: stats?.pending, icon: BookOpen },
          { label: "Graduated", value: stats?.graduated, icon: GraduationCap },
          { label: "New 30 Days", value: stats?.newThisMonth, icon: Users },
        ].map((item) => (
          <Card key={item.label} className="border-2">
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{item.label}</p>
                {loading ? <Skeleton className="mt-2 h-8 w-16" /> : <p className="mt-1 text-2xl font-bold">{item.value || 0}</p>}
              </div>
              <item.icon className="h-8 w-8 text-orange-500" />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-2">
        <CardHeader>
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <CardTitle className="text-2xl">Student Records</CardTitle>
              <CardDescription>Every record shown here is loaded from the current tenant database only.</CardDescription>
            </div>
            <div className="grid gap-2 sm:grid-cols-[220px_170px_220px]">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, email, admission..." className="pl-9" />
              </div>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {statuses.map((item) => <SelectItem key={item} value={item} className="capitalize">{item}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={classId} onValueChange={setClassId}>
                <SelectTrigger><SelectValue placeholder="Class" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All classes</SelectItem>
                  {(data?.classes || []).map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">{Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} className="h-20 rounded-2xl" />)}</div>
          ) : !data?.students.length ? (
            <div className="rounded-2xl border border-dashed p-10 text-center">
              <Users className="mx-auto h-10 w-10 text-muted-foreground" />
              <h3 className="mt-3 text-lg font-semibold">No matching students</h3>
              <p className="mt-1 text-sm text-muted-foreground">Adjust filters or submit a new admission to create the first student profile.</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border">
              <div className="grid grid-cols-[1.2fr_.9fr_.8fr_.9fr_.7fr_64px] bg-muted/70 px-4 py-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                <span>Student</span><span>Class</span><span>Guardian</span><span>Performance</span><span>Status</span><span />
              </div>
              {data.students.map((student) => (
                <div key={student.id} className="grid grid-cols-[1.2fr_.9fr_.8fr_.9fr_.7fr_64px] items-center gap-3 border-t px-4 py-4 text-sm">
                  <div>
                    <p className="font-semibold">{student.name || "Unnamed student"}</p>
                    <p className="text-xs text-muted-foreground">{student.admissionNumber || "No admission number"} · {student.email || "No email"}</p>
                  </div>
                  <div>
                    <p className="font-medium">{student.className || "Unassigned"}</p>
                    <p className="text-xs text-muted-foreground">{student.grade || "No grade"} {student.section || ""}</p>
                  </div>
                  <div>
                    <p className="font-medium">{student.guardian.name || "No guardian"}</p>
                    <p className="text-xs text-muted-foreground capitalize">{student.guardian.relationship || "guardian"}</p>
                  </div>
                  <div>
                    <p className="font-medium">{student.academics.performanceAverage}% average</p>
                    <p className="text-xs text-muted-foreground">{student.academics.attendanceRate.toFixed(0)}% attendance · {student.academics.reportCardsCount} reports</p>
                  </div>
                  <Badge variant="outline" className={cn("w-fit rounded-full capitalize", statusClass(student.status))}>{student.status}</Badge>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" disabled={busyId === student.id}><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuLabel>Student actions</DropdownMenuLabel>
                      <DropdownMenuItem asChild><Link href={tenantPath(tenant, `/admin/students/${student.id}`)}><Eye className="mr-2 h-4 w-4" />View full record</Link></DropdownMenuItem>
                      <DropdownMenuItem onClick={() => openEdit(student)}><Edit3 className="mr-2 h-4 w-4" />Edit student</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {statuses.map((item) => (
                        <DropdownMenuItem key={item} onClick={() => mutateStudent(student.id, { action: "status", status: item }, `Student marked ${item}`)} className="capitalize">
                          Change status: {item}
                        </DropdownMenuItem>
                      ))}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => deleteStudent(student)}><Trash2 className="mr-2 h-4 w-4" />Delete student</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={bulkOpen} onOpenChange={(open) => !importing && setBulkOpen(open)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl"><FileSpreadsheet className="h-6 w-6 text-orange-500" />Student spreadsheet import/export</DialogTitle>
            <DialogDescription>Import new tenant students from Excel spreadsheets or export the current filtered student records to your device.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setBulkMode("import")}
              className={cn("rounded-2xl border-2 p-4 text-left transition hover:border-orange-400", bulkMode === "import" ? "border-orange-500 bg-orange-500/10" : "border-border bg-muted/30")}
            >
              <Upload className="mb-3 h-5 w-5 text-orange-500" />
              <p className="font-bold">Import spreadsheet</p>
              <p className="mt-1 text-xs text-muted-foreground">Upload CSV rows and provision students through the admissions API.</p>
            </button>
            <button
              type="button"
              onClick={() => setBulkMode("export")}
              className={cn("rounded-2xl border-2 p-4 text-left transition hover:border-orange-400", bulkMode === "export" ? "border-orange-500 bg-orange-500/10" : "border-border bg-muted/30")}
            >
              <Download className="mb-3 h-5 w-5 text-orange-500" />
              <p className="font-bold">Export records</p>
              <p className="mt-1 text-xs text-muted-foreground">Download the current tenant student list for Excel, audits, or offline work.</p>
            </button>
          </div>

          {bulkMode === "import" ? (
            <div className="space-y-4 rounded-3xl border-2 bg-card p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div className="space-y-2">
                  <Label>CSV spreadsheet file</Label>
                  <Input
                    type="file"
                    accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
                    disabled={importing}
                    onChange={(event) => {
                      setImportFile(event.target.files?.[0] || null);
                      setImportProgress(0);
                      setImportResults([]);
                    }}
                  />
                  <p className="text-xs text-muted-foreground">Use the template headers. Class can be matched by Class ID or exact Class Name.</p>
                </div>
                <Button variant="outline" onClick={downloadTemplate} disabled={importing}><Download className="mr-2 h-4 w-4" />Download Template</Button>
              </div>

              {importFile ? (
                <div className="rounded-2xl border bg-muted/40 p-3 text-sm">
                  <p className="font-semibold">{importFile.name}</p>
                  <p className="text-xs text-muted-foreground">{(importFile.size / 1024).toFixed(1)} KB selected</p>
                </div>
              ) : null}

              {importing || importProgress > 0 ? (
                <div className="space-y-2 rounded-2xl border bg-orange-500/10 p-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold">{importing ? "Importing students..." : "Import complete"}</span>
                    <span>{importProgress}%</span>
                  </div>
                  <Progress value={importProgress} className="h-2" />
                </div>
              ) : null}

              {importResults.length ? (
                <div className="max-h-56 space-y-2 overflow-y-auto rounded-2xl border p-3">
                  {importResults.map((result, index) => (
                    <div key={`${result.name}-${index}`} className="flex items-start gap-3 rounded-xl bg-muted/40 p-3 text-sm">
                      {result.status === "success" ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> : <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />}
                      <div>
                        <p className="font-semibold">{result.name}</p>
                        <p className="text-xs text-muted-foreground">{result.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ) : (
            <div className="space-y-4 rounded-3xl border-2 bg-card p-5">
              <div>
                <h3 className="text-lg font-bold">Export tenant student records</h3>
                <p className="mt-1 text-sm text-muted-foreground">The export includes admission number, identity, class placement, guardian details, status, attendance, and performance summary.</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border bg-muted/40 p-4">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Rows</p>
                  <p className="mt-1 text-2xl font-bold">{data?.students.length || 0}</p>
                </div>
                <div className="rounded-2xl border bg-muted/40 p-4">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Tenant</p>
                  <p className="mt-1 truncate text-lg font-bold">{data?.school.name || tenant}</p>
                </div>
                <div className="rounded-2xl border bg-muted/40 p-4">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Format</p>
                  <p className="mt-1 text-lg font-bold">Excel .xlsx</p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkOpen(false)} disabled={importing}>Close</Button>
            {bulkMode === "import" ? (
              <Button onClick={importStudents} disabled={importing || !importFile} className="bg-orange-600 text-white hover:bg-orange-700">
                {importing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                {importing ? "Importing..." : "Import Students"}
              </Button>
            ) : (
              <Button onClick={exportStudents} className="bg-orange-600 text-white hover:bg-orange-700"><Download className="mr-2 h-4 w-4" />Download Export</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(editing)} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Student</DialogTitle>
            <DialogDescription>Update the core student profile and class placement. Changes are audited.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2"><Label>Name</Label><Input value={editForm.name} onChange={(event) => setEditForm((prev) => ({ ...prev, name: event.target.value }))} /></div>
            <div className="space-y-2"><Label>Email</Label><Input value={editForm.email} onChange={(event) => setEditForm((prev) => ({ ...prev, email: event.target.value }))} /></div>
            <div className="space-y-2"><Label>Phone</Label><Input value={editForm.phone} onChange={(event) => setEditForm((prev) => ({ ...prev, phone: event.target.value }))} /></div>
            <div className="space-y-2"><Label>Emergency Contact</Label><Input value={editForm.emergencyContact} onChange={(event) => setEditForm((prev) => ({ ...prev, emergencyContact: event.target.value }))} /></div>
            <div className="space-y-2">
              <Label>Class</Label>
              <Select value={editForm.classId || "none"} onValueChange={(value) => setEditForm((prev) => ({ ...prev, classId: value === "none" ? "" : value }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {(data?.classes || []).map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={editForm.status} onValueChange={(value) => setEditForm((prev) => ({ ...prev, status: value }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{statuses.map((item) => <SelectItem key={item} value={item} className="capitalize">{item}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2 sm:col-span-2"><Label>Home Address</Label><Textarea value={editForm.address} onChange={(event) => setEditForm((prev) => ({ ...prev, address: event.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button
              onClick={() => editing && mutateStudent(editing.id, { action: "update", ...editForm }, "Student profile updated")}
              disabled={!editing || busyId === editing.id}
              className="bg-orange-600 text-white hover:bg-orange-700"
            >
              {busyId === editing?.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
