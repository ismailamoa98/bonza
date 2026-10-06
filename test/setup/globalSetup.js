// test/setup/globalSetup.js — Phase 23. Once per run: push the schema to the test database (reusing the local
// Docker Postgres). No migrations dir, so `db push` (not `migrate deploy`).
const { execSync } = require("child_process");

const TEST_DATABASE_URL = "postgresql://bonza:bonza_dev@localhost:5432/bonza_test";

module.exports = async function globalSetup() {
  execSync("npx prisma db push --skip-generate --accept-data-loss", {
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
    stdio: "pipe",
  });
};
