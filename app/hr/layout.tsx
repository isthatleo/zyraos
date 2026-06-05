import { DashboardShell } from "@/components/shared/dashboard-shell";

export default function HrLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell role="hr">{children}</DashboardShell>;
}
