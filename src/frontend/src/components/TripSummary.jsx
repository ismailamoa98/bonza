// components/TripSummary.jsx — Read-only trip recap for the optimize sidebar.
// Shows From → To, the date range, and traveler count from the store, with an
// "Edit" link back to step 1. Purely presentational; editing happens on the
// homepage form (or the in-place SearchBar above the grids).
import { useAppStore, tripNights } from "../store/appStore";
import { shortDate } from "../utils/format";

// "LHR — London" -> "LHR"; falls back to the raw code/label.
const codeOf = (label, code) => (label ? String(label).split(" — ")[0] : code || "");

export default function TripSummary() {
  const trip = useAppStore((s) => s.trip);
  if (!trip) return null;

  const from = codeOf(trip.originLabel, trip.origin);
  const to = codeOf(trip.destinationLabel, trip.destination);
  const nights = tripNights(trip);
  const travelers = Number(trip.numberOfTravelers) || 1;

  return (
    <div className="rounded-2xl border border-[rgba(40,30,20,0.06)] bg-white p-5 font-jakarta shadow-[0_1px_2px_rgba(40,30,20,0.04),0_16px_40px_rgba(120,80,50,0.07)]">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink-muted">Your trip</p>
        <a href="#refine" className="text-[12px] font-semibold text-bonza hover:text-bonza-dark">
          Edit
        </a>
      </div>

      {/* From -> To */}
      <div className="mt-3 flex items-center gap-2 tabular-nums">
        <span className="text-[18px] font-extrabold tracking-[-0.01em] text-ink">{from || "—"}</span>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-bonza" aria-hidden="true">
          <line x1="5" y1="12" x2="19" y2="12" />
          <polyline points="12 5 19 12 12 19" />
        </svg>
        <span className="text-[18px] font-extrabold tracking-[-0.01em] text-ink">{to || "—"}</span>
      </div>

      {/* Dates + travelers */}
      <dl className="mt-3 space-y-2 text-[13px]">
        <div className="flex items-center gap-2 text-ink-soft">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-ink-muted" aria-hidden="true">
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <span className="tabular-nums">
            {trip.checkIn ? (
              <>
                {shortDate(trip.checkIn)} – {shortDate(trip.checkOut)}
                <span className="text-ink-muted"> · {nights} night{nights === 1 ? "" : "s"}</span>
              </>
            ) : (
              "Flexible dates"
            )}
          </span>
        </div>
        <div className="flex items-center gap-2 text-ink-soft">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-ink-muted" aria-hidden="true">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          <span className="tabular-nums">
            {travelers} traveler{travelers === 1 ? "" : "s"}
          </span>
        </div>
      </dl>
    </div>
  );
}
