// jobs/fxRefreshJob.js — Phase 27 §27b. Once a day, pull the GBP-base display-FX rates from fxService
// (ECB/Frankfurter live, bundled fallback offline) and persist one FxRate row per quote currency for today.
// This turns the old in-memory-only cache into a durable, auditable history and gives the request path an
// offline source (fxService reads the latest persisted rows when the live API is unreachable). Never called
// in a request path — scheduled via the Lambda `fx_refresh` jobType.
const prisma = require("../config/database");
const { getRates } = require("../services/fxService");
const { logger } = require("../utils/logger");

// Midnight UTC for "today" — the FxRate.date key is a UTC calendar date (no time component).
function utcDateOnly(now = new Date()) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

async function refreshFxRates() {
  const { rates, source } = await getRates();
  const date = utcDateOnly();
  const base = "GBP";
  let written = 0;

  for (const [quote, rate] of Object.entries(rates || {})) {
    if (quote === base || !(Number(rate) > 0)) continue;
    await prisma.fxRate.upsert({
      where: { base_quote_date: { base, quote, date } },
      create: { base, quote, rate, date, source },
      update: { rate, source, fetchedAt: new Date() },
    });
    written += 1;
  }

  logger.info?.("[fxRefreshJob] persisted FX rates", { date: date.toISOString().slice(0, 10), source, written });
  return { written, source };
}

module.exports = { refreshFxRates };
