// @ts-nocheck
const { expect, request: playwrightRequest, test } = require("@playwright/test");

const baseURL = process.env.E2E_MASTER_BASE_URL || process.env.E2E_BASE_URL || "http://localhost:3000";
const pageTimeout = 45000;
const renderBudgetMs = Number(process.env.E2E_RENDER_BUDGET_MS || 6000);

test.use({ storageState: process.env.E2E_MASTER_STORAGE_STATE || process.env.E2E_STORAGE_STATE || "tests/.auth/master.json" });
test.setTimeout(90000);

test.describe("Master activity log production surface", () => {
  test("renders activity log within budget and exposes critical controls", async ({ page }) => {
    const errors = [];
    page.on("console", (message) => {
      if (message.type() === "error" && !message.text().includes("WebSocket") && !message.text().includes("favicon")) errors.push(message.text());
    });

    const startedAt = Date.now();
    await page.goto(`${baseURL}/master/activity`, { waitUntil: "domcontentloaded", timeout: pageTimeout });
    await expect(page.getByRole("heading", { name: /^Activity Log$/i })).toBeVisible({ timeout: pageTimeout });
    expect(Date.now() - startedAt, "activity log page should render inside budget").toBeLessThan(renderBudgetMs);

    await expect(page.getByRole("button", { name: /Refresh/i })).toBeVisible({ timeout: pageTimeout });
    await expect(page.getByRole("button", { name: /Export CSV/i })).toBeVisible({ timeout: pageTimeout });
    await expect(page.getByRole("button", { name: /Export JSON/i })).toBeVisible({ timeout: pageTimeout });
    await expect(page.getByPlaceholder(/Search users, action, resource/i)).toBeVisible({ timeout: pageTimeout });
    expect(errors.slice(0, 3)).toEqual([]);
  });

  test("activity APIs are super-admin gated, exportable, and validate export formats", async ({ page }) => {
    await page.goto(`${baseURL}/master/activity`, { waitUntil: "domcontentloaded", timeout: pageTimeout });

    const overview = await page.evaluate(async () => {
      const response = await fetch("/api/master/activity?limit=25", { credentials: "include", cache: "no-store" });
      const payload = await response.json();
      return {
        status: response.status,
        cacheControl: response.headers.get("cache-control"),
        logsIsArray: Array.isArray(payload.logs),
        total: payload.summary?.total,
        hasFacets: Boolean(payload.facets?.statuses && payload.facets?.resources && payload.facets?.actions),
        hasPagination: Boolean(payload.pagination),
      };
    });
    expect(overview.status).toBe(200);
    expect(overview.cacheControl).toMatch(/private/i);
    expect(overview.logsIsArray).toBe(true);
    expect(overview.total).toBeGreaterThanOrEqual(0);
    expect(overview.hasFacets).toBe(true);
    expect(overview.hasPagination).toBe(true);

    const csvExport = await page.evaluate(async () => {
      const response = await fetch("/api/master/activity?export=csv", { credentials: "include", cache: "no-store" });
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
    expect(csvExport.disposition).toMatch(/roxan-activity-log/i);
    expect(csvExport.textStart).toContain("Timestamp");

    const jsonExport = await page.evaluate(async () => {
      const response = await fetch("/api/master/activity?export=json", { credentials: "include", cache: "no-store" });
      const payload = await response.json();
      return {
        status: response.status,
        disposition: response.headers.get("content-disposition"),
        logsIsArray: Array.isArray(payload.logs),
        hasSummary: Boolean(payload.summary),
      };
    });
    expect(jsonExport.status).toBe(200);
    expect(jsonExport.disposition).toMatch(/roxan-activity-log/i);
    expect(jsonExport.logsIsArray).toBe(true);
    expect(jsonExport.hasSummary).toBe(true);

    const invalidExport = await page.evaluate(async () => {
      const response = await fetch("/api/master/activity?export=pdf", { credentials: "include", cache: "no-store" });
      return { status: response.status, payload: await response.json() };
    });
    expect(invalidExport.status).toBe(400);
    expect(invalidExport.payload.error).toMatch(/unsupported export format/i);

    const anonymousContext = await playwrightRequest.newContext({ storageState: { cookies: [], origins: [] } });
    const anonymousList = await anonymousContext.get(`${baseURL}/api/master/activity?limit=25`);
    expect([401, 403]).toContain(anonymousList.status());
    const anonymousCsv = await anonymousContext.get(`${baseURL}/api/master/activity?export=csv`);
    expect([401, 403]).toContain(anonymousCsv.status());
    const anonymousDelete = await anonymousContext.delete(`${baseURL}/api/master/activity`);
    expect([401, 403]).toContain(anonymousDelete.status());
    await anonymousContext.dispose();
  });

  test("legacy audit route redirects to the production activity log", async ({ page }) => {
    await page.goto(`${baseURL}/master/audit`, { waitUntil: "domcontentloaded", timeout: pageTimeout });
    await expect(page).toHaveURL(/\/master\/activity$/);
    await expect(page.getByRole("heading", { name: /^Activity Log$/i })).toBeVisible({ timeout: pageTimeout });
  });
});
