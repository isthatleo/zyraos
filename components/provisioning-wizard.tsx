"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
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
  };
  adminUser: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    password: string;
    confirmPassword: string;
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
  { id: 1, title: "School Information", description: "Basic school details" },
  { id: 2, title: "Admin Setup", description: "Create administrator account" },
  { id: 3, title: "Subscription Plan", description: "Choose subscription plan" },
  { id: 4, title: "Modules & Access", description: "Select enabled modules" },
  { id: 5, title: "Review & Provision", description: "Confirm and provision" },
];

export function ProvisioningWizard({ onComplete, onCancel }: ProvisioningWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
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
      password: "",
      confirmPassword: "",
    },
    planId: "",
    modules: [
      { key: "student_portal", name: "Student Portal", enabled: true },
      { key: "parent_portal", name: "Parent Portal", enabled: true },
      { key: "administrator_portal", name: "Administrator Portal", enabled: true },
      { key: "hr_portal", name: "HR Staff Portal", enabled: false },
      { key: "finance_portal", name: "Finance Portal", enabled: false },
      { key: "library_portal", name: "Library Portal", enabled: false },
    ],
  });

  const progress = (currentStep / STEPS.length) * 100;

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

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return data.schoolInfo.name && data.schoolInfo.subdomain && data.schoolInfo.country && data.schoolInfo.type;
      case 2:
        return data.adminUser.firstName && data.adminUser.lastName && data.adminUser.email &&
               data.adminUser.password && data.adminUser.password === data.adminUser.confirmPassword;
      case 3:
        return data.planId;
      case 4:
        return data.modules.some(m => m.enabled);
      case 5:
        return true;
      default:
        return false;
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Provision New School</h1>
        <p className="text-gray-600">Set up a new school tenant in the Roxan ecosystem</p>
      </div>

      {/* Progress Indicator */}
      <Card className="mb-8">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            {STEPS.map((step) => (
              <div key={step.id} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step.id < currentStep
                    ? "bg-green-500 text-white"
                    : step.id === currentStep
                    ? "bg-orange-500 text-white"
                    : "bg-gray-200 text-gray-600"
                }`}>
                  {step.id < currentStep ? <Check className="w-4 h-4" /> : step.id}
                </div>
                {step.id < STEPS.length && (
                  <div className={`w-12 h-0.5 mx-2 ${
                    step.id < currentStep ? "bg-green-500" : "bg-gray-200"
                  }`} />
                )}
              </div>
            ))}
          </div>
          <Progress value={progress} className="mb-2" />
          <div className="flex justify-between text-sm text-gray-600">
            <span>{STEPS[currentStep - 1].title}</span>
            <span>Step {currentStep} of {STEPS.length}</span>
          </div>
        </CardContent>
      </Card>

      {/* Step Content */}
      <Card className="mb-8">
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
