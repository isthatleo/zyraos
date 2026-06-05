import { OperationalDashboard } from "@/components/operational-dashboard";

export default function SecurityDashboardPage() {
  return (
    <OperationalDashboard
      eyebrow="Security"
      title="Security Dashboard"
      description="Control visitor logs, gate passes, access records, emergency logs, incident handling, and daily security reporting."
      metrics={[
        { label: "Visitors Today", value: "0", note: "Visitor entries registered today" },
        { label: "Gate Passes", value: "0", note: "Active gate passes issued" },
        { label: "Incidents", value: "0", note: "Security incidents pending review" },
        { label: "Emergency Logs", value: "Ready", note: "Emergency register enabled" },
      ]}
      workflows={[
        { title: "Visitor Control", description: "Register visitors, hosts, ID details, entry times, exit times, and badge status." },
        { title: "Gate Passes", description: "Issue and validate learner, staff, vehicle, supplier, and event access passes." },
        { title: "Incident Response", description: "Capture incidents, emergency actions, witnesses, attachments, and closure outcomes." },
      ]}
    />
  );
}
