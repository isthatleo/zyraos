"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Check, Loader2, Pencil, RefreshCw, Save, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { StatusPill } from "@/components/status-pill";
import { PLATFORM_SETTINGS_SYNC_EVENT } from "@/lib/platform-settings-sync";

type Plan = {
  id: string;
  name: string;
  tagline?: string;
  description: string | null;
  price: number;
  currency: string;
  originalPrice?: number;
  originalCurrency?: string;
  displayPrice?: number;
  displayCurrency?: string;
  displayPriceFormatted?: string;
  exchangeRate?: number;
  exchangeRateDate?: string | null;
  exchangeRateProvider?: string;
  exchangeRateStale?: boolean;
  conversionAvailable?: boolean;
  period: string;
  label?: string;
  features: string[];
  unavailableFeatures?: string[];
  modules?: string[];
  maxStudents: number | null;
  maxStaff: number | null;
  isActive: boolean;
  popular: boolean;
  color: string;
  iconKey: string;
  activeSubscriptions: number;
  totalSubscriptions: number;
  schoolCount: number;
  revenue: number;
  displayRevenue?: number;
  displayRevenueCurrency?: string;
  outstanding: number;
  displayOutstanding?: number;
  displayOutstandingCurrency?: string;
};

type SubscriptionRow = {
  id: string;
  status: string;
  startDate: string;
  endDate: string | null;
  autoRenew: boolean;
  schoolName: string | null;
  schoolSlug: string | null;
  schoolStatus: string | null;
};

type InvoiceRow = {
  id: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  originalAmount?: number;
  originalCurrency?: string;
  displayAmount?: number;
  displayCurrency?: string;
  exchangeRateProvider?: string;
  exchangeRateStale?: boolean;
  status: "paid" | "pending" | "overdue" | "void";
  dueDate: string | null;
  schoolName: string | null;
};

function money(amount: number, currency = "ZAR") {
  return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(Number(amount || 0));
}

function displayCurrency(plan: Pick<Plan, "displayCurrency" | "currency">) {
  return plan.displayCurrency || plan.currency || "ZAR";
}

function displayPrice(plan: Plan) {
  return Number(plan.displayPrice ?? plan.price ?? 0);
}

function dateLabel(date?: string | null) {
  return date ? new Date(date).toLocaleDateString() : "Not set";
}

function listToText(list?: string[]) {
  return (list || []).join("\n");
}

function textToList(value: string) {
  return value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
}

export default function PlanDetailsPage() {
  const params = useParams<{ planId?: string }>();
  const router = useRouter();
  const planId = params?.planId || "";
  const [plan, setPlan] = React.useState<Plan | null>(null);
  const [draft, setDraft] = React.useState<Plan | null>(null);
  const [subscriptions, setSubscriptions] = React.useState<SubscriptionRow[]>([]);
  const [invoices, setInvoices] = React.useState<InvoiceRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [editing, setEditing] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);

  const load = React.useCallback(async () => {
    if (!planId) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/master/plans/${planId}`, { cache: "no-store" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Failed to load plan");
      setPlan(data.plan);
      setDraft(data.plan);
      setSubscriptions(data.subscriptions || []);
      setInvoices(data.invoices || []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load plan");
    } finally {
      setLoading(false);
    }
  }, [planId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  React.useEffect(() => {
    const refreshForCurrencyChange = (event: Event) => {
      const detail = (event as CustomEvent<{ currency?: string }>).detail;
      if (!detail || "currency" in detail) void load();
    };

    window.addEventListener(PLATFORM_SETTINGS_SYNC_EVENT, refreshForCurrencyChange as EventListener);
    return () => window.removeEventListener(PLATFORM_SETTINGS_SYNC_EVENT, refreshForCurrencyChange as EventListener);
  }, [load]);

  const updateDraft = (updates: Partial<Plan>) => {
    setDraft((current) => current ? { ...current, ...updates } : current);
  };

  const save = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/master/plans/${draft.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Failed to update plan");
      toast.success("Plan updated");
      setEditing(false);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update plan");
    } finally {
      setSaving(false);
    }
  };

  const deletePlan = async () => {
    if (!plan) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/master/plans/${plan.id}`, { method: "DELETE" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Failed to delete plan");
      toast.success(data.archived ? "Plan archived" : "Plan deleted");
      if (data.archived) {
        setDeleteOpen(false);
        await load();
      } else {
        router.push("/master/plans");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete plan");
    } finally {
      setSaving(false);
    }
  };

  if (loading && !plan) {
    return <div className="flex min-h-[55vh] items-center justify-center"><Loader2 className="size-6 animate-spin text-primary" /></div>;
  }

  if (!plan || !draft) {
    return (
      <div className="flex min-h-[55vh] flex-col items-center justify-center text-center">
        <X className="mb-4 size-12 text-destructive" />
        <h1 className="text-2xl font-semibold">Plan Not Found</h1>
        <Button className="mt-6" onClick={() => router.push("/master/plans")}>Back to Plans</Button>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-4 md:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push("/master/plans")}>
            <ArrowLeft className="size-5" />
          </Button>
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">Plan Details</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">{plan.name}</h1>
            <p className="mt-2 text-muted-foreground">{plan.tagline || plan.description}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="rounded-full" onClick={load}><RefreshCw className="size-4" />Refresh</Button>
          <Button variant="outline" className="rounded-full" asChild><Link href={`/master/schools/provision?plan=${plan.id}`}>Use Plan</Link></Button>
          {editing ? (
            <Button className="rounded-full" onClick={save} disabled={saving}><Save className="size-4" />Save</Button>
          ) : (
            <Button className="rounded-full" onClick={() => setEditing(true)}><Pencil className="size-4" />Edit</Button>
          )}
          <Button variant="destructive" className="rounded-full" onClick={() => setDeleteOpen(true)}><Trash2 className="size-4" />Delete</Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader>
            <CardDescription>Price</CardDescription>
            <CardTitle>{money(displayPrice(plan), displayCurrency(plan))}/{plan.period}</CardTitle>
            {plan.currency !== displayCurrency(plan) ? (
              <CardDescription>Original: {money(plan.price, plan.currency)} {plan.exchangeRateProvider ? `/ ${plan.exchangeRateProvider}` : ""}</CardDescription>
            ) : null}
          </CardHeader>
        </Card>
        <Card><CardHeader><CardDescription>Active Subscriptions</CardDescription><CardTitle>{plan.activeSubscriptions}</CardTitle></CardHeader></Card>
        <Card><CardHeader><CardDescription>Schools</CardDescription><CardTitle>{plan.schoolCount}</CardTitle></CardHeader></Card>
        <Card><CardHeader><CardDescription>Collected Revenue</CardDescription><CardTitle>{money(plan.displayRevenue ?? plan.revenue, plan.displayRevenueCurrency || displayCurrency(plan))}</CardTitle></CardHeader></Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_0.8fr]">
        <Card className="border-border/70 bg-card/95 shadow-sm">
          <CardHeader>
            <CardTitle>Plan Configuration</CardTitle>
            <CardDescription>Edits here immediately update provisioning and subscription joins.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2"><Label>Name</Label><Input disabled={!editing} value={draft.name} onChange={(event) => updateDraft({ name: event.target.value })} /></div>
            <div className="space-y-2"><Label>Tagline</Label><Input disabled={!editing} value={draft.tagline || ""} onChange={(event) => updateDraft({ tagline: event.target.value })} /></div>
            <div className="space-y-2"><Label>Price</Label><Input disabled={!editing} type="number" value={draft.price} onChange={(event) => updateDraft({ price: Number(event.target.value || 0) })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Currency</Label><Input disabled={!editing} value={draft.currency} onChange={(event) => updateDraft({ currency: event.target.value.toUpperCase() })} /></div>
              <div className="space-y-2"><Label>Period</Label><Select disabled={!editing} value={draft.period} onValueChange={(value) => updateDraft({ period: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="month">Month</SelectItem><SelectItem value="term">Term</SelectItem><SelectItem value="year">Year</SelectItem></SelectContent></Select></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Max Students</Label><Input disabled={!editing} type="number" value={draft.maxStudents ?? ""} onChange={(event) => updateDraft({ maxStudents: event.target.value ? Number(event.target.value) : null })} /></div>
              <div className="space-y-2"><Label>Max Staff</Label><Input disabled={!editing} type="number" value={draft.maxStaff ?? ""} onChange={(event) => updateDraft({ maxStaff: event.target.value ? Number(event.target.value) : null })} /></div>
            </div>
            <div className="space-y-2"><Label>Label</Label><Input disabled={!editing} value={draft.label || ""} onChange={(event) => updateDraft({ label: event.target.value })} /></div>
            <div className="space-y-2"><Label>Accent Color</Label><Input disabled={!editing} value={draft.color} onChange={(event) => updateDraft({ color: event.target.value })} /></div>
            <div className="space-y-2 md:col-span-2"><Label>Description</Label><Textarea disabled={!editing} value={draft.description || ""} onChange={(event) => updateDraft({ description: event.target.value })} /></div>
            <div className="space-y-2"><Label>Included Features</Label><Textarea disabled={!editing} rows={8} value={listToText(draft.features)} onChange={(event) => updateDraft({ features: textToList(event.target.value) })} /></div>
            <div className="space-y-2"><Label>Unavailable Features</Label><Textarea disabled={!editing} rows={8} value={listToText(draft.unavailableFeatures)} onChange={(event) => updateDraft({ unavailableFeatures: textToList(event.target.value) })} /></div>
            <div className="space-y-2 md:col-span-2"><Label>Modules</Label><Textarea disabled={!editing} rows={3} value={listToText(draft.modules)} onChange={(event) => updateDraft({ modules: textToList(event.target.value) })} /></div>
            <div className="flex gap-6 md:col-span-2">
              <label className="flex items-center gap-2 text-sm"><Switch disabled={!editing} checked={draft.isActive} onCheckedChange={(checked) => updateDraft({ isActive: checked })} />Active</label>
              <label className="flex items-center gap-2 text-sm"><Switch disabled={!editing} checked={draft.popular} onCheckedChange={(checked) => updateDraft({ popular: checked })} />Recommended</label>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/95 shadow-sm">
          <CardHeader>
            <CardTitle>Plan Preview</CardTitle>
            <CardDescription>How the plan appears in provisioning and plan cards.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="rounded-3xl border bg-background/60 p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-semibold">{draft.name}</h3>
                {draft.isActive ? <Badge>Active</Badge> : <Badge variant="secondary">Inactive</Badge>}
              </div>
              <p className="mt-2 text-muted-foreground">{draft.tagline || draft.description}</p>
              <div className="mt-5 text-4xl font-bold">
                {editing ? money(draft.price, draft.currency) : money(displayPrice(plan), displayCurrency(plan))}
                <span className="text-base font-normal text-muted-foreground">/{draft.period}</span>
              </div>
              {!editing && plan.currency !== displayCurrency(plan) ? (
                <p className="mt-1 text-xs text-muted-foreground">Original plan price: {money(plan.price, plan.currency)}</p>
              ) : null}
              <div className="mt-5 space-y-2">
                {draft.features.slice(0, 5).map((feature) => <div key={feature} className="flex gap-2 text-sm"><Check className="size-4 text-primary" />{feature}</div>)}
              </div>
            </div>
            <div className="rounded-2xl border bg-background/60 p-4 text-sm">
              <p className="font-medium">Delete behavior</p>
              <p className="mt-1 text-muted-foreground">This plan has {plan.totalSubscriptions} subscription record(s). Used plans are archived, not hard-deleted.</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/70 bg-card/95 shadow-sm">
        <CardHeader><CardTitle>Schools & Subscriptions Using This Plan</CardTitle><CardDescription>These subscriptions continue to reference this plan after edits.</CardDescription></CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow><TableHead>School</TableHead><TableHead>Status</TableHead><TableHead>Start</TableHead><TableHead>End</TableHead><TableHead>Auto Renew</TableHead></TableRow></TableHeader>
            <TableBody>
              {subscriptions.length ? subscriptions.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.schoolName || "Unknown School"}<div className="text-xs text-muted-foreground">{row.schoolSlug}</div></TableCell>
                  <TableCell><Badge variant={row.status === "active" ? "default" : "secondary"}>{row.status}</Badge></TableCell>
                  <TableCell>{dateLabel(row.startDate)}</TableCell>
                  <TableCell>{dateLabel(row.endDate)}</TableCell>
                  <TableCell>{row.autoRenew ? "Yes" : "No"}</TableCell>
                </TableRow>
              )) : <TableRow><TableCell colSpan={5} className="h-24 text-center text-muted-foreground">No subscriptions currently use this plan.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="border-border/70 bg-card/95 shadow-sm">
        <CardHeader><CardTitle>Recent Invoices From This Plan</CardTitle><CardDescription>Billing records linked through subscriptions.</CardDescription></CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow><TableHead>Invoice</TableHead><TableHead>School</TableHead><TableHead>Amount</TableHead><TableHead>Status</TableHead><TableHead>Due</TableHead></TableRow></TableHeader>
            <TableBody>
              {invoices.length ? invoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell><Link className="font-medium text-primary hover:underline" href={`/master/billing/invoices/${invoice.id}`}>{invoice.invoiceNumber}</Link></TableCell>
                  <TableCell>{invoice.schoolName || "Unknown School"}</TableCell>
                  <TableCell>
                    {money(invoice.displayAmount ?? invoice.amount, invoice.displayCurrency || invoice.currency)}
                    {invoice.currency !== (invoice.displayCurrency || invoice.currency) ? (
                      <div className="text-xs text-muted-foreground">Original {money(invoice.amount, invoice.currency)}</div>
                    ) : null}
                  </TableCell>
                  <TableCell><StatusPill status={invoice.status} text={invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)} /></TableCell>
                  <TableCell>{dateLabel(invoice.dueDate)}</TableCell>
                </TableRow>
              )) : <TableRow><TableCell colSpan={5} className="h-24 text-center text-muted-foreground">No invoices linked to this plan yet.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete or archive this plan?</AlertDialogTitle>
            <AlertDialogDescription>
              {plan.totalSubscriptions > 0
                ? "This plan is in use, so deleting it will archive it to preserve subscriptions, invoices, and school billing history."
                : "This plan is unused and can be removed safely."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={deletePlan} disabled={saving} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {saving ? <Loader2 className="size-4 animate-spin" /> : null}
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
