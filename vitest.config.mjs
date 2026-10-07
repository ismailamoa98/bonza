// vitest.config.js — Phase 23. Three projects: `backend` (pure-logic unit, no DB), `integration`
// (services + routes against a real test Postgres, mocked third parties), and `frontend` (jsdom + React
// Testing Library). Reuses the local Docker Postgres via a dedicated `bonza_test` DB (db push in
// globalSetup; truncate-reset per test). E2E lives in Playwright (playwright.config.js), run separately.
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

const TEST_DATABASE_URL = "postgresql://bonza:bonza_dev@localhost:5432/bonza_test";

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "backend",
          environment: "node",
          include: ["test/unit/**/*.test.js", "src/backend/**/*.test.js"],
          exclude: ["test/integration/**", "src/backend/tests/**", "node_modules/**"], // the latter is a stale Phase-1 placeholder
          setupFiles: ["./test/setup/unit.js"],
          pool: "forks", // module mocking (in the setup file) must intercept the SUT's own require() of @anthropic-ai/sdk etc.
        },
      },
      {
        test: {
          name: "integration",
          environment: "node",
          include: ["test/integration/**/*.test.js"],
          globalSetup: ["./test/setup/globalSetup.js"],
          setupFiles: ["./test/setup/integration.js"],
          env: { DATABASE_URL: TEST_DATABASE_URL, NODE_ENV: "test", STRIPE_WEBHOOK_SECRET: "whsec_test", STRIPE_SECRET_KEY: "sk_test_dummy" },
          testTimeout: 20000,
          hookTimeout: 60000,
          pool: "forks",
          fileParallelism: false, // integration files share the test DB — run sequentially
        },
      },
      {
        plugins: [react()],
        // Components resolve `react` from src/frontend/node_modules while Testing Library resolves it from
        // the root — two copies break hooks. Dedupe to a single React instance.
        resolve: { dedupe: ["react", "react-dom", "react/jsx-runtime"] },
        test: {
          name: "frontend",
          environment: "jsdom",
          globals: true,
          include: ["src/frontend/**/*.test.{js,jsx}"],
          setupFiles: ["./test/setup/frontend.js"],
        },
      },
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: ["src/backend/**/*.js"],
      exclude: ["src/backend/db/seed*.js", "src/backend/emails/**", "**/*.test.js", "infra/**"],
      thresholds: {
        // Money/trust paths — the real bar, set just under what's achieved so a regression trips CI.
        // (functions is omitted where inline fire-and-forget/.catch arrows make the function count noisy;
        // line coverage is the meaningful gate there.)
        "src/backend/services/creditsService.js": { lines: 95, functions: 95 },
        "src/backend/services/redemptionEngine.js": { lines: 90, functions: 90 },
        "src/backend/utils/bookingWriter.js": { lines: 95 },
        "src/backend/services/balanceSync.js": { lines: 75, functions: 80 },
        "src/backend/services/awardLinks.js": { lines: 80 },
        "src/backend/jobs/valuationRefreshJob.js": { lines: 90 },
        // stripeService: the webhook path is covered; createSubscription/cancelSubscription call the Stripe
        // client, which this harness can't mock at the SUT boundary (see test/setup/unit.js) — they're
        // exercised in E2E (spec 05). Gated at the achieved level to catch regressions.
        "src/backend/services/stripeService.js": { lines: 50 },
        // Deliberately NO high global floor: routes/jobs are integration/E2E territory, not unit-covered,
        // so a 70% global would be dishonest and flaky. This is a low regression floor only — the per-file
        // money-path thresholds above are the gate that matters.
        global: { lines: 25, branches: 12 },
      },
    },
  },
});
