// utils/format.js — currency / points / date formatting helpers.
import { money } from "./money";

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

// Locale-aware "last updated" timestamp (uses the viewer's own locale). `withTime` adds hour:minute.
export const formatUpdatedAt = (iso, { withTime = false } = {}) => {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
};

// §27b — all money crosses as GBP minor units (pence). Both helpers convert pence to the viewer's display
// currency via utils/money (which formats through the one shared formatter). `formatGbpExact` keeps the
// natural minor digits (e.g. a credits balance "£12.34"); the default shows whole units.
export const formatMoney = (pence) => money(pence);

export const formatGbp = (pence) => money(pence);

export const formatGbpExact = (pence) => money(pence, { precise: true });

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
