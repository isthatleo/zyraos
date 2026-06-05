import { OperationalDashboard } from "@/components/operational-dashboard";

export default function HealthDashboardPage() {
  return (
    <OperationalDashboard
      eyebrow="Health"
      title="Health Dashboard"
      description="Manage sick bay visits, health records, medication logs, student incidents, and health reporting from one restricted dashboard."
      metrics={[
        { label: "Open Visits", value: "0", note: "Sick bay cases awaiting closure" },
        { label: "Medication Logs", value: "0", note: "Medication entries recorded today" },
        { label: "Incidents", value: "0", note: "Health incidents needing follow-up" },
        { label: "Reports", value: "Ready", note: "Health reporting workspace enabled" },
      ]}
      workflows={[
        { title: "Sick Bay Intake", description: "Record visits, symptoms, actions taken, guardians contacted, and return-to-class status." },
        { title: "Health Records", description: "Maintain allergies, conditions, medication permissions, emergency contacts, and privacy-sensitive notes." },
        { title: "Incident Follow-up", description: "Track injuries, referrals, escalations, and closure notes for compliance and safeguarding." },
      ]}
    />
  );
}
