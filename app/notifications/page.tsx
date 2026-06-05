import { NotificationsPage } from "@/components/shared/notifications-page";
import { UniversalDashboardShell } from "@/components/shared/universal-dashboard-shell";

export default function Page() {
  return (
    <UniversalDashboardShell>
      <NotificationsPage />
    </UniversalDashboardShell>
  );
}
