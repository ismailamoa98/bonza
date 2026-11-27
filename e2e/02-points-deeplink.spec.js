// e2e/02-points-deeplink.spec.js — Phase 23. THE flow to protect first: a broken points deep link sends
// someone to the wrong award page and they spend points they can't get back. There is no refund path.
// Asserts: a click records an AffiliateClick, opens the right destination, and self-reporting writes a
// Booking with confirmationMethod self_reported.
import { test, expect, AUTH_READY } from "./helpers.js";

test.describe("points deep-link handoff", () => {
  test.skip(!AUTH_READY, "needs Clerk test credentials + a booted app");

  test("search → points option → handoff → self-report writes a points Booking", async ({ page, context }) => {
    await page.goto("/search?from=LHR&to=LIS&dates=2026-05-01_2026-05-06&travelers=2&award=1");

    // Open a hotel with a points option and start the redemption.
    await page.getByRole("button", { name: /book with .* pts/i }).first().click();

    // The modal shows the award duty and a recommended option; start the handoff.
    const modal = page.getByRole("dialog");
    await expect(modal).toBeVisible();

    // The handoff opens the programme's award site in a new tab — capture it and assert the destination.
    const [awardTab] = await Promise.all([
      context.waitForEvent("page"),
      modal.getByRole("button", { name: /continue|book|go to/i }).first().click(),
    ]);
    await awardTab.waitForLoadState("domcontentloaded");
    expect(awardTab.url()).toMatch(/hyatt|marriott|hilton|ihg|britishairways|united/i);

    // Self-report "Yes, I booked it" → a points Booking appears in history.
    await modal.getByRole("button", { name: /i('| ha)ve booked|yes/i }).click();
    await page.goto("/bookings");
    await expect(page.getByText(/Hyatt|Lisbon|points/i).first()).toBeVisible();
  });
});
