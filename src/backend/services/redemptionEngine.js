// services/redemptionEngine.js — ranks points/transfer/hybrid/cash redemption scenarios (offline compute).
const { PROGRAMME_VALUATIONS } = require("./emailLoyaltySync");
const prisma = require("../config/database");

const TRANSFER_PARTNERS = {
  amex_mr: {
    partners: ["ba_avios", "united_mp", "aeroplan", "marriott_bonvoy", "hilton_honors"],
    ratio: 1.0,
  },
  chase_ur: {
    partners: ["united_mp", "aeroplan", "ba_avios", "world_of_hyatt", "marriott_bonvoy"],
    ratio: 1.0,
  },
};

const BENCHMARK_CPP = {
  marriott_bonvoy: 0.008,
  hilton_honors: 0.005,
  world_of_hyatt: 0.015,
  ihg_one: 0.006,
  amex_mr: 0.015,
  chase_ur: 0.015,
  united_mp: 0.012,
  ba_avios: 0.01,
};

function formatProgramme(key) {
  const names = {
    marriott_bonvoy: "Marriott Bonvoy",
    hilton_honors: "Hilton Honors",
    world_of_hyatt: "World of Hyatt",
    ihg_one: "IHG One Rewards",
    amex_mr: "Amex Membership Rewards",
    chase_ur: "Chase Ultimate Rewards",
    united_mp: "United MileagePlus",
    ba_avios: "BA Avios",
    aeroplan: "Air Canada Aeroplan",
  };
  return names[key] || key;
}

function buildRecommendation(account, pointsNeeded, cpp, trip) {
  const saving = trip.estimatedCashPrice;
  const benchmark = BENCHMARK_CPP[account.programme] || 0.01;
  const aboveBenchmark = cpp > benchmark;
  const rating = aboveBenchmark ? "excellent" : cpp > benchmark * 0.8 ? "good" : "below average";

  return (
    `Redeem ${pointsNeeded.toLocaleString()} ${formatProgramme(account.programme)} points for ` +
    `£${saving.toFixed(2)} in value — that's ${(cpp * 100).toFixed(2)}¢/pt, which is ${rating} ` +
    `for this programme. ${
      aboveBenchmark
        ? "This is above the typical redemption benchmark."
        : "Consider waiting for a higher-value redemption opportunity."
    }`
  );
}

function findBestPointsRedemption(accounts, trip) {
  let best = null;
  for (const account of accounts) {
    const cpp = PROGRAMME_VALUATIONS[account.programme] || 0;
    if (cpp <= 0) continue; // guard divide-by-zero
    const pointsNeeded = Math.ceil(trip.estimatedCashPrice / cpp);
    if (account.balance < pointsNeeded) continue;

    const benchmark = BENCHMARK_CPP[account.programme] || 0.01;
    const valueScore = cpp / benchmark;
    if (!best || valueScore > best.valueScore) {
      best = {
        type: "points",
        label: `Use ${formatProgramme(account.programme)} points`,
        programme: account.programme,
        pointsUsed: pointsNeeded,
        pointsRemaining: account.balance - pointsNeeded,
        cashEquivalentSaved: trip.estimatedCashPrice,
        centsPerPoint: cpp * 100,
        benchmarkCpp: benchmark * 100,
        aboveBenchmark: cpp > benchmark,
        valueScore,
        recommendation: buildRecommendation(account, pointsNeeded, cpp, trip),
        deepLink: null, // populated by Seats.aero (8d) / Gondola (8e) award results
        affiliateDeepLink: null,
      };
    }
  }
  return best;
}

function findTransferPartnerOptions(accounts, trip) {
  const options = [];
  for (const account of accounts) {
    const transfer = TRANSFER_PARTNERS[account.programme];
    if (!transfer) continue;

    for (const partnerProgramme of transfer.partners) {
      const partnerCpp = PROGRAMME_VALUATIONS[partnerProgramme] || 0;
      if (partnerCpp <= 0) continue;
      const pointsNeeded = Math.ceil(trip.estimatedCashPrice / partnerCpp);
      const pointsAfterTransfer = Math.floor(account.balance * transfer.ratio);
      if (pointsAfterTransfer < pointsNeeded) continue;

      const pointsToTransfer = Math.ceil(pointsNeeded / transfer.ratio);
      const benchmark = BENCHMARK_CPP[partnerProgramme] || 0.01;
      options.push({
        type: "transfer",
        label: `Transfer ${formatProgramme(account.programme)} → ${formatProgramme(partnerProgramme)}`,
        fromProgramme: account.programme,
        toProgramme: partnerProgramme,
        pointsToTransfer,
        pointsAfterTransfer: pointsNeeded,
        cashEquivalentSaved: trip.estimatedCashPrice,
        centsPerPoint: partnerCpp * 100,
        benchmarkCpp: benchmark * 100,
        aboveBenchmark: partnerCpp > benchmark,
        transferRatio: transfer.ratio,
        valueScore: partnerCpp / benchmark,
        recommendation:
          `Transfer ${pointsToTransfer.toLocaleString()} ${formatProgramme(account.programme)} points to ` +
          `${formatProgramme(partnerProgramme)} at 1:${transfer.ratio}. This gives you ` +
          `${pointsNeeded.toLocaleString()} ${formatProgramme(partnerProgramme)} points — enough for this ` +
          `redemption at ${(partnerCpp * 100).toFixed(2)}¢/pt.`,
        warning: "Transfers are irreversible — confirm award availability before transferring.",
        deepLink: null,
        affiliateDeepLink: null,
      });
    }
  }
  return options;
}

function generateHybridScenario(accounts, trip) {
  const hotelValueAccount = accounts.find(
    (a) =>
      ["world_of_hyatt", "marriott_bonvoy", "hilton_honors", "ihg_one"].includes(a.programme) &&
      a.balance > 10000
  );
  if (!hotelValueAccount) return null;

  const cpp = PROGRAMME_VALUATIONS[hotelValueAccount.programme] || 0.008;
  const estimatedFlightForCash = trip.estimatedFlightPrice || trip.estimatedCashPrice * 0.45;
  const estimatedHotelForPoints = trip.estimatedHotelPrice || trip.estimatedCashPrice * 0.55;

  return {
    type: "hybrid",
    label: "Pay cash for flight, use points for hotel",
    flightPayment: "cash",
    hotelPayment: `${formatProgramme(hotelValueAccount.programme)} points`,
    estimatedCashForFlight: Math.round(estimatedFlightForCash),
    pointsForHotel: Math.ceil(estimatedHotelForPoints / cpp),
    programme: hotelValueAccount.programme,
    centsPerPoint: cpp * 100,
    valueScore: cpp / 0.008,
    recommendation:
      `Book the flight with cash to preserve your ${formatProgramme(hotelValueAccount.programme)} points ` +
      `for the hotel — hotel redemptions typically deliver better value per point than flights.`,
    deepLink: null,
    affiliateDeepLink: null,
  };
}

async function generateRedemptionOptions(userId, trip) {
  const accounts = await prisma.loyaltyAccount.findMany({
    where: { userId },
    orderBy: { valueGbp: "desc" },
  });

  if (!accounts.length) return { mode: "cash_only", reason: "No loyalty accounts found" };

  const totalPointsValueGbp = accounts.reduce((sum, a) => sum + a.valueGbp, 0);

  const scenarios = [];

  const bestPoints = findBestPointsRedemption(accounts, trip);
  if (bestPoints) scenarios.push(bestPoints);

  const transferOptions = findTransferPartnerOptions(accounts, trip);
  if (transferOptions.length) scenarios.push(...transferOptions);

  const hybridOption = generateHybridScenario(accounts, trip);
  if (hybridOption) scenarios.push(hybridOption);

  scenarios.push({
    type: "cash",
    label: "Pay cash",
    totalCashGbp: trip.estimatedCashPrice,
    pointsUsed: 0,
    savings: 0,
    valueScore: 0,
    recommendation: "No points used — keep your balance for higher-value redemptions.",
  });

  scenarios.sort((a, b) => (b.valueScore || 0) - (a.valueScore || 0));

  return {
    best: scenarios[0],
    all: scenarios,
    totalPointsValueGbp: Math.round(totalPointsValueGbp * 100) / 100,
    accounts: accounts.map((a) => {
      const cpp = PROGRAMME_VALUATIONS[a.programme] || 0;
      const benchmark = BENCHMARK_CPP[a.programme] || 0.01;
      return {
        programme: a.programme,
        balance: a.balance,
        valueGbp: a.valueGbp,
        statusTier: a.statusTier,
        centsPerPoint: cpp * 100,
        benchmark: benchmark * 100,
        aboveBenchmark: cpp > benchmark,
      };
    }),
  };
}

module.exports = { generateRedemptionOptions, TRANSFER_PARTNERS, BENCHMARK_CPP };
