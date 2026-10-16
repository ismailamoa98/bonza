// api/me.js — Phase 25. The authenticated user's own account: legal-acceptance history (§25d) and, added in
// §25e, the data-subject-request controls (export + delete). Mounted at /api/v1/me behind `auth`.
const express = require("express");
const prisma = require("../config/database");
const { getHistory, getOutstanding, recordAcceptance, requestContext } = require("../services/legalAcceptance");
const { currentVersion, MATERIAL_DOCS } = require("../config/legal");
const { recordEvent, EVENT_TYPES } = require("../utils/eventTracker");
const { deliverExport } = require("../jobs/exportJob");
const { startDeletion, cancelDeletion, deleteStatus } = require("../services/accountDeletion");
const { sendError } = require("../utils/AppError");

const router = express.Router();

const DAY_MS = 24 * 60 * 60 * 1000;

// GET /api/v1/me/legal — acceptance history + any material docs needing (re-)acceptance.
router.get("/legal", async (req, res, next) => {
  try {
    const [acceptances, outstanding] = await Promise.all([
      getHistory(req.userId),
      getOutstanding(req.userId),
    ]);
    res.json({ acceptances, outstanding });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/me/legal/accept — record (re-)acceptance of one or more documents at their current versions.
// Body: { documents: ["terms", "privacy", ...], context?: "reaccept" | "checkout" }.
router.post("/legal/accept", async (req, res, next) => {
  try {
    const documents = Array.isArray(req.body?.documents) ? req.body.documents : [];
    const context = req.body?.context === "checkout" ? "checkout" : "reaccept";
    const valid = documents.filter((d) => currentVersion(d));
    if (valid.length === 0) return sendError(res, "VALIDATION_FAILED", { message: "No valid documents to accept" });

    const { ipHash, userAgent } = requestContext(req);
    for (const document of valid) {
      await recordAcceptance({ userId: req.userId, document, version: currentVersion(document), ipHash, userAgent, context });
    }
    await recordEvent(req.userId, EVENT_TYPES.LEGAL_ACCEPTED, { documents: valid, context }).catch(() => {});

    const outstanding = await getOutstanding(req.userId);
    res.json({ accepted: valid, outstanding, materialDocs: MATERIAL_DOCS });
  } catch (err) {
    next(err);
  }
});

// --- §25e DSAR: export ----------------------------------------------------
// POST /api/v1/me/export — build + deliver a data export. Rate-limited to one per 24h per user.
router.post("/export", async (req, res, next) => {
  try {
    const recent = await prisma.userEvent.findFirst({
      where: { userId: req.userId, type: EVENT_TYPES.DATA_EXPORT_REQUESTED, createdAt: { gte: new Date(Date.now() - DAY_MS) } },
      orderBy: { createdAt: "desc" },
    });
    if (recent) {
      return sendError(res, "RATE_LIMITED", { message: "You can request one export every 24 hours. Check your email for the last one." });
    }
    const result = await deliverExport(req.userId);
    // Never leak a local filesystem path to the client; only surface the signed URL when there is one.
    res.json({ requested: true, mode: result.mode, delivery: result.mode === "s3" ? "email" : "offline", expiresAt: result.expiresAt });
  } catch (err) {
    next(err);
  }
});

// --- §25e DSAR: delete -----------------------------------------------------
// POST /api/v1/me/delete — start the 14-day soft-delete.
router.post("/delete", async (req, res, next) => {
  try {
    const result = await startDeletion(req.userId);
    if (!result) return sendError(res, "NOT_FOUND", { message: "Account not found" });
    res.json({ scheduled: true, deletedAt: result.deletedAt, hardDeleteAt: result.hardDeleteAt });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/me/delete/cancel — undo a pending deletion (must stay reachable while the account is locked).
router.post("/delete/cancel", async (req, res, next) => {
  try {
    const result = await cancelDeletion(req.userId);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/me/delete/status — countdown for the Settings page.
router.get("/delete/status", async (req, res, next) => {
  try {
    res.json(await deleteStatus(req.userId));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
