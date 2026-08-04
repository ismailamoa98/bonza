// utils/format.js — currency / points / date formatting helpers.

export const STRATEGY_LABELS = {
  transfer: "Transfer Strategy",
  status: "Status Benefits",
  cash: "Pay Cash",
  hybrid: "Hybrid",
  direct: "Direct Redemption",
};

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
  String(code)
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (c) => c.toUpperCase())
    .trim();

export const formatPoints = (n) => {
  const num = Number(n) || 0;
  return num >= 1000 ? `${Math.round(num / 1000)}k` : `${num}`;
};

export const formatMoney = (n) => `$${(Number(n) || 0).toLocaleString()}`;

export const formatGbp = (n) => `£${(Number(n) || 0).toLocaleString()}`;

export const cppRating = (cpp, benchmark) => {
  const c = Number(cpp) || 0;
  const b = Number(benchmark) || 0;
  if (b > 0 && c > b) return { label: "EXCELLENT VALUE", tone: "good" };
  if (b > 0 && c > b * 0.8) return { label: "GOOD VALUE", tone: "ok" };
  return { label: "BELOW AVERAGE", tone: "low" };
};

export const percent = (r) => `${Math.round((Number(r) || 0) * 100)}%`;

export const formatCents = (c) => `${(Number(c) || 0).toFixed(1)}¢`;

export const valueBadge = (multiplier) => {
  const pct = Math.round(((Number(multiplier) || 1) - 1) * 100);
  return pct > 0 ? `+${pct}% Value` : null;
};

export const costSummary = (totalCash, pointsUsed) => {
  const cash = formatMoney(totalCash);
  return pointsUsed > 0 ? `${cash} + ${formatPoints(pointsUsed)} pts` : cash;
};

export const vendorCost = (cashCost) =>
  Number(cashCost) > 0 ? formatMoney(cashCost) : "FREE";

export const shortDate = (value) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};
