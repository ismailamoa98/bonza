// jobs/monthlySummaryJob.js — monthly loyalty-summary email cron entry.
const prisma = require("../config/database");
const { triggerMonthlySummary } = require("../services/notificationTriggers");
const { logger } = require("../utils/logger");

const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;

async function runMonthlySummaries() {
  const users = await prisma.user.findMany({
    where: { lastLoginAt: { gt: new Date(Date.now() - NINETY_DAYS_MS) } },
    select: { id: true },
  });

  for (const u of users) {
    await triggerMonthlySummary(u.id); // fire-and-forget internally
    await new Promise((r) => setTimeout(r, 500)); // pace the sends
  }

  logger.info(`[monthlySummaryJob] processed ${users.length} users`);
  return { processed: users.length };
}

module.exports = { runMonthlySummaries };
