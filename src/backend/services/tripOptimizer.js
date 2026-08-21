// services/tripOptimizer.js — cross-leg, per-programme points/cash optimiser (pure, offline, never throws).
//
// Decides, per leg, whether to pay cash or redeem points — and how. Transferable currencies (AMEX/Chase)
// are a SHARED pool (points spent on one leg can't fund another → the "90k AMEX = Avios OR Hilton" conflict
// is real). Supports PARTIAL redemption (points cover part of a leg, cash covers the rest) and BUYING points
// to complete a redemption when a programme sells points below the award's value per point.
//
// Scenarios: all_cash · points (max owned points + cash top-up) · hybrid (owned points + buy-points, the
// value-optimal blend). `recommended` mirrors whichever has the lowest net outlay.
const { PROGRAMME_VALUATIONS } = require("./emailLoyaltySync");
const { BENCHMARK_CPP, formatProgramme } = require("./redemptionEngine");
const { cashbackRateFor } = require("../config/constants");

// award points per 1 source point (+ optional transfer bonus). Amex→Hilton ~1:2, most airlines 1:1.
const TRANSFER = {
  amex_mr: { ba_avios: { ratio: 1 }, united_mp: { ratio: 1 }, aeroplan: { ratio: 1 }, marriott_bonvoy: { ratio: 1 }, hilton_honors: { ratio: 2 } },
  chase_ur: { united_mp: { ratio: 1 }, ba_avios: { ratio: 1 }, aeroplan: { ratio: 1 }, world_of_hyatt: { ratio: 1 }, marriott_bonvoy: { ratio: 1 } },
};

// £ to BUY one point directly from an award programme at STANDARD price (realistic ~2026 figures;
// transferable MR/UR are not buyable here). USD list prices converted ≈ GBP.
const BUY_POINT_COST = {
  hilton_honors: 0.008, // Hilton ~$0.01/pt
  ihg_one: 0.01, // IHG ~$0.013/pt
  marriott_bonvoy: 0.01, // Marriott ~$0.0125/pt
  world_of_hyatt: 0.019, // Hyatt ~$0.024/pt
  ba_avios: 0.0145, // BA ~1.45p/pt
  aeroplan: 0.024, // Aeroplan ~$0.03/pt
  united_mp: 0.028, // United ~$0.035/pt
};

// Currently-active "buy points" promotions (demo — would come from a live feed). A bonus lowers the
// effective purchase price and is highlighted in the UI so users buy during the promo window.
const BUY_PROMOS = {
  hilton_honors: { bonus: 1.0, label: "100% bonus" },
  ihg_one: { bonus: 1.0, label: "100% bonus" },
  marriott_bonvoy: { bonus: 0.5, label: "50% bonus" },
};

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const gbpPerPoint = (p) => PROGRAMME_VALUATIONS[p] || 0.01;
const benchmark = (p) => BENCHMARK_CPP[p] || 0.01;
// Effective £/pt to buy after any active promo bonus (e.g. 100% bonus halves the cost).
const effBuyCost = (p) => (BUY_POINT_COST[p] ? BUY_POINT_COST[p] / (1 + (BUY_PROMOS[p]?.bonus || 0)) : null);

// Buying points is effort (and capped in reality), so only recommend it when the saving vs paying cash is
// meaningful: ≥20% when the purchase is over £900, ≥30% at or below £900. Below that, use owned points/cash.
const BUY_SAVING_BREAK_GBP = 900;
function buyClears(buyCostGbp, cashCoveredGbp) {
  if (!(cashCoveredGbp > 0)) return false;
  const savingPct = (cashCoveredGbp - buyCostGbp) / cashCoveredGbp;
  return savingPct >= (buyCostGbp > BUY_SAVING_BREAK_GBP ? 0.2 : 0.3);
}

// Owned funding routes for a leg (direct held balance + transfers from held currencies). ¢/pt values the
// SOURCE point (the scarce balance). `awardPointsFull`/`valuePerAward` drive partials + buying.
function ownedCandidates(leg, heldSet) {
  const out = [];
  for (const award of leg.awards || []) {
    const N = Number(award.pointsCost) || 0;
    if (N <= 0 || !leg.cashGbp) continue;
    const valuePerAward = leg.cashGbp / N; // £ saved per award point

    const push = (sourceProgramme, awardPerSource) => {
      const sourcePointsFull = Math.ceil(N / awardPerSource);
      const cpp = leg.cashGbp / sourcePointsFull; // £ per source point
      out.push({
        legType: leg.type,
        awardProgramme: award.programme,
        sourceProgramme,
        sourcePointsFull,
        cashSaved: leg.cashGbp,
        awardPointsFull: N,
        valuePerAward,
        centsPerPoint: cpp * 100,
        aboveBenchmark: cpp >= benchmark(sourceProgramme),
      });
    };

    if (heldSet.has(award.programme)) push(award.programme, 1);
    for (const [currency, partners] of Object.entries(TRANSFER)) {
      const rule = partners[award.programme];
      if (rule && heldSet.has(currency)) push(currency, rule.ratio * (1 + (rule.bonus || 0)));
    }
  }
  return out;
}

// Every buy-worthy award programme for a leg (purchase price per point below the award's value per point).
function buyOptions(leg) {
  const out = [];
  for (const award of leg.awards || []) {
    const eff = effBuyCost(award.programme);
    if (eff == null) continue;
    const valuePerAward = leg.cashGbp / Number(award.pointsCost);
    if (eff >= valuePerAward) continue;
    out.push({ programme: award.programme, valuePerAward, effCost: eff, promo: BUY_PROMOS[award.programme]?.label || null });
  }
  return out;
}

function summarise(legs, plan) {
  const legsOut = legs.map((leg) => {
    const p = plan[leg.type];
    if (!p || (!p.pointsUsed && !p.pointsBought)) {
      return { type: leg.type, label: leg.label, method: "cash", cashPaid: round2(leg.cashGbp), cashSaved: 0, pointsUsed: 0, pointsBought: 0, buyCostGbp: 0 };
    }
    const cashSaved = round2(Math.min(p.cashSaved, leg.cashGbp));
    const cashPaid = round2(Math.max(0, leg.cashGbp - cashSaved));
    const method = p.pointsBought > 0 ? (p.pointsUsed > 0 ? "points+buy" : "buy") : cashPaid > 0.5 ? "points+cash" : "points";
    return {
      type: leg.type,
      label: leg.label,
      method,
      awardProgramme: p.awardProgramme,
      awardLabel: formatProgramme(p.awardProgramme),
      sourceProgramme: p.sourceProgramme || null,
      sourceLabel: p.sourceProgramme ? formatProgramme(p.sourceProgramme) : null,
      pointsUsed: p.pointsUsed || 0,
      pointsBought: p.pointsBought || 0,
      buyCostGbp: round2(p.buyCostGbp || 0),
      buyPromo: p.buyPromo || null,
      centsPerPoint: round2(p.centsPerPoint || 0),
      aboveBenchmark: !!p.aboveBenchmark,
      cashPaid,
      cashSaved,
    };
  });

  const totalCash = round2(legsOut.reduce((s, l) => s + l.cashPaid, 0));
  const pointsPurchaseGbp = round2(legsOut.reduce((s, l) => s + l.buyCostGbp, 0));
  const savingsGbp = round2(legsOut.reduce((s, l) => s + l.cashSaved, 0));
  const creditsEarned = round2(legsOut.reduce((s, l) => s + cashbackRateFor(l.type) * l.cashPaid, 0));
  const pointsUsedByProgramme = {};
  const pointsBoughtByProgramme = {};
  let ownedPts = 0;
  let pointsSpentValueGbp = 0; // fair value of the owned points burned (their opportunity cost)
  for (const l of legsOut) {
    if (l.pointsUsed && l.sourceProgramme) {
      pointsUsedByProgramme[l.sourceProgramme] = (pointsUsedByProgramme[l.sourceProgramme] || 0) + l.pointsUsed;
      ownedPts += l.pointsUsed;
      pointsSpentValueGbp += l.pointsUsed * gbpPerPoint(l.sourceProgramme);
    }
    if (l.pointsBought) pointsBoughtByProgramme[l.awardProgramme] = (pointsBoughtByProgramme[l.awardProgramme] || 0) + l.pointsBought;
  }
  return {
    legs: legsOut,
    totalCash,
    pointsPurchaseGbp,
    savingsGbp,
    netSavingsGbp: round2(savingsGbp - pointsPurchaseGbp),
    outlayGbp: round2(totalCash + pointsPurchaseGbp),
    // True economic cost = cash + points bought + fair value of points burned − credits. Drives "Recommended".
    economicCostGbp: round2(totalCash + pointsPurchaseGbp + pointsSpentValueGbp - creditsEarned),
    creditsEarned,
    pointsUsedByProgramme,
    pointsBoughtByProgramme,
    blendedCentsPerPoint: ownedPts > 0 ? round2((savingsGbp / ownedPts) * 100) : 0,
  };
}

// Run one scenario. mode: "all_cash" | "points" | "hybrid". Overrides apply to hybrid only.
function runScenario(legs, balances, heldSet, mode, overrides = {}) {
  if (mode === "all_cash") return summarise(legs, {});
  const bal = { ...balances };
  const plan = {};
  const aboveOnly = mode === "hybrid";
  const canBuy = mode === "hybrid";
  const ov = mode === "hybrid" ? overrides : {};

  // Forced-cash legs (override) are decided up front so the greedy skips them.
  for (const leg of legs) if (ov[leg.type]?.method === "cash") plan[leg.type] = { pointsUsed: 0, cashSaved: 0 };

  // Phase 1 — spend owned points greedily by source ¢/pt (partial allowed; one award route per leg).
  const cands = legs.flatMap((leg) => ownedCandidates(leg, heldSet)).sort((a, b) => b.centsPerPoint - a.centsPerPoint);
  for (const c of cands) {
    if (c.legType in plan) continue;
    const legOv = ov[c.legType];
    const forcedProg = legOv?.method === "points" ? legOv.programme : null;
    if (forcedProg && c.awardProgramme !== forcedProg) continue; // honour a forced programme
    if (aboveOnly && !c.aboveBenchmark && !legOv) continue; // value-optimal keeps weak points (unless forced)
    const avail = bal[c.sourceProgramme] || 0;
    if (avail <= 0) continue;
    const spend = Math.min(avail, c.sourcePointsFull);
    const cashSaved = spend === c.sourcePointsFull ? c.cashSaved : c.cashSaved * (spend / c.sourcePointsFull);
    plan[c.legType] = { awardProgramme: c.awardProgramme, sourceProgramme: c.sourceProgramme, pointsUsed: spend, cashSaved, pointsBought: 0, buyCostGbp: 0, centsPerPoint: c.centsPerPoint, aboveBenchmark: c.aboveBenchmark };
    bal[c.sourceProgramme] = avail - spend;
  }

  // Phase 2 — complete each leg with bought points where cheaper than cash (hybrid). For each leg compare
  // (A) keep the owned redemption + buy more of the SAME programme, vs (B) buy the WHOLE leg via the
  // cheapest buy-worthy programme (freeing the owned points). Pick the lower economic cost.
  if (canBuy) {
    for (const leg of legs) {
      if (ov[leg.type]?.method === "cash") continue;
      const cur = plan[leg.type];
      const residual = leg.cashGbp - (cur?.cashSaved || 0);
      const ownedValue = cur?.pointsUsed ? cur.pointsUsed * gbpPerPoint(cur.sourceProgramme) : 0;
      const opts = buyOptions(leg);
      const forcedProg = ov[leg.type]?.method === "points" ? ov[leg.type].programme : null;

      // Option A — keep owned, top up the same award programme (if buy-worthy); else the residual is cash.
      let aEcon = ownedValue + Math.max(0, residual);
      let aPlan = cur || null;
      if (residual > 0.5) {
        const same = opts.find((o) => o.programme === cur?.awardProgramme);
        if (same) {
          const pts = Math.ceil(residual / same.valuePerAward);
          const cost = pts * same.effCost;
          if (buyClears(cost, residual)) {
            // Only top up by buying if the saving on that purchase clears the threshold.
            aEcon = ownedValue + cost;
            aPlan = {
              ...cur,
              pointsBought: (cur.pointsBought || 0) + pts,
              buyCostGbp: (cur.buyCostGbp || 0) + cost,
              buyPromo: same.promo || cur.buyPromo,
              cashSaved: leg.cashGbp,
            };
          }
        }
      }

      // Option B — buy the whole leg via the cheapest buy-worthy programme (owned points freed), only when
      // the saving clears the threshold. Skipped when the user forced a specific programme.
      let bEcon = Infinity;
      let bPlan = null;
      if (!forcedProg) {
        for (const o of opts) {
          const pts = Math.ceil(leg.cashGbp / o.valuePerAward);
          const cost = pts * o.effCost;
          if (!buyClears(cost, leg.cashGbp)) continue;
          if (cost < bEcon) {
            bEcon = cost;
            bPlan = { awardProgramme: o.programme, sourceProgramme: null, pointsUsed: 0, cashSaved: leg.cashGbp, pointsBought: pts, buyCostGbp: cost, buyPromo: o.promo, centsPerPoint: o.valuePerAward * 100 };
          }
        }
      }

      if (bPlan && bEcon < aEcon) {
        if (cur?.pointsUsed) bal[cur.sourceProgramme] = (bal[cur.sourceProgramme] || 0) + cur.pointsUsed; // return owned points
        plan[leg.type] = bPlan;
      } else if (aPlan) {
        plan[leg.type] = aPlan;
      }
    }
  }

  return summarise(legs, plan);
}

// Main entry. legs: [{ type, label, cashGbp, awards:[{ programme, pointsCost }] }].
function optimizeTrip({ legs = [], accounts = [], overrides = {} } = {}) {
  const balances = {};
  const heldSet = new Set();
  for (const a of accounts) {
    if (!a?.programme) continue;
    balances[a.programme] = (balances[a.programme] || 0) + (Number(a.balance) || 0);
    heldSet.add(a.programme);
  }

  const all_cash = runScenario(legs, balances, heldSet, "all_cash");
  const points = runScenario(legs, balances, heldSet, "points");
  const hybrid = runScenario(legs, balances, heldSet, "hybrid", overrides);

  // Recommend the lowest true economic cost (cash + points bought + value of points burned − credits),
  // so a scenario that burns points at poor value isn't picked just because it lowers cash.
  const ranked = [["hybrid", hybrid], ["points", points], ["all_cash", all_cash]].sort(
    (a, b) => a[1].economicCostGbp - b[1].economicCostGbp
  );
  const recommendedKey = ranked[0][0];
  const recommended = ranked[0][1];

  // Per-leg choices for the UI override dropdown.
  const legOptions = {};
  for (const leg of legs) {
    const byP = {};
    for (const c of ownedCandidates(leg, heldSet)) {
      const cur = byP[c.awardProgramme];
      if (!cur || c.centsPerPoint > cur.centsPerPoint) {
        byP[c.awardProgramme] = {
          awardProgramme: c.awardProgramme,
          awardLabel: formatProgramme(c.awardProgramme),
          centsPerPoint: round2(c.centsPerPoint),
          affordable: (balances[c.sourceProgramme] || 0) >= c.sourcePointsFull,
          buyable: !!BUY_POINT_COST[c.awardProgramme],
          promo: BUY_PROMOS[c.awardProgramme]?.label || null,
        };
      }
    }
    legOptions[leg.type] = Object.values(byP).sort((a, b) => b.centsPerPoint - a.centsPerPoint);
  }

  return {
    recommended,
    recommendedKey,
    scenarios: { recommended, all_cash, points, hybrid },
    legOptions,
    accounts: accounts.map((a) => ({
      programme: a.programme,
      label: formatProgramme(a.programme),
      balance: Number(a.balance) || 0,
      centsPerPoint: round2(gbpPerPoint(a.programme) * 100),
      benchmark: round2(benchmark(a.programme) * 100),
    })),
  };
}

module.exports = { optimizeTrip, TRANSFER, BUY_POINT_COST, BUY_PROMOS };
