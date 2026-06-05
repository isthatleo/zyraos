import { CommunicationsPage } from "@/components/shared/communications-page";
import { UniversalDashboardShell } from "@/components/shared/universal-dashboard-shell";

export default function Page() {
  return (
    <UniversalDashboardShell>
      <CommunicationsPage />
    </UniversalDashboardShell>
  );
}
