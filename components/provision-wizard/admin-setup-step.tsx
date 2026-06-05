"use client";

import { KeyRound, MailCheck, ShieldCheck } from "lucide-react";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface AdminUserData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password?: string;
  confirmPassword?: string;
}

interface AdminSetupStepProps {
  data: AdminUserData;
  onUpdate: (data: AdminUserData) => void;
}

export function AdminSetupStep({ data, onUpdate }: AdminSetupStepProps) {
  const updateField = (field: keyof AdminUserData, value: string) => {
    onUpdate({ ...data, [field]: value, password: undefined, confirmPassword: undefined });
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-primary/20 bg-primary/10 p-4">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 size-5 text-primary" />
          <div>
            <h3 className="text-sm font-medium">Owner Administrator Account</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              This account receives full school administration access. A secure temporary password will be generated automatically after provisioning completes.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border bg-muted/30 p-4">
        <div className="flex items-start gap-3">
          <KeyRound className="mt-0.5 size-5 text-primary" />
          <div>
            <p className="font-semibold">Temporary password is generated after completion</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Like Joan, Roxan creates the temporary credential only after the tenant, owner account, subscription, invoice, and modules are successfully saved. The owner must change it before entering the dashboard.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="first-name">First Name *</Label>
          <Input id="first-name" placeholder="Enter first name" value={data.firstName} onChange={(event) => updateField("firstName", event.target.value)} required />
        </div>

        <div className="space-y-2">
          <Label htmlFor="last-name">Last Name *</Label>
          <Input id="last-name" placeholder="Enter last name" value={data.lastName} onChange={(event) => updateField("lastName", event.target.value)} required />
        </div>

        <div className="space-y-2">
          <Label htmlFor="admin-email">Email Address *</Label>
          <Input id="admin-email" type="email" placeholder="owner@school.com" value={data.email} onChange={(event) => updateField("email", event.target.value)} required />
          <p className="text-sm text-muted-foreground">This is the login email for the school owner.</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="admin-phone">Phone Number</Label>
          <PhoneInput
            id="admin-phone"
            international
            defaultCountry="UG"
            countryCallingCodeEditable={false}
            placeholder="Owner phone number"
            value={data.phone}
            onChange={(value) => updateField("phone", value || "")}
            className="phone-field flex min-h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="rounded-2xl border bg-muted/30 p-4">
        <div className="flex items-start gap-3">
          <MailCheck className="mt-0.5 size-5 text-primary" />
          <div>
            <h4 className="text-sm font-medium">Secure handoff</h4>
            <p className="mt-1 text-sm text-muted-foreground">
              After provisioning, the generated password and exact admin portal login link are shown on the success screen and sent to the owner if transactional email is configured.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
