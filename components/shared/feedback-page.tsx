"use client";

import * as React from "react";
import { CheckCircle2, MessageSquareReply, RefreshCw, Send, SlidersHorizontal } from "lucide-react";
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
import { cn } from "@/lib/utils";

type FeedbackItem = {
  id: string;
  title: string;
  message: string;
  category: string;
  priority: string;
  status: string;
  dashboardArea?: string | null;
  createdAt: string;
  updatedAt: string;
  senderName: string;
  senderEmail: string;
  senderRole: string;
  updates: Array<{ id: string; type: string; message: string; state?: string; createdAt: string; userName?: string }>;
};

export function FeedbackPage() {
  const [items, setItems] = React.useState<FeedbackItem[]>([]);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [reply, setReply] = React.useState("");
  const [status, setStatus] = React.useState("in_review");
  const [filter, setFilter] = React.useState("all");
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  const selected = items.find((item) => item.id === selectedId) || items[0] || null;

  const load = React.useCallback(async () => {
    setLoading(true);
    const url = filter === "all" ? "/api/feedback" : `/api/feedback?status=${encodeURIComponent(filter)}`;
    const response = await fetch(url, { cache: "no-store" }).catch(() => null);
    setLoading(false);
    if (!response?.ok) {
      toast.error("Could not load feedback");
      return;
    }
    const data = await response.json().catch(() => ({}));
    setItems(data.feedback || []);
    setSelectedId((current) => current || data.feedback?.[0]?.id || null);
  }, [filter]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const updateFeedback = async () => {
    if (!selected) return;
    if (!reply.trim() && !status) {
      toast.error("Add a reply or select a state");
      return;
    }
    setSaving(true);
    const response = await fetch("/api/feedback", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: selected.id, reply, status }),
    }).catch(() => null);
    setSaving(false);
    if (!response?.ok) {
      toast.error("Could not update feedback");
      return;
    }
    toast.success("Feedback updated");
    setReply("");
    void load();
  };

  const open = items.filter((item) => item.status === "open").length;
  const resolved = items.filter((item) => item.status === "resolved").length;

  return (
    <div className="grid gap-6 lg:grid-cols-[23rem_1fr]">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Open</CardTitle></CardHeader>
            <CardContent className="text-3xl font-semibold">{open}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Resolved</CardTitle></CardHeader>
            <CardContent className="text-3xl font-semibold">{resolved}</CardContent>
          </Card>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SlidersHorizontal className="size-5 text-primary" />
              Feedback Queue
            </CardTitle>
            <CardDescription>Feature requests, bug reports, improvements, and additions from users.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All states</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in_review">In review</SelectItem>
                <SelectItem value="planned">Planned</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="declined">Declined</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" className="w-full" onClick={() => void load()} disabled={loading}>
              <RefreshCw className={loading ? "size-4 animate-spin" : "size-4"} />
              Refresh
            </Button>
            <div className="space-y-2">
              {items.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">No feedback found.</p>}
              {items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setSelectedId(item.id)}
                  className={cn(
                    "w-full rounded-2xl border p-3 text-left transition-colors hover:bg-muted/60",
                    selected?.id === item.id && "border-primary/50 bg-primary/10"
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate font-medium">{item.title}</p>
                    <Badge variant="outline" className="capitalize">{item.status.replace(/_/g, " ")}</Badge>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{item.message}</p>
                  <p className="mt-2 text-xs text-muted-foreground">{item.senderName} · {item.senderRole?.replace(/_/g, " ")}</p>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{selected?.title || "Select feedback"}</CardTitle>
          <CardDescription>{selected ? `${selected.category} · ${selected.priority} priority · ${selected.senderEmail}` : "Manage the selected user feedback."}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {selected ? (
            <>
              <div className="rounded-2xl border bg-muted/20 p-4">
                <div className="mb-3 flex flex-wrap gap-2">
                  <Badge className="capitalize">{selected.status.replace(/_/g, " ")}</Badge>
                  <Badge variant="outline" className="capitalize">{selected.category}</Badge>
                  <Badge variant="outline" className="capitalize">{selected.priority}</Badge>
                </div>
                <p className="whitespace-pre-wrap text-sm leading-relaxed">{selected.message}</p>
                <p className="mt-3 text-xs text-muted-foreground">Submitted {new Date(selected.createdAt).toLocaleString()}</p>
              </div>

              <div className="space-y-3">
                <p className="flex items-center gap-2 text-sm font-medium">
                  <MessageSquareReply className="size-4 text-primary" />
                  Updates & replies
                </p>
                {selected.updates.length === 0 && <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">No replies yet.</p>}
                {selected.updates.map((update) => (
                  <div key={update.id} className="rounded-xl border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium">{update.userName || "System"}</p>
                      <Badge variant="secondary" className="capitalize">{update.type.replace(/_/g, " ")}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{update.message}</p>
                  </div>
                ))}
              </div>

              <div className="rounded-2xl border p-4">
                <div className="grid gap-4 md:grid-cols-[14rem_1fr]">
                  <div className="grid gap-2">
                    <Label>State</Label>
                    <Select value={status} onValueChange={setStatus}>
                      <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="in_review">In review</SelectItem>
                        <SelectItem value="planned">Planned</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                        <SelectItem value="declined">Declined</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Reply to sender</Label>
                    <Textarea value={reply} onChange={(event) => setReply(event.target.value)} placeholder="Write a response or implementation note..." />
                  </div>
                </div>
                <Button className="mt-4" onClick={() => void updateFeedback()} disabled={saving}>
                  {saving ? <RefreshCw className="size-4 animate-spin" /> : <Send className="size-4" />}
                  Update feedback
                </Button>
              </div>
            </>
          ) : (
            <div className="py-16 text-center text-muted-foreground">
              <CheckCircle2 className="mx-auto mb-3 size-10" />
              Select an item from the feedback queue.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
