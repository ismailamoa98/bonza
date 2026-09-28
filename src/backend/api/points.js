// api/points.js — Phase 14 Points Portfolio. Two read endpoints powering the /points page. Renders from
// cached ProgrammeValuation + TransferPartner rows (seeded once, refreshed nightly) — no live third-party
// calls. Auth (req.userId, dev-fallback) applied at mount in server.js.
const express = require("express");
const router = express.Router();
const prisma = require("../config/database");
const { ownedOr403 } = require("../utils/ownedOr403");
const { getCreditBalance } = require("../services/creditsService");
const { EMAIL_VERIFIABLE } = require("../services/emailLoyaltySync");
const { findDuplicates, setManualBalance } = require("../services/balanceSync");

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

// GET /api/v1/points/portfolio — everything the page needs in one call.
router.get("/portfolio", async (req, res, next) => {
  try {
    const [accounts, valuations, creditBalance, user] = await Promise.all([
      prisma.loyaltyAccount.findMany({ where: { userId: req.userId }, orderBy: { valueGbp: "desc" } }),
      prisma.programmeValuation.findMany(),
      getCreditBalance(req.userId).catch(() => 0),
      prisma.user.findUnique({
        where: { id: req.userId },
        select: { gmailConnected: true, outlookConnected: true },
      }),
    ]);

    const valMap = Object.fromEntries(valuations.map((v) => [v.programme, v]));

    const enriched = accounts.map((a) => {
      const v = valMap[a.programme] || {};
      return {
        id: a.id,
        programme: a.programme,
        displayName: v.displayName || a.programme,
        category: v.category || "other",
        brandColor: v.brandColor || "#9a9088",
        logoUrl: v.logoUrl || null,
        initials: v.initials || "?",
        currency: v.currency || "pts",
        balance: a.balance,
        valueGbp: a.valueGbp,
        centsPerPoint: v.centsPerPoint || 0,
        benchmarkCpp: v.benchmarkCpp || 0,
        aboveBenchmark: (v.centsPerPoint || 0) > (v.benchmarkCpp || 0),
        statusTier: a.statusTier,
        accountMasked: a.programmeAccountId,
        // For pre-filling a manual edit (the user's own recorded details) + routing the Edit affordance.
        accountNumber: a.accountNumber,
        loyaltyEmailAddress: a.loyaltyEmailAddress,
        verifyMethod: EMAIL_VERIFIABLE.has(a.programme) ? "email" : "manual",
        expiresAt: a.pointsExpireAt,
        daysToExpiry: a.pointsExpireAt
          ? Math.ceil((new Date(a.pointsExpireAt) - Date.now()) / 86400000)
          : null,
        isTransferable: v.isTransferable || false,
        hasPointsProgramme: v.hasPointsProgramme !== false, // false for car-rental status programmes
        lastSynced: a.lastSynced,
        syncMethod: a.syncMethod,
        syncState: a.syncState || "not_checked", // Phase 15: row state pill
        manualOverride: !!a.manualOverrideAt,
      };
    });

    const transferable = enriched.filter((a) => a.isTransferable);
    const expiring = enriched
      .filter((a) => a.daysToExpiry !== null && a.daysToExpiry <= 120)
      .sort((a, b) => a.daysToExpiry - b.daysToExpiry)[0] || null;

    // How many active transfer routes the user can actually use (from their held transferable programmes).
    const transferPartnerCount = transferable.length
      ? await prisma.transferPartner.count({
          where: { fromProgramme: { in: transferable.map((a) => a.programme) }, isActive: true },
        })
      : 0;

    const byCategory = {
      card: enriched.filter((a) => a.category === "card"),
      hotel: enriched.filter((a) => a.category === "hotel"),
      airline: enriched.filter((a) => a.category === "airline"),
      car: enriched.filter((a) => a.category === "car"),
    };

    // Full addable catalog (point-earning programmes) for the "Add programme" panel dropdown.
    const catalog = valuations
      .filter((v) => v.hasPointsProgramme !== false)
      .map((v) => ({
        programme: v.programme,
        displayName: v.displayName,
        category: v.category,
        brandColor: v.brandColor,
        logoUrl: v.logoUrl || null,
        initials: v.initials || "?",
        centsPerPoint: v.centsPerPoint,
        currency: v.currency,
        // How this programme's balance can be checked: "email" (statement emails carry the balance —
        // hotels + major airlines) vs "manual" (banks/cards + long-tail — enter it yourself).
        verifyMethod: EMAIL_VERIFIABLE.has(v.programme) ? "email" : "manual",
      }))
      .sort((a, b) => a.category.localeCompare(b.category) || a.displayName.localeCompare(b.displayName));

    res.json({
      catalog,
      metrics: {
        creditBalance: round2(creditBalance),
        creditExpiresAt: null,
        transferableBalance: transferable.reduce((s, a) => s + a.balance, 0),
        transferableProgrammes: transferable.map((a) => a.displayName),
        transferPartnerCount,
        expiring: expiring
          ? {
              programme: expiring.displayName,
              balance: expiring.balance,
              currency: expiring.currency,
              daysToExpiry: expiring.daysToExpiry,
            }
          : null,
      },
      byCategory,
      totalConnected: enriched.length,
      emailConnected: Boolean(user?.gmailConnected || user?.outlookConnected),
      lastSynced: accounts[0]?.lastSynced || null,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/points/programme/:accountId — detail panel: held value, best transfer, all partner options.
router.get("/programme/:accountId", async (req, res, next) => {
  try {
    const account = await prisma.loyaltyAccount.findUnique({ where: { id: req.params.accountId } });
    if (!ownedOr403(account, req.userId, res)) return;

    const [valuation, partners] = await Promise.all([
      prisma.programmeValuation.findUnique({ where: { programme: account.programme } }),
      prisma.transferPartner.findMany({
        where: { fromProgramme: account.programme, isActive: true },
        include: { to: true },
      }),
    ]);

    const heldValue = (account.balance * (valuation?.centsPerPoint || 0)) / 100;

    const options = partners
      .map((p) => {
        const resulting = Math.floor(
          account.balance * (p.ratioTo / p.ratioFrom) * (p.bonusActive ? 1 + (p.bonusPercent || 0) / 100 : 1)
        );
        const value = (resulting * p.to.centsPerPoint) / 100;
        return {
          programme: p.toProgramme,
          displayName: p.to.displayName,
          brandColor: p.to.brandColor,
          ratio: `${p.ratioFrom} : ${p.ratioTo}`,
          resultingBalance: resulting,
          centsPerPoint: p.to.centsPerPoint,
          valueGbp: round2(value),
          upliftGbp: round2(value - heldValue),
          upliftPercent: heldValue > 0 ? Math.round(((value - heldValue) / heldValue) * 100) : 0,
          isBetterThanHolding: value > heldValue,
          transferTimeHrs: p.transferTimeHrs,
          bonusActive: p.bonusActive,
          bonusPercent: p.bonusPercent,
        };
      })
      .sort((a, b) => b.valueGbp - a.valueGbp);

    const best = options[0] || null;

    res.json({
      account: {
        id: account.id,
        programme: account.programme,
        displayName: valuation?.displayName || account.programme,
        balance: account.balance,
        currency: valuation?.currency || "pts",
        statusTier: account.statusTier,
        statusRenewsAt: account.statusRenewsAt,
        nightsThisYear: account.nightsThisYear,
        accountMasked: account.programmeAccountId,
        expiresAt: account.pointsExpireAt,
      },
      heldValueGbp: round2(heldValue),
      centsPerPoint: valuation?.centsPerPoint || 0,
      bestTransfer: best,
      holdIsBetter: best ? best.valueGbp <= heldValue : true,
      transferOptions: options,
      ratesLastRefreshed: valuation?.lastRefreshedAt || null,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/points/activity — Phase 14 activity feed (read-only). Recent rows + monthly earn totals.
router.get("/activity", async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
    const offset = parseInt(req.query.offset, 10) || 0;
    const where = { userId: req.userId, ...(req.query.programme ? { programme: req.query.programme } : {}) };

    const [activity, total, valuations] = await Promise.all([
      prisma.pointsActivity.findMany({ where, orderBy: { occurredAt: "desc" }, take: limit, skip: offset }),
      prisma.pointsActivity.count({ where }),
      prisma.programmeValuation.findMany(),
    ]);
    const valMap = Object.fromEntries(valuations.map((v) => [v.programme, v]));

    // Monthly earn totals for the summary card — last 4 months, positive amounts only.
    const since = new Date();
    since.setMonth(since.getMonth() - 4);
    const recent = await prisma.pointsActivity.findMany({
      where: { userId: req.userId, amount: { gt: 0 }, occurredAt: { gte: since } },
      select: { amount: true, occurredAt: true },
    });
    const monthly = {};
    for (const r of recent) {
      const key = r.occurredAt.toLocaleDateString("en-GB", { month: "short", year: "2-digit" });
      monthly[key] = (monthly[key] || 0) + r.amount;
    }

    res.json({
      activity: activity.map((a) => ({
        ...a,
        programmeName: valMap[a.programme]?.displayName || a.programme,
        brandColor: valMap[a.programme]?.brandColor || "#9a9088",
        logoUrl: valMap[a.programme]?.logoUrl || null,
        initials: valMap[a.programme]?.initials || "?",
      })),
      total,
      hasMore: offset + activity.length < total,
      monthlyEarned: monthly,
      totalEarned: Object.values(monthly).reduce((s, v) => s + v, 0),
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/points/review — Phase 15 statement-authoritative outcome report.
router.get("/review", async (req, res, next) => {
  try {
    const [accounts, valuations, duplicates, lastRun, user] = await Promise.all([
      prisma.loyaltyAccount.findMany({ where: { userId: req.userId } }),
      prisma.programmeValuation.findMany(),
      findDuplicates(req.userId),
      prisma.balanceSyncRun.findFirst({
        where: { userId: req.userId, completedAt: { not: null } },
        orderBy: { startedAt: "desc" },
      }),
      prisma.user.findUnique({ where: { id: req.userId }, select: { gmailConnected: true, outlookConnected: true } }),
    ]);

    const valMap = Object.fromEntries(valuations.map((v) => [v.programme, v]));
    const dupIds = new Set(duplicates.map((d) => d.id));

    const enrich = (a) => {
      const v = valMap[a.programme] || {};
      return {
        id: a.id,
        programme: a.programme,
        displayName: v.displayName || a.programme,
        brandColor: v.brandColor || "#8A8078",
        logoUrl: v.logoUrl || null,
        initials: v.initials || "?",
        currency: v.currency || "pts",
        balance: a.balance,
        previousBalance: a.previousBalance,
        statementDate: a.statementDate,
        statementSource: a.statementSource,
        manualOverride: !!a.manualOverrideAt,
        state: dupIds.has(a.id) ? "duplicate" : a.syncState || "not_checked",
      };
    };
    const all = accounts.map(enrich);

    res.json({
      grouped: {
        updated: all.filter((a) => a.state === "updated"),
        verified: all.filter((a) => a.state === "verified"),
        duplicate: all.filter((a) => a.state === "duplicate"),
        notChecked: all.filter((a) => a.state === "not_checked"),
      },
      lastRun: lastRun
        ? {
            id: lastRun.id,
            completedAt: lastRun.completedAt,
            mailbox: lastRun.mailbox,
            statementsFound: lastRun.statementsFound,
            balancesUpdated: lastRun.balancesUpdated,
            modalPending: lastRun.modalPending,
          }
        : null,
      emailConnected: { gmail: !!user?.gmailConnected, outlook: !!user?.outlookConnected },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/points/review/acknowledge — user dismissed the discrepancy modal.
router.post("/review/acknowledge", async (req, res, next) => {
  try {
    await prisma.balanceSyncRun.updateMany({
      where: { userId: req.userId, modalPending: true },
      data: { modalPending: false },
    });
    res.json({ acknowledged: true });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/v1/points/balance/:accountId — manual override (holds until the next statement).
router.patch("/balance/:accountId", async (req, res, next) => {
  try {
    const account = await setManualBalance(req.userId, req.params.accountId, req.body.balance);
    if (!account) return res.status(404).json({ error: { message: "Account not found" } });
    res.json({ account });
  } catch (err) {
    if (/non-negative/.test(err.message)) return res.status(400).json({ error: { message: err.message } });
    next(err);
  }
});

// DELETE /api/v1/points/duplicate/:accountId — remove one duplicate row.
router.delete("/duplicate/:accountId", async (req, res, next) => {
  try {
    const account = await prisma.loyaltyAccount.findFirst({ where: { id: req.params.accountId, userId: req.userId } });
    if (!account) return res.status(404).json({ error: { message: "Account not found" } });
    await prisma.loyaltyAccount.delete({ where: { id: account.id } });
    res.json({ deleted: true });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/v1/points/account/:accountId — remove one owned loyalty account (e.g. a phantom balance
// the user never entered, sitting under "Not checked").
router.delete("/account/:accountId", async (req, res, next) => {
  try {
    const account = await prisma.loyaltyAccount.findFirst({ where: { id: req.params.accountId, userId: req.userId } });
    if (!account) return res.status(404).json({ error: { message: "Account not found" } });
    await prisma.loyaltyAccount.delete({ where: { id: account.id } });
    res.json({ deleted: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
