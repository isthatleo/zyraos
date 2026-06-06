// @ts-nocheck
const { expect, request: playwrightRequest, test } = require("@playwright/test");

const baseURL = process.env.E2E_MASTER_BASE_URL || process.env.E2E_BASE_URL || "http://localhost:3000";
const pageTimeout = 45000;
const renderBudgetMs = Number(process.env.E2E_RENDER_BUDGET_MS || 6000);

test.use({ storageState: process.env.E2E_MASTER_STORAGE_STATE || process.env.E2E_STORAGE_STATE || "tests/.auth/master.json" });
test.setTimeout(90000);

test.describe("Master billing production surface", () => {
  test("renders billing overview within budget and exposes billing controls", async ({ page }) => {
    const errors = [];
    page.on("console", (message) => {
      if (message.type() === "error" && !message.text().includes("WebSocket") && !message.text().includes("favicon")) errors.push(message.text());
    });

    const startedAt = Date.now();
    await page.goto(`${baseURL}/master/billing`, { waitUntil: "domcontentloaded", timeout: pageTimeout });
    await expect(page.getByRole("heading", { name: /Financial Overview/i })).toBeVisible({ timeout: pageTimeout });
    expect(Date.now() - startedAt, "billing overview should render inside budget").toBeLessThan(renderBudgetMs);

    await expect(page.getByRole("link", { name: /View Invoices/i })).toBeVisible({ timeout: pageTimeout });
    await expect(page.getByRole("button", { name: /Refresh/i })).toBeVisible({ timeout: pageTimeout });
    await expect(page.getByRole("button", { name: /New Invoice/i })).toBeVisible({ timeout: pageTimeout });
    expect(errors.slice(0, 3)).toEqual([]);
  });

  test("billing APIs are super-admin gated and validate invoice mutations", async ({ page }) => {
    await page.goto(`${baseURL}/master/billing`, { waitUntil: "domcontentloaded", timeout: pageTimeout });

    const overview = await page.evaluate(async () => {
      const response = await fetch("/api/master/billing", { credentials: "include", cache: "no-store" });
      const payload = await response.json();
      return {
        status: response.status,
        cache: response.headers.get("x-roxan-cache"),
        invoiceCount: payload.metrics?.invoiceCount,
        hasArrays: Array.isArray(payload.recentInvoices) && Array.isArray(payload.revenueTrend) && Array.isArray(payload.agingBuckets),
      };
    });
    expect(overview.status).toBe(200);
    expect(overview.invoiceCount).toBeGreaterThanOrEqual(0);
    expect(overview.hasArrays).toBe(true);

    const invoices = await page.evaluate(async () => {
      const response = await fetch("/api/master/billing/invoices", { credentials: "include", cache: "no-store" });
      const payload = await response.json();
      return {
        status: response.status,
        invoiceCount: (payload.invoices || []).length,
        firstInvoiceId: payload.invoices?.[0]?.id || null,
        hasSummary: Boolean(payload.summary),
      };
    });
    expect(invoices.status).toBe(200);
    expect(invoices.hasSummary).toBe(true);

    if (invoices.firstInvoiceId) {
      const detail = await page.evaluate(async (invoiceId) => {
        const response = await fetch(`/api/master/billing/invoices/${invoiceId}`, { credentials: "include", cache: "no-store" });
        const payload = await response.json();
        return {
          status: response.status,
          invoiceId: payload.invoice?.id,
          invoiceNumber: payload.invoice?.invoiceNumber,
          schoolName: payload.invoice?.schoolName,
        };
      }, invoices.firstInvoiceId);
      expect(detail.status).toBe(200);
      expect(detail.invoiceId).toBe(invoices.firstInvoiceId);
      expect(detail.invoiceNumber).toBeTruthy();
      expect(detail.schoolName).toBeTruthy();
    }

    const invalidCreate = await page.evaluate(async () => {
      const response = await fetch("/api/master/billing/invoices", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schoolId: "", amount: 0, currency: "ZAR" }),
      });
      return { status: response.status, payload: await response.json() };
    });
    expect(invalidCreate.status).toBe(400);
    expect(invalidCreate.payload.error).toMatch(/school and positive amount/i);

    const anonymousContext = await playwrightRequest.newContext({ storageState: { cookies: [], origins: [] } });
    const anonymousOverview = await anonymousContext.get(`${baseURL}/api/master/billing`);
    expect([401, 403]).toContain(anonymousOverview.status());
    const anonymousInvoices = await anonymousContext.get(`${baseURL}/api/master/billing/invoices`);
    expect([401, 403]).toContain(anonymousInvoices.status());
    if (invoices.firstInvoiceId) {
      const anonymousDetail = await anonymousContext.get(`${baseURL}/api/master/billing/invoices/${invoices.firstInvoiceId}`);
      expect([401, 403]).toContain(anonymousDetail.status());
    }
    await anonymousContext.dispose();
  });
});
