/**
 * School Provisioning Wizard
 * Path: src/app/(master)/schools/provision/page.tsx
 */

'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CheckCircle, Loader2 } from 'lucide-react';

type Step = 1 | 2 | 3 | 4;

interface ProvisioningStep {
  name: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  description: string;
}

export default function ProvisioningWizard() {
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [isProvisioning, setIsProvisioning] = useState(false);

  const [formData, setFormData] = useState({
    // Step 1: Plan Selection
    plan: '',

    // Step 2: School Information
    schoolName: '',
    urlSlug: '',
    country: '',
    schoolType: '',
    address: '',

    // Step 3: Admin Setup
    adminFullName: '',
    adminEmail: '',
    adminPhone: '',
  });

  const [provisioningSteps, setProvisioningSteps] = useState<ProvisioningStep[]>([
    { name: 'Creating isolated database', status: 'pending', description: 'Setting up PostgreSQL instance' },
    { name: 'Deploying school schema', status: 'pending', description: 'Creating database tables and relationships' },
    { name: 'Configuring authentication', status: 'pending', description: 'Setting up auth credentials' },
    { name: 'Seeding default data', status: 'pending', description: 'Initializing default roles and settings' },
    { name: 'Setting up subscription', status: 'pending', description: 'Activating billing for the school' },
    { name: 'Sending onboarding email', status: 'pending', description: 'Notifying admin of setup completion' },
  ]);

  const plans = [
    {
      name: '14-Day Trial',
      price: 'Free',
      maxStudents: 50,
      maxStaff: 10,
      features: ['Basic features', 'Limited support', 'Community access'],
    },
    {
      name: 'Basic',
      price: 'GHS 299/month',
      maxStudents: 200,
      maxStaff: 20,
      features: ['Core features', 'Email support', 'Basic analytics'],
    },
    {
      name: 'Standard',
      price: 'GHS 599/month',
      maxStudents: 500,
      maxStaff: 50,
      features: ['All features', 'Priority support', 'Advanced analytics'],
    },
    {
      name: 'Premium',
      price: 'GHS 1,299/month',
      maxStudents: 1000,
      maxStaff: 100,
      features: ['Everything', '24/7 support', 'Custom integrations'],
    },
  ];

  const handleInputChange = (e: any) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Auto-generate URL slug
    if (name === 'schoolName') {
      const slug = value
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w-]/g, '');
      setFormData((prev) => ({
        ...prev,
        urlSlug: slug,
      }));
    }
  };

  const handleNextStep = () => {
    if (currentStep < 3) {
      setCurrentStep((currentStep + 1) as Step);
    }
  };

  const handlePreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep((currentStep - 1) as Step);
    }
  };

  const handleProvision = async () => {
    setIsProvisioning(true);
    setCurrentStep(4);

    // Simulate provisioning steps
    for (let i = 0; i < provisioningSteps.length; i++) {
      setProvisioningSteps((prev) =>
        prev.map((step, idx) => {
          if (idx === i) return { ...step, status: 'processing' };
          if (idx < i) return { ...step, status: 'completed' };
          return step;
        })
      );

      // Simulate processing time
      await new Promise((resolve) => setTimeout(resolve, 2000));

      setProvisioningSteps((prev) =>
        prev.map((step, idx) => {
          if (idx === i) return { ...step, status: 'completed' };
          return step;
        })
      );
    }

    setIsProvisioning(false);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Provision New School</h1>
        <p className="text-slate-400">Complete multi-step setup process</p>
      </div>

      {/* Steps Indicator */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6 backdrop-blur">
        <div className="flex items-center justify-between">
          {[
            { step: 1, name: 'Select Plan' },
            { step: 2, name: 'School Info' },
            { step: 3, name: 'Admin Setup' },
            { step: 4, name: 'Provisioning' },
          ].map((item, index) => (
            <div key={item.step} className="flex items-center">
              <button
                onClick={() => item.step <= currentStep && setCurrentStep(item.step as Step)}
                className={`flex items-center justify-center w-12 h-12 rounded-full font-bold transition-all ${
                  currentStep === item.step
                    ? 'bg-blue-600 text-white'
                    : currentStep > item.step
                    ? 'bg-green-600 text-white'
                    : 'bg-slate-700 text-slate-400'
                }`}
              >
                {currentStep > item.step ? <CheckCircle className="h-6 w-6" /> : item.step}
              </button>
              <div className="ml-3">
                <p className="text-sm font-semibold text-white">{item.name}</p>
              </div>
              {index < 3 && (
                <div className={`w-12 h-0.5 mx-6 ${currentStep > item.step ? 'bg-green-600' : 'bg-slate-700'}`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Form Content */}
      <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-white">
            {currentStep === 1 && 'Select Subscription Plan'}
            {currentStep === 2 && 'School Information'}
            {currentStep === 3 && 'Admin Setup'}
            {currentStep === 4 && 'Provisioning School'}
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Step 1: Plan Selection */}
          {currentStep === 1 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {plans.map((plan) => (
                <button
                  key={plan.name}
                  onClick={() => setFormData({ ...formData, plan: plan.name })}
                  className={`p-6 rounded-lg border-2 transition-all text-left ${
                    formData.plan === plan.name
                      ? 'border-blue-600 bg-blue-900/20'
                      : 'border-slate-600 bg-slate-700/30 hover:border-slate-500'
                  }`}
                >
                  <h3 className="text-lg font-bold text-white mb-2">{plan.name}</h3>
                  <p className="text-sm font-semibold text-blue-400 mb-3">{plan.price}</p>
                  <div className="text-xs text-slate-300 space-y-1 mb-3">
                    <p>Students: {plan.maxStudents}</p>
                    <p>Staff: {plan.maxStaff}</p>
                  </div>
                  <ul className="text-xs text-slate-400 space-y-1">
                    {plan.features.map((feature) => (
                      <li key={feature}>✓ {feature}</li>
                    ))}
                  </ul>
                </button>
              ))}
            </div>
          )}

          {/* Step 2: School Information */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-300 mb-2">School Name *</label>
                <Input
                  name="schoolName"
                  value={formData.schoolName}
                  onChange={handleInputChange}
                  placeholder="e.g., Academy School"
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-300 mb-2">URL Slug (auto-generated) *</label>
                <Input
                  name="urlSlug"
                  value={formData.urlSlug}
                  readOnly
                  placeholder="academy-school"
                  className="bg-slate-700 border-slate-600 text-white"
                />
                <p className="text-xs text-slate-400 mt-1">URL: academy-school.zyraai.com</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-300 mb-2">Country *</label>
                  <Input
                    name="country"
                    value={formData.country}
                    onChange={handleInputChange}
                    placeholder="Ghana"
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm text-slate-300 mb-2">School Type *</label>
                  <select
                    name="schoolType"
                    value={formData.schoolType}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                  >
                    <option value="">Select Type</option>
                    <option value="primary">Primary</option>
                    <option value="secondary">Secondary</option>
                    <option value="combined">Combined</option>
                    <option value="university">University</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm text-slate-300 mb-2">School Address *</label>
                <Input
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  placeholder="Street address"
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
            </div>
          )}

          {/* Step 3: Admin Setup */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-300 mb-2">Admin Full Name *</label>
                <Input
                  name="adminFullName"
                  value={formData.adminFullName}
                  onChange={handleInputChange}
                  placeholder="Full name"
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-300 mb-2">Admin Email *</label>
                <Input
                  type="email"
                  name="adminEmail"
                  value={formData.adminEmail}
                  onChange={handleInputChange}
                  placeholder="admin@school.com"
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-300 mb-2">Admin Phone *</label>
                <Input
                  name="adminPhone"
                  value={formData.adminPhone}
                  onChange={handleInputChange}
                  placeholder="+233501234567"
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>

              <div className="p-4 bg-blue-900/20 rounded-lg border border-blue-800/50">
                <p className="text-sm text-blue-300">
                  ℹ️ A temporary password will be generated and sent to the admin email. They can change it on first login.
                </p>
              </div>
            </div>
          )}

          {/* Step 4: Provisioning Progress */}
          {currentStep === 4 && (
            <div className="space-y-4">
              {provisioningSteps.map((step, index) => (
                <div key={index} className="p-4 bg-slate-700/30 rounded-lg border border-slate-600/30">
                  <div className="flex items-start gap-3">
                    <div className="mt-1">
                      {step.status === 'completed' && (
                        <CheckCircle className="h-5 w-5 text-green-400" />
                      )}
                      {step.status === 'processing' && (
                        <Loader2 className="h-5 w-5 text-blue-400 animate-spin" />
                      )}
                      {step.status === 'pending' && (
                        <div className="w-5 h-5 rounded-full border-2 border-slate-600" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-white">{step.name}</p>
                      <p className="text-xs text-slate-400">{step.description}</p>
                    </div>
                  </div>
                </div>
              ))}

              {!isProvisioning && (
                <div className="p-4 bg-green-900/20 rounded-lg border border-green-800/50 mt-4">
                  <p className="text-sm text-green-300">✓ School provisioned successfully!</p>
                  <p className="text-xs text-green-400 mt-2">An onboarding email has been sent to the admin.</p>
                </div>
              )}
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex gap-3 pt-6 border-t border-slate-700">
            <Button
              onClick={handlePreviousStep}
              disabled={currentStep === 1 || isProvisioning}
              className="flex-1 bg-slate-700 hover:bg-slate-600 text-white disabled:opacity-50"
            >
              Previous
            </Button>

            {currentStep < 3 ? (
              <Button
                onClick={handleNextStep}
                disabled={
                  (currentStep === 1 && !formData.plan) ||
                  (currentStep === 2 &&
                    (!formData.schoolName || !formData.country || !formData.schoolType || !formData.address))
                }
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
              >
                Next
              </Button>
            ) : currentStep === 3 ? (
              <Button
                onClick={handleProvision}
                disabled={
                  !formData.adminFullName ||
                  !formData.adminEmail ||
                  !formData.adminPhone ||
                  isProvisioning
                }
                className="flex-1 bg-green-600 hover:bg-green-700 text-white disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isProvisioning ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Provisioning...
                  </>
                ) : (
                  'Provision School'
                )}
              </Button>
            ) : (
              <Button className="flex-1 bg-slate-700 hover:bg-slate-600 text-white">
                Return to Dashboard
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

