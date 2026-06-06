"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { CheckCircle2, Download, FileCheck2, FileJson, FileText, Loader2, Search, ShieldAlert, UploadCloud } from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { getTenantSubdomain } from "@/lib/tenant-routing";
import { cn } from "@/lib/utils";

type DocumentKey = "birthCertificate" | "passportPhoto" | "previousResults" | "medicalRecords";
type DocumentRecord = { url: string; fileName: string; status: string; verified: boolean; notes: string; uploadedAt: string; mimeType: string; size: number; dataUrl: string };
type Student = {
  id: string;
  name: string;
  admissionNumber: string;
  classId: string;
  className: string;
  status: string;
  completion: { complete: number; total: number; percent: number };
  documents: Record<DocumentKey, DocumentRecord>;
};
type Payload = {
  students: Student[];
  classes: Array<{ id: string; name: string }>;
  summary: { total: number; completeFiles: number; incompleteFiles: number; missingItems: number; verifiedItems: number };
  school: { slug: string };
};

const documentLabels: Record<DocumentKey, string> = {
  birthCertificate: "Birth Certificate",
  passportPhoto: "Passport Photo",
  previousResults: "Previous Results",
  medicalRecords: "Medical Records",
};

function tenantPath(tenant: string, path: string) {
  return `/${tenant}${path.startsWith("/") ? path : `/${path}`}`;
}

function completeCount(documents: Record<DocumentKey, DocumentRecord>) {
  return Object.values(documents).filter((item) => item.verified || item.status === "received").length;
}

function emptyDoc(): DocumentRecord {
  return { url: "", fileName: "", status: "missing", verified: false, notes: "", uploadedAt: "", mimeType: "", size: 0, dataUrl: "" };
}

export default function AdminDocumentationPage() {
  const params = useParams<{ tenant: string }>();
  const tenant = params?.tenant || getTenantSubdomain(typeof window !== "undefined" ? window.location.host : "") || "";
  const [data, setData] = React.useState<Payload | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [savingId, setSavingId] = React.useState("");
  const [error, setError] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [filter, setFilter] = React.useState("all");
  const [classFilter, setClassFilter] = React.useState("all");
  const [drafts, setDrafts] = React.useState<Record<string, Record<DocumentKey, DocumentRecord>>>({});

  const loadData = React.useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const query = new URLSearchParams({ tenant });
      if (search.trim()) query.set("search", search.trim());
      if (filter !== "all") query.set("status", filter);
      if (classFilter !== "all") query.set("classId", classFilter);
      const response = await fetch(`/api/tenant/admin/documentation?${query.toString()}`, { cache: "no-store" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Failed to load documentation");
      setData(payload);
      setDrafts(Object.fromEntries((payload.students || []).map((student: Student) => [student.id, student.documents])));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load documentation");
    } finally {
      setLoading(false);
    }
  }, [classFilter, filter, search, tenant]);

  React.useEffect(() => {
    const timer = window.setTimeout(loadData, 180);
    return () => window.clearTimeout(timer);
  }, [loadData]);

  function updateDoc(studentId: string, key: DocumentKey, patch: Partial<DocumentRecord>) {
    setDrafts((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [key]: { ...(prev[studentId]?.[key] || emptyDoc()), ...patch },
      },
    }));
  }

  async function readFile(studentId: string, key: DocumentKey, file?: File) {
    if (!file) return;
    if (file.size > 2_000_000) {
      toast.error("File is too large for inline storage metadata. Use a URL for files above 2MB.");
      return;
    }
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsDataURL(file);
    });
    updateDoc(studentId, key, { fileName: file.name, mimeType: file.type, size: file.size, dataUrl, status: "received", uploadedAt: new Date().toISOString() });
  }

  async function saveDocuments(studentId: string) {
    setSavingId(studentId);
    try {
      const response = await fetch(`/api/tenant/admin/documentation?tenant=${encodeURIComponent(tenant)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, documents: drafts[studentId] }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Failed to save documents");
      toast.success("Documentation saved");
      await loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save documents");
    } finally {
      setSavingId("");
    }
  }

  async function exportData(format: "csv" | "json") {
    try {
      const query = new URLSearchParams({ tenant, export: format });
      if (search.trim()) query.set("search", search.trim());
      if (filter !== "all") query.set("status", filter);
      if (classFilter !== "all") query.set("classId", classFilter);
      const response = await fetch(`/api/tenant/admin/documentation?${query.toString()}`, { cache: "no-store" });
      const blob = await response.blob();
      if (!response.ok) throw new Error(await blob.text().catch(() => "Export failed"));
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${tenant}-student-documentation.${format}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast.success(`Documentation ${format.toUpperCase()} exported`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Export failed");
    }
  }

  const students = data?.students || [];

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Badge variant="outline" className="rounded-full">Student information system</Badge>
            <h1 className="mt-3 text-3xl font-bold tracking-tight">Documentation</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">Track, upload, verify, and audit required student documentation for every student in this tenant.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => exportData("csv")} disabled={loading}><Download className="mr-2 h-4 w-4" />CSV</Button>
            <Button variant="outline" onClick={() => exportData("json")} disabled={loading}><FileJson className="mr-2 h-4 w-4" />JSON</Button>
            <Button onClick={loadData} variant="outline" disabled={loading}>{loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Refresh</Button>
          </div>
        </div>
      </section>

      {error ? <Alert variant="destructive"><ShieldAlert className="h-4 w-4" /><AlertTitle>Documentation unavailable</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}

      <div className="grid gap-3 md:grid-cols-4">
        <Card className="border-2"><CardContent className="flex items-center justify-between p-5"><div><p className="text-xs font-bold uppercase text-muted-foreground">Students</p><p className="text-3xl font-bold">{data?.summary.total || 0}</p></div><FileText className="h-8 w-8 text-orange-500" /></CardContent></Card>
        <Card className="border-2"><CardContent className="flex items-center justify-between p-5"><div><p className="text-xs font-bold uppercase text-muted-foreground">Complete Files</p><p className="text-3xl font-bold">{data?.summary.completeFiles || 0}</p></div><FileCheck2 className="h-8 w-8 text-emerald-500" /></CardContent></Card>
        <Card className="border-2"><CardContent className="flex items-center justify-between p-5"><div><p className="text-xs font-bold uppercase text-muted-foreground">Missing Items</p><p className="text-3xl font-bold">{data?.summary.missingItems || 0}</p></div><UploadCloud className="h-8 w-8 text-blue-500" /></CardContent></Card>
        <Card className="border-2"><CardContent className="flex items-center justify-between p-5"><div><p className="text-xs font-bold uppercase text-muted-foreground">Verified Items</p><p className="text-3xl font-bold">{data?.summary.verifiedItems || 0}</p></div><CheckCircle2 className="h-8 w-8 text-purple-500" /></CardContent></Card>
      </div>

      <Card className="border-2">
        <CardHeader>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div><CardTitle className="text-2xl">Document Register</CardTitle><CardDescription>Each save is tenant-scoped and written to the documentation audit trail.</CardDescription></div>
            <div className="grid gap-2 xl:grid-cols-[260px_180px_180px]">
              <div className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search student..." className="pl-9" /></div>
              <Select value={classFilter} onValueChange={setClassFilter}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All classes</SelectItem>{data?.classes.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select>
              <Select value={filter} onValueChange={setFilter}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All files</SelectItem><SelectItem value="complete">Complete only</SelectItem><SelectItem value="missing">Missing only</SelectItem></SelectContent></Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-56 rounded-3xl" />) : students.length ? students.map((student) => {
            const draft = drafts[student.id] || student.documents;
            const done = completeCount(draft);
            return (
              <div key={student.id} className="rounded-3xl border bg-muted/10 p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h3 className="text-lg font-bold">{student.name}</h3>
                    <p className="text-sm text-muted-foreground">{student.admissionNumber || "No admission number"} - {student.className || "Unassigned"} - {student.status}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className={cn("rounded-full", done === 4 ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-700" : "border-amber-500/25 bg-amber-500/10 text-amber-700")}>{done}/4 complete</Badge>
                    <Button asChild variant="outline" size="sm"><Link href={tenantPath(tenant, `/admin/students/${student.id}`)}>Full Record</Link></Button>
                    <Button size="sm" onClick={() => saveDocuments(student.id)} disabled={savingId === student.id} className="bg-orange-600 text-white hover:bg-orange-700">{savingId === student.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Save</Button>
                  </div>
                </div>
                <div className="mt-4 grid gap-3 xl:grid-cols-2">
                  {(Object.keys(documentLabels) as DocumentKey[]).map((key) => (
                    <div key={key} className="rounded-2xl border bg-card p-3">
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <p className="font-semibold">{documentLabels[key]}</p>
                        <Button size="sm" variant={draft[key].verified ? "default" : "outline"} onClick={() => updateDoc(student.id, key, { verified: !draft[key].verified, status: !draft[key].verified ? "received" : draft[key].status })}>{draft[key].verified ? <CheckCircle2 className="mr-2 h-4 w-4" /> : null}{draft[key].verified ? "Verified" : "Verify"}</Button>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-3">
                        <Input placeholder="Document URL" value={draft[key].url} onChange={(event) => updateDoc(student.id, key, { url: event.target.value, status: event.target.value ? "received" : draft[key].status })} />
                        <Input placeholder="File name" value={draft[key].fileName} onChange={(event) => updateDoc(student.id, key, { fileName: event.target.value })} />
                        <Select value={draft[key].status} onValueChange={(value) => updateDoc(student.id, key, { status: value, verified: value === "received" ? draft[key].verified : false })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="missing">Missing</SelectItem><SelectItem value="received">Received</SelectItem><SelectItem value="rejected">Rejected</SelectItem></SelectContent></Select>
                      </div>
                      <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_140px]">
                        <Textarea placeholder="Verification notes, rejection reason, or document reference" value={draft[key].notes} onChange={(event) => updateDoc(student.id, key, { notes: event.target.value })} />
                        <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed p-3 text-center text-xs text-muted-foreground hover:bg-muted/50">
                          <UploadCloud className="mb-2 h-5 w-5" />
                          Upload file
                          <input type="file" className="hidden" onChange={(event) => readFile(student.id, key, event.target.files?.[0])} />
                        </label>
                      </div>
                      {draft[key].fileName ? <p className="mt-2 text-xs text-muted-foreground">{draft[key].fileName} {draft[key].size ? `(${Math.round(draft[key].size / 1024)} KB)` : ""}</p> : null}
                    </div>
                  ))}
                </div>
              </div>
            );
          }) : <div className="rounded-2xl border border-dashed p-10 text-center text-sm text-muted-foreground">No student documentation records match the current filters.</div>}
        </CardContent>
      </Card>
    </div>
  );
}
