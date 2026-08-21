// components/search/photo.js — resolve a hotel photo. Falls back to LoremFlickr the same way the
// marketing deck does (data/packages.js `imageUrl`): a BROAD query (the city — a large photo pool) plus
// a distinct per-hotel `lock` seed, so each card gets a different image instead of repeating.
export function hotelPhoto(result, w = 640, h = 420) {
  if (result?.imageUrl) return result.imageUrl;
  const city = result?.location?.city || result?.location || "travel";
  let seed = 0;
  const key = String(result?.duffelHotelId || result?.name || city);
  for (const ch of key) seed = (seed * 31 + ch.charCodeAt(0)) & 0xffff;
  return `https://loremflickr.com/${w}/${h}/${encodeURIComponent(city)}?lock=${seed}`;
}

// Genuine photos for the detail-panel slideshow — Duffel Stays' photo array (plus any single imageUrl),
// de-duped. Returns [] when the supplier gave us none, so the header shows the gradient rather than
// fabricated stock imagery.
export function hotelPhotos(result) {
  return [...new Set([result?.imageUrl, ...(result?.photos || [])].filter(Boolean))];
}
