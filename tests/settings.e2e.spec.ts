// @ts-nocheck
const { expect, test } = require("@playwright/test");

const tenantSlug = process.env.E2E_TENANT_SLUG || "asake";
const baseURL = process.env.E2E_BASE_URL || `http://${tenantSlug}.localhost:3000`;
const sectionTimeout = 30000;

test.use({ storageState: process.env.E2E_STORAGE_STATE || "tests/.auth/owner.json" });

test.describe("Owner school settings hardening", () => {
  test("navigates settings sections and exposes production hardening controls", async ({ page }) => {
    await page.goto(`${baseURL}/owner/settings/school_name`);
    await expect(page.getByRole("heading", { name: "School Profile" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Save Settings/i })).toBeVisible();

    await page.getByRole("link", { name: "Finance", exact: true }).click();
    await expect(page).toHaveURL(/\/owner\/settings\/finance$/);
    await expect(page.getByRole("heading", { name: "Finance" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Provider Credentials" })).toBeVisible({ timeout: sectionTimeout });
    await expect(page.getByRole("button", { name: /Test Paystack/i })).toBeVisible({ timeout: sectionTimeout });

    await page.getByRole("link", { name: "Communication", exact: true }).click();
    await expect(page).toHaveURL(/\/owner\/settings\/communication$/);
    await expect(page.getByRole("heading", { name: "Live Provider Tests" })).toBeVisible({ timeout: sectionTimeout });
    await expect(page.getByRole("button", { name: /Test resend/i })).toBeVisible({ timeout: sectionTimeout });

    await page.getByRole("link", { name: "Back-up & Data", exact: true }).click();
    await expect(page).toHaveURL(/\/owner\/settings\/backup$/);
    await expect(page.getByRole("heading", { name: "Backup & Restore Execution" })).toBeVisible({ timeout: sectionTimeout });
    await expect(page.getByRole("button", { name: /Create Backup Now/i })).toBeVisible({ timeout: sectionTimeout });

    await expect(page.getByRole("heading", { name: "Production Hardening" })).toBeVisible();
  });
});
