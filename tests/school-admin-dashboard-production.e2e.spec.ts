// @ts-nocheck
const { expect, test } = require("@playwright/test");

const tenantSlug = process.env.E2E_TENANT_SLUG || "asake";
const baseURL = process.env.E2E_BASE_URL || `http://${tenantSlug}.localhost:3000`;
const adminEmail = process.env.E2E_SCHOOL_ADMIN_EMAIL || "admin@test.com";
const adminPassword = process.env.E2E_SCHOOL_ADMIN_PASSWORD || "Myname@78";
const pageTimeout = 45000;
const warmupTimeout = 120000;
const renderBudgetMs = Number(process.env.E2E_RENDER_BUDGET_MS || 6000);

const routes = [
  { path: "/admin/dashboard", heading: /School Admin Command Center|Dashboard/i },
  { path: "/admin/admissions", heading: /^Admissions$/i },
  { path: "/admin/admissions/new", heading: /New Admission Application/i },
  { path: "/admin/students", heading: /Student Profiles/i },
  { path: "/admin/students/new", heading: /Register New Student/i },
  { path: "/admin/documentation", heading: /^Documentation$/i },
  { path: "/admin/promotion", heading: /^Promotion$/i },
  { path: "/admin/alumni", heading: /^Alumni$/i },
  { path: "/admin/classes", heading: /^Classes$/i },
  { path: "/admin/subjects", heading: /^Subjects$/i },
  { path: "/admin/timetable", heading: /^Timetable$/i },
  { path: "/admin/curriculum", heading: /^Curriculum$/i },
  { path: "/admin/attendance", heading: /Attendance/i },
  { path: "/admin/exams", heading: /Exams|Examination/i },
  { path: "/admin/library", heading: /^Library$/i },
  { path: "/admin/messages", heading: /^Messages$/i },
  { path: "/admin/broadcasts", heading: /^Broadcasts$/i },
  { path: "/admin/announcements", heading: /^Announcements$/i },
  { path: "/admin/sms-reports", heading: /SMS Reports/i },
  { path: "/admin/billing", heading: /^Billing$/i },
  { path: "/admin/audit", heading: /Audit|Logs/i },
  { path: "/admin/users", heading: /^Users$/i },
  { path: "/admin/permissions", heading: /^Permissions$/i },
  { path: "/admin/staff", heading: /Staff Management|Staff/i },
  { path: "/admin/settings", heading: /^Settings$/i },
  { path: "/admin/profile", heading: /Profile/i },
  { path: "/admin/user-settings", heading: /User Settings|Settings/i },
];

test.setTimeout(420000);

async function loginAsSchoolAdmin(page) {
  await page.goto(`${baseURL}/admins?role=school_admin`, { waitUntil: "domcontentloaded", timeout: pageTimeout });
  await page.getByLabel(/email/i).fill(adminEmail);
  await page.getByLabel(/password/i).fill(adminPassword);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL(/\/admin\/dashboard|\/complete-access/, { timeout: pageTimeout });
  if (page.url().includes("/complete-access")) {
    throw new Error("School admin account requires complete-access password setup before E2E can run.");
  }
  await expect(page.getByText(/School Admin|Command Center|Dashboard/i).first()).toBeVisible({ timeout: pageTimeout });
}

test.describe("School admin dashboard production E2E", () => {
  test("all school admin pages render inside the 6 second budget and enforce tenant-admin API access", async ({ page, request }) => {
    const consoleErrors = [];
    page.on("console", (message) => {
      const text = message.text();
      if (message.type() === "error" && !/WebSocket|socket\.io|favicon|ERR_CONNECTION_REFUSED/.test(text)) consoleErrors.push(text);
    });

    await loginAsSchoolAdmin(page);

    for (const route of routes) {
      await page.goto(`${baseURL}${route.path}`, { waitUntil: "domcontentloaded", timeout: warmupTimeout });
    }
    await page.waitForTimeout(3000);

    const timings = [];
    const overBudget = [];
    const failures = [];
    for (const route of routes) {
      const startedAt = Date.now();
      try {
        await page.goto(`${baseURL}${route.path}`, { waitUntil: "domcontentloaded", timeout: pageTimeout });
        await expect(page.getByRole("heading", { name: route.heading }).first()).toBeVisible({ timeout: pageTimeout });
        await expect(page.locator("body")).not.toContainText(/404|This page could not be found|Application error/i, { timeout: 1000 });
        const elapsed = Date.now() - startedAt;
        timings.push({ path: route.path, ms: elapsed });
        if (elapsed >= renderBudgetMs) overBudget.push({ path: route.path, ms: elapsed });
      } catch (error) {
        const elapsed = Date.now() - startedAt;
        const message = error instanceof Error ? error.message : String(error);
        timings.push({ path: route.path, ms: elapsed, error: message.split("\n")[0] });
        failures.push({ path: route.path, ms: elapsed, error: message.split("\n")[0] });
      }
    }

    console.log(`School admin render timings: ${JSON.stringify(timings)}`);
    expect(failures, `Route render failures: ${JSON.stringify(failures)}`).toEqual([]);
    expect(consoleErrors.slice(0, 5)).toEqual([]);
    expect(overBudget, `Pages over ${renderBudgetMs}ms: ${JSON.stringify(overBudget)}`).toEqual([]);

    const authed = await page.evaluate(async (tenant) => {
      const response = await fetch(`/api/tenant/dashboard?slug=${tenant}`, { cache: "no-store", credentials: "include" });
      const payload = await response.json().catch(() => ({}));
      return { status: response.status, slug: payload.school?.slug, totalStudents: payload.kpis?.totalStudents };
    }, tenantSlug);
    expect(authed.status).toBe(200);
    expect(authed.slug).toBe(tenantSlug);
    expect(authed.totalStudents).toBeGreaterThanOrEqual(0);

    const anonymous = await request.get(`http://localhost:3000/api/tenant/dashboard?slug=${tenantSlug}`);
    expect([401, 403]).toContain(anonymous.status());
  });
});
