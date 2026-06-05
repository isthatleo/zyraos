import { DashboardShell } from "@/components/shared/dashboard-shell";

export default function LibrarianLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell role="librarian">{children}</DashboardShell>;
}
