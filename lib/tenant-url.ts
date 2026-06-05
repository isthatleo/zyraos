import { normalizeDatabaseUrl } from "@/lib/database-url";

const RESERVED_TENANT_SLUGS = new Set([
  "api",
  "app",
  "auth",
  "login",
  "logout",
  "master",
  "super-admin",
  "admin",
  "admins",
  "staff",
  "student",
  "parent",
  "settings",
  "profile",
  "messages",
  "notifications",
  "static",
  "assets",
  "www",
]);

export function normalizeTenantSlug(value: string) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
    .slice(0, 63);
}

export function validateTenantSlug(value: string) {
  const slug = normalizeTenantSlug(value);
  if (!slug) return { slug, error: "School URL slug is required" };
  if (slug.length < 3) return { slug, error: "School URL slug must be at least 3 characters" };
  if (!/^[a-z0-9](?:[a-z0-9-]{1,61}[a-z0-9])$/.test(slug)) {
    return { slug, error: "School URL slug can only contain lowercase letters, numbers, and hyphens" };
  }
  if (RESERVED_TENANT_SLUGS.has(slug)) return { slug, error: `"${slug}" is reserved and cannot be used as a school URL` };
  return { slug, error: null };
}

export function getTenantPortalUrl(slug: string, request?: Request, mode?: string | null) {
  const cleanSlug = normalizeTenantSlug(slug);
  const urlMode = String(mode || process.env.TENANT_URL_MODE || "subdomain").toLowerCase();
  const configuredBase =
    process.env.NEXT_PUBLIC_TENANT_BASE_URL ||
    process.env.TENANT_BASE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_BASE_URL ||
    process.env.MAIN_DOMAIN ||
    "";

  if (configuredBase) {
    const configured = configuredBase.startsWith("http")
      ? new URL(configuredBase)
      : new URL(`https://${configuredBase}`);
    if (urlMode === "path") {
      return `${configured.protocol}//${configured.host}/${cleanSlug}`;
    }
    if (configured.hostname === "localhost") {
      return `${configured.protocol}//${cleanSlug}.localhost${configured.port ? `:${configured.port}` : ""}`;
    }
    if (configured.hostname === "127.0.0.1") {
      return `${configured.protocol}//${cleanSlug}.localhost${configured.port ? `:${configured.port}` : ""}`;
    }
    const base = configured.host.replace(/\/+$/, "");
    const protocol = configured.protocol.replace(":", "");
    return `${protocol}://${cleanSlug}.${base}`;
  }

  const host = request?.headers.get("host") || "localhost:3000";
  const hostname = host.split(":")[0];
  const port = host.includes(":") ? `:${host.split(":").slice(1).join(":")}` : "";
  const protocol = hostname === "localhost" || hostname === "127.0.0.1" ? "http" : "https";

  if (urlMode === "path") {
    return `${protocol}://${host}/${cleanSlug}`;
  }
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return `${protocol}://${cleanSlug}.localhost${port}`;
  }

  return `${protocol}://${cleanSlug}.${hostname}${port}`;
}

export function resolveTenantDatabaseUrl(slug: string) {
  const cleanSlug = normalizeTenantSlug(slug);
  const template = process.env.TENANT_DATABASE_URL_TEMPLATE;
  if (template) {
    return normalizeDatabaseUrl(template.replaceAll("{slug}", cleanSlug)) || template;
  }

  const dedicated = process.env.TENANT_DATABASE_URL;
  if (dedicated) return normalizeDatabaseUrl(dedicated) || dedicated;

  return normalizeDatabaseUrl(process.env.DATABASE_URL) || "";
}
