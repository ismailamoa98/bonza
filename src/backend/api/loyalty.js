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
    const { programme, balance, statusTier } = req.body || {};
    if (!programme || !(programme in PROGRAMME_VALUATIONS)) {
      return res.status(400).json({
        error: { message: `Unknown programme. One of: ${Object.keys(PROGRAMME_VALUATIONS).join(", ")}` },
      });
    }
    const bal = parseInt(balance, 10);
    if (!Number.isFinite(bal) || bal < 0) {
      return res.status(400).json({ error: { message: "balance must be a non-negative number" } });
    }
    const valueGbp = round2(bal * PROGRAMME_VALUATIONS[programme]);
    const account = await prisma.loyaltyAccount.upsert({
      where: { userId_programme: { userId: req.userId, programme } },
      update: { balance: bal, valueGbp, statusTier: statusTier || null, lastSynced: new Date(), syncMethod: "manual" },
      create: { userId: req.userId, programme, balance: bal, valueGbp, statusTier: statusTier || null, lastSynced: new Date(), syncMethod: "manual" },
    });
    recordEvent(req.userId, EVENT_TYPES.LOYALTY_SYNCED, { provider: "manual", synced: 1, programme });
    res.status(201).json({ account, name: PROGRAMME_NAMES[programme] || programme });
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

module.exports = router;
