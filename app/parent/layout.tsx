import { DashboardShell } from "@/components/shared/dashboard-shell";

export default function ParentLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell role="parent">{children}</DashboardShell>;
}
