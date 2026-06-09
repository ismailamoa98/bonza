// components/OptimizationPanel.jsx — Right-side panel for Step 2.
// Optimizes the running flight + hotel + car combination the user has clicked.
// Shows live cash / points / ¢-per-point / savings, the remaining budget, and a
// points<->cash slider. The slider's LOWER bound is the least points needed to
// stay within budget; its UPPER bound is the most points the balance can fund —
// so points never exceed the balance and cash never exceeds budget. Totals
// recompute on every grid click and slider move. Props: { onRatioCommit }.
import { useState } from "react";
import {
  useAppStore,
  computeCombination,
  maxComboRatio,
  minBudgetRatio,
  tripNights,
} from "../store/appStore";
import { formatMoney, formatPoints, percent, formatCents } from "../utils/format";

export default function OptimizationPanel({ onRatioCommit }) {
  const [expanded, setExpanded] = useState(true);

  const selectedFlight = useAppStore((s) => s.selectedFlight);
  const selectedHotel = useAppStore((s) => s.selectedHotel);
  const selectedCar = useAppStore((s) => s.selectedCar);
  const loyaltyPoints = useAppStore((s) => s.loyaltyPoints);
  const trip = useAppStore((s) => s.trip);
  const ratio = useAppStore((s) => s.ratio);
  const setRatio = useAppStore((s) => s.setRatio);

  const nights = tripNights(trip);
  const budget = trip?.budget;
  const available = (loyaltyPoints?.amex || 0) + (loyaltyPoints?.chaseUr || 0);

  const maxRatio = maxComboRatio(selectedFlight, selectedHotel, selectedCar, loyaltyPoints, nights);
  const minRatio = minBudgetRatio(selectedFlight, selectedHotel, selectedCar, loyaltyPoints, nights, budget);
  const { items, hasSelection, totalCash, pointsUsed, savingsAmount, pointsValueCents } =
    computeCombination(selectedFlight, selectedHotel, selectedCar, loyaltyPoints, nights, ratio);

  const remaining = budget ? budget - totalCash : null;

  // Clamp between "enough points to fit budget" and "most points you can fund".
  const handleRatio = (e) => {
    const v = Number(e.target.value) / 100;
    setRatio(Math.min(maxRatio || 1, Math.max(minRatio, v)));
  };

  return (
    <section className="rounded-xl border-2 border-bonza bg-white p-4 shadow-md">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-bonza">
          ★ Bonza optimizer
        </p>
        {budget > 0 && (
          <p className="text-[11px] text-slate-500">
            Budget {formatMoney(budget)}
          </p>
        )}
      </div>

      {!hasSelection ? (
        <p className="mt-3 text-sm text-slate-500">
          Pick a flight, hotel, or car from the grid and I'll show you the best way to pay —
          cash, points, or a blend — while keeping you under budget.
        </p>
      ) : (
        <>
          {/* Selected legs */}
          <ul className="mt-3 space-y-1.5">
            {items.map((it) => (
              <li
                key={it.type}
                className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm"
              >
                <span className="text-slate-700">{it.label}</span>
                <span className="text-slate-500">
                  {formatMoney(it.cash)}
                  {it.points > 0 && <> · {formatPoints(it.points)} pts</>}
                </span>
              </li>
            ))}
          </ul>

          {/* Headline savings */}
          {savingsAmount > 0 && (
            <p className="mt-3 text-center text-sm text-slate-600">
              Saving <span className="text-xl font-bold text-green-600">{formatMoney(savingsAmount)}</span>{" "}
              vs. paying all cash
            </p>
          )}

          {/* Live totals */}
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <Stat label="Cash" value={formatMoney(totalCash)} />
            <Stat
              label="Points"
              value={pointsUsed > 0 ? formatPoints(pointsUsed) : "—"}
              hint={available ? `of ${formatPoints(available)}` : null}
            />
            <Stat
              label="Value"
              value={pointsValueCents > 0 ? `${formatCents(pointsValueCents)}/pt` : "—"}
            />
          </div>

          {/* Remaining budget */}
          {remaining != null && (
            <p
              className={[
                "mt-3 rounded-lg px-3 py-2 text-center text-sm font-medium",
                remaining >= 0 ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600",
              ].join(" ")}
            >
              {remaining >= 0
                ? `${formatMoney(remaining)} of your budget left`
                : `${formatMoney(-remaining)} over budget`}
            </p>
          )}

          {/* Points <-> cash slider */}
          <div className="mt-4">
            <div className="flex justify-between text-[11px] font-medium text-slate-500">
              <span>More cash</span>
              <span>More points</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={Math.round(ratio * 100)}
              onChange={handleRatio}
              onMouseUp={() => onRatioCommit?.(ratio)}
              onTouchEnd={() => onRatioCommit?.(ratio)}
              className="mt-1 w-full accent-bonza"
            />
            <p className="text-[11px] text-slate-500">
              Using {percent(ratio)} of your usable points
              {minRatio > 0 && ` · min ${percent(minRatio)} to stay in budget`}
            </p>
          </div>

          {/* Per-leg cash-vs-points breakdown */}
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="mt-3 text-sm font-medium text-bonza hover:underline"
          >
            {expanded ? "Hide breakdown ▴" : "Show breakdown ▾"}
          </button>
          {expanded && (
            <table className="mt-2 w-full text-sm">
              <thead className="text-left text-[11px] text-slate-500">
                <tr>
                  <th className="py-1 font-medium">Leg</th>
                  <th className="py-1 text-right font-medium">Cash</th>
                  <th className="py-1 text-right font-medium">Points</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => (
                  <tr key={it.type} className="border-t border-slate-100">
                    <td className="py-1.5 text-slate-700">{it.label}</td>
                    <td className="py-1.5 text-right text-slate-700">{formatMoney(it.cash)}</td>
                    <td className="py-1.5 text-right text-slate-500">
                      {it.points > 0 ? formatPoints(it.points) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </section>
  );
}

function Stat({ label, value, hint }) {
  return (
    <div className="rounded-lg bg-slate-50 p-2">
      <p className="text-[11px] text-slate-500">{label}</p>
      <p className="text-sm font-bold text-slate-900">{value}</p>
      {hint && <p className="text-[10px] leading-tight text-slate-400">{hint}</p>}
    </div>
  );
}
