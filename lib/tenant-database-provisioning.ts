import { Pool } from "pg";

import { normalizeDatabaseUrl } from "@/lib/database-url";
import { asBoolean, asString } from "@/lib/platform-settings-server";
import { normalizeTenantSlug, resolveTenantDatabaseUrl } from "@/lib/tenant-url";

type TenantDatabaseProvisioningResult = {
  databaseUrl: string;
  mode: "shared" | "template" | "neon_branch";
  provider: "postgres" | "neon";
  isolated: boolean;
  branchId?: string;
  endpointId?: string;
  databaseName?: string;
  roleName?: string;
  message: string;
};

const NEON_API_BASE = "https://console.neon.tech/api/v2";

function setting(settings: Record<string, unknown>, key: string, envKey?: string) {
  const value = asString(settings[key]);
  return value && value !== "********" ? value : envKey ? process.env[envKey] || "" : "";
}

async function neonRequest(path: string, apiKey: string, init: RequestInit = {}) {
  const response = await fetch(`${NEON_API_BASE}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${apiKey}`,
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(init.headers || {}),
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.message || data?.error || `Neon API request failed with HTTP ${response.status}`);
  }
  return data;
}

async function waitForNeonOperations(projectId: string, apiKey: string, operations: Array<{ id?: string }> = []) {
  const ids = operations.map((operation) => operation.id).filter(Boolean) as string[];
  if (!ids.length) return;

  const terminal = new Set(["finished", "succeeded", "completed"]);
  const failed = new Set(["failed", "error", "cancelled", "canceled"]);
  const deadline = Date.now() + 60_000;

  while (Date.now() < deadline) {
    const statuses = await Promise.all(
      ids.map(async (id) => {
        const data = await neonRequest(`/projects/${projectId}/operations/${id}`, apiKey);
        return String(data?.operation?.status || "").toLowerCase();
      })
    );
    if (statuses.some((status) => failed.has(status))) {
      throw new Error(`Neon operation failed: ${statuses.join(", ")}`);
    }
    if (statuses.every((status) => terminal.has(status))) return;
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }

  throw new Error("Timed out waiting for Neon tenant branch provisioning to finish.");
}

async function verifyDatabaseConnection(databaseUrl: string) {
  const pool = new Pool({ connectionString: normalizeDatabaseUrl(databaseUrl) || databaseUrl, connectionTimeoutMillis: 8000, max: 1 });
  try {
    await pool.query("select 1");
  } finally {
    await pool.end().catch(() => undefined);
  }
}

async function createNeonTenantBranch(slug: string, settings: Record<string, unknown>): Promise<TenantDatabaseProvisioningResult> {
  const apiKey = setting(settings, "neonApiKey", "NEON_API_KEY");
  const projectId = setting(settings, "neonProjectId", "NEON_PROJECT_ID");
  const parentBranchId =
    setting(settings, "tenantNeonParentBranchId", "TENANT_NEON_PARENT_BRANCH_ID") ||
    setting(settings, "neonBranchId", "NEON_BRANCH_ID");
  const databaseName = setting(settings, "tenantNeonDatabaseName", "TENANT_NEON_DATABASE_NAME") || "neondb";
  const roleName = setting(settings, "tenantNeonRoleName", "TENANT_NEON_ROLE_NAME") || "neondb_owner";
  const pooled = asBoolean(settings.tenantNeonPooledConnections ?? process.env.TENANT_NEON_POOLED_CONNECTIONS, true);

  if (!apiKey || !projectId) {
    throw new Error("Neon tenant branch provisioning requires NEON_API_KEY and NEON_PROJECT_ID.");
  }

  const branchName = `tenant-${slug}`;
  const created = await neonRequest(`/projects/${projectId}/branches`, apiKey, {
    method: "POST",
    body: JSON.stringify({
      branch: {
        name: branchName,
        ...(parentBranchId ? { parent_id: parentBranchId } : {}),
      },
      endpoints: [{ type: "read_write" }],
      annotation_value: {
        object: {
          "roxan.tenant_slug": slug,
          "roxan.managed_by": "provisioning",
        },
      },
    }),
  });

  const branchId = created?.branch?.id;
  const endpointId = created?.endpoints?.[0]?.id || created?.endpoint?.id;
  if (!branchId) throw new Error("Neon branch was created without a branch id.");

  await waitForNeonOperations(projectId, apiKey, created?.operations || []);

  const params = new URLSearchParams({
    branch_id: branchId,
    database_name: databaseName,
    role_name: roleName,
    pooled: pooled ? "true" : "false",
  });
  if (endpointId) params.set("endpoint_id", endpointId);

  const connection = await neonRequest(`/projects/${projectId}/connection_uri?${params.toString()}`, apiKey);
  const databaseUrl = normalizeDatabaseUrl(connection?.uri || connection?.connection_uri || "") || "";
  if (!databaseUrl) throw new Error("Neon did not return a tenant database connection URI.");

  await verifyDatabaseConnection(databaseUrl);

  return {
    databaseUrl,
    mode: "neon_branch",
    provider: "neon",
    isolated: true,
    branchId,
    endpointId,
    databaseName,
    roleName,
    message: `Created isolated Neon branch ${branchName}.`,
  };
}

export async function provisionTenantDatabase(slugInput: string, settings: Record<string, unknown>): Promise<TenantDatabaseProvisioningResult> {
  const slug = normalizeTenantSlug(slugInput);
  const mode = (
    process.env.TENANT_DATABASE_MODE ||
    asString(settings.tenantDatabaseMode) ||
    (process.env.TENANT_DATABASE_URL_TEMPLATE ? "template" : "shared")
  ).toLowerCase();

  if (mode === "neon_branch") return createNeonTenantBranch(slug, settings);

  const template = process.env.TENANT_DATABASE_URL_TEMPLATE || setting(settings, "tenantDatabaseUrlTemplate", "TENANT_DATABASE_URL_TEMPLATE");
  const databaseUrl = template
    ? normalizeDatabaseUrl(template.replaceAll("{slug}", slug)) || template.replaceAll("{slug}", slug)
    : resolveTenantDatabaseUrl(slug);
  if (!databaseUrl) throw new Error("Tenant database URL could not be resolved.");
  await verifyDatabaseConnection(databaseUrl);

  if (mode === "template" || Boolean(template)) {
    return {
      databaseUrl,
      mode: "template",
      provider: databaseUrl.includes("neon.tech") ? "neon" : "postgres",
      isolated: true,
      message: "Tenant database URL resolved from tenant database template.",
    };
  }

  return {
    databaseUrl,
    mode: "shared",
    provider: databaseUrl.includes("neon.tech") ? "neon" : "postgres",
    isolated: false,
    message: "Tenant is using the shared database connection.",
  };
}
