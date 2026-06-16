// components/OptimizationPanel.jsx — "Your optimal package" recommendation panel.
// Optimizes the running flight + hotel + car combination the user has clicked.
// Leads with a Cash / Points / Saves headline, then live ¢-per-point + remaining
// budget, a points<->cash slider (lower bound = least points to stay in budget,
// upper bound = most points the balance funds), a per-leg breakdown, and the
// "Proceed to booking" CTA. Totals recompute on every grid click and slider move.
// Props: { onRatioCommit, onProceed, proceeding, canProceed }.
import { useState } from "react";
import {
  useAppStore,
  computeCombination,
  maxComboRatio,
  minBudgetRatio,
  tripNights,
} from "../store/appStore";
import { formatMoney, formatPoints, percent, formatCents } from "../utils/format";
import AnimatedNumber from "./AnimatedNumber";

export default function OptimizationPanel({ onRatioCommit, onProceed, proceeding, canProceed }) {
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
    <section className="rounded-2xl border-2 border-bonza bg-white p-5 font-jakarta tabular-nums shadow-[0_1px_2px_rgba(40,30,20,0.04),0_16px_40px_rgba(120,80,50,0.07)]">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-bonza">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 2.5l2.9 5.88 6.49.94-4.69 4.57 1.1 6.46L12 17.3l-5.8 3.05 1.1-6.46-4.69-4.57 6.49-.94L12 2.5z" />
          </svg>
          Your optimal package
        </p>
        {budget > 0 && (
          <p className="text-[11px] text-ink-muted">Budget {formatMoney(budget)}</p>
        )}
      </div>

      {!hasSelection ? (
        <p className="mt-3 text-[13px] leading-relaxed text-ink-soft">
          Pick a flight, hotel, or car from the grid and I'll show you the best way to pay —
          cash, points, or a blend — while keeping you under budget.
        </p>
      ) : (
        <>
          {/* Headline summary: Cash · Points · Saves (figures count up on change) */}
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <Stat label="Cash" value={<AnimatedNumber value={totalCash} format={formatMoney} />} />
            <Stat
              label="Points"
              value={
                pointsUsed > 0 ? (
                  <>
                    <AnimatedNumber value={pointsUsed} format={formatPoints} /> pts
                  </>
                ) : (
                  "—"
                )
              }
              hint={available ? `of ${formatPoints(available)}` : null}
            />
            <Stat
              label="Saves"
              value={
                savingsAmount > 0 ? (
                  <AnimatedNumber value={savingsAmount} format={formatMoney} />
                ) : (
                  "—"
                )
              }
              accent={savingsAmount > 0}
            />
          </div>

          {/* Selected legs */}
          <ul className="mt-4 space-y-1.5">
            {items.map((it) => (
              <li
                key={it.type}
                className="flex items-center justify-between rounded-lg bg-cream px-3 py-2 text-[13px]"
              >
                <span className="text-ink">{it.label}</span>
                <span className="text-ink-muted">
                  {formatMoney(it.cash)}
                  {it.points > 0 && <> · {formatPoints(it.points)} pts</>}
                </span>
              </li>
            ))}
          </ul>

          {/* Points value + remaining budget */}
          <div className="mt-3 flex items-center justify-between gap-2 text-[12px]">
            <span className="text-ink-muted">
              {pointsValueCents > 0 ? (
                <>
                  Value <b className="font-bold text-ink">{formatCents(pointsValueCents)}/pt</b>
                </>
              ) : (
                "Cash only"
              )}
            </span>
            {remaining != null && (
              <span
                className={[
                  "rounded-full px-2.5 py-1 font-semibold",
                  remaining >= 0 ? "bg-[#EAF6EE] text-[#1E7E40]" : "bg-[#FBE8E0] text-[#c0603c]",
                ].join(" ")}
              >
                {remaining >= 0
                  ? `${formatMoney(remaining)} of budget left`
                  : `${formatMoney(-remaining)} over budget`}
              </span>
            )}
          </div>

          {/* Points <-> cash slider */}
          <div className="mt-4">
            <div className="flex justify-between text-[11px] font-medium text-ink-muted">
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
            <p className="text-[11px] text-ink-muted">
              Using {percent(ratio)} of your usable points
              {minRatio > 0 && ` · min ${percent(minRatio)} to stay in budget`}
            </p>
          </div>

          {/* Per-leg cash-vs-points breakdown */}
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="mt-3 inline-flex items-center gap-1 text-[13px] font-semibold text-bonza hover:text-bonza-dark"
          >
            {expanded ? "Hide breakdown" : "Show breakdown"}
            <svg
              width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"
              className={expanded ? "rotate-180" : ""}
              aria-hidden="true"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
          {expanded && (
            <table className="mt-2 w-full text-[13px]">
              <thead className="text-left text-[11px] text-ink-muted">
                <tr>
                  <th className="py-1 font-medium">Leg</th>
                  <th className="py-1 text-right font-medium">Cash</th>
                  <th className="py-1 text-right font-medium">Points</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => (
                  <tr key={it.type} className="border-t border-[#f0ece5]">
                    <td className="py-1.5 text-ink">{it.label}</td>
                    <td className="py-1.5 text-right text-ink">{formatMoney(it.cash)}</td>
                    <td className="py-1.5 text-right text-ink-muted">
                      {it.points > 0 ? formatPoints(it.points) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* Proceed to booking */}
          <button
            type="button"
            onClick={onProceed}
            disabled={proceeding || !canProceed}
            className="mt-5 flex w-full items-center justify-center gap-1.5 rounded-xl bg-bonza px-4 py-3 text-[14px] font-semibold text-white transition-colors hover:bg-bonza-dark disabled:opacity-50"
          >
            {proceeding ? "Preparing your booking…" : "Proceed to booking"}
            {!proceeding && (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            )}
          </button>
        </>
      )}
    </section>
  );
}

function Stat({ label, value, hint, accent }) {
  return (
    <div className="rounded-lg bg-cream p-2.5">
      <p className="text-[11px] text-ink-muted">{label}</p>
      <p className={`text-[15px] font-extrabold leading-tight ${accent ? "text-[#1E7E40]" : "text-ink"}`}>
        {value}
      </p>
      {hint && <p className="text-[10px] leading-tight text-ink-muted">{hint}</p>}
    </div>
  );
}
