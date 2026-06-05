import { OperationalDashboard } from "@/components/operational-dashboard";

export default function InventoryDashboardPage() {
  return (
    <OperationalDashboard
      eyebrow="Inventory"
      title="Inventory Dashboard"
      description="Manage stores, stock movement, assets, allocations, maintenance records, low-stock alerts, and inventory reports."
      metrics={[
        { label: "Stock Items", value: "0", note: "Tracked inventory items" },
        { label: "Assets", value: "0", note: "School assets registered" },
        { label: "Movements", value: "0", note: "Stock movements recorded today" },
        { label: "Alerts", value: "0", note: "Low-stock or asset alerts" },
      ]}
      workflows={[
        { title: "Stock Control", description: "Track stock balances, issue notes, receipts, reorder levels, and category ownership." },
        { title: "Asset Register", description: "Maintain asset tags, locations, custodians, condition, depreciation notes, and maintenance status." },
        { title: "Requests & Issues", description: "Process department requests, approvals, stock issues, returns, and accountability records." },
      ]}
    />
  );
}
