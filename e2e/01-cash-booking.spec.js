// e2e/01-cash-booking.spec.js — Phase 23. The flow that takes money. search → results → package → booking
// page → guest details → Stripe test card → confirmation → the booking appears in /bookings with credits
// in the ledger. Stripe runs in test mode; the step self-skips without test keys.
import { test, expect, AUTH_READY, STRIPE_READY } from "./helpers.js";

test.describe("cash booking", () => {
  test.skip(!AUTH_READY, "needs Clerk test credentials + a booted app");

  test("completes a cash booking and lands in /bookings with credits", async ({ page }) => {
    test.skip(!STRIPE_READY, "needs Stripe test keys");

    await page.goto("/search?from=LHR&to=LIS&dates=2026-05-01_2026-05-06&travelers=2");
    await page.getByRole("button", { name: /select|book|choose/i }).first().click();

    await page.waitForURL(/\/booking/);
    await page.getByLabel(/first name/i).fill("Test");
    await page.getByLabel(/last name/i).fill("Traveller");
    await page.getByLabel(/email/i).fill("e2e@test.bonza");

    // Stripe Elements test card.
    const stripeFrame = page.frameLocator("iframe[src*='stripe']").first();
    await stripeFrame.getByPlaceholder(/card number/i).fill("4242 4242 4242 4242");
    await stripeFrame.getByPlaceholder(/MM ?\/ ?YY/i).fill("12 / 34");
    await stripeFrame.getByPlaceholder(/CVC/i).fill("123");

    await page.getByRole("button", { name: /confirm|pay|book/i }).click();
    await expect(page.getByText(/confirmed|success|you're booked/i)).toBeVisible({ timeout: 30_000 });

    await page.goto("/bookings");
    await expect(page.getByText(/LIS|Lisbon/i).first()).toBeVisible();
    await expect(page.getByText(/credit/i).first()).toBeVisible();
  });
});
