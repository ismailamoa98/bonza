// utils/exploreFilters.js — Phase 19. Client-side filter + sort for the country page's city list. Applied over
// the already-fetched cities so pill toggles and sort changes never trigger a refetch.
export function applyFilters(cities, filters, sort) {
  const {
    seatsOpen = false,
    hotelsOnPoints = false,
    directOnly = false,
    maxBudget = null,
    tripType = null,
  } = filters || {};

  let out = cities.filter((c) => {
    if (seatsOpen && !c.awardSeatsOpen) return false;
    if (hotelsOnPoints && !(c.hotelCount > 0)) return false;
    if (directOnly && !c.isDirect) return false;
    if (maxBudget != null && !(c.allCash != null && c.allCash <= maxBudget)) return false;
    if (tripType && c.tripType !== tripType) return false;
    return true;
  });

  const byCash = (a, b) => (a.allCash ?? Infinity) - (b.allCash ?? Infinity);
  if (sort === "name") out = [...out].sort((a, b) => a.name.localeCompare(b.name));
  else if (sort === "points") {
    // Cities that price on points first (have a hotel points label), then by cash as a tiebreak.
    out = [...out].sort((a, b) => Number(!a.hotel?.pointsLabel) - Number(!b.hotel?.pointsLabel) || byCash(a, b));
  } else out = [...out].sort(byCash); // 'cheapest' (default)

  return out;
}
