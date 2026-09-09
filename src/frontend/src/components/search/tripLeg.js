// components/search/tripLeg.js — normalise a chosen search result into a trip-tray leg + optimiser payload.
import { hotelPhoto } from "./photo";

export function tripLegInfo(type, item, nights = 1) {
  if (!item) return null;
  if (type === "hotel") {
    return {
      type,
      label: item.name || "Hotel",
      sub: item.location?.city || item.location || "",
      cashGbp: Math.round((item.cashOption?.priceGbp || 0) * nights),
      img: hotelPhoto(item, 120, 90),
    };
  }
  if (type === "flight") {
    const s = item.slices?.[0];
    return {
      type,
      label: item.airline || s?.segments?.[0]?.carrier || "Flight",
      sub: s ? `${s.origin?.code || ""} → ${s.destination?.code || ""}` : "",
      cashGbp: Math.round(item.totalAmount || 0),
      img: null,
    };
  }
  return null; // cars are out of scope
}

// Real award options for one leg, so the optimiser reasons over genuine pricing instead of an estimate.
// Hotel: the selected result's own pointsOption (real award availability). Flight: the route's award
// flights from the search (Seats.aero). Shape matches the backend's deriveAwards fallback.
function legAwards(type, item, cashGbp, awardFlights = []) {
  if (type === "hotel" && item?.pointsOption?.programme && item.pointsOption.centsPerPoint > 0) {
    const pointsCost = Math.round((cashGbp * 100) / item.pointsOption.centsPerPoint);
    return pointsCost > 0 ? [{ programme: item.pointsOption.programme, pointsCost }] : [];
  }
  if (type === "flight") {
    return (awardFlights || [])
      .filter((a) => a?.programme && Number(a.pointsCost) > 0)
      .map((a) => ({ programme: a.programme, pointsCost: Math.round(Number(a.pointsCost)) }));
  }
  return [];
}

// The { legs } payload for POST /optimize/trip from the current tray selection. `awardFlights` (from the
// search results) supplies real flight award pricing; hotel award pricing comes off the item itself.
export function tripPayload(tripSelection, nights = 1, awardFlights = []) {
  return Object.entries(tripSelection)
    .filter(([, item]) => item)
    .map(([type, item]) => {
      const info = tripLegInfo(type, item, nights);
      if (!info) return null;
      return {
        type,
        label: info.label,
        cashGbp: info.cashGbp,
        awards: legAwards(type, item, info.cashGbp, awardFlights),
      };
    })
    .filter(Boolean);
}
