import { OperationalDashboard } from "@/components/operational-dashboard";

export default function HostelDashboardPage() {
  return (
    <OperationalDashboard
      eyebrow="Hostel"
      title="Hostel Dashboard"
      description="Manage boarding allocations, room occupancy, hostel attendance, welfare notes, incidents, and guardian communication."
      metrics={[
        { label: "Boarders", value: "0", note: "Students assigned to hostel spaces" },
        { label: "Rooms", value: "0", note: "Rooms available for allocation" },
        { label: "Attendance", value: "Ready", note: "Night roll-call workspace enabled" },
        { label: "Incidents", value: "0", note: "Open hostel follow-ups" },
      ]}
      workflows={[
        { title: "Room Allocation", description: "Assign students to houses, dormitories, rooms, beds, and warden supervision groups." },
        { title: "Roll Call", description: "Capture hostel attendance, late returns, leave-outs, check-ins, and absence exceptions." },
        { title: "Welfare Management", description: "Track behavior, wellbeing, incidents, guardian contact, and escalation notes." },
      ]}
    />
  );
}
