// components/search/SearchResultCard.jsx — search result card. The hotel card mirrors the agreed
// offer-card design from components/PackageCard.jsx (text block on top, photo with overlays below):
// deal name, rating badge, dates + nights, ¢/pt value, a smart recommendation, points cost, price +
// Bonza credits. Adapted to real search data — no invented was/save discounts. Flights render as a row.
import { PROGRAMME_LABELS } from "./programmes";
import { hotelPhoto } from "./photo";
import { pointsFor } from "./points";
import AirlineLogo from "./AirlineLogo";
import { fmtTime, fmtDur, dayOffset, layovers, sliceDurationMs } from "./flightFormat";
import TripToggle from "./TripToggle";

export default function SearchResultCard({ result, isSelected, onClick, activeTab, nights = 1, dateLabel = "" }) {
  if (activeTab === "flights") return <FlightCard result={result} isSelected={isSelected} onClick={onClick} />;
  return <HotelCard result={result} isSelected={isSelected} onClick={onClick} nights={nights} dateLabel={dateLabel} />;
}

function ratingWord(r) {
  const n = parseFloat(r);
  return n >= 9.3 ? "Exceptional" : n >= 9.0 ? "Excellent" : n >= 8.6 ? "Great" : n >= 8.0 ? "Very good" : "Good";
}

// Honest, points-vs-cash advice (never invents availability).
function recommendation(pts, creditsPerNight) {
  if (pts?.aboveBenchmark) return `Use points — ${pts.centsPerPoint?.toFixed(1)}¢/pt beats paying cash here`;
  if (pts) return "Pay cash — points are weak value on these dates";
  return `Solid cash rate — earn £${creditsPerNight?.toFixed(2)} in Bonza Credits per night`;
}

function HotelCard({ result, isSelected, onClick, nights, dateLabel }) {
  const cash = result.cashOption;
  const pts = pointsFor(result);
  const city = result.location?.city || result.location || "";
  const rating = result.rating != null ? Number(result.rating).toFixed(1) : null;
  const ptsTotal = pts ? pts.pointsCost * nights : 0;
  const rec = recommendation(pts, cash?.creditsEarned);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onClick()}
      className={`group flex h-full w-full cursor-pointer flex-col overflow-hidden rounded-2xl bg-white transition-shadow ${
        isSelected
          ? "shadow-[0_0_0_2px_rgba(218,119,86,0.55)]"
          : "shadow-[0_10px_35px_rgba(120,80,50,0.10)] hover:shadow-[0_18px_48px_rgba(120,80,50,0.18)]"
      }`}
    >
      {/* Text block */}
      <div className="flex flex-1 flex-col p-4">
        {pts?.aboveBenchmark && (
          <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.1em] text-bonza">★ Best points value</p>
        )}
        <h3 className="text-[15px] font-extrabold leading-tight tracking-[-0.01em] text-ink line-clamp-2">
          {result.name}
        </h3>
        <p className="mt-1 text-[12px] text-ink-soft">
          {result.starRating || 4}-star hotel · {city}
        </p>

        <p className="mt-1.5 flex items-center gap-1.5 text-[12px] font-medium tabular-nums text-ink-soft">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-ink-muted" aria-hidden="true">
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          {dateLabel}
          {nights ? ` (${nights} night${nights > 1 ? "s" : ""})` : ""}
        </p>

        <p className="mt-1.5 min-h-[1.2em] text-[12px] tabular-nums text-ink-soft">
          {pts?.centsPerPoint != null ? (
            <>
              <b className="text-[13px] font-bold text-ink">{pts.centsPerPoint.toFixed(1)}¢/pt</b> value
            </>
          ) : (
            " "
          )}
        </p>

        <p className="mt-2 flex min-h-[2.7em] items-start gap-1.5 text-[12px] font-semibold leading-snug text-bonza">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" className="mt-0.5 shrink-0" aria-hidden="true">
            <path d="M12 2l2.2 5.8L20 10l-5.8 2.2L12 18l-2.2-5.8L4 10l5.8-2.2L12 2zM19 15l1.1 2.9L23 19l-2.9 1.1L19 23l-1.1-2.9L15 19l2.9-1.1L19 15z" />
          </svg>
          <span className="line-clamp-2">{rec}</span>
        </p>

        <div className="mt-auto pt-3 flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 text-[13px] font-bold text-bonza">
            View details
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover:translate-x-0.5" aria-hidden="true">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </span>
          <TripToggle type="hotel" item={result} />
        </div>
      </div>

      {/* Photo with overlays */}
      <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden bg-gradient-to-br from-[#6FB7D4] to-[#3D7EA6]">
        <img src={hotelPhoto(result)} alt={result.name} loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-black/25" />

        <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.04em] text-[#1E7E40]">
          ATOL
        </span>
        {rating != null && (
          <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-[#1f7a3f]/90 px-2.5 py-1 text-[11px] font-bold text-white shadow-sm tabular-nums">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 2.5l2.9 5.88 6.49.94-4.69 4.57 1.1 6.46L12 17.3l-5.8 3.05 1.1-6.46-4.69-4.57 6.49-.94L12 2.5z" />
            </svg>
            {rating} {ratingWord(rating)}
          </span>
        )}

        {pts && (
          <div className="absolute bottom-3 left-3 rounded-xl bg-black/55 px-2.5 py-1.5 tabular-nums text-white backdrop-blur-sm">
            <p className="text-[16px] font-extrabold leading-none">{ptsTotal.toLocaleString()}</p>
            <p className="mt-1 text-[11px] font-bold leading-none text-white/80">
              {PROGRAMME_LABELS[pts.programme] || pts.programme} pts
            </p>
          </div>
        )}

        <div className="absolute bottom-3 right-3 text-right tabular-nums [text-shadow:0_1px_6px_rgba(0,0,0,0.5)]">
          <p className="text-[17px] font-extrabold leading-none text-white">£{cash?.priceGbp?.toFixed(0)}</p>
          <p className="mt-1 text-[10px] font-bold leading-none text-white/80">per night</p>
          {cash?.creditsEarned != null && (
            <p className="mt-1 text-[10px] font-bold text-bonza-light">+ earn £{Number(cash.creditsEarned).toFixed(2)}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function FlightCard({ result, isSelected, onClick }) {
  const out = result.slices?.[0];
  const ret = result.slices?.[1];
  const airlineName = result.airline || out?.segments?.[0]?.carrier || "Flight";
  const airlineCode = result.airlineCode || out?.segments?.[0]?.carrierCode;

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onClick()}
      className={`flex-shrink-0 bg-white rounded-2xl p-3.5 cursor-pointer transition-all ${
        isSelected ? "border-[1.5px] border-bonza" : "border border-ink-900/[0.05] hover:border-ink-900/[0.12]"
      }`}
    >
      <div className="flex items-center gap-3 mb-2.5">
        <AirlineLogo code={airlineCode} name={airlineName} size={34} />
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-ink-900 truncate">{airlineName}</p>
          {result.cabin && <p className="text-[11px] text-ink-300">{result.cabin}</p>}
        </div>
        <div className="ml-auto text-right tabular-nums">
          <p className="text-[16px] font-bold text-ink-900">£{(result.totalAmount || 0).toFixed(0)}</p>
          {result.creditsIfCash > 0 && (
            <p className="text-[10px] text-bonza font-semibold">+ £{result.creditsIfCash} credits</p>
          )}
        </div>
      </div>

      {out && <SliceSummary slice={out} />}
      {ret && (
        <div className="mt-2.5 pt-2.5 border-t border-ink-900/[0.05]">
          <SliceSummary slice={ret} />
        </div>
      )}

      <div className="mt-2.5 pt-2.5 border-t border-ink-900/[0.05] flex justify-end">
        <TripToggle type="flight" item={result} />
      </div>
    </div>
  );
}

// One-line origin→destination summary with times, duration and stop/connection info.
function SliceSummary({ slice }) {
  const segs = slice?.segments || [];
  const dep = segs[0]?.departure;
  const arr = segs[segs.length - 1]?.arrival;
  const stops = slice?.stops ?? segs.length - 1;
  const conns = layovers(segs).map((l) => l.airport?.code).filter(Boolean).join(", ");
  const day = dayOffset(dep, arr);

  return (
    <div className="flex items-center gap-3 tabular-nums">
      <div className="text-center w-11 flex-shrink-0">
        <p className="text-[15px] font-semibold text-ink-900">{fmtTime(dep)}</p>
        <p className="text-[11px] text-ink-300">{slice?.origin?.code}</p>
      </div>
      <div className="flex-1 flex flex-col items-center">
        <span className="text-[10px] text-ink-300">{fmtDur(sliceDurationMs(slice))}</span>
        <div className="w-full flex items-center gap-1 my-0.5">
          <span className="h-px flex-1 bg-ink-900/[0.15]" />
          <span className="w-1.5 h-1.5 rounded-full bg-ink-900/25" />
          <span className="h-px flex-1 bg-ink-900/[0.15]" />
        </div>
        <span className="text-[10px] text-ink-300">
          {stops === 0 ? "Direct" : `${stops} stop${stops > 1 ? "s" : ""}${conns ? ` · ${conns}` : ""}`}
        </span>
      </div>
      <div className="text-center w-11 flex-shrink-0">
        <p className="text-[15px] font-semibold text-ink-900">
          {fmtTime(arr)}
          {day > 0 && <sup className="text-[9px] text-bonza font-bold ml-0.5">+{day}</sup>}
        </p>
        <p className="text-[11px] text-ink-300">{slice?.destination?.code}</p>
      </div>
    </div>
  );
}
