# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests\student-parent-dashboards-render.e2e.spec.ts >> Student and parent dashboard render budget from login >> student dashboard pages load from tenant login and render inside 6s
- Location: tests\student-parent-dashboards-render.e2e.spec.ts:105:3

# Error details

```
TimeoutError: page.waitForURL: Timeout 45000ms exceeded.
=========================== logs ===========================
waiting for navigation until "load"
============================================================
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e3]:
    - button "Back to roles" [ref=e4]:
      - img [ref=e5]
      - text: Back to roles
    - generic [ref=e7]:
      - generic [ref=e8]:
        - img [ref=e10]
        - generic [ref=e13]: Student Login
        - generic [ref=e14]: Sign in to Asake
      - generic [ref=e16]:
        - generic [ref=e17]: Invalid origin
        - generic [ref=e18]:
          - generic [ref=e19]: Email
          - textbox "Email" [ref=e20]:
            - /placeholder: you@school.com
            - text: student@test.com
        - generic [ref=e21]:
          - generic [ref=e22]: Password
          - textbox "Password" [ref=e23]:
            - /placeholder: Enter your password
            - text: Myname@78
        - generic [ref=e25]:
          - img [ref=e26]
          - paragraph [ref=e29]: Access is verified against this school and selected role before opening the dashboard.
        - button "Sign In" [ref=e30]
  - region "Notifications alt+T"
  - alert [ref=e31]
```

# Test source

```ts
  1   | // @ts-nocheck
  2   | const { expect, test } = require("@playwright/test");
  3   | 
  4   | const tenantSlug = process.env.E2E_TENANT_SLUG || "asake";
  5   | const baseURL = process.env.E2E_BASE_URL || `http://${tenantSlug}.localhost:3000`;
  6   | const password = process.env.E2E_STUDENT_PARENT_PASSWORD || "Myname@78";
  7   | const renderBudgetMs = Number(process.env.E2E_RENDER_BUDGET_MS || 6000);
  8   | const pageTimeout = 45000;
  9   | const warmupTimeout = 90000;
  10  | 
  11  | const studentEmail = process.env.E2E_STUDENT_EMAIL || "student@test.com";
  12  | const parentEmail = process.env.E2E_PARENT_EMAIL || "parent@test.com";
  13  | 
  14  | const studentRoutes = [
  15  |   { path: "/student/dashboard", marker: /Dashboard|Student Command Center|Welcome/i },
  16  |   { path: "/student/subjects", marker: /Subjects|Course Units/i },
  17  |   { path: "/student/exams", marker: /Exams|Results/i },
  18  |   { path: "/student/assessments", marker: /Assessments/i },
  19  |   { path: "/student/assignments", marker: /Assignments/i },
  20  |   { path: "/student/performance", marker: /Performance/i },
  21  |   { path: "/student/resources", marker: /Learning Resources|Resources/i },
  22  |   { path: "/student/timetable", marker: /Schedule|Timetable/i },
  23  |   { path: "/student/attendance", marker: /Attendance/i },
  24  |   { path: "/student/finance", marker: /Student Finance|Finance Office/i },
  25  |   { path: "/student/refunds", marker: /My Refunds|Refund Readiness/i },
  26  |   { path: "/student/communication", marker: /Student Communication|Student Messages/i },
  27  |   { path: "/student/messages", marker: /Messages/i },
  28  |   { path: "/student/notifications", marker: /Notifications/i },
  29  |   { path: "/student/profile", marker: /Profile/i },
  30  |   { path: "/student/settings", marker: /Settings/i },
  31  | ];
  32  | 
  33  | const parentRoutes = [
  34  |   { path: "/parent/dashboard", marker: /Parent|Dashboard|Command/i },
  35  |   { path: "/parent/children", marker: /My Children|Linked Children/i },
  36  |   { path: "/parent/attendance", marker: /Attendance/i },
  37  |   { path: "/parent/finance", marker: /Fees|Parent Finance Command Center/i },
  38  |   { path: "/parent/messages", marker: /Messages|Parent Inbox/i },
  39  |   { path: "/parent/communication", marker: /Messages|Parent Inbox|Communication/i },
  40  |   { path: "/parent/notifications", marker: /Notifications/i },
  41  |   { path: "/parent/profile", marker: /Profile/i },
  42  |   { path: "/parent/settings", marker: /Settings/i },
  43  | ];
  44  | 
  45  | test.setTimeout(600000);
  46  | 
  47  | async function loginThroughTenantPortal(page, role, email) {
  48  |   const startedAt = Date.now();
  49  |   await page.goto(`${baseURL}/student-parent?role=${role}`, { waitUntil: "domcontentloaded", timeout: pageTimeout });
  50  |   await page.getByRole("button", { name: new RegExp(`Login as .*${role === "parent" ? "Parent" : "Student"}`, "i") }).click();
  51  |   await page.getByLabel(/email/i).fill(email);
  52  |   await page.getByLabel(/password/i).fill(password);
  53  |   await page.getByRole("button", { name: /sign in/i }).click();
> 54  |   await page.waitForURL(new RegExp(`/${role}/dashboard|/complete-access`), { timeout: pageTimeout });
      |              ^ TimeoutError: page.waitForURL: Timeout 45000ms exceeded.
  55  |   if (page.url().includes("/complete-access")) {
  56  |     throw new Error(`${role} account requires complete-access password setup before E2E can run.`);
  57  |   }
  58  |   await expect(page.locator("h1").first()).toBeVisible({ timeout: pageTimeout });
  59  |   return Date.now() - startedAt;
  60  | }
  61  | 
  62  | async function assertRoutesRenderInsideBudget(page, routes, label) {
  63  |   const consoleErrors = [];
  64  |   page.on("console", (message) => {
  65  |     const text = message.text();
  66  |     if (message.type() === "error" && !/WebSocket|socket\.io|favicon|ERR_CONNECTION_REFUSED/.test(text)) {
  67  |       consoleErrors.push(text);
  68  |     }
  69  |   });
  70  | 
  71  |   for (const route of routes) {
  72  |     await page.goto(`${baseURL}${route.path}`, { waitUntil: "domcontentloaded", timeout: warmupTimeout });
  73  |   }
  74  |   await page.waitForTimeout(1500);
  75  | 
  76  |   const timings = [];
  77  |   const overBudget = [];
  78  |   const failures = [];
  79  | 
  80  |   for (const route of routes) {
  81  |     const startedAt = Date.now();
  82  |     try {
  83  |       await page.goto(`${baseURL}${route.path}`, { waitUntil: "domcontentloaded", timeout: pageTimeout });
  84  |       await expect(page).toHaveURL(new RegExp(`${route.path.replace("/", "\\/")}(?:$|[?#])`), { timeout: pageTimeout });
  85  |       await expect(page.getByText(route.marker).first()).toBeVisible({ timeout: renderBudgetMs });
  86  |       await expect(page.locator("body")).not.toContainText(/404|This page could not be found|Application error/i, { timeout: 1000 });
  87  |       const elapsed = Date.now() - startedAt;
  88  |       timings.push({ path: route.path, ms: elapsed });
  89  |       if (elapsed >= renderBudgetMs) overBudget.push({ path: route.path, ms: elapsed });
  90  |     } catch (error) {
  91  |       const elapsed = Date.now() - startedAt;
  92  |       const message = error instanceof Error ? error.message : String(error);
  93  |       timings.push({ path: route.path, ms: elapsed, error: message.split("\n")[0] });
  94  |       failures.push({ path: route.path, ms: elapsed, error: message.split("\n")[0] });
  95  |     }
  96  |   }
  97  | 
  98  |   console.log(`${label} render timings: ${JSON.stringify(timings)}`);
  99  |   expect(failures, `${label} route render failures: ${JSON.stringify(failures)}`).toEqual([]);
  100 |   expect(consoleErrors.slice(0, 5), `${label} console errors`).toEqual([]);
  101 |   expect(overBudget, `${label} pages over ${renderBudgetMs}ms: ${JSON.stringify(overBudget)}`).toEqual([]);
  102 | }
  103 | 
  104 | test.describe("Student and parent dashboard render budget from login", () => {
  105 |   test("student dashboard pages load from tenant login and render inside 6s", async ({ page }) => {
  106 |     const loginMs = await loginThroughTenantPortal(page, "student", studentEmail);
  107 |     console.log(`Student login-to-dashboard timing: ${loginMs}ms`);
  108 |     await assertRoutesRenderInsideBudget(page, studentRoutes, "Student dashboard");
  109 |   });
  110 | 
  111 |   test("parent dashboard pages load from tenant login and render inside 6s", async ({ page }) => {
  112 |     const loginMs = await loginThroughTenantPortal(page, "parent", parentEmail);
  113 |     console.log(`Parent login-to-dashboard timing: ${loginMs}ms`);
  114 |     await assertRoutesRenderInsideBudget(page, parentRoutes, "Parent dashboard");
  115 |   });
  116 | });
  117 | 
```