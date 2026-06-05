import { OperationalDashboard } from "@/components/operational-dashboard";

export default function ProcurementDashboardPage() {
  return (
    <OperationalDashboard
      eyebrow="Procurement"
      title="Procurement Dashboard"
      description="Manage purchase requests, supplier records, approvals, purchase orders, receiving, and procurement accountability."
      metrics={[
        { label: "Requests", value: "0", note: "Purchase requests awaiting processing" },
        { label: "Suppliers", value: "0", note: "Approved suppliers registered" },
        { label: "Orders", value: "0", note: "Purchase orders in progress" },
        { label: "Approvals", value: "Ready", note: "Approval workflow enabled" },
      ]}
      workflows={[
        { title: "Purchase Requests", description: "Capture requested items, quantities, budgets, departments, urgency, and approval status." },
        { title: "Supplier Management", description: "Maintain supplier profiles, compliance documents, contacts, categories, and performance notes." },
        { title: "Order Control", description: "Track purchase orders, receiving, supplier invoices, budget links, and audit history." },
      ]}
    />
  );
}
