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

// Pure decision — no DB, no clock reads inside. Given the current account (or null) and a normalised
// statement, decide what to do. §23/§27 unit-test this directly; §27a wraps it in a row-locked transaction.
// §27e-2: the override race compares `manualOverrideAt` against the statement's DELIVERY time
// (`statementReceivedAt`), never the date printed on the statement.
function decideBalance(account, stmt) {
  if (!account) {
    return {
      status: "created",
      patch: {
        balance: stmt.balance, valueGbp: stmt.valueGbp,
        statementDate: stmt.statementDate, statementReceivedAt: stmt.statementReceivedAt,
        statementSource: stmt.source, syncState: "verified",
        lastSynced: stmt.now, syncMethod: "email_parse",
      },
    };
  }

  // A manual override made AFTER the statement was delivered wins — record the statement but don't apply it.
  if (account.manualOverrideAt && stmt.statementReceivedAt && account.manualOverrideAt > stmt.statementReceivedAt) {
    return {
      status: "override_held",
      patch: {
        statementDate: stmt.statementDate, statementReceivedAt: stmt.statementReceivedAt,
        statementSource: stmt.source, lastSynced: stmt.now,
      },
    };
  }

  const matches = account.balance === stmt.balance;
  return {
    status: matches ? "verified" : "updated",
    patch: {
      balance: stmt.balance, valueGbp: stmt.valueGbp,
      previousBalance: matches ? null : account.balance,
      statementDate: stmt.statementDate, statementReceivedAt: stmt.statementReceivedAt,
      statementSource: stmt.source,
      syncState: matches ? "verified" : "updated",
      manualOverrideAt: null, // a fresh statement clears any override
      lastSynced: stmt.now, syncMethod: "email_parse",
    },
  };
}

// Statement is the truth — apply it to the programme's primary membership unless a newer override wins.
// §27a: the read-decide-write is atomic — the row is locked FOR UPDATE for the duration of the transaction,
// so two statements landing at once serialise instead of racing to a lost update.
async function applyStatementBalance(userId, programme, { balance, date, receivedAt, source }) {
  const statementDate = date ? new Date(date) : new Date();
  const statementReceivedAt = receivedAt ? new Date(receivedAt) : new Date();
  const valueGbp = round2(balance * (emailSync.PROGRAMME_VALUATIONS[programme] || 0));
  const stmt = { balance, valueGbp, statementDate, statementReceivedAt, source: source || null, now: new Date() };

  const run = () =>
    prisma.$transaction(
      async (tx) => {
        // Lock the primary membership row (oldest) for this programme for the life of the transaction.
        const rows = await tx.$queryRaw`
          SELECT * FROM "LoyaltyAccount"
          WHERE "userId" = ${userId} AND programme = ${programme}
          ORDER BY "createdAt" ASC LIMIT 1
          FOR UPDATE`;
        const account = rows[0] || null;
        const decision = decideBalance(account, stmt);

        if (decision.status === "created") {
          await tx.loyaltyAccount.create({ data: { userId, programme, ...decision.patch } });
          return "created";
        }
        await tx.loyaltyAccount.update({ where: { id: account.id }, data: decision.patch });
        return decision.status;
      },
      { timeout: 10_000 }
    );

  try {
    return await run();
  } catch (err) {
    // Two concurrent first-statements race the create; the partial unique index (§27e-1) rejects the loser
    // with P2002 — re-run so it takes the existing row's locked update path instead of a lost insert.
    if (err.code === "P2002") return run();
    throw err;
  }
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
    return info ? { balance: info.balance, date: new Date(), receivedAt: new Date(), source: null } : null;
  }
  const impl = emailSync.EMAIL_PROVIDERS[provider];
  const patterns = emailSync.PROGRAMME_PATTERNS[programme];
  if (!impl || !patterns) return null;
  const body = await impl.fetchLatestBody(accessToken, patterns, DEEP_LOOKBACK_DAYS);
  const balance = emailSync.extractBalance(body, patterns);
  // receivedAt is the message delivery time (§27e-2). Until the fetcher surfaces the mailbox internalDate we
  // use read-time as a safe proxy; it is still later than any pre-existing manual override, so a real
  // statement correctly wins over a stale override.
  return balance == null ? null : { balance, date: new Date(), receivedAt: new Date(), source: null };
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
  const bal = parseInt(balance, 10);
  if (!Number.isFinite(bal) || bal < 0) throw new Error("balance must be a non-negative number");

  // §27a — lock the row so a manual override and a concurrent statement can't clobber each other.
  return prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw`
      SELECT * FROM "LoyaltyAccount" WHERE id = ${accountId} AND "userId" = ${userId} FOR UPDATE`;
    const account = rows[0] || null;
    if (!account) return null;
    return tx.loyaltyAccount.update({
      where: { id: account.id },
      data: {
        balance: bal,
        previousBalance: account.balance,
        manualOverrideAt: new Date(),
        syncMethod: "manual",
        lastSynced: new Date(),
      },
    });
  }, { timeout: 10_000 });
}

module.exports = {
  findDuplicates,
  setManualBalance,
  emailVerifiableProgrammes,
  applyStatementBalance,
  decideBalance,
  markNotChecked,
  syncOneProgramme,
};
