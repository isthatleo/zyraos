export const PLATFORM_SETTINGS_SYNC_EVENT = "roxan:platform-settings-updated";
export const PLATFORM_SETTINGS_STORAGE_KEY = "roxan:platform-settings";
export const PLATFORM_SETTINGS_CHANNEL = "roxan_platform_settings";

export type PublicPlatformSettings = {
  platformName?: string;
  platformShortName?: string;
  platformSubtitle?: string;
  supportEmail?: string;
  supportPhone?: string;
  timezone?: string;
  currency?: string;
  sessionTimeout?: string;
  maintenanceMode?: boolean;
  announcementBanner?: string;
  tenantBrandingLock?: boolean;
  ownerSeatLimit?: string;
  trialDays?: string;
  privacyContactEmail?: string;
  defaultLanguage?: string;
  dateFormat?: string;
  timeFormat?: string;
  firstDayOfWeek?: string;
  updatedAt?: string;
};

export function publishPlatformSettings(settings: PublicPlatformSettings) {
  if (typeof window === "undefined") return;
  const payload = { ...settings, updatedAt: settings.updatedAt || new Date().toISOString() };
  const serialized = JSON.stringify(payload);
  window.localStorage.setItem(PLATFORM_SETTINGS_STORAGE_KEY, serialized);
  window.dispatchEvent(new CustomEvent(PLATFORM_SETTINGS_SYNC_EVENT, { detail: payload }));
  if ("BroadcastChannel" in window) {
    const channel = new BroadcastChannel(PLATFORM_SETTINGS_CHANNEL);
    channel.postMessage(payload);
    channel.close();
  }
}

export function readCachedPlatformSettings() {
  if (typeof window === "undefined") return null;
  const cached = window.localStorage.getItem(PLATFORM_SETTINGS_STORAGE_KEY);
  if (!cached) return null;
  try {
    return JSON.parse(cached) as PublicPlatformSettings;
  } catch {
    window.localStorage.removeItem(PLATFORM_SETTINGS_STORAGE_KEY);
    return null;
  }
}
