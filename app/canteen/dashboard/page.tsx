import { UniversalDashboardShell } from "@/components/shared/universal-dashboard-shell";

export default function CanteenDashboardPage() {
  return (
    <UniversalDashboardShell>
      <div className="rounded-3xl border bg-card p-8 shadow-sm">
        <p className="text-sm font-medium text-primary">Canteen</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Canteen Dashboard</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Canteen operations are reserved and will be implemented in a dedicated dashboard pass.
        </p>
      </div>
    </UniversalDashboardShell>
  );
}

