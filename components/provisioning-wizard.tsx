"use client";

import { useState } from "react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, ArrowRight, Check, Circle, LockKeyhole, School, Settings2, ShieldCheck, WalletCards } from "lucide-react";
import { SchoolInfoStep } from "./provision-wizard/school-info-step";
import { AdminSetupStep } from "./provision-wizard/admin-setup-step";
import { PlanSelectionStep } from "./provision-wizard/plan-selection-step";
import { ModulesStep } from "./provision-wizard/modules-step";
import { ReviewStep } from "./provision-wizard/review-step";

export interface ProvisioningData {
    schoolInfo: {
      name: string;
      type: string;
      country: string;
      city: string;
      contactEmail: string;
      phone: string;
      address: string;
      subdomain: string;
      currencyCode?: string;
      currencyName?: string;
      countryCode?: string;
    };
  adminUser: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    password?: string;
    confirmPassword?: string;
  };
  planId: string;
  modules: Array<{
    key: string;
    name: string;
    enabled: boolean;
  }>;
}

interface ProvisioningWizardProps {
  onComplete: (data: ProvisioningData) => void;
  onCancel: () => void;
}

const STEPS = [
  { id: 1, title: "School Information", description: "Identity, location, contact details, and tenant URL", icon: School },
  { id: 2, title: "Admin Setup", description: "Owner identity and secure post-provision temporary password handoff", icon: LockKeyhole },
  { id: 3, title: "Subscription Plan", description: "Billing plan and tenant subscription limits", icon: WalletCards },
  { id: 4, title: "Modules & Access", description: "Core and optional modules enabled at launch", icon: Settings2 },
  { id: 5, title: "Review & Provision", description: "Final checks before creating the tenant", icon: ShieldCheck },
];

export function ProvisioningWizard({ onComplete, onCancel }: ProvisioningWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const wizardTopRef = React.useRef<HTMLDivElement | null>(null);
  const [data, setData] = useState<ProvisioningData>({
    schoolInfo: {
      name: "",
      type: "",
      country: "",
      city: "",
      contactEmail: "",
      phone: "",
      address: "",
      subdomain: "",
    },
    adminUser: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
    },
    planId: "",
    modules: [
      { key: "student_portal", name: "Student Portal", enabled: true },
      { key: "parent_portal", name: "Parent Portal", enabled: true },
      { key: "administrator_portal", name: "Administrator Portal", enabled: true },
      { key: "hr_portal", name: "HR Staff Portal", enabled: false },
      { key: "finance_portal", name: "Finance Portal", enabled: false },
      { key: "library_portal", name: "Library Portal", enabled: false },
      { key: "canteen_portal", name: "Canteen Portal", enabled: false },
      { key: "transport_portal", name: "Transport Portal", enabled: false },
      { key: "hostel_portal", name: "Hostel Portal", enabled: false },
      { key: "health_portal", name: "Health Portal", enabled: false },
    ],
  });

  const progress = (currentStep / STEPS.length) * 100;

  React.useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      wizardTopRef.current?.scrollIntoView({ block: "start", behavior: "auto" });
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [currentStep]);

  const updateData = (stepData: Partial<ProvisioningData>) => {
    setData(prev => ({ ...prev, ...stepData }));
  };

  const nextStep = () => {
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    onComplete(data);
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <SchoolInfoStep data={data.schoolInfo} onUpdate={(schoolInfo) => updateData({ schoolInfo })} />;
      case 2:
        return <AdminSetupStep data={data.adminUser} onUpdate={(adminUser) => updateData({ adminUser })} />;
      case 3:
        return <PlanSelectionStep selectedPlanId={data.planId} onUpdate={(planId) => updateData({ planId })} />;
      case 4:
        return <ModulesStep modules={data.modules} onUpdate={(modules) => updateData({ modules })} />;
      case 5:
        return <ReviewStep data={data} />;
      default:
        return null;
    }
  };

  const isStepComplete = (step: number): boolean => {
    switch (step) {
      case 1:
        return Boolean(data.schoolInfo.name && data.schoolInfo.subdomain && data.schoolInfo.country && data.schoolInfo.type && data.schoolInfo.phone);
      case 2:
        return Boolean(
          data.adminUser.firstName &&
          data.adminUser.lastName &&
          /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.adminUser.email)
        );
      case 3:
        return Boolean(data.planId);
      case 4:
        return data.modules.some(m => m.enabled);
      case 5:
        return [1, 2, 3, 4].every((stepId) => isStepComplete(stepId));
      default:
        return false;
    }
  };

  const canProceed = () => isStepComplete(currentStep);

  return (
    <div ref={wizardTopRef} className="mx-auto max-w-6xl scroll-mt-24 p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Provision New School</h1>
        <p className="text-muted-foreground">Set up a new school tenant in the Roxan ecosystem</p>
      </div>

      <div className="mb-8 grid gap-3 md:grid-cols-5">
        {STEPS.map((step) => {
          const complete = isStepComplete(step.id);
          const active = step.id === currentStep;
          const Icon = step.icon;
          return (
            <button
              key={step.id}
              type="button"
              onClick={() => setCurrentStep(step.id)}
              className={`rounded-2xl border p-4 text-left transition-all ${
                active
                  ? "border-primary bg-primary/10 shadow-sm"
                  : complete
                    ? "border-emerald-500/30 bg-emerald-500/10"
                    : "border-border bg-card hover:bg-muted/40"
              }`}
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <span className={`flex size-9 items-center justify-center rounded-xl ${complete ? "bg-emerald-500 text-white" : active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                  {complete ? <Check className="size-4" /> : <Icon className="size-4" />}
                </span>
                {complete ? <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-300">Complete</span> : <Circle className="size-3 text-muted-foreground" />}
              </div>
              <p className="text-sm font-semibold">{step.title}</p>
              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{step.description}</p>
            </button>
          );
        })}
      </div>

      <Card className="mb-8 bg-card/85 backdrop-blur">
        <CardContent className="pt-6">
          <Progress value={progress} className="mb-2" />
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>{STEPS[currentStep - 1].title}</span>
            <span>Step {currentStep} of {STEPS.length}</span>
          </div>
        </CardContent>
      </Card>

      {/* Step Content */}
      <Card className="mb-8 bg-card/85 backdrop-blur">
        <CardHeader>
          <CardTitle>{STEPS[currentStep - 1].title}</CardTitle>
          <CardDescription>{STEPS[currentStep - 1].description}</CardDescription>
        </CardHeader>
        <CardContent>
          {renderStep()}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={currentStep === 1 ? onCancel : prevStep}
          disabled={false}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {currentStep === 1 ? "Cancel" : "Previous"}
        </Button>

        <Button
          onClick={currentStep === STEPS.length ? handleComplete : nextStep}
          disabled={!canProceed()}
          className="bg-orange-600 hover:bg-orange-700"
        >
          {currentStep === STEPS.length ? "Provision School" : "Next"}
          {currentStep !== STEPS.length && <ArrowRight className="w-4 h-4 ml-2" />}
        </Button>
      </div>
    </div>
  );
}
