// api/admin.js — Phase 22. Read-only internal account inspector so answering a ticket doesn't need a DB client.
// Gated by requireAdmin (Clerk role claim). NO mutations in this phase. Every view logs an admin_viewed_account
// UserEvent — looking at a user's data is itself an auditable act.
const express = require("express");
const { sendError } = require("../utils/AppError");
const router = express.Router();
const prisma = require("../config/database");
const requireAdmin = require("../middleware/requireAdmin");
const { recordEvent, EVENT_TYPES } = require("../utils/eventTracker");
const { recordAudit, ACTIONS } = require("../services/auditService");
const { successRateByProgramme } = require("../services/statementStats");
const { recentRuns, jobHealth, activeLeases } = require("../services/jobStats");

router.use(requireAdmin);

// GET /jobs — Phase 27 §27f. Read-only orchestration view: the last 50 job executions, per-job health
// (last run / last success / stale), and the leases held right now.
router.get("/jobs", async (req, res, next) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 200);
    const [runs, health, leases] = await Promise.all([recentRuns({ limit }), jobHealth(), activeLeases()]);
    res.json({
      runs: runs.map((r) => ({
        id: r.id, name: r.name, outcome: r.outcome,
        startedAt: r.startedAt, finishedAt: r.finishedAt,
        items: r.items, externalCalls: r.externalCalls, errors: r.errors,
        error: r.error, requestId: r.requestId,
      })),
      health,
      leases: leases.map((l) => ({ name: l.name, holder: l.holder, acquiredAt: l.acquiredAt, expiresAt: l.expiresAt })),
    });
  } catch (err) {
    next(err);
  }
});

// GET /parsers — Phase 27 §27c. Read-only per-programme statement-parse success-rate over a trailing window
// (default 24h). The same figures the nightly alarm watches (< 80% with ≥5 attempts), for a human to eyeball.
router.get("/parsers", async (req, res, next) => {
  try {
    const sinceHours = Math.min(Math.max(parseInt(req.query.hours, 10) || 24, 1), 720);
    const rows = await successRateByProgramme({ sinceHours });
    const ALARM_THRESHOLD = 0.8;
    const MIN_ATTEMPTS = 5;
    res.json({
      sinceHours,
      threshold: ALARM_THRESHOLD,
      programmes: rows.map((p) => ({
        ...p,
        alarming: p.total >= MIN_ATTEMPTS && p.successRate < ALARM_THRESHOLD,
      })),
    });
  } catch (err) {
    next(err);
  }
});

// GET /user/:userId — the full read-only inspector payload.
router.get("/user/:userId", async (req, res, next) => {
  try {
    const { userId } = req.params;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return sendError(res, "NOT_FOUND", { message: "User not found" });

    const [bookings, balances, syncRuns, credits, tickets, events] = await Promise.all([
      prisma.booking.findMany({ where: { userId }, orderBy: { createdAt: "desc" } }),
      prisma.loyaltyAccount.findMany({ where: { userId } }),
      prisma.balanceSyncRun.findMany({ where: { userId }, orderBy: { startedAt: "desc" }, take: 10 }),
      prisma.bonzaCredit.findMany({ where: { userId }, orderBy: { createdAt: "desc" } }),
      prisma.supportTicket.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, select: { reference: true, subject: true, status: true, urgency: true, slaTarget: true, createdAt: true } }),
      prisma.userEvent.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 50 }),
    ]);
    const subscription = await prisma.subscription.findUnique({ where: { userId } });

    // Audit: an admin opened this account.
    recordEvent(req.userId, EVENT_TYPES.ADMIN_VIEWED_ACCOUNT, { viewedUserId: userId, devAdmin: !!req.isDevAdmin }).catch(() => {});
    recordAudit({ action: ACTIONS.ADMIN_VIEWED_ACCOUNT, actorType: "admin", actorId: req.userId, subjectUserId: userId, entity: "User", entityId: userId, after: { devAdmin: !!req.isDevAdmin } });

    res.json({
      account: {
        id: user.id,
        name: user.name,
        email: user.email,
        homeAirport: user.homeAirport,
        createdAt: user.createdAt,
        pro: subscription ? { status: subscription.status, currentPeriodEnd: subscription.currentPeriodEnd } : null,
      },
      bookings: bookings.map((b) => ({ id: b.id, description: b.description, leg: b.leg, supplier: b.supplier, supplierReference: b.supplierReference, confirmationMethod: b.confirmationMethod, status: b.status, cashAmount: b.cashAmount, cashCurrency: b.cashCurrency, pointsUsed: b.pointsUsed, creditsAwardedPence: b.creditsAwardedPence, confirmedAt: b.confirmedAt })),
      balances: balances.map((a) => ({ programme: a.programme, balance: a.balance, statusTier: a.statusTier, syncState: a.syncState, statementDate: a.statementDate, lastSynced: a.lastSynced })),
      syncRuns: syncRuns.map((r) => ({ startedAt: r.startedAt, mailbox: r.mailbox, programmesChecked: r.programmesChecked, statementsFound: r.statementsFound, balancesUpdated: r.balancesUpdated, balancesVerified: r.balancesVerified, notChecked: r.notChecked })),
      credits: credits.map((c) => ({ amountPence: c.amountPence, source: c.source, createdAt: c.createdAt, expiresAt: c.expiresAt })),
      tickets,
      events: events.map((e) => ({ type: e.type, createdAt: e.createdAt, metadata: e.metadata })),
    });
  } catch (err) {
    next(err);
  }
});

// GET /audit — Phase 27 §27k. Read-only append-only audit trail for a subject user (newest first), optionally
// filtered by action. Reading the trail is itself audited (admin.viewed_audit).
router.get("/audit", async (req, res, next) => {
  try {
    const { subjectUserId, action } = req.query;
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 100, 1), 500);
    const where = {
      ...(subjectUserId ? { subjectUserId: String(subjectUserId) } : {}),
      ...(action ? { action: String(action) } : {}),
    };
    const events = await prisma.auditEvent.findMany({ where, orderBy: { at: "desc" }, take: limit });
    if (subjectUserId) {
      recordAudit({ action: ACTIONS.ADMIN_VIEWED_AUDIT, actorType: "admin", actorId: req.userId, subjectUserId: String(subjectUserId), entity: "AuditEvent" });
    }
    res.json({
      events: events.map((e) => ({
        id: e.id, at: e.at, actorType: e.actorType, actorId: e.actorId, subjectUserId: e.subjectUserId,
        action: e.action, entity: e.entity, entityId: e.entityId, before: e.before, after: e.after,
        requestId: e.requestId, source: e.source,
      })),
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
