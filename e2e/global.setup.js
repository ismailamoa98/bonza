// e2e/global.setup.js — Phase 23. Establishes the authenticated storage state the chromium/mobile projects
// reuse. With Clerk test credentials, it signs in through the hosted form and persists the session; without
// them it writes a signed-out state so the dependent specs self-skip rather than fail.
import { test as setup } from "@playwright/test";
import fs from "fs";
import path from "path";

const authFile = "e2e/.auth/user.json";

setup("authenticate", async ({ page }) => {
  fs.mkdirSync(path.dirname(authFile), { recursive: true });

  const ready = Boolean(process.env.E2E_CLERK_EMAIL && process.env.E2E_CLERK_PASSWORD);
  if (!ready) {
    fs.writeFileSync(authFile, JSON.stringify({ cookies: [], origins: [] }));
    return;
  }

  await page.goto("/sign-in");
  await page.getByLabel(/email/i).fill(process.env.E2E_CLERK_EMAIL);
  await page.getByRole("button", { name: /continue/i }).click();
  await page.getByLabel(/password/i).fill(process.env.E2E_CLERK_PASSWORD);
  await page.getByRole("button", { name: /continue|sign in/i }).click();
  await page.waitForURL(/\/dashboard|\/$/, { timeout: 30_000 });
  await page.context().storageState({ path: authFile });
});
