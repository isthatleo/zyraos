"use client";

import * as React from "react";
import Link from "next/link";
import {
  Check,
  Crown,
  Eye,
  Globe,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Shield,
  Star,
  Trash2,
  Users,
  X,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { PLATFORM_SETTINGS_SYNC_EVENT } from "@/lib/platform-settings-sync";
import { cn } from "@/lib/utils";

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
  iconKey: "basic" | "starter" | "standard" | "professional" | "premium" | "enterprise" | "custom";
  activeSubscriptions: number;
  totalSubscriptions: number;
  schoolCount: number;
  revenue: number;
  displayRevenue?: number;
  displayRevenueCurrency?: string;
  createdAt: string;
  updatedAt: string;
};

type PlanMetrics = {
  total: number;
  active: number;
  inactive: number;
  activeSubscriptions: number;
  mrr: number;
  revenue: number;
  currency?: string;
};

const emptyPlan: Plan = {
  id: "",
  name: "",
  tagline: "",
  description: "",
  price: 0,
  currency: "ZAR",
  period: "month",
  label: "",
  features: [],
  unavailableFeatures: [],
  modules: [],
  maxStudents: null,
  maxStaff: null,
  isActive: true,
  popular: false,
  color: "orange",
  iconKey: "basic",
  activeSubscriptions: 0,
  totalSubscriptions: 0,
  schoolCount: 0,
  revenue: 0,
  createdAt: "",
  updatedAt: "",
};

const iconMap = {
  basic: Shield,
  starter: Zap,
  standard: Users,
  professional: Shield,
  premium: Star,
  enterprise: Crown,
  custom: Globe,
};

const colorMap: Record<string, string> = {
  orange: "border-primary/30 bg-primary/5",
  green: "border-emerald-500/30 bg-emerald-500/5",
  blue: "border-sky-500/30 bg-sky-500/5",
  purple: "border-violet-500/30 bg-violet-500/5",
  gray: "border-border bg-muted/30",
  indigo: "border-indigo-500/30 bg-indigo-500/5",
};

function money(amount: number, currency = "ZAR") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(Number(amount || 0));
}

function planDisplayCurrency(plan: Pick<Plan, "displayCurrency" | "currency">) {
  return plan.displayCurrency || plan.currency || "ZAR";
}

function planDisplayPrice(plan: Plan) {
  return Number(plan.displayPrice ?? plan.price ?? 0);
}

function planDisplayRevenue(plan: Plan) {
  return Number(plan.displayRevenue ?? plan.revenue ?? 0);
}

function stringList(value: string[] | undefined) {
  return (value || []).join("\n");
}

function parseList(value: string) {
  return value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
}

function validatePlanDraft(plan: Plan, requireId: boolean) {
  const id = plan.id.trim().toLowerCase();
  const name = plan.name.trim();
  const currency = plan.currency.trim().toUpperCase();

  if (requireId && !id) return "Plan ID is required";
  if (id && (id.length < 2 || id.length > 80)) return "Plan ID must be between 2 and 80 characters";
  if (!name) return "Plan name is required";
  if (name.length > 120) return "Plan name cannot exceed 120 characters";
  if ((plan.description || "").length > 1200) return "Plan description cannot exceed 1200 characters";
  if (!Number.isFinite(Number(plan.price)) || Number(plan.price) < 0) return "Plan price cannot be negative";
  if (!/^[A-Z]{3}$/.test(currency)) return "Currency must be a valid 3-letter ISO code";
  if (plan.maxStudents !== null && (!Number.isFinite(Number(plan.maxStudents)) || Number(plan.maxStudents) < 0)) return "Student limit must be a positive number or empty";
  if (plan.maxStaff !== null && (!Number.isFinite(Number(plan.maxStaff)) || Number(plan.maxStaff) < 0)) return "Staff limit must be a positive number or empty";
  return null;
}

function PlanDialog({
  open,
  onOpenChange,
  initialPlan,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialPlan: Plan | null;
  onSave: (plan: Plan) => Promise<void>;
}) {
  const [saving, setSaving] = React.useState(false);
  const [plan, setPlan] = React.useState<Plan>(initialPlan || emptyPlan);
  const PreviewIcon = iconMap[plan.iconKey] || Shield;
  const includedCount = plan.features.length;
  const unavailableCount = plan.unavailableFeatures?.length || 0;
  const moduleCount = plan.modules?.length || 0;

  React.useEffect(() => {
    setPlan(initialPlan || emptyPlan);
  }, [initialPlan, open]);

  const save = async () => {
    const validationError = validatePlanDraft(plan, !initialPlan);
    if (validationError) {
      toast.error(validationError);
      return;
    }
    setSaving(true);
    try {
      await onSave(plan);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[92svh] max-h-[92svh] !w-[min(1180px,calc(100vw-2rem))] !max-w-none flex-col gap-0 overflow-hidden rounded-3xl border bg-background p-0 shadow-2xl">
        <DialogHeader className="shrink-0 border-b bg-gradient-to-br from-card via-card to-primary/5 px-5 py-4 lg:px-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <Badge className="rounded-full bg-primary text-primary-foreground">Subscription Catalogue</Badge>
                <Badge variant={plan.isActive ? "secondary" : "outline"} className="rounded-full">
                  {plan.isActive ? "Active plan" : "Inactive draft"}
                </Badge>
              </div>
              <DialogTitle className="text-xl font-semibold tracking-tight md:text-2xl">{initialPlan ? "Edit Subscription Plan" : "Create Subscription Plan"}</DialogTitle>
              <DialogDescription className="mt-2 max-w-3xl text-sm leading-6">
                Configure pricing, limits, modules, features, card styling, and provisioning visibility. Every line in the feature boxes becomes one plan feature.
              </DialogDescription>
            </div>
            <div className="grid w-full grid-cols-3 gap-2 rounded-2xl border bg-background/75 p-2 shadow-sm backdrop-blur xl:w-auto">
              <div className="rounded-xl bg-primary/10 px-3 py-2 text-center">
                <p className="text-base font-semibold text-primary">{includedCount}</p>
                <p className="text-[11px] text-muted-foreground">Included</p>
              </div>
              <div className="rounded-xl bg-muted/60 px-3 py-2 text-center">
                <p className="text-base font-semibold">{unavailableCount}</p>
                <p className="text-[11px] text-muted-foreground">Unavailable</p>
              </div>
              <div className="rounded-xl bg-muted/60 px-3 py-2 text-center">
                <p className="text-base font-semibold">{moduleCount}</p>
                <p className="text-[11px] text-muted-foreground">Modules</p>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto bg-muted/15 px-4 py-5 md:px-6">
          <div className="mx-auto max-w-5xl space-y-5">
            <div className="min-w-0 space-y-5">
              <Card className="overflow-hidden border-border/70 bg-card/95 shadow-sm">
                <CardHeader className="border-b bg-muted/25">
                  <div className="flex items-start gap-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-sm font-semibold text-primary">1</div>
                    <div>
                      <CardTitle className="text-base">Identity & Positioning</CardTitle>
                      <CardDescription>Set the public name, catalogue badge, short pitch, and description.</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="grid gap-4 p-5 md:grid-cols-2 lg:p-6">
                  <div className="space-y-2">
                    <Label>Plan ID</Label>
                    <Input value={plan.id} disabled={Boolean(initialPlan)} onChange={(event) => setPlan({ ...plan, id: event.target.value })} placeholder="standard" />
                    <p className="text-xs text-muted-foreground">Used in URLs and subscriptions. Cannot be changed after creation.</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Name</Label>
                    <Input value={plan.name} onChange={(event) => setPlan({ ...plan, name: event.target.value })} placeholder="Standard" />
                  </div>
                  <div className="space-y-2">
                    <Label>Tagline</Label>
                    <Input value={plan.tagline || ""} onChange={(event) => setPlan({ ...plan, tagline: event.target.value })} placeholder="For growing schools" />
                  </div>
                  <div className="space-y-2">
                    <Label>Label</Label>
                    <Input value={plan.label || ""} onChange={(event) => setPlan({ ...plan, label: event.target.value })} placeholder="Most Popular" />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Description</Label>
                    <Textarea
                      rows={4}
                      value={plan.description || ""}
                      onChange={(event) => setPlan({ ...plan, description: event.target.value })}
                      placeholder="Describe who this plan is for and the value it unlocks..."
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="overflow-hidden border-border/70 bg-card/95 shadow-sm">
                <CardHeader className="border-b bg-muted/25">
                  <div className="flex items-start gap-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-sm font-semibold text-primary">2</div>
                    <div>
                      <CardTitle className="text-base">Pricing, Limits & Availability</CardTitle>
                      <CardDescription>These values drive provisioning, invoice generation, and tenant plan limits.</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="grid gap-4 p-5 md:grid-cols-2 lg:p-6">
                  <div className="space-y-2">
                    <Label>Price</Label>
                    <Input type="number" min="0" step="0.01" value={plan.price} onChange={(event) => setPlan({ ...plan, price: Number(event.target.value || 0) })} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Currency</Label>
                      <Input value={plan.currency} onChange={(event) => setPlan({ ...plan, currency: event.target.value.toUpperCase() })} maxLength={3} placeholder="ZAR" />
                    </div>
                    <div className="space-y-2">
                      <Label>Period</Label>
                      <Select value={plan.period} onValueChange={(value) => setPlan({ ...plan, period: value })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="month">Monthly</SelectItem>
                          <SelectItem value="term">Termly</SelectItem>
                          <SelectItem value="year">Yearly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Max Students</Label>
                      <Input type="number" min="0" value={plan.maxStudents ?? ""} onChange={(event) => setPlan({ ...plan, maxStudents: event.target.value ? Number(event.target.value) : null })} placeholder="Unlimited" />
                    </div>
                    <div className="space-y-2">
                      <Label>Max Staff</Label>
                      <Input type="number" min="0" value={plan.maxStaff ?? ""} onChange={(event) => setPlan({ ...plan, maxStaff: event.target.value ? Number(event.target.value) : null })} placeholder="Unlimited" />
                    </div>
                  </div>
                  <div className="grid gap-3 rounded-2xl border bg-muted/25 p-4 md:col-span-2 md:grid-cols-2">
                    <label className="flex min-h-24 items-center justify-between gap-4 rounded-xl border bg-background/80 p-4 text-sm shadow-sm">
                      <span>
                        <span className="block font-medium">Recommended</span>
                        <span className="text-xs text-muted-foreground">Highlight this plan in the catalogue.</span>
                      </span>
                      <Switch checked={plan.popular} onCheckedChange={(checked) => setPlan({ ...plan, popular: checked })} />
                    </label>
                    <label className="flex min-h-24 items-center justify-between gap-4 rounded-xl border bg-background/80 p-4 text-sm shadow-sm">
                      <span>
                        <span className="block font-medium">Active</span>
                        <span className="text-xs text-muted-foreground">Allow this plan in new provisioning.</span>
                      </span>
                      <Switch checked={plan.isActive} onCheckedChange={(checked) => setPlan({ ...plan, isActive: checked })} />
                    </label>
                  </div>
                </CardContent>
              </Card>

              <Card className="overflow-hidden border-border/70 bg-card/95 shadow-sm">
                <CardHeader className="border-b bg-muted/25">
                  <div className="flex items-start gap-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-sm font-semibold text-primary">3</div>
                    <div>
                      <CardTitle className="text-base">Feature Builder</CardTitle>
                      <CardDescription>Press Enter to add a new line. Each line becomes a separate feature on the plan card.</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="grid gap-4 p-5 lg:grid-cols-2 lg:p-6">
                  <div className="space-y-3 rounded-2xl border bg-background/80 p-4 shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <Label>Included Features</Label>
                        <p className="mt-1 text-xs text-muted-foreground">Shown with check marks. One feature per line.</p>
                      </div>
                      <Badge className="rounded-full">{includedCount}</Badge>
                    </div>
                    <Textarea
                      rows={10}
                      className="min-h-64 resize-y rounded-xl leading-7"
                      value={stringList(plan.features)}
                      onChange={(event) => setPlan({ ...plan, features: parseList(event.target.value) })}
                      placeholder={"Student information system\nAttendance tracking\nFinance dashboard\nParent portal"}
                    />
                    <div className="flex max-h-24 flex-wrap gap-2 overflow-y-auto rounded-xl bg-muted/20 p-2">
                      {plan.features.slice(0, 8).map((feature) => (
                        <Badge key={feature} variant="secondary" className="max-w-full truncate rounded-full">
                          <Check className="mr-1 size-3 text-primary" />
                          {feature}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3 rounded-2xl border bg-background/80 p-4 shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <Label>Unavailable Features</Label>
                        <p className="mt-1 text-xs text-muted-foreground">Shown as disabled features. One feature per line.</p>
                      </div>
                      <Badge variant="outline" className="rounded-full">{unavailableCount}</Badge>
                    </div>
                    <Textarea
                      rows={10}
                      className="min-h-64 resize-y rounded-xl leading-7"
                      value={stringList(plan.unavailableFeatures)}
                      onChange={(event) => setPlan({ ...plan, unavailableFeatures: parseList(event.target.value) })}
                      placeholder={"Advanced analytics\nCustom integrations\nDedicated support"}
                    />
                    <div className="flex max-h-24 flex-wrap gap-2 overflow-y-auto rounded-xl bg-muted/20 p-2">
                      {(plan.unavailableFeatures || []).slice(0, 8).map((feature) => (
                        <Badge key={feature} variant="outline" className="max-w-full truncate rounded-full text-muted-foreground">
                          <X className="mr-1 size-3" />
                          {feature}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3 rounded-2xl border bg-background/80 p-4 shadow-sm lg:col-span-2">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <Label>Modules</Label>
                        <p className="mt-1 text-xs text-muted-foreground">Modules enabled or marketed by this plan. One module per line.</p>
                      </div>
                      <Badge variant="outline" className="rounded-full">{moduleCount}</Badge>
                    </div>
                    <Textarea
                      rows={4}
                      className="min-h-32 resize-y rounded-xl leading-7"
                      value={stringList(plan.modules)}
                      onChange={(event) => setPlan({ ...plan, modules: parseList(event.target.value) })}
                      placeholder={"sis\nfinance\nattendance\nmessages"}
                    />
                    <div className="flex max-h-24 flex-wrap gap-2 overflow-y-auto rounded-xl bg-muted/20 p-2">
                      {(plan.modules || []).slice(0, 12).map((module) => (
                        <Badge key={module} variant="secondary" className="rounded-full">{module}</Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="min-w-0 space-y-5">
              <Card className="overflow-hidden border-border/70 bg-card/95 shadow-sm">
                <CardHeader className="border-b bg-muted/25 pb-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-base">Live Preview</CardTitle>
                      <CardDescription className="text-xs">Updates as you type.</CardDescription>
                    </div>
                    <Badge variant="secondary" className="rounded-full">{plan.currency || "ZAR"}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-5">
                  <div className={cn("relative overflow-hidden rounded-3xl border-2 p-5 shadow-sm", colorMap[plan.color] || colorMap.orange, plan.popular && "ring-2 ring-primary/40")}>
                    <div className="pointer-events-none absolute -right-12 -top-12 size-32 rounded-full bg-primary/10 blur-2xl" />
                    {(plan.popular || plan.label) ? (
                      <Badge className="absolute right-4 top-4 bg-primary text-primary-foreground shadow-sm">
                        {plan.label || "Recommended"}
                      </Badge>
                    ) : null}
                    <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/15">
                      <PreviewIcon className="size-5" />
                    </div>
                    <h3 className="mt-4 text-xl font-semibold">{plan.name || "Plan Name"}</h3>
                    <p className="mt-1 line-clamp-2 min-h-10 text-sm text-muted-foreground">{plan.tagline || plan.description || "Short plan description appears here."}</p>
                    <div className="mt-5 rounded-2xl border bg-background/60 p-4">
                      <span className="text-3xl font-bold">{money(planDisplayPrice(plan), planDisplayCurrency(plan))}</span>
                      <span className="text-muted-foreground">/{plan.period || "month"}</span>
                      {plan.currency !== planDisplayCurrency(plan) ? (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Original: {money(plan.price, plan.currency)}
                        </p>
                      ) : null}
                    </div>
                    <Separator className="my-4" />
                    <div className="grid grid-cols-2 gap-2 rounded-xl border bg-background/60 p-2 text-center text-xs">
                      <div><p className="font-semibold">{plan.maxStudents?.toLocaleString() ?? "Unlimited"}</p><p className="text-muted-foreground">Students</p></div>
                      <div><p className="font-semibold">{plan.maxStaff?.toLocaleString() ?? "Unlimited"}</p><p className="text-muted-foreground">Staff</p></div>
                    </div>
                    <ul className="mt-4 max-h-48 space-y-2 overflow-y-auto pr-1">
                      {(plan.features.length ? plan.features : ["Included feature preview"]).slice(0, 4).map((feature) => (
                        <li key={feature} className="flex gap-2 text-sm"><Check className="mt-0.5 size-4 shrink-0 text-primary" /><span className="min-w-0">{feature}</span></li>
                      ))}
                      {(plan.unavailableFeatures || []).slice(0, 2).map((feature) => (
                        <li key={feature} className="flex gap-2 text-sm text-muted-foreground line-through"><X className="mt-0.5 size-4 shrink-0" /><span className="min-w-0">{feature}</span></li>
                      ))}
                    </ul>
                    {(plan.modules || []).length ? (
                      <>
                        <Separator className="my-4" />
                        <div className="flex flex-wrap gap-1">
                          {plan.modules?.slice(0, 6).map((module) => <Badge key={module} variant="secondary">{module}</Badge>)}
                        </div>
                      </>
                    ) : null}
                  </div>

                  <Card className="mt-4 border-border/70 bg-muted/25">
                    <CardContent className="grid gap-3 p-4 text-sm">
                      <div className="flex justify-between gap-4"><span className="text-muted-foreground">Status</span><span className="font-medium">{plan.isActive ? "Active" : "Inactive"}</span></div>
                      <div className="flex justify-between gap-4"><span className="text-muted-foreground">Accent</span><span className="font-medium capitalize">{plan.color}</span></div>
                      <div className="flex justify-between gap-4"><span className="text-muted-foreground">Icon</span><span className="font-medium capitalize">{plan.iconKey}</span></div>
                    </CardContent>
                  </Card>

                  <Card className="mt-4 border-primary/20 bg-primary/5">
                    <CardContent className="p-4 text-sm text-muted-foreground">
                      Saving this plan updates provisioning, plan details, and all plan cards immediately after refresh.
                    </CardContent>
                  </Card>
                </CardContent>
              </Card>

              <Card className="overflow-hidden border-border/70 bg-card/95 shadow-sm">
                <CardHeader className="border-b bg-muted/25">
                  <div className="flex items-start gap-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-sm font-semibold text-primary">4</div>
                    <div>
                      <CardTitle className="text-base">Visual Style</CardTitle>
                      <CardDescription>Control how the plan card feels in the catalogue.</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="grid gap-4 p-5">
                  <div className="space-y-2">
                    <Label>Accent</Label>
                    <Select value={plan.color} onValueChange={(value) => setPlan({ ...plan, color: value })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["orange", "green", "blue", "purple", "gray", "indigo"].map((color) => <SelectItem key={color} value={color}>{color}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Icon</Label>
                    <Select value={plan.iconKey} onValueChange={(value) => setPlan({ ...plan, iconKey: value as Plan["iconKey"] })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.keys(iconMap).map((icon) => <SelectItem key={icon} value={icon}>{icon}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        <DialogFooter className="m-0 shrink-0 rounded-none border-t bg-background px-6 py-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving || !plan.name || (!initialPlan && !plan.id)}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : null}
            Save Plan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MetricCard({ title, value, subtitle }: { title: string; value: string; subtitle: string }) {
  return (
    <Card className="border-border/70 bg-card/95 shadow-sm">
      <CardHeader className="pb-2">
        <CardDescription>{title}</CardDescription>
        <CardTitle>{value}</CardTitle>
      </CardHeader>
      <CardContent><p className="text-sm text-muted-foreground">{subtitle}</p></CardContent>
    </Card>
  );
}

function MetricSkeleton() {
  return (
    <Card className="border-border/70 bg-card/95 shadow-sm">
      <CardHeader className="space-y-3 pb-2">
        <div className="h-4 w-28 animate-pulse rounded-full bg-muted" />
        <div className="h-7 w-20 animate-pulse rounded-full bg-muted" />
      </CardHeader>
      <CardContent><div className="h-4 w-40 animate-pulse rounded-full bg-muted" /></CardContent>
    </Card>
  );
}

export default function SubscriptionPlansPage() {
  const [plans, setPlans] = React.useState<Plan[]>([]);
  const [metrics, setMetrics] = React.useState<PlanMetrics | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [activeMutationId, setActiveMutationId] = React.useState<string | null>(null);
  const [activePlan, setActivePlan] = React.useState<Plan | null>(null);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [planToDelete, setPlanToDelete] = React.useState<Plan | null>(null);
  const [query, setQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("all");

  const fetchPlans = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/master/plans", { cache: "no-store" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Failed to load plans");
      setPlans(data.plans || []);
      setMetrics(data.metrics || null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load plans";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void fetchPlans();
  }, [fetchPlans]);

  React.useEffect(() => {
    const refreshForCurrencyChange = (event: Event) => {
      const detail = (event as CustomEvent<{ currency?: string }>).detail;
      if (!detail || "currency" in detail) void fetchPlans();
    };

    window.addEventListener(PLATFORM_SETTINGS_SYNC_EVENT, refreshForCurrencyChange as EventListener);
    return () => window.removeEventListener(PLATFORM_SETTINGS_SYNC_EVENT, refreshForCurrencyChange as EventListener);
  }, [fetchPlans]);

  const handleSave = async (plan: Plan) => {
    const validationError = validatePlanDraft(plan, !activePlan);
    if (validationError) {
      toast.error(validationError);
      return;
    }
    setSaving(true);
    try {
      const method = activePlan ? "PUT" : "POST";
      const response = await fetch("/api/master/plans", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(plan),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Failed to save plan");
      toast.success(activePlan ? "Plan updated" : "Plan created");
      setDialogOpen(false);
      setActivePlan(null);
      await fetchPlans();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save plan");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (plan: Plan, isActive: boolean) => {
    setActiveMutationId(plan.id);
    try {
      await handleSave({ ...plan, isActive });
    } finally {
      setActiveMutationId(null);
    }
  };

  const handleDelete = async () => {
    if (!planToDelete) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/master/plans/${planToDelete.id}`, { method: "DELETE" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Failed to delete plan");
      toast.success(data.archived ? "Plan archived because it is in use" : "Plan deleted");
      setDeleteDialogOpen(false);
      setPlanToDelete(null);
      await fetchPlans();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete plan");
    } finally {
      setSaving(false);
    }
  };

  const filteredPlans = plans.filter((plan) => {
    const matchesQuery = !query || [plan.name, plan.description, plan.tagline, plan.id].filter(Boolean).join(" ").toLowerCase().includes(query.toLowerCase());
    const matchesStatus = statusFilter === "all" || (statusFilter === "active" ? plan.isActive : !plan.isActive);
    return matchesQuery && matchesStatus;
  });

  return (
    <div className="space-y-8 p-4 md:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">Subscription Catalogue</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Subscription Plans</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">Create, price, monitor, archive, and tune plans used by school provisioning and billing.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="rounded-full" onClick={fetchPlans} disabled={loading}>
            <RefreshCw className={cn("size-4", loading && "animate-spin")} />
            Refresh
          </Button>
          <Button className="rounded-full" onClick={() => { setActivePlan(null); setDialogOpen(true); }}>
            <Plus className="size-4" />
            Add Plan
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {loading && !metrics ? (
          <>
            <MetricSkeleton />
            <MetricSkeleton />
            <MetricSkeleton />
            <MetricSkeleton />
          </>
        ) : (
          <>
            <MetricCard title="Total Plans" value={String(metrics?.total || 0)} subtitle={`${metrics?.active || 0} active, ${metrics?.inactive || 0} inactive`} />
            <MetricCard title="Active Subscriptions" value={String(metrics?.activeSubscriptions || 0)} subtitle="Schools currently assigned" />
            <MetricCard title="MRR" value={money(metrics?.mrr || 0, metrics?.currency || "ZAR")} subtitle="Projected monthly recurring revenue" />
            <MetricCard title="Collected Revenue" value={money(metrics?.revenue || 0, metrics?.currency || "ZAR")} subtitle="Paid invoices linked to plans" />
          </>
        )}
      </div>

      {error ? (
        <Card className="border-destructive/40 bg-destructive/5 shadow-sm">
          <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold text-destructive">Could not load subscription plans</p>
              <p className="mt-1 text-sm text-muted-foreground">{error}</p>
            </div>
            <Button variant="outline" onClick={fetchPlans} disabled={loading}>
              <RefreshCw className={cn("size-4", loading && "animate-spin")} />
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <Card className="border-border/70 bg-card/95 shadow-sm">
        <CardHeader>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle>Plan Catalogue</CardTitle>
              <CardDescription>All subscription plans available to the platform and provisioning flow.</CardDescription>
            </div>
            <div className="flex flex-wrap gap-3">
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search plans..." className="pl-9" />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="size-6 animate-spin text-primary" />
            </div>
          ) : filteredPlans.length ? (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {filteredPlans.map((plan) => {
                const Icon = iconMap[plan.iconKey] || Shield;
                return (
                  <Card key={plan.id} className={cn("relative overflow-hidden border-2 bg-card shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg", colorMap[plan.color] || colorMap.orange, plan.popular && "ring-2 ring-primary/40")}>
                    {(plan.popular || plan.label) ? (
                      <div className="absolute right-4 top-4">
                        <Badge className="bg-primary text-primary-foreground">{plan.label || "Recommended"}</Badge>
                      </div>
                    ) : null}
                    <CardHeader className="space-y-4">
                      <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                        <Icon className="size-7" />
                      </div>
                      <div>
                        <CardTitle className="text-2xl">{plan.name}</CardTitle>
                        <CardDescription className="mt-1">{plan.tagline || plan.description}</CardDescription>
                      </div>
                      <div>
                        <span className="text-4xl font-bold">{money(planDisplayPrice(plan), planDisplayCurrency(plan))}</span>
                        <span className="text-muted-foreground">/{plan.period}</span>
                        {plan.currency !== planDisplayCurrency(plan) ? (
                          <p className="mt-1 text-xs text-muted-foreground">
                            Original {money(plan.price, plan.currency)}
                            {plan.exchangeRateProvider ? ` / ${plan.exchangeRateProvider}` : ""}
                          </p>
                        ) : null}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-5">
                      <div className="grid grid-cols-3 gap-2 rounded-2xl border bg-background/60 p-3 text-center text-xs">
                        <div><p className="font-semibold">{plan.schoolCount}</p><p className="text-muted-foreground">Schools</p></div>
                        <div><p className="font-semibold">{plan.activeSubscriptions}</p><p className="text-muted-foreground">Active</p></div>
                        <div><p className="font-semibold">{money(planDisplayRevenue(plan), plan.displayRevenueCurrency || planDisplayCurrency(plan))}</p><p className="text-muted-foreground">Revenue</p></div>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Students: <span className="font-medium text-foreground">{plan.maxStudents?.toLocaleString() ?? "Unlimited"}</span>
                        {" · "}
                        Staff: <span className="font-medium text-foreground">{plan.maxStaff?.toLocaleString() ?? "Unlimited"}</span>
                      </div>
                      <ul className="space-y-2">
                        {plan.features.slice(0, 5).map((feature) => (
                          <li key={feature} className="flex gap-2 text-sm"><Check className="mt-0.5 size-4 text-primary" /><span>{feature}</span></li>
                        ))}
                        {(plan.unavailableFeatures || []).slice(0, 2).map((feature) => (
                          <li key={feature} className="flex gap-2 text-sm text-muted-foreground line-through"><X className="mt-0.5 size-4" /><span>{feature}</span></li>
                        ))}
                      </ul>
                      {(plan.modules || []).length ? (
                        <>
                          <Separator />
                          <div className="flex flex-wrap gap-1">
                            {plan.modules?.slice(0, 8).map((module) => <Badge key={module} variant="secondary">{module}</Badge>)}
                          </div>
                        </>
                      ) : null}
                      <div className="flex items-center justify-between rounded-xl border bg-background/60 p-3">
                        <span className="text-sm font-medium">{plan.isActive ? "Active" : "Inactive"}</span>
                        <Switch checked={plan.isActive} disabled={saving || activeMutationId === plan.id} onCheckedChange={(checked) => toggleActive(plan, checked)} />
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                        <Button asChild variant="outline" size="sm" className="col-span-1">
                          <Link href={`/master/plans/${plan.id}`}><Eye className="size-4" /></Link>
                        </Button>
                        <Button variant="outline" size="sm" className="col-span-1" onClick={() => { setActivePlan(plan); setDialogOpen(true); }}>
                          <Pencil className="size-4" />
                        </Button>
                        <Button variant="destructive" size="sm" className="col-span-1" onClick={() => { setPlanToDelete(plan); setDeleteDialogOpen(true); }}>
                          <Trash2 className="size-4" />
                        </Button>
                        <Button asChild size="sm" className="col-span-1">
                          <Link href={`/master/schools/provision?plan=${plan.id}`}>Use</Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed p-12 text-center text-muted-foreground">No subscription plans match the current filters.</div>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/70 bg-card/95 shadow-sm">
        <CardHeader>
          <CardTitle>Frequently Asked Questions</CardTitle>
          <CardDescription>Operational guidance for plan changes and billing impact.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2">
          {[
            ["Do plan edits update current schools?", "Yes. Plan name, limits, features and price are read from the plan record wherever subscriptions join to the plan."],
            ["Can active plans be deleted?", "Plans with subscription history are archived instead of hard-deleted to preserve billing and invoice integrity."],
            ["Does provisioning use these plans?", "Yes. The school provisioning wizard fetches active plans from this API and uses the selected plan for the first subscription and invoice."],
            ["Can I temporarily hide a plan?", "Yes. Toggle a plan inactive to remove it from new provisioning while preserving existing usage."],
          ].map(([title, body]) => (
            <div key={title} className="rounded-2xl border bg-background/60 p-5">
              <h3 className="font-semibold">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <PlanDialog open={dialogOpen} onOpenChange={setDialogOpen} initialPlan={activePlan} onSave={handleSave} />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete or archive this plan?</AlertDialogTitle>
            <AlertDialogDescription>
              {planToDelete?.totalSubscriptions
                ? `"${planToDelete.name}" is used by ${planToDelete.totalSubscriptions} subscription(s), so it will be archived to preserve billing history.`
                : `"${planToDelete?.name}" is not used and can be removed.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={saving} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {saving ? <Loader2 className="size-4 animate-spin" /> : null}
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
