import { sql } from "drizzle-orm";

import { masterDb } from "@/lib/db";

type Row = Record<string, unknown>;

function asString(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function asRecord(value: unknown): Row {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Row : {};
}

async function readSystemSetting(key: string) {
  const result = await masterDb.execute(sql`select value from system_settings where key = ${key} limit 1`).catch(() => ({ rows: [] as Row[] }));
  const row = (result.rows || [])[0] as Row | undefined;
  return asRecord(row?.value);
}

export type TenantBranding = {
  name: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  schoolSealUrl: string | null;
  reportCardWatermarkUrl: string | null;
  emailHeaderLogoUrl: string | null;
  loginScreenLogoUrl: string | null;
  mobileAppLogoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  motto: string;
};

export async function getTenantBranding(slug: string, fallbackName = ""): Promise<TenantBranding> {
  const branding = await readSystemSetting(`tenant_branding:${slug}`);
  const settings = await readSystemSetting(`tenant_settings:${slug}`);
  return {
    name: asString(branding.name, asString(settings.schoolName, fallbackName)),
    logoUrl: asString(branding.logoUrl, asString(settings.logoUrl)) || null,
    faviconUrl: asString(branding.faviconUrl, asString(settings.faviconUrl)) || null,
    schoolSealUrl: asString(branding.schoolSealUrl, asString(settings.schoolSealUrl)) || null,
    reportCardWatermarkUrl: asString(branding.reportCardWatermarkUrl, asString(settings.reportCardWatermarkUrl)) || null,
    emailHeaderLogoUrl: asString(branding.emailHeaderLogoUrl, asString(settings.emailHeaderLogoUrl)) || null,
    loginScreenLogoUrl: asString(branding.loginScreenLogoUrl, asString(settings.loginScreenLogoUrl)) || null,
    mobileAppLogoUrl: asString(branding.mobileAppLogoUrl, asString(settings.mobileAppLogoUrl)) || null,
    primaryColor: asString(branding.primaryColor, asString(settings.primaryColor, "#f97316")),
    secondaryColor: asString(branding.secondaryColor, asString(settings.secondaryColor, "#111827")),
    accentColor: asString(branding.accentColor, asString(settings.accentColor, "#fb923c")),
    address: asString(settings.address),
    phone: asString(settings.phone),
    email: asString(settings.email),
    website: asString(settings.website),
    motto: asString(settings.motto),
  };
}
