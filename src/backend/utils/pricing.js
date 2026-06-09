// utils/pricing.js — Date-aware cash pricing for the mock inventory.
// Returns a deterministic multiplier for a given check-in date: seasonal demand
// by month plus a small within-month wiggle. Only CASH prices move with the
// date — award (points) prices stay fixed — so flexible dates change how much
// cash a trip costs, which is exactly what the month chooser shops on.

// Relative demand by month (Jan … Dec): summer + December peak, shoulder dips.
const MONTH_FACTORS = [
  0.85, 0.85, 0.92, 0.98, 1.05, 1.2, 1.3, 1.28, 1.08, 0.92, 0.88, 1.22,
];

exports.priceMultiplier = (isoDate) => {
  if (!isoDate) return 1;
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return 1;
  const seasonal = MONTH_FACTORS[d.getUTCMonth()] ?? 1;
  // ±~6% within the month so different windows aren't identical.
  const wiggle = 1 + (((d.getUTCDate() % 10) - 5) * 0.012);
  return Math.round(seasonal * wiggle * 100) / 100;
};
