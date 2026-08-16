// components/search/points.js
// DEMO ONLY: when a hotel carries no real award availability, fabricate a plausible, deterministic
// points option so the points UI (card overlay + Compare deals) can be previewed. Real award rows from
// the backend always take precedence. Remove / gate this once live award data flows through.
const DEMO_PROGRAMMES = ["marriott_bonvoy", "world_of_hyatt", "hilton_honors", "ihg_one", "ba_avios"];

export function pointsFor(result) {
  if (result?.pointsOption) return result.pointsOption; // real data wins
  const rate = result?.cashOption?.priceGbp ?? result?.lowestRate;
  if (!rate) return null;
  let h = 0;
  for (const ch of String(result?.duffelHotelId || result?.name || "")) h = (h * 31 + ch.charCodeAt(0)) & 0xffff;
  const cpp = 0.6 + (h % 19) / 10; // 0.6–2.4 ¢/pt
  const pointsCost = Math.max(2500, Math.round((rate * 100) / cpp / 500) * 500);
  return {
    programme: DEMO_PROGRAMMES[h % DEMO_PROGRAMMES.length],
    pointsCost,
    centsPerPoint: parseFloat(cpp.toFixed(1)),
    aboveBenchmark: cpp >= 1.3,
    bookingUrl: null,
    userCanAfford: true,
    _demo: true,
  };
}
