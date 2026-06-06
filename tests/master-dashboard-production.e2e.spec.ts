// @ts-nocheck
const { expect, request: playwrightRequest, test } = require("@playwright/test");

const baseURL = process.env.E2E_MASTER_BASE_URL || process.env.E2E_BASE_URL || "http://localhost:3000";
const pageTimeout = 45000;
const renderBudgetMs = Number(process.env.E2E_RENDER_BUDGET_MS || 6000);

test.use({ storageState: process.env.E2E_MASTER_STORAGE_STATE || process.env.E2E_STORAGE_STATE || "tests/.auth/master.json" });
test.setTimeout(90000);

test.describe("Master dashboard production surface", () => {
  test("renders master dashboard shell within budget and exposes critical controls", async ({ page }) => {
    const errors = [];
    page.on("console", (message) => {
      if (message.type() === "error" && !message.text().includes("WebSocket") && !message.text().includes("favicon")) errors.push(message.text());
    });

    const startedAt = Date.now();
    await page.goto(`${baseURL}/master/dashboard`, { waitUntil: "domcontentloaded", timeout: pageTimeout });
    await expect(page.getByRole("heading", { name: /Master Dashboard/i })).toBeVisible({ timeout: pageTimeout });
    expect(Date.now() - startedAt, "master dashboard should render inside budget").toBeLessThan(renderBudgetMs);

    await expect(page.getByRole("link", { name: /Manage Schools/i })).toBeVisible({ timeout: pageTimeout });
    await expect(page.getByRole("button", { name: /Refresh/i })).toBeVisible({ timeout: pageTimeout });
    await expect(page.getByText(/Overview of all schools/i)).toBeVisible({ timeout: pageTimeout });
    expect(errors.slice(0, 3)).toEqual([]);
  });

  test("master dashboard API is super-admin gated and returns platform data", async ({ page }) => {
    await page.goto(`${baseURL}/master/dashboard`, { waitUntil: "domcontentloaded", timeout: pageTimeout });

    const result = await page.evaluate(async () => {
      const response = await fetch("/api/master/dashboard", { credentials: "include", cache: "no-store" });
      const payload = await response.json();
      return {
        status: response.status,
        totalSchools: payload.stats?.totalSchools,
        platformAdmins: payload.stats?.platformAdmins,
        hasArrays:
          Array.isArray(payload.recentSchools) &&
          Array.isArray(payload.revenueTrend) &&
          Array.isArray(payload.recentInvoices) &&
          Array.isArray(payload.alerts),
      };
    });

    expect(result.status).toBe(200);
    expect(result.totalSchools).toBeGreaterThanOrEqual(0);
    expect(result.platformAdmins).toBeGreaterThanOrEqual(1);
    expect(result.hasArrays).toBe(true);

    const anonymousContext = await playwrightRequest.newContext({ storageState: { cookies: [], origins: [] } });
    const anonymous = await anonymousContext.get(`${baseURL}/api/master/dashboard`);
    expect([401, 403]).toContain(anonymous.status());
    await anonymousContext.dispose();
  });
});
