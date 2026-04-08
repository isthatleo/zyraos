/**
 * Access Denied / No Access Page
 * Path: src/app/access-denied/page.tsx
 */

'use client';

import React, { useSearchParams } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Home, Mail, ArrowLeft } from 'lucide-react';

export default function AccessDeniedPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const userRole = searchParams.get('role') || 'Unknown';
  const module = searchParams.get('module') || 'This Module';
  const page = searchParams.get('page') || 'This Page';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <Card className="bg-slate-800/50 border-slate-700 backdrop-blur max-w-md w-full">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-4 bg-red-900/30 rounded-full border border-red-800/50">
              <AlertTriangle className="h-8 w-8 text-red-400" />
            </div>
          </div>
          <CardTitle className="text-2xl text-white">Access Denied</CardTitle>
          <CardDescription className="text-slate-400 mt-2">
            You don't have permission to access this resource
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Context Information */}
          <div className="space-y-3 p-4 bg-slate-700/30 rounded-lg border border-slate-600/30">
            <div>
              <p className="text-xs text-slate-400 mb-1">Your Role</p>
              <p className="text-sm font-semibold text-white">{userRole}</p>
            </div>
            <div className="border-t border-slate-600/30 pt-3">
              <p className="text-xs text-slate-400 mb-1">Module</p>
              <p className="text-sm font-semibold text-white">{module}</p>
            </div>
            <div className="border-t border-slate-600/30 pt-3">
              <p className="text-xs text-slate-400 mb-1">Requested Page</p>
              <p className="text-sm font-semibold text-white">{page}</p>
            </div>
          </div>

          {/* Why This Happened */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-white">Why do you see this?</h4>
            <ul className="text-xs text-slate-400 space-y-1 list-disc list-inside">
              <li>Your role does not have permission for this module</li>
              <li>Your access may have been recently revoked</li>
              <li>You may need elevated privileges</li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <Button
              onClick={() => router.back()}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Go Back
            </Button>

            <Button
              onClick={() => router.push('/dashboard')}
              className="w-full bg-slate-700 hover:bg-slate-600 text-white flex items-center justify-center gap-2"
            >
              <Home className="h-4 w-4" />
              Back to Dashboard
            </Button>

            <Button className="w-full bg-green-600 hover:bg-green-700 text-white flex items-center justify-center gap-2">
              <Mail className="h-4 w-4" />
              Request Access
            </Button>
          </div>

          {/* Help Text */}
          <div className="p-3 bg-blue-900/20 rounded-lg border border-blue-800/50">
            <p className="text-xs text-blue-300">
              If you believe this is an error, contact your administrator to request access to {module}.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

