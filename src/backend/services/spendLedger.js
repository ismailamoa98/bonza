// services/spendLedger.js — Phase 27 §27d. A global per-service daily budget for outbound third-party calls
// (seats.aero / Duffel search / Claude). Without it a scraper driving the normal search paths could burn the
// whole quota — and real money — in minutes. Each real call consumes one unit via tryConsume(); the interactive
// share is capped BELOW the full budget so the reserved slice is always there for the nightly refresh jobs.
// When the (interactive) ceiling is hit the caller serves cached/mock instead, and the first denial of the day
// emits an incident metric. The counter is keyed on the UTC calendar date. Inert offline (mock paths never call).
const prisma = require("../config/database");
const env = require("../config/env");
const { logger } = require("../utils/logger");

// Midnight-UTC date key (the SpendLedger.date column is @db.Date).
function utcDateOnly(now = new Date()) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function budgetFor(service) {
  return env.SPEND_BUDGETS[service] || 0;
}

// Interactive ceiling = budget minus the reserved nightly-job slice; jobs (reserved:true) get the full budget.
function ceilingFor(service, reserved) {
  const budget = budgetFor(service);
  if (!budget) return Infinity; // unconfigured service → never gate
  return reserved ? budget : Math.floor(budget * (1 - env.SPEND_RESERVE_FRACTION));
}

// Remember the services we've already alarmed for today so the incident metric fires once per service/day.
const alarmed = new Set();
function alarmKey(service, date) {
  return `${service}:${date.toISOString().slice(0, 10)}`;
}

// Try to consume one unit of `service`'s daily budget. Returns { allowed, count, budget, remaining, reserved }.
// Atomic + race-safe: the conditional upsert only increments while under the ceiling (empty RETURNING = denied).
async function tryConsume(service, { reserved = false } = {}) {
  const ceiling = ceilingFor(service, reserved);
  if (ceiling === Infinity) return { allowed: true, count: 0, budget: 0, remaining: Infinity, reserved };

  const date = utcDateOnly();

  // Ceiling below 1 (e.g. a tiny budget fully taken by the reservation) means no interactive call is allowed —
  // deny before the INSERT, which would otherwise seed count=1 regardless of the ceiling.
  if (ceiling < 1) {
    const k = alarmKey(service, date);
    if (!alarmed.has(k)) {
      alarmed.add(k);
      logger.error?.(`[spendLedger] ${service} budget exhausted (interactive)`, { service, ceiling, reserved });
      logger.info?.(`[metric] BonzaSpendExhausted Service=${service} Value=1`);
    }
    return { allowed: false, count: 0, budget: budgetFor(service), remaining: 0, reserved };
  }

  try {
    const rows = await prisma.$queryRaw`
      INSERT INTO "SpendLedger" (id, service, date, count)
      VALUES (${cuidish()}, ${service}, ${date}, 1)
      ON CONFLICT (service, date) DO UPDATE
        SET count = "SpendLedger".count + 1
        WHERE "SpendLedger".count < ${ceiling}
      RETURNING count`;

    if (rows.length === 0) {
      // Denied. Emit the incident metric once per service/day (mirrors serviceHealth's metric-line convention).
      const k = alarmKey(service, date);
      if (!alarmed.has(k)) {
        alarmed.add(k);
        logger.error?.(`[spendLedger] ${service} budget exhausted (interactive)`, { service, ceiling, reserved });
        logger.info?.(`[metric] BonzaSpendExhausted Service=${service} Value=1`);
      }
      return { allowed: false, count: ceiling, budget: budgetFor(service), remaining: 0, reserved };
    }
    const count = rows[0].count;
    return { allowed: true, count, budget: budgetFor(service), remaining: Math.max(ceiling - count, 0), reserved };
  } catch (err) {
    // Fail-open on a DB hiccup: don't block a real call because the ledger is unreachable (serviceHealth still
    // guards the dependency itself).
    logger.warn?.("[spendLedger] tryConsume failed — allowing", { service, error: err.message });
    return { allowed: true, count: 0, budget: budgetFor(service), remaining: Infinity, reserved };
  }
}

// Minimal collision-resistant id for the INSERT branch (Prisma @default(cuid()) doesn't apply to raw SQL).
function cuidish() {
  return `sl_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

// Today's spend snapshot per service (for /admin visibility / tests).
async function spendToday() {
  const date = utcDateOnly();
  const rows = await prisma.spendLedger.findMany({ where: { date } });
  return rows.map((r) => ({ service: r.service, count: r.count, budget: budgetFor(r.service) }));
}

module.exports = { tryConsume, spendToday, utcDateOnly, ceilingFor, budgetFor };
