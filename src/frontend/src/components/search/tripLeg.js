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
  // car (future)
  return {
    type,
    label: item.name || "Car",
    sub: item.vendor || "",
    cashGbp: Math.round(item.cashOption?.priceGbp || item.totalAmount || 0),
    img: null,
  };
}

// The { legs } payload for POST /optimize/trip from the current tray selection.
export function tripPayload(tripSelection, nights = 1) {
  return Object.entries(tripSelection)
    .filter(([, item]) => item)
    .map(([type, item]) => {
      const info = tripLegInfo(type, item, nights);
      return { type, label: info.label, cashGbp: info.cashGbp };
    });
}
