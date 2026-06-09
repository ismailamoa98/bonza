// utils/format.js — Display helpers shared across the scenario/booking UI.
// Maps the backend's machine values (strategy keys, camelCase benefit codes)
// to human-friendly labels and formats points/money/dates for display.

// Strategy key -> card title. Matches the 5 strategies in the optimizer.
export const STRATEGY_LABELS = {
  transfer: "Transfer Strategy",
  status: "Status Benefits",
  cash: "Pay Cash",
  hybrid: "Hybrid",
  direct: "Direct Redemption",
};

// camelCase benefit code -> human label (benefits arrive as e.g. "suiteUpgrade").
const BENEFIT_LABELS = {
  suiteUpgrade: "Free suite upgrade",
  loungeAccess: "Lounge access",
  spaCredit: "$200 spa credit",
  freeBreakfast: "Free breakfast",
  statusUpgrade: "Status upgrade",
  freeChanges: "Free changes & cancellation",
  earnPoints: "Earn ~$560 in points",
  balancedValue: "Balanced value",
  someFlexibility: "Some flexibility",
  simplest: "Simplest — no transfers",
  businessCabin: "Business cabin",
  freeUpgrade: "Free upgrade",
};

export const strategyLabel = (strategy) => STRATEGY_LABELS[strategy] || strategy;

export const benefitLabel = (code) =>
  BENEFIT_LABELS[code] ||
  // Fallback: turn "someCode" into "Some code".
  String(code)
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (c) => c.toUpperCase())
    .trim();

// 135000 -> "135k", 0 -> "0".
export const formatPoints = (n) => {
  const num = Number(n) || 0;
  return num >= 1000 ? `${Math.round(num / 1000)}k` : `${num}`;
};

export const formatMoney = (n) => `$${(Number(n) || 0).toLocaleString()}`;

// 0.7 -> "70%".
export const percent = (r) => `${Math.round((Number(r) || 0) * 100)}%`;

// 1.703 -> "1.7¢". Cents per point readout.
export const formatCents = (c) => `${(Number(c) || 0).toFixed(1)}¢`;

// "+41% Value" badge text from a value multiplier (1.41 -> "+41% Value").
export const valueBadge = (multiplier) => {
  const pct = Math.round(((Number(multiplier) || 1) - 1) * 100);
  return pct > 0 ? `+${pct}% Value` : null;
};

// "$400 + 135k pts" cost summary; drops the points part when none are used.
export const costSummary = (totalCash, pointsUsed) => {
  const cash = formatMoney(totalCash);
  return pointsUsed > 0 ? `${cash} + ${formatPoints(pointsUsed)} pts` : cash;
};

// Vendor out-of-pocket cash: 0 -> "FREE", else "$800".
export const vendorCost = (cashCost) =>
  Number(cashCost) > 0 ? formatMoney(cashCost) : "FREE";

// "2024-06-01" / Date -> "Jun 1".
export const shortDate = (value) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};
