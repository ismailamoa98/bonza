// components/search/SearchResultsList.jsx — centre column: sort bar, result cards, empty state.
import { useState } from "react";
import SearchResultCard from "./SearchResultCard";
import SearchSkeleton from "./SearchSkeleton";
import { SearchOffIcon } from "./icons";
import { filterResults, nightsFromMeta } from "./filterResults";
import { sliceDurationMs } from "./flightFormat";

const HOTEL_SORTS = ["Best value", "Price: low to high", "Points value", "Star rating"];
const FLIGHT_SORTS = ["Best", "Cheapest", "Fastest", "Earliest departure", "Latest arrival"];

export default function SearchResultsList({
  results,
  activeTab,
  filters,
  loading,
  selectedResult,
  onSelect,
}) {
  const [sort, setSort] = useState("Best value");

  if (loading) return <SearchSkeleton />;

  const sortOptions = activeTab === "flights" ? FLIGHT_SORTS : HOTEL_SORTS;
  // Clamp to the active tab's options so a hotel sort never lingers on flights (and vice versa).
  const effectiveSort = sortOptions.includes(sort) ? sort : sortOptions[0];

  const nights = nightsFromMeta(results?.searchMeta);
  const items = filterResults(results, activeTab, filters, nights);

  if (!items.length) {
    return (
      <div className="flex-1 flex items-center justify-center py-20 text-center">
        <div>
          <div className="w-12 h-12 bg-cream rounded-xl flex items-center justify-center mx-auto mb-3 text-ink-300">
            <SearchOffIcon />
          </div>
          <p className="font-semibold text-ink-900 mb-1">No results found</p>
          <p className="text-sm text-ink-300">
            {activeTab === "cars" ? "Car search is coming soon" : "Try adjusting your filters or dates"}
          </p>
        </div>
      </div>
    );
  }

  const sorted = sortResults(items, effectiveSort, activeTab);
  const dateLabel = dateRangeLabel(results?.searchMeta);

  return (
    <>
      <div className="flex items-center justify-between mb-1">
        <p className="text-[11px] text-ink-300 tabular-nums">
          {items.length} results · sorted by {effectiveSort.toLowerCase()}
        </p>
        <select
          value={effectiveSort}
          onChange={(e) => setSort(e.target.value)}
          className="text-[11px] text-ink-600 bg-white border border-ink-900/[0.08] rounded-lg px-2 py-1"
        >
          {sortOptions.map((o) => (
            <option key={o}>{o}</option>
          ))}
        </select>
      </div>

      <div
        className={
          activeTab === "hotels"
            ? "grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3"
            : "flex flex-col gap-2.5"
        }
      >
        {sorted.map((item, i) => (
          <SearchResultCard
            key={item.duffelHotelId || item.id || item.duffelOfferId || i}
            result={item}
            activeTab={activeTab}
            nights={nights}
            dateLabel={dateLabel}
            isSelected={
              (item.duffelHotelId && selectedResult?.duffelHotelId === item.duffelHotelId) ||
              (item.id && selectedResult?.id === item.id)
            }
            onClick={() => onSelect(item)}
          />
        ))}
      </div>
    </>
  );
}

// "12 Sep – 15 Sep" style label for the card's date row.
function dateRangeLabel(meta) {
  if (!meta?.departureDate || !meta?.returnDate) return "";
  const fmt = (s) =>
    new Date(s).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
  return `${fmt(meta.departureDate)} – ${fmt(meta.returnDate)}`;
}

// Total journey time (all slices) and outbound endpoints for flight sorting.
const flightDurationMs = (f) => (f.slices || []).reduce((sum, s) => sum + sliceDurationMs(s), 0);
const flightDep = (f) => f.slices?.[0]?.segments?.[0]?.departure || "";
const flightArr = (f) => {
  const segs = f.slices?.[0]?.segments || [];
  return segs[segs.length - 1]?.arrival || "";
};

function sortResults(items, sort, activeTab) {
  const copy = [...items];
  if (activeTab === "flights") {
    switch (sort) {
      case "Cheapest":
        return copy.sort((a, b) => (a.totalAmount || 0) - (b.totalAmount || 0));
      case "Fastest":
        return copy.sort((a, b) => flightDurationMs(a) - flightDurationMs(b));
      case "Earliest departure":
        return copy.sort((a, b) => flightDep(a).localeCompare(flightDep(b)));
      case "Latest arrival":
        return copy.sort((a, b) => flightArr(b).localeCompare(flightArr(a)));
      default: {
        // Best — blend price + duration (min-max normalised across the current set).
        const prices = copy.map((f) => f.totalAmount || 0);
        const durs = copy.map(flightDurationMs);
        const minP = Math.min(...prices), maxP = Math.max(...prices);
        const minD = Math.min(...durs), maxD = Math.max(...durs);
        const nP = (v) => (maxP > minP ? (v - minP) / (maxP - minP) : 0);
        const nD = (v) => (maxD > minD ? (v - minD) / (maxD - minD) : 0);
        const score = (f) => 0.6 * nP(f.totalAmount || 0) + 0.4 * nD(flightDurationMs(f));
        return copy.sort((a, b) => score(a) - score(b));
      }
    }
  }
  switch (sort) {
    case "Price: low to high":
      return copy.sort((a, b) => (a.cashOption?.priceGbp || 0) - (b.cashOption?.priceGbp || 0));
    case "Points value":
      return copy.sort(
        (a, b) => (b.pointsOption?.centsPerPoint || 0) - (a.pointsOption?.centsPerPoint || 0)
      );
    case "Star rating":
      return copy.sort((a, b) => (b.starRating || 0) - (a.starRating || 0));
    default: // Best value — points value first, then lower cash price
      return copy.sort((a, b) => {
        const av = a.pointsOption?.centsPerPoint || 0;
        const bv = b.pointsOption?.centsPerPoint || 0;
        if (bv !== av) return bv - av;
        return (a.cashOption?.priceGbp || 0) - (b.cashOption?.priceGbp || 0);
      });
  }
}
