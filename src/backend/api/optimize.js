// api/optimize.js — trip optimisation (5 scenarios) + Pro redemption endpoint.
const express = require("express");
const prisma = require("../config/database");
const { generateScenarios } = require("../utils/claudeOptimizer");
const { generateRedemptionOptions } = require("../services/redemptionEngine");
const { optimizeTrip } = require("../services/tripOptimizer");
const { PROGRAMME_VALUATIONS } = require("../services/emailLoyaltySync");
const { formatProgramme } = require("../services/redemptionEngine");
const { ownedOr403 } = require("../utils/ownedOr403");
const requirePro = require("../middleware/requirePro");
const { recordEvent, EVENT_TYPES } = require("../utils/eventTracker");

const router = express.Router();

// Relevant award programmes per leg type + a deterministic per-programme ¢/pt so the optimiser has real
// choices offline (demo inventory, same spirit as components/search/points.js — real award data replaces it).
const LEG_PROGRAMMES = {
  hotel: ["marriott_bonvoy", "hilton_honors", "world_of_hyatt", "ihg_one"],
  flight: ["ba_avios", "united_mp"],
  car: [],
};
function hashFactor(s) {
  let h = 0;
  for (const ch of String(s)) h = (h * 31 + ch.charCodeAt(0)) & 0xffff;
  return 0.7 + (h % 80) / 100; // 0.70–1.49 × the programme's typical value
}
function deriveAwards(leg) {
  const cash = Number(leg.cashGbp) || 0;
  return (LEG_PROGRAMMES[leg.type] || [])
    .map((p) => {
      const cppGbp = (PROGRAMME_VALUATIONS[p] || 0.01) * hashFactor(`${leg.type}:${p}`);
      return { programme: p, pointsCost: Math.max(1, Math.ceil(cash / cppGbp)) };
    })
    .filter(() => cash > 0);
}

// Plain-language recommendation in Bonza's voice (deterministic; real Claude prose can wrap this later).
function narrate(result) {
  const r = result.recommended;
  const pts = r.legs.filter((l) => l.pointsUsed > 0 || l.pointsBought > 0);
  const cash = r.legs.filter((l) => l.pointsUsed === 0 && l.pointsBought === 0);
  if (!pts.length) {
    return "Pay cash across the board — your points are worth more saved for a stronger redemption than anything on this trip.";
  }
  const bits = pts.map((l) => {
    const via = `redeem the ${l.type} via ${formatProgramme(l.awardProgramme)}`;
    if (l.pointsBought > 0) {
      const promo = l.buyPromo ? ` (${l.buyPromo} on right now)` : "";
      return `${via} — buy ${l.pointsBought.toLocaleString()} points for £${l.buyCostGbp.toFixed(0)}${promo}`;
    }
    return `${via} (${l.centsPerPoint.toFixed(1)}¢/pt)`;
  });
  const cashBit = cash.length ? `, and pay cash for the ${cash.map((l) => l.type).join(" & ")}` : "";
  const purchase = r.pointsPurchaseGbp ? ` (incl. £${r.pointsPurchaseGbp.toFixed(0)} to buy points)` : "";
  return (
    `Best value: ${bits.join("; ")}${cashBit}. Net saving about £${r.netSavingsGbp.toFixed(0)} — ` +
    `£${r.totalCash.toFixed(0)} cash${purchase}` +
    `${r.creditsEarned ? `, earning £${r.creditsEarned.toFixed(2)} in Credits` : ""}.`
  );
}

function toApiScenario(row) {
  return {
    id: row.id,
    strategy: row.strategy,
    totalCash: row.totalCashCost,
    pointsUsed: row.pointsUsed,
    pointsProgram: row.pointsProgram,
    savingsAmount: row.savingsAmount,
    valueMultiplier: row.valueMultiplier,
    flightDetails: row.flightDetails,
    hotelDetails: row.hotelDetails,
    carDetails: row.carDetails,
    benefits: row.benefits,
    reasoning: row.reasoning,
    isRecommended: row.isRecommended,
  };
}

router.post("/", async (req, res, next) => {
  try {
    const { tripId } = req.body || {};
    if (!tripId) {
      const err = new Error("tripId is required");
      err.status = 400;
      throw err;
    }

    const trip = await prisma.trip.findFirst({ where: { id: tripId, userId: req.userId } });
    if (!trip) {
      const err = new Error("Trip not found");
      err.status = 404;
      throw err;
    }

    const { scenarios, conversationalAnalysis, recommendedRatio } = await generateScenarios(
      trip,
      trip.loyaltyPoints
    );

    await prisma.scenario.deleteMany({ where: { tripId } });
    const rows = [];
    for (const s of scenarios) {
      rows.push(
        await prisma.scenario.create({
          data: {
            tripId,
            strategy: s.strategy,
            totalCashCost: s.totalCashCost ?? s.totalCash ?? 0,
            pointsUsed: s.pointsUsed ?? 0,
            pointsProgram: s.pointsProgram ?? "none",
            flightDetails: s.flightDetails ?? {},
            hotelDetails: s.hotelDetails ?? {},
            carDetails: s.carDetails ?? {},
            benefits: s.benefits ?? [],
            reasoning: s.reasoning ?? "",
            valueMultiplier: s.valueMultiplier ?? 1,
            savingsAmount: s.savingsAmount ?? 0,
            isRecommended: Boolean(s.isRecommended),
          },
        })
      );
    }

    const apiScenarios = rows.map(toApiScenario);
    const recommended = apiScenarios.find((s) => s.isRecommended) || apiScenarios[0];

    res.json({
      recommendedScenarioId: recommended ? recommended.id : null,
      recommendedScenario: recommended || null,
      allScenarios: apiScenarios,
      conversationalAnalysis,
      recommendedRatio: recommendedRatio ?? 1,
    });
  } catch (err) {
    next(err);
  }
});

async function deriveTripPricing(tripId, trip) {
  const scenarios = await prisma.scenario.findMany({ where: { tripId } });
  const baseline =
    scenarios.find((s) => s.strategy === "cash") ||
    scenarios.find((s) => s.isRecommended) ||
    scenarios[0] ||
    null;

  const estimatedCashPrice = baseline?.totalCashCost || trip.budget || 0;
  const flightCash = Number(baseline?.flightDetails?.cashCost);
  const hotelCash = Number(baseline?.hotelDetails?.cashCost);

  return {
    estimatedCashPrice,
    estimatedFlightPrice: Number.isFinite(flightCash) && flightCash > 0 ? flightCash : estimatedCashPrice * 0.45,
    estimatedHotelPrice: Number.isFinite(hotelCash) && hotelCash > 0 ? hotelCash : estimatedCashPrice * 0.55,
  };
}

router.post("/redemption", requirePro, async (req, res, next) => {
  try {
    const { tripId } = req.body || {};
    if (!tripId) {
      const err = new Error("tripId is required");
      err.status = 400;
      throw err;
    }

    const trip = await prisma.trip.findUnique({ where: { id: tripId } });
    if (!ownedOr403(trip, req.userId, res)) return;

    const pricing = await deriveTripPricing(tripId, trip);
    const options = await generateRedemptionOptions(req.userId, { ...trip, ...pricing });

    const best = options.best || null;
    const journey = await prisma.userJourney.create({
      data: {
        userId: req.userId,
        tripId,
        origin: trip.origin || null,
        destination: trip.destination || null,
        recommendedScenario: best?.type || null,
        recommendedProgramme: best?.programme || best?.fromProgramme || null,
        pointsRecommended: best?.pointsUsed || best?.pointsToTransfer || best?.pointsForHotel || null,
      },
    });

    recordEvent(req.userId, EVENT_TYPES.OPTIMISATION_RUN, {
      tripId,
      journeyId: journey.id,
      recommendedScenario: best?.type || null,
      accounts: (options.accounts || []).map((a) => a.programme),
    });

    res.json({ ...options, journeyId: journey.id });
  } catch (err) {
    next(err);
  }
});

// POST /optimize/trip — cross-leg points/cash optimisation for the selected trip (no Trip record needed).
// Body: { legs: [{ type, label, cashGbp }], overrides? }. Not Pro-gated so the core value is demoable;
// gate with requirePro if the product decides to.
router.post("/trip", async (req, res, next) => {
  try {
    const { legs, overrides } = req.body || {};
    if (!Array.isArray(legs) || !legs.length) {
      return res.status(400).json({ error: { message: "legs must be a non-empty array" } });
    }

    const withAwards = legs
      .filter((l) => l && ["flight", "hotel", "car"].includes(l.type))
      .map((l) => ({
        type: l.type,
        label: l.label || l.type,
        cashGbp: Number(l.cashGbp) || 0,
        awards: deriveAwards(l),
      }));

    const accounts = await prisma.loyaltyAccount.findMany({ where: { userId: req.userId } });
    const result = optimizeTrip({ legs: withAwards, accounts, overrides: overrides || {} });
    result.narrative = narrate(result);

    recordEvent(req.userId, EVENT_TYPES.OPTIMISATION_RUN, {
      legs: withAwards.map((l) => l.type),
      recommendedPointsLegs: result.recommended.legs.filter((l) => l.method === "points").map((l) => l.type),
    }).catch(() => {});

    res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
