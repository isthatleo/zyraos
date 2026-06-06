// @ts-nocheck
const { expect, request: playwrightRequest, test } = require("@playwright/test");

const baseURL = process.env.E2E_MASTER_BASE_URL || process.env.E2E_BASE_URL || "http://localhost:3000";
const pageTimeout = 45000;
const renderBudgetMs = Number(process.env.E2E_RENDER_BUDGET_MS || 6000);

test.use({ storageState: process.env.E2E_MASTER_STORAGE_STATE || process.env.E2E_STORAGE_STATE || "tests/.auth/master.json" });
test.setTimeout(90000);

test.describe("Master schools production surface", () => {
  test("renders school registry within budget and exposes critical controls", async ({ page }) => {
    const errors = [];
    page.on("console", (message) => {
      if (message.type() === "error" && !message.text().includes("WebSocket") && !message.text().includes("favicon")) errors.push(message.text());
    });

    const startedAt = Date.now();
    await page.goto(`${baseURL}/master/schools`, { waitUntil: "domcontentloaded", timeout: pageTimeout });
    await expect(page.getByRole("heading", { name: /School Registry/i }).first()).toBeVisible({ timeout: pageTimeout });
    expect(Date.now() - startedAt, "schools page should render inside budget").toBeLessThan(renderBudgetMs);

    await expect(page.getByRole("button", { name: /Provision New School/i })).toBeVisible({ timeout: pageTimeout });
    await expect(page.getByPlaceholder(/Search schools/i)).toBeVisible({ timeout: pageTimeout });
    await expect(page.getByRole("button", { name: /Refresh/i })).toBeVisible({ timeout: pageTimeout });
    expect(errors.slice(0, 3)).toEqual([]);
  });

  test("schools API is super-admin gated, tenant registry safe, and validates mutations", async ({ page }) => {
    await page.goto(`${baseURL}/master/schools`, { waitUntil: "domcontentloaded", timeout: pageTimeout });

    const result = await page.evaluate(async () => {
      const response = await fetch("/api/master/schools?limit=25", { credentials: "include", cache: "no-store" });
      const payload = await response.json();
      return {
        status: response.status,
        cache: response.headers.get("x-roxan-cache"),
        schoolsIsArray: Array.isArray(payload.schools),
        stats: payload.stats,
        pagination: payload.pagination,
        hasPortalUrls: (payload.schools || []).every((school) => typeof school.portalUrl === "string" && school.portalUrl.length > 0),
      };
    });

    expect(result.status).toBe(200);
    expect(result.schoolsIsArray).toBe(true);
    expect(result.stats.total).toBeGreaterThanOrEqual(0);
    expect(result.pagination.limit).toBe(25);
    expect(result.hasPortalUrls).toBe(true);

    const invalidCreate = await page.evaluate(async () => {
      const response = await fetch("/api/master/schools", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "", slug: "", country: "", type: "" }),
      });
      return { status: response.status, payload: await response.json() };
    });
    expect(invalidCreate.status).toBe(400);
    expect(invalidCreate.payload.error).toMatch(/missing required fields/i);

    const anonymousContext = await playwrightRequest.newContext({ storageState: { cookies: [], origins: [] } });
    const anonymousList = await anonymousContext.get(`${baseURL}/api/master/schools?limit=25`);
    expect([401, 403]).toContain(anonymousList.status());
    const anonymousCreate = await anonymousContext.post(`${baseURL}/api/master/schools`, {
      data: { name: "Blocked School", slug: "blocked-school", country: "UG", type: "primary" },
    });
    expect([401, 403]).toContain(anonymousCreate.status());
    await anonymousContext.dispose();
  });
});
