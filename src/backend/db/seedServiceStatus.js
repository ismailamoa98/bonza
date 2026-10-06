// db/seedServiceStatus.js — Phase 22. The five services shown on /status, all operational by default. State is
// flipped manually via the admin view for now; later wired to the Phase 11 CloudWatch alarms.
const prisma = require("../config/database");

const SERVICES = [
  { service: "flight_search", displayName: "Flight search" },
  { service: "hotel_search", displayName: "Hotel search" },
  { service: "award_search", displayName: "Award availability" },
  { service: "booking", displayName: "Booking" },
  { service: "balance_sync", displayName: "Balance sync" },
];

async function seedServiceStatus() {
  for (const s of SERVICES) {
    await prisma.serviceStatus.upsert({
      where: { service: s.service },
      update: { displayName: s.displayName },
      create: { service: s.service, displayName: s.displayName, state: "operational" },
    });
  }
  console.log(`Seeded ${SERVICES.length} service-status rows (all operational).`);
}

module.exports = { seedServiceStatus };

if (require.main === module) seedServiceStatus().finally(() => prisma.$disconnect());
