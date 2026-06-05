"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle, Copy, Database, FileText, Loader2, MailCheck, School, ShieldCheck, UserRoundPlus, WalletCards } from "lucide-react";

import { ProvisioningData, ProvisioningWizard } from "@/components/provisioning-wizard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const provisioningSteps = [
  { key: "school", title: "Creating school tenant", detail: "Saving school identity, slug, region, and localized defaults.", icon: School },
  { key: "database", title: "Preparing tenant database", detail: "Assigning database mode, connection, and tenant isolation metadata.", icon: Database },
  { key: "roles", title: "Seeding roles and modules", detail: "Creating education-level roles and enabling selected dashboard modules.", icon: ShieldCheck },
  { key: "owner", title: "Creating owner account", detail: "Generating temporary password, hashing credentials, and forcing first-login reset.", icon: UserRoundPlus },
  { key: "billing", title: "Creating subscription and invoice", detail: "Activating plan, setting renewal dates, and creating onboarding invoice.", icon: WalletCards },
  { key: "handoff", title: "Delivering access handoff", detail: "Preparing login links, delivery status, and secure credential handoff.", icon: MailCheck },
] as const;

export default function ProvisionSchoolPage() {
  const router = useRouter();
  const [isProvisioning, setIsProvisioning] = useState(false);
  const [activeProvisionStep, setActiveProvisionStep] = useState(0);
  const [provisionResult, setProvisionResult] = useState<{
    success: boolean;
    school?: any;
    adminUser?: any;
    portalUrl?: string;
    tenantLoginUrl?: string;
    slug?: string;
    database?: {
      mode?: string;
      provider?: string;
      isolated?: boolean;
      branchId?: string;
      message?: string;
    };
    delivery?: {
      ok?: boolean;
      results?: Array<{ channel: string; ok: boolean; status: string; message: string; provider?: string }>;
    };
    temporaryPassword?: string;
    error?: string;
  } | null>(null);

  const handleProvision = async (data: ProvisioningData) => {
    setIsProvisioning(true);
    setActiveProvisionStep(0);
    const progressTimer = window.setInterval(() => {
      setActiveProvisionStep((step) => Math.min(step + 1, provisioningSteps.length - 2));
    }, 1100);
    try {
      const response = await fetch("/api/master/schools/provision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (response.ok) {
        setActiveProvisionStep(provisioningSteps.length);
        setProvisionResult({
          success: true,
          school: result.school,
          adminUser: result.adminUser,
          portalUrl: result.portalUrl,
          tenantLoginUrl: result.tenantLoginUrl,
          slug: result.slug || result.school?.slug,
          database: result.database,
          delivery: result.delivery,
          temporaryPassword: result.temporaryPassword,
        });
      } else {
        setActiveProvisionStep(0);
        setProvisionResult({
          success: false,
          error: result.error || "Failed to provision school",
        });
      }
    } catch (error) {
      console.error("Provisioning error:", error);
      setActiveProvisionStep(0);
      setProvisionResult({
        success: false,
        error: "Network error occurred during provisioning",
      });
    } finally {
      window.clearInterval(progressTimer);
      setIsProvisioning(false);
    }
  };

  const copyCredentials = async () => {
    if (!provisionResult?.success) return;
    await navigator.clipboard.writeText([
      `School Portal: ${provisionResult.portalUrl}`,
      `Role Selection: ${provisionResult.tenantLoginUrl || provisionResult.portalUrl}`,
      `Tenant Slug: ${provisionResult.slug || provisionResult.school?.slug || ""}`,
      `Administrator Email: ${provisionResult.adminUser?.email}`,
      `Administrator Name: ${provisionResult.adminUser?.name}`,
      `Temporary Password: ${provisionResult.temporaryPassword}`,
      "The owner should change this temporary password after first login.",
    ].join("\n")).catch(() => null);
  };

  if (provisionResult) {
    return (
      <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center p-4">
        <Card className="w-full max-w-2xl bg-card/90 backdrop-blur">
          <CardContent className="p-8">
            {provisionResult.success ? (
              <div className="space-y-6 text-center">
                <div className="flex justify-center">
                  <CheckCircle className="h-16 w-16 text-emerald-500" />
                </div>
                <div>
                  <h2 className="mb-2 text-2xl font-bold">School Provisioned Successfully</h2>
                  <p className="text-muted-foreground">
                    {provisionResult.school?.name} has been provisioned and is ready for owner access.
                  </p>
                </div>

                <div className="rounded-2xl border bg-muted/30 p-6 text-left">
                  <h3 className="mb-4 text-lg font-medium">Access Information</h3>
                  <div className="space-y-3">
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Admin Portal</span>
                      <p className="break-all font-mono text-sm">{provisionResult.portalUrl}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Role Selection Portal</span>
                      <p className="break-all font-mono text-sm">{provisionResult.tenantLoginUrl || provisionResult.portalUrl}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Tenant Slug</span>
                      <p className="font-mono text-sm">{provisionResult.slug || provisionResult.school?.slug}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Administrator Email</span>
                      <p className="text-sm">{provisionResult.adminUser?.email}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Administrator Name</span>
                      <p className="text-sm">{provisionResult.adminUser?.name}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Temporary Password</span>
                      <p className="font-mono text-sm">{provisionResult.temporaryPassword}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Tenant Database</span>
                      <p className="text-sm">
                        {provisionResult.database?.isolated ? "Isolated" : "Shared"} {provisionResult.database?.provider ? `(${provisionResult.database.provider})` : ""}
                        {provisionResult.database?.mode ? ` - ${provisionResult.database.mode}` : ""}
                      </p>
                      {provisionResult.database?.branchId ? <p className="font-mono text-xs text-muted-foreground">{provisionResult.database.branchId}</p> : null}
                    </div>
                  </div>
                </div>

                {provisionResult.delivery?.results?.length ? (
                  <div className="rounded-2xl border bg-muted/30 p-5 text-left">
                    <h3 className="mb-3 text-base font-medium">Delivery Status</h3>
                    <div className="space-y-2">
                      {provisionResult.delivery.results.map((item, index) => (
                        <div key={`${item.channel}-${index}`} className="flex items-start justify-between gap-4 rounded-xl border bg-background/70 p-3">
                          <div>
                            <p className="text-sm font-medium capitalize">{item.channel}{item.provider ? ` / ${item.provider}` : ""}</p>
                            <p className="text-xs text-muted-foreground">{item.message}</p>
                          </div>
                          <span className={item.ok ? "text-xs font-semibold text-emerald-600" : "text-xs font-semibold text-amber-600"}>
                            {item.ok ? "Sent" : item.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="rounded-2xl border border-primary/20 bg-primary/10 p-4 text-left">
                  <div className="flex gap-3">
                    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                    <div>
                      <h4 className="text-sm font-medium">Next Steps</h4>
                      <ul className="mt-1 space-y-1 text-sm text-muted-foreground">
                        <li>Share credentials securely with the school owner.</li>
                        <li>The owner should change the temporary password after first login.</li>
                        <li>Configure branding, academic settings, finance, and communication providers.</li>
                        <li>Create additional users and education-level roles from the tenant dashboard.</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap justify-center gap-3">
                  <Button onClick={() => router.push("/master/schools")} variant="outline">Back to Schools</Button>
                  <Button onClick={copyCredentials} variant="outline">
                    <Copy className="size-4" />
                    Copy Credentials
                  </Button>
                  <Button onClick={() => window.open(provisionResult.portalUrl, "_blank")}>Open Admin Portal</Button>
                </div>
              </div>
            ) : (
              <div className="space-y-6 text-center">
                <div className="flex justify-center">
                  <AlertCircle className="h-16 w-16 text-destructive" />
                </div>
                <div>
                  <h2 className="mb-2 text-2xl font-bold">Provisioning Failed</h2>
                  <p className="text-muted-foreground">{provisionResult.error}</p>
                </div>
                <div className="flex justify-center gap-4">
                  <Button onClick={() => setProvisionResult(null)} variant="outline">Try Again</Button>
                  <Button onClick={() => router.push("/master/schools")}>Back to Schools</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isProvisioning) {
    return (
      <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center p-4">
        <Card className="w-full max-w-4xl overflow-hidden bg-card/90 shadow-xl backdrop-blur">
          <CardContent className="p-0">
            <div className="border-b bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.18),transparent_30%),linear-gradient(135deg,hsl(var(--card)),hsl(var(--muted)/0.5))] p-8">
              <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">Provisioning in progress</p>
                  <h2 className="mt-3 text-2xl font-bold tracking-tight">Building the school workspace</h2>
                  <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                    Please keep this page open. Roxan is creating the tenant, owner access, modules, subscription, invoice, and handoff links.
                  </p>
                </div>
                <div className="flex size-16 items-center justify-center rounded-3xl bg-primary text-primary-foreground shadow-lg">
                  <Loader2 className="size-7 animate-spin" />
                </div>
              </div>
            </div>
            <div className="grid gap-3 p-6 md:grid-cols-2">
              {provisioningSteps.map((step, index) => {
                const Icon = step.icon;
                const complete = index < activeProvisionStep;
                const active = index === activeProvisionStep;
                return (
                  <div
                    key={step.key}
                    className={`rounded-2xl border p-4 transition-all ${
                      complete
                        ? "border-emerald-500/30 bg-emerald-500/10"
                        : active
                          ? "border-primary/50 bg-primary/10 shadow-sm"
                          : "bg-background/60"
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <span className={`flex size-11 shrink-0 items-center justify-center rounded-2xl ${
                        complete ? "bg-emerald-500 text-white" : active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                      }`}>
                        {complete ? <CheckCircle className="size-5" /> : active ? <Loader2 className="size-5 animate-spin" /> : <Icon className="size-5" />}
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold">{step.title}</p>
                          {complete ? <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-300">Complete</span> : null}
                          {active ? <span className="text-xs font-semibold text-primary">Running</span> : null}
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">{step.detail}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="border-t px-6 py-4 text-sm text-muted-foreground">
              <FileText className="mr-2 inline size-4" />
              Final success screen will show the exact admin portal, tenant slug, temporary password, database status, and delivery result.
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <ProvisioningWizard
      onComplete={handleProvision}
      onCancel={() => router.push("/master/schools")}
    />
  );
}
