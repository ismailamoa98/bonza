// services/statementGuard.js — Phase 27 §27c. The plausibility gate in front of the statement-authoritative
// engine (services/balanceSync.applyStatementBalance). A parsed statement is only trusted if it is both
// *confidently read* (extractBalance confidence) and *plausible* (these RULES). Everything is a PURE function
// of its inputs — no DB, no clock reads inside (the caller injects `now`) — so §23/§27 unit-test the
// decision directly and the atomic writer stays the only thing that touches the row.
//
// Verdicts:
//   apply      — read confidently and plausible → hand to applyStatementBalance.
//   quarantine — suspicious (low confidence or an implausible jump) → KEEP the user's current value, record a
//                StatementQuarantine, surface it in the §15 discrepancy modal for the user to confirm.
//   reject     — clearly garbage (no number, negative, absurdly large, future-dated, stale) → drop silently,
//                never stored as a balance.
const crypto = require("crypto");

// Tunable plausibility thresholds. Deliberately generous — the goal is to catch mis-scrapes and corrupt
// parses, not to second-guess a genuine large earn/burn. Anything borderline quarantines (asks the user)
// rather than rejecting (discarding), because a real statement we weren't sure about must still be
// confirmable, not lost.
const RULES = {
  maxAbsolute: 50_000_000, // 50M points — above any real personal balance; a bigger figure is a parse artefact
  maxIncreaseRatio: 5, // a jump to >5× the previous balance is suspicious (quarantine, don't auto-apply)
  maxDecreaseRatio: 0.9, // a drop of >90% (new < 10% of previous) is suspicious — the classic mis-scrape-to-0
  maxAgeDays: 400, // a statement older than ~13 months is stale; don't resurrect it as "current"
  minConfidence: 0.5, // below this the read itself is untrustworthy regardless of plausibility
};

const DAY_MS = 24 * 60 * 60 * 1000;

// A short, non-reversible fingerprint of the email body — the ONLY thing we ever log/persist about the raw
// statement text (§27c: never store the body). Lets us tell "same email parsed twice" apart in telemetry
// without keeping any PII.
function bodyFingerprint(body) {
  if (body == null) return null;
  return crypto.createHash("sha256").update(String(body)).digest("hex").slice(0, 16);
}

// Pure decision. `previousBalance` is the account's current stored balance (null for a brand-new account);
// `statementDate` is the date printed on the statement (may be null); `now` is injected.
function evaluateStatement({ balance, confidence, previousBalance = null, statementDate = null, now = new Date() }) {
  // ── reject: the read produced nothing usable ──
  if (balance == null || !Number.isFinite(balance)) return { verdict: "reject", reason: "no_balance" };
  if (balance < 0) return { verdict: "reject", reason: "negative_balance" };
  if (balance > RULES.maxAbsolute) return { verdict: "reject", reason: "exceeds_max_absolute" };

  if (statementDate instanceof Date && !Number.isNaN(statementDate.getTime())) {
    if (statementDate.getTime() > now.getTime()) return { verdict: "reject", reason: "future_dated" };
    if ((now.getTime() - statementDate.getTime()) / DAY_MS > RULES.maxAgeDays)
      return { verdict: "reject", reason: "too_old" };
  }

  // ── quarantine: read or figure is suspicious, but possibly real → ask the user ──
  if (Number(confidence) < RULES.minConfidence) return { verdict: "quarantine", reason: "low_confidence" };

  if (previousBalance != null && previousBalance > 0) {
    if (balance > previousBalance * RULES.maxIncreaseRatio)
      return { verdict: "quarantine", reason: "implausible_increase" };
    if (balance < previousBalance * (1 - RULES.maxDecreaseRatio))
      return { verdict: "quarantine", reason: "implausible_decrease" };
  }

  return { verdict: "apply", reason: "ok" };
}

// Human-readable copy for the §15 discrepancy modal / admin.
const REASON_COPY = {
  low_confidence: "We read a figure we're not confident about.",
  implausible_increase: "The balance we read is far higher than your last one.",
  implausible_decrease: "The balance we read is far lower than your last one.",
  no_balance: "We couldn't read a balance from this statement.",
  negative_balance: "We read a negative balance, which can't be right.",
  exceeds_max_absolute: "The balance we read is implausibly large.",
  future_dated: "This statement is dated in the future.",
  too_old: "This statement is too old to trust as current.",
  ok: "",
};

module.exports = { RULES, evaluateStatement, bodyFingerprint, REASON_COPY };
