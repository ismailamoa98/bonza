// test/setup/db.js — Phase 23. Truncate every table between tests (CASCADE) for clean isolation. Prefer
// truncation over nested transactions — the service layer runs its own transactions which don't nest cleanly.
const prisma = require("../../src/backend/config/database");

async function resetDb() {
  const tables = await prisma.$queryRaw`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename != '_prisma_migrations'`;
  if (!tables.length) return;
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tables.map((t) => `"${t.tablename}"`).join(", ")} RESTART IDENTITY CASCADE`);
}

module.exports = { resetDb, prisma };
