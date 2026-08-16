// components/search/redemptionMath.js — pure points<->cash blend maths for the detail-panel slider.
// Mirrors store/appStore.js `computeCombination`, adapted to the search data shape (cashOption /
// pointsOption). Deliberately framework-free so it's easy to eyeball and unit-test.
//
// Key invariant: points-for-a-full-stay is derived from the CASH total and the redemption's ¢/pt rate,
// NOT from the raw `pointsCost` field. `pointsCost` on real award rows is a flat flight-award number
// (see api/search.js) that doesn't scale per night, so anchoring on cash + rate keeps the buy-down
// arithmetic correct regardless of where the points figure came from.
//
// `availablePoints` is INJECTED by the caller. Today it's a single account balance; later a trip-aware,
// transfer-partner-conflict-aware allocator can pass the *remaining* budget for this programme (after the
// flight/car legs) with no change here — that's the extensibility seam.

const CASHBACK_RATE = 0.03; // 3% Bonza Credits on cash spend (config/constants.js CASHBACK_RATE)

const round = (n) => Math.round(Number(n) || 0);
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

// Round a point count to a tidy slider step so the handle lands on clean numbers.
export function snapPoints(points, step = 500) {
  return Math.round((Number(points) || 0) / step) * step;
}

// Points needed to cover a whole leg with points, from the cash total and the ¢/pt rate. Exported so the
// UI can decide an "effective balance" (e.g. for the demo preview) before running the full breakdown.
export function pointsForFullStay(totalCash, centsPerPoint) {
  const rate = (Number(centsPerPoint) || 0) / 100;
  return rate > 0 ? round((Number(totalCash) || 0) / rate) : 0;
}

// Given the cash total for this leg, the redemption's ¢/pt rate, whether it beats the benchmark, the
// points the user can actually deploy, and how many they've chosen — return the full blend breakdown.
export function computeRedemption({
  totalCash = 0,
  centsPerPoint = 0,
  aboveBenchmark = false,
  availablePoints = 0,
  pointsUsed = 0,
}) {
  const cash = Math.max(0, Number(totalCash) || 0);
  const cpp = Math.max(0, Number(centsPerPoint) || 0);
  const rateGbpPerPoint = cpp / 100; // £ saved per point redeemed

  // Points needed to cover the whole leg with points, and the most the user can actually deploy.
  const pointsForFull = pointsForFullStay(cash, cpp);
  const maxPoints = Math.max(0, Math.min(pointsForFull, round(availablePoints)));
  const canAffordFull = pointsForFull > 0 && maxPoints >= pointsForFull;

  const used = round(clamp(Number(pointsUsed) || 0, 0, maxPoints));
  const cashRemaining = Math.max(0, cash - used * rateGbpPerPoint);
  const creditsEarned = parseFloat((cashRemaining * CASHBACK_RATE).toFixed(2));

  // Strong redemption (beats the ¢/pt benchmark) → spend as many points as affordable; otherwise keep
  // the points (they're worth more elsewhere) and pay cash to earn Credits.
  const optimalPoints = aboveBenchmark ? maxPoints : 0;

  // Which of the three fixed framings is best value right now.
  let bestOption;
  if (!maxPoints || !aboveBenchmark) bestOption = "cash";
  else if (canAffordFull) bestOption = "points";
  else bestOption = "hybrid"; // strong redemption but the balance only covers part of the stay

  return {
    rateGbpPerPoint,
    pointsForFull,
    maxPoints,
    canAffordFull,
    pointsUsed: used,
    cashRemaining: round(cashRemaining),
    creditsEarned,
    optimalPoints,
    bestOption,
    // Full-cash reference anchor (fixed) + its Credits.
    fullCash: round(cash),
    fullCashCredits: parseFloat((cash * CASHBACK_RATE).toFixed(2)),
  };
}

// Bonza's live advice comparing the user's current slider position to the optimum.
export function redemptionAdvice({ pointsUsed, optimalPoints, centsPerPoint, canAffordFull, creditsEarned, aboveBenchmark }) {
  const cpp = (Number(centsPerPoint) || 0).toFixed(1);
  if (!aboveBenchmark) {
    return pointsUsed > 0
      ? `Save your points — worth more elsewhere. Pay cash and earn £${creditsEarned} in Credits.`
      : `Pay cash — these points are weak value here (${cpp}¢/pt). You'll earn £${creditsEarned} in Credits.`;
  }
  if (pointsUsed >= optimalPoints) {
    return canAffordFull
      ? `Best value — you're getting ${cpp}¢/pt on these points.`
      : `Best you can do — your balance covers this much at a strong ${cpp}¢/pt.`;
  }
  return `Use more points — they're worth a strong ${cpp}¢/pt on this stay.`;
}
