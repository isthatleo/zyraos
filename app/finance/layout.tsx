import { DashboardShell } from "@/components/shared/dashboard-shell";

export default function FinanceLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell role="finance">{children}</DashboardShell>;
}
