// components/search/filterResults.js — pure, per-tab filtering for the search page. Shared by
// SearchResultsList (to render) and SearchPage (to show an accurate active-tab result count).
import { pointsFor } from "./points";
import { layovers, sliceDurationMs } from "./flightFormat";

// Nights between the searched check-in/out (min 1) — hotel totals scale by this.
export function nightsFromMeta(meta) {
  if (!meta?.departureDate || !meta?.returnDate) return 1;
  const n = Math.round((new Date(meta.returnDate) - new Date(meta.departureDate)) / 86400000);
  return n > 0 ? n : 1;
}

// Time-of-day bucket for a UTC hour (mirrors backend filterLogic.inTimeBuckets).
export function timeBucket(hour) {
  if (hour >= 5 && hour < 9) return "early";
  if (hour >= 9 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17) return "evening";
  return "night";
}

export const PRICE_MAX = 5000; // slider ceiling shared with the UI; "at max" means "no price cap"
export const DURATION_MAX = 48; // hours; slider ceiling = "any duration"
export const LAYOVER_MAX = 12; // hours; slider ceiling = "any layover"

const HOUR_MS = 3600000;
const flightDurationMs = (fl) => (fl.slices || []).reduce((sum, s) => sum + sliceDurationMs(s), 0);
const flightLayoverMsList = (fl) => (fl.slices || []).flatMap((s) => layovers(s.segments).map((l) => l.ms));
const flightConnCodes = (fl) =>
  new Set((fl.slices || []).flatMap((s) => layovers(s.segments).map((l) => l.airport?.code).filter(Boolean)));
const flightAircraft = (fl) =>
  new Set((fl.slices || []).flatMap((s) => (s.segments || []).map((seg) => seg.aircraft).filter(Boolean)));

// Airline IATA → alliance (public fact, not fabricated). Unlisted carriers = no alliance.
const ALLIANCE = {
  UA: "Star Alliance", LH: "Star Alliance", AC: "Star Alliance", SQ: "Star Alliance", NH: "Star Alliance",
  TK: "Star Alliance", SK: "Star Alliance", OS: "Star Alliance", LX: "Star Alliance", TG: "Star Alliance",
  BA: "Oneworld", QR: "Oneworld", AA: "Oneworld", QF: "Oneworld", CX: "Oneworld", IB: "Oneworld",
  AY: "Oneworld", JL: "Oneworld", MH: "Oneworld",
  AF: "SkyTeam", KL: "SkyTeam", DL: "SkyTeam", AZ: "SkyTeam", KE: "SkyTeam", SU: "SkyTeam", MU: "SkyTeam",
};
export const allianceOf = (code) => ALLIANCE[String(code || "").toUpperCase()] || null;

function applyHotelFilters(h, f, nights) {
  const total = (h.cashOption?.priceGbp || 0) * nights;
  if (f.maxPrice < PRICE_MAX && total > f.maxPrice) return false;
  if (f.stars?.length && !f.stars.includes(h.starRating)) return false;
  if (f.minRating > 0 && !(Number(h.rating) >= f.minRating)) return false;
  // Loyalty checks use the same effective points option the cards show (real award data when present,
  // else the deterministic demo option) so the filters match what the user sees.
  const pts = pointsFor(h);
  if (f.loyaltyOnly && !pts) return false;
  if (f.bestPoints && !pts?.aboveBenchmark) return false;
  if (f.loyaltyProgramme?.length && !f.loyaltyProgramme.includes(pts?.programme)) return false;
  if (f.propertyType?.length && !f.propertyType.includes(h.propertyType)) return false;
  if (f.amenities?.length) {
    const have = (h.amenities || []).map((a) => String(a).toLowerCase());
    const hasAll = f.amenities.every((want) =>
      have.some((a) => a.includes(String(want).toLowerCase()))
    );
    if (!hasAll) return false;
  }
  if (f.breakfastOnly && !h.breakfastIncluded) return false;
  return true;
}

// Distinct loyalty programmes across the current hotel results (via the same effective points option).
export function programmeOptions(hotels) {
  return [...new Set((hotels || []).map((h) => pointsFor(h)?.programme).filter(Boolean))];
}

function sliceHour(flight, which, sliceIdx = 0) {
  const slice = flight.slices?.[sliceIdx];
  const segs = slice?.segments || [];
  const seg = which === "arrival" ? segs[segs.length - 1] : segs[0];
  const iso = which === "arrival" ? seg?.arrival : seg?.departure;
  return iso ? new Date(iso).getUTCHours() : null;
}

function applyFlightFilters(fl, f) {
  if (f.fMaxPrice < PRICE_MAX && (fl.totalAmount || 0) > f.fMaxPrice) return false;
  if (f.stops?.length) {
    // selected stop counts; "2" means "2 or more"
    const s = fl.stops ?? 0;
    const match = f.stops.some((sel) => (sel >= 2 ? s >= 2 : s === sel));
    if (!match) return false;
  }
  if (f.airlines?.length && !f.airlines.includes(fl.airline)) return false;
  if (f.cabins?.length && !f.cabins.includes(fl.cabin)) return false;
  if (f.departureTime?.length) {
    const hr = sliceHour(fl, "departure");
    if (hr == null || !f.departureTime.includes(timeBucket(hr))) return false;
  }
  if (f.arrivalTime?.length) {
    const hr = sliceHour(fl, "arrival");
    if (hr == null || !f.arrivalTime.includes(timeBucket(hr))) return false;
  }
  if (f.refundableOnly && !fl.refundable) return false;
  if (f.bagIncluded && !fl.baggageIncluded) return false;
  if (f.fMaxDuration < DURATION_MAX && flightDurationMs(fl) > f.fMaxDuration * HOUR_MS) return false;
  if (f.maxLayover < LAYOVER_MAX && flightLayoverMsList(fl).some((ms) => ms > f.maxLayover * HOUR_MS)) return false;
  if (f.connectVia?.length) {
    const conns = flightConnCodes(fl);
    if (!f.connectVia.some((c) => conns.has(c))) return false;
  }
  if (f.alliances?.length && !f.alliances.includes(allianceOf(fl.airlineCode))) return false;
  if (f.aircraft?.length) {
    const planes = flightAircraft(fl);
    if (!f.aircraft.some((a) => planes.has(a))) return false;
  }
  if (f.returnDepartureTime?.length) {
    const hr = sliceHour(fl, "departure", 1);
    if (hr == null || !f.returnDepartureTime.includes(timeBucket(hr))) return false;
  }
  if (f.returnArrivalTime?.length) {
    const hr = sliceHour(fl, "arrival", 1);
    if (hr == null || !f.returnArrivalTime.includes(timeBucket(hr))) return false;
  }
  return true;
}

// Distinct connecting airports across the current flight results (for the "Connect via" filter).
export function connectionOptions(flights) {
  const map = new Map();
  (flights || []).forEach((fl) =>
    (fl.slices || []).forEach((s) =>
      layovers(s.segments).forEach((l) => {
        if (l.airport?.code) map.set(l.airport.code, l.airport.city || l.airport.code);
      })
    )
  );
  return [...map].map(([code, city]) => ({ code, city }));
}

// Distinct alliances present across the current flight results.
export function allianceOptions(flights) {
  return [...new Set((flights || []).map((fl) => allianceOf(fl.airlineCode)).filter(Boolean))];
}

// Distinct aircraft types across the current flight results.
export function aircraftOptions(flights) {
  return [...new Set((flights || []).flatMap((fl) => [...flightAircraft(fl)]))];
}

// Filtered (unsorted) items for the active tab.
export function filterResults(results, activeTab, filters, nights) {
  if (activeTab === "hotels") return (results?.hotels || []).filter((h) => applyHotelFilters(h, filters, nights));
  if (activeTab === "flights") return (results?.flights || []).filter((fl) => applyFlightFilters(fl, filters));
  return [];
}
