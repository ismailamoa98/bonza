// components/explore/CityDrawer.jsx — Phase 18 §18i. A slide-over (bottom sheet < 768px) opened by a city-row
// click. Carries a capped photo gallery, a trip summary with a server-computed total, the named hotels
// bookable on points, and a six-month award-availability strip. Search happens from the footer. Inline SVG
// icons; prices/totals come pre-computed from the endpoint (the frontend does no maths).
import { useState, useEffect, useRef } from "react";
import ProgrammeLogo from "../common/ProgrammeLogo";
import { getExploreCity, apiErrorMessage } from "../../utils/api";
import { buildSearchUrl, openSearch } from "../../utils/searchUrl";

const ORIGIN_AIRPORT = { LON: "LHR", MAN: "MAN", EDI: "EDI", DUB: "DUB" };

// Resolve the dates the "Search flights & hotels" button should carry from the page's trip context. Specific
// dates pass straight through; a flexible search picks the month with the least redeemable points (the mock's
// cash doesn't vary by month) — falling back to a mid-month window — and builds a `nights`-long window in it.
const isoDate = (d) => d.toISOString().slice(0, 10);
function datesInMonth(month, nights) {
  const n = Math.max(1, nights || 5);
  const earliest = new Date();
  earliest.setDate(earliest.getDate() + 7);
  let depart;
  if (month) {
    const [y, m] = month.split("-").map(Number);
    depart = new Date(y, m - 1, 15);
    if (depart < earliest) depart = earliest;
  } else {
    depart = new Date();
    depart.setDate(depart.getDate() + 30);
  }
  const ret = new Date(depart);
  ret.setDate(ret.getDate() + n);
  return { departureDate: isoDate(depart), returnDate: isoDate(ret) };
}
function resolveTripDates(trip, data) {
  const nights = trip?.nights || data?.nights || 5;
  if (trip?.mode === "specific" && trip.depart && trip.ret) {
    return { departureDate: trip.depart, returnDate: trip.ret };
  }
  let month = trip?.month || null;
  if (!month) {
    const open = (data?.availability || []).filter((a) => a.seatsFound > 0);
    const best = [...open].sort((a, b) => (a.cheapestPoints ?? Infinity) - (b.cheapestPoints ?? Infinity) || b.seatsFound - a.seatsFound)[0];
    month = best?.month || null;
  }
  return datesInMonth(month, nights);
}

function Icon({ d, size = 16, sw = 2 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {d.map((p, i) => (
        <path key={i} d={p} />
      ))}
    </svg>
  );
}
const X = ["M18 6 6 18", "M6 6l12 12"];
const CHEV_L = ["M15 18l-6-6 6-6"];
const CHEV_R = ["M9 6l6 6-6 6"];
const ARROW = ["M5 12h14", "M13 6l6 6-6 6"];
const PLANE = ["M17.8 19.2 16 11l3.5-3.5a2.1 2.1 0 0 0-3-3L13 8 4.8 6.2a1 1 0 0 0-.9.3l-.6.6a1 1 0 0 0 .1 1.5L9 12l-2 3H4l-1.5 1.5L6 19l2.5 3.5L10 21v-3l3-2 1.5 4.7a1 1 0 0 0 1.6.4l.6-.6a1 1 0 0 0 .3-.9Z"];
const BED = ["M2 4v16", "M2 8h18a2 2 0 0 1 2 2v10", "M2 17h20", "M6 8V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"];
const CHECK = ["M20 6 9 17l-5-5"];
const CAMERA = ["M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3Z", "M12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"];

function Gallery({ images = [], onClose, closeRef }) {
  const [i, setI] = useState(0);
  const go = (d) => setI((x) => (x + d + images.length) % images.length);
  // Swipe support for touch (arrows are shown always, but swiping feels natural on the bigger panel).
  const touchX = useRef(null);
  const onTouchStart = (e) => (touchX.current = e.touches[0].clientX);
  const onTouchEnd = (e) => {
    if (touchX.current == null) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
    touchX.current = null;
  };
  return (
    <div
      className="group relative h-[300px] flex-shrink-0 bg-[#D9DEE0] md:h-[380px] lg:h-[420px]"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {images.map((src, idx) => (
        <img
          key={src}
          src={src}
          alt=""
          onError={(e) => (e.currentTarget.style.display = "none")}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${idx === i ? "opacity-100" : "opacity-0"}`}
        />
      ))}
      <div className="absolute inset-0 bg-gradient-to-b from-[rgba(12,16,18,0.34)] via-transparent to-transparent" />
      <button
        ref={closeRef}
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute right-[0.9rem] top-[0.85rem] z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.94] text-[#141210] shadow-[0_2px_8px_rgba(12,16,18,0.18)]"
      >
        <Icon d={X} sw={2.4} />
      </button>
      {images.length > 1 && (
        <>
          {[-1, 1].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => go(d)}
              aria-label={d < 0 ? "Previous photo" : "Next photo"}
              className={`absolute top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-[#141210] shadow-[0_2px_8px_rgba(12,16,18,0.2)] transition hover:bg-white ${
                d < 0 ? "left-[0.7rem]" : "right-[0.7rem]"
              }`}
            >
              <Icon d={d < 0 ? CHEV_L : CHEV_R} size={17} sw={2.2} />
            </button>
          ))}
          <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 gap-[6px]">
            {images.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setI(idx)}
                aria-label={`Photo ${idx + 1}`}
                className={`h-[6px] rounded-full transition-all ${idx === i ? "w-5 bg-white" : "w-[6px] bg-white/55"}`}
              />
            ))}
          </div>
          <div className="pointer-events-none absolute bottom-3 right-4 z-10 rounded-full bg-black/45 px-2 py-[2px] text-[11px] font-semibold text-white tabular-nums">
            {i + 1} / {images.length}
          </div>
        </>
      )}
    </div>
  );
}

// Honest "sample data" marker — shown until the refresh job is fed by live award keys (server `sample` flag).
function SampleTag() {
  return (
    <span className="rounded-full bg-[#F4F2ED] px-1.5 py-[2px] text-[9px] font-bold tracking-[0.5px] text-[#A69C92]">
      SAMPLE
    </span>
  );
}

function SectionHead({ title, sample }) {
  return (
    <div className="mb-[0.8rem] flex items-center gap-2">
      <p className="text-[10px] font-extrabold tracking-[1.15px] text-[#A69C92]">{title}</p>
      {sample && <SampleTag />}
    </div>
  );
}

function PriceLine({ icon, label, sub, cash, points }) {
  return (
    <div className="flex items-start gap-3 py-[0.7rem]">
      <span className="mt-0.5 flex h-[26px] w-[26px] flex-shrink-0 items-center justify-center rounded-lg bg-[#F4F2ED] text-[#6B4FA5]">
        <Icon d={icon} size={14} />
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-[#141210]">{label}</p>
        <p className="text-[11px] text-[#A69C92]">{sub}</p>
      </div>
      <div className="flex-shrink-0 text-right tabular-nums">
        <p className="text-[14px] font-bold text-[#141210]">£{Number(cash).toLocaleString()}</p>
        {points && <p className="text-[11.5px] font-semibold text-[#B5603F]">or {points}</p>}
      </div>
    </div>
  );
}

function DrawerBody({ data, onOpenHotel }) {
  return (
    <div className="flex-1 overflow-y-auto tabular-nums">
      {/* Title */}
      <div className="px-[1.4rem] lg:px-8 pt-[1.1rem] pb-[0.9rem]">
        <div className="flex items-center gap-2.5">
          <h2 className="text-[22px] font-bold tracking-[-0.4px] text-[#141210]">{data.city.name}</h2>
          {data.city.tagline && <span className="rounded-full bg-bonza-100 px-2.5 py-1 text-[11px] font-bold text-bonza">{data.city.tagline}</span>}
        </div>
        <p className="mt-0.5 text-[13px] text-[#8A8078]">
          {data.city.countryName} · {data.nights} nights, {data.adults} adults
        </p>
        {data.city.airports?.length > 0 && (
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className="text-[10.5px] font-bold uppercase tracking-[0.6px] text-[#B8AEA2]">
              {data.city.airports.length > 1 ? "Airports" : "Airport"}
            </span>
            {data.city.airports.map((a) => (
              <span
                key={a.code}
                title={a.name || undefined}
                className="inline-flex items-baseline gap-1 rounded-md bg-[#F4F2ED] px-2 py-[3px] text-[11px] text-[#6B635B]"
              >
                <span className="font-bold tracking-[0.3px] text-[#141210]">{a.code}</span>
                {a.name && <span className="text-[#A69C92]">{a.name}</span>}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Trip summary */}
      {data.totals && (
        <div className="border-t border-[#F2EFEA] px-[1.4rem] lg:px-8 py-[0.6rem]">
          <div className="mb-2 flex items-center gap-2">
            <p className="text-[10px] font-extrabold tracking-[1.15px] text-[#A69C92]">TYPICAL TRIP</p>
            {data.sample && <SampleTag />}
          </div>
          <div className="grid gap-2.5 md:grid-cols-2">
            {data.flight && (
              <div className="rounded-[13px] border border-[#EFEBE4] px-3">
                <PriceLine
                  icon={PLANE}
                  label="Return flight"
                  sub={[data.flight.carrier, data.flight.isDirect ? "direct" : "1 stop", data.flight.durationLabel].filter(Boolean).join(" · ")}
                  cash={data.flight.cash}
                  points={data.flight.pointsLabel}
                />
              </div>
            )}
            {data.hotel && (
              <div className="rounded-[13px] border border-[#EFEBE4] px-3">
                <PriceLine
                  icon={BED}
                  label="Hotel, whole stay"
                  sub={data.hotel.propertyCount ? `from ${data.hotel.propertyCount} properties on points` : "cash rate — no points option"}
                  cash={data.hotel.cash}
                  points={data.hotel.pointsLabel}
                />
              </div>
            )}
          </div>
          <div className="mt-2.5 flex items-center justify-between border-t border-[#F2EFEA] pt-2.5">
            <span className="text-[13px] font-bold text-[#141210]">All cash</span>
            <div className="text-right tabular-nums">
              <p className="text-[16px] font-bold text-[#141210]">£{data.totals.allCash.toLocaleString()}</p>
              {data.totals.hybridLabel && <p className="text-[11.5px] font-semibold text-[#B5603F]">or {data.totals.hybridLabel}</p>}
            </div>
          </div>
        </div>
      )}

      {/* Hotels on points */}
      {data.hotels.length > 0 && (
        <div className="border-t border-[#F2EFEA] px-[1.4rem] lg:px-8 py-[1.1rem]">
          <SectionHead title="HOTELS ON POINTS" sample={data.sample} />
          {data.hotels.map((h) => {
            const hasPhotos = h.images?.length > 0;
            return (
              <button
                key={h.programme}
                type="button"
                onClick={() => hasPhotos && onOpenHotel(h)}
                disabled={!hasPhotos}
                className="group flex w-full items-center gap-3 border-b border-[#F6F3EE] py-[0.65rem] text-left last:border-0 enabled:cursor-pointer"
              >
                {hasPhotos ? (
                  <span className="relative h-[46px] w-[62px] flex-shrink-0 overflow-hidden rounded-[10px] bg-[#E9E5DF]">
                    <img
                      src={h.images[0]}
                      alt=""
                      loading="lazy"
                      onError={(e) => (e.currentTarget.style.display = "none")}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.06]"
                    />
                    <span className="absolute bottom-[3px] right-[3px] rounded-[6px] bg-white/90 p-[2px] shadow-[0_1px_3px_rgba(0,0,0,0.2)]">
                      <ProgrammeLogo programme={h} size={16} radius={4} />
                    </span>
                    {h.images.length > 1 && (
                      <span className="absolute left-[4px] top-[4px] inline-flex items-center gap-[3px] rounded-[5px] bg-black/55 px-[5px] py-[1px] text-[9.5px] font-bold text-white">
                        <Icon d={CAMERA} size={9} sw={2.2} />
                        {h.images.length}
                      </span>
                    )}
                  </span>
                ) : (
                  <ProgrammeLogo programme={h} size={34} radius={10} />
                )}
                <div className="min-w-0 flex-1">
                  <p className="mb-px truncate text-[13px] font-bold tracking-[-0.15px] text-[#141210]">{h.propertyName}</p>
                  <p className="text-[11px] text-[#A69C92]">
                    {h.programmeName}
                    {h.starRating ? ` · ${h.starRating}-star` : ""}
                    {hasPhotos && <span className="ml-1 font-semibold text-bonza opacity-0 transition-opacity group-hover:opacity-100">· View photos</span>}
                  </p>
                </div>
                <p className="flex-shrink-0 text-right text-[13px] font-bold text-[#141210]">
                  {h.pointsTotal.toLocaleString()}
                  <span className="mt-px block text-[10px] font-medium text-[#A69C92]">{data.nights} nights</span>
                </p>
              </button>
            );
          })}
        </div>
      )}

      {/* Availability strip */}
      {data.availability.length > 0 && (
        <div className="border-t border-[#F2EFEA] px-[1.4rem] lg:px-8 py-[1.1rem]">
          <SectionHead title="AWARD SEATS · NEXT 6 MONTHS" sample={data.sample} />
          <div className="flex gap-1">
            {data.availability.map((m) => (
              <div
                key={m.month}
                className={`flex-1 rounded-[9px] pt-2 pb-[0.45rem] text-center ${m.state === "best" ? "bg-[#141210]" : m.state === "open" ? "bg-[#E9F5ED]" : "bg-[#FAF8F5]"}`}
              >
                <p className={`mb-[3px] text-[10.5px] font-bold ${m.state === "best" ? "text-white" : m.state === "open" ? "text-[#1B7040]" : "text-[#8A8078]"}`}>{m.label}</p>
                <span className={`mx-auto block h-[5px] w-[5px] rounded-full ${m.state === "best" ? "bg-[#9FE9BB]" : m.state === "open" ? "bg-[#34B368]" : "bg-[#DDD6CC]"}`} />
              </div>
            ))}
          </div>
          {data.bestMonth && (
            <p className="mt-[0.7rem] flex items-center gap-1.5 text-[11.5px] text-[#8A8078]">
              <span className="text-[#34B368]">
                <Icon d={CHECK} size={13} sw={2.6} />
              </span>
              {data.sample
                ? `Typically best around ${data.bestMonth.label} — search for live seats`
                : `Best availability in ${data.bestMonth.label} — ${data.bestMonth.seatsFound} seats${
                    data.bestMonth.pointsLabel ? ` at ${data.bestMonth.pointsLabel}` : ""
                  }`}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// A click-through lightbox of one hotel's photos, layered above the drawer. Arrows / arrow-keys / dots / Esc.
function HotelGallery({ hotel, nights, onClose }) {
  const imgs = hotel.images || [];
  const [i, setI] = useState(0);
  const go = (d) => setI((x) => (x + d + imgs.length) % imgs.length);
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imgs.length]);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={`${hotel.propertyName} photos`}>
      <button type="button" aria-label="Close photos" onClick={onClose} className="absolute inset-0 bg-black/72 backdrop-blur-[2px]" />
      <div className="relative z-10 w-full max-w-[580px]">
        <div className="group relative aspect-[3/2] overflow-hidden rounded-[18px] bg-[#1b1b1b] shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
          {imgs.map((src, idx) => (
            <img
              key={src}
              src={src}
              alt=""
              onError={(e) => (e.currentTarget.style.display = "none")}
              className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${idx === i ? "opacity-100" : "opacity-0"}`}
            />
          ))}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/70 to-transparent" />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-[#141210] shadow-[0_2px_8px_rgba(0,0,0,0.25)]"
          >
            <Icon d={X} sw={2.4} />
          </button>
          {imgs.length > 1 && (
            <>
              {[-1, 1].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => go(d)}
                  aria-label={d < 0 ? "Previous photo" : "Next photo"}
                  className={`absolute top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-[#141210] shadow-[0_2px_8px_rgba(0,0,0,0.25)] transition hover:bg-white ${
                    d < 0 ? "left-3" : "right-3"
                  }`}
                >
                  <Icon d={d < 0 ? CHEV_L : CHEV_R} size={18} sw={2.2} />
                </button>
              ))}
              <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 gap-[5px]">
                {imgs.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setI(idx)}
                    aria-label={`Photo ${idx + 1}`}
                    className={`h-[6px] rounded-full transition-all ${idx === i ? "w-5 bg-white" : "w-[6px] bg-white/50"}`}
                  />
                ))}
              </div>
            </>
          )}
          <div className="pointer-events-none absolute bottom-3 right-4 z-10 rounded-full bg-black/45 px-2 py-[2px] text-[11px] font-semibold text-white tabular-nums">
            {i + 1} / {imgs.length}
          </div>
        </div>
        <div className="mt-3 flex items-center gap-3 rounded-[14px] bg-white px-4 py-3">
          <ProgrammeLogo programme={hotel} size={34} radius={10} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-bold text-[#141210]">{hotel.propertyName}</p>
            <p className="text-[12px] text-[#A69C92]">
              {hotel.programmeName}
              {hotel.starRating ? ` · ${hotel.starRating}-star` : ""}
            </p>
          </div>
          <p className="flex-shrink-0 text-right text-[14px] font-bold text-[#141210] tabular-nums">
            {hotel.pointsTotal.toLocaleString()}
            <span className="mt-px block text-[10px] font-medium text-[#A69C92]">{nights} nights</span>
          </p>
        </div>
      </div>
    </div>
  );
}

function Skeleton() {
  return (
    <>
      <div className="h-[300px] flex-shrink-0 bg-[#E4E7E8] md:h-[380px] lg:h-[420px]" />
      <div className="flex-1 space-y-3 p-6" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-16 rounded-xl bg-[#F1EEE9]" />
        ))}
      </div>
    </>
  );
}

export default function CityDrawer({ cityId, origin, trip, onClose }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [galleryHotel, setGalleryHotel] = useState(null);
  const closeRef = useRef(null);

  useEffect(() => {
    if (!cityId) return;
    setData(null);
    setError(null);
    setGalleryHotel(null);
    getExploreCity(cityId, origin)
      .then(setData)
      .catch((err) => setError(apiErrorMessage(err)));
  }, [cityId, origin]);

  useEffect(() => {
    if (!cityId) return undefined;
    // Esc closes the hotel lightbox first (if open), else the drawer.
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      if (galleryHotel) setGalleryHotel(null);
      else onClose();
    };
    window.addEventListener("keydown", onKey);
    closeRef.current?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [cityId, onClose, galleryHotel]);

  if (!cityId) return null;

  const search = () => {
    const { departureDate, returnDate } = resolveTripDates(trip, data);
    openSearch(
      buildSearchUrl({
        origin: ORIGIN_AIRPORT[origin] || "LHR",
        destination: data?.city?.iataCode,
        departureDate,
        returnDate,
        travelers: trip?.adults || data?.adults || 2,
        style: "points_max",
      })
    );
  };

  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label={data?.city?.name ?? "City details"}>
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 bg-[rgba(18,22,20,0.34)] backdrop-blur-[2px]" />
      <aside className="absolute inset-x-0 bottom-0 flex h-[92vh] flex-col overflow-hidden rounded-t-[20px] bg-white shadow-[0_-18px_48px_rgba(12,16,18,0.18)] motion-safe:animate-[slideup_.28s_cubic-bezier(.2,.7,.2,1)] md:inset-y-0 md:left-auto md:right-0 md:h-auto md:w-[600px] md:rounded-none md:shadow-[-18px_0_48px_rgba(12,16,18,0.16)] md:motion-safe:animate-[slidein_.28s_cubic-bezier(.2,.7,.2,1)] lg:w-[52vw] lg:max-w-[1000px] lg:min-w-[720px]">
        {/* mobile drag handle */}
        <div className="mx-auto mt-2 h-1 w-10 flex-shrink-0 rounded-full bg-[#DDD6CC] md:hidden" />
        {error ? (
          <div className="p-8 text-center text-[14px] text-ink-soft">Couldn’t load this city.</div>
        ) : !data ? (
          <Skeleton />
        ) : (
          <>
            <Gallery images={data.city.images} onClose={onClose} closeRef={closeRef} />
            <DrawerBody data={data} onOpenHotel={setGalleryHotel} />
            <div className="flex-shrink-0 border-t border-[#EFEBE4] bg-white px-[1.4rem] lg:px-8 py-4">
              <button
                type="button"
                onClick={search}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#141210] py-[13px] text-[14.5px] font-semibold text-white hover:bg-[#332B25]"
              >
                Search flights &amp; hotels
                <Icon d={ARROW} size={16} sw={2.2} />
              </button>
              <p className="mt-[0.6rem] text-center text-[11px] text-[#A69C92]">
                {data.sample
                  ? "Sample figures for guidance — search for live prices and award availability."
                  : "Prices are indicative, refreshed weekly. Search for live availability."}
              </p>
            </div>
          </>
        )}
      </aside>
      {galleryHotel && <HotelGallery hotel={galleryHotel} nights={data?.nights ?? 5} onClose={() => setGalleryHotel(null)} />}
    </div>
  );
}
