// @ts-nocheck
const { expect, request: playwrightRequest, test } = require("@playwright/test");

const baseURL = process.env.E2E_MASTER_BASE_URL || process.env.E2E_BASE_URL || "http://localhost:3000";
const pageTimeout = 45000;
const renderBudgetMs = Number(process.env.E2E_RENDER_BUDGET_MS || 6000);

test.use({ storageState: process.env.E2E_MASTER_STORAGE_STATE || process.env.E2E_STORAGE_STATE || "tests/.auth/master.json" });
test.setTimeout(90000);

test.describe("Master profile production surface", () => {
  test("renders master profile within budget and exposes account controls", async ({ page }) => {
    const errors = [];
    page.on("console", (message) => {
      if (message.type() === "error" && !message.text().includes("WebSocket") && !message.text().includes("favicon")) errors.push(message.text());
    });

    const startedAt = Date.now();
    await page.goto(`${baseURL}/master/profile`, { waitUntil: "domcontentloaded", timeout: pageTimeout });
    await expect(page.getByRole("heading", { name: /Master Admin Profile/i })).toBeVisible({ timeout: pageTimeout });
    expect(Date.now() - startedAt, "master profile page should render inside budget").toBeLessThan(renderBudgetMs);

    await expect(page.getByRole("heading", { name: /Account Details/i })).toBeVisible({ timeout: pageTimeout });
    await expect(page.getByRole("button", { name: /Save Changes/i })).toBeVisible({ timeout: pageTimeout });
    await expect(page.getByLabel(/Full Name/i)).toBeVisible({ timeout: pageTimeout });
    expect(errors.slice(0, 3)).toEqual([]);
  });

  test("profile API is master-aware, validates updates, persists, restores, and blocks anonymous access", async ({ page }) => {
    await page.goto(`${baseURL}/master/profile`, { waitUntil: "domcontentloaded", timeout: pageTimeout });

    const original = await page.evaluate(async () => {
      const response = await fetch("/api/profile", { credentials: "include", cache: "no-store" });
      const payload = await response.json();
      return {
        status: response.status,
        currentUser: payload.currentUser,
        profile: payload.profile || {},
      };
    });
    expect(original.status).toBe(200);
    expect(original.currentUser.role).toBe("super_admin");
    expect(original.currentUser.email).toBeTruthy();

    const invalid = await page.evaluate(async () => {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alternateEmail: "not-an-email" }),
      });
      return { status: response.status, payload: await response.json() };
    });
    expect(invalid.status).toBe(400);
    expect(invalid.payload.error).toMatch(/alternate email/i);

    const nextBio = `Master profile E2E ${Date.now()}`;
    const updated = await page.evaluate(async (bio) => {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bio, preferredContactMethod: "in_app" }),
      });
      const payload = await response.json();
      return { status: response.status, profile: payload.profile || {}, currentUser: payload.currentUser };
    }, nextBio);
    expect(updated.status).toBe(200);
    expect(updated.currentUser.role).toBe("super_admin");
    expect(updated.profile.bio).toBe(nextBio);

    const restored = await page.evaluate(async (bio) => {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bio: bio || "", preferredContactMethod: "in_app" }),
      });
      const payload = await response.json();
      return { status: response.status, profile: payload.profile || {} };
    }, original.profile.bio || "");
    expect(restored.status).toBe(200);

    const anonymousContext = await playwrightRequest.newContext({ storageState: { cookies: [], origins: [] } });
    const anonymousProfile = await anonymousContext.get(`${baseURL}/api/profile`);
    expect([401, 403]).toContain(anonymousProfile.status());
    const anonymousPatch = await anonymousContext.patch(`${baseURL}/api/profile`, { data: { bio: "blocked" } });
    expect([401, 403]).toContain(anonymousPatch.status());
    const anonymousAvatar = await anonymousContext.get(`${baseURL}/api/profile/avatar`);
    expect([401, 403]).toContain(anonymousAvatar.status());
    await anonymousContext.dispose();
  });
});
