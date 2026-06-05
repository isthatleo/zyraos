import { UniversalDashboardShell } from "@/components/shared/universal-dashboard-shell";

export default function LibrarianDashboardPage() {
  return (
    <UniversalDashboardShell>
      <div className="rounded-3xl border bg-card p-8 shadow-sm">
        <p className="text-sm font-medium text-primary">Library</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Library Dashboard</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Library workflows are routed and ready for the upcoming implementation pass.
        </p>
      </div>
    </UniversalDashboardShell>
  );
}

