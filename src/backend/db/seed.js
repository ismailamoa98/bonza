// db/seed.js — Initial/seed data.
// Creates the seeded demo user that endpoints fall back to in development (Clerk
// owns real identities; this is just the dev-fallback profile row).
// Run via `npm run db:seed` (after `npm run db:setup`).
const prisma = require("../config/database");
const { DEV_USER } = require("../config/constants");
const { seedProgrammes } = require("./seedProgrammes");
const { seedHeroDestinations } = require("./seedHeroDestinations");
const { seedDiscovery } = require("./seedDiscovery");
const { seedExplore } = require("./seedExplore");

async function main() {
  const user = await prisma.user.upsert({
    where: { id: DEV_USER.id },
    update: {},
    create: {
      id: DEV_USER.id,
      email: DEV_USER.email,
      name: DEV_USER.name,
      location: DEV_USER.location,
      travelStatus: DEV_USER.travelStatus,
    },
  });

  console.log(`Seeded demo user: ${user.email} (${user.id})`);

  // Phase 14 — programme valuations + transfer graph (reference data).
  await seedProgrammes();

  // Phase 17 — hero destination board (award-price data).
  await seedHeroDestinations();

  // Phase 18 — Explore Everywhere: 60-country DB directory (ExploreCountry/City/Route, mock prices).
  await seedExplore();

  // Phase 18 — homepage discovery rails (popular trips; ExploreCountry now owned by seedExplore).
  await seedDiscovery();

  // Phase 14 — demo points-activity so the /points activity feed looks populated in dev.
  await seedActivity(user.id);

  // Phase 15 — demo loyalty accounts + a sync run so the balance-review states + modal are demonstrable.
  await seedBalanceReview(user.id);
}

// Resets the dev user's loyalty accounts to a curated demo set spanning every Phase 15 sync state, plus a
// completed BalanceSyncRun (modalPending) so /points/review + the discrepancy modal have data to show.
async function seedBalanceReview(userId) {
  const day = 86400000;
  const at = (d) => new Date(Date.now() - d * day);
  const email = "ismail@gmail.com";
  const accounts = [
    { programme: "marriott_bonvoy", balance: 124000, valueGbp: 992, statusTier: "Gold Elite", accountNumber: "9007", syncState: "verified", statementDate: at(4), statementSource: email, syncMethod: "email_parse" },
    { programme: "ba_avios", balance: 35000, valueGbp: 385, statusTier: "Bronze", accountNumber: "7788", syncState: "verified", statementDate: at(5), statementSource: email, syncMethod: "email_parse" },
    { programme: "ihg_one", balance: 72400, valueGbp: 362, statusTier: "Gold Elite", accountNumber: "1180", syncState: "updated", previousBalance: 60000, statementDate: at(2), statementSource: email, syncMethod: "email_parse" },
    { programme: "world_of_hyatt", balance: 120000, valueGbp: 2040, statusTier: "Explorist", accountNumber: "5520", syncState: "updated", previousBalance: 110000, statementDate: at(3), statementSource: email, syncMethod: "email_parse" },
    { programme: "amex_mr", balance: 50000, valueGbp: 700, accountNumber: "4521", syncState: "not_checked", syncMethod: "manual" },
    { programme: "united_mp", balance: 15000, valueGbp: 180, statusTier: "Silver", accountNumber: "3391", syncState: "not_checked", syncMethod: "manual" },
    { programme: "hilton_honors", balance: 88000, valueGbp: 440, statusTier: "Gold", accountNumber: "3344", syncState: "not_checked", previousBalance: 92000, manualOverrideAt: at(1), syncMethod: "manual" },
  ];

  await prisma.loyaltyAccount.deleteMany({ where: { userId } });
  await prisma.balanceSyncRun.deleteMany({ where: { userId } });
  for (const a of accounts) {
    await prisma.loyaltyAccount.create({ data: { userId, lastSynced: new Date(), ...a } });
  }
  await prisma.balanceSyncRun.create({
    data: {
      userId, mailbox: "gmail", completedAt: new Date(),
      programmesChecked: 7, statementsFound: 4, balancesUpdated: 2, balancesVerified: 2, notChecked: 2,
      modalPending: true,
    },
  });
  console.log(`Seeded ${accounts.length} demo loyalty accounts + 1 balance-sync run`);
}

// Idempotent demo activity feed for the dev user (mix of earn/spend/transfer, confirmed/inferred),
// spread across the last few months so the "How you earned" ladder has data.
async function seedActivity(userId) {
  const day = 86400000;
  const at = (d) => new Date(Date.now() - d * day);
  const rows = [
    { programme: "marriott_bonvoy", kind: "earn", description: "Marriott Lisbon · 4 nights", detail: "stay credit", amount: 32000, occurredAt: at(6), source: "confirmation_email", confidence: "confirmed" },
    { programme: "world_of_hyatt", kind: "spend", description: "World of Hyatt award", detail: "award stay", amount: -25000, occurredAt: at(12), source: "bonza_booking", confidence: "confirmed" },
    { programme: "ba_avios", kind: "earn", description: "British Airways · LHR–JFK", detail: "flight credit", amount: 4200, occurredAt: at(20), source: "confirmation_email", confidence: "confirmed" },
    { programme: "amex_mr", kind: "transfer_out", description: "Amex transfer out", detail: "to Virgin", amount: -20000, occurredAt: at(34), source: "confirmation_email", confidence: "confirmed", relatedProgramme: "virgin_flying_club" },
    { programme: "virgin_flying_club", kind: "transfer_in", description: "Amex → Virgin transfer", detail: "1:1 ratio", amount: 20000, occurredAt: at(34), source: "confirmation_email", confidence: "confirmed", relatedProgramme: "amex_mr" },
    { programme: "amex_mr", kind: "earn", description: "Points earned", detail: "statement Aug", amount: 8500, occurredAt: at(45), source: "balance_delta", confidence: "inferred" },
    { programme: "hilton_honors", kind: "earn", description: "Points earned", detail: "statement Jul", amount: 12000, occurredAt: at(72), source: "balance_delta", confidence: "inferred" },
    { programme: "united_mp", kind: "spend", description: "United award flight", detail: "award booking", amount: -30000, occurredAt: at(96), source: "bonza_booking", confidence: "confirmed" },
  ];
  await prisma.pointsActivity.deleteMany({ where: { userId } });
  await prisma.pointsActivity.createMany({ data: rows.map((r) => ({ userId, ...r })) });
  console.log(`Seeded ${rows.length} demo points-activity rows`);
}

main()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
