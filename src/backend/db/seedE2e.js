// db/seedE2e.js — Phase 23. Deterministic fixture for the Playwright E2E run (bonza_test DB). Seeds the
// reference data the flows need (programmes, explore, help, status) plus the dev-fallback user with a
// known points balance and a recent confirmed points booking (for the support "get help with this booking"
// path). Run by `npm run db:seed:e2e` before `npm run test:e2e`. Offline/mock — no external calls.
const prisma = require("../config/database");
const { DEV_USER } = require("../config/constants");
const { seedProgrammes } = require("./seedProgrammes");
const { seedHeroDestinations } = require("./seedHeroDestinations");
const { seedExplore } = require("./seedExplore");
const { seedDiscovery } = require("./seedDiscovery");
const { seedHelp } = require("./seedHelp");
const { seedProgrammeContacts } = require("./seedProgrammeContacts");
const { seedServiceStatus } = require("./seedServiceStatus");

async function main() {
  const user = await prisma.user.upsert({
    where: { id: DEV_USER.id },
    update: { onboardingComplete: true, homeAirport: "LHR", travelStyle: "points_max" },
    create: { id: DEV_USER.id, email: DEV_USER.email, name: DEV_USER.name, homeAirport: "LHR", travelStyle: "points_max", onboardingComplete: true },
  });

  await seedProgrammes();
  await seedHeroDestinations();
  await seedExplore();
  await seedDiscovery();
  await seedHelp();
  await seedProgrammeContacts();
  await seedServiceStatus();

  // Loyalty balances — enough points for the deep-link and points-booking support flows.
  await prisma.loyaltyAccount.deleteMany({ where: { userId: user.id } });
  await prisma.loyaltyAccount.createMany({
    data: [
      { userId: user.id, programme: "world_of_hyatt", balance: 120000, valueGbp: 2160, syncState: "verified", syncMethod: "email_parse", lastSynced: new Date(), accountNumber: "5520" },
      { userId: user.id, programme: "amex_mr", balance: 90000, valueGbp: 1260, syncState: "not_checked", syncMethod: "manual", lastSynced: new Date(), accountNumber: "4521" },
      { userId: user.id, programme: "ba_avios", balance: 45000, valueGbp: 495, syncState: "verified", syncMethod: "email_parse", lastSynced: new Date(), accountNumber: "7788" },
    ],
  });

  // A recent confirmed points booking (≤14d) so /help surfaces "get help with this booking" → BookingBoundary.
  await prisma.booking.deleteMany({ where: { userId: user.id } });
  await prisma.booking.create({
    data: {
      userId: user.id, leg: "hotel", bookingType: "points", supplier: "world_of_hyatt",
      supplierReference: "WOH-E2E-1", description: "Hyatt Regency Lisbon · 4 nights",
      pointsUsed: 48000, pointsProgramme: "world_of_hyatt", pointsValueGbp: 864,
      origin: "LHR", destination: "LIS",
      checkIn: new Date(Date.now() + 7 * 86400000), checkOut: new Date(Date.now() + 11 * 86400000),
      confirmedAt: new Date(), confirmationMethod: "self_reported", status: "confirmed",
    },
  });

  // eslint-disable-next-line no-console
  console.log(`E2E seed complete for ${user.email}`);
}

main()
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error("E2E seed failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
