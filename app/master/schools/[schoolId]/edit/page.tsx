"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Building2, ExternalLink, Loader2, Save, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CountrySelect,
  CurrencySelect,
  getCountryOption,
  getCurrencyOption,
} from "@/components/shared/localized-fields";

type SchoolForm = {
  id: string;
  name: string;
  slug: string;
  country: string;
  countryCode: string;
  currencyCode: string;
  currencyName: string;
  type: string;
  status: string;
  portalUrl?: string;
  createdAt?: string;
  updatedAt?: string;
};

const schoolTypes = [
  { value: "primary", label: "Primary School" },
  { value: "secondary", label: "Secondary School" },
  { value: "college", label: "College" },
  { value: "university", label: "University" },
  { value: "vocational", label: "Vocational / Technical" },
];

const statuses = [
  { value: "active", label: "Active" },
  { value: "trial", label: "Trial" },
  { value: "inactive", label: "Inactive" },
  { value: "suspended", label: "Suspended" },
  { value: "deactivated", label: "Deactivated" },
];

function normalizeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function dateLabel(value?: string) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Not recorded" : date.toLocaleString();
}

export default function EditSchoolPage() {
  const params = useParams<{ schoolId?: string }>();
  const router = useRouter();
  const schoolId = String(params?.schoolId || "");
  const [school, setSchool] = React.useState<SchoolForm | null>(null);
  const [initialSchool, setInitialSchool] = React.useState<SchoolForm | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");

  const loadSchool = React.useCallback(async () => {
    if (!schoolId) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/master/schools/${schoolId}`, { cache: "no-store", credentials: "include" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || "Failed to load school.");
      const record = payload.school || {};
      const next: SchoolForm = {
        id: String(record.id || schoolId),
        name: String(record.name || ""),
        slug: String(record.slug || ""),
        country: String(record.country || ""),
        countryCode: String(record.countryCode || getCountryOption(record.country)?.code || ""),
        currencyCode: String(record.currencyCode || record.displayCurrency || ""),
        currencyName: String(record.currencyName || getCurrencyOption(record.currencyCode || record.displayCurrency)?.name || ""),
        type: String(record.type || "secondary"),
        status: String(record.status || "active"),
        portalUrl: record.portalUrl,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
      };
      setSchool(next);
      setInitialSchool(next);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load school.");
    } finally {
      setLoading(false);
    }
  }, [schoolId]);

  React.useEffect(() => {
    void loadSchool();
  }, [loadSchool]);

  const updateField = (field: keyof SchoolForm, value: string) => {
    setSchool((current) => (current ? { ...current, [field]: value } : current));
  };

  const dirty = React.useMemo(() => JSON.stringify(school) !== JSON.stringify(initialSchool), [initialSchool, school]);

  const handleSave = async () => {
    if (!school || saving) return;
    if (!school.name.trim()) {
      toast.error("School name is required.");
      return;
    }
    if (!school.slug.trim()) {
      toast.error("School slug is required.");
      return;
    }
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(school.slug)) {
      toast.error("Slug can only contain lowercase letters, numbers, and hyphens.");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/master/schools/${schoolId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: school.name.trim(),
          slug: school.slug.trim(),
          country: school.country,
          countryCode: school.countryCode,
          currencyCode: school.currencyCode,
          currencyName: school.currencyName,
          type: school.type,
          status: school.status,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || "Failed to update school.");
      toast.success("School updated successfully.");
      router.push(`/master/schools/${schoolId}`);
      router.refresh();
    } catch (saveError) {
      toast.error(saveError instanceof Error ? saveError.message : "Failed to update school.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-28 rounded-3xl" />
        <Skeleton className="h-[520px] rounded-3xl" />
      </div>
    );
  }

  if (error || !school) {
    return (
      <Card className="mx-auto max-w-2xl">
        <CardContent className="flex min-h-80 flex-col items-center justify-center gap-4 p-8 text-center">
          <Building2 className="size-10 text-muted-foreground" />
          <div>
            <h1 className="text-2xl font-semibold">School edit page unavailable</h1>
            <p className="mt-2 text-sm text-muted-foreground">{error || "The school record could not be loaded."}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push(`/master/schools/${schoolId}`)}>Back to School</Button>
            <Button onClick={() => void loadSchool()}>Retry</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-4">
            <Button variant="ghost" size="sm" className="w-fit gap-2 px-0 hover:bg-transparent" onClick={() => router.push(`/master/schools/${schoolId}`)}>
              <ArrowLeft className="size-4" />
              Back to School Details
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <span className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Building2 className="size-6" />
                </span>
                <div>
                  <h1 className="text-3xl font-bold tracking-tight">Edit {initialSchool?.name || "School"}</h1>
                  <p className="mt-1 text-sm text-muted-foreground">Update the master tenant profile used by provisioning, billing, routing, and dashboards.</p>
                </div>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {school.portalUrl ? (
              <Button variant="outline" className="gap-2" onClick={() => window.open(school.portalUrl, "_blank", "noopener,noreferrer")}>
                <ExternalLink className="size-4" />
                Open Portal
              </Button>
            ) : null}
            <Button className="gap-2" disabled={saving || !dirty} onClick={handleSave}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-6">
          <Card className="border-foreground/15 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="size-5 text-primary" />
                School Identity
              </CardTitle>
              <CardDescription>Core tenant identity and routing information.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="school-name">School Name</Label>
                <Input id="school-name" value={school.name} onChange={(event) => updateField("name", event.target.value)} className="h-11 rounded-2xl" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="school-slug">Tenant Slug</Label>
                <Input id="school-slug" value={school.slug} onChange={(event) => updateField("slug", normalizeSlug(event.target.value))} className="h-11 rounded-2xl font-mono text-sm" />
                <p className="text-xs text-muted-foreground">Changing this changes the tenant portal URL.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="school-type">Education Type</Label>
                <Select value={school.type} onValueChange={(value) => updateField("type", value)}>
                  <SelectTrigger id="school-type" className="h-11 rounded-2xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border border-border bg-popover text-popover-foreground shadow-xl">
                    {schoolTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="school-status">Status</Label>
                <Select value={school.status} onValueChange={(value) => updateField("status", value)}>
                  <SelectTrigger id="school-status" className="h-11 rounded-2xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border border-border bg-popover text-popover-foreground shadow-xl">
                    {statuses.map((status) => (
                      <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card className="border-foreground/15 shadow-sm">
            <CardHeader>
              <CardTitle>Location & Currency</CardTitle>
              <CardDescription>Regional fields used by billing, dashboards, invoices, and tenant defaults.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-5 md:grid-cols-2">
              <CountrySelect
                id="country"
                label="Country"
                value={school.country}
                onChange={(value, option) => {
                  setSchool((current) =>
                    current
                      ? {
                          ...current,
                          country: value,
                          countryCode: option.code,
                          currencyCode: current.currencyCode || option.currencyCode || "",
                          currencyName: current.currencyName || getCurrencyOption(option.currencyCode)?.name || "",
                        }
                      : current
                  );
                }}
              />
              <CurrencySelect
                id="currency"
                label="Tenant Currency"
                value={school.currencyCode}
                onChange={(value, option) => {
                  setSchool((current) => (current ? { ...current, currencyCode: value, currencyName: option.name } : current));
                }}
              />
              <div className="space-y-2">
                <Label htmlFor="country-code">Country Code</Label>
                <Input id="country-code" value={school.countryCode} onChange={(event) => updateField("countryCode", event.target.value.toUpperCase().slice(0, 2))} className="h-11 rounded-2xl" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency-name">Currency Name</Label>
                <Input id="currency-name" value={school.currencyName} onChange={(event) => updateField("currencyName", event.target.value)} className="h-11 rounded-2xl" />
              </div>
            </CardContent>
          </Card>
        </div>

        <aside className="space-y-6">
          <Card className="border-foreground/15 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ShieldCheck className="size-4 text-primary" />
                Save Summary
              </CardTitle>
              <CardDescription>Review the operational impact before saving.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="rounded-2xl border bg-muted/40 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Portal URL</p>
                <p className="mt-1 break-all font-medium">{school.portalUrl || `${school.slug}.localhost:3000`}</p>
              </div>
              <div className="grid gap-3">
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">Created</span>
                  <span className="text-right">{dateLabel(school.createdAt)}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">Last updated</span>
                  <span className="text-right">{dateLabel(school.updatedAt)}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">Pending changes</span>
                  <span className={dirty ? "font-semibold text-primary" : "text-muted-foreground"}>{dirty ? "Yes" : "No"}</span>
                </div>
              </div>
              <Button className="w-full gap-2" disabled={saving || !dirty} onClick={handleSave}>
                {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                Save School
              </Button>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
