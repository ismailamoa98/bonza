// jobs/retentionJob.js — Phase 25 §25f. Nightly data-retention sweep. Every table has an explicit retention
// answer; "keep forever" is a decision, not an omission. Deletes per-table rows past their window, triggers
// hard-deletes for soft-deleted accounts past the 14-day grace, and logs per-table deleted counts to the audit
// log so we can demonstrate the policy actually runs. Financial records (Booking, BonzaCredit, 7y) and
// LegalAcceptance (life + 7y) are deliberately NOT swept here.
const prisma = require("../config/database");
const { logger } = require("../utils/logger");
const { runHardDeletes } = require("../services/accountDeletion");

const DAY_MS = 24 * 60 * 60 * 1000;
const daysAgo = (n) => new Date(Date.now() - n * DAY_MS);
const monthsAgo = (n) => daysAgo(n * 30);
const yearsAgo = (n) => daysAgo(n * 365);

async function runRetention(now = new Date()) {
  const counts = {};

  // Award-availability cache — 90 days (stale beyond use).
  counts.awardAvailability = (await prisma.awardAvailability.deleteMany({ where: { fetchedAt: { lt: daysAgo(90) } } })).count;

  // Personalised recommendations — 30 days.
  counts.personalisedRecommendation = (await prisma.personalisedRecommendation.deleteMany({ where: { generatedAt: { lt: daysAgo(30) } } })).count;

  // Product events (analytics) — 24 months (funnel comparison year on year).
  counts.userEvent = (await prisma.userEvent.deleteMany({ where: { createdAt: { lt: monthsAgo(24) } } })).count;

  // Dismissed/expired in-app notifications — 12 months.
  counts.notification = (await prisma.notification.deleteMany({ where: { createdAt: { lt: monthsAgo(12) } } })).count;

  // Support tickets — 24 months after close (dispute window). SupportMessage cascades on ticket delete.
  counts.supportTicket = (
    await prisma.supportTicket.deleteMany({
      where: { status: { in: ["resolved", "closed"] }, resolvedAt: { not: null, lt: monthsAgo(24) } },
    })
  ).count;

  // §27g — queue dedupe markers are only needed for the redelivery window; 30 days is ample.
  counts.processedMessage = (await prisma.processedMessage.deleteMany({ where: { processedAt: { lt: daysAgo(30) } } })).count;

  // §27k — append-only audit trail: 7-year retention (UK tax / dispute window), then pruned. NOTE: in prod the
  // AuditEvent DELETE is REVOKEd from bonza_app, so this sweep must run under bonza_migrate (see docs/DB_ROLES.md);
  // dev/db-push is unenforced, so it runs as-is.
  counts.auditEvent = (await prisma.auditEvent.deleteMany({ where: { at: { lt: yearsAgo(7) } } })).count;

  // Soft-deleted accounts past the 14-day grace → hard delete.
  const hard = await runHardDeletes(now);
  counts.accountsHardDeleted = hard.deleted;

  logger.info(`[retentionJob] retention sweep complete ${JSON.stringify(counts)}`);
  return counts;
}

module.exports = { runRetention };
