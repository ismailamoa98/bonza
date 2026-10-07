// test/setup/db.js — Phase 23. Truncate every table between tests (CASCADE) for clean isolation. Prefer
// truncation over nested transactions — the service layer runs its own transactions which don't nest cleanly.
const prisma = require("../../src/backend/config/database");

async function resetDb() {
  const tables = await prisma.$queryRaw`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename != '_prisma_migrations'`;
  if (!tables.length) return;
  const sql = `TRUNCATE TABLE ${tables.map((t) => `"${t.tablename}"`).join(", ")} RESTART IDENTITY CASCADE`;
  // TRUNCATE takes ACCESS EXCLUSIVE locks; a fire-and-forget write from the previous test (notification
  // triggers, lastLogin stamp) can still be in flight and deadlock with it (40P01). Retry briefly.
  for (let attempt = 1; ; attempt++) {
    try {
      await prisma.$executeRawUnsafe(sql);
      return;
    } catch (err) {
      const deadlock = err?.meta?.code === "40P01" || /deadlock detected/i.test(err?.message || "");
      if (!deadlock || attempt >= 5) throw err;
      await new Promise((r) => setTimeout(r, 50 * attempt));
    }
  }
}

module.exports = { resetDb, prisma };
