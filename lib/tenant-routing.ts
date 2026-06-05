export function getTenantSubdomain(host?: string | null) {
  if (!host) return null;
  const hostname = host.split(":")[0];
  const parts = hostname.split(".");
  if (hostname === "localhost" || hostname === "127.0.0.1") return null;
  if (parts.length < 2) return null;
  const subdomain = parts[0];
  if (!subdomain || subdomain === "www") return null;
  return subdomain;
}

export function resolveTenantSlug(pathname?: string | null, hostname?: string | null, fallback?: string | null) {
  if (fallback) return fallback;
  const subdomain = getTenantSubdomain(hostname);
  if (subdomain) return subdomain;

  const firstSegment = (pathname || "").split("/").filter(Boolean)[0];
  if (!firstSegment) return null;
  if (["api", "messages", "profile", "settings", "notifications", "super-admin"].includes(firstSegment)) return null;
  return firstSegment;
}

export function withTenantPrefix(path: string, tenantSlug?: string | null, hostname?: string | null) {
  if (!tenantSlug || getTenantSubdomain(hostname)) return path;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `/${tenantSlug}${normalizedPath}`;
}
