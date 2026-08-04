// api/optimize.js — trip optimisation (5 scenarios) + Pro redemption endpoint.
const express = require("express");
const prisma = require("../config/database");
const { generateScenarios } = require("../utils/claudeOptimizer");
const { generateRedemptionOptions } = require("../services/redemptionEngine");
const { ownedOr403 } = require("../utils/ownedOr403");
const requirePro = require("../middleware/requirePro");
const { recordEvent, EVENT_TYPES } = require("../utils/eventTracker");

const router = express.Router();

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

module.exports = router;
