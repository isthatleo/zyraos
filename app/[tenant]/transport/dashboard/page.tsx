import { OperationalDashboard } from "@/components/operational-dashboard";

export default function TransportDashboardPage() {
  return (
    <OperationalDashboard
      eyebrow="Transport"
      title="Transport Dashboard"
      description="Coordinate routes, vehicles, drivers, pickup tracking, drop-off confirmation, incidents, and transport reports."
      metrics={[
        { label: "Routes", value: "0", note: "Active transport routes configured" },
        { label: "Vehicles", value: "0", note: "Vehicles assigned to school transport" },
        { label: "Drivers", value: "0", note: "Drivers and assistants registered" },
        { label: "Incidents", value: "0", note: "Transport incidents pending action" },
      ]}
      workflows={[
        { title: "Route Planning", description: "Build routes, stops, pickup windows, assigned buses, drivers, and route capacity." },
        { title: "Daily Tracking", description: "Track departures, pickups, drop-offs, absences, and route completion status." },
        { title: "Safety Logs", description: "Record delays, breakdowns, route incidents, guardian alerts, and resolution notes." },
      ]}
    />
  );
}
