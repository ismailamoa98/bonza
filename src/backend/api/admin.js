// api/admin.js — Phase 22. Read-only internal account inspector so answering a ticket doesn't need a DB client.
// Gated by requireAdmin (Clerk role claim). NO mutations in this phase. Every view logs an admin_viewed_account
// UserEvent — looking at a user's data is itself an auditable act.
const express = require("express");
const router = express.Router();
const prisma = require("../config/database");
const requireAdmin = require("../middleware/requireAdmin");
const { recordEvent, EVENT_TYPES } = require("../utils/eventTracker");

router.use(requireAdmin);

// GET /user/:userId — the full read-only inspector payload.
router.get("/user/:userId", async (req, res, next) => {
  try {
    const { userId } = req.params;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: { message: "User not found" } });

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

    res.json({
      account: {
        id: user.id,
        name: user.name,
        email: user.email,
        homeAirport: user.homeAirport,
        createdAt: user.createdAt,
        pro: subscription ? { status: subscription.status, currentPeriodEnd: subscription.currentPeriodEnd } : null,
      },
      bookings: bookings.map((b) => ({ id: b.id, description: b.description, leg: b.leg, supplier: b.supplier, supplierReference: b.supplierReference, confirmationMethod: b.confirmationMethod, status: b.status, cashValueGbp: b.cashValueGbp, pointsUsed: b.pointsUsed, creditsAwarded: b.creditsAwarded, confirmedAt: b.confirmedAt })),
      balances: balances.map((a) => ({ programme: a.programme, balance: a.balance, statusTier: a.statusTier, syncState: a.syncState, statementDate: a.statementDate, lastSynced: a.lastSynced })),
      syncRuns: syncRuns.map((r) => ({ startedAt: r.startedAt, mailbox: r.mailbox, programmesChecked: r.programmesChecked, statementsFound: r.statementsFound, balancesUpdated: r.balancesUpdated, balancesVerified: r.balancesVerified, notChecked: r.notChecked })),
      credits: credits.map((c) => ({ amount: c.amount, source: c.source, createdAt: c.createdAt, expiresAt: c.expiresAt })),
      tickets,
      events: events.map((e) => ({ type: e.type, createdAt: e.createdAt, metadata: e.metadata })),
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
