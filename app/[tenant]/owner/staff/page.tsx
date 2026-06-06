"use client";

import * as React from "react";
import { useParams, usePathname, useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  Briefcase,
  CheckCircle2,
  Copy,
  KeyRound,
  Mail,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  UserCog,
  UserCheck,
  UserPlus,
  Users,
} from "lucide-react";
import { isValidPhoneNumber } from "react-phone-number-input";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { PhoneNumberField } from "@/components/shared/localized-fields";
import { getTenantSubdomain, resolveTenantSlug } from "@/lib/tenant-routing";
import { cn } from "@/lib/utils";

type StaffMember = {
  id: string;
  name: string;
  email: string;
  image: string | null;
  roleId: string;
  roleName: string;
  roleDescription: string;
  departmentId: string | null;
  departmentName: string;
  isActive: boolean;
  createdAt: string | null;
  employeeId: string;
  position: string;
  hireDate: string | null;
  salary: number;
  salaryPeriod: string;
  status: string;
};

type StaffPayload = {
  school: { name: string; type: string; slug: string; currencyCode?: string | null };
  staff: StaffMember[];
  roles: Array<{ id: string; name: string; description: string; canonicalRole: string; portal: string; dashboardPath: string }>;
  departments: Array<{ id: string; name: string; headId?: string | null }>;
  summary: { total: number; active: number; inactive: number; unassigned: number; departments: number };
};

type AccessResult = {
  user: { name: string; email: string; roleId: string; role: string; dashboardPath: string };
  employeeId: string;
  temporaryPassword: string;
  loginUrl: string;
  delivery: { email?: { ok: boolean; status: string; message: string }; sms?: { ok: boolean; status: string; message: string } | null };
};

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function formatDate(value: string | null) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

function statusClass(status: string) {
  const value = status.toLowerCase();
  if (["active", "approved", "paid"].includes(value)) return "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  if (["pending", "draft"].includes(value)) return "border-primary/25 bg-primary/10 text-primary";
  return "border-destructive/25 bg-destructive/10 text-destructive";
}

function previewEmployeeId(slug: string, staffCount: number) {
  const prefix = String(slug || "SCH").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6) || "SCH";
  return `${prefix}-${new Date().getFullYear()}-${String(staffCount + 1).padStart(6, "0")}`;
}

function normalizeAmountInput(value: string) {
  const cleaned = value.replace(/[^\d.]/g, "");
  const [whole, ...rest] = cleaned.split(".");
  return rest.length ? `${whole}.${rest.join("").slice(0, 2)}` : whole;
}

function formatMoney(amount: string, currency: string) {
  const numeric = Number(amount);
  if (!Number.isFinite(numeric) || numeric <= 0) return "";
  try {
    return new Intl.NumberFormat("en", { style: "currency", currency, maximumFractionDigits: 2 }).format(numeric);
  } catch {
    return `${currency} ${numeric.toLocaleString("en", { maximumFractionDigits: 2 })}`;
  }
}

const salaryPeriodOptions = [
  { value: "monthly", label: "Monthly" },
  { value: "per_term", label: "Per Term" },
  { value: "per_year", label: "Per Year" },
];

function salaryPeriodLabel(value: string) {
  return salaryPeriodOptions.find((option) => option.value === value)?.label || "Monthly";
}

function LoadingState() {
  return (
    <div className="space-y-6">
      <section className="rounded-3xl border bg-card p-6 shadow-sm">
        <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Users className="size-6" />
        </div>
        <Badge variant="outline" className="rounded-full">Owner staff</Badge>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight">Owner Staff Management</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">Loading staff access, departments, roles, and credential delivery state.</p>
      </section>
      <div className="grid gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-32 rounded-3xl" />)}
      </div>
      <Skeleton className="h-96 rounded-3xl" />
    </div>
  );
}

export default function OwnerStaffPage() {
  const params = useParams<{ tenant?: string }>();
  const pathname = usePathname();
  const router = useRouter();
  const paramTenantSlug = String(params?.tenant || "");
  const tenantSlug = paramTenantSlug && pathname?.startsWith(`/${paramTenantSlug}/`) ? paramTenantSlug : (typeof window !== "undefined" ? resolveTenantSlug(pathname, window.location.host) || "" : paramTenantSlug);
  const [isTenantSubdomain, setIsTenantSubdomain] = React.useState(false);
  const [data, setData] = React.useState<StaffPayload | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [accessResult, setAccessResult] = React.useState<AccessResult | null>(null);
  const [staffStep, setStaffStep] = React.useState(0);
  const [manualEmployeeId, setManualEmployeeId] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [query, setQuery] = React.useState("");
  const [roleFilter, setRoleFilter] = React.useState("all");
  const [departmentFilter, setDepartmentFilter] = React.useState("all");
  const [form, setForm] = React.useState({
    name: "",
    email: "",
    phone: "",
    roleId: "",
    departmentId: "",
    position: "",
    employeeId: "",
    hireDate: new Date().toISOString().slice(0, 10),
    salary: "",
    salaryPeriod: "monthly",
  });

  const resetStaffForm = React.useCallback(() => {
    setForm({
      name: "",
      email: "",
      phone: "",
      roleId: "",
      departmentId: "",
      position: "",
      employeeId: "",
      hireDate: new Date().toISOString().slice(0, 10),
      salary: "",
      salaryPeriod: "monthly",
    });
    setManualEmployeeId(false);
    setStaffStep(0);
    setFormError(null);
    setAccessResult(null);
  }, []);

  React.useEffect(() => {
    setIsTenantSubdomain(Boolean(getTenantSubdomain(window.location.hostname)));
  }, []);

  const tenantHref = React.useCallback(
    (href: string) => (isTenantSubdomain || !tenantSlug ? href : href.startsWith("/") ? `/${tenantSlug}${href}` : `/${tenantSlug}/${href}`),
    [isTenantSubdomain, tenantSlug]
  );

  const loadStaff = React.useCallback(
    async (refresh = false) => {
      setError(null);
      if (refresh) setRefreshing(true);
      else setLoading(true);
      try {
        const response = await fetch(`/api/tenant/owner/staff?tenant=${encodeURIComponent(tenantSlug)}`, {
          credentials: "include",
          cache: "no-store",
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload?.error || "Failed to load staff");
        setData(payload);
        if (refresh) toast.success("Staff data refreshed");
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Failed to load staff");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [tenantSlug]
  );

  React.useEffect(() => {
    void loadStaff();
  }, [loadStaff]);

  const filteredStaff = React.useMemo(() => {
    const term = query.trim().toLowerCase();
    return (data?.staff || []).filter((member) => {
      const matchesSearch =
        !term ||
        member.name.toLowerCase().includes(term) ||
        member.email.toLowerCase().includes(term) ||
        member.roleName.toLowerCase().includes(term) ||
        member.departmentName.toLowerCase().includes(term) ||
        member.employeeId.toLowerCase().includes(term);
      const matchesRole = roleFilter === "all" || member.roleId === roleFilter;
      const matchesDepartment = departmentFilter === "all" || (departmentFilter === "unassigned" ? !member.departmentId : member.departmentId === departmentFilter);
      return matchesSearch && matchesRole && matchesDepartment;
    });
  }, [data?.staff, departmentFilter, query, roleFilter]);

  const validateStep = React.useCallback((step: number) => {
    if (step === 0) {
      if (!form.name.trim()) return "Full name is required.";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return "A valid email address is required.";
      if (form.phone && !isValidPhoneNumber(form.phone)) return "Enter a valid staff phone number.";
    }
    if (step === 1) {
      if (!form.roleId) return "Role is required.";
      if (!form.departmentId) return "Department is required.";
      if (!form.position.trim()) return "Position / job title is required.";
      if (manualEmployeeId && !form.employeeId.trim()) return "Enter the manual employee ID or switch back to automatic ID.";
    }
    return null;
  }, [form, manualEmployeeId]);

  const goNextStep = () => {
    const validationError = validateStep(staffStep);
    if (validationError) {
      setFormError(validationError);
      return;
    }
    setFormError(null);
    setStaffStep((current) => Math.min(2, current + 1));
  };

  const submitStaff = async (event: React.FormEvent) => {
    event.preventDefault();
    const validationError = validateStep(0) || validateStep(1);
    if (validationError) {
      setFormError(validationError);
      setStaffStep(validationError.includes("name") || validationError.includes("email") || validationError.includes("phone") ? 0 : 1);
      return;
    }
    setSaving(true);
    setAccessResult(null);
    setFormError(null);
    try {
      const response = await fetch(`/api/tenant/owner/staff?tenant=${encodeURIComponent(tenantSlug)}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          departmentId: form.departmentId || undefined,
          employeeId: manualEmployeeId ? form.employeeId : undefined,
          salary: form.salary ? Number(form.salary) : undefined,
          salaryPeriod: form.salaryPeriod,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || "Failed to create staff account");
      setAccessResult(payload);
      toast.success("Staff access created");
      setStaffStep(3);
      await loadStaff(true);
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : "Failed to create staff account";
      setFormError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const copyAccess = async () => {
    if (!accessResult) return;
    await navigator.clipboard.writeText(
      [`Login: ${accessResult.loginUrl}`, `Email: ${accessResult.user.email}`, `Employee ID: ${accessResult.employeeId}`, `Temporary password: ${accessResult.temporaryPassword}`].join("\n")
    );
    toast.success("Access details copied");
  };

  if (loading) return <LoadingState />;

  if (error || !data) {
    return (
      <Alert variant="destructive" className="rounded-3xl">
        <AlertCircle className="size-4" />
        <AlertTitle>Staff page failed to load</AlertTitle>
        <AlertDescription className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span>{error || "No staff data was returned."}</span>
          <Button variant="secondary" onClick={() => loadStaff()}>Retry</Button>
        </AlertDescription>
      </Alert>
    );
  }

  const roleOptions = data.roles;
  const departmentOptions = data.departments;
  const salaryCurrency = String(data.school.currencyCode || "UGX").toUpperCase();
  const salaryPreview = formatMoney(form.salary, salaryCurrency);

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Users className="size-6" />
            </div>
            <Badge variant="outline" className="rounded-full">{data.school.name}</Badge>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight">Owner Staff Management</h1>
            <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
              Create staff access, review school leadership, monitor departments, and hand off temporary credentials with first-login password change enforcement.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => loadStaff(true)} disabled={refreshing}>
              <RefreshCw className={cn("size-4", refreshing && "animate-spin")} />
              Refresh
            </Button>
            <Button variant="outline" onClick={() => router.push(tenantHref("/owner/permissions"))}>
              <ShieldCheck className="size-4" />
              Permissions
            </Button>
            <Dialog open={dialogOpen} onOpenChange={(open) => {
              setDialogOpen(open);
              if (open) resetStaffForm();
            }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="size-4" />
                  Create Staff
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-5xl">
                <form onSubmit={submitStaff}>
                  <DialogHeader>
                    <DialogTitle>Create staff access</DialogTitle>
                    <DialogDescription>
                      Joan-style staff onboarding: identity, role access, review, then temporary password handoff.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="mt-6 grid gap-3 md:grid-cols-4">
                    {["Identity", "Access", "Review", "Complete"].map((label, index) => (
                      <div key={label} className={cn("rounded-2xl border p-4", index <= staffStep ? "border-primary/40 bg-primary/10" : "bg-muted/20")}>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Step {index + 1}</p>
                        <p className="mt-1 font-bold">{label}</p>
                      </div>
                    ))}
                  </div>
                  {formError ? <div className="mt-4 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">{formError}</div> : null}
                  {staffStep === 0 ? (
                    <div className="mt-6 space-y-5 rounded-3xl border bg-muted/10 p-5">
                      <div className="flex items-center gap-2"><UserPlus className="size-5 text-primary" /><h2 className="text-lg font-bold">Staff Identity</h2></div>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2"><Label htmlFor="name">Full name</Label><Input id="name" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} required /></div>
                        <div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email" type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} required /></div>
                        <PhoneNumberField label="Phone" value={form.phone} onChange={(value) => setForm((current) => ({ ...current, phone: value }))} />
                        <div className="rounded-2xl border bg-background/80 p-4 text-sm text-muted-foreground">Phone numbers use the shared phone library and follow the current light/dark theme.</div>
                      </div>
                    </div>
                  ) : null}
                  {staffStep === 1 ? (
                    <div className="mt-6 space-y-5 rounded-3xl border bg-muted/10 p-5">
                      <div className="flex items-center gap-2"><ShieldCheck className="size-5 text-primary" /><h2 className="text-lg font-bold">Role & Employment</h2></div>
                      <div className="grid gap-3 md:grid-cols-2">
                        {roleOptions.map((role) => (
                          <button key={role.id} type="button" onClick={() => setForm((current) => ({ ...current, roleId: role.id, position: current.position || role.name }))} className={cn("rounded-2xl border p-4 text-left transition-colors", form.roleId === role.id ? "border-primary bg-primary/10" : "bg-background/80 hover:bg-muted/40")}>
                            <p className="font-bold">{role.name}</p>
                            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{role.description}</p>
                          </button>
                        ))}
                      </div>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2"><Label>Department</Label><Select value={form.departmentId || ""} onValueChange={(value) => setForm((current) => ({ ...current, departmentId: value }))}><SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger><SelectContent>{departmentOptions.map((department) => <SelectItem key={department.id} value={department.id}>{department.name}</SelectItem>)}</SelectContent></Select></div>
                        <div className="space-y-2"><Label htmlFor="position">Position / title</Label><Input id="position" value={form.position} onChange={(event) => setForm((current) => ({ ...current, position: event.target.value }))} placeholder="Teacher, Bursar, Principal..." /></div>
                        <div className="space-y-2"><Label htmlFor="hireDate">Hire date</Label><Input id="hireDate" type="date" value={form.hireDate} onChange={(event) => setForm((current) => ({ ...current, hireDate: event.target.value }))} /></div>
                        <div className="space-y-2">
                          <Label htmlFor="salary">Salary / compensation</Label>
                          <div className="flex overflow-hidden rounded-2xl border border-input bg-background focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50">
                            <span className="flex min-w-16 items-center justify-center border-r bg-muted px-3 text-sm font-semibold text-muted-foreground">{salaryCurrency}</span>
                            <Input
                              id="salary"
                              inputMode="decimal"
                              value={form.salary}
                              onChange={(event) => setForm((current) => ({ ...current, salary: normalizeAmountInput(event.target.value) }))}
                              placeholder="0.00"
                              className="border-0 bg-transparent shadow-none focus-visible:ring-0"
                            />
                          </div>
                          <p className="text-xs text-muted-foreground">{salaryPreview ? `Formatted: ${salaryPreview}` : `Uses configured tenant currency: ${salaryCurrency}`}</p>
                        </div>
                        <div className="space-y-2">
                          <Label>Compensation period</Label>
                          <Select value={form.salaryPeriod} onValueChange={(value) => setForm((current) => ({ ...current, salaryPeriod: value }))}>
                            <SelectTrigger className="rounded-2xl bg-background"><SelectValue placeholder="Select period" /></SelectTrigger>
                            <SelectContent>
                              {salaryPeriodOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-muted-foreground">Defines how the amount is interpreted for payroll and contracts.</p>
                        </div>
                      </div>
                      <div className="rounded-2xl border bg-background/80 p-4">
                        <p className="text-sm font-bold">Employee ID</p>
                        <p className="mt-1 text-xs text-muted-foreground">Auto-generated on registration unless manually overridden.</p>
                        <p className="mt-3 font-mono text-lg font-bold">{manualEmployeeId ? form.employeeId || "Manual ID required" : previewEmployeeId(data.school.slug, data.summary.total)}</p>
                        <Button type="button" variant="link" className="mt-2 h-auto p-0 text-primary" onClick={() => { setManualEmployeeId((current) => !current); setForm((current) => ({ ...current, employeeId: "" })); }}>{manualEmployeeId ? "Use automatic ID instead" : "Override manually"}</Button>
                        {manualEmployeeId ? <Input className="mt-3 font-mono uppercase" value={form.employeeId} onChange={(event) => setForm((current) => ({ ...current, employeeId: event.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 40) }))} placeholder="Manual employee ID" /> : null}
                      </div>
                    </div>
                  ) : null}
                  {staffStep === 2 ? (
                    <div className="mt-6 space-y-5 rounded-3xl border bg-muted/10 p-5">
                      <div className="flex items-center gap-2"><UserCog className="size-5 text-primary" /><h2 className="text-lg font-bold">Review Registration</h2></div>
                      <div className="grid gap-3 md:grid-cols-2">
                        {Object.entries({ "Full name": form.name, Email: form.email, Phone: form.phone || "Not provided", Role: roleOptions.find((role) => role.id === form.roleId)?.name || form.roleId, Department: departmentOptions.find((department) => department.id === form.departmentId)?.name || "Not selected", "Job title": form.position, "Salary / compensation": salaryPreview ? `${salaryPreview} · ${salaryPeriodLabel(form.salaryPeriod)}` : "Not provided", "Employee ID": manualEmployeeId ? form.employeeId : `Auto-generate (${previewEmployeeId(data.school.slug, data.summary.total)})`, "Hire date": formatDate(form.hireDate) }).map(([label, value]) => (
                          <div key={label} className="rounded-2xl border bg-background/80 p-4"><p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</p><p className="mt-1 text-sm font-semibold">{value}</p></div>
                        ))}
                      </div>
                      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-800 dark:text-amber-200">A temporary password will be generated. The staff member must set a permanent password before entering their assigned dashboard.</div>
                    </div>
                  ) : null}
                  {staffStep === 3 && accessResult ? (
                    <div className="mt-5 rounded-3xl border border-emerald-500/30 bg-emerald-500/10 p-5">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge className="rounded-full bg-emerald-600 text-white">Access ready</Badge>
                            <Badge variant="outline" className="rounded-full">{accessResult.user.role}</Badge>
                          </div>
                          <p className="mt-3 text-lg font-bold">Temporary credentials generated for {accessResult.user.name}</p>
                          <div className="mt-4 grid gap-3 rounded-2xl border bg-background/80 p-4 text-sm md:grid-cols-2">
                            <div>
                              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Login URL</p>
                              <p className="mt-1 break-all font-medium">{accessResult.loginUrl}</p>
                            </div>
                            <div>
                              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Email</p>
                              <p className="mt-1 break-all font-medium">{accessResult.user.email}</p>
                            </div>
                            <div>
                              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Temporary Password</p>
                              <p className="mt-1 font-mono text-base font-bold">{accessResult.temporaryPassword}</p>
                            </div>
                            <div>
                              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Employee ID</p>
                              <p className="mt-1 font-mono text-base font-bold">{accessResult.employeeId}</p>
                            </div>
                            <div>
                              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Delivery</p>
                              <p className="mt-1 font-medium">
                                Email: {accessResult.delivery.email?.status || "not sent"} · SMS: {accessResult.delivery.sms?.status || "not sent"}
                              </p>
                            </div>
                          </div>
                          <p className="mt-3 text-sm text-muted-foreground">The user must complete the access page and set a permanent password before entering the dashboard.</p>
                        </div>
                        <Button type="button" variant="outline" onClick={copyAccess} className="rounded-full">
                          <Copy className="size-4" />
                          Copy access
                        </Button>
                      </div>
                    </div>
                  ) : null}
                  <DialogFooter className="mt-6">
                    <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>{staffStep === 3 ? "Close" : "Cancel"}</Button>
                    {staffStep > 0 && staffStep < 3 ? <Button type="button" variant="outline" onClick={() => setStaffStep((current) => Math.max(0, current - 1))}>Back</Button> : null}
                    {staffStep < 2 ? <Button type="button" onClick={goNextStep}>Continue</Button> : null}
                    {staffStep === 2 ? <Button type="submit" disabled={saving}>
                      {saving ? <RefreshCw className="size-4 animate-spin" /> : <KeyRound className="size-4" />}
                      Create access
                    </Button> : null}
                    {staffStep === 3 ? <Button type="button" onClick={resetStaffForm}>Create another</Button> : null}
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Total staff</CardTitle></CardHeader><CardContent><p className="text-3xl font-semibold">{data.summary.total}</p><p className="mt-2 text-xs text-muted-foreground">{data.summary.active} active accounts</p></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Departments</CardTitle></CardHeader><CardContent><p className="text-3xl font-semibold">{data.summary.departments}</p><p className="mt-2 text-xs text-muted-foreground">{data.summary.unassigned} unassigned users</p></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Inactive</CardTitle></CardHeader><CardContent><p className="text-3xl font-semibold">{data.summary.inactive}</p><p className="mt-2 text-xs text-muted-foreground">Accounts needing review</p></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Available roles</CardTitle></CardHeader><CardContent><p className="text-3xl font-semibold">{data.roles.length}</p><p className="mt-2 text-xs text-muted-foreground">For this education level</p></CardContent></Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Staff Directory</CardTitle>
          <CardDescription>Live tenant staff and leadership accounts. Use filters to audit roles, departments, and access state.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 lg:grid-cols-[1fr_220px_220px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9" placeholder="Search name, email, role, department, employee ID..." value={query} onChange={(event) => setQuery(event.target.value)} />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger><SelectValue placeholder="Filter role" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All roles</SelectItem>
                {roleOptions.map((role) => <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger><SelectValue placeholder="Filter department" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All departments</SelectItem>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {departmentOptions.map((department) => <SelectItem key={department.id} value={department.id}>{department.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {filteredStaff.length ? (
            <div className="grid gap-3">
              {filteredStaff.map((member) => (
                <div key={member.id} className="rounded-2xl border bg-muted/20 p-4 transition-colors hover:border-primary/40">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar className="size-11">
                        <AvatarImage src={member.image || undefined} />
                        <AvatarFallback>{initials(member.name)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate font-medium">{member.name}</p>
                          <Badge className={cn("rounded-full capitalize", statusClass(member.status))}>{member.status}</Badge>
                        </div>
                        <p className="truncate text-sm text-muted-foreground">{member.email}</p>
                      </div>
                    </div>
                    <div className="grid gap-3 text-sm md:grid-cols-4 lg:min-w-[680px]">
                      <div>
                        <p className="text-xs text-muted-foreground">Role</p>
                        <p className="font-medium">{member.roleName}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Department</p>
                        <p className="font-medium">{member.departmentName}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Position</p>
                        <p className="font-medium">{member.position || member.roleName}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Hire date</p>
                        <p className="font-medium">{formatDate(member.hireDate || member.createdAt)}</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => window.location.href = `mailto:${member.email}`}>
                      <Mail className="size-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed bg-muted/30 p-10 text-center">
              <UserCheck className="mx-auto mb-3 size-8 text-primary" />
              <p className="font-medium">No staff found</p>
              <p className="mt-1 text-sm text-muted-foreground">Adjust filters or create the first staff account for this tenant.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Role Coverage</CardTitle>
            <CardDescription>Allowed staff/admin roles for this tenant type.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {roleOptions.slice(0, 8).map((role) => (
              <div key={role.id} className="rounded-2xl border bg-muted/20 p-3">
                <p className="font-medium">{role.name}</p>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{role.description}</p>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Access Workflow</CardTitle>
            <CardDescription>Production-grade owner staff onboarding flow.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border bg-muted/20 p-4">
              <KeyRound className="mb-3 size-5 text-primary" />
              <p className="font-medium">Temporary password</p>
              <p className="mt-1 text-sm text-muted-foreground">Generated server-side and returned only after creation.</p>
            </div>
            <div className="rounded-2xl border bg-muted/20 p-4">
              <CheckCircle2 className="mb-3 size-5 text-primary" />
              <p className="font-medium">Forced completion</p>
              <p className="mt-1 text-sm text-muted-foreground">User must change password before entering their dashboard.</p>
            </div>
            <div className="rounded-2xl border bg-muted/20 p-4">
              <ArrowRight className="mb-3 size-5 text-primary" />
              <p className="font-medium">Correct portal</p>
              <p className="mt-1 text-sm text-muted-foreground">Login link is generated for the selected role and tenant slug.</p>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
