// components/search/filterResults.js — pure, per-tab filtering for the search page. Shared by
// SearchResultsList (to render) and SearchPage (to show an accurate active-tab result count).
import { pointsFor } from "./points";

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

function sliceHour(flight, which) {
  const slice = flight.slices?.[0];
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
  return true;
}

// Filtered (unsorted) items for the active tab.
export function filterResults(results, activeTab, filters, nights) {
  if (activeTab === "hotels") return (results?.hotels || []).filter((h) => applyHotelFilters(h, filters, nights));
  if (activeTab === "flights") return (results?.flights || []).filter((fl) => applyFlightFilters(fl, filters));
  return [];
}
