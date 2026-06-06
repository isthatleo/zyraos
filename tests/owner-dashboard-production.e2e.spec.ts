// @ts-nocheck
const { expect, request: playwrightRequest, test } = require("@playwright/test");

const tenantSlug = process.env.E2E_TENANT_SLUG || "asake";
const baseURL = process.env.E2E_BASE_URL || `http://${tenantSlug}.localhost:3000`;
const pageTimeout = 45000;
const renderBudgetMs = Number(process.env.E2E_RENDER_BUDGET_MS || 6000);

test.use({ storageState: process.env.E2E_STORAGE_STATE || "tests/.auth/owner.json" });
test.setTimeout(90000);

test.describe("Owner dashboard production surface", () => {
  test("renders owner dashboard shell within budget and loads tenant data", async ({ page }) => {
    const errors = [];
    page.on("console", (message) => {
      if (message.type() === "error" && !message.text().includes("WebSocket") && !message.text().includes("favicon")) errors.push(message.text());
    });

    const startedAt = Date.now();
    await page.goto(`${baseURL}/owner/dashboard`, { waitUntil: "domcontentloaded", timeout: pageTimeout });
    await expect(page.getByRole("heading", { name: /Owner Command Centre/i })).toBeVisible({ timeout: pageTimeout });
    expect(Date.now() - startedAt, "owner dashboard shell should render inside budget").toBeLessThan(renderBudgetMs);

    await expect(page.getByText(/Executive view for|Loading tenant-scoped analytics/i).first()).toBeVisible({ timeout: pageTimeout });
    await expect(page.getByRole("button", { name: /Create Staff Account/i }).first()).toBeVisible({ timeout: pageTimeout });
    expect(errors.slice(0, 3)).toEqual([]);
  });

  test("owner dashboard API is tenant-scoped and owner-gated", async ({ page }) => {
    await page.goto(`${baseURL}/owner/dashboard`, { waitUntil: "domcontentloaded", timeout: pageTimeout });

    const result = await page.evaluate(async (tenant) => {
      const response = await fetch(`/api/tenant/dashboard?slug=${tenant}&portal=owner`, { credentials: "include", cache: "no-store" });
      const payload = await response.json();
      return {
        status: response.status,
        schoolSlug: payload.school?.slug,
        totalStaff: payload.kpis?.totalStaff,
        ownerCount: payload.kpis?.ownerCount,
        adminCount: payload.kpis?.adminCount,
      };
    }, tenantSlug);

    expect(result.status).toBe(200);
    expect(result.schoolSlug).toBe(tenantSlug);
    expect(result.ownerCount).toBeGreaterThanOrEqual(1);
    expect(result.totalStaff).toBeGreaterThanOrEqual(result.ownerCount + result.adminCount);

    const anonymousContext = await playwrightRequest.newContext({ storageState: { cookies: [], origins: [] } });
    const anonymous = await anonymousContext.get(`${baseURL}/api/tenant/dashboard?slug=${tenantSlug}&portal=owner`);
    expect([401, 403]).toContain(anonymous.status());
    await anonymousContext.dispose();
  });
});
