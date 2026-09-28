// services/balanceSync.js — Phase 15 balance-review helpers + the deep-sync engine ("Gathering your
// points"). Statement-authoritative: a parsed statement is applied unless a newer manual override exists.
const prisma = require("../config/database");
const emailSync = require("./emailLoyaltySync");
const { logger } = require("../utils/logger");

const DEEP_LOOKBACK_DAYS = 365;
const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

// The email-verifiable programmes that actually have parse patterns (hotels + major airlines), with names.
async function emailVerifiableProgrammes() {
  const keys = Object.keys(emailSync.PROGRAMME_PATTERNS).filter((p) => emailSync.EMAIL_VERIFIABLE.has(p));
  const vals = await prisma.programmeValuation.findMany({ where: { programme: { in: keys } } });
  const names = Object.fromEntries(vals.map((v) => [v.programme, v.displayName]));
  return keys.map((p) => ({ programme: p, displayName: names[p] || p }));
}

// Statement is the truth — apply it to the programme's primary membership unless a newer override wins.
async function applyStatementBalance(userId, programme, { balance, date, source }) {
  const statementDate = date ? new Date(date) : new Date();
  const valueGbp = round2(balance * (emailSync.PROGRAMME_VALUATIONS[programme] || 0));
  const account = await prisma.loyaltyAccount.findFirst({ where: { userId, programme } });

  if (!account) {
    await prisma.loyaltyAccount.create({
      data: {
        userId, programme, balance, valueGbp,
        statementDate, statementSource: source || null,
        syncState: "verified", lastSynced: new Date(), syncMethod: "email_parse",
      },
    });
    return "created";
  }

  // A manual override newer than this statement wins — record the statement but don't apply it.
  if (account.manualOverrideAt && account.manualOverrideAt > statementDate) {
    await prisma.loyaltyAccount.update({
      where: { id: account.id },
      data: { statementDate, statementSource: source || null, lastSynced: new Date() },
    });
    return "override_held";
  }

  const matches = account.balance === balance;
  await prisma.loyaltyAccount.update({
    where: { id: account.id },
    data: {
      balance, valueGbp,
      previousBalance: matches ? null : account.balance,
      statementDate, statementSource: source || null,
      syncState: matches ? "verified" : "updated",
      manualOverrideAt: null, // a fresh statement clears any override
      lastSynced: new Date(), syncMethod: "email_parse",
    },
  });
  return matches ? "verified" : "updated";
}

// A programme we checked but found no statement for → not_checked (unless the user overrode it). Clear
// any stale statement date/source so the row honestly reads "No statement found", not a phantom statement.
async function markProgrammeNotChecked(userId, programme) {
  const account = await prisma.loyaltyAccount.findFirst({ where: { userId, programme } });
  if (account && !account.manualOverrideAt) {
    await prisma.loyaltyAccount.update({
      where: { id: account.id },
      data: { syncState: "not_checked", statementDate: null, statementSource: null },
    });
  }
}

// Everything we never checked this run (e.g. banks) → not_checked, leaving manual overrides alone. Also
// clear stale statement date/source so these never claim a statement we didn't read.
async function markNotChecked(userId, seen) {
  await prisma.loyaltyAccount.updateMany({
    where: { userId, programme: { notIn: seen }, manualOverrideAt: null },
    data: { syncState: "not_checked", statementDate: null, statementSource: null },
  });
}

// Read one programme's latest statement (real inbox over 12 months, or the deterministic mock offline).
async function readStatement(userId, programme, { mock, provider, accessToken }) {
  if (mock) {
    const info = emailSync.mockBalances(userId)[programme];
    return info ? { balance: info.balance, date: new Date(), source: null } : null;
  }
  const impl = emailSync.EMAIL_PROVIDERS[provider];
  const patterns = emailSync.PROGRAMME_PATTERNS[programme];
  if (!impl || !patterns) return null;
  const body = await impl.fetchLatestBody(accessToken, patterns, DEEP_LOOKBACK_DAYS);
  const balance = emailSync.extractBalance(body, patterns);
  return balance == null ? null : { balance, date: new Date(), source: null };
}

// Sync one programme (a deep-sync "step"). Returns the outcome for run counting.
async function syncOneProgramme(userId, programme, ctx) {
  try {
    const statement = await readStatement(userId, programme, ctx);
    if (!statement) {
      await markProgrammeNotChecked(userId, programme);
      return "not_found";
    }
    return await applyStatementBalance(userId, programme, statement);
  } catch (err) {
    logger.warn(`[balanceSync] step failed for ${programme}`, { error: err.message });
    return "error";
  }
}

// Duplicates are derived, never stored. With multiple memberships allowed, a "duplicate" is only a second
// row for the SAME programme AND the SAME membership number — legitimately different numbers are not dups.
// (The @@unique([userId,programme,accountNumber]) constraint means this is effectively always empty.)
async function findDuplicates(userId) {
  const accounts = await prisma.loyaltyAccount.findMany({ where: { userId }, orderBy: { createdAt: "asc" } });
  const seen = new Set();
  return accounts.filter((a) => {
    const key = `${a.programme}::${a.accountNumber || ""}`;
    if (seen.has(key)) return true;
    seen.add(key);
    return false;
  });
}

// User edits a balance by hand — holds until a newer statement arrives (manualOverrideAt lifecycle).
async function setManualBalance(userId, accountId, balance) {
  const account = await prisma.loyaltyAccount.findFirst({ where: { id: accountId, userId } });
  if (!account) return null;
  const bal = parseInt(balance, 10);
  if (!Number.isFinite(bal) || bal < 0) throw new Error("balance must be a non-negative number");

  return prisma.loyaltyAccount.update({
    where: { id: account.id },
    data: {
      balance: bal,
      previousBalance: account.balance,
      manualOverrideAt: new Date(),
      syncMethod: "manual",
      lastSynced: new Date(),
    },
  });
}

module.exports = {
  findDuplicates,
  setManualBalance,
  emailVerifiableProgrammes,
  applyStatementBalance,
  markNotChecked,
  syncOneProgramme,
};
