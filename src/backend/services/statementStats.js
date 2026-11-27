// services/statementStats.js — Phase 27 §27c. Parse telemetry: one ParseAttempt row per statement-parse
// decision (per programme), the StatementQuarantine write for suspicious reads, and the per-programme
// success-rate aggregate behind the nightly alarm + the read-only /admin/parsers table. Nothing here ever
// persists the raw email body — only the matched pattern name and statementGuard's body fingerprint.
const prisma = require("../config/database");
const { logger } = require("../utils/logger");

// outcome ∈ 'applied' | 'quarantined' | 'rejected' | 'not_found' | 'error' — mirrors the verdicts plus the
// two non-verdict steps (no statement found, parse threw). "success" for the rate = applied + not_found
// (a programme with genuinely no new statement isn't a parser failure); quarantined/rejected/error are not.
async function recordAttempt({ userId = null, programme, outcome, confidence = null, matchedPattern = null }) {
  try {
    await prisma.parseAttempt.create({ data: { userId, programme, outcome, confidence, matchedPattern } });
  } catch (err) {
    logger.warn?.("[statementStats] recordAttempt failed", { programme, outcome, error: err.message });
  }
}

// Keep the user's current value, park the suspicious read for them to confirm in the §15 modal.
async function recordQuarantine({ userId, programme, parsedBalance, confidence, matchedPattern, verdict, reason, statementDate, bodyFingerprint }) {
  return prisma.statementQuarantine.create({
    data: {
      userId, programme, parsedBalance, confidence,
      matchedPattern, verdict, reason,
      statementDate: statementDate || null,
      bodyFingerprint: bodyFingerprint || null,
    },
  });
}

// The open (unresolved) quarantines for a user — surfaced by GET /points/review in the discrepancy modal.
async function openQuarantines(userId) {
  return prisma.statementQuarantine.findMany({
    where: { userId, resolved: false, verdict: "quarantine" },
    orderBy: { createdAt: "desc" },
  });
}

// Mark a user's quarantines resolved (they confirmed/overrode the balance, or acknowledged the modal).
async function resolveQuarantines(userId, { programme = null } = {}) {
  return prisma.statementQuarantine.updateMany({
    where: { userId, resolved: false, ...(programme ? { programme } : {}) },
    data: { resolved: true, resolvedAt: new Date() },
  });
}

// Per-programme parse success-rate over a trailing window. "success" = applied or not_found. Returns rows
// `{ programme, total, success, quarantined, rejected, errors, successRate }` only for programmes with
// attempts in the window. Drives the nightly alarm (< 80% over 24h with ≥5 attempts) and /admin/parsers.
async function successRateByProgramme({ sinceHours = 24 } = {}) {
  const since = new Date(Date.now() - sinceHours * 60 * 60 * 1000);
  const rows = await prisma.parseAttempt.groupBy({
    by: ["programme", "outcome"],
    where: { createdAt: { gte: since } },
    _count: { _all: true },
  });

  const byProgramme = {};
  for (const r of rows) {
    const p = (byProgramme[r.programme] ||= { programme: r.programme, total: 0, success: 0, quarantined: 0, rejected: 0, errors: 0 });
    const n = r._count._all;
    p.total += n;
    if (r.outcome === "applied" || r.outcome === "not_found") p.success += n;
    else if (r.outcome === "quarantined") p.quarantined += n;
    else if (r.outcome === "rejected") p.rejected += n;
    else if (r.outcome === "error") p.errors += n;
  }

  return Object.values(byProgramme)
    .map((p) => ({ ...p, successRate: p.total ? p.success / p.total : 1 }))
    .sort((a, b) => a.successRate - b.successRate);
}

module.exports = { recordAttempt, recordQuarantine, openQuarantines, resolveQuarantines, successRateByProgramme };
