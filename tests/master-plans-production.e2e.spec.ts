// @ts-nocheck
const { expect, request: playwrightRequest, test } = require("@playwright/test");

const baseURL = process.env.E2E_MASTER_BASE_URL || process.env.E2E_BASE_URL || "http://localhost:3000";
const pageTimeout = 45000;
const renderBudgetMs = Number(process.env.E2E_RENDER_BUDGET_MS || 6000);

test.use({ storageState: process.env.E2E_MASTER_STORAGE_STATE || process.env.E2E_STORAGE_STATE || "tests/.auth/master.json" });
test.setTimeout(90000);

test.describe("Master subscription plans production surface", () => {
  test("renders subscription catalogue within budget and exposes critical controls", async ({ page }) => {
    const errors = [];
    page.on("console", (message) => {
      if (message.type() === "error" && !message.text().includes("WebSocket") && !message.text().includes("favicon")) errors.push(message.text());
    });

    const startedAt = Date.now();
    await page.goto(`${baseURL}/master/plans`, { waitUntil: "domcontentloaded", timeout: pageTimeout });
    await expect(page.getByRole("heading", { name: /^Subscription Plans$/i })).toBeVisible({ timeout: pageTimeout });
    expect(Date.now() - startedAt, "subscription plans page should render inside budget").toBeLessThan(renderBudgetMs);

    await expect(page.getByRole("button", { name: /Add Plan/i })).toBeVisible({ timeout: pageTimeout });
    await expect(page.getByRole("button", { name: /Refresh/i })).toBeVisible({ timeout: pageTimeout });
    await expect(page.getByPlaceholder(/Search plans/i)).toBeVisible({ timeout: pageTimeout });
    expect(errors.slice(0, 3)).toEqual([]);
  });

  test("plans API is super-admin gated, cache-safe, and validates mutations", async ({ page }) => {
    await page.goto(`${baseURL}/master/plans`, { waitUntil: "domcontentloaded", timeout: pageTimeout });

    const result = await page.evaluate(async () => {
      const response = await fetch("/api/master/plans", { credentials: "include", cache: "no-store" });
      const payload = await response.json();
      return {
        status: response.status,
        cacheControl: response.headers.get("cache-control"),
        plansIsArray: Array.isArray(payload.plans),
        metrics: payload.metrics,
        firstPlanId: payload.plans?.[0]?.id || null,
        hasDisplayCurrency: (payload.plans || []).every((plan) => typeof plan.displayCurrency === "string" && plan.displayCurrency.length === 3),
      };
    });

    expect(result.status).toBe(200);
    expect(result.cacheControl).toMatch(/private/i);
    expect(result.plansIsArray).toBe(true);
    expect(result.metrics.total).toBeGreaterThanOrEqual(0);
    expect(result.metrics.active).toBeGreaterThanOrEqual(0);
    expect(result.hasDisplayCurrency).toBe(true);

    if (result.firstPlanId) {
      const detail = await page.evaluate(async (planId) => {
        const response = await fetch(`/api/master/plans/${planId}`, { credentials: "include", cache: "no-store" });
        const payload = await response.json();
        return {
          status: response.status,
          planId: payload.plan?.id,
          subscriptionsIsArray: Array.isArray(payload.subscriptions),
          invoicesIsArray: Array.isArray(payload.invoices),
        };
      }, result.firstPlanId);
      expect(detail.status).toBe(200);
      expect(detail.planId).toBe(result.firstPlanId);
      expect(detail.subscriptionsIsArray).toBe(true);
      expect(detail.invoicesIsArray).toBe(true);
    }

    const invalidCreate = await page.evaluate(async () => {
      const response = await fetch("/api/master/plans", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: "", name: "", price: -10, currency: "BAD-CURRENCY" }),
      });
      return { status: response.status, payload: await response.json() };
    });
    expect(invalidCreate.status).toBe(400);
    expect(invalidCreate.payload.error).toMatch(/required|negative|currency/i);

    const anonymousContext = await playwrightRequest.newContext({ storageState: { cookies: [], origins: [] } });
    const anonymousList = await anonymousContext.get(`${baseURL}/api/master/plans`);
    expect([401, 403]).toContain(anonymousList.status());
    const anonymousCreate = await anonymousContext.post(`${baseURL}/api/master/plans`, {
      data: { id: "blocked-plan", name: "Blocked Plan", price: 10, currency: "ZAR" },
    });
    expect([401, 403]).toContain(anonymousCreate.status());
    if (result.firstPlanId) {
      const anonymousDetail = await anonymousContext.get(`${baseURL}/api/master/plans/${result.firstPlanId}`);
      expect([401, 403]).toContain(anonymousDetail.status());
    }
    await anonymousContext.dispose();
  });
});
