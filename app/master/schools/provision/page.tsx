"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ProvisioningWizard, ProvisioningData } from "@/components/provisioning-wizard";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ProvisionSchoolPage() {
  const router = useRouter();
  const [isProvisioning, setIsProvisioning] = useState(false);
  const [provisionResult, setProvisionResult] = useState<{
    success: boolean;
    school?: any;
    adminUser?: any;
    portalUrl?: string;
    temporaryPassword?: string;
    error?: string;
  } | null>(null);

  const handleProvision = async (data: ProvisioningData) => {
    setIsProvisioning(true);
    try {
      const response = await fetch('/api/master/schools/provision', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (response.ok) {
        setProvisionResult({
          success: true,
          school: result.school,
          adminUser: result.adminUser,
          portalUrl: result.portalUrl,
          temporaryPassword: result.temporaryPassword,
        });
      } else {
        setProvisionResult({
          success: false,
          error: result.error || 'Failed to provision school',
        });
      }
    } catch (error) {
      console.error('Provisioning error:', error);
      setProvisionResult({
        success: false,
        error: 'Network error occurred during provisioning',
      });
    } finally {
      setIsProvisioning(false);
    }
  };

  const handleCancel = () => {
    router.push('/master/schools');
  };

  const handleBackToSchools = () => {
    router.push('/master/schools');
  };

  if (provisionResult) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardContent className="p-8">
            {provisionResult.success ? (
              <div className="text-center space-y-6">
                <div className="flex justify-center">
                  <CheckCircle className="h-16 w-16 text-green-500" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    School Provisioned Successfully!
                  </h2>
                  <p className="text-gray-600">
                    {provisionResult.school?.name} has been successfully provisioned and is ready to use.
                  </p>
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-left">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Access Information</h3>
                  <div className="space-y-3">
                    <div>
                      <span className="text-sm font-medium text-gray-500">School Portal:</span>
                      <p className="text-sm text-gray-900 font-mono">{provisionResult.portalUrl}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Administrator Email:</span>
                      <p className="text-sm text-gray-900">{provisionResult.adminUser?.email}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Administrator Name:</span>
                      <p className="text-sm text-gray-900">{provisionResult.adminUser?.name}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Temporary Password:</span>
                      <p className="text-sm text-gray-900 font-mono">{provisionResult.temporaryPassword}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex">
                    <AlertCircle className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
                    <div className="ml-3">
                      <h4 className="text-sm font-medium text-blue-800">Next Steps</h4>
                      <ul className="text-sm text-blue-700 mt-1 space-y-1">
                        <li>• Share the login credentials with the school administrator</li>
                        <li>• The administrator should change their password on first login</li>
                        <li>• Configure additional school settings as needed</li>
                        <li>• Set up additional user accounts and roles</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 justify-center">
                  <Button onClick={handleBackToSchools} variant="outline">
                    Back to Schools
                  </Button>
                  <Button
                    onClick={() => window.open(provisionResult.portalUrl, '_blank')}
                    className="bg-orange-600 hover:bg-orange-700"
                  >
                    Open School Portal
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center space-y-6">
                <div className="flex justify-center">
                  <AlertCircle className="h-16 w-16 text-red-500" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Provisioning Failed
                  </h2>
                  <p className="text-gray-600">
                    {provisionResult.error}
                  </p>
                </div>
                <div className="flex gap-4 justify-center">
                  <Button onClick={() => setProvisionResult(null)} variant="outline">
                    Try Again
                  </Button>
                  <Button onClick={handleBackToSchools}>
                    Back to Schools
                  </Button>
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardContent className="p-8 text-center space-y-6">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Provisioning School...
              </h2>
              <p className="text-gray-600">
                This may take a few moments. Please don't close this page.
              </p>
            </div>
            <div className="text-sm text-gray-500">
              Setting up database, creating accounts, and configuring modules...
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <ProvisioningWizard
        onComplete={handleProvision}
        onCancel={handleCancel}
      />
    </div>
  );
}
