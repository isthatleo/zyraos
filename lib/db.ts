import { drizzle } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm";
import { Pool } from "pg";
import * as schema from "./db-schema";
import { normalizeDatabaseUrl } from "./database-url";

// Master database connection (for control center)
const masterClient = new Pool({
  connectionString: normalizeDatabaseUrl(process.env.DATABASE_URL),
  connectionTimeoutMillis: 15000,
  idleTimeoutMillis: 30000,
  max: 10,
});

export const masterDb = drizzle(masterClient, { schema: schema.masterSchema });

// Tenant database connections cache
const tenantConnections = new Map<string, ReturnType<typeof drizzle>>();

// Get tenant database connection
export function getTenantDb(databaseUrl: string) {
  const normalizedDatabaseUrl = normalizeDatabaseUrl(databaseUrl) || databaseUrl;

  if (tenantConnections.has(normalizedDatabaseUrl)) {
    return tenantConnections.get(normalizedDatabaseUrl)!;
  }

  const tenantClient = new Pool({
    connectionString: normalizedDatabaseUrl,
    connectionTimeoutMillis: 15000,
    idleTimeoutMillis: 30000,
    max: 10,
  });

  const tenantDb = drizzle(tenantClient, { schema: schema.tenantSchema });
  tenantConnections.set(normalizedDatabaseUrl, tenantDb);

  return tenantDb;
}

// Get tenant database by school slug
export async function getTenantDbBySlug(slug: string) {
  // First get the school info from master database
  const school = await masterDb
    .select()
    .from(schema.schoolsTable)
    .where(eq(schema.schoolsTable.slug, slug))
    .limit(1);

  if (!school.length) {
    throw new Error(`School with slug ${slug} not found`);
  }

  return getTenantDb(school[0].databaseUrl);
}

// Utility to get current tenant from request
export function getTenantFromRequest(request: Request | any): string | null {
  const host = request.headers?.get('host') || request.host || '';
  const subdomain = host.split('.')[0];

  // If it's the main domain, return null (master)
  if (host === process.env.MAIN_DOMAIN || subdomain === 'www' || subdomain === host) {
    return null;
  }

  return subdomain;
}

// Close all connections (for cleanup)
export async function closeAllConnections() {
  await masterClient.end();

  for (const [url, db] of tenantConnections) {
    // Note: Drizzle doesn't expose connection closing directly
    // In production, you'd want to properly close tenant connections
  }

  tenantConnections.clear();
}

// Keep backward compatibility
export const db = masterDb;
