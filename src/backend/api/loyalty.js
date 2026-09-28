// api/loyalty.js — loyalty account sync (email parse or manual) + listing.
// Real email parsing runs only when env.hasEmailSync + an access token are present;
// otherwise a deterministic mock sync keeps the flow working offline.
const express = require("express");
const env = require("../config/env");
const prisma = require("../config/database");
const {
  parseEmailsForUser,
  mockSyncForUser,
  PROGRAMME_VALUATIONS,
  PROGRAMME_NAMES,
} = require("../services/emailLoyaltySync");
const oauth = require("../services/loyaltyOAuth");
const balanceSync = require("../services/balanceSync");
const { recordEvent, EVENT_TYPES } = require("../utils/eventTracker");

const router = express.Router();

const SUPPORTED_PROVIDERS = ["gmail", "outlook"];
const round2 = (n) => Math.round(Number(n) * 100) / 100;
// Column names for each provider's connection flag + stored refresh token on User.
const CONN_FLAG = { gmail: "gmailConnected", outlook: "outlookConnected" };
const REFRESH_COL = { gmail: "gmailRefreshToken", outlook: "outlookRefreshToken" };

router.post("/sync-email", async (req, res, next) => {
  try {
    const provider = req.body.provider || "gmail";
    // Accept the spec's legacy `gmailAccessToken` as well as a generic `accessToken`.
    const accessToken = req.body.accessToken || req.body.gmailAccessToken || null;

    if (!SUPPORTED_PROVIDERS.includes(provider)) {
      return res.status(400).json({
        error: { message: `Unsupported provider '${provider}'. Use one of: ${SUPPORTED_PROVIDERS.join(", ")}` },
      });
    }

    // Real path requires the gate ON and a token. Gate on but no token = client
    // error; gate off (dev) = fall back to the deterministic mock sync.
    if (env.hasEmailSync && !accessToken) {
      return res.status(400).json({ error: { message: "Email access token required" } });
    }
    const useReal = env.hasEmailSync && Boolean(accessToken);

    // Real path returns { updatedAccounts, conflicts }; mock returns a plain array.
    let accounts;
    let conflicts = [];
    if (useReal) {
      ({ updatedAccounts: accounts, conflicts } = await parseEmailsForUser(req.userId, accessToken, provider));
    } else {
      accounts = await mockSyncForUser(req.userId);
    }

    recordEvent(req.userId, EVENT_TYPES.LOYALTY_SYNCED, {
      provider,
      synced: accounts.length,
      conflicts: conflicts.length,
      mock: !useReal,
    });

    res.json({ synced: accounts.length, accounts, conflicts, provider, mock: !useReal });
  } catch (err) {
    next(err);
  }
});

router.get("/accounts", async (req, res, next) => {
  try {
    const accounts = await prisma.loyaltyAccount.findMany({
      where: { userId: req.userId },
      orderBy: { valueGbp: "desc" },
    });
    res.json({ accounts });
  } catch (err) {
    next(err);
  }
});

// ── Phase 10: connection status, OAuth start, sync-now, disconnect, manual add/remove ──

// Which providers have OAuth configured (real path) + whether this user is connected.
router.get("/providers", async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { gmailConnected: true, outlookConnected: true },
    });
    res.json({
      providers: {
        gmail: { configured: env.hasGmailOAuth, connected: Boolean(user?.gmailConnected) },
        outlook: { configured: env.hasOutlookOAuth, connected: Boolean(user?.outlookConnected) },
      },
    });
  } catch (err) {
    next(err);
  }
});

// Begin the OAuth handshake — returns the provider consent URL the frontend redirects to.
// `from` (onboarding|settings) rides in the signed state so the callback returns there.
router.get("/oauth/:provider/start", async (req, res, next) => {
  try {
    const { provider } = req.params;
    if (!SUPPORTED_PROVIDERS.includes(provider)) {
      return res.status(400).json({ error: { message: `Unsupported provider '${provider}'` } });
    }
    if (!oauth.isConfigured(provider)) {
      return res.status(400).json({
        error: { message: `${provider} OAuth is not configured`, code: "OAUTH_NOT_CONFIGURED" },
      });
    }
    const from = req.query.from === "onboarding" ? "onboarding" : "settings";
    const state = oauth.signState({ userId: req.userId, provider, from });
    res.json({ url: oauth.authUrl(provider, state) });
  } catch (err) {
    next(err);
  }
});

// Re-parse balances using a stored refresh token (Settings > "Sync now").
router.post("/sync-now", async (req, res, next) => {
  try {
    const provider = req.body.provider;
    if (!SUPPORTED_PROVIDERS.includes(provider)) {
      return res.status(400).json({ error: { message: `Unsupported provider '${provider}'` } });
    }
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    const refreshToken = user?.[REFRESH_COL[provider]];
    if (!user?.[CONN_FLAG[provider]] || !refreshToken) {
      return res.status(400).json({ error: { message: `${provider} is not connected` } });
    }
    const accessToken = await oauth.accessFromRefresh(provider, refreshToken);
    const { updatedAccounts, conflicts } = await parseEmailsForUser(req.userId, accessToken, provider);
    recordEvent(req.userId, EVENT_TYPES.LOYALTY_SYNCED, { provider, synced: updatedAccounts.length, resync: true });
    res.json({ synced: updatedAccounts.length, accounts: updatedAccounts, conflicts });
  } catch (err) {
    next(err);
  }
});

router.post("/disconnect", async (req, res, next) => {
  try {
    const provider = req.body.provider;
    if (!SUPPORTED_PROVIDERS.includes(provider)) {
      return res.status(400).json({ error: { message: `Unsupported provider '${provider}'` } });
    }
    await prisma.user.update({
      where: { id: req.userId },
      data: { [CONN_FLAG[provider]]: false, [REFRESH_COL[provider]]: null },
    });
    res.json({ disconnected: true, provider });
  } catch (err) {
    next(err);
  }
});

// Manual balance entry — the universal fallback when a user won't connect email.
router.post("/accounts", async (req, res, next) => {
  try {
    const { accountId, programme, balance, statusTier, accountNumber, loyaltyEmailAddress, pointsExpireAt } =
      req.body || {};
    if (!programme) {
      return res.status(400).json({ error: { message: "programme is required" } });
    }
    // Validate against the full Phase 14 programme catalog (18 programmes), pricing from its cents/pt.
    const valuation = await prisma.programmeValuation.findUnique({ where: { programme } });
    if (!valuation) {
      return res.status(400).json({ error: { message: `Unknown programme '${programme}'` } });
    }
    const bal = parseInt(balance, 10);
    if (!Number.isFinite(bal) || bal < 0) {
      return res.status(400).json({ error: { message: "balance must be a non-negative number" } });
    }
    const valueGbp = round2(bal * (valuation.centsPerPoint / 100));
    const number = accountNumber?.trim() || null;
    // Optional user-supplied expiry date — drives the "Expiring soon" tile and the expiry-warning emails.
    let expireAt = null;
    if (pointsExpireAt) {
      const d = new Date(pointsExpireAt);
      if (!Number.isNaN(d.getTime())) expireAt = d;
    }
    const fields = {
      balance: bal, valueGbp, statusTier: statusTier || null, lastSynced: new Date(), syncMethod: "manual",
      accountNumber: number, loyaltyEmailAddress: loyaltyEmailAddress?.trim() || null,
      pointsExpireAt: expireAt,
    };

    // A user can hold several memberships in one programme, keyed by membership number:
    //  · editing a specific account (accountId) updates that row — its number can be corrected;
    //  · otherwise the number is the identity — a matching (programme, number) updates it, a new number
    //    creates a separate membership.
    let target = null;
    if (accountId) {
      target = await prisma.loyaltyAccount.findFirst({ where: { id: accountId, userId: req.userId } });
      if (!target) return res.status(404).json({ error: { message: "Account not found" } });
    } else {
      target = await prisma.loyaltyAccount.findFirst({
        where: { userId: req.userId, programme, accountNumber: number },
      });
    }

    const account = target
      ? await prisma.loyaltyAccount.update({ where: { id: target.id }, data: { programme, ...fields } })
      : await prisma.loyaltyAccount.create({ data: { userId: req.userId, programme, ...fields } });

    recordEvent(req.userId, EVENT_TYPES.LOYALTY_SYNCED, { provider: "manual", synced: 1, programme });
    res.status(target ? 200 : 201).json({
      account,
      name: valuation.displayName || PROGRAMME_NAMES[programme] || programme,
    });
  } catch (err) {
    next(err);
  }
});

router.delete("/accounts/:programme", async (req, res, next) => {
  try {
    const { count } = await prisma.loyaltyAccount.deleteMany({
      where: { userId: req.userId, programme: req.params.programme },
    });
    if (!count) return res.status(404).json({ error: { message: "Account not found" } });
    res.json({ removed: true, programme: req.params.programme });
  } catch (err) {
    next(err);
  }
});

// ── Phase 15+: deep sync ("Gathering your points") — client-driven stepping for real progress ──────────

// Real when an inbox is connected + gated on; otherwise the deterministic offline mock.
function realProvider(user, mailbox) {
  const order = mailbox ? [mailbox] : ["gmail", "outlook"];
  return order.find((p) => user?.[CONN_FLAG[p]] && user?.[REFRESH_COL[p]]) || null;
}

// POST /loyalty/deep-sync/start → create a run, return the programme list to step through.
router.post("/deep-sync/start", async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    const provider = env.hasEmailSync ? realProvider(user, req.body.provider) : null;
    const programmes = await balanceSync.emailVerifiableProgrammes();
    const run = await prisma.balanceSyncRun.create({
      data: { userId: req.userId, mailbox: provider || "gmail", modalPending: false },
    });
    res.json({ runId: run.id, programmes, total: programmes.length, mock: !provider });
  } catch (err) {
    next(err);
  }
});

// POST /loyalty/deep-sync/step { runId, programme } → sync one programme, bump the run counts.
router.post("/deep-sync/step", async (req, res, next) => {
  try {
    const { runId, programme } = req.body || {};
    const run = await prisma.balanceSyncRun.findFirst({ where: { id: runId, userId: req.userId } });
    if (!run) return res.status(404).json({ error: { message: "run not found" } });

    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    let ctx;
    if (env.hasEmailSync) {
      // Real mode: parse the connected inbox only. If no inbox is connected (or the token is dead),
      // check nothing and report not_checked — never fabricate a "verified" balance from demo data.
      const provider = realProvider(user, run.mailbox);
      const accessToken = provider
        ? await oauth.accessFromRefresh(provider, user[REFRESH_COL[provider]]).catch(() => null)
        : null;
      ctx = { mock: false, provider: accessToken ? provider : null, accessToken };
    } else {
      // Offline demo only: deterministic mock balances so the flow stays demonstrable without creds.
      ctx = { mock: true };
    }

    const outcome = await balanceSync.syncOneProgramme(req.userId, programme, ctx);

    const data = { programmesChecked: { increment: 1 } };
    if (outcome === "updated") Object.assign(data, { balancesUpdated: { increment: 1 }, statementsFound: { increment: 1 } });
    else if (outcome === "verified" || outcome === "created") Object.assign(data, { balancesVerified: { increment: 1 }, statementsFound: { increment: 1 } });
    else if (outcome === "override_held") data.statementsFound = { increment: 1 };
    else if (outcome === "not_found") data.notChecked = { increment: 1 };
    const updated = await prisma.balanceSyncRun.update({ where: { id: run.id }, data });

    res.json({ outcome, processed: updated.programmesChecked });
  } catch (err) {
    next(err);
  }
});

// POST /loyalty/deep-sync/finish { runId } → mark the unseen programmes not_checked, close the run.
router.post("/deep-sync/finish", async (req, res, next) => {
  try {
    const run = await prisma.balanceSyncRun.findFirst({ where: { id: req.body.runId, userId: req.userId } });
    if (!run) return res.status(404).json({ error: { message: "run not found" } });
    const seen = (await balanceSync.emailVerifiableProgrammes()).map((p) => p.programme);
    await balanceSync.markNotChecked(req.userId, seen);
    const finished = await prisma.balanceSyncRun.update({
      where: { id: run.id },
      data: { completedAt: new Date(), modalPending: run.balancesUpdated > 0 },
    });
    recordEvent(req.userId, EVENT_TYPES.LOYALTY_SYNCED, { provider: run.mailbox, deep: true, updated: finished.balancesUpdated });
    res.json({
      counts: {
        updated: finished.balancesUpdated,
        verified: finished.balancesVerified,
        notChecked: finished.notChecked,
        statementsFound: finished.statementsFound,
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
