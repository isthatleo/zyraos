import { TenantPortalLogin } from "@/components/tenant-portal-login";

export default function TenantCanteenPortalPage() {
  return (
    <TenantPortalLogin
      title="Canteen Portal"
      description="For meal operations, inventory, orders, and canteen finance."
      roles={["canteen"]}
      defaultRole="canteen"
    />
  );
}

