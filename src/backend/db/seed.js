// db/seed.js — Initial/seed data.
// Creates the seeded demo user that endpoints fall back to in development (Clerk
// owns real identities; this is just the dev-fallback profile row).
// Run via `npm run db:seed` (after `npm run db:setup`).
const prisma = require("../config/database");
const { DEV_USER } = require("../config/constants");

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
}

main()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
