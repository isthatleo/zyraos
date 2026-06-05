import { OperationalDashboard } from "@/components/operational-dashboard";

export default function AlumniDashboardPage() {
  return (
    <OperationalDashboard
      eyebrow="Alumni"
      title="Alumni Dashboard"
      description="Manage alumni records, engagement, events, campaigns, communication lists, giving programs, and alumni reporting."
      metrics={[
        { label: "Alumni Records", value: "0", note: "Verified alumni profiles" },
        { label: "Events", value: "0", note: "Upcoming alumni events" },
        { label: "Campaigns", value: "0", note: "Active engagement campaigns" },
        { label: "Engagement", value: "Ready", note: "Communication workspace enabled" },
      ]}
      workflows={[
        { title: "Alumni Records", description: "Maintain graduation years, programs, contacts, employment, location, and consent status." },
        { title: "Events & Campaigns", description: "Plan alumni events, fundraising campaigns, mentorship programs, and announcements." },
        { title: "Engagement Reporting", description: "Track participation, message delivery, donations, feedback, and relationship history." },
      ]}
    />
  );
}
