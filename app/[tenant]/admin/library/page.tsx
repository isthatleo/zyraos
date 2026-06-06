"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { AlertCircle, BookOpen, CheckCircle2, Download, Library, Loader2, Plus, RefreshCw, RotateCcw, Search, Trash2 } from "lucide-react";
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

type Student = { id: string; name: string; admissionNumber: string; className: string };
type Book = { id: string; title: string; author: string; isbn: string; category: string; shelf: string; copies: number; available: number; status: string; notes: string };
type Loan = { id: string; bookId: string; studentId: string; issuedAt: string; dueAt: string; returnedAt: string; status: string; fine: number };
type Payload = {
  students: Student[];
  library: { books: Book[]; loans: Loan[]; settings: { loanDays: number; dailyFine: number; allowReservations: boolean } };
  summaries: { books: number; copies: number; available: number; activeLoans: number; overdueLoans: number; finesDue: number };
};

const emptyBook: Book = { id: "", title: "", author: "", isbn: "", category: "General", shelf: "", copies: 1, available: 1, status: "active", notes: "" };
const emptyLoan: Loan = { id: "", bookId: "", studentId: "", issuedAt: new Date().toISOString().slice(0, 10), dueAt: "", returnedAt: "", status: "issued", fine: 0 };

export default function AdminLibraryPage() {
  const params = useParams<{ tenant?: string }>();
  const tenant = params?.tenant || "";
  const [data, setData] = React.useState<Payload | null>(null);
  const [book, setBook] = React.useState<Book>(emptyBook);
  const [loan, setLoan] = React.useState<Loan>(emptyLoan);
  const [settings, setSettings] = React.useState({ loanDays: 14, dailyFine: 0, allowReservations: true });
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState("");
  const [error, setError] = React.useState("");
  const [query, setQuery] = React.useState("");
  const [status, setStatus] = React.useState("all");

  const load = React.useCallback(async (silent = false) => {
    if (!tenant) return;
    if (!silent) setLoading(true);
    setError("");
    try {
      const search = new URLSearchParams({ tenant, query, status });
      const response = await fetch(`/api/tenant/admin/library?${search.toString()}`, { cache: "no-store", credentials: "include" });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || "Failed to load library");
      setData(payload);
      setSettings(payload.library?.settings || { loanDays: 14, dailyFine: 0, allowReservations: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load library";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [query, status, tenant]);

  React.useEffect(() => { void load(); }, [load]);

  async function mutate(body: Record<string, unknown>, success: string) {
    setBusy(String(body.action || "save"));
    try {
      const response = await fetch(`/api/tenant/admin/library?tenant=${encodeURIComponent(tenant)}`, { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(body) });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || "Library action failed");
      setData(payload);
      setSettings(payload.library?.settings || settings);
      toast.success(success);
      return true;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Library action failed");
      return false;
    } finally {
      setBusy("");
    }
  }

  async function deleteItem(type: "book" | "loan", id: string) {
    if (!window.confirm(`Delete this ${type}?`)) return;
    setBusy(id);
    try {
      const response = await fetch(`/api/tenant/admin/library?tenant=${encodeURIComponent(tenant)}&type=${type}&id=${encodeURIComponent(id)}`, { method: "DELETE", credentials: "include" });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || "Delete failed");
      setData(payload);
      toast.success(`${type} deleted`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setBusy("");
    }
  }

  function exportLibrary(format: "csv" | "json") {
    const search = new URLSearchParams({ tenant, export: format, query, status });
    window.open(`/api/tenant/admin/library?${search.toString()}`, "_blank", "noopener,noreferrer");
  }

  if (loading) return <div className="space-y-6"><Skeleton className="h-44 rounded-3xl" /><div className="grid gap-4 md:grid-cols-6">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-3xl" />)}</div><Skeleton className="h-96 rounded-3xl" /></div>;
  if (error || !data) return <Alert variant="destructive" className="rounded-3xl"><AlertCircle className="h-4 w-4" /><AlertTitle>Library unavailable</AlertTitle><AlertDescription className="mt-2 flex items-center justify-between gap-4"><span>{error || "No library data returned."}</span><Button variant="outline" onClick={() => void load()}>Retry</Button></AlertDescription></Alert>;

  const activeLoans = data.library.loans.filter((item) => item.status === "issued");
  const today = new Date().toISOString().slice(0, 10);
  const studentName = (id: string) => data.students.find((item) => item.id === id)?.name || "Student";
  const bookTitle = (id: string) => data.library.books.find((item) => item.id === id)?.title || "Book";

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div><Badge variant="outline" className="rounded-full">Library</Badge><h1 className="mt-3 text-3xl font-bold tracking-tight">Library</h1><p className="mt-2 text-sm text-muted-foreground">Catalog, copies, issue/return workflow, overdue tracking, fines, exports, and audit-logged library operations.</p></div>
          <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => void load(true)}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button><Button variant="outline" onClick={() => exportLibrary("csv")}><Download className="mr-2 h-4 w-4" />CSV</Button><Button variant="outline" onClick={() => exportLibrary("json")}><Download className="mr-2 h-4 w-4" />JSON</Button></div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        <Metric label="Titles" value={data.summaries.books} />
        <Metric label="Copies" value={data.summaries.copies} />
        <Metric label="Available" value={data.summaries.available} />
        <Metric label="Active Loans" value={data.summaries.activeLoans} />
        <Metric label="Overdue" value={data.summaries.overdueLoans} />
        <Metric label="Fines Due" value={data.summaries.finesDue} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[.9fr_1.1fr]">
        <Card className="border-2"><CardHeader><CardTitle>Catalog Entry</CardTitle><CardDescription>Add or edit books and copy counts.</CardDescription></CardHeader><CardContent className="space-y-4"><div className="grid gap-3 md:grid-cols-2"><Field label="Title"><Input value={book.title} onChange={(e) => setBook((p) => ({ ...p, title: e.target.value }))} /></Field><Field label="Author"><Input value={book.author} onChange={(e) => setBook((p) => ({ ...p, author: e.target.value }))} /></Field><Field label="ISBN"><Input value={book.isbn} onChange={(e) => setBook((p) => ({ ...p, isbn: e.target.value }))} /></Field><Field label="Category"><Input value={book.category} onChange={(e) => setBook((p) => ({ ...p, category: e.target.value }))} /></Field><Field label="Shelf"><Input value={book.shelf} onChange={(e) => setBook((p) => ({ ...p, shelf: e.target.value }))} /></Field><Field label="Status"><Select value={book.status} onValueChange={(v) => setBook((p) => ({ ...p, status: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="archived">Archived</SelectItem><SelectItem value="lost">Lost</SelectItem></SelectContent></Select></Field><Field label="Copies"><Input type="number" min={0} value={book.copies} onChange={(e) => setBook((p) => ({ ...p, copies: Number(e.target.value), available: Math.min(Number(e.target.value), p.available) }))} /></Field><Field label="Available"><Input type="number" min={0} value={book.available} onChange={(e) => setBook((p) => ({ ...p, available: Number(e.target.value) }))} /></Field></div><Field label="Notes"><Textarea value={book.notes} onChange={(e) => setBook((p) => ({ ...p, notes: e.target.value }))} /></Field><Button disabled={busy === "book.upsert"} onClick={async () => { if (await mutate({ action: "book.upsert", book }, "Book saved")) setBook(emptyBook); }}><Plus className="mr-2 h-4 w-4" />Save Book</Button></CardContent></Card>

        <Card className="border-2"><CardHeader><CardTitle>Issue Book</CardTitle><CardDescription>Issue available copies to enrolled students.</CardDescription></CardHeader><CardContent className="space-y-4"><Field label="Book"><Select value={loan.bookId || "none"} onValueChange={(v) => setLoan((p) => ({ ...p, bookId: v === "none" ? "" : v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Select book</SelectItem>{data.library.books.map((item) => <SelectItem key={item.id} value={item.id}>{item.title} ({item.available} available)</SelectItem>)}</SelectContent></Select></Field><Field label="Student"><Select value={loan.studentId || "none"} onValueChange={(v) => setLoan((p) => ({ ...p, studentId: v === "none" ? "" : v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Select student</SelectItem>{data.students.map((item) => <SelectItem key={item.id} value={item.id}>{item.name} - {item.admissionNumber}</SelectItem>)}</SelectContent></Select></Field><div className="grid gap-3 md:grid-cols-2"><Field label="Issue Date"><Input type="date" value={loan.issuedAt} onChange={(e) => setLoan((p) => ({ ...p, issuedAt: e.target.value }))} /></Field><Field label="Due Date"><Input type="date" value={loan.dueAt} onChange={(e) => setLoan((p) => ({ ...p, dueAt: e.target.value }))} /></Field></div><Button disabled={busy === "loan.issue"} onClick={async () => { if (await mutate({ action: "loan.issue", loan }, "Book issued")) setLoan(emptyLoan); }} className="bg-orange-600 text-white hover:bg-orange-700"><BookOpen className="mr-2 h-4 w-4" />Issue Book</Button><div className="rounded-2xl border bg-muted/10 p-4"><div className="grid gap-3 md:grid-cols-3"><Field label="Loan Days"><Input type="number" value={settings.loanDays} onChange={(e) => setSettings((p) => ({ ...p, loanDays: Number(e.target.value) }))} /></Field><Field label="Daily Fine"><Input type="number" value={settings.dailyFine} onChange={(e) => setSettings((p) => ({ ...p, dailyFine: Number(e.target.value) }))} /></Field><div className="flex items-center justify-between rounded-2xl border bg-card p-3"><span className="font-bold">Reservations</span><Switch checked={settings.allowReservations} onCheckedChange={(v) => setSettings((p) => ({ ...p, allowReservations: v }))} /></div></div><Button variant="outline" className="mt-3" onClick={() => mutate({ action: "settings.save", settings }, "Library settings saved")}>Save Settings</Button></div></CardContent></Card>
      </div>

      <Card className="border-2"><CardHeader><div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"><div><CardTitle>Catalog</CardTitle><CardDescription>Search and manage books.</CardDescription></div><div className="flex flex-wrap gap-2"><div className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search catalog..." className="pl-9" /></div><Select value={status} onValueChange={setStatus}><SelectTrigger className="w-36"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All status</SelectItem><SelectItem value="active">Active</SelectItem><SelectItem value="archived">Archived</SelectItem><SelectItem value="lost">Lost</SelectItem></SelectContent></Select></div></div></CardHeader><CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{data.library.books.map((item) => <div key={item.id} className="rounded-3xl border bg-muted/10 p-5"><div className="flex justify-between gap-3"><div><h3 className="font-bold">{item.title}</h3><p className="text-sm text-muted-foreground">{item.author} - {item.category}</p></div><Badge variant="outline" className="rounded-full">{item.available}/{item.copies}</Badge></div><p className="mt-2 text-sm text-muted-foreground">ISBN: {item.isbn || "Not set"} - Shelf: {item.shelf || "Not set"}</p><div className="mt-4 flex gap-2"><Button size="sm" variant="outline" onClick={() => setBook(item)}>Edit</Button><Button size="sm" variant="destructive" disabled={busy === item.id} onClick={() => deleteItem("book", item.id)}><Trash2 className="h-4 w-4" /></Button></div></div>)}</CardContent></Card>

      <Card className="border-2"><CardHeader><CardTitle>Loans & Returns</CardTitle><CardDescription>Active loans, returns, overdue records, and fines.</CardDescription></CardHeader><CardContent className="grid gap-4 md:grid-cols-2">{data.library.loans.map((item) => { const overdue = item.status === "issued" && item.dueAt && item.dueAt < today; return <div key={item.id} className="rounded-3xl border bg-muted/10 p-5"><div className="flex justify-between gap-3"><div><h3 className="font-bold">{bookTitle(item.bookId)}</h3><p className="text-sm text-muted-foreground">{studentName(item.studentId)} - Due {item.dueAt}</p></div><Badge variant={overdue ? "destructive" : "outline"} className="rounded-full capitalize">{overdue ? "overdue" : item.status}</Badge></div><p className="mt-2 text-sm text-muted-foreground">Issued {item.issuedAt} - Fine {item.fine || 0}</p><div className="mt-4 flex gap-2">{item.status === "issued" ? <Button size="sm" disabled={busy === "loan.return"} onClick={() => mutate({ action: "loan.return", loanId: item.id }, "Book returned")}><RotateCcw className="mr-2 h-4 w-4" />Return</Button> : <Button size="sm" variant="outline" disabled><CheckCircle2 className="mr-2 h-4 w-4" />Returned</Button>}<Button size="sm" variant="destructive" onClick={() => deleteItem("loan", item.id)}><Trash2 className="h-4 w-4" /></Button></div></div>; })}{!data.library.loans.length ? <p className="text-sm text-muted-foreground">No loans yet.</p> : null}</CardContent></Card>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return <Card className="border-2"><CardContent className="p-5"><Library className="h-6 w-6 text-orange-500" /><p className="mt-3 text-xs font-bold uppercase text-muted-foreground">{label}</p><p className="text-2xl font-bold">{value.toLocaleString()}</p></CardContent></Card>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-2"><Label className="text-xs font-bold uppercase text-muted-foreground">{label}</Label>{children}</div>;
}
