// jobs/valuationRefreshJob.js — Phase 14 nightly job: refresh programme valuations and reprice every
// LoyaltyAccount.valueGbp from the fresh cents-per-point rates. Runs before the personalisation job so
// recommendations use current rates.
//
// Valuations are Bonza-maintained (no public API reliably publishes points valuations) — update
// CURRENT_VALUATIONS when programme devaluations happen (typically 2-4×/year). Sources to monitor:
// Head for Points (UK), The Points Guy monthly valuations, programme award-chart announcements.
const prisma = require("../config/database");
const { logger } = require("../utils/logger");

// cents-per-point (ProgrammeValuation.centsPerPoint). cpp/100 = £ per point.
const CURRENT_VALUATIONS = {
  amex_mr: 1.4,
  chase_ur: 1.5,
  marriott_bonvoy: 0.8,
  hilton_honors: 0.4,
  world_of_hyatt: 1.8,
  ihg_one: 0.6,
  ba_avios: 1.1,
  united_mp: 1.2,
  virgin_flying_club: 1.9,
  aeroplan: 1.5,
  flying_blue: 1.2,
  krisflyer: 1.3,
  emirates_skywards: 1.3,
  aer_lingus: 1.1,
  iberia_plus: 1.3,
};

async function refreshValuations() {
  let updated = 0;

  for (const [programme, cpp] of Object.entries(CURRENT_VALUATIONS)) {
    try {
      await prisma.programmeValuation.update({
        where: { programme },
        data: { centsPerPoint: cpp, lastRefreshedAt: new Date() },
      });
      updated++;
    } catch (err) {
      logger.warn("[valuationRefreshJob] valuation update failed", { programme, error: err.message });
    }
  }

  // Reprice every LoyaltyAccount.valueGbp using the fresh rates (cpp/100 = £/pt).
  const accounts = await prisma.loyaltyAccount.findMany();
  let repriced = 0;
  for (const account of accounts) {
    const cpp = CURRENT_VALUATIONS[account.programme];
    if (cpp == null) continue;
    await prisma.loyaltyAccount.update({
      where: { id: account.id },
      data: { valueGbp: Math.round(account.balance * (cpp / 100) * 100) / 100 },
    });
    repriced++;
  }

  logger.info("[valuationRefreshJob] complete", { programmesUpdated: updated, accountsRepriced: repriced });
  return { updated, repriced };
}

module.exports = { refreshValuations, CURRENT_VALUATIONS };
