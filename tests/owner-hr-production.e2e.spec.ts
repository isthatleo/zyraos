// @ts-nocheck
const { expect, request: playwrightRequest, test } = require("@playwright/test");

const tenantSlug = process.env.E2E_TENANT_SLUG || "asake";
const baseURL = process.env.E2E_BASE_URL || `http://${tenantSlug}.localhost:3000`;
const pageTimeout = 45000;
const renderBudgetMs = Number(process.env.E2E_RENDER_BUDGET_MS || 6000);

test.use({ storageState: process.env.E2E_STORAGE_STATE || "tests/.auth/owner.json" });
test.setTimeout(90000);

async function expectPageReady(page, path, heading) {
  const errors = [];
  page.removeAllListeners("console");
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  const startedAt = Date.now();
  await page.goto(`${baseURL}${path}`, { waitUntil: "domcontentloaded", timeout: pageTimeout });
  await expect(page.getByRole("heading", { name: heading }).first()).toBeVisible({ timeout: pageTimeout });
  const elapsed = Date.now() - startedAt;
  expect(elapsed, `${path} should render inside ${renderBudgetMs}ms`).toBeLessThan(renderBudgetMs);
  expect(errors.filter((item) => !item.includes("WebSocket") && !item.includes("favicon")).slice(0, 3)).toEqual([]);
}

test.describe("Owner HR production surfaces", () => {
  test("staff, HR, attendance, leave, and payroll render within budget", async ({ page }) => {
    await expectPageReady(page, "/owner/staff", /Owner Staff Management/i);
    await expectPageReady(page, "/owner/hr", /Owner HR Dashboard/i);
    await expectPageReady(page, "/owner/staff-attendance", /Staff Attendance/i);
    await expectPageReady(page, "/owner/leave", /Leave Management/i);
    await expectPageReady(page, "/owner/payroll", /^Payroll$/i);
  });

  test("critical owner HR actions are exposed", async ({ page }) => {
    await page.goto(`${baseURL}/owner/staff`, { waitUntil: "domcontentloaded", timeout: pageTimeout });
    await expect(page.getByRole("button", { name: /Create Staff/i })).toBeVisible({ timeout: pageTimeout });
    await expect(page.getByRole("button", { name: /Permissions/i })).toBeVisible({ timeout: pageTimeout });

    await page.goto(`${baseURL}/owner/leave`, { waitUntil: "domcontentloaded", timeout: pageTimeout });
    await expect(page.getByRole("button", { name: /New leave/i })).toBeVisible({ timeout: pageTimeout });
    await expect(page.getByRole("button", { name: /Attendance view/i })).toBeVisible({ timeout: pageTimeout });

    await page.goto(`${baseURL}/owner/payroll`, { waitUntil: "domcontentloaded", timeout: pageTimeout });
    await expect(page.getByRole("button", { name: /New payroll/i })).toBeVisible({ timeout: pageTimeout });
    await expect(page.getByRole("button", { name: /Finance overview/i })).toBeVisible({ timeout: pageTimeout });

    await page.goto(`${baseURL}/owner/staff-attendance`, { waitUntil: "domcontentloaded", timeout: pageTimeout });
    await expect(page.getByRole("tab", { name: /Directory/i })).toBeVisible({ timeout: pageTimeout });
    await expect(page.getByRole("tab", { name: /Leave Queue/i })).toBeVisible({ timeout: pageTimeout });
  });

  test("owner HR APIs are tenant-scoped, owner-gated, and reject invalid mutations", async ({ page }) => {
    const anonymousContext = await playwrightRequest.newContext({ storageState: { cookies: [], origins: [] } });
    const endpoints = [
      { path: "/api/tenant/owner/staff", collection: "staff", roleField: "roleId" },
      { path: "/api/tenant/owner/hr", collection: "staff", roleField: "roleId" },
      { path: "/api/tenant/owner/staff-attendance", collection: "staff", roleField: "roleId" },
      { path: "/api/tenant/owner/leave", collection: "staff", roleField: "roleId" },
      { path: "/api/tenant/owner/payroll", collection: "staff", roleField: "roleId" },
    ];

    await page.goto(`${baseURL}/owner/staff`, { waitUntil: "domcontentloaded", timeout: pageTimeout });
    for (const endpoint of endpoints) {
      const result = await page.evaluate(
        async ({ path, collection, roleField, tenant }) => {
          const response = await fetch(`${path}?tenant=${tenant}`, { credentials: "include", cache: "no-store" });
          const payload = await response.json();
          const rows = payload[collection] || [];
          return {
            status: response.status,
            schoolSlug: payload.school?.slug,
            count: rows.length,
            hasPlatformRole: rows.some((row) => ["super_admin", "master", "platform_admin"].includes(String(row[roleField] || "").toLowerCase())),
          };
        },
        { ...endpoint, tenant: tenantSlug }
      );

      expect(result.status, `${endpoint.path} should load`).toBe(200);
      expect(result.schoolSlug, `${endpoint.path} should resolve tenant`).toBe(tenantSlug);
      expect(result.hasPlatformRole, `${endpoint.path} should exclude platform users`).toBe(false);

      const anonymous = await anonymousContext.get(`${baseURL}${endpoint.path}?tenant=${tenantSlug}`);
      expect([401, 403], `${endpoint.path} should require an owner session`).toContain(anonymous.status());
    }

    const invalidLeave = await page.evaluate(async (tenant) => {
      const response = await fetch(`/api/tenant/owner/leave?tenant=${tenant}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          staffId: "missing-staff-record",
          leaveType: "annual",
          startDate: "2026-07-01",
          endDate: "2026-07-02",
          status: "pending",
        }),
      });
      return { status: response.status, payload: await response.json() };
    }, tenantSlug);
    expect(invalidLeave.status).toBe(404);
    expect(invalidLeave.payload.error).toMatch(/staff member/i);

    const invalidPayroll = await page.evaluate(async (tenant) => {
      const response = await fetch(`/api/tenant/owner/payroll?tenant=${tenant}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          staffId: "missing-staff-record",
          period: "monthly",
          month: "2026-07",
          basicSalary: 1000,
          allowances: 0,
          deductions: 0,
          status: "pending",
        }),
      });
      return { status: response.status, payload: await response.json() };
    }, tenantSlug);
    expect(invalidPayroll.status).toBe(404);
    expect(invalidPayroll.payload.error).toMatch(/staff member/i);
    await anonymousContext.dispose();
  });
});
