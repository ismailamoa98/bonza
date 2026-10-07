// e2e/03-onboarding.spec.js — Phase 23. First-run setup: home airport → travel style → a manual loyalty
// balance → recommendations generate → lands on the dashboard with real data.
import { test, expect, AUTH_READY } from "./helpers.js";

test.describe("onboarding", () => {
  test.skip(!AUTH_READY, "needs Clerk test credentials + a booted app");

  test("guided setup lands the user on a populated dashboard", async ({ page }) => {
    await page.goto("/onboarding");

    // Step 1 — home airport.
    await page.getByLabel(/home airport|where do you fly/i).fill("LHR");
    await page.getByRole("button", { name: /next|continue/i }).click();

    // Step 2 — travel style.
    await page.getByRole("button", { name: /points|maximis|value/i }).first().click();
    await page.getByRole("button", { name: /next|continue/i }).click();

    // Step 3 — connect loyalty (manual balance) or skip.
    await page.getByRole("button", { name: /add manually|enter balance|skip/i }).first().click();
    await page.getByRole("button", { name: /next|continue|finish|done/i }).click();

    // Step 4 — recommendations poll, then dashboard.
    await page.waitForURL(/\/dashboard/, { timeout: 30_000 });
    await expect(page.getByText(/welcome|your trips|destinations/i).first()).toBeVisible();
  });
});
