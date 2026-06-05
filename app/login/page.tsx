import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { LoginForm } from "@/components/login-form";
import { RoleSelection } from "@/components/role-selection";
import { TenantSubdomainRedirect } from "@/components/tenant-subdomain-redirect";
import { getTenantSubdomain } from "@/lib/tenant-routing";
import { LoginSearchParams } from "./search-params";

function MainDomainLogin({ role }: { role?: string }) {
  if (!role) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center bg-muted p-6 md:p-10">
        <TenantSubdomainRedirect />
        <div className="w-full max-w-4xl">
          <RoleSelection />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-muted p-6 md:p-10">
      <TenantSubdomainRedirect />
      <div className="w-full max-w-sm md:max-w-4xl">
        <LoginForm />
      </div>
    </div>
  );
}

export default async function LoginPage() {
  const headersList = await headers();
  const tenantSlug = getTenantSubdomain(headersList.get("host"));

  if (tenantSlug) {
    redirect("/staff");
  }

  return (
    <Suspense fallback={<div className="flex min-h-svh items-center justify-center"><p>Loading...</p></div>}>
      <LoginSearchParams>{(role) => <MainDomainLogin role={role} />}</LoginSearchParams>
    </Suspense>
  );
}
