// services/emailLoyaltySync.js — loyalty balance sync via email parsing.
// Programme detection is provider-independent; only "fetch the latest matching body"
// differs, abstracted behind EMAIL_PROVIDERS (Gmail/googleapis, Outlook/Graph).
// Offline by default: real parsing needs env.hasEmailSync + an access token, else
// mockSyncForUser() runs so the endpoints work end-to-end in dev.
const { google } = require("googleapis");
const { Client } = require("@microsoft/microsoft-graph-client");
const prisma = require("../config/database");
const { getMockPlaidData } = require("../utils/mockPlaidData");
const { logger } = require("../utils/logger");

// Programme detection patterns (provider-independent — they match email content).
const PROGRAMME_PATTERNS = {
  marriott_bonvoy: {
    senderDomains: ["marriott.com", "marriotbonvoy.com"],
    subjectPatterns: ["Marriott Bonvoy", "your points balance", "statement"],
    balanceRegex: /(\d{1,3}(?:,\d{3})*)\s*(?:Marriott Bonvoy\s*)?(?:points|pts)/i,
    statusRegex: /(?:Silver|Gold|Platinum|Titanium|Ambassador)\s*Elite/i,
  },
  hilton_honors: {
    senderDomains: ["hilton.com", "hiltonhonors.com"],
    subjectPatterns: ["Hilton Honors", "points statement"],
    balanceRegex: /(\d{1,3}(?:,\d{3})*)\s*(?:Hilton Honors\s*)?(?:points|pts)/i,
    statusRegex: /(?:Member|Silver|Gold|Diamond)/i,
  },
  world_of_hyatt: {
    senderDomains: ["hyatt.com"],
    subjectPatterns: ["World of Hyatt", "your points"],
    balanceRegex: /(\d{1,3}(?:,\d{3})*)\s*(?:World of Hyatt\s*)?(?:points|pts)/i,
    statusRegex: /(?:Member|Discoverist|Explorist|Globalist)/i,
  },
  ihg_one: {
    senderDomains: ["ihg.com", "ihgonewards.com"],
    subjectPatterns: ["IHG One Rewards", "your points"],
    balanceRegex: /(\d{1,3}(?:,\d{3})*)\s*(?:IHG\s*)?(?:points|pts)/i,
    statusRegex: /(?:Club|Silver Elite|Gold Elite|Platinum Elite|Spire Elite)/i,
  },
  amex_mr: {
    senderDomains: ["americanexpress.com", "amex.com"],
    subjectPatterns: ["Membership Rewards", "statement", "monthly summary"],
    balanceRegex: /Membership\s*Rewards[^\d]*(\d{1,3}(?:,\d{3})*)\s*(?:points|pts)/i,
    statusRegex: null,
  },
  chase_ur: {
    senderDomains: ["chase.com"],
    subjectPatterns: ["Ultimate Rewards", "statement"],
    balanceRegex: /Ultimate\s*Rewards[^\d]*(\d{1,3}(?:,\d{3})*)\s*(?:points|pts)/i,
    statusRegex: null,
  },
  united_mp: {
    senderDomains: ["united.com"],
    subjectPatterns: ["MileagePlus", "miles statement"],
    balanceRegex: /(\d{1,3}(?:,\d{3})*)\s*(?:MileagePlus\s*)?miles/i,
    statusRegex: /(?:Member|Silver|Gold|Platinum|1K)/i,
  },
  ba_avios: {
    senderDomains: ["britishairways.com", "ba.com"],
    subjectPatterns: ["Executive Club", "Avios statement"],
    balanceRegex: /(\d{1,3}(?:,\d{3})*)\s*Avios/i,
    statusRegex: /(?:Blue|Bronze|Silver|Gold)\s*(?:Executive Club)?/i,
  },
};

// Points-to-GBP valuation (£ per point; comments are pence per point).
const PROGRAMME_VALUATIONS = {
  marriott_bonvoy: 0.008, // 0.8p/pt
  hilton_honors: 0.004, // 0.4p/pt
  world_of_hyatt: 0.018, // 1.8p/pt (best hotel programme)
  ihg_one: 0.006, // 0.6p/pt
  amex_mr: 0.018, // 1.8p/pt (transfer value)
  chase_ur: 0.017, // 1.7p/pt
  united_mp: 0.012, // 1.2p/pt
  ba_avios: 0.011, // 1.1p/pt
};

// Human-readable programme name (for conflict messages / UI copy).
const PROGRAMME_NAMES = {
  marriott_bonvoy: "Marriott Bonvoy",
  hilton_honors: "Hilton Honors",
  world_of_hyatt: "World of Hyatt",
  ihg_one: "IHG One Rewards",
  amex_mr: "American Express Membership Rewards",
  chase_ur: "Chase Ultimate Rewards",
  united_mp: "United MileagePlus",
  ba_avios: "British Airways Avios",
};
const formatProgramme = (p) => PROGRAMME_NAMES[p] || p;

// ── Duplicate-account prevention (8l) ──────────────────────────────────────────

// Block the same loyalty account from being linked to two different Bonza users
// (which would let them each claim the free first-booking cashback). Returns
// { conflict, message } when this programme + (account id OR statement email) is
// already linked to another user. With neither identifier supplied (the offline mock
// path), there's nothing to match on, so it never trips. Belt-and-braces alongside the
// @@unique constraints on LoyaltyAccount — this gives a friendly message before the DB
// write would otherwise throw.
async function checkLoyaltyAccountConflict(userId, programme, programmeAccountId, loyaltyEmailAddress) {
  const ors = [];
  if (programmeAccountId) ors.push({ programmeAccountId });
  if (loyaltyEmailAddress) ors.push({ loyaltyEmailAddress });
  if (!ors.length) return { conflict: false };

  const existing = await prisma.loyaltyAccount.findFirst({
    where: { programme, userId: { not: userId }, OR: ors },
  });

  if (existing) {
    return {
      conflict: true,
      message: `This ${formatProgramme(programme)} account is already connected to another Bonza account. If this is your account, contact support@bonza.app.`,
    };
  }
  return { conflict: false };
}

// ── Body helpers ───────────────────────────────────────────────────────────

// Decode Gmail's base64url payload (URL-safe alphabet).
function decodeB64Url(data) {
  return Buffer.from(data.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf-8");
}

// Strip tags/entities from an HTML email body so the regexes run on text.
function stripHtml(html) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

// Walk a Gmail message tree, preferring text/plain, falling back to HTML.
function extractGmailBody(message) {
  let plain = null;
  let html = null;
  const walk = (part) => {
    if (!part) return;
    const data = part.body && part.body.data;
    if (data) {
      if (part.mimeType === "text/plain" && !plain) plain = decodeB64Url(data);
      else if (part.mimeType === "text/html" && !html) html = decodeB64Url(data);
    }
    (part.parts || []).forEach(walk);
  };
  walk(message.payload);
  if (plain) return plain;
  if (html) return stripHtml(html);
  return null;
}

// ── Provider fetchers ────────────────────────────────────────────────────────

async function fetchGmailLatestBody(accessToken, patterns) {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  const gmail = google.gmail({ version: "v1", auth });

  const query =
    `from:(${patterns.senderDomains.join(" OR ")}) ` +
    `subject:(${patterns.subjectPatterns.join(" OR ")}) newer_than:60d`;
  const list = await gmail.users.messages.list({ userId: "me", q: query, maxResults: 3 });
  if (!list.data.messages || !list.data.messages.length) return null;

  const msg = await gmail.users.messages.get({
    userId: "me",
    id: list.data.messages[0].id,
    format: "full",
  });
  return extractGmailBody(msg.data);
}

async function fetchOutlookLatestBody(accessToken, patterns) {
  const client = Client.init({ authProvider: (done) => done(null, accessToken) });

  // Graph $search uses KQL: (from:… OR …) AND (subject:"…" OR …). Returns by
  // relevance (can't combine with $orderby), so 3 results is plenty.
  const fromClause = patterns.senderDomains.map((d) => `from:${d}`).join(" OR ");
  const subjClause = patterns.subjectPatterns.map((s) => `subject:${JSON.stringify(s)}`).join(" OR ");
  const search = `"(${fromClause}) AND (${subjClause})"`;

  const res = await client
    .api("/me/messages")
    .search(search)
    .top(3)
    .select("subject,from,receivedDateTime,body,bodyPreview")
    .get();

  const messages = (res && res.value) || [];
  if (!messages.length) return null;

  const body = messages[0].body;
  if (!body || !body.content) return messages[0].bodyPreview || null;
  return body.contentType === "html" ? stripHtml(body.content) : body.content;
}

const EMAIL_PROVIDERS = {
  gmail: { fetchLatestBody: fetchGmailLatestBody },
  outlook: { fetchLatestBody: fetchOutlookLatestBody },
};

// ── Real sync ────────────────────────────────────────────────────────────────

// Parse the user's recent loyalty emails (via `provider`) and upsert balances.
async function parseEmailsForUser(userId, accessToken, provider = "gmail") {
  const impl = EMAIL_PROVIDERS[provider];
  if (!impl) throw new Error(`Unsupported email provider: ${provider}`);

  const updatedAccounts = [];
  const conflicts = [];
  for (const [programme, patterns] of Object.entries(PROGRAMME_PATTERNS)) {
    try {
      const body = await impl.fetchLatestBody(accessToken, patterns);
      if (!body) continue;

      const balanceMatch = body.match(patterns.balanceRegex);
      if (!balanceMatch) continue;

      const balance = parseInt(balanceMatch[1].replace(/,/g, ""), 10);
      const statusMatch = patterns.statusRegex ? body.match(patterns.statusRegex) : null;
      const statusTier = statusMatch ? statusMatch[0].trim() : null;
      const valueGbp = Math.round(balance * PROGRAMME_VALUATIONS[programme] * 100) / 100;

      // Identifiers used to detect cross-account linking. The current parse extracts
      // neither yet, so these are null and the conflict check is inert; persisting them
      // (and the @@unique guards) makes the path complete for when extraction lands.
      const programmeAccountId = patterns.accountRegex
        ? (body.match(patterns.accountRegex)?.[1] || null)
        : null;
      const loyaltyEmailAddress = null;

      const { conflict, message } = await checkLoyaltyAccountConflict(
        userId,
        programme,
        programmeAccountId,
        loyaltyEmailAddress
      );
      if (conflict) {
        conflicts.push({ programme, message });
        continue; // don't link a loyalty account already owned by another Bonza user
      }

      const fields = {
        balance,
        valueGbp,
        statusTier,
        programmeAccountId,
        loyaltyEmailAddress,
        lastSynced: new Date(),
        syncMethod: "email_parse",
      };
      await prisma.loyaltyAccount.upsert({
        where: { userId_programme: { userId, programme } },
        update: fields,
        create: { userId, programme, ...fields },
      });

      updatedAccounts.push({ programme, balance, valueGbp, statusTier });
    } catch (err) {
      logger.error(`[emailLoyaltySync] parse failed for ${programme} (${provider})`, err);
    }
  }
  return { updatedAccounts, conflicts };
}

// ── Mock sync (offline / dev) ─────────────────────────────────────────────────

// Deterministic balances for all 8 programmes. The card/airline programmes that
// overlap the Plaid mock are sourced from it so the loyalty surfaces stay
// consistent; hotel programmes + Avios use fixed mock values.
function mockBalances(userId) {
  const plaid = getMockPlaidData(userId);
  const tails = plaid.accounts || {};
  return {
    amex_mr: { balance: plaid.amex || 50000, accountNumber: tails.amex || "4521", statusTier: null },
    chase_ur: { balance: plaid.chaseUr || 30000, accountNumber: tails.chaseUr || "7821", statusTier: null },
    united_mp: { balance: plaid.unitedMiles || 15000, accountNumber: tails.unitedMiles || "3391", statusTier: "Silver" },
    marriott_bonvoy: { balance: 124000, accountNumber: "9007", statusTier: "Gold Elite" },
    hilton_honors: { balance: 88000, accountNumber: "3344", statusTier: "Gold" },
    world_of_hyatt: { balance: 41000, accountNumber: "5520", statusTier: "Explorist" },
    ihg_one: { balance: 60000, accountNumber: "1180", statusTier: "Gold Elite" },
    ba_avios: { balance: 35000, accountNumber: "7788", statusTier: "Bronze" },
  };
}

async function mockSyncForUser(userId) {
  const balances = mockBalances(userId);
  const updatedAccounts = [];
  for (const [programme, info] of Object.entries(balances)) {
    const { balance, accountNumber, statusTier } = info;
    const valueGbp = Math.round(balance * PROGRAMME_VALUATIONS[programme] * 100) / 100;
    await prisma.loyaltyAccount.upsert({
      where: { userId_programme: { userId, programme } },
      update: { balance, valueGbp, statusTier, accountNumber, lastSynced: new Date(), syncMethod: "manual" },
      create: { userId, programme, balance, valueGbp, statusTier, accountNumber, lastSynced: new Date(), syncMethod: "manual" },
    });
    updatedAccounts.push({ programme, balance, valueGbp, statusTier });
  }
  return updatedAccounts;
}

module.exports = {
  parseEmailsForUser,
  mockSyncForUser,
  checkLoyaltyAccountConflict,
  formatProgramme,
  PROGRAMME_VALUATIONS,
  PROGRAMME_PATTERNS,
  PROGRAMME_NAMES,
  EMAIL_PROVIDERS,
};
