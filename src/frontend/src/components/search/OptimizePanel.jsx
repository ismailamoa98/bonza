// components/search/OptimizePanel.jsx — right-side overlay that optimises the chosen trip across legs.
// Calls POST /optimize/trip with the tray; shows Bonza's recommended cash/points split, a scenario
// switcher, and per-leg overrides (cash ↔ points programme) that recompute live.
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "../../store/appStore";
import { optimizeTripSelection } from "../../utils/api";
import { nightsFromMeta } from "./filterResults";
import { tripPayload } from "./tripLeg";
import { PROGRAMME_LABELS } from "./programmes";
import { XIcon, SparklesIcon, StarIcon, CardIcon } from "./icons";

const SCENARIOS = [
  ["recommended", "Recommended"],
  ["points", "Points"],
  ["hybrid", "Hybrid"],
  ["all_cash", "All cash"],
];

export default function OptimizePanel() {
  const open = useAppStore((s) => s.optimizeOpen);
  const setOptimizeOpen = useAppStore((s) => s.setOptimizeOpen);
  const tripSelection = useAppStore((s) => s.tripSelection);
  const searchMeta = useAppStore((s) => s.searchMeta);
  const navigate = useNavigate();

  const [shown, setShown] = useState(false);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [scenario, setScenario] = useState("recommended");
  const [overrides, setOverrides] = useState({});

  const nights = nightsFromMeta(searchMeta);
  const legs = tripPayload(tripSelection, nights);

  const close = useCallback(() => {
    setShown(false);
    setTimeout(() => setOptimizeOpen(false), 250);
  }, [setOptimizeOpen]);

  // Slide-in + reset per open; Escape closes.
  useEffect(() => {
    if (!open) return;
    setShown(false);
    setOverrides({});
    setScenario("recommended");
    const raf = requestAnimationFrame(() => setShown(true));
    const onKey = (e) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

  // Fetch on open + whenever overrides change (debounced) → live recompute.
  useEffect(() => {
    if (!open || !legs.length) return;
    let cancelled = false;
    const t = setTimeout(() => {
      setLoading(true);
      optimizeTripSelection({ legs, overrides })
        .then((d) => !cancelled && setData(d))
        .catch(() => {})
        .finally(() => !cancelled && setLoading(false));
    }, Object.keys(overrides).length ? 250 : 0);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, JSON.stringify(overrides)]);

  if (!open) return null;

  const view = data?.scenarios?.[scenario] || null;

  const setLeg = (type, value) => {
    setScenario("recommended"); // overrides shape the recommended allocation
    setOverrides((prev) => {
      const next = { ...prev };
      if (value === "auto") delete next[type];
      else if (value === "cash") next[type] = { method: "cash" };
      else next[type] = { method: "points", programme: value };
      return next;
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40" onClick={close} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Optimise trip"
        className={`w-full max-w-[560px] bg-white h-full shadow-2xl flex flex-col transform transition-transform duration-300 ${
          shown ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="relative flex-shrink-0 px-6 pt-5 pb-4 border-b border-ink-900/[0.06]">
          <button onClick={close} aria-label="Close" className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white shadow flex items-center justify-center text-ink-600 hover:text-ink-900">
            <XIcon width="16" height="16" />
          </button>
          <div className="flex items-center gap-2">
            <span className="text-bonza"><SparklesIcon width="18" height="18" /></span>
            <h2 className="text-[20px] font-display font-semibold text-ink-900">Optimise your trip</h2>
          </div>
          <p className="text-[12px] text-ink-300 mt-0.5">Bonza balances your points and cash across every leg.</p>
        </div>

        <div className="px-6 py-5 flex-1 overflow-y-auto">
          {!data ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => <div key={i} className="h-16 bg-cream rounded-xl animate-pulse" />)}
            </div>
          ) : (
            <>
              {/* Bonza narrative */}
              <div className="bg-[#FBF3EF] border border-bonza/20 rounded-2xl p-4 mb-5">
                <p className="text-[10px] font-bold tracking-wider text-bonza mb-1">BONZA RECOMMENDS</p>
                <p className="text-[13px] text-ink-700 leading-relaxed">{data.narrative}</p>
              </div>

              {/* Scenario switcher */}
              <div className="flex gap-1 mb-4 bg-cream rounded-full p-1">
                {SCENARIOS.map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setScenario(key)}
                    className={`relative flex-1 text-[12px] font-semibold py-1.5 rounded-full transition-colors ${
                      scenario === key ? "bg-white text-ink-900 shadow-sm" : "text-ink-300 hover:text-ink-600"
                    }`}
                  >
                    {label}
                    {key === data.recommendedKey && <span className="text-bonza" title="Bonza's pick"> ★</span>}
                  </button>
                ))}
              </div>

              {/* Totals */}
              <div className="grid grid-cols-3 gap-3 mb-1.5">
                <Stat label="Cash" value={`£${(view?.totalCash || 0).toLocaleString()}`} />
                <Stat label="Net saved" value={`£${(view?.netSavingsGbp || 0).toLocaleString()}`} accent />
                <Stat label="Credits" value={`£${(view?.creditsEarned || 0).toFixed(2)}`} />
              </div>
              {view?.pointsPurchaseGbp > 0 && (
                <p className="text-[11px] text-ink-300 mb-4">Includes £{view.pointsPurchaseGbp.toLocaleString()} to buy points.</p>
              )}
              {!(view?.pointsPurchaseGbp > 0) && <div className="mb-4" />}

              {/* Per-leg rows */}
              <p className="text-[11px] font-bold text-ink-300 tracking-wider mb-2">PER LEG</p>
              <div className="space-y-2 mb-5">
                {(view?.legs || []).map((leg) => (
                  <LegRow
                    key={leg.type}
                    leg={leg}
                    options={data.legOptions?.[leg.type] || []}
                    editable={scenario === "recommended"}
                    onChange={(v) => setLeg(leg.type, v)}
                  />
                ))}
              </div>

              {/* Balances */}
              {!!data.accounts?.length && (
                <>
                  <p className="text-[11px] font-bold text-ink-300 tracking-wider mb-2">YOUR POINTS</p>
                  <div className="space-y-1.5">
                    {data.accounts.map((a) => {
                      const used = view?.pointsUsedByProgramme?.[a.programme] || 0;
                      return (
                        <div key={a.programme} className="flex items-center justify-between text-[12px]">
                          <span className="text-ink-600">{a.label}</span>
                          <span className="tabular-nums text-ink-300">
                            {used > 0 && <span className="text-bonza font-semibold">−{used.toLocaleString()} </span>}
                            {a.balance.toLocaleString()} pts
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </>
          )}
        </div>

        {/* CTA */}
        <div className="border-t border-ink-900/[0.06] px-6 py-4 bg-white flex-shrink-0">
          <button
            onClick={() => {
              const meta = searchMeta || {};
              const hotel = tripSelection.hotel;
              const qs = new URLSearchParams({
                type: "cash",
                origin: meta.origin || "",
                destination: meta.destination || "",
                checkIn: meta.departureDate || "",
                checkOut: meta.returnDate || "",
                adults: String(meta.travelers || 1),
                ...(hotel?.duffelHotelId ? { hotel: hotel.duffelHotelId } : {}),
              });
              close();
              navigate(`/booking?${qs.toString()}`);
            }}
            disabled={loading}
            className="w-full py-3 bg-bonza text-white rounded-full text-[13px] font-semibold tabular-nums disabled:opacity-50"
          >
            {loading ? "Recalculating…" : "Book this trip"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, accent }) {
  return (
    <div className="bg-cream rounded-xl px-3 py-2.5 text-center">
      <p className={`text-[16px] font-display font-semibold tabular-nums ${accent ? "text-[#1E7E40]" : "text-ink-900"}`}>{value}</p>
      <p className="text-[10px] font-semibold text-ink-300 tracking-wide mt-0.5">{label}</p>
    </div>
  );
}

function legSubline(leg) {
  const label = PROGRAMME_LABELS[leg.awardProgramme] || leg.awardLabel || leg.awardProgramme;
  if (!leg.pointsUsed && !leg.pointsBought) return `£${(leg.cashPaid || 0).toLocaleString()} cash`;
  const parts = [];
  if (leg.pointsUsed) parts.push(`${leg.pointsUsed.toLocaleString()} pts`);
  if (leg.pointsBought) parts.push(`buy ${leg.pointsBought.toLocaleString()} pts (£${leg.buyCostGbp.toLocaleString()})`);
  if (leg.cashPaid > 0) parts.push(`£${leg.cashPaid.toLocaleString()} cash`);
  return `${label} · ${parts.join(" + ")}`;
}

function LegRow({ leg, options, editable, onChange }) {
  const usesPoints = leg.pointsUsed > 0 || leg.pointsBought > 0;
  const value = usesPoints ? leg.awardProgramme : "cash";
  return (
    <div className="bg-cream rounded-xl p-3 flex items-center gap-3">
      <span className="w-7 h-7 rounded-lg bg-[#FBE8E0] text-bonza flex items-center justify-center flex-shrink-0">
        {usesPoints ? <StarIcon width="14" height="14" /> : <CardIcon width="14" height="14" />}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-semibold text-ink-900 capitalize flex items-center gap-1.5">
          {leg.type}
          {leg.buyPromo && (
            <span className="text-[9px] font-bold text-bonza bg-[#FBE8E0] rounded-full px-1.5 py-0.5">{leg.buyPromo}</span>
          )}
        </p>
        <p className="text-[11px] text-ink-300 tabular-nums truncate">{legSubline(leg)}</p>
      </div>
      {editable ? (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="text-[11px] text-ink-700 bg-white border border-ink-900/[0.1] rounded-lg px-2 py-1.5 max-w-[160px]"
        >
          <option value="cash">Pay cash</option>
          {options.map((o) => (
            <option key={o.awardProgramme} value={o.awardProgramme} disabled={!o.affordable && !o.buyable}>
              {o.awardLabel} · {o.centsPerPoint.toFixed(1)}¢{o.promo ? ` · ${o.promo}` : o.affordable ? "" : " (low bal.)"}
            </option>
          ))}
        </select>
      ) : (
        <span className="text-[11px] font-semibold text-ink-300">
          {usesPoints ? `−£${(leg.cashSaved || 0).toLocaleString()}` : ""}
        </span>
      )}
    </div>
  );
}
