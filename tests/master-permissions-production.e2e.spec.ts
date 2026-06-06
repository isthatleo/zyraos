// @ts-nocheck
const { expect, request: playwrightRequest, test } = require("@playwright/test");

const baseURL = process.env.E2E_MASTER_BASE_URL || process.env.E2E_BASE_URL || "http://localhost:3000";
const pageTimeout = 45000;
const renderBudgetMs = Number(process.env.E2E_RENDER_BUDGET_MS || 6000);

test.use({ storageState: process.env.E2E_MASTER_STORAGE_STATE || process.env.E2E_STORAGE_STATE || "tests/.auth/master.json" });
test.setTimeout(90000);

test.describe("Master permissions production surface", () => {
  test("renders permissions manager within budget and exposes critical controls", async ({ page }) => {
    const errors = [];
    page.on("console", (message) => {
      if (message.type() === "error" && !message.text().includes("WebSocket") && !message.text().includes("favicon")) errors.push(message.text());
    });

    const startedAt = Date.now();
    await page.goto(`${baseURL}/master/permissions`, { waitUntil: "domcontentloaded", timeout: pageTimeout });
    await expect(page.getByRole("heading", { name: /Global Permissions Manager/i })).toBeVisible({ timeout: pageTimeout });
    expect(Date.now() - startedAt, "permissions page shell should render inside budget").toBeLessThan(renderBudgetMs);

    await expect(page.getByRole("button", { name: /Refresh/i })).toBeVisible({ timeout: pageTimeout });
    await expect(page.getByPlaceholder(/Search global roles/i)).toBeVisible({ timeout: pageTimeout });
    await expect(page.getByText(/Owner/i).first()).toBeVisible({ timeout: pageTimeout });
    expect(errors.slice(0, 3)).toEqual([]);
  });

  test("permissions API is super-admin gated and validates role mutations", async ({ page }) => {
    await page.goto(`${baseURL}/master/permissions`, { waitUntil: "domcontentloaded", timeout: pageTimeout });

    const overview = await page.evaluate(async () => {
      const response = await fetch("/api/master/permissions", { credentials: "include", cache: "no-store" });
      const payload = await response.json();
      return {
        status: response.status,
        cacheControl: response.headers.get("cache-control"),
        groups: payload.groups?.length,
        roles: payload.roles?.length,
        permissions: payload.summary?.permissions,
        owner: payload.roles?.find((role) => role.id === "owner"),
      };
    });
    expect(overview.status).toBe(200);
    expect(overview.cacheControl).toMatch(/private/i);
    expect(overview.groups).toBeGreaterThan(0);
    expect(overview.roles).toBeGreaterThan(0);
    expect(overview.permissions).toBeGreaterThan(0);
    expect(overview.owner?.selectedPermissions).toContain("permissions");

    const ownerWithoutPermissionManagement = await page.evaluate(async () => {
      const response = await fetch("/api/master/permissions", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roleId: "owner", selectedPermissions: ["dashboard"] }),
      });
      return { status: response.status, payload: await response.json() };
    });
    expect(ownerWithoutPermissionManagement.status).toBe(400);
    expect(ownerWithoutPermissionManagement.payload.error).toMatch(/retain permission management/i);

    const unknownPermission = await page.evaluate(async () => {
      const response = await fetch("/api/master/permissions", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roleId: "teacher", selectedPermissions: ["dashboard", "not_a_real_permission"] }),
      });
      return { status: response.status, payload: await response.json() };
    });
    expect(unknownPermission.status).toBe(400);
    expect(unknownPermission.payload.error).toMatch(/unknown permission ids/i);

    const anonymousContext = await playwrightRequest.newContext({ storageState: { cookies: [], origins: [] } });
    const anonymousOverview = await anonymousContext.get(`${baseURL}/api/master/permissions`);
    expect([401, 403]).toContain(anonymousOverview.status());
    const anonymousPatch = await anonymousContext.patch(`${baseURL}/api/master/permissions`, {
      data: { roleId: "teacher", selectedPermissions: ["dashboard"] },
    });
    expect([401, 403]).toContain(anonymousPatch.status());
    await anonymousContext.dispose();
  });
});
