import {
  asString,
  getPlatformSettings,
  PLATFORM_SETTING_DEFAULTS,
} from "@/lib/platform-settings-server";

export type PlatformBillingBranding = {
  name: string;
  shortName: string;
  subtitle: string;
  logoUrl: string;
  faviconUrl: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  letterhead: string;
};

export async function getPlatformBillingBranding(): Promise<PlatformBillingBranding> {
  const settings = await getPlatformSettings();
  const name = asString(settings.platformName, PLATFORM_SETTING_DEFAULTS.platformName);
  const shortName = asString(settings.platformShortName, PLATFORM_SETTING_DEFAULTS.platformShortName);

  return {
    name,
    shortName,
    subtitle: asString(settings.platformSubtitle, PLATFORM_SETTING_DEFAULTS.platformSubtitle),
    logoUrl: asString(settings.platformLogoUrl, "/images/roxan-logo.svg"),
    faviconUrl: asString(settings.platformFaviconUrl, "/favicon.png"),
    primaryColor: asString(settings.primaryColor, "#0f766e"),
    secondaryColor: asString(settings.secondaryColor, "#0f172a"),
    accentColor: asString(settings.accentColor, "#f59e0b"),
    address: asString(settings.companyAddress, PLATFORM_SETTING_DEFAULTS.companyAddress),
    phone: asString(settings.supportPhone, PLATFORM_SETTING_DEFAULTS.supportPhone),
    email: asString(settings.supportEmail, PLATFORM_SETTING_DEFAULTS.supportEmail),
    website: asString(settings.platformWebsite, "https://roxan.com"),
    letterhead: asString(settings.platformLetterhead, `${name} - ${asString(settings.companyAddress, PLATFORM_SETTING_DEFAULTS.companyAddress)}`),
  };
}
