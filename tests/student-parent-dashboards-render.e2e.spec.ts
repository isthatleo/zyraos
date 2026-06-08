// @ts-nocheck
const { expect, test } = require("@playwright/test");

const tenantSlug = process.env.E2E_TENANT_SLUG || "asake";
const baseURL = process.env.E2E_BASE_URL || `http://${tenantSlug}.localhost:3000`;
const password = process.env.E2E_STUDENT_PARENT_PASSWORD || "Myname@78";
const renderBudgetMs = Number(process.env.E2E_RENDER_BUDGET_MS || 6000);
const pageTimeout = 45000;
const warmupTimeout = 90000;

const studentEmail = process.env.E2E_STUDENT_EMAIL || "student@test.com";
const parentEmail = process.env.E2E_PARENT_EMAIL || "parent@test.com";

const studentRoutes = [
  { path: "/student/dashboard", marker: /Dashboard|Student Command Center|Welcome/i },
  { path: "/student/subjects", marker: /Subjects|Course Units/i },
  { path: "/student/exams", marker: /Exams|Results/i },
  { path: "/student/assessments", marker: /Assessments/i },
  { path: "/student/assignments", marker: /Assignments/i },
  { path: "/student/performance", marker: /Performance/i },
  { path: "/student/resources", marker: /Learning Resources|Resources/i },
  { path: "/student/timetable", marker: /Schedule|Timetable/i },
  { path: "/student/attendance", marker: /Attendance/i },
  { path: "/student/finance", marker: /Student Finance|Finance Office/i },
  { path: "/student/refunds", marker: /My Refunds|Refund Readiness/i },
  { path: "/student/communication", marker: /Student Communication|Student Messages/i },
  { path: "/student/messages", marker: /Messages/i },
  { path: "/student/notifications", marker: /Notifications/i },
  { path: "/student/profile", marker: /Profile/i },
  { path: "/student/settings", marker: /Settings/i },
];

const parentRoutes = [
  { path: "/parent/dashboard", marker: /Parent|Dashboard|Command/i },
  { path: "/parent/children", marker: /My Children|Linked Children/i },
  { path: "/parent/attendance", marker: /Attendance/i },
  { path: "/parent/finance", marker: /Fees|Parent Finance Command Center/i },
  { path: "/parent/messages", marker: /Messages|Parent Inbox/i },
  { path: "/parent/communication", marker: /Messages|Parent Inbox|Communication/i },
  { path: "/parent/notifications", marker: /Notifications/i },
  { path: "/parent/profile", marker: /Profile/i },
  { path: "/parent/settings", marker: /Settings/i },
];

test.setTimeout(600000);

async function loginThroughTenantPortal(page, role, email) {
  const startedAt = Date.now();
  await page.goto(`${baseURL}/student-parent?role=${role}`, { waitUntil: "domcontentloaded", timeout: pageTimeout });
  await page.getByRole("button", { name: new RegExp(`Login as .*${role === "parent" ? "Parent" : "Student"}`, "i") }).click();
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL(new RegExp(`/${role}/dashboard|/complete-access`), { timeout: pageTimeout });
  if (page.url().includes("/complete-access")) {
    throw new Error(`${role} account requires complete-access password setup before E2E can run.`);
  }
  await expect(page.locator("h1").first()).toBeVisible({ timeout: pageTimeout });
  return Date.now() - startedAt;
}

async function assertRoutesRenderInsideBudget(page, routes, label) {
  const consoleErrors = [];
  page.on("console", (message) => {
    const text = message.text();
    if (message.type() === "error" && !/WebSocket|socket\.io|favicon|ERR_CONNECTION_REFUSED/.test(text)) {
      consoleErrors.push(text);
    }
  });

  for (const route of routes) {
    await page.goto(`${baseURL}${route.path}`, { waitUntil: "domcontentloaded", timeout: warmupTimeout });
  }
  await page.waitForTimeout(1500);

  const timings = [];
  const overBudget = [];
  const failures = [];

  for (const route of routes) {
    const startedAt = Date.now();
    try {
      await page.goto(`${baseURL}${route.path}`, { waitUntil: "domcontentloaded", timeout: pageTimeout });
      await expect(page).toHaveURL(new RegExp(`${route.path.replace("/", "\\/")}(?:$|[?#])`), { timeout: pageTimeout });
      await expect(page.getByText(route.marker).first()).toBeVisible({ timeout: renderBudgetMs });
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

  console.log(`${label} render timings: ${JSON.stringify(timings)}`);
  expect(failures, `${label} route render failures: ${JSON.stringify(failures)}`).toEqual([]);
  expect(consoleErrors.slice(0, 5), `${label} console errors`).toEqual([]);
  expect(overBudget, `${label} pages over ${renderBudgetMs}ms: ${JSON.stringify(overBudget)}`).toEqual([]);
}

test.describe("Student and parent dashboard render budget from login", () => {
  test("student dashboard pages load from tenant login and render inside 6s", async ({ page }) => {
    const loginMs = await loginThroughTenantPortal(page, "student", studentEmail);
    console.log(`Student login-to-dashboard timing: ${loginMs}ms`);
    await assertRoutesRenderInsideBudget(page, studentRoutes, "Student dashboard");
  });

  test("parent dashboard pages load from tenant login and render inside 6s", async ({ page }) => {
    const loginMs = await loginThroughTenantPortal(page, "parent", parentEmail);
    console.log(`Parent login-to-dashboard timing: ${loginMs}ms`);
    await assertRoutesRenderInsideBudget(page, parentRoutes, "Parent dashboard");
  });
});
