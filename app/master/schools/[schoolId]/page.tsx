"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  Calendar,
  CheckCircle,
  CreditCard,
  Database,
  Edit,
  ExternalLink,
  Gauge,
  Loader2,
  Mail,
  PackageCheck,
  ReceiptText,
  Settings,
  ShieldCheck,
  TrendingUp,
  Users,
} from "lucide-react";

import { StatusPill } from "@/components/status-pill";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PLATFORM_SETTINGS_CHANNEL, PLATFORM_SETTINGS_SYNC_EVENT } from "@/lib/platform-settings-sync";

type SchoolDetail = {
  id: string;
  name: string;
  slug: string;
  country: string;
  countryCode?: string | null;
  currencyCode?: string | null;
  currencyName?: string | null;
  type: string;
  status: string;
  portalUrl?: string;
  subscriptionStatus?: string | null;
  subscriptionStartDate?: string | null;
  subscriptionEndDate?: string | null;
  planName?: string | null;
  planPrice?: number | string | null;
  planCurrency?: string | null;
  displayPlanPrice?: number | string | null;
  displayCurrency?: string | null;
  maxStudents?: number | null;
  maxStaff?: number | null;
  exchangeRateProvider?: string | null;
  createdAt: string;
  updatedAt: string;
  owner?: {
    id: string;
    name: string | null;
    email: string;
    roleName: string | null;
    temporaryAccess?: boolean | null;
    temporaryPasswordIssuedAt?: string | null;
  } | null;
  modules?: Array<{ id: string; moduleName: string; moduleKey: string; isEnabled: boolean }>;
  invoices?: Array<{
    id: string;
    invoiceNumber: string;
    status: string;
    issueDate: string;
    dueDate: string;
    amount: number | string;
    currency: string;
    displayAmount?: number | string;
    displayCurrency?: string;
    originalAmount?: number | string;
    originalCurrency?: string;
    description?: string | null;
  }>;
};

function safeCurrency(currency?: string | null) {
  return /^[A-Z]{3}$/.test(String(currency || "")) ? String(currency).toUpperCase() : "ZAR";
}

function money(value: number | string | null | undefined, currency?: string | null) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: safeCurrency(currency) }).format(Number(value || 0));
}

function dateLabel(value?: string | null) {
  if (!value) return "Not set";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Not set" : date.toLocaleDateString();
}

function daysUntil(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return Math.ceil((date.getTime() - Date.now()) / 86_400_000);
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="text-sm font-medium">{value}</div>
    </div>
  );
}

export default function SchoolDetailPage() {
  const params = useParams();
  const router = useRouter();
  const schoolId = String(params?.schoolId || "");
  const [school, setSchool] = useState<SchoolDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSchool = async () => {
    if (!schoolId) return;
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/master/schools/${schoolId}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to load school");
      setSchool(data.school || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load school");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchSchool();
  }, [schoolId]);

  useEffect(() => {
    const refresh = () => void fetchSchool();
    window.addEventListener(PLATFORM_SETTINGS_SYNC_EVENT, refresh);
    const channel = "BroadcastChannel" in window ? new BroadcastChannel(PLATFORM_SETTINGS_CHANNEL) : null;
    channel?.addEventListener("message", refresh);
    return () => {
      window.removeEventListener(PLATFORM_SETTINGS_SYNC_EVENT, refresh);
      channel?.close();
    };
  }, [schoolId]);

  const invoices = school?.invoices || [];
  const activeModules = useMemo(() => school?.modules?.filter((module) => module.isEnabled) || [], [school?.modules]);
  const invoiceMetrics = useMemo(() => {
    const pending = invoices.filter((invoice) => !["paid", "void", "cancelled"].includes(invoice.status.toLowerCase()));
    const paid = invoices.filter((invoice) => invoice.status.toLowerCase() === "paid");
    const totalOutstanding = pending.reduce((sum, invoice) => sum + Number(invoice.displayAmount ?? invoice.amount ?? 0), 0);
    return {
      pendingCount: pending.length,
      paidCount: paid.length,
      totalOutstanding,
      currency: pending[0]?.displayCurrency || pending[0]?.currency || school?.displayCurrency || school?.currencyCode,
    };
  }, [invoices, school?.currencyCode, school?.displayCurrency]);
  const renewalDays = daysUntil(school?.subscriptionEndDate);
  const moduleCoverage = school?.modules?.length ? Math.round((activeModules.length / school.modules.length) * 100) : 0;

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 rounded-3xl" />
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-64 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error || !school) {
    return (
      <Card className="bg-card/85 backdrop-blur">
        <CardContent className="flex min-h-80 flex-col items-center justify-center gap-4 p-8 text-center">
          <Building2 className="size-10 text-muted-foreground" />
          <div>
            <h1 className="text-2xl font-semibold">School not available</h1>
            <p className="mt-2 text-sm text-muted-foreground">{error || "No school record was returned by the API."}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push("/master/schools")}>Back to Schools</Button>
            <Button onClick={() => void fetchSchool()}>Retry</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <div className="rounded-3xl border bg-card/85 p-6 shadow-sm backdrop-blur">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="space-y-4">
            <Button variant="ghost" size="sm" className="w-fit gap-2 px-0 hover:bg-transparent" onClick={() => router.push("/master/schools")}>
              <ArrowLeft className="h-4 w-4" />
              Back to Schools
            </Button>
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-3xl font-bold tracking-tight">{school.name}</h1>
                <StatusPill status={school.status as any} text={school.status.charAt(0).toUpperCase() + school.status.slice(1)} />
              </div>
              <p className="mt-2 text-muted-foreground">Tenant configuration, subscription, access handoff, and billing visibility.</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="gap-2" onClick={() => school.portalUrl && window.open(school.portalUrl, "_blank", "noopener,noreferrer")}>
              <ExternalLink className="h-4 w-4" />
              Open Portal
            </Button>
            <Button variant="outline" className="gap-2" onClick={() => router.push(`/master/schools/${schoolId}/permissions`)}>
              <Settings className="h-4 w-4" />
              Permissions
            </Button>
            <Button className="gap-2" onClick={() => router.push(`/master/schools/${schoolId}/edit`)}>
              <Edit className="h-4 w-4" />
              Edit School
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="bg-card/85 backdrop-blur">
          <CardContent className="p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Plan</p>
            <p className="mt-2 text-2xl font-semibold">{school.planName || "No plan"}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {school.planName ? money(school.displayPlanPrice ?? school.planPrice, school.displayCurrency ?? school.planCurrency) : "Subscription not assigned"}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-card/85 backdrop-blur">
          <CardContent className="p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Subscription</p>
            <p className="mt-2 text-2xl font-semibold capitalize">{school.subscriptionStatus || "inactive"}</p>
            <p className="mt-1 text-sm text-muted-foreground">Renews or ends {dateLabel(school.subscriptionEndDate)}</p>
          </CardContent>
        </Card>
        <Card className="bg-card/85 backdrop-blur">
          <CardContent className="p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Capacity</p>
            <p className="mt-2 text-2xl font-semibold">{school.maxStudents || 0} / {school.maxStaff || 0}</p>
            <p className="mt-1 text-sm text-muted-foreground">Students / staff limits</p>
          </CardContent>
        </Card>
        <Card className="bg-card/85 backdrop-blur">
          <CardContent className="p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Modules</p>
            <p className="mt-2 text-2xl font-semibold">{activeModules.length}</p>
            <p className="mt-1 text-sm text-muted-foreground">Enabled tenant modules</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="bg-card/85 backdrop-blur">
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Access Handoff</p>
              <ShieldCheck className="size-5 text-primary" />
            </div>
            <p className="mt-2 text-2xl font-semibold">{school.owner?.temporaryAccess ? "Pending" : "Completed"}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {school.owner?.temporaryAccess ? `Issued ${dateLabel(school.owner.temporaryPasswordIssuedAt)}` : "Owner has completed first-access setup"}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-card/85 backdrop-blur">
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Outstanding Billing</p>
              <ReceiptText className="size-5 text-primary" />
            </div>
            <p className="mt-2 text-2xl font-semibold">{money(invoiceMetrics.totalOutstanding, invoiceMetrics.currency)}</p>
            <p className="mt-1 text-sm text-muted-foreground">{invoiceMetrics.pendingCount} open invoice{invoiceMetrics.pendingCount === 1 ? "" : "s"}</p>
          </CardContent>
        </Card>
        <Card className="bg-card/85 backdrop-blur">
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Renewal Window</p>
              <TrendingUp className="size-5 text-primary" />
            </div>
            <p className="mt-2 text-2xl font-semibold">{renewalDays === null ? "Not set" : renewalDays >= 0 ? `${renewalDays} days` : "Expired"}</p>
            <p className="mt-1 text-sm text-muted-foreground">Subscription end: {dateLabel(school.subscriptionEndDate)}</p>
          </CardContent>
        </Card>
        <Card className="bg-card/85 backdrop-blur">
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Module Coverage</p>
              <Gauge className="size-5 text-primary" />
            </div>
            <p className="mt-2 text-2xl font-semibold">{moduleCoverage}%</p>
            <p className="mt-1 text-sm text-muted-foreground">{activeModules.length} enabled from {school.modules?.length || 0} provisioned modules</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="bg-card/85 backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Building2 className="size-5 text-primary" /> School Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <InfoRow label="Tenant slug" value={<code className="rounded bg-muted px-2 py-1 text-xs">{school.slug}</code>} />
            <InfoRow label="Portal URL" value={<a className="break-all text-primary hover:underline" href={school.portalUrl} target="_blank" rel="noreferrer">{school.portalUrl}</a>} />
            <InfoRow label="Education level" value={<span className="capitalize">{school.type.replace(/_/g, " ")}</span>} />
            <InfoRow label="Country" value={`${school.country}${school.countryCode ? ` (${school.countryCode})` : ""}`} />
            <InfoRow label="Tenant currency" value={`${school.currencyCode || "Not set"}${school.currencyName ? ` - ${school.currencyName}` : ""}`} />
          </CardContent>
        </Card>

        <Card className="bg-card/85 backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Users className="size-5 text-primary" /> Owner Access</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {school.owner ? (
              <>
                <InfoRow label="Owner name" value={school.owner.name || "Unnamed owner"} />
                <InfoRow label="Email" value={<span className="inline-flex items-center gap-2"><Mail className="size-4 text-muted-foreground" />{school.owner.email}</span>} />
                <InfoRow label="Role" value={<Badge variant="outline" className="rounded-full capitalize">{school.owner.roleName || "owner"}</Badge>} />
                <InfoRow
                  label="Access state"
                  value={school.owner.temporaryAccess ? "Temporary password pending completion" : "Access completed"}
                />
              </>
            ) : (
              <div className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">
                No scoped owner account is linked to this tenant yet.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card/85 backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><CreditCard className="size-5 text-primary" /> Subscription</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <InfoRow label="Status" value={<StatusPill status={(school.subscriptionStatus || "inactive") as any} text={school.subscriptionStatus || "inactive"} />} />
            <InfoRow label="Plan price" value={school.planName ? money(school.displayPlanPrice ?? school.planPrice, school.displayCurrency ?? school.planCurrency) : "No active plan"} />
            <InfoRow label="Exchange source" value={school.exchangeRateProvider || "No conversion required"} />
            <InfoRow label="Start date" value={dateLabel(school.subscriptionStartDate)} />
            <InfoRow label="End date" value={dateLabel(school.subscriptionEndDate)} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1.6fr]">
        <Card className="bg-card/85 backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><ShieldCheck className="size-5 text-primary" /> Enabled Modules</CardTitle>
          </CardHeader>
          <CardContent>
            {activeModules.length ? (
              <div className="flex flex-wrap gap-2">
                {activeModules.map((module) => (
                  <Badge key={module.id} variant="outline" className="rounded-full">{module.moduleName}</Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No modules are enabled for this tenant.</p>
            )}
            <Separator className="my-5" />
            <div className="grid gap-4 sm:grid-cols-2">
              <InfoRow label="Created" value={<span className="inline-flex items-center gap-2"><Calendar className="size-4 text-muted-foreground" />{dateLabel(school.createdAt)}</span>} />
              <InfoRow label="Updated" value={dateLabel(school.updatedAt)} />
              <InfoRow label="Database" value={<span className="inline-flex items-center gap-2"><Database className="size-4 text-muted-foreground" />Provisioned</span>} />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/85 backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2"><CreditCard className="size-5 text-primary" /> Recent Invoices</CardTitle>
            <Button variant="outline" size="sm" onClick={() => router.push(`/master/schools/${schoolId}/invoices`)}>View All</Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-xl border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead>Invoice</TableHead>
                    <TableHead>Issued</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Due</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.slice(0, 5).map((invoice) => (
                    <TableRow key={invoice.id} className="cursor-pointer" onClick={() => router.push(`/master/schools/${schoolId}/invoices/${invoice.invoiceNumber}`)}>
                      <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{dateLabel(invoice.issueDate)}</TableCell>
                      <TableCell>{money(invoice.displayAmount ?? invoice.amount, invoice.displayCurrency ?? invoice.currency)}</TableCell>
                      <TableCell><StatusPill status={invoice.status as any} text={invoice.status} /></TableCell>
                      <TableCell className="text-sm text-muted-foreground">{dateLabel(invoice.dueDate)}</TableCell>
                    </TableRow>
                  ))}
                  {!invoices.length && (
                    <TableRow>
                      <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">No invoices found for this school.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="bg-card/85 backdrop-blur xl:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><PackageCheck className="size-5 text-primary" /> Tenant Readiness Checklist</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            {[
              { label: "Tenant record created", done: Boolean(school.id), detail: school.slug },
              { label: "Owner account linked", done: Boolean(school.owner?.email), detail: school.owner?.email || "Missing owner" },
              { label: "First-access security enabled", done: Boolean(school.owner), detail: school.owner?.temporaryAccess ? "Temporary password pending" : "Completed" },
              { label: "Subscription assigned", done: Boolean(school.planName), detail: school.planName || "No plan assigned" },
              { label: "Modules enabled", done: activeModules.length > 0, detail: `${activeModules.length} module${activeModules.length === 1 ? "" : "s"} active` },
              { label: "Invoice generated", done: invoices.length > 0, detail: `${invoices.length} invoice${invoices.length === 1 ? "" : "s"} available` },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl border bg-background/60 p-4">
                <div className="flex items-start gap-3">
                  <span className={`mt-0.5 flex size-6 items-center justify-center rounded-full ${item.done ? "bg-emerald-500 text-white" : "bg-muted text-muted-foreground"}`}>
                    <CheckCircle className="size-4" />
                  </span>
                  <div>
                    <p className="font-medium">{item.label}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{item.detail}</p>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="bg-card/85 backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Settings className="size-5 text-primary" /> Quick Operations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" className="w-full justify-start gap-2" onClick={() => router.push(`/master/schools/${schoolId}/edit`)}>
              <Edit className="size-4" />
              Update school profile
            </Button>
            <Button variant="outline" className="w-full justify-start gap-2" onClick={() => router.push(`/master/schools/${schoolId}/permissions`)}>
              <ShieldCheck className="size-4" />
              Review role permissions
            </Button>
            <Button variant="outline" className="w-full justify-start gap-2" onClick={() => router.push(`/master/schools/${schoolId}/invoices`)}>
              <ReceiptText className="size-4" />
              Manage tenant invoices
            </Button>
            <Button className="w-full justify-start gap-2" onClick={() => school.portalUrl && window.open(school.portalUrl, "_blank", "noopener,noreferrer")}>
              <ExternalLink className="size-4" />
              Open tenant admin portal
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
