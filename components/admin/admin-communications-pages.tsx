"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { Bell, CheckCircle2, Loader2, Megaphone, MessageSquare, Search, Send, Trash2 } from "lucide-react";
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
import { getTenantSubdomain } from "@/lib/tenant-routing";
import { cn } from "@/lib/utils";

type User = { id: string; name: string; email: string; phone: string; role: string; isOwner: boolean };
type Conversation = { id: string; name: string; type: string; members: User[]; messages: Array<{ id: string; senderId: string; senderName: string; content: string; createdAt: string | null }> };
type Broadcast = { id: string; title: string; content: string; channel: string; targetAudience: string; status: string; createdAt: string | null; deliveryCount: number; sentCount: number; failedCount: number; pendingCount: number };
type Announcement = { id: string; title: string; content: string; authorName: string; targetRoles: string[]; isPublished: boolean; publishDate: string | null; expiryDate: string | null; createdAt: string | null };
type SmsReport = { id: string; title: string; channel: string; userName: string; role: string; phone: string; email: string; status: string; error: string; deliveredAt: string | null; failedAt: string | null; createdAt: string | null };
type Payload = { users: User[]; broadcastRecipients: User[]; conversations: Conversation[]; broadcasts: Broadcast[]; announcements: Announcement[]; smsReports: SmsReport[]; school: { name: string } };

function useComms() {
  const params = useParams<{ tenant: string }>();
  const tenant = params?.tenant || getTenantSubdomain(typeof window !== "undefined" ? window.location.host : "") || "";
  const [data, setData] = React.useState<Payload | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const load = React.useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/tenant/admin/communications?slug=${encodeURIComponent(tenant)}`, { cache: "no-store" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Failed to load communications");
      setData(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load communications");
    } finally {
      setLoading(false);
    }
  }, [tenant]);
  React.useEffect(() => { void load(); }, [load]);
  async function mutate(body: Record<string, unknown>, message: string) {
    const response = await fetch(`/api/tenant/admin/communications?slug=${encodeURIComponent(tenant)}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || message);
    setData(payload);
    toast.success(message);
  }
  async function remove(type: string, id: string) {
    const response = await fetch(`/api/tenant/admin/communications?slug=${encodeURIComponent(tenant)}&type=${type}&id=${encodeURIComponent(id)}`, { method: "DELETE" });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || "Delete failed");
    setData(payload);
    toast.success("Deleted");
  }
  return { data, loading, error, load, mutate, remove };
}

export function AdminMessagesPage() {
  const { data, loading, error, mutate } = useComms();
  const [recipientId, setRecipientId] = React.useState("");
  const [content, setContent] = React.useState("");
  const [conversationId, setConversationId] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const users = data?.users || [];
  const conversations = data?.conversations || [];
  const active = conversations.find((item) => item.id === conversationId) || conversations[0];

  async function send() {
    setSending(true);
    try {
      const ids = conversationId ? active?.members.filter((m) => m.id !== active.messages.at(-1)?.senderId).map((m) => m.id) : [recipientId];
      await mutate({ action: "message.send", conversationId: conversationId || undefined, recipientIds: ids?.filter(Boolean), content }, "Message sent");
      setContent("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send message");
    } finally {
      setSending(false);
    }
  }

  return (
    <PageShell icon={MessageSquare} title="Messages" description="School admins can message every active tenant user and platform super admins.">
      {error ? <ErrorAlert message={error} /> : null}
      <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
        <Card className="border-2"><CardHeader><CardTitle>Contacts</CardTitle><CardDescription>{users.length} available contacts.</CardDescription></CardHeader><CardContent className="space-y-3">{loading ? <Skeleton className="h-80 rounded-3xl" /> : users.map((user) => <button key={user.id} onClick={() => { setRecipientId(user.id); setConversationId(""); }} className={cn("w-full rounded-2xl border p-3 text-left hover:bg-muted", recipientId === user.id && "border-orange-500 bg-orange-500/10")}><p className="font-bold">{user.name}</p><p className="text-xs text-muted-foreground">{user.role} · {user.email}</p></button>)}</CardContent></Card>
        <Card className="border-2"><CardHeader><CardTitle>Conversation</CardTitle><CardDescription>Select a conversation or contact, type a message, and send.</CardDescription></CardHeader><CardContent className="space-y-4"><Select value={conversationId || "new"} onValueChange={(v) => setConversationId(v === "new" ? "" : v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="new">New conversation</SelectItem>{conversations.map((c) => <SelectItem key={c.id} value={c.id}>{c.name || c.members.map((m) => m.name).join(", ")}</SelectItem>)}</SelectContent></Select><div className="min-h-96 rounded-3xl border bg-muted/10 p-4">{active?.messages?.length ? active.messages.map((m) => <div key={m.id} className="mb-3 rounded-2xl bg-card p-3"><p className="text-xs font-bold text-muted-foreground">{m.senderName}</p><p>{m.content}</p></div>) : <p className="text-sm text-muted-foreground">No messages yet.</p>}</div><Textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Type message..." /><Button onClick={send} disabled={sending || !content || (!recipientId && !conversationId)} className="bg-orange-600 text-white hover:bg-orange-700">{sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}Send Message</Button></CardContent></Card>
      </div>
    </PageShell>
  );
}

export function AdminBroadcastsPage() {
  const { data, loading, error, mutate, remove } = useComms();
  const [form, setForm] = React.useState({ title: "", content: "", channel: "in-app", targetAudience: "all", status: "sent" });
  const [saving, setSaving] = React.useState(false);
  async function submit() { setSaving(true); try { await mutate({ action: "broadcast.create", ...form }, "Broadcast created"); setForm({ title: "", content: "", channel: "in-app", targetAudience: "all", status: "sent" }); } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); } finally { setSaving(false); } }
  return <PageShell icon={Megaphone} title="Broadcasts" description="Broadcast to all tenant users except owners. Delivery rows are recorded for SMS/email/in-app reports.">{error ? <ErrorAlert message={error} /> : null}<Composer form={form} setForm={setForm} onSubmit={submit} saving={saving} submitLabel="Send Broadcast" /><Card className="border-2"><CardHeader><CardTitle>Broadcast History</CardTitle><CardDescription>{data?.broadcastRecipients.length || 0} eligible recipients excluding owners.</CardDescription></CardHeader><CardContent className="grid gap-4 md:grid-cols-2">{loading ? <Skeleton className="h-52 rounded-3xl" /> : data?.broadcasts.map((b) => <RecordCard key={b.id} title={b.title} meta={`${b.channel} · ${b.status} · ${b.deliveryCount} recipients`} content={b.content} onDelete={() => remove("broadcast", b.id)} />)}</CardContent></Card></PageShell>;
}

export function AdminAnnouncementsPage() {
  const { data, loading, error, mutate, remove } = useComms();
  const [form, setForm] = React.useState({ title: "", content: "", targetRoles: ["student", "parent", "teacher"], isPublished: true, publishDate: new Date().toISOString().slice(0, 10), expiryDate: "" });
  const [saving, setSaving] = React.useState(false);
  async function submit() { setSaving(true); try { await mutate({ action: "announcement.create", ...form }, "Announcement created"); setForm({ ...form, title: "", content: "" }); } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); } finally { setSaving(false); } }
  return <PageShell icon={Bell} title="Announcements" description="Publish tenant announcements to selected roles excluding owners.">{error ? <ErrorAlert message={error} /> : null}<Card className="border-2"><CardHeader><CardTitle>Create Announcement</CardTitle></CardHeader><CardContent className="space-y-4"><Field label="Title"><Input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} /></Field><Field label="Content"><Textarea value={form.content} onChange={(e) => setForm((p) => ({ ...p, content: e.target.value }))} /></Field><div className="grid gap-3 md:grid-cols-3"><Field label="Publish date"><Input type="date" value={form.publishDate} onChange={(e) => setForm((p) => ({ ...p, publishDate: e.target.value }))} /></Field><Field label="Expiry date"><Input type="date" value={form.expiryDate} onChange={(e) => setForm((p) => ({ ...p, expiryDate: e.target.value }))} /></Field><div className="flex items-center justify-between rounded-2xl border p-3"><span className="font-bold">Published</span><Switch checked={form.isPublished} onCheckedChange={(v) => setForm((p) => ({ ...p, isPublished: v }))} /></div></div><Button onClick={submit} disabled={saving} className="bg-orange-600 text-white hover:bg-orange-700">{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Bell className="mr-2 h-4 w-4" />}Publish Announcement</Button></CardContent></Card><Card className="border-2"><CardHeader><CardTitle>Announcement History</CardTitle></CardHeader><CardContent className="grid gap-4 md:grid-cols-2">{loading ? <Skeleton className="h-52 rounded-3xl" /> : data?.announcements.map((a) => <RecordCard key={a.id} title={a.title} meta={`${a.isPublished ? "Published" : "Draft"} · ${a.authorName}`} content={a.content} onDelete={() => remove("announcement", a.id)} />)}</CardContent></Card></PageShell>;
}

export function AdminSmsReportsPage() {
  const { data, loading, error, load } = useComms();
  const [query, setQuery] = React.useState("");
  const reports = (data?.smsReports || []).filter((r) => [r.title, r.userName, r.phone, r.email, r.status].join(" ").toLowerCase().includes(query.toLowerCase()));
  return <PageShell icon={CheckCircle2} title="SMS Reports" description="Delivery reporting for broadcast SMS/email/in-app messages."><div className="flex flex-wrap gap-2"><Button onClick={load} variant="outline">Refresh</Button><div className="relative max-w-sm"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search reports..." className="pl-9" /></div></div>{error ? <ErrorAlert message={error} /> : null}<div className="grid gap-3 md:grid-cols-4"><Metric label="Total" value={reports.length} /><Metric label="Sent" value={reports.filter((r) => ["sent", "delivered"].includes(r.status)).length} /><Metric label="Pending" value={reports.filter((r) => r.status === "pending").length} /><Metric label="Failed" value={reports.filter((r) => r.status === "failed").length} /></div><Card className="border-2"><CardHeader><CardTitle>Delivery Log</CardTitle></CardHeader><CardContent className="space-y-3">{loading ? <Skeleton className="h-80 rounded-3xl" /> : reports.map((r) => <div key={r.id} className="grid gap-3 rounded-2xl border p-4 md:grid-cols-[1fr_140px_120px] md:items-center"><div><p className="font-bold">{r.title || "Broadcast"}</p><p className="text-sm text-muted-foreground">{r.userName} · {r.phone || r.email || "No contact"}</p>{r.error ? <p className="text-sm text-destructive">{r.error}</p> : null}</div><Badge variant="outline" className="w-fit rounded-full capitalize">{r.channel}</Badge><Badge variant="outline" className="w-fit rounded-full capitalize">{r.status}</Badge></div>)}</CardContent></Card></PageShell>;
}

function PageShell({ icon: Icon, title, description, children }: { icon: React.ComponentType<{ className?: string }>; title: string; description: string; children: React.ReactNode }) { return <div className="space-y-6"><section className="rounded-3xl border bg-card p-6 shadow-sm"><Badge variant="outline" className="rounded-full">Communication</Badge><div className="mt-3 flex items-start gap-3"><span className="rounded-2xl bg-orange-500/10 p-3 text-orange-600"><Icon className="h-6 w-6" /></span><div><h1 className="text-3xl font-black tracking-tight">{title}</h1><p className="mt-2 max-w-3xl text-sm text-muted-foreground">{description}</p></div></div></section>{children}</div>; }
function ErrorAlert({ message }: { message: string }) { return <Alert variant="destructive"><AlertTitle>Communication error</AlertTitle><AlertDescription>{message}</AlertDescription></Alert>; }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <div className="space-y-2"><Label className="text-xs font-black uppercase text-muted-foreground">{label}</Label>{children}</div>; }
function Metric({ label, value }: { label: string; value: number }) { return <Card className="border-2"><CardContent className="p-5"><p className="text-xs font-black uppercase text-muted-foreground">{label}</p><p className="text-3xl font-black">{value}</p></CardContent></Card>; }
function Composer({ form, setForm, onSubmit, saving, submitLabel }: { form: { title: string; content: string; channel: string; targetAudience: string; status: string }; setForm: React.Dispatch<React.SetStateAction<{ title: string; content: string; channel: string; targetAudience: string; status: string }>>; onSubmit: () => void; saving: boolean; submitLabel: string }) { return <Card className="border-2"><CardHeader><CardTitle>Create Broadcast</CardTitle></CardHeader><CardContent className="space-y-4"><Field label="Title"><Input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} /></Field><Field label="Message"><Textarea value={form.content} onChange={(e) => setForm((p) => ({ ...p, content: e.target.value }))} /></Field><div className="grid gap-3 md:grid-cols-3"><Field label="Channel"><Select value={form.channel} onValueChange={(v) => setForm((p) => ({ ...p, channel: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="in-app">In-app</SelectItem><SelectItem value="sms">SMS</SelectItem><SelectItem value="email">Email</SelectItem></SelectContent></Select></Field><Field label="Audience"><Select value={form.targetAudience} onValueChange={(v) => setForm((p) => ({ ...p, targetAudience: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All except owner</SelectItem><SelectItem value="students">Students</SelectItem><SelectItem value="parents">Parents</SelectItem><SelectItem value="teachers">Teachers</SelectItem><SelectItem value="staff">Staff</SelectItem></SelectContent></Select></Field><Field label="Status"><Select value={form.status} onValueChange={(v) => setForm((p) => ({ ...p, status: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="sent">Send now</SelectItem><SelectItem value="draft">Draft</SelectItem><SelectItem value="scheduled">Scheduled</SelectItem></SelectContent></Select></Field></div><Button onClick={onSubmit} disabled={saving || !form.title || !form.content} className="bg-orange-600 text-white hover:bg-orange-700">{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}{submitLabel}</Button></CardContent></Card>; }
function RecordCard({ title, meta, content, onDelete }: { title: string; meta: string; content: string; onDelete: () => void }) { return <div className="rounded-3xl border bg-muted/10 p-5"><div className="flex justify-between gap-3"><div><h3 className="font-black">{title}</h3><p className="text-sm text-muted-foreground">{meta}</p></div><Button variant="destructive" size="sm" onClick={onDelete}><Trash2 className="h-4 w-4" /></Button></div><p className="mt-3 text-sm">{content}</p></div>; }
