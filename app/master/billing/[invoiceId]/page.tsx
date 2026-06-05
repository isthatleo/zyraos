import { redirect } from "next/navigation";

export default async function LegacyBillingInvoicePage({
  params,
}: {
  params: Promise<{ invoiceId: string }>;
}) {
  const { invoiceId } = await params;
  redirect(`/master/billing/invoices/${invoiceId}`);
}
