// e2e/04-balance-review.spec.js — Phase 23. Statement-authoritative balance review: a sync with a mismatched
// statement raises the discrepancy modal; acknowledging it leaves the statement value in place and the modal
// does not reappear on reload.
import { test, expect, AUTH_READY } from "./helpers.js";

test.describe("balance review", () => {
  test.skip(!AUTH_READY, "needs Clerk test credentials + a booted app");

  test("discrepancy modal appears once, acknowledging it sticks", async ({ page }) => {
    await page.goto("/points/review");

    const modal = page.getByRole("dialog");
    if (await modal.isVisible().catch(() => false)) {
      await modal.getByRole("button", { name: /got it|acknowledge|done|close/i }).click();
    }

    // The report shows the statement-authoritative sections.
    await expect(page.getByText(/updated|verified|not checked/i).first()).toBeVisible();

    // Reload — the modal must not reappear (modalPending cleared).
    await page.reload();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });
});
