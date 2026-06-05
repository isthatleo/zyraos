"use client";

import * as React from "react";
import { MessageSquarePlus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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

export function FeedbackWidget({ dashboardArea = "universal" }: { dashboardArea?: string }) {
  const [open, setOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [form, setForm] = React.useState({
    title: "",
    message: "",
    category: "feature",
    priority: "normal",
  });

  const submit = async () => {
    setSaving(true);
    const response = await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, dashboardArea }),
    }).catch(() => null);
    setSaving(false);
    if (!response?.ok) {
      toast.error("Could not submit feedback");
      return;
    }
    toast.success("Feedback submitted");
    setForm({ title: "", message: "", category: "feature", priority: "normal" });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <MessageSquarePlus className="size-4" />
          Send feedback
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send Feedback</DialogTitle>
          <DialogDescription>Share improvements, feature requests, additions, or bug reports with the platform team.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid gap-2">
            <Label>Title</Label>
            <Input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} />
          </div>
          <div className="grid gap-2">
            <Label>Message</Label>
            <Textarea rows={5} value={form.message} onChange={(event) => setForm((current) => ({ ...current, message: event.target.value }))} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Select value={form.category} onValueChange={(value) => setForm((current) => ({ ...current, category: value }))}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="feature">Feature improvement</SelectItem>
                <SelectItem value="addition">New addition</SelectItem>
                <SelectItem value="bug">Bug fix</SelectItem>
                <SelectItem value="workflow">Workflow issue</SelectItem>
              </SelectContent>
            </Select>
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
          <Button className="w-full" disabled={saving || !form.title.trim() || !form.message.trim()} onClick={() => void submit()}>
            Submit feedback
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
