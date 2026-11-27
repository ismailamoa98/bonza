-- Phase 27 §27e-1 — partial unique indexes Prisma's schema can't express (NULLs are distinct in a plain
-- unique index, so the composite @@unique constraints don't stop duplicate country-level / no-number rows).
CREATE UNIQUE INDEX IF NOT EXISTS "explore_route_country_level_uniq"
  ON "ExploreRoute" ("originCode", "countryCode") WHERE "cityId" IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "loyalty_account_no_number_uniq"
  ON "LoyaltyAccount" ("userId", "programme") WHERE "accountNumber" IS NULL;
