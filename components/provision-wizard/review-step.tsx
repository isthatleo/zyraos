"use client";

import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ProvisioningData } from "../provisioning-wizard";

interface ReviewStepProps {
  data: ProvisioningData;
}

interface Plan {
  id: string;
  name: string;
  description: string;
  price: number;
  currency?: string;
  period?: string;
  features: string[];
  maxStudents: number | null;
  maxStaff: number | null;
  isActive: boolean;
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
      <div className="mt-1 text-sm">{value}</div>
    </div>
  );
}

function money(amount: number, currency = "ZAR") {
  return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(Number(amount || 0));
}

export function ReviewStep({ data }: ReviewStepProps) {
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const enabledModules = data.modules.filter((module) => module.enabled);

  useEffect(() => {
    const fetchPlanDetails = async () => {
      if (!data.planId) return;
      try {
        const response = await fetch("/api/master/plans", { cache: "no-store" });
        if (!response.ok) return;
        const result = await response.json();
        const plan = result.plans.find((item: Plan) => item.id === data.planId);
        setSelectedPlan(plan || null);
      } catch (error) {
        console.error("Error fetching plan details:", error);
      }
    };

    void fetchPlanDetails();
  }, [data.planId]);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="mb-2 text-lg font-medium">Review & Confirm</h3>
        <p className="text-muted-foreground">Please review all information before provisioning the school.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">School Information</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Detail label="School Name" value={data.schoolInfo.name} />
            <Detail label="Type" value={<span className="capitalize">{data.schoolInfo.type.replace(/_/g, " ")}</span>} />
            <Detail label="Location" value={`${data.schoolInfo.city || "Not provided"}, ${data.schoolInfo.country}`} />
            <Detail label="Domain" value={`${data.schoolInfo.subdomain}.roxan.com`} />
            {data.schoolInfo.contactEmail ? <Detail label="Contact Email" value={data.schoolInfo.contactEmail} /> : null}
            {data.schoolInfo.phone ? <Detail label="Phone" value={data.schoolInfo.phone} /> : null}
            {data.schoolInfo.currencyCode ? <Detail label="Currency" value={`${data.schoolInfo.currencyCode} - ${data.schoolInfo.currencyName}`} /> : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Owner Administrator</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Detail label="Name" value={`${data.adminUser.firstName} ${data.adminUser.lastName}`} />
            <Detail label="Email" value={data.adminUser.email} />
            <Detail label="Role" value={<Badge variant="secondary">School Owner</Badge>} />
            {data.adminUser.phone ? <Detail label="Phone" value={data.adminUser.phone} /> : null}
            <Detail label="Temporary Password" value={<span className="font-mono">Generated and ready for secure handoff</span>} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Subscription Plan</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Detail label="Plan" value={selectedPlan ? selectedPlan.name : "Loading..."} />
            <Detail label="Price" value={selectedPlan ? `${money(selectedPlan.price, selectedPlan.currency)}/${selectedPlan.period || "month"}` : "Loading..."} />
            <Detail
              label="Limits"
              value={selectedPlan ? `Max ${selectedPlan.maxStudents || "Unlimited"} students, ${selectedPlan.maxStaff || "Unlimited"} staff` : "Loading..."}
            />
            <Detail label="Billing" value={selectedPlan?.period || "Monthly"} />
            <Detail label="Status" value={<Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">Active</Badge>} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Enabled Modules</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {enabledModules.map((module) => (
                <Badge key={module.key} variant="outline" className="text-xs">{module.name}</Badge>
              ))}
            </div>
            {enabledModules.length === 0 ? <p className="text-sm text-muted-foreground">No modules enabled</p> : null}
          </CardContent>
        </Card>
      </div>

      <Separator />

      <Card className="bg-muted/30">
        <CardContent className="pt-6">
          <div className="text-center">
            <h4 className="mb-2 text-lg font-medium">Ready to Provision</h4>
            <p className="mb-4 text-muted-foreground">Clicking "Provision School" will:</p>
            <ul className="mx-auto max-w-md space-y-1 text-left text-sm text-muted-foreground">
              <li>Create the school tenant in the database</li>
              <li>Set up the owner administrator account</li>
              <li>Configure the selected subscription plan</li>
              <li>Generate a pending invoice for the subscription</li>
              <li>Enable the selected modules</li>
              <li>Initialize education-level roles and permissions</li>
              <li>Return secure login credentials for handoff</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
        <h4 className="text-sm font-medium">Important Notice</h4>
        <p className="mt-1 text-sm text-muted-foreground">
          This action creates a live tenant and owner account. Confirm all information before provisioning.
        </p>
      </div>
    </div>
  );
}
