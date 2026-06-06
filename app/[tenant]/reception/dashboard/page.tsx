import { OperationalDashboard } from "@/components/operational-dashboard";

export default function ReceptionDashboardPage() {
  return (
    <OperationalDashboard
      eyebrow="Reception"
      title="Reception Dashboard"
      description="Manage front desk activity, visitor reception, appointments, calls, enquiries, and access handoff for the school."
      metrics={[
        { label: "Visitors", value: "0", note: "Visitors checked in today" },
        { label: "Appointments", value: "0", note: "Scheduled meetings and visits" },
        { label: "Enquiries", value: "0", note: "Open parent and public enquiries" },
        { label: "Front Desk", value: "Ready", note: "Reception workflow enabled" },
      ]}
      workflows={[
        { title: "Visitor Management", description: "Register visitors, issue passes, capture purpose of visit, host staff member, and check-out time." },
        { title: "Appointments & Calls", description: "Track scheduled meetings, call logs, callbacks, front desk messages, and visitor queues." },
        { title: "Enquiry Handoff", description: "Route admissions, finance, parent, supplier, and general enquiries to the correct department." },
      ]}
    />
  );
}
