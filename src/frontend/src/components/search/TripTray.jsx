// components/search/TripTray.jsx — persistent bottom bar showing the legs chosen for the trip, with an
// "Optimise trip" CTA that opens the OptimizePanel. Hidden until at least one leg is selected.
import { useAppStore } from "../../store/appStore";
import { nightsFromMeta } from "./filterResults";
import { tripLegInfo } from "./tripLeg";
import { XIcon, SparklesIcon } from "./icons";

const TYPES = ["flight", "hotel", "car"];

export default function TripTray() {
  const tripSelection = useAppStore((s) => s.tripSelection);
  const searchMeta = useAppStore((s) => s.searchMeta);
  const removeFromTrip = useAppStore((s) => s.removeFromTrip);
  const clearTrip = useAppStore((s) => s.clearTrip);
  const setOptimizeOpen = useAppStore((s) => s.setOptimizeOpen);

  const nights = nightsFromMeta(searchMeta);
  const legs = TYPES.map((t) => ({ type: t, info: tripLegInfo(t, tripSelection[t], nights) })).filter((l) => l.info);
  if (!legs.length) return null;

  const canOptimise = tripSelection.hotel && tripSelection.flight;
  const total = legs.reduce((s, l) => s + l.info.cashGbp, 0);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 px-4 pb-4 pointer-events-none">
      <div className="pointer-events-auto mx-auto max-w-5xl bg-white rounded-2xl shadow-[0_8px_40px_rgba(120,80,50,0.22)] border border-ink-900/[0.06] p-3 flex items-center gap-3">
        <span className="text-[10px] font-bold tracking-wider text-ink-300 pl-1 hidden sm:block">YOUR TRIP</span>

        <div className="flex-1 flex items-center gap-2 overflow-x-auto">
          {legs.map(({ type, info }) => (
            <div key={type} className="flex items-center gap-2 bg-cream rounded-xl pl-2.5 pr-1.5 py-1.5 flex-shrink-0">
              <span className="text-[10px] font-bold uppercase text-bonza">{type}</span>
              <div className="min-w-0">
                <p className="text-[12px] font-semibold text-ink-900 truncate max-w-[140px]">{info.label}</p>
                <p className="text-[10px] text-ink-300 tabular-nums">£{info.cashGbp.toLocaleString()}</p>
              </div>
              <button
                onClick={() => removeFromTrip(type)}
                aria-label={`Remove ${type}`}
                className="w-5 h-5 rounded-full text-ink-300 hover:text-ink-900 flex items-center justify-center flex-shrink-0"
              >
                <XIcon width="12" height="12" />
              </button>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="text-right hidden sm:block">
            <p className="text-[10px] text-ink-300">Cash total</p>
            <p className="text-[14px] font-bold text-ink-900 tabular-nums">£{total.toLocaleString()}</p>
          </div>
          <button
            onClick={clearTrip}
            className="text-[11px] font-semibold text-ink-300 hover:text-ink-600 px-2"
          >
            Clear
          </button>
          <button
            onClick={() => setOptimizeOpen(true)}
            disabled={!canOptimise}
            title={canOptimise ? "" : "Add a flight and a hotel to optimise"}
            className="flex items-center gap-1.5 bg-bonza text-white rounded-full text-[13px] font-semibold px-4 py-2.5 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-bonza-dark"
          >
            <SparklesIcon width="15" height="15" />
            Optimise trip
          </button>
        </div>
      </div>
    </div>
  );
}
