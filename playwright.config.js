// playwright.config.js — Phase 23. End-to-end tests of the flows that cost money or trust. Runs the app
// (backend :5000 + frontend :3000) against the bonza_test DB with external APIs in offline/mock mode; Stripe
// uses test mode + the Stripe CLI when its keys are present (spec 05 self-skips otherwise). Booting the
// frontend requires Clerk test keys (VITE_CLERK_PUBLISHABLE_KEY) — specs self-skip when auth isn't ready.
import { defineConfig, devices } from "@playwright/test";

const WEB_PORT = Number(process.env.E2E_WEB_PORT || 3000);
const API_PORT = Number(process.env.E2E_API_PORT || 5000);
const baseURL = process.env.E2E_URL || `http://localhost:${WEB_PORT}`;
const TEST_DATABASE_URL = process.env.DATABASE_URL || "postgresql://bonza:bonza_dev@localhost:5432/bonza_test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false, // shared seeded DB
  workers: 1,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["html", { open: "never" }], ["list"]] : "list",
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    { name: "setup", testMatch: /global\.setup\.js/ },
    { name: "chromium", use: { ...devices["Desktop Chrome"], storageState: "e2e/.auth/user.json" }, dependencies: ["setup"] },
    { name: "mobile", use: { ...devices["iPhone 13"], storageState: "e2e/.auth/user.json" }, dependencies: ["setup"] },
  ],
  webServer: [
    {
      command: "npm run start:e2e:api",
      url: `http://localhost:${API_PORT}/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: { NODE_ENV: "test", PORT: String(API_PORT), DATABASE_URL: TEST_DATABASE_URL },
    },
    {
      command: "npm run start:e2e:web",
      url: baseURL,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});
