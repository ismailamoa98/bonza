// api/optimize.js — Optimization engine endpoint.
// POST /api/v1/optimize { tripId } — generates and persists 5 scenarios and
// returns them formatted for the scenario-card layout.
const express = require("express");
const prisma = require("../config/database");
const { generateScenarios } = require("../utils/claudeOptimizer");

const router = express.Router();

// Maps a persisted Scenario row to the API shape (totalCashCost -> totalCash).
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

    // Re-optimizing replaces any previous scenarios for this trip.
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

module.exports = router;
