import { PlaceholderDashboard } from "@/components/shared/placeholder-dashboard";

export default async function FinanceModulePage({ params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug } = await params;
  return <PlaceholderDashboard segments={slug} />;
}
