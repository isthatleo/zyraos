import { redirect } from "next/navigation";
import { sql } from "drizzle-orm";

import { getTenantDbBySlug } from "@/lib/db";

type TenantRootPageProps = {
  params: Promise<{ tenant?: string }> | { tenant?: string };
};

function normalizeExternalUrl(value: unknown) {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (!trimmed) return "";
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    const url = new URL(withProtocol);
    if (!["http:", "https:"].includes(url.protocol)) return "";
    return url.toString();
  } catch {
    return "";
  }
}

async function getTenantWebsiteUrl(tenantSlug: string) {
  try {
    const tenantDb = await getTenantDbBySlug(tenantSlug);
    const settingsKey = `tenant_settings:${tenantSlug}`;
    const result = await tenantDb.execute(sql`
      select value
      from system_settings
      where key in (${settingsKey}, 'tenant_settings')
      order by case when key = ${settingsKey} then 0 else 1 end
      limit 1
    `);
    const rows = Array.isArray(result) ? result : result.rows || [];
    const value = rows[0]?.value;
    if (!value || typeof value !== "object") return "";
    return normalizeExternalUrl((value as Record<string, unknown>).website);
  } catch (error) {
    console.warn("Tenant landing website lookup failed:", error instanceof Error ? error.message : error);
    return "";
  }
}

export default async function TenantRootPage({ params }: TenantRootPageProps) {
  const resolvedParams = await params;
  const tenant = resolvedParams?.tenant?.trim().toLowerCase();
  if (!tenant) redirect("/login");

  const websiteUrl = await getTenantWebsiteUrl(tenant);
  if (websiteUrl) redirect(websiteUrl);

  redirect(`/${tenant}/staff`);
}
