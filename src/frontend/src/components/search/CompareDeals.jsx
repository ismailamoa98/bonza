// components/search/CompareDeals.jsx — the interactive points<->cash tool for the detail panel's
// "Compare deals" tab. Left: the user's recorded balance for the redemption programme. Right: three fixed
// framings (Cash only / Cash + points / Points only) with a ★ badge on Bonza's live pick, an always-on
// slider that blends how many points to spend, and a dynamic advice callout. Cash + Credits recompute on
// every slider move; the pure maths lives in redemptionMath.js. Built standalone so the flight body can
// reuse it next.
import { PROGRAMME_LABELS } from "./programmes";
import { computeRedemption, redemptionAdvice, pointsForFullStay } from "./redemptionMath";
import { formatGbp } from "../../utils/format";
import { SparklesIcon, StarIcon } from "./icons";

export default function CompareDeals({
  totalCash = 0,
  centsPerPoint = 0,
  aboveBenchmark = false,
  programme,
  availablePoints = 0,
  balanceKnown = true,
  accounts = [],
}) {
  const programmeLabel = PROGRAMME_LABELS[programme] || programme || "points";

  // When Bonza has no live balance for this programme (e.g. the demo fabrication), let the slider run to a
  // full-stay redemption so the tool is still previewable — flagged in the balance panel as estimated.
  const fullStay = pointsForFullStay(totalCash, centsPerPoint);
  const effectiveAvailable = balanceKnown ? availablePoints : fullStay;

  // Fixed on Bonza's optimised pick (points-only / cash-only / blend, whichever is realistic) — this tab is
  // now a read-only summary; the actionable choice lives in the "Book with points" modal.
  const initial = computeRedemption({
    totalCash,
    centsPerPoint,
    aboveBenchmark,
    availablePoints: effectiveAvailable,
    pointsUsed: 0,
  });
  const pointsUsed = initial.optimalPoints;

  const r = computeRedemption({
    totalCash,
    centsPerPoint,
    aboveBenchmark,
    availablePoints: effectiveAvailable,
    pointsUsed,
  });

  const advice = redemptionAdvice({
    pointsUsed: r.pointsUsed,
    optimalPoints: r.optimalPoints,
    centsPerPoint,
    canAffordFull: r.canAffordFull,
    creditsEarned: r.creditsEarned,
    aboveBenchmark,
  });

  // The bar tracks ONLY the programme this stay redeems into — points used ÷ that programme's balance.
  const usedPct = effectiveAvailable > 0 ? Math.min(100, (r.pointsUsed / effectiveAvailable) * 100) : 0;
  const hasPoints = r.maxPoints > 0;

  // Always show the programme this stay redeems into as a row in the table (so the used bar sits under it),
  // even when it isn't one of the user's connected balances.
  const activeHeld = accounts.some((a) => a.programme === programme);
  const displayAccounts =
    activeHeld || !programme ? accounts : [...accounts, { programme, notConnected: true }];

  // With many programmes the panel splits into two columns down the middle and widens, instead of growing
  // tall. Few programmes keep the original compact single-column size.
  const many = displayAccounts.length > 3;
  const half = Math.ceil(displayAccounts.length / 2);
  const columns = many ? [displayAccounts.slice(0, half), displayAccounts.slice(half)] : [displayAccounts];

  const renderRow = (acct, i) => {
    const isActive = acct.programme === programme;
    const bal = Math.round(acct.balance || 0);
    return (
      <div key={acct.programme || i} className="py-3">
        <p className="text-[13px] font-semibold text-ink-900 mb-2">
          {PROGRAMME_LABELS[acct.programme] || acct.programme}
        </p>
        {acct.notConnected ? (
          <p className="text-[15px] font-semibold text-ink-900 leading-tight">Balance not connected</p>
        ) : (
          <p className="text-[28px] font-semibold text-ink-900 leading-none tabular-nums">{bal.toLocaleString()}</p>
        )}
        {isActive && hasPoints && (
          <PointsBar
            pct={usedPct}
            used={r.pointsUsed}
            left={acct.notConnected ? undefined : Math.max(0, bal - r.pointsUsed)}
          />
        )}
      </div>
    );
  };

  return (
    <div
      className={`grid grid-cols-1 gap-6 ${
        many ? "md:grid-cols-[minmax(0,440px)_1fr]" : "md:grid-cols-[minmax(0,220px)_1fr]"
      }`}
    >
      {/* Left: every programme the user holds, one row each with a divider between. The used/left bar sits
          under the programme actually being spent on this stay, so it only counts that programme's points. */}
      <div className="rounded-2xl bg-cream p-4">
        <p className="text-[10px] font-bold text-ink-300 tracking-wider mb-1">YOUR POINTS</p>
        <div className={many ? "grid grid-cols-2 divide-x divide-ink-900/[0.06]" : ""}>
          {columns.map((col, ci) => (
            <div
              key={ci}
              className={`divide-y divide-ink-900/[0.06] ${many ? (ci === 0 ? "pr-4" : "pl-4") : ""}`}
            >
              {col.map(renderRow)}
            </div>
          ))}
        </div>
      </div>

      {/* Right: options, slider, advice */}
      <div>
        <div className="grid grid-cols-3 gap-2.5 mb-4">
          <OptionTile
            label="Cash only"
            best={r.bestOption === "cash"}
            primary={formatGbp(r.fullCash)}
            secondary={`earn £${r.fullCashCredits} credits`}
          />
          <OptionTile
            label="Cash + points"
            best={r.bestOption === "hybrid"}
            primary={r.pointsUsed > 0 ? `${r.pointsUsed.toLocaleString()} pts` : "—"}
            secondary={r.pointsUsed > 0 ? `+ ${formatGbp(r.cashRemaining)}` : "all cash"}
            live
          />
          <OptionTile
            label="Points only"
            best={r.bestOption === "points"}
            primary={hasPoints ? `${r.pointsForFull.toLocaleString()} pts` : "—"}
            secondary={
              !hasPoints
                ? "no availability"
                : r.canAffordFull
                  ? "£0 to pay"
                  : `need ${(r.pointsForFull - r.maxPoints).toLocaleString()} more`
            }
            disabled={hasPoints && !r.canAffordFull}
          />
        </div>

        {/* Points usage (read-only) — how many of the user's points Bonza's pick uses out of their balance */}
        <div className="rounded-2xl bg-cream p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] text-ink-300 tabular-nums">
              {hasPoints
                ? `Using ${r.pointsUsed.toLocaleString()} of ${Math.round(effectiveAvailable).toLocaleString()} ${programmeLabel} pts`
                : "No points available for this stay"}
            </p>
            {centsPerPoint > 0 && (
              <p className="text-[11px] font-semibold text-ink-600 tabular-nums">{centsPerPoint.toFixed(1)}¢/pt</p>
            )}
          </div>
          <div className="h-2 bg-ink-900/[0.08] rounded-full overflow-hidden">
            <div className="h-2 bg-bonza rounded-full transition-[width] duration-150" style={{ width: `${usedPct}%` }} />
          </div>

          {/* You pay — recalculates live */}
          <div className="flex items-baseline justify-between mt-3 pt-3 border-t border-ink-900/[0.06]">
            <span className="text-[12px] text-ink-600">You pay</span>
            <span className="text-[20px] font-semibold text-ink-900 tabular-nums">
              {r.pointsUsed > 0 && <span className="text-[14px] font-semibold text-bonza">{r.pointsUsed.toLocaleString()} pts</span>}
              {r.pointsUsed > 0 && r.cashRemaining > 0 && <span className="text-ink-300 text-[14px] mx-1">+</span>}
              {(r.pointsUsed === 0 || r.cashRemaining > 0) && formatGbp(r.cashRemaining)}
            </span>
          </div>
          {r.creditsEarned > 0 && (
            <p className="text-[11px] text-bonza font-semibold text-right mt-0.5">+ earn £{r.creditsEarned} in Bonza Credits</p>
          )}
        </div>

        {/* Bonza's dynamic advice */}
        <div className="flex items-start gap-2 mt-3 bg-[#FBEEE7] rounded-xl p-3">
          <span className="text-bonza flex-shrink-0 mt-px"><SparklesIcon /></span>
          <p className="text-[12px] font-semibold text-ink-900 leading-snug">{advice}</p>
        </div>
      </div>
    </div>
  );
}

// Used/left bar for a single programme. `left` omitted → only the used figure shows (estimated preview).
function PointsBar({ pct, used, left }) {
  return (
    <div className="mt-3">
      <div className="h-2 bg-ink-900/[0.08] rounded-full overflow-hidden">
        <div className="h-2 bg-bonza rounded-full transition-[width] duration-150" style={{ width: `${pct}%` }} />
      </div>
      <div className="flex justify-between text-[10px] text-ink-300 mt-1.5 tabular-nums">
        <span>{used.toLocaleString()} used</span>
        {left != null && <span>{left.toLocaleString()} left</span>}
      </div>
    </div>
  );
}

function OptionTile({ label, best, primary, secondary, disabled, live }) {
  return (
    <div
      className={`relative rounded-xl p-3 border tabular-nums transition-colors ${
        best ? "border-bonza bg-[#FBEEE7]" : "border-ink-900/[0.08] bg-white"
      } ${disabled ? "opacity-50" : ""}`}
    >
      {best && (
        <span className="absolute -top-2 left-3 inline-flex items-center gap-0.5 bg-bonza text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
          <StarIcon width="8" height="8" /> BONZA&apos;S PICK
        </span>
      )}
      <p className="text-[10px] font-bold text-ink-300 tracking-wider mb-1">{label.toUpperCase()}</p>
      <p className={`text-[15px] font-semibold leading-tight ${live ? "text-bonza" : "text-ink-900"}`}>{primary}</p>
      <p className="text-[10px] text-ink-300 mt-0.5">{secondary}</p>
    </div>
  );
}
