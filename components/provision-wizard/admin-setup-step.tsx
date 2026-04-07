"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface AdminUserData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
}

interface AdminSetupStepProps {
  data: AdminUserData;
  onUpdate: (data: AdminUserData) => void;
}

export function AdminSetupStep({ data, onUpdate }: AdminSetupStepProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const updateField = (field: keyof AdminUserData, value: string) => {
    onUpdate({ ...data, [field]: value });
  };

  const passwordMatch = data.password === data.confirmPassword;
  const passwordValid = data.password.length >= 8;

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-900 mb-1">Administrator Account</h3>
        <p className="text-sm text-blue-700">
          This account will have full administrative access to the school. Make sure to use a strong password and keep the credentials secure.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="first-name">First Name *</Label>
          <Input
            id="first-name"
            placeholder="Enter first name"
            value={data.firstName}
            onChange={(e) => updateField("firstName", e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="last-name">Last Name *</Label>
          <Input
            id="last-name"
            placeholder="Enter last name"
            value={data.lastName}
            onChange={(e) => updateField("lastName", e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="admin-email">Email Address *</Label>
          <Input
            id="admin-email"
            type="email"
            placeholder="admin@school.com"
            value={data.email}
            onChange={(e) => updateField("email", e.target.value)}
            required
          />
          <p className="text-sm text-gray-500">
            This will be the login email for the administrator
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="admin-phone">Phone Number</Label>
          <Input
            id="admin-phone"
            placeholder="+233 XX XXX XXXX"
            value={data.phone}
            onChange={(e) => updateField("phone", e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="password">Password *</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Enter password"
              value={data.password}
              onChange={(e) => updateField("password", e.target.value)}
              required
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4 text-gray-400" />
              ) : (
                <Eye className="h-4 w-4 text-gray-400" />
              )}
            </Button>
          </div>
          <div className="text-sm">
            {!passwordValid && data.password && (
              <p className="text-red-600">Password must be at least 8 characters</p>
            )}
            {passwordValid && (
              <p className="text-green-600">✓ Password meets requirements</p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirm-password">Confirm Password *</Label>
          <div className="relative">
            <Input
              id="confirm-password"
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Confirm password"
              value={data.confirmPassword}
              onChange={(e) => updateField("confirmPassword", e.target.value)}
              required
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              {showConfirmPassword ? (
                <EyeOff className="h-4 w-4 text-gray-400" />
              ) : (
                <Eye className="h-4 w-4 text-gray-400" />
              )}
            </Button>
          </div>
          <div className="text-sm">
            {data.confirmPassword && !passwordMatch && (
              <p className="text-red-600">Passwords do not match</p>
            )}
            {data.confirmPassword && passwordMatch && data.password && (
              <p className="text-green-600">✓ Passwords match</p>
            )}
          </div>
        </div>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-900 mb-2">Password Requirements</h4>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• At least 8 characters long</li>
          <li>• Use a mix of letters, numbers, and symbols</li>
          <li>• Avoid common passwords</li>
        </ul>
      </div>
    </div>
  );
}
