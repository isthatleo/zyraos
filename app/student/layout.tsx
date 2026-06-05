import { DashboardShell } from "@/components/shared/dashboard-shell";

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell role="student">{children}</DashboardShell>;
}
