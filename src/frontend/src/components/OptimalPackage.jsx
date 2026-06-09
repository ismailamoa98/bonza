// components/OptimalPackage.jsx — The single "optimal package" box for Step 2.
// Shows live cost/points/savings for the recommended package, a points<->cash
// slider that recomputes everything instantly, and a collapsible vendor
// comparison for swapping individual flight/hotel/car vendors.
// Props: { scenario, onVendorChange, onRatioCommit }.
import { useState } from "react";
import VendorComparison from "./VendorComparison";
import {
  useAppStore,
  computeTotals,
  maxFeasibleRatio,
  VENDOR_CATEGORIES,
} from "../store/appStore";
import {
  strategyLabel,
  benefitLabel,
  formatMoney,
  formatPoints,
  percent,
  formatCents,
} from "../utils/format";

const CATEGORY_TITLES = { flight: "Flight options", hotel: "Hotel options", car: "Car options" };

export default function OptimalPackage({ scenario, onVendorChange, onRatioCommit }) {
  const [expanded, setExpanded] = useState(false);

  const selection = useAppStore((s) => s.vendorSelections[scenario.id]);
  const setVendor = useAppStore((s) => s.setVendor);
  const ratio = useAppStore((s) => s.ratio);
  const setRatio = useAppStore((s) => s.setRatio);
  const loyaltyPoints = useAppStore((s) => s.loyaltyPoints);

  const maxRatio = maxFeasibleRatio(scenario, selection, loyaltyPoints);
  const { totalCash, pointsUsed, savingsAmount, pointsValueCents, benefits } = computeTotals(
    scenario,
    selection,
    ratio
  );

  const handleVendor = (category, vendor) => {
    setVendor(scenario.id, category, vendor.id);
    // Re-clamp the ratio if the new selection needs more points than available.
    const newMax = maxFeasibleRatio(
      { ...scenario },
      { ...selection, [category]: vendor.id },
      loyaltyPoints
    );
    if (ratio > newMax) setRatio(newMax);
    onVendorChange?.(scenario, category, vendor);
  };

  const handleRatio = (e) => {
    const next = Math.min(maxRatio || 1, Number(e.target.value) / 100);
    setRatio(next);
  };

  return (
    <div className="rounded-xl border-2 border-bonza bg-white p-5 shadow-md">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-bonza">
            ★ Your optimal package
          </p>
          <h3 className="text-lg font-semibold text-slate-800">
            {strategyLabel(scenario.strategy)}
          </h3>
        </div>
        {savingsAmount > 0 && (
          <div className="text-right">
            <p className="text-2xl font-bold text-green-600">{formatMoney(savingsAmount)}</p>
            <p className="text-xs text-slate-500">saved vs. all cash</p>
          </div>
        )}
      </div>

      {/* Live totals */}
      <div className="mt-4 grid grid-cols-3 gap-3 text-center">
        <Stat label="Cash" value={formatMoney(totalCash)} />
        <Stat label="Points" value={pointsUsed > 0 ? formatPoints(pointsUsed) : "—"} />
        <Stat
          label="Points value"
          value={pointsValueCents > 0 ? `${formatCents(pointsValueCents)}/pt` : "—"}
          hint={pointsValueCents > 0 && pointsValueCents < 1 ? "cash may be better" : "cash saved per point"}
        />
      </div>

      {/* Points <-> cash slider */}
      <div className="mt-5">
        <div className="flex justify-between text-xs font-medium text-slate-500">
          <span>More cash</span>
          <span>More points</span>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          value={Math.round(ratio * 100)}
          onChange={handleRatio}
          onMouseUp={() => onRatioCommit?.(scenario, ratio)}
          onTouchEnd={() => onRatioCommit?.(scenario, ratio)}
          className="mt-1 w-full accent-bonza"
        />
        <p className="text-xs text-slate-500">
          Paying {percent(ratio)} with points
          {maxRatio < 1 && ` · max ${percent(maxRatio)} with your balance`}
        </p>
      </div>

      {scenario.reasoning && (
        <p className="mt-4 text-sm text-slate-600">{scenario.reasoning}</p>
      )}

      {benefits.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {benefits.map((b) => (
            <li key={b} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
              {benefitLabel(b)}
            </li>
          ))}
        </ul>
      )}

      {/* Collapsible vendor comparison */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="mt-4 text-sm font-medium text-bonza hover:underline"
      >
        {expanded ? "Hide vendor options ▴" : "Compare vendor options ▾"}
      </button>

      {expanded && (
        <div className="mt-1">
          {VENDOR_CATEGORIES.map(([cat, key]) => (
            <VendorComparison
              key={cat}
              title={CATEGORY_TITLES[cat]}
              vendors={scenario[key]?.vendors || []}
              selectedId={selection?.[cat]}
              onSelect={(vendor) => handleVendor(cat, vendor)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, hint }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-lg font-bold text-slate-900">{value}</p>
      {hint && <p className="mt-0.5 text-[10px] leading-tight text-slate-400">{hint}</p>}
    </div>
  );
}
