"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { AlertTriangle, CalendarCheck, CheckCircle2, Download, Loader2, RefreshCw, Save, Search, Trash2, UserCheck, UserX, Clock } from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type ClassRow = { id: string; name: string; academicYearId: string; academicYear: string; enrolled: number };
type Student = { id: string; name: string; admissionNumber: string; classId: string; className: string; academicYearId: string; status: string };
type AttendanceRecord = { studentId: string; status: string; remarks: string };
type SavedAttendance = AttendanceRecord & { id: string; studentName: string; admissionNumber: string; className: string; date: string | null };
type Payload = {
  classes: ClassRow[];
  students: Student[];
  attendance: SavedAttendance[];
  trend: Array<{ date: string; total: number; present: number; late: number; absent: number; excused: number }>;
  risk: Array<{ studentId: string; studentName: string; admissionNumber: string; className: string; total: number; attended: number; absent: number; late: number; rate: number }>;
  summary: { students: number; marked: number; unmarked: number; present: number; absent: number; late: number; excused: number; attendanceRate: number; completionRate: number };
};

const statuses = ["present", "absent", "late", "excused"] as const;
const statusStyles: Record<string, string> = {
  present: "bg-emerald-600 text-white hover:bg-emerald-700",
  absent: "bg-red-600 text-white hover:bg-red-700",
  late: "bg-amber-600 text-white hover:bg-amber-700",
  excused: "bg-sky-600 text-white hover:bg-sky-700",
};

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export default function AdminAttendancePage() {
  const params = useParams<{ tenant: string }>();
  const tenant = params?.tenant || "";
  const [data, setData] = React.useState<Payload | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [clearing, setClearing] = React.useState(false);
  const [error, setError] = React.useState("");
  const [classId, setClassId] = React.useState("");
  const [date, setDate] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [range, setRange] = React.useState("30");
  const [records, setRecords] = React.useState<Record<string, AttendanceRecord>>({});

  React.useEffect(() => {
    setDate((current) => current || todayIso());
  }, []);

  const endpoint = React.useCallback((extra = "") => `/api/tenant/admin/attendance?tenant=${encodeURIComponent(tenant)}${extra}`, [tenant]);

  const load = React.useCallback(async () => {
    if (!tenant || !date) return;
    setLoading(true);
    setError("");
    try {
      const query = new URLSearchParams({ date, range });
      if (classId) query.set("classId", classId);
      if (search.trim()) query.set("query", search.trim());
      const response = await fetch(endpoint(`&${query}`), { cache: "no-store", credentials: "include" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Failed to load attendance");
      const nextClass = classId || payload.classes?.[0]?.id || "";
      setData(payload);
      if (!classId && nextClass) setClassId(nextClass);
      const existing = Object.fromEntries((payload.attendance || []).map((item: SavedAttendance) => [item.studentId, { studentId: item.studentId, status: item.status, remarks: item.remarks || "" }]));
      const defaults = Object.fromEntries((payload.students || []).filter((student: Student) => !nextClass || student.classId === nextClass).map((student: Student) => [student.id, existing[student.id] || { studentId: student.id, status: "present", remarks: "" }]));
      setRecords(defaults);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load attendance");
    } finally {
      setLoading(false);
    }
  }, [classId, date, endpoint, range, search, tenant]);

  React.useEffect(() => {
    void load();
  }, [load]);

  function setStatus(studentId: string, status: string) {
    setRecords((current) => ({ ...current, [studentId]: { ...(current[studentId] || { studentId, remarks: "" }), status } }));
  }

  function setAll(status: string) {
    setRecords((current) => Object.fromEntries(students.map((student) => [student.id, { ...(current[student.id] || { studentId: student.id, remarks: "" }), status }])));
  }

  async function saveAttendance() {
    if (!classId) return toast.error("Select a class");
    if (!date) return toast.error("Select a date");
    setSaving(true);
    try {
      const selectedClass = data?.classes.find((item) => item.id === classId);
      const response = await fetch(endpoint(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "attendance.save", classId, date, academicYearId: selectedClass?.academicYearId || "", records: Object.values(records) }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Failed to save attendance");
      setData(payload);
      toast.success("Attendance saved");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save attendance");
    } finally {
      setSaving(false);
    }
  }

  async function clearAttendance() {
    if (!classId || !date) return toast.error("Select class and date");
    if (!window.confirm("Clear attendance records for this class and date?")) return;
    setClearing(true);
    try {
      const response = await fetch(endpoint(`&classId=${encodeURIComponent(classId)}&date=${encodeURIComponent(date)}`), { method: "DELETE", credentials: "include" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Failed to clear attendance");
      setData(payload);
      toast.success("Attendance cleared");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to clear attendance");
    } finally {
      setClearing(false);
    }
  }

  function exportAttendance(format: "csv" | "json") {
    const query = new URLSearchParams({ date, range, export: format });
    if (classId) query.set("classId", classId);
    if (search.trim()) query.set("query", search.trim());
    window.open(endpoint(`&${query}`), "_blank", "noopener,noreferrer");
  }

  const students = (data?.students || []).filter((student) => (!classId || student.classId === classId));
  const totals = statuses.reduce((acc, status) => ({ ...acc, [status]: Object.values(records).filter((record) => record.status === status).length }), {} as Record<string, number>);
  const completion = students.length ? Math.round((Object.keys(records).length / students.length) * 1000) / 10 : 0;

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Badge variant="outline" className="rounded-full">Student Operations</Badge>
            <h1 className="mt-3 text-3xl font-black tracking-tight">Student Attendance</h1>
            <p className="mt-2 max-w-3xl text-sm text-muted-foreground">Tenant-scoped daily attendance register with bulk marking, validation, exports, trend visibility, risk tracking, and audit-logged save/clear actions.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => void load()}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>
            <Button variant="outline" onClick={() => exportAttendance("csv")}><Download className="mr-2 h-4 w-4" />CSV</Button>
            <Button variant="outline" onClick={() => exportAttendance("json")}><Download className="mr-2 h-4 w-4" />JSON</Button>
            <Button variant="destructive" onClick={clearAttendance} disabled={clearing || !classId}>{clearing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}Clear Day</Button>
            <Button onClick={saveAttendance} disabled={saving || !classId} className="bg-orange-600 text-white hover:bg-orange-700">{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}Save Attendance</Button>
          </div>
        </div>
      </section>

      {error ? <Alert variant="destructive"><AlertTitle>Attendance unavailable</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}
      {completion < 100 && students.length ? <Alert><AlertTriangle className="h-4 w-4" /><AlertTitle>Register not complete</AlertTitle><AlertDescription>{students.length - Object.keys(records).length} student(s) are not currently marked in this register.</AlertDescription></Alert> : null}

      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Metric icon={UserCheck} label="Present" value={totals.present || 0} />
        <Metric icon={UserX} label="Absent" value={totals.absent || 0} />
        <Metric icon={Clock} label="Late" value={totals.late || 0} />
        <Metric icon={CheckCircle2} label="Excused" value={totals.excused || 0} />
        <Metric icon={CalendarCheck} label="Students" value={students.length} />
        <Metric icon={CheckCircle2} label="Complete" value={completion} suffix="%" />
      </div>

      <Card className="border-2">
        <CardHeader>
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <CardTitle className="text-2xl font-black">Daily Attendance Register</CardTitle>
              <CardDescription>Choose class/date, mark statuses, add remarks, then save.</CardDescription>
            </div>
            <div className="grid gap-2 md:grid-cols-[220px_170px_150px_240px]">
              <Select value={classId || "none"} onValueChange={(value) => setClassId(value === "none" ? "" : value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Select class</SelectItem>{data?.classes.map((item) => <SelectItem key={item.id} value={item.id}>{item.name} ({item.enrolled})</SelectItem>)}</SelectContent></Select>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              <Select value={range} onValueChange={setRange}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="7">7 days</SelectItem><SelectItem value="30">30 days</SelectItem><SelectItem value="60">60 days</SelectItem><SelectItem value="120">120 days</SelectItem></SelectContent></Select>
              <div className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search student..." className="pl-9" /></div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">{statuses.map((status) => <Button key={status} variant="outline" className="capitalize" onClick={() => setAll(status)}>Mark all {status}</Button>)}</div>
          {loading ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />) : students.map((student) => {
            const record = records[student.id] || { studentId: student.id, status: "present", remarks: "" };
            return (
              <div key={student.id} className="grid gap-3 rounded-2xl border-2 bg-muted/10 p-4 lg:grid-cols-[1fr_420px_240px] lg:items-center">
                <div>
                  <p className="font-black">{student.name}</p>
                  <p className="text-sm text-muted-foreground">{student.admissionNumber || "No admission number"} · {student.className}</p>
                </div>
                <div className="grid grid-cols-4 gap-2">{statuses.map((status) => <Button key={status} size="sm" variant={record.status === status ? "default" : "outline"} className={cn("capitalize", record.status === status && statusStyles[status])} onClick={() => setStatus(student.id, status)}>{status}</Button>)}</div>
                <Input value={record.remarks} onChange={(e) => setRecords((current) => ({ ...current, [student.id]: { ...record, remarks: e.target.value } }))} placeholder="Remarks" />
              </div>
            );
          })}
          {!loading && students.length === 0 ? <div className="rounded-2xl border border-dashed p-10 text-center text-sm text-muted-foreground">No students found for this class/date.</div> : null}
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="border-2">
          <CardHeader><CardTitle className="text-2xl font-black">Attendance Trend</CardTitle><CardDescription>Recent marked days for the selected class.</CardDescription></CardHeader>
          <CardContent className="space-y-3">{(data?.trend || []).slice(0, 10).map((item) => {
            const rate = item.total ? Math.round(((item.present + item.late) / item.total) * 1000) / 10 : 0;
            return <div key={item.date} className="rounded-2xl border bg-muted/10 p-4"><div className="flex items-center justify-between"><p className="font-black">{item.date}</p><Badge variant="outline" className="rounded-full">{rate}%</Badge></div><p className="mt-2 text-sm text-muted-foreground">Present {item.present} · Late {item.late} · Absent {item.absent} · Excused {item.excused}</p></div>;
          })}{!data?.trend?.length ? <p className="text-sm text-muted-foreground">No trend data yet.</p> : null}</CardContent>
        </Card>
        <Card className="border-2">
          <CardHeader><CardTitle className="text-2xl font-black">Attendance Risk</CardTitle><CardDescription>Students with the lowest attendance rate in the selected range.</CardDescription></CardHeader>
          <CardContent className="space-y-3">{(data?.risk || []).slice(0, 10).map((item) => <div key={item.studentId} className="rounded-2xl border bg-muted/10 p-4"><div className="flex items-center justify-between gap-3"><div><p className="font-black">{item.studentName}</p><p className="text-sm text-muted-foreground">{item.admissionNumber} · {item.className}</p></div><Badge variant={item.rate < 75 ? "destructive" : "outline"} className="rounded-full">{item.rate}%</Badge></div><p className="mt-2 text-sm text-muted-foreground">Absent {item.absent} · Late {item.late} · Marked days {item.total}</p></div>)}{!data?.risk?.length ? <p className="text-sm text-muted-foreground">No risk records yet.</p> : null}</CardContent>
        </Card>
      </div>
    </div>
  );
}

function Metric({ icon: Icon, label, value, suffix = "" }: { icon: React.ComponentType<{ className?: string }>; label: string; value: number; suffix?: string }) {
  return <Card className="border-2"><CardContent className="p-5"><Icon className="h-7 w-7 text-orange-500" /><p className="mt-3 text-xs font-black uppercase text-muted-foreground">{label}</p><p className="text-3xl font-black">{value}{suffix}</p></CardContent></Card>;
}
