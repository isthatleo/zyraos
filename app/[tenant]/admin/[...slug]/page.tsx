import { PlaceholderDashboard } from "@/components/shared/placeholder-dashboard";

export default async function AdminModulePage({ params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug } = await params;
  return <PlaceholderDashboard segments={slug} />;
}
