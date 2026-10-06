// vitest.config.js — Phase 23. Two node projects: `backend` (pure-logic unit, no DB) and `integration`
// (services + routes against a real test Postgres, mocked third parties). Reuses the local Docker Postgres via
// a dedicated `bonza_test` DB (db push in globalSetup; truncate-reset per test). Frontend/Playwright deferred.
import { defineConfig } from "vitest/config";

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
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: ["src/backend/**/*.js"],
      exclude: ["src/backend/db/seed*.js", "src/backend/emails/**", "**/*.test.js", "infra/**"],
      thresholds: {
        // Money paths covered to target now. A global floor + the other per-file targets
        // (bookingWriter/redemptionEngine/stripeService) land as their tests are written.
        "src/backend/services/creditsService.js": { lines: 95, functions: 95 },
        // balanceSync's core (applyStatementBalance/setManualBalance/markNotChecked/findDuplicates) is covered;
        // the real-inbox readStatement branch needs email-provider mocks (next step) — raise to 90 then.
        "src/backend/services/balanceSync.js": { lines: 75, functions: 80 },
      },
    },
  },
});
