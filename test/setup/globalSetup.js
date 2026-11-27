// test/setup/globalSetup.js — Phase 23. Once per run: push the schema to the test database (reusing the local
// Docker Postgres). No migrations dir, so `db push` (not `migrate deploy`). Phase 27 §27e-1: `db push` can't
// create the partial unique indexes, so we apply them explicitly afterwards (same SQL the prod migration runs).
const { execSync } = require("child_process");

const TEST_DATABASE_URL = "postgresql://bonza:bonza_dev@localhost:5432/bonza_test";

module.exports = async function globalSetup() {
  execSync("npx prisma db push --skip-generate --accept-data-loss", {
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
    stdio: "pipe",
  });

  process.env.DATABASE_URL = TEST_DATABASE_URL;
  const { applyHardeningIndexes } = require("../../src/backend/db/applyHardeningIndexes");
  const prisma = require("../../src/backend/config/database");
  await applyHardeningIndexes(prisma);
  await prisma.$disconnect();
};
