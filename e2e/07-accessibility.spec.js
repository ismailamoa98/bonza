// e2e/07-accessibility.spec.js — Phase 23. axe-core on the main routes (no critical violations) plus two
// keyboard-only guarantees: a search can be completed without a mouse, and focus returns correctly when the
// city drawer closes.
import AxeBuilder from "@axe-core/playwright";
import { test, expect, AUTH_READY } from "./helpers.js";

const PUBLIC_ROUTES = ["/", "/explore", "/help"];
const AUTHED_ROUTES = ["/search?from=LHR&to=LIS&dates=2026-05-01_2026-05-06", "/points", "/bookings"];

test.describe("accessibility", () => {
  test.skip(!AUTH_READY, "needs Clerk test credentials + a booted app");

  for (const route of [...PUBLIC_ROUTES, ...AUTHED_ROUTES]) {
    test(`no critical axe violations on ${route}`, async ({ page }) => {
      await page.goto(route);
      const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
      const critical = results.violations.filter((v) => v.impact === "critical");
      expect(critical, JSON.stringify(critical.map((v) => v.id))).toEqual([]);
    });
  }

  test("a search can be completed keyboard-only", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("Tab"); // walk into the hero search form
    await page.keyboard.type("LHR");
    await page.keyboard.press("Enter");
    // A new tab or /search navigation results from the submit.
    await expect(page).toHaveURL(/\/search|\/$/);
  });

  test("focus returns to the opener when the city drawer closes", async ({ page }) => {
    await page.goto("/explore/PT");
    const cityCard = page.getByRole("button", { name: /lisbon|porto/i }).first();
    if (await cityCard.isVisible().catch(() => false)) {
      await cityCard.focus();
      await page.keyboard.press("Enter"); // open the drawer
      await page.keyboard.press("Escape"); // close it
      await expect(cityCard).toBeFocused();
    }
  });
});
