"use client";

import { useState, useEffect } from "react";
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
  features: string[];
  maxStudents: number | null;
  maxStaff: number | null;
  isActive: boolean;
}

export function ReviewStep({ data }: ReviewStepProps) {
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const enabledModules = data.modules.filter(m => m.enabled);

  useEffect(() => {
    const fetchPlanDetails = async () => {
      if (data.planId) {
        try {
          const response = await fetch('/api/master/plans');
          if (response.ok) {
            const result = await response.json();
            const plan = result.plans.find((p: Plan) => p.id === data.planId);
            setSelectedPlan(plan || null);
          }
        } catch (error) {
          console.error('Error fetching plan details:', error);
        }
      }
    };

    fetchPlanDetails();
  }, [data.planId]);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Review & Confirm</h3>
        <p className="text-gray-600">
          Please review all the information before provisioning the school.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* School Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">School Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <span className="text-sm font-medium text-gray-500">School Name:</span>
              <p className="text-sm text-gray-900">{data.schoolInfo.name}</p>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-500">Type:</span>
              <p className="text-sm text-gray-900 capitalize">{data.schoolInfo.type}</p>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-500">Location:</span>
              <p className="text-sm text-gray-900">
                {data.schoolInfo.city}, {data.schoolInfo.country}
              </p>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-500">Domain:</span>
              <p className="text-sm text-gray-900">{data.schoolInfo.subdomain}.roxan.com</p>
            </div>
            {data.schoolInfo.contactEmail && (
              <div>
                <span className="text-sm font-medium text-gray-500">Contact Email:</span>
                <p className="text-sm text-gray-900">{data.schoolInfo.contactEmail}</p>
              </div>
            )}
            {data.schoolInfo.phone && (
              <div>
                <span className="text-sm font-medium text-gray-500">Phone:</span>
                <p className="text-sm text-gray-900">{data.schoolInfo.phone}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Administrator Account */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Administrator Account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <span className="text-sm font-medium text-gray-500">Name:</span>
              <p className="text-sm text-gray-900">
                {data.adminUser.firstName} {data.adminUser.lastName}
              </p>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-500">Email:</span>
              <p className="text-sm text-gray-900">{data.adminUser.email}</p>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-500">Role:</span>
              <Badge variant="secondary">System Administrator</Badge>
            </div>
            {data.adminUser.phone && (
              <div>
                <span className="text-sm font-medium text-gray-500">Phone:</span>
                <p className="text-sm text-gray-900">{data.adminUser.phone}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Subscription Plan */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Subscription Plan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <span className="text-sm font-medium text-gray-500">Plan:</span>
              <p className="text-sm text-gray-900">{selectedPlan ? selectedPlan.name : 'Loading...'}</p>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-500">Price:</span>
              <p className="text-sm text-gray-900">
                {selectedPlan ? `GH₵${selectedPlan.price.toLocaleString()}/month` : 'Loading...'}
              </p>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-500">Limits:</span>
              <p className="text-sm text-gray-900">
                {selectedPlan ?
                  `Max ${selectedPlan.maxStudents || 'Unlimited'} students, ${selectedPlan.maxStaff || 'Unlimited'} staff` :
                  'Loading...'
                }
              </p>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-500">Billing:</span>
              <p className="text-sm text-gray-900">Monthly</p>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-500">Status:</span>
              <Badge className="bg-green-100 text-green-800">Active</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Enabled Modules */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Enabled Modules</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {enabledModules.map((module) => (
                <Badge key={module.key} variant="outline" className="text-xs">
                  {module.name}
                </Badge>
              ))}
            </div>
            {enabledModules.length === 0 && (
              <p className="text-sm text-gray-500">No modules enabled</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Summary */}
      <Card className="bg-gray-50">
        <CardContent className="pt-6">
          <div className="text-center">
            <h4 className="text-lg font-medium text-gray-900 mb-2">Ready to Provision</h4>
            <p className="text-gray-600 mb-4">
              Clicking "Provision School" will:
            </p>
            <ul className="text-sm text-gray-600 space-y-1 text-left max-w-md mx-auto">
              <li>• Create the school tenant in the database</li>
              <li>• Set up the administrator account</li>
              <li>• Configure the selected subscription plan</li>
              <li>• Generate invoice for the subscription</li>
              <li>• Enable the selected modules</li>
              <li>• Initialize default roles and permissions</li>
              <li>• Send login credentials to the administrator</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h4 className="text-sm font-medium text-yellow-800">Important Notice</h4>
            <p className="text-sm text-yellow-700 mt-1">
              This action cannot be undone. The school will be immediately accessible to the administrator.
              Make sure all information is correct before proceeding.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
