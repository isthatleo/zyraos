import { PlaceholderDashboard } from "@/components/shared/placeholder-dashboard";

export default async function ReceptionPlaceholderPage({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}) {
  const { slug = [] } = await params;
  return (
    <PlaceholderDashboard
      title="Reception Module"
      description="This receptionist page is routed and ready for the dedicated reception workflow implementation."
      segments={["reception", ...slug]}
    />
  );
}
