// jobs/exportJob.js — Phase 25 §25e. Builds a user's DSAR export and emails them the link (a 72h signed S3
// URL in production; a local path logged offline). Used both by the POST /me/export endpoint (inline) and by
// the Lambda `data_export` jobType for the async/queued path.
const prisma = require("../config/database");
const { createExport } = require("../services/dataExport");
const { createAndSend } = require("../services/emailService");
const { recordEvent, EVENT_TYPES } = require("../utils/eventTracker");
const { recordAudit, ACTIONS } = require("../services/auditService");
const { logger } = require("../utils/logger");

async function deliverExport(userId) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
  const result = await createExport(userId);
  await recordEvent(userId, EVENT_TYPES.DATA_EXPORT_REQUESTED, { mode: result.mode, expiresAt: result.expiresAt }).catch(() => {});
  await recordAudit({ action: ACTIONS.DATA_EXPORT_REQUESTED, subjectUserId: userId, entity: "User", entityId: userId, after: { mode: result.mode } });

  if (result.mode === "s3" && user?.email) {
    await createAndSend({
      userId,
      type: "data_export_ready",
      title: "Your data export is ready",
      body: "Your Bonza data export is ready to download. The link expires in 72 hours.",
      ctaLabel: "Download export",
      ctaUrl: result.url,
      userEmail: user.email,
      emailSubject: "Your Bonza data export is ready",
      emailHtml: `<p>Your Bonza data export is ready. <a href="${result.url}">Download it here</a> — the link expires in 72 hours.</p>`,
    }).catch(() => {});
  } else {
    logger.info(`[exportJob] export ready for ${userId} (offline mode — no email link sent)`);
  }
  return result;
}

// Lambda entry — process a specific user, or no-op if none supplied.
async function runExportJob({ userId } = {}) {
  if (!userId) return { skipped: true };
  return deliverExport(userId);
}

module.exports = { deliverExport, runExportJob };
