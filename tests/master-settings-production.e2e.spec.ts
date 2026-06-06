// @ts-nocheck
const { expect, request: playwrightRequest, test } = require("@playwright/test");

const baseURL = process.env.E2E_MASTER_BASE_URL || process.env.E2E_BASE_URL || "http://localhost:3000";
const pageTimeout = 45000;
const renderBudgetMs = Number(process.env.E2E_RENDER_BUDGET_MS || 6000);

test.use({ storageState: process.env.E2E_MASTER_STORAGE_STATE || process.env.E2E_STORAGE_STATE || "tests/.auth/master.json" });
test.setTimeout(90000);

test.describe("Master settings production surface", () => {
  test("renders settings shell within budget and exposes critical controls", async ({ page }) => {
    const errors = [];
    page.on("console", (message) => {
      if (message.type() === "error" && !message.text().includes("WebSocket") && !message.text().includes("favicon")) errors.push(message.text());
    });

    const startedAt = Date.now();
    await page.goto(`${baseURL}/master/settings`, { waitUntil: "domcontentloaded", timeout: pageTimeout });
    await expect(page.getByRole("heading", { name: /^System Settings$/i })).toBeVisible({ timeout: pageTimeout });
    expect(Date.now() - startedAt, "settings page shell should render inside budget").toBeLessThan(renderBudgetMs);

    await expect(page.getByRole("button", { name: /Refresh/i })).toBeVisible({ timeout: pageTimeout });
    await expect(page.getByRole("button", { name: /Save & Sync/i })).toBeVisible({ timeout: pageTimeout });
    await expect(page.getByRole("button", { name: /General/i })).toBeVisible({ timeout: pageTimeout });
    expect(errors.slice(0, 3)).toEqual([]);
  });

  test("settings APIs are scoped, gated, masked, and validate mutations", async ({ page }) => {
    await page.goto(`${baseURL}/master/settings`, { waitUntil: "domcontentloaded", timeout: pageTimeout });

    const overview = await page.evaluate(async () => {
      const response = await fetch("/api/master/settings", { credentials: "include", cache: "no-store" });
      const payload = await response.json();
      return {
        status: response.status,
        cacheControl: response.headers.get("cache-control"),
        platformName: payload.settings?.platformName,
        publicCurrency: payload.publicSettings?.currency,
        health: payload.platformHealth,
        secretValuesMasked: ["smtpPassword", "resendApiKey", "twilioAuthToken", "ssoClientSecret", "lmsApiKey", "neonApiKey"].every((key) => !payload.settings?.[key] || payload.settings[key] === "********"),
      };
    });
    expect(overview.status).toBe(200);
    expect(overview.cacheControl).toMatch(/private/i);
    expect(overview.platformName).toBeTruthy();
    expect(overview.publicCurrency).toMatch(/^[A-Z]{3}$/);
    expect(overview.health.totalSchools).toBeGreaterThanOrEqual(0);
    expect(overview.secretValuesMasked).toBe(true);

    const publicScope = await playwrightRequest.newContext({ storageState: { cookies: [], origins: [] } });
    const publicResponse = await publicScope.get(`${baseURL}/api/master/settings?scope=public`);
    expect(publicResponse.status()).toBe(200);
    const publicPayload = await publicResponse.json();
    expect(publicPayload.platformName).toBeTruthy();
    expect(publicPayload.resendApiKey).toBeUndefined();

    const anonymousPrivate = await publicScope.get(`${baseURL}/api/master/settings`);
    expect([401, 403]).toContain(anonymousPrivate.status());
    const anonymousEffective = await publicScope.get(`${baseURL}/api/master/settings/effective`);
    expect([401, 403]).toContain(anonymousEffective.status());
    const anonymousIntegrationStatus = await publicScope.get(`${baseURL}/api/master/integrations/status`);
    expect([401, 403]).toContain(anonymousIntegrationStatus.status());
    await publicScope.dispose();

    const invalidCurrency = await page.evaluate(async () => {
      const response = await fetch("/api/master/settings", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: { currency: "BADX" } }),
      });
      return { status: response.status, payload: await response.json() };
    });
    expect(invalidCurrency.status).toBe(400);
    expect(invalidCurrency.payload.error).toMatch(/invalid platform settings/i);

    const unsupportedIntegration = await page.evaluate(async () => {
      const response = await fetch("/api/master/integrations/test", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "not_real" }),
      });
      return { status: response.status, payload: await response.json() };
    });
    expect(unsupportedIntegration.status).toBe(400);
    expect(unsupportedIntegration.payload.error).toMatch(/unsupported integration test type/i);
  });
});
