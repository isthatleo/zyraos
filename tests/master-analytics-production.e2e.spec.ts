// @ts-nocheck
const { expect, request: playwrightRequest, test } = require("@playwright/test");

const baseURL = process.env.E2E_MASTER_BASE_URL || process.env.E2E_BASE_URL || "http://localhost:3000";
const pageTimeout = 45000;
const renderBudgetMs = Number(process.env.E2E_RENDER_BUDGET_MS || 6000);

test.use({ storageState: process.env.E2E_MASTER_STORAGE_STATE || process.env.E2E_STORAGE_STATE || "tests/.auth/master.json" });
test.setTimeout(90000);

test.describe("Master system analytics production surface", () => {
  test("renders analytics shell within budget and exposes critical controls", async ({ page }) => {
    const errors = [];
    page.on("console", (message) => {
      if (message.type() === "error" && !message.text().includes("WebSocket") && !message.text().includes("favicon")) errors.push(message.text());
    });

    const startedAt = Date.now();
    await page.goto(`${baseURL}/master/analytics`, { waitUntil: "domcontentloaded", timeout: pageTimeout });
    await expect(page.getByRole("heading", { name: /Ecosystem Analytics/i })).toBeVisible({ timeout: pageTimeout });
    expect(Date.now() - startedAt, "analytics page should render inside budget").toBeLessThan(renderBudgetMs);

    await expect(page.getByRole("button", { name: /Export CSV/i })).toBeVisible({ timeout: pageTimeout });
    await expect(page.getByRole("button", { name: /Export JSON/i })).toBeVisible({ timeout: pageTimeout });
    await expect(page.getByRole("button", { name: /Refresh Data/i })).toBeVisible({ timeout: pageTimeout });
    expect(errors.slice(0, 3)).toEqual([]);
  });

  test("analytics APIs are super-admin gated and exports are functional", async ({ page }) => {
    await page.goto(`${baseURL}/master/analytics`, { waitUntil: "domcontentloaded", timeout: pageTimeout });

    const overview = await page.evaluate(async () => {
      const response = await fetch("/api/master/analytics", { credentials: "include", cache: "no-store" });
      const payload = await response.json();
      return {
        status: response.status,
        cacheControl: response.headers.get("cache-control"),
        generatedAt: payload.generatedAt,
        totalSchools: payload.stats?.totalSchools,
        hasSeries: Array.isArray(payload.revenueTrend) && Array.isArray(payload.schoolGrowth),
        hasOperations: Boolean(payload.operations?.databaseSize),
      };
    });
    expect(overview.status).toBe(200);
    expect(overview.cacheControl).toMatch(/private/i);
    expect(overview.generatedAt).toBeTruthy();
    expect(overview.totalSchools).toBeGreaterThanOrEqual(0);
    expect(overview.hasSeries).toBe(true);
    expect(overview.hasOperations).toBe(true);

    const csvExport = await page.evaluate(async () => {
      const response = await fetch("/api/master/analytics?export=csv", { credentials: "include", cache: "no-store" });
      const text = await response.text();
      return {
        status: response.status,
        contentType: response.headers.get("content-type"),
        disposition: response.headers.get("content-disposition"),
        textStart: text.slice(0, 80),
      };
    });
    expect(csvExport.status).toBe(200);
    expect(csvExport.contentType).toMatch(/text\/csv/i);
    expect(csvExport.disposition).toMatch(/roxan-system-analytics/i);
    expect(csvExport.textStart).toContain("Section");

    const jsonExport = await page.evaluate(async () => {
      const response = await fetch("/api/master/analytics?export=json", { credentials: "include", cache: "no-store" });
      const payload = await response.json();
      return {
        status: response.status,
        disposition: response.headers.get("content-disposition"),
        generatedAt: payload.generatedAt,
        hasStats: Boolean(payload.stats),
      };
    });
    expect(jsonExport.status).toBe(200);
    expect(jsonExport.disposition).toMatch(/roxan-system-analytics/i);
    expect(jsonExport.generatedAt).toBeTruthy();
    expect(jsonExport.hasStats).toBe(true);

    const anonymousContext = await playwrightRequest.newContext({ storageState: { cookies: [], origins: [] } });
    const anonymousOverview = await anonymousContext.get(`${baseURL}/api/master/analytics`);
    expect([401, 403]).toContain(anonymousOverview.status());
    const anonymousCsv = await anonymousContext.get(`${baseURL}/api/master/analytics?export=csv`);
    expect([401, 403]).toContain(anonymousCsv.status());
    const anonymousJson = await anonymousContext.get(`${baseURL}/api/master/analytics?export=json`);
    expect([401, 403]).toContain(anonymousJson.status());
    await anonymousContext.dispose();
  });
});
