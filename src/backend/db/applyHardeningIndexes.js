// db/applyHardeningIndexes.js — Phase 27 §27e-1. Partial unique indexes that Prisma's schema can't express.
// Postgres treats NULLs as distinct in a plain unique index, so `@@unique([originCode,countryCode,cityId])`
// does NOT stop duplicate country-level rows (cityId IS NULL), and `@@unique([userId,programme,accountNumber])`
// does NOT stop duplicate no-number memberships. These partial indexes close both holes. Idempotent
// (IF NOT EXISTS) so they're safe to run after every `db push` in dev/test and from the prod migration.
const prisma = require("../config/database");

const HARDENING_INDEX_SQL = [
  `CREATE UNIQUE INDEX IF NOT EXISTS "explore_route_country_level_uniq"
     ON "ExploreRoute" ("originCode", "countryCode") WHERE "cityId" IS NULL`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "loyalty_account_no_number_uniq"
     ON "LoyaltyAccount" ("userId", "programme") WHERE "accountNumber" IS NULL`,
];

async function applyHardeningIndexes(client = prisma) {
  for (const sql of HARDENING_INDEX_SQL) await client.$executeRawUnsafe(sql);
}

module.exports = { applyHardeningIndexes, HARDENING_INDEX_SQL };
