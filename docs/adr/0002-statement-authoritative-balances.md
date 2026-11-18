# 0002 — Statement-authoritative loyalty balances

**Status:** Accepted

## Context
Bonza shows a user's loyalty balances across many programmes (Amex, Chase, airlines, hotels). There is no clean
real-time API for most of these; the trustworthy signal is the user's own **statements** (balance emails) and
what they tell us manually. The danger is showing a confident-but-wrong number, or inventing award availability —
either destroys trust in a product whose entire pitch is "we do the points maths honestly."

## Decision
Balances are **statement-authoritative**: the stored balance comes from a parsed statement (`balanceSync` +
`emailLoyaltySync`) or an explicit manual override — Bonza **never fabricates or derives** a balance, and
**never invents award availability** ("I'll check when you book"). A parsed statement must pass a plausibility +
confidence **guard** (§27c `statementGuard`) before it's applied; a suspicious read is **quarantined** (the user's
value is kept) and surfaced for confirmation, never silently applied. A manual override wins until a newer
statement arrives. Every balance change is locked (§27a) and audited (§27k).

## Consequences
- **+** The number is always traceable to a source (a statement date or a user action) — the disputed-balance
  runbook is "show them the source," not "guess."
- **+** A parser bug can't corrupt a balance: the worst case is a quarantine, not a wrong applied value.
- **−** Balances can be stale (only as fresh as the last statement) and some programmes are manual-only. We show
  `syncState` honestly rather than pretending freshness.
- **−** Parser maintenance is ongoing (formats change) — mitigated by the golden-fixture harness + the
  per-programme success-rate alarm (§27c).
- Supersedes any notion of a cached/derived balance; there is deliberately no computed balance column.
