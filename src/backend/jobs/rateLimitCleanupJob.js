// jobs/rateLimitCleanupJob.js — Phase 27 §27d. Keeps the rate-limit / spend tables bounded: delete expired
// RateLimitHit windows (resetAt in the past) and SpendLedger rows older than ~30 days. Pure maintenance; runs
// nightly via the `rate_limit_cleanup` jobType (through the §27f jobRunner). Safe to run anytime.
const prisma = require("../config/database");
const { logger } = require("../utils/logger");

const SPEND_RETENTION_DAYS = 30;

async function runRateLimitCleanup() {
  const now = new Date();
  const spendCutoff = new Date(now.getTime() - SPEND_RETENTION_DAYS * 24 * 60 * 60 * 1000);

  const hits = await prisma.rateLimitHit.deleteMany({ where: { resetAt: { lt: now } } });
  const spend = await prisma.spendLedger.deleteMany({ where: { date: { lt: spendCutoff } } });

  logger.info?.("[rateLimitCleanup] swept", { rateLimitHits: hits.count, spendRows: spend.count });
  return { rateLimitHits: hits.count, spendRows: spend.count };
}

module.exports = { runRateLimitCleanup };
