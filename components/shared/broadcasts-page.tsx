"use client";

import * as React from "react";
import { Bell, CheckCircle2, Megaphone, RefreshCw, Send, Users } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type Broadcast = {
  id: string;
  title: string;
  content: string;
  channel: string;
  targetAudience: string;
  status: string;
  createdAt: string;
  sentAt?: string | null;
  createdByName?: string;
  deliveryCount: number;
  sentCount: number;
  failedCount: number;
  metadata?: { category?: string; priority?: string; recipientCount?: number };
};

const initialForm = {
  title: "",
  content: "",
  channel: "in-app",
  targetAudience: "all_users",
  category: "updates",
  priority: "normal",
};

export function BroadcastsPage() {
  const [broadcasts, setBroadcasts] = React.useState<Broadcast[]>([]);
  const [form, setForm] = React.useState(initialForm);
  const [loading, setLoading] = React.useState(true);
  const [sending, setSending] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    const response = await fetch("/api/broadcasts", { cache: "no-store" }).catch(() => null);
    setLoading(false);
    if (!response?.ok) {
      toast.error("Could not load broadcasts");
      return;
    }
    const data = await response.json().catch(() => ({}));
    setBroadcasts(data.broadcasts || []);
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const submit = async () => {
    if (!form.title.trim() || !form.content.trim()) {
      toast.error("Title and message are required");
      return;
    }
    setSending(true);
    const response = await fetch("/api/broadcasts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    }).catch(() => null);
    setSending(false);
    if (!response?.ok) {
      const data = await response?.json().catch(() => ({}));
      toast.error(data?.error || "Broadcast failed");
      return;
    }
    const data = await response.json().catch(() => ({}));
    toast.success(`Broadcast sent to ${data.recipientCount || 0} users`);
    setForm(initialForm);
    void load();
  };

  const sent = broadcasts.filter((item) => item.status === "sent").length;
  const totalRecipients = broadcasts.reduce((total, item) => total + Number(item.deliveryCount || 0), 0);

  return (
    <div className="grid gap-6 xl:grid-cols-[26rem_1fr]">
      <Card className="h-fit">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Megaphone className="size-5 text-primary" />
            Create Broadcast
          </CardTitle>
          <CardDescription>Send platform announcements to owners, school admins, finance users, staff, or everyone.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="broadcast-title">Title</Label>
            <Input id="broadcast-title" value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder="Invoice update, bug fix, platform release..." />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="broadcast-content">Message</Label>
            <Textarea id="broadcast-content" value={form.content} onChange={(event) => setForm((current) => ({ ...current, content: event.target.value }))} rows={7} placeholder="Write the announcement users should receive..." />
            <p className="text-xs text-muted-foreground">{form.content.length} characters</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Audience</Label>
              <Select value={form.targetAudience} onValueChange={(value) => setForm((current) => ({ ...current, targetAudience: value }))}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all_users">All users</SelectItem>
                  <SelectItem value="owners">Owners</SelectItem>
                  <SelectItem value="school_admins">Owners & school admins</SelectItem>
                  <SelectItem value="finance">Finance users</SelectItem>
                  <SelectItem value="staff">Staff & teachers</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Channel</Label>
              <Select value={form.channel} onValueChange={(value) => setForm((current) => ({ ...current, channel: value }))}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="in-app">In-app</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="sms">SMS</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(value) => setForm((current) => ({ ...current, category: value }))}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="updates">Updates</SelectItem>
                  <SelectItem value="invoice">Invoice</SelectItem>
                  <SelectItem value="bug_fix">Bug fix</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="feature">Feature release</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Priority</Label>
              <Select value={form.priority} onValueChange={(value) => setForm((current) => ({ ...current, priority: value }))}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button className="w-full" onClick={() => void submit()} disabled={sending}>
            {sending ? <RefreshCw className="size-4 animate-spin" /> : <Send className="size-4" />}
            Send broadcast
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Broadcasts</CardTitle></CardHeader>
            <CardContent className="text-3xl font-semibold">{broadcasts.length}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Sent</CardTitle></CardHeader>
            <CardContent className="text-3xl font-semibold">{sent}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Recipients</CardTitle></CardHeader>
            <CardContent className="text-3xl font-semibold">{totalRecipients}</CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>Broadcast History</CardTitle>
              <CardDescription>Delivery records are also used by the notification system.</CardDescription>
            </div>
            <Button variant="outline" onClick={() => void load()} disabled={loading}>
              <RefreshCw className={loading ? "size-4 animate-spin" : "size-4"} />
              Refresh
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {broadcasts.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">No broadcasts yet.</p>}
            {broadcasts.map((broadcast) => (
              <div key={broadcast.id} className="rounded-2xl border p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold">{broadcast.title}</h3>
                      <Badge className="capitalize">{broadcast.status}</Badge>
                      <Badge variant="outline" className="capitalize">{broadcast.channel}</Badge>
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{broadcast.content}</p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      By {broadcast.createdByName || "System"} · {new Date(broadcast.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="grid min-w-48 grid-cols-3 gap-2 text-center text-xs">
                    <div className="rounded-xl bg-muted p-2">
                      <Users className="mx-auto mb-1 size-4" />
                      {broadcast.deliveryCount}
                    </div>
                    <div className="rounded-xl bg-muted p-2">
                      <CheckCircle2 className="mx-auto mb-1 size-4 text-primary" />
                      {broadcast.sentCount}
                    </div>
                    <div className="rounded-xl bg-muted p-2">
                      <Bell className="mx-auto mb-1 size-4" />
                      {broadcast.failedCount}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
