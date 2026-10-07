// e2e/06-support.spec.js — Phase 23. A points booking's support path must show the third-party BookingBoundary
// (points bookings live at the programme — Bonza can't change them), never a form that implies Bonza will
// contact the programme on the user's behalf.
import { test, expect, AUTH_READY } from "./helpers.js";

test.describe("support — points booking boundary", () => {
  test.skip(!AUTH_READY, "needs Clerk test credentials + a booted app");

  test("a points booking shows the boundary, not an on-behalf form", async ({ page }) => {
    await page.goto("/bookings");
    await page.getByRole("link", { name: /get help with this booking/i }).first().click();

    await page.waitForURL(/\/help\/contact/);
    // The boundary explains Bonza can't change a programme booking and gives the programme's own contact.
    await expect(page.getByText(/can('|no)t (change|modify|cancel)|managed by|contact .* directly/i)).toBeVisible();
    await expect(page.getByText(/world of hyatt|programme|loyalty/i).first()).toBeVisible();

    // There must be no control offering to contact the programme on the user's behalf.
    await expect(page.getByRole("button", { name: /contact .* on your behalf|we('|')ll contact/i })).toHaveCount(0);
  });
});
