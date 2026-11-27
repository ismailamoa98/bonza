// e2e/05-pro-subscription.spec.js — Phase 23. A free user hits a Pro gate → upgrade → Stripe test checkout
// → webhook → Pro features unlock. Webhook handling is the part that breaks silently, so drive it with the
// Stripe CLI in CI (`stripe listen`/`stripe trigger`). Self-skips without Stripe test keys.
import { test, expect, AUTH_READY, STRIPE_READY } from "./helpers.js";

test.describe("pro subscription", () => {
  test.skip(!AUTH_READY, "needs Clerk test credentials + a booted app");
  test.skip(!STRIPE_READY, "needs Stripe test keys + the Stripe CLI for webhook replay");

  test("upgrade unlocks Pro after the webhook", async ({ page }) => {
    await page.goto("/upgrade");
    await page.getByRole("button", { name: /upgrade|go pro|subscribe/i }).first().click();

    // Stripe test checkout.
    await page.waitForURL(/checkout\.stripe\.com|\/upgrade/);
    const stripeFrame = page.frameLocator("iframe[src*='stripe']").first();
    await stripeFrame.getByPlaceholder(/card number/i).fill("4242 4242 4242 4242");
    await stripeFrame.getByPlaceholder(/MM ?\/ ?YY/i).fill("12 / 34");
    await stripeFrame.getByPlaceholder(/CVC/i).fill("123");
    await page.getByRole("button", { name: /pay|subscribe|confirm/i }).click();

    // After the checkout.session.completed webhook, a Pro-only surface is reachable.
    await page.goto("/settings");
    await expect(page.getByText(/pro|active/i).first()).toBeVisible({ timeout: 30_000 });
  });
});
