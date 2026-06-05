import { OperationalDashboard } from "@/components/operational-dashboard";

export default function WellbeingDashboardPage() {
  return (
    <OperationalDashboard
      eyebrow="Wellbeing"
      title="Wellbeing Dashboard"
      description="Coordinate counseling cases, welfare support, safeguarding records, behavior interventions, referrals, and follow-up tasks."
      metrics={[
        { label: "Open Cases", value: "0", note: "Counseling or welfare cases active" },
        { label: "Follow-ups", value: "0", note: "Follow-up actions due" },
        { label: "Referrals", value: "0", note: "External or internal referrals" },
        { label: "Safeguarding", value: "Ready", note: "Restricted safeguarding workspace enabled" },
      ]}
      workflows={[
        { title: "Counseling Cases", description: "Open cases, capture confidential notes, define actions, and schedule follow-up sessions." },
        { title: "Behavior Support", description: "Track concerns, interventions, parent contact, staff collaboration, and improvement plans." },
        { title: "Safeguarding", description: "Maintain restricted access records for escalations, referrals, evidence, and closure decisions." },
      ]}
    />
  );
}
