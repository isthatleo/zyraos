import { DashboardShell } from "@/components/shared/dashboard-shell";

export default function CanteenLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell role="canteen">{children}</DashboardShell>;
}
